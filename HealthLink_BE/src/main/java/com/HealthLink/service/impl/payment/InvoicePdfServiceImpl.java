package com.HealthLink.service.impl.payment;

import com.HealthLink.entity.Invoice;
import com.HealthLink.entity.PharmacyOrder;
import com.HealthLink.entity.PharmacyOrderItem;
import com.HealthLink.exception.BadRequestException;
import com.HealthLink.service.payment.InvoicePdfService;
import lombok.extern.slf4j.Slf4j;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.pdmodel.PDPage;
import org.apache.pdfbox.pdmodel.PDPageContentStream;
import org.apache.pdfbox.pdmodel.common.PDRectangle;
import org.apache.pdfbox.pdmodel.font.PDType1Font;
import org.apache.pdfbox.pdmodel.font.Standard14Fonts;
import org.springframework.stereotype.Service;

import java.io.ByteArrayOutputStream;
import java.math.BigDecimal;
import java.time.format.DateTimeFormatter;
import java.util.List;

@Service
@Slf4j
public class InvoicePdfServiceImpl implements InvoicePdfService {

    private static final DateTimeFormatter DATE_FMT = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm");
    private static final float MARGIN = 50;
    private static final float PAGE_WIDTH = PDRectangle.A4.getWidth();
    private static final float CONTENT_WIDTH = PAGE_WIDTH - 2 * MARGIN;
    private static final int FONT_SIZE_NORMAL = 10;
    private static final int FONT_SIZE_TITLE = 18;
    private static final int FONT_SIZE_HEADER = 12;
    private static final float TABLE_ROW_HEIGHT = 20;

    private static final PDType1Font FONT = new PDType1Font(Standard14Fonts.FontName.HELVETICA);
    private static final PDType1Font FONT_BOLD = new PDType1Font(Standard14Fonts.FontName.HELVETICA_BOLD);

