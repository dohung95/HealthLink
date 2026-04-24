import React, { useState, useEffect } from 'react';
import { appointmentService } from '../api/appointmentApi';
import { doctorService } from '../api/doctorApi';
import { useNavigate, useParams } from 'react-router-dom';
import './Css/Schedule.css';
import Loading from './Loading';
import { useAuth } from '../context/AuthContext';
import { toast } from 'sonner';

function Schedule() {
  const navigate = useNavigate();
  const [doctors, setDoctors] = useState([]);
  const [selectedSpecialty, setSelectedSpecialty] = useState('');
  const [selectedDoctor, setSelectedDoctor] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [maxDate] = useState(() => {
    const max = new Date();
    max.setDate(max.getDate() + 90);
    return max.toISOString().split('T')[0];
  });
  const [slots, setSlots] = useState([]);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [consultationType, setConsultationType] = useState('Video Call');
  const [loadingSlots, setLoadingSlots] = useState(false);
  const { doctorId } = useParams();
  const { isAuthenticated } = useAuth();

  // 1. Load list of Doctors
  useEffect(() => {
    async function fetchDoctors() {
      try {
        const data = await doctorService.getAllDoctors();
        setDoctors(data);
      } catch (error) {
        console.error("Failed to load doctors", error);
      }
    }
    fetchDoctors();
  }, []);
  // Auto-select specialty if coming from doctor detail page
  useEffect(() => {
    if (doctorId && doctors.length > 0) {
      const preSelectedDoc = doctors.find(d => d.doctorID === doctorId);
      if (preSelectedDoc) {
        setSelectedSpecialty(preSelectedDoc.specialty);
        setSelectedDoctor(doctorId);
      }
    }
  }, [doctorId, doctors]);

  // 2. Load empty Slot list when changing Doctor or Date
  useEffect(() => {
    if (!selectedDoctor || !date) return;
    async function fetchSlots() {
      setLoadingSlots(true);
      try {
        const data = await appointmentService.getAvailableSlots(selectedDoctor, date);
        setSlots(data);
        setSelectedSlot(null);
      } catch (error) {
        console.error("Failed to load slots", error);
      }
      setLoadingSlots(false);
    }
    fetchSlots();
  }, [selectedDoctor, date]);

  // 3. appointment processing
  const handleSchedule = async () => {
    if (!selectedDoctor || !selectedSlot) {
      toast.warning("Please select a doctor and a time slot.");
      return;
    }

    const selectedDateTime = new Date(selectedSlot.startTime);
    const maxDateTime = new Date();
    maxDateTime.setDate(maxDateTime.getDate() + 90);

    if (selectedDateTime > maxDateTime) {
      toast.error("Appointments can only be booked up to 90 days in advance.");
      return;
    }

    try {
      const bookingData = {
        DoctorID: selectedDoctor,
        AppointmentTime: selectedSlot.startTime,
        ConsultationType: consultationType
      };
      await appointmentService.createAppointment(bookingData);
      toast.success("Appointment scheduled successfully!");
      navigate('/my-appointments');
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to schedule appointment.");
    }
  };

  const [loading, setLoading] = useState(true);
  useEffect(() => {
    const timer = setTimeout(() => {
      setLoading(false);
    }, 1000);
    return () => clearTimeout(timer);
  }, []);

  // Helper functions
  const getSpecialties = () => {
    const specialties = [...new Set(doctors.map(doc => doc.specialty))];
    return specialties.filter(s => s).sort();
  };

  const getFilteredDoctors = () => {
    if (!selectedSpecialty) return [];

    let filtered = doctors.filter(doc => doc.specialty === selectedSpecialty);

    return filtered;
  };
  if (loading) {
    return <Loading />;
  }
  return (
    <>
      <div className='Background_Schedule' >
        <div className="container">
          <div className="row justify-content-center">
            <div className="col-lg-8 col-md-10" style={{ paddingBottom: "3%" }}>
              <div className="card shadow-lg border-0 rounded-4 overflow-hidden" >
                {/* Header */}
                <div className="card-header bg-primary text-white p-4 text-center">
                  <h2 className="mb-1 fw-bold"><i className="bi bi-calendar-check me-2"></i>Virtual Consultation</h2>
                  <p className="mb-0 opacity-75">Schedule your appointment with our top specialists</p>
                </div>

                <div className="card-body p-4 p-md-5">
                  {!isAuthenticated ? (
                    // --- Giao diện chưa đăng nhập ---
                    <div className="text-center py-4" >
                      <div className="mb-4 text-warning">
                        <i className="fas fa-lock fa-4x"></i>
                      </div>
                      <h4 className="fw-bold mb-3">Login Required</h4>
                      <p className="text-muted mb-4">You need to sign in to access our doctors' schedules and book an appointment.</p>
                      <button
                        className="btn btn-primary btn-lg px-5 rounded-pill shadow-sm"
                        onClick={() => navigate('/login')}
                      >
                        <i className="fas fa-sign-in-alt me-2"></i>
                        Login Now
                      </button>
                    </div>
                  ) : (
                    // --- Giao diện đã đăng nhập ---
                    <>
                      <div className="row g-3">
                        {/* ✅ STEP 1: Select Specialty */}
                        <div className="col-md-6">
                          <div className="form-floating">
                            <select
                              className="form-select"
                              id="specialtySelect"
                              value={selectedSpecialty}
                              onChange={(e) => {
                                setSelectedSpecialty(e.target.value);
                                setSelectedDoctor('');
                              }}
                              disabled={!!doctorId}
                            >
                              <option value="">-- Choose a Specialty --</option>
                              {getSpecialties().map((specialty, idx) => (
                                <option key={idx} value={specialty}>{specialty}</option>
                              ))}
                            </select>
                            <label htmlFor="specialtySelect">
                              <i className="bi bi-hospital me-2 text-primary"></i>Select Specialty
                            </label>
                          </div>
                        </div>

                        {/* ✅ STEP 2: Doctor Dropdown */}
                        <div className="col-md-6">
                          <div className="form-floating">
                            <select
                              className="form-select"
                              id="doctorSelect"
                              value={selectedDoctor}
                              onChange={(e) => setSelectedDoctor(e.target.value)}
                              disabled={!!doctorId || !selectedSpecialty}
                            >
                              <option value="">{selectedSpecialty ? "-- Choose a Doctor --" : "-- Select Specialty First --"}</option>
                              {getFilteredDoctors().map(doc => (
                                <option key={doc.doctorID} value={doc.doctorID}>{doc.fullName}</option>
                              ))}
                            </select>
                            <label htmlFor="doctorSelect">
                              <i className="bi bi-person-badge me-2 text-primary"></i>Select Doctor
                            </label>
                          </div>
                        </div>
                      </div>

                      {/* Doctor Info Badge */}
                      {selectedSpecialty && (
                        <div className="mt-3 mb-4">
                          <div className="d-flex align-items-center justify-content-between mt-2">
                            {/* Bên trái: Số lượng bác sĩ tìm thấy */}
                            <small className="text-muted fst-italic">
                              <i className="bi bi-info-circle-fill text-info me-1"></i>
                              Found <strong>{getFilteredDoctors().length}</strong> doctor(s)
                            </small>

                            {/* Bên phải: Ngôn ngữ của bác sĩ đang chọn */}
                            {selectedDoctor && (() => {
                              const doctor = getFilteredDoctors().find(d => d.doctorID === selectedDoctor);
                              // Tách chuỗi "English, French" thành mảng
                              const languages = doctor?.languageSpoken ? doctor.languageSpoken.split(',') : [];

                              return languages.length > 0 && (
                                <div className="d-flex align-items-center">
                                  <i className="bi bi-globe2 text-primary me-2" title="Languages spoken"></i>
                                  <div className="d-flex gap-1">
                                    {languages.map((lang, idx) => (
                                      <span key={idx} className="badge bg-primary-subtle text-primary border border-primary-subtle rounded-pill">
                                        {lang.trim()}
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              );
                            })()}
                          </div>
                          {doctorId && (
                            <div className="text-end">
                              <small className="text-success fw-bold">
                                <i className="bi bi-check-circle me-1"></i>Pre-selected doctor.
                              </small> <a href="/doctors" className="small text-decoration-none">Change?</a>
                            </div>
                          )}
                        </div>
                      )}

                      <hr className="my-4 text-muted opacity-25" />

                      {/* ✅ STEP 3: Date & Time */}
                      <h5 className="fw-bold mb-3 text-secondary"><i className="bi bi-clock-history me-2"></i>Schedule Details</h5>

                      <div className="mb-4">
                        <label className="form-label fw-semibold text-muted small text-uppercase">Preferred Date</label>
                        <small className="d-block text-muted mb-2">
                          <i className="bi bi-info-circle me-1"></i>
                          You can book appointments up to 90 days in advance
                        </small>
                        <input
                          type="date"
                          className="form-control form-control-lg"
                          value={date}
                          min={new Date().toISOString().split('T')[0]}
                          max={maxDate}
                          onChange={(e) => setDate(e.target.value)}
                        />
                      </div>

                      <div className="mb-4">
                        <label className="form-label fw-semibold text-muted small text-uppercase mb-3">
                          Available Time Slots
                          {loadingSlots && <span className="spinner-border spinner-border-sm ms-2 text-primary" role="status"></span>}
                        </label>

                        {loadingSlots ? (
                          <div className="text-center py-3 text-muted">Checking availability...</div>
                        ) : (
                          <div className="row row-cols-2 row-cols-md-3 row-cols-lg-4 g-2">
                            {slots.length === 0 ? (
                              <div className="col-12">
                                <div className="alert alert-warning text-center m-0" role="alert">
                                  <i className="bi bi-calendar-x me-2"></i> No slots available for this date.
                                </div>
                              </div>
                            ) : (
                              slots.map((slot, idx) => {
                                const timeString = new Date(slot.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                                const isSelected = selectedSlot === slot;
                                const isAvailable = slot.isAvailable;

                                return (
                                  <div className="col" key={idx}>
                                    <button
                                      type="button"
                                      disabled={!isAvailable}
                                      onClick={() => setSelectedSlot(slot)}
                                      className={`btn w-100 py-2 position-relative ${isSelected
                                        ? 'btn-primary shadow'
                                        : isAvailable
                                          ? 'btn-outline-primary'
                                          : 'btn-light text-muted border-0'
                                        }`}
                                    >
                                      {timeString}
                                      {!isAvailable && <span className="position-absolute top-0 start-100 translate-middle p-1 bg-danger border border-light rounded-circle" style={{ width: '10px', height: '10px' }}></span>}
                                    </button>
                                  </div>
                                )
                              })
                            )}
                          </div>
                        )}
                      </div>

                      {/* ✅ STEP 4: Consultation Type */}
                      <div className="mb-4">
                        <label className="form-label fw-semibold text-muted small text-uppercase">Method</label>
                        <div className="input-group">
                          <span className="input-group-text bg-white"><i className="bi bi-camera-video"></i></span>
                          <select
                            className="form-select form-select-lg"
                            value={consultationType}
                            onChange={(e) => setConsultationType(e.target.value)}
                          >
                            <option value="Video Call">Video Call</option>
                            <option value="Chat">Chat</option>
                          </select>
                        </div>
                      </div>

                      {/* ✅ STEP 5: Submit Button */}
                      <button
                        className="btn btn-primary btn-lg w-100 py-3 fw-bold shadow-sm rounded-3 mt-2"
                        onClick={handleSchedule}
                        disabled={!selectedSlot}
                      >
                        {selectedSlot ? (
                          <span><i className="bi bi-calendar-check-fill me-2"></i>Confirm Appointment</span>
                        ) : (
                          <span className="opacity-50">Select a time slot to continue</span>
                        )}
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
export default Schedule;