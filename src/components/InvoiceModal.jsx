/**
 * ==============================================================================
 * ไฟล์: src/components/InvoiceModal.jsx
 * หน้าที่: หน้าต่างแสดงและพิมพ์ใบแจ้งหนี้/ใบเสร็จรับเงิน (Printable Invoice Modal)
 * ==============================================================================
 * รายละเอียดการทำงาน:
 * 1. รับข้อมูลใบแจ้งหนี้แบบละเอียด (`invoiceData`) ซึ่งมีทั้งข้อมูลบิลและการตั้งค่าหอพัก
 * 2. แสดงตราสัญลักษณ์ ชื่อหอพัก ที่อยู่ และเบอร์โทรศัพท์ของหอพัก
 * 3. แสดงตารางแจกแจงรายการค่าใช้จ่ายอย่างเป็นทางการ:
 *    - ค่าเช่าห้องพักรายเดือน
 *    - ค่าน้ำประปา (พร้อมมิเตอร์ก่อน-หลัง และจำนวนหน่วย)
 *    - ค่าไฟฟ้า (พร้อมมิเตอร์ก่อน-หลัง และจำนวนหน่วย)
 *    - ค่าส่วนกลาง, ค่าใช้จ่ายอื่นๆ และส่วนลดพิเศษ
 *    - ยอดรวมสุทธิ (Grand Total)
 * 4. แสดงช่องทางการชำระเงินและรูปภาพ PromptPay QR Code ตามยอดจริง
 * 5. รองรับการสั่งพิมพ์ใบเสร็จผ่านเบราว์เซอร์ (`window.print()`) โดยซ่อนปุ่มควบคุมขณะพิมพ์
 * 
 * Props:
 * - invoiceData: Object { data: invoiceObject } ข้อมูลใบแจ้งหนี้ฉบับเต็ม
 * - onClose: Callback สำหรับปิดหน้าต่าง
 */

import React from 'react';
import { X, Printer, QrCode, Building, CheckCircle, Clock, AlertCircle } from 'lucide-react';
import './InvoiceModal.css';

