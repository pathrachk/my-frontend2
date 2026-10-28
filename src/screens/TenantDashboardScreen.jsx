/**
 * ==============================================================================
 * ไฟล์: src/screens/TenantDashboardScreen.jsx
 * หน้าที่: หน้าต่างแดชบอร์ดหลักสำหรับผู้เช่าห้องพัก (Tenant Portal Screen)
 * ==============================================================================
 * รายละเอียดการทำงาน:
 * 1. ตรวจสอบหมายเลขห้องพักของผู้เช่าจาก `currentUser.room_number` และดึงข้อมูลบิลผ่าน `api.getTenantHistory()`
 * 2. สร้าง PromptPay QR Code อัตโนมัติหากยังไม่มี เพื่ออำนวยความสะดวกในการสแกนจ่ายผ่าน Mobile Banking
 * 3. มี 2 แท็บการทำงาน:
 *    - แท็บ 'current' (บิลค่าใช้จ่ายล่าสุด & ชำระเงิน):
 *       • แสดงยอดเงินรวมสุทธิ และแจกแจงค่าน้ำ ค่าไฟ ค่าห้อง ค่าส่วนกลาง
 *       • กล่องแสดง Thai QR Payment พร้อมปุ่มดาวน์โหลดรูป QR และปุ่มคัดลอกเบอร์พร้อมเพย์
 *       • ฟังก์ชันอัปโหลดสลิปและยืนยันการชำระเงินทันที (Upload Slip & Confirm Payment)
 *    - แท็บ 'history' (ประวัติการจ่ายเงิน):
 *       • แสดงตารางรายการบิลย้อนหลังทั้งหมดของห้อง พร้อมสถานะ (ชำระแล้ว / รอชำระ)
 *       • ปุ่มเปิดดูใบแจ้งหนี้ฉบับเต็ม (`<InvoiceModal />`) และปุ่มดูภาพสลิปที่แนบไว้
 * 4. หน้าต่าง Lightbox สำหรับดูภาพสลิปขนาดเต็มจอ
 * 
 * Props:
 * - currentUser: Object ข้อมูลผู้เช่าที่กำลังล็อกอิน { username, name, room_number, role }
 * - onLogout: Callback สำหรับออกจากระบบกลับไปยังหน้า Login
 */

import React, { useState, useEffect } from 'react';
import {
  Building2,
  LogOut,
  Receipt,
  History,
  QrCode,
  Download,
  Copy,
  Check,
  Upload,
  CheckCircle,
  Clock,
  AlertCircle,
  FileText,
  Droplets,
  Zap,
  Eye,
  Calendar,
  X,
  CreditCard,
  Send,
  Sparkles
} from 'lucide-react';
import { api } from '../services/api';
import InvoiceModal from '../components/InvoiceModal';

