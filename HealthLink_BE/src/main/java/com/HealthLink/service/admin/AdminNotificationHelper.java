package com.HealthLink.service.admin;

import com.HealthLink.entity.enums.NotificationType;
import com.HealthLink.entity.enums.NotificationPriority;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

/**
 * Service helper để gửi notification cho tất cả Admin users.
 * Package: com.HealthLink.service.admin
 *
 * REFACTORED: Delegate tất cả operations sang AdminNotificationService.
 * File này giữ lại để backward compatibility với các service đang sử dụng.
 *
 * Sử dụng khi có các sự kiện quan trọng cần thông báo cho Admin:
 *  - NEW_REGISTRATION: Doctor/Pharmacy đăng ký mới
 *  - NEW_APPOINTMENT: Lịch hẹn mới
 *  - CANCEL_APPOINTMENT: Lịch hẹn bị hủy
 *  - NEW_COMMISSION: Giao dịch hoa hồng mới
 *  - INVOICE_PAID: Thanh toán mới
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class AdminNotificationHelper {

    private final AdminNotificationService adminNotificationService;

    /**
     * Gửi notification đến tất cả Admin users.
     *
     * @param type      Loại notification
     * @param title     Tiêu đề
     * @param message   Nội dung
     * @param relatedId ID đối tượng liên quan (có thể null)
     * @param actionUrl URL để navigate khi click
     */
    public void notifyAllAdmins(NotificationType type, String title, String message,
                                 Integer relatedId, String actionUrl) {
        adminNotificationService.notifyAllAdmins(type, title, message, relatedId, actionUrl);
    }

    /**
     * Gửi notification đến tất cả Admin users với priority.
     *
     * @param type      Loại notification
     * @param title     Tiêu đề
     * @param message   Nội dung
     * @param priority  Mức độ ưu tiên
     * @param relatedId ID đối tượng liên quan
     * @param actionUrl URL để navigate khi click
     */
    public void notifyAllAdmins(NotificationType type, String title, String message,
                                 NotificationPriority priority, Integer relatedId, String actionUrl) {
        adminNotificationService.notifyAllAdmins(type, title, message, priority, relatedId, actionUrl);
    }

    /**
     * Thông báo có yêu cầu đăng ký mới từ Doctor/Pharmacy.
     *
     * @param registrationType "Doctor" hoặc "Pharmacy"
     * @param applicantName    Tên người đăng ký
     * @param registrationId   ID của yêu cầu đăng ký
     */
    public void notifyNewRegistration(String registrationType, String applicantName,
                                       Integer registrationId) {
        adminNotificationService.notifyNewRegistration(registrationType, applicantName, registrationId);
    }

    /**
     * Thông báo có lịch hẹn mới được đặt.
     *
     * @param patientName    Tên bệnh nhân
     * @param doctorName     Tên bác sĩ
     * @param appointmentId  ID lịch hẹn
     */
    public void notifyNewAppointment(String patientName, String doctorName,
                                      Integer appointmentId) {
        adminNotificationService.notifyNewAppointment(patientName, doctorName, appointmentId);
    }

    /**
     * Thông báo có lịch hẹn bị hủy.
     *
     * @param cancelledBy    "Patient" hoặc "Doctor"
     * @param appointmentId  ID lịch hẹn
     * @param reason         Lý do hủy (có thể null)
     */
    public void notifyAppointmentCancelled(String cancelledBy, Integer appointmentId,
                                            String reason) {
        adminNotificationService.notifyAppointmentCancelled(cancelledBy, appointmentId, reason);
    }

    /**
     * Thông báo có giao dịch hoa hồng mới.
     *
     * @param amount        Số tiền hoa hồng
     * @param recipientType "Doctor" hoặc "Pharmacy"
     * @param transactionId ID giao dịch
     */
    public void notifyNewCommission(Double amount, String recipientType,
                                     Integer transactionId) {
        adminNotificationService.notifyNewCommission(amount, recipientType, transactionId);
    }

    /**
     * Thông báo có thanh toán mới.
     *
     * @param amount    Số tiền
     * @param payerName Tên người thanh toán
     * @param paymentId ID thanh toán
     */
    public void notifyPaymentReceived(Double amount, String payerName,
                                       Integer paymentId) {
        adminNotificationService.notifyPaymentReceived(amount, payerName, paymentId);
    }
}
