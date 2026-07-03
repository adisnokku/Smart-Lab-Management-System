/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Instrument, Glassware, Chemical, User, LabRequest, RequestStatus, UserStatus } from '../types';
import { initialInstruments, initialGlassware, initialChemicals, initialUsers, initialRequests } from '../data/mockData';

// คีย์สำหรับบันทึกข้อมูลใน LocalStorage เพื่อจำลองฐานข้อมูลหลังบ้าน
const STORAGE_KEYS = {
  INSTRUMENTS: 'smart_lab_instruments',
  GLASSWARE: 'smart_lab_glassware',
  CHEMICALS: 'smart_lab_chemicals',
  USERS: 'smart_lab_users',
  REQUESTS: 'smart_lab_requests',
  APPS_SCRIPT_URL: 'smart_lab_apps_script_url',
  CURRENT_USER: 'smart_lab_current_user'
};

// ตรวจสอบข้อมูลเริ่มต้น หากไม่มีใน LocalStorage ให้โหลดข้อมูล Mock ไปใส่ไว้ก่อน
const initializeLocalStorage = () => {
  if (!localStorage.getItem(STORAGE_KEYS.INSTRUMENTS)) {
    localStorage.setItem(STORAGE_KEYS.INSTRUMENTS, JSON.stringify(initialInstruments));
  }
  if (!localStorage.getItem(STORAGE_KEYS.GLASSWARE)) {
    localStorage.setItem(STORAGE_KEYS.GLASSWARE, JSON.stringify(initialGlassware));
  }
  if (!localStorage.getItem(STORAGE_KEYS.CHEMICALS)) {
    localStorage.setItem(STORAGE_KEYS.CHEMICALS, JSON.stringify(initialChemicals));
  }
  if (!localStorage.getItem(STORAGE_KEYS.USERS)) {
    localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(initialUsers));
  }
  if (!localStorage.getItem(STORAGE_KEYS.REQUESTS)) {
    localStorage.setItem(STORAGE_KEYS.REQUESTS, JSON.stringify(initialRequests));
  }
};

// รันการตั้งค่าเริ่มต้นทันทีที่โหลดโมดูลนี้
initializeLocalStorage();

// --- ฟังก์ชันสแตนด์อโลนสำหรับช่วยอ่านเขียน LocalStorage หลีกเลี่ยงปัญหา Type Inference ใน Object Literal ---

function getLocalData<T>(key: string): T[] {
  const data = localStorage.getItem(key);
  if (!data) return [];
  try {
    const parsed = JSON.parse(data);
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    console.error(`Error parsing localStorage key "${key}":`, e);
    return [];
  }
}

function saveLocalData<T>(key: string, data: T[]): void {
  localStorage.setItem(key, JSON.stringify(data));
}

/**
 * ฟังก์ชันสำหรับจัดการ API Google Apps Script และจำลองข้อมูลหลังบ้าน (Simulation Mode)
 */
