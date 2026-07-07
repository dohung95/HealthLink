package com.HealthLink.config;

import jakarta.servlet.FilterChain;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.junit.jupiter.MockitoExtension;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class HttpRequestLoggingFilterTest {

    @InjectMocks
    private HttpRequestLoggingFilter filter;

    @Test
    void shouldNotFilter_shouldSkipUploads() {
        HttpServletRequest req = mock(HttpServletRequest.class);
        when(req.getRequestURI()).thenReturn("/uploads/some-file.pdf");
        assertThat(filter.shouldNotFilter(req)).isTrue();
    }

    @Test
    void shouldNotFilter_shouldSkipSwagger() {
        HttpServletRequest req = mock(HttpServletRequest.class);
        when(req.getRequestURI()).thenReturn("/swagger-ui/index.html");
        assertThat(filter.shouldNotFilter(req)).isTrue();
    }

    @Test
    void shouldNotFilter_shouldSkipApiDocs() {
        HttpServletRequest req = mock(HttpServletRequest.class);
        when(req.getRequestURI()).thenReturn("/v3/api-docs");
        assertThat(filter.shouldNotFilter(req)).isTrue();
    }

    @Test
    void shouldNotFilter_shouldSkipWebSocket() {
        HttpServletRequest req = mock(HttpServletRequest.class);
        when(req.getRequestURI()).thenReturn("/ws/chat");
        assertThat(filter.shouldNotFilter(req)).isTrue();
    }

    @Test
    void shouldNotFilter_shouldAllowApiPaths() {
        HttpServletRequest req = mock(HttpServletRequest.class);
        when(req.getRequestURI()).thenReturn("/api/notifications");
        assertThat(filter.shouldNotFilter(req)).isFalse();
    }

    @Test
    void doFilter_shouldInvokeChain() throws Exception {
        HttpServletRequest req = mock(HttpServletRequest.class);
        HttpServletResponse res = mock(HttpServletResponse.class);
        FilterChain chain = mock(FilterChain.class);

        when(req.getRequestURI()).thenReturn("/api/test");
        when(req.getMethod()).thenReturn("GET");
        when(req.getAttribute(anyString())).thenReturn(System.currentTimeMillis());
        when(res.getStatus()).thenReturn(200);

        filter.doFilterInternal(req, res, chain);

        verify(chain).doFilter(req, res);
    }
}
