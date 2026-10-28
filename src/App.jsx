/**
 * ==============================================================================
 * ไฟล์: src/App.jsx
 * หน้าที่: คอมโพเนนต์หลักระดับบนสุด (Root Component & Router) ของระบบ
 * ==============================================================================
 * รายละเอียดการทำงาน:
 * 1. ตรวจสอบสถานะการเข้าสู่ระบบ (Authentication Guard):
 *    - อ่านข้อมูลผู้ใช้จาก `localStorage.getItem('dorm_user')`
 * 2. จัดการเส้นทางการแสดงผล (Conditional Routing ตามสิทธิ์และสถานะ):
 *    - หากยังไม่ล็อกอิน: แสดงหน้า <Login /> หรือ <Register />
 *    - หากล็อกอินในฐานะลูกหอ (role: 'tenant'): แสดงหน้าจอ <TenantDashboardScreen />
 *    - หากล็อกอินในฐานะเจ้าของหอ/ผู้ดูแล (role: 'admin'): แสดงหน้าจอ <HomeScreen />
 * 3. ให้บริการฟังก์ชันการล็อกอินสำเร็จ (handleLoginSuccess) และออกจากระบบ (handleLogout)
 */

import React, { useState } from 'react';
import HomeScreen from './screens/HomeScreen';
import TenantDashboardScreen from './screens/TenantDashboardScreen';
import Login from './Login/login';
import Register from './Login/register';

function App() {
  // ดึงข้อมูลผู้ใช้ปัจจุบันจาก localStorage ถ้ามี (แปลงจาก JSON string กลับเป็น Object)
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const saved = localStorage.getItem('dorm_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  // สถานะว่าผู้ใช้ผ่านการยืนยันตัวตนแล้วหรือไม่
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    return localStorage.getItem('dorm_user') !== null;
  });

  // สถานะหน้าจอปัจจุบันเมื่อยังไม่ได้ล็อกอิน เช่น 'Login' หรือ 'Register'
  const [currentScreen, setCurrentScreen] = useState('Login');

  /**
   * ฟังก์ชันจัดการเมื่อเข้าสู่ระบบหรือลงทะเบียนสำเร็จ
   * @param {Object} user - ข้อมูลผู้ใช้ที่ได้รับ เช่น username, name, role, room_number
   */
  const handleLoginSuccess = (user) => {
    localStorage.setItem('dorm_user', JSON.stringify(user));
    setIsAuthenticated(true);
    setCurrentUser(user);
    setCurrentScreen('Home');
  };

  /**
   * ฟังก์ชันออกจากระบบ ลบ session จาก localStorage และเคลียร์สถานะทั้งหมด
   */
  const handleLogout = () => {
    localStorage.removeItem('dorm_user');
    setIsAuthenticated(false);
    setCurrentUser(null);
    setCurrentScreen('Login');
  };

  // --------------------------------------------------------------------------
  // เงื่อนไขที่ 1: หากยังไม่ได้เข้าสู่ระบบ ให้แสดงหน้า Login หรือ Register
  // --------------------------------------------------------------------------
  if (!isAuthenticated) {
    if (currentScreen === 'Register') {
      return (
        <Register
          onNavigate={setCurrentScreen}
          onRegisterSuccess={handleLoginSuccess}
        />
      );
    }
    return (
      <Login
        onLoginSuccess={handleLoginSuccess}
        onNavigate={setCurrentScreen}
      />
    );
  }

  // --------------------------------------------------------------------------
  // เงื่อนไขที่ 2: หากเข้าสู่ระบบในฐานะ "ลูกหอพัก" (Tenant)
  // ให้แสดงเฉพาะหน้าจอข้อมูลส่วนตัว ประวัติบิล และการส่งสลิปของห้องตนเอง
  // --------------------------------------------------------------------------
  if (currentUser?.role === 'tenant') {
    return (
      <TenantDashboardScreen
        currentUser={currentUser}
        onLogout={handleLogout}
      />
    );
  }

  // --------------------------------------------------------------------------
  // เงื่อนไขที่ 3: หากเข้าสู่ระบบในฐานะ "เจ้าของหอพัก" (Admin / Manager)
  // ให้แสดงหน้าแผงควบคุมหลัก (Dashboard, จัดการห้องพัก, ออกบิล, ตรวจสอบสลิป)
  // --------------------------------------------------------------------------
  return (
    <HomeScreen
      onLogout={handleLogout}
      currentUser={currentUser}
    />
  );
}

export default App;
