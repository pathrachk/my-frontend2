/**
 * ==============================================================================
 * ไฟล์: src/components/EditInvoiceModal.jsx
 * หน้าที่: หน้าต่างป๊อปอัปแก้ไขข้อมูลใบแจ้งหนี้เดิม (Edit Invoice Modal)
 * ==============================================================================
 * รายละเอียดการทำงาน:
 * 1. รับข้อมูลใบแจ้งหนี้เดิม (`invoice`) มาตั้งเป็น State เริ่มต้นในฟอร์ม
 * 2. รองรับการแก้ไขข้อมูลทุกฟิลด์:
 *    - ข้อมูลผู้เช่า: ชื่อ, เบอร์โทรศัพท์, รอบบิล, วันที่ออกบิล, วันครบกำหนดชำระ
 *    - สถานะการชำระเงิน: 'pending' (รอชำระ), 'paid' (ชำระแล้ว), 'overdue' (เกินกำหนด)
 *    - มิเตอร์น้ำ-ไฟ: เลขก่อนหน้า, เลขปัจจุบัน, วิธีคิดคำนวณ (หน่วย/เหมาจ่าย), อัตราต่อหน่วย
 *    - ค่าใช้จ่ายอื่นๆ: ค่าห้อง, ค่าส่วนกลาง, ค่าอื่นๆ พร้อมระบุรายละเอียด, ส่วนลด
 * 3. คำนวณยอดเงินและหน่วยการใช้งานใหม่แบบเรียลไทม์ทันทีที่มีการเปลี่ยนแปลง
 * 4. บันทึกข้อมูลที่แก้ไขกลับสู่ฐานข้อมูลผ่าน `api.updateInvoice()`
 * 
 * Props:
 * - isOpen: Boolean เปิดหรือปิด Modal
 * - invoice: Object ข้อมูลใบแจ้งหนี้ที่ต้องการแก้ไข
 * - onClose: Callback เมื่อปิดหน้าต่าง
 * - onSaved: Callback แจ้งเตือน Parent Component ให้โหลดข้อมูลใหม่หลังจากบันทึกเสร็จ
 */

import React, { useState, useEffect } from 'react';
import {
  X,
  Edit3,
  Droplets,
  Zap,
  Save,
  AlertCircle,
  CheckCircle,
  Building,
  Calendar,
  CreditCard,
  User,
  Phone,
  FileText
} from 'lucide-react';
import './EditInvoiceModal.css';
import { api } from '../services/api';

