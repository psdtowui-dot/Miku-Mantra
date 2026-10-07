import requests
import json
import time

BASE_URL = "http://localhost:3000/api"

def run_tests():
    session = requests.Session()
    print("\n=======================================================")
    print("STARTING COURIER TRACKING SYSTEM INTEGRATION TEST SUITE")
    print("=======================================================\n")

    # Step 1: Admin Login
    admin_emails = ["akash@unictechnology.com", "kk1414497@gmail.com", "admin@aurelia.com"]
    passwords = ["12341234", "admin123", "password123"]
    logged_in = False
    admin_user = None
    for em in admin_emails:
        for pw in passwords:
            r = session.post(f"{BASE_URL}/auth/login", json={"email": em, "password": pw})
            if r.status_code == 200:
                user_obj = r.json().get("user", {})
                if user_obj.get("role") == "admin":
                    logged_in = True
                    admin_user = user_obj
                    print(f"[PASS] 1. Admin Login Successful as {em} (role: {admin_user.get('role')})")
                    break
        if logged_in:
            break
    assert logged_in, "Admin login failed for all candidate credentials"

    # Step 2: Fetch products to create a test order
    prod_res = session.get(f"{BASE_URL}/products")
    assert prod_res.status_code == 200, f"Products fetch failed: {prod_res.text}"
    p_data = prod_res.json()
    products = p_data.get("products", []) if isinstance(p_data, dict) else (p_data if isinstance(p_data, list) else [])
    assert len(products) > 0, "No products found in DB"
    test_prod = products[0]

    order_payload = {
        "items": [{ "id": test_prod["id"], "qty": 1 }],
        "address": {
            "fullName": "Rohit Malhotra",
            "phone": "9812345678",
            "line1": "Flat 402, Royal Palms, Civil Lines",
            "city": "Jaipur",
            "state": "Rajasthan",
            "pincode": "302006"
        },
        "payment": "cod"
    }
    create_res = session.post(f"{BASE_URL}/orders", json=order_payload)
    assert create_res.status_code == 200, f"Order creation failed: {create_res.text}"
    order_data = create_res.json()
    order = order_data.get("order") or order_data
    order_id = order["id"]
    order_num = order["orderNumber"]
    print(f"[PASS] 2. Created Test Order #{order_num} (ID: {order_id})")

    # Step 3: Admin Transitions Order to 'shipped' with Courier details
    courier_payload = {
        "status": "shipped",
        "courier": {
            "carrier": "Blue Dart",
            "trackingNumber": "30491829012",
            "trackingUrl": "https://www.bluedart.com/tracking?trackNumber=30491829012",
            "notes": "Fragile luxury jewellery package, signature required"
        }
    }
    ship_res = session.put(f"{BASE_URL}/admin/orders/{order_id}", json=courier_payload)
    assert ship_res.status_code == 200, f"Failed to ship order: {ship_res.text}"
    shipped_data = ship_res.json()
    shipped_order = shipped_data.get("order") or shipped_data

    # Step 4: Verify Order Data Model
    assert shipped_order.get("status") == "shipped", f"Expected status 'shipped', got {shipped_order.get('status')}"
    courier_doc = shipped_order.get("courier")
    assert courier_doc is not None, "shipped_order['courier'] should be present"
    assert courier_doc.get("carrier") == "Blue Dart", f"Expected carrier 'Blue Dart', got {courier_doc.get('carrier')}"
    assert courier_doc.get("trackingNumber") == "30491829012", f"Expected AWB 30491829012, got {courier_doc.get('trackingNumber')}"
    assert "https://www.bluedart.com/tracking?trackNumber=30491829012" in courier_doc.get("trackingUrl", "")
    assert courier_doc.get("notes") == "Fragile luxury jewellery package, signature required"
    assert courier_doc.get("shippedAt") is not None, "courier.shippedAt should be populated"

    # Verify top-level indexing fields
    assert shipped_order.get("carrier") == "Blue Dart", "Top-level carrier should match"
    assert shipped_order.get("trackingNumber") == "30491829012", "Top-level trackingNumber should match"
    assert shipped_order.get("trackingUrl") == courier_doc.get("trackingUrl"), "Top-level trackingUrl should match"
    assert shipped_order.get("shippedAt") is not None, "Top-level shippedAt should be set"

    # Verify statusHistory
    status_hist = shipped_order.get("statusHistory", [])
    shipped_hist = next((h for h in status_hist if h.get("status") == "shipped"), None)
    assert shipped_hist is not None, "Status history should contain 'shipped' step"
    assert "Shipped via Blue Dart (AWB: 30491829012)" in shipped_hist.get("note", ""), f"Unexpected note: {shipped_hist.get('note')}"
    print(f"[PASS] 3. Order transitioned to 'shipped' with structured courier schema & statusHistory note: '{shipped_hist.get('note')}'")

    # Step 5: Post-Shipment Edits (Admin updates tracking details without changing status)
    edit_payload = {
        "courier": {
            "carrier": "Delhivery",
            "trackingNumber": "DEL9988776655",
            "trackingUrl": "https://www.delhivery.com/track/package/DEL9988776655",
            "notes": "Express delivery requested by customer"
        }
    }
    edit_res = session.put(f"{BASE_URL}/admin/orders/{order_id}", json=edit_payload)
    assert edit_res.status_code == 200, f"Post-shipment edit failed: {edit_res.text}"
    edited_order = edit_res.json().get("order") or edit_res.json()
    assert edited_order.get("status") == "shipped", "Status should remain 'shipped'"
    assert edited_order.get("carrier") == "Delhivery", f"Expected carrier 'Delhivery', got {edited_order.get('carrier')}"
    assert edited_order.get("trackingNumber") == "DEL9988776655", f"Expected AWB DEL9988776655, got {edited_order.get('trackingNumber')}"
    assert edited_order.get("courier", {}).get("notes") == "Express delivery requested by customer"
    
    # Check that statusHistory received an update entry
    hist = edited_order.get("statusHistory", [])
    latest_hist = hist[-1] if hist else {}
    assert "Courier tracking updated" in latest_hist.get("note", "") or "Delhivery" in latest_hist.get("note", "")
    print(f"[PASS] 4. Post-Shipment Tracking Edit succeeded without changing order status")

    # Step 6: Customer Order Fetch Endpoint (/api/orders/[id])
    cust_res = session.get(f"{BASE_URL}/orders/{order_id}")
    assert cust_res.status_code == 200, f"Customer order fetch failed: {cust_res.text}"
    cust_order_data = cust_res.json().get("order") or cust_res.json()
    assert cust_order_data.get("courier") is not None, "Customer should see courier object"
    assert cust_order_data.get("courier", {}).get("carrier") == "Delhivery"
    assert cust_order_data.get("courier", {}).get("trackingNumber") == "DEL9988776655"
    assert cust_order_data.get("carrier") == "Delhivery"
    assert cust_order_data.get("trackingNumber") == "DEL9988776655"
    print(f"[PASS] 5. Customer GET /api/orders/{order_id} exposes full courier & tracking details")

    # Step 7: Shipping Slip PDF Generation (/api/orders/[id]/shippingslip)
    slip_res = session.get(f"{BASE_URL}/orders/{order_id}/shippingslip")
    assert slip_res.status_code == 200, f"Shipping slip PDF failed with {slip_res.status_code}: {slip_res.text[:200]}"
    assert "application/pdf" in slip_res.headers.get("Content-Type", ""), f"Expected PDF content type, got {slip_res.headers.get('Content-Type')}"
    assert len(slip_res.content) > 500, f"PDF file size too small: {len(slip_res.content)} bytes"
    print(f"[PASS] 6. Printable Shipping Slip & PDF endpoint successfully built ({len(slip_res.content)} bytes)")

    # Step 8: Admin Search by AWB / Tracking Number
    search_res = session.get(f"{BASE_URL}/admin/orders?search=DEL9988776655")
    assert search_res.status_code == 200, f"Admin search failed: {search_res.text}"
    search_orders = search_res.json().get("orders", [])
    matching_found = any(o.get("id") == order_id for o in search_orders)
    assert matching_found, f"Order {order_id} not found when searching by AWB DEL9988776655"
    print(f"[PASS] 7. Admin Orders Search by AWB Tracking Number succeeded")

    # Step 9: Skip Tracking Flow (Ship without AWB initially, add AWB later)
    skip_order_payload = {
        "items": [{ "id": test_prod["id"], "qty": 1 }],
        "address": {
            "fullName": "Meera Kapoor",
            "phone": "9876501234",
            "line1": "Villa 12, Palm Meadows",
            "city": "Bengaluru",
            "state": "Karnataka",
            "pincode": "560066"
        },
        "payment": "cod"
    }
    skip_create_res = session.post(f"{BASE_URL}/orders", json=skip_order_payload)
    assert skip_create_res.status_code == 200
    skip_order_id = skip_create_res.json().get("order", {}).get("id")

    # Ship with AWB skipped
    skip_ship_res = session.put(f"{BASE_URL}/admin/orders/{skip_order_id}", json={
        "status": "shipped",
        "courier": {
            "carrier": "DTDC",
            "trackingNumber": "",
            "trackingUrl": "",
            "notes": "Shipped without AWB (manifest pending from carrier)."
        }
    })
    assert skip_ship_res.status_code == 200
    skip_shipped_order = skip_ship_res.json().get("order", {})
    assert skip_shipped_order.get("status") == "shipped"
    assert skip_shipped_order.get("carrier") == "DTDC"
    assert skip_shipped_order.get("trackingNumber") == ""
    print(f"[PASS] 8. Skip Tracking (Ship without AWB) flow verified")

    # Now add AWB to skipped order
    add_awb_res = session.put(f"{BASE_URL}/admin/orders/{skip_order_id}", json={
        "courier": {
            "carrier": "DTDC",
            "trackingNumber": "DTDC55443322",
            "trackingUrl": "https://www.dtdc.in/tracking/shipment-tracking.asp?awb=DTDC55443322",
            "notes": "Manifest scanned and AWB assigned"
        }
    })
    assert add_awb_res.status_code == 200
    assigned_order = add_awb_res.json().get("order", {})
    assert assigned_order.get("trackingNumber") == "DTDC55443322"
    assert assigned_order.get("carrier") == "DTDC"
    print(f"[PASS] 9. Later AWB assignment to previously skipped order verified")

    print("\n=======================================================")
    print("ALL 9 COURIER TRACKING TESTS PASSED SUCCESSFULLY!")
    print("=======================================================\n")

if __name__ == "__main__":
    run_tests()
