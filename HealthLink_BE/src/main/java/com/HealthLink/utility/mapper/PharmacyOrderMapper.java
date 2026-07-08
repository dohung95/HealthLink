package com.HealthLink.utility.mapper;

import com.HealthLink.dto.pharmacy.PharmacyOrderResponse;
import com.HealthLink.dto.pharmacy.PharmacyOrderItemResponse;
import com.HealthLink.entity.Patient;
import com.HealthLink.entity.Pharmacy;
import com.HealthLink.entity.PharmacyConsultationRequest;
import com.HealthLink.entity.PharmacyOrder;
import com.HealthLink.entity.PharmacyOrderItem;
import com.HealthLink.entity.PrescriptionHeader;
import com.HealthLink.entity.enums.PrescriptionTiming;
import com.HealthLink.service.impl.pharmacy.PharmacyServiceHelper;

import java.util.List;

public final class PharmacyOrderMapper {

    private PharmacyOrderMapper() {
    }

    public static PharmacyOrderResponse toResponse(PharmacyOrder order) {
        PrescriptionHeader prescription = order.getPrescriptionHeader();
        PharmacyConsultationRequest consultationRequest = order.getConsultationRequest();
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
                .patientConfirmedAt(order.getPatientConfirmedAt())
                .requiresPatientConfirmation(order.getPatientConfirmationRequestedAt() != null
                        && order.getPatientConfirmedAt() == null)
                .patientConfirmationRequestedAt(order.getPatientConfirmationRequestedAt())
                .patientConfirmationReason(order.getPatientConfirmationReason())
                .status(order.getStatus())
                .deliveryType(order.getDeliveryType())
                .deliveryAddress(order.getDeliveryAddress())
                .deliveryLatitude(order.getDeliveryLatitude())
                .deliveryLongitude(order.getDeliveryLongitude())
                .deliveryPhoneNumber(order.getDeliveryPhoneNumber())
                .deliveryAddressSource(order.getDeliveryAddressSource())
                .medicineAmount(order.getMedicineAmount())
                .deliveryFee(order.getDeliveryFee())
                .totalAmount(order.getTotalAmount())
                .paymentStatus(order.getPaymentStatus())
                .paymentMethod(order.getPaymentMethod())
                .notes(order.getNotes())
                .pharmacistNotes(order.getPharmacistNotes())
                .items(order.getOrderItems() == null
                        ? List.of()
                        : order.getOrderItems().stream().map(PharmacyOrderMapper::toItemResponse).toList())
                .estimatedDeliveryTime(order.getEstimatedDeliveryTime())
                .actualDeliveryTime(order.getActualDeliveryTime())
                .confirmedAt(order.getConfirmedAt())
                .preparingAt(order.getPreparingAt())
                .shippedAt(order.getShippedAt())
                .deliveredAt(order.getDeliveredAt())
                .cancelledAt(order.getCancelledAt())
                .cancelReason(order.getCancelReason())
                .cancelledBy(order.getCancelledBy())
                .revisionRequestedAt(order.getRevisionRequestedAt())
                .revisionRequestNotes(order.getRevisionRequestNotes())
                .revisionResolvedAt(order.getRevisionResolvedAt())
                .createdAt(order.getCreatedAt())
                .platformFee(order.getPlatformFee())
                .pharmacyEarning(order.getPharmacyEarning())
                .commissionRate(order.getCommissionRate())
                .build();
    }

    private static PharmacyOrderItemResponse toItemResponse(PharmacyOrderItem item) {
        return PharmacyOrderItemResponse.builder()
                .orderItemId(item.getOrderItemId())
                .medicineId(item.getMedicine() != null ? item.getMedicine().getMedicineId() : null)
                .sourcePrescriptionHeaderId(item.getSourcePrescriptionHeader() != null
                        ? item.getSourcePrescriptionHeader().getPrescriptionHeaderId() : null)
                .sourcePrescriptionItemId(item.getSourcePrescriptionItem() != null
                        ? item.getSourcePrescriptionItem().getPrescriptionItemId() : null)
                .medicationName(item.getMedicationName())
                .totalSupplyDays(item.getTotalSupplyDays())
                .quantity(item.getQuantity())
                .unit(item.getUnit())
                .frequency(item.getFrequency())
                .timing(item.getTiming())
                .timings(PharmacyServiceHelper.timingsForResponse(item.getTiming()))
                .route(item.getRoute())
                .totalPrice(item.getTotalPrice())
                .notes(item.getNotes())
                .build();
    }

}
