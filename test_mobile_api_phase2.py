import requests
import json
import sys
import time

BASE_URL = "http://localhost:3000/api"

def run_tests():
    print("====================================================")
    print("TESTING PHASE 2: MOBILE API AUGMENTATIONS")
    print("====================================================")

    session = requests.Session()

    # 1. Test App Config
    try:
        r = session.get(f"{BASE_URL}/app/config")
        assert r.status_code == 200, f"App config failed: {r.status_code} {r.text}"
        cfg = r.json()
        assert cfg.get("appId") == "com.mikumantra.app", f"Invalid appId: {cfg}"
        assert cfg.get("name") == "MikuMantra", f"Invalid name: {cfg}"
        assert "paymentMethods" in cfg, "Missing paymentMethods in config"
        assert "brandColors" in cfg, "Missing brandColors in config"
        print("[PASS] 1. GET /api/app/config verified successfully")
    except Exception as e:
        print(f"[FAIL] 1. GET /api/app/config: {e}")
        return False

    # 2. Test Asset Links
    try:
        r = session.get(f"{BASE_URL}/.well-known/assetlinks.json")
        assert r.status_code == 200, f"Asset links failed: {r.status_code} {r.text}"
        links = r.json()
        assert isinstance(links, list) and len(links) > 0, "Assetlinks should be list"
        target = links[0].get("target", {})
        assert target.get("package_name") == "com.mikumantra.app", f"Invalid package name: {target}"
        print("[PASS] 2. GET /api/.well-known/assetlinks.json verified successfully")
    except Exception as e:
        print(f"[FAIL] 2. GET /api/.well-known/assetlinks.json: {e}")
        return False

    # 3. Test Device Token Registration
    try:
        token_payload = {
            "token": "test_fcm_token_mobile_12345",
            "platform": "android",
            "deviceId": "test-device-uuid-999"
        }
        r = session.post(f"{BASE_URL}/notifications/device-token", json=token_payload)
        assert r.status_code == 200, f"Device token failed: {r.status_code} {r.text}"
        res = r.json()
        assert res.get("ok") is True and res.get("registered") is True, f"Invalid token resp: {res}"
        print("[PASS] 3. POST /api/notifications/device-token verified successfully")
    except Exception as e:
        print(f"[FAIL] 3. POST /api/notifications/device-token: {e}")
        return False

    # 4. Test Public Order Tracking
    try:
        # 4a: Missing parameters returns 400
        r_empty = session.get(f"{BASE_URL}/orders/track")
        assert r_empty.status_code == 400, f"Expected 400 for empty params, got {r_empty.status_code}"

        # 4b: Non-existent order returns 404
        r_missing = session.get(f"{BASE_URL}/orders/track?orderNumber=MIK-NONEXISTENT-999&phone=9812345678")
        assert r_missing.status_code == 404, f"Expected 404 for missing order, got {r_missing.status_code}"
        print("[PASS] 4. GET /api/orders/track validation & 404 handling verified")
    except Exception as e:
        print(f"[FAIL] 4. GET /api/orders/track: {e}")
        return False

    # 5. Regression Check - Existing Website APIs
    try:
        r_prod = session.get(f"{BASE_URL}/products")
        assert r_prod.status_code == 200, f"Products API regression failed: {r_prod.status_code}"
        prods = r_prod.json()
        p_list = prods.get("products", []) if isinstance(prods, dict) else prods
        assert len(p_list) > 0, "No products returned"

        r_cat = session.get(f"{BASE_URL}/categories")
        assert r_cat.status_code == 200, f"Categories API regression failed: {r_cat.status_code}"

        r_ban = session.get(f"{BASE_URL}/banners")
        assert r_ban.status_code == 200, f"Banners API regression failed: {r_ban.status_code}"

        print("[PASS] 5. Existing Public APIs (/products, /categories, /banners) verified 100% operational")
    except Exception as e:
        print(f"[FAIL] 5. Public APIs regression: {e}")
        return False

    print("====================================================")
    print("ALL PHASE 2 MOBILE API TESTS PASSED SUCCESSFULLY!")
    print("====================================================")
    return True

if __name__ == "__main__":
    success = run_tests()
    sys.exit(0 if success else 1)
