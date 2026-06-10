package com.HealthLink.service.payment;

import com.HealthLink.entity.Invoice;
import com.HealthLink.entity.PharmacyOrder;
import com.HealthLink.entity.PharmacyOrderItem;

public interface InvoicePdfService {

    byte[] generatePharmacyOrderInvoicePdf(Invoice invoice, PharmacyOrder order);

    byte[] generateAppointmentInvoicePdf(Invoice invoice);
}
