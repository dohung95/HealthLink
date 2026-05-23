package com.HealthLink.service.pharmacy;

import com.HealthLink.dto.pharmacy.PharmacyConsultationOrderCreateRequest;
import com.HealthLink.dto.pharmacy.PharmacyOrderRequest;
import com.HealthLink.dto.pharmacy.PharmacyOrderResponse;
import com.HealthLink.dto.pharmacy.PharmacyOrderStatusRequest;

import java.util.List;

public interface PharmacyOrderService {

    PharmacyOrderResponse createOrderFromPrescription(PharmacyOrderRequest request, String patientId);

    PharmacyOrderResponse createOrderFromConsultationRequest(
            Integer requestId,
            PharmacyConsultationOrderCreateRequest request,
            String pharmacyId
    );

    PharmacyOrderResponse updateOrderStatus(Integer orderId, PharmacyOrderStatusRequest request);

    List<PharmacyOrderResponse> getOrdersByPharmacy(String pharmacyId, String status);

    List<PharmacyOrderResponse> getOrdersByPatient(String patientId);

    List<PharmacyOrderResponse> getOrdersByDoctor(String doctorId);

    PharmacyOrderResponse getOrderById(Integer orderId);
}
