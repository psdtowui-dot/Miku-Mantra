import requests
import time
import concurrent.futures
import sys

BASE_URL = "http://localhost:3000"

def log(msg, status="INFO"):
    print(f"[{status}] {msg}")

def run_all_tests():
    session = requests.Session()

    # Step 0: Login as admin
    log("Logging in as Admin...")
    admin_data = {"name": "Admin User", "email": "admin@mikumantra.com", "password": "admin123"}
    resp = session.post(f"{BASE_URL}/api/auth/login", json={"email": admin_data["email"], "password": admin_data["password"]})
    if resp.status_code != 200:
        resp = session.post(f"{BASE_URL}/api/auth/register", json=admin_data)
        if resp.status_code == 409:
            resp = session.post(f"{BASE_URL}/api/auth/login", json={"email": admin_data["email"], "password": "12341234"})
    assert resp.status_code == 200, f"Admin login failed: {resp.text}"
    log("Admin logged in successfully.")

    # Get a test product
    resp = session.get(f"{BASE_URL}/api/products")
    assert resp.status_code == 200, "Failed to fetch products"
    products = resp.json()["products"]
    assert len(products) > 0, "No products found"
    test_p = products[0]
    pid = test_p["id"]
    slug = test_p["slug"]
    log(f"Selected test product: {test_p['name']} (ID: {pid}, Slug: {slug})")

    # TEST 10: Admin sets stock to 5
    log("--- TEST 10: Admin sets stock 0 -> 5 ---")
    resp = session.put(f"{BASE_URL}/api/admin/products/{pid}", json={"stock": 5})
    assert resp.status_code == 200, f"Failed to update stock: {resp.text}"
    p_data = resp.json()["product"]
    assert p_data["stock"] == 5, f"Expected stock 5, got {p_data['stock']}"
    log("TEST 10 PASSED: Product stock set to 5 and state is IN STOCK.")

    # TEST 1: Stock > 0 (Stock = 5) -> IN STOCK
    log("--- TEST 1: Stock = 5 -> IN STOCK ---")
    resp = session.post(f"{BASE_URL}/api/cart/validate", json={"productId": pid, "qty": 1, "singleCheck": True})
    assert resp.status_code == 200, f"Expected 200 OK, got {resp.status_code}: {resp.text}"
    val = resp.json()
    assert val["valid"] == True, f"Validation failed: {val}"
    log("TEST 1 PASSED: Stock > 0 is IN STOCK and purchase allowed.")

    # TEST 2: Stock = 1
    log("--- TEST 2: Admin sets stock = 1 ---")
    resp = session.put(f"{BASE_URL}/api/admin/products/{pid}", json={"stock": 1})
    assert resp.status_code == 200
    resp = session.post(f"{BASE_URL}/api/cart/validate", json={"productId": pid, "qty": 1, "singleCheck": True})
    assert resp.status_code == 200
    log("TEST 2 PASSED: Stock = 1 is IN STOCK and purchase allowed.")

    # TEST 6: Stock = 2, Requested quantity = 3 -> Order/Validation Rejected
    log("--- TEST 6: Stock = 2, Requested quantity = 3 -> Rejected ---")
    session.put(f"{BASE_URL}/api/admin/products/{pid}", json={"stock": 2})
    resp = session.post(f"{BASE_URL}/api/cart/validate", json={"productId": pid, "qty": 3, "singleCheck": True})
    assert resp.status_code == 400, f"Expected 400, got {resp.status_code}"
    err_msg = resp.json().get("error", "")
    assert "2" in err_msg and "available" in err_msg.lower(), f"Unexpected message: {err_msg}"
    log(f"TEST 6 PASSED: Rejected with message: '{err_msg}'")

    # TEST 11 & TEST 3: Admin sets stock to 0 -> OUT OF STOCK
    log("--- TEST 11 & TEST 3: Admin sets stock = 0 -> OUT OF STOCK ---")
    resp = session.put(f"{BASE_URL}/api/admin/products/{pid}", json={"stock": 0})
    assert resp.status_code == 200
    p_data = resp.json()["product"]
    assert p_data["stock"] == 0

    # TEST 12: GET /api/products/[slug] after stock reaches 0
    resp = session.get(f"{BASE_URL}/api/products/{slug}")
    assert resp.status_code == 200
    detail_p = resp.json()["product"]
    assert detail_p["stock"] == 0, f"Expected stock 0, got {detail_p['stock']}"
    log("TEST 12 PASSED: GET /api/products/[slug] returns stock = 0.")

    # TEST 13: GET /api/products (listing) returns stock = 0
    resp = session.get(f"{BASE_URL}/api/products")
    assert resp.status_code == 200
    list_p = next(p for p in resp.json()["products"] if p["id"] == pid)
    assert list_p["stock"] == 0, f"Expected stock 0 in listing, got {list_p['stock']}"
    log("TEST 13 PASSED: GET /api/products listing respects stock = 0.")

    # TEST 4: Stock = 0 direct Add to Cart API validation
    log("--- TEST 4: Stock = 0 direct Add to Cart API check ---")
    resp = session.post(f"{BASE_URL}/api/cart/validate", json={"productId": pid, "qty": 1, "singleCheck": True})
    assert resp.status_code == 400, f"Expected 400, got {resp.status_code}"
    err_msg = resp.json().get("error", "")
    assert "out of stock" in err_msg.lower(), f"Unexpected message: {err_msg}"
    log(f"TEST 4 PASSED: Direct Add to Cart API rejected with message: '{err_msg}'")

    # TEST 5: Stock = 0 direct Order Creation API
    log("--- TEST 5: Stock = 0 direct Order Creation API ---")
    order_payload = {
      "items": [{"id": pid, "qty": 1}],
      "address": {
        "fullName": "Test User",
        "phone": "9876543210",
        "line1": "123 Test St",
        "city": "Jaipur",
        "state": "Rajasthan",
        "pincode": "302001"
      },
      "payment": "cod"
    }
    resp = session.post(f"{BASE_URL}/api/orders", json=order_payload)
    assert resp.status_code == 400, f"Expected 400, got {resp.status_code}: {resp.text}"
    err_msg = resp.json().get("error", "")
    assert "out of stock" in err_msg.lower(), f"Unexpected message: {err_msg}"
    log(f"TEST 5 PASSED: Direct Order Creation rejected with message: '{err_msg}'")

    # TEST 8 & 2: Stock = 1 -> Order 1 item -> Stock becomes 0
    log("--- TEST 8: Purchase 1 item when stock = 1 -> Stock becomes 0 ---")
    session.put(f"{BASE_URL}/api/admin/products/{pid}", json={"stock": 1})
    resp = session.post(f"{BASE_URL}/api/orders", json=order_payload)
    assert resp.status_code == 200, f"Order failed: {resp.text}"
    order_id = resp.json()["order"]["id"]
    log(f"Order created successfully: {order_id}")

    # Verify stock is now 0
    resp = session.get(f"{BASE_URL}/api/products/{slug}")
    assert resp.json()["product"]["stock"] == 0, "Stock should be 0 after purchasing final unit"
    log("TEST 8 PASSED: Stock reduced 1 -> 0, product displays OUT OF STOCK.")

    # TEST 9: Order Cancelled -> Stock restored 0 -> 1 & Idempotent cancellation
    log("--- TEST 9: Cancel Order -> Stock restored to 1 ---")
    cancel_resp = session.post(f"{BASE_URL}/api/orders/{order_id}/cancel", json={"reason": "Changed my mind"})
    assert cancel_resp.status_code == 200, f"Cancellation failed: {cancel_resp.text}"
    
    # Check restored stock
    resp = session.get(f"{BASE_URL}/api/products/{slug}")
    assert resp.json()["product"]["stock"] == 1, "Stock should be restored to 1"
    log("Stock restored 0 -> 1. Product is IN STOCK again.")

    # Test Idempotent Cancellation (repeating cancellation request)
    cancel_repeat = session.post(f"{BASE_URL}/api/orders/{order_id}/cancel", json={"reason": "Changed my mind"})
    assert cancel_repeat.status_code == 400, "Repeated cancellation should be rejected"
    resp = session.get(f"{BASE_URL}/api/products/{slug}")
    assert resp.json()["product"]["stock"] == 1, "Stock must NOT be restored twice on duplicate cancellation!"
    log("TEST 9 PASSED: Stock restored on cancellation and duplicate cancellation does not restore twice.")

    # TEST 7: Concurrent Purchase Protection
    log("--- TEST 7: Concurrent Purchase Protection (Stock = 1, 2 simultaneous orders) ---")
    session.put(f"{BASE_URL}/api/admin/products/{pid}", json={"stock": 1})

    def place_concurrent_order(user_name):
        s = requests.Session()
        s.cookies.update(session.cookies)
        pld = {
          "items": [{"id": pid, "qty": 1}],
          "address": {
            "fullName": f"User {user_name}",
            "phone": "9876543210",
            "line1": "123 Test St",
            "city": "Jaipur",
            "state": "Rajasthan",
            "pincode": "302001"
          },
          "payment": "cod"
        }
        return s.post(f"{BASE_URL}/api/orders", json=pld)

    with concurrent.futures.ThreadPoolExecutor(max_workers=2) as executor:
        f1 = executor.submit(place_concurrent_order, "A")
        f2 = executor.submit(place_concurrent_order, "B")
        res1 = f1.result()
        res2 = f2.result()

    statuses = [res1.status_code, res2.status_code]
    log(f"Concurrent order responses: {statuses}")
    assert 200 in statuses, "At least one order should succeed"
    assert 400 in statuses, "Second concurrent order should be rejected"

    # Check stock in DB
    resp = session.get(f"{BASE_URL}/api/products/{slug}")
    final_stock = resp.json()["product"]["stock"]
    assert final_stock == 0, f"Stock must be exactly 0, got {final_stock}"
    assert final_stock >= 0, "Stock must never become negative!"
    log("TEST 7 PASSED: Concurrent orders handled safely! Exactly 1 succeeded, 1 failed, stock is 0.")

    # Final cleanup: restore stock to 25
    session.put(f"{BASE_URL}/api/admin/products/{pid}", json={"stock": 25})
    log("\n==============================================")
    log("ALL 13 INVENTORY / OUT OF STOCK TESTS PASSED!!")
    log("==============================================\n")

if __name__ == "__main__":
    run_all_tests()
