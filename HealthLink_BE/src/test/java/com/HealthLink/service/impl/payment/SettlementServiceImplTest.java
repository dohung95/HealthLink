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

    @InjectMocks
    private SettlementServiceImpl settlementService;

    @Test
    void withdrawDoctorEarnings_shouldRejectWhenRemainingBalanceIsTenOrLess() {
        Doctor doctor = doctor(new BigDecimal("20.00"));
        when(userRepository.findById("doctor-1")).thenReturn(Optional.of(doctor.getUser()));
        when(doctorRepository.findById("doctor-1")).thenReturn(Optional.of(doctor));

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
        when(settlementRepository.save(any(Settlement.class))).thenAnswer(invocation -> {
            Settlement settlement = invocation.getArgument(0);
            if (settlement.getSettlementId() == null) {
                settlement.setSettlementId(1);
            }
            return settlement;
        });
        when(payPalConfig.getClientId()).thenReturn("client-id");
        when(payPalConfig.getClientSecret()).thenReturn("client-secret");
        when(payPalConfig.getBaseUrl()).thenReturn("https://paypal.example");
        when(restTemplate.exchange(
                eq("https://paypal.example/v1/oauth2/token"),
                eq(HttpMethod.POST),
                any(HttpEntity.class),
                eq(Map.class)
        )).thenReturn(new ResponseEntity<>(Map.of("access_token", "token-1"), HttpStatus.OK));
        when(restTemplate.exchange(
                eq("https://paypal.example/v1/payments/payouts"),
                eq(HttpMethod.POST),
                any(HttpEntity.class),
                eq(Map.class)
        )).thenReturn(new ResponseEntity<>(
                Map.of("batch_header", Map.of(
                        "batch_status", "SUCCESS",
                        "payout_batch_id", "batch-1"
                )),
                HttpStatus.OK
        ));
        when(objectMapper.writeValueAsString(any())).thenReturn("{}");
        when(settlementRepository.findById(1)).thenAnswer(invocation -> Optional.of(Settlement.builder()
                .settlementId(1)
                .settlementNumber("STL-202605-00001")
                .recipientType("DOCTOR")
                .recipientId("doctor-1")
                .recipientName("Doctor One")
                .grossAmount(new BigDecimal("10.00"))
                .commissionAmount(BigDecimal.ZERO)
                .netAmount(new BigDecimal("10.00"))
                .status("COMPLETED")
                .paymentMethod("PAYPAL")
                .paypalEmail("doctor@example.com")
                .build()));

        SettlementRequest request = SettlementRequest.builder()
                .amount(new BigDecimal("10.00"))
                .paypalEmail("doctor@example.com")
                .build();

        var response = settlementService.withdrawDoctorEarnings("doctor-1", request);

        assertThat(response.getStatus()).isEqualTo("COMPLETED");
        verify(withdrawalSecurityService).verifyForWithdrawal(doctor.getUser(), null, PinPolicy.REQUIRED_IF_CONFIGURED);
        assertThat(doctor.getPendingSettlement()).isEqualByComparingTo("15.00");
        verify(doctorRepository).save(doctor);
        verify(notificationService).sendWebSocketNotification(
                eq(doctor.getUser()),
                eq(NotificationType.WALLET_BALANCE_CHANGED),
                eq("Wallet balance updated"),
                contains("withdrawal"),
                isNull(),
                eq("/profile-doctor?tab=wallet"),
                contains("\"delta\":\"-10.00\"")
        );
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
