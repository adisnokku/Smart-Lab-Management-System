/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { labApi } from '../services/api';
import { User, UserRole } from '../types';
import { ShieldCheck, Mail, Phone, User as UserIcon, BookOpen, UserCheck, Key, GraduationCap, ArrowRight, LogIn, Settings } from 'lucide-react';

interface LoginProps {
  onLoginSuccess: (user: User) => void;
}

export default function Login({ onLoginSuccess }: LoginProps) {
  const [email, setEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [passwordRequired, setPasswordRequired] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [pendingStatus, setPendingStatus] = useState<string | null>(null);
  
  // สถานะโหมดออนไลน์และการจัดการเซิร์ฟเวอร์
  const [isOnline, setIsOnline] = useState(labApi.isOnlineMode());
  const [showSettings, setShowSettings] = useState(false);
  const [tempUrl, setTempUrl] = useState(labApi.getAppsScriptUrl());
  
  // สถานะเกี่ยวกับการลงทะเบียนใหม่
  const [showRegister, setShowRegister] = useState(false);
  const [registerRole, setRegisterRole] = useState<'Student' | 'Teacher'>('Student');
  const [regForm, setRegForm] = useState({
    name: '',
    phone: '',
    studentId: '',
    advisor: '',
    major: '',
    department: '',
    password: ''
  });

  // รายชื่ออาจารย์ที่ปรึกษาที่ดึงจากชีท/ฐานข้อมูล
  const [advisorList, setAdvisorList] = useState<string[]>([]);

  // ดึงข้อมูลอาจารย์เมื่อผู้ใช้เปิดฟอร์มลงทะเบียน
  useEffect(() => {
    if (showRegister) {
      const loadAdvisors = async () => {
        try {
          const list = await labApi.getAdvisors();
          setAdvisorList(list);
          if (list.length > 0 && !regForm.advisor) {
            setRegForm(prev => ({ ...prev, advisor: list[0] }));
          }
        } catch (err) {
          console.error('Failed to load advisors:', err);
        }
      };
      loadAdvisors();
    }
  }, [showRegister]);

  // ฟังก์ชันสลับบทบาทตอนลงทะเบียน
  const handleRoleChange = (role: 'Student' | 'Teacher') => {
    setRegisterRole(role);
    // รีเซ็ตค่าเฉพาะบางฟิลด์
    setRegForm(prev => ({
      ...prev,
      studentId: '',
      advisor: role === 'Student' && advisorList.length > 0 ? advisorList[0] : '',
      major: '',
      department: '',
      password: ''
    }));
  };

  // ตรวจสอบอีเมลเมื่อยื่นคำขอเข้าสู่ระบบ
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setPendingStatus(null);
    setIsLoading(true);

    try {
      const res = await labApi.login(email, passwordRequired ? loginPassword : undefined);
      if (res.success && res.user) {
        onLoginSuccess(res.user);
      } else if (res.requiresPassword) {
        setPasswordRequired(true);
        setErrorMsg(res.message);
      } else if (res.requiresRegister) {
        // หากไม่พบอีเมลในระบบ ให้เปิดฟอร์มลงทะเบียนโดยอัตโนมัติ
        setShowRegister(true);
        setErrorMsg(res.message);
      } else {
        // กรณีพบผู้ใช้แต่สถานะเป็น Pending หรือ Banned
        if (res.status === 'Pending') {
          setPendingStatus('Pending');
        } else if (res.status === 'Banned') {
          setPendingStatus('Banned');
        } else {
          setErrorMsg(res.message);
        }
      }
    } catch (err: any) {
      setErrorMsg('เกิดข้อผิดพลาดในการเชื่อมต่อระบบฐานข้อมูล กรุณาลองใหม่อีกครั้ง');
    } finally {
      setIsLoading(false);
    }
  };

  // ส่งแบบฟอร์มลงทะเบียนใหม่
  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    
    if (!regForm.name || !regForm.phone) {
      setErrorMsg('กรุณากรอกข้อมูลพื้นฐานให้ครบถ้วน');
      return;
    }

    if (registerRole === 'Student') {
      if (!regForm.studentId || !regForm.advisor || !regForm.major) {
        setErrorMsg('กรุณากรอกข้อมูลด้านการศึกษาสำหรับนักศึกษาให้ครบถ้วน');
        return;
      }
    } else {
      if (!regForm.department || !regForm.password) {
        setErrorMsg('กรุณากรอกข้อมูลภาควิชาและรหัสผ่านสำหรับอาจารย์ให้ครบถ้วน');
        return;
      }
    }

    setIsLoading(true);
    try {
      const userPayload: Omit<User, 'createdAt' | 'status'> = {
        email: email.toLowerCase().trim(),
        name: regForm.name,
        role: registerRole,
        phone: regForm.phone,
        ...(registerRole === 'Student' ? {
          studentId: regForm.studentId,
          advisor: regForm.advisor,
          major: regForm.major
        } : {
          department: regForm.department,
          password: regForm.password
        })
      };

      const res = await labApi.register(userPayload);
      if (res.success) {
        // ลงทะเบียนเรียบร้อย แจ้งเตือนเพื่อให้รอการอนุมัติ
        setPendingStatus('Pending');
        setShowRegister(false);
        // ล้างฟอร์ม
        setRegForm({
          name: '',
          phone: '',
          studentId: '',
          advisor: '',
          major: '',
          department: '',
          password: ''
        });
      } else {
        setErrorMsg(res.message);
      }
    } catch (err) {
      setErrorMsg('ไม่สามารถลงทะเบียนได้ในขณะนี้ กรุณาติดต่อผู้รับผิดชอบแลป');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 py-12 px-4 sm:px-6 lg:px-8" id="login-container">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="max-w-md w-full bg-slate-900 rounded-3xl border border-slate-800 shadow-xl overflow-hidden"
      >
        {/* หัวข้อส่วนบน */}
        <div className="bg-slate-950 px-8 py-10 text-white text-center relative overflow-hidden border-b border-slate-800">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(16,185,129,0.15),transparent_70%)]" />
          <motion.div 
            initial={{ scale: 0.8 }}
            animate={{ scale: 1 }}
            className="inline-flex items-center justify-center p-3.5 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl mb-4"
          >
            <ShieldCheck className="w-8 h-8 text-emerald-400" />
          </motion.div>
          <h1 className="text-2xl font-bold tracking-tight">Smart Lab KKU</h1>
          <p className="text-emerald-400 text-[10px] mt-1 font-medium tracking-widest uppercase">ระบบบริหารจัดการห้องแลปอัจฉริยะ</p>
        </div>

        <div className="px-8 py-8">
          <AnimatePresence mode="wait">
            
            {/* 1. หน้าล็อกอินหลัก */}
            {!showRegister && !pendingStatus && (
              <motion.div
                key="login-view"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                className="space-y-6"
              >
                <div className="text-center">
                  <h2 className="text-lg font-bold text-slate-100">เข้าสู่ระบบใช้งานห้องปฏิบัติการ</h2>
                  <p className="text-xs text-slate-400 mt-1">กรุณาระบุอีเมลของมหาวิทยาลัยขอนแก่น เพื่อตรวจสอบสิทธิ์</p>
                </div>

                {errorMsg && (
                  <div className="space-y-3">
                    <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-400 text-xs text-center font-medium leading-relaxed">
                      {errorMsg}
                    </div>
                  </div>
                )}

                <form onSubmit={handleLoginSubmit} className="space-y-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-400 block">อีเมลมหาวิทยาลัยขอนแก่น</label>
                    <div className="relative">
                      <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-3.5" />
                      <input
                        type="email"
                        required
                        value={email}
                        onChange={(e) => {
                          setEmail(e.target.value);
                          setPasswordRequired(false);
                          setLoginPassword('');
                        }}
                        placeholder="example@kku.ac.th หรือ @kkumail.com"
                        className="w-full text-sm pl-10 pr-4 py-3 bg-slate-950 border border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-slate-200 transition-all font-mono placeholder-slate-600"
                        id="login-email-input"
                      />
                    </div>
                  </div>

                  {passwordRequired && (
                    <motion.div 
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="space-y-1"
                    >
                      <label className="text-xs font-bold text-slate-400 block">รหัสผ่านบัญชีผู้ใช้</label>
                      <div className="relative">
                        <Key className="w-4 h-4 text-slate-500 absolute left-3 top-3.5" />
                        <input
                          type="password"
                          required
                          value={loginPassword}
                          onChange={(e) => setLoginPassword(e.target.value)}
                          placeholder="กรอกรหัสผ่าน (แอดมินจำลองใช้: admin123)"
                          className="w-full text-sm pl-10 pr-4 py-3 bg-slate-950 border border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-slate-200 transition-all placeholder-slate-600"
                          id="login-password-input"
                        />
                      </div>
                    </motion.div>
                  )}

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full py-3 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl text-sm transition-all shadow-md hover:shadow-lg active:scale-[0.98] flex items-center justify-center gap-2 cursor-pointer"
                    id="login-submit-btn"
                  >
                    {isLoading ? (
                      <div className="w-5 h-5 border-2 border-slate-950/30 border-t-slate-950 rounded-full animate-spin" />
                    ) : (
                      <>
                        {passwordRequired ? 'เข้าสู่ระบบด้วยรหัสผ่าน' : 'ตรวจสอบสิทธิ์การใช้งาน'}
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </form>

                <div className="text-center pt-2">
                  <span className="text-[11px] text-slate-500">ระบบจำลองการล็อกอินอัตโนมัติ สำหรับสิทธิ์แอดมินใช้: adisno@kku.ac.th</span>
                </div>
              </motion.div>
            )}

            {/* 2. หน้าแสดงสถานะ รออนุมัติ หรือ ถูกแบน */}
            {pendingStatus && (
              <motion.div
                key="status-view"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                className="text-center space-y-5 py-4"
              >
                {pendingStatus === 'Pending' ? (
                  <>
                    <div className="mx-auto w-16 h-16 bg-amber-500/10 rounded-full flex items-center justify-center border border-amber-500/20">
                      <UserCheck className="w-8 h-8 text-amber-400" />
                    </div>
                    <div className="space-y-2">
                      <h3 className="text-lg font-bold text-slate-100">ส่งข้อมูลลงทะเบียนแล้ว</h3>
                      <p className="text-sm text-slate-400 leading-relaxed max-w-sm mx-auto">
                        บัญชีอีเมล <strong className="font-mono text-emerald-400">{email}</strong> อยู่ระหว่างขั้นตอนรออนุมัติเปิดสิทธิ์ใช้งานจากแอดมินห้องปฏิบัติการ
                      </p>
                      <div className="inline-block px-3 py-1 bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded-full text-xs font-bold uppercase tracking-wide">
                        สถานะปัจจุบัน: Pending (รอการอนุมัติ)
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="mx-auto w-16 h-16 bg-rose-500/10 rounded-full flex items-center justify-center border border-rose-500/20">
                      <ShieldCheck className="w-8 h-8 text-rose-400" />
                    </div>
                    <div className="space-y-2">
                      <h3 className="text-lg font-bold text-slate-100">บัญชีถูกระงับชั่วคราว</h3>
                      <p className="text-sm text-slate-400 leading-relaxed max-w-sm mx-auto">
                        สิทธิ์การใช้งานของอีเมล <strong className="font-mono text-rose-400">{email}</strong> ถูกจำกัดสิทธิ์ชั่วคราวโดยแอดมินห้องแลป เนื่องจากทำผิดระเบียบปฏิบัติหรือพ้นสภาพ
                      </p>
                      <div className="inline-block px-3 py-1 bg-rose-500/10 text-rose-400 border border-rose-500/20 rounded-full text-xs font-bold uppercase tracking-wide">
                        สถานะปัจจุบัน: Banned (ระงับชั่วคราว)
                      </div>
                    </div>
                  </>
                )}

                <button
                  onClick={() => {
                    setPendingStatus(null);
                    setShowRegister(false);
                    setErrorMsg('');
                  }}
                  className="mt-4 px-5 py-2.5 bg-slate-800 hover:bg-slate-750 text-slate-200 text-xs font-bold rounded-xl transition-all cursor-pointer"
                  id="status-back-btn"
                >
                  ย้อนกลับหน้าแรก
                </button>
              </motion.div>
            )}

            {/* 3. หน้าลงทะเบียนเข้าใช้งานครั้งแรก */}
            {showRegister && !pendingStatus && (
              <motion.div
                key="register-view"
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                className="space-y-5"
              >
                <div className="text-center">
                  <h2 className="text-lg font-bold text-slate-100">ฟอร์มลงทะเบียนเข้าใช้งานครั้งแรก</h2>
                  <p className="text-xs text-slate-400 mt-1">อีเมล มข.: <span className="font-mono text-emerald-400 font-semibold">{email}</span></p>
                </div>

                {/* ปุ่มสลับสิทธิ์การลงทะเบียน นักศึกษา / อาจารย์ */}
                <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800">
                  <button
                    type="button"
                    onClick={() => handleRoleChange('Student')}
                    className={`flex-1 py-2.5 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                      registerRole === 'Student' ? 'bg-slate-800 text-emerald-400 shadow-sm' : 'text-slate-500 hover:text-slate-400'
                    }`}
                    id="register-student-tab"
                  >
                    <GraduationCap className="w-4 h-4" />
                    นักศึกษา
                  </button>
                  <button
                    type="button"
                    onClick={() => handleRoleChange('Teacher')}
                    className={`flex-1 py-2.5 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                      registerRole === 'Teacher' ? 'bg-slate-800 text-emerald-400 shadow-sm' : 'text-slate-500 hover:text-slate-400'
                    }`}
                    id="register-teacher-tab"
                  >
                    <UserIcon className="w-4 h-4" />
                    อาจารย์
                  </button>
                </div>

                {errorMsg && (
                  <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-amber-400 text-xs text-center font-medium">
                    {errorMsg}
                  </div>
                )}

                <form onSubmit={handleRegisterSubmit} className="space-y-3.5">
                  {/* ช่องข้อมูลพื้นฐานที่ต้องมีเหมือนกัน */}
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-400 block">ชื่อ - นามสกุล</label>
                    <div className="relative">
                      <UserIcon className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                      <input
                        type="text"
                        required
                        placeholder="กรอกชื่อจริงและนามสกุล"
                        value={regForm.name}
                        onChange={(e) => setRegForm(prev => ({ ...prev, name: e.target.value }))}
                        className="w-full text-xs pl-9 pr-4 py-2.5 bg-slate-950 border border-slate-800 text-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all placeholder-slate-600"
                        id="reg-name-input"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-400 block">เบอร์โทรศัพท์ติดต่อ</label>
                    <div className="relative">
                      <Phone className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                      <input
                        type="tel"
                        required
                        placeholder="ตัวอย่าง 089-XXXXXXX"
                        value={regForm.phone}
                        onChange={(e) => setRegForm(prev => ({ ...prev, phone: e.target.value }))}
                        className="w-full text-xs pl-9 pr-4 py-2.5 bg-slate-950 border border-slate-800 text-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all font-mono placeholder-slate-600"
                        id="reg-phone-input"
                      />
                    </div>
                  </div>

                  {/* 3.1 ฟอร์มย่อยเฉพาะ นักศึกษา */}
                  {registerRole === 'Student' && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      className="space-y-3.5"
                    >
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <label className="text-xs font-bold text-slate-400 block">รหัสนักศึกษา</label>
                          <input
                            type="text"
                            required
                            placeholder="653020XXX-X"
                            value={regForm.studentId}
                            onChange={(e) => setRegForm(prev => ({ ...prev, studentId: e.target.value }))}
                            className="w-full text-xs px-4 py-2.5 bg-slate-950 border border-slate-800 text-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all font-mono placeholder-slate-600"
                            id="reg-studentid-input"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-xs font-bold text-slate-400 block">สาขาวิชา</label>
                          <input
                            type="text"
                            required
                            placeholder="เช่น เคมีอนินทรีย์"
                            value={regForm.major}
                            onChange={(e) => setRegForm(prev => ({ ...prev, major: e.target.value }))}
                            className="w-full text-xs px-4 py-2.5 bg-slate-950 border border-slate-800 text-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all placeholder-slate-600"
                            id="reg-major-input"
                          />
                        </div>
                      </div>

                      <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-400 block">อาจารย์ที่ปรึกษา / อาจารย์ผู้คุมวิจัย</label>
                        <div className="relative">
                          <BookOpen className="w-4 h-4 text-slate-500 absolute left-3 top-3 pointer-events-none z-10" />
                          <select
                            required
                            value={regForm.advisor}
                            onChange={(e) => setRegForm(prev => ({ ...prev, advisor: e.target.value }))}
                            className="w-full text-xs pl-9 pr-10 py-2.5 bg-slate-950 border border-slate-800 text-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all appearance-none cursor-pointer"
                            id="reg-advisor-input"
                          >
                            {advisorList.length === 0 ? (
                              <option value="" disabled>กำลังโหลดรายชื่ออาจารย์...</option>
                            ) : (
                              advisorList.map((adv) => (
                                <option key={adv} value={adv} className="bg-slate-950 text-slate-200">
                                  {adv}
                                </option>
                              ))
                            )}
                          </select>
                          <div className="absolute right-3 top-3 pointer-events-none text-slate-500">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                            </svg>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {/* 3.2 ฟอร์มย่อยเฉพาะ อาจารย์ */}
                  {registerRole === 'Teacher' && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      className="space-y-3.5"
                    >
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-400 block">ภาควิชา / สังกัด</label>
                        <input
                          type="text"
                          required
                          placeholder="เช่น สาขาวิชาเคมี คณะวิทยาศาสตร์"
                          value={regForm.department}
                          onChange={(e) => setRegForm(prev => ({ ...prev, department: e.target.value }))}
                          className="w-full text-xs px-4 py-2.5 bg-slate-950 border border-slate-800 text-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all placeholder-slate-600"
                          id="reg-dept-input"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-400 block">รหัสผ่านสำหรับการเข้าใช้งานเอง</label>
                        <div className="relative">
                          <Key className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                          <input
                            type="password"
                            required
                            placeholder="กำหนดรหัสผ่านเข้าใช้งาน"
                            value={regForm.password}
                            onChange={(e) => setRegForm(prev => ({ ...prev, password: e.target.value }))}
                            className="w-full text-xs pl-9 pr-4 py-2.5 bg-slate-950 border border-slate-800 text-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all placeholder-slate-600"
                            id="reg-pass-input"
                          />
                        </div>
                      </div>
                    </motion.div>
                  )}

                  <div className="flex gap-3 pt-3">
                    <button
                      type="button"
                      onClick={() => {
                        setShowRegister(false);
                        setErrorMsg('');
                      }}
                      className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-750 text-slate-300 font-bold rounded-xl text-xs transition-all cursor-pointer"
                      id="reg-cancel-btn"
                    >
                      ย้อนกลับ
                    </button>
                    <button
                      type="submit"
                      disabled={isLoading}
                      className="flex-1 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl text-xs transition-all shadow-md flex items-center justify-center gap-1.5 cursor-pointer"
                      id="reg-submit-btn"
                    >
                      {isLoading ? (
                        <div className="w-4 h-4 border-2 border-slate-950/30 border-t-slate-950 rounded-full animate-spin" />
                      ) : (
                        <>
                          <LogIn className="w-3.5 h-3.5" />
                          ส่งข้อมูลลงทะเบียน
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </motion.div>
            )}

          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
}
