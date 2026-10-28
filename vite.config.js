/**
 * ==============================================================================
 * ไฟล์: vite.config.js
 * หน้าที่: ไฟล์กำหนดค่าการทำงานของ Vite Bundler สำหรับโปรเจกต์ React
 * ==============================================================================
 * รายละเอียด:
 * - เปิดใช้งาน @vitejs/plugin-react เพื่อรองรับไวยากรณ์ JSX, Fast Refresh และ React Features
 * - กำหนดการตั้งค่าสำหรับการ Build และการรัน Development Server
 */

import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// การตั้งค่า Vite Configuration
// เอกสารอ้างอิง: https://vite.dev/config/
export default defineConfig({
  // กำหนด Plugin สำหรับ React
  plugins: [react()],
})
