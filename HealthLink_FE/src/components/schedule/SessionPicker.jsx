import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { homeVisitApi } from '../../api/homeVisitApi';

const SessionPicker = ({
  doctorId,
  homeVisitInfo,
  setHomeVisitInfo,
  onBack,
  onNext,
  setSessionDraftId,
}) => {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selecting, setSelecting] = useState(false);
  const [selectedSession, setSelectedSession] = useState(null);
  const [selectedDate, setSelectedDate] = useState(null);

  useEffect(() => {
    let mounted = true;

    async function fetchSessions() {
      try {
        const data = await homeVisitApi.getSessions(doctorId);
        if (mounted) setSessions(data || []);
      } catch (error) {
        console.error('Failed to load home visit sessions', error);
        toast.error('Cannot load available sessions.');
      } finally {
        if (mounted) setLoading(false);
      }
    }

    fetchSessions();
    return () => { mounted = false; };
  }, [doctorId]);

  const handleSelectSession = async (session, date) => {
    setSelectedSession(session);
    setSelectedDate(date);
  };

  const handleNext = async () => {
    if (!selectedSession || !selectedDate) {
      toast.warning('Please select a session and date.');
      return;
    }

    setSelecting(true);

    try {
      const result = await homeVisitApi.selectSession({
        doctorId,
        scheduleId: selectedSession.scheduleId,
        bookingDate: selectedDate,
        visitAddress: homeVisitInfo.visitAddress,
        visitLatitude: homeVisitInfo.visitLatitude,
        visitLongitude: homeVisitInfo.visitLongitude,
        contactPhone: homeVisitInfo.contactPhone,
        reasonForHomeVisit: homeVisitInfo.reasonForHomeVisit,
        specialNotes: homeVisitInfo.specialNotes,
      });

      setSessionDraftId(result.draftId);

      setHomeVisitInfo((prev) => ({
        ...prev,
        selectedSession: {
          scheduleId: selectedSession.scheduleId,
          sessionType: selectedSession.sessionType,
          startTime: selectedSession.startTime,
          endTime: selectedSession.endTime,
          bookingDate: selectedDate,
        },
      }));

      onNext();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to select session.');
    } finally {
      setSelecting(false);
    }
  };

  if (loading) {
    return (
      <div className="schedule-card">
        <p>Loading available sessions...</p>
      </div>
    );
  }

  if (sessions.length === 0) {
    return (
      <div className="schedule-card">
        <h2>Select a session</h2>
        <p>No home visit sessions available for this doctor.</p>
        <div className="schedule-actions">
          <button type="button" className="btn-outline-soft" onClick={onBack}>Back</button>
        </div>
      </div>
    );
  }

  return (
    <div className="schedule-card session-picker-card">
      <h2>Select a home visit session</h2>
      <p className="schedule-card-subtitle">Choose morning or afternoon.</p>

      {sessions.map((session) => {
        const isMorning = session.sessionType === 'MORNING';

        return (
          <div key={session.scheduleId} className="session-group">
            <h3>
              <i className={`bi ${isMorning ? 'bi-sun' : 'bi-moon'}`}></i>
              {' '}{session.sessionType} ({session.startTime} - {session.endTime})
            </h3>

            {session.availableDates?.length > 0 && (
              <div className="session-dates">
                {session.availableDates.map((dateStr) => {
                  const date = new Date(dateStr + 'T00:00:00');
                  const isDateSelected = selectedSession?.scheduleId === session.scheduleId && selectedDate === dateStr;
                  const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });
                  const dayNum = date.getDate();
                  const month = date.toLocaleDateString('en-US', { month: 'short' });

                  return (
                    <button
                      key={dateStr}
                      type="button"
                      className={`session-date-btn ${isDateSelected ? 'selected' : ''}`}
                      onClick={() => handleSelectSession(session, dateStr)}
                    >
                      <span className="session-date-day">{dayName}</span>
                      <span className="session-date-num">{dayNum}</span>
                      <span className="session-date-month">{month}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}

      <div className="schedule-actions">
        <button type="button" className="btn-outline-soft" onClick={onBack}>Back</button>
        <button
          type="button"
          className="btn-primary-soft"
          onClick={handleNext}
          disabled={!selectedSession || !selectedDate || selecting}
        >
          {selecting ? 'Confirming...' : 'Next'}
        </button>
      </div>
    </div>
  );
};

export default SessionPicker;
