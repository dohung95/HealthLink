import React, { useState, useEffect } from 'react';
import { doctorService } from '../api/doctorApi';
import { useNavigate } from 'react-router-dom';
import './Css/Doctors.css';
import { useAuth } from '../context/AuthContext';
import ConfirmModal from './ConfirmModal';
import Loading from './Loading'; // Import Loading component

const Doctors = () => {
  const [doctors, setDoctors] = useState([]);
  // 2. State pagination
  const [pagination, setPagination] = useState({
    page: 1,
    pageSize: 5,
    totalPages: 1,
    totalItems: 0
  });

  // 3. State filters
  const [filters, setFilters] = useState({
    name: '',
    specialty: '',
    location: ''
  });
  const [specialties, setSpecialties] = useState([]);

  const { isAuthenticated } = useAuth();

  const [loading, setLoading] = useState(true); // Thay đổi initial state thành true
  const [dataLoading, setDataLoading] = useState(false); // Loading khi filter/pagination
  const navigate = useNavigate();
  const [showModal, setShowModal] = useState(false);
  const [pendingDoctorId, setPendingDoctorId] = useState(null);

  // Initial loading effect (giống Home.jsx)
  useEffect(() => {
    const timer = setTimeout(() => {
      setLoading(false);
    }, 1000);

    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    loadSpecialties();
  }, []);

  // Load when page changes
  useEffect(() => {
    if (!loading) { // Chỉ load khi đã qua initial loading
      loadDoctors();
    }
  }, [pagination.page, loading]);

  // Load when filters change (DEBOUNCE)
  useEffect(() => {
    if (loading) return; // Không chạy khi đang initial loading

    // Timer
    const timer = setTimeout(() => {
      // Logic:
      // if page = 1 -> loadDoctors()
      // else -> Reset page to 1
      if (pagination.page === 1) {
        loadDoctors();
      } else {
        setPagination(prev => ({ ...prev, page: 1 }));
      }
    }, 800); // wait 800ms

    // Cleanup function: clear timer
    return () => clearTimeout(timer);
  }, [filters, loading]); // Run again when 'filters' changes

  const loadSpecialties = async () => {
    try {
      const data = await doctorService.getSpecialties();
      setSpecialties(data);
    } catch (error) {
      console.error("Error loading specialties:", error);
      // Fallback to empty array
      setSpecialties([]);
    }
  };

  const loadDoctors = async () => {
    setDataLoading(true);
    try {
      const params = { ...filters, page: pagination.page, pageSize: pagination.pageSize };

      const data = await doctorService.searchDoctors(params);

      // Option 1: Backend returns PagedResult standard
      if (data && data.items) {
        setDoctors(data.items);
        setPagination(prev => ({
          ...prev,
          totalPages: data.totalPages > 0 ? data.totalPages : 1, // Ensure at least 1
          totalItems: data.totalItems
        }));
      }
      // Option 2: Fallback (if backend has not updated yet)
      else if (Array.isArray(data)) {
        setDoctors(data);
        // If returns a regular list, no pagination
        setPagination(prev => ({ ...prev, totalPages: 1, totalItems: data.length }));
      }
      else {
        setDoctors([]);
        setPagination(prev => ({ ...prev, totalPages: 1, totalItems: 0 }));
      }
    } catch (error) {
      console.error("Lỗi tải danh sách:", error);
      setDoctors([]);
    }
    setDataLoading(false);
  };

  // Handle filter change
  const handleFilterChange = (e) => {
    setFilters({ ...filters, [e.target.name]: e.target.value });
  };

  // Handle page change
  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= pagination.totalPages) {
      setPagination(prev => ({ ...prev, page: newPage }));
      window.scrollTo(0, 0); // Scroll to top for better UX
    }
  };

  // Xử lý khi click Book Now
  const handleBookNow = (doctorId) => {
    if (!isAuthenticated) {
      setPendingDoctorId(doctorId);
      setShowModal(true);
    } else {
      navigate(`/book/${doctorId}`);
    }
  };

  // Xử lý khi xác nhận trong modal
  const handleConfirmLogin = () => {
    setShowModal(false);
    navigate('/login');
  };

  // Xử lý khi hủy modal
  const handleCloseModal = () => {
    setShowModal(false);
    setPendingDoctorId(null);
  };

  // Helper function to render stars
  const renderStars = (rating) => {
    const r = Math.round(rating);
    return <span className="text-warning">{"★".repeat(r)}{"☆".repeat(5 - r)}</span>;
  };

  // Helper: Tạo danh sách trang rút gọn (ví dụ: 1 ... 4 5 6 ... 10)
  const getPaginationItems = (current, total) => {
    const delta = 2; // Số trang hiển thị bên cạnh trang hiện tại
    const range = [];
    const rangeWithDots = [];
    let l;
    for (let i = 1; i <= total; i++) {
      // Luôn lấy trang 1, trang cuối, và các trang xung quanh current
      if (i === 1 || i === total || (i >= current - delta && i <= current + delta)) {
        range.push(i);
      }
    }
    for (let i of range) {
      if (l) {
        if (i - l === 2) {
          rangeWithDots.push(l + 1);
        } else if (i - l !== 1) {
          rangeWithDots.push('...');
        }
      }
      rangeWithDots.push(i);
      l = i;
    }
    return rangeWithDots;
  };

  // Hiển thị Loading component khi initial load (giống Home.jsx)
  if (loading) {
    return <Loading />;
  }

  return (
    <div className='Background_Doctors'>
      <div className="container">
        <div className="row" style={{ backgroundColor: "#ffffffa4", padding: "3%" }}>
          {/* --- SIDEBAR FILTER --- */}
          <div className="col-md-3 mb-4">
            <div className="card p-3 shadow-sm bg-light">
              <h5 className="mb-3"><i className="bi bi-funnel-fill"></i> Filter Doctors</h5>

              <div>
                <div className="mb-3">
                  <label className="form-label fw-bold">Specialty</label>
                  <select name="specialty" className="form-select" onChange={handleFilterChange} value={filters.specialty}>
                    <option value="">All Specialties</option>
                    {specialties.map((spec) => (
                      <option key={spec} value={spec}>
                        {spec}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="mb-3">
                  <label className="form-label fw-bold">Location</label>
                  <input
                    type="text" name="location" className="form-control"
                    placeholder="e.g. Chicago..."
                    onChange={handleFilterChange}
                    value={filters.location}
                  />
                </div>

                <div className="mb-3">
                  <label className="form-label fw-bold">Name</label>
                  <input
                    type="text" name="name" className="form-control"
                    placeholder="Doctor Name..."
                    onChange={handleFilterChange}
                    value={filters.name}
                  />
                </div>

                <button
                  className="btn btn-outline-secondary w-100"
                  onClick={() => setFilters({ name: '', specialty: '', location: '' })}
                >
                  Clear Filters
                </button>
              </div>
            </div>
          </div>

          {/* --- Doctor List --- */}
          <div className="col-md-9">
            <h3 className="mb-4">
              Available Doctors <span className="text-muted fs-6">({pagination.totalItems} results)</span>
            </h3>

            {dataLoading ? (
              <div className="text-center">
                <div className="spinner-border text-primary" role="status">
                  <span className="visually-hidden">Loading...</span>
                </div>
              </div>
            ) : (
              <>
                {doctors?.length === 0 ? (
                  <div className="alert alert-warning">No doctors found matching your criteria.</div>
                ) : (
                  doctors.map(doc => (
                    <div key={doc.doctorID} className="card mb-3 shadow-sm border-0">
                      <div className="card-body">
                        <div className="row align-items-center">
                          {/* Avatar */}
                          <div className="col-md-2 text-center">
                            <div className="bg-primary text-white rounded-circle d-flex align-items-center justify-content-center mx-auto"
                              style={{ width: '70px', height: '70px', fontSize: '28px' }}>
                              {doc.fullName.charAt(0)}
                            </div>
                          </div>
                          {/* Info */}
                          <div className="col-md-7">
                            <h5 className="card-title text-primary mb-1">{doc.fullName}</h5>
                            <p className="text-muted mb-1 fw-bold">{doc.specialty}</p>
                            <div className="small text-secondary mb-2">
                              <span className="me-3">📍 {doc.location}</span>
                              <span className="me-3">🗣 {doc.languageSpoken}</span>
                              <span>💼 {doc.yearsOfExperience} years exp</span>
                            </div>
                            <div>
                              {renderStars(doc.averageRating)}
                              <span className="text-dark ms-2 small">({doc.totalReviews} reviews)</span>
                            </div>
                          </div>
                          {/* Buttons */}
                          <div className="col-md-3 text-end">
                            <button className="btn btn-outline-info w-100 mb-2" onClick={() => navigate(`/doctor/${doc.doctorID}`)}>
                              View Profile
                            </button>
                            <button
                              className="btn btn-success w-100"
                              onClick={() => handleBookNow(doc.doctorID)}
                            >
                              Book Now
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                )}

                {/* --- PAGINATION --- */}
                {pagination.totalPages > 1 && (
                  <nav className="d-flex justify-content-center mt-4">
                    <ul className="pagination">
                      <li className={`page-item ${pagination.page === 1 ? 'disabled' : ''}`}>
                        <button className="page-link" onClick={() => handlePageChange(pagination.page - 1)}>
                          &laquo; Prev
                        </button>
                      </li>

                      {/* Smart Pagination */}
                      {getPaginationItems(pagination.page, pagination.totalPages).map((item, index) => (
                        <li
                          key={index}
                          className={`page-item ${item === pagination.page ? 'active' : ''} ${item === '...' ? 'disabled' : ''}`}
                        >
                          {item === '...' ? (
                            <span className="page-link">...</span>
                          ) : (
                            <button className="page-link" onClick={() => handlePageChange(item)}>
                              {item}
                            </button>
                          )}
                        </li>
                      ))}

                      <li className={`page-item ${pagination.page === pagination.totalPages ? 'disabled' : ''}`}>
                        <button className="page-link" onClick={() => handlePageChange(pagination.page + 1)}>
                          Next &raquo;
                        </button>
                      </li>
                    </ul>
                  </nav>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Modal xác nhận đăng nhập */}
      <ConfirmModal
        isOpen={showModal}
        onClose={handleCloseModal}
        onConfirm={handleConfirmLogin}
        title="Authentication Required"
        message="You need to login to book an appointment. Would you like to go to the login page?"
        confirmText="Go to Login"
        iconClass="bi-shield-lock-fill"
        variant="primary"
      />
    </div>
  );
};

export default Doctors;