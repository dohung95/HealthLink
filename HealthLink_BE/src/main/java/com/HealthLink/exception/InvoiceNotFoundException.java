package com.HealthLink.exception;

public class InvoiceNotFoundException extends RuntimeException {
    public InvoiceNotFoundException(String message) {
        super(message);
    }

    public InvoiceNotFoundException(Integer invoiceId) {
        super("Invoice not found with ID: " + invoiceId);
    }
}
