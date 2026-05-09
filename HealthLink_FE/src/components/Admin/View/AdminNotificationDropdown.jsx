import React, { useState, useEffect, useRef } from 'react';
import '../Css/AdminNotificationDropdown.css';

const AdminNotificationDropdown = () => {
    const [notifications] = useState([]);
    const [unreadCount] = useState(0);
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef(null);

    // Toggle dropdown without network calls
    const toggleDropdown = () => {
        setIsOpen(!isOpen);
    };

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    return (
        <div className="admin-notification-dropdown" ref={dropdownRef}>
            <button
                className="admin-icon-btn position-relative"
                onClick={toggleDropdown}
                aria-label="Notifications"
            >
                <i className="bi bi-bell"></i>
                {unreadCount > 0 && (
                    <span className="admin-notification-badge">{unreadCount}</span>
                )}
            </button>

            {isOpen && (
                <div className="admin-notification-dropdown-menu">
                    <div className="admin-notification-header">
                        <h6 className="mb-0">Notifications</h6>
                    </div>

                    <div className="admin-notification-list">
                        <div className="admin-notification-empty">
                            <i className="bi bi-bell-slash"></i>
                            <p>Notifications unavailable</p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminNotificationDropdown;
