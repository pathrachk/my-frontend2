/**
 * ==============================================================================
 * ไฟล์: src/components/SlipVerifyModal.jsx
 * หน้าที่: หน้าต่างป๊อปอัปตรวจสอบสลิปการโอนเงินโดยผู้ดูแล (Slip Verification Modal)
 * ==============================================================================
 * รายละเอียดการทำงาน:
 * 1. รับข้อมูลใบแจ้งหนี้ที่มีการอัปโหลดสลิปค้างไว้ (`invoice`)
 * 2. แสดงยอดเงินที่ต้องชำระ, รอบบิล, วันที่อัปโหลดสลิป และภาพสลิปที่ผู้เช่าแนบมา
 * 3. มีช่องกรอกหมายเหตุการตรวจสอบ (notes)
 * 4. มี 2 ปุ่มการดำเนินการ:
 *    - อนุมัติการชำระเงิน (Approve): ปรับสถานะบิลเป็น 'paid' (ชำระแล้ว)
 *    - ปฏิเสธสลิป (Reject): ปรับสถานะเพื่อแจ้งผู้เช่าให้อัปโหลดใหม่
 * 5. ส่งคำขอผ่าน `api.verifySlip()`
 * 
 * Props:
 * - isOpen: Boolean เปิด/ปิด Modal
 * - onClose: Callback ปิดหน้าต่าง
 * - invoice: Object ข้อมูลใบแจ้งหนี้และสลิปที่เลือกตรวจสอบ
 * - onVerified: Callback แจ้งเตือน Parent เมื่อตรวจสอบเสร็จสิ้น เพื่อรีเฟรชข้อมูล
 */

import React, { useState } from 'react';
import { X, CheckCircle, XCircle, AlertCircle, Eye } from 'lucide-react';
import './SlipVerifyModal.css';
import { api } from '../services/api';

export default function SlipVerifyModal({ isOpen, onClose, invoice, onVerified }) {
  // บันทึกหมายเหตุเพิ่มเติมในการตรวจสอบ
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  if (!isOpen || !invoice) return null;

  /**
   * ฟังก์ชันจัดการการอนุมัติหรือปฏิเสธสลิป
   * @param {'approve'|'reject'} action - ผลการตรวจสอบ
   */
  const handleAction = async (action) => {
    setLoading(true);
    setErrorMsg('');
    try {
      await api.verifySlip(invoice.id, action, notes);
      onVerified();
      onClose();
    } catch (err) {
      setErrorMsg(err.message || 'เกิดข้อผิดพลาดในการตรวจสอบสลิป');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="slip-modal-backdrop">
      <div className="slip-modal-card">
        {/* ส่วนหัว Modal */}
        <div className="slip-modal-header">
          <div className="slip-header-brand">
            <div className="slip-header-icon">
              <Eye size={20} />
            </div>
            <div>
              <h3 className="room-header-title">ตรวจสอบสลิปการโอนเงิน</h3>
              <p className="room-header-desc">ห้อง {invoice.room_number} - {invoice.tenant_name}</p>
            </div>
          </div>
          <button onClick={onClose} className="invoice-btn-close">
            <X size={18} />
          </button>
        </div>

        {/* เนื้อหาการตรวจสอบ */}
        <div className="slip-modal-body">
          {errorMsg && (
            <div className="calc-alert calc-alert-error">
              <AlertCircle size={16} /> {errorMsg}
            </div>
          )}

          {/* สรุปยอดเงินและรอบบิล */}
          <div className="slip-summary-card">
            <div>
              <span style={{ fontSize: '12px', color: '#64748b' }}>ยอดที่ต้องชำระ:</span>
              <div style={{ fontSize: '22px', fontWeight: '900', color: '#ff3377' }}>
                ฿{Number(invoice.grand_total).toLocaleString()}
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <span style={{ fontSize: '12px', color: '#64748b' }}>รอบบิล:</span>
              <div style={{ fontWeight: '700', color: '#1e293b' }}>{invoice.billing_month}</div>
              {invoice.slip_uploaded_at && (
                <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '2px' }}>
                  อัปโหลดเมื่อ: {invoice.slip_uploaded_at}
                </div>
              )}
            </div>
          </div>

          {/* ภาพสลิปการโอนเงิน */}
          <div className="slip-img-container">
            {invoice.slip_url ? (
              <img
                src={invoice.slip_url}
                alt="สลิปการโอนเงิน"
                className="slip-img-preview"
              />
            ) : (
              <div style={{ padding: '40px', color: '#94a3b8', fontSize: '13px' }}>ไม่พบรูปภาพสลิป</div>
            )}
          </div>

          {/* ช่องระบุหมายเหตุการตรวจสอบ */}
          <div className="calc-field-group">
            <label className="calc-label">หมายเหตุการตรวจสอบ (ไม่บังคับ)</label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="เช่น ยอดเงินตรงตามบิล / สลิปไม่ชัดเจน"
              className="calc-input"
            />
          </div>

          {/* ปุ่มอนุมัติและปฏิเสธ */}
          <div className="slip-actions-grid">
            <button
              onClick={() => handleAction('reject')}
              disabled={loading}
              className="btn-reject"
            >
              <XCircle size={16} /> ปฏิเสธสลิป
            </button>
            <button
              onClick={() => handleAction('approve')}
              disabled={loading}
              className="btn-approve"
            >
              <CheckCircle size={16} /> อนุมัติการชำระเงิน
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
