package com.HealthLink.service.admin;

import com.HealthLink.dto.admin.AdminAuditLogDto;
import com.HealthLink.repository.doctor.DoctorRepository;
import lombok.RequiredArgsConstructor;
import org.apache.poi.ss.usermodel.BorderStyle;
import org.apache.poi.ss.usermodel.Cell;
import org.apache.poi.ss.usermodel.CellStyle;
import org.apache.poi.ss.usermodel.FillPatternType;
import org.apache.poi.ss.usermodel.Font;
import org.apache.poi.ss.usermodel.HorizontalAlignment;
import org.apache.poi.ss.usermodel.IndexedColors;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.ss.util.CellRangeAddress;
import org.apache.poi.xssf.usermodel.XSSFCellStyle;
import org.apache.poi.xssf.usermodel.XSSFColor;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.awt.Color;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.UncheckedIOException;
import java.nio.charset.StandardCharsets;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Map;

/**
 * Builds a downloadable CSV/XLSX export of the Admin Audit Log, merging the
 * Schedule-domain log (AdminScheduleAuditLog) and the general Admin log
 * (AdminAuditLog) the same way the Audit Log screen does, so an export always
 * matches what's currently on screen for the same filters.
 */
@Service
@RequiredArgsConstructor
public class AuditLogExportService {

    private static final DateTimeFormatter TIME_FORMAT = DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm");
    private static final DateTimeFormatter GENERATED_AT_FORMAT = DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm:ss");
    private static final String[] HEADERS = {
            "TIME", "SOURCE", "CATEGORY", "ACTION", "ADMIN USER", "ADMIN EMAIL",
            "TARGET", "DESCRIPTION", "REASON", "IP ADDRESS"
    };
    private static final Color BRAND_COLOR = new Color(0, 160, 139); // matches the app's teal (#00A08B)
    private static final Color ZEBRA_COLOR = new Color(244, 247, 246);
    private static final Map<String, String> SOURCE_LABELS = Map.of(
            "ALL", "All Logs", "SCHEDULE", "Schedule", "ADMIN", "Admin Actions"
    );

    private final AdminAuditLogService adminAuditLogService;
    private final AdminScheduleService adminScheduleService;
    private final DoctorRepository doctorRepository;

    @Transactional(readOnly = true)
    public byte[] export(String source, String category, String doctorId, String actionType,
                          LocalDateTime startTime, LocalDateTime endTime, String format) {
        List<ExportRow> rows = collectRows(source, category, doctorId, actionType, startTime, endTime);
        rows.sort(Comparator.comparing(ExportRow::createdAt, Comparator.nullsLast(Comparator.reverseOrder())));

        if ("XLSX".equalsIgnoreCase(format)) {
            String filterSummary = buildFilterSummary(source, category, doctorId, actionType, startTime, endTime);
            return buildXlsx(rows, filterSummary);
        }
        return buildCsv(rows);
    }

    private List<ExportRow> collectRows(String source, String category, String doctorId, String actionType,
                                         LocalDateTime startTime, LocalDateTime endTime) {
        boolean categoryActive = category != null && !category.isBlank();
        boolean doctorActive = doctorId != null && !doctorId.isBlank();

        // Schedule logs have no Category — if one is selected on the "All" tab they can
        // never match it, so they're excluded rather than merged in unfiltered.
        boolean includeSchedule = "SCHEDULE".equalsIgnoreCase(source)
                || ("ALL".equalsIgnoreCase(source) && !categoryActive);
        boolean includeAdmin = "ADMIN".equalsIgnoreCase(source) || "ALL".equalsIgnoreCase(source);

        List<ExportRow> rows = new ArrayList<>();

        if (includeSchedule) {
            adminScheduleService.getAllAuditLogsForExport(doctorId, actionType, startTime, endTime)
                    .forEach(dto -> rows.add(ExportRow.fromSchedule(dto)));
        }

        if (includeAdmin) {
            // Admin logs have no dedicated doctorId field — a doctor-targeted log stores
            // the doctor's real id as a generic target (targetType=DOCTOR, targetId=doctorId).
            String targetType = doctorActive ? "DOCTOR" : null;
            String targetId = doctorActive ? doctorId : null;
            adminAuditLogService.getAllLogsForExport(category, actionType, targetType, targetId, startTime, endTime)
                    .forEach(dto -> rows.add(ExportRow.fromAdmin(dto)));
        }

        return rows;
    }

