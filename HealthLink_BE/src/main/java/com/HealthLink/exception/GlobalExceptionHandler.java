package com.HealthLink.exception;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.time.LocalDateTime;

import java.util.LinkedHashMap;
import java.util.Map;
import java.util.HashMap;

/**
 * Xử lý tập trung tất cả exception từ các Controller.
 * Trả về JSON thống nhất thay vì trang lỗi HTML mặc định.
 */
@RestControllerAdvice
public class GlobalExceptionHandler {

    /**
     * Xử lý lỗi không tìm thấy resource → HTTP 404.
     */
    @ExceptionHandler(ResourceNotFoundException.class)
    public ResponseEntity<Map<String, Object>> handleNotFound(ResourceNotFoundException ex) {
        return buildResponse(HttpStatus.NOT_FOUND, ex.getMessage());
    }

    /**
     * Xử lý lỗi nghiệp vụ → HTTP 400.
     */
    @ExceptionHandler(BusinessException.class)
    public ResponseEntity<Map<String, Object>> handleBusiness(BusinessException ex) {
        return buildResponse(HttpStatus.BAD_REQUEST, ex.getMessage());
    }
    
    // Các Exception chuyên biệt cho Payment/Invoices
    @ExceptionHandler(InvoiceNotFoundException.class)
    public ResponseEntity<Map<String, Object>> handleInvoiceNotFound(InvoiceNotFoundException ex) {
        return buildResponse(HttpStatus.NOT_FOUND, ex.getMessage());
    }

    @ExceptionHandler(PayPalIntegrationException.class)
    public ResponseEntity<Map<String, Object>> handlePayPalIntegration(PayPalIntegrationException ex) {
        return buildResponse(HttpStatus.BAD_GATEWAY, ex.getMessage());
    }
  
    @ExceptionHandler(InvalidStatusException.class)
    public ResponseEntity<Map<String, Object>> handleInvalidStatus(InvalidStatusException ex) {
        return buildResponse(HttpStatus.UNPROCESSABLE_ENTITY, ex.getMessage());
    }
    
    // Xử lý lỗi Validate dữ liệu đầu vào (@Valid)
    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<Map<String, Object>> handleValidation(MethodArgumentNotValidException ex) {
        Map<String, String> errors = new HashMap<>();
        ex.getBindingResult().getAllErrors().forEach(err -> {
            String field = ((FieldError) err).getField();
            errors.put(field, err.getDefaultMessage());
        });
        Map<String, Object> body = new HashMap<>();
        body.put("timestamp", LocalDateTime.now());
        body.put("status", HttpStatus.BAD_REQUEST.value());
        body.put("error", "Validation Failed");
        body.put("details", errors);
        return ResponseEntity.badRequest().body(body);
    }

    /**
     * Xử lý mọi lỗi không mong đợi → HTTP 500.
     */
    @ExceptionHandler(Exception.class)
    public ResponseEntity<Map<String, Object>> handleGeneral(Exception ex) {
        return buildResponse(HttpStatus.INTERNAL_SERVER_ERROR, "System Error: " + ex.getMessage());
    }
  
    /**
     * Tạo response body chuẩn.
     */
    private ResponseEntity<Map<String, Object>> buildResponse(HttpStatus status, String message) {
        Map<String, Object> body = new HashMap<>();
        body.put("timestamp", LocalDateTime.now());
        body.put("status", status.value());
        body.put("error", status.getReasonPhrase());
        body.put("message", message);
        return ResponseEntity.status(status).body(body);
    }

}
