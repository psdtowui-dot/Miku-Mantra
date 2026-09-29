import urllib.request
import urllib.parse
import json
import http.cookiejar
import sys

sys.stdout.reconfigure(encoding='utf-8')
BASE_URL = 'http://localhost:3000'

def run():
    print("=== Testing Zoom Functionality & Admin Controls ===")
    cj = http.cookiejar.CookieJar()
    opener = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(cj))

    # Test 1: Public GET /api/site-settings includes zoomSettings
    print("\n--- Test 1: GET /api/site-settings ---")
    req = urllib.request.Request(f"{BASE_URL}/api/site-settings")
    with opener.open(req) as res:
        assert res.status == 200, f"Expected 200, got {res.status}"
        data = json.loads(res.read().decode())
        assert 'zoomSettings' in data, "zoomSettings missing from /api/site-settings"
        zs = data['zoomSettings']
        print(f"✓ zoomSettings found: mode={zs.get('mode')}, zoomLevel={zs.get('zoomLevel')}, showCrosshair={zs.get('showCrosshair')}")

    # Test 2: Public GET /api/products/halo-spark-pendant-set includes zoomSettings
    print("\n--- Test 2: GET /api/products/halo-spark-pendant-set ---")
    req = urllib.request.Request(f"{BASE_URL}/api/products/halo-spark-pendant-set")
    with opener.open(req) as res:
        assert res.status == 200
        pdata = json.loads(res.read().decode())
        assert 'zoomSettings' in pdata, "zoomSettings missing from product response"
        assert 'product' in pdata
        print(f"✓ Product API returned zoomSettings for {pdata['product']['name']}: {pdata['zoomSettings']}")

    # Test 3: Admin Login
    print("\n--- Test 3: Admin Login ---")
    login_data = json.dumps({'email': 'akash@unictechnology.com', 'password': '12341234'}).encode()
    req = urllib.request.Request(f"{BASE_URL}/api/auth/login", data=login_data, headers={'Content-Type': 'application/json'})
    with opener.open(req) as res:
        assert res.status == 200
        login_res = json.loads(res.read().decode())
        print(f"✓ Admin logged in as: {login_res.get('user', {}).get('email')}")

    # Test 4: Admin GET /api/admin/site-settings
    print("\n--- Test 4: Admin GET /api/admin/site-settings ---")
    req = urllib.request.Request(f"{BASE_URL}/api/admin/site-settings")
    with opener.open(req) as res:
        assert res.status == 200
        admin_settings = json.loads(res.read().decode())
        assert 'zoomSettings' in admin_settings
        print(f"✓ Admin site-settings returns zoomSettings: {admin_settings['zoomSettings']}")

    # Test 5: Admin PUT /api/admin/site-settings - Switch to 'inner' zoom mode
    print("\n--- Test 5: Switch zoom mode to 'inner' via Admin PUT ---")
    update_payload = {
        **admin_settings,
        'zoomSettings': {
            'enabled': True,
            'mode': 'inner',
            'zoomLevel': 3.0,
            'showCrosshair': False,
            'lensSize': 180,
            'lensBorderColor': '#9C6B30',
            'allowCustomerToggle': True,
            'modalZoomEnabled': True
        }
    }
    put_req = urllib.request.Request(
        f"{BASE_URL}/api/admin/site-settings",
        data=json.dumps(update_payload).encode(),
        headers={'Content-Type': 'application/json'},
        method='PUT'
    )
    with opener.open(put_req) as res:
        assert res.status == 200
        updated = json.loads(res.read().decode())
        assert updated['zoomSettings']['mode'] == 'inner'
        assert updated['zoomSettings']['zoomLevel'] == 3.0
        assert updated['zoomSettings']['showCrosshair'] is False
        print(f"✓ Successfully updated zoomSettings in Admin: mode={updated['zoomSettings']['mode']}, zoomLevel={updated['zoomSettings']['zoomLevel']}")

    # Test 6: Verify public endpoint reflects 'inner' zoom mode
    print("\n--- Test 6: Verify public /api/site-settings reflects 'inner' ---")
    req = urllib.request.Request(f"{BASE_URL}/api/site-settings")
    with opener.open(req) as res:
        assert res.status == 200
        data = json.loads(res.read().decode())
        assert data['zoomSettings']['mode'] == 'inner', f"Expected 'inner', got {data['zoomSettings']['mode']}"
        print(f"✓ Public site-settings successfully synchronized to 'inner' zoom mode")

    # Test 7: Admin PUT /api/admin/site-settings - Switch back to 'side-by-side' (Reference mode)
    print("\n--- Test 7: Switch zoom mode to 'side-by-side' (Lens + Crosshairs + Flyout Window) ---")
    update_payload_side = {
        **admin_settings,
        'zoomSettings': {
            'enabled': True,
            'mode': 'side-by-side',
            'zoomLevel': 2.5,
            'showCrosshair': True,
            'lensSize': 160,
            'lensBorderColor': '#D4AF37',
            'allowCustomerToggle': True,
            'modalZoomEnabled': True
        }
    }
    put_req = urllib.request.Request(
        f"{BASE_URL}/api/admin/site-settings",
        data=json.dumps(update_payload_side).encode(),
        headers={'Content-Type': 'application/json'},
        method='PUT'
    )
    with opener.open(put_req) as res:
        assert res.status == 200
        updated = json.loads(res.read().decode())
        assert updated['zoomSettings']['mode'] == 'side-by-side'
        assert updated['zoomSettings']['showCrosshair'] is True
        assert updated['zoomSettings']['lensSize'] == 160
        print(f"✓ Successfully updated to side-by-side mode: {updated['zoomSettings']}")

    # Test 8: Verify product page responds with 200 and WhatsApp CTA is removed
    print("\n--- Test 8: Storefront product page HTML check ---")
    req = urllib.request.Request(f"{BASE_URL}/product/halo-spark-pendant-set")
    with opener.open(req) as res:
        assert res.status == 200
        html = res.read().decode('utf-8', errors='ignore')
        assert "Order Now on WhatsApp" not in html, "WhatsApp CTA should be removed from product page"
        assert "Add to Bag" in html, "Add to Bag button missing from product page"
        print(f"✓ Product page loaded successfully with 200 OK (WhatsApp button removed as requested)")

    print("\n=======================================================")
    print("ALL 8 TESTS PASSED! Both zoom functionalities and backend admin control are fully operational.")
    print("=======================================================")

if __name__ == '__main__':
    run()
