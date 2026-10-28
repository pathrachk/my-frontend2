/**
 * ==============================================================================
 * ไฟล์: src/components/RoomModal.jsx
 * หน้าที่: หน้าต่างป๊อปอัปเพิ่มและแก้ไขข้อมูลห้องพัก (Add/Edit Room Modal)
 * ==============================================================================
 * รายละเอียดการทำงาน:
 * 1. รองรับ 2 โหมดการทำงาน:
 *    - โหมดเพิ่มห้องใหม่ (Add Mode): เมื่อ `editingRoom === null`
 *    - โหมดแก้ไขห้องเดิม (Edit Mode): เมื่อส่ง Object `editingRoom` เข้ามา
 * 2. กรอกและจัดการข้อมูลสำคัญของห้องพัก:
 *    - เลขห้องพัก (room_number), ชั้น (floor), สถานะห้อง (occupied, vacant, maintenance)
 *    - ประเภทสัญญา (monthly, semester), ค่าเช่าห้องฐาน (base_rent)
 *    - อัตราค่าน้ำ/ค่าไฟเฉพาะห้อง (water_rate, elec_rate), วิธีคิดค่าน้ำ
 *    - ข้อมูลผู้เช่าปัจจุบัน: ชื่อ-นามสกุล, เบอร์โทรศัพท์, รหัส PIN ห้อง
 *    - บันทึกหมายเหตุเพิ่มเติม (notes)
 * 3. บันทึกข้อมูลผ่าน `api.createRoom()` หรือ `api.updateRoom()`
 * 
 * Props:
 * - isOpen: Boolean สำหรับเปิด/ปิด Modal
 * - onClose: Callback ปิดหน้าต่าง
 * - onSaved: Callback แจ้งเตือน Parent เมื่อบันทึกสำเร็จ เพื่อโหลดรายการห้องใหม่
 * - editingRoom: Object ห้องพักที่ต้องการแก้ไข (หรือ null หากเป็นการเพิ่มห้องใหม่)
 */

import React, { useState, useEffect } from 'react';
import { X, DoorOpen, Save, AlertCircle } from 'lucide-react';
import './RoomModal.css';
import { api } from '../services/api';