export default function EditInvoiceModal({ isOpen, invoice, onClose, onSaved }) {
  // ข้อมูลผู้เช่าและรอบบิล
  const [tenantName, setTenantName] = useState('');
  const [tenantPhone, setTenantPhone] = useState('');
  const [billingMonth, setBillingMonth] = useState('');
  const [issueDate, setIssueDate] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [paymentStatus, setPaymentStatus] = useState('pending');

  // ค่าเช่าห้อง
  const [roomRent, setRoomRent] = useState(0);

  // ข้อมูลมิเตอร์น้ำประปา
  const [waterCalcType, setWaterCalcType] = useState('unit');
  const [waterPrev, setWaterPrev] = useState(0);
  const [waterCurr, setWaterCurr] = useState(0);
  const [waterRate, setWaterRate] = useState(6);

  // ข้อมูลมิเตอร์ไฟฟ้า
  const [elecPrev, setElecPrev] = useState(0);
  const [elecCurr, setElecCurr] = useState(0);
  const [elecRate, setElecRate] = useState(7);

  // ค่าบริการอื่นๆ และส่วนลด
  const [commonFee, setCommonFee] = useState(100);
  const [otherFees, setOtherFees] = useState(0);
  const [otherFeesDetail, setOtherFeesDetail] = useState('');
  const [discount, setDiscount] = useState(0);

  // สถานะการโหลดและข้อความแจ้งเตือน
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // --------------------------------------------------------------------------
  // ซิงค์ค่าจากบิลเดิมที่ส่งเข้ามา (invoice prop) เข้าสู่ State เมื่อเปิด Modal
  // --------------------------------------------------------------------------
  useEffect(() => {
    if (invoice && isOpen) {
      setTenantName(invoice.tenant_name || '');
      setTenantPhone(invoice.tenant_phone || '');
      setBillingMonth(invoice.billing_month || '');
      setIssueDate(invoice.issue_date || '');
      setDueDate(invoice.due_date || '');
      setPaymentStatus(invoice.payment_status || 'pending');

      setRoomRent(Number(invoice.room_rent) || 0);

      setWaterCalcType(invoice.water_calc_type || 'unit');
      setWaterPrev(Number(invoice.water_prev_meter) || 0);
      setWaterCurr(Number(invoice.water_curr_meter) || 0);
      setWaterRate(Number(invoice.water_rate) || 6);

      setElecPrev(Number(invoice.elec_prev_meter) || 0);
      setElecCurr(Number(invoice.elec_curr_meter) || 0);
      setElecRate(Number(invoice.elec_rate) || 7);

      setCommonFee(Number(invoice.common_fee) || 0);
      setOtherFees(Number(invoice.other_fees) || 0);
      setOtherFeesDetail(invoice.other_fees_detail || '');
      setDiscount(Number(invoice.discount) || 0);

      setErrorMsg('');
      setSuccessMsg('');
    }
  }, [invoice, isOpen]);

  if (!isOpen || !invoice) return null;

  // --------------------------------------------------------------------------
  // การคำนวณยอดเงินและหน่วยตามค่าที่แก้ไข (Real-time Calculations)
  // --------------------------------------------------------------------------
  const wPrevNum = parseFloat(waterPrev) || 0;
  const wCurrNum = parseFloat(waterCurr) || 0;
  const waterUnits = Math.max(0, wCurrNum - wPrevNum);
  const waterTotal = waterCalcType === 'flat'
    ? (parseFloat(waterRate) || 150)
    : waterUnits * (parseFloat(waterRate) || 0);

  const ePrevNum = parseFloat(elecPrev) || 0;
  const eCurrNum = parseFloat(elecCurr) || 0;
  const elecUnits = Math.max(0, eCurrNum - ePrevNum);
  const elecTotal = elecUnits * (parseFloat(elecRate) || 0);

  const rentNum = parseFloat(roomRent) || 0;
  const commonNum = parseFloat(commonFee) || 0;
  const otherNum = parseFloat(otherFees) || 0;
  const discountNum = parseFloat(discount) || 0;

  // ยอดรวมสุทธิหลังหักส่วนลด
  const grandTotal = Math.max(0, rentNum + waterTotal + elecTotal + commonNum + otherNum - discountNum);

  /**
   * ฟังก์ชันบันทึกการแก้ไขข้อมูลใบแจ้งหนี้
   */
  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');
    setLoading(true);

    try {
      const payload = {
        tenant_name: tenantName.trim(),
        tenant_phone: tenantPhone.trim(),
        billing_month: billingMonth,
        issue_date: issueDate,
        due_date: dueDate,
        payment_status: paymentStatus,
        room_rent: rentNum,
        water_prev_meter: wPrevNum,
        water_curr_meter: wCurrNum,
        water_units: waterUnits,
        water_rate: parseFloat(waterRate) || 0,
        water_calc_type: waterCalcType,
        water_total: waterTotal,
        elec_prev_meter: ePrevNum,
        elec_curr_meter: eCurrNum,
        elec_units: elecUnits,
        elec_rate: parseFloat(elecRate) || 0,
        elec_total: elecTotal,
        common_fee: commonNum,
        other_fees: otherNum,
        other_fees_detail: otherFeesDetail.trim(),
        discount: discountNum,
        grand_total: grandTotal,
      };

      await api.updateInvoice(invoice.id, payload);
      setSuccessMsg('บันทึกการแก้ไขใบแจ้งหนี้สำเร็จ!');

      setTimeout(() => {
        if (onSaved) onSaved();
        onClose();
      }, 700);
    } catch (err) {
      setErrorMsg(err.message || 'เกิดข้อผิดพลาดในการบันทึกการแก้ไข');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="edit-inv-modal-backdrop">
      <div className="edit-inv-modal-card">
        {/* ส่วนหัวของหน้าต่างแก้ไขบิล */}
        <div className="edit-inv-modal-header">
          <div className="edit-inv-header-brand">
            <div className="edit-inv-header-icon">
              <Edit3 size={20} />
            </div>
            <div>
              <h3 className="edit-inv-header-title">แก้ไขใบแจ้งหนี้</h3>
              <p className="edit-inv-header-desc">
                เลขที่: <span className="font-semibold text-slate-800">{invoice.invoice_no}</span> | ห้อง {invoice.room_number}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition"
          >
            <X size={18} />
          </button>
        </div>

        {/* ฟอร์มแก้ไขข้อมูล */}
        <form onSubmit={handleSubmit} className="edit-inv-form">
          {errorMsg && (
            <div className="edit-inv-alert edit-inv-alert-error">
              <AlertCircle size={16} />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="edit-inv-alert edit-inv-alert-success">
              <CheckCircle size={16} />
              <span>{successMsg}</span>
            </div>
          )}

          {/* ส่วนที่ 1: ข้อมูลผู้เช่าและรอบบิล */}
          <div className="edit-inv-section">
            <div className="edit-inv-section-title">
              <User size={15} className="text-[#ff3377]" />
              <span>ข้อมูลผู้เช่าและรอบบิล</span>
            </div>

            <div className="edit-inv-grid-3">
              <div className="edit-inv-field">
                <label>ชื่อผู้เช่า</label>
                <input
                  type="text"
                  value={tenantName}
                  onChange={(e) => setTenantName(e.target.value)}
                  className="edit-inv-input"
                />
              </div>

              <div className="edit-inv-field">
                <label>เบอร์โทรศัพท์</label>
                <input
                  type="text"
                  value={tenantPhone}
                  onChange={(e) => setTenantPhone(e.target.value)}
                  className="edit-inv-input"
                />
              </div>

              <div className="edit-inv-field">
                <label>สถานะการชำระเงิน</label>
                <select
                  value={paymentStatus}
                  onChange={(e) => setPaymentStatus(e.target.value)}
                  className="edit-inv-select font-semibold"
                >
                  <option value="pending">⏳ รอการชำระเงิน (Pending)</option>
                  <option value="paid">✅ ชำระเงินแล้ว (Paid)</option>
                  <option value="overdue">⚠️ เกินกำหนดชำระ (Overdue)</option>
                </select>
              </div>
            </div>

            <div className="edit-inv-grid-3 mt-3">
              <div className="edit-inv-field">
                <label>รอบบิล (YYYY-MM)</label>
                <input
                  type="month"
                  value={billingMonth}
                  onChange={(e) => setBillingMonth(e.target.value)}
                  className="edit-inv-input"
                  required
                />
              </div>

              <div className="edit-inv-field">
                <label>วันที่ออกบิล</label>
                <input
                  type="date"
                  value={issueDate}
                  onChange={(e) => setIssueDate(e.target.value)}
                  className="edit-inv-input"
                />
              </div>

              <div className="edit-inv-field">
                <label>กำหนดชำระ</label>
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="edit-inv-input"
                />
              </div>
            </div>
          </div>

          {/* ส่วนที่ 2: ค่าเช่าห้องพัก */}
          <div className="edit-inv-section">
            <div className="edit-inv-section-title">
              <Building size={15} className="text-[#ff3377]" />
              <span>ค่าเช่าห้อง</span>
            </div>

            <div className="edit-inv-grid-2">
              <div className="edit-inv-field">
                <label>ค่าเช่าห้อง (บาท)</label>
                <input
                  type="number"
                  step="any"
                  value={roomRent}
                  onChange={(e) => setRoomRent(e.target.value)}
                  className="edit-inv-input font-bold"
                />
              </div>
              <div className="edit-inv-field flex items-end">
                <div className="text-xs text-slate-500 pb-2">
                  * กำหนดค่าเช่าห้องสำหรับรอบบิลนี้โดยเฉพาะ (เว้นว่างเป็น 0 ได้)
                </div>
              </div>
            </div>
          </div>

          {/* ส่วนที่ 3: มิเตอร์น้ำประปา */}
          <div className="edit-inv-section edit-inv-water-box">
            <div className="flex items-center justify-between mb-2">
              <div className="edit-inv-section-title text-sky-800">
                <Droplets size={15} />
                <span>มิเตอร์น้ำประปา</span>
              </div>
              <div className="flex items-center gap-3 text-xs text-sky-900">
                <label className="inline-flex items-center gap-1 cursor-pointer">
                  <input
                    type="radio"
                    name="editWaterCalc"
                    checked={waterCalcType === 'unit'}
                    onChange={() => setWaterCalcType('unit')}
                  />
                  <span>คิดตามหน่วย</span>
                </label>
                <label className="inline-flex items-center gap-1 cursor-pointer">
                  <input
                    type="radio"
                    name="editWaterCalc"
                    checked={waterCalcType === 'flat'}
                    onChange={() => setWaterCalcType('flat')}
                  />
                  <span>เหมาจ่าย</span>
                </label>
              </div>
            </div>

            <div className="edit-inv-grid-4">
              <div className="edit-inv-field">
                <label>มิเตอร์ก่อน</label>
                <input
                  type="number"
                  step="any"
                  value={waterPrev}
                  onChange={(e) => setWaterPrev(e.target.value)}
                  className="edit-inv-input"
                />
              </div>
              <div className="edit-inv-field">
                <label>มิเตอร์หลัง</label>
                <input
                  type="number"
                  step="any"
                  value={waterCurr}
                  onChange={(e) => setWaterCurr(e.target.value)}
                  className="edit-inv-input font-bold"
                />
              </div>
              <div className="edit-inv-field">
                <label>ราคา/หน่วย (บาท)</label>
                <input
                  type="number"
                  step="any"
                  value={waterRate}
                  onChange={(e) => setWaterRate(e.target.value)}
                  className="edit-inv-input"
                />
              </div>
              <div className="edit-inv-field">
                <label>รวมค่าน้ำ ({waterUnits} น.)</label>
                <div className="edit-inv-badge-value text-sky-700 bg-sky-100">
                  ฿{waterTotal.toLocaleString()}
                </div>
              </div>
            </div>
          </div>

          {/* ส่วนที่ 4: มิเตอร์ไฟฟ้า */}
          <div className="edit-inv-section edit-inv-elec-box">
            <div className="edit-inv-section-title text-amber-800 mb-2">
              <Zap size={15} />
              <span>มิเตอร์ไฟฟ้า</span>
            </div>

            <div className="edit-inv-grid-4">
              <div className="edit-inv-field">
                <label>มิเตอร์ก่อน</label>
                <input
                  type="number"
                  step="any"
                  value={elecPrev}
                  onChange={(e) => setElecPrev(e.target.value)}
                  className="edit-inv-input"
                />
              </div>
              <div className="edit-inv-field">
                <label>มิเตอร์หลัง</label>
                <input
                  type="number"
                  step="any"
                  value={elecCurr}
                  onChange={(e) => setElecCurr(e.target.value)}
                  className="edit-inv-input font-bold"
                />
              </div>
              <div className="edit-inv-field">
                <label>ราคา/หน่วย (บาท)</label>
                <input
                  type="number"
                  step="any"
                  value={elecRate}
                  onChange={(e) => setElecRate(e.target.value)}
                  className="edit-inv-input"
                />
              </div>
              <div className="edit-inv-field">
                <label>รวมค่าไฟ ({elecUnits} น.)</label>
                <div className="edit-inv-badge-value text-amber-700 bg-amber-100">
                  ฿{elecTotal.toLocaleString()}
                </div>
              </div>
            </div>
          </div>

          {/* ส่วนที่ 5: ค่าใช้จ่ายอื่นๆ และส่วนลด */}
          <div className="edit-inv-section">
            <div className="edit-inv-section-title">
              <FileText size={15} className="text-[#ff3377]" />
              <span>ค่าส่วนกลาง ค่าอื่นๆ และส่วนลด</span>
            </div>

            <div className="edit-inv-grid-3">
              <div className="edit-inv-field">
                <label>ค่าส่วนกลาง (บาท)</label>
                <input
                  type="number"
                  step="any"
                  value={commonFee}
                  onChange={(e) => setCommonFee(e.target.value)}
                  className="edit-inv-input"
                />
              </div>

              <div className="edit-inv-field">
                <label>ค่าอื่นๆ (บาท)</label>
                <input
                  type="number"
                  step="any"
                  value={otherFees}
                  onChange={(e) => setOtherFees(e.target.value)}
                  className="edit-inv-input"
                />
              </div>

              <div className="edit-inv-field">
                <label>รายละเอียดค่าอื่นๆ</label>
                <input
                  type="text"
                  value={otherFeesDetail}
                  onChange={(e) => setOtherFeesDetail(e.target.value)}
                  placeholder="เช่น ที่จอดรถ, ค่าคีย์การ์ด"
                  className="edit-inv-input"
                />
              </div>
            </div>

            <div className="edit-inv-grid-3 mt-3">
              <div className="edit-inv-field">
                <label>ส่วนลด (บาท)</label>
                <input
                  type="number"
                  step="any"
                  value={discount}
                  onChange={(e) => setDiscount(e.target.value)}
                  className="edit-inv-input font-semibold text-emerald-600"
                />
              </div>
            </div>
          </div>

          {/* แถบสรุปยอดรวมสุทธิ */}
          <div className="edit-inv-summary-banner">
            <div>
              <div className="text-xs text-white/80 font-medium">ยอดรวมสุทธิใหม่ (Grand Total)</div>
              <div className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                ฿{grandTotal.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
              <div className="text-[11px] text-white/70">
                (ห้อง ฿{rentNum.toLocaleString()} + น้ำ ฿{waterTotal.toLocaleString()} + ไฟ ฿{elecTotal.toLocaleString()} + ส่วนกลาง ฿{commonNum.toLocaleString()} + อื่นๆ ฿{otherNum.toLocaleString()} - ส่วนลด ฿{discountNum.toLocaleString()})
              </div>
            </div>
          </div>

          {/* ปุ่มบันทึกการแก้ไขและยกเลิก */}
          <div className="edit-inv-footer">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 font-semibold text-sm transition"
            >
              ยกเลิก
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 text-white font-bold text-sm shadow-md shadow-pink-500/25 transition flex items-center gap-2"
            >
              <Save size={16} />
              <span>{loading ? 'กำลังบันทึก...' : 'บันทึกการแก้ไข'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
