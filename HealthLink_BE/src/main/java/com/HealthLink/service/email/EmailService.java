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
    public void sendRejectionEmail(String toEmail, String recipientName, String registrationType, String rejectionReason) {
        log.info("sendRejectionEmail called - to: {}, name: {}, type: {}", toEmail, recipientName, registrationType);
        String subject = appName + " - Registration Update";
        String content = buildRejectionEmailContent(recipientName, registrationType, rejectionReason);
        sendHtmlEmail(toEmail, subject, content);
    }

    public void sendPasswordResetEmail(String toEmail, String recipientName, String token) {
        log.info("sendPasswordResetEmail called - to: {}", toEmail);
        String subject = appName + " - Password Reset Request";
        String resetLink = frontendUrl + "/reset-password?token=" + token;
        String content = buildPasswordResetEmailContent(recipientName, resetLink);
        sendHtmlEmail(toEmail, subject, content);
    }

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

    private String buildApprovalEmailContent(String recipientName, String registrationType, String email, String password) {
        String roleDisplay = "DOCTOR".equals(registrationType) ? "Doctor" : "Pharmacy Partner";

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
            """.formatted(appName, recipientName, roleDisplay, email, password, frontendUrl, appName, appName);
    }

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
}