    private String buildFilterSummary(String source, String category, String doctorId, String actionType,
                                       LocalDateTime startTime, LocalDateTime endTime) {
        String sourceLabel = SOURCE_LABELS.getOrDefault(source == null ? "" : source.toUpperCase(), "All Logs");
        String categoryLabel = (category == null || category.isBlank())
                ? "All Categories" : AdminAuditLogDto.getCategoryDisplay(category);
        String doctorLabel = (doctorId == null || doctorId.isBlank())
                ? "All Doctors"
                : doctorRepository.findById(doctorId).map(d -> d.getFullName()).orElse(doctorId);
        String actionLabel = (actionType == null || actionType.isBlank())
                ? "All Actions" : AdminAuditLogDto.getActionTypeDisplay(actionType);
        String dateRangeLabel = (startTime == null && endTime == null)
                ? "All time"
                : (formatDateOnly(startTime) + " → " + formatDateOnly(endTime));

        return "Source: " + sourceLabel + "   |   Category: " + categoryLabel + "   |   Doctor: " + doctorLabel
                + "   |   Action: " + actionLabel + "   |   Date Range: " + dateRangeLabel;
    }

    private String formatDateOnly(LocalDateTime value) {
        return value != null ? value.toLocalDate().toString() : "…";
    }

    private byte[] buildCsv(List<ExportRow> rows) {
        StringBuilder sb = new StringBuilder();
        sb.append((char) 0xFEFF); // UTF-8 BOM so Excel renders Vietnamese text correctly
        appendCsvRow(sb, HEADERS);
        for (ExportRow r : rows) {
            appendCsvRow(sb, new String[]{
                    r.createdAt() != null ? r.createdAt().format(TIME_FORMAT) : "",
                    r.source(), r.category(), r.action(), r.adminUserName(), r.adminEmail(),
                    r.target(), r.description(), r.reason(), r.ipAddress()
            });
        }
        return sb.toString().getBytes(StandardCharsets.UTF_8);
    }

    private void appendCsvRow(StringBuilder sb, String[] values) {
        for (int i = 0; i < values.length; i++) {
            if (i > 0) sb.append(',');
            sb.append(csvEscape(values[i]));
        }
        sb.append("\r\n");
    }

    private String csvEscape(String value) {
        if (value == null || value.isEmpty()) return "";
        boolean needsQuote = value.indexOf(',') >= 0 || value.indexOf('"') >= 0
                || value.indexOf('\n') >= 0 || value.indexOf('\r') >= 0;
        String escaped = value.replace("\"", "\"\"");
        return needsQuote ? "\"" + escaped + "\"" : escaped;
    }

