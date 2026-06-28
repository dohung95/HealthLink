package com.HealthLink.controller.payment;

import com.HealthLink.dto.payment.AppointmentPayPalCaptureRequest;
import com.HealthLink.dto.payment.AppointmentPayPalOrderRequest;
import com.HealthLink.dto.payment.InvoiceResponse;
import com.HealthLink.entity.HomeVisitBooking;
import com.HealthLink.entity.HomeVisitDraft;
import com.HealthLink.exception.BadRequestException;
import com.HealthLink.exception.ResourceNotFoundException;
import com.HealthLink.repository.appointment.HomeVisitBookingRepository;
import com.HealthLink.repository.appointment.HomeVisitDraftRepository;
import com.HealthLink.repository.auth.UserRepository;
import com.HealthLink.service.homevisit.HomeVisitSessionService;
import com.HealthLink.service.payment.FinanceService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.Map;

@RestController
@RequestMapping("/api/payment/home-visit")
@RequiredArgsConstructor
public class HomeVisitPaymentController {

    private final FinanceService financeService;
    private final HomeVisitBookingRepository homeVisitBookingRepository;
    private final HomeVisitDraftRepository homeVisitDraftRepository;
    private final HomeVisitSessionService homeVisitSessionService;
    private final UserRepository userRepository;

    private String resolveUserId(UserDetails userDetails) {
        return userRepository.findByEmail(userDetails.getUsername())
                .orElseThrow(() -> new ResourceNotFoundException(
                "User", "email", userDetails.getUsername()))
                .getId();
    }

    @PostMapping("/paypal/create")
    public ResponseEntity<Map<String, Object>> createPayPalOrder(
            @Valid @RequestBody AppointmentPayPalOrderRequest request) {
        return ResponseEntity.ok(financeService.createAppointmentPayPalOrder(request));
    }

    @PostMapping("/paypal/capture")
    @Transactional
    public ResponseEntity<InvoiceResponse> capturePayPalPayment(
            @Valid @RequestBody AppointmentPayPalCaptureRequest request,
            @AuthenticationPrincipal UserDetails userDetails) {
        if (request.getDraftId() == null) {
            throw new BadRequestException("Home visit draftId is required");
        }

        String patientId = resolveUserId(userDetails);

        HomeVisitDraft draft = homeVisitDraftRepository.findById(request.getDraftId())
                .orElseThrow(() -> new BadRequestException("Home visit draft not found"));

        if (!draft.getPatientId().equals(patientId)) {
            throw new BadRequestException("Home visit draft does not belong to the current user");
        }

        InvoiceResponse invoice = financeService.captureAppointmentPayPalPayment(request);

        Integer appointmentId = invoice.getAppointmentId();
        if (appointmentId == null) {
            throw new BadRequestException("Appointment ID not found in invoice response");
        }

        HomeVisitBooking booking = HomeVisitBooking.builder()
                .doctorId(draft.getDoctorId())
                .scheduleId(draft.getScheduleId())
                .bookingDate(draft.getBookingDate())
                .startTime(draft.getStartTime())
                .endTime(draft.getEndTime())
                .appointmentId(appointmentId)
                .build();
        homeVisitBookingRepository.save(booking);

        homeVisitDraftRepository.delete(draft);

        return ResponseEntity.ok(invoice);
    }
}
