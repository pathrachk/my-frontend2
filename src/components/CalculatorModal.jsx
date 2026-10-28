/**
 * ==============================================================================
 * ไฟล์: src/components/CalculatorModal.jsx
 * หน้าที่: หน้าต่างป๊อปอัปคำนวณและออกใบแจ้งหนี้ประจำเดือน (Billing & Calculator Modal)
 * ==============================================================================
 * รายละเอียดการทำงาน:
 * 1. ดึงข้อมูลห้องพักทั้งหมด และการตั้งค่ากลาง (Settings) เช่น อัตราค่าน้ำ/ค่าไฟ/ค่าส่วนกลาง
 * 2. เมื่อผู้ใช้เลือกห้องพัก ระบบจะดึงเลขมิเตอร์น้ำและไฟครั้งก่อนหน้าจากบิลล่าสุดมาใส่อัตโนมัติ
 * 3. คำนวณยอดเงินแบบเรียลไทม์ (Live Calculation):
 *    - หน่วยน้ำ = มิเตอร์ปัจจุบัน - มิเตอร์ก่อนหน้า (รองรับทั้งแบบคิดตามหน่วย และแบบเหมาจ่าย)
 *    - หน่วยไฟ = มิเตอร์ปัจจุบัน - มิเตอร์ก่อนหน้า x อัตราต่อหน่วย
 *    - ยอดสุทธิ = ค่าเช่าห้อง + ค่าน้ำ + ค่าไฟ + ค่าส่วนกลาง + ค่าอื่นๆ - ส่วนลด
 * 4. สร้างตัวอย่าง PromptPay QR Code อัตโนมัติเมื่อมียอดเงินที่ต้องชำระ
 * 5. ส่งข้อมูลบันทึกสร้างใบแจ้งหนี้เข้าสู่ฐานข้อมูลผ่าน `api.createInvoice()`
 * 
 * Props:
 * - isOpen: Boolean เปิดหรือปิด Modal
 * - onClose: Callback ปิด Modal
 * - onInvoiceCreated: Callback แจ้ง Parent Component เมื่อสร้างบิลสำเร็จ เพื่อโหลดข้อมูลใหม่
 * - initialRoomId: ID ของห้องพักที่ต้องการเปิดขึ้นมาคำนวณทันที (ถ้ามี)
 */

import React, { useState, useEffect } from 'react';
import { X, Calculator, Droplets, Zap, Check, AlertCircle } from 'lucide-react';
import './CalculatorModal.css';
import { api } from '../services/api';

