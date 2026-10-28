/**
 * ==============================================================================
 * ไฟล์: src/screens/HomeScreen.jsx
 * หน้าที่: แผงควบคุมหลักสำหรับเจ้าของหอพัก / ผู้ดูแลระบบ (Admin Dashboard & Control Center)
 * ==============================================================================
 * รายละเอียดการทำงาน:
 * 1. รวบรวมข้อมูลทั้งหมดจาก Backend (สถิติ, ข้อมูลหอพัก, บิล, ห้องพัก, สลิปที่รอยืนยัน)
 * 2. จัดการหน้าจอหลักแบ่งเป็น 4 แท็บ:
 *    - 'dashboard': สรุปตัวเลขทางการเงิน ยอดค้างชำระ บิลที่ต้องติดตาม และสถานะห้องพักทุกชั้น
 *    - 'invoices': รายการใบแจ้งหนี้ทั้งหมด พร้อมระบบค้นหา กรองตามสถานะ และสั่งพิมพ์/แก้ไข/ลบ
 *    - 'rooms': จัดการห้องพัก เพิ่ม ลบ แก้ไข ดูสถานะว่าง/ไม่ว่าง และออกบิลด่วน
 *    - 'analytics': กราฟและตัวเลขสรุปรายได้ ค่าน้ำ ค่าไฟ และค่าเช่ารายเดือน
 * 3. เป็นศูนย์กลางควบคุมการเปิด/ปิด Pop-up Modals ทั้งหมดในระบบ:
 *    - CalculatorModal (ออกบิล/คำนวณมิเตอร์)
 *    - EditInvoiceModal (แก้ไขใบแจ้งหนี้)
 *    - InvoiceModal (พิมพ์ใบเสร็จ)
 *    - RoomModal (เพิ่ม/แก้ไขห้อง)
 *    - SettingsModal (ตั้งค่าหอพัก/เปลี่ยน PIN)
 *    - TenantPortalModal (เปิดดูมุมมองผู้เช่า)
 *    - SlipVerifyModal (ตรวจและอนุมัติสลิปโอนเงิน)
 * 
 * Props:
 * - onLogout: ฟังก์ชัน Callback เมื่อแอดมินกดออกจากระบบ
 * - currentUser: ข้อมูลของแอดมินที่ล็อกอินอยู่
 */

import React, { useState, useEffect } from 'react';
import {
  LayoutDashboard,
  Calculator,
  Receipt,
  DoorOpen,
  BarChart3,
  Settings,
  Download,
  Lock,
  Building2,
  Waves,
  Plus,
  PlusCircle,
  Search,
  Eye,
  Trash2,
  CheckCircle,
  Clock,
  AlertCircle,
  Calendar,
  Droplet,
  Zap,
  Home,
  ShieldCheck,
  BellRing,
  ArrowRight,
  ChevronRight,
  Menu,
  X,
  Edit,
  Users,
} from 'lucide-react';
import { api } from '../services/api';
import InvoiceModal from '../components/InvoiceModal';
import CalculatorModal from '../components/CalculatorModal';
import RoomModal from '../components/RoomModal';
import SlipVerifyModal from '../components/SlipVerifyModal';
import SettingsModal from '../components/SettingsModal';
import TenantPortalModal from '../components/TenantPortalModal';
import EditInvoiceModal from '../components/EditInvoiceModal';

