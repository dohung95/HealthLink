import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';

import { appointmentService } from '../../api/appointmentApi';
import { doctorService } from '../../api/doctorApi';
import { useAuth } from '../../context/AuthContext';
import { getProfile } from '../../api/account';
import { healthRecordApi } from '../../api/healthRecordApi';
import ScheduleStepper from '../schedule/ScheduleStepper';
import SpecialtyStep from '../schedule/SpecialtyStep';
import DoctorStep from '../schedule/DoctorStep';
import ConsultationStep from '../schedule/ConsultationStep';
import DateTimeStep from '../schedule/DateTimeStep';
import DocumentsStep from '../schedule/DocumentsStep';
import ConfirmStep from '../schedule/ConfirmStep';
import PaymentStep from '../schedule/PaymentStep';
import DoctorSummaryCard from '../schedule/DoctorSummaryCard';

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
  const { isAuthenticated, token } = useAuth();

  const hasPreselectedDoctor = !!doctorId;

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

  const [symptoms, setSymptoms] = useState('');
  const [files, setFiles] = useState([]);
  const [patientId, setPatientId] = useState('');
  const [bookingSubmitting, setBookingSubmitting] = useState(false);
  const [paymentDraft, setPaymentDraft] = useState(null);


  const [maxDate] = useState(() => {
    const max = new Date();
    max.setDate(max.getDate() + 30);
    return max.toISOString().split('T')[0];
  });

  const stepConfig = hasPreselectedDoctor
    ? [
      { key: 'consultation', label: 'Consultation Type' },
      { key: 'datetime', label: 'Date & Time' },
      { key: 'documents', label: 'Medical information' },
      { key: 'confirm', label: 'Confirm' },
      { key: 'payment', label: 'Payment' },
    ]
    : [
      { key: 'specialty', label: 'Specialty' },
      { key: 'doctor', label: 'Doctor' },
      { key: 'consultation', label: 'Consultation Type' },
      { key: 'datetime', label: 'Date & Time' },
      { key: 'documents', label: 'Medical information' },
      { key: 'confirm', label: 'Confirm' },
      { key: 'payment', label: 'Payment' },
    ];

  const currentStepKey = stepConfig[step - 1]?.key;

  useEffect(() => {
    if (!isAuthenticated || !token) return;

    async function fetchPatientProfile() {
      try {
        const profile = await getProfile(token);
        setPatientId(profile.userId);
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
    if (!doctorId || doctors.length === 0) return;

    const preselectedDoctor = doctors.find(
      (doctor) => doctor.doctorId === doctorId
    );

    if (preselectedDoctor) {
      setSelectedSpecialty(preselectedDoctor.specialtyName || '');
      setSelectedDoctorId(preselectedDoctor.doctorId);
    }
  }, [doctorId, doctors]);

  useEffect(() => {
    if (!selectedDoctorId || !date || !consultationType) return;

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
  }, [selectedDoctorId, date, consultationType]);

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
        await appointmentService.releaseHold(previousSelectedSlot.holdId);
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
          date,
          consultationType
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

    try {
      if (selectedSlot.holdId) {
        await appointmentService.releaseHold(selectedSlot.holdId);
      }

      setSlots((prev) =>
        prev.map((item) =>
          item.startTime === selectedSlot.startTime
            ? {
              ...item,
              status: 'AVAILABLE',
              selectable: true,
            }
            : item
        )
      );

      setSelectedSlot(null);
    } catch (error) {
      toast.error(
        error.response?.data?.message || 'Can not cancel holding this time slot.'
      );
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
      toast.warning('Please select a consultation type');
      return;
    }

    if (currentStepKey === 'datetime' && !selectedSlot) {
      toast.warning('Please select a date and time');
      return;
    }

    setStep((prev) => Math.min(prev + 1, stepConfig.length));
  };

  const handleBack = () => {
    setStep((prev) => Math.max(prev - 1, 1));
  };

  const handleSchedule = async () => {
    if (!selectedDoctorId || !selectedSlot || !consultationType) {
      toast.warning('Booking information is not complete');
      return;
    }

    if (!patientId) {
      toast.error('Can not find patient information in the current login session.');
      return;
    }


    setBookingSubmitting(true);

    try {
      const bookingData = {
        patientId,
        doctorId: selectedDoctorId,
        appointmentTime: selectedSlot.appointmentTime,
        consultationType,
        symptoms,
        notes: '',
      };

      setPaymentDraft({
        ...bookingData,
        currency: 'USD',
        amount: selectedDoctor?.consultationFee ?? selectedDoctor?.fee ?? 0,
      });
      setStep(stepConfig.length);
      toast.success('Please complete payment to create your appointment.');
    } catch (error) {
      toast.error(
        error.response?.data?.message || 'Can not prepare payment.'
      );
    } finally {
      setBookingSubmitting(false);
    }
  };

  const finalizeBookingAfterPayment = async () => {
    try {
      if (files.length > 0) {
        for (const item of files) {
          if (!item.file) continue;

          await healthRecordApi.uploadDocumentAutoRecord(
            patientId,
            item.file,
            'Consultation-Notes',
            symptoms || 'Uploaded during appointment booking',
            new Date().toISOString().split('T')[0]
          );
        }
      }

      toast.success('Booking successful!');
      navigate('/patient-dashboard/appointments');
    } catch (error) {
      console.error('Failed to upload booking documents after payment', error);
      toast.error(
        error.response?.data?.message || 'Payment completed, but documents could not be uploaded.'
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
                  }}
                  onNext={handleNext}
                />
              )}

              {currentStepKey === 'doctor' && (
                <DoctorStep
                  doctors={filteredDoctors}
                  selectedDoctorId={selectedDoctorId}
                  onSelectDoctor={setSelectedDoctorId}
                  onBack={handleBack}
                  onNext={handleNext}
                />
              )}

              {currentStepKey === 'consultation' && (
                <ConsultationStep
                  consultationType={consultationType}
                  onSelectConsultation={setConsultationType}
                  onBack={handleBack}
                  onNext={handleNext}
                  canGoBack={!hasPreselectedDoctor || step > 1}
                  availableTypes={selectedDoctor?.availableTypes ?? []}
                />
              )}

              {currentStepKey === 'datetime' && (
                <DateTimeStep
                  date={date}
                  setDate={setDate}
                  slots={slots}
                  selectedSlot={selectedSlot}
                  onSelectSlot={handleSelectSlot}
                  onClearSlot={handleClearSlot}
                  loadingSlots={loadingSlots}
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
                  onBack={handleBack}
                  onNext={handleNext}
                />
              )}

              {currentStepKey === 'confirm' && (
                <ConfirmStep
                  selectedDoctor={selectedDoctor}
                  selectedSpecialty={selectedSpecialty}
                  consultationType={consultationType}
                  selectedSlot={selectedSlot}
                  symptoms={symptoms}
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