export const labApi = {
  // --- การจัดการ URL ของ Google Apps Script ---
  
  getAppsScriptUrl(): string {
    return localStorage.getItem(STORAGE_KEYS.APPS_SCRIPT_URL) || '';
  },

  setAppsScriptUrl(url: string): void {
    localStorage.setItem(STORAGE_KEYS.APPS_SCRIPT_URL, url);
  },

  // เช็คสถานะโหมดออนไลน์ (หากกำหนด URL จะถือว่าเชื่อมต่อระบบภายนอก)
  isOnlineMode(): boolean {
    const url = this.getAppsScriptUrl().trim();
    return url.length > 0 && (url.startsWith('http://') || url.startsWith('https://'));
  },

  // เผยแพร่ฟังก์ชันช่วยเหลือให้โมดูลอื่นเรียกใช้ได้แบบ Type-Safe
  getLocalData<T>(key: string): T[] {
    return getLocalData<T>(key);
  },

  saveLocalData<T>(key: string, data: T[]): void {
    saveLocalData<T>(key, data);
  },

  // --- 1. ระบบยืนยันตัวตนและการจัดการสิทธิ์ (Auth Section) ---

  /**
   * ล็อกอินด้วยอีเมล
   * @param email อีเมล มข. ที่ต้องการล็อกอิน
   * @param password รหัสผ่านสำหรับ Admin และ Teacher
   */
  async login(email: string, password?: string): Promise<{ success: boolean; user?: User; status?: string; message: string; requiresRegister?: boolean; requiresPassword?: boolean }> {
    const lowerEmail = email.toLowerCase().trim();
    
    // ตรวจสอบโดเมน มข. (@kku.ac.th หรือ @kkumail.com)
    const kkuRegex = /^[a-zA-Z0-9._%+-]+@(kku\.ac\.th|kkumail\.com)$/;
    if (!kkuRegex.test(lowerEmail)) {
      return {
        success: false,
        message: 'กรุณาใช้อีเมลของมหาวิทยาลัยขอนแก่นเท่านั้น (@kku.ac.th หรือ @kkumail.com)'
      };
    }

    // หากเปิดโหมดเชื่อมต่อระบบจริง (Apps Script)
    if (this.isOnlineMode()) {
      try {
        const response = await fetch(`${this.getAppsScriptUrl()}?action=login&email=${encodeURIComponent(lowerEmail)}&password=${encodeURIComponent(password || '')}`);
        const result = await response.json();
        
        if (result.success) {
          if (result.user) {
            this.setCurrentUser(result.user);
            return { success: true, user: result.user, message: 'เข้าสู่ระบบสำเร็จ' };
          }
        } else {
          if (result.requiresRegister) {
            return { success: false, requiresRegister: true, message: 'ไม่พบอีเมลในระบบ กรุณาลงทะเบียนเข้าใช้งานครั้งแรก' };
          }
          if (result.requiresPassword) {
            return { success: false, requiresPassword: true, message: result.message || 'กรุณากรอกรหัสผ่านเพื่อเข้าสู่ระบบ' };
          }
          return { 
            success: false, 
            status: result.status, 
            message: result.message || result.error || 'เกิดข้อผิดพลาดในการตรวจสอบสิทธิ์จากเซิร์ฟเวอร์ Google' 
          };
        }
      } catch (error) {
        console.error('Apps Script API Error, falling back to local simulation:', error);
      }
    }

    // กรณีโหมดจำลอง (Local Simulation) หรือ API เชื่อมต่อไม่ได้
    const users = getLocalData<User>(STORAGE_KEYS.USERS);
    const matchedUser = users.find(u => u.email && u.email.toLowerCase().trim() === lowerEmail);

    if (!matchedUser) {
      // หากไม่มีอีเมลในระบบ ให้เปลี่ยนหน้าจอเป็นฟอร์มลงทะเบียน
      return {
        success: false,
        requiresRegister: true,
        message: 'ไม่พบอีเมลนี้ในฐานข้อมูลระบบ กรุณากรอกฟอร์มลงทะเบียนใช้งานครั้งแรก'
      };
    }

    // ตรวจสอบความถูกต้องของรหัสผ่านสำหรับ Admin หรือ Teacher
    if (matchedUser.role === 'Admin' || matchedUser.role === 'Teacher') {
      let userPassword = String(matchedUser.password || '').trim();
      if (!userPassword) {
        userPassword = matchedUser.role === 'Admin' ? 'admin123' : 'teacher123';
      }
      
      if (!password) {
        return {
          success: false,
          requiresPassword: true,
          message: 'บัญชีอาจารย์/ผู้ดูแลระบบ จำเป็นต้องระบุรหัสผ่านเพื่อเข้าสู่ระบบ'
        };
      }

      if (String(password).trim() !== userPassword) {
        return {
          success: false,
          requiresPassword: true,
          message: 'รหัสผ่านไม่ถูกต้อง กรุณาตรวจสอบรหัสผ่านอีกครั้ง'
        };
      }
    }

    // ตรวจสอบบทบาทและสถานะการอนุมัติ
    if (matchedUser.role === 'Admin') {
      this.setCurrentUser(matchedUser);
      return {
        success: true,
        user: matchedUser,
        message: 'เข้าสู่ระบบในฐานะผู้ดูแลระบบสำเร็จ'
      };
    } else {
      // สำหรับ Student หรือ Teacher ให้เช็คสถานะการเข้าใช้งาน
      if (matchedUser.status === 'Active') {
        this.setCurrentUser(matchedUser);
        return {
          success: true,
          user: matchedUser,
          message: 'เข้าสู่ระบบผู้ใช้งานสำเร็จ'
        };
      } else if (matchedUser.status === 'Pending') {
        return {
          success: false,
          status: 'Pending',
          message: 'บัญชีนี้ยังไม่ได้รับการอนุมัติใช้งานจากผู้ดูแลระบบ กรุณารอการอนุมัติ (Pending)'
        };
      } else {
        return {
          success: false,
          status: 'Banned',
          message: 'บัญชีนี้ถูกระงับการใช้งานในระบบ (Banned) กรุณาติดต่อผู้รับผิดชอบห้องแลป'
        };
      }
    }
  },

  /**
   * ลงทะเบียนผู้ใช้ใหม่
   * @param user ข้อมูลผู้ใช้
   */
  async register(user: Omit<User, 'createdAt' | 'status'>): Promise<{ success: boolean; message: string }> {
    const newUser: User = {
      ...user,
      status: 'Pending', // เริ่มต้นรอแอดมินอนุมัติ
      createdAt: new Date().toISOString()
    };

    // ส่งข้อมูลไปบันทึกจริงใน Google Sheets หากตั้งค่า API
    if (this.isOnlineMode()) {
      try {
        const response = await fetch(this.getAppsScriptUrl(), {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            action: 'register',
            userData: JSON.stringify(newUser)
          })
        });
        const result = await response.json();
        if (result.success) {
          return { success: true, message: 'ลงทะเบียนสำเร็จ! กรุณารอแอดมินตรวจสอบและอนุมัติการใช้งาน' };
        }
      } catch (error) {
        console.error('Apps Script Registration API Error:', error);
      }
    }

    // บันทึกลง LocalStorage
    const users = getLocalData<User>(STORAGE_KEYS.USERS);
    
    // ตรวจสอบว่าเคยสมัครไว้หรือยัง
    if (users.some(u => u.email.toLowerCase() === newUser.email.toLowerCase())) {
      return { success: false, message: 'อีเมลนี้ถูกใช้ลงทะเบียนไปแล้ว' };
    }

    users.push(newUser);
    saveLocalData(STORAGE_KEYS.USERS, users);
    return {
      success: true,
      message: 'ลงทะเบียนเข้าใช้งานสำเร็จ! ข้อมูลของคุณถูกส่งรอผู้ดูแลระบบตรวจสอบและอนุมัติ (Status: Pending)'
    };
  },

  // จัดการ Session ปัจจุบันของผู้ใช้
  getCurrentUser(): User | null {
    const userJson = localStorage.getItem(STORAGE_KEYS.CURRENT_USER);
    if (!userJson) return null;
    try {
      return JSON.parse(userJson);
    } catch (e) {
      console.error('Error parsing current user JSON:', e);
      return null;
    }
  },

  setCurrentUser(user: User | null): void {
    if (user) {
      localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(user));
    } else {
      localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
    }
  },

  // --- 2. การดึงข้อมูลอุปกรณ์ คลังเครื่องแก้ว และสารเคมี (Catalog Section) ---

  async getInstruments(): Promise<Instrument[]> {
    if (this.isOnlineMode()) {
      try {
        const res = await fetch(`${this.getAppsScriptUrl()}?action=getInstruments`);
        if (!res.ok) {
          throw new Error(`HTTP error! status: ${res.status}`);
        }
        const data = await res.json();
        if (Array.isArray(data)) {
          return data;
        }
        throw new Error('Response data is not an array');
      } catch (e) {
        console.error('Fallback load instruments:', e);
      }
    }
    return getLocalData<Instrument>(STORAGE_KEYS.INSTRUMENTS);
  },

  async getGlassware(): Promise<Glassware[]> {
    if (this.isOnlineMode()) {
      try {
        const res = await fetch(`${this.getAppsScriptUrl()}?action=getGlassware`);
        if (!res.ok) {
          throw new Error(`HTTP error! status: ${res.status}`);
        }
        const data = await res.json();
        if (Array.isArray(data)) {
          return data;
        }
        throw new Error('Response data is not an array');
      } catch (e) {
        console.error('Fallback load glassware:', e);
      }
    }
    return getLocalData<Glassware>(STORAGE_KEYS.GLASSWARE);
  },

  async getChemicals(): Promise<Chemical[]> {
    if (this.isOnlineMode()) {
      try {
        const res = await fetch(`${this.getAppsScriptUrl()}?action=getChemicals`);
        if (!res.ok) {
          throw new Error(`HTTP error! status: ${res.status}`);
        }
        const data = await res.json();
        if (Array.isArray(data)) {
          return data;
        }
        throw new Error('Response data is not an array');
      } catch (e) {
        console.error('Fallback load chemicals:', e);
      }
    }
    return getLocalData<Chemical>(STORAGE_KEYS.CHEMICALS);
  },

  // --- 3. ระบบส่งคำขอทำรายการ (Booking & Loans Section) ---

  /**
   * ส่งคำจองหรือยืม-เบิกอุปกรณ์
   */
  async submitRequest(req: Omit<LabRequest, 'id' | 'requestDate' | 'status'>): Promise<{ success: boolean; message: string }> {
    const newRequest: LabRequest = {
      ...req,
      id: 'REQ-' + Math.floor(100000 + Math.random() * 900000), // สร้างเลขคำขอแบบสุ่ม
      requestDate: new Date().toISOString(),
      status: 'Pending' // ค่าเริ่มต้นรออนุมัติ
    };

    if (this.isOnlineMode()) {
      try {
        const response = await fetch(this.getAppsScriptUrl(), {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            action: 'submitRequest',
            requestData: JSON.stringify(newRequest)
          })
        });
        const result = await response.json();
        if (result.success) return { success: true, message: 'ส่งคำขอสำเร็จเรียบร้อยแล้ว' };
      } catch (error) {
        console.error('Apps Script Submit Request API Error:', error);
      }
    }

    // บันทึกลง Local Storage
    const requests = getLocalData<LabRequest>(STORAGE_KEYS.REQUESTS);
    requests.push(newRequest);
    saveLocalData(STORAGE_KEYS.REQUESTS, requests);

    return {
      success: true,
      message: 'ทำรายการส่งคำขอเรียบร้อยแล้ว! สามารถติดตามความคืบหน้าได้ในหน้าประวัติการทำรายการ'
    };
  },

  /**
   * โหลดรายการประวัติของผู้ใช้เฉพาะราย หรือ แอดมินดูทั้งหมด
   */
  async getRequests(email?: string): Promise<LabRequest[]> {
    let allRequests: LabRequest[] = [];
    
    if (this.isOnlineMode()) {
      try {
        const res = await fetch(`${this.getAppsScriptUrl()}?action=getRequests`);
        allRequests = await res.json();
      } catch (e) {
        console.error('Fallback fetch requests:', e);
        allRequests = getLocalData<LabRequest>(STORAGE_KEYS.REQUESTS);
      }
    } else {
      allRequests = getLocalData<LabRequest>(STORAGE_KEYS.REQUESTS);
    }

    // เช็คและอัปเดตสถานะ 'Overdue' (เกินกำหนดคืน) แบบไดนามิก
    // เปรียบเทียบวันเวลากับเวลาปัจจุบัน (2026-07-01 ตาม ADD_METADATA)
    const currentTime = new Date('2026-07-01T21:09:16-07:00'); 
    let changed = false;

    const updatedRequests = allRequests.map(r => {
      // หากคำขอได้รับการอนุมัติแล้ว แต่เลยกำหนดวันคืน (และไม่ใช่การเบิกสารเคมีแบบใช้หมด)
      if (r.status === 'Approved' && r.endDate) {
        const endDateTime = new Date(r.endDate);
        if (currentTime > endDateTime) {
          changed = true;
          return { ...r, status: 'Overdue' as RequestStatus };
        }
      }
      return r;
    });

    if (changed && !this.isOnlineMode()) {
      saveLocalData(STORAGE_KEYS.REQUESTS, updatedRequests);
    }

    // กรองตามอีเมลผู้ส่ง (กรณีผู้ใช้ทั่วไปต้องการดูประวัติตัวเอง)
    if (email) {
      return updatedRequests
        .filter(r => r.userEmail.toLowerCase() === email.toLowerCase())
        .sort((a, b) => new Date(b.requestDate).getTime() - new Date(a.requestDate).getTime());
    }

    // แสดงสำหรับแอดมินทั้งหมด
    return updatedRequests.sort((a, b) => new Date(b.requestDate).getTime() - new Date(a.requestDate).getTime());
  },

  /**
   * ยกเลิกคำขอโดยผู้ใช้เอง (ต้องเป็นสถานะ 'Pending' เท่านั้น)
   */
  async cancelRequest(requestId: string): Promise<{ success: boolean; message: string }> {
    if (this.isOnlineMode()) {
      try {
        const response = await fetch(this.getAppsScriptUrl(), {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            action: 'cancelRequest',
            requestId: requestId
          })
        });
        const result = await response.json();
        if (result.success) return { success: true, message: 'ยกเลิกคำขอสำเร็จ' };
      } catch (e) {
        console.error(e);
      }
    }

    const requests = getLocalData<LabRequest>(STORAGE_KEYS.REQUESTS);
    const reqIndex = requests.findIndex(r => r.id === requestId);

    if (reqIndex === -1) {
      return { success: false, message: 'ไม่พบรายการคำขอนี้ในระบบ' };
    }

    if (requests[reqIndex].status !== 'Pending') {
      return { success: false, message: 'ไม่สามารถยกเลิกคำขอนี้ได้เนื่องจากรายการได้รับการประมวลผลแล้ว' };
    }

    // เปลี่ยนเป็นยกเลิก (Rejected)
    requests[reqIndex].status = 'Rejected';
    requests[reqIndex].adminComment = 'ยกเลิกรายการโดยผู้ยื่นคำขอ';
    requests[reqIndex].updatedAt = new Date().toISOString();
    
    saveLocalData(STORAGE_KEYS.REQUESTS, requests);
    return { success: true, message: 'ยกเลิกคำขอทำรายการของคุณเรียบร้อยแล้ว' };
  },

  /**
   * ผู้ใช้กดแจ้งคืนของหน้างาน
   */
  async notifyReturn(requestId: string): Promise<{ success: boolean; message: string }> {
    if (this.isOnlineMode()) {
      try {
        const response = await fetch(this.getAppsScriptUrl(), {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            action: 'notifyReturn',
            requestId: requestId
          })
        });
        const result = await response.json();
        if (result.success) return { success: true, message: 'แจ้งคืนสำเร็จ' };
      } catch (e) {
        console.error(e);
      }
    }

    const requests = getLocalData<LabRequest>(STORAGE_KEYS.REQUESTS);
    const reqIndex = requests.findIndex(r => r.id === requestId);

    if (reqIndex === -1) {
      return { success: false, message: 'ไม่พบรายการคำขอนี้' };
    }

    requests[reqIndex].returnNotified = true;
    requests[reqIndex].returnNotifiedDate = new Date().toISOString();
    requests[reqIndex].updatedAt = new Date().toISOString();

    saveLocalData(STORAGE_KEYS.REQUESTS, requests);
    return { success: true, message: 'แจ้งเรื่องส่งคืนของสำเร็จ! กรุณานำวัสดุหรือเข้าพบแอดมินที่ห้องปฏิบัติการเพื่อยืนยันการรับคืน' };
  },

  // --- 4. ระบบการจัดการหลังบ้านสำหรับแอดมิน (Admin Control Section) ---

  /**
   * ดึงรายชื่อผู้ใช้ทั้งหมด (สำหรับแอดมินจัดการ)
   */
  async getAllUsers(): Promise<User[]> {
    if (this.isOnlineMode()) {
      try {
        const res = await fetch(`${this.getAppsScriptUrl()}?action=getUsers`);
        if (!res.ok) {
          throw new Error(`HTTP error! status: ${res.status}`);
        }
        const data = await res.json();
        if (Array.isArray(data)) {
          return data;
        }
        throw new Error('Response data is not an array');
      } catch (e) {
        console.error('Fallback load users:', e);
      }
    }
    return getLocalData<User>(STORAGE_KEYS.USERS);
  },

  /**
   * ดึงรายชื่ออาจารย์ที่ปรึกษาทั้งหมดจากคลังข้อมูลระบบออนไลน์ Google Sheets และ Local Storage
   */
  async getAdvisors(): Promise<string[]> {
    const defaultAdvisors = [
      'ผศ.ดร. อดิศร นามสกุลดี',
      'ดร.สุภาพร แก้วมณี',
      'ผศ.ดร. เด่นพงษ์ สุดภักดี',
      'รศ.ดร. ชัชชัย คุณบัว',
      'ผศ.ดร. พนมชัย วีระยุทธศิลป์',
      'รศ.ดร. วารุณี อริยวิริยะนันท์'
    ];

    try {
      const users = await this.getAllUsers();
      const fetchedAdvisors = users
        .filter(u => u.role === 'Teacher' || u.role === 'Admin')
        .map(u => u.name.trim())
        .filter(name => name.length > 0);

      const uniqueAdvisors = Array.from(new Set([...fetchedAdvisors, ...defaultAdvisors]));
      return uniqueAdvisors;
    } catch (e) {
      console.error('Error fetching advisors:', e);
      return defaultAdvisors;
    }
  },

  /**
   * อนุมัติการเข้าใช้งาน ยอมรับ, แบน หรือ ปลดแบนผู้ใช้
   */
  async updateUserStatus(email: string, status: UserStatus): Promise<{ success: boolean; message: string }> {
    if (this.isOnlineMode()) {
      try {
        const response = await fetch(this.getAppsScriptUrl(), {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            action: 'updateUserStatus',
            email: email,
            status: status
          })
        });
        const result = await response.json();
        if (result.success) return { success: true, message: 'อัปเดตผู้ใช้สำเร็จ' };
      } catch (e) {
        console.error(e);
      }
    }

    const users = getLocalData<User>(STORAGE_KEYS.USERS);
    const userIndex = users.findIndex(u => u.email.toLowerCase() === email.toLowerCase());

    if (userIndex === -1) {
      return { success: false, message: 'ไม่พบอีเมลผู้ใช้งานในระบบ' };
    }

    users[userIndex].status = status;
    saveLocalData(STORAGE_KEYS.USERS, users);

    const statusThai = status === 'Active' ? 'เปิดใช้งาน (Active)' : (status === 'Banned' ? 'ระงับการใช้งาน (Banned)' : 'รอตรวจสอบ');
    return { success: true, message: `อัปเดตสถานะผู้ใช้งานเป็น "${statusThai}" สำเร็จเรียบร้อย` };
  },

  /**
   * อัปเดตสถานะของคำขอจอง / ยืม-คืน จากฝั่งแอดมิน
   */
  async handleRequestApproval(requestId: string, status: RequestStatus, comment: string = ''): Promise<{ success: boolean; message: string }> {
    if (this.isOnlineMode()) {
      try {
        const response = await fetch(this.getAppsScriptUrl(), {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            action: 'handleRequestApproval',
            requestId: requestId,
            status: status,
            comment: comment
          })
        });
        const result = await response.json();
        if (result.success) return { success: true, message: 'ประมวลผลคำขอเรียบร้อย' };
      } catch (e) {
        console.error(e);
      }
    }

    const requests = getLocalData<LabRequest>(STORAGE_KEYS.REQUESTS);
    const instruments = getLocalData<Instrument>(STORAGE_KEYS.INSTRUMENTS);
    const glassware = getLocalData<Glassware>(STORAGE_KEYS.GLASSWARE);
    const chemicals = getLocalData<Chemical>(STORAGE_KEYS.CHEMICALS);

    const reqIndex = requests.findIndex(r => r.id === requestId);
    if (reqIndex === -1) {
      return { success: false, message: 'ไม่พบข้อมูลคำขอนี้ในระบบ' };
    }

    const currentReq = requests[reqIndex];
    currentReq.status = status;
    currentReq.adminComment = comment;
    currentReq.updatedAt = new Date().toISOString();

    // จัดการผลกระทบต่อสต็อกเมื่อคำขอได้รับการ "อนุมัติ" หรือ "รับคืนสำเร็จ"
    if (status === 'Approved') {
      // 1. จองเครื่องมือ -> เปลี่ยนเครื่องมือเป็น "In Use (ไม่ว่าง)"
      if (currentReq.type === 'instrument' && currentReq.instrumentId) {
        const instIndex = instruments.findIndex(i => i.id === currentReq.instrumentId);
        if (instIndex !== -1) {
          instruments[instIndex].status = 'In Use';
        }
      }
      // 2. ยืมเครื่องแก้ว -> ตัดสต็อกจำนวนพร้อมยืม และเพิ่มจำนวนถูกยืมไปแล้ว
      if (currentReq.type === 'glassware' && currentReq.items) {
        currentReq.items.forEach(reqItem => {
          const gwIdx = glassware.findIndex(g => g.id === reqItem.id);
          if (gwIdx !== -1) {
            glassware[gwIdx].availableQty = Math.max(0, glassware[gwIdx].availableQty - reqItem.qty);
            glassware[gwIdx].borrowedQty += reqItem.qty;
          }
        });
      }
      // 3. ยืม/เบิกสารเคมี -> ลดยอดสต็อกสารเคมีโดยตรง
      if (currentReq.type === 'chemical' && currentReq.items) {
        currentReq.items.forEach(reqItem => {
          const chemIdx = chemicals.findIndex(c => c.id === reqItem.id);
          if (chemIdx !== -1) {
            chemicals[chemIdx].qty = Math.max(0, chemicals[chemIdx].qty - reqItem.qty);
          }
        });
      }
    } else if (status === 'Returned') {
      // เมื่อคืนของเรียบร้อยแล้ว
      currentReq.returnNotified = false; // ปิดป้ายการแจ้งเตือน
      
      // 1. คืนเครื่องมือวิทยาศาสตร์ -> ตั้งค่าสถานะเป็น "Ready (ว่าง)"
      if (currentReq.type === 'instrument' && currentReq.instrumentId) {
        const instIndex = instruments.findIndex(i => i.id === currentReq.instrumentId);
        if (instIndex !== -1) {
          instruments[instIndex].status = 'Ready';
        }
      }
      // 2. คืนเครื่องแก้ว -> คืนสต็อกจำนวนพร้อมยืม และลดจำนวนถูกยืมลง
      if (currentReq.type === 'glassware' && currentReq.items) {
        currentReq.items.forEach(reqItem => {
          const gwIdx = glassware.findIndex(g => g.id === reqItem.id);
          if (gwIdx !== -1) {
            glassware[gwIdx].availableQty = Math.min(glassware[gwIdx].totalQty, glassware[gwIdx].availableQty + reqItem.qty);
            glassware[gwIdx].borrowedQty = Math.max(0, glassware[gwIdx].borrowedQty - reqItem.qty);
          }
        });
      }
      // 3. คืนสารเคมี -> คืนสต็อกจำนวนเฉพาะกรณี "ยืม" (หากกรณี "เบิก" จะไม่ระบุการคืน)
      if (currentReq.type === 'chemical' && currentReq.actionType === 'borrow' && currentReq.items) {
        currentReq.items.forEach(reqItem => {
          const chemIdx = chemicals.findIndex(c => c.id === reqItem.id);
          if (chemIdx !== -1) {
            chemicals[chemIdx].qty += reqItem.qty; // คืนจำนวนสารเคมีที่คืน
          }
        });
      }
    }

    // บันทึกสถานะทั้งหมดกลับคืน Local Database
    saveLocalData(STORAGE_KEYS.REQUESTS, requests);
    saveLocalData(STORAGE_KEYS.INSTRUMENTS, instruments);
    saveLocalData(STORAGE_KEYS.GLASSWARE, glassware);
    saveLocalData(STORAGE_KEYS.CHEMICALS, chemicals);

    const statusThai = status === 'Approved' ? 'อนุมัติคำขอแล้ว' : (status === 'Rejected' ? 'ปฏิเสธคำขอแล้ว' : 'บันทึกการรับคืนเสร็จสิ้น');
    return { success: true, message: `ดำเนินการ: ${statusThai} เรียบร้อย สต็อกและข้อมูลอุปกรณ์ได้รับการคำนวณปรับปรุงโดยอัตโนมัติ` };
  },

  /**
   * แก้ไขปรับปรุงสต็อกคลังและเครื่องมือโดยตรงจากหน้า Admin Inventory
   */
  async updateInventoryItem(type: 'instrument' | 'glassware' | 'chemical', itemId: string, updatedFields: any): Promise<{ success: boolean; message: string }> {
    // 1. อัปเดตในระบบ Local Storage เสมอ เพื่อให้การเข้าถึงในเครื่องทันสมัยและตอบสนองได้ทันที
    if (type === 'instrument') {
      const items = getLocalData<Instrument>(STORAGE_KEYS.INSTRUMENTS);
      const idx = items.findIndex(i => i.id === itemId);
      if (idx !== -1) {
        items[idx] = { ...items[idx], ...updatedFields };
        saveLocalData(STORAGE_KEYS.INSTRUMENTS, items);
      }
    } else if (type === 'glassware') {
      const items = getLocalData<Glassware>(STORAGE_KEYS.GLASSWARE);
      const idx = items.findIndex(i => i.id === itemId);
      if (idx !== -1) {
        const currentItem = items[idx];
        const newTotalQty = updatedFields.totalQty !== undefined ? Number(updatedFields.totalQty) : currentItem.totalQty;
        // ปรับยอดพร้อมยืมตามสัดส่วนการยืมคงค้าง
        const borrowed = currentItem.borrowedQty;
        const available = Math.max(0, newTotalQty - borrowed);

        items[idx] = { 
          ...currentItem, 
          ...updatedFields,
          totalQty: newTotalQty,
          availableQty: available
        };
        saveLocalData(STORAGE_KEYS.GLASSWARE, items);
      }
    } else if (type === 'chemical') {
      const items = getLocalData<Chemical>(STORAGE_KEYS.CHEMICALS);
      const idx = items.findIndex(i => i.id === itemId);
      if (idx !== -1) {
        items[idx] = { 
          ...items[idx], 
          ...updatedFields,
          qty: updatedFields.qty !== undefined ? Number(updatedFields.qty) : items[idx].qty,
          minQty: updatedFields.minQty !== undefined ? Number(updatedFields.minQty) : items[idx].minQty,
        };
        saveLocalData(STORAGE_KEYS.CHEMICALS, items);
      }
    }

    // 2. หากเปิดระบบออนไลน์ ให้ส่งไปอัปเดตที่ Google Sheets ของผู้ใช้ด้วย
    if (this.isOnlineMode()) {
      try {
        const response = await fetch(this.getAppsScriptUrl(), {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            action: 'updateInventory',
            type: type,
            itemId: itemId,
            fields: JSON.stringify(updatedFields)
          })
        });
        const result = await response.json();
        if (result.success) {
          return { success: true, message: 'อัปเดตข้อมูลคลังสินค้าและซิงค์ข้อมูลลง Google Sheets เรียบร้อย' };
        }
      } catch (e) {
        console.error('Error syncing online inventory update:', e);
      }
    }

    return { success: true, message: 'อัปเดตข้อมูลและปรับปรุงคลังในระบบสำเร็จเรียบร้อย' };
  }
};
