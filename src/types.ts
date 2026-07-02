/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type UserRole = 'Admin' | 'Student/Teacher' | 'Student' | 'Teacher';
export type UserStatus = 'Active' | 'Pending' | 'Banned';

export interface User {
  email: string;
  name: string;
  role: 'Admin' | 'Student' | 'Teacher';
  status: UserStatus;
  phone: string;
  department?: string;
  // Student-specific fields
  studentId?: string;
  advisor?: string;
  major?: string;
  // Teacher-specific fields
  password?: string;
  createdAt: string;
}

export type InstrumentStatus = 'Ready' | 'In Use' | 'Maintenance';

export interface Instrument {
  id: string;
  name: string;
  brand: string;
  location: string;
  status: InstrumentStatus;
  picture: string;
  rule?: string;
  ownerEmail: string;
}

export interface Glassware {
  id: string;
  name: string;
  details: string;
  totalQty: number;
  availableQty: number;
  borrowedQty: number;
  picture: string;
}

export interface Chemical {
  id: string;
  name: string;
  details: string;
  qty: number;
  unit: string;
  minQty: number; // For low stock alert
  expiryDate: string; // YYYY-MM-DD
  picture: string;
}

export type RequestType = 'instrument' | 'glassware' | 'chemical';

export type RequestStatus = 'Pending' | 'Approved' | 'Rejected' | 'Returned' | 'Overdue';

export interface CartItem {
  id: string;
  name: string;
  quantity: number;
  availableQty: number;
  unit?: string;
  // For chemicals, whether it is a Borrow or a Withdrawal
  actionType?: 'borrow' | 'withdraw';
}

export interface LabRequest {
  id: string;
  type: RequestType;
  actionType?: 'borrow' | 'withdraw'; // Specific to chemicals
  userEmail: string;
  userName: string;
  userPhone: string;
  
  // If instrument booking
  instrumentId?: string;
  instrumentName?: string;
  
  // If glassware or chemical loan (supports multiple items)
  items?: Array<{
    id: string;
    name: string;
    qty: number;
    unit?: string;
  }>;
  
  requestDate: string; // When the request was made
  startDate: string;   // Booking or Loan Start date-time (YYYY-MM-DD THH:MM)
  endDate?: string;    // Booking or Loan Return/End date-time (optional for chemical withdrawals)
  
  purpose: string;
  status: RequestStatus;
  adminComment?: string;
  
  returnNotified?: boolean; // When user clicks "แจ้งคืนของ"
  returnNotifiedDate?: string;
  updatedAt?: string;
}
