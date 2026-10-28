/**
 * ==============================================================================
 * ไฟล์: src/services/api.js
 * หน้าที่: เลเยอร์บริการเชื่อมต่อเครือข่าย (API Service Layer)
 * ==============================================================================
 * รายละเอียดการทำงาน:
 * - รวบรวมฟังก์ชันเชื่อมต่อ HTTP Request ไปยัง Backend Server (my-backend)
 * - ใช้ Fetch API ในการรับส่งข้อมูล JSON กับ RESTful Endpoints
 * - จัดการข้อผิดพลาด (Error Handling) และตรวจสอบสถานะ Response
 * 
 * หมวดหมู่ของ API:
 * 1. Settings (การตั้งค่าหอพัก, อัตราค่าน้ำ ค่าไฟ เลขพร้อมเพย์)
 * 2. Rooms (ข้อมูลห้องพัก, เพิ่ม ลบ แก้ไข เคลียร์ประวัติห้อง)
 * 3. Invoices (จัดการบิลและใบแจ้งหนี้, คำนวณยอด, ดึงประวัติบิล)
 * 4. Slips (อัปโหลดสลิป, ยืนยันชำระเงิน, ตรวจสอบสลิปโดยแอดมิน)
 * 5. Dashboard Stats (สถิติภาพรวมหอพัก, ยอดค้างชำระ, อัตราการเข้าพัก)
 * 6. PromptPay QR (สร้างรูปภาพ QR Code พร้อมเพย์ตามยอดเงินจริง)
 * 7. Tenant Portal (พอร์ทัลผู้เช่า ดูประวัติบิลของห้องตนเอง)
 * 8. Authentication (เข้าสู่ระบบแอดมิน/ผู้เช่า, ตรวจสอบ PIN, เปลี่ยน PIN)
 */

// URL ฐานของ Backend API
const API_BASE_URL = 'http://localhost:3000/api';

