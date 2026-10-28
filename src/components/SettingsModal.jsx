/**
 * ==============================================================================
 * ไฟล์: src/components/SettingsModal.jsx
 * หน้าที่: หน้าต่างป๊อปอัปตั้งค่าระบบหอพัก (Settings Modal)
 * ==============================================================================
 * รายละเอียดการทำงาน:
 * 1. ดึงและบันทึกข้อมูลการตั้งค่าส่วนกลางของหอพักผ่าน `api.getSettings()` และ `api.updateSettings()`:
 *    - ข้อมูลทั่วไป: ชื่อหอพัก (dorm_name), ที่อยู่ (address), เบอร์โทรศัพท์ (phone)
 *    - ข้อมูลบัญชีรับเงิน: หมายเลขพร้อมเพย์ (promptpay_id), ชื่อบัญชี, ธนาคาร, เลขที่บัญชี
 *    - อัตราค่าบริการเริ่มต้น: ค่าน้ำ/หน่วย, ค่าไฟ/หน่วย, ค่าส่วนกลาง, ค่าน้ำเหมาจ่าย, วันครบกำหนดชำระ
 * 2. จัดการเปลี่ยนรหัสผ่านความปลอดภัย (Admin PIN):
 *    - กรอก PIN เดิม และกำหนด PIN ใหม่ผ่าน `api.changeAdminPin()`
 * 
 * Props:
 * - isOpen: Boolean เปิดหรือปิด Modal
 * - onClose: Callback สำหรับปิด Modal
 * - onSettingsUpdated: Callback แจ้งเตือน Parent เมื่อบันทึกสำเร็จ เพื่ออัปเดตข้อมูลบนหน้าจอ
 */

import React, { useState, useEffect } from 'react';
import { X, Settings, Save, KeyRound, AlertCircle, Check } from 'lucide-react';
import './SettingsModal.css';
import { api } from '../services/api';

