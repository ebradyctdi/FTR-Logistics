// ============================================================
// FRONTIER SHIPPING — Google Apps Script
// Paste into your Google Sheet: Extensions → Apps Script
// Deploy → New Deployment → Web App → Execute as: Me → Anyone
// ============================================================
// SETUP:
// 1. Google Sheet with tabs:
//    - "Pallets" headers: Pallet ID | Origin | Description | Status | Opened By | Open Date | Closed By | Close Date | Current Location
//    - "Routes" headers: Pallet ID | Final Destination | Created By | Created Date
//    - "Route Legs" headers: Pallet ID | Leg # | From Location | To Location | Leg Type | Status | Pickup Scan By | Pickup Scan Date | Dropoff Scan By | Dropoff Scan Date | Receipt Scan By | Receipt Scan Date
//    - "Transaction History" headers: Pallet ID | Timestamp | Action | Leg # | Location | User
//    - "Hub Locations" headers: Location ID | Name | Address | Notes
//    - "Exceptions" headers: Pallet ID | Timestamp | Type | Note | Reported By | Status | Resolved By | Resolution Date
//    - "Users" headers: Username | Password | Email | Role
// ============================================================

var TS_FORMAT = 'M/d/yyyy HH:mm:ss';

function _respond(obj, callback) {
  var json = JSON.stringify(obj);
  if (callback) {
    return ContentService.createTextOutput(callback + '(' + json + ')')
      .setMimeType(ContentService.MimeType.JAVASCRIPT);
  }
  return ContentService.createTextOutput(json)
    .setMimeType(ContentService.MimeType.JSON);
}

function _cellToString(val) {
  if (val === null || val === undefined || val === '') return '';
  if (val instanceof Date) {
    // Use the spreadsheet's timezone to match what the user sees in the sheet
    var tz = SpreadsheetApp.getActiveSpreadsheet().getSpreadsheetTimeZone();
    return Utilities.formatDate(val, tz, 'M/d/yyyy H:mm:ss');
  }
  return val.toString();
}

function _ts(now) {
  return Utilities.formatDate(now, 'America/New_York', TS_FORMAT);
}

function _findPallet(sheet, palletId) {
  var lastRow = sheet.getLastRow();
  if (lastRow < 2) return -1;
  var col = sheet.getRange('A2:A' + lastRow).getValues().flat();
  for (var i = 0; i < col.length; i++) {
    if (col[i].toString().trim() === palletId) return i;
  }
  return -1;
}

function _getNextPalletId(sheet) {
  var lastRow = sheet.getLastRow();
  if (lastRow < 2) return 'PLB-000001';
  var ids = sheet.getRange('A2:A' + lastRow).getValues().flat();
  var max = 0;
  for (var i = 0; i < ids.length; i++) {
    var match = ids[i].toString().match(/PLB-(\d+)/);
    if (match) {
      var num = parseInt(match[1]);
      if (num > max) max = num;
    }
  }
  var next = max + 1;
  return 'PLB-' + ('000000' + next).slice(-6);
}

function _logTransaction(ss, palletId, action, legNum, location, user) {
  var histSheet = ss.getSheetByName('Transaction History');
  if (!histSheet) return;
  var now = new Date();
  var ts = _ts(now);
  histSheet.appendRow([palletId, ts, action, legNum || '', location || '', user || '']);
}

