package com.HealthLink.repository.payment;

import com.HealthLink.entity.Invoice;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

/**
 * Repository cho entity Invoice.
 * Package: com.HealthLink.repository.payment
 */
@Repository
public interface InvoiceRepository extends JpaRepository<Invoice, Integer> {

    /**
     * Tìm một hóa đơn theo số hóa đơn duy nhất của nó (ví dụ INV-20260508-0001).
     */
    Optional<Invoice> findByInvoiceNumber(String invoiceNumber);

    /**
     * Lấy tất cả hóa đơn thuộc về một bệnh nhân cụ thể (phục vụ lịch sử / dashboard).
     */
    List<Invoice> findByPatient_PatientId(String patientId);

    /**
     * Kiểm tra xem đã có hóa đơn cho một lịch hẹn hay chưa
     * (ngăn tạo trùng hóa đơn).
     */
    boolean existsByAppointment_AppointmentId(Integer appointmentId);

    /**
     * Lấy hóa đơn gắn với một lịch hẹn cụ thể.
     */
    Optional<Invoice> findByAppointment_AppointmentId(Integer appointmentId);
}
