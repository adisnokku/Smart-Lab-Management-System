/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { LabRequest, RequestStatus } from '../types';
import { labApi } from '../services/api';
import { 
  ClipboardList, Calendar, Clock, AlertTriangle, CheckCircle, 
  XCircle, RotateCcw, AlertCircle, ArrowLeft, RefreshCw, Send, Check
} from 'lucide-react';

interface UserHistoryProps {
  userEmail: string;
  onNavigateBack: () => void;
}

export default function UserHistory({ userEmail, onNavigateBack }: UserHistoryProps) {
  const [requests, setRequests] = useState<LabRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  // โหลดรายการประวัติการจองของผู้ใช้
  const loadRequests = async () => {
    setIsLoading(true);
    try {
      const data = await labApi.getRequests(userEmail);
      setRequests(data);
    } catch (e) {
      console.error('Error loading requests history:', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadRequests();
  }, [userEmail]);

  // ฟังก์ชันแสดงการแจ้งเตือนชั่วคราว
  const showFeedback = (type: 'success' | 'error', text: string) => {
    setFeedback({ type, text });
    setTimeout(() => setFeedback(null), 4000);
  };

  // ยกเลิกคำขอ (ทำได้เฉพาะตอนสถานะเป็น Pending เท่านั้น)
  const handleCancel = async (id: string) => {
    if (!window.confirm('คุณต้องการยกเลิกคำขอใช้บริการรายการนี้ใช่หรือไม่?')) return;
    
    try {
      const res = await labApi.cancelRequest(id);
      if (res.success) {
        showFeedback('success', res.message);
        loadRequests(); // โหลดข้อมูลอีกรอบหลังอัปเดต
      } else {
        showFeedback('error', res.message);
      }
    } catch (e) {
      showFeedback('error', 'เกิดข้อผิดพลาดในการยกเลิกคำขอ');
    }
  };

  // แจ้งส่งของคืนหน้างาน (เพื่อรอให้แอดมินตรวจสอบและยืนยันในฝั่งแอดมินอีกครั้ง)
  const handleNotifyReturn = async (id: string) => {
    try {
      const res = await labApi.notifyReturn(id);
      if (res.success) {
        showFeedback('success', res.message);
        loadRequests();
      } else {
        showFeedback('error', res.message);
      }
    } catch (e) {
      showFeedback('error', 'เกิดข้อผิดพลาดในการแจ้งส่งคืน');
    }
  };

  // ฟังก์ชันช่วยเหลือจัดประเภทและตกแต่งตามสถานะใบคำขอ (5 สถานะหลัก)
  const getStatusBadgeConfig = (status: RequestStatus, returnNotified?: boolean) => {
    if (returnNotified) {
      return {
        text: 'แจ้งคืนแล้ว (รอตรวจรับ)',
        className: 'bg-indigo-50 border-indigo-100 text-indigo-700',
        icon: <Send className="w-3.5 h-3.5" />
      };
    }

    switch (status) {
      case 'Pending':
        return {
          text: 'รอแอดมินอนุมัติ',
          className: 'bg-amber-50 border-amber-100 text-amber-700',
          icon: <AlertCircle className="w-3.5 h-3.5 animate-pulse" />
        };
      case 'Approved':
        return {
          text: 'อนุมัติแล้ว/กำลังยืม',
          className: 'bg-emerald-50 border-emerald-100 text-emerald-700',
          icon: <CheckCircle className="w-3.5 h-3.5" />
        };
      case 'Rejected':
        return {
          text: 'ปฏิเสธการขอ',
          className: 'bg-rose-50 border-rose-100 text-rose-700',
          icon: <XCircle className="w-3.5 h-3.5" />
        };
      case 'Returned':
        return {
          text: 'คืนของสำเร็จแล้ว',
          className: 'bg-slate-50 border-slate-200 text-slate-500',
          icon: <RotateCcw className="w-3.5 h-3.5" />
        };
      case 'Overdue':
        return {
          text: 'เกินกำหนดส่งคืน!',
          className: 'bg-rose-100 border-rose-200 text-rose-800 font-bold animate-bounce',
          icon: <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
        };
      default:
        return {
          text: 'ไม่ระบุสถานะ',
          className: 'bg-slate-50 text-slate-500',
          icon: <AlertCircle className="w-3.5 h-3.5" />
        };
    }
  };

  // จัดรูปแบบวันเวลาสำหรับแสดงผลให้อ่านง่ายขึ้น
  const formatDateTime = (isoStr: string) => {
    if (!isoStr) return '-';
    try {
      const dt = new Date(isoStr);
      return dt.toLocaleString('th-TH', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (e) {
      return isoStr;
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 pb-20 px-4 sm:px-6 lg:px-8 pt-8 text-left" id="user-history-root">
      
      {/* ส่วนควบคุมและปุ่มย้อนกลับ */}
      <div className="max-w-4xl mx-auto space-y-6">
        
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <button
            onClick={onNavigateBack}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-slate-200 rounded-xl text-xs font-bold transition-all border border-slate-800 shadow-sm flex items-center gap-1.5 cursor-pointer"
            id="back-to-dashboard-btn"
          >
            <ArrowLeft className="w-4 h-4" />
            กลับไปหน้าคลังหลัก
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={loadRequests}
              className="p-2.5 bg-slate-900 hover:bg-slate-800 text-slate-400 rounded-xl border border-slate-800 shadow-sm transition-all cursor-pointer"
              title="รีเฟรชข้อมูลล่าสุด"
              id="refresh-history-btn"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
            <h2 className="text-xl font-bold text-slate-100">ประวัติการทำรายการยืม-จองแลป</h2>
          </div>
        </div>

        {/* แถบแจ้งเตือน Feedback */}
        <AnimatePresence>
          {feedback && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className={`p-4 rounded-2xl text-xs font-semibold flex items-center gap-2 shadow-md text-slate-950 ${
                feedback.type === 'success' ? 'bg-emerald-400' : 'bg-rose-500 text-white'
              }`}
            >
              {feedback.type === 'success' ? <CheckCircle className="w-4 h-4 text-slate-950" /> : <AlertTriangle className="w-4 h-4 text-white" />}
              {feedback.text}
            </motion.div>
          )}
        </AnimatePresence>

        {/* ตารางแสดงประวัติรายการทั้งหมด */}
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-24 gap-3 bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-sm">
            <div className="w-10 h-10 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin" />
            <p className="text-xs text-slate-400 font-medium">กำลังค้นหาประวัติการทำรายการของคุณ...</p>
          </div>
        ) : requests.length === 0 ? (
          <div className="text-center py-24 bg-slate-900 border border-slate-800 rounded-3xl p-8 space-y-2.5 shadow-sm">
            <ClipboardList className="w-10 h-10 text-slate-500 mx-auto animate-pulse" />
            <h4 className="font-bold text-slate-300 text-sm">ไม่พบประวัติการทำรายการใดๆ ในระบบ</h4>
            <p className="text-xs text-slate-500">คุณยังไม่เคยส่งคำขอจองเครื่องมือ ยืมเครื่องแก้ว หรือเบิกสารเคมีผ่านระบบ</p>
          </div>
        ) : (
          <div className="space-y-4">
            {requests.map((req) => {
              // ฟังก์ชันช่วยเหลือจัดประเภทและตกแต่งตามสถานะใบคำขอ (5 สถานะหลัก)
              const getBadge = () => {
                if (req.returnNotified) {
                  return {
                    text: 'แจ้งคืนแล้ว (รอตรวจรับ)',
                    className: 'bg-indigo-500/10 border-indigo-500/20 text-indigo-400',
                    icon: <Send className="w-3.5 h-3.5" />
                  };
                }

                switch (req.status) {
                  case 'Pending':
                    return {
                      text: 'รอแอดมินอนุมัติ',
                      className: 'bg-amber-500/10 border-amber-500/20 text-amber-400',
                      icon: <AlertCircle className="w-3.5 h-3.5 animate-pulse" />
                    };
                  case 'Approved':
                    return {
                      text: 'อนุมัติแล้ว/กำลังยืม',
                      className: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400',
                      icon: <CheckCircle className="w-3.5 h-3.5" />
                    };
                  case 'Rejected':
                    return {
                      text: 'ปฏิเสธการขอ',
                      className: 'bg-rose-500/10 border-rose-500/20 text-rose-400',
                      icon: <XCircle className="w-3.5 h-3.5" />
                    };
                  case 'Returned':
                    return {
                      text: 'คืนของสำเร็จแล้ว',
                      className: 'bg-slate-800/50 border-slate-800 text-slate-400',
                      icon: <RotateCcw className="w-3.5 h-3.5" />
                    };
                  case 'Overdue':
                    return {
                      text: 'เกินกำหนดส่งคืน!',
                      className: 'bg-rose-500/10 border-rose-500/20 text-rose-400 font-bold animate-bounce',
                      icon: <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
                    };
                  default:
                    return {
                      text: 'ไม่ระบุสถานะ',
                      className: 'bg-slate-800/50 border-slate-850 text-slate-500',
                      icon: <AlertCircle className="w-3.5 h-3.5" />
                    };
                }
              };

              const badge = getBadge();
              
              return (
                <motion.div
                  key={req.id}
                  layout
                  className="bg-slate-900 rounded-3xl border border-slate-800 shadow-sm p-6 space-y-5 hover:border-slate-700/50 hover:shadow-md transition-all"
                  id={`history-card-${req.id}`}
                >
                  {/* หัวคำขอ */}
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="px-2.5 py-0.5 bg-slate-950 text-slate-300 font-mono text-[10px] font-bold rounded-md border border-slate-800">
                          {req.id}
                        </span>
                        <span className="text-xs font-semibold text-slate-400">
                          {req.type === 'instrument' 
                            ? 'จองเครื่องมือวิทยาศาสตร์' 
                            : req.type === 'glassware' 
                            ? 'ยืมเครื่องแก้วแลป' 
                            : `เบิก/ยืมสารเคมี (${req.actionType === 'withdraw' ? 'เบิกใช้หมด' : 'ยืมภาชนะบรรจุ'})`}
                        </span>
                      </div>
                      <span className="text-[10px] text-slate-500 block">
                        วันที่ทำธุรกรรม: {formatDateTime(req.requestDate)}
                      </span>
                    </div>

                    <div className={`px-3 py-1 rounded-full text-xs font-bold border flex items-center gap-1.5 ${badge.className}`}>
                      {badge.icon}
                      {badge.text}
                    </div>
                  </div>

                  {/* รายละเอียดสิ่งของที่ขอใช้บริการ */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                    {/* ข้อมูลอุปกรณ์ */}
                    <div className="space-y-2">
                      <h4 className="font-bold text-slate-500 uppercase tracking-wide text-[10px]">รายละเอียดรายการ</h4>
                      
                      {req.type === 'instrument' ? (
                        <div className="p-3 bg-slate-950 rounded-2xl border border-slate-800 text-slate-300">
                          <strong className="text-slate-100 block text-xs">{req.instrumentName}</strong>
                          <span className="text-[11px] text-slate-500 block mt-1">รหัสอุปกรณ์: {req.instrumentId}</span>
                        </div>
                      ) : (
                        <div className="p-3 bg-slate-950 rounded-2xl border border-slate-800 text-slate-300 space-y-2">
                          {req.items?.map((item, idx) => (
                            <div key={idx} className="flex justify-between items-center text-xs">
                              <span className="text-slate-300 font-medium">● {item.name}</span>
                              <strong className="text-slate-100 font-mono font-bold">
                                {item.qty} {item.unit || 'ชิ้น'}
                              </strong>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* ข้อมูลระยะเวลาและสัญญา */}
                    <div className="space-y-2">
                      <h4 className="font-bold text-slate-500 uppercase tracking-wide text-[10px]">ช่วงเวลาการขอใช้งาน / คืน</h4>
                      
                      <div className="p-3 bg-slate-950 rounded-2xl border border-slate-800 space-y-2 text-slate-300">
                        <div className="flex justify-between gap-1">
                          <span className="text-slate-500 shrink-0">วันเวลารับ/ใช้งาน:</span>
                          <strong className="text-slate-200 text-right">{formatDateTime(req.startDate)}</strong>
                        </div>
                        {req.endDate && (
                          <div className="flex justify-between border-t border-slate-800 pt-1.5 gap-1">
                            <span className="text-slate-500 shrink-0">กำหนดวันคืน:</span>
                            <strong className="text-slate-200 text-right">{formatDateTime(req.endDate)}</strong>
                          </div>
                        )}
                        <div className="flex justify-between border-t border-slate-800 pt-1.5 gap-1">
                          <span className="text-slate-500 shrink-0">วัตถุประสงค์:</span>
                          <span className="text-slate-200 font-medium text-right max-w-[180px] truncate" title={req.purpose}>
                            {req.purpose}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* ช่องแสดงความเห็นตอบกลับจากผู้ดูแลระบบ */}
                  {req.adminComment && (
                    <div className="p-3.5 bg-rose-500/10 border border-rose-500/20 rounded-2xl text-xs text-rose-400">
                      <strong>ข้อความตอบกลับจากแอดมิน:</strong> <span className="font-medium">{req.adminComment}</span>
                    </div>
                  )}

                  {/* แผงฟังก์ชันโต้ตอบตามสถานะ (Cancel และ Notify Return) */}
                  <div className="flex justify-end gap-3 pt-2 border-t border-slate-800">
                    
                    {/* 1. ปุ่มยกเลิกคำขอ: ใช้ได้เมื่อสถานะเป็น Pending เท่านั้น */}
                    {req.status === 'Pending' && (
                      <button
                        onClick={() => handleCancel(req.id)}
                        className="px-4 py-2 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 text-rose-400 text-xs font-bold rounded-xl transition-all cursor-pointer"
                        id={`cancel-request-btn-${req.id}`}
                      >
                        ยกเลิกคำขอนี้
                      </button>
                    )}

                    {/* 2. ปุ่มแจ้งคืนของ: ใช้ได้เมื่อได้รับการอนุมัติ (หรือเกินกำหนดส่งคืน) และยังไม่ได้รับการส่งของคืน และไม่ใช่การเบิกสารเคมีใช้หมด */}
                    {(req.status === 'Approved' || req.status === 'Overdue') && !req.returnNotified && req.endDate && (
                      <button
                        onClick={() => handleNotifyReturn(req.id)}
                        className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold rounded-xl transition-all shadow-md flex items-center gap-1.5 cursor-pointer"
                        id={`notify-return-btn-${req.id}`}
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        แจ้งคืนอุปกรณ์แลปนี้
                      </button>
                    )}

                    {/* แจ้งคืนเรียบร้อยแล้ว แสดงป้ายระบุ */}
                    {req.returnNotified && (
                      <span className="text-[11px] font-bold text-slate-400 bg-slate-950 px-3.5 py-2 rounded-xl border border-slate-800 flex items-center gap-1.5 cursor-not-allowed">
                        <Check className="w-3.5 h-3.5 text-emerald-500" />
                        แจ้งคืนสำเร็จแล้ว (รอเจ้าหน้าที่ตรวจสอบของจริง)
                      </span>
                    )}

                  </div>

                </motion.div>
              );
            })}
          </div>
        )}

      </div>

    </div>
  );
}
