import React, { memo, useEffect, useRef, useState } from 'react';
import ServiceTogglePanel from './ServiceTogglePanel';

const getInitials = (name) => {
  if (!name) return 'DR';
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');
};

const DoctorHeader = memo(({
  doctorData,
  isMobileMenuOpen,
  showAllNotifications,
  notifications,
  unreadCount,
  showNotificationDropdown,
  notificationRef,
  onToggleMobileMenu,
  onToggleNotificationDropdown,
  onNotificationClick,
  onMarkAllRead,
  onCloseAllNotifications,
  onLogout,
  onChangePassword,
  onNavigateToProfile,
  onNavigateToWallet,
}) => {
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  const [showServices, setShowServices] = useState(false);
  const profileDropdownRef = useRef(null);

  useEffect(() => {
    if (!showProfileDropdown && !showServices) return;
    const handleClick = (e) => {
      if (profileDropdownRef.current && !profileDropdownRef.current.contains(e.target)) {
        setShowProfileDropdown(false);
        setShowServices(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [showProfileDropdown, showServices]);

  const handleLogout = () => {
    setShowProfileDropdown(false);
    onLogout();
  };

  const handleChangePassword = () => {
    setShowProfileDropdown(false);
    onChangePassword();
  };

  const avatarUrl = doctorData?.avatarUrl || doctorData?.profileImage || doctorData?.imageUrl;
  const doctorName = doctorData?.fullName || 'Doctor';
  const specialty = doctorData?.specialty || doctorData?.specialtyName || '';

  const formatNotificationTime = (value) => {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    const diffMs = Date.now() - date.getTime();
    const diffMinutes = Math.max(0, Math.round(diffMs / 60000));
    if (diffMinutes < 1) return 'Just now';
    if (diffMinutes < 60) return `${diffMinutes} min${diffMinutes === 1 ? '' : 's'} ago`;
    const diffHours = Math.round(diffMinutes / 60);
    if (diffHours < 24) return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const getNotificationTone = (notification) => {
    const value = `${notification?.type || ''} ${notification?.message || ''}`.toLowerCase();
    if (value.includes('wallet') || value.includes('balance')) {
      return { icon: 'account_balance_wallet', title: 'Wallet Update', tone: 'success' };
    }
    if (value.includes('emergency') || value.includes('urgent')) {
      return { icon: 'emergency', title: 'Emergency Update', tone: 'critical' };
    }
    if (value.includes('lab') || value.includes('record')) {
      return { icon: 'lab_research', title: 'Medical Record', tone: 'warning' };
    }
    if (value.includes('review') || value.includes('rating')) {
      return { icon: 'star', title: 'New Review', tone: 'warning' };
    }
    if (value.includes('time arrived') || value.includes('ready to start')) {
      return { icon: 'play_circle', title: 'Appointment time arrived', tone: 'primary' };
    }
    return { icon: 'event', title: 'Appointment Update', tone: 'primary' };
  };

  const renderNotificationList = (expanded = false) => (
    <div className="doctor-scroll-container notification-list" style={{ maxHeight: expanded ? '70dvh' : '400px' }}>
      {notifications.length === 0 ? (
        <div className="d-flex flex-column align-items-center justify-content-center px-3 py-5 text-center text-secondary">
          <span className="material-symbols-outlined mb-2 fs-1">notifications_off</span>
          <p className="mb-0 small fw-semibold">No notifications</p>
          <p className="mb-0 notification-text-xs">Updates about appointments and wallet activity will appear here.</p>
        </div>
      ) : (
        notifications.map((notification) => {
          const tone = getNotificationTone(notification);
          const isUnread = !notification.isRead;
          return (
            <article
              className={`notification-item ${isUnread ? 'bg-primary-subtle border-start border-4 border-primary notification-item--unread shadow-sm' : 'notification-item--read'} notification-tone--${tone.tone} d-flex gap-3 p-3`}
              key={notification.notificationId}
            >
              <div className="notification-icon">
                <span className="material-symbols-outlined">{tone.icon}</span>
              </div>
              <div className="overflow-hidden flex-grow-1 d-flex flex-column gap-1">
                <div className="d-flex align-items-start justify-content-between gap-3">
                  <p className="notification-title mb-0 small fw-semibold">
                    {notification.title || tone.title}
                  </p>
                  <div className="d-flex align-items-center gap-2 flex-shrink-0">
                    {isUnread ? <span className="badge rounded-pill text-bg-primary notification-new-badge">New</span> : null}
                    {isUnread ? <span className="notification-unread-dot" /> : null}
                  </div>
                </div>
                <p className="mb-0 text-secondary notification-text-xs" style={{ whiteSpace: 'pre-line' }}>{notification.message}</p>
                <div className="d-flex align-items-center justify-content-between gap-3 pt-1">
                  <span className="notification-text-11 text-secondary">{formatNotificationTime(notification.createdAt)}</span>
                  <button
                    className="notification-text-xs fw-semibold border-0 bg-transparent p-0"
                    style={{ color: 'var(--doctor-primary)' }}
                    onClick={() => onNotificationClick(notification)}
                    type="button"
                  >
                    View Detail
                  </button>
                </div>
              </div>
            </article>
          );
        })
      )}
    </div>
  );

  const renderNotificationBell = () => (
    <div className="position-relative" ref={notificationRef}>
      <button
        aria-label="Open notifications"
        className="notification-bell-btn"
        onClick={() => onToggleNotificationDropdown()}
        type="button"
      >
        <span className="material-symbols-outlined">notifications</span>
        {unreadCount > 0 ? <span className="notification-bell-dot" /> : null}
      </button>
      {showNotificationDropdown ? (
        <div className="notification-dropdown-desktop d-none d-md-block">
          <div className="notification-dropdown-arrow" />
          <div className="d-flex align-items-center justify-content-between border-bottom px-3 py-3" style={{ borderColor: 'var(--border-light)' }}>
            <h3 className="mb-0 small fw-semibold">Notifications</h3>
            {unreadCount > 0 ? (
              <button className="text-xs fw-semibold border-0 bg-transparent" style={{ color: 'var(--primary)' }} onClick={onMarkAllRead} type="button">
                Mark all as read
              </button>
            ) : null}
          </div>
          {renderNotificationList()}
          <div className="border-top p-3 text-center" style={{ borderColor: 'var(--border-light)' }}>
            <button className="text-xs fw-semibold border-0 bg-transparent" style={{ color: 'var(--primary)' }} onClick={onCloseAllNotifications} type="button">
              View all notifications
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );

  return (
    <header className="doctor-header sticky-top z-30 d-flex align-items-center justify-content-between px-5" style={{ paddingRight: '3rem' }}>
      <div className="d-flex align-items-center gap-3">
        <button
          className="rounded-3 p-2 text-on-surface-variant hover:bg-surface-container d-lg-none border-0 bg-transparent"
          onClick={() => onToggleMobileMenu()}
          type="button"
        >
          <span className="material-symbols-outlined">menu</span>
        </button>
      </div>
      <div className="d-flex align-items-center gap-0 ms-auto">
        <div className="d-flex align-items-center gap-3 pe-3">
          {renderNotificationBell()}

          {/* Avatar Dropdown */}
          <div className="position-relative" ref={profileDropdownRef}>
            <button
              className="shrink-0 overflow-hidden rounded-circle border border-surface-border bg-primary-fixed text-primary d-flex align-items-center justify-content-center fw-bold border-0"
              onClick={() => setShowProfileDropdown((prev) => !prev)}
              type="button"
              style={{ width: '2.75rem', height: '2.75rem', fontSize: '1rem', cursor: 'pointer' }}
              aria-label="Profile menu"
            >
              {avatarUrl ? (
                <img alt="Doctor" className="object-fit-cover w-100 h-100" src={avatarUrl} />
              ) : (
                <span>{getInitials(doctorName)}</span>
              )}
            </button>

            {(showProfileDropdown || showServices) && (
              <div
                className="position-absolute end-0 mt-2 bg-white shadow-lg overflow-hidden"
                style={{
                  width: '280px',
                  borderRadius: '0.75rem',
                  border: '1px solid var(--border)',
                  zIndex: 1050,
                  animation: 'fadeIn 0.12s ease-out',
                }}
              >
                {showServices ? (
                  <ServiceTogglePanel
                    currentServices={{
                      online: doctorData?.availableTypes?.includes('Online') ?? true,
                      homeVisit: doctorData?.availableTypes?.includes('HomeVisit') ?? true,
                    }}
                    onClose={() => setShowServices(false)}
                  />
                ) : (
                <>
                {/* Profile Card */}
                <div className="p-3 d-flex align-items-center gap-3" style={{ borderBottom: '1px solid var(--border)' }}>
                  <div
                    className="shrink-0 overflow-hidden rounded-circle d-flex align-items-center justify-content-center fw-bold flex-shrink-0"
                    style={{ width: '2.5rem', height: '2.5rem', fontSize: '0.875rem', background: 'var(--primary-light)', color: 'var(--primary)' }}
                  >
                    {avatarUrl ? (
                      <img alt={doctorName} className="object-fit-cover w-100 h-100" src={avatarUrl} />
                    ) : (
                      <span>{getInitials(doctorName)}</span>
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="fw-bold mb-0 text-truncate" style={{ fontSize: '0.875rem', color: 'var(--text-primary)' }}>
                      {doctorName}
                    </p>
                    {specialty && (
                      <p className="small mb-0 text-truncate" style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                        {specialty}
                      </p>
                    )}
                  </div>
                </div>

                {/* Menu Items */}
                <div className="py-1">
                  <button
                    className="d-flex align-items-center gap-3 w-100 px-3 py-2 border-0 bg-transparent text-start"
                    onClick={() => { setShowProfileDropdown(false); onNavigateToProfile(); }}
                    type="button"
                    style={{ fontSize: '0.8125rem', color: 'var(--text-primary)', transition: 'background 0.1s ease' }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--surface-muted)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: '1.125rem', color: 'var(--text-muted)' }}>person</span>
                    My Profile
                  </button>
                  <button
                    className="d-flex align-items-center gap-3 w-100 px-3 py-2 border-0 bg-transparent text-start"
                    onClick={handleChangePassword}
                    type="button"
                    style={{ fontSize: '0.8125rem', color: 'var(--text-primary)', transition: 'background 0.1s ease' }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--surface-muted)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: '1.125rem', color: 'var(--text-muted)' }}>lock</span>
                    Change Password
                  </button>
                  <button
                    className="d-flex align-items-center gap-3 w-100 px-3 py-2 border-0 bg-transparent text-start"
                    onClick={() => { setShowProfileDropdown(false); setShowServices(true); }}
                    type="button"
                    style={{ fontSize: '0.8125rem', color: 'var(--text-primary)', transition: 'background 0.1s ease' }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--surface-muted)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: '1.125rem', color: 'var(--text-muted)' }}>tune</span>
                    Dịch vụ
                  </button>
                </div>

                {/* Wallet */}
                <div style={{ borderTop: '1px solid var(--border)' }}>
                  <button
                    className="d-flex align-items-center gap-3 w-100 px-3 py-2 border-0 bg-transparent text-start"
                    onClick={() => { setShowProfileDropdown(false); onNavigateToWallet(); }}
                    type="button"
                    style={{ fontSize: '0.8125rem', color: 'var(--text-primary)', transition: 'background 0.1s ease' }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--surface-muted)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: '1.125rem', color: 'var(--text-muted)' }}>account_balance_wallet</span>
                    Wallet
                  </button>
                </div>

                {/* Logout */}
                <div style={{ borderTop: '1px solid var(--border)' }}>
                  <button
                    className="d-flex align-items-center gap-3 w-100 px-3 py-2 border-0 bg-transparent text-start"
                    onClick={handleLogout}
                    type="button"
                    style={{ fontSize: '0.8125rem', color: 'var(--error)', transition: 'background 0.1s ease' }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--surface-muted)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: '1.125rem' }}>logout</span>
                    Logout
                  </button>
                </div>
              </>
              )}
              </div>
            )}
          </div>
        </div>
        <div className="border-end me-3" style={{ height: '1.5rem', borderColor: 'var(--border-light)', borderWidth: '1px' }} />
      </div>
    </header>
  );
});

DoctorHeader.displayName = 'DoctorHeader';

export default DoctorHeader;
