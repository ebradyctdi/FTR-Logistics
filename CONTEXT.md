# Frontier Shipping — Project Context

## Overview
Web-based transportation tracking tool for CTDI's Frontier operation. Tracks pallets from warehouse through cross-dock hubs to final delivery locations. Built with HTML/JS frontend + Google Sheets backend via Apps Script.

## Hosting
- **GitHub Pages:** https://ebradyctdi.github.io/FTR-Logistics/
- **Repository:** https://github.com/ebradyctdi/FTR-Logistics

## Current Apps Script URL
```
https://script.google.com/macros/s/AKfycbwv4__hrZ716OYCEv17rqPXm8JWYLydiq85jl6QE_3jlyw7TaJg_gEnHlHTsHqfzwjA/exec
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
| Pallets | Pallet ID, Origin, Description, Status, Opened By, Open Date, Closed By, Close Date, Current Location, Final Destination |
| Pallet Build Info | Record Number, Pallet ID, MUSE Ticket, Description Note, Item Quantity, Item Serial Number, Date Added, Added By, Date Removed, Removed By, Status |
| Routes | Pallet ID, Final Destination, Created By, Created Date |
| Route Legs | Tracking Number, Pallet ID, Leg #, From Location, To Location, Leg Type, Status, Pickup Scan By, Pickup Scan Date, Dropoff Scan By, Dropoff Scan Date, Receipt Scan By, Receipt Scan Date |
| Transaction History | Pallet ID, Timestamp, Action, Leg #, Location, User |
| Hub Locations | Location ID, Name, Address, Location Type, Notes |
| Exceptions | Pallet ID, Timestamp, Type, Note, Reported By, Status, Resolved By, Resolution Date |
| Users | Username, Password, Email, Role |
| Line Hauls | Line ID, Name, Starting Point, Occurrence, Stop 1-10, Created By, Created On, Last Edited, Edited By |

## Key Identifiers
- **Pallet ID:** PLB-000001 (sequential, auto-assigned)
- **Tracking Number:** TRK-PLB000001-L1 (per-leg, auto-generated on route assignment)
- **Location ID:** CV-CTDI, CT-FTR, FL-001, etc. (user-defined)
- **Line ID:** L-001 (sequential, auto-assigned)

## Location Types
- **Hub** — warehouses and cross-dock facilities (used as transfer points and origins)
- **Final Location** — end delivery destinations

## Pallet Statuses (in Google Sheet)
- Open, Closed, In Transit, At Hub, Delivered, On Hold

## Pallet Display Statuses (in UI)
- Pallet Open (blue #0d6efd)
- Pallet Closed (gray #6c757d) — Closed, no route assigned
- Routed (cyan #17a2b8) — Closed, route assigned, first leg Pending
- Transit to Hub (orange #fd7e14) — In Transit, active leg is Transfer type
- Awaiting Hub Receipt (red #dc3545) — In Transit, leg is Dropped Off but not receipt-scanned
- At Hub (purple #6f42c1) — At Hub status (receipt confirmed)
- Transit to Final (pink #e91e63) — In Transit, active leg is Final type
- Delivered (green #28a745) — Delivered status

## MUSE Ticket Statuses (derived from pallet statuses)
- **In Process** — no pallets for that ticket are delivered
- **Partially Delivered** — at least one pallet is delivered but not all
- **Delivered** — all pallets with that ticket are delivered

## Route Structure
- Each pallet has one Route (final destination)
- Each route has 1+ Legs
- Leg Types: Transfer (to hub), Final (to end destination)
- Final Destination is set at pallet creation (editable while open), pre-filled on routing page (read-only)
- Custom destinations supported: stored as "Name | Street, City, State ZIP"

## Leg Scan Model
Each leg has up to 3 scans:
- **Pickup Scan** — Driver picks up (Leg → In Transit). Operator name entered in confirmation popup.
- **Dropoff Scan** — Driver drops off (Transfer → Dropped Off, Final → Complete/Delivered). Defaults to pickup driver.
- **Receipt Scan** — Hub receiver confirms (Transfer legs only → Complete). Shows expected location with full address.

## Scan Page Validation
- **Pickup Scan** — rejects pallets not in "awaiting pickup" state (all prior legs must be Complete)
- **Dropoff Scan** — rejects pallets not currently "In Transit"
- **Hub Receipt Scan** — rejects pallets not in "Dropped Off" state
- All scan pages auto-refresh their tables after successful scan

## Leg Statuses
- Pending, In Transit, Dropped Off, Complete

## Transaction History Actions
- Pallet Created, Pallet Closed, Reopened, Route Assigned, Route Removed, Pickup Scan, Dropoff Scan, Receipt Scan, Delivered, Exception Reported, Hold, Hold Released

## Business Context
- Origin: CTDI Coatesville, PA
- Main Hub: Frontier - Connecticut (Wallingford, CT)
- Final Locations: ~20 sites in CT (Stratford, Bridgeport, Norwalk, Waterbury, etc.)
- Typical flow: Coatesville → CT Hub → Final Location
- Routes are organized by day of week (Monday-Friday delivery schedules)
- MUSE Tickets track customer product across pallets

## Pages & Navigation (Sidebar)
```
▶ Views
  - pallet-tracker.html (🔍 Pallet Tracker — active/delivered tables, pizza tracker cards, detail modal with progress bar)
  - muse-tracker.html (🎫 MUSE Tracker — track MUSE tickets across pallets, pizza tracker progress)
