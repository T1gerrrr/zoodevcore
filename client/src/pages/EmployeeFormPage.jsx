import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { employeeAPI } from '../services/api';
import { useToast } from '../store/ToastContext';
import FaceCameraModal from '../components/FaceCameraModal';
import { HiOutlineArrowLeft, HiOutlineSave, HiOutlineCamera, HiOutlineUserCircle } from 'react-icons/hi';

const EmployeeFormPage = () => {
  const { id } = useParams();
  const isEdit = !!id;
  const navigate = useNavigate();
  const toast = useToast();

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showFaceModal, setShowFaceModal] = useState(false);

  const [form, setForm] = useState({
    name: '',
    employeeCode: '',
    pin: '',
    phone: '',
    position: 'Nhân viên bán hàng',
    salaryType: 'hourly',
    hourlyRate: 30000,
    dailyRate: 250000,
    facePhotoUrl: '',
    schedule: {
      workDaysPerWeek: 6,
      workDaysPerMonth: 26,
      shiftStart: '08:00',
      shiftEnd: '17:00',
      workLocation: {
        name: '',
        latitude: '',
        longitude: '',
        radiusMeters: 200,
      },
    },
  });

  useEffect(() => {
    if (isEdit) {
      fetchEmployee();
    }
  }, [id]);

  const fetchEmployee = async () => {
    try {
      setLoading(true);
      const res = await employeeAPI.getById(id);
      const data = res.data;
      setForm({
        name: data.name || '',
        employeeCode: data.employeeCode || '',
        pin: '', // Don't pre-fill PIN
        phone: data.phone || '',
        position: data.position || '',
        salaryType: data.salaryType || 'hourly',
        hourlyRate: data.hourlyRate || 30000,
        dailyRate: data.dailyRate || 250000,
        facePhotoUrl: data.facePhotoUrl || '',
        schedule: {
          workDaysPerWeek: data.schedule?.workDaysPerWeek || 6,
          workDaysPerMonth: data.schedule?.workDaysPerMonth || 26,
          shiftStart: data.schedule?.shiftStart || '08:00',
          shiftEnd: data.schedule?.shiftEnd || '17:00',
          workLocation: {
            name: data.schedule?.workLocation?.name || '',
            latitude: data.schedule?.workLocation?.latitude || '',
            longitude: data.schedule?.workLocation?.longitude || '',
            radiusMeters: data.schedule?.workLocation?.radiusMeters || 200,
          },
        },
      });
    } catch (err) {
      toast.error('Không thể tải thông tin nhân viên');
      navigate('/employees');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleScheduleChange = (field, value) => {
    setForm((prev) => ({
      ...prev,
      schedule: { ...prev.schedule, [field]: value },
    }));
  };

  const handleLocationChange = (field, value) => {
    setForm((prev) => ({
      ...prev,
      schedule: {
        ...prev.schedule,
        workLocation: { ...prev.schedule.workLocation, [field]: value },
      },
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validate
    if (!form.name || !form.employeeCode) {
      toast.error('Vui lòng điền tên và mã nhân viên');
      return;
    }
    if (!isEdit && !form.pin) {
      toast.error('Vui lòng nhập mã PIN');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        ...form,
        schedule: {
          ...form.schedule,
          workDaysPerWeek: Number(form.schedule.workDaysPerWeek),
          workDaysPerMonth: Number(form.schedule.workDaysPerMonth),
          workLocation: {
            ...form.schedule.workLocation,
            latitude: Number(form.schedule.workLocation.latitude) || 0,
            longitude: Number(form.schedule.workLocation.longitude) || 0,
            radiusMeters: Number(form.schedule.workLocation.radiusMeters) || 200,
          },
        },
      };

      // Don't send empty PIN on edit
      if (isEdit && !payload.pin) {
        delete payload.pin;
      }

      if (isEdit) {
        await employeeAPI.update(id, payload);
        toast.success('Cập nhật nhân viên thành công!');
      } else {
        await employeeAPI.create(payload);
        toast.success('Thêm nhân viên thành công!');
      }

      navigate('/employees');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Không thể lưu thông tin nhân viên');
    } finally {
      setSaving(false);
    }
  };

  // Get current location for work location
  const handleGetCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          handleLocationChange('latitude', pos.coords.latitude.toFixed(6));
          handleLocationChange('longitude', pos.coords.longitude.toFixed(6));
          toast.success('Đã lấy vị trí hiện tại');
        },
        () => {
          toast.error('Không thể lấy vị trí. Vui lòng nhập thủ công.');
        }
      );
    }
  };

  if (loading) {
    return (
      <div className="loading-page">
        <div className="spinner" />
      </div>
    );
  }

  return (
    <div className="page">
      <div className="page-header flex items-center gap-md mb-lg">
        <button className="btn btn-ghost" onClick={() => navigate('/employees')}>
          <HiOutlineArrowLeft />
        </button>
        <div>
          <h1 className="page-title">{isEdit ? 'Sửa nhân viên' : 'Thêm nhân viên mới'}</h1>
          <p className="page-subtitle">{isEdit ? `Chỉnh sửa thông tin ${form.name}` : 'Điền thông tin nhân viên'}</p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        {/* Basic Info */}
        <div className="card mb-lg">
          <div className="card-header">
            <h3>Thông tin cơ bản</h3>
          </div>
          <div className="card-body">
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Tên nhân viên *</label>
                <input
                  type="text"
                  className="form-input"
                  value={form.name}
                  onChange={(e) => handleChange('name', e.target.value)}
                  placeholder="Nguyễn Văn A"
                />
              </div>
              <div className="form-group">
                <label className="form-label">Mã nhân viên *</label>
                <input
                  type="text"
                  className="form-input"
                  value={form.employeeCode}
                  onChange={(e) => handleChange('employeeCode', e.target.value.toUpperCase())}
                  placeholder="NV001"
                  disabled={isEdit}
                />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">{isEdit ? 'Đổi mã PIN (bỏ trống nếu không đổi)' : 'Mã PIN *'}</label>
                <input
                  type="password"
                  className="form-input"
                  value={form.pin}
                  onChange={(e) => handleChange('pin', e.target.value)}
                  placeholder={isEdit ? '••••' : 'Nhập PIN 4-6 số'}
                  maxLength={6}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Số điện thoại</label>
                <input
                  type="tel"
                  className="form-input"
                  value={form.phone}
                  onChange={(e) => handleChange('phone', e.target.value)}
                  placeholder="0901234567"
                />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Vị trí</label>
              <input
                type="text"
                className="form-input"
                value={form.position}
                onChange={(e) => handleChange('position', e.target.value)}
                placeholder="Nhân viên bán hàng"
              />
            </div>
          </div>
        </div>

        {/* Face ID Profile Section */}
        <div className="card mb-lg">
          <div className="card-header flex justify-between items-center">
            <div>
              <h3>Hồ sơ Face ID nhân viên</h3>
              <p className="text-xs text-secondary mb-0">Ảnh mẫu khuôn mặt bắt buộc dùng để nhận diện khi chấm công</p>
            </div>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => setShowFaceModal(true)}
            >
              <HiOutlineCamera /> {form.facePhotoUrl ? 'Chụp lại Face ID' : 'Chụp ảnh Face ID'}
            </button>
          </div>
          <div className="card-body flex items-center gap-lg">
            <div className="face-photo-preview-box" style={{ width: 100, height: 100, borderRadius: '50%', overflow: 'hidden', backgroundColor: 'var(--surface-hover, #334155)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '3px solid var(--primary, #3b82f6)' }}>
              {form.facePhotoUrl ? (
                <img src={form.facePhotoUrl} alt="Face ID Profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <HiOutlineUserCircle size={60} color="#94a3b8" />
              )}
            </div>
            <div>
              {form.facePhotoUrl ? (
                <span className="badge badge-success">✅ Đã đăng ký khuôn mặt Face ID</span>
              ) : (
                <span className="badge badge-warning">⚠️ Chưa có ảnh Face ID mẫu</span>
              )}
              <p className="text-xs text-secondary" style={{ marginTop: 8 }}>
                Nhấp nút Chụp ảnh Face ID để dùng camera canh khung oval lấy nét khuôn mặt.
              </p>
            </div>
          </div>
        </div>

        {/* Work Location */}
        <div className="card mb-lg">
          <div className="card-header">
            <h3>Địa điểm làm việc</h3>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={handleGetCurrentLocation}
            >
              📍 Lấy vị trí hiện tại
            </button>
          </div>
          <div className="card-body">
            <div className="form-group">
              <label className="form-label">Tên địa điểm</label>
              <input
                type="text"
                className="form-input"
                value={form.schedule.workLocation.name}
                onChange={(e) => handleLocationChange('name', e.target.value)}
                placeholder="VD: Chi nhánh Quận 1"
              />
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Latitude (Vĩ độ)</label>
                <input
                  type="number"
                  step="any"
                  className="form-input"
                  value={form.schedule.workLocation.latitude}
                  onChange={(e) => handleLocationChange('latitude', e.target.value)}
                  placeholder="VD: 10.7769"
                />
              </div>
              <div className="form-group">
                <label className="form-label">Longitude (Kinh độ)</label>
                <input
                  type="number"
                  step="any"
                  className="form-input"
                  value={form.schedule.workLocation.longitude}
                  onChange={(e) => handleLocationChange('longitude', e.target.value)}
                  placeholder="VD: 106.7009"
                />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Bán kính cho phép (mét)</label>
              <input
                type="number"
                className="form-input"
                value={form.schedule.workLocation.radiusMeters}
                onChange={(e) => handleLocationChange('radiusMeters', e.target.value)}
                min={50}
                max={1000}
                placeholder="200"
              />
              <p className="text-xs text-secondary" style={{ marginTop: 4 }}>
                Nhân viên phải ở trong bán kính này mới có thể chấm công
              </p>
            </div>
          </div>
        </div>

        {/* Submit */}
        <div className="flex justify-between">
          <button type="button" className="btn btn-secondary" onClick={() => navigate('/employees')}>
            Hủy
          </button>
          <button type="submit" className="btn btn-primary btn-lg" disabled={saving}>
            {saving ? <span className="spinner spinner-sm" /> : <><HiOutlineSave /> {isEdit ? 'Cập nhật' : 'Tạo nhân viên'}</>}
          </button>
        </div>
      </form>

      <FaceCameraModal
        isOpen={showFaceModal}
        onClose={() => setShowFaceModal(false)}
        onCapture={(photoUrl) => handleChange('facePhotoUrl', photoUrl)}
        title="Chụp ảnh mẫu Face ID nhân viên"
      />
    </div>
  );
};

export default EmployeeFormPage;
