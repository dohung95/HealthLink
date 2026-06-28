import React from 'react';

const TodayCockpitSection = ({ title, icon, appointments, onView, emptyMessage, renderItem }) => {
  return (
    <div className="cockpit-section">
      <div className="cockpit-section__header">
        <span className="material-symbols-outlined" style={{ fontSize: '1rem', color: 'var(--primary)' }}>{icon}</span>
        <h3 className="cockpit-section__title">{title}</h3>
        <span className="cockpit-section__count">{appointments.length}</span>
      </div>
      {appointments.length === 0 ? (
        <div className="cockpit-section__empty">{emptyMessage}</div>
      ) : (
        <div className="cockpit-section__list">
          {appointments.map((appt, i) => (
            <div key={appt.appointmentID || appt.appointmentId} style={{ '--stagger-index': i }}>
              {renderItem(appt, i)}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default TodayCockpitSection;
