package com.HealthLink.service.impl.payment;

import com.HealthLink.config.PayPalConfig;
import com.HealthLink.dto.payment.SettlementRequest;
import com.HealthLink.entity.Doctor;
import com.HealthLink.entity.Settlement;
import com.HealthLink.entity.User;
import com.HealthLink.entity.enums.NotificationType;
import com.HealthLink.exception.BadRequestException;
import com.HealthLink.repository.doctor.DoctorRepository;
import com.HealthLink.repository.payment.PaymentSettlementRepository;
import com.HealthLink.repository.pharmacy.PharmacyRepository;
import com.HealthLink.repository.auth.UserRepository;
import com.HealthLink.service.notification.NotificationService;
import com.HealthLink.service.payment.PartnerWithdrawalSecurityService;
import com.HealthLink.service.payment.PartnerWithdrawalSecurityService.PinPolicy;
import com.HealthLink.exception.PartnerPinException;
import com.HealthLink.integration.paypal.PayPalPayoutClient;
import com.HealthLink.integration.paypal.PayPalPayoutResult;
import com.HealthLink.service.payment.SettlementLifecycleService;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.client.RestTemplate;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.Map;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.contains;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;
import static org.mockito.Mockito.times;

@ExtendWith(MockitoExtension.class)
class SettlementServiceImplTest {

    @Mock
    private PayPalConfig payPalConfig;

    @Mock
    private RestTemplate restTemplate;

    @Mock
    private ObjectMapper objectMapper;

    @Mock
    private PaymentSettlementRepository settlementRepository;

    @Mock
    private DoctorRepository doctorRepository;

    @Mock
    private PharmacyRepository pharmacyRepository;

    @Mock
    private NotificationService notificationService;

    @Mock
    private UserRepository userRepository;

    @Mock
    private PartnerWithdrawalSecurityService withdrawalSecurityService;

    @Mock
    private SettlementLifecycleService lifecycleService;

    @Mock
    private PayPalPayoutClient payPalPayoutClient;

    @InjectMocks
    private SettlementServiceImpl settlementService;

    @Test
    void withdrawDoctorEarnings_shouldRejectWhenRemainingBalanceIsTenOrLess() {
        Doctor doctor = doctor(new BigDecimal("20.00"));
        when(userRepository.findById("doctor-1")).thenReturn(Optional.of(doctor.getUser()));
        when(doctorRepository.findById("doctor-1")).thenReturn(Optional.of(doctor));
        when(lifecycleService.beginWithdrawal(
                eq("DOCTOR"), eq("doctor-1"), eq("Doctor One"), eq(new BigDecimal("10.00")),
                eq("doctor@example.com"), isNull(), any()))
                .thenThrow(new BadRequestException("Remaining balance after withdrawal must be greater than $10.00"));
        SettlementRequest request = SettlementRequest.builder()
                .amount(new BigDecimal("10.00"))
                .paypalEmail("doctor@example.com")
                .build();

        assertThatThrownBy(() -> settlementService.withdrawDoctorEarnings("doctor-1", request))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("Remaining balance after withdrawal must be greater than $10.00");
    }

