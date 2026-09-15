import requests
import json
import sys
import uuid
import time
from datetime import datetime, timedelta

BASE_URL = 'http://localhost:3000/api'

def run_tests():
    print("=" * 75)
    print("RETURN PROCESSING & REFUND MANAGEMENT SYSTEM TEST SUITE")
    print("=" * 75)

    # 1. Admin Login / Credentials Setup
    admin_sess = requests.Session()
    admin_emails = ["admin@mikumantra.com", "akash@unictechnology.com"]
    passwords = ["12341234", "admin123", "password123"]
    logged_in = False
    for em in admin_emails:
        for pw in passwords:
            r = admin_sess.post(f"{BASE_URL}/auth/login", json={"email": em, "password": pw})
            if r.status_code == 200:
                logged_in = True
                print(f"[OK] Admin logged in successfully as {em}")
                break
        if logged_in:
            break
    assert logged_in, "Admin login failed for all known admin credentials"

    # 2. Register Customer A
    sess_a = requests.Session()
    email_a = f"customer_a_{uuid.uuid4().hex[:6]}@example.com"
    r = sess_a.post(f"{BASE_URL}/auth/register", json={"name": "Customer A", "email": email_a, "password": "password123", "phone": "+919876543210"})
    assert r.status_code == 200, f"Customer A registration failed: {r.text}"
    user_a = r.json()['user']
    print(f"[OK] Registered Customer A ({user_a['email']})")

    # 3. Register Customer B
    sess_b = requests.Session()
    email_b = f"customer_b_{uuid.uuid4().hex[:6]}@example.com"
    r = sess_b.post(f"{BASE_URL}/auth/register", json={"name": "Customer B", "email": email_b, "password": "password123", "phone": "+919876543211"})
    assert r.status_code == 200
    user_b = r.json()['user']
    print(f"[OK] Registered Customer B ({user_b['email']})")

    # Fetch available products
    r = requests.get(f"{BASE_URL}/products?limit=5")
    assert r.status_code == 200
    products = r.json()['products']
    assert len(products) >= 2, "Need at least 2 products for testing"
    prod1 = products[0]
    prod2 = products[1]
    initial_stock_prod1 = prod1['stock']
    print(f"[OK] Product 1: '{prod1['name']}' (Stock: {initial_stock_prod1}, Price: INR {prod1['price']})")
    print(f"[OK] Product 2: '{prod2['name']}' (Stock: {prod2['stock']}, Price: INR {prod2['price']})")

    # Place Order 1 for Customer A
    order_data1 = {
        "items": [
            {"id": prod1['id'], "qty": 2},
            {"id": prod2['id'], "qty": 1}
        ],
        "address": {
            "fullName": "Customer A",
            "phone": "+919876543210",
            "line1": "123 Atelier Street",
            "city": "Jaipur",
            "state": "Rajasthan",
            "pincode": "302001"
        },
        "payment": "razorpay",
        "razorpayPaymentId": "pay_MOCK123456"
    }
    r = sess_a.post(f"{BASE_URL}/orders", json=order_data1)
    assert r.status_code == 200, f"Order placement failed: {r.text}"
    order1 = r.json()['order']
    print(f"[OK] Created Order 1 #{order1['orderNumber']} (Total: INR {order1['amounts']['total']})")

    # Update Order 1 status to delivered via Admin
    r = admin_sess.put(f"{BASE_URL}/admin/orders/{order1['id']}", json={"status": "delivered"})
    assert r.status_code == 200, f"Marking order delivered failed: {r.text}"
    order1_delivered = r.json()['order']
    assert order1_delivered['status'] == 'delivered'
    assert 'deliveredAt' in order1_delivered
    print(f"[OK] Order 1 marked as Delivered at {order1_delivered['deliveredAt']}")

    # TEST 1: Submit Return Request within 30 minutes
    return_payload1 = {
        "orderId": order1['id'],
        "items": [{"id": prod1['id'], "returnQty": 1}],
        "reason": "Quality issue",
        "comment": "Item had a minor scratch on surface."
    }
    r = sess_a.post(f"{BASE_URL}/returns", json=return_payload1)
    assert r.status_code == 200, f"Return submission failed: {r.text}"
    ret1 = r.json()['return']
    assert ret1['returnStatus'] == 'REQUESTED'
    assert ret1['refundStatus'] == 'PENDING'
    assert ret1['refundAmount'] > 0
    print(f"[OK] TEST 1 PASSED: Return requested successfully for Order 1. Return ID: {ret1['id']}, Refund Amount: INR {ret1['refundAmount']}")

    # TEST 2: Duplicate Return Prevention
    r = sess_a.post(f"{BASE_URL}/returns", json=return_payload1)
    assert r.status_code == 400, f"Duplicate return should be blocked! Got status {r.status_code}: {r.text}"
    print("[OK] TEST 2 PASSED: Duplicate return request correctly blocked by backend.")

    # TEST 3: Unauthorized Return Request (Customer B returning Customer A's order)
    # Create another delivered order for Customer A
    r = sess_a.post(f"{BASE_URL}/orders", json={
        "items": [{"id": prod1['id'], "qty": 1}],
        "address": order_data1['address'],
        "payment": "cod"
    })
    order2 = r.json()['order']
    admin_sess.put(f"{BASE_URL}/admin/orders/{order2['id']}", json={"status": "delivered"})

    r = sess_b.post(f"{BASE_URL}/returns", json={
        "orderId": order2['id'],
        "items": [{"id": prod1['id'], "returnQty": 1}],
        "reason": "Defective/Damaged item"
    })
    assert r.status_code == 403, f"Customer B should be unauthorized to return Customer A's order. Got {r.status_code}"
    print("[OK] TEST 3 PASSED: Unauthorized user return submission blocked (403).")

    # TEST 4: Quantity Validation (Attempting to return more than purchased)
    r = sess_a.post(f"{BASE_URL}/returns", json={
        "orderId": order2['id'],
        "items": [{"id": prod1['id'], "returnQty": 99}],
        "reason": "Wrong size/item delivered"
    })
    assert r.status_code == 400, f"Excess quantity return should be rejected. Got {r.status_code}"
    print("[OK] TEST 4 PASSED: Invalid return quantity rejected (400).")

    # TEST 5: Admin Return Review & Approval
    r = admin_sess.get(f"{BASE_URL}/admin/returns")
    assert r.status_code == 200, f"Admin fetch returns failed: {r.text}"
    returns_list = r.json()['returns']
    assert len(returns_list) >= 1
    print(f"[OK] Admin retrieved {len(returns_list)} return request(s).")

    # Approve Return 1
    r = admin_sess.post(f"{BASE_URL}/admin/returns/{ret1['id']}/approve")
    assert r.status_code == 200, f"Admin approval failed: {r.text}"
    approved_ret1 = r.json()['return']
    assert approved_ret1['returnStatus'] == 'APPROVED'
    print(f"[OK] TEST 5 PASSED: Admin approved return {ret1['id']} (Status: APPROVED).")

    # TEST 6: Admin Rejection Flow
    # Create Return Request for Order 2
    r = sess_a.post(f"{BASE_URL}/returns", json={
        "orderId": order2['id'],
        "items": [{"id": prod1['id'], "returnQty": 1}],
        "reason": "Other",
        "comment": "Mind changed after unboxing."
    })
    ret2 = r.json()['return']
    
    # Reject Return 2 with mandatory reason
    r = admin_sess.post(f"{BASE_URL}/admin/returns/{ret2['id']}/reject", json={"rejectionReason": "Product condition not acceptable"})
    assert r.status_code == 200, f"Admin rejection failed: {r.text}"
    rejected_ret2 = r.json()['return']
    assert rejected_ret2['returnStatus'] == 'REJECTED'
    assert rejected_ret2['refundStatus'] == 'NOT_APPLICABLE'
    assert rejected_ret2['rejectionReason'] == "Product condition not acceptable"
    print("[OK] TEST 6 PASSED: Admin rejected return request with mandatory reason. Status: REJECTED, Refund: NOT_APPLICABLE.")

    # Attempt refund on rejected return -> Must be blocked
    r = admin_sess.post(f"{BASE_URL}/admin/returns/{ret2['id']}/refund")
    assert r.status_code == 400, "Refund on rejected return must be blocked!"
    print("[OK] Rejected return refund attempt successfully blocked.")

    # TEST 7: Refund Execution & Idempotency
    r = admin_sess.post(f"{BASE_URL}/admin/returns/{ret1['id']}/refund")
    assert r.status_code == 200, f"Refund execution failed: {r.text}"
    refunded_ret1 = r.json()['return']
    assert refunded_ret1['refundStatus'] == 'COMPLETED'
    assert refunded_ret1['returnStatus'] == 'REFUNDED'
    assert refunded_ret1['gatewayRefundId'] is not None
    print(f"[OK] TEST 7 PASSED: Refund initiated & completed! Ref ID: {refunded_ret1['gatewayRefundId']}")

    # Retry/Duplicate refund on completed refund -> Must be blocked
    r = admin_sess.post(f"{BASE_URL}/admin/returns/{ret1['id']}/refund")
    assert r.status_code == 400, "Duplicate refund call must be blocked by idempotency check!"
    print("[OK] Duplicate refund call safely blocked by idempotency check.")

    # TEST 8: Physical Inventory Restocking Classification
    # Fetch stock before restock
    r = requests.get(f"{BASE_URL}/products")
    prod1_before = next(p for p in r.json()['products'] if p['id'] == prod1['id'])
    stock_before = prod1_before['stock']

    # Classify Return 1 physical item as Resellable
    r = admin_sess.post(f"{BASE_URL}/admin/returns/{ret1['id']}/inventory", json={"classification": "Resellable"})
    assert r.status_code == 200, f"Inventory classification failed: {r.text}"
    inv_ret1 = r.json()['return']
    assert inv_ret1['inventoryStatus'] == 'PROCESSED'
    assert inv_ret1['inventoryClassification'] == 'Resellable'
    assert inv_ret1['inventoryRestocked'] == True

    # Verify stock increased by 1 (since 1 item was returned as Resellable)
    r = requests.get(f"{BASE_URL}/products")
    prod1_after = next(p for p in r.json()['products'] if p['id'] == prod1['id'])
    assert prod1_after['stock'] == stock_before + 1, f"Stock should increase by 1. Was {stock_before}, now {prod1_after['stock']}"
    print(f"[OK] TEST 8 PASSED: Resellable physical item restocked product stock (+1 -> {prod1_after['stock']}).")

    # Attempt duplicate inventory restocking -> Must be blocked
    r = admin_sess.post(f"{BASE_URL}/admin/returns/{ret1['id']}/inventory", json={"classification": "Resellable"})
    assert r.status_code == 400, "Duplicate inventory restock must be blocked!"
    print("[OK] Duplicate inventory restocking safely blocked.")

    # TEST 9: Audit Logs Verification
    r = admin_sess.get(f"{BASE_URL}/admin/returns/{ret1['id']}/audit-logs")
    assert r.status_code == 200, f"Fetch audit logs failed: {r.text}"
    audit_logs = r.json()['auditLogs']
    assert len(audit_logs) >= 4, f"Expected at least 4 audit trail records, got {len(audit_logs)}"
    actions = [a['action'] for a in audit_logs]
    print(f"[OK] TEST 9 PASSED: Complete audit log history recorded: {actions}")

    print("\n" + "=" * 75)
    print("ALL RETURN PROCESSING & REFUND RULES TESTS PASSED SUCCESSFULLY!")
    print("=" * 75)

if __name__ == '__main__':
    run_tests()
