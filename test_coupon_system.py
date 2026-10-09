import requests
import json
import uuid
from datetime import datetime, timedelta

BASE_URL = "http://localhost:3000/api"

def run_tests():
    session = requests.Session()
    print("\n=========================================")
    print("STARTING COUPON VALIDATION SYSTEM VERIFICATION")
    print("=========================================\n")

    # 0. Admin Login for fixture management
    admin_res = session.post(f"{BASE_URL}/auth/login", json={
        "email": "admin@mikumantra.com",
        "password": "password123"
    })
    if admin_res.status_code != 200:
        admin_res = session.post(f"{BASE_URL}/auth/login", json={
            "email": "admin@mikumantra.com",
            "password": "admin123"
        })
    if admin_res.status_code != 200:
        admin_res = session.post(f"{BASE_URL}/auth/login", json={
            "email": "admin@mikumantra.com",
            "password": "12341234"
        })
    assert admin_res.status_code == 200, f"Admin login failed: {admin_res.text}"
    token = admin_res.json().get("token")
    headers = {"x-auth-token": token}
    print("[PASS] 0. Admin Login Successful")

    # Case 1: Valid percentage coupon (MIKUMANTRA10 - 10% off)
    # Using subtotal INR 706,000 from the user's Shopping Bag page
    res1 = session.post(f"{BASE_URL}/coupons/validate", json={
        "code": "MIKUMANTRA10",
        "subtotal": 706000
    })
    assert res1.status_code == 200, f"Expected 200 for valid MIKUMANTRA10, got {res1.status_code}: {res1.text}"
    data1 = res1.json()
    assert data1.get("valid") is True, f"Expected valid=True, got {data1}"
    assert data1.get("code") == "MIKUMANTRA10"
    assert data1.get("type") == "percent"
    assert data1.get("value") == 10
    assert data1.get("discount") == 70600, f"Expected discount 70600 (10% of 706000), got {data1.get('discount')}"
    print("[PASS] 1. Valid percentage coupon (MIKUMANTRA10): 10% off on INR 7,06,000 = INR 70,600 discount")

    # Case 2: Valid flat coupon (WELCOME2000 - INR 2000 off, minOrder 10000)
    res2 = session.post(f"{BASE_URL}/coupons/validate", json={
        "code": "WELCOME2000",
        "subtotal": 25000
    })
    assert res2.status_code == 200, f"Expected 200 for WELCOME2000 with subtotal >= 10000, got {res2.status_code}: {res2.text}"
    data2 = res2.json()
    assert data2.get("valid") is True
    assert data2.get("type") == "flat"
    assert data2.get("discount") == 2000
    print("[PASS] 2. Valid flat coupon (WELCOME2000): Flat INR 2000 off when subtotal INR 25,000 >= INR 10,000")

    # Case 3: Minimum order requirement not met (WELCOME2000 with subtotal INR 5,000 < INR 10,000)
    res3 = session.post(f"{BASE_URL}/coupons/validate", json={
        "code": "WELCOME2000",
        "subtotal": 5000
    })
    assert res3.status_code == 400, f"Expected 400 for subtotal below minOrder, got {res3.status_code}: {res3.text}"
    data3 = res3.json()
    assert "below the minimum purchase requirement" in data3.get("error", "") or "Minimum order" in data3.get("error", ""), f"Unexpected error message: {data3}"
    print("[PASS] 3. Minimum order requirement enforced: Rejected when subtotal INR 5,000 < INR 10,000")

    # Case 4: Inactive coupon rejection (SUMMER2023 - active: false)
    res4 = session.post(f"{BASE_URL}/coupons/validate", json={
        "code": "SUMMER2023",
        "subtotal": 150000
    })
    assert res4.status_code in [400, 404], f"Expected 400/404 for inactive coupon, got {res4.status_code}: {res4.text}"
    print("[PASS] 4. Inactive coupon rejected: Properly rejected with status 400/404")

    # Case 5: Non-existent / invalid coupon code
    res5 = session.post(f"{BASE_URL}/coupons/validate", json={
        "code": "INVALID_COUPON_XYZ_999",
        "subtotal": 50000
    })
    assert res5.status_code == 404, f"Expected 404 for non-existent coupon, got {res5.status_code}: {res5.text}"
    print("[PASS] 5. Non-existent coupon code: Correctly returned 404 Invalid coupon")

    # Case 6: Empty coupon code
    res6 = session.post(f"{BASE_URL}/coupons/validate", json={
        "code": "   ",
        "subtotal": 50000
    })
    assert res6.status_code == 400, f"Expected 400 for empty coupon code, got {res6.status_code}: {res6.text}"
    print("[PASS] 6. Empty coupon code: Correctly returned 400 Coupon code is required")

    # Case 7: Expired coupon validation (temporary test coupon via Admin API)
    test_expired_code = f"TEST_EXP_{uuid.uuid4().hex[:6].upper()}"
    create_exp_res = session.post(f"{BASE_URL}/admin/coupons", headers=headers, json={
        "code": test_expired_code,
        "active": True,
        "type": "percent",
        "value": 15,
        "minOrder": 0,
        "endDate": (datetime.utcnow() - timedelta(days=2)).isoformat()
    })
    assert create_exp_res.status_code == 200, f"Failed to create test expired coupon: {create_exp_res.text}"
    created_exp_id = create_exp_res.json().get("coupon", {}).get("id")

    try:
        res7 = session.post(f"{BASE_URL}/coupons/validate", json={
            "code": test_expired_code,
            "subtotal": 10000
        })
        assert res7.status_code == 400, f"Expected 400 for expired coupon, got {res7.status_code}: {res7.text}"
        data7 = res7.json()
        assert "expired" in data7.get("error", "").lower(), f"Expected expiry message, got {data7}"
        print(f"[PASS] 7. Expired coupon ({test_expired_code}): Rejected with 'has expired' message")
    finally:
        if created_exp_id:
            session.delete(f"{BASE_URL}/admin/coupons/{created_exp_id}", headers=headers)

    # Case 8: Cart Pricing API (/api/cart/pricing) with coupon revalidation
    res8 = session.post(f"{BASE_URL}/cart/pricing", json={
        "items": [
            {"id": "test-p1", "name": "Diamond Ring", "price": 50000, "qty": 1},
            {"id": "test-p2", "name": "Gold Chain", "price": 50000, "qty": 1}
        ],
        "coupon": "MIKUMANTRA10",
        "giftWrap": False
    })
    assert res8.status_code == 200, f"Expected 200 for cart pricing, got {res8.status_code}: {res8.text}"
    data8 = res8.json()
    assert data8.get("subtotal") == 100000
    assert data8.get("discount") == 10000, f"Expected 10000 discount (10% of 100000), got {data8.get('discount')}"
    assert data8.get("couponValid") is True
    assert data8.get("couponCode") == "MIKUMANTRA10"
    expected_tax = round((100000 - 10000) * 0.03) # 3% GST on discounted subtotal
    assert data8.get("tax") == expected_tax, f"Expected tax {expected_tax}, got {data8.get('tax')}"
    expected_total = 100000 - 10000 + data8.get("shipping", 0) + expected_tax
    assert data8.get("total") == expected_total, f"Expected total {expected_total}, got {data8.get('total')}"
    print("[PASS] 8. Cart Pricing API (/api/cart/pricing): Complete calculation with subtotal, discount, tax, shipping verified")

    print("\n=========================================")
    print("ALL COUPON VERIFICATION TESTS PASSED SUCCESSFULLY! (8/8)")
    print("=========================================\n")

if __name__ == "__main__":
    run_tests()