export default function CalculatorModal({ isOpen, onClose, onInvoiceCreated, initialRoomId = null }) {
  // รายการห้องพักและการตั้งค่าระบบที่โหลดมาจาก Backend
  const [rooms, setRooms] = useState([]);
  const [settings, setSettings] = useState(null);
  const [selectedRoomId, setSelectedRoomId] = useState('');

  // ฟิลด์ข้อมูลรอบบิลและข้อมูลผู้เช่า
  const [billingMonth, setBillingMonth] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });
  const [roomRent, setRoomRent] = useState('');
  const [tenantName, setTenantName] = useState('');
  const [tenantPhone, setTenantPhone] = useState('');

  // ค่าน้ำประปา
  const [waterPrev, setWaterPrev] = useState('');
  const [waterCurr, setWaterCurr] = useState('');
  const [waterRate, setWaterRate] = useState(6);
  const [waterCalcType, setWaterCalcType] = useState('unit'); // 'unit' = ตามหน่วย, 'flat' = เหมาจ่าย

  // ค่าไฟฟ้า
  const [elecPrev, setElecPrev] = useState('');
  const [elecCurr, setElecCurr] = useState('');
  const [elecRate, setElecRate] = useState(7);

  // ค่าใช้จ่ายอื่นๆ และส่วนลด
  const [commonFee, setCommonFee] = useState(100);
  const [otherFees, setOtherFees] = useState(0);
  const [otherFeesDetail, setOtherFeesDetail] = useState('');
  const [discount, setDiscount] = useState(0);

  // สถานะและการแสดงผล PromptPay QR Code พรีวิว
  const [previewQr, setPreviewQr] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // --------------------------------------------------------------------------
  // Effect 1: โหลดข้อมูลห้องพักและการตั้งค่าเมื่อเปิด Modal
  // --------------------------------------------------------------------------
  useEffect(() => {
    if (!isOpen) return;

    async function loadInitialData() {
      try {
        const [roomsRes, settingsRes] = await Promise.all([
          api.getRooms(),
          api.getSettings(),
        ]);
        if (roomsRes.success) setRooms(roomsRes.data);
        if (settingsRes.success) {
          setSettings(settingsRes.data);
          setWaterRate(Number(settingsRes.data.default_water_rate) || 6);
          setElecRate(Number(settingsRes.data.default_elec_rate) || 7);
          setCommonFee(Number(settingsRes.data.default_common_fee) || 100);
        }

        // หากมีการระบุห้องเริ่มต้นเข้ามา ให้เลือกห้องนั้นทันที
        if (initialRoomId) {
          setSelectedRoomId(String(initialRoomId));
        } else if (roomsRes.data && roomsRes.data.length > 0) {
          setSelectedRoomId(String(roomsRes.data[0].id));
        }
      } catch (err) {
        console.error('Failed to load initial calculator data:', err);
      }
    }
    loadInitialData();
  }, [isOpen, initialRoomId]);

  // --------------------------------------------------------------------------
  // Effect 2: เมื่อเลือกเปลี่ยนห้องพัก ให้อัปเดตข้อมูลผู้เช่าและดึงมิเตอร์ครั้งก่อนหน้า
  // --------------------------------------------------------------------------
  useEffect(() => {
    if (!selectedRoomId || rooms.length === 0) return;
    const room = rooms.find((r) => String(r.id) === String(selectedRoomId));
    if (!room) return;

    setRoomRent('');
    setTenantName(room.tenant_name || '');
    setTenantPhone(room.tenant_phone || '');
    setWaterRate(Number(room.water_rate) || (settings ? Number(settings.default_water_rate) : 6));
    setElecRate(Number(room.elec_rate) || (settings ? Number(settings.default_elec_rate) : 7));
    setWaterCalcType(room.water_calc_type || 'unit');

    // ดึงบิลล่าสุดของห้องเพื่อนำค่ามิเตอร์ปัจจุบันของเดือนก่อนมาตั้งเป็นมิเตอร์เริ่มต้นเดือนนี้
    api.getRoomInvoices(room.room_number)
      .then((res) => {
        if (res.success && res.data && res.data.length > 0) {
          const latest = res.data[0];
          setWaterPrev(latest.water_curr_meter ? String(latest.water_curr_meter) : '');
          setWaterCurr('');
          setElecPrev(latest.elec_curr_meter ? String(latest.elec_curr_meter) : '');
          setElecCurr('');
        } else {
          setWaterPrev('');
          setWaterCurr('');
          setElecPrev('');
          setElecCurr('');
        }
      })
      .catch(() => {});
  }, [selectedRoomId, rooms, settings]);

  // --------------------------------------------------------------------------
  // การคำนวณยอดเงิน (Real-time Calculations)
  // --------------------------------------------------------------------------
  // หน่วยน้ำและราคารวมค่าน้ำ
  const waterUnits = Math.max(0, (parseFloat(waterCurr) || 0) - (parseFloat(waterPrev) || 0));
  const waterTotal = waterCalcType === 'flat'
    ? (settings ? Number(settings.default_water_flat) : 150)
    : (waterUnits * Number(waterRate));

  // หน่วยไฟและราคารวมค่าไฟฟ้า
  const elecUnits = Math.max(0, (parseFloat(elecCurr) || 0) - (parseFloat(elecPrev) || 0));
  const elecTotal = elecUnits * Number(elecRate);

  // ยอดรวมสุทธิทั้งหมด
  const grandTotal = Math.max(
    0,
    (Number(roomRent) || 0) +
      waterTotal +
      elecTotal +
      (Number(commonFee) || 0) +
      (Number(otherFees) || 0) -
      (Number(discount) || 0)
  );

  // --------------------------------------------------------------------------
  // Effect 3: สร้าง PromptPay QR Code อัตโนมัติเมื่อยอดเงินรวมเปลี่ยน
  // --------------------------------------------------------------------------
  useEffect(() => {
    if (grandTotal > 0 && settings?.promptpay_id) {
      api.generatePromptPay(settings.promptpay_id, grandTotal)
        .then((res) => {
          if (res.success) setPreviewQr(res.data.qr);
        })
        .catch(() => {});
    }
  }, [grandTotal, settings]);

  /**
   * ฟังก์ชันส่งข้อมูลเพื่อบันทึกและสร้างใบแจ้งหนี้
   */
  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');
    setLoading(true);

    try {
      const room = rooms.find((r) => String(r.id) === String(selectedRoomId));
      if (!room) throw new Error('กรุณาเลือกห้องพัก');

      // ประกอบชุดข้อมูล Payload สำหรับส่งให้ Backend
      const payload = {
        room_id: room.id,
        room_number: room.room_number,
        tenant_name: tenantName,
        tenant_phone: tenantPhone,
        billing_month: billingMonth,
        water_prev_meter: parseFloat(waterPrev) || 0,
        water_curr_meter: parseFloat(waterCurr) || 0,
        water_rate: Number(waterRate) || 6,
        water_calc_type: waterCalcType,
        elec_prev_meter: parseFloat(elecPrev) || 0,
        elec_curr_meter: parseFloat(elecCurr) || 0,
        elec_rate: Number(elecRate) || 7,
        room_rent: Number(roomRent) || 0,
        common_fee: Number(commonFee) || 0,
        other_fees: Number(otherFees) || 0,
        other_fees_detail: otherFeesDetail,
        discount: Number(discount) || 0,
      };

      await api.createInvoice(payload);
      setSuccessMsg('บันทึกและออกใบแจ้งหนี้เรียบร้อยแล้ว!');
      setTimeout(() => {
        if (onInvoiceCreated) onInvoiceCreated();
        onClose();
      }, 900);
    } catch (err) {
      setErrorMsg(err.message || 'เกิดข้อผิดพลาดในการสร้างใบแจ้งหนี้');
    } finally {
      setLoading(false);
    }
  };

  const currentRoom = rooms.find((r) => String(r.id) === String(selectedRoomId));

  if (!isOpen) return null;

  return (
    <div className="calc-modal-backdrop">
      <div className="calc-modal-card">
        {/* ส่วนหัวของ Modal */}
        <div className="calc-modal-header">
          <div className="calc-header-brand">
            <div className="calc-header-icon">
              <Calculator size={20} />
            </div>
            <div>
              <h3 className="calc-header-title">ออกบิล</h3>
              <p className="calc-header-desc">บันทึกมิเตอร์น้ำ-ไฟ และคำนวณยอดเงินส่งเข้าฐานข้อมูล</p>
            </div>
          </div>
          <button onClick={onClose} className="invoice-btn-close">
            <X size={18} />
          </button>
        </div>

        {/* ฟอร์มคำนวณบิล */}
        <form onSubmit={handleSubmit} className="calc-form">
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

          {/* เลือกห้องพักและรอบบิล */}
          <div className="calc-row-2">
            <div className="calc-field-group">
              <label className="calc-label">เลือกห้องพัก</label>
              <select
                value={selectedRoomId}
                onChange={(e) => setSelectedRoomId(e.target.value)}
                className="calc-select"
                required
              >
                <option value="">-- เลือกห้องพัก --</option>
                {rooms.map((r) => (
                  <option key={r.id} value={r.id}>
                    ห้อง {r.room_number} (ชั้น {r.floor}) - {r.tenant_name || 'ห้องว่าง'}
                  </option>
                ))}
              </select>
            </div>
            <div className="calc-field-group">
              <label className="calc-label">รอบบิลประจำเดือน (YYYY-MM)</label>
              <input
                type="month"
                value={billingMonth}
                onChange={(e) => setBillingMonth(e.target.value)}
                className="calc-input"
                required
              />
            </div>
          </div>

          {/* ข้อมูลผู้เช่าและค่าเช่าห้อง */}
          <div className="calc-row-3" style={{ backgroundColor: '#f8fafc', padding: '12px', borderRadius: '12px', border: '1px solid #f1f5f9' }}>
            <div className="calc-field-group">
              <label className="calc-label">ชื่อผู้เช่า</label>
              <input
                type="text"
                value={tenantName}
                onChange={(e) => setTenantName(e.target.value)}
                placeholder="ชื่อผู้เช่า"
                className="calc-input"
              />
            </div>
            <div className="calc-field-group">
              <label className="calc-label">เบอร์โทรศัพท์</label>
              <input
                type="text"
                value={tenantPhone}
                onChange={(e) => setTenantPhone(e.target.value)}
                placeholder="081-xxx-xxxx"
                className="calc-input"
              />
            </div>
            <div className="calc-field-group">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                <label className="calc-label" style={{ marginBottom: 0 }}>ค่าเช่าห้อง (บาท)</label>
                {currentRoom && currentRoom.base_rent > 0 && (
                  <button
                    type="button"
                    onClick={() => setRoomRent(roomRent ? '' : String(currentRoom.base_rent))}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#ff3377',
                      fontSize: '11px',
                      fontWeight: '600',
                      cursor: 'pointer',
                      padding: 0,
                    }}
                  >
                    {roomRent ? '✕ ไม่คิดค่าห้อง' : `+ ค่าห้องปกติ ฿${Number(currentRoom.base_rent).toLocaleString()}`}
                  </button>
                )}
              </div>
              <input
                type="number"
                value={roomRent}
                onChange={(e) => setRoomRent(e.target.value)}
                placeholder="เว้นว่าง = ไม่คิดค่าห้อง (฿0)"
                className="calc-input"
                style={{ fontWeight: '700' }}
              />
            </div>
          </div>

          {/* กล่องบันทึกมิเตอร์น้ำประปา */}
          <div className="calc-meter-box calc-water-box">
            <div className="calc-meter-header">
              <span className="calc-meter-title calc-water-title">
                <Droplets size={16} /> ค่าน้ำประปา
              </span>
              <div style={{ display: 'flex', gap: '10px', fontSize: '11px', color: '#0369a1' }}>
                <label style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}>
                  <input
                    type="radio"
                    name="waterCalc"
                    checked={waterCalcType === 'unit'}
                    onChange={() => setWaterCalcType('unit')}
                  />
                  <span>คิดตามหน่วย ({waterRate} ฿/หน่วย)</span>
                </label>
                <label style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}>
                  <input
                    type="radio"
                    name="waterCalc"
                    checked={waterCalcType === 'flat'}
                    onChange={() => setWaterCalcType('flat')}
                  />
                  <span>เหมาจ่าย</span>
                </label>
              </div>
            </div>

            <div className="calc-row-4">
              <div className="calc-field-group">
                <label className="calc-label" style={{ fontSize: '11px' }}>มิเตอร์ก่อน</label>
                <input
                  type="number"
                  step="any"
                  value={waterPrev}
                  onChange={(e) => setWaterPrev(e.target.value)}
                  placeholder="กรอกมิเตอร์ก่อนหน้า"
                  className="calc-input"
                />
              </div>
              <div className="calc-field-group">
                <label className="calc-label" style={{ fontSize: '11px' }}>มิเตอร์ปัจจุบัน</label>
                <input
                  type="number"
                  step="any"
                  value={waterCurr}
                  onChange={(e) => setWaterCurr(e.target.value)}
                  placeholder="กรอกมิเตอร์ปัจจุบัน"
                  className="calc-input"
                  style={{ fontWeight: '700' }}
                />
              </div>
              <div className="calc-field-group">
                <label className="calc-label" style={{ fontSize: '11px' }}>หน่วยที่ใช้</label>
                <div className="calc-unit-display">{waterUnits} น.</div>
              </div>
              <div className="calc-field-group">
                <label className="calc-label" style={{ fontSize: '11px' }}>รวมค่าน้ำ</label>
                <div className="calc-total-display calc-water-total">฿{waterTotal.toLocaleString()}</div>
              </div>
            </div>
          </div>

          {/* กล่องบันทึกมิเตอร์ค่าไฟฟ้า */}
          <div className="calc-meter-box calc-elec-box">
            <div className="calc-meter-header">
              <span className="calc-meter-title calc-elec-title">
                <Zap size={16} /> ค่าไฟฟ้า ({elecRate} ฿/หน่วย)
              </span>
            </div>

            <div className="calc-row-4">
              <div className="calc-field-group">
                <label className="calc-label" style={{ fontSize: '11px' }}>มิเตอร์ก่อน</label>
                <input
                  type="number"
                  step="any"
                  value={elecPrev}
                  onChange={(e) => setElecPrev(e.target.value)}
                  placeholder="กรอกมิเตอร์ก่อนหน้า"
                  className="calc-input"
                />
              </div>
              <div className="calc-field-group">
                <label className="calc-label" style={{ fontSize: '11px' }}>มิเตอร์ปัจจุบัน</label>
                <input
                  type="number"
                  step="any"
                  value={elecCurr}
                  onChange={(e) => setElecCurr(e.target.value)}
                  placeholder="กรอกมิเตอร์ปัจจุบัน"
                  className="calc-input"
                  style={{ fontWeight: '700' }}
                />
              </div>
              <div className="calc-field-group">
                <label className="calc-label" style={{ fontSize: '11px' }}>หน่วยที่ใช้</label>
                <div className="calc-unit-display">{elecUnits} น.</div>
              </div>
              <div className="calc-field-group">
                <label className="calc-label" style={{ fontSize: '11px' }}>รวมค่าไฟ</label>
                <div className="calc-total-display calc-elec-total">฿{elecTotal.toLocaleString()}</div>
              </div>
            </div>
          </div>

          {/* ค่าธรรมเนียมอื่นๆ และส่วนลด */}
          <div className="calc-row-3">
            <div className="calc-field-group">
              <label className="calc-label">ค่าส่วนกลาง (บาท)</label>
              <input
                type="number"
                value={commonFee}
                onChange={(e) => setCommonFee(e.target.value)}
                className="calc-input"
              />
            </div>
            <div className="calc-field-group">
              <label className="calc-label">ค่าอื่นๆ / หมายเหตุ</label>
              <div style={{ display: 'flex', gap: '6px' }}>
                <input
                  type="number"
                  value={otherFees}
                  onChange={(e) => setOtherFees(e.target.value)}
                  placeholder="0"
                  className="calc-input"
                  style={{ width: '70px' }}
                />
                <input
                  type="text"
                  value={otherFeesDetail}
                  onChange={(e) => setOtherFeesDetail(e.target.value)}
                  placeholder="เช่น ที่จอดรถ"
                  className="calc-input"
                  style={{ flex: 1, fontSize: '12px' }}
                />
              </div>
            </div>
            <div className="calc-field-group">
              <label className="calc-label">ส่วนลด (บาท)</label>
              <input
                type="number"
                value={discount}
                onChange={(e) => setDiscount(e.target.value)}
                className="calc-input"
                style={{ color: '#059669', fontWeight: '700' }}
              />
            </div>
          </div>

          {/* แถบสรุปยอดรวมสุทธิและตัวอย่าง QR Code */}
          <div className="calc-summary-banner">
            <div>
              <div className="calc-grand-label">ยอดรวมสุทธิที่ต้องชำระ</div>
              <div className="calc-grand-amount">
                ฿{grandTotal.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
              <div className="calc-grand-sub">
                (ค่าห้อง ฿{Number(roomRent) || 0} + น้ำ ฿{waterTotal} + ไฟ ฿{elecTotal} + ส่วนกลาง ฿{Number(commonFee) || 0})
              </div>
            </div>

            {previewQr && (
              <div className="calc-qr-preview">
                <img src={previewQr} alt="QR Preview" />
                <span>PromptPay QR</span>
              </div>
            )}
          </div>

          {/* ปุ่มบันทึกและยกเลิก */}
          <div className="calc-footer">
            <button type="button" onClick={onClose} className="btn-secondary">
              ยกเลิก
            </button>
            <button type="submit" disabled={loading} className="btn-primary">
              {loading ? 'กำลังบันทึก...' : 'บันทึกและสร้างใบแจ้งหนี้'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
