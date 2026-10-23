import urllib.request
import urllib.parse
import json
import http.cookiejar
import sys

sys.stdout.reconfigure(encoding='utf-8')
BASE_URL = 'http://localhost:3000'

def run():
    print("=== Testing Zoom Functionality & Admin Controls (Desktop, Tablet & Mobile) ===")
    cj = http.cookiejar.CookieJar()
    opener = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(cj))

    # Test 1: Public GET /api/site-settings includes zoomSettings with separate device configs
    print("\n--- Test 1: GET /api/site-settings ---")
    req = urllib.request.Request(f"{BASE_URL}/api/site-settings")
    with opener.open(req) as res:
        assert res.status == 200, f"Expected 200, got {res.status}"
        data = json.loads(res.read().decode())
        assert 'zoomSettings' in data, "zoomSettings missing from /api/site-settings"
        zs = data['zoomSettings']
        print(f"✓ zoomSettings found: mode={zs.get('mode')}, zoomLevel={zs.get('zoomLevel')}, showCrosshair={zs.get('showCrosshair')}")
        assert 'desktop' in zs, "desktop zoom config missing"
        assert 'tablet' in zs, "tablet zoom config missing"
        assert 'mobile' in zs, "mobile zoom config missing"
        print(f"✓ Separate device zoom configs verified:")
        print(f"   - Desktop: mode={zs['desktop'].get('mode')}, zoomLevel={zs['desktop'].get('zoomLevel')}")
        print(f"   - Tablet:  mode={zs['tablet'].get('mode')}, zoomLevel={zs['tablet'].get('zoomLevel')}, pinch={zs['tablet'].get('pinchToZoom')}")
        print(f"   - Mobile:  mode={zs['mobile'].get('mode')}, zoomLevel={zs['mobile'].get('zoomLevel')}, pinch={zs['mobile'].get('pinchToZoom')}")

    # Discover a valid product slug
    test_slug = 'golden-heart-glow-pendant-set'
    try:
        preq = urllib.request.Request(f"{BASE_URL}/api/products")
        with opener.open(preq) as pres:
            p_data = json.loads(pres.read().decode())
            prods = p_data.get('products', [])
            if prods and 'slug' in prods[0]:
                test_slug = prods[0]['slug']
    except Exception as e:
        print(f"Note on product lookup: {e}")

    # Test 2: Public GET /api/products/[slug] includes zoomSettings
    print(f"\n--- Test 2: GET /api/products/{test_slug} ---")
    req = urllib.request.Request(f"{BASE_URL}/api/products/{test_slug}")
    with opener.open(req) as res:
        assert res.status == 200
        pdata = json.loads(res.read().decode())
        assert 'zoomSettings' in pdata, "zoomSettings missing from product response"
        assert 'product' in pdata
        assert 'tablet' in pdata['zoomSettings'], "tablet zoom missing from product response"
        assert 'mobile' in pdata['zoomSettings'], "mobile zoom missing from product response"
        print(f"✓ Product API returned device zoomSettings for {pdata['product']['name']}:")
        print(f"   Desktop mode: {pdata['zoomSettings']['desktop'].get('mode')}")
        print(f"   Tablet mode:  {pdata['zoomSettings']['tablet'].get('mode')}")
        print(f"   Mobile mode:  {pdata['zoomSettings']['mobile'].get('mode')}")

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
        zs = admin_settings['zoomSettings']
        assert 'desktop' in zs and 'tablet' in zs and 'mobile' in zs
        print(f"✓ Admin site-settings returns zoomSettings with desktop, tablet, and mobile configurations")

    # Test 5: Admin PUT /api/admin/site-settings - Switch desktop to 'inner' zoom mode
    print("\n--- Test 5: Switch zoom mode to 'inner' via Admin PUT ---")
    update_payload = {
        **admin_settings,
        'zoomSettings': {
            **admin_settings.get('zoomSettings', {}),
            'enabled': True,
            'mode': 'inner',
            'zoomLevel': 3.0,
            'showCrosshair': False,
            'lensSize': 180,
            'lensBorderColor': '#9C6B30',
            'allowCustomerToggle': True,
            'modalZoomEnabled': True,
            'desktop': {
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
        assert updated['zoomSettings']['desktop']['mode'] == 'inner'
        print(f"✓ Successfully updated desktop zoomSettings in Admin: mode={updated['zoomSettings']['mode']}, zoomLevel={updated['zoomSettings']['zoomLevel']}")

    # Test 6: Verify public endpoint reflects 'inner' zoom mode
    print("\n--- Test 6: Verify public /api/site-settings reflects 'inner' ---")
    req = urllib.request.Request(f"{BASE_URL}/api/site-settings")
    with opener.open(req) as res:
        assert res.status == 200
        data = json.loads(res.read().decode())
        assert data['zoomSettings']['mode'] == 'inner', f"Expected 'inner', got {data['zoomSettings']['mode']}"
        print(f"✓ Public site-settings successfully synchronized to 'inner' zoom mode")

    # Test 7: Admin PUT - Configure separate Tablet & Mobile zoom settings
    print("\n--- Test 7: Configure separate Tablet ('inner', 2.5x) and Mobile ('pinch', 3.0x) settings ---")
    update_payload_devices = {
        **admin_settings,
        'zoomSettings': {
            **admin_settings.get('zoomSettings', {}),
            'enabled': True,
            'mode': 'side-by-side',
            'zoomLevel': 2.5,
            'showCrosshair': True,
            'lensSize': 160,
            'lensBorderColor': '#D4AF37',
            'allowCustomerToggle': True,
            'modalZoomEnabled': True,
            'desktop': {
                'enabled': True,
                'mode': 'side-by-side',
                'zoomLevel': 2.5,
                'showCrosshair': True,
                'lensSize': 160,
                'lensBorderColor': '#D4AF37',
                'allowCustomerToggle': True,
                'modalZoomEnabled': True
            },
            'tablet': {
                'enabled': True,
                'mode': 'inner',
                'zoomLevel': 2.5,
                'pinchToZoom': True,
                'doubleTapZoom': True,
                'showGestureHint': True,
                'modalZoomEnabled': True,
                'allowCustomerToggle': False
            },
            'mobile': {
                'enabled': True,
                'mode': 'pinch',
                'zoomLevel': 3.0,
                'pinchToZoom': True,
                'doubleTapZoom': True,
                'showGestureHint': True,
                'modalZoomEnabled': True,
                'allowCustomerToggle': False
            }
        }
    }
    put_req = urllib.request.Request(
        f"{BASE_URL}/api/admin/site-settings",
        data=json.dumps(update_payload_devices).encode(),
        headers={'Content-Type': 'application/json'},
        method='PUT'
    )
    with opener.open(put_req) as res:
        assert res.status == 200
        updated = json.loads(res.read().decode())
        assert updated['zoomSettings']['mode'] == 'side-by-side'
        assert updated['zoomSettings']['tablet']['mode'] == 'inner'
        assert updated['zoomSettings']['tablet']['zoomLevel'] == 2.5
        assert updated['zoomSettings']['mobile']['mode'] == 'pinch'
        assert updated['zoomSettings']['mobile']['zoomLevel'] == 3.0
        print(f"✓ Successfully updated separate Tablet & Mobile zoom settings:")
        print(f"   Desktop: mode={updated['zoomSettings']['desktop']['mode']}, scale={updated['zoomSettings']['desktop']['zoomLevel']}")
        print(f"   Tablet:  mode={updated['zoomSettings']['tablet']['mode']}, scale={updated['zoomSettings']['tablet']['zoomLevel']}")
        print(f"   Mobile:  mode={updated['zoomSettings']['mobile']['mode']}, scale={updated['zoomSettings']['mobile']['zoomLevel']}")

    # Test 8: Verify public endpoint reflects separate Tablet & Mobile zoom
    print("\n--- Test 8: Verify public /api/site-settings reflects separate device zoom ---")
    req = urllib.request.Request(f"{BASE_URL}/api/site-settings")
    with opener.open(req) as res:
        assert res.status == 200
        data = json.loads(res.read().decode())
        zs = data['zoomSettings']
        assert zs['desktop']['mode'] == 'side-by-side'
        assert zs['tablet']['mode'] == 'inner'
        assert zs['tablet']['zoomLevel'] == 2.5
        assert zs['mobile']['mode'] == 'pinch'
        assert zs['mobile']['zoomLevel'] == 3.0
        print(f"✓ Public site-settings successfully synchronized separate zoom for desktop, tablet, and mobile")

    # Test 9: Storefront product page HTML check
    print(f"\n--- Test 9: Storefront product page HTML check for /product/{test_slug} ---")
    req = urllib.request.Request(f"{BASE_URL}/product/{test_slug}")
    with opener.open(req) as res:
        assert res.status == 200
        html = res.read().decode('utf-8', errors='ignore')
        assert "Order Now on WhatsApp" not in html, "WhatsApp CTA should be removed from product page"
        assert "Add to Bag" in html, "Add to Bag button missing from product page"
        print(f"✓ Product page loaded successfully with 200 OK")

    print("\n=======================================================")
    print("ALL 9 TESTS PASSED! Separate zoom functionality for Mobile, Tablet, and Desktop is fully operational.")
    print("=======================================================")

if __name__ == '__main__':
    run()
