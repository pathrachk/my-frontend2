/**
 * ==============================================================================
 * ไฟล์: src/Login/login.jsx
 * หน้าที่: หน้าต่างลงชื่อเข้าสู่ระบบ (Login Screen)
 * ==============================================================================
 * รายละเอียดการทำงาน:
 * - ให้ผู้ใช้งาน (ทั้งแอดมินเจ้าของหอพัก และลูกหอพัก) กรอก Username และ Password
 * - ตรวจสอบความถูกต้องของข้อมูลเบื้องต้นฝั่ง Client
 * - เรียกใช้ `api.login()` เพื่อตรวจสอบสิทธิ์กับฐานข้อมูล
 * - เมื่อผ่าน: ส่งข้อมูลผู้ใช้กลับไปยัง Root Component (`onLoginSuccess`) เพื่อเปลี่ยนหน้า
 * - มีปุ่มสลับไปยังหน้าจอลงทะเบียน (`Register`) สำหรับผู้เช่าใหม่
 * 
 * Props:
 * - onLoginSuccess: callback function รับ object ข้อมูลผู้ใช้เมื่อล็อกอินสำเร็จ
 * - onNavigate: callback function สำหรับสลับไปยังหน้าจออื่น (เช่น 'Register')
 */

import React, { useState } from 'react';
import { User, Lock, Eye, EyeOff, Building2, LogIn, AlertCircle } from 'lucide-react';
import './login.css';
import { api } from '../services/api';

export default function Login({ onLoginSuccess, onNavigate }) {
  // สถานะค่าในฟอร์ม
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  // สถานะการเปิด/ปิดการมองเห็นรหัสผ่าน
  const [showPassword, setShowPassword] = useState(false);

  // ข้อความแจ้งเตือนข้อผิดพลาด
  const [errorMessage, setErrorMessage] = useState('');

  // สถานะกำลังประมวลผลการส่งข้อมูล
  const [isLoading, setIsLoading] = useState(false);

  /**
   * ฟังก์ชันจัดการเมื่อผู้ใช้กดปุ่ม Submit เพื่อล็อกอิน
   */
  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');

    const trimmedUser = username.trim();
    if (!trimmedUser) {
      setErrorMessage('กรุณากรอกชื่อผู้ใช้ (Username)');
      return;
    }

    if (!password) {
      setErrorMessage('กรุณากรอกรหัสผ่าน (Password)');
      return;
    }

    setIsLoading(true);

    try {
      // เรียก API ตรวจสอบชื่อผู้ใช้และรหัสผ่าน
      const res = await api.login(trimmedUser, password);
      if (res.success && res.data) {
        if (onLoginSuccess) {
          onLoginSuccess(res.data);
        }
      }
    } catch (err) {
      // แสดงข้อความแจ้งเตือนข้อผิดพลาด
      setErrorMessage(err.message || 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="dorm-login-page">
      <div className="dorm-login-card">
        {/* ส่วนหัวแสดงโลโก้และชื่อระบบ */}
        <div className="dorm-login-header">
          <div className="dorm-login-logo">
            <Building2 size={30} />
          </div>
          <h1 className="dorm-login-title">ระบบจัดการหอพัก</h1>
          <p className="dorm-login-subtitle">กรุณาเข้าสู่ระบบเพื่อใช้งาน</p>
        </div>

        {/* แถบแจ้งเตือนเมื่อเกิดข้อผิดพลาด */}
        {errorMessage && (
          <div className="dorm-login-alert">
            <AlertCircle size={16} />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* ฟอร์มกรอกชื่อผู้ใช้และรหัสผ่าน */}
        <form onSubmit={handleSubmit} className="dorm-login-form">
          {/* ช่องกรอก Username */}
          <div className="dorm-field-group">
            <label className="dorm-field-label">ชื่อผู้ใช้ (Username)</label>
            <div className="dorm-input-wrap">
              <User size={18} className="dorm-input-icon" />
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="กรอกชื่อผู้ใช้"
                className="dorm-input"
                autoComplete="username"
                autoFocus
              />
            </div>
          </div>

          {/* ช่องกรอก Password */}
          <div className="dorm-field-group">
            <label className="dorm-field-label">รหัสผ่าน (Password)</label>
            <div className="dorm-input-wrap">
              <Lock size={18} className="dorm-input-icon" />
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="กรอกรหัสผ่าน"
                className="dorm-input"
                autoComplete="current-password"
              />
              {/* ปุ่มเปิด-ปิดแสดงรหัสผ่าน */}
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

          {/* ปุ่มกดยืนยันเข้าสู่ระบบ */}
          <button type="submit" disabled={isLoading} className="dorm-login-btn">
            {isLoading ? (
              <span>กำลังเข้าสู่ระบบ...</span>
            ) : (
              <>
                <LogIn size={18} />
                <span>เข้าสู่ระบบ</span>
              </>
            )}
          </button>
        </form>

        {/* ลิงก์สลับไปยังหน้าจอลงทะเบียนสมัครสมาชิก */}
        <div className="dorm-auth-switch">
          <span>ยังไม่มีบัญชีผู้ใช้?</span>
          <button
            type="button"
            onClick={() => onNavigate && onNavigate('Register')}
            className="dorm-auth-switch-btn"
          >
            สมัครสมาชิกที่นี่
          </button>
        </div>
      </div>
    </div>
  );
}
