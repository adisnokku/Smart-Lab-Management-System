/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Instrument, Glassware, Chemical, User, LabRequest } from '../types';

// Preloaded instruments based on the provided KKU Inorganic Lab CSV
export const initialInstruments: Instrument[] = [
  {
    id: 'Inorganic001',
    name: 'Sunction pump',
    brand: 'Merck wp6222050',
    location: 'ห้อง 8609',
    status: 'Ready',
    picture: 'https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?w=400&auto=format&fit=crop&q=60',
    rule: 'แจ้งผู้ดูแลทุกครั้งก่อนใช้งานเครื่อง',
    ownerEmail: 'adisno@kku.ac.th'
  },
  {
    id: 'Inorganic002',
    name: 'Centrifugal',
    brand: 'Koki San H-11n',
    location: 'ห้อง 8609',
    status: 'Ready',
    picture: 'https://images.unsplash.com/photo-1582719508461-905c673771fd?w=400&auto=format&fit=crop&q=60',
    rule: 'แจ้งผู้ดูแลทุกครั้งก่อนใช้งานเครื่อง',
    ownerEmail: 'adisno@kku.ac.th'
  },
  {
    id: 'Inorganic003',
    name: 'Evaporator',
    brand: 'BUCHI series 300',
    location: 'ห้อง 8609',
    status: 'Ready',
    picture: 'https://images.unsplash.com/photo-1607619056574-7b8d3ee536b2?w=400&auto=format&fit=crop&q=60',
    rule: 'แจ้งผู้ดูแลทุกครั้งก่อนใช้งานเครื่อง',
    ownerEmail: 'adisno@kku.ac.th'
  },
  {
    id: 'Inorganic004',
    name: 'Spectrophotometer',
    brand: 'Spectrum SP-UV300',
    location: 'ห้อง 8609',
    status: 'Ready',
    picture: 'https://images.unsplash.com/photo-1532187863486-abf9d39d66e8?w=400&auto=format&fit=crop&q=60',
    rule: 'ระวังอย่าให้สารเคมีหกใส่ช่องวัดแสง',
    ownerEmail: 'adisno@kku.ac.th'
  },
  {
    id: 'Inorganic005',
    name: 'Water bath',
    brand: 'Memmert',
    location: 'ห้อง 8609',
    status: 'Ready',
    picture: 'https://images.unsplash.com/photo-1518152006812-edab29b069ac?w=400&auto=format&fit=crop&q=60',
    rule: 'เติมน้ำกลั่นให้ได้ระดับก่อนเปิดเครื่องเสมอ',
    ownerEmail: 'adisno@kku.ac.th'
  },
  {
    id: 'Inorganic006',
    name: 'Oven (Fisher)',
    brand: 'Fisher Scientific',
    location: 'ห้อง 8608',
    status: 'Ready',
    picture: 'https://images.unsplash.com/photo-1574269909862-7e1d70bb8078?w=400&auto=format&fit=crop&q=60',
    rule: 'สวมถุงมือกันความร้อนทุกครั้งที่นำของออก',
    ownerEmail: 'adisno@kku.ac.th'
  },
  {
    id: 'Inorganic007',
    name: 'Oven (Memmert - Glassware)',
    brand: 'Memmert',
    location: 'ห้อง 8609',
    status: 'Ready',
    picture: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=400&auto=format&fit=crop&q=60',
    rule: 'อบเครื่องแก้วเท่านั้น',
    ownerEmail: 'adisno@kku.ac.th'
  },
  {
    id: 'Inorganic008',
    name: 'Oven (Memmert - Chemicals)',
    brand: 'Memmert',
    location: 'ห้อง 8609',
    status: 'Maintenance',
    picture: 'https://images.unsplash.com/photo-1581093199625-cd1000f60c70?w=400&auto=format&fit=crop&q=60',
    rule: 'อบสารเคมีเท่านั้น',
    ownerEmail: 'adisno@kku.ac.th'
  },
  {
    id: 'Inorganic009',
    name: 'Conductivity meter',
    brand: 'inoLab',
    location: 'ห้อง 8609',
    status: 'Ready',
    picture: 'https://images.unsplash.com/photo-1576086213369-97a306d36557?w=400&auto=format&fit=crop&q=60',
    rule: 'ล้างหัววัดด้วยน้ำกลั่นและเช็ดให้แห้งหลังใช้งาน',
    ownerEmail: 'adisno@kku.ac.th'
  },
  {
    id: 'Inorganic010',
    name: 'Hot plate',
    brand: 'Standard',
    location: 'ห้อง 8609',
    status: 'Ready',
    picture: 'https://images.unsplash.com/photo-1617137984095-74e4e5e3613f?w=400&auto=format&fit=crop&q=60',
    rule: 'ระวังความร้อนสะสมที่หน้าเตาหลังปิดเครื่อง',
    ownerEmail: 'adisno@kku.ac.th'
  },
  {
    id: 'Inorganic011',
    name: 'Hot plate stirrer (IKA)',
    brand: 'IKA C-MAG HS-7',
    location: 'ห้อง 8609',
    status: 'Ready',
    picture: 'https://images.unsplash.com/photo-1511688868353-3a1ab7ebb99c?w=400&auto=format&fit=crop&q=60',
    rule: 'ห้ามใช้สารระเหยง่ายใกล้บริเวณหน้าเตา',
    ownerEmail: 'adisno@kku.ac.th'
  },
  {
    id: 'Inorganic012',
    name: 'Hot plate stirrer (Heidolph 1)',
    brand: 'Heidolph',
    location: 'ห้อง 8609',
    status: 'Ready',
    picture: 'https://images.unsplash.com/photo-1581093588401-f3c22d66c219?w=400&auto=format&fit=crop&q=60',
    rule: 'ปิดสวิตช์ฮีตเตอร์และสปินเนอร์ทุกครั้งหลังใช้งาน',
    ownerEmail: 'adisno@kku.ac.th'
  },
  {
    id: 'Inorganic013',
    name: 'Hot plate stirrer (Heidolph MR-3001)',
    brand: 'Heidolph MR-3001',
    location: 'ห้อง 8609',
    status: 'Ready',
    picture: 'https://images.unsplash.com/photo-1576086213369-97a306d36557?w=400&auto=format&fit=crop&q=60',
    rule: 'หมุนความเร็วรอบขึ้นอย่างช้าๆ ป้องกันแม่เหล็กหลุด',
    ownerEmail: 'adisno@kku.ac.th'
  }
];