export default function TenantDashboardScreen({ currentUser, onLogout }) {
  // สลับแท็บระหว่าง 'current' (บิลปัจจุบัน) หรือ 'history' (ประวัติการชำระ)
  const [activeTab, setActiveTab] = useState('current');
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [tenantData, setTenantData] = useState(null);

  // สถานะการอัปโหลดสลิปและการยืนยันชำระเงิน
  const [uploading, setUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState('');
  const [uploadError, setUploadError] = useState('');
  const [selectedFullSlip, setSelectedFullSlip] = useState(null);

  // สลิปตัวอย่างที่เลือกเตรียมส่ง และหมายเหตุ
  const [previewSlip, setPreviewSlip] = useState(null);
  const [slipNote, setSlipNote] = useState('');

  // ข้อมูลใบแจ้งหนี้ที่กำลังเปิดดูใน Modal
  const [viewingInvoice, setViewingInvoice] = useState(null);

  // สถานะการคัดลอกเบอร์พร้อมเพย์
  const [copied, setCopied] = useState(false);

  // หมายเลขห้องพักของผู้เช่า
  const roomNumber = currentUser?.room_number || '';

  /**
   * ฟังก์ชันโหลดข้อมูลบิลและห้องพักของผู้เช่าจากเซิร์ฟเวอร์
   */
  const loadTenantData = async () => {
    if (!roomNumber) return;
    setLoading(true);
    setErrorMsg('');
    try {
      const res = await api.getTenantHistory(roomNumber);
      if (res.success) {
        let data = res.data;
        // หากไม่มี PromptPay QR Code แต่มีการตั้งค่าพร้อมเพย์และมียอดเงิน ให้สร้าง QR Code บนเซิร์ฟเวอร์
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
      console.error(err);
      setErrorMsg(err.message || 'ไม่พบข้อมูลบิลสำหรับห้องพักนี้');
    } finally {
      setLoading(false);
    }
  };

  // ดึงข้อมูลเมื่อห้องพักเปลี่ยนหรือคอมโพเนนต์เริ่มทำงาน
  useEffect(() => {
    loadTenantData();
  }, [roomNumber]);

  /**
   * จัดการเมื่อผู้ใช้เลือกไฟล์รูปภาพสลิปจากเครื่อง/มือถือ
   */
  const handleSelectFile = (file) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setPreviewSlip(reader.result);
      setUploadError('');
    };
    reader.readAsDataURL(file);
  };

  /**
   * ส่งสลิปและยืนยันการชำระเงินทันที
   * @param {number|string} invoiceId - รหัสใบแจ้งหนี้
   */
  const handleConfirmPaymentAndSlip = async (invoiceId) => {
    if (!previewSlip && !latestInvoice?.slip_url) {
      setUploadError('กรุณาเลือกรูปภาพสลิปการโอนเงินก่อนกดยืนยัน');
      return;
    }

    setUploading(true);
    setUploadError('');
    setUploadSuccess('');

    try {
      const slipData = previewSlip || latestInvoice?.slip_url;
      await api.uploadSlip(invoiceId, slipData, true, slipNote || 'ผู้เช่ายืนยันการชำระเงินและส่งสลิปผ่านระบบ');
      setUploadSuccess('🎉 ยืนยันการชำระเงินและส่งสลิปสำเร็จ! ยอดเงินได้รับการบันทึกว่าชำระเรียบร้อยแล้ว');
      setPreviewSlip(null);
      setSlipNote('');
      await loadTenantData();
    } catch (err) {
      setUploadError(err.message || 'เกิดข้อผิดพลาดในการยืนยันสลิป');
    } finally {
      setUploading(false);
    }
  };

  /**
   * ยืนยันการชำระเงินโดยตรง (เช่น ผู้เช่าโอนแล้วแต่ยังไม่มีสลิปหรือจะแนบภายหลัง)
   * @param {number|string} invoiceId - รหัสใบแจ้งหนี้
   */
  const handleDirectConfirmPayment = async (invoiceId) => {
    setUploading(true);
    setUploadError('');
    setUploadSuccess('');

    try {
      await api.confirmPayment(invoiceId, previewSlip || null, slipNote || 'ผู้เช่ายืนยันการชำระเงินผ่านระบบ');
      setUploadSuccess('🎉 ยืนยันการชำระเงินสำเร็จ! บิลนี้ได้รับการบันทึกว่าชำระแล้วเรียบร้อย');
      setPreviewSlip(null);
      setSlipNote('');
      await loadTenantData();
    } catch (err) {
      setUploadError(err.message || 'เกิดข้อผิดพลาดในการยืนยันการชำระเงิน');
    } finally {
      setUploading(false);
    }
  };

  /**
   * บันทึกรูปภาพ QR Code ลงเครื่องของผู้ใช้
   */
  const handleDownloadQr = () => {
    if (!tenantData?.promptpay_qr) return;
    const a = document.createElement('a');
    a.href = tenantData.promptpay_qr;
    a.download = `QR_Room${roomNumber}_${latestInvoice?.billing_month || 'bill'}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  /**
   * คัดลอกหมายเลขพร้อมเพย์ลงใน Clipboard
   */
  const handleCopyPromptPay = () => {
    if (!tenantData?.settings?.promptpay_id) return;
    navigator.clipboard.writeText(tenantData.settings.promptpay_id);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  /**
   * เปิดหน้าต่าง Modal ดูใบแจ้งหนี้ฉบับเต็ม
   * @param {number|string} invoiceId - รหัสใบแจ้งหนี้
   */
  const handleOpenInvoiceModal = async (invoiceId) => {
    try {
      const res = await api.getInvoice(invoiceId);
      if (res.success) {
        setViewingInvoice(res);
      }
    } catch (err) {
      alert('ไม่สามารถเปิดใบแจ้งหนี้ได้');
    }
  };

  // ดึงข้อมูลบิลล่าสุด และประวัติบิล
  const latestInvoice = tenantData?.invoices?.[0];
  const paidInvoices = tenantData?.invoices?.filter((inv) => inv.payment_status === 'paid') || [];
  const allInvoices = tenantData?.invoices || [];

  return (
    <div
      className="min-h-screen w-full bg-[#f8fafc] text-slate-800 font-sans pb-24 overflow-y-auto overflow-x-hidden"
      style={{ WebkitOverflowScrolling: 'touch' }}
    >
      {/* แถบนำทางด้านบน (Top Navigation Bar) */}
      <header className="bg-white/95 backdrop-blur-md sticky top-0 z-30 border-b border-slate-100 shadow-xs">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-3.5 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-pink-500 to-rose-400 text-white flex items-center justify-center font-bold shadow-md shadow-pink-500/20 shrink-0">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base sm:text-lg font-bold text-slate-900 font-kanit">
                  {tenantData?.settings?.dorm_name || 'ระบบจัดการหอพัก'}
                </h1>
                <span className="bg-pink-100 text-[#ff3377] text-xs font-bold px-2.5 py-0.5 rounded-full font-kanit">
                  ห้อง {roomNumber}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                ผู้เช่า: <span className="font-semibold text-slate-700">{currentUser?.name || currentUser?.username}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onLogout}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-red-500 hover:text-red-600 hover:bg-red-50 rounded-xl transition cursor-pointer"
              title="ออกจากระบบ"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">ออกจากระบบ</span>
            </button>
          </div>
        </div>
      </header>

      {/* เนื้อหาหลักของหน้าจอ (Main Container) */}
      <main className="max-w-5xl mx-auto px-4 sm:px-6 pt-6 space-y-6">
        {/* เมนูแท็บสลับหน้าจอ (Navigation Tabs) */}
        <div className="flex items-center justify-center">
          <div className="inline-flex items-center bg-slate-200/70 p-1.5 rounded-2xl gap-1 text-xs font-bold">
            <button
              onClick={() => setActiveTab('current')}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl transition cursor-pointer ${
                activeTab === 'current'
                  ? 'bg-white text-[#ff3377] shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Receipt className="w-4 h-4" />
              <span>บิลค่าใช้จ่ายล่าสุด</span>
              {latestInvoice && latestInvoice.payment_status !== 'paid' && (
                <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('history')}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl transition cursor-pointer ${
                activeTab === 'history'
                  ? 'bg-white text-[#ff3377] shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <History className="w-4 h-4" />
              <span>ประวัติการจ่ายเงิน ({paidInvoices.length})</span>
            </button>
          </div>
        </div>

        {/* แถบแสดงสถานะโหลดข้อมูล / แสดงข้อผิดพลาด */}
        {loading && (
          <div className="text-center py-16 bg-white rounded-3xl border border-slate-100 shadow-sm">
            <div className="w-10 h-10 border-3 border-pink-500 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
            <p className="text-sm text-slate-500 font-medium">กำลังโหลดข้อมูลบิลห้อง {roomNumber}...</p>
          </div>
        )}

        {errorMsg && !loading && (
          <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-2xl flex items-center gap-3 text-sm">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* ==================================================== */}
        {/* แท็บที่ 1: บิลค่าใช้จ่ายล่าสุด & จ่ายเงิน (Current Bill) */}
        {/* ==================================================== */}
        {!loading && activeTab === 'current' && (
          <div className="space-y-6">
            {latestInvoice ? (
              <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-5 sm:p-8 space-y-6">
                {/* ส่วนหัวแสดงรอบบิลและสถานะ */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-5 border-b border-slate-100 gap-3">
                  <div>
                    <span className="text-[11px] font-bold text-[#ff3377] uppercase tracking-wider">
                      ใบแจ้งหนี้ประจำเดือน
                    </span>
                    <h2 className="text-xl sm:text-2xl font-black text-slate-900 font-kanit">
                      รอบบิล {latestInvoice.billing_month}
                    </h2>
                    <p className="text-xs text-slate-400 mt-0.5">
                      เลขที่บิล: <span className="font-mono text-slate-600">{latestInvoice.invoice_no}</span> • กำหนดชำระภายใน: <span className="text-slate-700 font-semibold">{latestInvoice.due_date}</span>
                    </p>
                  </div>

                  <div>
                    {latestInvoice.payment_status === 'paid' ? (
                      <span className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        <CheckCircle className="w-4 h-4" /> ชำระเงินเรียบร้อยแล้ว
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
                        <Clock className="w-4 h-4" /> รอการชำระเงิน
                      </span>
                    )}
                  </div>
                </div>

                {/* กล่องสรุปยอดรวมสุทธิ */}
                <div className="bg-gradient-to-r from-pink-50/70 to-rose-50/60 p-5 rounded-2xl border border-pink-100/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <span className="text-xs font-bold text-slate-600">ยอดรวมสุทธิที่ต้องชำระ:</span>
                    <div className="text-3xl sm:text-4xl font-black text-[#ff3377] font-kanit mt-0.5">
                      ฿{Number(latestInvoice.grand_total).toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleOpenInvoiceModal(latestInvoice.id)}
                      className="px-4 py-2 bg-white hover:bg-slate-50 text-slate-700 font-semibold rounded-xl text-xs border border-slate-200 shadow-xs flex items-center gap-1.5 transition cursor-pointer"
                    >
                      <Eye className="w-4 h-4 text-[#ff3377]" />
                      <span>ดูใบแจ้งหนี้ฉบับเต็ม</span>
                    </button>
                  </div>
                </div>

                {/* รายการแจกแจงค่าใช้จ่าย ค่าน้ำ-ไฟ-ห้อง */}
                <div className="space-y-3">
                  <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                    รายละเอียดค่าใช้จ่ายรอบบิลนี้
                  </h3>

                  <div className="bg-slate-50 rounded-2xl p-4 divide-y divide-slate-100 text-xs">
                    {/* ค่าน้ำประปา */}
                    <div className="py-2.5 flex items-center justify-between first:pt-0">
                      <div className="flex items-center gap-2 text-slate-700">
                        <Droplets className="w-4 h-4 text-sky-500 shrink-0" />
                        <div>
                          <span className="font-semibold">ค่าน้ำประปา</span>
                          <span className="text-[11px] text-slate-400 ml-1.5">
                            (มิเตอร์ {latestInvoice.water_prev_meter} → {latestInvoice.water_curr_meter} = {latestInvoice.water_units} หน่วย @{latestInvoice.water_rate}฿)
                          </span>
                        </div>
                      </div>
                      <span className="font-bold text-slate-900 font-kanit text-sm">
                        ฿{Number(latestInvoice.water_total).toLocaleString()}
                      </span>
                    </div>

                    {/* ค่าไฟฟ้า */}
                    <div className="py-2.5 flex items-center justify-between">
                      <div className="flex items-center gap-2 text-slate-700">
                        <Zap className="w-4 h-4 text-amber-500 shrink-0" />
                        <div>
                          <span className="font-semibold">ค่าไฟฟ้า</span>
                          <span className="text-[11px] text-slate-400 ml-1.5">
                            (มิเตอร์ {latestInvoice.elec_prev_meter} → {latestInvoice.elec_curr_meter} = {latestInvoice.elec_units} หน่วย @{latestInvoice.elec_rate}฿)
                          </span>
                        </div>
                      </div>
                      <span className="font-bold text-slate-900 font-kanit text-sm">
                        ฿{Number(latestInvoice.elec_total).toLocaleString()}
                      </span>
                    </div>

                    {/* ค่าเช่าห้องพัก */}
                    {Number(latestInvoice.room_rent) > 0 && (
                      <div className="py-2.5 flex items-center justify-between">
                        <div className="text-slate-700 font-semibold">ค่าเช่าห้องพัก</div>
                        <span className="font-bold text-slate-900 font-kanit text-sm">
                          ฿{Number(latestInvoice.room_rent).toLocaleString()}
                        </span>
                      </div>
                    )}

                    {/* ค่าส่วนกลาง */}
                    {Number(latestInvoice.common_fee) > 0 && (
                      <div className="py-2.5 flex items-center justify-between">
                        <div className="text-slate-700 font-semibold">ค่าส่วนกลาง</div>
                        <span className="font-bold text-slate-900 font-kanit text-sm">
                          ฿{Number(latestInvoice.common_fee).toLocaleString()}
                        </span>
                      </div>
                    )}

                    {/* ค่าบริการอื่นๆ */}
                    {Number(latestInvoice.other_fees) > 0 && (
                      <div className="py-2.5 flex items-center justify-between">
                        <div className="text-slate-700 font-semibold">
                          ค่าบริการอื่นๆ {latestInvoice.other_fees_detail ? `(${latestInvoice.other_fees_detail})` : ''}
                        </div>
                        <span className="font-bold text-slate-900 font-kanit text-sm">
                          ฿{Number(latestInvoice.other_fees).toLocaleString()}
                        </span>
                      </div>
                    )}

                    {/* ส่วนลด */}
                    {Number(latestInvoice.discount) > 0 && (
                      <div className="py-2.5 flex items-center justify-between text-emerald-600">
                        <div className="font-semibold">ส่วนลด</div>
                        <span className="font-bold font-kanit text-sm">
                          -฿{Number(latestInvoice.discount).toLocaleString()}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* ส่วนแสดง PromptPay QR Code (กรณีที่ยังไม่ได้ชำระเงิน) */}
                {latestInvoice.payment_status !== 'paid' && (
                  <div className="bg-gradient-to-b from-pink-50/50 to-rose-50/30 p-6 rounded-3xl border border-pink-100 flex flex-col items-center text-center space-y-4">
                    <div className="inline-flex items-center gap-1.5 bg-[#1e3a8a] text-white text-xs font-bold px-4 py-1.5 rounded-full shadow-xs">
                      <QrCode className="w-4 h-4" />
                      <span>Thai QR Payment / สแกนจ่ายผ่านแอปธนาคาร</span>
                    </div>

                    {/* รูปภาพ QR Code */}
                    {tenantData?.promptpay_qr ? (
                      <div className="bg-white p-3 rounded-2xl shadow-md border border-slate-100">
                        <img
                          src={tenantData.promptpay_qr}
                          alt="PromptPay QR Code"
                          className="w-52 h-52 object-contain block mx-auto"
                        />
                      </div>
                    ) : (
                      <div className="w-52 h-52 bg-slate-100 rounded-2xl flex items-center justify-center text-xs text-slate-400">
                        กำลังสร้าง QR Code...
                      </div>
                    )}

                    {/* ข้อมูลบัญชีพร้อมเพย์ */}
                    <div className="text-xs text-slate-600 space-y-1">
                      <div className="flex items-center justify-center gap-2 font-bold text-slate-800 text-sm">
                        <span>เบอร์พร้อมเพย์:</span>
                        <span className="font-mono text-[#ff3377] text-base">{tenantData?.settings?.promptpay_id || '-'}</span>
                      </div>
                      {tenantData?.settings?.promptpay_name && (
                        <p className="text-slate-500 text-xs">ชื่อบัญชี: {tenantData.settings.promptpay_name}</p>
                      )}
                    </div>

                    {/* ปุ่มดาวน์โหลด QR และคัดลอกเบอร์พร้อมเพย์ */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 w-full max-w-md pt-1">
                      <button
                        type="button"
                        onClick={handleDownloadQr}
                        disabled={!tenantData?.promptpay_qr}
                        className="bg-[#1e3a8a] hover:bg-[#172554] text-white font-semibold py-2.5 px-4 rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-md shadow-blue-950/20 active:scale-95 transition cursor-pointer"
                      >
                        <Download className="w-4 h-4" />
                        <span>บันทึกรูป QR ลงเครื่อง</span>
                      </button>

                      <button
                        type="button"
                        onClick={handleCopyPromptPay}
                        className="bg-white hover:bg-pink-50 border border-pink-200 text-[#ff3377] font-bold py-2.5 px-4 rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-xs active:scale-95 transition cursor-pointer"
                      >
                        {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                        <span>{copied ? 'คัดลอกเบอร์แล้ว!' : 'คัดลอกเบอร์พร้อมเพย์'}</span>
                      </button>
                    </div>

                    {/* คู่มือ 3 ขั้นตอนการจ่ายเงิน */}
                    <div className="w-full max-w-md bg-white/90 p-3.5 rounded-2xl border border-pink-100 text-left text-xs text-slate-600 space-y-1">
                      <p className="font-bold text-slate-800">💡 วิธีจ่ายเงินผ่านมือถือ:</p>
                      <p>1. กด <strong>"บันทึกรูป QR ลงเครื่อง"</strong> หรือคัดลอกเบอร์พร้อมเพย์</p>
                      <p>2. เปิดแอปธนาคาร เลือก <strong>"สแกน"</strong> แล้วเลือกรูปภาพจากอัลบั้ม</p>
                      <p>3. โอนเสร็จแล้ว นำรูปสลิปมา <strong>แนบสลิปด้านล่าง</strong> แล้วกดยืนยันการชำระเงินได้ทันที</p>
                    </div>
                  </div>
                )}

                {/* ส่วนการจ่ายเงิน & แนบสลิปยืนยันการโอน (Slip Upload & Confirm) */}
                <div className="space-y-4 pt-2">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                      <CreditCard className="w-4 h-4 text-[#ff3377]" />
                      <span>จ่ายเงิน & แนบสลิปยืนยันการโอน</span>
                    </h3>

                    {latestInvoice.payment_status === 'paid' ? (
                      <span className="text-[11px] font-bold px-3 py-1 rounded-full bg-emerald-100 text-emerald-800">
                        ✓ ชำระเงินเรียบร้อยแล้ว
                      </span>
                    ) : (
                      <span className="text-[11px] font-bold px-3 py-1 rounded-full bg-amber-100 text-amber-800">
                        รอการยืนยันชำระเงิน
                      </span>
                    )}
                  </div>

                  {uploadSuccess && (
                    <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl text-xs flex items-center gap-2.5 font-medium shadow-xs">
                      <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0" />
                      <span>{uploadSuccess}</span>
                    </div>
                  )}

                  {uploadError && (
                    <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-2xl text-xs flex items-center gap-2.5 font-medium">
                      <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
                      <span>{uploadError}</span>
                    </div>
                  )}

                  {/* กรณีที่ชำระเงินเรียบร้อยแล้ว */}
                  {latestInvoice.payment_status === 'paid' ? (
                    <div className="p-6 bg-emerald-50/70 border border-emerald-200 rounded-3xl text-center space-y-3">
                      <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
                        <CheckCircle className="w-6 h-6" />
                      </div>
                      <h4 className="text-base font-bold text-emerald-900 font-kanit">
                        ชำระเงินรอบบิลนี้สำเร็จเรียบร้อยแล้ว
                      </h4>
                      <p className="text-xs text-emerald-700 max-w-md mx-auto">
                        ยอดเงิน ฿{Number(latestInvoice.grand_total).toLocaleString()} ได้รับการยืนยันเข้าระบบเรียบร้อย ขอบคุณที่ชำระตรงเวลาครับ
                      </p>

                      <div className="flex items-center justify-center gap-2 pt-2">
                        <button
                          onClick={() => handleOpenInvoiceModal(latestInvoice.id)}
                          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md shadow-emerald-600/20 transition cursor-pointer"
                        >
                          <FileText className="w-4 h-4" />
                          <span>ดูใบเสร็จรับเงิน (พิมพ์)</span>
                        </button>
                        {latestInvoice.slip_url && (
                          <button
                            onClick={() => setSelectedFullSlip(latestInvoice.slip_url)}
                            className="px-4 py-2 bg-white hover:bg-emerald-50 text-emerald-800 border border-emerald-300 rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
                          >
                            <Eye className="w-4 h-4" />
                            <span>ดูสลิปที่แนบไว้</span>
                          </button>
                        )}
                      </div>
                    </div>
                  ) : (
                    /* กรณีรอบิล: แสดงตัวเลือกอัปโหลดสลิปและปุ่มยืนยัน */
                    <div className="space-y-4 bg-slate-50 p-5 rounded-3xl border border-slate-200/80">
                      {!previewSlip && !latestInvoice.slip_url ? (
                        <label className="border-2 border-dashed border-pink-300 hover:border-pink-500 bg-white rounded-2xl p-6 text-center cursor-pointer transition flex flex-col items-center justify-center gap-2 group">
                          <div className="w-12 h-12 rounded-2xl bg-pink-50 text-[#ff3377] flex items-center justify-center group-hover:scale-105 transition">
                            <Upload className="w-6 h-6" />
                          </div>
                          <span className="text-sm font-bold text-slate-800">
                            แตะเพื่อเลือกรูปภาพสลิปโอนเงิน หรือถ่ายรูปสลิป
                          </span>
                          <span className="text-xs text-slate-400">
                            รองรับไฟล์ JPG, PNG หรือภาพถ่ายจากแอปธนาคาร
                          </span>
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            disabled={uploading}
                            onChange={(e) => {
                              if (e.target.files?.[0]) {
                                handleSelectFile(e.target.files[0]);
                              }
                            }}
                          />
                        </label>
                      ) : (
                        /* แสดงตัวอย่างรูปสลิปที่เลือก */
                        <div className="p-4 bg-white rounded-2xl border border-pink-200 flex flex-col sm:flex-row items-center gap-4">
                          <img
                            src={previewSlip || latestInvoice.slip_url}
                            alt="Slip Preview"
                            onClick={() => setSelectedFullSlip(previewSlip || latestInvoice.slip_url)}
                            className="w-24 h-24 object-cover rounded-xl border border-slate-200 cursor-pointer shadow-xs shrink-0"
                            title="แตะเพื่อดูรูปเต็มจอ"
                          />
                          <div className="flex-1 space-y-1 text-center sm:text-left">
                            <p className="text-sm font-bold text-slate-900 flex items-center justify-center sm:justify-start gap-1.5">
                              <CheckCircle className="w-4 h-4 text-emerald-500" />
                              <span>แนบรูปภาพสลิปแล้ว พร้อมยืนยันการชำระเงิน</span>
                            </p>
                            <p className="text-xs text-slate-400">
                              ตรวจสอบความถูกต้องของยอดเงิน (฿{Number(latestInvoice.grand_total).toLocaleString()})
                            </p>
                            <label className="text-xs text-[#ff3377] font-semibold underline cursor-pointer inline-block pt-1">
                              เปลี่ยนรูปสลิปใหม่
                              <input
                                type="file"
                                accept="image/*"
                                className="hidden"
                                disabled={uploading}
                                onChange={(e) => {
                                   if (e.target.files?.[0]) {
                                    handleSelectFile(e.target.files[0]);
                                  }
                                }}
                              />
                            </label>
                          </div>
                        </div>
                      )}

                      {/* ช่องกรอกหมายเหตุเพิ่มเติม */}
                      <div>
                        <label className="block text-xs font-semibold text-slate-600 mb-1">
                          หมายเหตุเพิ่มเติม (ถ้ามี เช่น เวลาโอน):
                        </label>
                        <input
                          type="text"
                          value={slipNote}
                          onChange={(e) => setSlipNote(e.target.value)}
                          placeholder="เช่น โอนเงินเวลา 14:30 น. ผ่าน K PLUS"
                          className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 outline-none focus:ring-2 focus:ring-pink-500 transition"
                        />
                      </div>

                      {/* ปุ่มกดยืนยันการชำระเงิน */}
                      <div className="pt-1 flex flex-col sm:flex-row items-center gap-2.5">
                        <button
                          type="button"
                          onClick={() => handleConfirmPaymentAndSlip(latestInvoice.id)}
                          disabled={uploading || (!previewSlip && !latestInvoice.slip_url)}
                          className="w-full sm:flex-1 py-3 px-5 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 shadow-md shadow-pink-500/25 active:scale-[0.99] transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <CheckCircle className="w-4 h-4" />
                          <span>{uploading ? 'กำลังยืนยันการชำระเงิน...' : 'ยืนยันการชำระเงิน & ส่งสลิปทันที'}</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDirectConfirmPayment(latestInvoice.id)}
                          disabled={uploading}
                          className="w-full sm:w-auto py-3 px-4 rounded-xl text-xs font-bold text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 transition flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                          title="กดยืนยันการชำระเงินทันทีหากโอนแล้ว"
                        >
                          <Send className="w-3.5 h-3.5 text-[#ff3377]" />
                          <span>ยืนยันการจ่ายเงิน</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="text-center py-20 bg-white rounded-3xl border border-slate-100 shadow-sm p-6 space-y-3">
                <div className="w-14 h-14 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                  <FileText className="w-7 h-7" />
                </div>
                <h3 className="text-base font-bold text-slate-800 font-kanit">ยังไม่มีบิลค่าใช้จ่ายในขณะนี้</h3>
                <p className="text-xs text-slate-400 max-w-sm mx-auto">
                  เจ้าของหอพักยังไม่ได้ออกใบแจ้งหนี้รอบใหม่ให้ห้องพัก {roomNumber} เมื่อเจ้าของหอออกบิลแล้ว ยอดเงินและ QR Code จะปรากฏที่นี่ทันทีครับ
                </p>
              </div>
            )}
          </div>
        )}

        {/* ==================================================== */}
        {/* แท็บที่ 2: ประวัติการชำระเงิน (Payment History) */}
        {/* ==================================================== */}
        {!loading && activeTab === 'history' && (
          <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-5 sm:p-8 space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div>
                <h2 className="text-lg font-bold text-slate-900 font-kanit">ประวัติการชำระเงินห้องพัก {roomNumber}</h2>
                <p className="text-xs text-slate-400">รายการใบแจ้งหนี้และหลักฐานการชำระเงินย้อนหลังทั้งหมด</p>
              </div>
              <span className="text-xs font-bold text-slate-500 bg-slate-100 px-3 py-1.5 rounded-xl">
                ทั้งหมด {allInvoices.length} บิล
              </span>
            </div>

            {allInvoices.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50 text-slate-500 font-semibold uppercase tracking-wider text-[11px] border-b border-slate-100">
                      <th className="py-3 px-4">รอบบิล</th>
                      <th className="py-3 px-4">เลขที่บิล</th>
                      <th className="py-3 px-4">ยอดเงินสุทธิ</th>
                      <th className="py-3 px-4 text-center">สถานะ</th>
                      <th className="py-3 px-4">วันที่ชำระ</th>
                      <th className="py-3 px-4 text-right">เอกสาร & สลิป</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {allInvoices.map((inv) => {
                      const isPaid = inv.payment_status === 'paid';
                      return (
                        <tr key={inv.id} className="hover:bg-slate-50/70 transition">
                          <td className="py-3.5 px-4 font-bold text-slate-900">
                            รอบ {inv.billing_month}
                          </td>
                          <td className="py-3.5 px-4 font-mono text-slate-500">
                            {inv.invoice_no}
                          </td>
                          <td className="py-3.5 px-4 font-bold font-kanit text-slate-900 text-sm">
                            ฿{Number(inv.grand_total).toLocaleString()}
                          </td>
                          <td className="py-3.5 px-4 text-center">
                            <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold ${
                              isPaid
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : 'bg-amber-50 text-amber-700 border border-amber-200'
                            }`}>
                              {isPaid ? '✓ ชำระแล้ว' : 'รอชำระ'}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-slate-500 text-[11px]">
                            {inv.paid_date ? new Date(inv.paid_date).toLocaleDateString('th-TH') : (isPaid ? 'ชำระแล้ว' : '-')}
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => handleOpenInvoiceModal(inv.id)}
                                className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1 transition cursor-pointer"
                                title="ดูใบเสร็จ"
                              >
                                <Eye className="w-3.5 h-3.5 text-[#ff3377]" />
                                <span>ดูบิล</span>
                              </button>
                              {inv.slip_url && (
                                <button
                                  onClick={() => setSelectedFullSlip(inv.slip_url)}
                                  className="px-2.5 py-1.5 bg-pink-50 hover:bg-pink-100 text-[#ff3377] rounded-lg text-xs font-semibold flex items-center gap-1 border border-pink-200 transition cursor-pointer"
                                  title="ดูสลิป"
                                >
                                  ดูสลิป
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-16 text-slate-400 space-y-2">
                <History className="w-10 h-10 mx-auto text-slate-300" />
                <p className="text-sm font-medium">ยังไม่มีประวัติการชำระเงินสำหรับห้องนี้</p>
              </div>
            )}
          </div>
        )}
      </main>

      {/* หน้าต่าง Lightbox สำหรับดูภาพสลิปขนาดเต็มจอ */}
      {selectedFullSlip && (
        <div
          onClick={() => setSelectedFullSlip(null)}
          className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-3xl p-5 max-w-md w-full shadow-2xl space-y-3"
          >
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h4 className="text-xs font-bold text-slate-800">หลักฐานสลิปการโอนเงิน</h4>
              <button
                type="button"
                onClick={() => setSelectedFullSlip(null)}
                className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-slate-200 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="text-center overflow-hidden">
              <img
                src={selectedFullSlip}
                alt="Full Slip"
                className="w-full max-h-[70vh] object-contain rounded-xl border border-slate-100"
              />
            </div>
          </div>
        </div>
      )}

      {/* หน้าต่างแสดงใบแจ้งหนี้/ใบเสร็จรับเงิน */}
      {viewingInvoice && (
        <InvoiceModal
          invoiceData={viewingInvoice}
          onClose={() => setViewingInvoice(null)}
        />
      )}
    </div>
  );
}
