import requests
import json
import sys
import uuid
from pymongo import MongoClient

BASE_URL = 'http://localhost:3000/api'
MONGO_URI = "mongodb://akashsriv1984_db_user:2M5Edv773XLUmT15@ac-htqrxv1-shard-00-00.7szyylz.mongodb.net:27017,ac-htqrxv1-shard-00-01.7szyylz.mongodb.net:27017,ac-htqrxv1-shard-00-02.7szyylz.mongodb.net:27017/userPortal?ssl=true&replicaSet=atlas-1c5jr9-shard-0&authSource=admin&retryWrites=true&w=majority"
client = MongoClient(MONGO_URI, serverSelectionTimeoutMS=8000)
db = client['userPortal']

def register_and_verify(session, name, email, password):
    r = session.post(f"{BASE_URL}/auth/register", json={"name": name, "email": email, "password": password})
    assert r.status_code == 200, f"Register failed: {r.text}"
    reg_data = r.json()
    if reg_data.get('requiresVerification'):
        ver_doc = db.email_verifications.find_one({"email": email.lower(), "used": False})
        assert ver_doc is not None, "Verification code not found in MongoDB"
        r_ver = session.post(f"{BASE_URL}/auth/verify-registration", json={"email": email, "code": ver_doc['code']})
        assert r_ver.status_code == 200, f"Verification failed: {r_ver.text}"
        return r_ver.json()['user']
    return reg_data['user']

def run_tests():
    print("=" * 70)
    print("CUSTOMER ORDER CANCELLATION SYSTEM TEST SUITE")
    print("=" * 70)
    
    # 1. Create Customer Session A
    sess_a = requests.Session()
    email_a = f"test_canceller_a_{uuid.uuid4().hex[:6]}@example.com"
    user_a = register_and_verify(sess_a, "Customer A", email_a, "password123")
    print(f"[OK] Registered Customer A ({user_a['email']})")

    # Fetch available products
    r = requests.get(f"{BASE_URL}/products?limit=5")
    assert r.status_code == 200
    products = r.json()['products']
    assert len(products) > 0, "No products available for testing"
    test_prod = products[0]
    initial_stock = test_prod['stock']
    print(f"[OK] Using Product '{test_prod['name']}' (ID: {test_prod['id']}, Initial Stock: {initial_stock})")

    # Place Prepaid Order for Customer A
    order_a_payload = {
        "items": [{
            "id": test_prod['id'],
            "slug": test_prod['slug'],
            "name": test_prod['name'],
            "price": test_prod['price'],
            "qty": 1,
            "image": (test_prod.get('images') or [''])[0]
        }],
        "address": {
            "fullName": "Customer A",
            "phone": "+919876543210",
            "line1": "123 Jewelry Street",
            "city": "Mumbai",
            "state": "Maharashtra",
            "pincode": "400001"
        },
        "payment": "razorpay",
        "razorpayPaymentId": "pay_MOCK_CANCEL_TEST_01"
    }

    r = sess_a.post(f"{BASE_URL}/orders", json=order_a_payload)
    assert r.status_code == 200, f"Order placement failed: {r.text}"
    order_a = r.json()['order']
    order_a_id = order_a['id']
    print(f"[OK] Order A Placed: {order_a_id} (Number: {order_a['orderNumber']})")

    # Verify Stock Decremented
    r = requests.get(f"{BASE_URL}/products/{test_prod['slug']}")
    assert r.status_code == 200
    stock_after_order = r.json()['product']['stock']
    assert stock_after_order == initial_stock - 1, f"Expected {initial_stock - 1}, got {stock_after_order}"
    print(f"[OK] Stock decremented from {initial_stock} to {stock_after_order}")

    # 2. Test Customer B Isolation (Attempt to cancel Customer A's order)
    sess_b = requests.Session()
    email_b = f"test_canceller_b_{uuid.uuid4().hex[:6]}@example.com"
    user_b = register_and_verify(sess_b, "Customer B", email_b, "password123")
    print(f"[OK] Registered Customer B ({user_b['email']})")

    r = sess_b.post(f"{BASE_URL}/orders/{order_a_id}/cancel", json={"reason": "Changed my mind"})
    assert r.status_code == 404 or r.status_code == 403, f"Expected 404/403 for unauthorized cancellation, got {r.status_code}"
    print(f"[OK] Isolation verified: Customer B cannot cancel Customer A's order (HTTP {r.status_code})")

    # 3. Validation: Missing / Invalid Cancellation Reason
    r = sess_a.post(f"{BASE_URL}/orders/{order_a_id}/cancel", json={})
    assert r.status_code == 400, "Should reject empty body / reason"
    r = sess_a.post(f"{BASE_URL}/orders/{order_a_id}/cancel", json={"reason": "Not an allowed reason"})
    assert r.status_code == 400, "Should reject disallowed reason"
    r = sess_a.post(f"{BASE_URL}/orders/{order_a_id}/cancel", json={"reason": "Other"})
    assert r.status_code == 400, "Should reject 'Other' reason without note"
    print("[OK] Validation verified: Invalid/missing reasons rejected")

    # 4. Successful Cancellation by Customer A
    r = sess_a.post(f"{BASE_URL}/orders/{order_a_id}/cancel", json={"reason": "Found a better product"})
    assert r.status_code == 200, f"Cancellation failed: {r.text}"
    cancelled_order = r.json()['order']
    assert cancelled_order['status'] == 'cancelled', f"Expected status 'cancelled', got {cancelled_order['status']}"
    assert cancelled_order['cancelledBy'] == 'customer'
    assert cancelled_order['cancellationReason'] == 'Found a better product'
    assert cancelled_order['refundStatus'] in ['completed', 'refund_completed'], f"Mock refund should be completed: {cancelled_order.get('refundStatus')}"
    print(f"[OK] Order cancelled successfully by customer: Refund Status = {cancelled_order['refundStatus']}")

    # 5. Stock Restoration Verification
    r = requests.get(f"{BASE_URL}/products/{test_prod['slug']}")
    assert r.status_code == 200
    stock_after_cancel = r.json()['product']['stock']
    assert stock_after_cancel == initial_stock, f"Expected stock {initial_stock} restored, got {stock_after_cancel}"
    print(f"[OK] Stock restored from {stock_after_order} back to {stock_after_cancel}")

    # 6. Idempotency Check: Cannot cancel already cancelled order
    r = sess_a.post(f"{BASE_URL}/orders/{order_a_id}/cancel", json={"reason": "Changed my mind"})
    assert r.status_code == 400, "Should reject cancelling already cancelled order"
    print("[OK] Idempotency verified: Re-cancelling rejected")

    # 7. Disallowed Status Check (e.g., shipped/delivered orders cannot be cancelled)
    # Place new order & set to shipped
    r = sess_a.post(f"{BASE_URL}/orders", json=order_a_payload)
    assert r.status_code == 200
    order_shipped_id = r.json()['order']['id']
    
    # Update order status to shipped directly in DB or via admin
    db.orders.update_one({"id": order_shipped_id}, {"$set": {"status": "shipped"}})
    r = sess_a.post(f"{BASE_URL}/orders/{order_shipped_id}/cancel", json={"reason": "Changed my mind"})
    assert r.status_code == 400, f"Shipped order cancellation should fail: {r.text}"
    print("[OK] Disallowed state verified: Shipped orders cannot be cancelled")

    print("\n" + "=" * 70)
    print("ALL 7 CANCELLATION TESTS PASSED (100% SUCCESS)!")
    print("=" * 70)

if __name__ == '__main__':
    run_tests()
