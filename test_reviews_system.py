import requests
import json
import sys
import io

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

import uuid

BASE_URL = "http://localhost:3000/api"
ADMIN_CREDS = { "email": "admin@mikumantra.com", "password": "admin123" }
test_id = str(uuid.uuid4())[:6]
TEST_USER = { "name": f"Review Tester {test_id}", "email": f"tester_review_{test_id}@example.com", "password": "Password123!" }

def run_tests():
    session = requests.Session()
    print("========== 1. AUTHENTICATING ADMIN & CUSTOMER ==========")
    
    # 1. Login Admin
    r = session.post(f"{BASE_URL}/auth/login", json=ADMIN_CREDS)
    if r.status_code != 200 or r.json().get('user', {}).get('role') != 'admin':
        r = session.post(f"{BASE_URL}/auth/login", json={"email": "akash@unictechnology.com", "password": "12341234"})
    if r.status_code != 200:
        print(f"FAILED: Admin login returned {r.status_code} - {r.text[:200]}")
        sys.exit(1)
    print("SUCCESS: Admin logged in")

    # Clean up any existing reviews for p01
    r = session.get(f"{BASE_URL}/admin/reviews?productId=p01")
    if r.status_code == 200:
        for rev in r.json().get('reviews', []):
            session.delete(f"{BASE_URL}/admin/reviews/{rev['id']}")
    print("Cleaned up existing reviews for p01")

    # 2. Check Site Settings (customerReviewsEnabled default)
    r = session.get(f"{BASE_URL}/site-settings")
    assert r.status_code == 200, f"Failed site-settings GET: {r.text[:200]}"
    settings = r.json()
    print(f"Site Settings customerReviewsEnabled: {settings.get('customerReviewsEnabled')}")

    # 3. Create/Login Test Customer
    cust_session = requests.Session()
    r = cust_session.post(f"{BASE_URL}/auth/login", json={"email": TEST_USER["email"], "password": TEST_USER["password"]})
    if r.status_code != 200:
        print("Registering test customer...")
        r = cust_session.post(f"{BASE_URL}/auth/register", json=TEST_USER)
        assert r.status_code in (200, 409), f"Registration failed: {r.text[:200]}"
        r = cust_session.post(f"{BASE_URL}/auth/login", json={"email": TEST_USER["email"], "password": TEST_USER["password"]})
        assert r.status_code == 200, f"Login failed after register: {r.text[:200]}"
    
    customer_info = r.json().get('user', {})
    customer_id = customer_info.get('id')
    print(f"SUCCESS: Customer logged in ID: {customer_id}")

    print("\n========== 2. TESTING REVIEW ELIGIBILITY & DELIVERED ORDER ENFORCEMENT ==========")
    # Unpurchased product review attempt
    r = cust_session.post(f"{BASE_URL}/reviews", json={
        "productId": "p01",
        "rating": 5,
        "title": "Great Product",
        "comment": "Testing unpurchased review attempt"
    })
    print(f"Unpurchased review attempt status: {r.status_code} (Expected 403) - Response: {r.text[:200]}")
    assert r.status_code == 403, f"Expected 403 for unpurchased product, got {r.status_code}"

    # Check eligibility endpoint
    r = cust_session.get(f"{BASE_URL}/reviews/eligibility?productId=p01")
    assert r.status_code == 200
    elig = r.json()
    print(f"Eligibility check for unpurchased product: {elig}")
    assert elig.get('eligible') is False

    print("\n========== 3. CREATING TEST DELIVERED ORDER ==========")
    # Place an order as customer and mark delivered as admin
    order_payload = {
        "items": [{ "id": "p01", "name": "Celestine Diamond Pendant", "slug": "celestine-diamond-pendant", "price": 78500, "qty": 1 }],
        "address": { "fullName": "Review Tester", "phone": "9876543210", "line1": "123 Test St", "city": "Jaipur", "state": "Rajasthan", "pincode": "302001" },
        "payment": "cod"
    }
    r = cust_session.post(f"{BASE_URL}/orders", json=order_payload)
    assert r.status_code == 200, f"Order placement failed: {r.text[:200]}"
    order_id = r.json()['order']['id']
    print(f"Order placed successfully. Order ID: {order_id}")

    # Admin marks order as delivered
    r = session.put(f"{BASE_URL}/admin/orders/{order_id}/status", json={"status": "delivered", "note": "Marked delivered for review test"})
    assert r.status_code == 200, f"Admin failed to update order status: {r.text[:200]}"
    print(f"Admin updated Order {order_id} status to DELIVERED")

    # Re-check eligibility
    r = cust_session.get(f"{BASE_URL}/reviews/eligibility?productId=p01")
    assert r.status_code == 200
    elig = r.json()
    print(f"Eligibility check after delivery: {elig}")
    assert elig.get('eligible') is True, f"Customer should be eligible after delivery, got: {elig}"

    print("\n========== 4. CUSTOMER SUBMITTING REVIEW FOR DELIVERED ORDER ==========")
    r = cust_session.post(f"{BASE_URL}/reviews", json={
        "productId": "p01",
        "orderId": order_id,
        "rating": 5,
        "title": "Breathtaking Heirloom!",
        "comment": "The craftsmanship and diamond clarity exceeded all expectations."
    })
    assert r.status_code == 200, f"Failed customer review submission: {r.text[:200]}"
    created_review = r.json()['review']
    created_review_id = created_review['id']
    print(f"SUCCESS: Customer review submitted ID: {created_review_id}")

    # Re-attempt duplicate review for same order item
    r = cust_session.post(f"{BASE_URL}/reviews", json={
        "productId": "p01",
        "orderId": order_id,
        "rating": 4,
        "comment": "Duplicate review attempt"
    })
    print(f"Duplicate review status: {r.status_code} (Expected 400) - Response: {r.text[:200]}")
    assert r.status_code == 400, f"Expected 400 for duplicate review, got {r.status_code}"

    # Verify public product reviews list & dynamic rating
    r = session.get(f"{BASE_URL}/reviews/product/p01")
    assert r.status_code == 200
    rev_data = r.json()
    print(f"Public product p01 reviews response: totalReviews={rev_data['totalReviews']}, averageRating={rev_data['averageRating']}, breakdown={rev_data['breakdown']}")
    assert rev_data['totalReviews'] >= 1
    assert rev_data['averageRating'] == 5.0

    print("\n========== 5. ADMIN GLOBAL REVIEW TOGGLE (customerReviewsEnabled: OFF) ==========")
    # Test GET /api/settings/customer-reviews
    r = session.get(f"{BASE_URL}/settings/customer-reviews")
    assert r.status_code == 200, f"Failed GET /api/settings/customer-reviews: {r.text[:200]}"
    print(f"GET /api/settings/customer-reviews response: {r.json()}")

    # Turn OFF customer reviews via PUT /api/admin/settings/customer-reviews
    r = session.put(f"{BASE_URL}/admin/settings/customer-reviews", json={ "enabled": False })
    assert r.status_code == 200, f"Failed to turn OFF reviews setting via admin endpoint: {r.text[:200]}"
    assert r.json().get('enabled') is False or r.json().get('customerReviewsEnabled') is False

    # Verify GET /api/settings/customer-reviews returns false
    r = session.get(f"{BASE_URL}/settings/customer-reviews")
    assert r.json().get('enabled') is False or r.json().get('customerReviewsEnabled') is False

    # Customer tries to submit review while OFF (Must get 403 Forbidden with message)
    r = cust_session.post(f"{BASE_URL}/reviews", json={ "productId": "p01", "rating": 5, "comment": "Review while OFF" })
    print(f"Review attempt while OFF status: {r.status_code} (Expected 403) - Response: {r.text[:200]}")
    assert r.status_code == 403, f"Expected 403 when reviews disabled, got {r.status_code}"
    res_json = r.json()
    assert res_json.get('success') is False or 'error' in res_json or 'message' in res_json

    # Test Admin CAN STILL add a review while customer reviews are OFF
    admin_rev_while_off = {
        "productId": "p01",
        "reviewerName": "Curator While OFF",
        "reviewerEmail": "curator@mikumantra.com",
        "rating": 5,
        "title": "Admin Review Still Works",
        "comment": "Admin reviews work even when customer reviews are OFF.",
        "status": "published",
        "verifiedPurchase": True
    }
    r = session.post(f"{BASE_URL}/admin/reviews", json=admin_rev_while_off)
    assert r.status_code == 200, f"Admin review creation failed while OFF: {r.text[:200]}"
    admin_off_rev_id = r.json()['review']['id']
    print(f"SUCCESS: Admin review created while Customer Reviews OFF (ID: {admin_off_rev_id})")

    # Clean up admin review created while OFF
    session.delete(f"{BASE_URL}/admin/reviews/{admin_off_rev_id}")

    # Turn customer reviews back ON via PUT /api/admin/settings/customer-reviews
    r = session.put(f"{BASE_URL}/admin/settings/customer-reviews", json={ "enabled": True })
    assert r.status_code == 200
    print("SUCCESS: Global customer reviews toggled OFF and back ON successfully via /api/admin/settings/customer-reviews")

    print("\n========== 6. ADMIN CREATING MANUAL REVIEW ==========")
    admin_rev_payload = {
        "productId": "p01",
        "reviewerName": "Meera Kapoor (Curator)",
        "reviewerEmail": "meera@mikumantra.com",
        "rating": 4,
        "title": "Timeless Elegance",
        "comment": "Hand-finished rose gold with exceptional diamond symmetry.",
        "status": "published",
        "verifiedPurchase": True
    }
    r = session.post(f"{BASE_URL}/admin/reviews", json=admin_rev_payload)
    assert r.status_code == 200, f"Failed admin review creation: {r.text[:200]}"
    admin_rev_id = r.json()['review']['id']
    print(f"SUCCESS: Admin review created ID: {admin_rev_id}")

    # Verify public rating updated (1 review with 5-star, 1 review with 4-star => Avg 4.5)
    r = session.get(f"{BASE_URL}/reviews/product/p01")
    assert r.status_code == 200
    rev_data = r.json()
    print(f"Updated product p01 reviews: totalReviews={rev_data['totalReviews']}, averageRating={rev_data['averageRating']}")
    assert rev_data['totalReviews'] == 2
    assert rev_data['averageRating'] == 4.5

    print("\n========== 7. ADMIN TOGGLING REVIEW STATUS (PUBLISHED <-> HIDDEN) ==========")
    # Hide admin review
    r = session.put(f"{BASE_URL}/admin/reviews/{admin_rev_id}", json={ "status": "hidden" })
    assert r.status_code == 200, f"Failed to hide review: {r.text[:200]}"

    # Check public rating (should revert to 1 review with 5-star => Avg 5.0)
    r = session.get(f"{BASE_URL}/reviews/product/p01")
    rev_data = r.json()
    print(f"After hiding admin review: totalReviews={rev_data['totalReviews']}, averageRating={rev_data['averageRating']}")
    assert rev_data['totalReviews'] == 1
    assert rev_data['averageRating'] == 5.0

    # Publish admin review back
    r = session.put(f"{BASE_URL}/admin/reviews/{admin_rev_id}", json={ "status": "published" })
    assert r.status_code == 200

    print("\n========== 8. ADMIN DELETING REVIEW ==========")
    r = session.delete(f"{BASE_URL}/admin/reviews/{admin_rev_id}")
    assert r.status_code == 200, f"Failed to delete admin review: {r.text[:200]}"

    # Cleanup customer review
    r = session.delete(f"{BASE_URL}/admin/reviews/{created_review_id}")
    assert r.status_code == 200

    # Final check: 0 reviews => rating 0.0
    r = session.get(f"{BASE_URL}/reviews/product/p01")
    rev_data = r.json()
    print(f"After deleting test reviews: totalReviews={rev_data['totalReviews']}, averageRating={rev_data['averageRating']}")
    assert rev_data['totalReviews'] == 0
    assert rev_data['averageRating'] == 0

    print("\n=======================================================")
    print("ALL 13+ VERIFICATION TESTS PASSED SUCCESSFULLY 100%!")
    print("=======================================================")

if __name__ == "__main__":
    run_tests()
