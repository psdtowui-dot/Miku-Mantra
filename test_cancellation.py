import requests
import json
import sys
import uuid

BASE_URL = 'http://localhost:3000/api'

def run_tests():
    print("=" * 70)
    print("CUSTOMER ORDER CANCELLATION SYSTEM TEST SUITE")
    print("=" * 70)
    
    # 1. Create Customer Session A
    sess_a = requests.Session()
    email_a = f"test_canceller_a_{uuid.uuid4().hex[:6]}@example.com"
    r = sess_a.post(f"{BASE_URL}/auth/register", json={"name": "Customer A", "email": email_a, "password": "password123"})
    assert r.status_code == 200, f"Register A failed: {r.text}"
    user_a = r.json()['user']
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
    order_data_prepaid = {
        "items": [{"id": test_prod['id'], "qty": 2}],
        "address": {
            "fullName": "Customer A",
            "phone": "9876543210",
            "line1": "123 Main St",
            "city": "Jaipur",
            "state": "Rajasthan",
            "pincode": "302001"
        },
        "payment": "razorpay",
        "razorpayPaymentId": "pay_TEST123456"
    }
    r = sess_a.post(f"{BASE_URL}/orders", json=order_data_prepaid)
    assert r.status_code == 200, f"Order placement failed: {r.text}"
    order_prepaid = r.json()['order']
    print(f"[OK] Created Prepaid Order #{order_prepaid['orderNumber']} (ID: {order_prepaid['id']})")

    # Check stock after placing order
    r = requests.get(f"{BASE_URL}/products")
    prod_after_order = next(p for p in r.json()['products'] if p['id'] == test_prod['id'])
    print(f"  Stock after placing 2 items: {prod_after_order['stock']} (Expected: {initial_stock - 2})")
    assert prod_after_order['stock'] == initial_stock - 2

    # TEST 1: Cancel Prepaid Order as Customer A
    cancel_payload = {"reason": "Changed my mind"}
    r = sess_a.post(f"{BASE_URL}/orders/{order_prepaid['id']}/cancel", json=cancel_payload)
    assert r.status_code == 200, f"Cancel order failed: {r.text}"
    cancelled_order_a = r.json()['order']
    assert cancelled_order_a['status'] == 'cancelled', f"Expected status 'cancelled', got '{cancelled_order_a['status']}'"
    assert cancelled_order_a['cancellationReason'] == 'Changed my mind'
    assert cancelled_order_a['cancelledBy'] == 'customer'
    assert cancelled_order_a['refundStatus'] == 'refund_initiated'
    print(f"[OK] TEST 1 PASSED: Order #{order_prepaid['orderNumber']} cancelled successfully with refund status '{cancelled_order_a['refundStatus']}'")

    # Check stock after cancellation
    r = requests.get(f"{BASE_URL}/products")
    prod_after_cancel = next(p for p in r.json()['products'] if p['id'] == test_prod['id'])
    print(f"  Stock after cancellation: {prod_after_cancel['stock']} (Expected: {initial_stock})")
    assert prod_after_cancel['stock'] == initial_stock, "Stock was not properly restored!"

    # TEST 2: Cancel COD Order
    order_data_cod = {
        "items": [{"id": test_prod['id'], "qty": 1}],
        "address": {
            "fullName": "Customer A",
            "phone": "9876543210",
            "line1": "123 Main St",
            "city": "Jaipur",
            "state": "Rajasthan",
            "pincode": "302001"
        },
        "payment": "cod"
    }
    r = sess_a.post(f"{BASE_URL}/orders", json=order_data_cod)
    assert r.status_code == 200
    order_cod = r.json()['order']
    print(f"[OK] Created COD Order #{order_cod['orderNumber']} (ID: {order_cod['id']})")

    r = sess_a.post(f"{BASE_URL}/orders/{order_cod['id']}/cancel", json={"reason": "Ordered by mistake"})
    assert r.status_code == 200
    cancelled_cod = r.json()['order']
    assert cancelled_cod['status'] == 'cancelled'
    assert cancelled_cod['refundStatus'] == 'not_applicable'
    print(f"[OK] TEST 2 PASSED: COD Order cancelled with refundStatus='not_applicable'")

    # TEST 3: Attempt second cancellation on already cancelled order (Idempotency check)
    r = sess_a.post(f"{BASE_URL}/orders/{order_cod['id']}/cancel", json={"reason": "Changed my mind"})
    assert r.status_code == 400, f"Expected 400 for duplicate cancellation, got {r.status_code}"
    print(f"[OK] TEST 3 PASSED: Duplicate cancellation rejected with message: '{r.json().get('error')}'")

    # TEST 4: Attempt cancellation on Shipped order
    order_shipped_data = {
        "items": [{"id": test_prod['id'], "qty": 1}],
        "address": {
            "fullName": "Customer A",
            "phone": "9876543210",
            "line1": "123 Main St",
            "city": "Jaipur",
            "state": "Rajasthan",
            "pincode": "302001"
        },
        "payment": "cod"
    }
    r = sess_a.post(f"{BASE_URL}/orders", json=order_shipped_data)
    assert r.status_code == 200
    order_to_ship = r.json()['order']

    # Login as admin to update status to 'shipped'
    sess_admin = requests.Session()
    r = sess_admin.post(f"{BASE_URL}/auth/login", json={"email": "admin@mikumantra.com", "password": "12341234"})
    if r.status_code != 200:
        r = sess_admin.post(f"{BASE_URL}/auth/login", json={"email": "admin@mikumantra.com", "password": "admin123"})
    assert r.status_code == 200, f"Admin login failed: {r.text}"
    
    # Set status to 'shipped' via admin
    r = sess_admin.put(f"{BASE_URL}/admin/orders/{order_to_ship['id']}", json={"status": "shipped"})
    assert r.status_code == 200, f"Admin status update failed: {r.text}"
    print(f"[OK] Admin updated order #{order_to_ship['orderNumber']} status to 'shipped'")

    # Attempt customer cancellation on shipped order
    r = sess_a.post(f"{BASE_URL}/orders/{order_to_ship['id']}/cancel", json={"reason": "Delivery taking too long"})
    assert r.status_code == 400, f"Expected 400 for shipped order cancellation, got {r.status_code}"
    print(f"[OK] TEST 4 PASSED: Shipped order cancellation rejected with message: '{r.json().get('error')}'")

    # TEST 5: Unauthorized cancellation (Customer B attempts to cancel Customer A's order)
    sess_b = requests.Session()
    email_b = f"test_canceller_b_{uuid.uuid4().hex[:6]}@example.com"
    r = sess_b.post(f"{BASE_URL}/auth/register", json={"name": "Customer B", "email": email_b, "password": "password123"})
    assert r.status_code == 200
    print(f"[OK] Registered Customer B ({email_b})")

    r = sess_b.post(f"{BASE_URL}/orders/{order_cod['id']}/cancel", json={"reason": "Other", "note": "Hacking test"})
    assert r.status_code == 403, f"Expected 403 Forbidden for unauthorized cancellation, got {r.status_code}"
    print(f"[OK] TEST 5 PASSED: Unauthorized cancellation rejected with 403 Forbidden: '{r.json().get('error')}'")

    # TEST 6: Reason 'Other' without note
    r = sess_a.post(f"{BASE_URL}/orders", json=order_data_cod)
    assert r.status_code == 200
    order_temp = r.json()['order']
    r = sess_a.post(f"{BASE_URL}/orders/{order_temp['id']}/cancel", json={"reason": "Other", "note": ""})
    assert r.status_code == 400
    print(f"[OK] TEST 6 PASSED: Reason 'Other' without note rejected with message: '{r.json().get('error')}'")

    print("=" * 70)
    print("ALL 6 TESTS PASSED SUCCESSFULLY!")
    print("=" * 70)

if __name__ == '__main__':
    run_tests()
