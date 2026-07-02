/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { User } from './types';
import { labApi } from './services/api';
import Login from './components/Login';
import UserDashboard from './components/UserDashboard';
import UserHistory from './components/UserHistory';
import AdminDashboard from './components/AdminDashboard';
import { ShieldCheck, Database, HelpCircle } from 'lucide-react';

type ScreenState = 'login' | 'user_dashboard' | 'user_history' | 'admin_dashboard';

export default function App() {
  const [currentScreen, setCurrentScreen] = useState<ScreenState>('login');
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isApiOnline, setIsApiOnline] = useState(false);

  // ตรวจสอบเซสชันการล็อกอินและสถานะ API เมื่อแอปเริ่มทำงานครั้งแรก
  useEffect(() => {
    const savedUser = labApi.getCurrentUser();
    const online = labApi.isOnlineMode();
    setIsApiOnline(online);

    if (savedUser) {
      setCurrentUser(savedUser);
      if (savedUser.role === 'Admin') {
        setCurrentScreen('admin_dashboard');
      } else {
        setCurrentScreen('user_dashboard');
      }
    } else {
      setCurrentScreen('login');
    }
  }, []);

  // เมื่อผู้ใช้เข้าสู่ระบบสำเร็จ
  const handleLoginSuccess = (user: User) => {
    setCurrentUser(user);
    const online = labApi.isOnlineMode();
    setIsApiOnline(online);

    if (user.role === 'Admin') {
      setCurrentScreen('admin_dashboard');
    } else {
      setCurrentScreen('user_dashboard');
    }
  };

  // ออกจากระบบและล้างเซสชันทั้งหมด
  const handleLogout = () => {
    labApi.setCurrentUser(null);
    setCurrentUser(null);
    setCurrentScreen('login');
  };

  return (
    <div className="min-h-screen bg-slate-950 font-sans antialiased text-slate-100 flex flex-col justify-between" id="app-wrapper">

      {/* ส่วนเปลี่ยนหน้าด้วยอนิเมชันลื่นไหล (Fluid Route Transitions) */}
      <main className="flex-1">
        <AnimatePresence mode="wait">

          {currentScreen === 'login' && (
            <motion.div
              key="login-screen"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
            >
              <Login onLoginSuccess={handleLoginSuccess} />
            </motion.div>
          )}

          {currentScreen === 'user_dashboard' && currentUser && (
            <motion.div
              key="user-dashboard-screen"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
            >
              <UserDashboard 
                user={currentUser} 
                onLogout={handleLogout}
                onNavigateToHistory={() => setCurrentScreen('user_history')}
              />
            </motion.div>
          )}

          {currentScreen === 'user_history' && currentUser && (
            <motion.div
              key="user-history-screen"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
            >
              <UserHistory 
                userEmail={currentUser.email}
                onNavigateBack={() => setCurrentScreen('user_dashboard')}
              />
            </motion.div>
          )}

          {currentScreen === 'admin_dashboard' && currentUser && (
            <motion.div
              key="admin-dashboard-screen"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
            >
              <AdminDashboard 
                adminUser={currentUser} 
                onLogout={handleLogout}
              />
            </motion.div>
          )}

        </AnimatePresence>
      </main>

      {/* แถบสถานะระบบและการเชื่อมโยงข้อมูลขนาดเล็กบริเวณท้ายกระดาษ (System Footer Info) */}
      <footer className="py-5 bg-slate-950 border-t border-slate-900 text-center text-[11px] text-slate-500 font-medium">
        <div className="max-w-7xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p>© 2026 Smart Lab Management System • ภาควิชาเคมี มหาวิทยาลัยขอนแก่น (KKU)</p>
          
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5">
              <Database className="w-3.5 h-3.5 text-slate-600" />
              โหมดทำงาน: {isApiOnline ? (
                <span className="text-emerald-400 font-bold">เชื่อมต่อ Google Sheets แล้ว (Online)</span>
              ) : (
                <span className="text-blue-400 font-bold">โปรแกรมจำลองออฟไลน์ (Local Simulation)</span>
              )}
            </span>
            <span className="hidden sm:inline text-slate-800">|</span>
            <span className="flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              ระบบเข้ารหัส KKU Mail Auth 2.0
            </span>
          </div>
        </div>
      </footer>

    </div>
  );
}
