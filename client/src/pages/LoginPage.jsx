import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../store/AuthContext';
import { useToast } from '../store/ToastContext';
import { setupRecaptcha, sendPhoneOtp } from '../lib/firebase';
import {
  HiOutlineMail,
  HiOutlineLockClosed,
  HiOutlineIdentification,
  HiOutlineKey,
  HiOutlinePhone,
  HiOutlineShieldCheck,
} from 'react-icons/hi';
import './LoginPage.css';

const LoginPage = () => {
  const [tab, setTab] = useState('staff');
  const [loading, setLoading] = useState(false);
  const { staffLogin, employeeLogin, phoneLogin } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();

  // Staff form
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // Employee form
  const [employeeCode, setEmployeeCode] = useState('');
  const [pin, setPin] = useState('');

  // Phone Auth state
  const [phone, setPhone] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [confirmationResult, setConfirmationResult] = useState(null);

  const handleStaffLogin = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error('Vui lòng điền đầy đủ email và mật khẩu');
      return;
    }
    setLoading(true);
    try {
      await staffLogin(email, password);
      toast.success('Đăng nhập thành công!');
      navigate('/dashboard');
    } catch (err) {
      console.error('Staff login error detail:', err);
      let message = 'Email hoặc mật khẩu không chính xác';
      if (err.code === 'auth/invalid-credential' || err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password') {
        message = 'Email hoặc mật khẩu không chính xác';
      } else if (err.code === 'auth/invalid-email') {
        message = 'Định dạng Email không hợp lệ';
      } else if (err.code === 'auth/too-many-requests') {
        message = 'Thử đăng nhập sai quá nhiều lần. Vui lòng đợi chốc lát.';
      } else if (err.response?.data?.error) {
        message = err.response.data.error;
      } else if (err.message) {
        message = err.message;
      }
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const handleEmployeeLogin = async (e) => {
    e.preventDefault();
    if (!employeeCode || !pin) {
      toast.error('Vui lòng nhập mã nhân viên và PIN');
      return;
    }
    setLoading(true);
    try {
      await employeeLogin(employeeCode, pin);
      toast.success('Đăng nhập thành công!');
      navigate('/checkin');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Mã nhân viên hoặc PIN không đúng');
    } finally {
      setLoading(false);
    }
  };

  // Step 1: Send SMS OTP
  const handleSendPhoneOtp = async (e) => {
    e.preventDefault();
    if (!phone) {
      toast.error('Vui lòng nhập số điện thoại');
      return;
    }
    setLoading(true);
    try {
      const appVerifier = setupRecaptcha('recaptcha-container');
      const confirmation = await sendPhoneOtp(phone, appVerifier);
      setConfirmationResult(confirmation);
      setOtpSent(true);
      toast.success('Mã OTP đã được gửi đến số điện thoại!');
    } catch (err) {
      console.error(err);
      toast.error(err.message || 'Gửi mã OTP thất bại. Vui lòng kiểm tra lại số điện thoại.');
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Verify OTP Code
  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    if (!otpCode || !confirmationResult) {
      toast.error('Vui lòng nhập mã OTP 6 số');
      return;
    }
    setLoading(true);
    try {
      const user = await phoneLogin(confirmationResult, otpCode);
      toast.success('Đăng nhập bằng SĐT thành công!');
      if (user.role === 'staff') {
        navigate('/dashboard');
      } else {
        navigate('/checkin');
      }
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.error || 'Mã OTP không chính xác hoặc đã hết hạn');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div id="recaptcha-container"></div>
      <div className="login-container">
        <div className="login-header">
          <div className="login-logo"></div>
          <h1 className="login-title">ZOO Workshop</h1>
          <p className="login-subtitle">Hệ thống quản lý và chấm công</p>
          <p className="login-subtitle-s">Được phát triển bởi KhoaTigo</p>
        </div>

        <div className="login-tabs">
          <button
            className={`login-tab ${tab === 'staff' ? 'active' : ''}`}
            onClick={() => { setTab('staff'); setOtpSent(false); }}
          >
            Quản lý
          </button>
          <button
            className={`login-tab ${tab === 'employee' ? 'active' : ''}`}
            onClick={() => { setTab('employee'); setOtpSent(false); }}
          >
            Nhân viên
          </button>
          <button
            className={`login-tab ${tab === 'phone' ? 'active' : ''}`}
            onClick={() => { setTab('phone'); setOtpSent(false); }}
          >
            SĐT (OTP)
          </button>
        </div>

        <div className="login-form-container">
          {tab === 'staff' && (
            <form onSubmit={handleStaffLogin} className="login-form">
              <div className="form-group">
                <label className="form-label">Email</label>
                <div className="input-icon-wrapper">
                  <HiOutlineMail className="input-icon" />
                  <input
                    type="email"
                    className="form-input input-with-icon"
                    placeholder="admin@zooworkshop.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    autoComplete="email"
                  />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Mật khẩu</label>
                <div className="input-icon-wrapper">
                  <HiOutlineLockClosed className="input-icon" />
                  <input
                    type="password"
                    className="form-input input-with-icon"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="current-password"
                  />
                </div>
              </div>
              <button type="submit" className="btn btn-primary btn-block btn-lg" disabled={loading}>
                {loading ? <span className="spinner spinner-sm" /> : 'Đăng nhập'}
              </button>
            </form>
          )}

          {tab === 'employee' && (
            <form onSubmit={handleEmployeeLogin} className="login-form">
              <div className="form-group">
                <label className="form-label">Mã nhân viên</label>
                <div className="input-icon-wrapper">
                  <HiOutlineIdentification className="input-icon" />
                  <input
                    type="text"
                    className="form-input input-with-icon"
                    placeholder="VD: NV001"
                    value={employeeCode}
                    onChange={(e) => setEmployeeCode(e.target.value.toUpperCase())}
                    autoComplete="username"
                  />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Mã PIN</label>
                <div className="input-icon-wrapper">
                  <HiOutlineKey className="input-icon" />
                  <input
                    type="password"
                    className="form-input input-with-icon"
                    placeholder="••••"
                    value={pin}
                    onChange={(e) => setPin(e.target.value)}
                    maxLength={6}
                    autoComplete="current-password"
                  />
                </div>
              </div>
              <button type="submit" className="btn btn-primary btn-block btn-lg" disabled={loading}>
                {loading ? <span className="spinner spinner-sm" /> : 'Chấm công'}
              </button>
            </form>
          )}

          {tab === 'phone' && (
            !otpSent ? (
              <form onSubmit={handleSendPhoneOtp} className="login-form">
                <div className="form-group">
                  <label className="form-label">Số điện thoại</label>
                  <div className="input-icon-wrapper">
                    <HiOutlinePhone className="input-icon" />
                    <input
                      type="tel"
                      className="form-input input-with-icon"
                      placeholder="VD: 0901234567"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                    />
                  </div>
                </div>
                <button type="submit" className="btn btn-primary btn-block btn-lg" disabled={loading}>
                  {loading ? <span className="spinner spinner-sm" /> : 'Gửi mã OTP qua SMS'}
                </button>
              </form>
            ) : (
              <form onSubmit={handleVerifyOtp} className="login-form">
                <div className="form-group">
                  <label className="form-label">Nhập mã OTP (6 số)</label>
                  <div className="input-icon-wrapper">
                    <HiOutlineShieldCheck className="input-icon" />
                    <input
                      type="text"
                      className="form-input input-with-icon"
                      placeholder="••••••"
                      value={otpCode}
                      onChange={(e) => setOtpCode(e.target.value)}
                      maxLength={6}
                      autoFocus
                    />
                  </div>
                </div>
                <button type="submit" className="btn btn-primary btn-block btn-lg" disabled={loading}>
                  {loading ? <span className="spinner spinner-sm" /> : 'Xác nhận OTP & Đăng nhập'}
                </button>
                <button
                  type="button"
                  className="btn btn-ghost btn-block mt-md"
                  onClick={() => setOtpSent(false)}
                  disabled={loading}
                >
                  Gửi lại mã / Đổi SĐT
                </button>
              </form>
            )
          )}
        </div>
      </div>
    </div>
  );
};

export default LoginPage;