export default function HomeScreen({ onLogout, currentUser }) {
  // เมนูแท็บที่กำลังเลือกแสดงผล: 'dashboard' | 'invoices' | 'rooms' | 'analytics'
  const [currentTab, setCurrentTab] = useState('dashboard');
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  // ตัวกรองรอบบิลประจำเดือน (ค่าเริ่มต้นคือเดือนปัจจุบัน YYYY-MM)
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });

  // ตัวแปรค้นหาและตัวกรองสถานะ
  const [searchQuery, setSearchQuery] = useState('');
  const [invoiceStatusFilter, setInvoiceStatusFilter] = useState('all'); // all, pending, paid
  const [roomFloorFilter, setRoomFloorFilter] = useState('all');
  const [roomStatusFilter, setRoomStatusFilter] = useState('all');

  // ข้อมูลสถิติและรายการจริงที่ดึงมาจากฐานข้อมูล MySQL ผ่าน Backend
  const [stats, setStats] = useState({
    total_rooms: 0,
    occupied_rooms: 0,
    vacant_rooms: 0,
    maintenance_rooms: 0,
    pending_count: 0,
    pending_amount: 0,
    paid_count: 0,
    paid_amount: 0,
    pending_slips: 0,
  });
  const [settings, setSettings] = useState(null);
  const [invoices, setInvoices] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [pendingSlips, setPendingSlips] = useState([]);
  const [loading, setLoading] = useState(true);

  // ควบคุมสถานะการเปิด/ปิด Pop-up Modal แต่ละประเภท
  const [isCalcModalOpen, setIsCalcModalOpen] = useState(false);
  const [calcInitialRoomId, setCalcInitialRoomId] = useState(null);
  const [isRoomModalOpen, setIsRoomModalOpen] = useState(false);
  const [editingRoom, setEditingRoom] = useState(null);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [isTenantModalOpen, setIsTenantModalOpen] = useState(false);
  const [selectedInvoiceData, setSelectedInvoiceData] = useState(null);
  const [selectedSlipInvoice, setSelectedSlipInvoice] = useState(null);
  const [isEditInvoiceModalOpen, setIsEditInvoiceModalOpen] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState(null);

  /**
   * ฟังก์ชันดึงข้อมูลทั้งหมดจาก MySQL ผ่าน RESTful API พร้อมกันด้วย Promise.all
   */
  const loadAllData = async () => {
    setLoading(true);
    try {
      const [statsRes, settingsRes, invoicesRes, roomsRes, slipsRes] = await Promise.all([
        api.getDashboardStats(),
        api.getSettings(),
        api.getInvoices(),
        api.getRooms(),
        api.getPendingSlips(),
      ]);

      if (statsRes.success) setStats(statsRes.data);
      if (settingsRes.success) setSettings(settingsRes.data);
      if (invoicesRes.success) setInvoices(invoicesRes.data);
      if (roomsRes.success) setRooms(roomsRes.data);
      if (slipsRes.success) setPendingSlips(slipsRes.data);
    } catch (err) {
      console.error('Failed to load dormitory data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAllData();
  }, []);

  /**
   * เปิดดูรายละเอียดใบแจ้งหนี้ฉบับเต็มสำหรับพิมพ์ใบเสร็จ
   * @param {number|string} invoiceId - รหัสใบแจ้งหนี้
   */
  const handleOpenInvoice = async (invoiceId) => {
    try {
      const res = await api.getInvoice(invoiceId);
      if (res.success) {
        setSelectedInvoiceData(res);
      }
    } catch (err) {
      alert('ไม่สามารถเปิดใบแจ้งหนี้ได้: ' + err.message);
    }
  };

  /**
   * เปิดหน้าต่าง Modal สำหรับแก้ไขข้อมูลใบแจ้งหนี้เดิม
   * @param {Object} inv - ข้อมูลบิลที่ต้องการแก้ไข
   */
  const handleEditInvoice = (inv) => {
    setEditingInvoice(inv);
    setIsEditInvoiceModalOpen(true);
  };

  /**
   * ขอลบใบแจ้งหนี้ออกจากระบบ พร้อมกล่องยืนยันป้องกันการกดผิด
   * @param {number|string} id - รหัสบิล
   * @param {string} invNo - เลขที่บิล
   */
  const handleDeleteInvoice = async (id, invNo) => {
    if (!window.confirm(`คุณแน่ใจหรือไม่ว่าต้องการลบใบแจ้งหนี้ ${invNo}?`)) return;
    try {
      await api.deleteInvoice(id);
      loadAllData();
    } catch (err) {
      alert('ลบใบแจ้งหนี้ไม่สำเร็จ: ' + err.message);
    }
  };

  /**
   * ขอลบห้องพักและประวัติบิลทั้งหมดของห้องนั้น
   * @param {number|string} id - รหัสห้องพัก
   * @param {string} roomNum - หมายเลขห้องพัก
   */
  const handleDeleteRoom = async (id, roomNum) => {
    if (!window.confirm(`คุณแน่ใจหรือไม่ว่าต้องการลบห้อง ${roomNum} และประวัติบิลทั้งหมด?`)) return;
    try {
      await api.deleteRoom(id);
      loadAllData();
    } catch (err) {
      alert('ลบห้องพักไม่สำเร็จ: ' + err.message);
    }
  };

  /**
   * คำนวณบิลด่วนสำหรับห้องพักที่ระบุ โดยเปิด Modal คำนวณพร้อมเลือกห้องนั้นทันที
   * @param {number|string} roomId - รหัสห้องพัก
   */
  const handleQuickCalculateRoom = (roomId) => {
    setCalcInitialRoomId(roomId);
    setIsCalcModalOpen(true);
  };

  // กรองรายการบิลตามสถานะการชำระเงิน และคำค้นหา (เลขห้อง, ชื่อผู้เช่า, เลขที่บิล, รอบบิล)
  const filteredInvoices = invoices.filter((inv) => {
    if (invoiceStatusFilter !== 'all' && inv.payment_status !== invoiceStatusFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        inv.room_number?.toLowerCase().includes(q) ||
        inv.tenant_name?.toLowerCase().includes(q) ||
        inv.invoice_no?.toLowerCase().includes(q) ||
        inv.billing_month?.toLowerCase().includes(q)
      );
    }
    return true;
  });

  // คำนวณสถิติยอดการใช้น้ำ-ไฟ และค่าเช่าห้องสำหรับรอบบิลของเดือนที่เลือก
  let monthWaterUnits = 0;
  let monthWaterAmount = 0;
  let monthElecUnits = 0;
  let monthElecAmount = 0;
  let monthRentAmount = 0;

  invoices.forEach((inv) => {
    if (inv.billing_month === selectedMonth) {
      monthWaterUnits += Number(inv.water_units) || 0;
      monthWaterAmount += Number(inv.water_total) || 0;
      monthElecUnits += Number(inv.elec_units) || 0;
      monthElecAmount += Number(inv.elec_total) || 0;
      monthRentAmount += Number(inv.room_rent) || 0;
    }
  });

  // รายการชั้นทั้งหมดของหอพักแบบไม่ซ้ำกัน (สำหรับตัวกรองชั้น)
  const floors = Array.from(new Set(rooms.map((r) => r.floor))).sort((a, b) => a - b);

  // กรองรายการห้องพักตามชั้นและสถานะของห้อง
  const filteredRooms = rooms.filter((r) => {
    if (roomFloorFilter !== 'all' && String(r.floor) !== String(roomFloorFilter)) return false;
    if (roomStatusFilter !== 'all' && r.status !== roomStatusFilter) return false;
    return true;
  });

  return (
    <div className="bg-[#f4f7fb] min-h-screen flex antialiased overflow-x-hidden font-sans text-slate-800">
      {/* -------------------------------------------------------------------- */}
      {/* 1. ม่านหลังสำหรับหน้าจอขนาดเล็ก/มือถือ (Mobile Backdrop)              */}
      {/* -------------------------------------------------------------------- */}
      {isMobileSidebarOpen && (
        <div
          onClick={() => setIsMobileSidebarOpen(false)}
          className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-40 md:hidden"
        />
      )}

      {/* -------------------------------------------------------------------- */}
      {/* 2. เมนูด้านข้าง (Sidebar Navigation)                                  */}
      {/* -------------------------------------------------------------------- */}
      <aside
        className={`w-64 bg-white border-r border-slate-100 flex flex-col justify-between shrink-0 min-h-screen fixed md:sticky top-0 h-screen z-50 md:z-30 transition-transform duration-300 ease-in-out shadow-2xl md:shadow-none ${
          isMobileSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
      >
        <div>
          {/* ส่วนหัว Sidebar แสดงแบรนด์ Lector */}
          <div className="p-5 sm:p-6 pb-4 flex items-center justify-between">
            <div className="bg-lector-logo text-white px-4 py-2.5 rounded-2xl flex items-center gap-2.5 shadow-lg shadow-pink-500/25 flex-1">
              <div className="w-7 h-7 bg-white/20 rounded-lg flex items-center justify-center backdrop-blur-sm">
                <Waves className="w-4 h-4 text-white" />
              </div>
              <div>
                <h1 className="font-bold text-base tracking-wide leading-tight">Lector.</h1>
                <p className="text-[9px] text-white/80 font-normal leading-tight">Dormitory & Utilities</p>
              </div>
            </div>
            <button
              onClick={() => setIsMobileSidebarOpen(false)}
              className="md:hidden p-2 text-slate-400 hover:text-slate-700 ml-1"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* รายการปุ่มนำทาง (Navigation Links) */}
          <nav className="px-4 py-2 space-y-1">
            {/* ปุ่มไปแท็บแผงควบคุม */}
            <button
              onClick={() => {
                setCurrentTab('dashboard');
                setIsMobileSidebarOpen(false);
              }}
              className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-xl transition text-left ${
                currentTab === 'dashboard'
                  ? 'text-[#ff3377] bg-pink-50/80 font-semibold shadow-sm'
                  : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              <LayoutDashboard className={`w-4 h-4 ${currentTab === 'dashboard' ? 'text-[#ff3377]' : ''}`} />
              <span>แผงควบคุม</span>
            </button>

            {/* ปุ่มเปิด Modal ออกบิลด่วน */}
            <button
              onClick={() => {
                setCalcInitialRoomId(null);
                setIsCalcModalOpen(true);
                setIsMobileSidebarOpen(false);
              }}
              className="w-full flex items-center gap-3 px-4 py-3 text-sm font-medium text-slate-500 rounded-xl hover:bg-slate-50 hover:text-slate-900 transition text-left"
            >
              <Calculator className="w-4 h-4" />
              <span>คำนวณบิลด่วน</span>
            </button>

            {/* ปุ่มไปแท็บรายการบิล */}
            <button
              onClick={() => {
                setCurrentTab('invoices');
                setIsMobileSidebarOpen(false);
              }}
              className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-xl transition text-left ${
                currentTab === 'invoices'
                  ? 'text-[#ff3377] bg-pink-50/80 font-semibold shadow-sm'
                  : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              <Receipt className={`w-4 h-4 ${currentTab === 'invoices' ? 'text-[#ff3377]' : ''}`} />
              <span>รายการบิล</span>
            </button>

            {/* ปุ่มไปแท็บจัดการห้องพัก */}
            <button
              onClick={() => {
                setCurrentTab('rooms');
                setIsMobileSidebarOpen(false);
              }}
              className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-xl transition text-left ${
                currentTab === 'rooms'
                  ? 'text-[#ff3377] bg-pink-50/80 font-semibold shadow-sm'
                  : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              <DoorOpen className={`w-4 h-4 ${currentTab === 'rooms' ? 'text-[#ff3377]' : ''}`} />
              <span>จัดการห้องพัก</span>
            </button>

            {/* ปุ่มไปแท็บสถิติและวิเคราะห์ */}
            <button
              onClick={() => {
                setCurrentTab('analytics');
                setIsMobileSidebarOpen(false);
              }}
              className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-xl transition text-left ${
                currentTab === 'analytics'
                  ? 'text-[#ff3377] bg-pink-50/80 font-semibold shadow-sm'
                  : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              <BarChart3 className={`w-4 h-4 ${currentTab === 'analytics' ? 'text-[#ff3377]' : ''}`} />
              <span>สถิติ & วิเคราะห์</span>
            </button>

            {/* ปุ่มออกจากระบบ */}
            {onLogout && (
              <button
                onClick={onLogout}
                className="w-full flex items-center gap-3 px-4 py-3 text-sm font-medium text-red-500 hover:bg-red-50 rounded-xl transition text-left mt-2"
              >
                <Lock className="w-4 h-4" />
                <span>ออกจากระบบ</span>
              </button>
            )}
          </nav>
        </div>

        {/* ส่วนท้าย Sidebar แสดงชื่อหอพักและสิทธิ์ Admin */}
        <div className="p-4 border-t border-slate-100 bg-slate-50/50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-pink-500 to-rose-400 text-white flex items-center justify-center font-bold text-sm shadow-md shrink-0">
                <Building2 className="w-4 h-4" />
              </div>
              <div className="overflow-hidden">
                <p className="text-xs font-bold text-slate-800 truncate">
                  {settings?.dorm_name || 'หอพักเดอะเลคเตอร์'}
                </p>
                <p className="text-[10px] text-slate-500 truncate">ผู้ดูแลหอพัก (Admin)</p>
              </div>
            </div>
          </div>
        </div>
      </aside>

      {/* -------------------------------------------------------------------- */}
      {/* 3. พื้นที่ทำงานหลัก (Main Viewport Area)                              */}
      {/* -------------------------------------------------------------------- */}
      <main className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        {/* แถบหัวด้านบน (Top Header Bar) พร้อมตัวเลือกเดือนและปุ่มตั้งค่า */}
        <header className="bg-white/90 backdrop-blur-md sticky top-0 z-30 border-b border-slate-100 px-4 sm:px-6 md:px-8 py-3 sm:py-4 flex items-center justify-between gap-2 shadow-xs">
          <div className="flex items-center gap-2 sm:gap-4 min-w-0">
            <button
              onClick={() => setIsMobileSidebarOpen(true)}
              className="md:hidden p-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition active:scale-95"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="truncate">
              <h2 className="text-base sm:text-xl font-bold text-slate-800 truncate">
                {currentTab === 'dashboard' && 'ภาพรวมหอพัก'}
                {currentTab === 'invoices' && 'รายการบิล & ใบแจ้งหนี้'}
                {currentTab === 'rooms' && 'จัดการห้องพัก'}
                {currentTab === 'analytics' && 'สถิติและการเงิน'}
              </h2>
              <p className="text-[10px] sm:text-xs text-slate-400 hidden sm:block">
                ระบบบันทึกมิเตอร์น้ำ-ไฟ คำนวณบิล และสร้าง QR Code พร้อมเพย์
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
            {/* ตัวเลือกตัวกรองรอบเดือน (Month Filter Selector) */}
            <div className="flex items-center bg-slate-100 rounded-xl p-0.5 sm:p-1 text-xs">
              <label className="px-1.5 sm:px-2 text-slate-500 font-medium hidden sm:flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" /> รอบเดือน:
              </label>
              <input
                type="month"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="bg-white rounded-lg px-2 py-1 text-slate-800 font-semibold border-0 shadow-sm focus:ring-2 focus:ring-pink-500 outline-none text-[11px] sm:text-xs"
              />
            </div>

            {/* ปุ่มเปิดหน้าต่างตั้งค่าระบบ (Settings Modal) */}
            <button
              onClick={() => setIsSettingsModalOpen(true)}
              className="p-2 sm:p-2.5 text-slate-500 hover:text-slate-900 rounded-xl hover:bg-slate-100 transition"
              title="ตั้งค่าหอพัก"
            >
              <Settings className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
            </button>
          </div>
        </header>

        {/* พื้นที่แสดงเนื้อหาของแต่ละแท็บ */}
        <div className="p-3.5 sm:p-6 md:p-8 space-y-4 sm:space-y-6 max-w-7xl mx-auto w-full">
          {/* ==================================================== */}
          {/* TOP HERO ACTION BANNER (Matching dormitory-system-main) */}
          {/* ==================================================== */}
          <div className="bg-white dashboard-card p-5 sm:p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border border-slate-100/80">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-pink-500 to-rose-400 text-white flex items-center justify-center shadow-md shadow-pink-500/25 shrink-0">
                <Building2 className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-base sm:text-xl font-bold text-slate-800 font-kanit">
                    {settings?.dorm_name || 'หอพักเดอะเลคเตอร์'}
                  </h2>
                  <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span> ระบบพร้อมใช้งาน
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* ---------------------------------------------------------------- */}
          {/* แถบแจ้งเตือนสลิปรอการตรวจสอบ (Pending Slips Alert Banner)          */}
          {/* ---------------------------------------------------------------- */}
          {pendingSlips.length > 0 && (
            <div className="bg-gradient-to-r from-amber-500 to-orange-500 text-white p-3.5 sm:p-4 rounded-2xl shadow-lg shadow-amber-500/20 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center shrink-0">
                  <BellRing className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h4 className="text-xs sm:text-sm font-bold flex items-center gap-1.5">
                    <span>มีสลิปโอนเงินรอการตรวจสอบ</span>
                    <span className="bg-white text-amber-700 px-2 py-0.2 rounded-full text-xs font-black">
                      {pendingSlips.length}
                    </span>
                  </h4>
                  <p className="text-[11px] text-white/90">
                    ผู้เช่าแนบสลิปชำระเงินเข้ามาแล้ว คลิกเพื่อตรวจสอบและยืนยันยอดเงิน
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedSlipInvoice(pendingSlips[0])}
                className="px-3.5 py-2 bg-white text-amber-800 font-bold rounded-xl text-xs hover:bg-amber-50 transition shrink-0 shadow-sm flex items-center gap-1 cursor-pointer"
              >
                <span>ตรวจสลิปห้อง {pendingSlips[0].room_number}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* ================================================================ */}
          {/* แท็บที่ 1: แผงควบคุมภาพรวม (DASHBOARD TAB)                        */}
          {/* ================================================================ */}
          {currentTab === 'dashboard' && (
            <div className="space-y-6">
              {/* การ์ดสถิติ 4 ช่องแบบ Gradient (Bento Cards): ค่าน้ำ, ค่าไฟ, ค่าเช่า, ยอดค้างชำระ */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 md:gap-6 text-white">
                {/* การ์ดที่ 1: สถานะค่าน้ำประปา */}
                <div className="bg-card-blue rounded-2xl p-4 sm:p-5 shadow-lg shadow-blue-500/15 relative overflow-hidden flex flex-col justify-between h-36 sm:h-40">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-[11px] sm:text-xs text-white/80 font-medium">มิเตอร์น้ำประปา (Water)</p>
                      <p className="text-[11px] sm:text-xs text-white/95 font-bold mt-0.5">รวม {monthWaterUnits} ยูนิต</p>
                    </div>
                    <div className="p-2 bg-white/20 rounded-xl backdrop-blur-sm">
                      <Droplet className="w-4 h-4 text-white" />
                    </div>
                  </div>
                  <div className="flex items-end justify-between">
                    <div className="text-[10px] text-white/80 font-medium">
                      ล็อกคงที่ {settings?.default_water_rate || 6}฿/น.
                    </div>
                    <div className="text-right">
                      <h3 className="text-xl sm:text-2xl font-bold font-kanit leading-none">
                        ฿{monthWaterAmount.toLocaleString()}
                      </h3>
                      <p className="text-[10px] text-white/80 mt-1">ยอดค่าน้ำเดือนนี้</p>
                    </div>
                  </div>
                </div>

                {/* การ์ดที่ 2: สถานะค่าไฟฟ้า */}
                <div className="bg-card-orange rounded-2xl p-4 sm:p-5 shadow-lg shadow-amber-500/15 relative overflow-hidden flex flex-col justify-between h-36 sm:h-40">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-[11px] sm:text-xs text-white/80 font-medium">มิเตอร์ไฟฟ้า (Electricity)</p>
                      <p className="text-[11px] sm:text-xs text-white/95 font-bold mt-0.5">รวม {monthElecUnits} ยูนิต</p>
                    </div>
                    <div className="p-2 bg-white/20 rounded-xl backdrop-blur-sm">
                      <Zap className="w-4 h-4 text-white" />
                    </div>
                  </div>
                  <div className="flex items-end justify-between">
                    <div className="text-[10px] text-white/80 font-medium">
                      ล็อกคงที่ {settings?.default_elec_rate || 7}฿/น.
                    </div>
                    <div className="text-right">
                      <h3 className="text-xl sm:text-2xl font-bold font-kanit leading-none">
                        ฿{monthElecAmount.toLocaleString()}
                      </h3>
                      <p className="text-[10px] text-white/80 mt-1">ยอดค่าไฟเดือนนี้</p>
                    </div>
                  </div>
                </div>

                {/* การ์ดที่ 3: สถานะค่าเช่าห้องพัก */}
                <div className="bg-card-purple rounded-2xl p-4 sm:p-5 shadow-lg shadow-purple-500/15 relative overflow-hidden flex flex-col justify-between h-36 sm:h-40">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-[11px] sm:text-xs text-white/80 font-medium">ค่าเช่าห้องพัก (Room Rent)</p>
                      <p className="text-[11px] sm:text-xs text-white/95 font-bold mt-0.5">
                        มีผู้พัก {stats.occupied_rooms} ห้อง (จาก {stats.total_rooms})
                      </p>
                    </div>
                    <div className="p-2 bg-white/20 rounded-xl backdrop-blur-sm">
                      <Home className="w-4 h-4 text-white" />
                    </div>
                  </div>
                  <div className="flex items-end justify-between">
                    <div className="text-[10px] text-white/80 font-medium">รายเดือน / รายเทอม</div>
                    <div className="text-right">
                      <h3 className="text-xl sm:text-2xl font-bold font-kanit leading-none">
                        ฿{monthRentAmount > 0 ? monthRentAmount.toLocaleString() : (stats.paid_amount || 0).toLocaleString()}
                      </h3>
                      <p className="text-[10px] text-white/80 mt-1">ยอดค่าเช่าเดือนนี้</p>
                    </div>
                  </div>
                </div>

                {/* การ์ดที่ 4: ยอดค้างชำระรอรับเงิน */}
                <div className="bg-card-pink rounded-2xl p-4 sm:p-5 shadow-lg shadow-pink-500/15 relative overflow-hidden flex flex-col justify-between h-36 sm:h-40">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-[11px] sm:text-xs text-white/80 font-medium">ยอดรอชำระ (Pending)</p>
                      <p className="text-[11px] sm:text-xs text-white/95 font-bold mt-0.5">
                        รอชำระ {stats.pending_count} บิล
                      </p>
                    </div>
                    <div className="p-2 bg-white/20 rounded-xl backdrop-blur-sm">
                      <Clock className="w-4 h-4 text-white" />
                    </div>
                  </div>
                  <div className="flex items-end justify-between">
                    <div className="text-[10px] text-white/80 font-medium">สแกน QR พร้อมเพย์</div>
                    <div className="text-right">
                      <h3 className="text-xl sm:text-2xl font-bold font-kanit leading-none">
                        ฿{Number(stats.pending_amount).toLocaleString()}
                      </h3>
                      <p className="text-[10px] text-white/80 mt-1">ยังไม่ได้รับชำระ</p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Recent Activities Timeline */}
                <div className="bg-white dashboard-card p-6 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between pb-4 border-b border-slate-50">
                      <h3 className="text-sm font-semibold text-slate-800">Recent Activities</h3>
                      <span className="text-xs text-slate-400">ประวัติบันทึกล่าสุด</span>
                    </div>

                    <div className="divide-y divide-slate-50 my-2 space-y-1">
                      {invoices.slice(0, 5).map((inv) => (
                        <div key={inv.id} className="py-2.5 flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-pink-100 text-[#ff3377] flex items-center justify-center font-bold text-xs">
                              {inv.room_number}
                            </div>
                            <div>
                              <p className="text-xs font-bold text-slate-800">
                                ห้อง {inv.room_number} - {inv.tenant_name || 'ผู้เช่า'}
                              </p>
                              <p className="text-[10px] text-slate-400">
                                บิลรอบ {inv.billing_month} ({inv.payment_status === 'paid' ? 'ชำระแล้ว' : 'รอชำระ'})
                              </p>
                            </div>
                          </div>
                          <span className="text-xs font-bold text-[#ff3377]">
                            ฿{Number(inv.grand_total).toLocaleString()}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="pt-4 border-t border-slate-50 text-center">
                    <button
                      onClick={() => setCurrentTab('invoices')}
                      className="text-xs text-[#ff3377] font-semibold hover:underline flex items-center justify-center gap-1 mx-auto"
                    >
                      <span>ดูประวัติทั้งหมด</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Monthly Invoices Table */}
                <div className="lg:col-span-2 bg-white dashboard-card p-6 flex flex-col justify-between">
                  <div>
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-50">
                      <div>
                        <h3 className="text-sm font-bold text-slate-800">รายการใบแจ้งหนี้ประจำเดือน</h3>
                        <p className="text-xs text-slate-400">Monthly Invoices & Meter Records</p>
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        {/* Status Filter Pills */}
                        <div className="flex items-center bg-slate-100 p-1 rounded-xl text-xs font-semibold">
                          <button
                            onClick={() => setInvoiceStatusFilter('all')}
                            className={`px-2.5 py-1 rounded-lg transition ${
                              invoiceStatusFilter === 'all' ? 'bg-white text-[#ff3377] shadow-xs' : 'text-slate-500'
                            }`}
                          >
                            ทั้งหมด
                          </button>
                          <button
                            onClick={() => setInvoiceStatusFilter('pending')}
                            className={`px-2.5 py-1 rounded-lg transition ${
                              invoiceStatusFilter === 'pending' ? 'bg-white text-[#ff3377] shadow-xs' : 'text-slate-500'
                            }`}
                          >
                            รอชำระ
                          </button>
                          <button
                            onClick={() => setInvoiceStatusFilter('paid')}
                            className={`px-2.5 py-1 rounded-lg transition ${
                              invoiceStatusFilter === 'paid' ? 'bg-white text-[#ff3377] shadow-xs' : 'text-slate-500'
                            }`}
                          >
                            ชำระแล้ว
                          </button>
                        </div>

                        {/* Search Input */}
                        <div className="relative">
                          <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="ค้นหาห้อง/ชื่อ..."
                            className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 pl-8 text-xs text-slate-700 focus:ring-2 focus:ring-pink-500 focus:bg-white outline-none w-36 transition"
                          />
                          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                        </div>
                      </div>
                    </div>

                    {/* Table with Dark Navy Header */}
                    <div className="overflow-x-auto my-4">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="bg-[#1e293b] text-white font-medium uppercase tracking-wider rounded-xl overflow-hidden text-[11px]">
                            <th className="py-3 px-4 rounded-l-xl">INVOICE</th>
                            <th className="py-3 px-4">CUSTOMERS (ห้อง/ชื่อ)</th>
                            <th className="py-3 px-4">MONTH</th>
                            <th className="py-3 px-4 text-right">PRICE (ยอดรวม)</th>
                            <th className="py-3 px-4 text-center">STATUS</th>
                            <th className="py-3 px-4 text-right rounded-r-xl">ACTIONS</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-slate-700">
                          {filteredInvoices.length === 0 ? (
                            <tr>
                              <td colSpan="6" className="text-center py-8 text-slate-400">
                                ไม่พบรายการใบแจ้งหนี้
                              </td>
                            </tr>
                          ) : (
                            filteredInvoices.slice(0, 8).map((inv) => {
                              const isPaid = inv.payment_status === 'paid';
                              const hasSlip = inv.slip_url && inv.slip_url.length > 0;

                              return (
                                <tr key={inv.id} className="hover:bg-slate-50/60 transition">
                                  <td className="py-3 px-4 font-bold text-slate-900">{inv.invoice_no}</td>
                                  <td className="py-3 px-4">
                                    <div className="font-bold text-slate-800">ห้อง {inv.room_number}</div>
                                    <div className="text-[11px] text-slate-400">{inv.tenant_name || '-'}</div>
                                  </td>
                                  <td className="py-3 px-4 font-medium">{inv.billing_month}</td>
                                  <td className="py-3 px-4 text-right font-extrabold text-[#ff3377]">
                                    ฿{Number(inv.grand_total).toLocaleString()}
                                  </td>
                                  <td className="py-3 px-4 text-center">
                                    <span
                                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold inline-flex items-center gap-1 ${
                                        isPaid
                                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                          : 'bg-amber-50 text-amber-700 border border-amber-200'
                                      }`}
                                    >
                                      {isPaid ? '✓ ชำระแล้ว' : 'รอชำระ'}
                                    </span>
                                  </td>
                                  <td className="py-3 px-4 text-right">
                                    <div className="flex items-center justify-end gap-1.5">
                                      <button
                                        onClick={() => handleEditInvoice(inv)}
                                        className="p-1.5 text-slate-400 hover:text-[#ff3377] rounded-lg hover:bg-pink-50 transition"
                                        title="แก้ไขใบแจ้งหนี้"
                                      >
                                        <Edit className="w-4 h-4" />
                                      </button>
                                      <button
                                        onClick={() => handleOpenInvoice(inv.id)}
                                        className="p-1.5 text-slate-400 hover:text-slate-800 rounded-lg hover:bg-slate-100 transition"
                                        title="ดูใบเสร็จ"
                                      >
                                        <Eye className="w-4 h-4" />
                                      </button>
                                      {hasSlip && !isPaid && (
                                        <button
                                          onClick={() => setSelectedSlipInvoice(inv)}
                                          className="px-2 py-0.5 bg-amber-100 hover:bg-amber-200 text-amber-800 rounded-lg text-[11px] font-bold border border-amber-300"
                                        >
                                          ตรวจสลิป
                                        </button>
                                      )}
                                      <button
                                        onClick={() => handleDeleteInvoice(inv.id, inv.invoice_no)}
                                        className="p-1.5 text-slate-300 hover:text-red-500 rounded-lg hover:bg-red-50 transition"
                                        title="ลบ"
                                      >
                                        <Trash2 className="w-4 h-4" />
                                      </button>
                                    </div>
                                  </td>
                                </tr>
                              );
                            })
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-4 border-t border-slate-50 text-xs text-slate-500">
                    <p>แสดง {filteredInvoices.length} รายการ</p>
                    <button
                      onClick={() => setCurrentTab('invoices')}
                      className="text-[#ff3377] font-semibold hover:underline"
                    >
                      ดูทั้งหมด
                    </button>
                  </div>
                </div>
              </div>

              {/* Quick Rooms Matrix */}
              <div className="bg-white dashboard-card p-6">
                <div className="flex items-center justify-between pb-4 border-b border-slate-50">
                  <div>
                    <h3 className="text-base font-bold text-slate-800">ผังสถานะห้องพักด่วน</h3>
                    <p className="text-xs text-slate-400">คลิกที่ห้องพักเพื่อออกบิลหรือแก้ไขข้อมูล</p>
                  </div>
                  <button
                    onClick={() => setCurrentTab('rooms')}
                    className="text-xs text-[#ff3377] font-semibold hover:underline flex items-center gap-1"
                  >
                    <span>จัดการห้องพักทั้งหมด</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-8 gap-3 mt-4">
                  {rooms.map((r) => {
                    const isOcc = r.status === 'occupied';
                    return (
                      <div
                        key={r.id}
                        onClick={() => handleQuickCalculateRoom(r.id)}
                        className={`p-3 rounded-2xl border text-center cursor-pointer transition transform hover:-translate-y-0.5 shadow-xs ${
                          isOcc
                            ? 'bg-emerald-50/60 border-emerald-200 text-emerald-800 hover:bg-emerald-100/60'
                            : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                        }`}
                      >
                        <div className="font-extrabold text-base font-kanit">{r.room_number}</div>
                        <div className="text-[10px] mt-0.5">{isOcc ? 'มีผู้เช่า' : 'ห้องว่าง'}</div>
                        <div className="text-[9px] text-slate-400 mt-1">ชั้น {r.floor}</div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* ================================================================ */}
          {/* แท็บที่ 2: รายการบิลและใบแจ้งหนี้ฉบับเต็ม (INVOICES TAB)           */}
          {/* ================================================================ */}
          {currentTab === 'invoices' && (
            <div className="bg-white dashboard-card p-6 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
                <div>
                  <h3 className="text-base font-bold text-slate-800">รายการใบแจ้งหนี้ทั้งหมด</h3>
                  <p className="text-xs text-slate-400">ประวัติการออกบิล ค่าน้ำ-ไฟ และสถานะการชำระเงิน</p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <div className="flex items-center bg-slate-100 p-1 rounded-xl text-xs font-semibold">
                    <button
                      onClick={() => setInvoiceStatusFilter('all')}
                      className={`px-3 py-1.5 rounded-lg transition ${
                        invoiceStatusFilter === 'all' ? 'bg-white text-[#ff3377] shadow-xs' : 'text-slate-500'
                      }`}
                    >
                      ทั้งหมด ({invoices.length})
                    </button>
                    <button
                      onClick={() => setInvoiceStatusFilter('pending')}
                      className={`px-3 py-1.5 rounded-lg transition ${
                        invoiceStatusFilter === 'pending' ? 'bg-white text-[#ff3377] shadow-xs' : 'text-slate-500'
                      }`}
                    >
                      รอชำระ ({stats.pending_count})
                    </button>
                    <button
                      onClick={() => setInvoiceStatusFilter('paid')}
                      className={`px-3 py-1.5 rounded-lg transition ${
                        invoiceStatusFilter === 'paid' ? 'bg-white text-[#ff3377] shadow-xs' : 'text-slate-500'
                      }`}
                    >
                      ชำระแล้ว ({stats.paid_count})
                    </button>
                  </div>
                </div>
              </div>

              {/* Invoices Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-[#1e293b] text-white font-medium uppercase tracking-wider rounded-xl overflow-hidden text-[11px]">
                      <th className="py-3.5 px-4 rounded-l-xl">เลขที่บิล</th>
                      <th className="py-3.5 px-4">ห้องพัก</th>
                      <th className="py-3.5 px-4">ผู้เช่า</th>
                      <th className="py-3.5 px-4">รอบบิล</th>
                      <th className="py-3.5 px-4">มิเตอร์น้ำ</th>
                      <th className="py-3.5 px-4">มิเตอร์ไฟ</th>
                      <th className="py-3.5 px-4 text-right">ยอดรวมสุทธิ</th>
                      <th className="py-3.5 px-4 text-center">สถานะ</th>
                      <th className="py-3.5 px-4 text-right rounded-r-xl">จัดการ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {filteredInvoices.map((inv) => {
                      const isPaid = inv.payment_status === 'paid';
                      const hasSlip = inv.slip_url && inv.slip_url.length > 0;

                      return (
                        <tr key={inv.id} className="hover:bg-slate-50/70 transition">
                          <td className="py-3.5 px-4 font-bold text-slate-900">{inv.invoice_no}</td>
                          <td className="py-3.5 px-4 font-extrabold text-slate-800">ห้อง {inv.room_number}</td>
                          <td className="py-3.5 px-4 text-slate-600">{inv.tenant_name || '-'}</td>
                          <td className="py-3.5 px-4 font-semibold">{inv.billing_month}</td>
                          <td className="py-3.5 px-4">
                            {inv.water_units} น. (฿{inv.water_total})
                          </td>
                          <td className="py-3.5 px-4">
                            {inv.elec_units} น. (฿{inv.elec_total})
                          </td>
                          <td className="py-3.5 px-4 text-right font-extrabold text-[#ff3377] text-sm">
                            ฿{Number(inv.grand_total).toLocaleString()}
                          </td>
                          <td className="py-3.5 px-4 text-center">
                            <span
                              className={`px-3 py-1 rounded-full text-xs font-bold inline-flex items-center gap-1 ${
                                isPaid
                                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                  : 'bg-amber-50 text-amber-700 border border-amber-200'
                              }`}
                            >
                              {isPaid ? '✓ ชำระแล้ว' : 'รอชำระ'}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => handleEditInvoice(inv)}
                                className="px-3 py-1.5 bg-pink-50 hover:bg-pink-100 text-[#ff3377] rounded-lg text-xs font-semibold flex items-center gap-1 transition cursor-pointer"
                                title="แก้ไขใบแจ้งหนี้"
                              >
                                <Edit className="w-3.5 h-3.5" /> แก้ไข
                              </button>
                              <button
                                onClick={() => handleOpenInvoice(inv.id)}
                                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1 transition cursor-pointer"
                              >
                                <Eye className="w-3.5 h-3.5" /> ดูบิล
                              </button>
                              {hasSlip && !isPaid && (
                                <button
                                  onClick={() => setSelectedSlipInvoice(inv)}
                                  className="px-3 py-1.5 bg-amber-100 hover:bg-amber-200 text-amber-800 rounded-lg text-xs font-bold border border-amber-300 cursor-pointer"
                                >
                                  ตรวจสลิป
                                </button>
                              )}
                              <button
                                onClick={() => handleDeleteInvoice(inv.id, inv.invoice_no)}
                                className="p-1.5 text-slate-300 hover:text-red-500 rounded-lg hover:bg-red-50 transition cursor-pointer"
                                title="ลบใบแจ้งหนี้"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ================================================================ */}
          {/* แท็บที่ 3: จัดการห้องพักและผู้เช่า (ROOMS TAB)                      */}
          {/* ================================================================ */}
          {currentTab === 'rooms' && (
            <div className="bg-white dashboard-card p-6 space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
                <div>
                  <h3 className="text-base font-bold text-slate-800">จัดการห้องพัก & รายละเอียดผู้เช่า</h3>
                  <p className="text-xs text-slate-400">กำหนดเรทค่าน้ำ-ไฟเฉพาะห้อง บันทึกชื่อผู้เช่า และออกบิล</p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={() => {
                      setEditingRoom(null);
                      setIsRoomModalOpen(true);
                    }}
                    className="bg-btn-pink text-white text-xs font-semibold px-4 py-2 rounded-xl flex items-center gap-1.5 shadow-md shadow-pink-500/20 cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    <span>เพิ่มห้องพักใหม่</span>
                  </button>
                </div>
              </div>

              {/* ตัวกรองตามชั้นและสถานะห้องพัก */}
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl text-xs font-semibold">
                  <button
                    onClick={() => setRoomFloorFilter('all')}
                    className={`px-3 py-1.5 rounded-lg transition ${
                      roomFloorFilter === 'all' ? 'bg-white text-[#ff3377] shadow-xs' : 'text-slate-500'
                    }`}
                  >
                    ทุกชั้น ({rooms.length})
                  </button>
                  {floors.map((fl) => (
                    <button
                      key={fl}
                      onClick={() => setRoomFloorFilter(String(fl))}
                      className={`px-3 py-1.5 rounded-lg transition ${
                        roomFloorFilter === String(fl) ? 'bg-white text-[#ff3377] shadow-xs' : 'text-slate-500'
                      }`}
                    >
                      ชั้น {fl}
                    </button>
                  ))}
                </div>

                <div className="flex items-center gap-1.5">
                  {['all', 'occupied', 'vacant'].map((st) => (
                    <button
                      key={st}
                      onClick={() => setRoomStatusFilter(st)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition ${
                        roomStatusFilter === st
                          ? 'bg-slate-800 text-white border-slate-800'
                          : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      {st === 'all' && 'ทั้งหมด'}
                      {st === 'occupied' && 'มีผู้เช่า'}
                      {st === 'vacant' && 'ห้องว่าง'}
                    </button>
                  ))}
                </div>
              </div>

              {/* การ์ดแสดงผังห้องพักแต่ละห้อง */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {filteredRooms.map((r) => {
                  const isOcc = r.status === 'occupied';
                  return (
                    <div
                      key={r.id}
                      className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs flex flex-col justify-between hover:shadow-md transition"
                    >
                      <div>
                        <div className="flex items-start justify-between">
                          <div>
                            <span className="text-[10px] font-bold text-slate-400 uppercase">ชั้น {r.floor}</span>
                            <h4 className="text-2xl font-extrabold text-slate-900 font-kanit mt-0.5">
                              ห้อง {r.room_number}
                            </h4>
                          </div>
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                              isOcc
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : 'bg-slate-100 text-slate-600 border border-slate-200'
                            }`}
                          >
                            {isOcc ? 'มีผู้เช่า' : 'ห้องว่าง'}
                          </span>
                        </div>

                        <div className="bg-slate-50 p-3 rounded-xl my-3 text-xs">
                          <div className="text-slate-400 text-[10px]">ผู้เช่า:</div>
                          <div className="font-bold text-slate-800 truncate">
                            {r.tenant_name || <span className="text-slate-400 font-normal">ยังไม่มีผู้เช่า</span>}
                          </div>
                          {r.tenant_phone && <div className="text-slate-500 text-[11px] mt-0.5">โทร: {r.tenant_phone}</div>}
                        </div>

                        <div className="grid grid-cols-3 gap-2 text-center text-[11px] mb-3">
                          <div className="bg-slate-50 p-2 rounded-lg">
                            <span className="text-slate-400 text-[9px] block">ค่าเช่า</span>
                            <strong className="text-[#ff3377]">฿{Number(r.base_rent).toLocaleString()}</strong>
                          </div>
                          <div className="bg-slate-50 p-2 rounded-lg">
                            <span className="text-slate-400 text-[9px] block">ค่าน้ำ</span>
                            <strong>{r.water_rate}฿</strong>
                          </div>
                          <div className="bg-slate-50 p-2 rounded-lg">
                            <span className="text-slate-400 text-[9px] block">ค่าไฟ</span>
                            <strong>{r.elec_rate}฿</strong>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 pt-3 border-t border-slate-100">
                        <button
                          onClick={() => handleQuickCalculateRoom(r.id)}
                          className="flex-1 bg-btn-pink text-white text-xs font-semibold py-2 rounded-xl flex items-center justify-center gap-1 shadow-xs cursor-pointer"
                        >
                          <Calculator className="w-3.5 h-3.5" />
                          <span>ออกบิล</span>
                        </button>
                        <button
                          onClick={() => {
                            setEditingRoom(r);
                            setIsRoomModalOpen(true);
                          }}
                          className="p-2 text-slate-500 hover:text-slate-800 rounded-xl hover:bg-slate-100 border border-slate-200 transition cursor-pointer"
                          title="แก้ไขห้อง"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteRoom(r.id, r.room_number)}
                          className="p-2 text-slate-400 hover:text-red-500 rounded-xl hover:bg-red-50 border border-slate-200 transition cursor-pointer"
                          title="ลบห้อง"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ================================================================ */}
          {/* แท็บที่ 4: สถิติและบทวิเคราะห์รายได้ (ANALYTICS TAB)                */}
          {/* ================================================================ */}
          {currentTab === 'analytics' && (
            <div className="bg-white dashboard-card p-6 space-y-6">
              <div className="pb-4 border-b border-slate-100">
                <h3 className="text-base font-bold text-slate-800">สถิติและวิเคราะห์รายได้</h3>
                <p className="text-xs text-slate-400">สรุปการใช้ทรัพยากรน้ำ-ไฟ และกระแสเงินสดประจำหอพัก</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100 text-center">
                  <Droplet className="w-8 h-8 text-blue-500 mx-auto mb-2" />
                  <span className="text-xs text-slate-500">การใช้น้ำประปารวมเดือนนี้</span>
                  <h4 className="text-2xl font-extrabold text-blue-600 font-kanit mt-1">{monthWaterUnits} หน่วย</h4>
                  <p className="text-xs font-semibold text-slate-600 mt-1">มูลค่า ฿{monthWaterAmount.toLocaleString()}</p>
                </div>

                <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100 text-center">
                  <Zap className="w-8 h-8 text-amber-500 mx-auto mb-2" />
                  <span className="text-xs text-slate-500">การใช้ไฟฟ้ารวมเดือนนี้</span>
                  <h4 className="text-2xl font-extrabold text-amber-600 font-kanit mt-1">{monthElecUnits} หน่วย</h4>
                  <p className="text-xs font-semibold text-slate-600 mt-1">มูลค่า ฿{monthElecAmount.toLocaleString()}</p>
                </div>

                <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100 text-center">
                  <Home className="w-8 h-8 text-purple-500 mx-auto mb-2" />
                  <span className="text-xs text-slate-500">อัตราการเข้าพัก</span>
                  <h4 className="text-2xl font-extrabold text-purple-600 font-kanit mt-1">
                    {stats.total_rooms > 0 ? ((stats.occupied_rooms / stats.total_rooms) * 100).toFixed(0) : 0}%
                  </h4>
                  <p className="text-xs font-semibold text-slate-600 mt-1">
                    {stats.occupied_rooms} ห้อง (ว่าง {stats.vacant_rooms} ห้อง)
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* ==================================================================== */}
      {/* 4. หน้าต่างป๊อปอัปทั้งหมดในระบบ (Pop-up Modals Integration)           */}
      {/* ==================================================================== */}

      {/* หน้าต่างพิมพ์ใบแจ้งหนี้ / ใบเสร็จ */}
      {selectedInvoiceData && (
        <InvoiceModal
          invoiceData={selectedInvoiceData}
          onClose={() => setSelectedInvoiceData(null)}
        />
      )}

      {/* หน้าต่างคำนวณและออกบิลประจำเดือน */}
      {isCalcModalOpen && (
        <CalculatorModal
          isOpen={isCalcModalOpen}
          onClose={() => {
            setIsCalcModalOpen(false);
            setCalcInitialRoomId(null);
          }}
          onInvoiceCreated={loadAllData}
          initialRoomId={calcInitialRoomId}
        />
      )}

      {/* หน้าต่างเพิ่มหรือแก้ไขข้อมูลห้องพัก */}
      {isRoomModalOpen && (
        <RoomModal
          isOpen={isRoomModalOpen}
          onClose={() => {
            setIsRoomModalOpen(false);
            setEditingRoom(null);
          }}
          onSaved={loadAllData}
          editingRoom={editingRoom}
        />
      )}

      {/* หน้าต่างตรวจสอบและอนุมัติสลิปการโอนเงิน */}
      {selectedSlipInvoice && (
        <SlipVerifyModal
          isOpen={!!selectedSlipInvoice}
          onClose={() => setSelectedSlipInvoice(null)}
          invoice={selectedSlipInvoice}
          onVerified={loadAllData}
        />
      )}

      {/* หน้าต่างตั้งค่าระบบหอพักและเปลี่ยนรหัส PIN */}
      {isSettingsModalOpen && (
        <SettingsModal
          isOpen={isSettingsModalOpen}
          onClose={() => setIsSettingsModalOpen(false)}
          onSettingsUpdated={loadAllData}
        />
      )}

      {/* หน้าต่างแก้ไขรายละเอียดใบแจ้งหนี้เดิม */}
      {isEditInvoiceModalOpen && editingInvoice && (
        <EditInvoiceModal
          isOpen={isEditInvoiceModalOpen}
          invoice={editingInvoice}
          onClose={() => {
            setIsEditInvoiceModalOpen(false);
            setEditingInvoice(null);
          }}
          onSaved={loadAllData}
        />
      )}
    </div>
  );
}
