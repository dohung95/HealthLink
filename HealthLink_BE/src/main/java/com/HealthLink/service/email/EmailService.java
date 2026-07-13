package com.HealthLink.service.email;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

import jakarta.mail.MessagingException;
import jakarta.mail.internet.MimeMessage;

@Service
@RequiredArgsConstructor
@Slf4j
public class EmailService {

    private final JavaMailSender mailSender;

    @Value("${spring.mail.username:noreply@healthlink.com}")
    private String fromEmail;

    @Value("${app.name:HealthLink}")
    private String appName;

    @Value("${app.frontend-url:http://localhost:5173}")
    private String frontendUrl;

    // @Async - Temporarily disabled for debugging
    // gửi email khi được duyệt
    public void sendApprovalEmail(String toEmail, String recipientName, String registrationType, String password) {
        log.info("sendApprovalEmail called - to: {}, name: {}, type: {}", toEmail, recipientName, registrationType);

        if (mailSender == null) {
            log.error("ERROR: JavaMailSender is NULL - email cannot be sent!");
            return;
        }
        log.info("JavaMailSender is available: {}", mailSender.getClass().getName());

        String subject = appName + " - Registration Approved!";
        String content = buildApprovalEmailContent(recipientName, registrationType, toEmail, password);
        sendHtmlEmail(toEmail, subject, content);
    }

    // @Async - Temporarily disabled for debugging
    // gửi email khi bị từ chối
    public void sendRejectionEmail(String toEmail, String recipientName, String registrationType, String rejectionReason) {
        log.info("sendRejectionEmail called - to: {}, name: {}, type: {}", toEmail, recipientName, registrationType);
        String subject = appName + " - Registration Update";
        String content = buildRejectionEmailContent(recipientName, registrationType, rejectionReason);
        sendHtmlEmail(toEmail, subject, content);
    }

    // gửi email khi reset mật khẩu
    public void sendPasswordResetEmail(String toEmail, String recipientName, String token) {
        log.info("sendPasswordResetEmail called - to: {}", toEmail);
        String subject = appName + " - Password Reset Request";
        String resetLink = frontendUrl + "/reset-password?token=" + token;
        String content = buildPasswordResetEmailContent(recipientName, resetLink);
        sendHtmlEmail(toEmail, subject, content);
    }

    // gửi email thông báo đổi mật khẩu thành công
    public void sendPasswordResetSuccessEmail(String toEmail, String recipientName) {
        log.info("sendPasswordResetSuccessEmail called - to: {}", toEmail);
        String subject = appName + " - Password Changed Successfully";
        String loginLink = frontendUrl + "/login";
        String forgotPasswordLink = frontendUrl + "/forgot-password";
        String content = buildPasswordResetSuccessEmailContent(recipientName, loginLink, forgotPasswordLink);
        sendHtmlEmail(toEmail, subject, content);
    }


    // gửi email xác nhận thay đổi email
    public void sendVerificationEmail(String toEmail, String recipientName, String verificationCode) {
        log.info("sendVerificationEmail called - to: {}, name: {}", toEmail, recipientName);
        String subject = appName + " - Email Verification";
        String content = buildEmailVerificationContent(recipientName, verificationCode, toEmail);
        sendHtmlEmail(toEmail, subject, content);
    }

    /**
     * Gửi email xác nhận tài khoản sau khi đăng ký.
     * User click vào link trong email để kích hoạt tài khoản.
     */
    public void sendRegistrationConfirmEmail(String toEmail, String recipientName, String confirmToken) {
        log.info("sendRegistrationConfirmEmail called - to: {}", toEmail);
        String subject = appName + " - Confirm Your Account";
        String confirmLink = frontendUrl + "/confirm-email?token=" + confirmToken;
        String content = buildRegistrationConfirmEmailContent(recipientName, confirmLink);
        sendHtmlEmail(toEmail, subject, content);
    }

