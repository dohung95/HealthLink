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
  selectedHomeVisitServices = [],
}) => {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selecting, setSelecting] = useState(false);
  const [selectedSession, setSelectedSession] = useState(null);
  const selectedServiceIds = selectedHomeVisitServices
    .map((item) => item.serviceId)
    .filter(Boolean);

  const [selectedDate, setSelectedDate] = useState(null);

  const groupedSessions = sessions.reduce((groups, slot) => {
    const date = slot.bookingDate;
    if (!groups[date]) groups[date] = [];
    groups[date].push(slot);
    return groups;
  }, {});

  const sessionDates = Object.keys(groupedSessions);

  const visibleSlots = selectedDate
    ? groupedSessions[selectedDate] || []
    : [];

  useEffect(() => {
    let mounted = true;

    async function fetchSlots() {
      if (!doctorId || !homeVisitInfo.visitLatitude || !homeVisitInfo.visitLongitude) {
        if (mounted) {
          setSessions([]);
          setLoading(false);
        }
        return;
      }

      try {
        setLoading(true);

        const data = await homeVisitApi.getSlots({
          doctorId,
          visitLatitude: homeVisitInfo.visitLatitude,
          visitLongitude: homeVisitInfo.visitLongitude,
          homeVisitServiceIds: selectedServiceIds,
        });

        if (mounted) {
          const nextSessions = data || [];
          setSessions(nextSessions);
          setSelectedSession(null);
          setSelectedDate(nextSessions[0]?.bookingDate || null);
        }
      } catch (error) {
        console.error('Failed to load home visit slots', error);
        toast.error('Cannot load available home visit slots.');
      } finally {
        if (mounted) setLoading(false);
      }
    }

    fetchSlots();

    return () => {
      mounted = false;
    };
  }, [
    doctorId,
    homeVisitInfo.visitLatitude,
    homeVisitInfo.visitLongitude,
    selectedServiceIds.join(','),
  ]);

  const handleSelectSession = (slot) => {
    setSelectedSession(slot);
  };

  const handleNext = async () => {
    if (!selectedSession) {
      toast.warning('Please select a home visit slot.');
      return;
    }

    setSelecting(true);

    try {
      const result = await homeVisitApi.selectSession({
        doctorId,
        scheduleId: selectedSession.scheduleId,
        bookingDate: selectedSession.bookingDate,
        startTime: selectedSession.startTime,
        endTime: selectedSession.endTime,
        homeVisitServiceIds: selectedServiceIds,

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
          bookingDate: selectedSession.bookingDate,
          estimatedTravelMinutes: selectedSession.estimatedTravelMinutes,
          visitDurationMinutes: selectedSession.visitDurationMinutes,
          servicesDurationMinutes: selectedSession.servicesDurationMinutes,
          bufferMinutes: selectedSession.bufferMinutes,
          totalBlockMinutes: selectedSession.totalBlockMinutes,
        },
      }));

      onNext();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to select slot.');
    } finally {
      setSelecting(false);
    }
  };

  if (loading) {
    return (
      <div className="schedule-card">
        <p>Loading available home visit slots...</p>
      </div>
    );
  }

  if (sessions.length === 0) {
    return (
      <div className="schedule-card">
        <h2>Select a session</h2>
        <p>No home visit slots are available for this doctor and selected services.</p>
        <div className="schedule-actions">
          <button type="button" className="btn-outline-soft" onClick={onBack}>Back</button>
        </div>
      </div>
    );
  }

  return (
    <div className="schedule-card home-visit-session-card">
      <h2>Select a home visit slot</h2>
      <p className="schedule-card-subtitle">
        Choose a time that includes travel, visit duration, selected services, and buffer.
      </p>

      <div className="home-visit-session-layout">
        <div className="home-visit-date-strip">
          {sessionDates.map((date) => (
            <button
              key={date}
              type="button"
              className={`home-visit-date-option ${selectedDate === date ? 'selected' : ''}`}
              onClick={() => {
                setSelectedDate(date);
                setSelectedSession(null);
              }}
            >
              <strong>
                {new Date(date).toLocaleDateString('en-US', { weekday: 'short' })}
              </strong>
              <span>
                {new Date(date).toLocaleDateString('en-US', {
                  day: '2-digit',
                  month: 'short',
                })}
              </span>
              <small>{groupedSessions[date].length} slots</small>
            </button>
          ))}
        </div>

        <div className="home-visit-slot-list compact">
          {visibleSlots.map((slot) => {
            const isSelected =
              selectedSession?.scheduleId === slot.scheduleId &&
              selectedSession?.bookingDate === slot.bookingDate &&
              selectedSession?.startTime === slot.startTime;

            return (
              <button
                key={`${slot.scheduleId}-${slot.bookingDate}-${slot.startTime}`}
                type="button"
                className={`home-visit-slot-option compact ${isSelected ? 'selected' : ''}`}
                onClick={() => handleSelectSession(slot)}
              >
                <div>
                  <strong>{slot.startTime} - {slot.endTime}</strong>
                  <span>{slot.totalBlockMinutes} min total</span>
                </div>

                <small>
                  Travel round trip {slot.estimatedTravelMinutes * 2}m · Visit {slot.visitDurationMinutes}m ·
                  Services {slot.servicesDurationMinutes}m · Total block {slot.totalBlockMinutes}m
                </small>
              </button>
            );
          })}
        </div>
      </div>

      <div className="schedule-actions">
        <button type="button" className="btn-outline-soft" onClick={onBack}>
          Back
        </button>

        <button
          type="button"
          className="btn-primary-soft"
          disabled={!selectedSession || selecting}
          onClick={handleNext}
        >
          {selecting ? 'Selecting...' : 'Next'}
        </button>
      </div>
    </div>
  );
};

export default SessionPicker;
