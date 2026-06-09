import React from 'react';

/**
 * AI Screening Status Badge Component
 * Displays the AI screening status with appropriate styling
 */
const ScreeningBadge = ({ status, reason, showTooltip = true, isUnsafe = false }) => {
    const configs = {
        PASSED: {
            color: 'success',
            bgColor: '#dcfce7',
            textColor: '#166534',
            borderColor: '#86efac',
            icon: 'bi-check-circle-fill',
            text: 'AI Verified'
        },
        FLAGGED: {
            color: 'warning',
            bgColor: '#fef3c7',
            textColor: '#92400e',
            borderColor: '#fcd34d',
            icon: 'bi-exclamation-triangle-fill',
            text: 'Needs Review'
        },
        REJECTED: {
            color: 'danger',
            bgColor: '#fee2e2',
            textColor: '#991b1b',
            borderColor: '#fca5a5',
            icon: 'bi-x-circle-fill',
            text: 'AI Rejected'
        },
        AI_Rejected: {
            color: 'danger',
            bgColor: '#fee2e2',
            textColor: '#991b1b',
            borderColor: '#fca5a5',
            icon: 'bi-robot',
            text: 'Auto-Rejected'
        },
        REJECTED_UNSAFE: {
            color: 'danger',
            bgColor: '#7f1d1d',
            textColor: '#ffffff',
            borderColor: '#dc2626',
            icon: 'bi-shield-exclamation',
            text: '⚠️ Unsafe Content'
        },
        UNSAFE_CONTENT: {
            color: 'danger',
            bgColor: '#7f1d1d',
            textColor: '#ffffff',
            borderColor: '#dc2626',
            icon: 'bi-exclamation-octagon-fill',
            text: '⚠️ Inappropriate'
        },
        PENDING: {
            color: 'secondary',
            bgColor: '#f3f4f6',
            textColor: '#4b5563',
            borderColor: '#d1d5db',
            icon: 'bi-hourglass-split',
            text: 'Pending'
        },
        PROCESSING: {
            color: 'info',
            bgColor: '#e0f2fe',
            textColor: '#0369a1',
            borderColor: '#7dd3fc',
            icon: 'bi-arrow-repeat',
            text: 'Processing'
        },
        OVERRIDDEN: {
            color: 'primary',
            bgColor: '#e0e7ff',
            textColor: '#3730a3',
            borderColor: '#a5b4fc',
            icon: 'bi-shield-check',
            text: 'Overridden'
        },
        VERIFIED: {
            color: 'success',
            bgColor: '#dcfce7',
            textColor: '#166534',
            borderColor: '#86efac',
            icon: 'bi-patch-check-fill',
            text: 'Verified'
        }
    };

    // Override status if unsafe content detected
    const effectiveStatus = isUnsafe ? 'UNSAFE_CONTENT' : status;

    const config = configs[effectiveStatus] || configs[status] || configs.PENDING;

    const badgeStyle = {
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        padding: '4px 10px',
        fontSize: '12px',
        fontWeight: '600',
        borderRadius: '20px',
        backgroundColor: config.bgColor,
        color: config.textColor,
        border: `1px solid ${config.borderColor}`,
        cursor: reason && showTooltip ? 'help' : 'default'
    };

    const iconStyle = {
        fontSize: '14px'
    };

    return (
        <span
            style={badgeStyle}
            title={showTooltip && reason ? reason : config.text}
        >
            <i className={`bi ${config.icon}`} style={iconStyle}></i>
            <span>{config.text}</span>
        </span>
    );
};

export default ScreeningBadge;