function doGet(e) {
  var callback = (e && e.parameter && e.parameter.callback) ? e.parameter.callback : null;
  var action = (e && e.parameter && e.parameter.action) ? e.parameter.action : 'read';
  var user = (e && e.parameter && e.parameter.user) ? e.parameter.user.toString().trim() : '';

  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var palletSheet = ss.getSheetByName('Pallets');
    if (!palletSheet) return _respond({ success: false, error: 'Sheet "Pallets" not found' }, callback);

    // ---- LOGIN ----
    if (action === 'login') {
      var usersSheet = ss.getSheetByName('Users');
      if (!usersSheet) return _respond({ success: false, error: 'Sheet "Users" not found' }, callback);
      var username = (e.parameter.username || '').toString().trim();
      var password = (e.parameter.password || '').toString().trim();
      if (!username || !password) return _respond({ success: false, error: 'Username and password are required' }, callback);
      var data = usersSheet.getDataRange().getValues();
      for (var i = 1; i < data.length; i++) {
        var u = (data[i][0] || '').toString().trim();
        var p = (data[i][1] || '').toString().trim();
        var role = (data[i][3] || '').toString().trim();
        if (u.toLowerCase() === username.toLowerCase() && p === password) {
          return _respond({ success: true, username: u, role: role || 'Operator' }, callback);
        }
      }
      return _respond({ success: false, error: 'Invalid username or password' }, callback);
    }

    // ---- READ ALL PALLETS ----
    if (action === 'read') {
      var lastRow = palletSheet.getLastRow();
      if (lastRow < 2) return _respond({ success: true, data: [] }, callback);
      var data = palletSheet.getRange(2, 1, lastRow - 1, 10).getValues();
      var headers = ['Pallet ID', 'Origin', 'Description', 'Status', 'Opened By', 'Open Date', 'Closed By', 'Close Date', 'Current Location', 'Final Destination'];
      var rows = data.map(function(row) {
        var obj = {};
        headers.forEach(function(h, i) { obj[h] = _cellToString(row[i]); });
        return obj;
      });
      return _respond({ success: true, data: rows }, callback);
    }

    // ---- CREATE PALLET ----
    if (action === 'createpallet') {
      var origin = (e.parameter.origin || '').toString().trim();
      var description = (e.parameter.description || '').toString().trim();
      var finalDest = (e.parameter.finaldest || '').toString().trim();
      if (!origin) return _respond({ success: false, error: 'Origin is required' }, callback);

      var palletId = _getNextPalletId(palletSheet);
      var now = new Date();
      var ts = _ts(now);
      palletSheet.appendRow([palletId, origin, description, 'Open', user, ts, '', '', origin, finalDest]);
      _logTransaction(ss, palletId, 'Pallet Created', '', origin, user);
      return _respond({ success: true, palletId: palletId, openDate: ts }, callback);
    }

    // ---- CLOSE PALLET ----
    if (action === 'closepallet') {
      var palletId = (e.parameter.palletid || '').toString().trim();
      if (!palletId) return _respond({ success: false, error: 'Pallet ID is required' }, callback);

      var idx = _findPallet(palletSheet, palletId);
      if (idx === -1) return _respond({ success: false, error: 'Pallet ' + palletId + ' not found' }, callback);

      var row = idx + 2;
      var status = palletSheet.getRange(row, 4).getValue().toString().trim();
      if (status !== 'Open') {
        return _respond({ success: false, error: 'Pallet is "' + status + '", expected "Open"' }, callback);
      }

      var now = new Date();
      var ts = _ts(now);
      palletSheet.getRange(row, 4).setValue('Closed');
      palletSheet.getRange(row, 7).setValue(user);
      palletSheet.getRange(row, 8).setValue(ts);
      _logTransaction(ss, palletId, 'Pallet Closed', '', '', user);
      return _respond({ success: true, palletId: palletId, closeDate: ts }, callback);
    }

    // ---- READ HUB LOCATIONS ----
    if (action === 'readhubs') {
      var hubSheet = ss.getSheetByName('Hub Locations');
      if (!hubSheet) return _respond({ success: true, data: [] }, callback);
      var lastRow = hubSheet.getLastRow();
      if (lastRow < 2) return _respond({ success: true, data: [] }, callback);
      var data = hubSheet.getRange(2, 1, lastRow - 1, 5).getValues();
      var headers = ['Location ID', 'Name', 'Address', 'Location Type', 'Notes'];
      var rows = data.map(function(row) {
        var obj = {};
        headers.forEach(function(h, i) { obj[h] = _cellToString(row[i]); });
        return obj;
      });
      return _respond({ success: true, data: rows }, callback);
    }

    // ---- ADD HUB LOCATION ----
    if (action === 'addhub') {
      var hubSheet = ss.getSheetByName('Hub Locations');
      if (!hubSheet) return _respond({ success: false, error: 'Sheet "Hub Locations" not found' }, callback);
      var locId = (e.parameter.locationid || '').toString().trim();
      var name = (e.parameter.name || '').toString().trim();
      var address = (e.parameter.address || '').toString().trim();
      var locType = (e.parameter.locationtype || 'Hub').toString().trim();
      var notes = (e.parameter.notes || '').toString().trim();
      if (!locId || !name) return _respond({ success: false, error: 'Location ID and Name are required' }, callback);

      // Duplicate check
      var lastRow = hubSheet.getLastRow();
      if (lastRow >= 2) {
        var ids = hubSheet.getRange('A2:A' + lastRow).getValues().flat();
        for (var i = 0; i < ids.length; i++) {
          if (ids[i].toString().trim().toUpperCase() === locId.toUpperCase()) {
            return _respond({ success: false, error: 'Location ID "' + locId + '" already exists' }, callback);
          }
        }
      }
      hubSheet.appendRow([locId, name, address, locType, notes]);
      return _respond({ success: true, locationId: locId }, callback);
    }

    // ---- UPDATE HUB LOCATION ----
    if (action === 'updatehub') {
      var hubSheet = ss.getSheetByName('Hub Locations');
      if (!hubSheet) return _respond({ success: false, error: 'Sheet "Hub Locations" not found' }, callback);
      var row = parseInt(e.parameter.row);
      if (isNaN(row)) return _respond({ success: false, error: 'Row required' }, callback);
      var sheetRow = row + 2;
      var name = (e.parameter.name || '').toString().trim();
      var address = (e.parameter.address || '').toString().trim();
      var locType = (e.parameter.locationtype || '').toString().trim();
      var notes = (e.parameter.notes || '').toString().trim();
      if (!name) return _respond({ success: false, error: 'Name is required' }, callback);
      hubSheet.getRange(sheetRow, 2).setValue(name);
      hubSheet.getRange(sheetRow, 3).setValue(address);
      if (locType) hubSheet.getRange(sheetRow, 4).setValue(locType);
      hubSheet.getRange(sheetRow, 5).setValue(notes);
      return _respond({ success: true }, callback);
    }

    // ---- ASSIGN ROUTE ----
    if (action === 'assignroute') {
      var palletId = (e.parameter.palletid || '').toString().trim();
      var finalDest = (e.parameter.finaldest || '').toString().trim();
      var legsJson = (e.parameter.legs || '[]').toString();
      if (!palletId) return _respond({ success: false, error: 'Pallet ID is required' }, callback);
      if (!finalDest) return _respond({ success: false, error: 'Final Destination is required' }, callback);

      var idx = _findPallet(palletSheet, palletId);
      if (idx === -1) return _respond({ success: false, error: 'Pallet ' + palletId + ' not found' }, callback);

      var legs = JSON.parse(legsJson);
      if (!legs.length) return _respond({ success: false, error: 'At least one leg is required' }, callback);

      // Save route
      var routeSheet = ss.getSheetByName('Routes');
      if (!routeSheet) return _respond({ success: false, error: 'Sheet "Routes" not found' }, callback);
      var now = new Date();
      var ts = _ts(now);
      routeSheet.appendRow([palletId, finalDest, user, ts]);

      // Save legs
      var legSheet = ss.getSheetByName('Route Legs');
      if (!legSheet) return _respond({ success: false, error: 'Sheet "Route Legs" not found' }, callback);
      for (var i = 0; i < legs.length; i++) {
        var leg = legs[i];
        var trackingNum = 'TRK-' + palletId.replace('-', '') + '-L' + (i + 1);
        legSheet.appendRow([trackingNum, palletId, i + 1, leg.from, leg.to, leg.type, 'Pending', '', '', '', '', '', '']);
      }

      _logTransaction(ss, palletId, 'Route Assigned', '', '', user);
      return _respond({ success: true, palletId: palletId, legs: legs.length }, callback);
    }

    // ---- READ ROUTES ----
    if (action === 'readroutes') {
      var routeSheet = ss.getSheetByName('Routes');
      if (!routeSheet) return _respond({ success: true, data: [] }, callback);
      var lastRow = routeSheet.getLastRow();
      if (lastRow < 2) return _respond({ success: true, data: [] }, callback);
      var data = routeSheet.getRange(2, 1, lastRow - 1, 4).getValues();
      var headers = ['Pallet ID', 'Final Destination', 'Created By', 'Created Date'];
      var rows = data.map(function(row) {
        var obj = {};
        headers.forEach(function(h, i) { obj[h] = _cellToString(row[i]); });
        return obj;
      });
      return _respond({ success: true, data: rows }, callback);
    }

    // ---- READ ROUTE LEGS ----
    if (action === 'readlegs') {
      var legSheet = ss.getSheetByName('Route Legs');
      if (!legSheet) return _respond({ success: true, data: [] }, callback);
      var lastRow = legSheet.getLastRow();
      if (lastRow < 2) return _respond({ success: true, data: [] }, callback);
      var data = legSheet.getRange(2, 1, lastRow - 1, 14).getValues();
      var headers = ['Tracking Number', 'Pallet ID', 'Leg #', 'From Location', 'To Location', 'Leg Type', 'Status', 'Pickup Scan By', 'Pickup Scan Date', 'Dropoff Scan By', 'Dropoff Scan Date', 'Receipt Scan By', 'Receipt Scan Date', 'Extra'];
      var rows = data.map(function(row) {
        var obj = {};
        headers.forEach(function(h, i) { obj[h] = _cellToString(row[i]); });
        return obj;
      });
      return _respond({ success: true, data: rows }, callback);
    }

    // ---- PICKUP SCAN ----
    if (action === 'pickupscan') {
      var palletId = (e.parameter.palletid || '').toString().trim();
      if (!palletId) return _respond({ success: false, error: 'Pallet ID is required' }, callback);

      var legSheet = ss.getSheetByName('Route Legs');
      if (!legSheet) return _respond({ success: false, error: 'Sheet "Route Legs" not found' }, callback);

      // Find the next pending leg for this pallet
      var lastRow = legSheet.getLastRow();
      if (lastRow < 2) return _respond({ success: false, error: 'No route legs found' }, callback);
      var data = legSheet.getRange(2, 1, lastRow - 1, 14).getValues();
      var targetRow = -1;
      var legNum = '';
      var fromLocation = '';
      for (var i = 0; i < data.length; i++) {
        if (data[i][1].toString().trim() === palletId && data[i][6].toString().trim() === 'Pending') {
          targetRow = i + 2;
          legNum = data[i][2].toString();
          fromLocation = data[i][3].toString().trim();
          break;
        }
      }
      if (targetRow === -1) return _respond({ success: false, error: 'No pending leg found for ' + palletId }, callback);

      var now = new Date();
      var ts = _ts(now);
      legSheet.getRange(targetRow, 7).setValue('In Transit');
      legSheet.getRange(targetRow, 8).setValue(user);
      legSheet.getRange(targetRow, 9).setValue(ts);

      // Update pallet status and current location
      var palletIdx = _findPallet(palletSheet, palletId);
      if (palletIdx >= 0) {
        palletSheet.getRange(palletIdx + 2, 4).setValue('In Transit');
      }

      _logTransaction(ss, palletId, 'Pickup Scan', legNum, fromLocation, user);
      return _respond({ success: true, palletId: palletId, leg: legNum, pickupDate: ts }, callback);
    }

    // ---- DROPOFF SCAN ----
    if (action === 'dropoffscan') {
      var palletId = (e.parameter.palletid || '').toString().trim();
      if (!palletId) return _respond({ success: false, error: 'Pallet ID is required' }, callback);

      var legSheet = ss.getSheetByName('Route Legs');
      if (!legSheet) return _respond({ success: false, error: 'Sheet "Route Legs" not found' }, callback);

      var lastRow = legSheet.getLastRow();
      if (lastRow < 2) return _respond({ success: false, error: 'No route legs found' }, callback);
      var data = legSheet.getRange(2, 1, lastRow - 1, 14).getValues();
      var targetRow = -1;
      var legNum = '';
      var legType = '';
      var toLocation = '';
      for (var i = 0; i < data.length; i++) {
        if (data[i][1].toString().trim() === palletId && data[i][6].toString().trim() === 'In Transit') {
          targetRow = i + 2;
          legNum = data[i][2].toString();
          legType = data[i][5].toString().trim();
          toLocation = data[i][4].toString().trim();
          break;
        }
      }
      if (targetRow === -1) return _respond({ success: false, error: 'No in-transit leg found for ' + palletId }, callback);

      var now = new Date();
      var ts = _ts(now);
      legSheet.getRange(targetRow, 10).setValue(user);
      legSheet.getRange(targetRow, 11).setValue(ts);

      // If Final leg, mark complete and pallet as Delivered
      if (legType === 'Final') {
        legSheet.getRange(targetRow, 7).setValue('Complete');
        var palletIdx = _findPallet(palletSheet, palletId);
        if (palletIdx >= 0) {
          palletSheet.getRange(palletIdx + 2, 4).setValue('Delivered');
          palletSheet.getRange(palletIdx + 2, 9).setValue(toLocation);
        }
        _logTransaction(ss, palletId, 'Dropoff Scan', legNum, toLocation, user);
        _logTransaction(ss, palletId, 'Delivered', legNum, toLocation, user);
      } else {
        legSheet.getRange(targetRow, 7).setValue('Dropped Off');
        var palletIdx = _findPallet(palletSheet, palletId);
        if (palletIdx >= 0) {
          palletSheet.getRange(palletIdx + 2, 9).setValue(toLocation);
        }
        _logTransaction(ss, palletId, 'Dropoff Scan', legNum, toLocation, user);
      }

      return _respond({ success: true, palletId: palletId, leg: legNum, legType: legType, dropoffDate: ts }, callback);
    }

    // ---- RECEIPT SCAN ----
    if (action === 'receiptscan') {
      var palletId = (e.parameter.palletid || '').toString().trim();
      if (!palletId) return _respond({ success: false, error: 'Pallet ID is required' }, callback);

      var legSheet = ss.getSheetByName('Route Legs');
      if (!legSheet) return _respond({ success: false, error: 'Sheet "Route Legs" not found' }, callback);

      var lastRow = legSheet.getLastRow();
      if (lastRow < 2) return _respond({ success: false, error: 'No route legs found' }, callback);
      var data = legSheet.getRange(2, 1, lastRow - 1, 14).getValues();
      var targetRow = -1;
      var legNum = '';
      var toLocation = '';
      for (var i = 0; i < data.length; i++) {
        if (data[i][1].toString().trim() === palletId && data[i][6].toString().trim() === 'Dropped Off') {
          targetRow = i + 2;
          legNum = data[i][2].toString();
          toLocation = data[i][4].toString().trim();
          break;
        }
      }
      if (targetRow === -1) return _respond({ success: false, error: 'No dropped-off leg found for ' + palletId }, callback);

      var now = new Date();
      var ts = _ts(now);
      legSheet.getRange(targetRow, 7).setValue('Complete');
      legSheet.getRange(targetRow, 12).setValue(user);
      legSheet.getRange(targetRow, 13).setValue(ts);

      // Update pallet status to At Hub
      var palletIdx = _findPallet(palletSheet, palletId);
      if (palletIdx >= 0) {
        palletSheet.getRange(palletIdx + 2, 4).setValue('At Hub');
        palletSheet.getRange(palletIdx + 2, 9).setValue(toLocation);
      }

      _logTransaction(ss, palletId, 'Receipt Scan', legNum, toLocation, user);
      return _respond({ success: true, palletId: palletId, leg: legNum, receiptDate: ts }, callback);
    }

    // ---- REPORT EXCEPTION ----
    if (action === 'reportexception') {
      var palletId = (e.parameter.palletid || '').toString().trim();
      var type = (e.parameter.type || '').toString().trim();
      var note = (e.parameter.note || '').toString().trim();
      if (!palletId) return _respond({ success: false, error: 'Pallet ID is required' }, callback);
      if (!type) return _respond({ success: false, error: 'Exception type is required' }, callback);
      if (!note) return _respond({ success: false, error: 'Note is required' }, callback);

      var excSheet = ss.getSheetByName('Exceptions');
      if (!excSheet) return _respond({ success: false, error: 'Sheet "Exceptions" not found' }, callback);

      var now = new Date();
      var ts = _ts(now);
      excSheet.appendRow([palletId, ts, type, note, user, 'Open', '', '']);

      // Put pallet on hold
      var palletIdx = _findPallet(palletSheet, palletId);
      if (palletIdx >= 0) {
        palletSheet.getRange(palletIdx + 2, 4).setValue('On Hold');
      }

      _logTransaction(ss, palletId, 'Exception Reported', '', '', user);
      return _respond({ success: true, palletId: palletId }, callback);
    }

    // ---- READ EXCEPTIONS ----
    if (action === 'readexceptions') {
      var excSheet = ss.getSheetByName('Exceptions');
      if (!excSheet) return _respond({ success: true, data: [] }, callback);
      var lastRow = excSheet.getLastRow();
      if (lastRow < 2) return _respond({ success: true, data: [] }, callback);
      var data = excSheet.getRange(2, 1, lastRow - 1, 8).getValues();
      var headers = ['Pallet ID', 'Timestamp', 'Type', 'Note', 'Reported By', 'Status', 'Resolved By', 'Resolution Date'];
      var rows = data.map(function(row) {
        var obj = {};
        headers.forEach(function(h, i) { obj[h] = _cellToString(row[i]); });
        return obj;
      });
      return _respond({ success: true, data: rows }, callback);
    }

    // ---- RESOLVE EXCEPTION ----
    if (action === 'resolveexception') {
      var excSheet = ss.getSheetByName('Exceptions');
      if (!excSheet) return _respond({ success: false, error: 'Sheet "Exceptions" not found' }, callback);
      var row = parseInt(e.parameter.row);
      if (isNaN(row)) return _respond({ success: false, error: 'Row required' }, callback);
      var sheetRow = row + 2;
      var now = new Date();
      var ts = _ts(now);
      excSheet.getRange(sheetRow, 6).setValue('Resolved');
      excSheet.getRange(sheetRow, 7).setValue(user);
      excSheet.getRange(sheetRow, 8).setValue(ts);

      // Release hold on pallet - set back to previous logical status
      var palletId = excSheet.getRange(sheetRow, 1).getValue().toString().trim();
      var palletIdx = _findPallet(palletSheet, palletId);
      if (palletIdx >= 0) {
        // Determine correct status from route legs
        var legSheet = ss.getSheetByName('Route Legs');
        var newStatus = 'Closed';
        if (legSheet && legSheet.getLastRow() >= 2) {
          var legData = legSheet.getRange(2, 1, legSheet.getLastRow() - 1, 7).getValues();
          for (var i = legData.length - 1; i >= 0; i--) {
            if (legData[i][1].toString().trim() === palletId) {
              var legStatus = legData[i][6].toString().trim();
              if (legStatus === 'In Transit') { newStatus = 'In Transit'; break; }
              if (legStatus === 'Dropped Off') { newStatus = 'At Hub'; break; }
              if (legStatus === 'Complete') { newStatus = 'At Hub'; break; }
              if (legStatus === 'Pending') { newStatus = 'Closed'; break; }
            }
          }
        }
        palletSheet.getRange(palletIdx + 2, 4).setValue(newStatus);
      }

      _logTransaction(ss, palletId, 'Hold Released', '', '', user);
      return _respond({ success: true, palletId: palletId }, callback);
    }

    // ---- REMOVE ROUTING ----
    if (action === 'removerouting') {
      var palletId = (e.parameter.palletid || '').toString().trim();
      if (!palletId) return _respond({ success: false, error: 'Pallet ID is required' }, callback);

      // Delete from Routes tab
      var routeSheet = ss.getSheetByName('Routes');
      if (routeSheet && routeSheet.getLastRow() >= 2) {
        var routeData = routeSheet.getRange(2, 1, routeSheet.getLastRow() - 1, 1).getValues().flat();
        for (var i = routeData.length - 1; i >= 0; i--) {
          if (routeData[i].toString().trim() === palletId) {
            routeSheet.deleteRow(i + 2);
          }
        }
      }

      // Delete from Route Legs tab
      var legSheet = ss.getSheetByName('Route Legs');
      if (legSheet && legSheet.getLastRow() >= 2) {
        var legData = legSheet.getRange(2, 2, legSheet.getLastRow() - 1, 1).getValues().flat();
        for (var i = legData.length - 1; i >= 0; i--) {
          if (legData[i].toString().trim() === palletId) {
            legSheet.deleteRow(i + 2);
          }
        }
      }

      _logTransaction(ss, palletId, 'Route Removed', '', '', user);
      return _respond({ success: true, palletId: palletId }, callback);
    }

    // ---- UPDATE PALLET ORIGIN ----
    if (action === 'updatepalletorigin') {
      var palletId = (e.parameter.palletid || '').toString().trim();
      var origin = (e.parameter.origin || '').toString().trim();
      if (!palletId) return _respond({ success: false, error: 'Pallet ID is required' }, callback);
      if (!origin) return _respond({ success: false, error: 'Origin is required' }, callback);
      var idx = _findPallet(palletSheet, palletId);
      if (idx === -1) return _respond({ success: false, error: 'Pallet not found' }, callback);
      var row = idx + 2;
      palletSheet.getRange(row, 2).setValue(origin);
      palletSheet.getRange(row, 9).setValue(origin); // Update Current Location too
      return _respond({ success: true }, callback);
    }

    // ---- UPDATE PALLET FINAL DESTINATION ----
    if (action === 'updatepalletfinaldest') {
      var palletId = (e.parameter.palletid || '').toString().trim();
      var finalDest = (e.parameter.finaldest || '').toString().trim();
      if (!palletId) return _respond({ success: false, error: 'Pallet ID is required' }, callback);
      var idx = _findPallet(palletSheet, palletId);
      if (idx === -1) return _respond({ success: false, error: 'Pallet not found' }, callback);
      var row = idx + 2;
      palletSheet.getRange(row, 10).setValue(finalDest);
      return _respond({ success: true }, callback);
    }

    // ---- TRANSACTION HISTORY ----
    if (action === 'readhistory') {
      var histSheet = ss.getSheetByName('Transaction History');
      if (!histSheet) return _respond({ success: true, data: [] }, callback);
      var lastRow = histSheet.getLastRow();
      if (lastRow < 2) return _respond({ success: true, data: [] }, callback);
      var data = histSheet.getRange(2, 1, lastRow - 1, 6).getValues();
      var headers = ['Pallet ID', 'Timestamp', 'Action', 'Leg #', 'Location', 'User'];
      var rows = data.map(function(row) {
        var obj = {};
        headers.forEach(function(h, i) { obj[h] = _cellToString(row[i]); });
        return obj;
      });
      return _respond({ success: true, data: rows }, callback);
    }

    // ---- PALLET HISTORY (single pallet) ----
    if (action === 'pallethistory') {
      var palletId = (e.parameter.palletid || '').toString().trim();
      if (!palletId) return _respond({ success: false, error: 'Pallet ID is required' }, callback);
      var histSheet = ss.getSheetByName('Transaction History');
      if (!histSheet) return _respond({ success: true, data: [] }, callback);
      var lastRow = histSheet.getLastRow();
      if (lastRow < 2) return _respond({ success: true, data: [] }, callback);
      var data = histSheet.getRange(2, 1, lastRow - 1, 6).getValues();
      var headers = ['Pallet ID', 'Timestamp', 'Action', 'Leg #', 'Location', 'User'];
      var rows = [];
      for (var i = 0; i < data.length; i++) {
        if (data[i][0].toString().trim() === palletId) {
          var obj = {};
          headers.forEach(function(h, j) { obj[h] = data[i][j] ? data[i][j].toString() : ''; });
          rows.push(obj);
        }
      }
      return _respond({ success: true, data: rows }, callback);
    }

    // ---- CREATE USER ----
    if (action === 'createuser') {
      var usersSheet = ss.getSheetByName('Users');
      if (!usersSheet) return _respond({ success: false, error: 'Sheet "Users" not found' }, callback);
      var username = (e.parameter.username || '').toString().trim();
      var password = (e.parameter.password || '').toString().trim();
      var email = (e.parameter.email || '').toString().trim();
      var role = (e.parameter.role || 'Operator').toString().trim();
      if (!username) return _respond({ success: false, error: 'Username is required' }, callback);
      if (!password) return _respond({ success: false, error: 'Password is required' }, callback);

      var data = usersSheet.getDataRange().getValues();
      for (var i = 1; i < data.length; i++) {
        if ((data[i][0] || '').toString().trim().toLowerCase() === username.toLowerCase()) {
          return _respond({ success: false, error: 'Username already exists' }, callback);
        }
      }
      usersSheet.appendRow([username, password, email, role]);
      return _respond({ success: true, username: username }, callback);
    }

    // ---- REOPEN PALLET ----
    if (action === 'reopenpallet') {
      var palletId = (e.parameter.palletid || '').toString().trim();
      if (!palletId) return _respond({ success: false, error: 'Pallet ID is required' }, callback);

      var idx = _findPallet(palletSheet, palletId);
      if (idx === -1) return _respond({ success: false, error: 'Pallet ' + palletId + ' not found' }, callback);

      var row = idx + 2;
      var status = palletSheet.getRange(row, 4).getValue().toString().trim();
      if (status !== 'Closed') {
        return _respond({ success: false, error: 'Pallet is "' + status + '", expected "Closed"' }, callback);
      }

      palletSheet.getRange(row, 4).setValue('Open');
      palletSheet.getRange(row, 7).setValue(''); // Clear Closed By
      palletSheet.getRange(row, 8).setValue(''); // Clear Close Date
      _logTransaction(ss, palletId, 'Reopened', '', '', user);
      return _respond({ success: true, palletId: palletId }, callback);
    }

    // ---- READ PALLET ITEMS ----
    if (action === 'readpalletitems') {
      var piSheet = ss.getSheetByName('Pallet Build Info');
      if (!piSheet) return _respond({ success: true, data: [] }, callback);
      var lastRow = piSheet.getLastRow();
      if (lastRow < 2) return _respond({ success: true, data: [] }, callback);
      var data = piSheet.getRange(2, 1, lastRow - 1, 11).getValues();
      var headers = ['Record Number', 'Pallet ID', 'MUSE Ticket', 'Description Note', 'Item Quantity', 'Item Serial Number', 'Date Added', 'Added By', 'Date Removed', 'Removed By', 'Status'];
      var palletFilter = (e.parameter.palletid || '').toString().trim();
      var rows = [];
      for (var i = 0; i < data.length; i++) {
        var row = {};
        headers.forEach(function(h, j) { row[h] = _cellToString(data[i][j]); });
        row['_row'] = i; // 0-based index for updates
        if (!palletFilter || row['Pallet ID'] === palletFilter) rows.push(row);
      }
      return _respond({ success: true, data: rows }, callback);
    }

    // ---- ADD PALLET ITEM ----
    if (action === 'addpalletitem') {
      var piSheet = ss.getSheetByName('Pallet Build Info');
      if (!piSheet) return _respond({ success: false, error: 'Sheet "Pallet Build Info" not found' }, callback);
      var palletId = (e.parameter.palletid || '').toString().trim();
      var itemCode = (e.parameter.itemcode || '').toString().trim();
      var itemDesc = (e.parameter.itemdesc || '').toString().trim();
      var itemQty = (e.parameter.itemqty || '1').toString().trim();
      var itemSerial = (e.parameter.itemserial || '').toString().trim();
      if (!palletId) return _respond({ success: false, error: 'Pallet ID is required' }, callback);
      if (!itemCode) return _respond({ success: false, error: 'Item Code is required' }, callback);

      // Generate next record number
      var lastRow = piSheet.getLastRow();
      var nextRecord = 1;
      if (lastRow >= 2) {
        var records = piSheet.getRange('A2:A' + lastRow).getValues().flat();
        for (var i = 0; i < records.length; i++) {
          var num = parseInt(records[i]);
          if (num >= nextRecord) nextRecord = num + 1;
        }
      }

      var now = new Date();
      var ts = _ts(now);
      piSheet.appendRow([nextRecord, palletId, itemCode, itemDesc, itemQty, itemSerial, ts, user, '', '', 'On Pallet']);
      return _respond({ success: true, record: nextRecord, palletId: palletId }, callback);
    }

    // ---- REMOVE PALLET ITEM ----
    if (action === 'removepalletitem') {
      var piSheet = ss.getSheetByName('Pallet Build Info');
      if (!piSheet) return _respond({ success: false, error: 'Sheet "Pallet Build Info" not found' }, callback);
      var row = parseInt(e.parameter.row);
      if (isNaN(row)) return _respond({ success: false, error: 'Row required' }, callback);
      var sheetRow = row + 2;
      var now = new Date();
      var ts = _ts(now);
      piSheet.getRange(sheetRow, 9).setValue(ts); // Date Removed
      piSheet.getRange(sheetRow, 10).setValue(user); // Removed By
      piSheet.getRange(sheetRow, 11).setValue('Removed'); // Status
      return _respond({ success: true }, callback);
    }

    // ---- READ LINE HAULS ----
    if (action === 'readlinehauls') {
      var lhSheet = ss.getSheetByName('Line Hauls');
      if (!lhSheet) return _respond({ success: true, data: [] }, callback);
      var lastRow = lhSheet.getLastRow();
      if (lastRow < 2) return _respond({ success: true, data: [] }, callback);
      var data = lhSheet.getRange(2, 1, lastRow - 1, 18).getValues();
      var headers = ['Line ID', 'Name', 'Starting Point', 'Occurrence', 'Stop 1', 'Stop 2', 'Stop 3', 'Stop 4', 'Stop 5', 'Stop 6', 'Stop 7', 'Stop 8', 'Stop 9', 'Stop 10', 'Created By', 'Created On', 'Last Edited', 'Edited By'];
      var rows = data.map(function(row, idx) {
        var obj = {};
        headers.forEach(function(h, i) { obj[h] = _cellToString(row[i]); });
        obj['_row'] = idx;
        return obj;
      });
      return _respond({ success: true, data: rows }, callback);
    }

    // ---- ADD LINE HAUL ----
    if (action === 'addlinehaul') {
      var lhSheet = ss.getSheetByName('Line Hauls');
      if (!lhSheet) return _respond({ success: false, error: 'Sheet "Line Hauls" not found' }, callback);
      var lineId = (e.parameter.lineid || '').toString().trim();
      var name = (e.parameter.name || '').toString().trim();
      var startingPoint = (e.parameter.startingpoint || '').toString().trim();
      var occurrence = (e.parameter.occurrence || '').toString().trim();
      var stopsJson = (e.parameter.stops || '[]').toString();
      if (!lineId) return _respond({ success: false, error: 'Line ID is required' }, callback);
      if (!name) return _respond({ success: false, error: 'Name is required' }, callback);
      if (!startingPoint) return _respond({ success: false, error: 'Starting Point is required' }, callback);

      // Duplicate check
      var lastRow = lhSheet.getLastRow();
      if (lastRow >= 2) {
        var ids = lhSheet.getRange('A2:A' + lastRow).getValues().flat();
        for (var i = 0; i < ids.length; i++) {
          if (ids[i].toString().trim().toUpperCase() === lineId.toUpperCase()) {
            return _respond({ success: false, error: 'Line ID "' + lineId + '" already exists' }, callback);
          }
        }
      }

      var stops = JSON.parse(stopsJson);
      var now = new Date();
      var ts = _ts(now);
      var rowData = [lineId, name, startingPoint, occurrence];
      for (var i = 0; i < 10; i++) {
        rowData.push(stops[i] || '');
      }
      rowData.push(user, ts, '', '');
      lhSheet.appendRow(rowData);
      return _respond({ success: true, lineId: lineId }, callback);
    }

    // ---- UPDATE LINE HAUL ----
    if (action === 'updatelinehaul') {
      var lhSheet = ss.getSheetByName('Line Hauls');
      if (!lhSheet) return _respond({ success: false, error: 'Sheet "Line Hauls" not found' }, callback);
      var row = parseInt(e.parameter.row);
      if (isNaN(row)) return _respond({ success: false, error: 'Row required' }, callback);
      var sheetRow = row + 2;
      var name = (e.parameter.name || '').toString().trim();
      var startingPoint = (e.parameter.startingpoint || '').toString().trim();
      var occurrence = (e.parameter.occurrence || '').toString().trim();
      var stopsJson = (e.parameter.stops || '[]').toString();
      if (!name) return _respond({ success: false, error: 'Name is required' }, callback);
      if (!startingPoint) return _respond({ success: false, error: 'Starting Point is required' }, callback);

      var stops = JSON.parse(stopsJson);
      var now = new Date();
      var ts = _ts(now);
      lhSheet.getRange(sheetRow, 2).setValue(name);
      lhSheet.getRange(sheetRow, 3).setValue(startingPoint);
      lhSheet.getRange(sheetRow, 4).setValue(occurrence);
      for (var i = 0; i < 10; i++) {
        lhSheet.getRange(sheetRow, 5 + i).setValue(stops[i] || '');
      }
      lhSheet.getRange(sheetRow, 17).setValue(ts);
      lhSheet.getRange(sheetRow, 18).setValue(user);
      return _respond({ success: true }, callback);
    }

    // ---- DELETE LINE HAUL ----
    if (action === 'deletelinehaul') {
      var lhSheet = ss.getSheetByName('Line Hauls');
      if (!lhSheet) return _respond({ success: false, error: 'Sheet "Line Hauls" not found' }, callback);
      var row = parseInt(e.parameter.row);
      if (isNaN(row)) return _respond({ success: false, error: 'Row required' }, callback);
      var sheetRow = row + 2;
      lhSheet.deleteRow(sheetRow);
      return _respond({ success: true }, callback);
    }

    // ---- DEFAULT: return all pallets ----
    return _respond({ success: true, data: [] }, callback);

  } catch (err) {
    return _respond({ success: false, error: err.toString() }, callback);
  }
}


