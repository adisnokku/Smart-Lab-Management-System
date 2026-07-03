/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Copy, Check, FileText, Settings, ShieldCheck, Database } from 'lucide-react';

export default function AppsScriptGuide() {
  const [copied, setCopied] = useState(false);

  const sheetStructure = [
    {
      tab: 'Users',
      desc: 'ตารางบันทึกข้อมูลและสิทธิ์ของผู้ใช้งานทั้งหมด',
      cols: ['email', 'name', 'role', 'status', 'phone', 'department', 'studentId', 'advisor', 'major', 'password', 'createdAt']
    },
    {
      tab: 'Instruments',
      desc: 'ตารางรายการเครื่องมือวิทยาศาสตร์ในแลป',
      cols: ['id', 'name', 'brand', 'location', 'status', 'picture', 'rule', 'ownerEmail']
    },
    {
      tab: 'Glassware',
      desc: 'ตารางคลังเครื่องแก้ว',
      cols: ['id', 'name', 'details', 'totalQty', 'availableQty', 'borrowedQty', 'picture']
    },
    {
      tab: 'Chemicals',
      desc: 'ตารางคลังสารเคมี กำหนดระดับการเตือนและหมดอายุ',
      cols: ['id', 'name', 'details', 'qty', 'unit', 'minQty', 'expiryDate', 'picture']
    },
    {
      tab: 'Requests',
      desc: 'ตารางประวัติธุรกรรมการจองและยืม-คืนทั้งหมด',
      cols: ['id', 'type', 'actionType', 'userEmail', 'userName', 'userPhone', 'instrumentId', 'instrumentName', 'items', 'requestDate', 'startDate', 'endDate', 'purpose', 'status', 'adminComment', 'returnNotified', 'returnNotifiedDate', 'updatedAt']
    }
  ];

  const appsScriptCode = `/**
 * Google Apps Script Backend for Smart Lab Management System
 * เผยแพร่เว็บแอปพลิเคชัน (Deploy as Web App) ตั้งค่าสิทธิ์: "ทุกคนแม้แต่ผู้ที่ไม่มีบัญชี" (Anyone, even anonymous)
 */

const SPREADSHEET_ID = "ใส่_ID_ของ_Google_Sheets_ที่นี่";

// แผนผังการแปลงชื่อหัวตารางเป็นชื่อคีย์ในระบบแบบทนทาน (Case-insensitive & space-insensitive header mapper)
const KEY_MAPS = {
  // Users
  'email': 'email', 'name': 'name', 'role': 'role', 'status': 'status', 'phone': 'phone',
  'department': 'department', 'studentid': 'studentId', 'advisor': 'advisor', 'major': 'major',
  'password': 'password', 'createdat': 'createdAt',
  
  // Instruments
  'id': 'id', 'brand': 'brand', 'location': 'location', 'picture': 'picture', 'rule': 'rule',
  'owneremail': 'ownerEmail',
  
  // Glassware
  'details': 'details', 'totalqty': 'totalQty', 'availableqty': 'availableQty', 'borrowedqty': 'borrowedQty',
  
  // Chemicals
  'qty': 'qty', 'unit': 'unit', 'minqty': 'minQty', 'expirydate': 'expiryDate',
  
  // Requests
  'type': 'type', 'actiontype': 'actionType', 'useremail': 'userEmail', 'username': 'userName',
  'userphone': 'userPhone', 'instrumentid': 'instrumentId', 'instrumentname': 'instrumentName',
  'items': 'items', 'requestdate': 'requestDate', 'startdate': 'startDate', 'enddate': 'endDate',
  'purpose': 'purpose', 'admincomment': 'adminComment', 'returnnotified': 'returnNotified',
  'returnnotifieddate': 'returnNotifiedDate', 'updatedat': 'updatedAt'
};

function getSheet(sheetName) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  let sheet = ss.getSheetByName(sheetName);
  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
  }
  return sheet;
}

// รับคำขอ GET จาก Frontend (ดึงข้อมูล)
function doGet(e) {
  try {
    const action = e.parameter.action;
    let data;
    
    if (action === "getInstruments") {
      data = readSheetData("Instruments");
    } else if (action === "getGlassware") {
      data = readSheetData("Glassware");
    } else if (action === "getChemicals") {
      data = readSheetData("Chemicals");
    } else if (action === "getUsers") {
      data = readSheetData("Users");
    } else if (action === "getRequests") {
      data = readSheetData("Requests");
      // แปลงคอลัมน์ items (JSON String) กลับเป็นวัตถุ
      data = data.map(function(r) {
        if (r.items) {
          try { r.items = JSON.parse(r.items); } catch(err) {}
        }
        return r;
      });
    } else if (action === "login") {
      const email = e.parameter.email.toLowerCase().trim();
      const password = e.parameter.password || "";
      const users = readSheetData("Users");
      const user = users.find(function(u) { 
        return u.email && String(u.email).toLowerCase().trim() === email; 
      });
      
      if (user) {
        // หากบัญชีเป็น Admin หรือ Teacher ต้องตรวจสอบรหัสผ่าน
        if (user.role === 'Admin' || user.role === 'Teacher') {
          var userPassword = String(user.password || '').trim();
          if (!userPassword) {
            userPassword = user.role === 'Admin' ? 'admin123' : 'teacher123';
          }
          if (!password) {
            return createResponse({ success: false, requiresPassword: true, message: "บัญชีอาจารย์/ผู้ดูแลระบบ จำเป็นต้องระบุรหัสผ่านเพื่อเข้าสู่ระบบ" });
          }
          if (String(password).trim() !== userPassword) {
            return createResponse({ success: false, requiresPassword: true, message: "รหัสผ่านไม่ถูกต้อง กรุณาตรวจสอบรหัสผ่านอีกครั้ง" });
          }
        }
        return createResponse({ success: true, user: user });
      } else {
        return createResponse({ success: false, requiresRegister: true, message: "User not found" });
      }
    } else if (action === "getAllData") {
      data = {
        instruments: readSheetData("Instruments"),
        glassware: readSheetData("Glassware"),
        chemicals: readSheetData("Chemicals"),
        requests: readSheetData("Requests")
      };
    } else {
      return createResponse({ success: false, message: "Invalid action" });
    }
    
    return createResponse(data);
  } catch(error) {
    return createResponse({ success: false, error: error.toString() });
  }
}

// รับคำขอ POST จาก Frontend (บันทึกข้อมูล)
function doPost(e) {
  try {
    const action = e.parameter.action;
    
    if (action === "register") {
      const userData = JSON.parse(e.parameter.userData);
      const sheet = getSheet("Users");
      
      // ตรวจสอบอีเมลซ้ำ
      const users = readSheetData("Users");
      const exists = users.some(function(u) { return u.email.toLowerCase().trim() === userData.email.toLowerCase().trim(); });
      
      if (exists) {
        return createResponse({ success: false, message: "Email already registered" });
      }
      
      appendRowToSheet(sheet, userData);
      return createResponse({ success: true });
      
    } else if (action === "submitRequest") {
      const reqData = JSON.parse(e.parameter.requestData);
      const sheet = getSheet("Requests");
      
      // แปลงอาร์เรย์ items ให้เป็น JSON String ก่อนบันทึก
      if (reqData.items) {
        reqData.items = JSON.stringify(reqData.items);
      }
      
      appendRowToSheet(sheet, reqData);
      return createResponse({ success: true });
      
    } else if (action === "cancelRequest") {
      const requestId = e.parameter.requestId;
      const sheet = getSheet("Requests");
      const requests = readSheetData("Requests");
      const rowIndex = requests.findIndex(function(r) { return r.id === requestId; });
      
      if (rowIndex !== -1) {
        const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
        const lowerHeaders = headers.map(function(h) { return String(h).replace(/\\s+/g, '').toLowerCase(); });
        
        const statusIdx = lowerHeaders.indexOf("status");
        if (statusIdx !== -1) {
          sheet.getRange(rowIndex + 2, statusIdx + 1).setValue("Rejected");
        } else {
          sheet.getRange(rowIndex + 2, 14).setValue("Rejected");
        }
        
        const commentIdx = lowerHeaders.indexOf("admincomment");
        if (commentIdx !== -1) {
          sheet.getRange(rowIndex + 2, commentIdx + 1).setValue("ยกเลิกโดยผู้ขอใช้งาน");
        } else {
          sheet.getRange(rowIndex + 2, 15).setValue("ยกเลิกโดยผู้ขอใช้งาน");
        }
        
        return createResponse({ success: true });
      }
      return createResponse({ success: false, message: "Request not found" });
      
    } else if (action === "notifyReturn") {
      const requestId = e.parameter.requestId;
      const sheet = getSheet("Requests");
      const requests = readSheetData("Requests");
      const rowIndex = requests.findIndex(function(r) { return r.id === requestId; });
      
      if (rowIndex !== -1) {
        const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
        const lowerHeaders = headers.map(function(h) { return String(h).replace(/\\s+/g, '').toLowerCase(); });
        
        const returnNotifiedIdx = lowerHeaders.indexOf("returnnotified");
        if (returnNotifiedIdx !== -1) {
          sheet.getRange(rowIndex + 2, returnNotifiedIdx + 1).setValue(true);
        } else {
          sheet.getRange(rowIndex + 2, 16).setValue(true);
        }
        
        const returnNotifiedDateIdx = lowerHeaders.indexOf("returnnotifieddate");
        if (returnNotifiedDateIdx !== -1) {
          sheet.getRange(rowIndex + 2, returnNotifiedDateIdx + 1).setValue(new Date().toISOString());
        } else {
          sheet.getRange(rowIndex + 2, 17).setValue(new Date().toISOString());
        }
        
        return createResponse({ success: true });
      }
      return createResponse({ success: false, message: "Request not found" });
      
    } else if (action === "updateUserStatus") {
      const email = e.parameter.email.toLowerCase().trim();
      const status = e.parameter.status;
      const sheet = getSheet("Users");
      const users = readSheetData("Users");
      const rowIndex = users.findIndex(function(u) { return u.email.toLowerCase().trim() === email; });
      
      if (rowIndex !== -1) {
        const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
        const lowerHeaders = headers.map(function(h) { return String(h).replace(/\\s+/g, '').toLowerCase(); });
        const colIdx = lowerHeaders.indexOf("status");
        if (colIdx !== -1) {
          sheet.getRange(rowIndex + 2, colIdx + 1).setValue(status);
        } else {
          sheet.getRange(rowIndex + 2, 4).setValue(status);
        }
        return createResponse({ success: true });
      }
      return createResponse({ success: false, message: "User not found" });
      
    } else if (action === "handleRequestApproval") {
      const requestId = e.parameter.requestId;
      const status = e.parameter.status;
      const comment = e.parameter.comment || "";
      const sheet = getSheet("Requests");
      const requests = readSheetData("Requests");
      const rowIndex = requests.findIndex(function(r) { return r.id === requestId; });
      
      if (rowIndex !== -1) {
        const currentReq = requests[rowIndex];
        const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
        const lowerHeaders = headers.map(function(h) { return String(h).replace(/\\s+/g, '').toLowerCase(); });
        
        const statusIdx = lowerHeaders.indexOf("status");
        if (statusIdx !== -1) {
          sheet.getRange(rowIndex + 2, statusIdx + 1).setValue(status);
        } else {
          sheet.getRange(rowIndex + 2, 14).setValue(status);
        }
        
        const commentIdx = lowerHeaders.indexOf("admincomment");
        if (commentIdx !== -1) {
          sheet.getRange(rowIndex + 2, commentIdx + 1).setValue(comment);
        } else {
          sheet.getRange(rowIndex + 2, 15).setValue(comment);
        }
        
        const returnNotifiedIdx = lowerHeaders.indexOf("returnnotified");
        if (returnNotifiedIdx !== -1) {
          sheet.getRange(rowIndex + 2, returnNotifiedIdx + 1).setValue(false);
        } else {
          sheet.getRange(rowIndex + 2, 16).setValue(false);
        }
        
        const updatedAtIdx = lowerHeaders.indexOf("updatedat");
        if (updatedAtIdx !== -1) {
          sheet.getRange(rowIndex + 2, updatedAtIdx + 1).setValue(new Date().toISOString());
        } else {
          sheet.getRange(rowIndex + 2, 18).setValue(new Date().toISOString());
        }
        
        // --- การอัปเดตระบบคงคลังโดยอิงจากสถานะคำขออนุมัติ ---
        if (status === "Approved") {
          if (currentReq.type === "instrument" && currentReq.instrumentId) {
            updateItemInSheet("Instruments", currentReq.instrumentId, "status", "In Use");
          } else if (currentReq.type === "glassware" && currentReq.items) {
            const itemsList = typeof currentReq.items === "string" ? JSON.parse(currentReq.items) : currentReq.items;
            itemsList.forEach(function(it) {
              const gwSheet = getSheet("Glassware");
              const gwItems = readSheetData("Glassware");
              const idx = gwItems.findIndex(function(g) { return g.id === it.id; });
              if (idx !== -1) {
                const curGw = gwItems[idx];
                const newAvailable = Math.max(0, curGw.availableQty - it.qty);
                const newBorrowed = Number(curGw.borrowedQty) + Number(it.qty);
                
                const gwHeaders = gwSheet.getRange(1, 1, 1, gwSheet.getLastColumn()).getValues()[0];
                const gwLowerHeaders = gwHeaders.map(function(h) { return String(h).replace(/\\s+/g, '').toLowerCase(); });
                
                const availIdx = gwLowerHeaders.indexOf("availableqty");
                if (availIdx !== -1) gwSheet.getRange(idx + 2, availIdx + 1).setValue(newAvailable);
                
                const borrowIdx = gwLowerHeaders.indexOf("borrowedqty");
                if (borrowIdx !== -1) gwSheet.getRange(idx + 2, borrowIdx + 1).setValue(newBorrowed);
              }
            });
          } else if (currentReq.type === "chemical" && currentReq.items) {
            const itemsList = typeof currentReq.items === "string" ? JSON.parse(currentReq.items) : currentReq.items;
            itemsList.forEach(function(it) {
              const chemSheet = getSheet("Chemicals");
              const chemItems = readSheetData("Chemicals");
              const idx = chemItems.findIndex(function(c) { return c.id === it.id; });
              if (idx !== -1) {
                const newQty = Math.max(0, Number(chemItems[idx].qty) - Number(it.qty));
                const chemHeaders = chemSheet.getRange(1, 1, 1, chemSheet.getLastColumn()).getValues()[0];
                const chemLowerHeaders = chemHeaders.map(function(h) { return String(h).replace(/\\s+/g, '').toLowerCase(); });
                const qtyIdx = chemLowerHeaders.indexOf("qty");
                if (qtyIdx !== -1) chemSheet.getRange(idx + 2, qtyIdx + 1).setValue(newQty);
              }
            });
          }
        } else if (status === "Returned") {
          if (currentReq.type === "instrument" && currentReq.instrumentId) {
            updateItemInSheet("Instruments", currentReq.instrumentId, "status", "Ready");
          } else if (currentReq.type === "glassware" && currentReq.items) {
            const itemsList = typeof currentReq.items === "string" ? JSON.parse(currentReq.items) : currentReq.items;
            itemsList.forEach(function(it) {
              const gwSheet = getSheet("Glassware");
              const gwItems = readSheetData("Glassware");
              const idx = gwItems.findIndex(function(g) { return g.id === it.id; });
              if (idx !== -1) {
                const curGw = gwItems[idx];
                const newAvailable = Math.min(Number(curGw.totalQty), Number(curGw.availableQty) + Number(it.qty));
                const newBorrowed = Math.max(0, Number(curGw.borrowedQty) - Number(it.qty));
                
                const gwHeaders = gwSheet.getRange(1, 1, 1, gwSheet.getLastColumn()).getValues()[0];
                const gwLowerHeaders = gwHeaders.map(function(h) { return String(h).replace(/\\s+/g, '').toLowerCase(); });
                
                const availIdx = gwLowerHeaders.indexOf("availableqty");
                if (availIdx !== -1) gwSheet.getRange(idx + 2, availIdx + 1).setValue(newAvailable);
                
                const borrowIdx = gwLowerHeaders.indexOf("borrowedqty");
                if (borrowIdx !== -1) gwSheet.getRange(idx + 2, borrowIdx + 1).setValue(newBorrowed);
              }
            });
          } else if (currentReq.type === "chemical" && currentReq.actionType === "borrow" && currentReq.items) {
            const itemsList = typeof currentReq.items === "string" ? JSON.parse(currentReq.items) : currentReq.items;
            itemsList.forEach(function(it) {
              const chemSheet = getSheet("Chemicals");
              const chemItems = readSheetData("Chemicals");
              const idx = chemItems.findIndex(function(c) { return c.id === it.id; });
              if (idx !== -1) {
                const newQty = Number(chemItems[idx].qty) + Number(it.qty);
                const chemHeaders = chemSheet.getRange(1, 1, 1, chemSheet.getLastColumn()).getValues()[0];
                const chemLowerHeaders = chemHeaders.map(function(h) { return String(h).replace(/\\s+/g, '').toLowerCase(); });
                const qtyIdx = chemLowerHeaders.indexOf("qty");
                if (qtyIdx !== -1) chemSheet.getRange(idx + 2, qtyIdx + 1).setValue(newQty);
              }
            });
          }
        }
        
        return createResponse({ success: true });
      }
      return createResponse({ success: false, message: "Request not found" });
      
    } else if (action === "updateInventory") {
      const type = e.parameter.type;
      const itemId = e.parameter.itemId;
      const fields = JSON.parse(e.parameter.fields);
      const sheetName = type === "instrument" ? "Instruments" : (type === "glassware" ? "Glassware" : "Chemicals");
      
      const sheet = getSheet(sheetName);
      const items = readSheetData(sheetName);
      const idx = items.findIndex(function(item) { return item.id === itemId; });
      
      if (idx !== -1) {
        const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
        const lowerHeaders = headers.map(function(h) { return String(h).replace(/\\s+/g, '').toLowerCase().trim(); });
        for (let key in fields) {
          const colIndex = lowerHeaders.indexOf(key.replace(/\\s+/g, '').toLowerCase().trim());
          if (colIndex !== -1) {
            sheet.getRange(idx + 2, colIndex + 1).setValue(fields[key]);
          }
        }
        return createResponse({ success: true });
      }
      return createResponse({ success: false, message: "Item not found" });
    }
    
    return createResponse({ success: false, message: "Action not supported" });
  } catch(error) {
    return createResponse({ success: false, error: error.toString() });
  }
}

// ช่วยดึงข้อมูลและทำข้อมูลให้อยู่ในรูป Array Object แทนการเข้าแถวตามดัชนี (พร้อมจับคู่หัวตาราง Case-insensitive อย่างแม่นยำ)
function readSheetData(sheetName) {
  const sheet = getSheet(sheetName);
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return [];
  
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const data = sheet.getRange(2, 1, lastRow - 1, sheet.getLastColumn()).getValues();
  
  return data.map(function(row) {
    const obj = {};
    headers.forEach(function(header, i) {
      const cleanHeader = String(header).replace(/\\s+/g, '').toLowerCase();
      const mappedKey = KEY_MAPS[cleanHeader] || cleanHeader;
      obj[mappedKey] = row[i];
    });
    return obj;
  });
}

// เพิ่มแถวข้อมูลใหม่แบบปลอดภัย โดยค้นหาคอลัมน์จากตำแหน่งจริงตามหัวตารางในชีตแบบทนทาน
function appendRowToSheet(sheet, dataObj) {
  const lastRow = sheet.getLastRow();
  let headers;
  
  if (lastRow === 0) {
    headers = Object.keys(dataObj);
    sheet.appendRow(headers);
  } else {
    headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  }
  
  const row = headers.map(function(header) {
    const cleanHeader = String(header).replace(/\\s+/g, '').toLowerCase();
    const mappedKey = KEY_MAPS[cleanHeader] || cleanHeader;
    
    let val = undefined;
    for (let key in dataObj) {
      const cleanKey = key.replace(/\\s+/g, '').toLowerCase();
      if (cleanKey === cleanHeader || cleanKey === mappedKey.toLowerCase()) {
        val = dataObj[key];
        break;
      }
    }
    return val !== undefined ? val : "";
  });
  
  sheet.appendRow(row);
}

// อัปเดตข้อมูลของเซลล์เดียวอย่างปลอดภัย
function updateItemInSheet(sheetName, id, key, value) {
  const sheet = getSheet(sheetName);
  const items = readSheetData(sheetName);
  const idx = items.findIndex(function(item) { return item.id === id; });
  if (idx !== -1) {
    const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    const lowerHeaders = headers.map(function(h) { return String(h).replace(/\\s+/g, '').toLowerCase(); });
    const cleanKey = key.replace(/\\s+/g, '').toLowerCase();
    const colIdx = lowerHeaders.indexOf(cleanKey);
    if (colIdx !== -1) {
      sheet.getRange(idx + 2, colIdx + 1).setValue(value);
    }
  }
}

// สร้าง Response ป้องกันปัญหา CORS บนเบราว์เซอร์
function createResponse(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}`;

  const copyToClipboard = () => {
    navigator.clipboard.writeText(appsScriptCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 max-w-4xl mx-auto space-y-8" id="apps-script-guide-root">
      <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
        <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
          <Database className="w-6 h-6" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-slate-800">คู่มือเชื่อมต่อระบบหลังบ้าน Google Sheets</h2>
          <p className="text-sm text-slate-500">ขั้นตอนการติดตั้ง Google Sheets และ Google Apps Script เพื่อใช้งานระบบจริงแบบออนไลน์</p>
        </div>
      </div>

      {/* Steps */}
      <div className="space-y-4">
        <h3 className="font-semibold text-slate-700 flex items-center gap-2">
          <Settings className="w-4 h-4 text-emerald-500" />
          ขั้นตอนที่ 1: เตรียมโครงสร้างตาราง Google Sheets
        </h3>
        <p className="text-sm text-slate-600 pl-6 leading-relaxed">
          สร้าง Google Spreadsheet ใหม่ใน Google Drive ของคุณ และสร้างชีต (Tabs) ทั้งหมด 5 ชีตตามรายชื่อด้านล่างนี้ 
          โดยนำรายชื่อคอลัมน์ไปพิมพ์เป็นหัวตารางใน **แถวที่ 1** (ตัวสะกดต้องถูกต้องและเป็นอักษรภาษาอังกฤษตัวพิมพ์เล็กพิมพ์ใหญ่ตรงตามด้านล่าง):
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pl-6">
          {sheetStructure.map((item) => (
            <div key={item.tab} className="p-4 bg-slate-50 rounded-xl border border-slate-100 space-y-2">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-1 text-xs font-bold bg-emerald-100 text-emerald-800 rounded-md">{item.tab}</span>
                <span className="text-xs text-slate-500 font-medium">{item.desc}</span>
              </div>
              <div className="flex flex-wrap gap-1 text-[11px] font-mono bg-white p-2 rounded border border-slate-200 text-slate-600">
                {item.cols.map((col, idx) => (
                  <span key={col} className="after:content-[','] last:after:content-none after:mx-0.5">
                    {col}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="font-semibold text-slate-700 flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-500" />
          ขั้นตอนที่ 2: วางโค้ดใน Google Apps Script
        </h3>
        <ol className="list-decimal list-inside text-sm text-slate-600 pl-6 space-y-2 leading-relaxed">
          <li>ที่หน้า Google Sheet ของคุณ ไปที่เมนู **ส่วนขยาย (Extensions) &gt; Apps Script**</li>
          <li>ลบโค้ดเดิมในฟังก์ชัน <code className="font-mono text-emerald-600 bg-slate-50 px-1 py-0.5 rounded">myFunction</code> ออกให้หมด</li>
          <li>คัดลอกโค้ดด้านล่างนี้ไปวางทั้งหมด</li>
          <li>คัดลอก ID ของ Google Sheets (จาก URL บนบราวเซอร์) ไปวางแทนที่ <code className="font-mono text-red-600 bg-red-50 px-1 py-0.5 rounded">"ใส่_ID_ของ_Google_Sheets_ที่นี่"</code> ในตัวแปร <code className="font-mono">SPREADSHEET_ID</code></li>
          <li>กดบันทึกโค้ด (รูปแผ่นดิสก์)</li>
          <li>กดปุ่ม **การทำให้ใช้งานได้ (Deploy) &gt; การทำให้ใช้งานได้ใหม่ (New deployment)**</li>
          <li>เลือกประเภทเป็น **เว็บแอป (Web app)**</li>
          <li>ตั้งค่าสิทธิ์การเข้าใช้งาน:
            <ul className="list-disc list-inside pl-4 mt-1 space-y-1 text-xs text-slate-500">
              <li>ผู้เรียกใช้งาน (Execute as): **ฉัน (Me / เจ้าของบัญชี)**</li>
              <li>ผู้มีสิทธิ์เข้าใช้งาน (Who has access): **ทุกคน (Anyone)** <span className="text-amber-600">(สำคัญมากเพื่อให้เบราว์เซอร์ส่งคำขอได้โดยไม่ต้องระบุตัวตนเพิ่ม)</span></li>
            </ul>
          </li>
          <li>กดปุ่ม **การทำให้ใช้งานได้ (Deploy)** และคัดลอก **URL เว็บแอป (Web App URL)** ที่ได้</li>
          <li>นำ URL มาใส่ในช่องกำหนดค่าของระบบหลังบ้านในหน้าผู้ดูแลระบบเพื่อเปิดใช้ระบบออนไลน์!</li>
        </ol>
      </div>

      {/* Code box */}
      <div className="space-y-2 pl-6">
        <div className="flex justify-between items-center bg-slate-800 text-slate-300 px-4 py-2 rounded-t-xl text-xs font-mono">
          <span className="flex items-center gap-1.5 font-sans">
            <FileText className="w-3.5 h-3.5 text-emerald-400" />
            Backend.gs (Google Apps Script)
          </span>
          <button
            onClick={copyToClipboard}
            className="flex items-center gap-1 hover:text-white transition-colors bg-slate-700 hover:bg-slate-600 px-2.5 py-1 rounded-md"
            id="copy-script-code-btn"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                คัดลอกแล้ว!
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                คัดลอกโค้ด
              </>
            )}
          </button>
        </div>
        <div className="overflow-auto max-h-96 rounded-b-xl border border-slate-200">
          <pre className="text-xs font-mono bg-slate-900 text-emerald-400 p-4 leading-relaxed text-left overflow-x-auto">
            <code>{appsScriptCode}</code>
          </pre>
        </div>
      </div>
    </div>
  );
}
