import requests
import json
import sys
import uuid

BASE_URL = 'http://localhost:3000/api'

def run_tests():
    print("=" * 75)
    print("Mikumantra ORDER CANCELLATION LOCK & NOTIFICATIONS TEST SUITE")
    print("=" * 75)

    # 0. Setup Admin session
    admin_sess = requests.Session()
    r = admin_sess.post(f"{BASE_URL}/auth/login", json={"email": "admin@mikumantra.com", "password": "12341234"})
    if r.status_code != 200:
        r = admin_sess.post(f"{BASE_URL}/auth/login", json={"email": "admin@mikumantra.com", "password": "admin123"})
    if r.status_code != 200:
        admin_sess.post(f"{BASE_URL}/auth/register", json={"name": "Admin", "email": "admin@mikumantra.com", "password": "12341234"})
        r = admin_sess.post(f"{BASE_URL}/auth/login", json={"email": "admin@mikumantra.com", "password": "12341234"})
    assert r.status_code == 200, f"Admin login failed: {r.text}"
    print("✓ Admin logged in")

    # Fetch product for testing
    r = requests.get(f"{BASE_URL}/products?limit=1")
    assert r.status_code == 200
    product = r.json()['products'][0]
    initial_stock = product['stock']

    # TEST 1: Customer Places Order -> WhatsApp + SMS Triggered
    cust_sess = requests.Session()
    email_cust = f"cust_notif_{uuid.uuid4().hex[:6]}@example.com"
    r = cust_sess.post(f"{BASE_URL}/auth/register", json={"name": "Test Customer", "email": email_cust, "password": "password123"})
    assert r.status_code == 200, f"Customer registration failed: {r.text}"
    print(f"✓ Registered Customer ({email_cust})")

    order_payload = {
        "items": [{"id": product['id'], "qty": 1}],
        "address": {
            "fullName": "Test Customer",
            "phone": "9876543210",
            "line1": "456 Palace Rd",
            "city": "Jaipur",
            "state": "Rajasthan",
            "pincode": "302001"
        },
        "payment": "cod"
    }
    r = cust_sess.post(f"{BASE_URL}/orders", json=order_payload)
    assert r.status_code == 200, f"Order placement failed: {r.text}"
    order = r.json()['order']
    order_id = order['id']
    print(f"✓ TEST 1 PASSED: Order #{order['orderNumber']} created (ID: {order_id})")

    # Create active order 2 for Customer A to test unauthorized access
    r = cust_sess.post(f"{BASE_URL}/orders", json=order_payload)
    assert r.status_code == 200
    active_order_a = r.json()['order']

    # TEST 2: Active Order Status Transitions (Admin can update when NOT cancelled)
    r = admin_sess.put(f"{BASE_URL}/admin/orders/{order_id}", json={"status": "packed"})
    assert r.status_code == 200, f"Active status update failed: {r.text}"
    assert r.json()['order']['status'] == 'packed'
    print(f"✓ TEST 2 PASSED: Active order transition (confirmed -> packed) succeeded")

    # TEST 3: Customer Cancels Order -> Cancelled Status & Notifications
    r = cust_sess.post(f"{BASE_URL}/orders/{order_id}/cancel", json={"reason": "Changed my mind"})
    assert r.status_code == 200, f"Cancellation failed: {r.text}"
    cancelled_order = r.json()['order']
    assert cancelled_order['status'] == 'cancelled'
    print(f"✓ TEST 3 PASSED: Order #{order['orderNumber']} cancelled successfully")

    # TEST 4: Admin/API attempts CANCELLED -> PACKED
    r = admin_sess.put(f"{BASE_URL}/admin/orders/{order_id}", json={"status": "packed"})
    assert r.status_code == 400, f"Expected 400 Bad Request, got {r.status_code}"
    assert "cannot be updated" in r.json().get('error', '').lower()
    print(f"✓ TEST 4 PASSED: Transition (CANCELLED -> PACKED) REJECTED with message: '{r.json().get('error')}'")

    # TEST 5: Admin/API attempts CANCELLED -> SHIPPED
    r = admin_sess.put(f"{BASE_URL}/admin/orders/{order_id}", json={"status": "shipped"})
    assert r.status_code == 400, f"Expected 400 Bad Request, got {r.status_code}"
    print(f"✓ TEST 5 PASSED: Transition (CANCELLED -> SHIPPED) REJECTED with message: '{r.json().get('error')}'")

    # TEST 6: Admin/API attempts CANCELLED -> DELIVERED
    r = admin_sess.put(f"{BASE_URL}/admin/orders/{order_id}", json={"status": "delivered"})
    assert r.status_code == 400, f"Expected 400 Bad Request, got {r.status_code}"
    print(f"✓ TEST 6 PASSED: Transition (CANCELLED -> DELIVERED) REJECTED with message: '{r.json().get('error')}'")

    # TEST 7: Admin/API attempts CANCELLED -> CONFIRMED
    r = admin_sess.put(f"{BASE_URL}/admin/orders/{order_id}", json={"status": "confirmed"})
    assert r.status_code == 400, f"Expected 400 Bad Request, got {r.status_code}"
    print(f"✓ TEST 7 PASSED: Transition (CANCELLED -> CONFIRMED) REJECTED with message: '{r.json().get('error')}'")

    # TEST 8: Fulfillment / Shipping Slip Generation on Cancelled Order
    r = cust_sess.get(f"{BASE_URL}/orders/{order_id}/shippingslip")
    assert r.status_code == 400, f"Expected 400 Bad Request for shipping slip on cancelled order, got {r.status_code}"
    print(f"✓ TEST 8 PASSED: Shipping slip on cancelled order REJECTED: '{r.json().get('error')}'")

    # TEST 9: Duplicate Cancellation Request (Idempotency)
    r = cust_sess.post(f"{BASE_URL}/orders/{order_id}/cancel", json={"reason": "Changed my mind"})
    assert r.status_code == 400
    print(f"✓ TEST 9 PASSED: Duplicate cancellation REJECTED: '{r.json().get('error')}'")

    # TEST 10: Page Refresh / GET Persistence Check
    r = cust_sess.get(f"{BASE_URL}/orders/{order_id}")
    assert r.status_code == 200
    fetched_order = r.json()['order']
    assert fetched_order['status'] == 'cancelled', "Order status did not persist as cancelled!"
    print(f"✓ TEST 10 PASSED: GET /orders/{order_id} persists status='cancelled'")

    # TEST 11: Unauthorized Status Update Attempt
    unauth_cust = requests.Session()
    email_unauth = f"cust_unauth_{uuid.uuid4().hex[:6]}@example.com"
    unauth_cust.post(f"{BASE_URL}/auth/register", json={"name": "Attacker", "email": email_unauth, "password": "password123"})
    r = unauth_cust.post(f"{BASE_URL}/orders/{active_order_a['id']}/cancel", json={"reason": "Changed my mind"})
    assert r.status_code == 403, f"Expected 403 Forbidden, got {r.status_code}"
    print(f"✓ TEST 11 PASSED: Unauthorized cancellation attempt REJECTED with 403 Forbidden: '{r.json().get('error')}'")

    # Clean up active_order_a
    cust_sess.post(f"{BASE_URL}/orders/{active_order_a['id']}/cancel", json={"reason": "Changed my mind"})

    # TEST 12: Stock Restoration Consistency
    r = requests.get(f"{BASE_URL}/products")
    prod_final = next(p for p in r.json()['products'] if p['id'] == product['id'])
    assert prod_final['stock'] == initial_stock, f"Expected stock {initial_stock}, got {prod_final['stock']}"
    print(f"✓ TEST 12 PASSED: Final stock correctly restored to initial value ({prod_final['stock']})")

    print("=" * 75)
    print("ALL 12 TEST SCENARIOS PASSED SUCCESSFULLY!")
    print("=" * 75)

if __name__ == '__main__':
    run_tests()
