import requests
import json
import uuid
import sys

BASE_URL = 'http://localhost:3000/api'

def run_refund_details_test():
    print("=" * 80)
    print("RETURN / REFUND DETAILS WORKFLOW VERIFICATION TEST")
    print("=" * 80)

    # 1. Login Admin
    admin_sess = requests.Session()
    admin_emails = ["akash@unictechnology.com", "admin@mikumantra.com"]
    passwords = ["12341234", "admin123", "password123"]
    admin_ok = False
    for em in admin_emails:
        for pw in passwords:
            r = admin_sess.post(f"{BASE_URL}/auth/login", json={"email": em, "password": pw})
            if r.status_code == 200:
                admin_ok = True
                print(f"[OK] Admin logged in as {em}")
                break
        if admin_ok:
            break
    assert admin_ok, "Admin login failed"

    # 2. Register Customer 1
    cust1_sess = requests.Session()
    cust1_email = f"refund_cust1_{uuid.uuid4().hex[:6]}@example.com"
    r = cust1_sess.post(f"{BASE_URL}/auth/register", json={
        "name": "Priya Sharma",
        "email": cust1_email,
        "password": "Password123!",
        "phone": "+919876543201"
    })
    assert r.status_code == 200, f"Registration failed: {r.text}"
    user1 = r.json()['user']
    print(f"[OK] Customer 1 registered: {user1['name']} ({cust1_email})")

    # 3. Register Customer 2 (for unauthorized access tests)
    cust2_sess = requests.Session()
    cust2_email = f"refund_cust2_{uuid.uuid4().hex[:6]}@example.com"
    r = cust2_sess.post(f"{BASE_URL}/auth/register", json={
        "name": "Rohan Verma",
        "email": cust2_email,
        "password": "Password123!",
        "phone": "+919876543202"
    })
    assert r.status_code == 200
    user2 = r.json()['user']
    print(f"[OK] Customer 2 registered: {user2['name']} ({cust2_email})")

    # 4. Get a product
    r = requests.get(f"{BASE_URL}/products?limit=2")
    assert r.status_code == 200
    prod = r.json()['products'][0]

    # 5. Place Order 1 for Customer 1
    order_payload = {
        "items": [{"id": prod['id'], "qty": 1}],
        "address": {
            "fullName": "Priya Sharma",
            "phone": "+919876543201",
            "line1": "101 Lotus Enclave",
            "city": "Mumbai",
            "state": "Maharashtra",
            "pincode": "400050"
        },
        "payment": "cod"
    }
    r = cust1_sess.post(f"{BASE_URL}/orders", json=order_payload)
    assert r.status_code == 200
    order1 = r.json()['order']
    print(f"[OK] Order 1 placed #{order1['orderNumber']} (ID: {order1['id']})")

    # 6. Admin marks Order 1 as Delivered
    r = admin_sess.put(f"{BASE_URL}/admin/orders/{order1['id']}", json={"status": "delivered"})
    assert r.status_code == 200
    print("[OK] Order 1 marked as delivered")

    # 7. Customer 1 submits Return Request (NO payment/refund details asked or provided)
    return_payload = {
        "orderId": order1['id'],
        "items": [{"id": prod['id'], "returnQty": 1}],
        "reason": "Wrong size/item delivered",
        "comment": "Requested a different size."
    }
    r = cust1_sess.post(f"{BASE_URL}/returns", json=return_payload)
    assert r.status_code == 200
    ret1 = r.json()['return']
    ret1_id = ret1['id']
    assert ret1['returnStatus'] == 'REQUESTED'
    assert 'refundDetails' not in ret1 or ret1['refundDetails'] is None
    print(f"[OK] Step 1-5 verified: Return request created with status REQUESTED. Refund details NOT present.")

    # 8. VERIFY CONSTRAINT: Customer attempts to submit refund details BEFORE admin approval -> MUST BE REJECTED (400)
    r = cust1_sess.post(f"{BASE_URL}/returns/{ret1_id}/refund-details", json={
        "method": "upi",
        "upiId": "priya@okaxis",
        "confirmUpiId": "priya@okaxis"
    })
    assert r.status_code == 400, f"Expected 400 when submitting before approval, got {r.status_code}: {r.text}"
    print(f"[OK] Security Check Passed: Early refund details submission blocked before approval: {r.json()['error']}")

    # 9. Admin approves Return Request
    r = admin_sess.post(f"{BASE_URL}/admin/returns/{ret1_id}/approve")
    assert r.status_code == 200
    approved_ret = r.json()['return']
    assert approved_ret['returnStatus'] == 'APPROVED'
    print(f"[OK] Admin approved return request. Status: {approved_ret['returnStatus']}")

    # 10. VERIFY CONSTRAINT: Unauthorized user (Customer 2) cannot submit refund details for Customer 1's return (403)
    r = cust2_sess.post(f"{BASE_URL}/returns/{ret1_id}/refund-details", json={
        "method": "upi",
        "upiId": "rohan@okaxis",
        "confirmUpiId": "rohan@okaxis"
    })
    assert r.status_code == 403, f"Expected 403 for unauthorized user, got {r.status_code}: {r.text}"
    print("[OK] Authorization Check Passed: Customer 2 blocked from submitting details for Customer 1.")

    # 11. Customer 1 submits INVALID UPI formats -> MUST BE REJECTED (400)
    r = cust1_sess.post(f"{BASE_URL}/returns/{ret1_id}/refund-details", json={
        "method": "upi",
        "upiId": "invalid-upi-without-at",
        "confirmUpiId": "invalid-upi-without-at"
    })
    assert r.status_code == 400
    print(f"[OK] Validation Check Passed: Invalid UPI format blocked: {r.json()['error']}")

    # Mismatched UPI IDs -> MUST BE REJECTED (400)
    r = cust1_sess.post(f"{BASE_URL}/returns/{ret1_id}/refund-details", json={
        "method": "upi",
        "upiId": "priya@okaxis",
        "confirmUpiId": "different@okaxis"
    })
    assert r.status_code == 400
    print(f"[OK] Validation Check Passed: Mismatched confirm UPI ID blocked: {r.json()['error']}")

    # 12. Customer 1 submits VALID UPI details
    r = cust1_sess.post(f"{BASE_URL}/returns/{ret1_id}/refund-details", json={
        "method": "upi",
        "upiId": "priyasharma@okaxis",
        "confirmUpiId": "priyasharma@okaxis"
    })
    assert r.status_code == 200, f"Valid UPI submission failed: {r.text}"
    sub_data = r.json()
    ret_after_upi = sub_data['return']
    assert ret_after_upi['returnStatus'] == 'REFUND_DETAILS_SUBMITTED'
    assert ret_after_upi['refundDetailsStatus'] == 'SUBMITTED'
    assert ret_after_upi['refundDetails']['method'] == 'upi'
    assert ret_after_upi['refundDetails']['upiId'] == 'priyasharma@okaxis'
    print(f"[OK] UPI refund details successfully submitted! Status: {ret_after_upi['returnStatus']}")

    # 13. Verify customer GET /api/orders/:id returns updated returnRequest
    r = cust1_sess.get(f"{BASE_URL}/orders/{order1['id']}")
    assert r.status_code == 200
    order_data = r.json()
    assert order_data['returnRequest']['returnStatus'] == 'REFUND_DETAILS_SUBMITTED'
    assert order_data['returnRequest']['refundDetails']['upiId'] == 'priyasharma@okaxis'
    print("[OK] Customer order details reflects REFUND_DETAILS_SUBMITTED and refundDetails object.")

    # 14. NOW TEST BANK TRANSFER FLOW ON A SECOND ORDER
    r = cust1_sess.post(f"{BASE_URL}/orders", json={
        "items": [{"id": prod['id'], "qty": 1}],
        "address": order_payload['address'],
        "payment": "cod"
    })
    assert r.status_code == 200
    order2 = r.json()['order']
    admin_sess.put(f"{BASE_URL}/admin/orders/{order2['id']}", json={"status": "delivered"})
    r = cust1_sess.post(f"{BASE_URL}/returns", json={
        "orderId": order2['id'],
        "items": [{"id": prod['id'], "returnQty": 1}],
        "reason": "Quality issue"
    })
    assert r.status_code == 200
    ret2_id = r.json()['return']['id']

    # Admin approves Return 2
    r = admin_sess.post(f"{BASE_URL}/admin/returns/{ret2_id}/approve")
    assert r.status_code == 200

    # Test Bank Transfer Validation: invalid IFSC
    r = cust1_sess.post(f"{BASE_URL}/returns/{ret2_id}/refund-details", json={
        "method": "bank_transfer",
        "accountHolderName": "Priya Sharma",
        "accountNumber": "123456789012",
        "confirmAccountNumber": "123456789012",
        "ifscCode": "INVALID_IFSC",
        "bankName": "HDFC Bank"
    })
    assert r.status_code == 400
    print(f"[OK] Bank validation passed: Invalid IFSC blocked: {r.json()['error']}")

    # Test Bank Transfer Validation: mismatched account numbers
    r = cust1_sess.post(f"{BASE_URL}/returns/{ret2_id}/refund-details", json={
        "method": "bank_transfer",
        "accountHolderName": "Priya Sharma",
        "accountNumber": "123456789012",
        "confirmAccountNumber": "999999999999",
        "ifscCode": "HDFC0001234",
        "bankName": "HDFC Bank"
    })
    assert r.status_code == 400
    print(f"[OK] Bank validation passed: Mismatched account numbers blocked: {r.json()['error']}")

    # Submit Valid Bank Transfer details
    r = cust1_sess.post(f"{BASE_URL}/returns/{ret2_id}/refund-details", json={
        "method": "bank_transfer",
        "accountHolderName": "Priya Sharma",
        "accountNumber": "50100234564521",
        "confirmAccountNumber": "50100234564521",
        "ifscCode": "HDFC0001234",
        "bankName": "HDFC Bank"
    })
    assert r.status_code == 200
    ret2_bank = r.json()['return']
    assert ret2_bank['returnStatus'] == 'REFUND_DETAILS_SUBMITTED'
    assert ret2_bank['refundDetails']['method'] == 'bank_transfer'
    assert ret2_bank['refundDetails']['accountNumberMasked'] == 'XXXX XXXX 4521'
    # Security check: raw account number should NOT be returned to customer
    assert 'accountNumber' not in ret2_bank['refundDetails'], "Raw account number should be masked for customer!"
    print(f"[OK] Bank Transfer submitted! Masked Account: {ret2_bank['refundDetails']['accountNumberMasked']}")

    # 15. Admin views returns list & detail -> verifies refundDetails presence
    r = admin_sess.get(f"{BASE_URL}/admin/returns")
    assert r.status_code == 200
    admin_returns = r.json()['returns']
    r2_admin = next(x for x in admin_returns if x['id'] == ret2_id)
    assert r2_admin['returnStatus'] == 'REFUND_DETAILS_SUBMITTED'
    assert r2_admin.get('refundDetails') is not None
    assert r2_admin['refundDetails']['accountNumberMasked'] == 'XXXX XXXX 4521'
    print(f"[OK] Admin returns list shows REFUND_DETAILS_SUBMITTED and customer bank details.")

    # 16. Admin issues refund on return with status REFUND_DETAILS_SUBMITTED
    r = admin_sess.post(f"{BASE_URL}/admin/returns/{ret2_id}/refund")
    assert r.status_code == 200
    assert r.json()['return']['returnStatus'] == 'REFUNDED'
    print("[OK] Admin successfully processed refund after refund details submitted!")

    # 17. Verify Audit Log contains refund_details_submitted
    r = admin_sess.get(f"{BASE_URL}/admin/returns/{ret2_id}/audit-logs")
    assert r.status_code == 200
    actions = [log['action'] for log in r.json()['auditLogs']]
    assert 'refund_details_submitted' in actions
    print(f"[OK] Audit Log includes 'refund_details_submitted': {actions}")

    print("\n" + "=" * 80)
    print("ALL REFUND DETAILS FLOW TESTS PASSED SUCCESSFULLY (100%)!")
    print("=" * 80)

if __name__ == '__main__':
    run_refund_details_test()