    @Test
    void withdrawDoctorEarnings_shouldPayOutWhenRemainingBalanceIsGreaterThanTen() throws Exception {
        Doctor doctor = doctor(new BigDecimal("25.00"));
        when(userRepository.findById("doctor-1")).thenReturn(Optional.of(doctor.getUser()));
        when(doctorRepository.findById("doctor-1")).thenReturn(Optional.of(doctor));
        Settlement reserved = Settlement.builder()
                .settlementId(1)
                .settlementNumber("STL-202605-00001")
                .recipientType("DOCTOR")
                .recipientId("doctor-1")
                .recipientName("Doctor One")
                .grossAmount(new BigDecimal("10.00"))
                .commissionAmount(BigDecimal.ZERO)
                .netAmount(new BigDecimal("10.00"))
                .status("PROCESSING")
                .paymentMethod("PAYPAL")
                .paypalEmail("doctor@example.com")
                .build();
        reserved.setPayoutSubmissionRequired(true);
        when(lifecycleService.beginWithdrawal(
                eq("DOCTOR"), eq("doctor-1"), eq("Doctor One"), eq(new BigDecimal("10.00")),
                eq("doctor@example.com"), isNull(), eq("request-1"))).thenReturn(reserved);
        when(payPalPayoutClient.createPayout(reserved))
                .thenReturn(PayPalPayoutResult.builder().payoutBatchId("batch-1").status("SUCCESS").build());
        when(lifecycleService.attachPayPalBatch(eq(1), any())).thenReturn(reserved);
        LocalDateTime reconciledAt = LocalDateTime.of(2026, 7, 16, 10, 30);
        Settlement completed = Settlement.builder().settlementId(1).settlementNumber(reserved.getSettlementNumber())
                .recipientType("DOCTOR").recipientId("doctor-1").recipientName("Doctor One")
                .grossAmount(new BigDecimal("10.00")).commissionAmount(BigDecimal.ZERO).netAmount(new BigDecimal("10.00"))
                .status("COMPLETED").paymentMethod("PAYPAL").paypalEmail("doctor@example.com")
                .payoutBatchId("batch-1").externalStatus("SUCCESS").lastReconciledAt(reconciledAt)
                .notes("persisted terminal result").build();
        when(lifecycleService.complete(1, "SUCCESS")).thenReturn(completed);

        SettlementRequest request = SettlementRequest.builder()
                .amount(new BigDecimal("10.00"))
                .paypalEmail("doctor@example.com")
                .requestId("request-1")
                .build();

        var response = settlementService.withdrawDoctorEarnings("doctor-1", request);

        assertThat(response.getStatus()).isEqualTo("COMPLETED");
        assertThat(response.getNotes()).isEqualTo("persisted terminal result");
        assertThat(response.getPayoutBatchId()).isEqualTo("batch-1");
        assertThat(response.getExternalStatus()).isEqualTo("SUCCESS");
        assertThat(response.getLastReconciledAt()).isEqualTo(reconciledAt);
        verify(withdrawalSecurityService).verifyForWithdrawal(doctor.getUser(), null, PinPolicy.REQUIRED_IF_CONFIGURED);
        verify(lifecycleService).attachPayPalBatch(1, PayPalPayoutResult.builder()
                .payoutBatchId("batch-1").status("SUCCESS").build());
        verify(lifecycleService).complete(1, "SUCCESS");
    }

    @Test
    void withdrawDoctorEarnings_returnsReservedBalanceOnlyForConfirmedTerminalFailure() {
        Doctor doctor = doctor(new BigDecimal("25.00"));
        Settlement reserved = Settlement.builder().settlementId(2).status("PROCESSING")
                .recipientType("DOCTOR").recipientId("doctor-1").recipientName("Doctor One")
                .grossAmount(new BigDecimal("10.00")).commissionAmount(BigDecimal.ZERO)
                .netAmount(new BigDecimal("10.00")).paymentMethod("PAYPAL")
                .paypalEmail("doctor@example.com").build();
        reserved.setPayoutSubmissionRequired(true);
        when(userRepository.findById("doctor-1")).thenReturn(Optional.of(doctor.getUser()));
        when(doctorRepository.findById("doctor-1")).thenReturn(Optional.of(doctor));
        when(lifecycleService.beginWithdrawal(any(), any(), any(), any(), any(), any(), any())).thenReturn(reserved);
        PayPalPayoutResult denied = PayPalPayoutResult.builder().payoutBatchId("batch-2").status("DENIED")
                .message("receiver blocked").build();
        when(payPalPayoutClient.createPayout(reserved)).thenReturn(denied);
        when(lifecycleService.attachPayPalBatch(2, denied)).thenReturn(reserved);
        when(lifecycleService.failAndReturn(2, "DENIED", "receiver blocked"))
                .thenReturn(Settlement.builder().settlementId(2).status("FAILED").build());

        var response = settlementService.withdrawDoctorEarnings("doctor-1", SettlementRequest.builder()
                .amount(new BigDecimal("10.00")).paypalEmail("doctor@example.com").build());

        assertThat(response.getStatus()).isEqualTo("FAILED");
        verify(lifecycleService).attachPayPalBatch(2, denied);
        verify(lifecycleService).failAndReturn(2, "DENIED", "receiver blocked");
        verify(lifecycleService, never()).complete(any(), any());
    }

