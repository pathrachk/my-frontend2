/**
 * ==============================================================================
 * ไฟล์: src/Login/register.jsx
 * หน้าที่: หน้าต่างสมัครสมาชิกสำหรับผู้พักอาศัย/ลูกหอพัก (Tenant Registration Screen)
 * ==============================================================================
 * รายละเอียดการทำงาน:
 * - ดึงรายชื่อห้องพักจริงทั้งหมดจากฐานข้อมูลผ่าน `api.getRooms()` มาแสดงใน Dropdown
 * - ให้ผู้เช่าเลือกห้องพักของตนเอง และกำหนด Username พร้อม Password (ยืนยัน 2 ครั้ง)
 * - บันทึกข้อมูลบัญชีผู้เช่าลงในห้องพักนั้นผ่าน `api.updateRoom()`
 * - ปรับสถานะห้องพักเป็น 'occupied' (มีผู้เช่าแล้ว)
 * - เมื่อสำเร็จ: นำทางเข้าสู่ระบบอัตโนมัติด้วยสิทธิ์ 'tenant'
 * 
 * Props:
 * - onNavigate: callback function สำหรับสลับหน้าจอ (เช่น กลับไปยัง 'Login')
 * - onRegisterSuccess: callback function รับ object ข้อมูลผู้เช่าเมื่อสมัครสำเร็จ
 */

import React, { useState, useEffect } from 'react';
import { DoorClosed, User, Lock, Eye, EyeOff, Building2, UserPlus, AlertCircle, CheckCircle2 } from 'lucide-react';
import './login.css';
import { api } from '../services/api';

