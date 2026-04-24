import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, Button, Form } from 'react-bootstrap';
import { doctorService } from '../api/doctorApi';
import { useAuth } from '../context/AuthContext';
import { useChat } from '../context/ChatContext';
import { db } from '../firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import signalRService from '../services/signalrService';
import './Css/DoctorPage.css';

export default function DoctorAppointmentsView({ doctorId, onViewAppointment, viewedAppointments = [] }) {
  const navigate = useNavigate();
  const [appointments, setAppointments] = useState([]);
  const [filteredAppointments, setFilteredAppointments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const { roles, initiateCall } = useAuth();
  const { openChatWith } = useChat();
  
  // Track new appointments with timestamp (last 5 minutes)
  const [newAppointmentIds, setNewAppointmentIds] = useState(() => {
    const saved = localStorage.getItem('newAppointments');
    if (saved) {
      const parsed = JSON.parse(saved);
      // Filter out appointments older than 5 minutes
      const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;
      const filtered = parsed.filter(item => item.timestamp > fiveMinutesAgo);
      localStorage.setItem('newAppointments', JSON.stringify(filtered));
      return filtered;
    }
    return [];
  });
  
  // Sync with localStorage changes (when parent removes from newAppointments)
  useEffect(() => {
    const handleStorageChange = () => {
      const saved = localStorage.getItem('newAppointments');
      if (saved) {
        const parsed = JSON.parse(saved);
        setNewAppointmentIds(parsed);
      } else {
        setNewAppointmentIds([]);
      }
    };
    
    window.addEventListener('storage', handleStorageChange);
    
    // Also listen for custom event from same tab
    const intervalId = setInterval(() => {
      const saved = localStorage.getItem('newAppointments');
      if (saved) {
        const parsed = JSON.parse(saved);
        const currentIds = JSON.stringify(newAppointmentIds);
        const newIds = JSON.stringify(parsed);
        if (currentIds !== newIds) {
          setNewAppointmentIds(parsed);
        }
      }
    }, 500); // Check every 500ms
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      clearInterval(intervalId);
    };
  }, [newAppointmentIds]);
  
  // Filter state
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [selectedDate, setSelectedDate] = useState('');
  const [filterActive, setFilterActive] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState('All');
  const [showStatusDropdown, setShowStatusDropdown] = useState(false);
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const appointmentsPerPage = 8;

  // Fetch appointments data
  useEffect(() => {
    if (!doctorId) return;

    let mounted = true;
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await doctorService.getDoctorAppointments(doctorId);
        if (mounted) {
          // Sort appointments: new ones first, then by date
          const sorted = sortAppointments(data || []);
          setAppointments(sorted);
          setFilteredAppointments(sorted);
        }
      } catch (err) {
        console.error('Error fetching appointments:', err);
        if (mounted) setError('Failed to load appointments');
      } finally {
        if (mounted) setLoading(false);
      }
    };

    fetchData();
    return () => { mounted = false; };
  }, [doctorId]);
  
  // Listen for new appointments via SignalR
  useEffect(() => {
    const handleNewAppointment = async (notification) => {
      console.log('📅 New appointment notification received:', notification);
      
      // Get appointment ID (could be appointmentId or appointmentID)
      const apptId = notification.appointmentId || notification.appointmentID;
      
      if (!apptId) {
        console.error('No appointment ID in notification:', notification);
        return;
      }
      
      console.log('✅ Adding appointment ID to new list:', apptId);
      
      // Add to new appointments list with timestamp
      setNewAppointmentIds(prev => {
        const newItem = {
          id: apptId,
          timestamp: Date.now()
        };
        const updated = [newItem, ...prev];
        localStorage.setItem('newAppointments', JSON.stringify(updated));
        console.log('💾 Saved to localStorage:', updated);
        return updated;
      });
      
      // Refetch appointments to get full data
      try {
        const data = await doctorService.getDoctorAppointments(doctorId);
        if (data) {
          setAppointments(data);
        }
      } catch (error) {
        console.error('Error refetching appointments:', error);
      }
    };
    
    // Register SignalR listener
    signalRService.on('ReceiveAppointmentNotification', handleNewAppointment);
    
    return () => {
      signalRService.off('ReceiveAppointmentNotification', handleNewAppointment);
    };
  }, [doctorId]);
  
  // Clean up old "new" appointments every minute
  useEffect(() => {
    const interval = setInterval(() => {
      const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;
      setNewAppointmentIds(prev => {
        const filtered = prev.filter(item => item.timestamp > fiveMinutesAgo);
        if (filtered.length !== prev.length) {
          localStorage.setItem('newAppointments', JSON.stringify(filtered));
        }
        return filtered;
      });
    }, 60000); // Check every minute
    
    return () => clearInterval(interval);
  }, []);
  
  // Helper function to sort appointments (new ones first, then by date)
  const sortAppointments = (appointmentsList) => {
    const newIds = newAppointmentIds.map(item => item.id);
    
    const sorted = [...appointmentsList].sort((a, b) => {
      const aIsNew = newIds.includes(a.appointmentID);
      const bIsNew = newIds.includes(b.appointmentID);
      
      // New appointments first
      if (aIsNew && !bIsNew) return -1;
      if (!aIsNew && bIsNew) return 1;
      
      // Then sort by date (newest first)
      return new Date(b.appointmentTime) - new Date(a.appointmentTime);
    });
    
    console.log('🔄 Sorted appointments. New IDs:', newIds, 'First 3:', sorted.slice(0, 3).map(a => ({ id: a.appointmentID, isNew: newIds.includes(a.appointmentID) })));
    return sorted;
  };
  
  // Helper function to check if appointment is new
  const isNewAppointment = (appointmentId) => {
    const isNew = newAppointmentIds.some(item => item.id === appointmentId);
    return isNew;
  };

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showStatusDropdown && !event.target.closest('.position-relative')) {
        setShowStatusDropdown(false);
      }
      if (showDatePicker && !event.target.closest('.position-relative')) {
        setShowDatePicker(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showStatusDropdown, showDatePicker]);

  // Apply filters based on status and date
  const applyFilters = () => {
    let filtered = [...appointments];

    // Filter by status
    if (selectedStatus !== 'All') {
      filtered = filtered.filter(apt => apt.status === selectedStatus);
    }

    // Filter by date
    if (selectedDate) {
      const filterDate = new Date(selectedDate);
      filtered = filtered.filter(appointment => {
        const appointmentDate = new Date(appointment.appointmentDate);
        return appointmentDate.toDateString() === filterDate.toDateString();
      });
    }
    
    // Keep sort order (new appointments first)
    const sorted = sortAppointments(filtered);

    setFilteredAppointments(sorted);
    setFilterActive(selectedStatus !== 'All' || selectedDate !== '');
    setCurrentPage(1);
  };

  // Apply filters when selectedStatus or appointments changes
  useEffect(() => {
    if (appointments.length > 0) {
      applyFilters();
    }
  }, [selectedStatus, appointments, newAppointmentIds]);

  // Pagination logic
  const indexOfLastAppointment = currentPage * appointmentsPerPage;
  const indexOfFirstAppointment = indexOfLastAppointment - appointmentsPerPage;
  const currentAppointments = filteredAppointments.slice(indexOfFirstAppointment, indexOfLastAppointment);
  const totalPages = Math.ceil(filteredAppointments.length / appointmentsPerPage);

  const handleNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  const handlePrevPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  if (loading) {
    return (
      <div className="text-center py-5">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return <div className="alert alert-danger m-4">{error}</div>;
  }

  if (appointments.length === 0) {
    return (
      <div className="text-center py-5 text-muted">
        <p>No appointments found.</p>
      </div>
    );
  }

  const handleChat = async (appointment) => {
    const isDoctor = roles && roles.some(r => String(r).trim().toLowerCase() === 'doctor');
    const partnerData = isDoctor ? appointment.patient : appointment.doctor;
    const partnerID = isDoctor ? appointment.patient?.patientID : appointment.doctorID;  // ← SỬA ĐÂY

    if (!partnerData || !partnerID) {
      alert("Chat partner information is missing.");
      return;
    }

    let firebaseID;
    if (partnerID.includes('-')) {
      // Has dashes: CHỈ remove last 4 chars, GIỮ NGUYÊN dấu gạch ngang
      firebaseID = partnerID.substring(0, partnerID.length - 4);  // ← SỬA ĐÂY
    } else {
      // No dashes: remove last 5 chars directly
      firebaseID = partnerID.substring(0, partnerID.length - 5);
    }

    console.log(`[Chat] Opening chat with ${isDoctor ? 'Patient' : 'Doctor'}`);

    try {
      const usersRef = collection(db, "users");

      // Try as document ID first
      let q = query(usersRef, where("__name__", "==", firebaseID));
      let querySnapshot = await getDocs(q);

      if (!querySnapshot.empty) {
        const partnerUser = { ...querySnapshot.docs[0].data(), uid: querySnapshot.docs[0].id };
        openChatWith(partnerUser);
        return;
      }

      // Try as uid field
      q = query(usersRef, where("uid", "==", firebaseID));
      querySnapshot = await getDocs(q);

      if (!querySnapshot.empty) {
        const partnerUser = { ...querySnapshot.docs[0].data(), uid: querySnapshot.docs[0].id };
        console.log(`[Chat] ✓ Found by uid field:`, partnerUser);
        openChatWith(partnerUser);
        return;
      }

      console.warn(`[Chat] ✗ Could not find user with Firebase ID: ${firebaseID}`);
      alert(`Could not find chat user. They may not have registered in the chat system yet.`);
    } catch (error) {
      console.error("[Chat] Error:", error);
      alert("Error initiating chat.");
    }
  };

  const handleVideoCall = async (appointment) => {
    try {
      // Lấy thông tin từ appointment (patientID và doctorID nằm trong nested objects)
      const patientID = appointment.patient?.patientID || appointment.patientID;
      const doctorID = appointment.doctorID;
      const patientName = appointment.patient?.fullName || "Patient";
      const doctorName = appointment.doctor?.fullName || "Doctor";

      // Kiểm tra xem user hiện tại là ai
      const isDoctor = roles && roles.some(r => String(r).trim().toLowerCase() === 'doctor');

      // Xác định target user (người được gọi)
      const targetUserId = isDoctor ? patientID : doctorID;
      const targetUserName = isDoctor ? patientName : doctorName;

      // Tạo Room ID bằng cách trộn DoctorID + PatientID và lấy 40 ký tự
      // const combinedId = doctorID + patientID;
      // const roomId = combinedId.substring(0, 40);

      // Tạo Room ID ngẫu nhiên 45 ký tự
      const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
      let roomId = '';
      for (let i = 0; i < 45; i++) {
        roomId += characters.charAt(Math.floor(Math.random() * characters.length));
      }

      // console.log('Video Call Info:', {
      //   patientID,
      //   doctorID,
      //   patientName,
      //   doctorName,
      //   roomId,
      //   targetUserId,
      //   targetUserName
      // });

      // Lấy tên bác sĩ hiện tại
      const currentDoctorName = doctorName || "Doctor";

      // Gọi hàm initiateCall với thông tin đầy đủ (bao gồm tên bác sĩ)
      initiateCall(targetUserId, roomId, targetUserName, currentDoctorName);

    } catch (error) {
      console.error("Error initiating video call:", error);
      alert("Unable to start video call.");
    }
  };

  // Filter by date
  const handleDateFilter = () => {
    if (!selectedDate) {
      applyFilters();
      setFilterActive(false);
      return;
    }

    const filterDate = new Date(selectedDate);
    const filtered = appointments.filter(appointment => {
      const appointmentDate = new Date(appointment.appointmentDate);
      return appointmentDate.toDateString() === filterDate.toDateString();
    });

    setFilteredAppointments(filtered);
    setFilterActive(true);
    setShowDatePicker(false);
    setCurrentPage(1);
  };

  const clearFilter = () => {
    setSelectedDate('');
    setSelectedStatus('All');
    setFilteredAppointments(appointments);
    setFilterActive(false);
    setCurrentPage(1);
  };

  // Handle status filter change
  const handleStatusChange = (status) => {
    setSelectedStatus(status);
  };

  return (
    <>
      <div className="d-flex justify-content-between align-items-center p-3 pb-0 flex-wrap gap-2">
        <h6 className="mb-0 fw-semibold text-dark d-none d-md-block">Appointments List</h6>
        
        <div className="d-flex gap-2 ms-auto flex-wrap">
          {/* Status Filter Dropdown */}
          <div className="position-relative">
            <Button
              variant={selectedStatus !== 'All' ? 'primary' : 'outline-secondary'}
              size="sm"
              className={`filter-btn ${selectedStatus !== 'All' ? 'filter-active' : ''}`}
              onClick={() => setShowStatusDropdown(!showStatusDropdown)}
            >
              <i className="bi bi-funnel me-2"></i>
              <span className="d-none d-sm-inline">{selectedStatus}</span>
              <span className="d-inline d-sm-none">{selectedStatus}</span>
              <i className={`bi bi-chevron-${showStatusDropdown ? 'up' : 'down'} ms-2`}></i>
            </Button>
            {showStatusDropdown && (
              <>
                <div className="filter-backdrop d-md-none" onClick={() => setShowStatusDropdown(false)} />
                <ul className="dropdown-menu show position-absolute" style={{ zIndex: 1000 }}>
                  <li>
                    <a className={`dropdown-item ${selectedStatus === 'All' ? 'active' : ''}`} href="#" onClick={(e) => { e.preventDefault(); handleStatusChange('All'); setShowStatusDropdown(false); }}>
                      All
                    </a>
                  </li>
                  <li>
                    <a className={`dropdown-item ${selectedStatus === 'Scheduled' ? 'active' : ''}`} href="#" onClick={(e) => { e.preventDefault(); handleStatusChange('Scheduled'); setShowStatusDropdown(false); }}>
                      Scheduled
                    </a>
                  </li>
                  <li>
                    <a className={`dropdown-item ${selectedStatus === 'Completed' ? 'active' : ''}`} href="#" onClick={(e) => { e.preventDefault(); handleStatusChange('Completed'); setShowStatusDropdown(false); }}>
                      Completed
                    </a>
                  </li>
                  <li>
                    <a className={`dropdown-item ${selectedStatus === 'Cancelled' ? 'active' : ''}`} href="#" onClick={(e) => { e.preventDefault(); handleStatusChange('Cancelled'); setShowStatusDropdown(false); }}>
                      Cancelled
                    </a>
                  </li>
                </ul>
              </>
            )}
          </div>

          {/* Date Filter */}
          <div className="position-relative">
            <Button 
              variant={selectedDate ? 'primary' : 'outline-primary'}
              onClick={() => setShowDatePicker(!showDatePicker)}
              size="sm"
              className={`filter-btn ${selectedDate ? 'filter-active' : ''}`}
              title="Filter by Date"
            >
              <i className="bi bi-calendar-check"></i>
              {selectedDate && (
                <span className="ms-2 d-none d-sm-inline">
                  {new Date(selectedDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </span>
              )}
            </Button>
          
            {showDatePicker && (
              <>
                <div className="filter-backdrop d-md-none" onClick={() => setShowDatePicker(false)} />
                <div className="date-filter-dropdown position-absolute end-0 mt-2 shadow-lg" style={{ zIndex: 1000 }}>
                  <div className="date-filter-header">
                    <i className="bi bi-calendar-event me-2"></i>
                    <span>Select Date</span>
                  </div>
                  <div className="date-filter-body">
                    <Form.Control
                      type="date"
                      value={selectedDate}
                      onChange={(e) => setSelectedDate(e.target.value)}
                      className="date-input"
                    />
                  </div>
                  <div className="date-filter-footer">
                    <Button 
                      variant="primary" 
                      size="sm" 
                      className="flex-grow-1"
                      onClick={handleDateFilter}
                    >
                      <i className="bi bi-check2 me-1"></i>
                      Apply
                    </Button>
                    <Button 
                      variant="outline-secondary" 
                      size="sm"
                      onClick={() => {
                        clearFilter();
                        setShowDatePicker(false);
                      }}
                    >
                      <i className="bi bi-x-lg me-1"></i>
                      Clear
                    </Button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="table-responsive">
        <table className="table table-borderless align-middle mb-0">
          <thead className="table-header">
            <tr>
              <th scope="col" className="px-4 py-3">ID</th>
              <th scope="col" className="px-4 py-3">Patient</th>
              <th scope="col" className="px-4 py-3">Date</th>
              <th scope="col" className="px-4 py-3">Time</th>
              <th scope="col" className="px-4 py-3">Type</th>
              <th scope="col" className="px-4 py-3">Status</th>
              <th scope="col" className="px-4 py-3 text-center">Actions</th>
            </tr>
          </thead>
          <tbody>
            {currentAppointments.map((a) => {
              const isNew = isNewAppointment(a.appointmentID);
              return (
              <tr key={a.appointmentID} className={`border-bottom hover-table-row ${isNew ? 'new-appointment-row' : ''}`}>
                <td className="px-4 py-4 fw-medium text-dark fw-bold" data-label="ID">
                  #{a.appointmentID}
                  {isNew && (
                    <span className="badge bg-success ms-2 small new-badge-pulse">NEW</span>
                  )}
                </td>
                <td className="px-4 py-4 text-dark" data-label="Patient">{a.patient?.fullName || 'Unknown Patient'}</td>
                <td className="px-4 py-4 text-dark" data-label="Date">
                  {new Date(a.appointmentTime).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                </td>
                <td className="px-4 py-4 text-dark" data-label="Time">
                  {new Date(a.appointmentTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </td>
                <td className="px-4 py-4" data-label="Type">
                  <span className={`type-badge ${a.consultationType === 'Video Call' ? 'type-video' :
                    a.consultationType === 'Audio Call' ? 'type-audio' :
                      a.consultationType === 'Chat' ? 'type-chat' :
                        'type-video'
                    }`}>
                    <span className="material-symbols-outlined me-1" style={{ fontSize: '1rem' }}>
                      {a.consultationType === 'Video Call' ? 'videocam' :
                        a.consultationType === 'Audio Call' ? 'call' :
                          a.consultationType === 'Chat' ? 'chat' :
                            'videocam'}
                    </span>
                    {a.consultationType || 'N/A'}
                  </span>
                </td>
                <td className="px-4 py-4" data-label="Status">
                  <span className={`badge ${a.status === 'Scheduled' ? 'bg-primary' :
                    a.status === 'Completed' ? 'bg-success' :
                      a.status === 'Cancelled' ? 'bg-danger' :
                        'bg-secondary'
                    }`}>
                    {a.status}
                  </span>
                </td>
                <td className="px-4 py-4 text-end" data-label="Actions">
                  <div className="d-flex gap-2 align-items-center justify-content-end flex-nowrap">
                    {a.consultationType === 'Chat' && a.status === 'Scheduled' && (
                      <button
                        className="btn btn-sm btn-primary"
                        onClick={() => handleChat(a)}
                        title={new Date(a.appointmentTime) < new Date() ? "Appointment time has passed" : "Start chat"}
                        disabled={new Date(a.appointmentTime) < new Date()}
                      >
                        <i className="bi bi-chat-dots me-1"></i>
                        Chat
                      </button>
                    )}

                    {a.consultationType === 'Video Call' && a.status === 'Scheduled' && (
                      <button
                        className="btn btn-sm btn-success"
                        onClick={() => handleVideoCall(a)}  // ← Truyền cả object "item"
                        title={new Date(a.appointmentTime) < new Date() ? "Appointment time has passed" : "Start video call"}
                        disabled={new Date(a.appointmentTime) < new Date()}
                      >
                        <i className="bi bi-camera-video me-1"></i>
                        Call Now
                      </button>
                    )}

                    {a.status !== 'Completed' && a.status !== 'Cancelled' && (
                      <button
                        className="btn btn-view d-flex align-items-center justify-content-center"
                        onClick={() => onViewAppointment ? onViewAppointment(a) : navigate(`/appointment/${a.appointmentID}`)}
                      >
                        View
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            );
            })}
          </tbody>
        </table>
      </div>

      {/* Pagination Controls */}
      {filteredAppointments.length > appointmentsPerPage && (
        <div className="d-flex justify-content-between align-items-center p-3 border-top">
          <div className="text-muted small">
            Showing {indexOfFirstAppointment + 1} to {Math.min(indexOfLastAppointment, filteredAppointments.length)} of {filteredAppointments.length} appointments
          </div>
          <div className="d-flex gap-2">
            <Button
              variant="outline-primary"
              size="sm"
              onClick={handlePrevPage}
              disabled={currentPage === 1}
            >
              <i className="bi bi-chevron-left me-1"></i>
              Previous
            </Button>
            <div className="d-flex align-items-center px-3">
              <span className="fw-semibold">Page {currentPage} of {totalPages}</span>
            </div>
            <Button
              variant="outline-primary"
              size="sm"
              onClick={handleNextPage}
              disabled={currentPage === totalPages}
            >
              Next
              <i className="bi bi-chevron-right ms-1"></i>
            </Button>
          </div>
        </div>
      )}
    </>
  );
}
