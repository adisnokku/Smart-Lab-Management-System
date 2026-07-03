/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Instrument, Glassware, Chemical, User, CartItem, LabRequest } from '../types';
import { labApi } from '../services/api';
import { 
  Search, Calendar, Clock, ShoppingCart, Beaker, Trash2, 
  CheckCircle, AlertTriangle, HelpCircle, User as UserIcon, MapPin, 
  Tag, Info, Plus, Minus, ArrowRight, ClipboardList, LogOut, Check
} from 'lucide-react';

interface UserDashboardProps {
  user: User;
  onLogout: () => void;
  onNavigateToHistory: () => void;
}

type TabType = 'instruments' | 'glassware' | 'chemicals';

export default function UserDashboard({ user, onLogout, onNavigateToHistory }: UserDashboardProps) {
  const [activeTab, setActiveTab] = useState<TabType>('instruments');
  const [searchQuery, setSearchQuery] = useState('');
  
  // โหลดข้อมูลคลัง
  const [instruments, setInstruments] = useState<Instrument[]>([]);
  const [glassware, setGlassware] = useState<Glassware[]>([]);
  const [chemicals, setChemicals] = useState<Chemical[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // ตะกร้าสินค้า (แยกส่วนเครื่องแก้วและสารเคมี)
  const [glasswareCart, setGlasswareCart] = useState<CartItem[]>([]);
  const [chemicalCart, setChemicalCart] = useState<CartItem[]>([]);

  // ตรวจสอบและแสดงผลตะกร้า
  const [isCartOpen, setIsCartOpen] = useState(false);

  // สถานะเกี่ยวกับการจองเครื่องมือวิทยาศาสตร์ (Booking Modal)
  const [selectedInstrument, setSelectedInstrument] = useState<Instrument | null>(null);
  const [instrumentBookings, setInstrumentBookings] = useState<LabRequest[]>([]);
  const [bookingForm, setBookingForm] = useState({
    date: '',
    startTime: '',
    endTime: '',
    purpose: ''
  });

  // สถานะฟอร์มส่งคำขอยืมเครื่องแก้ว/สารเคมีจากตะกร้า
  const [cartCheckoutForm, setCartCheckoutForm] = useState({
    startDate: '',
    startTime: '',
    endDate: '',
    endTime: '',
    purpose: '',
    actionType: 'borrow' as 'borrow' | 'withdraw' // สำหรับเคมี
  });

  const [feedbackMsg, setFeedbackMsg] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  // โหลดข้อมูลทั้งหมดเมื่อเปิดหน้าจอ
  const loadData = async () => {
    setIsLoading(true);
    try {
      const insts = await labApi.getInstruments();
      const gws = await labApi.getGlassware();
      const chems = await labApi.getChemicals();
      setInstruments(insts);
      setGlassware(gws);
      setChemicals(chems);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (selectedInstrument) {
      labApi.getRequests().then(allReqs => {
        const filtered = allReqs.filter(r => 
          r.type === 'instrument' && 
          r.instrumentId === selectedInstrument.id &&
          (r.status === 'Pending' || r.status === 'Approved' || r.status === 'Overdue')
        );
        setInstrumentBookings(filtered);
      }).catch(err => console.error(err));
    } else {
      setInstrumentBookings([]);
    }
  }, [selectedInstrument]);

  // แสดงผล Feedback ชั่วคราว
  const showFeedback = (type: 'success' | 'error', text: string) => {
    setFeedbackMsg({ type, text });
    setTimeout(() => setFeedbackMsg(null), 4000);
  };

  // กรองข้อมูลตามที่ค้นหาแบบ Real-time
  const getFilteredInstruments = () => {
    return instruments.filter(i => 
      i.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      i.brand.toLowerCase().includes(searchQuery.toLowerCase()) ||
      i.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      i.location.toLowerCase().includes(searchQuery.toLowerCase())
    );
  };

  const getFilteredGlassware = () => {
    return glassware.filter(g => 
      g.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      g.details.toLowerCase().includes(searchQuery.toLowerCase()) ||
      g.id.toLowerCase().includes(searchQuery.toLowerCase())
    );
  };

  const getFilteredChemicals = () => {
    return chemicals.filter(c => 
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.details.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.id.toLowerCase().includes(searchQuery.toLowerCase())
    );
  };

  // --- ฟังก์ชันช่วยเหลือจัดการ ตะกร้าเครื่องแก้ว ---
  const addToGlasswareCart = (item: Glassware) => {
    if (item.availableQty <= 0) {
      showFeedback('error', `ขออภัย: เครื่องแก้ว ${item.name} หมดชั่วคราว`);
      return;
    }
    
    setGlasswareCart(prev => {
      const existing = prev.find(c => c.id === item.id);
      if (existing) {
        if (existing.quantity >= item.availableQty) {
          showFeedback('error', `ไม่สามารถยืมเกินจำนวนที่พร้อมยืมที่มีอยู่ (${item.availableQty} ชิ้น)`);
          return prev;
        }
        showFeedback('success', `เพิ่มจำนวน ${item.name} ในตะกร้าแล้ว`);
        return prev.map(c => c.id === item.id ? { ...c, quantity: c.quantity + 1 } : c);
      }
      showFeedback('success', `เพิ่ม ${item.name} ลงในตะกร้าแล้ว`);
      return [...prev, { id: item.id, name: item.name, quantity: 1, availableQty: item.availableQty }];
    });
  };

  const updateGlasswareCartQty = (id: string, delta: number) => {
    setGlasswareCart(prev => prev.map(c => {
      if (c.id === id) {
        const newQty = c.quantity + delta;
        if (newQty <= 0) return null;
        if (newQty > c.availableQty) {
          showFeedback('error', `จำนวนยืมเกินยอดพร้อมใช้งาน (${c.availableQty} ชิ้น)`);
          return c;
        }
        return { ...c, quantity: newQty };
      }
      return c;
    }).filter(Boolean) as CartItem[]);
  };

  const removeFromGlasswareCart = (id: string) => {
    setGlasswareCart(prev => prev.filter(c => c.id !== id));
    showFeedback('success', 'ลบรายการออกจากตะกร้าเรียบร้อย');
  };

  // --- ฟังก์ชันช่วยเหลือจัดการ ตะกร้าสารเคมี ---
  const addToChemicalCart = (item: Chemical) => {
    if (item.qty <= 0) {
      showFeedback('error', `ขออภัย: สารเคมี ${item.name} หมดคลังแล้ว`);
      return;
    }

    setChemicalCart(prev => {
      const existing = prev.find(c => c.id === item.id);
      if (existing) {
        if (existing.quantity + 0.1 > item.qty) {
          showFeedback('error', `ไม่สามารถเบิก/ยืมเกินปริมาณคงเหลือในคลัง (${item.qty} ${item.unit})`);
          return prev;
        }
        showFeedback('success', `เพิ่มปริมาณ ${item.name} ในตะกร้าแล้ว`);
        // บวกทีละ 0.1 หรือ 1 แล้วแต่ประเภทของหน่วย
        const step = item.unit === 'kg' || item.unit === 'L' ? 0.1 : 1;
        return prev.map(c => c.id === item.id ? { ...c, quantity: Number((c.quantity + step).toFixed(2)) } : c);
      }
      showFeedback('success', `เพิ่ม ${item.name} ลงในตะกร้าสารเคมีแล้ว`);
      return [...prev, { 
        id: item.id, 
        name: item.name, 
        quantity: item.unit === 'kg' || item.unit === 'L' ? 0.1 : 1, 
        availableQty: item.qty, 
        unit: item.unit 
      }];
    });
  };

  const updateChemicalCartQty = (id: string, delta: number, unit?: string) => {
    const step = unit === 'kg' || unit === 'L' ? 0.1 : 1;
    setChemicalCart(prev => prev.map(c => {
      if (c.id === id) {
        const newQty = Number((c.quantity + (delta * step)).toFixed(2));
        if (newQty <= 0) return null;
        if (newQty > c.availableQty) {
          showFeedback('error', `จำนวนเกินเกณฑ์คงคลังที่ใช้งานได้ (${c.availableQty} ${unit})`);
          return c;
        }
        return { ...c, quantity: newQty };
      }
      return c;
    }).filter(Boolean) as CartItem[]);
  };

  const removeFromChemicalCart = (id: string) => {
    setChemicalCart(prev => prev.filter(c => c.id !== id));
    showFeedback('success', 'ลบรายการสารเคมีเรียบร้อย');
  };

  // --- การจองเครื่องมือวิทยาศาสตร์ (Booking Request) ---
  const handleBookingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedInstrument) return;

    if (!bookingForm.date || !bookingForm.startTime || !bookingForm.endTime || !bookingForm.purpose) {
      showFeedback('error', 'กรุณากรอกข้อมูลวันที่ เวลา และหมายเหตุวัตถุประสงค์ให้ครบถ้วน');
      return;
    }

    const startDateTime = `${bookingForm.date}T${bookingForm.startTime}`;
    const endDateTime = `${bookingForm.date}T${bookingForm.endTime}`;

    if (new Date(startDateTime) >= new Date(endDateTime)) {
      showFeedback('error', 'เวลาเริ่มต้นต้องเกิดขึ้นก่อนเวลาสิ้นสุดการใช้งาน');
      return;
    }

    const res = await labApi.submitRequest({
      type: 'instrument',
      userEmail: user.email,
      userName: user.name,
      userPhone: user.phone,
      instrumentId: selectedInstrument.id,
      instrumentName: `${selectedInstrument.name} (${selectedInstrument.brand})`,
      startDate: startDateTime,
      endDate: endDateTime,
      purpose: bookingForm.purpose
    });

    if (res.success) {
      showFeedback('success', 'ส่งคำขอจองเครื่องมือวิทยาศาสตร์รอแอดมินอนุมัติสำเร็จแล้ว!');
      setSelectedInstrument(null);
      setBookingForm({ date: '', startTime: '', endTime: '', purpose: '' });
      loadData(); // รีโหลดข้อมูลเพื่ออัปเดตสถานะล่าสุด
    } else {
      showFeedback('error', res.message);
    }
  };

  // --- การส่งข้อมูลคำขอยืมเครื่องแก้ว ---
  const handleGlasswareCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (glasswareCart.length === 0) return;

    if (!cartCheckoutForm.startDate || !cartCheckoutForm.startTime || !cartCheckoutForm.endDate || !cartCheckoutForm.endTime || !cartCheckoutForm.purpose) {
      showFeedback('error', 'กรุณาระบุ วันที่/เวลารับ และ วันที่/เวลากำหนดส่งคืน และวัตถุประสงค์');
      return;
    }

    const start = `${cartCheckoutForm.startDate}T${cartCheckoutForm.startTime}`;
    const end = `${cartCheckoutForm.endDate}T${cartCheckoutForm.endTime}`;

    if (new Date(start) >= new Date(end)) {
      showFeedback('error', 'เวลากำหนดคืน ต้องอยู่หลังเวลารับอุปกรณ์');
      return;
    }

    const res = await labApi.submitRequest({
      type: 'glassware',
      userEmail: user.email,
      userName: user.name,
      userPhone: user.phone,
      items: glasswareCart.map(c => ({ id: c.id, name: c.name, qty: c.quantity })),
      startDate: start,
      endDate: end,
      purpose: cartCheckoutForm.purpose
    });

    if (res.success) {
      showFeedback('success', 'ส่งคำขอยืมเครื่องแก้วไปที่ระบบหลังบ้านสำเร็จแล้ว!');
      setGlasswareCart([]);
      setIsCartOpen(false);
      setCartCheckoutForm({ startDate: '', startTime: '', endDate: '', endTime: '', purpose: '', actionType: 'borrow' });
      loadData();
    } else {
      showFeedback('error', res.message);
    }
  };

  // --- การส่งข้อมูลคำขอยืมหรือเบิกสารเคมี ---
  const handleChemicalCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (chemicalCart.length === 0) return;

    const action = cartCheckoutForm.actionType;
    if (!cartCheckoutForm.startDate || !cartCheckoutForm.startTime || !cartCheckoutForm.purpose) {
      showFeedback('error', 'กรุณาระบุ วันที่/เวลา ที่ต้องการเบิกรับสารเคมี และวัตถุประสงค์');
      return;
    }

    const start = `${cartCheckoutForm.startDate}T${cartCheckoutForm.startTime}`;
    let end = undefined;

    // สำหรับกรณี "ยืม" สารเคมี ต้องระบุวันส่งคืน
    if (action === 'borrow') {
      if (!cartCheckoutForm.endDate || !cartCheckoutForm.endTime) {
        showFeedback('error', 'กรณีเลือกประเภท "ยืม" สารเคมี ต้องระบุวัน/เวลาคืนหลอดแก้วหรือภาชนะบรรจุ');
        return;
      }
      end = `${cartCheckoutForm.endDate}T${cartCheckoutForm.endTime}`;
      if (new Date(start) >= new Date(end)) {
        showFeedback('error', 'เวลากำหนดส่งคืน ต้องเกิดหลังเวลารับสารเคมี');
        return;
      }
    }

    const res = await labApi.submitRequest({
      type: 'chemical',
      actionType: action,
      userEmail: user.email,
      userName: user.name,
      userPhone: user.phone,
      items: chemicalCart.map(c => ({ id: c.id, name: c.name, qty: c.quantity, unit: c.unit })),
      startDate: start,
      endDate: end,
      purpose: cartCheckoutForm.purpose
    });

    if (res.success) {
      showFeedback('success', `ส่งคำขอ ${action === 'borrow' ? 'ยืม' : 'เบิก'} สารเคมีสำเร็จเรียบร้อย!`);
      setChemicalCart([]);
      setIsCartOpen(false);
      setCartCheckoutForm({ startDate: '', startTime: '', endDate: '', endTime: '', purpose: '', actionType: 'borrow' });
      loadData();
    } else {
      showFeedback('error', res.message);
    }
  };

  // ฟังก์ชันช่วยเหลือ ตรวจสอบสารเคมีหมดอายุหรือเหลือน้อย
  const getChemicalWarnings = (item: Chemical) => {
    const alerts = [];
    
    // 1. ตรวจสอบระดับสารเคมีเหลือน้อย (Low Stock Alert)
    if (item.qty <= item.minQty) {
      alerts.push({ type: 'low_stock', text: 'สารเคมีเหลือน้อยกว่าเกณฑ์ขั้นต่ำ' });
    }

    // 2. ตรวจสอบการหมดอายุล่วงหน้าภายใน 1 เดือน (Expiry Alert within 1 Month)
    const expiry = new Date(item.expiryDate);
    const currentDate = new Date('2026-07-01'); // เวลาปัจจุบันที่ระบุใน metadata
    const oneMonthLater = new Date(currentDate);
    oneMonthLater.setMonth(currentDate.getMonth() + 1);

    if (expiry <= currentDate) {
      alerts.push({ type: 'expired', text: 'สารเคมีนี้หมดอายุแล้ว!' });
    } else if (expiry <= oneMonthLater) {
      alerts.push({ type: 'near_expiry', text: `ใกล้หมดอายุ (${item.expiryDate})` });
    }

    return alerts;
  };

  return (
    <div className="min-h-screen bg-slate-950 pb-20 text-slate-100 font-sans" id="user-dashboard-root">
      
      {/* 1. เมนูแถบเครื่องมือส่วนหัว */}
      <header className="bg-slate-900/85 backdrop-blur-md border-b border-slate-800 sticky top-0 z-30 shadow-sm px-6 py-4 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-emerald-500 rounded-xl flex items-center justify-center text-slate-950 font-bold text-lg shadow-md shadow-emerald-500/20">
            SL
          </div>
          <div>
            <h1 className="text-base font-bold text-slate-100">ระบบบริหารจัดการห้องแลปอัจฉริยะ</h1>
            <p className="text-xs text-slate-400">ห้องปฏิบัติการเคมีอนินทรีย์ (Inorganic Lab KKU)</p>
          </div>
        </div>

        {/* ข้อมูลโปรไฟล์และระบบปุ่มทางลัด */}
        <div className="flex flex-wrap items-center gap-3.5">
          <div className="text-right hidden sm:block">
            <span className="text-xs font-bold text-slate-300 block">{user.name}</span>
            <span className="text-[11px] font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full font-bold">
              {user.role} - Active
            </span>
          </div>

          <button
            onClick={onNavigateToHistory}
            className="px-4 py-2 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 border border-emerald-500/20 cursor-pointer"
            id="nav-history-btn"
          >
            <ClipboardList className="w-4 h-4" />
            ประวัติการทำรายการ
          </button>

          {/* ป้ายตะกร้าลอย */}
          {(glasswareCart.length > 0 || chemicalCart.length > 0) && (
            <button
              onClick={() => setIsCartOpen(true)}
              className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-md shadow-amber-500/15 relative"
              id="open-cart-btn"
            >
              <ShoppingCart className="w-4 h-4" />
              ตะกร้าขอเบิก ({glasswareCart.length + chemicalCart.length})
              <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-rose-600 text-[10px] font-bold rounded-full flex items-center justify-center text-white animate-bounce">
                !
              </span>
            </button>
          )}

          <button
            onClick={onLogout}
            className="p-2 bg-slate-800 hover:bg-rose-500/10 hover:text-rose-400 text-slate-400 rounded-xl transition-all cursor-pointer"
            title="ออกจากระบบ"
            id="logout-btn"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* 2. การค้นหาและควบคุมหลักส่วนกลาง */}
      <div className="max-w-7xl mx-auto px-6 pt-8 space-y-6">
        
        {/* แถบ Feedback แจ้งเตือนความสำเร็จและล้มเหลว */}
        <AnimatePresence>
          {feedbackMsg && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className={`p-4 rounded-2xl text-xs font-semibold flex items-center gap-2 shadow-md ${
                feedbackMsg.type === 'success' 
                  ? 'bg-emerald-500 text-white shadow-emerald-500/10' 
                  : 'bg-rose-500 text-white shadow-rose-500/10'
              }`}
              id="feedback-popup"
            >
              {feedbackMsg.type === 'success' ? <CheckCircle className="w-4 h-4 shrink-0" /> : <AlertTriangle className="w-4 h-4 shrink-0" />}
              {feedbackMsg.text}
            </motion.div>
          )}
        </AnimatePresence>

        {/* แผงค้นหาและตัวเลือกแท็บ */}
        <div className="bg-slate-900 p-4 rounded-3xl border border-slate-800 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
          {/* ระบบสลับแท็บเมนู */}
          <div className="flex bg-slate-950 p-1 rounded-2xl w-full md:w-auto border border-slate-800">
            {[
              { id: 'instruments', label: 'เครื่องมือวิทยาศาสตร์' },
              { id: 'glassware', label: 'เครื่องแก้วแลป' },
              { id: 'chemicals', label: 'คลังสารเคมี' }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id as TabType);
                  setSearchQuery('');
                }}
                className={`flex-1 md:flex-initial px-5 py-2.5 text-xs font-bold rounded-xl transition-all relative cursor-pointer ${
                  activeTab === tab.id ? 'bg-slate-850 text-emerald-400 shadow-sm border border-slate-700/50' : 'text-slate-400 hover:text-slate-200'
                }`}
                id={`tab-btn-${tab.id}`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* ช่องค้นหาแบบเรียลไทม์ (Search Bar) */}
          <div className="relative w-full md:max-w-md">
            <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
            <input
              type="text"
              placeholder={`ค้นหาในแท็บ ${activeTab === 'instruments' ? 'เครื่องมือ' : activeTab === 'glassware' ? 'เครื่องแก้ว' : 'สารเคมี'}...`}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full text-xs pl-10 pr-4 py-3 bg-slate-950 border border-slate-800 text-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all placeholder-slate-600"
              id="search-input"
            />
          </div>
        </div>

        {/* 3. ส่วนเนื้อหาตามแท็บที่เลือก */}
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-24 gap-3">
            <div className="w-10 h-10 border-4 border-emerald-500/20 border-t-emerald-600 rounded-full animate-spin" />
            <p className="text-xs text-slate-400 font-medium">กำลังโหลดข้อมูลคลังอุปกรณ์ปฏิบัติการ...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            
            {/* แท็บที่ 1: เครื่องมือวิทยาศาสตร์ */}
            {activeTab === 'instruments' && getFilteredInstruments().map((item) => (
              <motion.div
                key={item.id}
                layout
                className="bg-slate-900 rounded-3xl border border-slate-800 shadow-sm hover:border-emerald-500/30 hover:shadow-lg transition-all overflow-hidden flex flex-col group"
                id={`instrument-card-${item.id}`}
              >
                <div className="aspect-video relative overflow-hidden bg-slate-800">
                  <img 
                    src={item.picture || undefined} 
                    alt={item.name} 
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    referrerPolicy="no-referrer"
                  />
                  {/* ป้ายสถานะสีบ่งบอก */}
                  <div className="absolute top-3 right-3">
                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold shadow-sm ${
                      item.status === 'Ready' 
                        ? 'bg-emerald-500 text-slate-950' 
                        : item.status === 'In Use' 
                        ? 'bg-amber-500 text-slate-950' 
                        : 'bg-rose-500 text-white'
                    }`}>
                      {item.status === 'Ready' ? 'ว่าง' : item.status === 'In Use' ? 'ไม่ว่าง' : 'รอซ่อมบำรุง'}
                    </span>
                  </div>
                </div>

                <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                  <div className="space-y-1.5">
                    <span className="text-[10px] font-mono font-bold text-slate-500 uppercase">{item.id}</span>
                    <h3 className="font-bold text-slate-100 text-sm tracking-tight leading-tight group-hover:text-emerald-400 transition-colors">
                      {item.name}
                    </h3>
                    <p className="text-xs text-slate-400 font-medium">{item.brand}</p>
                    
                    <div className="flex items-center gap-1.5 text-xs text-slate-400 pt-2 border-t border-slate-800">
                      <MapPin className="w-3.5 h-3.5 text-slate-500" />
                      <span>{item.location}</span>
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      if (item.status !== 'Ready') {
                        showFeedback('error', `เครื่องมือนี้มีสถานะ "${item.status === 'In Use' ? 'ไม่ว่าง' : 'ซ่อมบำรุง'}" จึงไม่สามารถจองใช้ได้ในเวลานี้`);
                        return;
                      }
                      setSelectedInstrument(item);
                    }}
                    disabled={item.status !== 'Ready'}
                    className={`w-full py-2.5 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                      item.status === 'Ready'
                        ? 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-md shadow-emerald-500/5'
                        : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                    }`}
                    id={`book-btn-${item.id}`}
                  >
                    จองใช้งานเครื่องมือ
                  </button>
                </div>
              </motion.div>
            ))}

            {/* แท็บที่ 2: เครื่องแก้วแลป */}
            {activeTab === 'glassware' && getFilteredGlassware().map((item) => (
              <motion.div
                key={item.id}
                layout
                className="bg-slate-900 rounded-3xl border border-slate-800 shadow-sm overflow-hidden flex flex-col group hover:border-emerald-500/30 hover:shadow-lg transition-all"
                id={`glassware-card-${item.id}`}
              >
                <div className="aspect-video relative overflow-hidden bg-slate-800">
                  <img 
                    src={item.picture || undefined} 
                    alt={item.name} 
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    referrerPolicy="no-referrer"
                  />
                  {/* แถบเตือนสินค้าหมดเกณฑ์ */}
                  {item.availableQty <= 3 && item.availableQty > 0 && (
                    <div className="absolute top-3 left-3">
                      <span className="px-2.5 py-1 bg-amber-500 text-slate-950 rounded-full text-[9px] font-bold flex items-center gap-1 shadow-md">
                        <AlertTriangle className="w-3 h-3" />
                        ใกล้หมดคลัง
                      </span>
                    </div>
                  )}
                  {item.availableQty === 0 && (
                    <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px] flex items-center justify-center">
                      <span className="px-3.5 py-1.5 bg-rose-600 text-white rounded-full text-xs font-bold shadow-md">
                        ยืมไปหมดแล้ว
                      </span>
                    </div>
                  )}
                </div>

                <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                  <div className="space-y-1.5">
                    <span className="text-[10px] font-mono font-bold text-slate-500 uppercase">{item.id}</span>
                    <h3 className="font-bold text-slate-100 text-sm tracking-tight leading-tight">{item.name}</h3>
                    <p className="text-xs text-slate-400 leading-relaxed font-medium">{item.details}</p>
                    
                    {/* ข้อมูลจำนวนยืม */}
                    <div className="grid grid-cols-3 gap-2 text-center bg-slate-950 p-2.5 rounded-2xl text-[10px] font-bold text-slate-300 mt-2 border border-slate-800">
                      <div>
                        <span className="text-slate-500 block font-medium">รวมทั้งหมด</span>
                        <span className="text-slate-100 text-xs font-bold">{item.totalQty}</span>
                      </div>
                      <div className="border-x border-slate-800">
                        <span className="text-emerald-400 block font-medium">พร้อมยืม</span>
                        <span className="text-emerald-500 text-xs font-bold">{item.availableQty}</span>
                      </div>
                      <div>
                        <span className="text-amber-400 block font-medium">ถูกยืมไป</span>
                        <span className="text-amber-500 text-xs font-bold">{item.borrowedQty}</span>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => addToGlasswareCart(item)}
                    disabled={item.availableQty === 0}
                    className={`w-full py-2.5 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                      item.availableQty > 0
                        ? 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-md shadow-emerald-500/5 hover:shadow-emerald-500/10'
                        : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                    }`}
                    id={`add-glassware-cart-${item.id}`}
                  >
                    <Plus className="w-3.5 h-3.5" />
                    ใส่ตะกร้าเตรียมยืม
                  </button>
                </div>
              </motion.div>
            ))}

            {/* แท็บที่ 3: คลังสารเคมี */}
            {activeTab === 'chemicals' && getFilteredChemicals().map((item) => {
              const warnings = getChemicalWarnings(item);
              return (
                <motion.div
                  key={item.id}
                  layout
                  className="bg-slate-900 rounded-3xl border border-slate-800 shadow-sm overflow-hidden flex flex-col group hover:border-emerald-500/30 hover:shadow-lg transition-all"
                  id={`chemical-card-${item.id}`}
                >
                  <div className="aspect-video relative overflow-hidden bg-slate-800">
                    <img 
                      src={item.picture || undefined} 
                      alt={item.name} 
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      referrerPolicy="no-referrer"
                    />
                    {/* ป้ายเตือนต่าง ๆ */}
                    <div className="absolute top-3 left-3 flex flex-col gap-1">
                      {warnings.map((w, idx) => (
                        <span 
                          key={idx} 
                          className={`px-2.5 py-1 rounded-full text-[9px] font-bold flex items-center gap-1 shadow-md ${
                            w.type === 'expired' 
                              ? 'bg-rose-600 text-white' 
                              : 'bg-amber-500 text-slate-950'
                          }`}
                        >
                          <AlertTriangle className="w-3 h-3" />
                          {w.text}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                    <div className="space-y-1.5">
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] font-mono font-bold text-slate-500 uppercase">{item.id}</span>
                        <span className="text-[10px] text-slate-400 font-medium">วันหมดอายุ: {item.expiryDate}</span>
                      </div>
                      <h3 className="font-bold text-slate-100 text-sm tracking-tight leading-tight">{item.name}</h3>
                      <p className="text-xs text-slate-400 leading-relaxed font-medium">{item.details}</p>
                      
                      <div className="flex items-center justify-between bg-slate-950 px-3 py-2.5 rounded-2xl text-[11px] font-bold border border-slate-800 mt-2">
                        <span className="text-slate-500 font-medium">คงเหลือคลัง:</span>
                        <span className={`text-sm ${item.qty <= item.minQty ? 'text-rose-600' : 'text-emerald-500'}`}>
                          {item.qty} {item.unit}
                        </span>
                      </div>
                    </div>

                    <button
                      onClick={() => addToChemicalCart(item)}
                      disabled={item.qty <= 0}
                      className={`w-full py-2.5 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                        item.qty > 0
                          ? 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-md shadow-emerald-500/5 hover:shadow-emerald-500/10'
                          : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                      }`}
                      id={`add-chemical-cart-${item.id}`}
                    >
                      <Plus className="w-3.5 h-3.5" />
                      ใส่ตะกร้ายืม / เบิก
                    </button>
                  </div>
                </motion.div>
              );
            })}

          </div>
        )}

        {/* แจ้งหากไม่พบข้อมูลผลลัพธ์ */}
        {!isLoading && (
          (activeTab === 'instruments' && getFilteredInstruments().length === 0) ||
          (activeTab === 'glassware' && getFilteredGlassware().length === 0) ||
          (activeTab === 'chemicals' && getFilteredChemicals().length === 0)
        ) && (
          <div className="text-center py-20 bg-slate-900 rounded-3xl border border-slate-800 p-8 space-y-2">
            <Info className="w-8 h-8 text-slate-500 mx-auto" />
            <h4 className="font-bold text-slate-300 text-sm">ไม่พบเครื่องมือ อุปกรณ์ หรือสารเคมีที่คุณค้นหา</h4>
            <p className="text-xs text-slate-500">โปรดตรวจสอบคำสะกด หรือพิมพ์ค้นหาใหม่อีกครั้ง</p>
          </div>
        )}

      </div>

      {/* --- 4. หน้าต่างจองเครื่องมือวิทยาศาสตร์ (Booking Modal) --- */}
      <AnimatePresence>
        {selectedInstrument && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-[2px] flex items-center justify-center z-50 p-4" id="booking-modal-overlay">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="bg-slate-900 w-full max-w-md rounded-3xl overflow-hidden shadow-2xl border border-slate-800 flex flex-col text-slate-100 text-left"
              id="booking-modal"
            >
              {/* หัวข้อโมดอลพื้นหลังเข้ม */}
              <div className="bg-slate-950 text-white px-6 py-5 border-b border-slate-800">
                <span className="text-[10px] font-mono text-emerald-400 font-bold uppercase tracking-wider">{selectedInstrument.id}</span>
                <h3 className="text-base font-bold mt-1 tracking-tight">ฟอร์มจองใช้งานเครื่องมือ</h3>
                <p className="text-xs text-slate-400 font-medium mt-0.5">{selectedInstrument.name} ({selectedInstrument.brand})</p>
              </div>

              <form onSubmit={handleBookingSubmit} className="p-6 space-y-4">
                {selectedInstrument.rule && (
                  <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-2xl text-[11px] text-amber-400 leading-relaxed font-semibold flex gap-2">
                    <AlertTriangle className="w-4 h-4 shrink-0 text-amber-500" />
                    <span><strong>กฎระเบียบแลป:</strong> {selectedInstrument.rule}</span>
                  </div>
                )}

                {/* ตารางเวลาการจองปัจจุบัน */}
                <div className="p-3 bg-slate-950 border border-slate-800 rounded-2xl space-y-2">
                  <div className="text-xs font-bold text-slate-300 flex items-center justify-between border-b border-slate-800 pb-1.5">
                    <span className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-emerald-400" />
                      ตารางเวลาที่มีผู้จองไว้แล้ว
                    </span>
                    <span className="text-[10px] text-slate-500 font-mono">
                      ({instrumentBookings.length} คิว)
                    </span>
                  </div>
                  {instrumentBookings.length === 0 ? (
                    <p className="text-[11px] text-slate-500 italic text-center py-1">ยังไม่มีคิวจองในระบบ สามารถจองได้ทุกช่วงเวลา</p>
                  ) : (
                    <div className="max-h-28 overflow-y-auto space-y-1.5 pr-1 font-mono text-[11px]">
                      {instrumentBookings.map((b) => {
                        const start = new Date(b.startDate);
                        const end = b.endDate ? new Date(b.endDate) : null;
                        
                        // ฟอร์แมต วันที่ (เช่น 02/07/2026) และ เวลา (เช่น 14:00 - 16:00)
                        const dateStr = start.toLocaleDateString('th-TH', { day: '2-digit', month: '2-digit', year: 'numeric' });
                        const timeStr = `${start.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit', hour12: false })} - ${end ? end.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit', hour12: false }) : 'ไม่ระบุ'}`;
                        
                        return (
                          <div key={b.id} className="flex justify-between items-center bg-slate-900 px-2 py-1.5 rounded-lg border border-slate-800/60">
                            <span className="text-slate-300 font-medium">{dateStr}</span>
                            <div className="flex items-center gap-2">
                              <span className="text-emerald-400 font-bold">{timeStr}</span>
                              <span className={`text-[9px] px-1.5 py-0.5 rounded ${
                                b.status === 'Approved' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-400'
                              }`}>
                                {b.status === 'Approved' ? 'อนุมัติแล้ว' : 'รออนุมัติ'}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* เลือกวันที่ */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-emerald-400" />
                    วันที่เข้าใช้งานห้องแลป
                  </label>
                  <input
                    type="date"
                    required
                    min={new Date().toISOString().split('T')[0]}
                    value={bookingForm.date}
                    onChange={(e) => setBookingForm(prev => ({ ...prev, date: e.target.value }))}
                    className="w-full text-xs px-3 py-2.5 bg-slate-950 border border-slate-800 text-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all text-left"
                    id="booking-date-picker"
                  />
                </div>

                {/* เลือกเวลา */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-emerald-400" />
                      เวลาเริ่มต้น
                    </label>
                    <input
                      type="time"
                      required
                      value={bookingForm.startTime}
                      onChange={(e) => setBookingForm(prev => ({ ...prev, startTime: e.target.value }))}
                      className="w-full text-xs px-3 py-2.5 bg-slate-950 border border-slate-800 text-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all font-mono text-left"
                      id="booking-start-time"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-emerald-400" />
                      เวลาสิ้นสุด
                    </label>
                    <input
                      type="time"
                      required
                      value={bookingForm.endTime}
                      onChange={(e) => setBookingForm(prev => ({ ...prev, endTime: e.target.value }))}
                      className="w-full text-xs px-3 py-2.5 bg-slate-950 border border-slate-800 text-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all font-mono text-left"
                      id="booking-end-time"
                    />
                  </div>
                </div>

                {/* วัตถุประสงค์การใช้งาน */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-300 block">หมายเหตุ / วัตถุประสงค์การจองใช้เครื่อง</label>
                  <textarea
                    required
                    placeholder="กรุณาระบุวัตถุประสงค์การใช้งานและชื่อกลุ่มวิจัยหรือหัวข้อการทดลองอย่างชัดเจน"
                    rows={3}
                    value={bookingForm.purpose}
                    onChange={(e) => setBookingForm(prev => ({ ...prev, purpose: e.target.value }))}
                    className="w-full text-xs p-3 bg-slate-950 border border-slate-800 text-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all resize-none placeholder-slate-600 text-left"
                    id="booking-purpose-input"
                  />
                </div>

                <div className="flex gap-3 pt-3">
                  <button
                    type="button"
                    onClick={() => setSelectedInstrument(null)}
                    className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-750 text-slate-300 font-bold rounded-xl text-xs transition-all cursor-pointer"
                    id="booking-cancel-btn"
                  >
                    ยกเลิก
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl text-xs transition-all shadow-md flex items-center justify-center gap-1.5 cursor-pointer"
                    id="booking-submit-btn"
                  >
                    <Check className="w-3.5 h-3.5" />
                    ยืนยันคำขอจอง
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* --- 5. เมนูบานเลื่อนตะกร้าสินค้าสำหรับ เครื่องแก้ว และสารเคมี (Cart Drawer) --- */}
      <AnimatePresence>
        {isCartOpen && (
          <div className="fixed inset-0 z-50 overflow-hidden" id="cart-drawer-overlay">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px] transition-opacity" onClick={() => setIsCartOpen(false)} />
            
            <div className="absolute inset-y-0 right-0 max-w-full flex pl-10">
              <motion.div
                initial={{ x: '100%' }}
                animate={{ x: 0 }}
                exit={{ x: '100%' }}
                transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                className="w-screen max-w-md bg-slate-900 border-l border-slate-800 shadow-2xl flex flex-col justify-between text-slate-100 text-left"
                id="cart-drawer"
              >
                {/* หัวข้อตะกร้า */}
                <div className="px-6 py-5 bg-slate-950 text-white flex items-center justify-between border-b border-slate-800">
                  <h3 className="font-bold text-base flex items-center gap-2">
                    <ShoppingCart className="w-5 h-5 text-emerald-400" />
                    ตะกร้าคำขอวัสดุวิทยาศาสตร์
                  </h3>
                  <button 
                    onClick={() => setIsCartOpen(false)}
                    className="text-slate-400 hover:text-white text-xs font-bold transition-colors cursor-pointer"
                  >
                    ปิดเมนู
                  </button>
                </div>

                {/* รายการสิ่งของในตะกร้า (แยกประเภท) */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                  
                  {/* ยืดส่วนตะกร้าเครื่องแก้ว */}
                  {glasswareCart.length > 0 && (
                    <div className="space-y-3">
                      <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1 border-b border-slate-800 pb-1.5">
                        <Beaker className="w-3.5 h-3.5 text-emerald-400" />
                        กลุ่มเครื่องแก้วแลป ({glasswareCart.length} รายการ)
                      </h4>
                      <div className="space-y-3">
                        {glasswareCart.map((item) => (
                          <div key={item.id} className="flex items-center justify-between p-3 bg-slate-950 rounded-2xl border border-slate-800">
                            <div>
                              <span className="text-[9px] font-mono font-bold text-slate-500 block">{item.id}</span>
                              <h5 className="text-xs font-bold text-slate-200">{item.name}</h5>
                            </div>
                            <div className="flex items-center gap-3">
                              <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-800 rounded-lg p-0.5">
                                <button 
                                  onClick={() => updateGlasswareCartQty(item.id, -1)}
                                  className="p-1 hover:bg-slate-800 rounded text-slate-400 cursor-pointer"
                                >
                                  <Minus className="w-3 h-3" />
                                </button>
                                <span className="w-6 text-center text-xs font-bold font-mono text-slate-100">{item.quantity}</span>
                                <button 
                                  onClick={() => updateGlasswareCartQty(item.id, 1)}
                                  className="p-1 hover:bg-slate-800 rounded text-slate-400 cursor-pointer"
                                >
                                  <Plus className="w-3 h-3" />
                                </button>
                              </div>
                              <button 
                                onClick={() => removeFromGlasswareCart(item.id)}
                                className="p-1.5 text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* ยืดส่วนตะกร้าสารเคมี */}
                  {chemicalCart.length > 0 && (
                    <div className="space-y-3">
                      <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1 border-b border-slate-800 pb-1.5">
                        <Tag className="w-3.5 h-3.5 text-emerald-400" />
                        กลุ่มสารเคมีวิทยาศาสตร์ ({chemicalCart.length} รายการ)
                      </h4>
                      <div className="space-y-3">
                        {chemicalCart.map((item) => (
                          <div key={item.id} className="flex items-center justify-between p-3 bg-slate-950 rounded-2xl border border-slate-800">
                            <div>
                              <span className="text-[9px] font-mono font-bold text-slate-500 block">{item.id}</span>
                              <h5 className="text-xs font-bold text-slate-200">{item.name}</h5>
                            </div>
                            <div className="flex items-center gap-3">
                              <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-800 rounded-lg p-0.5">
                                <button 
                                  onClick={() => updateChemicalCartQty(item.id, -1, item.unit)}
                                  className="p-1 hover:bg-slate-800 rounded text-slate-400 cursor-pointer"
                                >
                                  <Minus className="w-3 h-3" />
                                </button>
                                <span className="w-12 text-center text-xs font-bold font-mono text-slate-100">
                                  {item.quantity} <span className="text-[10px] text-slate-500 font-normal">{item.unit}</span>
                                </span>
                                <button 
                                  onClick={() => updateChemicalCartQty(item.id, 1, item.unit)}
                                  className="p-1 hover:bg-slate-800 rounded text-slate-400 cursor-pointer"
                                >
                                  <Plus className="w-3 h-3" />
                                </button>
                              </div>
                              <button 
                                onClick={() => removeFromChemicalCart(item.id)}
                                className="p-1.5 text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {glasswareCart.length === 0 && chemicalCart.length === 0 && (
                    <div className="text-center py-24 space-y-2">
                      <ShoppingCart className="w-8 h-8 text-slate-600 mx-auto" />
                      <h5 className="text-xs font-bold text-slate-400">ไม่มีอุปกรณ์ในตะกร้าของคุณ</h5>
                      <p className="text-[11px] text-slate-500">กรุณาเลือกปุ่ม "ใส่ตะกร้า" ในแท็บเครื่องแก้วหรือสารเคมี</p>
                    </div>
                  )}

                  {/* ส่วนฟอร์มส่งข้อมูลหากมีของในตะกร้า */}
                  {(glasswareCart.length > 0 || chemicalCart.length > 0) && (
                    <div className="border-t border-slate-800 pt-5 space-y-4">
                      <h4 className="text-xs font-bold text-slate-300">ระบุรายละเอียดสัญญาและส่งคำขอ</h4>
                      
                      {/* หากมีสารเคมีในตะกร้า ต้องสลับประเภทการขอ ยืม หรือ เบิก */}
                      {chemicalCart.length > 0 && (
                        <div className="space-y-1">
                          <label className="text-xs font-bold text-slate-400 block">ประเภทธุรกรรมสารเคมี</label>
                          <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800">
                            <button
                              type="button"
                              onClick={() => setCartCheckoutForm(p => ({ ...p, actionType: 'borrow' }))}
                              className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                                cartCheckoutForm.actionType === 'borrow' ? 'bg-slate-800 text-emerald-400 shadow-sm' : 'text-slate-500'
                              }`}
                            >
                              ยืมสารเคมี (คืนบรรจุภัณฑ์)
                            </button>
                            <button
                              type="button"
                              onClick={() => setCartCheckoutForm(p => ({ ...p, actionType: 'withdraw' }))}
                              className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                                cartCheckoutForm.actionType === 'withdraw' ? 'bg-slate-800 text-emerald-400 shadow-sm' : 'text-slate-500'
                              }`}
                            >
                              เบิกใช้หมด (ไม่ต้องส่งคืน)
                            </button>
                          </div>
                        </div>
                      )}

                      {/* วันที่เวลารับสิ่งของ */}
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-300 flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5 text-emerald-400" />
                          วันที่และเวลาเข้ามารับอุปกรณ์วิทยาศาสตร์
                        </label>
                        <div className="grid grid-cols-2 gap-2">
                          <input
                            type="date"
                            required
                            min={new Date().toISOString().split('T')[0]}
                            value={cartCheckoutForm.startDate}
                            onChange={(e) => setCartCheckoutForm(prev => ({ ...prev, startDate: e.target.value }))}
                            className="w-full text-xs px-3 py-2 bg-slate-950 border border-slate-800 text-slate-200 rounded-xl"
                          />
                          <input
                            type="time"
                            required
                            value={cartCheckoutForm.startTime}
                            onChange={(e) => setCartCheckoutForm(prev => ({ ...prev, startTime: e.target.value }))}
                            className="w-full text-xs px-3 py-2 bg-slate-950 border border-slate-800 text-slate-200 rounded-xl font-mono"
                          />
                        </div>
                      </div>

                      {/* วันกำหนดส่งคืน (ต้องมีถ้ามีเครื่องแก้ว หรือตั้งค่าสารเคมีเป็น "ยืม") */}
                      {(glasswareCart.length > 0 || (chemicalCart.length > 0 && cartCheckoutForm.actionType === 'borrow')) && (
                        <div className="space-y-2">
                          <label className="text-xs font-bold text-slate-300 flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5 text-emerald-400" />
                            กำหนดวันที่และเวลาที่จะส่งของคืนคลัง
                          </label>
                          <div className="grid grid-cols-2 gap-2">
                            <input
                              type="date"
                              required
                              min={cartCheckoutForm.startDate || new Date().toISOString().split('T')[0]}
                              value={cartCheckoutForm.endDate}
                              onChange={(e) => setCartCheckoutForm(prev => ({ ...prev, endDate: e.target.value }))}
                              className="w-full text-xs px-3 py-2 bg-slate-950 border border-slate-800 text-slate-200 rounded-xl"
                            />
                            <input
                              type="time"
                              required
                              value={cartCheckoutForm.endTime}
                              onChange={(e) => setCartCheckoutForm(prev => ({ ...prev, endTime: e.target.value }))}
                              className="w-full text-xs px-3 py-2 bg-slate-950 border border-slate-800 text-slate-200 rounded-xl font-mono"
                            />
                          </div>
                        </div>
                      )}

                      {/* วัตถุประสงค์การยืม */}
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-300 block">หมายเหตุ / วัตถุประสงค์การนำไปใช้ประโยชน์</label>
                        <textarea
                          required
                          placeholder="กรุณาระบุวัตถุประสงค์หรือวิชาที่ใช้สั้นๆ"
                          rows={2.5}
                          value={cartCheckoutForm.purpose}
                          onChange={(e) => setCartCheckoutForm(prev => ({ ...prev, purpose: e.target.value }))}
                          className="w-full text-xs p-3 bg-slate-950 border border-slate-800 text-slate-200 rounded-xl resize-none placeholder-slate-700"
                        />
                      </div>
                    </div>
                  )}

                </div>

                {/* บาร์ปุ่มตกลงด้านล่างบานเลื่อน */}
                {(glasswareCart.length > 0 || chemicalCart.length > 0) && (
                  <div className="p-6 border-t border-slate-800 bg-slate-950">
                    <button
                      onClick={glasswareCart.length > 0 ? handleGlasswareCheckout : handleChemicalCheckout}
                      className="w-full py-3 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl text-xs transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
                      id="cart-submit-btn"
                    >
                      <span>ส่งคำขอจองวัสดุทั้งหมดในตะกร้า</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                )}

              </motion.div>
            </div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
