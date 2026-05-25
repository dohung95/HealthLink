package com.HealthLink.service.notification;

import com.HealthLink.entity.User;
import com.HealthLink.entity.enums.NotificationType;
import com.HealthLink.repository.auth.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.List;

/**
 * Service helper để gửi notification cho tất cả Admin users.
 *
 * Sử dụng khi có các sự kiện quan trọng cần thông báo cho Admin:
 * - NEW_REGISTRATION: Doctor/Pharmacy đăng ký mới
 * - NEW_COMMISSION: Giao dịch hoa hồng mới
 * - Các sự kiện hệ thống khác
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class AdminNotificationHelper {

    private final NotificationService notificationService;
    private final UserRepository userRepository;

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
        // Lấy tất cả users có role Admin
        List<User> adminUsers = userRepository.findByRole_NameIgnoreCase("Admin");

        if (adminUsers.isEmpty()) {
            log.warn("No admin users found to send notification");
            return;
        }

        log.info("Sending {} notification to {} admin(s): {}", type, adminUsers.size(), title);

        for (User admin : adminUsers) {
            try {
                notificationService.sendWebSocketNotification(
                        admin,
                        type,
                        title,
                        message,
                        relatedId,
                        actionUrl
                );
            } catch (Exception e) {
                log.error("Failed to send notification to admin {}: {}",
                        admin.getEmail(), e.getMessage());
            }
        }
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
        String title = "New " + registrationType + " Registration";
        String message = String.format(
                "%s has submitted a registration request as %s. Please review.",
                applicantName, registrationType
        );
        String actionUrl = "/admin/registrations";

        notifyAllAdmins(
                NotificationType.NEW_REGISTRATION,
                title,
                message,
                registrationId,
                actionUrl
        );
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
        String title = "New Appointment Booked";
        String message = String.format(
                "%s has booked an appointment with Dr. %s",
                patientName, doctorName
        );
        String actionUrl = "/admin/appointments";

        notifyAllAdmins(
                NotificationType.NEW_APPOINTMENT,
                title,
                message,
                appointmentId,
                actionUrl
        );
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
        String title = "Appointment Cancelled";
        String message = reason != null
                ? String.format("Appointment #%d was cancelled by %s. Reason: %s",
                        appointmentId, cancelledBy, reason)
                : String.format("Appointment #%d was cancelled by %s",
                        appointmentId, cancelledBy);
        String actionUrl = "/admin/appointments";

        notifyAllAdmins(
                NotificationType.CANCEL_APPOINTMENT,
                title,
                message,
                appointmentId,
                actionUrl
        );
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
        String title = "New Commission Transaction";
        String message = String.format(
                "Commission of $%.2f recorded for %s",
                amount, recipientType
        );
        String actionUrl = "/admin/commission";

        notifyAllAdmins(
                NotificationType.NEW_COMMISSION,
                title,
                message,
                transactionId,
                actionUrl
        );
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
        String title = "Payment Received";
        String message = String.format(
                "Payment of $%.2f received from %s",
                amount, payerName
        );
        String actionUrl = "/admin";

        notifyAllAdmins(
                NotificationType.INVOICE_PAID,
                title,
                message,
                paymentId,
                actionUrl
        );
    }
}
