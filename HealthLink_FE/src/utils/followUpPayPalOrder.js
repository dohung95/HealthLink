export function getFollowUpPaymentErrorMessage(error, fallback) {
  return error?.response?.data?.message
    || error?.response?.data?.error
    || error?.message
    || fallback;
}

export async function createFollowUpPayPalOrderId({ appointmentId, createOrder }) {
  const order = await createOrder(appointmentId);
  const orderId = order?.orderId || order?.id;

  if (!orderId) {
    throw new Error('PayPal create-order response did not return an order ID.');
  }

  return orderId;
}
