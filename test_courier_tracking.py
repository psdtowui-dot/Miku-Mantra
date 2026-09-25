import requests
import json
import sys

BASE_URL = "http://localhost:3000/api"

def run_tests():
    session = requests.Session()
    print("\n" + "="*50)
    print("TESTING COURIER TRACKING IMPLEMENTATION")
    print("="*50 + "\n")

    # 1. Admin Login
    admin_emails = ["admin@mikumantra.com", "akash@unictechnology.com", "kk1414497@gmail.com"]
    passwords = ["12341234", "admin123", "password123"]
    logged_in = False
    for em in admin_emails:
        for pw in passwords:
            r = session.post(f"{BASE_URL}/auth/login", json={"email": em, "password": pw})
            if r.status_code == 200:
                logged_in = True
                print(f"[PASS] 1. Admin Login Successful as {em}")
                break
        if logged_in:
            break
    assert logged_in, "Admin login failed"

    # 2. Get Orders List
    r = session.get(f"{BASE_URL}/admin/orders")
    assert r.status_code == 200, f"Failed to get admin orders: {r.text}"
    orders = r.json().get('orders', [])
    print(f"[PASS] 2. Retrieved {len(orders)} orders")

    # Pick a non-cancelled order
    target_order = None
    for o in orders:
        if o.get('status') != 'cancelled':
            target_order = o
            break
    
    if not target_order:
        print("[SKIP] No active non-cancelled order found to test shipping.")
        return

    order_id = target_order['id']
    order_num = target_order.get('orderNumber', order_id)
    print(f"Targeting Order #{order_num} (ID: {order_id}), Current Status: {target_order.get('status')}")

    # 3. Mark Order as Shipped with Courier Details (Blue Dart)
    ship_payload = {
        "status": "shipped",
        "courier": {
            "carrier": "Blue Dart",
            "trackingNumber": "BD778899112",
            "notes": "Express insured air delivery"
        }
    }
    r = session.put(f"{BASE_URL}/admin/orders/{order_id}", json=ship_payload)
    assert r.status_code == 200, f"Ship order failed: {r.text}"
    updated_order = r.json().get('order', {})
    
    assert updated_order.get('status') == 'shipped', f"Expected status 'shipped', got {updated_order.get('status')}"
    courier = updated_order.get('courier', {})
    assert courier.get('carrier') == 'Blue Dart', f"Expected carrier 'Blue Dart', got {courier.get('carrier')}"
    assert courier.get('trackingNumber') == 'BD778899112', f"Expected tracking number 'BD778899112', got {courier.get('trackingNumber')}"
    assert 'bluedart.com' in (courier.get('trackingUrl') or ''), f"Expected Blue Dart tracking URL, got {courier.get('trackingUrl')}"
    assert 'BD778899112' in (courier.get('trackingUrl') or ''), f"Tracking URL missing AWB"
    print(f"[PASS] 3. Shipped with Blue Dart! AWB: {courier.get('trackingNumber')}, URL: {courier.get('trackingUrl')}")

    # Check statusHistory for detailed note
    history = updated_order.get('statusHistory', [])
    latest_history = history[-1] if history else {}
    print(f"Latest statusHistory entry: {latest_history.get('status')} - note: {latest_history.get('note')}")
    assert 'Blue Dart' in latest_history.get('note', ''), "statusHistory should mention Blue Dart"
    assert 'BD778899112' in latest_history.get('note', ''), "statusHistory should mention AWB BD778899112"
    print("[PASS] 4. Status history audit note logged correctly with carrier and AWB")

    # 4. Update Courier Details for Already-Shipped Order (e.g. switch to Delhivery)
    update_courier_payload = {
        "courier": {
            "carrier": "Delhivery",
            "trackingNumber": "DLV445566778",
            "notes": "Handed over to priority surface dispatch"
        }
    }
    r = session.put(f"{BASE_URL}/admin/orders/{order_id}", json=update_courier_payload)
    assert r.status_code == 200, f"Update courier failed: {r.text}"
    updated_order2 = r.json().get('order', {})
    courier2 = updated_order2.get('courier', {})
    assert courier2.get('carrier') == 'Delhivery', f"Expected Delhivery, got {courier2.get('carrier')}"
    assert courier2.get('trackingNumber') == 'DLV445566778', f"Expected DLV445566778, got {courier2.get('trackingNumber')}"
    assert 'delhivery.com' in (courier2.get('trackingUrl') or ''), f"Expected Delhivery URL, got {courier2.get('trackingUrl')}"
    print(f"[PASS] 5. Updated tracking post-shipping to Delhivery! AWB: {courier2.get('trackingNumber')}, URL: {courier2.get('trackingUrl')}")

    # 5. Customer Order Fetch
    r = session.get(f"{BASE_URL}/orders/{order_id}")
    assert r.status_code == 200, f"Customer order fetch failed: {r.text}"
    cust_order = r.json().get('order', {})
    assert cust_order.get('courier', {}).get('trackingNumber') == 'DLV445566778', "Customer order missing courier details"
    print("[PASS] 6. Customer order endpoint returns complete courier tracking details")

    print("\n" + "="*50)
    print("ALL COURIER TRACKING TESTS PASSED (6/6)")
    print("="*50 + "\n")

if __name__ == '__main__':
    run_tests()