export const api = {
  // ============================================================================
  // 1. หมวดการตั้งค่าหอพัก (Settings)
  // ============================================================================

  /**
   * ดึงข้อมูลการตั้งค่าหอพัก เช่น ชื่อหอพัก, ที่อยู่, เบอร์โทร, เลขพร้อมเพย์, อัตราค่าน้ำ/ไฟ
   * @returns {Promise<Object>} ข้อมูลการตั้งค่า
   */
  async getSettings() {
    const res = await fetch(`${API_BASE_URL}/settings`);
    if (!res.ok) throw new Error('Failed to fetch settings');
    return res.json();
  },

  /**
   * บันทึกแก้ไขการตั้งค่าหอพัก
   * @param {Object} data ข้อมูลการตั้งค่าชุดใหม่
   * @returns {Promise<Object>} ผลลัพธ์การบันทึก
   */
  async updateSettings(data) {
    const res = await fetch(`${API_BASE_URL}/settings`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Failed to update settings');
    return res.json();
  },

  // ============================================================================
  // 2. หมวดการจัดการห้องพัก (Rooms)
  // ============================================================================

  /**
   * ดึงรายการห้องพักทั้งหมด (สามารถส่ง filter เช่น floor หรือ status ได้)
   * @param {Object} params พารามิเตอร์การกรอง เช่น { floor: 2, status: 'vacant' }
   * @returns {Promise<Object>} รายการห้องพัก
   */
  async getRooms(params = {}) {
    const query = new URLSearchParams(params).toString();
    const res = await fetch(`${API_BASE_URL}/rooms${query ? `?${query}` : ''}`);
    if (!res.ok) throw new Error('Failed to fetch rooms');
    return res.json();
  },

  /**
   * ดึงรายละเอียดของห้องพักรายห้องตาม id
   * @param {number|string} id รหัสห้องพัก
   * @returns {Promise<Object>} ข้อมูลห้องพัก
   */
  async getRoom(id) {
    const res = await fetch(`${API_BASE_URL}/rooms/${id}`);
    if (!res.ok) throw new Error('Failed to fetch room');
    return res.json();
  },

  /**
   * สร้าง/เพิ่มห้องพักใหม่เข้าสู่ระบบ
   * @param {Object} data ข้อมูลห้องพัก เช่น room_number, floor, base_rent, tenant_name
   * @returns {Promise<Object>} ผลการบันทึก
   */
  async createRoom(data) {
    const res = await fetch(`${API_BASE_URL}/rooms`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    const result = await res.json();
    if (!res.ok || !result.success) throw new Error(result.error || 'Failed to create room');
    return result;
  },

  /**
   * แก้ไขข้อมูลห้องพักเดิมตาม id
   * @param {number|string} id รหัสห้องพัก
   * @param {Object} data ข้อมูลใหม่ที่ต้องการบันทึกทับ
   * @returns {Promise<Object>} ผลการบันทึก
   */
  async updateRoom(id, data) {
    const res = await fetch(`${API_BASE_URL}/rooms/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    const result = await res.json();
    if (!res.ok || !result.success) throw new Error(result.error || 'Failed to update room');
    return result;
  },

  /**
   * ลบห้องพักออกจากระบบตาม id
   * @param {number|string} id รหัสห้องพัก
   * @returns {Promise<Object>} ผลการลบ
   */
  async deleteRoom(id) {
    const res = await fetch(`${API_BASE_URL}/rooms/${id}`, {
      method: 'DELETE',
    });
    const result = await res.json();
    if (!res.ok || !result.success) throw new Error(result.error || 'Failed to delete room');
    return result;
  },

  /**
   * ล้างประวัติบิลทั้งหมดของห้องพักที่ระบุ
   * @param {number|string} id รหัสห้องพัก
   * @returns {Promise<Object>} ผลการล้างประวัติ
   */
  async clearRoomHistory(id) {
    const res = await fetch(`${API_BASE_URL}/rooms/${id}/history`, {
      method: 'DELETE',
    });
    const result = await res.json();
    if (!res.ok || !result.success) throw new Error(result.error || 'Failed to clear room history');
    return result;
  },

  // ============================================================================
  // 3. หมวดใบแจ้งหนี้และการคิดเงิน (Invoices & Billing)
  // ============================================================================

  /**
   * ดึงรายการใบแจ้งหนี้ทั้งหมด พร้อมตัวกรอง (เช่น เดือน หรือสถานะการชำระ)
   * @param {Object} params พารามิเตอร์การค้นหา เช่น { month: '2026-10', status: 'pending' }
   * @returns {Promise<Object>} รายการใบแจ้งหนี้
   */
  async getInvoices(params = {}) {
    const query = new URLSearchParams(params).toString();
    const res = await fetch(`${API_BASE_URL}/invoices${query ? `?${query}` : ''}`);
    if (!res.ok) throw new Error('Failed to fetch invoices');
    return res.json();
  },

  /**
   * ดึงรายละเอียดใบแจ้งหนี้ฉบับเต็มรายใบ (รวมข้อมูลหอพักและคิวอาร์โค้ดสำหรับพิมพ์)
   * @param {number|string} id รหัสใบแจ้งหนี้
   * @returns {Promise<Object>} ข้อมูลใบแจ้งหนี้ฉบับเต็ม
   */
  async getInvoice(id) {
    const res = await fetch(`${API_BASE_URL}/invoices/${id}`);
    if (!res.ok) throw new Error('Failed to fetch invoice details');
    return res.json();
  },

  /**
   * ดึงรายการบิลประวัติของห้องพักที่ระบุตามหมายเลขห้อง
   * @param {string} roomNumber หมายเลขห้องพัก เช่น '101'
   * @returns {Promise<Object>} ประวัติบิลของห้องนั้น
   */
  async getRoomInvoices(roomNumber) {
    const res = await fetch(`${API_BASE_URL}/invoices/room/${roomNumber}`);
    if (!res.ok) throw new Error('Failed to fetch room invoices');
    return res.json();
  },

  /**
   * สร้างใบแจ้งหนี้ใหม่ (คำนวณค่าน้ำ-ค่าไฟและค่าเช่าแล้วบันทึก)
   * @param {Object} data ข้อมูลใบแจ้งหนี้ เช่น room_id, billing_month, water_curr_meter, elec_curr_meter
   * @returns {Promise<Object>} บิลที่ถูกสร้างสำเร็จ
   */
  async createInvoice(data) {
    const res = await fetch(`${API_BASE_URL}/invoices`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    const result = await res.json();
    if (!res.ok || !result.success) throw new Error(result.error || 'Failed to create invoice');
    return result;
  },

  /**
   * แก้ไขข้อมูลใบแจ้งหนี้เดิม เช่น ปรับแก้มิเตอร์ หรือเปลี่ยนสถานะ
   * @param {number|string} id รหัสใบแจ้งหนี้
   * @param {Object} data ข้อมูลที่ต้องการอัปเดต
   * @returns {Promise<Object>} ผลการบันทึก
   */
  async updateInvoice(id, data) {
    const res = await fetch(`${API_BASE_URL}/invoices/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    const result = await res.json();
    if (!res.ok || !result.success) throw new Error(result.error || 'Failed to update invoice');
    return result;
  },

  /**
   * ลบใบแจ้งหนี้ออกจากระบบ
   * @param {number|string} id รหัสใบแจ้งหนี้
   * @returns {Promise<Object>} ผลการลบ
   */
  async deleteInvoice(id) {
    const res = await fetch(`${API_BASE_URL}/invoices/${id}`, {
      method: 'DELETE',
    });
    const result = await res.json();
    if (!res.ok || !result.success) throw new Error(result.error || 'Failed to delete invoice');
    return result;
  },

  // ============================================================================
  // 4. หมวดการจัดการสลิปการโอนเงิน (Slip Verification & Payment)
  // ============================================================================

  /**
   * ดึงรายการบิลที่มีการอัปโหลดสลิปค้างรอตรวจสอบโดยแอดมิน
   * @returns {Promise<Object>} รายการสลิปที่รอยืนยัน
   */
  async getPendingSlips() {
    const res = await fetch(`${API_BASE_URL}/invoices/pending-slips`);
    if (!res.ok) throw new Error('Failed to fetch pending slips');
    return res.json();
  },

  /**
   * ผู้เช่าส่งรูปสลิปการโอนเงินแนบกับใบแจ้งหนี้
   * @param {number|string} invoiceId รหัสใบแจ้งหนี้
   * @param {string} slipImageBase64 ข้อมูลรูปภาพในรูปแบบ Base64 Data URL
   * @param {boolean} confirmPayment ปรับสถานะเป็นจ่ายแล้วทันทีหรือไม่
   * @param {string} notes หมายเหตุเพิ่มเติม
   * @returns {Promise<Object>} ผลการอัปโหลด
   */
  async uploadSlip(invoiceId, slipImageBase64, confirmPayment = true, notes = '') {
    const res = await fetch(`${API_BASE_URL}/invoices/${invoiceId}/upload-slip`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ slip_image: slipImageBase64, confirm_payment: confirmPayment, notes }),
    });
    const result = await res.json();
    if (!res.ok || !result.success) throw new Error(result.error || 'Failed to upload slip');
    return result;
  },

  /**
   * ผู้เช่ายืนยันการชำระเงินโดยตรงผ่านระบบ
   * @param {number|string} invoiceId รหัสใบแจ้งหนี้
   * @param {string|null} slipImage รูปสลิป (ถ้ามี)
   * @param {string} notes ข้อความกำกับ
   * @returns {Promise<Object>} ผลการยืนยัน
   */
  async confirmPayment(invoiceId, slipImage = null, notes = '') {
    const res = await fetch(`${API_BASE_URL}/invoices/${invoiceId}/confirm-payment`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ slip_image: slipImage, notes }),
    });
    const result = await res.json();
    if (!res.ok || !result.success) throw new Error(result.error || 'Failed to confirm payment');
    return result;
  },

  /**
   * เจ้าของหอ/แอดมิน ตรวจสอบสลิป (อนุมัติ 'approve' หรือปฏิเสธ 'reject')
   * @param {number|string} invoiceId รหัสใบแจ้งหนี้
   * @param {'approve'|'reject'} action ผลการตรวจสอบ
   * @param {string} notes หมายเหตุ เช่น ยอดเงินครบถ้วน
   * @returns {Promise<Object>} ผลการตรวจสอบ
   */
  async verifySlip(invoiceId, action, notes = '') {
    const res = await fetch(`${API_BASE_URL}/invoices/${invoiceId}/verify-slip`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, notes }),
    });
    const result = await res.json();
    if (!res.ok || !result.success) throw new Error(result.error || 'Failed to verify slip');
    return result;
  },

  // ============================================================================
  // 5. สถิติแผงควบคุม (Dashboard Stats)
  // ============================================================================

  /**
   * ดึงสถิติรวมของระบบ เช่น จำนวนห้องว่าง/มีผู้เช่า, ยอดค้างชำระ, ยอดที่ชำระแล้ว, สลิปรอตรวจ
   * @returns {Promise<Object>} อ็อบเจกต์สถิติรวม
   */
  async getDashboardStats() {
    const res = await fetch(`${API_BASE_URL}/dashboard/stats`);
    if (!res.ok) throw new Error('Failed to fetch dashboard stats');
    return res.json();
  },

  // ============================================================================
  // 6. พร้อมเพย์ คิวอาร์โค้ด (PromptPay QR Code)
  // ============================================================================

  /**
   * ขอให้เซิร์ฟเวอร์สร้าง PromptPay QR Code ตามหมายเลขพร้อมเพย์และยอดเงิน
   * @param {string} target เบอร์โทรศัพท์ หรือเลขประจำตัวประชาชนของผู้รับเงิน
   * @param {number} amount ยอดเงินที่ต้องชำระ (บาท)
   * @returns {Promise<Object>} ภาพ QR Code ในรูปแบบ Data URL (Base64)
   */
  async generatePromptPay(target, amount) {
    const params = new URLSearchParams();
    if (target) params.append('target', target);
    if (amount) params.append('amount', amount);
    const res = await fetch(`${API_BASE_URL}/promptpay/generate?${params.toString()}`);
    if (!res.ok) throw new Error('Failed to generate PromptPay QR');
    return res.json();
  },

  // ============================================================================
  // 7. พอร์ทัลผู้เช่า (Tenant Portal API)
  // ============================================================================

  /**
   * ดึงข้อมูลห้องพักและประวัติใบแจ้งหนี้สำหรับผู้เช่าห้อง
   * @param {string} roomNumber หมายเลขห้องพัก
   * @param {string} pin รหัส PIN ป้องกันการเข้าถึง (ไม่บังคับ)
   * @returns {Promise<Object>} รายละเอียดห้องและบิลทั้งหมด
   */
  async getTenantHistory(roomNumber, pin = '') {
    const params = new URLSearchParams({ room_number: roomNumber });
    if (pin) params.append('pin', pin);
    const res = await fetch(`${API_BASE_URL}/tenant/room-history?${params.toString()}`);
    const result = await res.json();
    if (!res.ok || !result.success) throw new Error(result.error || 'Failed to fetch tenant history');
    return result;
  },

  // ============================================================================
  // 8. การยืนยันตัวตนและความปลอดภัย (Authentication)
  // ============================================================================

  /**
   * เข้าสู่ระบบด้วยชื่อผู้ใช้และรหัสผ่าน (รองรับทั้ง Admin และ Tenant)
   * @param {string} username ชื่อผู้ใช้งาน
   * @param {string} password รหัสผ่าน
   * @returns {Promise<Object>} ข้อมูลผู้ใช้และสิทธิ์การเข้าถึง (role: 'admin' หรือ 'tenant')
   */
  async login(username, password) {
    const res = await fetch(`${API_BASE_URL}/auth/admin-login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });
    const result = await res.json();
    if (!res.ok || !result.success) throw new Error(result.error || 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง');
    return result;
  },

  /**
   * เข้าสู่ระบบเจ้าของหอพักด้วยรหัส PIN ด่วน
   * @param {string} pin รหัส PIN 4-6 หลัก
   * @returns {Promise<Object>} ข้อมูลแอดมิน
   */
  async adminLogin(pin) {
    const res = await fetch(`${API_BASE_URL}/auth/admin-login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pin }),
    });
    const result = await res.json();
    if (!res.ok || !result.success) throw new Error(result.error || 'PIN ไม่ถูกต้อง');
    return result;
  },

  /**
   * เปลี่ยนรหัส PIN ผู้ดูแลระบบ
   * @param {string} oldPin รหัส PIN เดิม
   * @param {string} newPin รหัส PIN ใหม่ที่ต้องการตั้ง
   * @returns {Promise<Object>} ผลการเปลี่ยนรหัสผ่าน
   */
  async changeAdminPin(oldPin, newPin) {
    const res = await fetch(`${API_BASE_URL}/auth/change-pin`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ old_pin: oldPin, new_pin: newPin }),
    });
    const result = await res.json();
    if (!res.ok || !result.success) throw new Error(result.error || 'Failed to change PIN');
    return result;
  },
};