export default function RoomModal({ isOpen, onClose, onSaved, editingRoom = null }) {
  // ฟิลด์ข้อมูลห้องพัก
  const [roomNumber, setRoomNumber] = useState('');
  const [floor, setFloor] = useState(1);
  const [tenantName, setTenantName] = useState('');
  const [tenantPhone, setTenantPhone] = useState('');
  const [roomPin, setRoomPin] = useState('1234');
  const [rentType, setRentType] = useState('monthly');
  const [baseRent, setBaseRent] = useState(3500);
  const [waterRate, setWaterRate] = useState(6);
  const [elecRate, setElecRate] = useState(7);
  const [waterCalcType, setWaterCalcType] = useState('unit');
  const [status, setStatus] = useState('occupied');
  const [notes, setNotes] = useState('');

  // สถานะการโหลดและข้อความผิดพลาด
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // --------------------------------------------------------------------------
  // ตั้งค่า State ตามโหมด (เพิ่มห้องใหม่ หรือแก้ไขห้องเดิม)
  // --------------------------------------------------------------------------
  useEffect(() => {
    if (editingRoom) {
      setRoomNumber(editingRoom.room_number || '');
      setFloor(editingRoom.floor || 1);
      setTenantName(editingRoom.tenant_name || '');
      setTenantPhone(editingRoom.tenant_phone || '');
      setRoomPin(editingRoom.room_pin || '1234');
      setRentType(editingRoom.rent_type || 'monthly');
      setBaseRent(editingRoom.base_rent || 3500);
      setWaterRate(editingRoom.water_rate || 6);
      setElecRate(editingRoom.elec_rate || 7);
      setWaterCalcType(editingRoom.water_calc_type || 'unit');
      setStatus(editingRoom.status || 'occupied');
      setNotes(editingRoom.notes || '');
    } else {
      // ค่าเริ่มต้นสำหรับสร้างห้องใหม่
      setRoomNumber('');
      setFloor(1);
      setTenantName('');
      setTenantPhone('');
      setRoomPin('1234');
      setRentType('monthly');
      setBaseRent(3500);
      setWaterRate(6);
      setElecRate(7);
      setWaterCalcType('unit');
      setStatus('occupied');
      setNotes('');
    }
    setErrorMsg('');
  }, [editingRoom, isOpen]);

  /**
   * ฟังก์ชันบันทึกข้อมูลห้องพักลงฐานข้อมูล
   */
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!roomNumber.trim()) {
      setErrorMsg('กรุณากรอกเลขห้องพัก');
      return;
    }

    setLoading(true);
    setErrorMsg('');

    try {
      const payload = {
        room_number: roomNumber.trim(),
        floor: Number(floor),
        tenant_name: tenantName.trim(),
        tenant_phone: tenantPhone.trim(),
        room_pin: roomPin.trim(),
        rent_type: rentType,
        base_rent: Number(baseRent),
        water_rate: Number(waterRate),
        elec_rate: Number(elecRate),
        water_calc_type: waterCalcType,
        status: status,
        notes: notes.trim(),
      };

      if (editingRoom) {
        // กรณีแก้ไขห้องเดิม
        await api.updateRoom(editingRoom.id, payload);
      } else {
        // กรณีเพิ่มห้องใหม่
        await api.createRoom(payload);
      }

      onSaved();
      onClose();
    } catch (err) {
      setErrorMsg(err.message || 'บันทึกข้อมูลไม่สำเร็จ');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="room-modal-backdrop">
      <div className="room-modal-card">
        {/* ส่วนหัว Modal */}
        <div className="room-modal-header">
          <div className="room-header-brand">
            <div className="room-header-icon">
              <DoorOpen size={20} />
            </div>
            <div>
              <h3 className="room-header-title">
                {editingRoom ? `แก้ไขข้อมูลห้อง ${editingRoom.room_number}` : 'เพิ่มห้องพักใหม่'}
              </h3>
              <p className="room-header-desc">บันทึกรายละเอียดห้องพักและผู้เช่าเข้าสู่ระบบ</p>
            </div>
          </div>
          <button onClick={onClose} className="invoice-btn-close">
            <X size={18} />
          </button>
        </div>

        {/* ฟอร์มกรอกข้อมูลห้อง */}
        <form onSubmit={handleSubmit} className="room-form">
          {errorMsg && (
            <div className="calc-alert calc-alert-error">
              <AlertCircle size={16} /> {errorMsg}
            </div>
          )}

          {/* เลขห้องและชั้น */}
          <div className="room-row-2">
            <div className="room-field-group">
              <label className="room-label">เลขห้องพัก *</label>
              <input
                type="text"
                value={roomNumber}
                onChange={(e) => setRoomNumber(e.target.value)}
                placeholder="เช่น 101, 202"
                className="room-input"
                style={{ fontWeight: '700' }}
                required
              />
            </div>
            <div className="room-field-group">
              <label className="room-label">ชั้นที่ *</label>
              <input
                type="number"
                min="1"
                value={floor}
                onChange={(e) => setFloor(e.target.value)}
                className="room-input"
                style={{ fontWeight: '700' }}
                required
              />
            </div>
          </div>

          {/* สถานะห้องพัก และประเภทสัญญา */}
          <div className="room-row-2">
            <div className="room-field-group">
              <label className="room-label">สถานะห้องพัก</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="room-select"
              >
                <option value="occupied">มีผู้เช่า (Occupied)</option>
                <option value="vacant">ห้องว่าง (Vacant)</option>
                <option value="maintenance">ปรับปรุง / ซ่อมแซม (Maintenance)</option>
              </select>
            </div>
            <div className="room-field-group">
              <label className="room-label">ประเภทสัญญา</label>
              <select
                value={rentType}
                onChange={(e) => setRentType(e.target.value)}
                className="room-select"
              >
                <option value="monthly">รายเดือน (Monthly)</option>
                <option value="semester">รายเทอม (Semester)</option>
              </select>
            </div>
          </div>

          {/* ข้อมูลผู้เช่าห้อง */}
          <div className="room-section-title">ข้อมูลผู้เช่าห้อง</div>
          <div className="room-row-2">
            <div className="room-field-group">
              <label className="room-label">ชื่อ-นามสกุล ผู้เช่า</label>
              <input
                type="text"
                value={tenantName}
                onChange={(e) => setTenantName(e.target.value)}
                placeholder="ชื่อผู้เช่าห้อง"
                className="room-input"
              />
            </div>
            <div className="room-field-group">
              <label className="room-label">เบอร์โทรศัพท์</label>
              <input
                type="text"
                value={tenantPhone}
                onChange={(e) => setTenantPhone(e.target.value)}
                placeholder="08x-xxx-xxxx"
                className="room-input"
              />
            </div>
          </div>

          {/* อัตราค่าเช่า & ค่าน้ำ-ไฟ */}
          <div className="room-section-title">อัตราค่าเช่า & ค่าน้ำ-ไฟ</div>
          <div className="room-row-3">
            <div className="room-field-group">
              <label className="room-label">ค่าเช่าห้อง (฿)</label>
              <input
                type="number"
                value={baseRent}
                onChange={(e) => setBaseRent(e.target.value)}
                className="room-input"
                style={{ fontWeight: '700' }}
                required
              />
            </div>
            <div className="room-field-group">
              <label className="room-label">ค่าน้ำ (฿/หน่วย)</label>
              <input
                type="number"
                step="any"
                value={waterRate}
                onChange={(e) => setWaterRate(e.target.value)}
                className="room-input"
              />
            </div>
            <div className="room-field-group">
              <label className="room-label">ค่าไฟ (฿/หน่วย)</label>
              <input
                type="number"
                step="any"
                value={elecRate}
                onChange={(e) => setElecRate(e.target.value)}
                className="room-input"
              />
            </div>
          </div>

          {/* หมายเหตุเพิ่มเติม */}
          <div className="room-field-group">
            <label className="room-label">หมายเหตุเพิ่มเติม</label>
            <textarea
              rows="2"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="หมายเหตุเกี่ยวกับห้องพักนี้..."
              className="room-textarea"
            />
          </div>

          {/* ปุ่มบันทึกและยกเลิก */}
          <div className="room-footer">
            <button type="button" onClick={onClose} className="btn-secondary">
              ยกเลิก
            </button>
            <button type="submit" disabled={loading} className="btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
              <Save size={15} /> {loading ? 'กำลังบันทึก...' : 'บันทึกข้อมูลห้อง'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
