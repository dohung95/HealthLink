package com.HealthLink.service.impl.prescription;

import com.HealthLink.dto.prescription.PrescriptionItemRequest;
import com.HealthLink.dto.prescription.PrescriptionOpenedResponse;
import com.HealthLink.dto.prescription.PrescriptionRequest;
import com.HealthLink.dto.prescription.PrescriptionResponse;
import com.HealthLink.entity.Appointment;
import com.HealthLink.entity.Doctor;
import com.HealthLink.entity.Medicine;
import com.HealthLink.entity.Patient;
import com.HealthLink.entity.PrescriptionHeader;
import com.HealthLink.entity.PrescriptionItem;
import com.HealthLink.exception.BadRequestException;
import com.HealthLink.repository.appointment.AppointmentRepository;
import com.HealthLink.repository.medicine.MedicineRepository;
import com.HealthLink.repository.prescription.PrescriptionHeaderRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class PrescriptionServiceImplTest {

    @Mock
    private PrescriptionHeaderRepository headerRepository;

    @Mock
    private MedicineRepository medicineRepository;

    @Mock
    private AppointmentRepository appointmentRepository;

    @InjectMocks
    private PrescriptionServiceImpl prescriptionService;

    @Test
    void getPrescriptionById_shouldFilterItemsByNormalizedTiming() {
        PrescriptionHeader header = PrescriptionHeader.builder()
                .prescriptionHeaderId(1)
                .appointment(Appointment.builder().appointmentId(11).build())
                .patient(patient("patient-1", "Patient One"))
                .doctor(doctor("doctor-1", "Doctor One"))
                .issueDate(LocalDateTime.of(2026, 5, 15, 8, 0))
                .status("Issued")
                .totalAmount(new BigDecimal("30.00"))
                .prescriptionItems(List.of(
                        prescriptionItem(1, "morning", "Amlodipine 5mg"),
                        prescriptionItem(2, "EVENING", "Cetirizine 10mg")
                ))
                .build();

        when(headerRepository.findById(1)).thenReturn(Optional.of(header));

        PrescriptionResponse response = prescriptionService.getPrescriptionById(1, "MORNING");

        assertThat(response.getItems()).hasSize(1);
        assertThat(response.getItems().getFirst().getPrescriptionItemId()).isEqualTo(1);
        assertThat(response.getItems().getFirst().getTiming()).isEqualTo("MORNING");
    }

    @Test
    void createPrescription_shouldNormalizeTimingBeforeSaving() {
        PrescriptionRequest request = new PrescriptionRequest();
        request.setAppointmentId(11);
        request.setDiagnosis("Hypertension");
        request.setValidUntil(LocalDateTime.of(2026, 5, 30, 23, 59, 59));

        PrescriptionItemRequest itemRequest = new PrescriptionItemRequest();
        itemRequest.setMedicineId(5);
        itemRequest.setTotalSupplyDays(30);
        itemRequest.setQuantity(2);
        itemRequest.setTiming("evening");
        request.setItems(List.of(itemRequest));

        Appointment appointment = Appointment.builder()
                .appointmentId(11)
                .status("Scheduled")
                .patient(patient("patient-1", "Patient One"))
                .doctor(doctor("doctor-1", "Doctor One"))
                .build();

        Medicine medicine = Medicine.builder()
                .medicineId(5)
                .name("Amlodipine 5mg")
                .strength("5mg")
                .unit("tablet")
                .description("Take after food")
                .referencePrice(new BigDecimal("12.50"))
                .build();

        when(appointmentRepository.findById(11)).thenReturn(Optional.of(appointment));
        when(medicineRepository.findById(5)).thenReturn(Optional.of(medicine));
        when(headerRepository.save(any(PrescriptionHeader.class))).thenAnswer(invocation -> {
            PrescriptionHeader saved = invocation.getArgument(0);
            saved.setPrescriptionHeaderId(100);
            return saved;
        });

        PrescriptionResponse response = prescriptionService.createPrescription(request);

        ArgumentCaptor<PrescriptionHeader> headerCaptor = ArgumentCaptor.forClass(PrescriptionHeader.class);
        verify(headerRepository).save(headerCaptor.capture());

        PrescriptionItem savedItem = headerCaptor.getValue().getPrescriptionItems().getFirst();
        assertThat(savedItem.getTiming()).isEqualTo("EVENING");
        assertThat(response.getItems().getFirst().getTiming()).isEqualTo("EVENING");
        assertThat(response.getTotalAmount()).isEqualByComparingTo("25.00");
    }

    @Test
    void markPrescriptionAsOpened_shouldBeIdempotentWhenAlreadyOpened() {
        LocalDateTime openedAt = LocalDateTime.of(2026, 5, 15, 8, 30);
        PrescriptionHeader header = PrescriptionHeader.builder()
                .prescriptionHeaderId(22)
                .patient(patient("patient-1", "Patient One"))
                .openedAt(openedAt)
                .build();

        when(headerRepository.findById(22)).thenReturn(Optional.of(header));

        PrescriptionOpenedResponse response =
                prescriptionService.markPrescriptionAsOpened(22, "patient-1");

        assertThat(response.getOpenedAt()).isEqualTo(openedAt);
        verify(headerRepository, never()).markOpenedIfNeeded(any(), any(), any());
    }

    @Test
    void getPrescriptionById_shouldRejectInvalidTimingFilter() {
        PrescriptionHeader header = PrescriptionHeader.builder()
                .prescriptionHeaderId(5)
                .build();

        when(headerRepository.findById(5)).thenReturn(Optional.of(header));

        assertThatThrownBy(() -> prescriptionService.getPrescriptionById(5, "night"))
                .isInstanceOf(BadRequestException.class)
                .hasMessage("Timing must be one of MORNING, AFTERNOON, EVENING");
    }

    private Patient patient(String patientId, String fullName) {
        return Patient.builder()
                .patientId(patientId)
                .fullName(fullName)
                .build();
    }

    private Doctor doctor(String doctorId, String fullName) {
        return Doctor.builder()
                .doctorId(doctorId)
                .fullName(fullName)
                .build();
    }

    private PrescriptionItem prescriptionItem(Integer id, String timing, String medicationName) {
        return PrescriptionItem.builder()
                .prescriptionItemId(id)
                .timing(timing)
                .medicationName(medicationName)
                .dosage("5mg")
                .instructions("Use as directed")
                .totalSupplyDays(7)
                .quantity(1)
                .unit("tablet")
                .build();
    }
}