    private byte[] buildXlsx(List<ExportRow> rows, String filterSummary) {
        try (XSSFWorkbook workbook = new XSSFWorkbook(); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            Sheet sheet = workbook.createSheet("Audit Log");
            int lastCol = HEADERS.length - 1;

            CellStyle titleStyle = titleStyle(workbook);
            CellStyle subtitleStyle = subtitleStyle(workbook);
            CellStyle headerStyle = headerStyle(workbook);
            CellStyle bodyStyle = bodyStyle(workbook, false);
            CellStyle bodyStyleZebra = bodyStyle(workbook, true);

            // Row 0: report title
            Row titleRow = sheet.createRow(0);
            titleRow.setHeightInPoints(22);
            Cell titleCell = titleRow.createCell(0);
            titleCell.setCellValue("HealthLink — Audit Log Export");
            titleCell.setCellStyle(titleStyle);
            sheet.addMergedRegion(new CellRangeAddress(0, 0, 0, lastCol));

            // Row 1: generated-at + applied filters, so the file is self-describing once downloaded
            Row subtitleRow = sheet.createRow(1);
            Cell subtitleCell = subtitleRow.createCell(0);
            subtitleCell.setCellValue("Generated " + LocalDateTime.now().format(GENERATED_AT_FORMAT) + "   |   " + filterSummary);
            subtitleCell.setCellStyle(subtitleStyle);
            sheet.addMergedRegion(new CellRangeAddress(1, 1, 0, lastCol));

            // Row 2: spacer
            sheet.createRow(2).setHeightInPoints(6);

            // Row 3: column headers
            int headerRowIdx = 3;
            Row headerRow = sheet.createRow(headerRowIdx);
            headerRow.setHeightInPoints(20);
            for (int i = 0; i < HEADERS.length; i++) {
                Cell cell = headerRow.createCell(i);
                cell.setCellValue(HEADERS[i]);
                cell.setCellStyle(headerStyle);
            }

            int rowIdx = headerRowIdx + 1;
            int dataIdx = 0;
            for (ExportRow r : rows) {
                Row row = sheet.createRow(rowIdx++);
                CellStyle style = (dataIdx++ % 2 == 1) ? bodyStyleZebra : bodyStyle;
                setCell(row, 0, r.createdAt() != null ? r.createdAt().format(TIME_FORMAT) : "", style);
                setCell(row, 1, r.source(), style);
                setCell(row, 2, r.category(), style);
                setCell(row, 3, r.action(), style);
                setCell(row, 4, r.adminUserName(), style);
                setCell(row, 5, r.adminEmail(), style);
                setCell(row, 6, r.target(), style);
                setCell(row, 7, r.description(), style);
                setCell(row, 8, r.reason(), style);
                setCell(row, 9, r.ipAddress(), style);
            }

            // Column widths: auto-size from content (autoSizeColumn ignores merged cells by
            // default, so the wide title/subtitle rows above don't skew this), capped so a
            // long Description/Reason can't blow the sheet out unreasonably wide.
            for (int i = 0; i < HEADERS.length; i++) {
                sheet.autoSizeColumn(i);
                int capped = Math.min(sheet.getColumnWidth(i) + 512, 60 * 256);
                sheet.setColumnWidth(i, capped);
            }

            int lastRow = rowIdx - 1;
            if (lastRow >= headerRowIdx) {
                sheet.setAutoFilter(new CellRangeAddress(headerRowIdx, lastRow, 0, lastCol));
            }
            // Keep the title/header block visible while scrolling through data
            sheet.createFreezePane(0, headerRowIdx + 1);

            workbook.write(out);
            return out.toByteArray();
        } catch (IOException e) {
            throw new UncheckedIOException("Failed to build audit log XLSX export", e);
        }
    }

    private CellStyle titleStyle(XSSFWorkbook workbook) {
        Font font = workbook.createFont();
        font.setBold(true);
        font.setFontHeightInPoints((short) 14);
        font.setColor(IndexedColors.WHITE.getIndex());
        XSSFCellStyle style = workbook.createCellStyle();
        style.setFont(font);
        style.setFillForegroundColor(new XSSFColor(BRAND_COLOR, null));
        style.setFillPattern(FillPatternType.SOLID_FOREGROUND);
        style.setVerticalAlignment(org.apache.poi.ss.usermodel.VerticalAlignment.CENTER);
        style.setAlignment(HorizontalAlignment.LEFT);
        return style;
    }

