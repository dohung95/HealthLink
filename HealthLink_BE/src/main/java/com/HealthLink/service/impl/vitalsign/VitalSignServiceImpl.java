package com.HealthLink.service.impl.vitalsign;

import com.HealthLink.dto.request.VitalSignRequest;
import com.HealthLink.dto.response.VitalSignResponse;
import com.HealthLink.entity.Appointment;
import com.HealthLink.entity.Patient;
import com.HealthLink.entity.VitalSign;
import com.HealthLink.exception.BusinessException;
import com.HealthLink.exception.ResourceNotFoundException;
import com.HealthLink.repository.appointment.AppointmentRepository;
import com.HealthLink.repository.patient.PatientRepository;
import com.HealthLink.repository.vitalsign.VitalSignRepository;
import com.HealthLink.service.vitalsign.VitalSignService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class VitalSignServiceImpl implements VitalSignService {

    private final VitalSignRepository vitalSignRepository;
    private final PatientRepository patientRepository;
    private final AppointmentRepository appointmentRepository;

    @Override
    @Transactional
    public VitalSignResponse createVitalSign(VitalSignRequest request) {
        validateRequest(request);

        Patient patient = patientRepository.findById(request.getPatientId())
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Patient not found: " + request.getPatientId()
                ));

        Appointment appointment = null;

        if (request.getAppointmentId() != null) {
            appointment = appointmentRepository.findById(request.getAppointmentId())
                    .orElseThrow(() -> new ResourceNotFoundException(
                            "Appointment not found: " + request.getAppointmentId()
                    ));

            if (!appointment.getPatient().getPatientId().equals(patient.getPatientId())) {
                throw new BusinessException(
                        "This appointment does not belong to the selected patient"
                );
            }
        }

        VitalSign vitalSign = VitalSign.builder()
                .patient(patient)
                .appointment(appointment)
                .heartRate(request.getHeartRate())
                .bloodPressureSystolic(request.getBloodPressureSystolic())
                .bloodPressureDiastolic(request.getBloodPressureDiastolic())
                .temperature(request.getTemperature())
                .oxygenSaturation(request.getOxygenSaturation())
                .respiratoryRate(request.getRespiratoryRate())
                .source(resolveSource(request.getSource()))
                .deviceName(request.getDeviceName())
                .notes(request.getNotes())
                .measuredAt(LocalDateTime.now())
                .createdAt(LocalDateTime.now())
                .build();

        return toResponse(vitalSignRepository.save(vitalSign));
    }

    @Override
    @Transactional(readOnly = true)
    public List<VitalSignResponse> getByAppointment(Integer appointmentId) {
        appointmentRepository.findById(appointmentId)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Appointment not found: " + appointmentId
                ));

        return vitalSignRepository
                .findByAppointment_AppointmentIdOrderByMeasuredAtDesc(appointmentId)
                .stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public VitalSignResponse getLatestByAppointment(Integer appointmentId) {
        appointmentRepository.findById(appointmentId)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Appointment not found: " + appointmentId
                ));

        return vitalSignRepository
                .findTopByAppointment_AppointmentIdOrderByMeasuredAtDesc(appointmentId)
                .map(this::toResponse)
                .orElse(null);
    }

    @Override
    @Transactional(readOnly = true)
    public List<VitalSignResponse> getByPatient(String patientId) {
        patientRepository.findById(patientId)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Patient not found: " + patientId
                ));

        return vitalSignRepository
                .findByPatient_PatientIdOrderByMeasuredAtDesc(patientId)
                .stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    private void validateRequest(VitalSignRequest request) {
        if (request == null) {
            throw new BusinessException("Vital sign request is required");
        }

        if (request.getPatientId() == null || request.getPatientId().isBlank()) {
            throw new BusinessException("Patient ID is required");
        }

        if (request.getHeartRate() == null) {
            throw new BusinessException("Heart rate is required");
        }

        if (request.getHeartRate() < 30 || request.getHeartRate() > 220) {
            throw new BusinessException("Heart rate must be between 30 and 220 bpm");
        }

        if (request.getOxygenSaturation() != null &&
                (request.getOxygenSaturation() < 50 || request.getOxygenSaturation() > 100)) {
            throw new BusinessException("Oxygen saturation must be between 50 and 100%");
        }

        if (request.getTemperature() != null &&
                (request.getTemperature() < 30 || request.getTemperature() > 45)) {
            throw new BusinessException("Temperature must be between 30 and 45°C");
        }

        if (request.getRespiratoryRate() != null &&
                (request.getRespiratoryRate() < 5 || request.getRespiratoryRate() > 60)) {
            throw new BusinessException("Respiratory rate must be between 5 and 60 breaths/min");
        }

        Integer sys = request.getBloodPressureSystolic();
        Integer dia = request.getBloodPressureDiastolic();

        if ((sys == null && dia != null) || (sys != null && dia == null)) {
            throw new BusinessException("Both systolic and diastolic blood pressure are required together");
        }

        if (sys != null && (sys < 70 || sys > 250)) {
            throw new BusinessException("Systolic blood pressure must be between 70 and 250 mmHg");
        }

        if (dia != null && (dia < 40 || dia > 150)) {
            throw new BusinessException("Diastolic blood pressure must be between 40 and 150 mmHg");
        }

        if (sys != null && dia != null && dia >= sys) {
            throw new BusinessException("Diastolic blood pressure must be lower than systolic blood pressure");
        }
    }

    private String resolveSource(String source) {
        if (source == null || source.isBlank()) {
            return "Manual";
        }

        return source;
    }

    private VitalSignResponse toResponse(VitalSign vitalSign) {
        return VitalSignResponse.builder()
                .vitalSignId(vitalSign.getVitalSignId())
                .patientId(
                        vitalSign.getPatient() != null
                                ? vitalSign.getPatient().getPatientId()
                                : null
                )
                .appointmentId(
                        vitalSign.getAppointment() != null
                                ? vitalSign.getAppointment().getAppointmentId()
                                : null
                )
                .heartRate(vitalSign.getHeartRate())
                .bloodPressureSystolic(vitalSign.getBloodPressureSystolic())
                .bloodPressureDiastolic(vitalSign.getBloodPressureDiastolic())
                .temperature(vitalSign.getTemperature())
                .oxygenSaturation(vitalSign.getOxygenSaturation())
                .respiratoryRate(vitalSign.getRespiratoryRate())
                .source(vitalSign.getSource())
                .deviceName(vitalSign.getDeviceName())
                .notes(vitalSign.getNotes())
                .measuredAt(vitalSign.getMeasuredAt())
                .createdAt(vitalSign.getCreatedAt())
                .build();
    }
}