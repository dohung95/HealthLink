package com.HealthLink.service.impl.payment;

import com.HealthLink.entity.*;
import org.apache.pdfbox.Loader;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.text.PDFTextStripper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

@ExtendWith(MockitoExtension.class)
class InvoicePdfServiceImplTest {

    private InvoicePdfServiceImpl pdfService;

    @BeforeEach
    void setUp() {
        pdfService = new InvoicePdfServiceImpl();
    }

    @Test
    void generatePharmacyOrderInvoicePdf_fullInvoice() throws Exception {
        Invoice invoice = Invoice.builder()
                .invoiceNumber("INV-001")
                .issueDate(LocalDateTime.of(2026, 6, 9, 10, 0))
                .paidAt(LocalDateTime.of(2026, 6, 9, 12, 0))
                .build();

        PharmacyOrder order = createOrder();

        byte[] pdfBytes = pdfService.generatePharmacyOrderInvoicePdf(invoice, order);

        assertThat(pdfBytes).isNotEmpty();

        try (PDDocument doc = Loader.loadPDF(pdfBytes)) {
            assertThat(doc.getNumberOfPages()).isGreaterThanOrEqualTo(1);
            String text = new PDFTextStripper().getText(doc);
            assertThat(text).contains("INVOICE");
            assertThat(text).contains("INV-001");
            assertThat(text).contains("Order #: ORD-001");
            assertThat(text).contains("Patient Information");
            assertThat(text).contains("Pharmacy Information");
            assertThat(text).contains("Total Amount");
            assertThat(text).contains("PayPal");
        }
    }

    @Test
    void generatePharmacyOrderInvoicePdf_withDiscountAndTax() throws Exception {
        Invoice invoice = Invoice.builder()
                .invoiceNumber("INV-002")
                .issueDate(LocalDateTime.now())
                .discount(new BigDecimal("5.00"))
                .tax(new BigDecimal("2.50"))
                .build();

        PharmacyOrder order = createOrder();

        byte[] pdfBytes = pdfService.generatePharmacyOrderInvoicePdf(invoice, order);

        assertThat(pdfBytes).isNotEmpty();

        try (PDDocument doc = Loader.loadPDF(pdfBytes)) {
            String text = new PDFTextStripper().getText(doc);
            assertThat(text).contains("Discount");
            assertThat(text).contains("Tax");
        }
    }

    @Test
    void generatePharmacyOrderInvoicePdf_withEstimatedDelivery() throws Exception {
        Invoice invoice = Invoice.builder()
                .invoiceNumber("INV-003")
                .issueDate(LocalDateTime.now())
                .build();

        PharmacyOrder order = createOrder();
        order.setEstimatedDeliveryTime(LocalDateTime.of(2026, 6, 10, 14, 0));

        byte[] pdfBytes = pdfService.generatePharmacyOrderInvoicePdf(invoice, order);

        assertThat(pdfBytes).isNotEmpty();

        try (PDDocument doc = Loader.loadPDF(pdfBytes)) {
            String text = new PDFTextStripper().getText(doc);
            assertThat(text).contains("Estimated Delivery");
        }
    }

    @Test
    void generatePharmacyOrderInvoicePdf_nullFieldsGraceful() throws Exception {
        Invoice invoice = Invoice.builder()
                .invoiceNumber(null)
                .issueDate(null)
                .build();

        PharmacyOrder order = PharmacyOrder.builder()
                .orderNumber(null)
                .patient(null)
                .pharmacy(null)
                .totalAmount(new BigDecimal("0.00"))
                .medicineAmount(new BigDecimal("0.00"))
                .deliveryFee(new BigDecimal("0.00"))
                .orderItems(List.of())
                .build();

        byte[] pdfBytes = pdfService.generatePharmacyOrderInvoicePdf(invoice, order);

        assertThat(pdfBytes).isNotEmpty();

        try (PDDocument doc = Loader.loadPDF(pdfBytes)) {
            String text = new PDFTextStripper().getText(doc);
            assertThat(text).contains("INVOICE");
        }
    }

    @Test
    void generatePharmacyOrderInvoicePdf_multiplePages() throws Exception {
        // Create enough items to force pagination
        Invoice invoice = Invoice.builder()
                .invoiceNumber("INV-004")
                .issueDate(LocalDateTime.now())
                .build();

        PharmacyOrder order = createOrder();
        // Add 35 items
        for (int i = 0; i < 35; i++) {
            PharmacyOrderItem item = PharmacyOrderItem.builder()
                    .medicationName("Medicine " + i)
                    .quantity(1)
                    .unitPrice(new BigDecimal("10.00"))
                    .totalPrice(new BigDecimal("10.00"))
                    .build();
            order.getOrderItems().add(item);
        }

        byte[] pdfBytes = pdfService.generatePharmacyOrderInvoicePdf(invoice, order);

        assertThat(pdfBytes).isNotEmpty();

        try (PDDocument doc = Loader.loadPDF(pdfBytes)) {
            assertThat(doc.getNumberOfPages()).isGreaterThan(1);
        }
    }

    @Test
    void generateAppointmentInvoicePdf_basic() throws Exception {
        Invoice invoice = Invoice.builder()
                .invoiceNumber("INV-APP-001")
                .issueDate(LocalDateTime.now())
                .amount(new BigDecimal("150.00"))
                .status("PAID")
                .build();

        byte[] pdfBytes = pdfService.generateAppointmentInvoicePdf(invoice);

        assertThat(pdfBytes).isNotEmpty();

        try (PDDocument doc = Loader.loadPDF(pdfBytes)) {
            String text = new PDFTextStripper().getText(doc);
            assertThat(text).contains("INVOICE");
            assertThat(text).contains("INV-APP-001");
            assertThat(text).contains("150.00");
            assertThat(text).contains("PAID");
        }
    }

    @Test
    void generateAppointmentInvoicePdf_nullFields() throws Exception {
        Invoice invoice = Invoice.builder()
                .invoiceNumber(null)
                .issueDate(null)
                .amount(null)
                .status(null)
                .build();

        byte[] pdfBytes = pdfService.generateAppointmentInvoicePdf(invoice);

        assertThat(pdfBytes).isNotEmpty();

        try (PDDocument doc = Loader.loadPDF(pdfBytes)) {
            String text = new PDFTextStripper().getText(doc);
            assertThat(text).contains("N/A");
        }
    }

    // --- Helper ---

    private PharmacyOrder createOrder() {
        Pharmacy pharmacy = Pharmacy.builder()
                .pharmacyId("pharmacy-1")
                .name("Central Pharmacy")
                .address("123 Main St")
                .phoneNumber("555-0100")
                .build();

        Patient patient = Patient.builder()
                .patientId("patient-1")
                .fullName("John Doe")
                .address("456 Oak Ave")
                .build();

        PharmacyOrderItem item = PharmacyOrderItem.builder()
                .medicationName("Amlodipine 5mg")
                .quantity(30)
                .unitPrice(new BigDecimal("0.50"))
                .totalPrice(new BigDecimal("15.00"))
                .build();

        return PharmacyOrder.builder()
                .orderId(1)
                .orderNumber("ORD-001")
                .patient(patient)
                .pharmacy(pharmacy)
                .medicineAmount(new BigDecimal("15.00"))
                .deliveryFee(new BigDecimal("3.50"))
                .totalAmount(new BigDecimal("18.50"))
                .orderItems(new java.util.ArrayList<>(List.of(item)))
                .paymentStatus("PAID")
                .build();
    }
}
