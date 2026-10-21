import requests
import json
import uuid
from datetime import datetime, timedelta
from pymongo import MongoClient

BASE_URL = 'http://localhost:3000/api'

def test_dynamic_return_window():
    print("=" * 80)
    print("TEST SUITE: DYNAMIC ORDER RETURN WINDOW CONTROLLED FROM BACKEND")
    print("=" * 80)

    # 1. Admin Login
    admin_sess = requests.Session()
    admin_emails = ["akash@unictechnology.com", "admin@mikumantra.com"]
    passwords = ["12341234", "admin123", "password123"]
    admin_logged_in = False
    for em in admin_emails:
        for pw in passwords:
            r = admin_sess.post(f"{BASE_URL}/auth/login", json={"email": em, "password": pw})
            if r.status_code == 200:
                admin_logged_in = True
                print(f"[OK] Admin logged in as {em}")
                break
        if admin_logged_in:
            break
    assert admin_logged_in, "Admin login failed"

    # 2. Check current return policy via GET /api/admin/returns/policy
    r = admin_sess.get(f"{BASE_URL}/admin/returns/policy")
    assert r.status_code == 200, f"Failed to get return policy: {r.text}"
    init_policy = r.json().get('returnPolicy')
    print(f"[OK] Initial Return Policy: {init_policy}")
    assert 'duration' in init_policy
    assert 'unit' in init_policy
    assert 'enabled' in init_policy

    # 3. Check public /api/site-settings
    r = requests.get(f"{BASE_URL}/site-settings")
    assert r.status_code == 200
    pub_settings = r.json()
    assert 'returnWindow' in pub_settings
    print(f"[OK] Public site-settings returnWindow: {pub_settings['returnWindow']}")

    # 4. Connect to MongoDB to manipulate timestamps for exact testing
    mongo_uri = "mongodb://akashsriv1984_db_user:2M5Edv773XLUmT15@ac-htqrxv1-shard-00-00.7szyylz.mongodb.net:27017,ac-htqrxv1-shard-00-01.7szyylz.mongodb.net:27017,ac-htqrxv1-shard-00-02.7szyylz.mongodb.net:27017/userPortal?ssl=true&replicaSet=atlas-1c5jr9-shard-0&authSource=admin&retryWrites=true&w=majority"
    client = MongoClient(mongo_uri, serverSelectionTimeoutMS=8000)
    db = client['userPortal']

    # 5. Create a customer & place an order
    cust_sess = requests.Session()
    cust_email = f"dynamic_ret_{uuid.uuid4().hex[:6]}@example.com"
    r = cust_sess.post(f"{BASE_URL}/auth/register", json={
        "name": "Alex Dynamic",
        "email": cust_email,
        "password": "Password123!",
        "phone": "+919876543288"
    })
    assert r.status_code == 200, f"Customer registration failed: {r.text}"
    reg_json = r.json()
    if reg_json.get('requiresVerification'):
        # Query verification code from DB
        ver_doc = db.email_verifications.find_one({"email": cust_email.lower(), "used": False})
        assert ver_doc is not None, "Verification code record not found in MongoDB"
        code = ver_doc['code']
        r_ver = cust_sess.post(f"{BASE_URL}/auth/verify-registration", json={"email": cust_email, "code": code})
        assert r_ver.status_code == 200, f"Verification failed: {r_ver.text}"
        user = r_ver.json()['user']
    else:
        user = reg_json['user']
    print(f"[OK] Registered Customer: {user['name']} ({cust_email})")

    # Fetch product
    r = requests.get(f"{BASE_URL}/products?limit=50")
    assert r.status_code == 200
    products = r.json()['products']
    in_stock = [p for p in products if p.get('stock', 0) > 0]
    if not in_stock:
        # Replenish first product stock in DB
        db.products.update_one({"id": products[0]['id']}, {"$set": {"stock": 100}})
        prod = products[0]
    else:
        prod = in_stock[0]

    # Place Order 1
    order_data = {
        "items": [{"id": prod['id'], "qty": 1}],
        "address": {
            "fullName": "Alex Dynamic",
            "phone": "+919876543288",
            "line1": "12 Palace Road",
            "city": "Jaipur",
            "state": "Rajasthan",
            "pincode": "302001"
        },
        "payment": "cod"
    }
    r = cust_sess.post(f"{BASE_URL}/orders", json=order_data)
    assert r.status_code == 200, f"Order placement failed: {r.text}"
    order1 = r.json()['order']
    print(f"[OK] Order placed: {order1['orderNumber']} (ID: {order1['id']})")

    # Mark delivered
    r = admin_sess.put(f"{BASE_URL}/admin/orders/{order1['id']}", json={"status": "delivered"})
    assert r.status_code == 200

    # 6. Test Scenario A: Update Return Policy to 2 Hours via Admin API
    print("\n--- Scenario A: Set Return Window to 2 Hours ---")
    r = admin_sess.put(f"{BASE_URL}/admin/returns/policy", json={"enabled": True, "duration": 2, "unit": "hours"})
    assert r.status_code == 200, f"Updating policy failed: {r.text}"
    updated_policy = r.json().get('returnPolicy')
    assert updated_policy['duration'] == 2
    assert updated_policy['unit'] == 'hours'
    print(f"[OK] Return Policy updated to: {updated_policy}")

    # Check that customer /api/orders/[id] returns this returnWindow
    r = cust_sess.get(f"{BASE_URL}/orders/{order1['id']}")
    assert r.status_code == 200
    order_data_fetched = r.json()
    assert order_data_fetched['returnWindow']['duration'] == 2
    assert order_data_fetched['returnWindow']['unit'] == 'hours'
    print(f"[OK] Customer /api/orders/[id] reflects returnWindow: {order_data_fetched['returnWindow']}")

    # Set deliveredAt to 45 minutes ago in DB (would be expired under 30-min rule, but VALID under 2-hour rule!)
    forty_five_mins_ago = datetime.utcnow() - timedelta(minutes=45)
    db.orders.update_one({"id": order1['id']}, {"$set": {"deliveredAt": forty_five_mins_ago}})

    # Customer submits return request -> MUST SUCCEED because 45 mins < 2 hours (120 mins)
    return_payload = {
        "orderId": order1['id'],
        "items": [{"id": prod['id'], "returnQty": 1}],
        "reason": "Size issue",
        "comment": "Testing 2-hour return window"
    }
    r = cust_sess.post(f"{BASE_URL}/returns", json=return_payload)
    assert r.status_code == 200, f"Expected return to succeed under 2h window, got {r.status_code}: {r.text}"
    ret1 = r.json().get('return')
    assert ret1 is not None
    assert ret1['returnStatus'] == 'REQUESTED'
    print(f"[OK] Return request submitted successfully for order delivered 45m ago under 2-hour policy!")

    # 7. Test Scenario B: Update Return Policy to 10 Minutes and test expiration
    print("\n--- Scenario B: Set Return Window to 10 Minutes & Verify Expiration ---")
    r = admin_sess.put(f"{BASE_URL}/admin/returns/policy", json={"enabled": True, "duration": 10, "unit": "minutes"})
    assert r.status_code == 200
    print("[OK] Return Policy updated to: 10 minutes")

    # Place Order 2
    r = cust_sess.post(f"{BASE_URL}/orders", json=order_data)
    assert r.status_code == 200
    order2 = r.json()['order']
    admin_sess.put(f"{BASE_URL}/admin/orders/{order2['id']}", json={"status": "delivered"})

    # Set deliveredAt to 25 minutes ago (exceeds 10-minute window)
    twenty_five_mins_ago = datetime.utcnow() - timedelta(minutes=25)
    db.orders.update_one({"id": order2['id']}, {"$set": {"deliveredAt": twenty_five_mins_ago}})

    r = cust_sess.post(f"{BASE_URL}/returns", json={
        "orderId": order2['id'],
        "items": [{"id": prod['id'], "returnQty": 1}],
        "reason": "Damaged on arrival"
    })
    assert r.status_code == 400, f"Expected 400 for expired return, got {r.status_code}: {r.text}"
    assert "Return window expired" in r.text
    assert "10 minutes" in r.text
    print(f"[OK] Expiration correctly blocked return with dynamic message: '{r.json().get('error')}'")

    # 8. Test Scenario C: Disable Returns Completely (enabled: false)
    print("\n--- Scenario C: Disable Returns via Backend Policy ---")
    r = admin_sess.put(f"{BASE_URL}/admin/returns/policy", json={"enabled": False, "duration": 10, "unit": "minutes"})
    assert r.status_code == 200
    print("[OK] Return Policy disabled globally")

    # Place Order 3 & deliver now
    r = cust_sess.post(f"{BASE_URL}/orders", json=order_data)
    assert r.status_code == 200
    order3 = r.json()['order']
    admin_sess.put(f"{BASE_URL}/admin/orders/{order3['id']}", json={"status": "delivered"})

    # Customer attempts return immediately
    r = cust_sess.post(f"{BASE_URL}/returns", json={
        "orderId": order3['id'],
        "items": [{"id": prod['id'], "returnQty": 1}],
        "reason": "Defective item"
    })
    assert r.status_code == 400, f"Expected 400 for disabled returns, got {r.status_code}: {r.text}"
    assert "disabled" in r.text.lower()
    print(f"[OK] Backend successfully blocked return when policy is disabled: '{r.json().get('error')}'")

    # 9. Test Scenario D: Update via Admin Site Settings (/api/admin/site-settings)
    print("\n--- Scenario D: Update Return Policy via /api/admin/site-settings ---")
    r = admin_sess.get(f"{BASE_URL}/admin/site-settings")
    assert r.status_code == 200
    site_st = r.json()
    assert 'returnWindow' in site_st

    site_st['returnWindow'] = {"enabled": True, "duration": 7, "unit": "days"}
    r = admin_sess.put(f"{BASE_URL}/admin/site-settings", json=site_st)
    assert r.status_code == 200
    assert r.json().get('returnWindow', {}).get('duration') == 7
    assert r.json().get('returnWindow', {}).get('unit') == 'days'
    print("[OK] Site-settings PUT successfully updated returnWindow to 7 days!")

    # Verify /api/admin/returns/policy also sees 7 days
    r = admin_sess.get(f"{BASE_URL}/admin/returns/policy")
    assert r.status_code == 200
    assert r.json()['returnPolicy']['duration'] == 7
    assert r.json()['returnPolicy']['unit'] == 'days'
    print("[OK] /api/admin/returns/policy is fully synchronized with site-settings (7 days)!")

    # 10. Clean up / Restore policy to 30 minutes
    print("\n--- Restore Default Policy (30 minutes) ---")
    r = admin_sess.put(f"{BASE_URL}/admin/returns/policy", json={"enabled": True, "duration": 30, "unit": "minutes"})
    assert r.status_code == 200
    print("[OK] Restored return policy to 30 minutes!")

    print("\n" + "=" * 80)
    print("ALL DYNAMIC RETURN WINDOW BACKEND CONTROL TESTS PASSED SUCCESSFULLY!")
    print("=" * 80)

if __name__ == '__main__':
    test_dynamic_return_window()