// Preloaded glassware list
export const initialGlassware: Glassware[] = [
  {
    id: 'GW-001',
    name: 'Beaker 250mL',
    details: 'Pyrex Glass Borosilicate 3.3',
    totalQty: 50,
    availableQty: 42,
    borrowedQty: 8,
    picture: 'https://images.unsplash.com/photo-1617137984095-74e4e5e3613f?w=400&auto=format&fit=crop&q=60'
  },
  {
    id: 'GW-002',
    name: 'Erlenmeyer Flask 250mL',
    details: 'Narrow neck, Pyrex Glass',
    totalQty: 40,
    availableQty: 30,
    borrowedQty: 10,
    picture: 'https://images.unsplash.com/photo-1576086213369-97a306d36557?w=400&auto=format&fit=crop&q=60'
  },
  {
    id: 'GW-003',
    name: 'Volumetric Flask 100mL',
    details: 'Class A, with glass stopper',
    totalQty: 20,
    availableQty: 18,
    borrowedQty: 2,
    picture: 'https://images.unsplash.com/photo-1607619056574-7b8d3ee536b2?w=400&auto=format&fit=crop&q=60'
  },
  {
    id: 'GW-004',
    name: 'Graduated Cylinder 50mL',
    details: 'Glass hexagonal base, white graduation',
    totalQty: 15,
    availableQty: 3, // LOW STOCK ALERT
    borrowedQty: 12,
    picture: 'https://images.unsplash.com/photo-1532187863486-abf9d39d66e8?w=400&auto=format&fit=crop&q=60'
  }
];

// Preloaded chemical list (expiry within 1 month and low stock examples to trigger alerts)
export const initialChemicals: Chemical[] = [
  {
    id: 'CHEM-001',
    name: 'Hydrochloric Acid 37%',
    details: 'AR Grade, Merck',
    qty: 2.5,
    unit: 'L',
    minQty: 5.0, // LOW STOCK TRIGGER (current 2.5 < min 5.0)
    expiryDate: '2027-12-31',
    picture: 'https://images.unsplash.com/photo-1607619056574-7b8d3ee536b2?w=400&auto=format&fit=crop&q=60'
  },
  {
    id: 'CHEM-002',
    name: 'Sodium Hydroxide Pellets',
    details: '99% Pure, Sigma-Aldrich',
    qty: 1.2,
    unit: 'kg',
    minQty: 1.0,
    expiryDate: '2026-07-20', // NEAR EXPIRY TRIGGER (expiring in less than 1 month from current 2026-07-01)
    picture: 'https://images.unsplash.com/photo-1518152006812-edab29b069ac?w=400&auto=format&fit=crop&q=60'
  },
  {
    id: 'CHEM-003',
    name: 'Ethanol 95%',
    details: 'Industrial Grade, QRëC',
    qty: 18.0,
    unit: 'L',
    minQty: 5.0,
    expiryDate: '2028-04-15',
    picture: 'https://images.unsplash.com/photo-1582719508461-905c673771fd?w=400&auto=format&fit=crop&q=60'
  },
  {
    id: 'CHEM-004',
    name: 'Silver Nitrate',
    details: 'Analytical Reagent, Sigma-Aldrich',
    qty: 0.05, // 50g
    unit: 'kg',
    minQty: 0.2, // LOW STOCK TRIGGER
    expiryDate: '2026-07-15', // NEAR EXPIRY TRIGGER
    picture: 'https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?w=400&auto=format&fit=crop&q=60'
  }
];

