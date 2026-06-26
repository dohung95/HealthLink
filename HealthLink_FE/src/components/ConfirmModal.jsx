import React from 'react';
const ConfirmModal = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = "Confirm",      // Text nút xác nhận, mặc định "Confirm"
  cancelText = "Cancel",         // Text nút hủy, mặc định "Cancel"
  iconClass = "bi-shield-lock-fill",  // Icon, mặc định là khóa
  variant = "primary"
}) => {
  if (!isOpen) return null;

   // Hàm lấy màu nút Confirm theo variant
  const getConfirmButtonStyle = () => {
    switch (variant) {
      case 'danger':
        return {
          background: 'linear-gradient(135deg, #dc3545 0%, #c82333 100%)',
          color: 'white',
          hoverShadow: 'rgba(220, 53, 69, 0.4)'
        };
      case 'warning':
        return {
          background: 'linear-gradient(135deg, #ffc107 0%, #e0a800 100%)',
          color: '#212529',
          hoverShadow: 'rgba(255, 193, 7, 0.4)'
        };
      case 'success':
        return {
          background: 'linear-gradient(135deg, #00b09a 0%, #218838 100%)',
          color: 'white',
          hoverShadow: 'rgba(40, 167, 69, 0.4)'
        };
      case 'primary':
      default:
        return {
          background: 'linear-gradient(135deg, #00b09a 0%, #009a86 100%)',
          color: 'white',
          hoverShadow: 'rgba(0, 176, 154, 0.4)'
        };
    }
  };

  const confirmButtonColors = getConfirmButtonStyle();

  // Inline Styles
  const styles = {
    overlay: {
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.6)',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 9999,
      backdropFilter: 'blur(4px)',
      animation: 'fadeIn 0.3s ease-out'
    },
    container: {
      background: 'linear-gradient(135deg, #008f7d 0%, #00b09a 100%)',
      borderRadius: '20px',
      boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
      maxWidth: '550px',
      width: '92%',
      overflow: 'hidden',
      animation: 'slideUp 0.4s ease-out',
      position: 'relative'
    },
    header: {
      padding: '35px 40px 30px',
      textAlign: 'center',
      color: 'white'
    },
    iconContainer: {
      width: '70px',
      height: '70px',
      background: 'rgba(255, 255, 255, 0.2)',
      borderRadius: '50%',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      margin: '0 auto 20px',
      animation: 'scaleIn 0.5s ease-out',
      backdropFilter: 'blur(10px)',
      border: '3px solid rgba(255, 255, 255, 0.3)'
    },
    icon: {
      fontSize: '35px',
      color: 'white'
    },
    title: {
      margin: 0,
      fontSize: '24px',
      fontWeight: 600
    },
    body: {
      background: 'white',
      padding: '35px 45px',
      textAlign: 'center'
    },
    message: {
      color: '#444',
      fontSize: '17px',
      lineHeight: 1.6,
      margin: 0
    },
    footer: {
      background: 'white',
      padding: '20px 30px 30px',
      display: 'flex',
      gap: '20px',
      justifyContent: 'center'
    },
    buttonBase: {
      flex: 1,
      padding: '16px 28px',
      border: 'none',
      borderRadius: '12px',
      fontSize: '15px',
      fontWeight: 600,
      cursor: 'pointer',
      transition: 'all 0.3s ease',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '8px'
    },
    cancelButton: {
      background: '#e0e0e0',
      color: '#666'
    },
    confirmButton: {
      background: confirmButtonColors.background,
      color: confirmButtonColors.color
    }
  };
  return (
    <>
      {/* CSS Animations trong <style> tag */}
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        
        @keyframes slideUp {
          from {
            transform: translateY(50px);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }
        
        @keyframes scaleIn {
          0% {
            transform: scale(0);
            opacity: 0;
          }
          50% {
            transform: scale(1.1);
          }
          100% {
            transform: scale(1);
            opacity: 1;
          }
        }
      `}</style>
      <div style={styles.overlay} onClick={onClose}>
        <div style={styles.container} onClick={(e) => e.stopPropagation()}>
          <div style={styles.header}>
            <div style={styles.iconContainer}>
              <i className={`bi ${iconClass}`} style={styles.icon}></i>
            </div>
            <h3 style={styles.title}>{title}</h3>
          </div>

          <div style={styles.body}>
            <p style={styles.message}>{message}</p>
          </div>

          <div style={styles.footer}>
            <button
              style={{ ...styles.buttonBase, ...styles.cancelButton }}
              onClick={onClose}
              onMouseEnter={(e) => {
                e.target.style.background = '#d0d0d0';
                e.target.style.transform = 'translateY(-2px)';
                e.target.style.boxShadow = '0 5px 15px rgba(0, 0, 0, 0.1)';
              }}
              onMouseLeave={(e) => {
                e.target.style.background = '#e0e0e0';
                e.target.style.transform = 'translateY(0)';
                e.target.style.boxShadow = 'none';
              }}
            >
              <i className="bi bi-x-circle"></i> {cancelText}
            </button>
            <button
              style={{ ...styles.buttonBase, ...styles.confirmButton }}
              onClick={onConfirm}
              onMouseEnter={(e) => {
                e.target.style.transform = 'translateY(-2px)';
                e.target.style.boxShadow = `0 8px 20px ${confirmButtonColors.hoverShadow}`;
              }}
              onMouseLeave={(e) => {
                e.target.style.transform = 'translateY(0)';
                e.target.style.boxShadow = 'none';
              }}  
            >
              <i className="bi bi-check-circle"></i> {confirmText}
            </button>
          </div>
        </div>
      </div>
    </>
  );
};
export default ConfirmModal;