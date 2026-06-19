# Frontier Shipping — Project Context

## Overview
Web-based transportation tracking tool for CTDI's Frontier operation. Tracks pallets from warehouse through cross-dock hubs to final delivery locations. Built with HTML/JS frontend + Google Sheets backend via Apps Script.

## Hosting
- **GitHub Pages:** https://ebradyctdi.github.io/FTR-Logistics/
- **Repository:** https://github.com/ebradyctdi/FTR-Logistics

## Current Apps Script URL
```
https://script.google.com/macros/s/AKfycbws5tBpSc34EDnhAv_3qYJXGhJ4VpZlkiyT-GPURntpc3in76GXxh4KfWk3lzFD7h51/exec
```

## Architecture
- **Frontend:** Static HTML/JS pages (one per view/action)
- **Backend:** Google Apps Script deployed as Web App
- **Database:** Google Sheets (tabs = tables)
- **Communication:** JSONP requests
- **Auth:** Currently disabled (getUser() returns localStorage value or 'Operator'). Login page exists but is bypassed — to be re-enabled later.
- **Design:** Dark navy sidebar (#1a3a5c), CTDI branding, responsive

## Google Sheet
- **Name:** Frontier Tracking

### Tabs & Columns:
| Tab | Columns |
|-----|---------|
| Pallets | Pallet ID, Origin, Description, Status, Opened By, Open Date, Closed By, Close Date, Current Location |
| Pallet Build Info | Record Number, Pallet ID, Item Code, Item Description, Item Quantity, Item Serial Number, Date Added, Added By, Date Removed, Removed By, Status |
| Routes | Pallet ID, Final Destination, Created By, Created Date |
| Route Legs | Tracking Number, Pallet ID, Leg #, From Location, To Location, Leg Type, Status, Pickup Scan By, Pickup Scan Date, Dropoff Scan By, Dropoff Scan Date, Receipt Scan By, Receipt Scan Date |
| Transaction History | Pallet ID, Timestamp, Action, Leg #, Location, User |
| Hub Locations | Location ID, Name, Address, Notes |
| Exceptions | Pallet ID, Timestamp, Type, Note, Reported By, Status, Resolved By, Resolution Date |
| Users | Username, Password, Email, Role |

## Pallet ID Format
- Sequential: PLB-000001, PLB-000002, etc.
- Auto-assigned on creation via `_getNextPalletId()`

## Tracking Number Format
- Per-leg: TRK-PLB000001-L1, TRK-PLB000001-L2, etc.
- Auto-generated when route is assigned
- Stored in Route Legs column A
- Scannable barcode on BOL

## Pallet Statuses (in Google Sheet)
- Open, Closed, In Transit, At Hub, Delivered, On Hold

## Pizza Tracker Categories (7 stages displayed in UI)
1. Open Pallets (blue #0d6efd)
2. Closed Awaiting Routing (gray #6c757d) — Closed, no route assigned
3. Routed Awaiting Pickup (cyan #17a2b8) — Closed, route assigned, first leg Pending
4. In Transit to Hub (orange #fd7e14) — In Transit, active leg is Transfer type
5. At Crossdock Hub (purple #6f42c1) — At Hub status
6. In Transit to Final (pink #e91e63) — In Transit, active leg is Final type
7. Delivered (green #28a745) — Delivered status

## Route Structure
- Each pallet has one Route (final destination)
- Each route has 1+ Legs
- Leg Types: Transfer (to hub), Final (to end destination)

## Leg Scan Model
Each leg has up to 3 scans:
- **Pickup Scan** — Driver picks up (Leg → In Transit)
- **Dropoff Scan** — Driver drops off (Transfer → Dropped Off, Final → Complete/Delivered)
- **Receipt Scan** — Hub receiver confirms (Transfer legs only → Complete)

## Leg Statuses
- Pending, In Transit, Dropped Off, Complete

## Transaction History Actions
- Created, Closed, Reopened, Route Assigned, Pickup Scan, Dropoff Scan, Receipt Scan, Delivered, Exception Reported, Hold, Hold Released

## Hub Locations
- Stored with structured address (combined as "Street, City, State ZIP")
- Address lookup uses partial matching (hub name contains location or vice versa)
- Used in labels, BOLs, Next Stop labels, and confirmation popups

## Pages & Navigation (Sidebar)
```
▶ Views
  - overview.html (🏠 Overview — pizza tracker cards + recent activity + quick links)
  - pallet-tracker.html (🔍 Pallet Tracker — all pallets table, status filter, detail modal)
▶ Pallet Build
  - pallet-build.html (🔨 Pallet Build — create, add items, close, reopen, print label)
▶ Logistics
  - routing.html (🗺️ Routing — assign routes with hub stops + final destination)
  - packing-documents.html (📄 Packing Documents — print labels, BOLs, next stop labels)
  - pickup-scan.html (🚚 Pickup Scan — with operator name, location, confirmation)
  - dropoff-scan.html (📍 Dropoff Scan — with confirmation showing destination)
  - receipt-scan.html (✅ Hub Receipt Scan — for hub receivers)
▶ Exceptions
  - report-exception.html (⚠️ Report Exception)
  - open-exceptions.html (🚨 Open Exceptions)
▶ System
  - hub-locations.html (🏭 Hub Locations — structured address, edit modal)
  - settings.html (⚙️ Settings — Apps Script URL + Google Sheet URL)
```

## Key Features per Page

### Pallet Build (pallet-build.html)
- Operator Name field at top (persists, required for all actions)
- Create New Pallet (origin dropdown from hubs, description)
- Open Pallets table with Build/Review, Print, Close buttons
- Build modal: Add items (Item Code, Description, Qty, Serial, Added By)
- Close confirmation modal
- Reopen confirmation modal (orange button)
- Print Label modal (4×6, CODE128 barcode, CTDI logo)
- Closed Pallets Not Shipped table with Details, Print, Reopen buttons

### Packing Documents (packing-documents.html)
- Table of closed pallets awaiting shipment (with Routed badge)
- Print Label (4×6 pallet label)
- Print BOL (8.5×11, per-leg, with leg selector for multi-leg pallets)
- Next Stop Label (4×6, shows deliver-to/ship-from with full addresses)
- BOL includes: tracking # barcode, from/to addresses, pallet info, contents table, signature lines

### Routing (routing.html)
- Shows closed pallets without routes
- Route builder modal: Origin → Add Hub Stops → Final Destination
- Final destination fields: Name/Company/Site, Street, City, State, ZIP
- Hub stops selected from dropdown

### Scan Pages
- All have confirmation popups before executing
- Pickup: requires Picked Up By name + Location dropdown
- Dropoff: shows destination, defaults Dropped Off By to the pickup driver
- Receipt: shows Received By
- All show tables of pallets in relevant state (awaiting pickup / in transit / dropped off)

## Printable Documents
1. **Pallet Label** (4×6) — CTDI logo, Pallet ID, barcode, status, origin+address, items count, dates
2. **Bill of Lading** (8.5×11) — per-leg, tracking # with barcode, from/to with addresses, pallet info, contents table, signatures
3. **Next Stop Label** (4×6) — color-coded (orange=Transfer, pink=Final), deliver-to address, ship-from address, leg badge

## Technical Conventions
- **localStorage keys:** `fs_script_url` (Apps Script URL), `fs_sheet_url` (Google Sheet URL), `fs_username`
- **JSONP callback pattern** (same as FWA/AWAT)
- **Timestamps:** Apps Script writes `M/d/yyyy H:mm:ss` using spreadsheet timezone
- **fmtDate pattern:** Regex parses `M/d/yyyy H:mm:ss` → displays as `M/d/yyyy, h:mm AM/PM` (no timezone conversion)
- **_cellToString:** Converts Date objects using `getSpreadsheetTimeZone()` to match sheet display
- **Anti-double-click:** disabled + flag guards on submit buttons
- **Confirmation modals** on all scan actions and close/reopen
- **Loading spinners** on pages with async data fetch
- **Hub address lookup:** `getHubAddress(name)` uses partial matching
- **JsBarcode** for CODE128 barcodes on labels and BOLs

## Design Style
- Dark navy sidebar (#1a3a5c) with CTDI white logo
- Brand subtitle: "Frontier Shipping"
- Responsive (mobile sidebar toggle with hamburger)
- Status indicator (green/red/orange dot)
- Toast notifications
- Modal popups for detail/edit/confirm
- Slim navy scrollbar on modals
- Labels: B&W optimized (CTDI logo with filter:invert(1))

## Apps Script Actions Reference
| Action | Purpose | Key Params |
|--------|---------|------------|
| read | Read all pallets | — |
| createpallet | Create new pallet | origin, description, user |
| closepallet | Close/seal pallet | palletid, user |
| reopenpallet | Reopen closed pallet | palletid, user |
| readhubs | Read hub locations | — |
| addhub | Add hub location | locationid, name, address, notes |
| updatehub | Edit hub location | row, name, address, notes |
| assignroute | Assign route to pallet | palletid, finaldest, legs (JSON), user |
| readroutes | Read all routes | — |
| readlegs | Read all route legs | — |
| pickupscan | Pickup scan | palletid, user |
| dropoffscan | Dropoff scan | palletid, user |
| receiptscan | Hub receipt scan | palletid, user |
| readpalletitems | Read pallet build items | palletid (optional filter) |
| addpalletitem | Add item to pallet | palletid, itemcode, itemdesc, itemqty, itemserial, user |
| removepalletitem | Remove item from pallet | row, user |
| reportexception | Report exception | palletid, type, note, user |
| readexceptions | Read exceptions | — |
| resolveexception | Resolve exception | row, user |
| readhistory | Read all transaction history | — |
| pallethistory | Read history for one pallet | palletid |
| login | Authenticate user | username, password |
| createuser | Create user account | username, password, email, role |

## Files in Project (exclude from GitHub upload)
- AWAT Example/ — reference only
- FWA Example/ — reference only  
- generate-sheet.html — one-time setup tool
- Frontier_Shipping_Template.xlsx — one-time setup tool
- login.html — exists but bypassed currently
