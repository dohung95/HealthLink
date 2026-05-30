package com.HealthLink.utility.mapper;

import com.HealthLink.dto.pharmacy.PharmacyOrderResponse;
import com.HealthLink.entity.Patient;
import com.HealthLink.entity.Pharmacy;
import com.HealthLink.entity.PharmacyConsultationRequest;
import com.HealthLink.entity.PharmacyOrder;
import com.HealthLink.entity.PrescriptionHeader;

public final class PharmacyOrderMapper {

    private PharmacyOrderMapper() {
    }

    public static PharmacyOrderResponse toResponse(PharmacyOrder order) {
        PrescriptionHeader prescription = order.getPrescriptionHeader();
        PharmacyConsultationRequest consultationRequest = order.getConsultationRequest() != null
                ? order.getConsultationRequest()
                : prescription != null ? prescription.getConsultationRequest() : null;
        Pharmacy pharmacy = order.getPharmacy();
        Patient patient = order.getPatient();

        return PharmacyOrderResponse.builder()
                .orderId(order.getOrderId())
                .invoiceId(order.getInvoice() != null ? order.getInvoice().getInvoiceId() : null)
                .orderNumber(order.getOrderNumber())
                .prescriptionHeaderId(prescription != null ? prescription.getPrescriptionHeaderId() : null)
                .pharmacyRequestId(consultationRequest != null ? consultationRequest.getRequestId() : null)
                .appointmentId(prescription != null && prescription.getAppointment() != null
                        ? prescription.getAppointment().getAppointmentId() : null)
                .diagnosis(prescription != null ? prescription.getDiagnosis() : null)
                .doctorId(prescription != null && prescription.getDoctor() != null
                        ? prescription.getDoctor().getDoctorId() : null)
                .doctorName(prescription != null && prescription.getDoctor() != null
                        ? prescription.getDoctor().getFullName() : null)
                .pharmacyId(pharmacy != null ? pharmacy.getPharmacyId() : null)
                .pharmacyName(pharmacy != null ? pharmacy.getName() : null)
                .pharmacyPhone(pharmacy != null ? pharmacy.getPhoneNumber() : null)
                .patientId(patient != null ? patient.getPatientId() : null)
                .patientName(patient != null ? patient.getFullName() : null)
                .status(order.getStatus())
                .deliveryType(order.getDeliveryType())
                .deliveryAddress(order.getDeliveryAddress())
                .deliveryLatitude(order.getDeliveryLatitude())
                .deliveryLongitude(order.getDeliveryLongitude())
                .medicineAmount(order.getMedicineAmount())
                .deliveryFee(order.getDeliveryFee())
                .totalAmount(order.getTotalAmount())
                .paymentStatus(order.getPaymentStatus())
                .paymentMethod(order.getPaymentMethod())
                .notes(order.getNotes())
                .pharmacistNotes(order.getPharmacistNotes())
                .estimatedDeliveryTime(order.getEstimatedDeliveryTime())
                .actualDeliveryTime(order.getActualDeliveryTime())
                .confirmedAt(order.getConfirmedAt())
                .preparingAt(order.getPreparingAt())
                .shippedAt(order.getShippedAt())
                .deliveredAt(order.getDeliveredAt())
                .cancelledAt(order.getCancelledAt())
                .cancelReason(order.getCancelReason())
                .cancelledBy(order.getCancelledBy())
                .createdAt(order.getCreatedAt())
                .platformFee(order.getPlatformFee())
                .pharmacyEarning(order.getPharmacyEarning())
                .commissionRate(order.getCommissionRate())
                .build();
    }
}
