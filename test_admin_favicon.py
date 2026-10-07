import urllib.request
import urllib.parse
import json
import http.cookiejar
import os
import sys

sys.stdout.reconfigure(encoding='utf-8')

BASE_URL = 'http://localhost:3000'

def run_tests():
    print("=== Testing Admin Favicon System ===")
    cj = http.cookiejar.CookieJar()
    opener = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(cj))

    # Test 1: Public /favicon.ico file exists and responds with 200
    print("\n--- Test 1: GET /favicon.ico ---")
    req = urllib.request.Request(f"{BASE_URL}/favicon.ico")
    with opener.open(req) as res:
        assert res.status == 200, f"Expected 200, got {res.status}"
        data = res.read()
        assert len(data) > 0, "Favicon file is empty"
        print(f"✓ /favicon.ico accessible, size: {len(data)} bytes")

    # Test 2: Public /favicon.svg file exists and responds with 200
    print("\n--- Test 2: GET /favicon.svg ---")
    req = urllib.request.Request(f"{BASE_URL}/favicon.svg")
    with opener.open(req) as res:
        assert res.status == 200, f"Expected 200, got {res.status}"
        data = res.read()
        assert b'<svg' in data, "Favicon SVG does not contain <svg"
        print(f"✓ /favicon.svg accessible, size: {len(data)} bytes")

    # Test 3: Public /api/site-settings includes favicon field
    print("\n--- Test 3: GET /api/site-settings ---")
    req = urllib.request.Request(f"{BASE_URL}/api/site-settings")
    with opener.open(req) as res:
        assert res.status == 200
        settings = json.loads(res.read().decode())
        assert 'favicon' in settings, "favicon key missing from /api/site-settings"
        print(f"✓ /api/site-settings returned favicon: '{settings['favicon']}'")

    # Test 4: Admin Login
    print("\n--- Test 4: Admin Login ---")
    login_data = json.dumps({'email': 'akash@unictechnology.com', 'password': '12341234'}).encode()
    req = urllib.request.Request(
        f"{BASE_URL}/api/auth/login",
        data=login_data,
        headers={'Content-Type': 'application/json'}
    )
    with opener.open(req) as res:
        assert res.status == 200
        auth_data = json.loads(res.read().decode())
        assert auth_data.get('user', {}).get('role') == 'admin' or auth_data.get('role') == 'admin' or auth_data.get('token'), "Admin login failed"
        print(f"✓ Admin logged in successfully as {auth_data.get('user', {}).get('email', 'admin')}")

    # Test 5: GET /api/admin/site-settings
    print("\n--- Test 5: GET /api/admin/site-settings ---")
    req = urllib.request.Request(f"{BASE_URL}/api/admin/site-settings")
    with opener.open(req) as res:
        assert res.status == 200
        admin_settings = json.loads(res.read().decode())
        assert 'favicon' in admin_settings, "favicon key missing from /api/admin/site-settings"
        original_favicon = admin_settings['favicon']
        print(f"✓ /api/admin/site-settings returned favicon: '{original_favicon}'")

    # Test 6: Upload a custom .ico file via /api/admin/upload
    print("\n--- Test 6: POST /api/admin/upload with .ico MIME type ---")
    boundary = "----WebKitFormBoundaryFaviconTest7MA4YWxkTrZu0gW"
    ico_sample = b"\x00\x00\x01\x00\x01\x00\x10\x10\x00\x00\x01\x00\x20\x00\x68\x04\x00\x00\x16\x00\x00\x00" + b"\x00" * 1128
    
    body = (
        f"--{boundary}\r\n"
        'Content-Disposition: form-data; name="file"; filename="custom_brand_favicon.ico"\r\n'
        'Content-Type: image/x-icon\r\n\r\n'
    ).encode() + ico_sample + f"\r\n--{boundary}--\r\n".encode()

    req = urllib.request.Request(
        f"{BASE_URL}/api/admin/upload",
        data=body,
        headers={'Content-Type': f'multipart/form-data; boundary={boundary}'}
    )
    with opener.open(req) as res:
        assert res.status == 200, f"Expected 200 for .ico upload, got {res.status}"
        upload_resp = json.loads(res.read().decode())
        assert 'url' in upload_resp, "url key missing from upload response"
        custom_favicon_url = upload_resp['url']
        print(f"✓ .ico uploaded successfully: {custom_favicon_url}")

    # Test 7: Update favicon via PUT /api/admin/site-settings
    print("\n--- Test 7: PUT /api/admin/site-settings with new favicon ---")
    put_payload = {
        **admin_settings,
        'favicon': custom_favicon_url
    }
    req = urllib.request.Request(
        f"{BASE_URL}/api/admin/site-settings",
        data=json.dumps(put_payload).encode(),
        headers={'Content-Type': 'application/json'},
        method='PUT'
    )
    with opener.open(req) as res:
        assert res.status == 200
        put_resp = json.loads(res.read().decode())
        assert put_resp.get('favicon') == custom_favicon_url, f"Favicon not updated in PUT response: {put_resp.get('favicon')}"
        print(f"✓ Favicon updated via PUT to: {put_resp.get('favicon')}")

    # Test 8: Verify public /api/site-settings reflects the new favicon
    print("\n--- Test 8: Verify public /api/site-settings has custom favicon ---")
    req = urllib.request.Request(f"{BASE_URL}/api/site-settings")
    with opener.open(req) as res:
        assert res.status == 200
        refreshed_public = json.loads(res.read().decode())
        assert refreshed_public.get('favicon') == custom_favicon_url, f"Public site settings did not update: {refreshed_public.get('favicon')}"
        print(f"✓ Public site settings returned updated favicon: {refreshed_public.get('favicon')}")

    # Test 9: Reset favicon back to original or /favicon.ico
    print("\n--- Test 9: Reset Favicon to /favicon.ico ---")
    reset_payload = {
        **put_payload,
        'favicon': '/favicon.ico'
    }
    req = urllib.request.Request(
        f"{BASE_URL}/api/admin/site-settings",
        data=json.dumps(reset_payload).encode(),
        headers={'Content-Type': 'application/json'},
        method='PUT'
    )
    with opener.open(req) as res:
        assert res.status == 200
        reset_resp = json.loads(res.read().decode())
        assert reset_resp.get('favicon') == '/favicon.ico', f"Favicon not reset in PUT response: {reset_resp.get('favicon')}"
        print("✓ Favicon successfully reset to default '/favicon.ico'")

    # Test 10: Verify public endpoint after reset
    print("\n--- Test 10: Verify public endpoint reflects reset ---")
    req = urllib.request.Request(f"{BASE_URL}/api/site-settings")
    with opener.open(req) as res:
        assert res.status == 200
        final_public = json.loads(res.read().decode())
        assert final_public.get('favicon') == '/favicon.ico', f"Public site settings did not reset: {final_public.get('favicon')}"
        print(f"✓ Public site settings confirmed reset: {final_public.get('favicon')}")

    print("\n==========================================")
    print("🎉 ALL 10 FAVICON TESTS PASSED SUCCESSFULLY!")
    print("==========================================")

if __name__ == '__main__':
    run_tests()
