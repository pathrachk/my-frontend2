/**
 * ==============================================================================
 * ไฟล์: src/main.jsx
 * หน้าที่: จุดเริ่มต้นการทำงานของแอปพลิเคชันฝั่ง React (React Entry Point)
 * ==============================================================================
 * รายละเอียด:
 * - นำเข้า React DOM client library เพื่อ Mount คอมโพเนนต์เข้ากับ DOM Element ใน index.html
 * - โหลด CSS หลักของโปรเจกต์ (index.css)
 * - เรนเดอร์คอมโพเนนต์หลัก <App /> ภายใต้ <StrictMode> เพื่อช่วยตรวจสอบข้อผิดพลาดและ Best Practices
 */

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

// ค้นหา DOM Element ที่มี id='root' ในไฟล์ index.html และสร้าง React Root Node
createRoot(document.getElementById('root')).render(
  // StrictMode ช่วยแจ้งเตือน Warning เกี่ยวกับวงจรชีวิตหรือฟังก์ชันที่ล้าสมัยในระหว่าง Development
  <StrictMode>
    <App />
  </StrictMode>,
)
