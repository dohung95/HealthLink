import React, { memo, useEffect } from 'react';
import { NAV_ITEMS, APPOINTMENT_DETAIL_VIEW, PATIENT_DETAIL_VIEW, formatNotificationTime, getNotificationTone } from './navigationConfig';
import DoctorHeader from '@components/doctor/DoctorHeader';

const DoctorLayout = memo(({
  children,
  doctorData,
  currentNavItem,
  isDetailView,
  isMobileMenuOpen,
  showAllNotifications,
  notifications,
  unreadCount,
  chatUnreadCount = 0,
  showNotificationDropdown,
  notificationRef,
  onNavigate,
  onLogout,
  onToggleMobileMenu,
  onToggleNotificationDropdown,
  onNotificationClick,
  onMarkAllRead,
  onCloseAllNotifications,
  onChangePassword,
  onNavigateToProfile,
  onNavigateToWallet,
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
            {item.key === 'chat' && chatUnreadCount > 0 && (
                <span className="badge bg-danger rounded-pill ms-auto" style={{ fontSize: '0.75rem' }}>
                    {chatUnreadCount > 99 ? '99+' : chatUnreadCount}
                </span>
            )}
          </button>
        );
      })}
    </div>
  );

  const renderNotificationList = (expanded = false) => (
    <div className={`doctor-scroll-container notification-list ${expanded ? '' : ''}`} style={{ maxHeight: expanded ? '70dvh' : '400px' }}>
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

  return (
    <div className="doctor-viewport bg-background text-text-main">
      {/* Desktop Sidebar */}
      <aside className="doctor-sidebar position-fixed top-0 start-0 z-40 d-none d-lg-flex flex-column border-end border-surface-border bg-surface-container-lowest py-4 doctor-viewport" style={{ width: '240px' }}>
        <div className="doctor-sidebar-header text-center px-4">
          <div className="d-flex flex-column align-items-center">
            <span className="material-symbols-outlined" style={{ fontSize: '3rem', color: 'var(--doctor-primary,#0052cc)' }}>medical_services</span>
            <span className="fs-5 fw-bold" style={{ color: 'var(--doctor-primary,#0052cc)' }}>HealthLink</span>
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
                <span className="material-symbols-outlined" style={{ fontSize: '2rem', color: 'var(--doctor-primary,#0052cc)' }}>medical_services</span>
                <span className="fs-5 fw-bold" style={{ color: 'var(--doctor-primary,#0052cc)' }}>HealthLink</span>
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
      <div className="doctor-main-area" style={{ paddingLeft: '240px' }}>
        <DoctorHeader
          doctorData={doctorData}
          isMobileMenuOpen={isMobileMenuOpen}
          showAllNotifications={showAllNotifications}
          notifications={notifications}
          unreadCount={unreadCount}
          showNotificationDropdown={showNotificationDropdown}
          notificationRef={notificationRef}
          onToggleMobileMenu={onToggleMobileMenu}
          onToggleNotificationDropdown={onToggleNotificationDropdown}
          onNotificationClick={onNotificationClick}
          onMarkAllRead={onMarkAllRead}
          onCloseAllNotifications={onCloseAllNotifications}
          onLogout={onLogout}
          onChangePassword={onChangePassword}
          onNavigateToProfile={onNavigateToProfile}
          onNavigateToWallet={onNavigateToWallet}
        />
        <main className="doctor-main-content p-3 pb-5 p-md-4">
          <div className={`w-100 ${isDetailView ? 'doctor-detail-wrapper' : ''}`}>
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
          <section className="d-flex flex-column doctor-scroll-container overflow-hidden rounded-4 bg-white shadow-lg" style={{ maxHeight: '88dvh', maxWidth: '42rem', width: '100%' }}>
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