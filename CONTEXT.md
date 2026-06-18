# Frontier Shipping — Project Context

## Overview
Web-based transportation tracking tool for CTDI's Frontier operation. Tracks pallets from warehouse through cross-dock hubs to final delivery locations. Built with HTML/JS frontend + Google Sheets backend via Apps Script.

## Architecture
- **Frontend:** Static HTML/JS pages (one per view/action)
- **Backend:** Google Apps Script deployed as Web App
- **Database:** Google Sheets (tabs = tables)
- **Communication:** JSONP requests
- **Auth:** localStorage-based login with Users sheet
- **Design:** Dark navy sidebar (#1a3a5c), CTDI branding, responsive

## Google Sheet
- **Name:** Frontier Tracking

### Tabs & Columns:
| Tab | Columns |
|-----|---------|
| Pallets | Pallet ID, Origin, Description, Status, Opened By, Open Date, Closed By, Close Date, Current Location |
| Routes | Pallet ID, Final Destination, Created By, Created Date |
| Route Legs | Pallet ID, Leg #, From Location, To Location, Leg Type, Status, Pickup Scan By, Pickup Scan Date, Dropoff Scan By, Dropoff Scan Date, Receipt Scan By, Receipt Scan Date |
| Transaction History | Pallet ID, Timestamp, Action, Leg #, Location, User |
| Hub Locations | Location ID, Name, Address, Notes |
| Exceptions | Pallet ID, Timestamp, Type, Note, Reported By, Status, Resolved By, Resolution Date |
| Users | Username, Password, Email, Role |

## Pallet ID Format
- Sequential: PLB-000001, PLB-000002, etc.
- Auto-assigned on creation

## Pallet Statuses
- Open, Closed, In Transit, At Hub, Delivered, On Hold

## Route Structure
- Each pallet has one Route (final destination)
- Each route has 1+ Legs
- Leg Types: Transfer (to hub), Final (to end destination)

## Leg Scan Model
Each leg has up to 3 scans:
- **Pickup Scan** — Driver/shipper picks up (Leg → In Transit)
- **Dropoff Scan** — Driver drops off at destination (Transfer → Dropped Off, Final → Complete/Delivered)
- **Receipt Scan** — Hub receiver confirms arrival (Transfer legs only → Complete)

## Leg Statuses
- Pending, In Transit, Dropped Off, Complete

## Transaction History Actions
- Created, Closed, Route Assigned, Pickup Scan, Dropoff Scan, Receipt Scan, Delivered, Exception Reported, Hold, Hold Released

## Hub Locations
- Predefined warehouse/cross-dock locations stored in sheet
- Used as dropdown options for routing
- Each has: Location ID, Name, Address, Notes

## Exception Types
- Damage, Delay, Lost, Other

## User Roles
- Admin, Operator, Driver

## Pages & Navigation
```
▶ Views
  - overview.html (Dashboard — pipeline, KPIs, recent activity)
  - pallet-tracker.html (Search any Pallet ID, see full timeline)
  - delivery-history.html (Completed deliveries)
▶ Operations
  - create-pallet.html (Create new pallet, auto-assign PLB-xxxxxx)
  - close-pallet.html (Close/seal a pallet)
  - routing.html (Assign route — final destination + hub legs)
  - pickup-scan.html (Driver pickup scan)
  - dropoff-scan.html (Driver dropoff scan)
  - receipt-scan.html (Hub receipt scan)
▶ Exceptions
  - report-exception.html (Flag issue on a pallet)
  - open-exceptions.html (Unresolved exceptions)
▶ System
  - hub-locations.html (Manage hub locations)
  - settings.html (Apps Script URL config)
```

## Technical Conventions
- localStorage key for URL: `fs_script_url`
- localStorage key for auth: `fs_auth`
- JSONP callback pattern (same as FWA/AWAT)
- Timestamps: M/d/yyyy HH:mm:ss
- Anti-double-click: disabled + flag guards on submit buttons
- Toast notifications for feedback
- Status dot indicator (connected/disconnected/pending)

## Design Style
- Dark navy sidebar (#1a3a5c) with CTDI branding
- Responsive (mobile sidebar toggle)
- Status indicator (green/red/orange dot)
- Toast notifications
- Modal popups for detail/routing
- Consistent with FWA and AWAT apps
