import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { shareApi } from '../../api/shareRecordApi';
import { appointmentService } from '../../api/appointmentApi';
import { doctorService } from '../../api/doctorApi';
import { useAuth } from '../../context/AuthContext';
import { getProfile } from '../../api/account';
import { healthRecordApi } from '../../api/healthRecordApi';
import ScheduleStepper from '../schedule/ScheduleStepper';
import SpecialtyStep from '../schedule/SpecialtyStep';
import DoctorStep from '../schedule/DoctorStep';
import DateTimeStep from '../schedule/DateTimeStep';
import DocumentsStep from '../schedule/DocumentsStep';
import ConfirmStep from '../schedule/ConfirmStep';
import PaymentStep from '../schedule/PaymentStep';
import DoctorSummaryCard from '../schedule/DoctorSummaryCard';
import ConsultationStep from '../schedule/ConsultationStep';
import HomeVisitStep from '../schedule/HomeVisitStep';
import SessionPicker from '../schedule/SessionPicker';

import '../Css/ScheduleWizard.css';

const buildAppointmentDateTime = (dateValue, timeValue) => {
  const [hour = '00', minute = '00', rawSecond = '00'] = String(timeValue || '')
    .trim()
    .split(':');
  const second = rawSecond.split('.')[0] || '00';

  return `${dateValue}T${hour.padStart(2, '0')}:${minute.padStart(2, '0')}:${second.padStart(2, '0')}`;
};

