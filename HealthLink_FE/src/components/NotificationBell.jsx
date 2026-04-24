import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import signalRService from '../services/signalrService';
import notificationApi from '../api/notificationApi';
import PrescriptionDetailModal from './PrescriptionDetailModal';
import './Css/NotificationBell.css';

function NotificationBell() {
  const navigate = useNavigate();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [reminderCount, setReminderCount] = useState(0);
  const [notificationCount, setNotificationCount] = useState(0);
  const [activeTab, setActiveTab] = useState(null); // 'reminders' or 'notifications'
  const [reminders, setReminders] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [loadingReminders, setLoadingReminders] = useState(false);
  const [loadingNotifications, setLoadingNotifications] = useState(false);
  const [hasNewReminder, setHasNewReminder] = useState(false);
  const [hasNewNotification, setHasNewNotification] = useState(false);
  const [showPrescriptionModal, setShowPrescriptionModal] = useState(false);
  const [selectedPrescriptionId, setSelectedPrescriptionId] = useState(null);
  const dropdownRef = useRef(null);

  useEffect(() => {
    // Load initial counts
    loadAllCounts();

    // Initialize SignalR connection
    signalRService.startConnection();

    // Listen for medication reminders
    const handleMedicationReminder = (reminder) => {
      console.log('📬 Received medication reminder:', reminder);
      setReminderCount(prev => prev + 1);
      setUnreadCount(prev => prev + 1);
      setHasNewReminder(true);
      
      // Add to reminders list if tab is open
      const newReminder = {
        notificationID: Date.now(), // Temporary ID
        message: reminder.message,
        createdAt: new Date().toISOString(),
        isRead: false,
        prescriptionId: reminder.prescriptionId,
        medicationCount: reminder.medicationCount,
        remainingDays: reminder.remainingDays
      };
      
      setReminders(prev => [newReminder, ...prev]);
      
      // Show browser notification if supported
      if (Notification.permission === 'granted') {
        new Notification('💊 Medication Reminder', {
          body: reminder.message,
          icon: '/medication-icon.png'
        });
      }
    };

    // Listen for appointment notifications
    const handleAppointmentNotification = (notification) => {
      console.log('📅 Received appointment notification:', notification);
      setNotificationCount(prev => prev + 1);
      setUnreadCount(prev => prev + 1);
      setHasNewNotification(true);
      
      // Add to notifications list if tab is open
      const newNotification = {
        notificationID: Date.now(), // Temporary ID
        message: notification.message || `New appointment notification`,
        createdAt: new Date().toISOString(),
        isRead: false,
        appointmentId: notification.appointmentId || notification.appointmentID
      };
      
      setNotifications(prev => [newNotification, ...prev]);
      
      // Show browser notification if supported
      if (Notification.permission === 'granted') {
        new Notification('📅 Appointment Notification', {
          body: notification.message || `You have an appointment`,
          icon: '/appointment-icon.png'
        });
      }
    };

    signalRService.on('ReceiveMedicationReminder', handleMedicationReminder);
    signalRService.on('ReceiveAppointmentNotification', handleAppointmentNotification);

    // Request notification permission
    if (Notification.permission === 'default') {
      Notification.requestPermission();
    }

    // Close dropdown when clicking outside
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);

    return () => {
      signalRService.off('ReceiveMedicationReminder', handleMedicationReminder);
      signalRService.off('ReceiveAppointmentNotification', handleAppointmentNotification);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const loadAllCounts = async () => {
    try {
      // Load all notifications and count by type
      const data = await notificationApi.getMyNotifications();
      
      // Medication reminders - updated pattern to match new format
      const medicationReminders = data.filter(n => {
        const msg = n.message.toLowerCase();
        return msg.includes('prescription #') && (msg.includes('day(s) remaining') || msg.includes('medication(s)'));
      });
      const unreadReminders = medicationReminders.filter(n => !n.isRead).length;
      setReminderCount(unreadReminders);
      
      // Appointment notifications
      const appointmentNotifs = data.filter(n => {
        const msg = n.message.toLowerCase();
        const isMedication = msg.includes('prescription #') && (msg.includes('day(s) remaining') || msg.includes('medication(s)'));
        return !isMedication && (
          msg.includes('appointment') || 
          msg.includes('dr.') ||
          msg.includes('doctor')
        );
      });
      const unreadNotifs = appointmentNotifs.filter(n => !n.isRead).length;
      setNotificationCount(unreadNotifs);
      
      // Total unread
      const totalUnread = unreadReminders + unreadNotifs;
      setUnreadCount(totalUnread);
      
      console.log('📊 Loaded counts - Reminders:', unreadReminders, 'Notifications:', unreadNotifs, 'Total:', totalUnread);
    } catch (error) {
      console.error('Error loading notification counts:', error);
    }
  };

  const loadReminders = async () => {
    setLoadingReminders(true);
    try {
      const data = await notificationApi.getMyNotifications();
      console.log('All notifications:', data);
      
      // Filter for medication reminders - updated pattern
      const medicationReminders = data.filter(n => {
        const msg = n.message.toLowerCase();
        return msg.includes('prescription #') && (msg.includes('day(s) remaining') || msg.includes('medication(s)'));
      });
      
      console.log('Filtered medication reminders:', medicationReminders);
      setReminders(medicationReminders);
      
      // Count unread reminders
      const unread = medicationReminders.filter(n => !n.isRead).length;
      setReminderCount(unread);
    } catch (error) {
      console.error('Error loading reminders:', error);
    } finally {
      setLoadingReminders(false);
    }
  };

  const loadNotifications = async () => {
    setLoadingNotifications(true);
    try {
      const data = await notificationApi.getMyNotifications();
      
      // Filter for appointment notifications - exclude medication reminders
      const appointmentNotifs = data.filter(n => {
        const msg = n.message.toLowerCase();
        const isMedication = msg.includes('prescription #') && (msg.includes('day(s) remaining') || msg.includes('medication(s)'));
        
        return !isMedication && (
          msg.includes('appointment') || 
          msg.includes('dr.') ||
          msg.includes('doctor')
        );
      });
      
      setNotifications(appointmentNotifs);
      
      // Count unread notifications
      const unread = appointmentNotifs.filter(n => !n.isRead).length;
      setNotificationCount(unread);
    } catch (error) {
      console.error('Error loading notifications:', error);
    } finally {
      setLoadingNotifications(false);
    }
  };

  const toggleDropdown = () => {
    setDropdownOpen(!dropdownOpen);
    if (!dropdownOpen) {
      setActiveTab(null); // Reset active tab when opening
    }
  };

  const handleTabClick = (tab) => {
    if (activeTab === tab) {
      setActiveTab(null); // Close if clicking the same tab
    } else {
      setActiveTab(tab);
      if (tab === 'reminders') {
        setHasNewReminder(false); // Clear animation
        loadReminders();
        // Mark reminders as read after loading
        setTimeout(() => markRemindersAsRead(), 500);
      } else if (tab === 'notifications') {
        setHasNewNotification(false); // Clear animation
        loadNotifications();
        // Mark notifications as read after loading
        setTimeout(() => markNotificationsAsRead(), 500);
      }
    }
  };

  const markRemindersAsRead = async () => {
    try {
      // Only mark if there are unread reminders
      if (reminderCount > 0) {
        const currentReminderCount = reminderCount;
        await notificationApi.markAllAsRead();
        setReminderCount(0);
        setUnreadCount(prev => Math.max(0, prev - currentReminderCount));
        console.log('✅ Marked', currentReminderCount, 'reminders as read');
      }
    } catch (error) {
      console.error('Error marking reminders as read:', error);
    }
  };

  const markNotificationsAsRead = async () => {
    try {
      // Only mark if there are unread notifications
      if (notificationCount > 0) {
        const currentNotificationCount = notificationCount;
        await notificationApi.markAllAsRead();
        setNotificationCount(0);
        setUnreadCount(prev => Math.max(0, prev - currentNotificationCount));
        console.log('✅ Marked', currentNotificationCount, 'notifications as read');
      }
    } catch (error) {
      console.error('Error marking notifications as read:', error);
    }
  };

  const handleReminderClick = (reminder) => {
    // Extract prescription ID from message
    let prescriptionId = null;
    
    // Try to extract from message like "You have a prescription #123"
    const match = reminder.message.match(/prescription #(\d+)/i);
    if (match) {
      prescriptionId = parseInt(match[1]);
    }
    
    if (prescriptionId) {
      setSelectedPrescriptionId(prescriptionId);
      setShowPrescriptionModal(true);
      setDropdownOpen(false);
    } else {
      console.warn('No prescription ID found in reminder:', reminder);
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  // Format medication reminder message to extract prescription info
  const formatReminderMessage = (message) => {
    if (!message) return { prescriptionId: null, medicationCount: 0, remainingDays: 0, displayText: message };
    
    // Extract prescription ID: "You have a prescription #123"
    const prescriptionMatch = message.match(/prescription #(\d+)/i);
    const prescriptionId = prescriptionMatch ? parseInt(prescriptionMatch[1]) : null;
    
    // Extract medication count: "with 3 medication(s)"
    const medicationMatch = message.match(/with (\d+) medication\(s\)/i);
    const medicationCount = medicationMatch ? parseInt(medicationMatch[1]) : 0;
    
    // Extract remaining days: "5 day(s) remaining"
    const daysMatch = message.match(/(\d+) day\(s\) remaining/i);
    const remainingDays = daysMatch ? parseInt(daysMatch[1]) : 0;
    
    return {
      prescriptionId,
      medicationCount,
      remainingDays,
      displayText: message
    };
  };

  return (
    <div className="notification-bell-container" ref={dropdownRef}>
      <button 
        className={`notification-bell-btn ${unreadCount > 0 ? 'has-unread' : ''}`}
        onClick={toggleDropdown}
        aria-label="Notifications"
      >
        <span className="material-symbols-outlined">notifications</span>
        {unreadCount > 0 && (
          <span className="notification-badge pulse">{unreadCount > 99 ? '99+' : unreadCount}</span>
        )}
      </button>

      {dropdownOpen && (
        <div className="notification-dropdown">
          <div className="notification-dropdown-header">
            <h6 className="mb-0">Notifications</h6>
          </div>
          <div className="notification-dropdown-body">
            {/* Medication Reminders Tab */}
            <div 
              className={`notification-tab-item ${activeTab === 'reminders' ? 'active' : ''} ${hasNewReminder ? 'new-notification' : ''}`}
              onClick={() => handleTabClick('reminders')}
            >
              <span className="material-symbols-outlined medication-icon">medication</span>
              <span>Medication Reminders</span>
              {reminderCount > 0 && (
                <span className="notification-item-badge">{reminderCount}</span>
              )}
            </div>

            {/* Reminders List */}
            {activeTab === 'reminders' && (
              <div className="notification-list">
                {loadingReminders ? (
                  <div className="notification-loading">
                    <div className="spinner-border spinner-border-sm text-primary" role="status">
                      <span className="visually-hidden">Loading...</span>
                    </div>
                  </div>
                ) : reminders.length > 0 ? (
                  reminders.map(reminder => {
                    const { prescriptionId, medicationCount, remainingDays, displayText } = formatReminderMessage(reminder.message);
                    return (
                      <div 
                        key={reminder.notificationID} 
                        className={`notification-list-item prescription-reminder ${!reminder.isRead ? 'unread' : ''}`}
                        onClick={() => handleReminderClick(reminder)}
                        style={{ cursor: 'pointer' }}
                      >
                        <div className="notification-icon-wrapper medication-bg">
                          <span className="material-symbols-outlined">local_pharmacy</span>
                        </div>
                        <div className="notification-content">
                          <div className="prescription-reminder-header">
                            <h6 className="prescription-title">
                              <span className="material-symbols-outlined">description</span>
                              Prescription #{prescriptionId}
                            </h6>
                          </div>
                          <div className="prescription-info">
                            {remainingDays > 0 && (
                              <div className="info-item remaining-time">
                                <span className="material-symbols-outlined">schedule</span>
                                <span className={`days-text ${remainingDays <= 3 ? 'urgent' : ''}`}>
                                  {remainingDays} day(s) left
                                </span>
                              </div>
                            )}
                            <div className="info-item">
                              <span className="material-symbols-outlined">medication</span>
                              <span>{medicationCount} medication(s)</span>
                            </div>
                            <div className="info-item time-info">
                              <span className="material-symbols-outlined">schedule</span>
                              <span>{formatDate(reminder.createdAt)}</span>
                            </div>
                          </div>
                          <div className="notification-footer">
                            <span className="click-hint">
                              <span className="material-symbols-outlined">visibility</span>
                              Click to view details
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="notification-empty">
                    <span className="material-symbols-outlined">inbox</span>
                    <p>No medication reminders</p>
                  </div>
                )}
              </div>
            )}

            {/* Appointment Notifications Tab */}
            <div 
              className={`notification-tab-item ${activeTab === 'notifications' ? 'active' : ''} ${hasNewNotification ? 'new-notification' : ''}`}
              onClick={() => handleTabClick('notifications')}
            >
              <span className="material-symbols-outlined appointment-icon">event</span>
              <span>Appointment Notifications</span>
              {notificationCount > 0 && (
                <span className="notification-item-badge">{notificationCount}</span>
              )}
            </div>

            {/* Notifications List */}
            {activeTab === 'notifications' && (
              <div className="notification-list">
                {loadingNotifications ? (
                  <div className="notification-loading">
                    <div className="spinner-border spinner-border-sm text-primary" role="status">
                      <span className="visually-hidden">Loading...</span>
                    </div>
                  </div>
                ) : notifications.length > 0 ? (
                  notifications.map(notification => (
                    <div key={notification.notificationID} className={`notification-list-item ${!notification.isRead ? 'unread' : ''}`}>
                      <div className="notification-icon-wrapper appointment-bg">
                        <span className="material-symbols-outlined">calendar_month</span>
                      </div>
                      <div className="notification-content">
                        <p className="notification-message">{notification.message}</p>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="notification-empty">
                    <span className="material-symbols-outlined">inbox</span>
                    <p>No appointment notifications</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Prescription Detail Modal */}
      <PrescriptionDetailModal 
        show={showPrescriptionModal}
        onHide={() => setShowPrescriptionModal(false)}
        prescriptionId={selectedPrescriptionId}
      />
    </div>
  );
}

export default NotificationBell;
