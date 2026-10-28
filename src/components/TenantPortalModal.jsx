/**
 * ==============================================================================
 * ไฟล์: src/components/TenantPortalModal.jsx
 * หน้าที่: หน้าต่างป๊อปอัปพอร์ทัลสำหรับผู้เช่าห้องพัก (Tenant Portal Modal)
 * ==============================================================================
 * รายละเอียดการทำงาน:
 * 1. ผู้เช่าสามารถค้นหาข้อมูลบิลของตนเองได้ด้วย "หมายเลขห้องพัก" และ "รหัส PIN"
 * 2. เรียกดูข้อมูลห้องพัก ยอดค้างชำระ และรายละเอียดบิลรอบล่าสุด:
 *    - แสดงค่าน้ำ, ค่าไฟ, ค่าห้อง, ค่าส่วนกลาง และส่วนลด
 *    - สถานะการชำระเงิน (รอชำระ หรือ ชำระแล้ว)
 * 3. บริการช่องทางการชำระเงินออนไลน์:
 *    - แสดง PromptPay QR Code ตามยอดเงินจริง
 *    - ปุ่มบันทึกรูป QR ลงเครื่อง (Download QR)
 *    - ปุ่มคัดลอกเบอร์พร้อมเพย์ (Copy PromptPay)
 * 4. แนบหลักฐานสลิปการโอนเงิน (Upload Slip) และดูรูปสลิปขยายเต็มจอ (Lightbox)
 * 5. ดูประวัติบิลเดือนก่อนหน้าแบบพับเก็บได้ (Past Invoices Accordion)
 * 
 * Props:
 * - isOpen: Boolean เปิด/ปิด Modal
 * - onClose: Callback ปิดหน้าต่าง
 */