▶ Pallet Build
  - pallet-build.html (🔨 Pallet Build — create pallet popup, add MUSE tickets, close, reopen, print label)
▶ Logistics
  - routing.html (🗺️ Routing — assign routes, final dest pre-filled from pallet, read-only)
  - packing-documents.html (📄 Packing Documents — labels, BOLs, details modal, collapsible delivered)
  - pickup-scan.html (🚚 Pickup Scan — validation, full address preview, confirmation)
  - dropoff-scan.html (📍 Dropoff Scan — validation, full address, confirmation)
  - receipt-scan.html (✅ Hub Receipt Scan — validation, expected location with address)
▶ Exceptions
  - report-exception.html (⚠️ Report Exception)
  - open-exceptions.html (🚨 Open Exceptions)
▶ System
  - settings.html (⚙️ Settings — Apps Script URL + Google Sheet URL)
  - hub-locations.html (🏭 Routing Locations — manage hubs + final locations)
  - line-hauls.html (🛣️ Line Hauls — define delivery lines, day picker, view waiting pallets)
```

## Key Features per Page

### Pallet Tracker (pallet-tracker.html)
- 7 KPI cards at top (clickable to filter): Open, Closed Awaiting Routing, Routed Awaiting Pickup, Transit to Hub, Awaiting Hub Receipt, At Crossdock Hub, Transit to Final
- Active Pallets table with count badge, filter, status dropdown, Export CSV
- Delivered Pallets table (collapsible, hidden by default) with Export CSV
- Detail modal: pizza tracker progress bar, pallet info with full addresses, items, route legs, transaction history
- CSV export includes: Pallet ID, Status, Origin + Address, Final Dest + Address, MUSE Tickets, Legs 1-3 details

### MUSE Tracker (muse-tracker.html)
- 3 KPI cards: In Process, Partially Delivered, Delivered (clickable)
- Active MUSE Tickets table with filter, status dropdown, Export CSV
- Delivered MUSE Tickets table (collapsible, hidden by default) with Export CSV
- Detail modal: summary (# pallets, delivered count, overall status), per-pallet pizza tracker progress bars with full addresses, collapsible timelines
- CSV export includes: MUSE ID, Status, # Pallets, per-pallet details (up to 6)

### Pallet Build (pallet-build.html)
- Operator Name + "Create Pallet" button at top
- Create Pallet popup: Origin (hubs only), Final Destination (existing or custom address), Description
- Open Pallets table with Final Destination column, Build/Review, Print, Close
- Build modal: Origin & Final Dest cards with Edit buttons (editable while open), MUSE Ticket # + Description/Note + Serial # fields
- Closed Pallets table (filterable) with Details, Print, Reopen
- Pallet Label: B&W optimized 4×6, CTDI logo, barcode, origin/dest with addresses, MUSE tickets list

### Routing (routing.html)
- "Pallets Awaiting Routing" table with # of Items column
- Route assignment modal: Final Destination (read-only, from pallet), Route Preview with addresses
- Add Hub Transfer stops, one-click assign

### Packing Documents (packing-documents.html)
- Active Orders table with display statuses matching Pallet Tracker
- Status filter dropdown: Pallet Closed, Routed, Transit to Hub, Awaiting Hub Receipt, At Hub, Transit to Final
- Details popup: origin/dest with addresses, route legs, MUSE tickets, remove routing button
- Delivered Orders (collapsible, hidden by default)
- BOL: shipment info, from/to with full addresses (including custom), contents table, signatures
- Pallet Label: same format as Pallet Build (4×6, B&W, 0.2in top margin for printer safe area)

### Line Hauls (line-hauls.html)
- Define delivery lines with: auto-generated Line ID, Name, Starting Point (hub), Occurrence (day picker M-F), Stops (any location type)
- Shows waiting pallet count per line
- View detail: pallets grouped by stop
- Create/Edit with confirmation popup (operator name required)
- Delete with confirmation

### Scan Pages (pickup-scan, dropoff-scan, receipt-scan)
- All validate pallet ID against expected state before showing confirmation
- All show full addresses in confirmation popup
- All auto-refresh tables after successful scan
- Pickup: shows pickup location + destination with addresses
- Dropoff: shows dropoff location with full address, defaults to pickup driver
- Receipt: shows expected location (ID + Name + Address)

## Printable Documents
1. **Pallet Label** (4×6) — B&W optimized, CTDI logo, Pallet ID, barcode, status, origin/dest with formatted addresses, MUSE tickets list, 0.2in top margin
2. **Bill of Lading** (8.5×11) — per-leg, tracking # with barcode, leg badge, from/to with addresses (supports custom), contents table, signatures
3. **Next Stop Label** (4×6) — B&W monochrome, inverted header rows with Location IDs, deliver-to/ship-from with addresses

## Technical Conventions
- **localStorage keys:** `fs_script_url`, `fs_sheet_url`, `fs_username`
- **JSONP callback pattern** with 30s timeout on pallet-tracker, 15s elsewhere
- **Timestamps:** Apps Script writes `M/d/yyyy H:mm:ss` using `getSpreadsheetTimeZone()`
- **fmtDate:** Handles both `M/d/yyyy H:mm:ss` and full Date strings → `M/d/yyyy, h:mm AM/PM`
- **formatLabelAddress:** Splits address into Street / City, State / ZIP on separate lines
- **Confirmation modals** on all scan actions, close/reopen, and line haul saves
- **Pizza tracker progress bars** on Pallet Tracker detail and MUSE Tracker detail modals
- **Collapsible sections** for delivered tables (hidden by default)
- **Export CSV** on both Pallet Tracker and MUSE Tracker tables
- **JsBarcode** (CODE128) for barcodes on labels and BOLs
- **Print:** window.open with @page size rules (4×6 with 0.2in top margin, or 8.5×11)

## Apps Script Actions Reference
| Action | Purpose | Key Params |
|--------|---------|------------|
| read | Read all pallets (10 cols incl Final Destination) | — |
| createpallet | Create new pallet | origin, finaldest, description, user |
| closepallet | Close/seal pallet | palletid, user |
| reopenpallet | Reopen closed pallet | palletid, user |
| updatepalletorigin | Update pallet origin | palletid, origin, user |
| updatepalletfinaldest | Update pallet final destination | palletid, finaldest, user |
| readhubs | Read all locations (hubs + final) | — |
| addhub | Add location | locationid, name, address, locationtype, notes |
| updatehub | Edit location | row, name, address, locationtype, notes |
| assignroute | Assign route to pallet | palletid, finaldest, legs (JSON), user |
| removerouting | Delete route and legs for pallet | palletid, user |
| readroutes | Read all routes | — |
| readlegs | Read all route legs (14 cols) | — |
| pickupscan | Pickup scan (logs location) | palletid, user |
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
| addlinehaul | Create a new line haul | lineid, name, startingpoint, occurrence, stops (JSON), user |
| updatelinehaul | Edit a line haul | row, name, startingpoint, occurrence, stops (JSON), user |
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
- overview.html — removed from nav, legacy
