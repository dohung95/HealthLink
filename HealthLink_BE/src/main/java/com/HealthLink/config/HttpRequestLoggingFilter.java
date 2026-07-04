package com.HealthLink.config;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.slf4j.MDC;
import org.springframework.core.annotation.Order;
import org.springframework.lang.NonNull;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

@Component
@Order(2)
public class HttpRequestLoggingFilter extends OncePerRequestFilter {

    private static final Logger log = LoggerFactory.getLogger(HttpRequestLoggingFilter.class);
    private static final String START_TIME_ATTR = "HttpRequestLoggingFilter.startTime";

    @Override
    protected void doFilterInternal(@NonNull HttpServletRequest request,
                                    @NonNull HttpServletResponse response,
                                    @NonNull FilterChain chain)
            throws ServletException, IOException {

        request.setAttribute(START_TIME_ATTR, System.currentTimeMillis());

        try {
            chain.doFilter(request, response);
        } finally {
            long duration = System.currentTimeMillis() - (long) request.getAttribute(START_TIME_ATTR);
            int status = response.getStatus();
            String method = request.getMethod();
            String path = request.getRequestURI();

            String userId = MDC.get("userId");
            String userRole = MDC.get("userRole");

            StringBuilder msg = new StringBuilder(160);
            msg.append("request completed")
                    .append(" method=").append(method)
                    .append(" path=").append(path)
                    .append(" status=").append(status)
                    .append(" durationMs=").append(duration);
            if (userId != null) {
                msg.append(" userId=").append(userId);
            }
            if (userRole != null) {
                msg.append(" userRole=").append(userRole);
            }

            if (status >= 500) {
                log.error(msg.toString());
            } else if (status >= 400) {
                log.warn(msg.toString());
            } else {
                log.info(msg.toString());
            }
        }
    }

    @Override
    protected boolean shouldNotFilter(@NonNull HttpServletRequest request) {
        String path = request.getRequestURI();
        return path.startsWith("/uploads/")
                || path.startsWith("/swagger-ui")
                || path.startsWith("/v3/api-docs")
                || path.startsWith("/ws/");
    }
}
