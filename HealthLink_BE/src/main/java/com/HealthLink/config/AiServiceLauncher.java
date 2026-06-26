package com.HealthLink.config;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;

import java.io.File;
import java.net.HttpURLConnection;
import java.net.URI;
import java.nio.file.Paths;

/**
 * Tự động khởi động HealthLink_AI_Service (FastAPI, cổng 8097) khi backend start xong.
 *
 * Hành vi:
 *  - Chỉ chạy trên Windows (script khởi động là start.bat).
 *  - Probe /health trước: nếu AI service ĐÃ chạy (start tay hoặc lần restart BE trước
 *    đã mở) thì BỎ QUA -> tránh chạy trùng và khỏi reload model EasyOCR (chậm).
 *  - Mở AI service trong CỬA SỔ CONSOLE RIÊNG (detached). Cố ý không kill khi BE shutdown
 *    để AI service sống sót qua các lần restart BE (BE không có devtools, restart tay liên tục).
 *
 * Tắt bằng: ai.service.local.auto-start=false
 */
@Component
@Slf4j
public class AiServiceLauncher {

    @Value("${ai.service.local.auto-start:true}")
    private boolean autoStart;

    @Value("${ai.service.local.url:http://localhost:8097}")
    private String aiServiceUrl;

    /** Thư mục AI service, mặc định cạnh thư mục BE (BE chạy từ HealthLink_BE/). */
    @Value("${ai.service.local.dir:../HealthLink_AI_Service}")
    private String aiServiceDir;

    @Value("${ai.service.local.start-command:start.bat}")
    private String startCommand;

    @EventListener(ApplicationReadyEvent.class)
    public void launchAiService() {
        if (!autoStart) {
            log.info("[AI launcher] Tắt auto-start (ai.service.local.auto-start=false). Bỏ qua.");
            return;
        }

        if (!isWindows()) {
            log.warn("[AI launcher] Auto-start hiện chỉ hỗ trợ Windows. Hãy chạy AI service thủ công.");
            return;
        }

        if (isAiServiceUp()) {
            log.info("[AI launcher] AI service đã chạy tại {} — bỏ qua auto-start.", aiServiceUrl);
            return;
        }

        File dir = Paths.get(aiServiceDir).toAbsolutePath().normalize().toFile();
        File script = new File(dir, startCommand);
        if (!script.isFile()) {
            log.warn("[AI launcher] Không tìm thấy script khởi động: {} — không thể auto-start.",
                    script.getAbsolutePath());
            return;
        }

        try {
            // Mở cửa sổ console mới chạy `cmd /k start.bat` (giữ cửa sổ mở để xem log/lỗi).
            ProcessBuilder pb = new ProcessBuilder(
                    "cmd.exe", "/c", "start", "cmd", "/k", startCommand);
            pb.directory(dir); // cwd của cửa sổ mới = thư mục AI service
            pb.start();
            log.info("[AI launcher] Đã mở AI service trong cửa sổ mới: {} (cwd={})",
                    startCommand, dir.getAbsolutePath());
        } catch (Exception e) {
            log.error("[AI launcher] Auto-start AI service thất bại: {}", e.getMessage(), e);
        }
    }

    /** Kiểm tra nhanh AI service đã sống chưa qua endpoint /health. */
    private boolean isAiServiceUp() {
        HttpURLConnection conn = null;
        try {
            conn = (HttpURLConnection) URI.create(aiServiceUrl + "/health").toURL().openConnection();
            conn.setConnectTimeout(1500);
            conn.setReadTimeout(1500);
            conn.setRequestMethod("GET");
            return conn.getResponseCode() == 200;
        } catch (Exception e) {
            return false;
        } finally {
            if (conn != null) {
                conn.disconnect();
            }
        }
    }

    private boolean isWindows() {
        return System.getProperty("os.name", "").toLowerCase().contains("win");
    }
}
