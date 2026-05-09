package com.HealthLink.service.impl.prescription;

import com.HealthLink.dto.prescription.PrescriptionItemRequest;
import com.HealthLink.dto.prescription.PrescriptionItemResponse;
import com.HealthLink.dto.prescription.PrescriptionRequest;
import com.HealthLink.dto.prescription.PrescriptionResponse;
import com.HealthLink.entity.*;
import com.HealthLink.exception.BadRequestException;
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

    // -------------------------------------------------------------------------
    // REQ-7: Tạo đơn thuốc mới
    // -------------------------------------------------------------------------
    @Override
    @Transactional
    public PrescriptionResponse createPrescription(PrescriptionRequest request) {
        // 1. Tìm appointment
        Appointment appointment = appointmentRepository.findById(request.getAppointmentId())
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Appointment", "id", request.getAppointmentId()));

        // 2. Kiểm tra trạng thái appointment hợp lệ
        if ("Cancelled".equals(appointment.getStatus())) {
            throw new BadRequestException("Cannot create prescription for a cancelled appointment");
        }

        // 3. Xây dựng PrescriptionHeader
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

        // 4. Xây dựng các PrescriptionItem + tính giá
        BigDecimal totalAmount = BigDecimal.ZERO;
        List<PrescriptionItem> items = new ArrayList<>();

        for (PrescriptionItemRequest itemReq : request.getItems()) {
            Medicine medicine = medicineRepository.findById(itemReq.getMedicineId())
                    .orElseThrow(() -> new ResourceNotFoundException(
                            "Medicine", "id", itemReq.getMedicineId()));

            BigDecimal unitPrice = itemReq.getUnitPrice();

            // Lấy đơn giá từ thư viện thuốc nếu request không truyền
            if (unitPrice == null) {
                unitPrice = medicine.getReferencePrice();
            }

            String medicationName = medicine.getName();
            String dosage = buildDosage(medicine);
            String instructions = buildInstructions(medicine);
            String unit = itemReq.getUnit() != null ? itemReq.getUnit() : medicine.getUnit();

            // Tính totalPrice của item
            BigDecimal totalPrice = BigDecimal.ZERO;
            if (unitPrice != null && itemReq.getQuantity() != null) {
                totalPrice = unitPrice.multiply(BigDecimal.valueOf(itemReq.getQuantity()));
            }

            PrescriptionItem item = PrescriptionItem.builder()
                    .prescriptionHeader(header)
                    .medicine(medicine)
                    .medicationName(medicationName)
                    .dosage(dosage)
                    .instructions(instructions)
                    .totalSupplyDays(itemReq.getTotalSupplyDays())
                    .quantity(itemReq.getQuantity())
                    .unit(unit)
                    .frequency(itemReq.getFrequency())
                    .timing(itemReq.getTiming())
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

        // 5. Lưu (cascade ALL sẽ lưu cả items)
        PrescriptionHeader saved = headerRepository.save(header);

        return toResponse(saved);
    }

    // -------------------------------------------------------------------------
    // Queries
    // -------------------------------------------------------------------------
    @Override
    @Transactional(readOnly = true)
    public PrescriptionResponse getPrescriptionById(Integer prescriptionHeaderId) {
        PrescriptionHeader header = headerRepository.findById(prescriptionHeaderId)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "PrescriptionHeader", "id", prescriptionHeaderId));
        return toResponse(header);
    }

    @Override
    @Transactional(readOnly = true)
    public List<PrescriptionResponse> getPrescriptionsByPatient(String patientId) {
        return headerRepository.findByPatient_PatientId(patientId)
                .stream().map(this::toResponse).collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public List<PrescriptionResponse> getPrescriptionsByDoctor(String doctorId) {
        return headerRepository.findByDoctor_DoctorId(doctorId)
                .stream().map(this::toResponse).collect(Collectors.toList());
    }

    // -------------------------------------------------------------------------
    // Mappers
    // -------------------------------------------------------------------------
    private PrescriptionResponse toResponse(PrescriptionHeader h) {
        List<PrescriptionItemResponse> itemResponses = h.getPrescriptionItems() == null
                ? List.of()
                : h.getPrescriptionItems().stream()
                        .map(this::toItemResponse)
                        .collect(Collectors.toList());

        return PrescriptionResponse.builder()
                .prescriptionHeaderId(h.getPrescriptionHeaderId())
                .appointmentId(h.getAppointment() != null ? h.getAppointment().getAppointmentId() : null)
                .patientId(h.getPatient() != null ? h.getPatient().getPatientId() : null)
                .patientName(h.getPatient() != null ? h.getPatient().getFullName() : null)
                .doctorId(h.getDoctor() != null ? h.getDoctor().getDoctorId() : null)
                .doctorName(h.getDoctor() != null ? h.getDoctor().getFullName() : null)
                .issueDate(h.getIssueDate())
                .diagnosis(h.getDiagnosis())
                .notes(h.getNotes())
                .validUntil(h.getValidUntil())
                .status(h.getStatus())
                .totalAmount(h.getTotalAmount())
                .items(itemResponses)
                .build();
    }

    private PrescriptionItemResponse toItemResponse(PrescriptionItem i) {
        return PrescriptionItemResponse.builder()
                .prescriptionItemId(i.getPrescriptionItemId())
                .medicineId(i.getMedicine() != null ? i.getMedicine().getMedicineId() : null)
                .medicationName(i.getMedicationName())
                .dosage(i.getDosage())
                .instructions(i.getInstructions())
                .totalSupplyDays(i.getTotalSupplyDays())
                .quantity(i.getQuantity())
                .unit(i.getUnit())
                .frequency(i.getFrequency())
                .timing(i.getTiming())
                .route(i.getRoute())
                .unitPrice(i.getUnitPrice())
                .totalPrice(i.getTotalPrice())
                .notes(i.getNotes())
                .build();
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
