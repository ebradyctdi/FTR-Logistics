# Frontier Shipping — Project Context

## Overview
Web-based transportation tracking tool for CTDI's Frontier operation. Tracks pallets from warehouse through cross-dock hubs to final delivery locations. Built with HTML/JS frontend + Google Sheets backend via Apps Script.

## Hosting
- **GitHub Pages:** https://ebradyctdi.github.io/FTR-Logistics/
- **Repository:** https://github.com/ebradyctdi/FTR-Logistics

## Current Apps Script URL
```
https://script.google.com/macros/s/AKfycbxvq77FFdpAGy53NZO7QqGRBjx-pW-dvUo-Av_Y7_ovpEgS2P6v9hiPrWB-Q_hVjXfq/exec
```

## Architecture
- **Frontend:** Static HTML/JS pages (one per view/action)
- **Backend:** Google Apps Script deployed as Web App
- **Database:** Google Sheets (tabs = tables)
- **Communication:** JSONP requests
- **Auth:** Currently disabled (login page exists but bypassed). Operator names entered per-page.
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
| Hub Locations | Location ID, Name, Address, Location Type, Notes |
| Exceptions | Pallet ID, Timestamp, Type, Note, Reported By, Status, Resolved By, Resolution Date |
| Users | Username, Password, Email, Role |
| Line Hauls | Line ID, Name, Starting Point, Stop 1-10, Created By, Created On, Last Edited, Edited By |

## Key Identifiers
- **Pallet ID:** PLB-000001 (sequential, auto-assigned)
- **Tracking Number:** TRK-PLB000001-L1 (per-leg, auto-generated on route assignment)
- **Location ID:** CV-CTDI, CT-FTR, FL-001, etc. (user-defined)

## Location Types
- **Hub** — warehouses and cross-dock facilities (used as transfer points and origins)
- **Final Location** — end delivery destinations

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
- Each pallet has one Route (final destination name from Routing Locations)
- Each route has 1+ Legs
- Leg Types: Transfer (to hub), Final (to end destination)
- Routing is simplified: pick Final Destination from dropdown + optionally add hub transfers

## Leg Scan Model
Each leg has up to 3 scans:
- **Pickup Scan** — Driver picks up (Leg → In Transit). Requires operator name + location.
- **Dropoff Scan** — Driver drops off (Transfer → Dropped Off, Final → Complete/Delivered). Defaults to pickup driver.
- **Receipt Scan** — Hub receiver confirms (Transfer legs only → Complete)

## Leg Statuses
- Pending, In Transit, Dropped Off, Complete

## Transaction History Actions
- Created, Closed, Reopened, Route Assigned, Pickup Scan, Dropoff Scan, Receipt Scan, Delivered, Exception Reported, Hold, Hold Released

## Business Context
- Origin: CTDI Coatesville, PA
- Main Hub: Frontier - Connecticut (Wallingford, CT)
- Final Locations: ~20 sites in CT (Stratford, Bridgeport, Norwalk, Waterbury, etc.)
- Typical flow: Coatesville → CT Hub → Final Location
- Routes are organized by day of week (Monday-Friday delivery schedules)

## Pages & Navigation (Sidebar)
```
▶ Views
  - overview.html (🏠 Overview — pizza tracker cards + recent activity + quick links)
  - pallet-tracker.html (🔍 Pallet Tracker — all pallets table, status filter, detail modal)
▶ Pallet Build
  - pallet-build.html (🔨 Pallet Build — create, add items, close, reopen, print label)
▶ Logistics
  - routing.html (🗺️ Routing — simplified: pick final dest dropdown + add hub transfers)
  - packing-documents.html (📄 Packing Documents — print labels, BOLs, next stop labels)
  - pickup-scan.html (🚚 Pickup Scan — with searchable location, operator name, confirmation)
  - dropoff-scan.html (📍 Dropoff Scan — with confirmation showing destination)
  - receipt-scan.html (✅ Hub Receipt Scan — for hub receivers)
  - line-hauls.html (🛣️ Line Hauls — define delivery lines, view waiting pallets)
▶ Exceptions
  - report-exception.html (⚠️ Report Exception)
  - open-exceptions.html (🚨 Open Exceptions)
▶ System
  - hub-locations.html (🏭 Routing Locations — manage hubs + final locations, type filter)
  - settings.html (⚙️ Settings — Apps Script URL + Google Sheet URL)
```

## Key Features per Page

### Pallet Build (pallet-build.html)
- Operator Name field at top (persists, required for all actions)
- Create New Pallet (origin dropdown shows hub Names only)
- Open Pallets table with Build/Review, Print, Close buttons
- Build modal: Add items with "Added By" field (Item Code, Description, Qty, Serial)
- Close/Reopen confirmation modals
- Print Label modal (4×6, CODE128 barcode, CTDI logo)
- Closed Pallets Not Shipped table with Details, Print, Reopen buttons

### Routing (routing.html)
- Shows closed pallets without routes
- Simplified route assignment modal:
  - Final Destination: searchable autocomplete (shows "Location ID - Name")
  - "Add Hub Transfer" button in route preview (can add multiple)
  - Each hub transfer has dropdown (Hub-type locations) + remove button
  - Route preview updates live
