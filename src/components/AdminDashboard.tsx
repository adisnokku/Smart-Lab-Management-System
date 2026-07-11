/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// @ts-nocheck

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Instrument, Glassware, Chemical, User, LabRequest, RequestStatus, UserStatus, InstrumentStatus } from '../types';
import { labApi } from '../services/api';
import AppsScriptGuide from './AppsScriptGuide';
import { 
  Database, Users, Calendar, RotateCcw, Download, CheckCircle, 
  XCircle, Ban, ArrowUpRight, Search, Edit2, Check, AlertTriangle, 
  Settings, HelpCircle, Save, Layers, Clock, TrendingUp, Info, HelpCircle as HelpIcon, ShieldCheck
} from 'lucide-react';

interface AdminDashboardProps {
  adminUser: User;
  onLogout: () => void;
}

type AdminTab = 'inventory' | 'users' | 'bookings' | 'loans' | 'returns' | 'guide';

export default function AdminDashboard({ adminUser, onLogout }: AdminDashboardProps) {
  const [activeTab, setActiveTab] = useState<AdminTab>('inventory');
  
  // URL ของ Google Apps Script Web App
  const [appsScriptUrl, setAppsScriptUrl] = useState('');
  
  // ข้อมูลกลางสำหรับหลังบ้าน
  const [instruments, setInstruments] = useState<Instrument[]>([]);
  const [glassware, setGlassware] = useState<Glassware[]>([]);
  const [chemicals, setChemicals] = useState<Chemical[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [requests, setRequests] = useState<LabRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // การแก้ไขข้อมูลคลังโดยตรง
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editFields, setEditFields] = useState<any>({});

  // คอมเมนต์ในการอนุมัติคำขอ
  const [adminComment, setAdminComment] = useState('');

  // ข้อความตอบกลับสำหรับแอดมิน
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  // ค้นหารายการในหน้าแอดมิน
  const [searchQuery, setSearchQuery] = useState('');

  // โหลดข้อมูลทั้งหมดเข้ามาแสดงผลในส่วนของ Admin
  const loadAllAdminData = async () => {
    setIsLoading(true);
    try {
      // ดึง URL ล่าสุดจาก Local Storage
      const url = labApi.getAppsScriptUrl();
      setAppsScriptUrl(url);

      const insts = await labApi.getInstruments();
      const gws = await labApi.getGlassware();
      const chems = await labApi.getChemicals();
      const usrs = await labApi.getAllUsers();
      const reqs = await labApi.getRequests();

      setInstruments(insts);
      setGlassware(gws);
      setChemicals(chems);
      setUsers(usrs);
      setRequests(reqs);
    } catch (e) {
      console.error(e);
      showFeedback('error', 'ไม่สามารถเชื่อมต่อดึงข้อมูลหลังบ้านได้ กรุณาตรวจสอบการตั้งค่า URL');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadAllAdminData();
  }, []);

  // ฟังก์ชันช่วยเหลือแจ้ง Feedback หน้าจอแอดมิน
  const showFeedback = (type: 'success' | 'error', text: string) => {
    setFeedback({ type, text });
    setTimeout(() => setFeedback(null), 4000);
  };

  // บันทึก URL เพื่อเชื่อมต่อ Apps Script สดๆ
  const handleSaveApiUrl = (e: React.FormEvent) => {
    e.preventDefault();
    labApi.setAppsScriptUrl(appsScriptUrl);
    showFeedback('success', appsScriptUrl ? 'เปิดใช้ระบบออนไลน์ เชื่อมต่อ Google Sheets เรียบร้อยแล้ว!' : 'เปลี่ยนโหมดเป็นระบบจำลองภายในเครื่องเรียบร้อย');
  };

  // เริ่มต้นการแก้ไขไอเท็มในคลัง
  const startEditing = (id: string, initialFields: any) => {
    setEditingItemId(id);
    setEditFields(initialFields);
  };

  // บันทึกข้อมูลที่แก้ไขของไอเท็มในคลัง
  const saveInventoryEdit = async (type: 'instrument' | 'glassware' | 'chemical', itemId: string) => {
    try {
      const res = await labApi.updateInventoryItem(type, itemId, editFields);
      if (res.success) {
        showFeedback('success', res.message);
        setEditingItemId(null);
        setEditFields({});
        loadAllAdminData();
      } else {
        showFeedback('error', res.message);
      }
    } catch (e) {
      showFeedback('error', 'เกิดข้อผิดพลาดในการอัปเดตข้อมูลคลังสินค้า');
    }
  };

  // ตรวจสอบระดับการเตือนสต็อกสารเคมีและวันหมดอายุ (Expiry < 1 Month)
  const isChemicalAlert = (chem: Chemical) => {
    const isLow = chem.qty <= chem.minQty;
    
    const expiry = new Date(chem.expiryDate);
    const currentDate = new Date('2026-07-01'); // เวลาปัจจุบันที่ระบุใน metadata
    const oneMonthLater = new Date(currentDate);
    oneMonthLater.setMonth(currentDate.getMonth() + 1);
    
    const isNearExpiry = expiry <= oneMonthLater;
    return isLow || isNearExpiry;
  };

  // --- 2. การจัดการอนุมัติ / แบนผู้ใช้งาน (User Management) ---
  const handleUserStatusUpdate = async (email: string, status: UserStatus) => {
    try {
      const res = await labApi.updateUserStatus(email, status);
      if (res.success) {
        showFeedback('success', res.message);
        loadAllAdminData();
      } else {
        showFeedback('error', res.message);
      }
    } catch (e) {
      showFeedback('error', 'เกิดข้อผิดพลาดในการดำเนินการจัดการผู้ใช้งาน');
    }
  };

  // --- 3. อนุมัติการจอง และยืม-คืนอุปกรณ์ (Approval Management) ---
  const handleProcessRequest = async (requestId: string, status: RequestStatus) => {
    try {
      const res = await labApi.handleRequestApproval(requestId, status, adminComment);
      if (res.success) {
        showFeedback('success', res.message);
        setAdminComment(''); // ล้างช่องแสดงความเห็น
        loadAllAdminData();
      } else {
        showFeedback('error', res.message);
      }
    } catch (e) {
      showFeedback('error', 'เกิดข้อผิดพลาดในการอนุมัติคำขอ');
    }
  };

  // --- 6. ระบบออกรายงานสรุปสถิติ (Export Summary Reports to CSV) ---
  const downloadReport = (reportType: 'most_booked' | 'chemical_withdrawals' | 'overdue_returns') => {
    let csvContent = "data:text/csv;charset=utf-8,\uFEFF"; // เพิ่ม BOM สำหรับภาษาไทยใน Excel
    let fileName = "";

    if (reportType === 'most_booked') {
      fileName = "สถิติการจองเครื่องมือวิทยาศาสตร์.csv";
      csvContent += "รหัสเครื่องมือ,ชื่อเครื่องมือ,จำนวนครั้งที่ถูกจอง,สถานที่ตั้ง\n";
      
      // คำนวณจำนวนครั้งการจองของแต่ละเครื่องมือ
      const stats = instruments.map(inst => {
        const count = requests.filter(r => r.type === 'instrument' && r.instrumentId === inst.id).length;
        return { id: inst.id, name: inst.name, count, location: inst.location };
      }).sort((a, b) => b.count - a.count);

      stats.forEach(row => {
        csvContent += `"${row.id}","${row.name}",${row.count},"${row.location}"\n`;
      });

    } else if (reportType === 'chemical_withdrawals') {
      fileName = "รายงานยอดการเบิกจ่ายสารเคมีคลัง.csv";
      csvContent += "รหัสสารเคมี,ชื่อสารเคมี,ยอดเบิกจ่ายสะสม,หน่วย,ยอดคงเหลือในคลัง\n";

      chemicals.forEach(chem => {
        // นับผลรวมยอดเบิกจ่ายสะสมของสารเคมีนี้จากคำขอที่อนุมัติหรือรับของแล้ว
        let totalWithdrawal = 0;
        requests.forEach(r => {
          if ((r.status === 'Approved' || r.status === 'Returned') && r.items) {
            r.items.forEach(it => {
              if (it.name === chem.name) {
                totalWithdrawal += it.qty;
              }
            });
          }
        });
        csvContent += `"${chem.id}","${chem.name}",${totalWithdrawal},"${chem.unit}","${chem.qty}"\n`;
      });

    } else if (reportType === 'overdue_returns') {
      fileName = "รายงานผู้ใช้ค้างส่งคืนเครื่องแก้วและอุปกรณ์.csv";
      csvContent += "เลขที่คำขอ,ผู้ยืม,อีเมล,เบอร์โทรศัพท์,รายการที่ยืม,กำหนดคืน\n";

      requests.filter(r => r.status === 'Overdue').forEach(req => {
        const itemText = req.type === 'instrument' ? req.instrumentName : req.items?.map(it => `${it.name} (${it.qty})`).join(' | ') || '';
        const dueDate = req.endDate ? new Date(req.endDate).toLocaleString('th-TH') : '-';
        csvContent += `"${req.id}","${req.userName}","${req.userEmail}","${req.userPhone}","${itemText}","${dueDate}"\n`;
      });
    }

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", fileName);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // คำนวณค่าสถิติด่วนต่างๆ สำหรับแสดงผลบน Bento Grid Metrics
  const totalUsersPending = users.filter(u => u.status === 'Pending').length;
  const totalBookingPending = requests.filter(r => r.type === 'instrument' && r.status === 'Pending').length;
  const totalLoansPending = requests.filter(r => r.type !== 'instrument' && r.status === 'Pending').length;
  const totalReturnNotified = requests.filter(r => r.returnNotified === true).length;
  const totalOverdue = requests.filter(r => r.status === 'Overdue').length;

  return (
    <div className="min-h-screen bg-slate-950 pb-24 text-left text-slate-100" id="admin-dashboard-root">
      
      {/* 1. ส่วนแถบคาดหัวผู้รับผิดชอบระบบ (Executive Header) */}
      <header className="bg-slate-900/80 backdrop-blur-md text-white px-8 py-5 flex flex-col md:flex-row items-center justify-between gap-4 sticky top-0 z-30 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-emerald-500 rounded-xl flex items-center justify-center text-slate-950 font-black text-lg shadow-lg shadow-emerald-500/10">
            AD
          </div>
          <div>
            <h1 className="text-base font-bold flex items-center gap-2 text-slate-100">
              แผงผู้ดูแลระบบจัดการแลปอัจฉริยะ 
              <span className="text-[10px] bg-emerald-500 text-slate-950 px-2 py-0.5 rounded font-black tracking-wide">ADMIN CONSOLE</span>
            </h1>
            <p className="text-xs text-slate-400 font-medium">จัดการคลังเครื่องแก้ว สารเคมี และอนุมัติการจองของ มหาวิทยาลัยขอนแก่น</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="text-right hidden sm:block">
            <span className="text-xs text-slate-400 block font-medium font-mono">ยินดีต้อนรับ แอดมิน</span>
            <span className="text-xs text-slate-200 font-bold">{adminUser.name}</span>
          </div>
          <button
            onClick={onLogout}
            className="px-4 py-2 bg-slate-800 hover:bg-rose-600 hover:text-white text-slate-200 text-xs font-bold rounded-xl transition-all cursor-pointer border border-slate-700"
            id="admin-logout-btn"
          >
            ออกจากระบบ
          </button>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-8 pt-8 space-y-8">
        
        {/* แถบ Feedback แจ้งความสำเร็จ */}
        <AnimatePresence>
          {feedback && (
            <motion.div
              initial={{ opacity: 0, y: -15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className={`p-4 rounded-2xl text-xs font-semibold text-slate-950 shadow-lg flex items-center gap-2 ${
                feedback.type === 'success' ? 'bg-emerald-400' : 'bg-rose-500 text-white'
              }`}
            >
              <ShieldCheck className="w-4 h-4 shrink-0" />
              {feedback.text}
            </motion.div>
          )}
        </AnimatePresence>

        {/* 2. บล็อกตั้งค่าความปลอดภัยของ Google Sheets API */}
        <div className="bg-slate-900 p-6 rounded-3xl border border-slate-800 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
            <h3 className="font-bold text-slate-100 text-sm flex items-center gap-2">
              <Settings className="w-4 h-4 text-emerald-400" />
              การกำหนดค่าระบบหลังบ้าน (Database Configuration)
            </h3>
            
            <div className="flex items-center gap-2">
              <span className={`w-2.5 h-2.5 rounded-full ${appsScriptUrl ? 'bg-emerald-400' : 'bg-indigo-400'}`} />
              <span className="text-xs font-bold text-slate-400">
                {appsScriptUrl ? 'ออนไลน์: กำลังใช้งาน Google Sheets' : 'แซนด์บ็อกซ์: กำลังจำลองระบบภายในเครื่อง'}
              </span>
            </div>
          </div>

          <form onSubmit={handleSaveApiUrl} className="flex flex-col sm:flex-row gap-3">
            <input
              type="url"
              placeholder="กรอก URL ของ Google Apps Script ที่ได้จากการสั่งใช้งานเว็บแอป..."
              value={appsScriptUrl}
              onChange={(e) => setAppsScriptUrl(e.target.value)}
              className="flex-1 text-xs px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-slate-200 transition-all font-mono placeholder-slate-600"
              id="admin-api-url-input"
            />
            <button
              type="submit"
              className="px-5 py-3 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl text-xs transition-all shadow-md flex items-center justify-center gap-1.5 shrink-0 cursor-pointer"
              id="admin-save-api-btn"
            >
              <Save className="w-4 h-4" />
              บันทึกการตั้งค่า
            </button>
          </form>
          <p className="text-[11px] text-slate-500">
            * หากเว้นช่องว่างระบบจะเข้าสู่ <strong>Sandbox Simulator Mode</strong> โดยอิงฐานข้อมูลในเบราว์เซอร์ของคุณ ซึ่งพร้อมใช้งานและทดสอบระบบได้ทันที 
            แต่หากต้องการผูกเข้าตาราง Google Sheets จริง ให้สลับแท็บไปที่หน้า <strong>"คู่มือหลังบ้าน"</strong> เพื่อทำตามวิธีตั้งค่า
          </p>
        </div>

        {/* 3. แผงสถิติด่วนบอร์ดแอดมิน (Executive Bento Grid Metrics) */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="bg-slate-900 p-4 rounded-2xl border border-slate-800 shadow-sm text-center">
            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">รออนุมัติผู้ใช้</span>
            <span className={`text-xl font-bold block mt-1 ${totalUsersPending > 0 ? 'text-amber-400 animate-pulse' : 'text-slate-300'}`}>
              {totalUsersPending}
            </span>
          </div>
          <div className="bg-slate-900 p-4 rounded-2xl border border-slate-800 shadow-sm text-center">
            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">จองเครื่องมือค้าง</span>
            <span className="text-xl font-bold text-slate-300 block mt-1">{totalBookingPending}</span>
          </div>
          <div className="bg-slate-900 p-4 rounded-2xl border border-slate-800 shadow-sm text-center">
            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">ยืมวัสดุ/เคมีค้าง</span>
            <span className="text-xl font-bold text-slate-300 block mt-1">{totalLoansPending}</span>
          </div>
          <div className="bg-slate-900 p-4 rounded-2xl border border-slate-800 shadow-sm text-center">
            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">รับแจ้งคืนวันนี้</span>
            <span className={`text-xl font-bold block mt-1 ${totalReturnNotified > 0 ? 'text-emerald-400 font-black animate-pulse' : 'text-slate-300'}`}>
              {totalReturnNotified}
            </span>
          </div>
          <div className="bg-slate-900 p-4 rounded-2xl border border-slate-800 shadow-sm text-center col-span-2 md:col-span-1">
            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">ส่งของเกินกำหนด</span>
            <span className={`text-xl font-bold block mt-1 ${totalOverdue > 0 ? 'text-rose-400 font-black' : 'text-slate-300'}`}>
              {totalOverdue}
            </span>
          </div>
        </div>

        {/* 4. แผงควบคุมแบ่งแท็บผู้ดูแลระบบ */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          
          {/* เมนูด้านข้าง (Admin Navigation Bar) */}
          <div className="flex flex-row lg:flex-col bg-slate-900 p-2 rounded-3xl border border-slate-800 shadow-sm overflow-x-auto lg:overflow-x-visible gap-1 lg:h-fit">
            {[
              { id: 'inventory', label: 'จัดการสต็อกคลังอุปกรณ์', icon: <Layers className="w-4 h-4" /> },
              { id: 'users', label: 'อนุมัติ / จัดการสมาชิก', icon: <Users className="w-4 h-4" /> },
              { id: 'bookings', label: 'คำขอจองเครื่องมือวิทยาศาสตร์', icon: <Calendar className="w-4 h-4" /> },
              { id: 'loans', label: 'คำขอยืมวัสดุ & สารเคมี', icon: <TrendingUp className="w-4 h-4" /> },
              { id: 'returns', label: 'หน้ารับคืนของหน้างาน', icon: <RotateCcw className="w-4 h-4" /> },
              { id: 'guide', label: 'คู่มือตั้งค่าระบบหลังบ้าน', icon: <Database className="w-4 h-4" /> }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id as AdminTab);
                  setSearchQuery('');
                }}
                className={`flex items-center gap-2 px-4 py-3 text-xs font-bold rounded-2xl transition-all shrink-0 text-left cursor-pointer ${
                  activeTab === tab.id 
                    ? 'bg-emerald-500 text-slate-950 shadow-md' 
                    : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                }`}
                id={`admin-tab-${tab.id}`}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </div>

          {/* กล่องเนื้อหาหลัก (Primary Admin Viewport) */}
          <div className="lg:col-span-3 space-y-6">
            
            {/* แท็บ 1: ระบบจัดการสต็อกคลังอุปกรณ์ (Inventory) */}
            {activeTab === 'inventory' && (
              <div className="bg-slate-900 rounded-3xl border border-slate-800 shadow-sm p-6 space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
                  <div>
                    <h3 className="text-base font-bold text-slate-100">ระบบจัดการคลังวิทยาศาสตร์ทั้งหมด</h3>
                    <p className="text-xs text-slate-400">พิมพ์ตัวเลขใหม่เพื่ออัปเดตสต็อก หรือตั้งค่าสถานะเปิดปิดเครื่องแก้วแลป/สารเคมี</p>
                  </div>
                  
                  {/* ปุ่มส่งออกสถิติ (Export Report Dashboard) */}
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => downloadReport('most_booked')}
                      className="px-3 py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 text-[10px] font-bold rounded-lg border border-emerald-500/20 flex items-center gap-1 cursor-pointer"
                      id="export-most-booked-btn"
                    >
                      <Download className="w-3.5 h-3.5" />
                      สถิติจองเครื่องยอดฮิต
                    </button>
                    <button
                      onClick={() => downloadReport('chemical_withdrawals')}
                      className="px-3 py-1.5 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 text-[10px] font-bold rounded-lg border border-indigo-500/20 flex items-center gap-1 cursor-pointer"
                      id="export-chem-withdrawn-btn"
                    >
                      <Download className="w-3.5 h-3.5" />
                      สรุปยอดเบิกสารเคมี
                    </button>
                  </div>
                </div>

                {/* ส่วนที่ 1.1: คลังเครื่องมือวิทยาศาสตร์ */}
                <div className="space-y-3">
                  <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">หมวดหมู่เครื่องมือวิทยาศาสตร์ (Inorganic Instruments)</h4>
                  <div className="overflow-x-auto border border-slate-800 rounded-2xl">
                    <table className="w-full text-xs text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-950 border-b border-slate-800 text-slate-400 text-[10px] uppercase font-bold">
                          <th className="p-3">รหัส</th>
                          <th className="p-3">รายการเครื่องมือ</th>
                          <th className="p-3">สถานที่</th>
                          <th className="p-3">สถานะตรวจประเมิน</th>
                          <th className="p-3 text-center">ดำเนินการ</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800">
                        {instruments.map(inst => (
                          <tr key={inst.id} className="hover:bg-slate-800/30">
                            <td className="p-3 font-mono font-bold text-slate-500">{inst.id}</td>
                            <td className="p-3">
                              <span className="font-bold text-slate-200 block">{inst.name}</span>
                              <span className="text-[10px] text-slate-500 block font-mono">{inst.brand}</span>
                            </td>
                            <td className="p-3 font-medium text-slate-400">{inst.location}</td>
                            <td className="p-3">
                              {editingItemId === inst.id ? (
                                <select
                                  value={editFields.status}
                                  onChange={(e) => setEditFields({ ...editFields, status: e.target.value as InstrumentStatus })}
                                  className="p-1.5 bg-slate-950 border border-slate-800 rounded text-slate-200 text-xs focus:outline-none focus:border-emerald-500"
                                >
                                  <option value="Ready">Ready (ว่าง)</option>
                                  <option value="In Use">In Use (ไม่ว่าง)</option>
                                  <option value="Maintenance">Maintenance (ซ่อมบำรุง)</option>
                                </select>
                              ) : (
                                <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold border ${
                                  inst.status === 'Ready' 
                                    ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' 
                                    : inst.status === 'In Use' 
                                    ? 'bg-amber-500/10 border-amber-500/20 text-amber-400' 
                                    : 'bg-rose-500/10 border-rose-500/20 text-rose-400'
                                }`}>
                                  {inst.status === 'Ready' ? 'พร้อมใช้งาน (Ready)' : inst.status === 'In Use' ? 'ไม่ว่าง (In Use)' : 'ซ่อมบำรุง (Maintenance)'}
                                </span>
                              )}
                            </td>
                            <td className="p-3 text-center">
                              {editingItemId === inst.id ? (
                                <button
                                  onClick={() => saveInventoryEdit('instrument', inst.id)}
                                  className="p-1.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-lg cursor-pointer"
                                >
                                  <Check className="w-3.5 h-3.5" />
                                </button>
                              ) : (
                                <button
                                  onClick={() => startEditing(inst.id, { status: inst.status })}
                                  className="p-1.5 hover:bg-slate-800 text-slate-400 hover:text-slate-200 rounded-lg cursor-pointer border border-transparent hover:border-slate-700"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* ส่วนที่ 1.2: คลังเครื่องแก้ว */}
                <div className="space-y-3 pt-4">
                  <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">หมวดหมู่คลังเครื่องแก้ว (Glassware Storage)</h4>
                  <div className="overflow-x-auto border border-slate-800 rounded-2xl">
                    <table className="w-full text-xs text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-950 border-b border-slate-800 text-slate-400 text-[10px] uppercase font-bold">
                          <th className="p-3">รหัส</th>
                          <th className="p-3">รายการเครื่องแก้ว</th>
                          <th className="p-3 text-center">รวมทั้งหมด</th>
                          <th className="p-3 text-center">ถูกยืมไป</th>
                          <th className="p-3 text-center">พร้อมใช้</th>
                          <th className="p-3 text-center">บันทึกสต็อกตรง</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800">
                        {glassware.map(gw => (
                          <tr key={gw.id} className="hover:bg-slate-800/30">
                            <td className="p-3 font-mono font-bold text-slate-500">{gw.id}</td>
                            <td className="p-3">
                              <span className="font-bold text-slate-200 block">{gw.name}</span>
                              <span className="text-[10px] text-slate-400 block">{gw.details}</span>
                            </td>
                            <td className="p-3 text-center font-bold text-slate-100">
                              {editingItemId === gw.id ? (
                                <input
                                  type="number"
                                  value={editFields.totalQty}
                                  onChange={(e) => setEditFields({ ...editFields, totalQty: Number(e.target.value) })}
                                  className="w-16 p-1 bg-slate-950 border border-slate-800 text-slate-200 rounded text-center text-xs"
                                />
                              ) : (
                                gw.totalQty
                              )}
                            </td>
                            <td className="p-3 text-center text-amber-400 font-bold">{gw.borrowedQty}</td>
                            <td className="p-3 text-center text-emerald-400 font-bold">{gw.availableQty}</td>
                            <td className="p-3 text-center">
                              {editingItemId === gw.id ? (
                                <button
                                  onClick={() => saveInventoryEdit('glassware', gw.id)}
                                  className="p-1.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-lg cursor-pointer"
                                >
                                  <Check className="w-3.5 h-3.5" />
                                </button>
                              ) : (
                                <button
                                  onClick={() => startEditing(gw.id, { totalQty: gw.totalQty })}
                                  className="p-1.5 hover:bg-slate-800 text-slate-400 hover:text-slate-200 rounded-lg cursor-pointer border border-transparent hover:border-slate-700"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* ส่วนที่ 1.3: คลังสารเคมี พร้อมระบบแจ้งเตือนสีแดง (Low Stock / Expired) */}
                <div className="space-y-3 pt-4">
                  <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">หมวดหมู่คลังสารเคมี (Chemical Stocks & Alerts)</h4>
                  <div className="overflow-x-auto border border-slate-800 rounded-2xl">
                    <table className="w-full text-xs text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-950 border-b border-slate-800 text-slate-400 text-[10px] uppercase font-bold">
                          <th className="p-3">รหัส</th>
                          <th className="p-3">รายการสารเคมี</th>
                          <th className="p-3 text-center">ระดับสต็อกคงคลัง</th>
                          <th className="p-3 text-center">เกณฑ์เตือนต่ำ</th>
                          <th className="p-3">วันหมดอายุ</th>
                          <th className="p-3 text-center">แก้ไขตรง</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800">
                        {chemicals.map(chem => {
                          const isAlert = isChemicalAlert(chem);
                          return (
                            <tr key={chem.id} className={`${isAlert ? 'bg-rose-500/10 hover:bg-rose-500/20' : 'hover:bg-slate-800/30'}`}>
                              <td className="p-3 font-mono font-bold text-slate-500">{chem.id}</td>
                              <td className="p-3">
                                <span className="font-bold text-slate-200 block flex items-center gap-1">
                                  {chem.name}
                                  {isAlert && <AlertTriangle className="w-3.5 h-3.5 text-rose-400 inline" />}
                                </span>
                                <span className="text-[10px] text-slate-400 block">{chem.details}</span>
                              </td>
                              <td className="p-3 text-center font-bold">
                                {editingItemId === chem.id ? (
                                  <div className="flex items-center gap-1 justify-center">
                                    <input
                                      type="number"
                                      step="0.1"
                                      value={editFields.qty}
                                      onChange={(e) => setEditFields({ ...editFields, qty: Number(e.target.value) })}
                                      className="w-16 p-1 bg-slate-950 border border-slate-800 text-slate-200 text-center rounded text-xs"
                                    />
                                    <span className="text-[10px] text-slate-400 font-mono">{chem.unit}</span>
                                  </div>
                                ) : (
                                  <span className={chem.qty <= chem.minQty ? 'text-rose-400 font-bold' : 'text-slate-200'}>
                                    {chem.qty} {chem.unit}
                                  </span>
                                )}
                              </td>
                              <td className="p-3 text-center text-slate-400 font-mono">
                                {editingItemId === chem.id ? (
                                  <input
                                    type="number"
                                    step="0.1"
                                    value={editFields.minQty}
                                    onChange={(e) => setEditFields({ ...editFields, minQty: Number(e.target.value) })}
                                    className="w-16 p-1 bg-slate-950 border border-slate-800 text-slate-200 text-center rounded text-xs"
                                  />
                                ) : (
                                  `${chem.minQty} ${chem.unit}`
                                )}
                              </td>
                              <td className={`p-3 font-mono ${isChemicalAlert(chem) ? 'text-rose-400 font-bold' : 'text-slate-400'}`}>
                                {editingItemId === chem.id ? (
                                  <input
                                    type="date"
                                    value={editFields.expiryDate}
                                    onChange={(e) => setEditFields({ ...editFields, expiryDate: e.target.value })}
                                    onClick={(e) => { try { (e.currentTarget as any).showPicker(); } catch (err) {} }}
                                    onFocus={(e) => { try { (e.currentTarget as any).showPicker(); } catch (err) {} }}
                                    className="p-1 bg-slate-950 border border-slate-800 text-slate-200 rounded text-xs cursor-pointer"
                                  />
                                ) : (
                                  chem.expiryDate
                                )}
                              </td>
                              <td className="p-3 text-center">
                                {editingItemId === chem.id ? (
                                  <button
                                    onClick={() => saveInventoryEdit('chemical', chem.id)}
                                    className="p-1.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-lg cursor-pointer"
                                  >
                                    <Check className="w-3.5 h-3.5" />
                                  </button>
                                ) : (
                                  <button
                                    onClick={() => startEditing(chem.id, { qty: chem.qty, minQty: chem.minQty, expiryDate: chem.expiryDate })}
                                    className="p-1.5 hover:bg-slate-100 text-slate-400 hover:text-slate-700 rounded-lg cursor-pointer border border-transparent hover:border-slate-700"
                                  >
                                    <Edit2 className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>

              </div>
            )}

            {/* แท็บ 2: จัดการผู้ใช้งานและอนุมัติรายชื่อสมัครใหม่ (User Management) */}
            {activeTab === 'users' && (
              <div className="bg-slate-900 rounded-3xl border border-slate-800 shadow-sm p-6 space-y-6">
                
                {/* 2.1 บอร์ดสมัครใหม่ (Pending Register Users Alert) */}
                <div className="space-y-3">
                  <h3 className="font-bold text-slate-100 text-sm flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 bg-amber-500 rounded-full animate-pulse" />
                    รายชื่อผู้ขอเปิดสิทธิ์เข้าใช้งานครั้งแรก (Pending Request Users)
                  </h3>
                  
                  {users.filter(u => u.status === 'Pending').length === 0 ? (
                    <div className="p-6 bg-slate-950 rounded-2xl border border-slate-800 text-center text-xs text-slate-500 font-medium">
                      ไม่มีรายชื่อรออนุมัติเปิดสิทธิ์เข้าใช้งานในขณะนี้
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 gap-4">
                      {users.filter(u => u.status === 'Pending').map((usr) => (
                        <div key={usr.email} className="p-4 bg-slate-950 border border-slate-800 rounded-3xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4 text-xs">
                          <div className="space-y-1.5">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-slate-200 text-sm">{usr.name}</span>
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${usr.role === 'Student' ? 'bg-amber-500/10 border border-amber-500/20 text-amber-400' : 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400'}`}>
                                {usr.role === 'Student' ? 'นักศึกษา' : 'อาจารย์'}
                              </span>
                            </div>
                            <p className="font-mono text-slate-400">{usr.email} • {usr.phone}</p>
                            
                            {/* รายละเอียดเพิ่มเติมเฉพาะสิทธิ์นักศึกษา */}
                            {usr.role === 'Student' ? (
                              <p className="text-[11px] text-slate-300 bg-slate-900 p-2 rounded-xl border border-slate-800 leading-relaxed">
                                <strong>รหัสนักศึกษา:</strong> {usr.studentId} • <strong>สาขา:</strong> {usr.major} • <strong>อาจารย์ผู้ดูแล:</strong> {usr.advisor}
                              </p>
                            ) : (
                              <p className="text-[11px] text-slate-300 bg-slate-900 p-2 rounded-xl border border-slate-800 leading-relaxed">
                                <strong>สังกัดภาควิชา:</strong> {usr.department}
                              </p>
                            )}
                          </div>

                          <div className="flex gap-2 w-full md:w-auto">
                            <button
                              onClick={() => handleUserStatusUpdate(usr.email, 'Banned')}
                              className="flex-1 md:flex-initial px-4 py-2 bg-slate-900 hover:bg-rose-900/30 border border-slate-800 text-rose-400 font-bold rounded-xl transition-all cursor-pointer"
                            >
                              ปฏิเสธคำขอ
                            </button>
                            <button
                              onClick={() => handleUserStatusUpdate(usr.email, 'Active')}
                              className="flex-1 md:flex-initial px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl transition-all shadow-md cursor-pointer"
                            >
                              อนุมัติสิทธิ์ (Active)
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* 2.2 สมาชิกปัจจุบันทั้งหมด */}
                <div className="space-y-3 pt-4 border-t border-slate-800">
                  <h3 className="font-bold text-slate-100 text-sm">รายชื่อผู้ใช้งานปัจจุบันทั้งหมดในระบบ</h3>
                  <div className="overflow-x-auto border border-slate-800 rounded-2xl">
                    <table className="w-full text-xs text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-950 border-b border-slate-800 text-slate-400 text-[10px] font-bold uppercase">
                          <th className="p-3">ผู้ใช้งาน</th>
                          <th className="p-3">ประเภทสิทธิ์</th>
                          <th className="p-3">เบอร์ติดต่อ</th>
                          <th className="p-3">สถานะบัญชี</th>
                          <th className="p-3 text-center">จัดการสิทธิ์</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800">
                        {users.filter(u => u.status !== 'Pending').map(usr => (
                          <tr key={usr.email} className="hover:bg-slate-800/30">
                            <td className="p-3">
                              <span className="font-bold text-slate-200 block">{usr.name}</span>
                              <span className="text-[10px] text-slate-400 font-mono block">{usr.email}</span>
                            </td>
                            <td className="p-3">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                                usr.role === 'Admin' 
                                  ? 'bg-rose-500/10 border-rose-500/20 text-rose-400' 
                                  : usr.role === 'Teacher' 
                                  ? 'bg-indigo-500/10 border-indigo-500/20 text-indigo-400' 
                                  : 'bg-slate-800 border-slate-700 text-slate-300'
                              }`}>
                                {usr.role}
                              </span>
                            </td>
                            <td className="p-3 font-mono font-medium text-slate-400">{usr.phone}</td>
                            <td className="p-3">
                              <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold border ${
                                usr.status === 'Active' 
                                  ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' 
                                  : 'bg-rose-500/10 border-rose-500/20 text-rose-400'
                              }`}>
                                {usr.status}
                              </span>
                            </td>
                            <td className="p-3 text-center">
                              {usr.role !== 'Admin' && (
                                usr.status === 'Active' ? (
                                  <button
                                    onClick={() => handleUserStatusUpdate(usr.email, 'Banned')}
                                    className="p-1.5 hover:bg-rose-950 border border-transparent hover:border-rose-500/30 text-slate-400 hover:text-rose-400 rounded-lg transition-all cursor-pointer"
                                    title="ระงับการใช้งานบัญชี (Ban)"
                                  >
                                    <Ban className="w-3.5 h-3.5" />
                                  </button>
                                ) : (
                                  <button
                                    onClick={() => handleUserStatusUpdate(usr.email, 'Active')}
                                    className="p-1.5 hover:bg-emerald-950 border border-transparent hover:border-emerald-500/30 text-slate-400 hover:text-emerald-400 rounded-lg transition-all cursor-pointer"
                                    title="ปลดแบนบัญชี (Unban)"
                                  >
                                    <CheckCircle className="w-3.5 h-3.5" />
                                  </button>
                                )
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

              </div>
            )}

            {/* แท็บ 3: หน้าจัดการตรวจสอบคำขอจองเครื่องมือวิทยาศาสตร์ (Booking Approval) */}
            {activeTab === 'bookings' && (
              <div className="bg-slate-900 rounded-3xl border border-slate-800 shadow-sm p-6 space-y-6">
                <div>
                  <h3 className="text-base font-bold text-slate-100">ระบบตรวจสอบคำขอจองเครื่องมือวิทยาศาสตร์</h3>
                  <p className="text-xs text-slate-400">แอดมินช่วยคัดกรองวันและช่วงเวลาทดสอบเพื่ออนุมัติหรือยกเลิกการจอง</p>
                </div>

                {requests.filter(r => r.type === 'instrument' && r.status === 'Pending').length === 0 ? (
                  <div className="p-10 bg-slate-950 border border-slate-800 rounded-2xl text-center text-xs text-slate-500 font-medium">
                    ไม่มีรายการคำจองเครื่องมือวิทยาศาสตร์ค้างตรวจสอบในระบบ
                  </div>
                ) : (
                  <div className="space-y-4">
                    {requests.filter(r => r.type === 'instrument' && r.status === 'Pending').map(req => (
                      <div key={req.id} className="p-5 bg-slate-950 rounded-3xl border border-slate-800 space-y-4 text-xs">
                        <div className="flex justify-between items-start border-b border-slate-800 pb-3">
                          <div className="space-y-1">
                            <span className="px-2 py-0.5 bg-slate-900 border border-slate-800 font-mono text-[9px] font-bold text-slate-300 rounded">
                              {req.id}
                            </span>
                            <span className="text-xs font-bold text-slate-200 block mt-1">{req.instrumentName}</span>
                          </div>
                          <span className="text-[10px] text-slate-500">เมื่อ: {new Date(req.requestDate).toLocaleString('th-TH')}</span>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 leading-relaxed">
                          <div className="space-y-1 bg-slate-900 p-3 rounded-2xl border border-slate-800 text-slate-300">
                            <strong>ผู้ส่งคำขอ:</strong> {req.userName} ({req.userEmail})<br />
                            <strong>เบอร์ติดต่อผู้ยื่น:</strong> {req.userPhone}
                          </div>
                          <div className="space-y-1 bg-slate-900 p-3 rounded-2xl border border-slate-800 text-slate-300">
                            <strong>วันรับเครื่องใช้งาน:</strong> {new Date(req.startDate).toLocaleString('th-TH')}<br />
                            <strong>กำหนดสิ้นสุดการจอง:</strong> {req.endDate ? new Date(req.endDate).toLocaleString('th-TH') : '-'}<br />
                            <strong>วัตถุประสงค์การจอง:</strong> {req.purpose}
                          </div>
                        </div>

                        {/* ฟอร์มเขียนข้อคิดเห็นก่อนอนุมัติ */}
                        <div className="space-y-1.5">
                          <label className="text-[11px] font-bold text-slate-400 block">ระบุข้อคิดเห็นแจ้งผู้ขอใช้งาน (ตัวเลือกเพิ่มเติม)</label>
                          <input
                            type="text"
                            placeholder="ระบุเหตุผลตอบกลับหากมีการปฏิเสธ หรือหมายเหตุกฎแลปด่วน..."
                            value={adminComment}
                            onChange={(e) => setAdminComment(e.target.value)}
                            className="w-full text-xs px-3.5 py-2.5 bg-slate-900 border border-slate-800 rounded-xl focus:outline-none focus:border-emerald-500 text-slate-200"
                          />
                        </div>

                        <div className="flex justify-end gap-3.5 pt-2">
                          <button
                            onClick={() => handleProcessRequest(req.id, 'Rejected')}
                            className="px-4 py-2 bg-slate-900 hover:bg-rose-900/30 border border-slate-800 text-rose-400 font-bold rounded-xl cursor-pointer"
                          >
                            ปฏิเสธการจอง (Reject)
                          </button>
                          <button
                            onClick={() => handleProcessRequest(req.id, 'Approved')}
                            className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl shadow-md cursor-pointer"
                          >
                            อนุมัติการจอง (Approve)
                          </button>
                        </div>

                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* แท็บ 4: อนุมัติยืมคลังเครื่องแก้ว และ สารเคมี (Loan Approval) */}
            {activeTab === 'loans' && (
              <div className="bg-slate-900 rounded-3xl border border-slate-800 shadow-sm p-6 space-y-6">
                <div>
                  <h3 className="text-base font-bold text-slate-100">ระบบคัดกรองคำขอยืมวัสดุ เครื่องแก้ว และสารเคมี</h3>
                  <p className="text-xs text-slate-400">ตรวจสอบจำนวนยอดสต็อกคลังคงเหลือและอนุมัติใบเบิกอุปกรณ์ให้ผู้ใช้เข้ามารับตามวันเวลา</p>
                </div>

                {requests.filter(r => r.type !== 'instrument' && r.status === 'Pending').length === 0 ? (
                  <div className="p-10 bg-slate-950 border border-slate-800 rounded-2xl text-center text-xs text-slate-500 font-medium">
                    ไม่มีรายการขอยืมหรือเบิกเครื่องแก้ว/สารเคมีค้างคอยในระบบหลังบ้าน
                  </div>
                ) : (
                  <div className="space-y-4">
                    {requests.filter(r => r.type !== 'instrument' && r.status === 'Pending').map(req => (
                      <div key={req.id} className="p-5 bg-slate-950 rounded-3xl border border-slate-800 space-y-4 text-xs">
                        <div className="flex justify-between items-start border-b border-slate-800 pb-3">
                          <div className="space-y-1">
                            <span className="px-2.5 py-0.5 bg-indigo-500/10 font-mono text-[9px] font-bold text-indigo-400 rounded border border-indigo-500/20">
                              {req.id}
                            </span>
                            <span className="text-xs font-bold text-slate-200 block mt-1">
                              คำขอ: {req.type === 'glassware' ? 'ยืมกลุ่มเครื่องแก้วแลป' : `เบิก/ยืมกลุ่มสารเคมี (${req.actionType === 'withdraw' ? 'เบิกใช้หมด' : 'ยืมบรรจุภัณฑ์'})`}
                            </span>
                          </div>
                          <span className="text-[10px] text-slate-500">เมื่อ: {new Date(req.requestDate).toLocaleString('th-TH')}</span>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <div className="space-y-2 bg-slate-900 p-3.5 rounded-2xl border border-slate-800">
                            <strong className="text-slate-500 uppercase text-[9px] block">รายการวัสดุที่ยื่นยืม</strong>
                            <div className="space-y-1.5 pl-1 text-[11px]">
                              {req.items?.map((it, idx) => (
                                <div key={idx} className="flex justify-between font-bold text-slate-300">
                                  <span>• {it.name}</span>
                                  <span>{it.qty} {it.unit || 'ชิ้น'}</span>
                                </div>
                              ))}
                            </div>
                          </div>

                          <div className="space-y-1 bg-slate-900 p-3.5 rounded-2xl border border-slate-800 leading-relaxed text-slate-300">
                            <strong>ผู้ขอยืม:</strong> {req.userName} ({req.userEmail})<br />
                            <strong>เบอร์โทรผู้ขอ:</strong> {req.userPhone}<br />
                            <strong>วันเวลานัดเข้ามารับ:</strong> {new Date(req.startDate).toLocaleString('th-TH')}<br />
                            {req.endDate && <span><strong>กำหนดส่งคืนคลัง:</strong> {new Date(req.endDate).toLocaleString('th-TH')}<br /></span>}
                            <strong>วัตถุประสงค์:</strong> {req.purpose}
                          </div>
                        </div>

                        {/* ฟอร์มเขียนข้อคิดเห็น */}
                        <div className="space-y-1.5">
                          <label className="text-[11px] font-bold text-slate-400 block">ระบุข้อคิดเห็นหรือข้อตกลงในการยืม (ตัวเลือกเพิ่มเติม)</label>
                          <input
                            type="text"
                            placeholder="ระบุความเห็นส่งกลับไปถึงผู้ใช้บริการ..."
                            value={adminComment}
                            onChange={(e) => setAdminComment(e.target.value)}
                            className="w-full text-xs px-3.5 py-2.5 bg-slate-900 border border-slate-800 rounded-xl focus:outline-none focus:border-emerald-500 text-slate-200"
                          />
                        </div>

                        <div className="flex justify-end gap-3.5 pt-1">
                          <button
                            onClick={() => handleProcessRequest(req.id, 'Rejected')}
                            className="px-4 py-2 bg-slate-900 hover:bg-rose-900/30 border border-slate-800 text-rose-400 font-bold rounded-xl cursor-pointer"
                          >
                            ปฏิเสธการยืม (Reject)
                          </button>
                          <button
                            onClick={() => handleProcessRequest(req.id, 'Approved')}
                            className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl shadow-md cursor-pointer"
                          >
                            อนุมัติการยืม (Approve)
                          </button>
                        </div>

                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* แท็บ 5: หน้ารับคืนของหน้างานจากปุ่มที่ผู้ใช้แจ้ง (Return Verification) */}
            {activeTab === 'returns' && (
              <div className="bg-slate-900 rounded-3xl border border-slate-800 shadow-sm p-6 space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
                  <div>
                    <h3 className="text-base font-bold text-slate-100">หน้ารับคืนของหน้างาน (Return Verification Dashboard)</h3>
                    <p className="text-xs text-slate-400">ตรวจสอบและกดยืนยันการรับคืนวัสดุที่ผู้ใช้ปฏิบัติงานส่งคืนเรียบร้อยแล้วเพื่อคืนสต็อกกลับคลัง</p>
                  </div>
                  
                  {/* ปุ่มดึงสถิติคืนของช้า */}
                  <button
                    onClick={() => downloadReport('overdue_returns')}
                    className="px-3 py-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 text-[10px] font-bold rounded-lg border border-rose-500/20 flex items-center gap-1 shrink-0 cursor-pointer"
                    id="export-overdue-btn"
                  >
                    <Download className="w-3.5 h-3.5" />
                    ดาวน์โหลดรายชื่อคืนสาย
                  </button>
                </div>

                {/* รายการที่มีผู้ใช้กด "แจ้งคืนของ" */}
                <div className="space-y-4">
                  <h4 className="text-xs font-bold text-indigo-400 uppercase tracking-wider flex items-center gap-1">
                    <span className="w-2 h-2 bg-indigo-500 rounded-full animate-pulse" />
                    รายการที่มีการ "แจ้งคืนของ" รอแอดมินตรวจเช็คของจริง ({requests.filter(r => r.returnNotified === true).length} รายการ)
                  </h4>

                  {requests.filter(r => r.returnNotified === true).length === 0 ? (
                    <div className="p-8 bg-slate-950 border border-slate-800 rounded-2xl text-center text-xs text-slate-500 font-medium">
                      ไม่มีการแจ้งคืนค้างตรวจสอบในเวลานี้ (ผู้ใช้จะต้องกดแจ้งในประวัติธุรกรรมเพื่อส่งสัญญาณมาตรงนี้)
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 gap-4">
                      {requests.filter(r => r.returnNotified === true).map(req => (
                        <div key={req.id} className="p-4 bg-indigo-550/10 border border-indigo-500/20 rounded-3xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4 text-xs">
                          <div className="space-y-1.5 text-left">
                            <span className="px-2 py-0.5 bg-indigo-500/10 font-mono text-[9px] font-bold text-indigo-400 rounded border border-indigo-500/20">
                              {req.id}
                            </span>
                            <h5 className="font-bold text-slate-200 mt-1">
                              {req.type === 'instrument' ? `จอง: ${req.instrumentName}` : `วัสดุ: ${req.items?.map(it => `${it.name} (${it.qty})`).join(', ')}`}
                            </h5>
                            <p className="text-slate-400">ผู้ส่งคืน: <strong className="text-slate-200">{req.userName}</strong> ({req.userEmail}) • {req.userPhone}</p>
                            <span className="text-[10px] text-indigo-400 font-medium block">
                              แจ้งคืนเข้ามาระบบเมื่อ: {req.returnNotifiedDate ? new Date(req.returnNotifiedDate).toLocaleString('th-TH') : '-'}
                            </span>
                          </div>

                          <button
                            onClick={() => {
                              if (window.confirm('คุณได้ทำการตรวจสอบสภาพของวัสดุ ครบถ้วน สมบูรณ์ และต้องการยืนยันการรับคืนหรือไม่?')) {
                                handleProcessRequest(req.id, 'Returned');
                              }
                            }}
                            className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl transition-all shadow-md flex items-center gap-1 self-stretch md:self-auto justify-center cursor-pointer"
                          >
                            <Check className="w-3.5 h-3.5" />
                            ยืนยันได้รับของครบแล้ว (Confirm Return)
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* รายการอุปกรณ์ที่กำลังโดนยืมทั้งหมดตอนนี้ (สำหรับค้างติดตาม) */}
                <div className="space-y-3 pt-6 border-t border-slate-800">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">สถานะของและเครื่องมือที่กำลังโดนยืมปฏิบัติงานนอกคลัง</h4>
                  
                  {requests.filter(r => (r.status === 'Approved' || r.status === 'Overdue') && !r.returnNotified && r.endDate).length === 0 ? (
                    <div className="p-6 bg-slate-950 rounded-2xl border border-slate-800 text-center text-xs text-slate-500 font-medium">
                      ไม่มีรายการสิ่งของที่โดนยืมไปใช้งานนอกห้องคลังในขณะนี้
                    </div>
                  ) : (
                    <div className="overflow-x-auto border border-slate-800 rounded-2xl text-[11px]">
                      <table className="w-full text-xs text-left border-collapse">
                        <thead>
                          <tr className="bg-slate-950 border-b border-slate-800 text-slate-400 text-[9px] uppercase font-bold">
                            <th className="p-3">เลขที่</th>
                            <th className="p-3">ผู้ยืม / อีเมล</th>
                            <th className="p-3">รายการอุปกรณ์</th>
                            <th className="p-3">กำหนดกำหนดคืน</th>
                            <th className="p-3">สถานะติดตาม</th>
                            <th className="p-3 text-center">ดำเนินการด่วน</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800">
                          {requests.filter(r => (r.status === 'Approved' || r.status === 'Overdue') && !r.returnNotified && r.endDate).map(req => (
                            <tr key={req.id} className="hover:bg-slate-800/30">
                              <td className="p-3 font-mono font-bold text-slate-400">{req.id}</td>
                              <td className="p-3">
                                <span className="font-bold text-slate-200 block">{req.userName}</span>
                                <span className="text-[9px] text-slate-400 font-mono">{req.userEmail}</span>
                              </td>
                              <td className="p-3">
                                <span className="font-medium text-slate-300 block">
                                  {req.type === 'instrument' ? req.instrumentName : req.items?.map(it => `${it.name} (${it.qty})`).join(', ')}
                                </span>
                              </td>
                              <td className="p-3 font-mono text-slate-400">{req.endDate ? new Date(req.endDate).toLocaleString('th-TH') : '-'}</td>
                              <td className="p-3">
                                <span className={`px-2 py-0.5 rounded text-[9px] font-bold border ${
                                  req.status === 'Overdue' 
                                    ? 'bg-rose-500/10 border-rose-500/20 text-rose-400 animate-pulse' 
                                    : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                                }`}>
                                  {req.status === 'Overdue' ? 'เลยกำหนดเวลา!' : 'กำลังยืม'}
                                </span>
                              </td>
                              <td className="p-3 text-center">
                                <button
                                  onClick={() => {
                                    if (window.confirm('ยืนยันบันทึกการส่งคืนย้อนหลัง (ปิดกรณีลืมแจ้งคืนระบบ)?')) {
                                      handleProcessRequest(req.id, 'Returned');
                                    }
                                  }}
                                  className="px-2.5 py-1 bg-slate-950 hover:bg-slate-850 hover:text-white border border-slate-800 text-slate-400 font-bold rounded-lg text-[9px] transition-all cursor-pointer"
                                >
                                  บังคับคืน (Force Return)
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

              </div>
            )}

            {/* แท็บ 6: คู่มือติดตั้ง Google Apps Script และ Google Sheets (Guide) */}
            {activeTab === 'guide' && (
              <AppsScriptGuide />
            )}

          </div>

        </div>

      </div>

    </div>
  );
}