    private CellStyle subtitleStyle(XSSFWorkbook workbook) {
        Font font = workbook.createFont();
        font.setItalic(true);
        font.setFontHeightInPoints((short) 9);
        font.setColor(IndexedColors.GREY_50_PERCENT.getIndex());
        CellStyle style = workbook.createCellStyle();
        style.setFont(font);
        return style;
    }

    private CellStyle headerStyle(XSSFWorkbook workbook) {
        Font font = workbook.createFont();
        font.setBold(true);
        font.setColor(IndexedColors.WHITE.getIndex());
        XSSFCellStyle style = workbook.createCellStyle();
        style.setFont(font);
        style.setFillForegroundColor(new XSSFColor(BRAND_COLOR, null));
        style.setFillPattern(FillPatternType.SOLID_FOREGROUND);
        style.setAlignment(HorizontalAlignment.CENTER);
        style.setVerticalAlignment(org.apache.poi.ss.usermodel.VerticalAlignment.CENTER);
        applyThinBorder(style);
        return style;
    }

    private CellStyle bodyStyle(XSSFWorkbook workbook, boolean zebra) {
        XSSFCellStyle style = workbook.createCellStyle();
        style.setVerticalAlignment(org.apache.poi.ss.usermodel.VerticalAlignment.CENTER);
        if (zebra) {
            style.setFillForegroundColor(new XSSFColor(ZEBRA_COLOR, null));
            style.setFillPattern(FillPatternType.SOLID_FOREGROUND);
        }
        applyThinBorder(style);
        return style;
    }

    private void applyThinBorder(CellStyle style) {
        style.setBorderTop(BorderStyle.THIN);
        style.setBorderBottom(BorderStyle.THIN);
        style.setBorderLeft(BorderStyle.THIN);
        style.setBorderRight(BorderStyle.THIN);
        style.setTopBorderColor(IndexedColors.GREY_25_PERCENT.getIndex());
        style.setBottomBorderColor(IndexedColors.GREY_25_PERCENT.getIndex());
        style.setLeftBorderColor(IndexedColors.GREY_25_PERCENT.getIndex());
        style.setRightBorderColor(IndexedColors.GREY_25_PERCENT.getIndex());
    }

    private void setCell(Row row, int index, String value, CellStyle style) {
        Cell cell = row.createCell(index);
        cell.setCellValue(value == null ? "" : value);
        cell.setCellStyle(style);
    }

    private record ExportRow(
            LocalDateTime createdAt,
            String source,
            String category,
            String action,
            String adminUserName,
            String adminEmail,
            String target,
            String description,
            String reason,
            String ipAddress
    ) {
        static ExportRow fromAdmin(com.HealthLink.dto.admin.AdminAuditLogDto dto) {
            String target = dto.getTargetName() != null ? dto.getTargetName() : dto.getTargetId();
            return new ExportRow(
                    dto.getCreatedAt(),
                    "Admin",
                    dto.getCategoryDisplay() != null ? dto.getCategoryDisplay() : dto.getCategory(),
                    dto.getActionTypeDisplay() != null ? dto.getActionTypeDisplay() : dto.getActionType(),
                    dto.getAdminUserName(),
                    dto.getAdminEmail(),
                    target,
                    dto.getDescription(),
                    dto.getReason(),
                    dto.getIpAddress()
            );
        }

        static ExportRow fromSchedule(com.HealthLink.dto.admin.schedule.AdminAuditLogDto dto) {
            String target = dto.getTargetDoctorName() != null
                    ? dto.getTargetDoctorName()
                    : (dto.getTargetAppointmentId() != null ? "Appt #" + dto.getTargetAppointmentId() : "");
            return new ExportRow(
                    dto.getCreatedAt(),
                    "Schedule",
                    "",
                    dto.getActionTypeDisplay() != null ? dto.getActionTypeDisplay() : dto.getActionType(),
                    dto.getAdminUserName(),
                    dto.getAdminEmail(),
                    target,
                    dto.getDescription(),
                    dto.getReason(),
                    dto.getIpAddress()
            );
        }
    }
}