const Schedule = () => {
  const navigate = useNavigate();
  const { doctorId } = useParams();
  const [searchParams] = useSearchParams();
  const { isAuthenticated, token } = useAuth();

  const hasPreselectedDoctor = !!doctorId;
  const isFromProposal = searchParams.get('homeVisit') === 'true';
  const consultationIdParam = searchParams.get('consultationId');
  const sourceConsultationId = consultationIdParam
    ? Number.parseInt(consultationIdParam, 10)
    : null;

  const [loading, setLoading] = useState(true);
  const [loadingSlots, setLoadingSlots] = useState(false);

  const [step, setStep] = useState(isFromProposal ? 2 : 1);

  const [doctors, setDoctors] = useState([]);
  const [selectedSpecialty, setSelectedSpecialty] = useState('');
  const [selectedDoctorId, setSelectedDoctorId] = useState('');
  const [consultationType, setConsultationType] = useState(isFromProposal ? 'HomeVisit' : '');

  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [slots, setSlots] = useState([]);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [doctorSchedules, setDoctorSchedules] = useState([]);

  const [symptoms, setSymptoms] = useState('');
  const [files, setFiles] = useState([]);
  const [patientId, setPatientId] = useState('');
  const [patientProfile, setPatientProfile] = useState(null);
  const [bookingSubmitting, setBookingSubmitting] = useState(false);
  const [paymentDraft, setPaymentDraft] = useState(null);
  const [sessionDraftId, setSessionDraftId] = useState(null);
  const [homeVisitInfo, setHomeVisitInfo] = useState({
    visitAddress: '',
    visitCity: '',
    contactPhone: '',
    reasonForHomeVisit: '',
    specialNotes: '',
    isForSelf: true,
    receiverName: '',
    receiverAge: '',
    receiverGender: '',
    receiverRelationship: '',
    receiverPhone: '',
    visitLatitude: null,
    visitLongitude: null,
  });


  const [maxDate] = useState(() => {
    const max = new Date();
    max.setDate(max.getDate() + 30);
    return max.toISOString().split('T')[0];
  });

  const isHomeVisit = consultationType === 'HomeVisit';

  const stepConfig = useMemo(() => {
    const baseSteps = hasPreselectedDoctor
      ? [
        { key: 'consultation', label: 'Visit Type' },
      ]
      : [
        { key: 'specialty', label: 'Specialty' },
        { key: 'doctor', label: 'Doctor' },
        { key: 'consultation', label: 'Visit Type' },
      ];

    if (isHomeVisit) {
      baseSteps.push({ key: 'homevisit', label: 'Home Visit' });
      baseSteps.push({ key: 'session-picker', label: 'Choose Session' });
    } else {
      baseSteps.push({ key: 'datetime', label: 'Date & Time' });
      baseSteps.push({ key: 'documents', label: 'Medical information' });
    }

    baseSteps.push(
      { key: 'confirm', label: 'Confirm' },
      { key: 'payment', label: 'Payment' }
    );

    return baseSteps;
  }, [hasPreselectedDoctor, isHomeVisit]);

  const currentStepKey = stepConfig[step - 1]?.key;

  useEffect(() => {
    if (!isAuthenticated || !token) return;

    async function fetchPatientProfile() {
      try {
        const profile = await getProfile(token);
        setPatientId(profile.userId);
        setPatientProfile(profile);
      } catch (error) {
        console.error('Failed to load patient profile', error);
        toast.error('Can not load patient profile.');
      }
    }

    fetchPatientProfile();
  }, [isAuthenticated, token]);

  useEffect(() => {
    async function fetchDoctors() {
      try {
        const data = await doctorService.getAllDoctors();
        setDoctors(data);
      } catch (error) {
        console.error('Failed to load doctors', error);
        toast.error('Can not load doctors.');
      } finally {
        setTimeout(() => setLoading(false), 500);
      }
    }

    fetchDoctors();
  }, []);

  useEffect(() => {
    const specialtyParam = searchParams.get('specialty');
    if (!specialtyParam || doctorId) return;
    setSelectedSpecialty(decodeURIComponent(specialtyParam));
    setStep(2);
  }, [searchParams, doctorId]);

  useEffect(() => {
    if (!doctorId || doctors.length === 0) return;

    const preselectedDoctor = doctors.find((doctor) => {
      const currentDoctorId = doctor.doctorId;
      return String(currentDoctorId) === String(doctorId);
    });

    if (preselectedDoctor) {
      setSelectedSpecialty(preselectedDoctor.specialtyName || '');
      setSelectedDoctorId(preselectedDoctor.doctorId);

      // Nếu từ home visit proposal: pre-set consultationType, skip Visit Type step
      if (isFromProposal) {
        setConsultationType('HomeVisit');
        setStep(2);
      }
    }
  }, [doctorId, doctors, isFromProposal]);

  useEffect(() => {
    if (!selectedDoctorId) {
      setDoctorSchedules([]);
      return;
    }

    let mounted = true;

    async function fetchDoctorSchedules() {
      try {
        const data = await doctorService.getDoctorSchedules(selectedDoctorId);

        if (!mounted) return;

        setDoctorSchedules(Array.isArray(data) ? data : []);
      } catch (error) {
        console.error('Failed to load doctor schedules', error);

        if (!mounted) return;

        setDoctorSchedules([]);
        toast.error('Can not load doctor working schedule.');
      }
    }

    fetchDoctorSchedules();

    return () => {
      mounted = false;
    };
  }, [selectedDoctorId]);

  useEffect(() => {
    if (!selectedDoctorId || !date || !consultationType || isHomeVisit) {
      setSlots([]);
      setSelectedSlot(null);
      return;
    }

    async function fetchSlots() {
      setLoadingSlots(true);

      try {
        const data = await appointmentService.getAvailableSlots(
          selectedDoctorId,
          date,
          consultationType
        );

        setSlots(data.slots || []);
        setSelectedSlot(null);
      } catch (error) {
        console.error('Failed to load slots', error);
        toast.error(
          error.response?.data?.message || 'Can not load available slots'
        );
      } finally {
        setLoadingSlots(false);
      }
    }

    fetchSlots();
  }, [selectedDoctorId, date]);

  const specialties = useMemo(() => {
    return [...new Set(doctors.map((doctor) => doctor.specialtyName))]
      .filter(Boolean)
      .sort();
  }, [doctors]);

  const filteredDoctors = useMemo(() => {
    if (!selectedSpecialty) return [];
    return doctors.filter(
      (doctor) => doctor.specialtyName === selectedSpecialty
    );
  }, [doctors, selectedSpecialty]);

  const selectedDoctor = useMemo(() => {
    return doctors.find((doctor) => doctor.doctorId === selectedDoctorId);
  }, [doctors, selectedDoctorId]);

  const releaseHoldSilently = async (holdId) => {
    if (!holdId) return;

    try {
      await appointmentService.releaseHold(holdId);
    } catch (error) {
      const message = error.response?.data?.message || '';

      const holdAlreadyGone =
        error.response?.status === 404 ||
        message.toLowerCase().includes('hold not found');

      if (!holdAlreadyGone) {
        console.warn('Failed to release slot hold:', error);
      }
    }
  };

  const handleSelectSlot = async (slot) => {
    if (!slot.selectable) return;

    if (!patientId) {
      toast.error('Can not find patient information.');
      return;
    }

    const previousSelectedSlot = selectedSlot;
    const appointmentTime = buildAppointmentDateTime(date, slot.startTime);

    try {
      if (
        previousSelectedSlot?.holdId &&
        previousSelectedSlot.startTime !== slot.startTime
      ) {
        await releaseHoldSilently(previousSelectedSlot.holdId);
      }

      const hold = await appointmentService.holdSlot({
        doctorId: selectedDoctorId,
        patientId,
        appointmentTime,
        consultationType,
      });

      setSelectedSlot({
        ...slot,
        date,
        appointmentTime,
        holdId: hold.holdId,
      });

      setSlots((prev) =>
        prev.map((item) => {
          if (
            previousSelectedSlot &&
            item.startTime === previousSelectedSlot.startTime
          ) {
            return { ...item, status: 'AVAILABLE', selectable: true };
          }

          if (item.startTime === slot.startTime) {
            return { ...item, status: 'HELD', selectable: false };
          }

          return item;
        })
      );
    } catch (error) {
      toast.error(
        error.response?.data?.message || 'Can not hold this time slot.'
      );

      try {
        const data = await appointmentService.getAvailableSlots(
          selectedDoctorId,
          date
        );

        setSlots(data.slots || []);
        setSelectedSlot(null);
      } catch (reloadError) {
        console.error('Failed to reload slots', reloadError);
      }
    }
  };

  const handleClearSlot = async () => {
    if (!selectedSlot) return;

    const slotToClear = selectedSlot;

    await releaseHoldSilently(slotToClear.holdId);

    setSlots((prev) =>
      prev.map((item) =>
        item.startTime === slotToClear.startTime
          ? { ...item, status: 'AVAILABLE', selectable: true }
          : item
      )
    );

    setSelectedSlot(null);
  };

  const handleChangeDate = async (nextDate) => {
    if (nextDate === date) return;

    const slotToRelease = selectedSlot;

    setSelectedSlot(null);
    setSlots([]);
    setDate(nextDate);

    if (!slotToRelease?.holdId) return;

    try {
      await appointmentService.releaseHold(slotToRelease.holdId);
    } catch (error) {
      const message = error.response?.data?.message || '';

      const holdAlreadyGone =
        error.response?.status === 404 ||
        message.toLowerCase().includes('hold not found');

      if (!holdAlreadyGone) {
        console.warn('Failed to release previous slot hold:', error);
      }
    }
  };

  const handleNext = () => {
    if (currentStepKey === 'specialty' && !selectedSpecialty) {
      toast.warning('Please select a specialty');
      return;
    }

    if (currentStepKey === 'doctor' && !selectedDoctorId) {
      toast.warning('Please select a doctor');
      return;
    }

    if (currentStepKey === 'consultation' && !consultationType) {
      toast.warning('Please select a visit type');
      return;
    }

    if (currentStepKey === 'datetime') {
      if (!date) {
        toast.warning('Please select a date');
        return;
      }
      if (!selectedSlot) {
        toast.warning('Please select a time slot');
        return;
      }
    }

    setStep((prev) => Math.min(prev + 1, stepConfig.length));
  };

  const handleBack = () => {
    setStep((prev) => Math.max(prev - 1, 1));
  };

  const clearSelectedSlotLocally = (slotToClear) => {
    if (!slotToClear) return;

    setSlots((prev) =>
      prev.map((item) =>
        item.startTime === slotToClear.startTime
          ? { ...item, status: 'AVAILABLE', selectable: true }
          : item
      )
    );

    setSelectedSlot(null);
  };

  const handleBackFromDateTime = async () => {
    if (selectedSlot) {
      const slotToRelease = selectedSlot;

      await releaseHoldSilently(slotToRelease.holdId);
      clearSelectedSlotLocally(slotToRelease);
    }

    handleBack();
  };

  const handleBackFromDocuments = async () => {
    if (selectedSlot) {
      const slotToRelease = selectedSlot;

      await releaseHoldSilently(slotToRelease.holdId);
      clearSelectedSlotLocally(slotToRelease);
    }

    handleBack();
  };

  const handleBackFromPayment = () => {
    setPaymentDraft(null);
    handleBack();
  };

  const handleSchedule = async () => {
    if (!selectedDoctorId || (!selectedSlot && !isHomeVisit)) {
      toast.warning('Booking information is not complete');
      return;
    }

    if (!patientId) {
      toast.error('Can not find patient information in the current login session.');
      return;
    }


    setBookingSubmitting(true);

    try {
      const selectedSession = homeVisitInfo.selectedSession;
      const bookingDate = isHomeVisit && selectedSession ? selectedSession.bookingDate : null;
      const sessionTime = selectedSession?.startTime || '08:00';
      const appointmentDate = isHomeVisit && bookingDate
        ? `${bookingDate}T${sessionTime}:00`
        : selectedSlot?.appointmentTime;

      const bookingData = {
        patientId,
        doctorId: selectedDoctorId,
        appointmentTime: appointmentDate,
        consultationType,
        symptoms: isHomeVisit ? homeVisitInfo.reasonForHomeVisit : symptoms,
        notes: isHomeVisit ? homeVisitInfo.specialNotes : '',

        ...(consultationType === 'HomeVisit'
          ? {
            visitAddress: homeVisitInfo.visitAddress,
            visitCity: homeVisitInfo.visitCity,
            contactPhone: homeVisitInfo.contactPhone,
            reasonForHomeVisit: homeVisitInfo.reasonForHomeVisit,
            specialNotes: homeVisitInfo.specialNotes,
            isForSelf: homeVisitInfo.isForSelf,
            receiverName: homeVisitInfo.receiverName || null,
            receiverAge: homeVisitInfo.receiverAge ? Number(homeVisitInfo.receiverAge) : null,
            receiverGender: homeVisitInfo.receiverGender || null,
            receiverRelationship: homeVisitInfo.receiverRelationship || (homeVisitInfo.isForSelf ? 'Self' : null),
            receiverPhone: homeVisitInfo.receiverPhone || homeVisitInfo.contactPhone || null,
            visitLatitude: homeVisitInfo.visitLatitude,
            visitLongitude: homeVisitInfo.visitLongitude,
          }
          : {}),
      };

      const doctorFee = Number(selectedDoctor?.consultationFee ?? selectedDoctor?.fee ?? 0);

      const homeVisitBaseFee = Number(homeVisitInfo.homeVisitFee || 0);
      const extraTravelFee = Number(homeVisitInfo.travelFee || 0);
      const homeVisitTravelTotal = Number(
        homeVisitInfo.totalFee ?? (homeVisitBaseFee + extraTravelFee || 0)
      );

      setPaymentDraft({
        ...bookingData,
        currency: 'USD',
        amount: isHomeVisit
          ? doctorFee + homeVisitTravelTotal
          : doctorFee,
        doctorFee,
        homeVisitEstimate: isHomeVisit
          ? {
            distanceKm: homeVisitInfo.distanceKm,
            estimatedTravelMinutes: homeVisitInfo.estimatedTravelMinutes,
            homeVisitFee: homeVisitBaseFee,
            travelFee: extraTravelFee,
            totalFee: homeVisitTravelTotal,
            grandTotal: doctorFee + homeVisitTravelTotal,
          }
          : null,
      });
      setStep(stepConfig.length);
      toast.info('Review completed. Please finish payment to confirm your appointment.');
    } catch (error) {
      toast.error(
        error.response?.data?.message || 'Can not prepare payment.'
      );
    } finally {
      setBookingSubmitting(false);
    }
  };

  const finalizeBookingAfterPayment = async (paidInvoice) => {
    try {
      const uploadedDocumentsByRecord = new Map();

      if (files.length > 0) {
        for (const item of files) {
          if (!item.file) continue;

          if (!item.documentDate) {
            throw new Error('Please select Date Performed for all uploaded documents.');
          }

          const uploadedDocument = await healthRecordApi.uploadDocumentAutoRecord(
            patientId,
            item.file,
            'Consultation-Notes',
            symptoms || `Uploaded during appointment booking #${paidInvoice?.appointmentId || ''}`,
            item.documentDate
          );

          const recordId = uploadedDocument.healthRecordId;
          const documentId = uploadedDocument.documentId;

          if (!recordId || !documentId) {
            console.warn('Uploaded document missing recordId or documentId', uploadedDocument);
            continue;
          }

          if (!uploadedDocumentsByRecord.has(recordId)) {
            uploadedDocumentsByRecord.set(recordId, []);
          }

          uploadedDocumentsByRecord.get(recordId).push(documentId);
        }
      }

      for (const [recordId, documentIds] of uploadedDocumentsByRecord.entries()) {
        await shareApi.shareWithDoctor(recordId, patientId, {
          doctorId: selectedDoctorId,
          permissionLevel: 'View',
          expiryDate: null,
          sharedDocumentIds: documentIds,
          allowMerge: true,
        });
      }

      toast.success(
        files.length > 0
          ? 'Booking successful! Documents were shared with your doctor.'
          : 'Booking successful!'
      );

      navigate('/patient-dashboard/appointments');
    } catch (error) {
      console.error('Failed to upload/share booking documents after payment', error);

      toast.error(
        error.response?.data?.message ||
        'Payment completed, but documents could not be uploaded or shared.'
      );

      navigate('/patient-dashboard/appointments');
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="schedule-auth-wall">
        <div className="schedule-auth-card">
          <i className="bi bi-shield-lock"></i>
          <h2>You need to login</h2>
          <p>Please login before booking an appointment.</p>
          <button onClick={() => navigate('/login')}>Login now</button>
        </div>
      </div>
    );
  }

  return (
    <div className="schedule-wizard-page">
      {loading ? (
        <div className="schedule-inline-loading">
          <div className="spinner-border text-primary" role="status"></div>
          <p>Loading booking form...</p>
        </div>
      ) : (
        <div className="schedule-wizard-shell">
          <div className="schedule-wizard-header">
            <div>
              <h1>Book an appointment</h1>
              <p>
                {hasPreselectedDoctor
                  ? 'Complete the information to book an appointment with the selected doctor.'
                  : 'Select a specialty, doctor and time that suits you.'}
              </p>
            </div>
          </div>

          <ScheduleStepper steps={stepConfig} currentStep={step} />

          <div className="schedule-wizard-layout">
            <section className="schedule-wizard-main">
              {currentStepKey === 'specialty' && (
                <SpecialtyStep
                  specialties={specialties}
                  selectedSpecialty={selectedSpecialty}
                  onSelectSpecialty={(specialty) => {
                    setSelectedSpecialty(specialty);
                    setSelectedDoctorId('');
                    setConsultationType('');
                    setSelectedSlot(null);
                    setSlots([]);
                  }}
                  onNext={handleNext}
                />
              )}

              {currentStepKey === 'doctor' && (
                <DoctorStep
                  doctors={filteredDoctors}
                  selectedDoctorId={selectedDoctorId}
                  onSelectDoctor={(doctorId) => {
                    setSelectedDoctorId(doctorId);
                    setConsultationType('');
                    setSelectedSlot(null);
                    setSlots([]);
                  }}
                  onBack={handleBack}
                  onNext={handleNext}
                />
              )}

              {currentStepKey === 'consultation' && (
                <ConsultationStep
                  consultationType={consultationType}
                  onSelectConsultation={(type) => {
                    setConsultationType(type);
                    setSelectedSlot(null);
                    setSlots([]);
                  }}
                  onBack={handleBack}
                  onNext={handleNext}
                  canGoBack
                />
              )}

              {currentStepKey === 'datetime' && (
                <DateTimeStep
                  date={date}
                  setDate={setDate}
                  onChangeDate={handleChangeDate}
                  slots={slots}
                  selectedSlot={selectedSlot}
                  onSelectSlot={handleSelectSlot}
                  onClearSlot={handleClearSlot}
                  loadingSlots={loadingSlots}
                  onBack={handleBackFromDateTime}
                  onNext={handleNext}
                  doctorSchedules={doctorSchedules}
                  maxDate={maxDate}
                  consultationType={consultationType}
                />
              )}

              {currentStepKey === 'homevisit' && (
                <HomeVisitStep
                  homeVisitInfo={homeVisitInfo}
                  setHomeVisitInfo={setHomeVisitInfo}
                  patientProfile={patientProfile}
                  selectedDoctorId={selectedDoctorId}
                  onBack={handleBack}
                  onNext={handleNext}
                />
              )}

              {currentStepKey === 'session-picker' && (
                <SessionPicker
                  doctorId={selectedDoctorId}
                  homeVisitInfo={homeVisitInfo}
                  setHomeVisitInfo={setHomeVisitInfo}
                  sessionDraftId={sessionDraftId}
                  setSessionDraftId={setSessionDraftId}
                  onBack={handleBack}
                  onNext={handleNext}
                />
              )}

              {currentStepKey === 'documents' && (
                <DocumentsStep
                  symptoms={symptoms}
                  setSymptoms={setSymptoms}
                  files={files}
                  setFiles={setFiles}
                  onBack={handleBackFromDocuments}
                  onNext={handleNext}
                />
              )}

              {currentStepKey === 'confirm' && (
                <ConfirmStep
                  selectedDoctor={selectedDoctor}
                  selectedSpecialty={selectedSpecialty}
                  selectedSlot={selectedSlot}
                  consultationType={consultationType}
                  homeVisitInfo={homeVisitInfo}
                  symptoms={isHomeVisit ? homeVisitInfo.reasonForHomeVisit : symptoms}
                  files={files}
                  onBack={handleBack}
                  onConfirm={handleSchedule}
                  confirming={bookingSubmitting}
                />
              )}

              {currentStepKey === 'payment' && (
                <PaymentStep
                  bookingDraft={paymentDraft}
                  selectedDoctor={selectedDoctor}
                  onBack={handleBackFromPayment}
                  onPaymentComplete={finalizeBookingAfterPayment}
                />
              )}
            </section>

            <aside className="schedule-wizard-aside">
              <DoctorSummaryCard doctor={selectedDoctor} />
            </aside>
          </div>
        </div>
      )}
    </div>
  );
}

export default Schedule;
