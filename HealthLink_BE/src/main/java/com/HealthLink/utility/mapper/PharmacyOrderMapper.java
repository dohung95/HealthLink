package com.HealthLink.utility.mapper;

import com.HealthLink.dto.pharmacy.PharmacyOrderResponse;
import com.HealthLink.entity.Patient;
import com.HealthLink.entity.Pharmacy;
import com.HealthLink.entity.PharmacyOrder;
import com.HealthLink.entity.PrescriptionHeader;

public final class PharmacyOrderMapper {

    private PharmacyOrderMapper() {
    }

    public static PharmacyOrderResponse toResponse(PharmacyOrder order) {
        PrescriptionHeader prescription = order.getPrescriptionHeader();
        Pharmacy pharmacy = order.getPharmacy();
        Patient patient = order.getPatient();

        return PharmacyOrderResponse.builder()
                .orderId(order.getOrderId())
                .orderNumber(order.getOrderNumber())
                .prescriptionHeaderId(prescription != null ? prescription.getPrescriptionHeaderId() : null)
                .diagnosis(prescription != null ? prescription.getDiagnosis() : null)
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
                .createdAt(order.getCreatedAt())
                .platformFee(order.getPlatformFee())
                .pharmacyEarning(order.getPharmacyEarning())
                .commissionRate(order.getCommissionRate())
                .build();
    }
}