    @Override
    public byte[] generatePharmacyOrderInvoicePdf(Invoice invoice, PharmacyOrder order) {
        try (PDDocument document = new PDDocument()) {
            PDPage page = new PDPage(PDRectangle.A4);
            document.addPage(page);
            PDPageContentStream cs = new PDPageContentStream(document, page);
            float y = PDRectangle.A4.getHeight() - MARGIN;

            writeLine(cs, FONT_BOLD, FONT_SIZE_TITLE, MARGIN, y, "INVOICE");
            y -= 30;

            writeLine(cs, FONT, FONT_SIZE_NORMAL, MARGIN, y, "Invoice #: " + safe(invoice.getInvoiceNumber()));
            y -= 16;

            writeLine(cs, FONT, FONT_SIZE_NORMAL, MARGIN, y,
                    "Issue Date: " + (invoice.getIssueDate() != null ? invoice.getIssueDate().format(DATE_FMT) : "N/A"));
            y -= 16;

            if (invoice.getPaidAt() != null) {
                writeLine(cs, FONT, FONT_SIZE_NORMAL, MARGIN, y, "Paid Date: " + invoice.getPaidAt().format(DATE_FMT));
                y -= 16;
            }
            y -= 10;

            writeLine(cs, FONT_BOLD, FONT_SIZE_HEADER, MARGIN, y, "Patient Information");
            y -= 18;

            String patientName = order.getPatient() != null ? safe(order.getPatient().getFullName()) : "N/A";
            writeLine(cs, FONT, FONT_SIZE_NORMAL, MARGIN, y, "Name: " + patientName);
            y -= 16;

            String patientAddress = order.getPatient() != null ? safe(order.getPatient().getAddress()) : "N/A";
            writeLine(cs, FONT, FONT_SIZE_NORMAL, MARGIN, y, "Address: " + patientAddress);
            y -= 24;

            writeLine(cs, FONT_BOLD, FONT_SIZE_HEADER, MARGIN, y, "Pharmacy Information");
            y -= 18;

            String pharmacyName = order.getPharmacy() != null ? safe(order.getPharmacy().getName()) : "N/A";
            writeLine(cs, FONT, FONT_SIZE_NORMAL, MARGIN, y, "Name: " + pharmacyName);
            y -= 16;

            String pharmacyAddress = order.getPharmacy() != null ? safe(order.getPharmacy().getAddress()) : "N/A";
            writeLine(cs, FONT, FONT_SIZE_NORMAL, MARGIN, y, "Address: " + pharmacyAddress);
            y -= 16;

            String pharmacyPhone = order.getPharmacy() != null ? safe(order.getPharmacy().getPhoneNumber()) : "N/A";
            writeLine(cs, FONT, FONT_SIZE_NORMAL, MARGIN, y, "Phone: " + pharmacyPhone);
            y -= 24;

            writeLine(cs, FONT_BOLD, FONT_SIZE_HEADER, MARGIN, y, "Order #: " + safe(order.getOrderNumber()));
            y -= 24;

            float[] colWidths = {250, 60, 180};
            String[] headers = {"Medication", "Qty", "Total"};
            y = drawTableHeader(cs, y, colWidths, headers);

            List<PharmacyOrderItem> items = order.getOrderItems();
            if (items != null) {
                for (PharmacyOrderItem item : items) {
                    if (y < 60) {
                        cs.close();
                        page = new PDPage(PDRectangle.A4);
                        document.addPage(page);
                        cs = new PDPageContentStream(document, page);
                        y = PDRectangle.A4.getHeight() - MARGIN;
                        y = drawTableHeader(cs, y, colWidths, headers);
                    }
                    String name = item.getMedicationName() != null ? item.getMedicationName() : "N/A";
                    String qty = String.valueOf(item.getQuantity() != null ? item.getQuantity() : 0);
                    String total = "$" + fmt(item.getTotalPrice());

                    writeLine(cs, FONT, FONT_SIZE_NORMAL, MARGIN + 2, y - 14, trunc(name, 40));
                    writeLine(cs, FONT, FONT_SIZE_NORMAL, MARGIN + colWidths[0] + 2, y - 14, qty);
                    writeLine(cs, FONT, FONT_SIZE_NORMAL, MARGIN + colWidths[0] + colWidths[1] + 2, y - 14, total);

                    cs.setStrokingColor(0.9f, 0.9f, 0.9f);
                    cs.moveTo(MARGIN, y - TABLE_ROW_HEIGHT);
                    cs.lineTo(PAGE_WIDTH - MARGIN, y - TABLE_ROW_HEIGHT);
                    cs.stroke();
                    cs.setStrokingColor(0, 0, 0);
                    y -= TABLE_ROW_HEIGHT;
                }
            }
            y -= 10;

            writeLine(cs, FONT, FONT_SIZE_NORMAL, MARGIN, y, "Medicine Amount: $" + fmt(order.getMedicineAmount()));
            y -= 16;
            writeLine(cs, FONT, FONT_SIZE_NORMAL, MARGIN, y, "Delivery Fee: $" + fmt(order.getDeliveryFee()));
            y -= 16;

            if (order.getEstimatedDeliveryTime() != null) {
                writeLine(cs, FONT, FONT_SIZE_NORMAL, MARGIN, y,
                        "Estimated Delivery: " + order.getEstimatedDeliveryTime().format(DATE_FMT));
                y -= 16;
            }

            if (invoice.getDiscount() != null && invoice.getDiscount().compareTo(BigDecimal.ZERO) > 0) {
                writeLine(cs, FONT, FONT_SIZE_NORMAL, MARGIN, y, "Discount: -$" + fmt(invoice.getDiscount()));
                y -= 16;
            }
            if (invoice.getTax() != null && invoice.getTax().compareTo(BigDecimal.ZERO) > 0) {
                writeLine(cs, FONT, FONT_SIZE_NORMAL, MARGIN, y, "Tax: $" + fmt(invoice.getTax()));
                y -= 16;
            }

            y -= 4;
            writeLine(cs, FONT_BOLD, FONT_SIZE_HEADER, MARGIN, y, "Total Amount: $" + fmt(order.getTotalAmount()));
            y -= 24;

            writeLine(cs, FONT_BOLD, FONT_SIZE_HEADER, MARGIN, y, "Payment Information");
            y -= 18;
            writeLine(cs, FONT, FONT_SIZE_NORMAL, MARGIN, y, "Method: PayPal");
            y -= 16;
            if (order.getPaymentStatus() != null) {
                writeLine(cs, FONT, FONT_SIZE_NORMAL, MARGIN, y, "Status: " + order.getPaymentStatus());
            }

            cs.close();
            ByteArrayOutputStream baos = new ByteArrayOutputStream();
            document.save(baos);
            return baos.toByteArray();
        } catch (Exception e) {
            log.error("Failed to generate pharmacy order invoice PDF", e);
            throw new BadRequestException("Failed to generate invoice PDF: " + e.getMessage());
        }
    }