import React, { useState } from 'react';
import {
  X,
  Search,
  Upload,
  CheckCircle,
  Clock,
  AlertCircle,
  QrCode,
  Download,
  Copy,
  Check,
  Eye,
  Droplets,
  Zap,
  FileText,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import './TenantPortalModal.css';
import { api } from '../services/api';

export default function TenantPortalModal({ isOpen, onClose }) {
  // ฟิลด์ค้นหาห้องพักและ PIN
  const [roomNumber, setRoomNumber] = useState('');
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [tenantData, setTenantData] = useState(null);

  // สถานะการอัปโหลดสลิป
  const [uploading, setUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState('');
  const [uploadError, setUploadError] = useState('');
  const [selectedFullSlip, setSelectedFullSlip] = useState(null);

  // สถานะปุ่มคัดลอกเบอร์พร้อมเพย์
  const [copied, setCopied] = useState(false);

  // สถานะเปิด/ปิดดูประวัติบิลเดือนก่อนหน้า
  const [showHistory, setShowHistory] = useState(false);

  if (!isOpen) return null;

  /**
   * ฟังก์ชันค้นหาประวัติบิลของห้องพัก
   */
  const handleSearch = async (e) => {
    e.preventDefault();
    if (!roomNumber.trim()) return;

    setLoading(true);
    setErrorMsg('');
    setTenantData(null);
    setUploadSuccess('');
    setUploadError('');

    try {
      const res = await api.getTenantHistory(roomNumber.trim(), pin.trim());
      if (res.success) {
        let data = res.data;
        // หากไม่มี QR Code สำเร็จรูป และมียอดที่ต้องชำระ ให้เรียก API สร้าง QR Code เพิ่มเติม
        if (!data.promptpay_qr && data.invoices?.[0] && data.settings?.promptpay_id && data.invoices[0].grand_total > 0) {
          try {
            const qrRes = await api.generatePromptPay(data.settings.promptpay_id, data.invoices[0].grand_total);
            if (qrRes.success) {
              data = { ...data, promptpay_qr: qrRes.data.qr };
            }
          } catch (qrErr) {
            console.error('Failed to generate QR:', qrErr);
          }
        }
        setTenantData(data);
      }
    } catch (err) {
      setErrorMsg(err.message || 'ไม่พบข้อมูลห้องพักหรือรหัส PIN ไม่ถูกต้อง');
    } finally {
      setLoading(false);
    }
  };

  /**
   * ฟังก์ชันจัดการอัปโหลดสลิปการโอนเงิน
   * @param {number|string} invoiceId - รหัสใบแจ้งหนี้
   * @param {File} file - ไฟล์ภาพสลิปที่เลือก
   */
  const handleFileUpload = async (invoiceId, file) => {
    if (!file) return;

    // แปลงไฟล์เป็น Base64 Data URL เพื่อส่งไปยัง Backend
    const reader = new FileReader();
    reader.onload = async () => {
      const base64Data = reader.result;
      setUploading(true);
      setUploadError('');
      setUploadSuccess('');

      try {
        await api.uploadSlip(invoiceId, base64Data);
        setUploadSuccess('อัปโหลดสลิปสำเร็จ! ผู้ดูแลหอพักจะตรวจสอบยอดเงินให้โดยเร็ว');
        // โหลดข้อมูลล่าสุดของห้องพักเพื่ออัปเดตสถานะบนหน้าจอ
        const updated = await api.getTenantHistory(roomNumber.trim(), pin.trim());
        if (updated.success) setTenantData(updated.data);
      } catch (err) {
        setUploadError(err.message || 'อัปโหลดสลิปไม่สำเร็จ');
      } finally {
        setUploading(false);
      }
    };
    reader.readAsDataURL(file);
  };

  /**
   * ดาวน์โหลดภาพ PromptPay QR Code ลงในเครื่องของผู้ใช้
   */
  const handleDownloadQr = () => {
    if (!tenantData?.promptpay_qr) return;
    const a = document.createElement('a');
    a.href = tenantData.promptpay_qr;
    a.download = `QR_Room${tenantData.room?.room_number || 'bill'}_${latestInvoice?.billing_month || 'month'}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  /**
   * คัดลอกเบอร์พร้อมเพย์ไปยัง Clipboard
   */
  const handleCopyPromptPay = () => {
    if (!tenantData?.settings?.promptpay_id) return;
    navigator.clipboard.writeText(tenantData.settings.promptpay_id);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // ดึงบิลล่าสุด และบิลเดือนก่อนหน้า
  const latestInvoice = tenantData?.invoices?.[0];
  const pastInvoices = tenantData?.invoices?.slice(1) || [];

  return (
    <div className="tenant-modal-backdrop">
      <div className="tenant-modal-card">
        {/* ส่วนหัว Modal */}
        <div className="tenant-modal-header">
          <div>
            <h3 className="room-header-title">พอร์ทัลผู้เช่าห้องพัก (Tenant Portal)</h3>
            <p className="room-header-desc">ตรวจสอบยอดบิลค่าน้ำ-ค่าไฟ สแกนจ่าย และแนบสลิป</p>
          </div>
          <button onClick={onClose} className="invoice-btn-close">
            <X size={18} />
          </button>
        </div>

        {/* เนื้อหาหลัก */}
        <div className="tenant-modal-body">
          {/* ฟอร์มค้นหาห้องพักและใส่ PIN */}
          <form onSubmit={handleSearch} className="tenant-search-form">
            <input
              type="text"
              placeholder="กรอกเลขห้องพัก (เช่น 101)"
              value={roomNumber}
              onChange={(e) => setRoomNumber(e.target.value)}
              className="calc-input"
              style={{ flex: 1, fontWeight: '700' }}
              required
            />
            <input
              type="password"
              placeholder="PIN ห้อง (ถ้ามี)"
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              className="calc-input"
              style={{ width: '110px' }}
            />
            <button
              type="submit"
              disabled={loading}
              className="btn-primary"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
            >
              <Search size={15} /> {loading ? 'กำลังค้นหา...' : 'ค้นหาบิล'}
            </button>
          </form>

          {errorMsg && (
            <div className="calc-alert calc-alert-error">
              <AlertCircle size={16} /> {errorMsg}
            </div>
          )}

          {/* มุมมองผลลัพธ์ข้อมูลห้องพักและบิล */}
          {tenantData && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {/* ข้อมูลการ์ดห้องพัก */}
              <div className="tenant-room-card">
                <div>
                  <h4 style={{ margin: 0, fontSize: '16px', fontWeight: '800', color: '#0f172a' }}>
                    ห้องพัก {tenantData.room.room_number}
                  </h4>
                  <p style={{ margin: '2px 0 0 0', fontSize: '12px', color: '#64748b' }}>
                    ผู้เช่า: {tenantData.room.tenant_name || 'ไม่ระบุชื่อ'}
                  </p>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <span style={{ fontSize: '11px', color: '#64748b' }}>ชั้น {tenantData.room.floor}</span>
                  <div style={{ fontSize: '13px', fontWeight: '700', color: '#ff3377' }}>
                    ฿{Number(tenantData.room.base_rent).toLocaleString()}/ด.
                  </div>
                </div>
              </div>

              {latestInvoice ? (
                <div className="tenant-bill-banner">
                  {/* แถบสถานะบิลล่าสุด */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <span style={{ fontSize: '11px', fontWeight: '800', color: '#ff3377', textTransform: 'uppercase' }}>
                        รอบบิล: {latestInvoice.billing_month}
                      </span>
                      <p style={{ margin: '2px 0 0 0', fontSize: '11px', color: '#64748b' }}>
                        เลขที่บิล: {latestInvoice.invoice_no} • กำหนดชำระ: {latestInvoice.due_date}
                      </p>
                    </div>
                    {latestInvoice.payment_status === 'paid' ? (
                      <span className="badge-status badge-paid">
                        <CheckCircle size={13} /> ชำระแล้ว
                      </span>
                    ) : (
                      <span className="badge-status badge-pending">
                        <Clock size={13} /> รอการชำระเงิน
                      </span>
                    )}
                  </div>

                  {/* ยอดเงินรวมสุทธิ */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', borderBottom: '1px solid #ffd1df', paddingBottom: '10px' }}>
                    <span style={{ fontWeight: '700', color: '#475569', fontSize: '14px' }}>ยอดที่ต้องชำระสุทธิ:</span>
                    <span style={{ fontSize: '28px', fontWeight: '900', color: '#ff3377', fontFamily: 'Kanit, sans-serif' }}>
                      ฿{Number(latestInvoice.grand_total).toLocaleString()}
                    </span>
                  </div>

                  {/* แจกแจงรายการค่าใช้จ่าย */}
                  <div style={{
                    backgroundColor: '#ffffff',
                    padding: '12px 14px',
                    borderRadius: '12px',
                    border: '1px solid #ffd1df',
                    fontSize: '12px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '6px'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ color: '#0369a1', display: 'flex', alignItems: 'center', gap: '5px' }}>
                        <Droplets size={14} /> ค่าน้ำประปา:
                        <span style={{ fontSize: '11px', color: '#64748b' }}>
                          ({latestInvoice.water_prev_meter} → {latestInvoice.water_curr_meter} = {latestInvoice.water_units} น. @{latestInvoice.water_rate}฿)
                        </span>
                      </span>
                      <strong style={{ color: '#0f172a' }}>฿{Number(latestInvoice.water_total).toLocaleString()}</strong>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ color: '#b45309', display: 'flex', alignItems: 'center', gap: '5px' }}>
                        <Zap size={14} /> ค่าไฟฟ้า:
                        <span style={{ fontSize: '11px', color: '#64748b' }}>
                          ({latestInvoice.elec_prev_meter} → {latestInvoice.elec_curr_meter} = {latestInvoice.elec_units} น. @{latestInvoice.elec_rate}฿)
                        </span>
                      </span>
                      <strong style={{ color: '#0f172a' }}>฿{Number(latestInvoice.elec_total).toLocaleString()}</strong>
                    </div>

                    {Number(latestInvoice.room_rent) > 0 && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ color: '#475569' }}>ค่าเช่าห้องพัก:</span>
                        <strong style={{ color: '#0f172a' }}>฿{Number(latestInvoice.room_rent).toLocaleString()}</strong>
                      </div>
                    )}

                    {Number(latestInvoice.common_fee) > 0 && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ color: '#475569' }}>ค่าส่วนกลาง:</span>
                        <strong style={{ color: '#0f172a' }}>฿{Number(latestInvoice.common_fee).toLocaleString()}</strong>
                      </div>
                    )}

                    {Number(latestInvoice.other_fees) > 0 && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ color: '#475569' }}>
                          ค่าบริการอื่นๆ {latestInvoice.other_fees_detail ? `(${latestInvoice.other_fees_detail})` : ''}:
                        </span>
                        <strong style={{ color: '#0f172a' }}>฿{Number(latestInvoice.other_fees).toLocaleString()}</strong>
                      </div>
                    )}

                    {Number(latestInvoice.discount) > 0 && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ color: '#059669' }}>ส่วนลด:</span>
                        <strong style={{ color: '#059669' }}>-฿{Number(latestInvoice.discount).toLocaleString()}</strong>
                      </div>
                    )}
                  </div>

                  {/* ส่วน PromptPay QR Code เพื่อชำระเงิน */}
                  {latestInvoice.payment_status !== 'paid' && (
                    <div style={{
                      backgroundColor: '#ffffff',
                      borderRadius: '16px',
                      padding: '16px',
                      border: '1px solid #ffd1df',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '12px',
                      boxShadow: '0 4px 12px rgba(255, 51, 119, 0.06)'
                    }}>
                      <div style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        backgroundColor: '#1e3a8a',
                        color: '#ffffff',
                        fontSize: '11px',
                        fontWeight: '700',
                        padding: '4px 12px',
                        borderRadius: '9999px'
                      }}>
                        <QrCode size={13} />
                        <span>Thai QR Payment / สแกนจ่ายผ่านแอปธนาคาร</span>
                      </div>

                      {/* รูปภาพ QR Code */}
                      {tenantData.promptpay_qr ? (
                        <div style={{
                          backgroundColor: '#ffffff',
                          padding: '10px',
                          borderRadius: '16px',
                          border: '1px solid #e2e8f0',
                          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                          cursor: 'pointer'
                        }}
                        onClick={handleDownloadQr}
                        title="แตะเพื่อดาวน์โหลด QR Code"
                        >
                          <img
                            src={tenantData.promptpay_qr}
                            alt="PromptPay QR Code"
                            style={{ width: '190px', height: '190px', display: 'block', objectFit: 'contain' }}
                          />
                        </div>
                      ) : (
                        <div style={{
                          width: '190px',
                          height: '190px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          backgroundColor: '#f8fafc',
                          borderRadius: '16px',
                          color: '#94a3b8',
                          fontSize: '12px'
                        }}>
                          ยังไม่ได้ตั้งค่า PromptPay
                        </div>
                      )}

                      {/* รายละเอียดบัญชีพร้อมเพย์ */}
                      <div style={{ textAlign: 'center', width: '100%', fontSize: '12px', color: '#475569' }}>
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '6px',
                          fontWeight: '700',
                          color: '#0f172a'
                        }}>
                          <span>เบอร์พร้อมเพย์:</span>
                          <span style={{ fontFamily: 'monospace', fontSize: '15px', color: '#ff3377' }}>
                            {tenantData.settings?.promptpay_id || '-'}
                          </span>
                        </div>
                        {tenantData.settings?.promptpay_name && (
                          <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
                            ชื่อบัญชี: {tenantData.settings.promptpay_name}
                          </div>
                        )}
                      </div>

                      {/* ปุ่มบันทึก QR Code และปุ่มคัดลอกเบอร์พร้อมเพย์ */}
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', width: '100%' }}>
                        <button
                          type="button"
                          onClick={handleDownloadQr}
                          disabled={!tenantData.promptpay_qr}
                          className="btn-primary"
                          style={{
                            backgroundColor: '#1e3a8a',
                            padding: '9px 12px',
                            fontSize: '11px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '6px',
                            borderRadius: '10px'
                          }}
                        >
                          <Download size={14} />
                          <span>บันทึกรูป QR ลงเครื่อง</span>
                        </button>

                        <button
                          type="button"
                          onClick={handleCopyPromptPay}
                          className="btn-secondary"
                          style={{
                            padding: '9px 12px',
                            fontSize: '11px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '6px',
                            borderRadius: '10px',
                            borderColor: '#ffd1df',
                            color: copied ? '#059669' : '#ff3377',
                            fontWeight: '700'
                          }}
                        >
                          {copied ? <Check size={14} /> : <Copy size={14} />}
                          <span>{copied ? 'คัดลอกแล้ว!' : 'คัดลอกเบอร์พร้อมเพย์'}</span>
                        </button>
                      </div>

                      {/* คำแนะนำขั้นตอนสแกนจ่ายสำหรับผู้ใช้มือถือ */}
                      <div style={{
                        backgroundColor: '#f8fafc',
                        padding: '10px 12px',
                        borderRadius: '10px',
                        width: '100%',
                        fontSize: '11px',
                        color: '#64748b',
                        lineHeight: '1.6'
                      }}>
                        <p style={{ margin: 0, fontWeight: '700', color: '#334155' }}>💡 วิธีสแกนจ่ายในมือถือ:</p>
                        <p style={{ margin: 0 }}>1. กดปุ่ม <strong>"บันทึกรูป QR ลงเครื่อง"</strong> ด้านบน</p>
                        <p style={{ margin: 0 }}>2. เปิดแอปธนาคาร เลือก <strong>"สแกน"</strong> แล้วเลือกรูปจากอัลบั้ม</p>
                        <p style={{ margin: 0 }}>3. เมื่อโอนเงินเสร็จแล้ว เลื่อนลงมา <strong>แนบสลิป</strong> ด้านล่าง</p>
                      </div>
                    </div>
                  )}

                  {/* ส่วนการแนบสลิปการโอนเงิน (Slip Upload Section) */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', paddingTop: '4px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '13px', fontWeight: '800', color: '#1e293b', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Upload size={15} color="#ff3377" /> แนบสลิปยืนยันการโอนเงิน
                      </span>
                      {latestInvoice.slip_url ? (
                        <span style={{
                          fontSize: '10px',
                          fontWeight: '700',
                          padding: '3px 9px',
                          borderRadius: '9999px',
                          backgroundColor: latestInvoice.payment_status === 'paid' ? '#dcfce7' : '#fef3c7',
                          color: latestInvoice.payment_status === 'paid' ? '#15803d' : '#b45309'
                        }}>
                          {latestInvoice.payment_status === 'paid' ? '✓ ตรวจสอบแล้ว' : '⏳ รอผู้ดูแลตรวจสอบ'}
                        </span>
                      ) : (
                        <span style={{ fontSize: '10px', color: '#94a3b8' }}>ยังไม่แนบสลิป</span>
                      )}
                    </div>

                    {uploadSuccess && (
                      <div className="calc-alert calc-alert-success" style={{ fontSize: '12px' }}>
                        <CheckCircle size={14} /> {uploadSuccess}
                      </div>
                    )}
                    {uploadError && (
                      <div className="calc-alert calc-alert-error" style={{ fontSize: '12px' }}>
                        {uploadError}
                      </div>
                    )}

                    {/* แสดงรูปตัวอย่างสลิปที่แนบไว้แล้ว */}
                    {latestInvoice.slip_url && (
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        backgroundColor: '#ffffff',
                        padding: '10px 14px',
                        borderRadius: '12px',
                        border: '1px solid #e2e8f0'
                      }}>
                        <img
                          src={latestInvoice.slip_url}
                          alt="Slip Preview"
                          onClick={() => setSelectedFullSlip(latestInvoice.slip_url)}
                          style={{
                            width: '56px',
                            height: '56px',
                            objectFit: 'cover',
                            borderRadius: '8px',
                            border: '1px solid #cbd5e1',
                            cursor: 'pointer'
                          }}
                          title="แตะเพื่อดูสลิปเต็มจอ"
                        />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ margin: 0, fontSize: '12px', fontWeight: '700', color: '#1e293b' }}>
                            {latestInvoice.payment_status === 'paid'
                              ? 'ชำระเงินเรียบร้อยแล้ว'
                              : 'ส่งสลิปเข้าระบบแล้ว'}
                          </p>
                          <p style={{ margin: '2px 0 0 0', fontSize: '10px', color: '#64748b' }}>
                            {latestInvoice.slip_uploaded_at
                              ? `เวลาที่ส่ง: ${new Date(latestInvoice.slip_uploaded_at).toLocaleString('th-TH')}`
                              : 'รอผู้ดูแลหอพักตรวจสอบ'}
                          </p>
                          <button
                            type="button"
                            onClick={() => setSelectedFullSlip(latestInvoice.slip_url)}
                            style={{
                              background: 'none',
                              border: 'none',
                              color: '#ff3377',
                              fontSize: '11px',
                              fontWeight: '600',
                              cursor: 'pointer',
                              padding: 0,
                              marginTop: '3px'
                            }}
                          >
                            🔍 แตะเพื่อดูรูปสลิปเต็มจอ
                          </button>
                        </div>
                      </div>
                    )}

                    {/* พื้นที่ลาก-วาง หรือคลิกเลือกไฟล์สลิป (Dropzone) */}
                    {latestInvoice.payment_status !== 'paid' && (
                      <label className="tenant-upload-dropzone">
                        <Upload color="#ff3377" size={24} style={{ marginBottom: '6px' }} />
                        <span style={{ fontSize: '12px', fontWeight: '700', color: '#334155' }}>
                          {uploading
                            ? 'กำลังส่งสลิปเข้าระบบ...'
                            : (latestInvoice.slip_url ? 'แตะเพื่อเปลี่ยนรูปสลิปใหม่' : 'แตะเพื่อถ่ายรูป หรือเลือกรูปสลิป')}
                        </span>
                        <span style={{ fontSize: '10px', color: '#94a3b8', marginTop: '2px' }}>
                          รองรับไฟล์รูปภาพ JPG, PNG
                        </span>
                        <input
                          type="file"
                          accept="image/*"
                          style={{ display: 'none' }}
                          disabled={uploading}
                          onChange={(e) => {
                            if (e.target.files?.[0]) {
                              handleFileUpload(latestInvoice.id, e.target.files[0]);
                            }
                          }}
                        />
                      </label>
                    )}
                  </div>
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: '24px', color: '#94a3b8', fontSize: '13px', backgroundColor: '#f8fafc', borderRadius: '12px' }}>
                  ไม่พบรายการบิลสำหรับห้องนี้
                </div>
              )}

              {/* รายการประวัติบิลเดือนก่อนหน้า (Past Invoices Accordion) */}
              {pastInvoices.length > 0 && (
                <div style={{
                  backgroundColor: '#ffffff',
                  borderRadius: '14px',
                  border: '1px solid #e2e8f0',
                  padding: '12px 16px'
                }}>
                  <div
                    onClick={() => setShowHistory(!showHistory)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      cursor: 'pointer'
                    }}
                  >
                    <span style={{ fontSize: '12px', fontWeight: '700', color: '#334155', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <FileText size={14} color="#64748b" /> ประวัติบิลเดือนก่อนหน้า ({pastInvoices.length} บิล)
                    </span>
                    {showHistory ? <ChevronUp size={16} color="#64748b" /> : <ChevronDown size={16} color="#64748b" />}
                  </div>

                  {showHistory && (
                    <div style={{ marginTop: '10px', display: 'flex', flexDirection: 'column', gap: '8px', borderTop: '1px solid #f1f5f9', paddingTop: '10px' }}>
                      {pastInvoices.map((inv) => (
                        <div
                          key={inv.id}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '8px 10px',
                            backgroundColor: '#f8fafc',
                            borderRadius: '8px',
                            fontSize: '11px'
                          }}
                        >
                          <div>
                            <span style={{ fontWeight: '700', color: '#0f172a' }}>รอบบิล {inv.billing_month}</span>
                            <span style={{ color: '#94a3b8', marginLeft: '6px' }}>({inv.invoice_no})</span>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <strong style={{ color: '#ff3377' }}>฿{Number(inv.grand_total).toLocaleString()}</strong>
                            <span style={{
                              padding: '2px 6px',
                              borderRadius: '6px',
                              fontSize: '9px',
                              fontWeight: '700',
                              backgroundColor: inv.payment_status === 'paid' ? '#dcfce7' : '#fef3c7',
                              color: inv.payment_status === 'paid' ? '#15803d' : '#b45309'
                            }}>
                              {inv.payment_status === 'paid' ? 'ชำระแล้ว' : 'รอชำระ'}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* หน้าต่างขยายดูภาพสลิปแบบเต็มจอ (Lightbox Modal) */}
      {selectedFullSlip && (
        <div
          onClick={() => setSelectedFullSlip(null)}
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.85)',
            backdropFilter: 'blur(4px)',
            zIndex: 1050,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px'
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '20px',
              padding: '16px',
              maxWidth: '420px',
              width: '100%',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
              maxHeight: '90vh'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontWeight: '700', fontSize: '13px', color: '#0f172a' }}>
                หลักฐานสลิปการโอนเงิน
              </span>
              <button
                type="button"
                onClick={() => setSelectedFullSlip(null)}
                className="invoice-btn-close"
              >
                <X size={16} />
              </button>
            </div>
            <div style={{ overflowY: 'auto', textAlign: 'center' }}>
              <img
                src={selectedFullSlip}
                alt="Full Slip"
                style={{ width: '100%', maxHeight: '70vh', objectFit: 'contain', borderRadius: '12px' }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
