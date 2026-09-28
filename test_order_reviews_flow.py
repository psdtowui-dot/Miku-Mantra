import requests
import json
import sys
import io
import uuid

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

BASE_URL = "http://localhost:3000/api"

def run_tests():
    print("================================================================================")
    print("CUSTOMER REVIEWS FOR DELIVERED ORDERS - END-TO-END VERIFICATION")
    print("================================================================================")
    
    # 1. Admin login to simulate order status change
    admin_sess = requests.Session()
    admin_emails = ["akash@unictechnology.com", "admin@mikumantra.com"]
    admin_passwords = ["12341234", "admin123"]
    admin_logged = False
    for email in admin_emails:
        for pw in admin_passwords:
            r = admin_sess.post(f"{BASE_URL}/auth/login", json={"email": email, "password": pw})
            if r.status_code == 200 and r.json().get('user', {}).get('role') == 'admin':
                admin_logged = True
                print(f"[OK] Admin logged in as: {email}")
                break
        if admin_logged:
            break
    assert admin_logged, "Admin login failed for test setup"

    # 2. Register & Login a fresh customer
    test_id = str(uuid.uuid4())[:6]
    cust_sess = requests.Session()
    cust_creds = {
        "name": f"Pooja Sharma {test_id}",
        "email": f"pooja_{test_id}@example.com",
        "password": "Password123!",
        "phone": "+919876543210"
    }
    r = cust_sess.post(f"{BASE_URL}/auth/register", json=cust_creds)
    assert r.status_code == 200, f"Customer registration failed: {r.text}"
    user = r.json()['user']
    print(f"[OK] Customer registered & logged in: {user['name']} ({user['email']})")

    # 3. Create an order with p01
    order_payload = {
        "items": [{
            "id": "p01",
            "name": "Celestine Diamond Pendant",
            "slug": "celestine-diamond-pendant",
            "price": 78500,
            "qty": 1
        }],
        "address": {
            "fullName": user["name"],
            "phone": "9876543210",
            "line1": "14 MG Road",
            "city": "Jaipur",
            "state": "Rajasthan",
            "pincode": "302001"
        },
        "payment": "cod"
    }
    r = cust_sess.post(f"{BASE_URL}/orders", json=order_payload)
    assert r.status_code == 200, f"Order placement failed: {r.text}"
    order = r.json()['order']
    order_id = order['id']
    order_num = order['orderNumber']
    print(f"[OK] Order placed: {order_num} (ID: {order_id}), Status: {order['status']}")

    # 4. Check customer order details BEFORE delivery
    r = cust_sess.get(f"{BASE_URL}/orders/{order_id}")
    assert r.status_code == 200, f"Failed to get order: {r.text}"
    order_data = r.json()
    assert 'reviews' in order_data, "Response missing 'reviews' field"
    assert len(order_data['reviews']) == 0, "Reviews should be empty for new order"
    assert order_data.get('customerReviewsEnabled') is True
    print("[OK] Verified GET /api/orders/:id returns reviews=[] and customerReviewsEnabled=True")

    # 5. Admin marks order as DELIVERED
    r = admin_sess.put(f"{BASE_URL}/admin/orders/{order_id}/status", json={
        "status": "delivered",
        "note": "Package safely handed to customer"
    })
    assert r.status_code == 200, f"Failed to update status to delivered: {r.text}"
    print(f"[OK] Order {order_num} marked as DELIVERED by admin")

    # 6. Customer submits review for delivered item
    review_payload = {
        "productId": "p01",
        "orderId": order_id,
        "rating": 5,
        "title": "Breathtaking Sparkle & Precision",
        "comment": "The cut and clarity of the diamond is truly exceptional. The chain feels luxurious.",
        "image": "https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f"
    }
    r = cust_sess.post(f"{BASE_URL}/reviews", json=review_payload)
    assert r.status_code == 200, f"Customer review submission failed: {r.text}"
    created_review = r.json()['review']
    review_id = created_review['id']
    print(f"[OK] Review created successfully (ID: {review_id})")
    assert created_review['rating'] == 5
    assert created_review['orderId'] == order_id
    assert created_review['orderNumber'] == order_num
    assert created_review['productName'] == "Celestine Diamond Pendant"
    assert created_review['verifiedPurchase'] is True
    print(f"[OK] Verified review enriched with: orderNumber={created_review['orderNumber']}, productName={created_review['productName']}")

    # 7. Check GET /api/orders/:id now includes the review
    r = cust_sess.get(f"{BASE_URL}/orders/{order_id}")
    assert r.status_code == 200
    order_data = r.json()
    reviews_in_order = order_data.get('reviews', [])
    assert len(reviews_in_order) == 1, f"Expected 1 review, found {len(reviews_in_order)}"
    assert reviews_in_order[0]['id'] == review_id
    assert reviews_in_order[0]['rating'] == 5
    print(f"[OK] GET /api/orders/:id successfully returns the submitted review in order.reviews array")

    # 8. Check GET /api/reviews/mine for customer account reviews tab
    r = cust_sess.get(f"{BASE_URL}/reviews/mine")
    assert r.status_code == 200, f"GET /api/reviews/mine failed: {r.text}"
    mine_reviews = r.json().get('reviews', [])
    assert any(rev['id'] == review_id for rev in mine_reviews), "Created review not in /api/reviews/mine"
    print(f"[OK] GET /api/reviews/mine contains customer's review with {len(mine_reviews)} total item(s)")

    # 9. Customer updates review (PUT /api/reviews/:id)
    update_payload = {
        "rating": 4,
        "title": "Updated: Elegant & Refined Daily Wear",
        "comment": "Worn it daily for a week now. Still mesmerized by the sparkle, clasp is very secure.",
        "image": "https://images.unsplash.com/photo-1515562141207-7a88fb7ce338"
    }
    r = cust_sess.put(f"{BASE_URL}/reviews/{review_id}", json=update_payload)
    assert r.status_code == 200, f"Customer review update failed: {r.text}"
    updated_review = r.json()['review']
    assert updated_review['rating'] == 4
    assert updated_review['title'] == "Updated: Elegant & Refined Daily Wear"
    print(f"[OK] Customer updated review to rating={updated_review['rating']}, title='{updated_review['title']}'")

    # 10. Verify order details reflects updated review
    r = cust_sess.get(f"{BASE_URL}/orders/{order_id}")
    order_data = r.json()
    assert order_data['reviews'][0]['rating'] == 4
    assert order_data['reviews'][0]['title'] == "Updated: Elegant & Refined Daily Wear"
    print(f"[OK] GET /api/orders/:id reflects updated review rating 4/5")

    # 11. Customer deletes review (DELETE /api/reviews/:id)
    r = cust_sess.delete(f"{BASE_URL}/reviews/{review_id}")
    assert r.status_code == 200, f"Review deletion failed: {r.text}"
    print(f"[OK] Customer deleted review {review_id}")

    # 12. Verify review is gone from order and from /api/reviews/mine
    r = cust_sess.get(f"{BASE_URL}/orders/{order_id}")
    assert len(r.json().get('reviews', [])) == 0
    r = cust_sess.get(f"{BASE_URL}/reviews/mine")
    assert not any(rev['id'] == review_id for rev in r.json().get('reviews', []))
    print("[OK] Confirmed review completely removed from order and customer reviews list")

    print("\n================================================================================")
    print("ALL CUSTOMER ORDER REVIEWS VERIFICATION CHECKS PASSED (100%)!")
    print("================================================================================")

if __name__ == "__main__":
    run_tests()
