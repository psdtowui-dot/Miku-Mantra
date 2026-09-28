import requests
import json

BASE_URL = "http://localhost:3000/api"

def run_tests():
    session = requests.Session()
    print("\n=========================================")
    print("STARTING HOMEPAGE CMS VERIFICATION")
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
    assert logged_in, "Admin login failed"

    # Reset homepage content to standard seed defaults
    reset_payload = {
        "homepagePromotions": [
            {
                "id": "promo_1",
                "enabled": True,
                "img": "https://images.unsplash.com/photo-1600685890506-593fdf55949b?crop=entropy&cs=srgb&fm=jpg&q=85",
                "eyebrow": "Limited Time",
                "title": "The Wedding Trunk",
                "subtitle": "Up to 15% off on making charges",
                "ctaText": "Shop the Offer",
                "ctaUrl": "/shop?category=wedding",
                "order": 1
            },
            {
                "id": "promo_2",
                "enabled": True,
                "img": "https://images.unsplash.com/photo-1611652022419-a9419f74343d?crop=entropy&cs=srgb&fm=jpg&q=85",
                "eyebrow": "Limited Time",
                "title": "Solitaires under INR 1.5L",
                "subtitle": "GIA certified. Made to promise.",
                "ctaText": "Shop the Offer",
                "ctaUrl": "/shop?category=diamond",
                "order": 2
            }
        ],
        "assuranceSection": {
            "enabled": True,
            "eyebrow": "Our Promise",
            "title": "The MikuMantra Assurance",
            "description": "Six generations of craftsmanship, ten values that never change."
        },
        "assuranceCards": [
            { "id": "assur_1", "icon": "ShieldCheck", "title": "BIS Hallmarked", "description": "Every piece government certified.", "enabled": True, "order": 1 },
            { "id": "assur_2", "icon": "Award", "title": "SGL & GIA Certified", "description": "Independently graded diamonds.", "enabled": True, "order": 2 },
            { "id": "assur_3", "icon": "Truck", "title": "Complimentary Shipping", "description": "Insured, tracked, delivered.", "enabled": True, "order": 3 },
            { "id": "assur_4", "icon": "RefreshCw", "title": "15-Day Easy Returns", "description": "Full refund, no questions.", "enabled": True, "order": 4 },
            { "id": "assur_5", "icon": "Sparkles", "title": "Lifetime Care", "description": "Free cleaning & polishing.", "enabled": True, "order": 5 },
            { "id": "assur_6", "icon": "Heart", "title": "Lifetime Buyback", "description": "100% gold value assured.", "enabled": True, "order": 6 }
        ]
    }
    r_reset = session.put(f"{BASE_URL}/admin/homepage-content", json=reset_payload)
    assert r_reset.status_code == 200, f"Reset failed: {r_reset.text}"
    print("[PASS] Initialized Homepage Content to Seed Defaults")

    # Test 1: GET /api/homepage-content public endpoint
    r1 = session.get(f"{BASE_URL}/homepage-content")
    assert r1.status_code == 200, f"Public GET failed: {r1.text}"
    d1 = r1.json()
    assert len(d1.get("homepagePromotions", [])) == 2
    assert d1.get("assuranceSection", {}).get("title") == "The MikuMantra Assurance"
    assert len(d1.get("assuranceCards", [])) == 6
    print("[PASS] 1. Public GET /api/homepage-content returned dynamic promotions and assurance section/cards")

    # Test 2: Admin updates Assurance Section title to "Our Jewellery Promise" & card title
    update_payload = {
        "homepagePromotions": d1["homepagePromotions"],
        "assuranceSection": {
            "enabled": True,
            "eyebrow": "Crafted With Heritage",
            "title": "Our Jewellery Promise",
            "description": "Custom test description for 2026."
        },
        "assuranceCards": [
            { "id": "assur_1", "icon": "ShieldCheck", "title": "100% BIS Hallmarked", "description": "Certified purity by BIS India.", "enabled": True, "order": 1 },
            *d1["assuranceCards"][1:]
        ]
    }
    r2 = session.put(f"{BASE_URL}/admin/homepage-content", json=update_payload)
    assert r2.status_code == 200, f"PUT admin homepage content failed: {r2.text}"
    print("[PASS] 2. Admin updated Assurance Section title to 'Our Jewellery Promise' and Card 1 title")

    # Test 3: Verify Public GET /api/homepage-content reflects updated values immediately
    r3 = session.get(f"{BASE_URL}/homepage-content")
    assert r3.status_code == 200
    d3 = r3.json()
    assert d3.get("assuranceSection", {}).get("title") == "Our Jewellery Promise"
    assert d3.get("assuranceSection", {}).get("eyebrow") == "Crafted With Heritage"
    assert d3.get("assuranceCards", [])[0].get("title") == "100% BIS Hallmarked"
    print("[PASS] 3. Verified Public GET /api/homepage-content returns updated title 'Our Jewellery Promise'")

    # Test 4: Admin adds a 3rd promotional banner and updates order
    new_promo = {
        "id": "promo_3",
        "enabled": True,
        "img": "https://images.unsplash.com/photo-1601121141461-9d6647bca1ed?crop=entropy&cs=srgb&fm=jpg&q=85",
        "eyebrow": "New Launch",
        "title": "Royal Kundan Heritage",
        "subtitle": "Jaipur court inspired bridal sets",
        "ctaText": "Explore Kundan",
        "ctaUrl": "/shop?category=kundan",
        "order": 3
    }
    promo_payload = {
        **update_payload,
        "homepagePromotions": [*d3["homepagePromotions"], new_promo]
    }
    r4 = session.put(f"{BASE_URL}/admin/homepage-content", json=promo_payload)
    assert r4.status_code == 200

    r4_get = session.get(f"{BASE_URL}/homepage-content")
    assert len(r4_get.json().get("homepagePromotions", [])) == 3
    print("[PASS] 4. Admin added 3rd promotional banner ('Royal Kundan Heritage') and verified in API")

    # Test 5: Admin disables Assurance Section (enabled: False)
    disable_sec_payload = {
        **promo_payload,
        "assuranceSection": {
            **promo_payload["assuranceSection"],
            "enabled": False
        }
    }
    r5 = session.put(f"{BASE_URL}/admin/homepage-content", json=disable_sec_payload)
    assert r5.status_code == 200

    r5_get = session.get(f"{BASE_URL}/homepage-content")
    assert r5_get.json().get("assuranceSection", {}).get("enabled") is False
    print("[PASS] 5. Admin disabled Assurance Section -> API returned enabled=False")

    # Test 6: Revert settings back to standard defaults
    r_revert = session.put(f"{BASE_URL}/admin/homepage-content", json=reset_payload)
    assert r_revert.status_code == 200
    r_rev_get = session.get(f"{BASE_URL}/homepage-content")
    assert r_rev_get.json().get("assuranceSection", {}).get("title") == "The MikuMantra Assurance"
    print("[PASS] 6. Reverted Homepage Content settings back to defaults cleanly")

    print("\n=========================================")
    print("ALL HOMEPAGE CMS VERIFICATION TESTS PASSED SUCCESSFULLY!")
    print("=========================================\n")

if __name__ == "__main__":
    run_tests()
