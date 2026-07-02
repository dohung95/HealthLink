package com.HealthLink.service.impl.pharmacy;

import com.HealthLink.dto.pharmacy.PharmacyProfileResponse;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.HealthLink.entity.Pharmacy;
import com.HealthLink.entity.User;
import com.HealthLink.repository.auth.EmailVerificationTokenRepository;
import com.HealthLink.repository.auth.UserRepository;
import com.HealthLink.repository.pharmacy.PharmacyRepository;
import com.HealthLink.service.email.EmailService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class PharmacyProfileServiceImplTest {

    @Mock
    private PharmacyRepository pharmacyRepository;

    @Mock
    private UserRepository userRepository;

    @Mock
    private EmailVerificationTokenRepository emailVerificationTokenRepository;

    @Mock
    private EmailService emailService;

    @Mock
    private PasswordEncoder passwordEncoder;

    @InjectMocks
    private PharmacyProfileServiceImpl pharmacyProfileService;

    private Pharmacy pharmacy(String id, boolean active, boolean verified, boolean deliveryAvailable) {
        return Pharmacy.builder()
                .pharmacyId(id)
                .name("Pharmacy " + id)
                .active(active)
                .verified(verified)
                .isOnline(true)
                .deliveryAvailable(deliveryAvailable)
                .user(User.builder().id(id).email(id + "@test.com").build())
                .build();
    }

    @Test
    void getActiveVerifiedPharmacies_shouldReturnOnlyActiveAndVerified() {
        Pharmacy activeVerified = pharmacy("p1", true, true, false);
        Pharmacy inactive = pharmacy("p2", false, true, false);
        Pharmacy unverified = pharmacy("p3", true, false, false);
        when(pharmacyRepository.findByActiveTrueAndVerifiedTrueAndIsOnlineTrue())
                .thenReturn(List.of(activeVerified));

        List<PharmacyProfileResponse> result = pharmacyProfileService.getActiveVerifiedPharmacies(false);

        assertThat(result).hasSize(1);
        assertThat(result.get(0).getPharmacyId()).isEqualTo("p1");
    }

    @Test
    void getActiveVerifiedPharmacies_withDeliveryOnly_shouldFilterByDelivery() {
        Pharmacy withDelivery = pharmacy("p1", true, true, true);
        Pharmacy noDelivery = pharmacy("p2", true, true, false);
        when(pharmacyRepository.findByActiveTrueAndVerifiedTrueAndIsOnlineTrueAndDeliveryAvailableTrue())
                .thenReturn(List.of(withDelivery));

        List<PharmacyProfileResponse> result = pharmacyProfileService.getActiveVerifiedPharmacies(true);

        assertThat(result).hasSize(1);
        assertThat(result.get(0).getPharmacyId()).isEqualTo("p1");
        assertThat(result.get(0).isDeliveryAvailable()).isTrue();
    }

    @Test
    void getActiveVerifiedPharmacies_whenNone_shouldReturnEmpty() {
        List<PharmacyProfileResponse> result = pharmacyProfileService.getActiveVerifiedPharmacies(false);

        assertThat(result).isEmpty();
    }

    @Test
    void pharmacyProfileResponse_shouldSerializeOnlineStatusAsIsOnlineOnly() throws Exception {
        ObjectMapper objectMapper = new ObjectMapper();
        PharmacyProfileResponse response = PharmacyProfileResponse.builder()
                .pharmacyId("pharmacy-1")
                .name("Pharmacy pharmacy-1")
                .isOnline(true)
                .build();

        JsonNode json = objectMapper.readTree(objectMapper.writeValueAsString(response));

        assertThat(json.path("isOnline").asBoolean()).isTrue();
        assertThat(json.has("online")).isFalse();
    }
}