    @Override
    public byte[] generateAppointmentInvoicePdf(Invoice invoice) {
        try (PDDocument document = new PDDocument()) {
            PDPage page = new PDPage(PDRectangle.A4);
            document.addPage(page);

            try (PDPageContentStream cs = new PDPageContentStream(document, page)) {
                float y = PDRectangle.A4.getHeight() - MARGIN;
                writeLine(cs, FONT_BOLD, FONT_SIZE_TITLE, MARGIN, y, "INVOICE");
                y -= 30;

                writeLine(cs, FONT, FONT_SIZE_NORMAL, MARGIN, y, "Invoice #: " + safe(invoice.getInvoiceNumber()));
                y -= 16;

                writeLine(cs, FONT, FONT_SIZE_NORMAL, MARGIN, y,
                        "Issue Date: " + (invoice.getIssueDate() != null ? invoice.getIssueDate().format(DATE_FMT) : "N/A"));
                y -= 16;

                writeLine(cs, FONT, FONT_SIZE_NORMAL, MARGIN, y, "Amount: $" + fmt(invoice.getAmount()));
                y -= 16;

                writeLine(cs, FONT, FONT_SIZE_NORMAL, MARGIN, y, "Status: " + safe(invoice.getStatus()));
            }

            ByteArrayOutputStream baos = new ByteArrayOutputStream();
            document.save(baos);
            return baos.toByteArray();
        } catch (Exception e) {
            log.error("Failed to generate appointment invoice PDF", e);
            throw new BadRequestException("Failed to generate invoice PDF: " + e.getMessage());
        }
    }

    private float drawTableHeader(PDPageContentStream cs, float y, float[] widths, String[] headers) throws Exception {
        cs.setNonStrokingColor(0.05f, 0.35f, 0.65f);
        cs.addRect(MARGIN, y - TABLE_ROW_HEIGHT, CONTENT_WIDTH, TABLE_ROW_HEIGHT);
        cs.fill();
        cs.setNonStrokingColor(1, 1, 1);

        float cx = MARGIN + 2;
        for (int i = 0; i < headers.length; i++) {
            cs.beginText();
            cs.setFont(FONT_BOLD, FONT_SIZE_NORMAL);
            cs.newLineAtOffset(cx, y - 14);
            cs.showText(headers[i]);
            cs.endText();
            cx += widths[i];
        }
        cs.setNonStrokingColor(0, 0, 0);

        cs.moveTo(MARGIN, y - TABLE_ROW_HEIGHT);
        cs.lineTo(PAGE_WIDTH - MARGIN, y - TABLE_ROW_HEIGHT);
        cs.stroke();

        return y - TABLE_ROW_HEIGHT;
    }

    private void writeLine(PDPageContentStream cs, PDType1Font font, int size, float x, float y, String text) throws Exception {
        cs.beginText();
        cs.setFont(font, size);
        cs.newLineAtOffset(x, y);
        cs.showText(text);
        cs.endText();
    }

    private String safe(String value) {
        return value != null && !value.isBlank() ? value : "N/A";
    }

    private String fmt(BigDecimal value) {
        if (value == null) return "0.00";
        return String.format("%.2f", value);
    }

    private String trunc(String text, int maxLen) {
        if (text == null) return "";
        return text.length() > maxLen ? text.substring(0, maxLen - 3) + "..." : text;
    }
}