export default function SettingsModal({ isOpen, onClose, onSettingsUpdated }) {
  // ข้อมูลทั่วไปของหอพัก
  const [dormName, setDormName] = useState('');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');

  // ข้อมูลบัญชีและพร้อมเพย์
  const [promptpayId, setPromptpayId] = useState('');
  const [promptpayName, setPromptpayName] = useState('');
  const [bankName, setBankName] = useState('');
  const [bankAccount, setBankAccount] = useState('');

  // อัตราค่าบริการเริ่มต้น
  const [defaultWaterRate, setDefaultWaterRate] = useState(6);
  const [defaultElecRate, setDefaultElecRate] = useState(7);
  const [defaultCommonFee, setDefaultCommonFee] = useState(100);
  const [defaultWaterFlat, setDefaultWaterFlat] = useState(150);
  const [dueDay, setDueDay] = useState(5);

  // สถานะการเปลี่ยนรหัสผ่าน PIN แอดมิน
  const [oldPin, setOldPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [pinMsg, setPinMsg] = useState('');
  const [pinError, setPinError] = useState('');

  // สถานะการโหลดและข้อความแจ้งเตือน
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // --------------------------------------------------------------------------
  // โหลดข้อมูลการตั้งค่าเดิมจากเซิร์ฟเวอร์เมื่อเปิด Modal
  // --------------------------------------------------------------------------
  useEffect(() => {
    if (!isOpen) return;

    api.getSettings()
      .then((res) => {
        if (res.success && res.data) {
          const s = res.data;
          setDormName(s.dorm_name || '');
          setAddress(s.address || '');
          setPhone(s.phone || '');
          setPromptpayId(s.promptpay_id || '');
          setPromptpayName(s.promptpay_name || '');
          setBankName(s.bank_name || '');
          setBankAccount(s.bank_account || '');
          setDefaultWaterRate(Number(s.default_water_rate) || 6);
          setDefaultElecRate(Number(s.default_elec_rate) || 7);
          setDefaultCommonFee(Number(s.default_common_fee) || 100);
          setDefaultWaterFlat(Number(s.default_water_flat) || 150);
          setDueDay(Number(s.due_day) || 5);
        }
      })
      .catch((err) => setErrorMsg(err.message));
  }, [isOpen]);

  /**
   * บันทึกข้อมูลการตั้งค่าหอพักเข้าสู่ฐานข้อมูล
   */
  const handleSaveSettings = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      await api.updateSettings({
        dorm_name: dormName,
        address,
        phone,
        promptpay_id: promptpayId,
        promptpay_name: promptpayName,
        bank_name: bankName,
        bank_account: bankAccount,
        default_water_rate: Number(defaultWaterRate),
        default_elec_rate: Number(defaultElecRate),
        default_common_fee: Number(defaultCommonFee),
        default_water_flat: Number(defaultWaterFlat),
        due_day: Number(dueDay),
      });

      setSuccessMsg('บันทึกการตั้งค่าหอพักเรียบร้อยแล้ว');
      if (onSettingsUpdated) onSettingsUpdated();
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err) {
      setErrorMsg(err.message || 'บันทึกการตั้งค่าไม่สำเร็จ');
    } finally {
      setLoading(false);
    }
  };

  /**
   * บันทึกการเปลี่ยนรหัสผ่าน PIN สำหรับแอดมิน
   */
  const handleChangePin = async (e) => {
    e.preventDefault();
    setPinMsg('');
    setPinError('');

    try {
      await api.changeAdminPin(oldPin, newPin);
      setPinMsg('เปลี่ยนรหัสผ่าน PIN สำเร็จ');
      setOldPin('');
      setNewPin('');
    } catch (err) {
      setPinError(err.message || 'ไม่สามารถเปลี่ยน PIN ได้');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="settings-modal-backdrop">
      <div className="settings-modal-card">
        {/* ส่วนหัว Modal */}
        <div className="settings-modal-header">
          <div className="settings-header-brand">
            <div className="settings-header-icon">
              <Settings size={20} />
            </div>
            <div>
              <h3 className="settings-header-title">ตั้งค่าระบบหอพัก</h3>
              <p className="settings-header-desc">ข้อมูลหอพัก บัญชีชำระเงิน และอัตราค่าสาธารณูปโภค</p>
            </div>
          </div>
          <button onClick={onClose} className="invoice-btn-close">
            <X size={18} />
          </button>
        </div>

        {/* เนื้อหาการตั้งค่า */}
        <div className="settings-form-body">
          {errorMsg && (
            <div className="calc-alert calc-alert-error">
              <AlertCircle size={16} /> {errorMsg}
            </div>
          )}
          {successMsg && (
            <div className="calc-alert calc-alert-success">
              <Check size={16} /> {successMsg}
            </div>
          )}

          {/* ฟอร์มตั้งค่าหอพัก */}
          <form onSubmit={handleSaveSettings} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {/* หมวดที่ 1: ข้อมูลทั่วไปของหอพัก */}
            <div className="settings-section-title">1. ข้อมูลทั่วไปของหอพัก</div>
            <div className="calc-row-2">
              <div className="calc-field-group">
                <label className="calc-label">ชื่อหอพัก</label>
                <input
                  type="text"
                  value={dormName}
                  onChange={(e) => setDormName(e.target.value)}
                  className="calc-input"
                  required
                />
              </div>
              <div className="calc-field-group">
                <label className="calc-label">เบอร์โทรศัพท์ติดต่อ</label>
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="calc-input"
                />
              </div>
            </div>

            <div className="calc-field-group">
              <label className="calc-label">ที่อยู่หอพัก</label>
              <textarea
                rows="2"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="room-textarea"
              />
            </div>

            {/* หมวดที่ 2: ข้อมูลการชำระเงิน (พร้อมเพย์ & ธนาคาร) */}
            <div className="settings-section-title" style={{ marginTop: '8px' }}>
              2. ข้อมูลการชำระเงิน (พร้อมเพย์ & ธนาคาร)
            </div>
            <div className="calc-row-2">
              <div className="calc-field-group">
                <label className="calc-label">หมายเลขพร้อมเพย์ (เบอร์โทร/บัตร ปชช.)</label>
                <input
                  type="text"
                  value={promptpayId}
                  onChange={(e) => setPromptpayId(e.target.value)}
                  placeholder="เช่น 0812345678"
                  className="calc-input"
                  style={{ fontFamily: 'monospace', fontWeight: '700' }}
                  required
                />
              </div>
              <div className="calc-field-group">
                <label className="calc-label">ชื่อบัญชีพร้อมเพย์</label>
                <input
                  type="text"
                  value={promptpayName}
                  onChange={(e) => setPromptpayName(e.target.value)}
                  className="calc-input"
                />
              </div>
              <div className="calc-field-group">
                <label className="calc-label">ธนาคาร</label>
                <input
                  type="text"
                  value={bankName}
                  onChange={(e) => setBankName(e.target.value)}
                  className="calc-input"
                />
              </div>
              <div className="calc-field-group">
                <label className="calc-label">เลขที่บัญชีธนาคาร</label>
                <input
                  type="text"
                  value={bankAccount}
                  onChange={(e) => setBankAccount(e.target.value)}
                  className="calc-input"
                  style={{ fontFamily: 'monospace', fontWeight: '700' }}
                />
              </div>
            </div>

            {/* หมวดที่ 3: อัตราค่าบริการเริ่มต้น */}
            <div className="settings-section-title" style={{ marginTop: '8px' }}>
              3. อัตราค่าบริการเริ่มต้น
            </div>
            <div className="calc-row-3">
              <div className="calc-field-group">
                <label className="calc-label">ค่าน้ำ (฿/หน่วย)</label>
                <input
                  type="number"
                  step="any"
                  value={defaultWaterRate}
                  onChange={(e) => setDefaultWaterRate(Number(e.target.value))}
                  className="calc-input"
                  style={{ fontWeight: '700' }}
                />
              </div>
              <div className="calc-field-group">
                <label className="calc-label">ค่าไฟ (฿/หน่วย)</label>
                <input
                  type="number"
                  step="any"
                  value={defaultElecRate}
                  onChange={(e) => setDefaultElecRate(Number(e.target.value))}
                  className="calc-input"
                  style={{ fontWeight: '700' }}
                />
              </div>
              <div className="calc-field-group">
                <label className="calc-label">ค่าส่วนกลาง (฿/เดือน)</label>
                <input
                  type="number"
                  value={defaultCommonFee}
                  onChange={(e) => setDefaultCommonFee(Number(e.target.value))}
                  className="calc-input"
                  style={{ fontWeight: '700' }}
                />
              </div>
            </div>

            <div className="calc-row-2">
              <div className="calc-field-group">
                <label className="calc-label">ค่าน้ำเหมาจ่าย (฿/เดือน)</label>
                <input
                  type="number"
                  value={defaultWaterFlat}
                  onChange={(e) => setDefaultWaterFlat(Number(e.target.value))}
                  className="calc-input"
                />
              </div>
              <div className="calc-field-group">
                <label className="calc-label">กำหนดชำระทุกวันที่ของเดือน</label>
                <input
                  type="number"
                  min="1"
                  max="31"
                  value={dueDay}
                  onChange={(e) => setDueDay(Number(e.target.value))}
                  className="calc-input"
                />
              </div>
            </div>

            <div style={{ paddingTop: '6px' }}>
              <button type="submit" disabled={loading} className="btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                <Save size={15} /> {loading ? 'กำลังบันทึก...' : 'บันทึกการตั้งค่าหอพัก'}
              </button>
            </div>
          </form>

          {/* กล่องเปลี่ยน Admin PIN */}
          <div className="settings-pin-box">
            <div className="settings-pin-header">
              <KeyRound size={16} color="#ff3377" />
              <span>เปลี่ยนรหัสผ่าน Admin PIN</span>
            </div>

            {pinError && <div className="calc-alert calc-alert-error" style={{ marginBottom: '10px' }}>{pinError}</div>}
            {pinMsg && <div className="calc-alert calc-alert-success" style={{ marginBottom: '10px' }}>{pinMsg}</div>}

            <form onSubmit={handleChangePin} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: '10px' }}>
              <input
                type="password"
                placeholder="PIN เดิม (ค่าเริ่มต้น: 1234)"
                value={oldPin}
                onChange={(e) => setOldPin(e.target.value)}
                className="calc-input"
                required
              />
              <input
                type="password"
                placeholder="PIN ใหม่ (4 หลักขึ้นไป)"
                value={newPin}
                onChange={(e) => setNewPin(e.target.value)}
                className="calc-input"
                required
              />
              <button type="submit" className="btn-secondary" style={{ backgroundColor: '#1e293b', color: '#ffffff', borderColor: '#1e293b' }}>
                เปลี่ยน PIN
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
