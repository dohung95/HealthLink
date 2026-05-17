package com.HealthLink.service.impl.prescription;

import com.HealthLink.dto.prescription.PrescriptionItemRequest;
import com.HealthLink.dto.prescription.PrescriptionItemResponse;
import com.HealthLink.dto.prescription.PrescriptionOpenedResponse;
import com.HealthLink.dto.prescription.PrescriptionRequest;
import com.HealthLink.dto.prescription.PrescriptionResponse;
import com.HealthLink.entity.Appointment;
import com.HealthLink.entity.Medicine;
import com.HealthLink.entity.PrescriptionHeader;
import com.HealthLink.entity.PrescriptionItem;
import com.HealthLink.entity.enums.PrescriptionTiming;
import com.HealthLink.exception.BadRequestException;
import com.HealthLink.exception.ForbiddenException;
import com.HealthLink.exception.ResourceNotFoundException;
import com.HealthLink.repository.appointment.AppointmentRepository;
import com.HealthLink.repository.medicine.MedicineRepository;
import com.HealthLink.repository.prescription.PrescriptionHeaderRepository;
import com.HealthLink.service.prescription.PrescriptionService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class PrescriptionServiceImpl implements PrescriptionService {

    private final PrescriptionHeaderRepository headerRepository;
    private final MedicineRepository medicineRepository;
    private final AppointmentRepository appointmentRepository;

    @Override
    @Transactional
    public PrescriptionResponse createPrescription(PrescriptionRequest request) {
        Appointment appointment = appointmentRepository.findById(request.getAppointmentId())
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Appointment", "id", request.getAppointmentId()));

        if ("Cancelled".equals(appointment.getStatus())) {
            throw new BadRequestException("Cannot create prescription for a cancelled appointment");
        }

        PrescriptionHeader header = PrescriptionHeader.builder()
                .appointment(appointment)
                .patient(appointment.getPatient())
                .doctor(appointment.getDoctor())
                .issueDate(LocalDateTime.now())
                .diagnosis(request.getDiagnosis())
                .notes(request.getNotes())
                .validUntil(request.getValidUntil())
                .status("Issued")
                .prescriptionItems(new ArrayList<>())
                .build();

        BigDecimal totalAmount = BigDecimal.ZERO;
        List<PrescriptionItem> items = new ArrayList<>();

        for (PrescriptionItemRequest itemReq : request.getItems()) {
            Medicine medicine = medicineRepository.findById(itemReq.getMedicineId())
                    .orElseThrow(() -> new ResourceNotFoundException(
                            "Medicine", "id", itemReq.getMedicineId()));

            BigDecimal unitPrice = itemReq.getUnitPrice();
            if (unitPrice == null) {
                unitPrice = medicine.getReferencePrice();
            }

            BigDecimal totalPrice = BigDecimal.ZERO;
            if (unitPrice != null && itemReq.getQuantity() != null) {
                totalPrice = unitPrice.multiply(BigDecimal.valueOf(itemReq.getQuantity()));
            }

            PrescriptionItem item = PrescriptionItem.builder()
                    .prescriptionHeader(header)
                    .medicine(medicine)
                    .medicationName(medicine.getName())
                    .dosage(buildDosage(medicine))
                    .instructions(buildInstructions(medicine))
                    .totalSupplyDays(itemReq.getTotalSupplyDays())
                    .quantity(itemReq.getQuantity())
                    .unit(itemReq.getUnit() != null ? itemReq.getUnit() : medicine.getUnit())
                    .frequency(itemReq.getFrequency())
                    .timing(normalizeTimingRequired(itemReq.getTiming()))
                    .route(itemReq.getRoute())
                    .unitPrice(unitPrice)
                    .totalPrice(totalPrice)
                    .notes(itemReq.getNotes())
                    .build();

            items.add(item);
            totalAmount = totalAmount.add(totalPrice);
        }

        header.getPrescriptionItems().addAll(items);
        header.setTotalAmount(totalAmount);

        PrescriptionHeader saved = headerRepository.save(header);
        return toResponse(saved, null);
    }

    @Override
    @Transactional(readOnly = true)
    public PrescriptionResponse getPrescriptionById(Integer prescriptionHeaderId, String timing) {
        PrescriptionHeader header = getPrescriptionOrThrow(prescriptionHeaderId);
        String normalizedTiming = normalizeTimingOptional(timing);
        return toResponse(header, normalizedTiming);
    }

    @Override
    @Transactional(readOnly = true)
    public List<PrescriptionResponse> getPrescriptionsByPatient(String patientId) {
        return headerRepository.findByPatient_PatientId(patientId)
                .stream()
                .map(header -> toResponse(header, null))
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public List<PrescriptionResponse> getPrescriptionsByDoctor(String doctorId) {
        return headerRepository.findByDoctor_DoctorId(doctorId)
                .stream()
                .map(header -> toResponse(header, null))
                .collect(Collectors.toList());
    }

    @Override
    @Transactional
    public PrescriptionOpenedResponse markPrescriptionAsOpened(Integer prescriptionHeaderId, String patientId) {
        PrescriptionHeader header = getPrescriptionOrThrow(prescriptionHeaderId);

        if (header.getPatient() == null || !patientId.equals(header.getPatient().getPatientId())) {
            throw new ForbiddenException("You are not allowed to mark this prescription as opened");
        }

        if (header.getOpenedAt() != null) {
            return buildOpenedResponse(header);
        }

        LocalDateTime openedAt = LocalDateTime.now().withNano(0);
        headerRepository.markOpenedIfNeeded(prescriptionHeaderId, patientId, openedAt);

        PrescriptionHeader refreshed = headerRepository
                .findByPrescriptionHeaderIdAndPatient_PatientId(prescriptionHeaderId, patientId)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "PrescriptionHeader", "id", prescriptionHeaderId));

        return buildOpenedResponse(refreshed);
    }

    private PrescriptionOpenedResponse buildOpenedResponse(PrescriptionHeader header) {
        return PrescriptionOpenedResponse.builder()
                .message("Prescription marked as opened")
                .prescriptionHeaderId(header.getPrescriptionHeaderId())
                .openedAt(header.getOpenedAt())
                .build();
    }

    private PrescriptionHeader getPrescriptionOrThrow(Integer prescriptionHeaderId) {
        return headerRepository.findById(prescriptionHeaderId)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "PrescriptionHeader", "id", prescriptionHeaderId));
    }

    private PrescriptionResponse toResponse(PrescriptionHeader header, String timingFilter) {
        List<PrescriptionItemResponse> itemResponses = header.getPrescriptionItems() == null
                ? List.of()
                : header.getPrescriptionItems().stream()
                .filter(item -> matchesTiming(item, timingFilter))
                .map(this::toItemResponse)
                .collect(Collectors.toList());

        return PrescriptionResponse.builder()
                .prescriptionHeaderId(header.getPrescriptionHeaderId())
                .appointmentId(header.getAppointment() != null ? header.getAppointment().getAppointmentId() : null)
                .patientId(header.getPatient() != null ? header.getPatient().getPatientId() : null)
                .patientName(header.getPatient() != null ? header.getPatient().getFullName() : null)
                .doctorId(header.getDoctor() != null ? header.getDoctor().getDoctorId() : null)
                .doctorName(header.getDoctor() != null ? header.getDoctor().getFullName() : null)
                .issueDate(header.getIssueDate())
                .diagnosis(header.getDiagnosis())
                .notes(header.getNotes())
                .validUntil(header.getValidUntil())
                .status(header.getStatus())
                .totalAmount(header.getTotalAmount())
                .items(itemResponses)
                .build();
    }

    private boolean matchesTiming(PrescriptionItem item, String timingFilter) {
        if (timingFilter == null) {
            return true;
        }

        return timingFilter.equals(normalizeTimingForResponse(item.getTiming()));
    }

    private PrescriptionItemResponse toItemResponse(PrescriptionItem item) {
        return PrescriptionItemResponse.builder()
                .prescriptionItemId(item.getPrescriptionItemId())
                .medicineId(item.getMedicine() != null ? item.getMedicine().getMedicineId() : null)
                .medicationName(item.getMedicationName())
                .dosage(item.getDosage())
                .instructions(item.getInstructions())
                .totalSupplyDays(item.getTotalSupplyDays())
                .quantity(item.getQuantity())
                .unit(item.getUnit())
                .frequency(item.getFrequency())
                .timing(normalizeTimingForResponse(item.getTiming()))
                .route(item.getRoute())
                .unitPrice(item.getUnitPrice())
                .totalPrice(item.getTotalPrice())
                .notes(item.getNotes())
                .build();
    }

    private String normalizeTimingRequired(String timing) {
        try {
            return PrescriptionTiming.normalize(timing);
        } catch (IllegalArgumentException ex) {
            throw new BadRequestException(ex.getMessage());
        }
    }

    private String normalizeTimingOptional(String timing) {
        if (timing == null || timing.isBlank()) {
            return null;
        }

        return normalizeTimingRequired(timing);
    }

    private String normalizeTimingForResponse(String timing) {
        if (PrescriptionTiming.isSupported(timing)) {
            return PrescriptionTiming.normalize(timing);
        }
        return timing;
    }

    private String buildDosage(Medicine medicine) {
        if (medicine.getStrength() == null && medicine.getUnit() == null) {
            return medicine.getName();
        }
        if (medicine.getStrength() == null) {
            return medicine.getUnit();
        }
        if (medicine.getUnit() == null) {
            return medicine.getStrength();
        }
        return medicine.getStrength() + " " + medicine.getUnit();
    }

    private String buildInstructions(Medicine medicine) {
        if (medicine.getDescription() != null && !medicine.getDescription().isBlank()) {
            return medicine.getDescription();
        }
        if (medicine.getIndications() != null && !medicine.getIndications().isBlank()) {
            return medicine.getIndications();
        }
        return "Use as directed";
    }
}
