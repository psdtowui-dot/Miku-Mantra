import requests
import json
import time

BASE_URL = "http://localhost:3000/api"

def run_tests():
    session = requests.Session()
    print("\n" + "=" * 65)
    print("STARTING ORDER STATUS EMAIL NOTIFICATIONS COMPREHENSIVE TEST SUITE")
    print("=" * 65 + "\n")

    # 1. Admin Authentication
    admin_candidates = [
        ("akash@unictechnology.com", "12341234"),
        ("admin@mikumantra.com", "admin123"),
        ("admin@aurelia.com", "admin123"),
        ("kk1414497@gmail.com", "12341234"),
        ("kk1414497@gmail.com", "admin123")
    ]
    logged_in = False
    admin_user = None

    for em, pw in admin_candidates:
        r = session.post(f"{BASE_URL}/auth/login", json={"email": em, "password": pw})
        if r.status_code == 200:
            u = r.json().get("user", {})
            if u.get("role") == "admin":
                logged_in = True
                admin_user = u
                print(f"[PASS] 1. Admin Login Successful as {em} (Role: {u.get('role')})")
                break

    if not logged_in:
        # Try registering an admin or login via registration
        reg_r = session.post(f"{BASE_URL}/auth/register", json={
            "name": "Super Admin",
            "email": "admin@aurelia.com",
            "password": "password123"
        })
        if reg_r.status_code in [200, 201]:
            u = reg_r.json().get("user", {})
            if u.get("role") == "admin":
                logged_in = True
                admin_user = u
                print(f"[PASS] 1. Created and logged in new Admin as admin@aurelia.com")
        elif reg_r.status_code == 409:
            # Login with password123
            r = session.post(f"{BASE_URL}/auth/login", json={"email": "admin@aurelia.com", "password": "password123"})
            if r.status_code == 200:
                logged_in = True
                admin_user = r.json().get("user", {})
                print(f"[PASS] 1. Logged in as admin@aurelia.com")

    assert logged_in, "Failed to authenticate as admin"

    # 2. Verify Email Templates Endpoint (Admin)
    templates_res = session.get(f"{BASE_URL}/admin/email-templates")
    assert templates_res.status_code == 200, f"Failed to fetch email templates: {templates_res.text}"
    templates = templates_res.json()
    template_ids = [t.get("id") for t in templates]
    print(f"[PASS] 2. Email Templates listed ({len(templates)} templates): {', '.join(template_ids)}")
    for expected_id in ["order_confirmation", "order_processing", "order_shipped", "order_out_for_delivery", "order_delivered", "order_cancelled", "order_refunded"]:
        assert expected_id in template_ids, f"Expected template '{expected_id}' not found in /admin/email-templates"
    print("[PASS] 3. All required order status templates exist in the system")

    # 3. Fetch products to create a test order
    prod_res = session.get(f"{BASE_URL}/products")
    assert prod_res.status_code == 200, f"Failed to get products: {prod_res.text}"
    p_data = prod_res.json()
    products = p_data.get("products", []) if isinstance(p_data, dict) else p_data
    assert len(products) > 0, "No products found to order"
    test_prod = products[0]

    # 4. Create Order with Customer Email
    test_customer_email = "kk1414497@gmail.com"  # Using configured sender/admin test inbox
    order_payload = {
        "items": [{ "id": test_prod["id"], "qty": 1 }],
        "customerEmail": test_customer_email,
        "address": {
            "fullName": "Meera Rathore",
            "email": test_customer_email,
            "phone": "9829012345",
            "line1": "Atelier Villa 12, Tonk Road",
            "city": "Jaipur",
            "state": "Rajasthan",
            "pincode": "302015"
        },
        "payment": "cod"
    }
    create_res = session.post(f"{BASE_URL}/orders", json=order_payload)
    assert create_res.status_code == 200, f"Order creation failed: {create_res.text}"
    order_data = create_res.json().get("order") or create_res.json()
    order_id = order_data["id"]
    order_num = order_data["orderNumber"]
    print(f"[PASS] 4. Created Test Order #{order_num} (ID: {order_id}) for {test_customer_email}")

    # 5. Transition: Confirmed -> Processing
    update_res = session.put(f"{BASE_URL}/admin/orders/{order_id}", json={
        "status": "processing",
        "note": "Artisan assigned for 22K gold hallmarking and finishing."
    })
    assert update_res.status_code == 200, f"Failed to update status to processing: {update_res.text}"
    up_data = update_res.json()
    up_order = up_data.get("order", {})
    email_notif = up_data.get("emailNotification", {})

    assert up_order.get("status") == "processing", f"Expected status 'processing', got {up_order.get('status')}"
    assert email_notif.get("sent") is True, f"Expected email sent=True, got {email_notif}"
    print(f"[PASS] 5. Status updated to 'processing'. Email notification sent successfully: {email_notif.get('provider')} (ID: {email_notif.get('messageId')})")

    # 6. Deduplication Check: Saving same status again should NOT send duplicate email
    dup_res = session.put(f"{BASE_URL}/admin/orders/{order_id}", json={
        "status": "processing"
    })
    assert dup_res.status_code == 200
    dup_data = dup_res.json()
    dup_email = dup_data.get("emailNotification", {})
    assert dup_email.get("skipped") is True, f"Expected duplicate email to be skipped, got {dup_email}"
    assert dup_email.get("reason") in ["STATUS_UNCHANGED", "ALREADY_SENT"]
    print(f"[PASS] 6. Deduplication verified: Re-saving 'processing' skipped duplicate email (Reason: {dup_email.get('reason')})")

    # 7. Transition: Processing -> Shipped with Courier Details
    courier_payload = {
        "status": "shipped",
        "courier": {
            "carrier": "Blue Dart",
            "trackingNumber": "BD30491829012",
            "trackingUrl": "https://www.bluedart.com/tracking?trackNumber=BD30491829012",
            "notes": "Express transit insured luxury jewellery"
        }
    }
    ship_res = session.put(f"{BASE_URL}/admin/orders/{order_id}", json=courier_payload)
    assert ship_res.status_code == 200, f"Shipment transition failed: {ship_res.text}"
    ship_data = ship_res.json()
    ship_order = ship_data.get("order", {})
    ship_email = ship_data.get("emailNotification", {})

    assert ship_order.get("status") == "shipped"
    assert ship_order.get("courier", {}).get("carrier") == "Blue Dart"
    assert ship_order.get("courier", {}).get("trackingNumber") == "BD30491829012"
    assert ship_order.get("carrier") == "Blue Dart"
    assert ship_order.get("trackingNumber") == "BD30491829012"
    assert ship_email.get("sent") is True, f"Expected shipment email sent=True, got {ship_email}"
    print(f"[PASS] 7. Status updated to 'shipped' with courier AWB BD30491829012. Email delivered: {ship_email.get('provider')} (ID: {ship_email.get('messageId')})")

    # 8. Transition: Shipped -> Delivered
    deliv_res = session.put(f"{BASE_URL}/admin/orders/{order_id}", json={
        "status": "delivered",
        "note": "Handed over to customer with OTP verification."
    })
    assert deliv_res.status_code == 200, f"Delivery transition failed: {deliv_res.text}"
    deliv_data = deliv_res.json()
    deliv_order = deliv_data.get("order", {})
    deliv_email = deliv_data.get("emailNotification", {})

    assert deliv_order.get("status") == "delivered"
    assert deliv_order.get("deliveredAt") is not None, "deliveredAt timestamp should be set"
    assert deliv_email.get("sent") is True, f"Expected delivery email sent=True, got {deliv_email}"
    print(f"[PASS] 8. Status updated to 'delivered'. Email delivered: {deliv_email.get('provider')} (ID: {deliv_email.get('messageId')})")

    # 9. Cancellation Flow & Cancellation Email Notification
    cancel_order_payload = {
        "items": [{ "id": test_prod["id"], "qty": 1 }],
        "customerEmail": test_customer_email,
        "address": {
            "fullName": "Meera Rathore",
            "email": test_customer_email,
            "phone": "9829012345",
            "line1": "Atelier Villa 12, Tonk Road",
            "city": "Jaipur",
            "state": "Rajasthan",
            "pincode": "302015"
        },
        "payment": "cod"
    }
    create_cancel_res = session.post(f"{BASE_URL}/orders", json=cancel_order_payload)
    assert create_cancel_res.status_code == 200
    cancel_order_id = create_cancel_res.json().get("order", {})["id"]

    cancel_res = session.put(f"{BASE_URL}/admin/orders/{cancel_order_id}", json={
        "status": "cancelled",
        "reason": "Customer requested cancellation before dispatch"
    })
    assert cancel_res.status_code == 200, f"Cancellation failed: {cancel_res.text}"
    cancel_data = cancel_res.json()
    cancel_order = cancel_data.get("order", {})
    cancel_email = cancel_data.get("emailNotification", {})

    assert cancel_order.get("status") == "cancelled"
    assert cancel_order.get("cancelledAt") is not None
    assert cancel_email.get("sent") is True, f"Expected cancellation email sent=True, got {cancel_email}"
    print(f"[PASS] 9. Order cancelled successfully. Cancellation email sent to customer (ID: {cancel_email.get('messageId')})")

    # 10. Terminal State Protection: Cancelled order cannot be changed
    term_res = session.put(f"{BASE_URL}/admin/orders/{cancel_order_id}", json={
        "status": "processing"
    })
    assert term_res.status_code == 400, f"Expected 400 on updating cancelled order, got {term_res.status_code}"
    print("[PASS] 10. Terminal state enforced: Cancelled orders cannot be reopened or updated")

    # 11. Invalid Status Validation
    invalid_res = session.put(f"{BASE_URL}/admin/orders/{order_id}", json={
        "status": "invalid_bogus_status"
    })
    assert invalid_res.status_code == 400, f"Expected 400 on invalid status, got {invalid_res.status_code}"
    print("[PASS] 11. Invalid status update rejected with 400 Bad Request")

    # 12. Missing Email Address Safe Handling
    no_email_order = {
        "items": [{ "id": test_prod["id"], "qty": 1 }],
        "address": {
            "fullName": "Walk-in Guest",
            "phone": "9999999999",
            "line1": "Atelier Counter",
            "city": "Jaipur",
            "state": "Rajasthan",
            "pincode": "302001"
        },
        "payment": "cod"
    }
    no_em_res = session.post(f"{BASE_URL}/orders", json=no_email_order)
    assert no_em_res.status_code == 200
    no_em_id = no_em_res.json().get("order", {})["id"]

    # Strip any email fields in MongoDB to simulate phone/walk-in orders without customer email
    from pymongo import MongoClient
    mongo_client = MongoClient("mongodb+srv://akashsriv1984_db_user:2M5Edv773XLUmT15@cluster0.7szyylz.mongodb.net/userPortal?retryWrites=true&w=majority")
    db = mongo_client["userPortal"]
    db.orders.update_one(
        {"id": no_em_id},
        {"$unset": {"customerEmail": "", "guestEmail": "", "address.email": ""}, "$set": {"userId": "unregistered-walkin-user"}}
    )

    no_em_up = session.put(f"{BASE_URL}/admin/orders/{no_em_id}", json={
        "status": "processing"
    })
    assert no_em_up.status_code == 200
    no_em_data = no_em_up.json()
    assert no_em_data.get("order", {}).get("status") == "processing"
    assert no_em_data.get("emailNotification", {}).get("skipped") is True
    assert no_em_data.get("emailNotification", {}).get("reason") == "NO_CUSTOMER_EMAIL"
    print("[PASS] 12. Missing customer email handled safely without error (order updated, email skipped)")

    # 13. Test Email Template Endpoint for All Status Templates
    for t_id in ["order_processing", "order_out_for_delivery", "order_delivered", "order_cancelled", "order_refunded"]:
        test_send_res = session.post(f"{BASE_URL}/admin/email-templates/{t_id}/test", json={
            "toEmail": test_customer_email
        })
        assert test_send_res.status_code == 200, f"Failed to test template {t_id}: {test_send_res.text}"
        res_json = test_send_res.json()
        assert res_json.get("success") is True, f"Test send failed for {t_id}: {res_json}"
        print(f"[PASS] 13. Test dispatch succeeded for '{t_id}' (MessageId: {res_json.get('messageId')})")

    print("\n" + "=" * 65)
    print("ALL 13 ORDER STATUS EMAIL NOTIFICATION TESTS PASSED SUCCESSFULLY!")
    print("=" * 65 + "\n")

if __name__ == "__main__":
    run_tests()