    public void sendPaypalEmailConfirmation(String toEmail, String recipientName, String confirmToken) {
        log.info("sendPaypalEmailConfirmation called - to: {}", toEmail);
        String subject = appName + " - Confirm Your PayPal Payout Email";
        String confirmLink = frontendUrl + "/confirm-paypal-email?token=" + confirmToken;
        String content = buildPaypalEmailConfirmationContent(recipientName, confirmLink);
        sendHtmlEmail(toEmail, subject, content);
    }

    public void sendAppointmentReminderEmail(String toEmail, String recipientName,
                                              String doctorName, String appointmentTime,
                                              String consultationType, int minutesBeforeStart) {
        log.info("sendAppointmentReminderEmail called - to: {}, minutesBeforeStart: {}",
                toEmail, minutesBeforeStart);
        String subject = appName + " - Appointment starts " + formatReminderTiming(minutesBeforeStart);
        String content = buildAppointmentReminderEmailContent(
                recipientName,
                doctorName,
                appointmentTime,
                consultationType,
                minutesBeforeStart
        );
        sendHtmlEmail(toEmail, subject, content);
    }

    // gửi email văn bản đơn giản (OTP, thông báo nhanh)
    public void sendSimpleMessage(String to, String subject, String text) {
        log.info("sendSimpleMessage called - to: {}", to);
        String htmlContent = "<html><body><p>" + text.replace("\n", "<br>") + "</p></body></html>";
        sendHtmlEmail(to, subject, htmlContent);
    }