export default function Register({ onNavigate, onRegisterSuccess }) {
  // ข้อมูลรายชื่อห้องพักที่ดึงมาจากฐานข้อมูล
  const [rooms, setRooms] = useState([]);
  const [loadingRooms, setLoadingRooms] = useState(true);

  // ข้อมูลในฟอร์มลงทะเบียน
  const [selectedRoom, setSelectedRoom] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // สถานะการเปิด/ปิดดูรหัสผ่าน
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // ข้อความแจ้งเตือนผลลัพธ์
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // โหลดรายชื่อห้องพักจริงทั้งหมดจากฐานข้อมูลเมื่อคอมโพเนนต์เริ่มทำงาน
  useEffect(() => {
    setLoadingRooms(true);
    api.getRooms()
      .then((res) => {
        if (res.success && res.data) {
          // เรียงตามชั้น และเลขห้องตามลำดับธรรมชาติ
          const sorted = [...res.data].sort((a, b) => {
            if (a.floor !== b.floor) return a.floor - b.floor;
            return String(a.room_number).localeCompare(String(b.room_number), undefined, { numeric: true });
          });
          setRooms(sorted);
        }
      })
      .catch((err) => {
        console.error('Failed to load rooms for register:', err);
      })
      .finally(() => {
        setLoadingRooms(false);
      });
  }, []);

  /**
   * ฟังก์ชันจัดการการส่งฟอร์มสมัครสมาชิก
   */
  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    // ตรวจสอบความถูกต้องของข้อมูล
    if (!selectedRoom) {
      setErrorMessage('กรุณาเลือกห้องพัก');
      return;
    }

    if (!username.trim()) {
      setErrorMessage('กรุณากรอกชื่อผู้ใช้ (Username)');
      return;
    }

    if (!password) {
      setErrorMessage('กรุณากรอกรหัสผ่าน (Password)');
      return;
    }

    if (password.length < 4) {
      setErrorMessage('รหัสผ่านต้องมีอย่างน้อย 4 ตัวอักษร');
      return;
    }

    if (password !== confirmPassword) {
      setErrorMessage('รหัสผ่านและยืนยันรหัสผ่านไม่ตรงกัน');
      return;
    }

    setIsLoading(true);

    try {
      // ค้นหาห้องที่เลือก เพื่อนำข้อมูลเดิมมาอัปเดตข้อมูลผู้เช่าและรหัสผ่านเข้าฐานข้อมูล
      const targetRoom = rooms.find((r) => String(r.room_number) === String(selectedRoom));
      if (targetRoom) {
        await api.updateRoom(targetRoom.id, {
          ...targetRoom,
          tenant_name: username.trim(),
          tenant_username: username.trim(),
          tenant_password: password,
          room_pin: password,
          status: 'occupied',
        });
      }

      setSuccessMessage(`สมัครสมาชิกห้อง ${selectedRoom} สำเร็จ! กำลังนำเข้าสู่ระบบ...`);

      // สร้าง Session Object สำหรับลูกหอพัก
      const newUser = {
        username: username.trim(),
        name: `ผู้เช่าห้อง ${selectedRoom} (${username.trim()})`,
        room_number: selectedRoom,
        role: 'tenant',
      };

      // หน่วงเวลาเล็กน้อยเพื่อให้ผู้ใช้เห็นข้อความแจ้งเตือนสำเร็จ
      setTimeout(() => {
        if (onRegisterSuccess) {
          onRegisterSuccess(newUser);
        } else if (onNavigate) {
          onNavigate('Login');
        }
      }, 700);
    } catch (err) {
      console.error(err);
      setErrorMessage(err.message || 'เกิดข้อผิดพลาดในการลงทะเบียน');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="dorm-login-page">
      <div className="dorm-login-card">
        {/* ส่วนหัวแสดงโลโก้และหัวข้อการสมัคร */}
        <div className="dorm-login-header">
          <div className="dorm-login-logo">
            <Building2 size={30} />
          </div>
          <h1 className="dorm-login-title">สมัครสมาชิกผู้พักอาศัย</h1>
          <p className="dorm-login-subtitle">เลือกห้องพักและกรอกข้อมูลเพื่อลงทะเบียน</p>
        </div>

        {/* แถบแสดงข้อความผิดพลาด */}
        {errorMessage && (
          <div className="dorm-login-alert">
            <AlertCircle size={16} />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* แถบแสดงข้อความสำเร็จ */}
        {successMessage && (
          <div className="dorm-login-alert dorm-login-alert-success">
            <CheckCircle2 size={16} />
            <span>{successMessage}</span>
          </div>
        )}

        {/* ฟอร์มลงทะเบียน */}
        <form onSubmit={handleSubmit} className="dorm-login-form">
          {/* 1. เลือกห้องพัก (ดึงจากข้อมูลห้องจริงที่เจ้าของหอสร้างไว้) */}
          <div className="dorm-field-group">
            <label className="dorm-field-label">เลือกห้องพัก (จากระบบหอพัก)</label>
            <div className="dorm-input-wrap">
              <DoorClosed size={18} className="dorm-input-icon" />
              <select
                value={selectedRoom}
                onChange={(e) => setSelectedRoom(e.target.value)}
                className="dorm-select"
                required
                disabled={loadingRooms}
              >
                <option value="">-- กรุณาเลือกห้องพักของคุณ --</option>
                {loadingRooms ? (
                  <option value="" disabled>กำลังโหลดรายชื่อห้องพักจากฐานข้อมูล...</option>
                ) : rooms.length > 0 ? (
                  rooms.map((r) => (
                    <option key={r.id} value={r.room_number}>
                      ห้อง {r.room_number} (ชั้น {r.floor}) {r.status === 'vacant' ? '• ห้องว่าง' : (r.tenant_name ? `• ผู้เช่า: ${r.tenant_name}` : '')}
                    </option>
                  ))
                ) : (
                  <option value="" disabled>ยังไม่มีห้องพักในระบบ (รอเจ้าของหอเพิ่มห้อง)</option>
                )}
              </select>
            </div>
          </div>

          {/* 2. ชื่อผู้ใช้ (Username) */}
          <div className="dorm-field-group">
            <label className="dorm-field-label">ชื่อผู้ใช้ (Username)</label>
            <div className="dorm-input-wrap">
              <User size={18} className="dorm-input-icon" />
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="กำหนดชื่อผู้ใช้ของคุณ"
                className="dorm-input"
                autoComplete="username"
                required
              />
            </div>
          </div>

          {/* 3. รหัสผ่าน (Password) */}
          <div className="dorm-field-group">
            <label className="dorm-field-label">รหัสผ่าน (Password)</label>
            <div className="dorm-input-wrap">
              <Lock size={18} className="dorm-input-icon" />
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="กำหนดรหัสผ่าน (อย่างน้อย 4 ตัว)"
                className="dorm-input"
                autoComplete="new-password"
                required
              />
              <button
                type="button"
                className="dorm-input-eye-btn"
                onClick={() => setShowPassword(!showPassword)}
                tabIndex={-1}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {/* 4. ยืนยันรหัสผ่าน (Confirm Password) */}
          <div className="dorm-field-group">
            <label className="dorm-field-label">ยืนยันรหัสผ่าน (Confirm Password)</label>
            <div className="dorm-input-wrap">
              <Lock size={18} className="dorm-input-icon" />
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="กรอกรหัสผ่านอีกครั้งเพื่อยืนยัน"
                className="dorm-input"
                autoComplete="new-password"
                required
              />
              <button
                type="button"
                className="dorm-input-eye-btn"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                tabIndex={-1}
              >
                {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {/* ปุ่มกดยืนยันการสมัคร */}
          <button type="submit" disabled={isLoading || loadingRooms} className="dorm-login-btn">
            {isLoading ? (
              <span>กำลังบันทึกข้อมูล...</span>
            ) : (
              <>
                <UserPlus size={18} />
                <span>สมัครสมาชิก</span>
              </>
            )}
          </button>
        </form>

        {/* ลิงก์สลับกลับไปยังหน้า Login หากมีบัญชีอยู่แล้ว */}
        <div className="dorm-auth-switch">
          <span>มีบัญชีผู้ใช้แล้ว?</span>
          <button
            type="button"
            onClick={() => onNavigate && onNavigate('Login')}
            className="dorm-auth-switch-btn"
          >
            เข้าสู่ระบบ
          </button>
        </div>
      </div>
    </div>
  );
}
