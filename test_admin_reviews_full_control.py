import requests
import json
import sys
import io
import uuid

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

BASE_URL = "http://localhost:3000/api"

def run_admin_tests():
    print("================================================================================")
    print("ADMIN PANEL FULL REVIEW CONTROL - AUTOMATED VERIFICATION SUITE")
    print("================================================================================")

    # 1. Login Admin
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
    assert admin_logged, "Admin login failed"

    # 2. Test Filters & Queries on GET /api/admin/reviews
    r = admin_sess.get(f"{BASE_URL}/admin/reviews?status=ALL&sort=newest")
    assert r.status_code == 200, f"Failed GET /admin/reviews: {r.text}"
    print(f"[OK] GET /admin/reviews loaded {len(r.json().get('reviews', []))} reviews")

    # Filter by rating
    r = admin_sess.get(f"{BASE_URL}/admin/reviews?rating=5")
    assert r.status_code == 200
    print(f"[OK] GET /admin/reviews?rating=5 returned {len(r.json().get('reviews', []))} 5-star review(s)")

    # 3. Create 2 test reviews to test bulk actions and replies
    test_id = str(uuid.uuid4())[:6]
    r1_payload = {
        "productId": "p01",
        "reviewerName": f"Bulk Test User 1 ({test_id})",
        "reviewerEmail": f"bulk1_{test_id}@example.com",
        "orderNumber": f"ORD-BULK1-{test_id}",
        "rating": 5,
        "title": "Stunning piece",
        "comment": "Testing bulk operations 1",
        "status": "published",
        "verifiedPurchase": True
    }
    r2_payload = {
        "productId": "p01",
        "reviewerName": f"Bulk Test User 2 ({test_id})",
        "reviewerEmail": f"bulk2_{test_id}@example.com",
        "orderNumber": f"ORD-BULK2-{test_id}",
        "rating": 4,
        "title": "Very nice shine",
        "comment": "Testing bulk operations 2",
        "status": "published",
        "verifiedPurchase": True
    }

    res1 = admin_sess.post(f"{BASE_URL}/admin/reviews", json=r1_payload)
    assert res1.status_code == 200, f"Failed creating review 1: {res1.text}"
    rev1 = res1.json()['review']
    rev1_id = rev1['id']

    res2 = admin_sess.post(f"{BASE_URL}/admin/reviews", json=r2_payload)
    assert res2.status_code == 200, f"Failed creating review 2: {res2.text}"
    rev2 = res2.json()['review']
    rev2_id = rev2['id']

    print(f"[OK] Created 2 test reviews: {rev1_id}, {rev2_id}")

    # 4. Test Official Store Reply on Review 1
    reply_text = "Thank you so much! We are honored that you cherish this handcrafted piece."
    res_reply = admin_sess.put(f"{BASE_URL}/admin/reviews/{rev1_id}", json={
        "adminReply": reply_text
    })
    assert res_reply.status_code == 200, f"Failed saving admin reply: {res_reply.text}"
    updated_rev1 = res_reply.json()['review']
    assert 'adminReply' in updated_rev1
    assert updated_rev1['adminReply']['comment'] == reply_text
    print(f"[OK] Store reply saved successfully: '{updated_rev1['adminReply']['comment']}'")

    # Verify replied filter
    r_replied = admin_sess.get(f"{BASE_URL}/admin/reviews?replied=replied")
    assert r_replied.status_code == 200
    assert any(rev['id'] == rev1_id for rev in r_replied.json()['reviews'])
    print("[OK] Filter ?replied=replied includes the replied review")

    # Remove store reply
    res_unreply = admin_sess.put(f"{BASE_URL}/admin/reviews/{rev1_id}", json={
        "adminReply": null if False else None
    })
    assert res_unreply.status_code == 200
    assert 'adminReply' not in res_unreply.json().get('review', {})
    print("[OK] Store reply removed successfully via PUT with null/None")

    # 5. Test Bulk Action: HIDE
    res_bulk_hide = admin_sess.post(f"{BASE_URL}/admin/reviews/bulk", json={
        "action": "hide",
        "reviewIds": [rev1_id, rev2_id]
    })
    assert res_bulk_hide.status_code == 200, f"Bulk hide failed: {res_bulk_hide.text}"
    assert res_bulk_hide.json()['count'] == 2
    print("[OK] Bulk HIDE action executed for 2 reviews")

    # Verify both are hidden
    r_check = admin_sess.get(f"{BASE_URL}/admin/reviews?status=hidden")
    hidden_ids = [rev['id'] for rev in r_check.json().get('reviews', [])]
    assert rev1_id in hidden_ids and rev2_id in hidden_ids, "Both reviews should be in hidden list"
    print("[OK] Verified both reviews are now HIDDEN")

    # 6. Test Bulk Action: PUBLISH
    res_bulk_pub = admin_sess.post(f"{BASE_URL}/admin/reviews/bulk", json={
        "action": "publish",
        "reviewIds": [rev1_id, rev2_id]
    })
    assert res_bulk_pub.status_code == 200, f"Bulk publish failed: {res_bulk_pub.text}"
    print("[OK] Bulk PUBLISH action executed for 2 reviews")

    r_check_pub = admin_sess.get(f"{BASE_URL}/admin/reviews?status=published")
    pub_ids = [rev['id'] for rev in r_check_pub.json().get('reviews', [])]
    assert rev1_id in pub_ids and rev2_id in pub_ids, "Both reviews should be in published list"
    print("[OK] Verified both reviews are now PUBLISHED")

    # 7. Test Bulk Action: DELETE
    res_bulk_del = admin_sess.post(f"{BASE_URL}/admin/reviews/bulk", json={
        "action": "delete",
        "reviewIds": [rev1_id, rev2_id]
    })
    assert res_bulk_del.status_code == 200, f"Bulk delete failed: {res_bulk_del.text}"
    print("[OK] Bulk DELETE action executed for 2 reviews")

    # Verify both are permanently deleted
    r_check_all = admin_sess.get(f"{BASE_URL}/admin/reviews?status=ALL")
    all_ids = [rev['id'] for rev in r_check_all.json().get('reviews', [])]
    assert rev1_id not in all_ids and rev2_id not in all_ids, "Reviews should be permanently deleted"
    print("[OK] Verified both reviews are permanently DELETED")

    print("\n================================================================================")
    print("ALL ADMIN FULL REVIEW CONTROL TESTS PASSED (100%)!")
    print("================================================================================")

if __name__ == "__main__":
    run_admin_tests()
