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
import HomeVisitDoctorStep from '../schedule/HomeVisitDoctorStep';
import HomeVisitServicesStep from '../schedule/HomeVisitServicesStep';

import '../Css/ScheduleWizard.css';

const buildAppointmentDateTime = (dateValue, timeValue) => {
  const [hour = '00', minute = '00', rawSecond = '00'] = String(timeValue || '')
    .trim()
    .split(':');
  const second = rawSecond.split('.')[0] || '00';

  return `${dateValue}T${hour.padStart(2, '0')}:${minute.padStart(2, '0')}:${second.padStart(2, '0')}`;
};

const buildHomeVisitAppointmentDateTime = (bookingDate, startTime) => {
  if (!bookingDate) return null;

  const [hour = '08', minute = '00', rawSecond = '00'] = String(startTime || '08:00')
    .trim()
    .split(':');

  const second = rawSecond.split('.')[0] || '00';

  return `${bookingDate}T${hour.padStart(2, '0')}:${minute.padStart(2, '0')}:${second.padStart(2, '0')}`;
};

const Schedule = () => {
  const navigate = useNavigate();
  const { doctorId } = useParams();
  const [searchParams] = useSearchParams();
  const { isAuthenticated, token } = useAuth();

  const hasPreselectedDoctor = !!doctorId;
  const isFromProposal =
    searchParams.get('homeVisit') === 'true' || searchParams.has('consultationId');


  const [loading, setLoading] = useState(true);
  const [loadingSlots, setLoadingSlots] = useState(false);

  const [step, setStep] = useState(1);

  const [doctors, setDoctors] = useState([]);
  const [selectedSpecialty, setSelectedSpecialty] = useState('');
  const [selectedDoctorId, setSelectedDoctorId] = useState('');
  const [consultationType, setConsultationType] = useState('');

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

  const [homeVisitDoctorOptions, setHomeVisitDoctorOptions] = useState([]);
  const [selectedHomeVisitDoctor, setSelectedHomeVisitDoctor] = useState(null);
  const [selectedHomeVisitServices, setSelectedHomeVisitServices] = useState([]);


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
        { key: 'consultation', label: 'Visit Type' },
      ];

    if (isHomeVisit) {
      baseSteps.push({ key: 'homevisit', label: 'Location' });
      baseSteps.push({ key: 'homevisit-doctor', label: 'Doctor' });
      baseSteps.push({ key: 'homevisit-services', label: 'Services' });
      baseSteps.push({ key: 'session-picker', label: 'Choose Session' });
    } else {
      if (!hasPreselectedDoctor) {
        baseSteps.push({ key: 'doctor', label: 'Doctor' });
      }

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

  // Tiếp nhận ?specialty=SpecialtyName từ URL (truyền bởi chatbot)
  // Tự động pre-select chuyên khoa và skip bước 1 → chuyển thẳng sang bước chọn Bác sĩ
  useEffect(() => {
    const specialtyParam = searchParams.get('specialty');
    if (!specialtyParam || doctorId) return; // Không áp dụng nếu đã có doctorId pre-selected
    setSelectedSpecialty(decodeURIComponent(specialtyParam));
    setStep(2); // Nhảy thẳng sang bước 2 (chọn bác sĩ)
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
      setSelectedHomeVisitDoctor(preselectedDoctor);

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
    if (!selectedDoctorId || !date || !consultationType) {
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
  }, [selectedDoctorId, date, consultationType, isHomeVisit]);

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

  const displayDoctor = useMemo(() => {
    return isHomeVisit ? selectedHomeVisitDoctor : selectedDoctor;
  }, [isHomeVisit, selectedHomeVisitDoctor, selectedDoctor]);

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
      // Nếu trước đó đã chọn slot khác, giải phóng hold cũ trước
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
          // Trả slot cũ về AVAILABLE
          if (
            previousSelectedSlot &&
            item.startTime === previousSelectedSlot.startTime
          ) {
            return {
              ...item,
              status: 'AVAILABLE',
              selectable: true,
            };
          }

          // Chỉ slot mới được chọn chuyển sang HELD
          if (item.startTime === slot.startTime) {
            return {
              ...item,
              status: 'HELD',
              selectable: false,
            };
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
          ? {
            ...item,
            status: 'AVAILABLE',
            selectable: true,
          }
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


    if (currentStepKey === 'homevisit') {
      if (!homeVisitInfo.visitAddress?.trim()) {
        toast.warning('Visit address is required.');
        return;
      }

      if (!homeVisitInfo.contactPhone?.trim()) {
        toast.warning('Contact phone is required.');
        return;
      }

      if (!homeVisitInfo.reasonForHomeVisit?.trim()) {
        toast.warning('Reason for home visit is required.');
        return;
      }

      if (homeVisitInfo.isForSelf === false) {
        if (!homeVisitInfo.receiverName?.trim()) {
          toast.warning('Receiver name is required.');
          return;
        }

        if (!homeVisitInfo.receiverRelationship?.trim()) {
          toast.warning('Receiver relationship is required.');
          return;
        }

        if (!homeVisitInfo.receiverAge || Number(homeVisitInfo.receiverAge) <= 0) {
          toast.warning('Receiver age must be greater than 0.');
          return;
        }
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
          ? {
            ...item,
            status: 'AVAILABLE',
            selectable: true,
          }
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
    if (!selectedDoctorId) {
      toast.warning('Booking information is not complete');
      return;
    }

    if (!isHomeVisit && !selectedSlot) {
      toast.warning('Booking information is not complete');
      return;
    }

    if (isHomeVisit && !homeVisitInfo.selectedSession) {
      toast.warning('Please select a home visit session.');
      return;
    }

    if (isHomeVisit && !sessionDraftId) {
      toast.warning('Home visit session draft is missing. Please select the session again.');
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

      const appointmentDate = isHomeVisit
        ? buildHomeVisitAppointmentDateTime(bookingDate, selectedSession?.startTime)
        : selectedSlot?.appointmentTime;

      const bookingData = {
        patientId,
        doctorId: selectedDoctorId,
        appointmentTime: appointmentDate,
        consultationType,
        symptoms: isHomeVisit ? homeVisitInfo.reasonForHomeVisit : symptoms,
        notes: isHomeVisit ? homeVisitInfo.specialNotes : '',
        homeVisitServiceIds: selectedHomeVisitServices.map((item) => item.serviceId),

        ...(consultationType === 'HomeVisit'
          ? {
            draftId: sessionDraftId,
            scheduleId: selectedSession?.scheduleId,
            bookingDate,
            homeVisitStartTime: selectedSession?.startTime,
            homeVisitEndTime: selectedSession?.endTime,

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
            selectedHomeVisitServices: isHomeVisit ? selectedHomeVisitServices : [],
            homeVisitServiceIds: isHomeVisit
              ? selectedHomeVisitServices.map((item) => item.serviceId).filter(Boolean)
              : [],
          }
          : {}),
      };

      const doctorFee = isHomeVisit
        ? Number(selectedHomeVisitDoctor?.consultationFee || 0)
        : Number(selectedDoctor?.consultationFee ?? selectedDoctor?.fee ?? 0);

      const homeVisitTravelTotal = isHomeVisit
        ? Number(selectedHomeVisitDoctor?.homeVisitTotal || 0)
        : 0;

      const servicesTotal = isHomeVisit
        ? selectedHomeVisitServices.reduce(
          (sum, item) => sum + Number(item.price || 0),
          0
        )
        : 0;

      const finalTotal = isHomeVisit
        ? doctorFee + homeVisitTravelTotal + servicesTotal
        : doctorFee;

      setPaymentDraft({
        ...bookingData,
        currency: 'USD',
        amount: finalTotal,
        doctorFee,
        homeVisitEstimate: isHomeVisit
          ? {
            distanceKm: selectedHomeVisitDoctor?.distanceKm,
            estimatedTravelMinutes: selectedHomeVisitDoctor?.estimatedTravelMinutes,
            homeVisitFee: selectedHomeVisitDoctor?.homeVisitFee,
            travelFee: selectedHomeVisitDoctor?.travelFee,
            totalFee: selectedHomeVisitDoctor?.homeVisitTotal,
            servicesTotal,
            grandTotal: finalTotal,
          }
          : null,
        selectedHomeVisitServices: isHomeVisit ? selectedHomeVisitServices : [],
        homeVisitServiceIds: isHomeVisit
          ? selectedHomeVisitServices.map((item) => item.serviceId)
          : [],
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
          appointmentId: paidInvoice?.appointmentId,
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

                    setHomeVisitDoctorOptions([]);
                    setSelectedHomeVisitDoctor(null);
                    setSelectedHomeVisitServices([]);
                    setSessionDraftId(null);

                    if (type === 'HomeVisit' && !hasPreselectedDoctor) {
                      setSelectedDoctorId('');
                    }
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
                  selectedSpecialty={selectedSpecialty}
                  onDoctorsLoaded={setHomeVisitDoctorOptions}
                  onBack={handleBack}
                  onNext={handleNext}
                />
              )}

              {currentStepKey === 'homevisit-doctor' && (
                <HomeVisitDoctorStep
                  doctors={homeVisitDoctorOptions}
                  selectedDoctorId={selectedDoctorId}
                  onSelectDoctor={(doctor) => {
                    setSelectedDoctorId(doctor.doctorId);
                    setSelectedHomeVisitDoctor(doctor);
                    setSelectedSlot(null);
                    setSlots([]);
                    setSessionDraftId(null);
                    setHomeVisitInfo((prev) => ({
                      ...prev,
                      selectedSession: null,
                    }));
                  }}
                  onBack={handleBack}
                  onNext={handleNext}
                />
              )}

              {currentStepKey === 'homevisit-services' && (
                <HomeVisitServicesStep
                  selectedServices={selectedHomeVisitServices}
                  setSelectedServices={setSelectedHomeVisitServices}
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
                  selectedHomeVisitServices={selectedHomeVisitServices}
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
                  onBack={isHomeVisit ? handleBack : handleBackFromDocuments}
                  onNext={handleNext}
                />
              )}

              {currentStepKey === 'confirm' && (
                <ConfirmStep
                  selectedDoctor={displayDoctor}
                  selectedSpecialty={selectedSpecialty}
                  selectedSlot={selectedSlot}
                  consultationType={consultationType}
                  homeVisitInfo={homeVisitInfo}
                  symptoms={isHomeVisit ? homeVisitInfo.reasonForHomeVisit : symptoms}
                  files={files}
                  selectedHomeVisitServices={selectedHomeVisitServices}
                  homeVisitEstimate={isHomeVisit ? selectedHomeVisitDoctor : null}
                  onBack={handleBack}
                  onConfirm={handleSchedule}
                  confirming={bookingSubmitting}
                />
              )}

              {currentStepKey === 'payment' && (
                <PaymentStep
                  bookingDraft={paymentDraft}
                  selectedDoctor={displayDoctor}
                  onBack={handleBackFromPayment}
                  onPaymentComplete={finalizeBookingAfterPayment}
                />
              )}
            </section>

            <aside className="schedule-wizard-aside">
              <DoctorSummaryCard doctor={displayDoctor} />
            </aside>
          </div>
        </div>
      )}
    </div>
  );
}

export default Schedule;
