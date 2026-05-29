import React, { memo, useEffect } from 'react';
import { NAV_ITEMS, APPOINTMENT_DETAIL_VIEW, PATIENT_DETAIL_VIEW, formatNotificationTime, getNotificationTone } from './navigationConfig';

const DoctorLayout = memo(({
  children,
  doctorData,
  currentNavItem,
  isDetailView,
  isMobileMenuOpen,
  showAllNotifications,
  notifications,
  unreadCount,
  showNotificationDropdown,
  notificationRef,
  onNavigate,
  onLogout,
  onToggleMobileMenu,
  onToggleNotificationDropdown,
  onNotificationClick,
  onMarkAllRead,
  onCloseAllNotifications,
}) => {
  useEffect(() => {
    document.body.style.overflow = isMobileMenuOpen || showAllNotifications ? 'hidden' : 'unset';
    return () => { document.body.style.overflow = 'unset'; };
  }, [isMobileMenuOpen, showAllNotifications]);

  const renderNavLinks = (mobile = false) => (
    <div className={mobile ? 'd-flex gap-1 justify-content-around' : 'd-flex flex-column gap-1'}>
      {NAV_ITEMS.map((item) => {
        const isActive =
          currentNavItem?.key === item.key ||
          (item.key === 'appointments' && currentNavItem?.key === APPOINTMENT_DETAIL_VIEW) ||
          (item.key === 'patients' && currentNavItem?.key === PATIENT_DETAIL_VIEW);
        return (
          <button
            className={
              mobile
                ? `nav-item-mobile ${isActive ? 'nav-item-mobile--active' : ''}`
                : `nav-item-custom ${isActive ? 'nav-item-custom--active' : ''}`
            }
            key={item.key}
            onClick={() => onNavigate(item.key)}
            type="button"
          >
            <span className="material-symbols-outlined">{item.icon}</span>
            <span>{item.label}</span>
          </button>
        );
      })}
    </div>
  );

  const renderNotificationList = (expanded = false) => (
    <div className={`overflow-y-auto divide-y-surface-border ${expanded ? '' : ''}`} style={{ maxHeight: expanded ? '70vh' : '400px' }}>
      {notifications.length === 0 ? (
        <div className="d-flex flex-column align-items-center justify-content-center px-3 py-5 text-center text-text-muted">
          <span className="material-symbols-outlined mb-2 fs-1">notifications_off</span>
          <p className="mb-0 small fw-semibold">No notifications</p>
          <p className="mb-0 text-xs">Updates about appointments and wallet activity will appear here.</p>
        </div>
      ) : (
        notifications.map((notification) => {
          const tone = getNotificationTone(notification);
          return (
            <article
              className={`d-flex gap-3 p-3 transition-base hover:bg-surface-container-low ${!notification.isRead ? 'bg-primary-fixed' : 'bg-white'}`}
              key={notification.notificationId}
            >
              <div className={`d-flex align-items-center justify-content-center rounded-circle shrink-0 ${tone.bg}`} style={{ width: '2.5rem', height: '2.5rem' }}>
                <span className={`material-symbols-outlined ${tone.accent}`}>{tone.icon}</span>
              </div>
              <div className="min-w-0 flex-1 space-y-1">
                <div className="d-flex align-items-start justify-content-between gap-3">
                  <p className={`mb-0 small fw-semibold ${tone.accent === 'text-critical' ? 'text-critical' : 'text-on-surface'}`}>
                    {notification.title || tone.title}
                  </p>
                  {!notification.isRead ? <span className="d-inline-block bg-primary-container rounded-circle" style={{ width: '0.5rem', height: '0.5rem', marginTop: '0.375rem' }} /> : null}
                </div>
                <p className="mb-0 whitespace-pre-line text-xs leading-5 text-text-muted">{notification.message}</p>
                <div className="d-flex align-items-center justify-content-between gap-3 pt-1">
                  <span className="text-[11px] text-text-muted">{formatNotificationTime(notification.createdAt)}</span>
                  <button
                    className="text-xs fw-semibold text-primary-container hover:underline border-0 bg-transparent p-0"
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
    <div className="min-vh-100 bg-background text-text-main">
      {/* Desktop Sidebar */}
      <aside className="doctor-sidebar position-fixed top-0 start-0 z-40 d-none d-lg-flex flex-column border-end border-surface-border bg-surface-container-lowest py-4 min-vh-100" style={{ width: '240px' }}>
        <div className="doctor-sidebar-header text-center px-4">
          <div className="d-flex flex-column align-items-center">
            <span className="material-symbols-outlined" style={{ fontSize: '3rem', color: 'var(--color-primary,#0052cc)' }}>medical_services</span>
            <span className="fs-5 fw-bold" style={{ color: 'var(--color-primary,#0052cc)' }}>HealthLink</span>
          </div>
        </div>
        <nav className="flex-1 overflow-y-auto px-3 mt-4">{renderNavLinks()}</nav>
      </aside>

      {/* Mobile Sidebar */}
      {isMobileMenuOpen ? (
        <div className="position-fixed inset-0 z-50 bg-black/40 d-lg-none" onClick={() => onToggleMobileMenu()}>
          <aside className="doctor-mobile-sidebar ms-auto h-100 shadow-lg bg-white p-4" style={{ width: '300px', maxWidth: '86vw' }} onClick={(e) => e.stopPropagation()}>
            <div className="mb-4 d-flex align-items-center justify-content-between">
              <div className="d-flex align-items-center gap-3">
                <span className="material-symbols-outlined" style={{ fontSize: '2rem', color: 'var(--color-primary,#0052cc)' }}>medical_services</span>
                <span className="fs-5 fw-bold" style={{ color: 'var(--color-primary,#0052cc)' }}>HealthLink</span>
              </div>
              <button className="doctor-mobile-close rounded-3 p-2 text-on-surface-variant hover:bg-surface-container border-0 bg-transparent" onClick={() => onToggleMobileMenu()} type="button">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            {renderNavLinks()}
          </aside>
        </div>
      ) : null}

      {/* Main Area */}
      <div className="doctor-main-area min-vh-100" style={{ paddingLeft: '240px' }}>
        <header className="doctor-header sticky-top z-30 d-flex align-items-center justify-content-between px-5" style={{ paddingRight: '3rem' }}>
          <div className="d-flex align-items-center gap-3">
            <button className="rounded-3 p-2 text-on-surface-variant hover:bg-surface-container d-lg-none border-0 bg-transparent" onClick={() => onToggleMobileMenu()} type="button">
              <span className="material-symbols-outlined">menu</span>
            </button>
          </div>
          <div className="d-flex align-items-center gap-0 ms-auto">
            <div className="d-flex align-items-center gap-3 pe-3">
              {renderNotificationBell()}
              <div className="shrink-0 overflow-hidden rounded-circle border border-surface-border bg-primary-fixed text-primary d-flex align-items-center justify-content-center fw-bold" style={{ width: '2.75rem', height: '2.75rem', fontSize: '1rem' }}>
                {doctorData?.avatarUrl || doctorData?.profileImage || doctorData?.imageUrl ? (
                  <img alt="Doctor" className="object-fit-cover w-100 h-100" src={doctorData?.avatarUrl || doctorData?.profileImage || doctorData?.imageUrl} />
                ) : (
                  <span>{(doctorData?.fullName || 'DR').split(' ').filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase()).join('')}</span>
                )}
              </div>
            </div>
            <div className="border-end me-3" style={{ height: '1.5rem', borderColor: 'var(--border-light)', borderWidth: '1px' }} />
            <button className="doctor-header-logout d-none d-md-flex align-items-center justify-content-center rounded-3 text-on-surface-variant border-0 bg-transparent" onClick={onLogout} type="button" title="Logout">
              <span className="material-symbols-outlined">logout</span>
            </button>
          </div>
        </header>
        <main className="doctor-main-content p-3 pb-5 p-md-4">
          <div className={`mx-auto ${currentNavItem?.wide || isDetailView ? '' : ''}`} style={{ maxWidth: currentNavItem?.wide || isDetailView ? '1400px' : '1120px' }}>
            {children}
          </div>
        </main>
      </div>

      {/* Bottom Nav */}
      <nav className="doctor-bottom-nav position-fixed bottom-0 start-0 end-0 z-40 d-lg-none">
        {renderNavLinks(true)}
      </nav>

      {/* Mobile Notification Sheet */}
      {showNotificationDropdown ? (
        <div className="position-fixed inset-0 z-50 d-flex align-items-end bg-black/40 d-md-none" onClick={() => onToggleNotificationDropdown()}>
          <div className="w-100 overflow-hidden bg-white shadow-lg" style={{ borderRadius: '1rem 1rem 0 0', animation: 'slideUp 0.25s ease' }} onClick={(e) => e.stopPropagation()}>
            <div className="d-flex align-items-center justify-content-between px-3 py-3 border-bottom">
              <h3 className="mb-0 small fw-semibold">Notifications</h3>
              <div className="d-flex align-items-center gap-3">
                {unreadCount > 0 ? (
                  <button className="text-xs fw-semibold border-0 bg-transparent" style={{ color: 'var(--primary)' }} onClick={onMarkAllRead} type="button">Mark all read</button>
                ) : null}
                <button className="rounded-3 p-1 border-0 bg-transparent" style={{ color: 'var(--text-muted)' }} onClick={() => onToggleNotificationDropdown()} type="button">
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>
            </div>
            {renderNotificationList()}
          </div>
        </div>
      ) : null}

      {/* All Notifications Modal */}
      {showAllNotifications ? (
        <div className="position-fixed inset-0 z-[60] d-flex align-items-center justify-content-center bg-black/40 p-3">
          <section className="d-flex flex-column overflow-hidden rounded-4 bg-white shadow-lg" style={{ maxHeight: '88vh', maxWidth: '42rem', width: '100%' }}>
            <div className="d-flex align-items-center justify-content-between border-bottom border-surface-border px-4 py-3">
              <div>
                <h2 className="mb-0 fs-5 fw-bold text-text-main">Notifications</h2>
                <p className="mb-0 text-xs text-text-muted">{unreadCount} unread update{unreadCount === 1 ? '' : 's'}</p>
              </div>
              <button className="rounded-3 p-2 text-on-surface-variant hover:bg-surface-container border-0 bg-transparent" onClick={onCloseAllNotifications} type="button">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            {renderNotificationList(true)}
          </section>
        </div>
      ) : null}
    </div>
  );
});

DoctorLayout.displayName = 'DoctorLayout';

export default DoctorLayout;