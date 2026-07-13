package com.HealthLink.service.pharmacy;

import com.HealthLink.dto.pharmacy.CancelOrderRequest;
import com.HealthLink.dto.pharmacy.PharmacyConsultationOrderCreateRequest;
import com.HealthLink.dto.pharmacy.PharmacyDeliveryContactChangeResponse;
import com.HealthLink.dto.pharmacy.PharmacyDeliveryContactChangeReviewRequest;
import com.HealthLink.dto.pharmacy.PharmacyDeliveryContactUpdateRequest;
import com.HealthLink.dto.pharmacy.PharmacyDeliveryQuoteRequest;
import com.HealthLink.dto.pharmacy.PharmacyOrderRequest;
import com.HealthLink.dto.pharmacy.PharmacyOrderResponse;
import com.HealthLink.dto.pharmacy.PharmacyOrderRevisionRequest;
import com.HealthLink.dto.pharmacy.PharmacyOrderStatusRequest;
import com.HealthLink.dto.pharmacy.RetailOrderRequest;

import java.util.List;
import java.util.Optional;

public interface PharmacyOrderService {

    PharmacyOrderResponse createOrderFromPrescription(PharmacyOrderRequest request, String patientId);

    PharmacyOrderResponse createRetailOrder(RetailOrderRequest request, String patientId);

    PharmacyOrderResponse createOrderFromConsultationRequest(
            Integer requestId,
            PharmacyConsultationOrderCreateRequest request,
            String pharmacyId
    );

    PharmacyOrderResponse updateOrderStatus(Integer orderId, PharmacyOrderStatusRequest request);

    List<PharmacyOrderResponse> getOrdersByPharmacy(String pharmacyId, String status);

    List<PharmacyOrderResponse> getOrdersByPatient(String patientId, String status);

    List<PharmacyOrderResponse> getOrdersByDoctor(String doctorId);

    PharmacyOrderResponse getOrderById(Integer orderId);

    Optional<PharmacyOrderResponse> tryAutoQuoteOrderRequest(Integer requestId, String pharmacyId);

    PharmacyOrderResponse cancelOrderByPatient(Integer orderId, CancelOrderRequest request, String patientId);

    PharmacyOrderResponse requestOrderRevision(Integer orderId, PharmacyOrderRevisionRequest request, String patientId);

    PharmacyOrderResponse updateOrderQuote(Integer orderId, PharmacyConsultationOrderCreateRequest request, String pharmacyId);

    PharmacyOrderResponse updateDeliveryContact(Integer orderId, PharmacyDeliveryContactUpdateRequest request, String patientId);

    PharmacyDeliveryContactChangeResponse requestDeliveryContactChange(Integer orderId, PharmacyDeliveryContactUpdateRequest request, String patientId);

    PharmacyDeliveryContactChangeResponse reviewDeliveryContactChange(Integer requestId, PharmacyDeliveryContactChangeReviewRequest request, String pharmacyId);

    PharmacyOrderResponse submitDeliveryQuote(Integer orderId, PharmacyDeliveryQuoteRequest request, String pharmacyId);

    PharmacyOrderResponse confirmOrderTotalByPatient(Integer orderId, String patientId);
}
