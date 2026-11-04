/**
 * Payment Verification & Razorpay Client Helpers
 */
export async function createRazorpayOrder({ amount, currency = 'INR', receipt }) {
  const res = await fetch('/api/payment/razorpay/order', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ amount, currency, receipt }),
  });
  return res.json();
}

export async function verifyRazorpayPayment(paymentData) {
  const res = await fetch('/api/payment/razorpay/verify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(paymentData),
  });
  return res.json();
}