// Preloaded initial users
export const initialUsers: User[] = [
  {
    email: 'adisno@kku.ac.th',
    name: 'ผศ.ดร. อดิศร นามสกุลดี',
    role: 'Admin',
    status: 'Active',
    phone: '081-234-5678',
    department: 'สาขาวิชาเคมี',
    password: 'admin123',
    createdAt: '2026-01-01T08:00:00Z'
  },
  {
    email: 'somchai.s@kkumail.com',
    name: 'นายสมชาย สุขสบาย',
    role: 'Student',
    status: 'Active',
    phone: '089-999-8888',
    studentId: '653020123-4',
    advisor: 'ผศ.ดร. อดิศร นามสกุลดี',
    major: 'เคมีอนินทรีย์',
    createdAt: '2026-03-10T10:30:00Z'
  },
  {
    email: 'supaporn.k@kku.ac.th',
    name: 'ดร.สุภาพร แก้วมณี',
    role: 'Teacher',
    status: 'Pending', // Pending user waiting for approval
    phone: '084-555-1234',
    department: 'สาขาวิชาเคมี',
    password: 'securePassword123',
    createdAt: '2026-07-01T15:45:00Z'
  },
  {
    email: 'badstudent@kkumail.com',
    name: 'นายกิตติ เกเร',
    role: 'Student',
    status: 'Banned', // Banned user
    phone: '082-111-2222',
    studentId: '653029999-9',
    advisor: 'ผศ.ดร. อดิศร นามสกุลดี',
    major: 'เคมีวิเคราะห์',
    createdAt: '2026-02-15T09:00:00Z'
  }
];

// Preloaded initial bookings and loans to give the dashboard life
export const initialRequests: LabRequest[] = [
  {
    id: 'REQ-1001',
    type: 'instrument',
    userEmail: 'somchai.s@kkumail.com',
    userName: 'นายสมชาย สุขสบาย',
    userPhone: '089-999-8888',
    instrumentId: 'Inorganic001',
    instrumentName: 'Sunction pump (Merck wp6222050)',
    requestDate: '2026-06-30T14:22:00Z',
    startDate: '2026-07-02T09:00',
    endDate: '2026-07-02T12:00',
    purpose: 'ใช้กรองสารตะกอนทองแดงสำหรับการทดลองวิชา Inorganic Chem',
    status: 'Pending'
  },
  {
    id: 'REQ-1002',
    type: 'glassware',
    userEmail: 'somchai.s@kkumail.com',
    userName: 'นายสมชาย สุขสบาย',
    userPhone: '089-999-8888',
    items: [
      { id: 'GW-001', name: 'Beaker 250mL', qty: 3 },
      { id: 'GW-002', name: 'Erlenmeyer Flask 250mL', qty: 2 }
    ],
    requestDate: '2026-06-29T10:15:00Z',
    startDate: '2026-06-30T09:00',
    endDate: '2026-07-05T16:00',
    purpose: 'ทำโปรเจกต์เคมีสังเคราะห์',
    status: 'Approved'
  },
  {
    id: 'REQ-1003',
    type: 'chemical',
    actionType: 'withdraw',
    userEmail: 'somchai.s@kkumail.com',
    userName: 'นายสมชาย สุขสบาย',
    userPhone: '089-999-8888',
    items: [
      { id: 'CHEM-001', name: 'Hydrochloric Acid 37%', qty: 0.5, unit: 'L' }
    ],
    requestDate: '2026-06-28T08:00:00Z',
    startDate: '2026-06-28T10:00',
    purpose: 'ปรับค่า pH ของสารละลายเตรียมทำปฏิกิริยา',
    status: 'Returned'
  },
  {
    id: 'REQ-1004',
    type: 'glassware',
    userEmail: 'somchai.s@kkumail.com',
    userName: 'นายสมชาย สุขสบาย',
    userPhone: '089-999-8888',
    items: [
      { id: 'GW-004', name: 'Graduated Cylinder 50mL', qty: 1 }
    ],
    requestDate: '2026-06-15T11:00:00Z',
    startDate: '2026-06-15T13:00',
    endDate: '2026-06-25T16:00', // OVERDUE: End date is before July 1, 2026, status should show Overdue
    purpose: 'ตวงปริมาตรสารละลายโครเมียม',
    status: 'Approved' // The background checker or UI will automatically mark/show this as Overdue if it's past endDate and still 'Approved'
  }
];
