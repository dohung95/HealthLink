package com.HealthLink.controller.ai;

import com.HealthLink.dto.ai.ClinicalContextPreviewResponse;
import com.HealthLink.dto.ai.ClinicalContextUpdateRequest;
import com.HealthLink.service.ai.ClinicalContextService;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;

import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.*;

class DoctorClinicalContextControllerTest {
    @Test
    void returnsUpdatedClinicalContextFromDoctorAuthorizedService() {
        ClinicalContextService service = mock(ClinicalContextService.class);
        ClinicalContextPreviewResponse expected = new ClinicalContextPreviewResponse(7, 1, false, List.of(), Map.of());
        ClinicalContextUpdateRequest request = new ClinicalContextUpdateRequest("synthetic symptoms", null, 0L);
        when(service.update(7, request)).thenReturn(expected);

        var response = new DoctorClinicalContextController(service).update(7, request);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).isEqualTo(expected);
    }
}