export default function InvoiceModal({ invoiceData, onClose }) {
  if (!invoiceData) return null;

  // แยกข้อมูลใบแจ้งหนี้ และการตั้งค่าหอพักออกจาก Object
  const { data: inv } = invoiceData;
  const settings = inv?.settings || {};

  /**
   * สั่งพิมพ์ใบแจ้งหนี้ผ่านฟังก์ชัน Print ของเบราว์เซอร์
   */
  const handlePrint = () => {
    window.print();
  };

  /**
   * ฟังก์ชันช่วยแสดง Badge สถานะการชำระเงิน
   * @param {string} status สถานะของบิล ('paid' | 'overdue' | 'pending')
   */
  const renderStatusBadge = (status) => {
    switch (status) {
      case 'paid':
        return (
          <span className="badge-status badge-paid">
            <CheckCircle size={13} /> ชำระเงินแล้ว
          </span>
        );
      case 'overdue':
        return (
          <span className="badge-status badge-overdue">
            <AlertCircle size={13} /> เกินกำหนดชำระ
          </span>
        );
      default:
        return (
          <span className="badge-status badge-pending">
            <Clock size={13} /> รอการชำระเงิน
          </span>
        );
    }
  };

  return (
    <div className="invoice-modal-backdrop">
      <div className="invoice-modal-card">
        {/* แถบหัวด้านบนของ Modal (จะถูกซ่อนไว้โดยอัตโนมัติเมื่อสั่งพิมพ์ @media print) */}
        <div className="invoice-modal-header">
          <div className="invoice-modal-title">
            <Building size={18} color="#ff3377" />
            <span>ใบแจ้งหนี้ค่าเช่าและสาธารณูปโภค</span>
          </div>
          <div className="invoice-modal-actions">
            <button onClick={handlePrint} className="invoice-btn-print">
              <Printer size={15} /> พิมพ์ใบเสร็จ
            </button>
            <button onClick={onClose} className="invoice-btn-close">
              <X size={18} />
            </button>
          </div>
        </div>

        {/* แผ่นกระดาษใบแจ้งหนี้ (Printable Invoice Sheet) */}
        <div className="invoice-sheet">
          {/* ส่วนหัวใบแจ้งหนี้: ข้อมูลหอพัก และเลขที่ใบแจ้งหนี้ */}
          <div className="invoice-dorm-header">
            <div>
              <h2 className="invoice-dorm-name">{settings.dorm_name || 'หอพักเดอะเลคเตอร์'}</h2>
              <p className="invoice-dorm-meta">{settings.address || '99/123 ซอยมหาวิทยาลัย ถ.พหลโยธิน แขวงลาดยาว เขตจตุจักร กรุงเทพฯ 10900'}</p>
              <p className="invoice-dorm-meta">โทร: {settings.phone || '081-234-5678'}</p>
            </div>
            <div>
              <div className="invoice-tag-label">INVOICE</div>
              <p className="invoice-number-text">{inv.invoice_no}</p>
              <div style={{ textAlign: 'right', marginTop: '6px' }}>{renderStatusBadge(inv.payment_status)}</div>
            </div>
          </div>

          {/* รายละเอียดผู้เช่าและวันที่รอบบิล */}
          <div className="invoice-info-box">
            <div className="invoice-info-item">
              <label>หมายเลขห้องพัก:</label>
              <div className="val-highlight">ห้อง {inv.room_number}</div>
              <label style={{ marginTop: '8px' }}>ชื่อผู้เช่า:</label>
              <div className="val-secondary">{inv.tenant_name || 'ผู้เช่าห้อง'}</div>
              {inv.tenant_phone && <span style={{ fontSize: '11px', color: '#64748b' }}>โทร: {inv.tenant_phone}</span>}
            </div>
            <div className="invoice-info-item" style={{ textAlign: 'right' }}>
              <label>รอบบิลประจำเดือน:</label>
              <div className="val-highlight">{inv.billing_month}</div>
              <label style={{ marginTop: '8px' }}>วันที่ออกบิล:</label>
              <div className="val-secondary">{inv.issue_date}</div>
              <label style={{ marginTop: '4px' }}>กำหนดชำระ:</label>
              <div className="val-due">{inv.due_date}</div>
            </div>
          </div>

          {/* ตารางแสดงรายการค่าเช่า ค่าน้ำ ค่าไฟ และค่าบริการ */}
          <table className="invoice-table">
            <thead>
              <tr>
                <th>รายการ</th>
                <th className="col-center">มิเตอร์ก่อน</th>
                <th className="col-center">มิเตอร์หลัง</th>
                <th className="col-center">จำนวนหน่วย</th>
                <th className="col-right">ราคา/หน่วย</th>
                <th className="col-right">รวมเงิน (บาท)</th>
              </tr>
            </thead>
            <tbody>
              {/* รายการค่าเช่าห้อง */}
              <tr>
                <td><strong>ค่าเช่าห้องพัก</strong></td>
                <td className="col-center" style={{ color: '#94a3b8' }}>-</td>
                <td className="col-center" style={{ color: '#94a3b8' }}>-</td>
                <td className="col-center">1 เดือน</td>
                <td className="col-right">{Number(inv.room_rent).toLocaleString()}</td>
                <td className="col-right"><strong>{Number(inv.room_rent).toLocaleString()}</strong></td>
              </tr>

              {/* รายการค่าน้ำประปา */}
              <tr>
                <td>
                  <strong>ค่าน้ำประปา</strong>
                  {inv.water_calc_type === 'flat' && <span className="sub-tag">เหมาจ่าย</span>}
                </td>
                <td className="col-center">{inv.water_prev_meter}</td>
                <td className="col-center">{inv.water_curr_meter}</td>
                <td className="col-center"><strong>{inv.water_units}</strong></td>
                <td className="col-right">{inv.water_rate}</td>
                <td className="col-right"><strong>{Number(inv.water_total).toLocaleString()}</strong></td>
              </tr>

              {/* รายการค่าไฟฟ้า */}
              <tr>
                <td><strong>ค่าไฟฟ้า</strong></td>
                <td className="col-center">{inv.elec_prev_meter}</td>
                <td className="col-center">{inv.elec_curr_meter}</td>
                <td className="col-center"><strong>{inv.elec_units}</strong></td>
                <td className="col-right">{inv.elec_rate}</td>
                <td className="col-right"><strong>{Number(inv.elec_total).toLocaleString()}</strong></td>
              </tr>

              {/* รายการค่าส่วนกลาง (ถ้ามี) */}
              {Number(inv.common_fee) > 0 && (
                <tr>
                  <td>ค่าส่วนกลาง</td>
                  <td className="col-center" style={{ color: '#94a3b8' }}>-</td>
                  <td className="col-center" style={{ color: '#94a3b8' }}>-</td>
                  <td className="col-center">1</td>
                  <td className="col-right">{Number(inv.common_fee).toLocaleString()}</td>
                  <td className="col-right"><strong>{Number(inv.common_fee).toLocaleString()}</strong></td>
                </tr>
              )}

              {/* รายการค่าใช้จ่ายอื่นๆ (ถ้ามี) */}
              {Number(inv.other_fees) > 0 && (
                <tr>
                  <td>ค่าใช้จ่ายอื่นๆ {inv.other_fees_detail && `(${inv.other_fees_detail})`}</td>
                  <td className="col-center" style={{ color: '#94a3b8' }}>-</td>
                  <td className="col-center" style={{ color: '#94a3b8' }}>-</td>
                  <td className="col-center">1</td>
                  <td className="col-right">{Number(inv.other_fees).toLocaleString()}</td>
                  <td className="col-right"><strong>{Number(inv.other_fees).toLocaleString()}</strong></td>
                </tr>
              )}

              {/* รายการส่วนลดพิเศษ (ถ้ามี) */}
              {Number(inv.discount) > 0 && (
                <tr style={{ color: '#059669' }}>
                  <td>ส่วนลดพิเศษ</td>
                  <td className="col-center" style={{ color: '#94a3b8' }}>-</td>
                  <td className="col-center" style={{ color: '#94a3b8' }}>-</td>
                  <td className="col-center">-</td>
                  <td className="col-right">-{Number(inv.discount).toLocaleString()}</td>
                  <td className="col-right"><strong>-{Number(inv.discount).toLocaleString()}</strong></td>
                </tr>
              )}
            </tbody>
          </table>

          {/* แถบยอดชำระสุทธิ (Grand Total) */}
          <div className="invoice-grand-total-banner">
            <span className="invoice-grand-label">ยอดชำระสุทธิ (Grand Total)</span>
            <span className="invoice-grand-value">
              ฿{Number(inv.grand_total).toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>

          {/* ส่วนช่องทางการชำระเงินและ PromptPay QR Code */}
          <div className="invoice-payment-grid">
            <div className="invoice-bank-card">
              <h4 style={{ margin: '0 0 8px 0', fontSize: '13px', fontWeight: '800', color: '#1e293b', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <QrCode size={15} color="#ff3377" /> ช่องทางการชำระเงิน
              </h4>
              <div className="invoice-bank-row">
                <span>ธนาคาร:</span>
                <span className="bank-val">{settings.bank_name || 'ธนาคารกสิกรไทย (KBANK)'}</span>
              </div>
              <div className="invoice-bank-row">
                <span>เลขที่บัญชี:</span>
                <span className="bank-val" style={{ fontFamily: 'monospace' }}>{settings.bank_account || '789-2-34567-8'}</span>
              </div>
              <div className="invoice-bank-row">
                <span>พร้อมเพย์:</span>
                <span className="bank-val" style={{ fontFamily: 'monospace' }}>{settings.promptpay_id || '0812345678'}</span>
              </div>
              <div className="invoice-bank-row">
                <span>ชื่อบัญชี:</span>
                <span className="bank-val">{settings.promptpay_name || 'นายสมศักดิ์ นำโชคเจริญ'}</span>
              </div>
              <p style={{ margin: '8px 0 0 0', fontSize: '11px', color: '#94a3b8' }}>
                * เมื่อโอนเงินแล้ว กรุณาอัปโหลดสลิปเข้าระบบเพื่อยืนยันยอด
              </p>
            </div>

            {/* ภาพ QR Code พร้อมเพย์สำหรับสแกนจ่าย */}
            {inv.promptpay_qr && (
              <div className="invoice-qr-box">
                <img
                  src={inv.promptpay_qr}
                  alt="PromptPay QR Code"
                  className="invoice-qr-img"
                />
                <span className="invoice-qr-label">สแกนชำระเงิน</span>
                <span className="invoice-qr-amount">฿{Number(inv.grand_total).toLocaleString()}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