- One-click assign

### Packing Documents (packing-documents.html)
- Shows pallets in Closed, In Transit, At Hub, and Delivered states
- Status column with color-coded badges
- Filters: text search + status dropdown
- Print Label (4×6 pallet label)
- Print BOL (8.5×11, per-leg, with leg selector for multi-leg pallets)
- Next Stop Label (4×6, shows deliver-to/ship-from with full addresses)
- BOL includes: tracking # with scannable barcode, from/to addresses, pallet info, contents table, signature lines, leg badge in top-right

### Scan Pages
- All have confirmation popups before executing
- Pickup: searchable location autocomplete (Hub types only) + "Picked Up By" name field
- Dropoff: shows destination, "Dropped Off By" defaults to pickup driver (editable)
- Receipt: shows "Received By"
- All show tables of pallets in relevant state (awaiting pickup / in transit / dropped off)

### Routing Locations (hub-locations.html)
- Title: "Routing Locations"
- Table with Location Type filter dropdown + text search (name/address/ID)
- Location Type badges: green "Hub", blue "Final Location"
- Add New Location modal (with Location Type dropdown)
- Edit modal (pre-populated, Location ID not editable)
- Address stored as combined string "Street, City, State ZIP"

## Printable Documents
1. **Pallet Label** (4×6) — CTDI logo, Pallet ID, barcode, status (OPEN/CLOSED), origin+address, items count, dates (centered grid cells)
2. **Bill of Lading** (8.5×11) — per-leg, tracking # with scannable barcode, leg badge top-right, from/to with addresses, pallet info, contents table, signatures
3. **Next Stop Label** (4×6) — color-coded (orange=Transfer, pink=Final), deliver-to/ship-from with full addresses, leg badge, tracking number

## Technical Conventions
- **localStorage keys:** `fs_script_url`, `fs_sheet_url`, `fs_username`
- **JSONP callback pattern** (same as FWA/AWAT apps)
- **Timestamps:** Apps Script writes `M/d/yyyy H:mm:ss` using `getSpreadsheetTimeZone()`
- **_cellToString:** Converts Date objects using spreadsheet timezone
- **fmtDate:** Regex parses `M/d/yyyy H:mm:ss` → `M/d/yyyy, h:mm AM/PM` (includes year)
- **Confirmation modals** on all scan actions and close/reopen
- **Loading spinners** on pages with async data fetch
- **Hub address lookup:** `getHubAddress(name)` uses partial matching (contains)
- **Searchable autocomplete** pattern for location selection (routing + pickup scan)
- **JsBarcode** (CODE128) for barcodes on labels and BOLs
- **Print:** window.open with @page size rules (4×6 or 8.5×11)

## Design Style
- Dark navy sidebar (#1a3a5c) with CTDI white logo
- Brand subtitle: "Frontier Shipping"
- Responsive (mobile sidebar toggle with hamburger)
- Status indicator (green/red/orange dot)
- Toast notifications (green success, red error, orange warning)
- Modal popups for detail/edit/confirm
- Slim navy scrollbar on modals
- Labels: B&W optimized (CTDI logo with filter:invert(1))
- Buttons: navy (primary), teal (print), red (close/remove), orange (reopen/next stop)

## Apps Script Actions Reference
| Action | Purpose | Key Params |
|--------|---------|------------|
| read | Read all pallets | — |
| createpallet | Create new pallet | origin, description, user |
| closepallet | Close/seal pallet | palletid, user |
| reopenpallet | Reopen closed pallet | palletid, user |
| readhubs | Read all locations (hubs + final) | — |
| addhub | Add location | locationid, name, address, locationtype, notes |
| updatehub | Edit location | row, name, address, locationtype, notes |
| assignroute | Assign route to pallet | palletid, finaldest, legs (JSON), user |
| readroutes | Read all routes | — |
| readlegs | Read all route legs (14 cols) | — |
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
| readlinehauls | Read all line hauls | — |
| addlinehaul | Create a new line haul | lineid, name, startingpoint, stops (JSON), user |
| updatelinehaul | Edit a line haul | row, name, startingpoint, stops (JSON), user |
| deletelinehaul | Delete a line haul | row |

## Route Legs Column Mapping (Important!)
Column A=Tracking Number, B=Pallet ID, C=Leg #, D=From Location, E=To Location, F=Leg Type, G=Status, H=Pickup Scan By, I=Pickup Scan Date, J=Dropoff Scan By, K=Dropoff Scan Date, L=Receipt Scan By, M=Receipt Scan Date

Data indexes (0-based): [0]=Tracking, [1]=Pallet ID, [2]=Leg#, [3]=From, [4]=To, [5]=LegType, [6]=Status, [7]=PickupBy, [8]=PickupDate, [9]=DropoffBy, [10]=DropoffDate, [11]=ReceiptBy, [12]=ReceiptDate

## Files NOT to upload to GitHub
- AWAT Example/ — reference only
- FWA Example/ — reference only
- generate-sheet.html — one-time setup tool
- Frontier_Shipping_Template.xlsx — one-time setup tool
- login.html — exists but bypassed currently
