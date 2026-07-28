package com.HealthLink.service.ai;

import com.HealthLink.repository.ai.LabObservationRepository;
import com.HealthLink.repository.ai.LabObservationRevisionRepository;
import com.HealthLink.repository.ai.LabReportRepository;
import com.HealthLink.utility.DoctorSecurityUtils;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.runner.ApplicationContextRunner;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;

class LabReportVerificationServiceWiringTest {
    private final ApplicationContextRunner contextRunner = new ApplicationContextRunner()
            .withBean(LabReportRepository.class, () -> mock(LabReportRepository.class))
            .withBean(LabObservationRepository.class, () -> mock(LabObservationRepository.class))
            .withBean(DoctorSecurityUtils.class, () -> mock(DoctorSecurityUtils.class))
            .withBean(LabObservationRevisionRepository.class, () -> mock(LabObservationRevisionRepository.class))
            .withBean(AiJobService.class, () -> mock(AiJobService.class))
            .withBean(LabReportStatusPublisher.class, () -> mock(LabReportStatusPublisher.class))
            .withBean(ObjectMapper.class, ObjectMapper::new)
            .withBean(LabReportVerificationService.class);

    @Test
    void choosesTheProductionConstructorForSpringDependencyInjection() {
        contextRunner.run(context -> assertThat(context).hasSingleBean(LabReportVerificationService.class));
    }
}