    // gửi email thông qua JavaMailSender
    private void sendHtmlEmail(String to, String subject, String htmlContent) {
        log.info("=== START SENDING EMAIL ===");
        log.info("To: {}", to);
        log.info("Subject: {}", subject);
        log.info("From: {}", fromEmail);

        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");

            helper.setFrom(fromEmail);
            helper.setTo(to);
            helper.setSubject(subject);
            helper.setText(htmlContent, true);

            log.info("Attempting to send email...");
            mailSender.send(message);
            log.info("=== EMAIL SENT SUCCESSFULLY to: {} ===", to);
        } catch (MessagingException e) {
            log.error("=== EMAIL FAILED ===");
            log.error("MessagingException: {}", e.getMessage());
            e.printStackTrace();
        } catch (Exception e) {
            log.error("=== EMAIL FAILED (General Exception) ===");
            log.error("Exception type: {}", e.getClass().getName());
            log.error("Exception message: {}", e.getMessage());
            e.printStackTrace();
        }
    }


    // ============================== BUILD EMAIL CONTENT ==============================
    
    // build email khi được duyệt
    private String buildApprovalEmailContent(String recipientName, String registrationType, String email, String password) {
        String roleDisplay = "DOCTOR".equals(registrationType) ? "Doctor" : "Pharmacy Partner";

        String doctorScheduleReminder = "DOCTOR".equals(registrationType)
                ? """
                    <div class="warning-box">
                        <span>&#128197;</span>
                        <span><strong>Set up your work schedule now:</strong> your account has no schedule yet, so patients cannot find or book you (Online or Home Visit) until you add one. Please log in and go to <strong>Schedule</strong> to set your working hours right away.</span>
                    </div>
                    """
                : "";

        // Note: Use %% to escape % in CSS (linear-gradient percentages)
        return """
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <style>
                    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f4f7fa; }
                    .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.1); }
                    .header { background: linear-gradient(135deg, #00b09a 0%%, #007a6a 100%%); color: white; padding: 30px; text-align: center; }
                    .header h1 { margin: 0; font-size: 28px; }
                    .header p { margin: 10px 0 0; opacity: 0.9; }
                    .content { padding: 30px; }
                    .success-icon { text-align: center; margin-bottom: 20px; }
                    .success-icon span { display: inline-block; width: 80px; height: 80px; background: #dcfce7; border-radius: 50%%; line-height: 80px; font-size: 40px; }
                    .greeting { font-size: 18px; margin-bottom: 20px; }
                    .message { margin-bottom: 25px; }
                    .credentials-box { background: linear-gradient(135deg, #f0fdf4 0%%, #dcfce7 100%%); border: 2px solid #22c55e; border-radius: 12px; padding: 25px; margin: 25px 0; }
                    .credentials-box h3 { margin: 0 0 15px; color: #166534; display: flex; align-items: center; gap: 10px; }
                    .credential-row { display: flex; justify-content: space-between; padding: 12px 0; border-bottom: 1px dashed #bbf7d0; }
                    .credential-row:last-child { border-bottom: none; }
                    .credential-label { color: #64748b; font-weight: 500; }
                    .credential-value { color: #1e293b; font-weight: 600; font-family: monospace; font-size: 15px; }
                    .warning-box { background: #fef3c7; border: 1px solid #fcd34d; border-radius: 8px; padding: 15px; margin: 20px 0; display: flex; align-items: flex-start; gap: 10px; }
                    .warning-box span { color: #92400e; font-size: 14px; }
                    .cta-button { display: block; width: fit-content; margin: 25px auto; padding: 14px 35px; background: linear-gradient(135deg, #00b09a 0%%, #007a6a 100%%); color: white; text-decoration: none; border-radius: 8px; font-weight: 600; text-align: center; }
                    .footer { background: #f8fafc; padding: 20px; text-align: center; color: #64748b; font-size: 13px; border-top: 1px solid #e2e8f0; }
                    .footer a { color: #00b09a; text-decoration: none; }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1>%s</h1>
                        <p>Healthcare Management Platform</p>
                    </div>
                    <div class="content">
                        <div class="success-icon">
                            <span>&#10003;</span>
                        </div>
                        <p class="greeting">Dear <strong>%s</strong>,</p>
                        <div class="message">
                            <p>Congratulations! Your registration as a <strong>%s</strong> has been <strong style="color: #22c55e;">APPROVED</strong>.</p>
                            <p>You can now access your dashboard and start providing healthcare services through our platform.</p>
                        </div>
                        <div class="credentials-box">
                            <h3>&#128274; Your Login Credentials</h3>
                            <div class="credential-row">
                                <span class="credential-label">Email:</span>
                                <span class="credential-value">%s</span>
                            </div>
                            <div class="credential-row">
                                <span class="credential-label">Password:</span>
                                <span class="credential-value">%s</span>
                            </div>
                        </div>
                        <div class="warning-box">
                            <span>&#9888;</span>
                            <span><strong>Important:</strong> For security reasons, please change your password immediately after your first login.</span>
                        </div>
                        %s
                        <a href="%s/login" class="cta-button">Login to Your Account</a>
                    </div>
                    <div class="footer">
                        <p>This is an automated message from %s.</p>
                        <p>If you have any questions, please contact our <a href="mailto:support@healthlink.com">support team</a>.</p>
                        <p>&copy; 2024 %s. All rights reserved.</p>
                    </div>
                </div>
            </body>
            </html>
            """.formatted(appName, recipientName, roleDisplay, email, password, doctorScheduleReminder, frontendUrl, appName, appName);
    }

    // build email khi bị từ chối
    private String buildRejectionEmailContent(String recipientName, String registrationType, String rejectionReason) {
        String roleDisplay = "DOCTOR".equals(registrationType) ? "Doctor" : "Pharmacy Partner";

        // Note: Use %% to escape % in CSS (linear-gradient percentages, border-radius)
        return """
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <style>
                    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f4f7fa; }
                    .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.1); }
                    .header { background: linear-gradient(135deg, #64748b 0%%, #475569 100%%); color: white; padding: 30px; text-align: center; }
                    .header h1 { margin: 0; font-size: 28px; }
                    .header p { margin: 10px 0 0; opacity: 0.9; }
                    .content { padding: 30px; }
                    .status-icon { text-align: center; margin-bottom: 20px; }
                    .status-icon span { display: inline-block; width: 80px; height: 80px; background: #fee2e2; border-radius: 50%%; line-height: 80px; font-size: 40px; }
                    .greeting { font-size: 18px; margin-bottom: 20px; }
                    .message { margin-bottom: 25px; }
                    .reason-box { background: linear-gradient(135deg, #fef2f2 0%%, #fee2e2 100%%); border: 2px solid #ef4444; border-radius: 12px; padding: 25px; margin: 25px 0; }
                    .reason-box h3 { margin: 0 0 15px; color: #991b1b; display: flex; align-items: center; gap: 10px; }
                    .reason-text { color: #7f1d1d; background: white; padding: 15px; border-radius: 8px; border-left: 4px solid #ef4444; margin-top: 10px; }
                    .info-box { background: #eff6ff; border: 1px solid #93c5fd; border-radius: 8px; padding: 15px; margin: 20px 0; display: flex; align-items: flex-start; gap: 10px; }
                    .info-box span { color: #1e40af; font-size: 14px; }
                    .cta-button { display: block; width: fit-content; margin: 25px auto; padding: 14px 35px; background: linear-gradient(135deg, #6366f1 0%%, #4f46e5 100%%); color: white; text-decoration: none; border-radius: 8px; font-weight: 600; text-align: center; }
                    .footer { background: #f8fafc; padding: 20px; text-align: center; color: #64748b; font-size: 13px; border-top: 1px solid #e2e8f0; }
                    .footer a { color: #00b09a; text-decoration: none; }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1>%s</h1>
                        <p>Healthcare Management Platform</p>
                    </div>
                    <div class="content">
                        <div class="status-icon">
                            <span>&#10005;</span>
                        </div>
                        <p class="greeting">Dear <strong>%s</strong>,</p>
                        <div class="message">
                            <p>Thank you for your interest in joining %s as a <strong>%s</strong>.</p>
                            <p>After careful review, we regret to inform you that your registration has not been approved at this time.</p>
                        </div>
                        <div class="reason-box">
                            <h3>&#128221; Reason for Decision</h3>
                            <div class="reason-text">
                                %s
                            </div>
                        </div>
                        <div class="info-box">
                            <span>&#128161;</span>
                            <span>You are welcome to submit a new registration application after addressing the issues mentioned above. We encourage you to review and update your documentation accordingly.</span>
                        </div>
                        <a href="%s/register-as" class="cta-button">Submit New Application</a>
                    </div>
                    <div class="footer">
                        <p>This is an automated message from %s.</p>
                        <p>If you have any questions, please contact our <a href="mailto:support@healthlink.com">support team</a>.</p>
                        <p>&copy; 2024 %s. All rights reserved.</p>
                    </div>
                </div>
            </body>
            </html>
            """.formatted(appName, recipientName, appName, roleDisplay, rejectionReason, frontendUrl, appName, appName);
    }

    // build email khi reset mật khẩu
    private String buildPasswordResetEmailContent(String recipientName, String resetLink) {
        return """
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <style>
                    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f4f7fa; }
                    .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.1); }
                    .header { background: linear-gradient(135deg, #00b09a 0%%, #007a6a 100%%); color: white; padding: 30px; text-align: center; }
                    .header h1 { margin: 0; font-size: 28px; }
                    .header p { margin: 10px 0 0; opacity: 0.9; }
                    .content { padding: 30px; }
                    .icon { text-align: center; margin-bottom: 20px; }
                    .icon span { display: inline-block; width: 80px; height: 80px; background: #dbeafe; border-radius: 50%%; line-height: 80px; font-size: 40px; }
                    .greeting { font-size: 18px; margin-bottom: 20px; }
                    .message { margin-bottom: 25px; color: #475569; }
                    .cta-button { display: block; width: fit-content; margin: 25px auto; padding: 14px 40px; background: linear-gradient(135deg, #00b09a 0%%, #007a6a 100%%); color: white !important; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px; text-align: center; }
                    .warning-box { background: #fef3c7; border: 1px solid #fcd34d; border-radius: 8px; padding: 15px; margin: 20px 0; }
                    .warning-box span { color: #92400e; font-size: 14px; }
                    .token-box { background: #f1f5f9; border-radius: 8px; padding: 15px; margin: 20px 0; font-family: monospace; font-size: 13px; color: #475569; word-break: break-all; }
                    .footer { background: #f8fafc; padding: 20px; text-align: center; color: #64748b; font-size: 13px; border-top: 1px solid #e2e8f0; }
                    .footer a { color: #00b09a; text-decoration: none; }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1>%s</h1>
                        <p>Healthcare Management Platform</p>
                    </div>
                    <div class="content">
                        <div class="icon">
                            <span>&#128274;</span>
                        </div>
                        <p class="greeting">Dear <strong>%s</strong>,</p>
                        <div class="message">
                            <p>We received a request to reset the password for your account. Click the button below to set a new password.</p>
                            <p>This link will expire in <strong>15 minutes</strong>.</p>
                        </div>
                        <a href="%s" class="cta-button">Reset My Password</a>
                        <div class="warning-box">
                            <span>&#9888; <strong>Security Notice:</strong> If you did not request a password reset, please ignore this email. Your account is safe and your password has not been changed.</span>
                        </div>
                        <p style="color: #94a3b8; font-size: 13px;">Or copy and paste this link into your browser:</p>
                        <div class="token-box">%s</div>
                    </div>
                    <div class="footer">
                        <p>This is an automated message from %s.</p>
                        <p>If you have any questions, please contact our <a href="mailto:support@healthlink.com">support team</a>.</p>
                        <p>&copy; 2024 %s. All rights reserved.</p>
                    </div>
                </div>
            </body>
            </html>
            """.formatted(appName, recipientName, resetLink, resetLink, appName, appName);
    }

    // build email thông báo đổi mật khẩu thành công
    private String buildPasswordResetSuccessEmailContent(String recipientName, String loginLink, String forgotPasswordLink) {
        return """
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <style>
                    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f4f7fa; }
                    .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.1); }
                    .header { background: linear-gradient(135deg, #00b09a 0%%, #007a6a 100%%); color: white; padding: 30px; text-align: center; }
                    .header h1 { margin: 0; font-size: 28px; }
                    .header p { margin: 10px 0 0; opacity: 0.9; }
                    .content { padding: 30px; }
                    .icon { text-align: center; margin-bottom: 20px; }
                    .icon span { display: inline-block; width: 80px; height: 80px; background: #dcfce7; border-radius: 50%%; line-height: 80px; font-size: 40px; color: #22c55e; }
                    .greeting { font-size: 18px; margin-bottom: 20px; }
                    .message { margin-bottom: 10px; color: #475569; }
                    .cta-button { display: block; width: fit-content; margin: 20px auto; padding: 14px 40px; background: linear-gradient(135deg, #00b09a 0%%, #007a6a 100%%); color: white !important; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px; text-align: center; }
                    .divider { border: none; border-top: 1px solid #e2e8f0; margin: 24px 0; }
                    .warning-box { background: #fff7ed; border: 1px solid #fed7aa; border-radius: 12px; padding: 20px; margin: 8px 0 4px; }
                    .warning-box .warning-title { color: #92400e; font-size: 15px; font-weight: 700; margin-bottom: 8px; display: flex; align-items: center; gap: 8px; }
                    .warning-box .warning-body { color: #78350f; font-size: 14px; margin-bottom: 16px; line-height: 1.7; }
                    .danger-button { display: block; width: fit-content; margin: 0 auto; padding: 12px 32px; background: linear-gradient(135deg, #ef4444 0%%, #dc2626 100%%); color: white !important; text-decoration: none; border-radius: 8px; font-weight: 700; font-size: 15px; text-align: center; letter-spacing: 0.3px; }
                    .footer { background: #f8fafc; padding: 20px; text-align: center; color: #64748b; font-size: 13px; border-top: 1px solid #e2e8f0; }
                    .footer a { color: #00b09a; text-decoration: none; }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1>%s</h1>
                        <p>Healthcare Management Platform</p>
                    </div>
                    <div class="content">
                        <div class="icon">
                            <span>&#10003;</span>
                        </div>
                        <p class="greeting">Dear <strong>%s</strong>,</p>
                        <div class="message">
                            <p>This is a confirmation that the password for your account has been <strong>successfully changed</strong>.</p>
                            <p>You can now log in using your new password by clicking the button below.</p>
                        </div>
                        <a href="%s" class="cta-button">&#128274; Go to Login</a>
                        <hr class="divider">
                        <div class="warning-box">
                            <div class="warning-title">&#9888;&#65039; Didn't change your password?</div>
                            <div class="warning-body">
                                If you did NOT make this change, your account may have been compromised by an unauthorized person.
                                Act immediately by clicking the button below to reset your password and regain access to your account.
                            </div>
                            <a href="%s" class="danger-button">&#128680; Reset My Password Now</a>
                        </div>
                    </div>
                    <div class="footer">
                        <p>This is an automated message from %s.</p>
                        <p>If you need further help, please contact our <a href="mailto:support@healthlink.com">support team</a> immediately.</p>
                        <p>&copy; 2026 %s. All rights reserved.</p>
                    </div>
                </div>
            </body>
            </html>
            """.formatted(appName, recipientName, loginLink, forgotPasswordLink, appName, appName);
    }


    // build email khi xác nhận thay đổi email
    private String buildEmailVerificationContent(String recipientName, String verificationCode, String newEmail) {
        return String.format("""
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <style>
                    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; }
                    .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; box-shadow: 0 4px 20px rgba(0,0,0,0.1); overflow: hidden; }
                    .header { background: linear-gradient(135deg, #00b09a 0%%, #007a6a 100%%); color: white; padding: 30px; text-align: center; }
                    .header h1 { margin: 0; font-size: 28px; }
                    .content { padding: 30px; }
                    .code-box { background: #f0f9f8; border: 2px solid #00b09a; border-radius: 8px; padding: 20px; text-align: center; margin: 20px 0; }
                    .code { font-size: 32px; font-weight: bold; color: #00b09a; letter-spacing: 3px; font-family: monospace; }
                    .note { background: #fef3c7; border: 1px solid #fcd34d; border-radius: 8px; padding: 15px; margin: 20px 0; font-size: 14px; color: #92400e; }
                    .footer { background: #f8fafc; padding: 20px; text-align: center; color: #64748b; font-size: 13px; border-top: 1px solid #e2e8f0; }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1>Email Verification</h1>
                    </div>
                    <div class="content">
                        <p>Dear <strong>%s</strong>,</p>
                        <p>You have requested to change your email address to:<br><strong>%s</strong></p>
                        <p>To confirm this change, please use the verification code below:</p>
                        
                        <div class="code-box">
                            <div class="code">%s</div>
                        </div>
                        
                        <p>This code will expire in 24 hours.</p>
                        
                        <div class="note">
                            <strong>⚠️ Security Note:</strong> If you did not request this email change, please ignore this email or contact our support team immediately.
                        </div>
                        
                        <p>Best regards,<br><strong>HealthLink Team</strong></p>
                    </div>
                    <div class="footer">
                        <p>&copy; 2026 HealthLink. All rights reserved.</p>
                    </div>
                </div>
            </body>
            </html>
            """, recipientName, newEmail, verificationCode);
    }

    private String buildAppointmentReminderEmailContent(String recipientName, String doctorName,
                                                        String appointmentTime, String consultationType,
                                                        int minutesBeforeStart) {
        String timingText = formatReminderTiming(minutesBeforeStart);
        String appointmentsLink = frontendUrl + "/patient-dashboard/appointments";
        String safeConsultationType = consultationType == null || consultationType.isBlank()
                ? "Consultation"
                : consultationType;

        return """
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <style>
                    body { font-family: Arial, sans-serif; line-height: 1.6; color: #1f2937; background: #f6f8fb; margin: 0; padding: 24px; }
                    .container { max-width: 600px; margin: 0 auto; background: #ffffff; border: 1px solid #e5e7eb; border-radius: 10px; overflow: hidden; }
                    .header { background: #00b09a; color: #ffffff; padding: 24px; text-align: center; }
                    .content { padding: 24px; }
                    .details { background: #f0fdfa; border: 1px solid #99f6e4; border-radius: 8px; padding: 16px; margin: 18px 0; }
                    .button { display: inline-block; padding: 12px 20px; background: #00b09a; color: #ffffff !important; text-decoration: none; border-radius: 8px; font-weight: 600; }
                    .footer { padding: 16px 24px; color: #6b7280; font-size: 13px; border-top: 1px solid #e5e7eb; }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1>Appointment Reminder</h1>
                    </div>
                    <div class="content">
                        <p>Hello <strong>%s</strong>,</p>
                        <p>Your appointment starts <strong>%s</strong>. Please be ready for your consultation.</p>
                        <div class="details">
                            <p><strong>Doctor:</strong> Dr. %s</p>
                            <p><strong>Time:</strong> %s</p>
                            <p><strong>Consultation type:</strong> %s</p>
                        </div>
                        <p>
                            <a href="%s" class="button">Open Appointments</a>
                        </p>
                        <p>If the button does not work, copy this link into your browser:</p>
                        <p style="word-break: break-all; color: #4b5563;">%s</p>
                    </div>
                    <div class="footer">
                        <p>This is an automated message from HealthLink.</p>
                    </div>
                </div>
            </body>
            </html>
            """.formatted(
                recipientName,
                timingText,
                doctorName,
                appointmentTime,
                safeConsultationType,
                appointmentsLink,
                appointmentsLink
        );
    }

    private String formatReminderTiming(int minutesBeforeStart) {
        if (minutesBeforeStart == 60) {
            return "in 1 hour";
        }
        return "in " + minutesBeforeStart + " minutes";
    }

    // ==================================== END BUILD EMAIL CONTENT ===================================

    /** Tạo nội dung HTML email xác nhận tài khoản sau đăng ký */
    private String buildRegistrationConfirmEmailContent(String recipientName, String confirmLink) {
        return String.format("""
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <style>
                    body { font-family: 'Segoe UI', Arial, sans-serif; background: #f4f7fb; margin: 0; padding: 0; }
                    .wrapper { max-width: 600px; margin: 40px auto; background: #fff;
                               border-radius: 12px; box-shadow: 0 4px 20px rgba(0,0,0,0.08); overflow: hidden; }
                    .header { background: linear-gradient(135deg, #00b09a, #00d4b4); padding: 32px 24px; text-align: center; }
                    .header h1 { color: #fff; margin: 0; font-size: 24px; }
                    .body { padding: 32px 24px; color: #333; line-height: 1.7; }
                    .body h2 { color: #1a1a2e; font-size: 20px; margin-top: 0; }
                    .btn { display: inline-block; margin: 24px 0; padding: 14px 32px;
                           background: linear-gradient(135deg, #00b09a, #00d4b4);
                           color: #fff !important; text-decoration: none; border-radius: 8px;
                           font-size: 16px; font-weight: 600; }
                    .note { background: #fff8e1; border-left: 4px solid #ffc107;
                            padding: 12px 16px; border-radius: 4px; font-size: 13px; color: #666; margin-top: 20px; }
                    .footer { background: #f4f7fb; text-align: center; padding: 16px;
                              font-size: 12px; color: #999; }
                </style>
            </head>
            <body>
                <div class="wrapper">
                    <div class="header">
                        <h1>🏥 HealthLink</h1>
                    </div>
                    <div class="body">
                        <h2>Hello, %s! 👋</h2>
                        <p>Thank you for registering with <strong>HealthLink</strong>.</p>
                        <p>Please click the button below to confirm your email address and activate your account:</p>
                        <div style="text-align: center;">
                            <a href="%s" class="btn">✅ Confirm My Account</a>
                        </div>
                        <p>Or copy and paste this link into your browser:</p>
                        <p style="word-break: break-all; font-size: 13px; color: #555;">%s</p>
                        <div class="note">
                            ⚠️ This link will expire in <strong>24 hours</strong>.
                            If you did not create an account, please ignore this email.
                        </div>
                        <p>Best regards,<br><strong>HealthLink Team</strong></p>
                    </div>
                    <div class="footer">
                        <p>&copy; 2026 HealthLink. All rights reserved.</p>
                    </div>
                </div>
            </body>
            </html>
            """, recipientName, confirmLink, confirmLink);
    }

    private String buildPaypalEmailConfirmationContent(String recipientName, String confirmLink) {
        return String.format("""
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <style>
                    body { font-family: 'Segoe UI', Arial, sans-serif; background: #f4f7fb; margin: 0; padding: 0; }
                    .wrapper { max-width: 600px; margin: 40px auto; background: #fff;
                               border-radius: 12px; box-shadow: 0 4px 20px rgba(0,0,0,0.08); overflow: hidden; }
                    .header { background: linear-gradient(135deg, #0070ba, #1546a0); padding: 32px 24px; text-align: center; }
                    .header h1 { color: #fff; margin: 0; font-size: 24px; }
                    .body { padding: 32px 24px; color: #333; line-height: 1.7; }
                    .body h2 { color: #1a1a2e; font-size: 20px; margin-top: 0; }
                    .btn { display: inline-block; margin: 24px 0; padding: 14px 32px;
                           background: linear-gradient(135deg, #0070ba, #1546a0);
                           color: #fff !important; text-decoration: none; border-radius: 8px;
                           font-size: 16px; font-weight: 600; }
                    .note { background: #fff8e1; border-left: 4px solid #ffc107;
                            padding: 12px 16px; border-radius: 4px; font-size: 13px; color: #666; margin-top: 20px; }
                    .footer { background: #f4f7fb; text-align: center; padding: 16px;
                              font-size: 12px; color: #999; }
                </style>
            </head>
            <body>
                <div class="wrapper">
                    <div class="header">
                        <h1>💳 HealthLink</h1>
                    </div>
                    <div class="body">
                        <h2>Hello, %s! 👋</h2>
                        <p>This is the PayPal email you submitted during registration on <strong>HealthLink</strong>.</p>
                        <p>Please click the button below to confirm you own this PayPal address so it can be used to receive your payouts:</p>
                        <div style="text-align: center;">
                            <a href="%s" class="btn">✅ Confirm My PayPal Email</a>
                        </div>
                        <p>Or copy and paste this link into your browser:</p>
                        <p style="word-break: break-all; font-size: 13px; color: #555;">%s</p>
                        <div class="note">
                            ⚠️ This link will expire in <strong>24 hours</strong>.
                            Until confirmed, this email will not appear in your profile and payouts will not be available.
                            If you did not request this, please ignore this email.
                        </div>
                        <p>Best regards,<br><strong>HealthLink Team</strong></p>
                    </div>
                    <div class="footer">
                        <p>&copy; 2026 HealthLink. All rights reserved.</p>
                    </div>
                </div>
            </body>
            </html>
            """, recipientName, confirmLink, confirmLink);
    }

}
