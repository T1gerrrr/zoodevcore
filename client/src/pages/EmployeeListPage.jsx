import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { employeeAPI } from '../services/api';
import { useToast } from '../store/ToastContext';
import {
  HiOutlinePlus,
  HiOutlinePencil,
  HiOutlineTrash,
  HiOutlineSearch,
} from 'react-icons/hi';

const EmployeeListPage = () => {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [deleteModal, setDeleteModal] = useState(null);
  const toast = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    fetchEmployees();
  }, []);

  const fetchEmployees = async () => {
    try {
      setLoading(true);
      const res = await employeeAPI.getAll();
      setEmployees(res.data);
    } catch (err) {
      toast.error('Không thể tải danh sách nhân viên');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      await employeeAPI.delete(id);
      toast.success('Đã xóa nhân viên');
      setDeleteModal(null);
      fetchEmployees();
    } catch (err) {
      toast.error('Không thể xóa nhân viên');
    }
  };

  const filtered = employees.filter(
    (e) =>
      e.isActive !== false &&
      (e.name?.toLowerCase().includes(search.toLowerCase()) ||
        e.employeeCode?.toLowerCase().includes(search.toLowerCase()))
  );

  if (loading) {
    return (
      <div className="loading-page">
        <div className="spinner" />
        <span className="text-secondary">Đang tải...</span>
      </div>
    );
  }

  return (
    <div className="page">
      <div className="page-header flex justify-between items-center">
        <div>
          <h1 className="page-title">Quản lý nhân viên</h1>
          <p className="page-subtitle">{filtered.length} nhân viên</p>
        </div>
        <button className="btn btn-primary" onClick={() => navigate('/employees/new')}>
          <HiOutlinePlus /> Thêm nhân viên
        </button>
      </div>

      {/* Search */}
      <div className="mb-lg">
        <div className="search-wrapper">
          <HiOutlineSearch className="search-icon" />
          <input
            type="text"
            className="form-input search-input"
            placeholder="Tìm theo tên hoặc mã NV..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Employee Table */}
      <div className="card">
        <div className="table-container">
          {filtered.length > 0 ? (
            <table className="table">
              <thead>
                <tr>
                  <th>Mã NV</th>
                  <th>Tên nhân viên</th>
                  <th className="hide-mobile">Mức Lương</th>
                  <th className="hide-mobile">Face ID</th>
                  <th className="hide-mobile">Ca làm</th>
                  <th>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((emp) => (
                  <tr key={emp.id}>
                    <td><span className="font-semibold">{emp.employeeCode}</span></td>
                    <td>
                      <div className="font-medium">{emp.name}</div>
                      <div className="text-xs text-secondary">{emp.position || 'Nhân viên'} {emp.phone ? `• ${emp.phone}` : ''}</div>
                    </td>
                    <td className="hide-mobile">
                      <div className="font-medium">
                        {emp.salaryType === 'daily'
                          ? `${new Intl.NumberFormat('vi-VN').format(emp.dailyRate || 250000)}đ/ngày`
                          : `${new Intl.NumberFormat('vi-VN').format(emp.hourlyRate || 30000)}đ/h`}
                      </div>
                      <div className="text-xs text-secondary">
                        {emp.schedule?.workDaysPerWeek || 6} ngày/tuần
                      </div>
                    </td>
                    <td className="hide-mobile">
                      {emp.facePhotoUrl ? (
                        <span className="badge badge-success">✅ Đã có Face ID</span>
                      ) : (
                        <span className="badge badge-warning">⚠️ Chưa chụp</span>
                      )}
                    </td>
                    <td className="hide-mobile">
                      {emp.schedule?.shiftStart || '08:00'} - {emp.schedule?.shiftEnd || '17:00'}
                    </td>
                    <td>
                      <div className="flex gap-sm">
                        <button
                          className="btn btn-ghost btn-sm"
                          onClick={() => navigate(`/employees/${emp.id}/edit`)}
                          title="Sửa"
                        >
                          <HiOutlinePencil />
                        </button>
                        <button
                          className="btn btn-ghost btn-sm"
                          onClick={() => setDeleteModal(emp)}
                          title="Xóa"
                          style={{ color: 'var(--danger)' }}
                        >
                          <HiOutlineTrash />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="empty-state">
              <div className="empty-state-icon">👥</div>
              <p>{search ? 'Không tìm thấy nhân viên' : 'Chưa có nhân viên nào'}</p>
              {!search && (
                <button className="btn btn-primary mt-md" onClick={() => navigate('/employees/new')}>
                  <HiOutlinePlus /> Thêm nhân viên đầu tiên
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Delete Modal */}
      {deleteModal && (
        <div className="modal-overlay" onClick={() => setDeleteModal(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Xóa nhân viên</h3>
            </div>
            <div className="modal-body">
              <p>Bạn có chắc muốn xóa <strong>{deleteModal.name}</strong> ({deleteModal.employeeCode})?</p>
              <p className="text-sm text-secondary mt-md">Nhân viên sẽ bị vô hiệu hóa và không thể chấm công.</p>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setDeleteModal(null)}>Hủy</button>
              <button className="btn btn-danger" onClick={() => handleDelete(deleteModal.id)}>Xóa</button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .search-wrapper {
          position: relative;
          max-width: 400px;
        }
        .search-icon {
          position: absolute;
          left: 14px;
          top: 50%;
          transform: translateY(-50%);
          color: var(--text-light);
          font-size: 1.125rem;
        }
        .search-input {
          padding-left: 42px;
        }
      `}</style>
    </div>
  );
};

export default EmployeeListPage;
