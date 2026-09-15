import requests
import json

BASE_URL = "http://localhost:3000/api"

def run_tests():
    session = requests.Session()
    print("\n=========================================")
    print("STARTING DYNAMIC SHIPPING SYSTEM VERIFICATION")
    print("=========================================\n")

    # 0. Admin Login
    admin_emails = ["admin@mikumantra.com", "akash@unictechnology.com"]
    passwords = ["12341234", "admin123", "password123"]
    logged_in = False
    for em in admin_emails:
        for pw in passwords:
            r = session.post(f"{BASE_URL}/auth/login", json={"email": em, "password": pw})
            if r.status_code == 200:
                logged_in = True
                print(f"[PASS] 0. Admin Login Successful as {em}")
                break
        if logged_in:
            break
    assert logged_in, "Admin login failed for all candidate credentials"

    # Reset site settings shipping config to defaults: freeShippingEnabled=True, threshold=2000, standard=500
    init_res = session.put(f"{BASE_URL}/admin/site-settings", json={
        "siteName": "MikuMantra Fine Jewellery",
        "shipping": {
            "freeShippingEnabled": True,
            "freeShippingThreshold": 2000,
            "standardShippingCharge": 500
        }
    })
    assert init_res.status_code == 200, f"Failed to reset site settings: {init_res.text}"
    print("[PASS] Initialized Site Settings to Default (Free shipping enabled >= INR 2000, standard INR 500)")

    # Test 1: Subtotal below threshold (₹1500) -> Shipping charge is ₹500
    res1 = session.post(f"{BASE_URL}/check-pincode", json={
        "destinationPincode": "110001",
        "subtotal": 1500
    })
    assert res1.status_code == 200, f"Pincode check failed: {res1.text}"
    data1 = res1.json()
    assert data1.get("freeShipping") is False, f"Expected freeShipping=False for ₹1500, got {data1.get('freeShipping')}"
    assert data1.get("shippingCharge") == 500, f"Expected shippingCharge=500 for ₹1500, got {data1.get('shippingCharge')}"
    print("[PASS] 1. Subtotal below threshold (INR 1500 < INR 2000) -> Shipping INR 500")

    # Test 2: Subtotal at threshold (₹2000) -> Shipping charge is ₹0 (FREE)
    res2 = session.post(f"{BASE_URL}/check-pincode", json={
        "destinationPincode": "110001",
        "subtotal": 2000
    })
    assert res2.status_code == 200, f"Pincode check failed: {res2.text}"
    data2 = res2.json()
    assert data2.get("freeShipping") is True, f"Expected freeShipping=True for ₹2000, got {data2.get('freeShipping')}"
    assert data2.get("shippingCharge") == 0, f"Expected shippingCharge=0 for ₹2000, got {data2.get('shippingCharge')}"
    print("[PASS] 2. Subtotal exactly at threshold (INR 2000 == INR 2000) -> Shipping INR 0 (FREE)")

    # Test 3: Subtotal above threshold (₹2500) -> Shipping charge is ₹0 (FREE)
    res3 = session.post(f"{BASE_URL}/check-pincode", json={
        "destinationPincode": "110001",
        "subtotal": 2500
    })
    assert res3.status_code == 200, f"Pincode check failed: {res3.text}"
    data3 = res3.json()
    assert data3.get("freeShipping") is True, f"Expected freeShipping=True for ₹2500, got {data3.get('freeShipping')}"
    assert data3.get("shippingCharge") == 0, f"Expected shippingCharge=0 for ₹2500, got {data3.get('shippingCharge')}"
    print("[PASS] 3. Subtotal above threshold (INR 2500 > INR 2000) -> Shipping INR 0 (FREE)")

    # Test 4: Admin updates threshold to ₹2500
    upd_res = session.put(f"{BASE_URL}/admin/site-settings", json={
        "siteName": "MikuMantra Fine Jewellery",
        "shipping": {
            "freeShippingEnabled": True,
            "freeShippingThreshold": 2500,
            "standardShippingCharge": 500
        }
    })
    assert upd_res.status_code == 200, f"Admin threshold update failed: {upd_res.text}"
    
    # Subtotal ₹2200 should now incur ₹500 shipping fee
    res4_1 = session.post(f"{BASE_URL}/check-pincode", json={
        "destinationPincode": "110001",
        "subtotal": 2200
    })
    data4_1 = res4_1.json()
    assert data4_1.get("freeShipping") is False, f"Expected freeShipping=False for ₹2200 (threshold ₹2500), got {data4_1.get('freeShipping')}"
    assert data4_1.get("shippingCharge") == 500, f"Expected shippingCharge=500 for ₹2200, got {data4_1.get('shippingCharge')}"

    # Subtotal ₹2500 incurs ₹0 shipping
    res4_2 = session.post(f"{BASE_URL}/check-pincode", json={
        "destinationPincode": "110001",
        "subtotal": 2500
    })
    data4_2 = res4_2.json()
    assert data4_2.get("freeShipping") is True, f"Expected freeShipping=True for ₹2500, got {data4_2.get('freeShipping')}"
    assert data4_2.get("shippingCharge") == 0, f"Expected shippingCharge=0 for ₹2500, got {data4_2.get('shippingCharge')}"
    print("[PASS] 4. Admin updated threshold to INR 2500 -> INR 2200 incurs INR 500, INR 2500 incurs INR 0")

    # Test 5: Admin disables Free Shipping
    dis_res = session.put(f"{BASE_URL}/admin/site-settings", json={
        "siteName": "MikuMantra Fine Jewellery",
        "shipping": {
            "freeShippingEnabled": False,
            "freeShippingThreshold": 2500,
            "standardShippingCharge": 500
        }
    })
    assert dis_res.status_code == 200, f"Disable free shipping failed: {dis_res.text}"

    res5 = session.post(f"{BASE_URL}/check-pincode", json={
        "destinationPincode": "110001",
        "subtotal": 5000
    })
    data5 = res5.json()
    assert data5.get("freeShipping") is False, f"Expected freeShipping=False when disabled, got {data5.get('freeShipping')}"
    assert data5.get("shippingCharge") == 500, f"Expected shippingCharge=500 when disabled, got {data5.get('shippingCharge')}"
    print("[PASS] 5. Admin disabled free shipping -> INR 5000 order incurs INR 500 standard shipping")

    # Test 6: Validation against negative numbers
    neg_res = session.put(f"{BASE_URL}/admin/site-settings", json={
        "siteName": "MikuMantra Fine Jewellery",
        "shipping": {
            "freeShippingEnabled": True,
            "freeShippingThreshold": -500,
            "standardShippingCharge": 500
        }
    })
    assert neg_res.status_code == 400, f"Expected 400 Bad Request for negative threshold, got {neg_res.status_code}"
    print("[PASS] 6. Admin API rejected negative freeShippingThreshold with 400 Bad Request")

    # Test 7: Order Creation API dynamic calculation match
    # Re-enable free shipping at ₹2000 threshold
    session.put(f"{BASE_URL}/admin/site-settings", json={
        "siteName": "MikuMantra Fine Jewellery",
        "shipping": {
            "freeShippingEnabled": True,
            "freeShippingThreshold": 2000,
            "standardShippingCharge": 500
        }
    })

    # Fetch a product to order
    prod_res = session.get(f"{BASE_URL}/products")
    p_data = prod_res.json()
    products = p_data.get("products", []) if isinstance(p_data, dict) else (p_data if isinstance(p_data, list) else [])
    assert len(products) > 0, f"No products found in DB for order test: {p_data}"

    in_stock = [p for p in products if p.get("stock", 0) > 0]
    assert len(in_stock) > 0, "No in-stock products found"
    test_prod = in_stock[0]

    order_payload = {
        "items": [{ "id": test_prod["id"], "qty": 1 }],
        "address": {
            "fullName": "Test Customer",
            "phone": "9876543210",
            "line1": "Flat 101, Test Residency",
            "city": "Jaipur",
            "state": "Rajasthan",
            "pincode": "302001"
        },
        "payment": "cod"
    }
    order_res = session.post(f"{BASE_URL}/orders", json=order_payload)
    assert order_res.status_code == 200, f"Order creation failed: {order_res.text}"
    order_data = order_res.json()
    order_obj = order_data.get("order") or order_data
    amounts = order_obj.get("amounts", {})
    sub = amounts.get("subtotal", 0)
    shp = amounts.get("shipping", -1)

    expected_shipping = 0 if sub >= 2000 else 500
    assert shp == expected_shipping, f"Order creation calculated shipping={shp}, expected={expected_shipping} for subtotal={sub}"
    print(f"[PASS] 7. Order Placement API recalculated subtotal INR {sub} -> shipping charge INR {shp} matches rules")

    # Test 7b: High-value order placement (>= 2000)
    high_val_prod = next((p for p in in_stock if p.get("price", 0) >= 2000), None)
    if high_val_prod:
        high_order_payload = {
            "items": [{ "id": high_val_prod["id"], "qty": 1 }],
            "address": {
                "fullName": "Test Customer",
                "phone": "9876543210",
                "line1": "Flat 101, Test Residency",
                "city": "Jaipur",
                "state": "Rajasthan",
                "pincode": "302001"
            },
            "payment": "cod"
        }
        high_order_res = session.post(f"{BASE_URL}/orders", json=high_order_payload)
        assert high_order_res.status_code == 200, f"High value order creation failed: {high_order_res.text}"
        high_order_obj = high_order_res.json().get("order") or high_order_res.json()
        high_sub = high_order_obj.get("amounts", {}).get("subtotal", 0)
        high_shp = high_order_obj.get("amounts", {}).get("shipping", -1)
        assert high_shp == 0, f"Expected shipping=0 for high value order subtotal={high_sub}, got {high_shp}"
        print(f"[PASS] 7b. High value order placement subtotal INR {high_sub} >= 2000 -> shipping charge INR {high_shp} (FREE)")

    # Test 8: Public GET /site-settings returns current shipping config
    public_res = session.get(f"{BASE_URL}/site-settings")
    assert public_res.status_code == 200, f"Public site-settings fetch failed: {public_res.text}"
    pub_shipping = public_res.json().get("shipping", {})
    assert pub_shipping.get("freeShippingEnabled") is True
    assert pub_shipping.get("freeShippingThreshold") == 2000
    assert pub_shipping.get("standardShippingCharge") == 500
    print("[PASS] 8. Public GET /api/site-settings accurately exposes dynamic shipping configuration")

    print("\n=========================================")
    print("ALL 8 DYNAMIC SHIPPING VERIFICATION TESTS PASSED SUCCESSFULLY!")
    print("=========================================\n")

if __name__ == "__main__":
    run_tests()