    @Test
    void withdrawDoctorEarnings_keepsProcessingWhenPayPalOutcomeIsUnknown() {
        Doctor doctor = doctor(new BigDecimal("25.00"));
        Settlement reserved = Settlement.builder().settlementId(3).status("PROCESSING")
                .recipientType("DOCTOR").recipientId("doctor-1").recipientName("Doctor One")
                .grossAmount(new BigDecimal("10.00")).commissionAmount(BigDecimal.ZERO)
                .netAmount(new BigDecimal("10.00")).paymentMethod("PAYPAL")
                .paypalEmail("doctor@example.com").build();
        reserved.setPayoutSubmissionRequired(true);
        when(userRepository.findById("doctor-1")).thenReturn(Optional.of(doctor.getUser()));
        when(doctorRepository.findById("doctor-1")).thenReturn(Optional.of(doctor));
        when(lifecycleService.beginWithdrawal(any(), any(), any(), any(), any(), any(), any())).thenReturn(reserved);
        when(payPalPayoutClient.createPayout(reserved)).thenThrow(new RuntimeException("gateway timeout"));
        when(lifecycleService.attachPayPalBatch(eq(3), any())).thenReturn(reserved);

        var response = settlementService.withdrawDoctorEarnings("doctor-1", SettlementRequest.builder()
                .amount(new BigDecimal("10.00")).paypalEmail("doctor@example.com").build());

        assertThat(response.getStatus()).isEqualTo("PROCESSING");
        verify(lifecycleService).attachPayPalBatch(eq(3), org.mockito.ArgumentMatchers.argThat(result ->
                "UNKNOWN".equals(result.getStatus()) && result.getMessage().contains("gateway timeout")));
        verify(lifecycleService, never()).failAndReturn(any(), any(), any());
    }

    @Test
    void retryWithSameRequestIdDoesNotSubmitAnotherPayPalBatch() {
        Doctor doctor = doctor(new BigDecimal("25.00"));
        Settlement newlyReserved = Settlement.builder().settlementId(4).status("PROCESSING")
                .recipientType("DOCTOR").recipientId("doctor-1").netAmount(new BigDecimal("10.00")).build();
        newlyReserved.setPayoutSubmissionRequired(true);
        Settlement replay = Settlement.builder().settlementId(4).status("PROCESSING")
                .recipientType("DOCTOR").recipientId("doctor-1").netAmount(new BigDecimal("10.00"))
                .clientRequestId("request-retry").build();
        when(userRepository.findById("doctor-1")).thenReturn(Optional.of(doctor.getUser()));
        when(doctorRepository.findById("doctor-1")).thenReturn(Optional.of(doctor));
        when(lifecycleService.beginWithdrawal(any(), any(), any(), any(), any(), any(), eq("request-retry")))
                .thenReturn(newlyReserved, replay);
        PayPalPayoutResult pending = PayPalPayoutResult.builder().payoutBatchId("batch-4").status("PENDING").build();
        when(payPalPayoutClient.createPayout(newlyReserved)).thenReturn(pending);
        when(lifecycleService.attachPayPalBatch(4, pending)).thenReturn(newlyReserved);
        SettlementRequest request = SettlementRequest.builder().amount(new BigDecimal("10.00"))
                .paypalEmail("doctor@example.com").requestId("request-retry").build();

        settlementService.withdrawDoctorEarnings("doctor-1", request);
        settlementService.withdrawDoctorEarnings("doctor-1", request);

        verify(payPalPayoutClient, times(1)).createPayout(newlyReserved);
        verify(lifecycleService, times(1)).attachPayPalBatch(4, pending);
    }

    @Test
    void withdrawPharmacyEarnings_blocksBeforeLoadingBalanceOrCreatingSettlementWhenPinRequired() {
        User pharmacyUser = User.builder().id("pharmacy-1").build();
        when(userRepository.findById("pharmacy-1")).thenReturn(Optional.of(pharmacyUser));
        doThrow(PartnerPinException.required()).when(withdrawalSecurityService)
                .verifyForWithdrawal(pharmacyUser, null, PinPolicy.REQUIRED);
        SettlementRequest request = SettlementRequest.builder().amount(new BigDecimal("10.00"))
                .paypalEmail("pharmacy@example.com").build();

        assertThatThrownBy(() -> settlementService.withdrawPharmacyEarnings("pharmacy-1", request))
                .isInstanceOf(PartnerPinException.class);

        verifyNoInteractions(pharmacyRepository, settlementRepository, payPalConfig, restTemplate);
    }

    private Doctor doctor(BigDecimal pendingSettlement) {
        return Doctor.builder()
                .doctorId("doctor-1")
                .fullName("Doctor One")
                .user(User.builder().id("doctor-user-1").build())
                .paypalEmail("doctor@example.com")
                .pendingSettlement(pendingSettlement)
                .totalEarnings(new BigDecimal("100.00"))
                .build();
    }
}
