import urllib.request
import urllib.parse
import json
import http.cookiejar
import os
import sys

sys.stdout.reconfigure(encoding='utf-8')
BASE_URL = 'http://localhost:3000'

def run():
    print("========================================================")
    print("STARTING FULL END-TO-END PRODUCT IMPORT & MATCHER TESTS")
    print("========================================================\n")

    cj = http.cookiejar.CookieJar()
    opener = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(cj))

    # Step 1: Admin Login
    print("1. Logging in as Admin...")
    login_data = json.dumps({'email': 'akash@unictechnology.com', 'password': '12341234'}).encode()
    req = urllib.request.Request(
        f"{BASE_URL}/api/auth/login",
        data=login_data,
        headers={'Content-Type': 'application/json'}
    )
    with opener.open(req) as res:
        assert res.status == 200, f"Login failed with status {res.status}"
        auth = json.loads(res.read().decode())
        print(f"✓ Admin authenticated successfully: {auth.get('user', {}).get('email')}")

    # Step 2: Test Scan Images
    print("\n2. Testing GET /api/admin/product-import/scan-images...")
    req = urllib.request.Request(f"{BASE_URL}/api/admin/product-import/scan-images")
    with opener.open(req) as res:
        assert res.status == 200
        scan_data = json.loads(res.read().decode())
        images = scan_data.get('images', [])
        print(f"✓ Found {len(images)} project image assets across public/images, images/, and uploads")
        assert len(images) > 200, f"Expected >200 images, got {len(images)}"

    # Step 3: Test Preview with sample-products.js
    print("\n3. Testing POST /api/admin/product-import/preview with sample-products.js...")
    with open('sample-products.js', 'r', encoding='utf-8') as f:
        js_content = f.read()

    prev_payload = json.dumps({
        'fileContent': js_content,
        'filename': 'sample-products.js',
        'duplicateStrategy': 'skip'
    }).encode()
    req = urllib.request.Request(
        f"{BASE_URL}/api/admin/product-import/preview",
        data=prev_payload,
        headers={'Content-Type': 'application/json'}
    )
    with opener.open(req) as res:
        assert res.status == 200
        prev_data = json.loads(res.read().decode())
        assert prev_data.get('success') is True
        summary = prev_data.get('summary', {})
        products = prev_data.get('products', [])
        print(f"✓ Parsed {len(products)} products from JS file. Summary: {summary}")
        assert len(products) >= 4, f"Expected at least 4 products, got {len(products)}"

        # Check image matches for Mayur Veda Chandbali Earrings
        chandbali = next(p for p in products if p['slug'] == 'mayur-veda-chandbali-earrings')
        print(f"✓ Mayur Veda Chandbali matched {len(chandbali['images'])} images: {chandbali['images']}")
        assert len(chandbali['images']) >= 4, "Expected at least 4 matched images"
        assert 'mayurvedachandbaliearrings-1.jpg' in chandbali['images'][0]

        # Check Pearl Fiesta
        pearl = next(p for p in products if p['slug'] == 'pearl-fiesta-earrings')
        print(f"✓ Pearl Fiesta matched {len(pearl['images'])} images: {pearl['images']}")
        assert len(pearl['images']) >= 4

        # Check Ocean Charm
        ocean = next(p for p in products if p['slug'] == 'ocean-charm-necklace')
        print(f"✓ Ocean Charm matched {len(ocean['images'])} images: {ocean['images']}")
        assert len(ocean['images']) >= 4

        # Check Amora Pendant Set
        amora = next(p for p in products if p['slug'] == 'amora-pendant-set')
        print(f"✓ Amora Pendant Set matched {len(amora['images'])} images: {amora['images']}")
        assert len(amora['images']) >= 4

    # Step 4: Test Preview with sample-products.json
    print("\n4. Testing POST /api/admin/product-import/preview with sample-products.json...")
    with open('sample-products.json', 'r', encoding='utf-8') as f:
        json_content = f.read()

    prev_payload = json.dumps({
        'fileContent': json_content,
        'filename': 'sample-products.json',
        'duplicateStrategy': 'skip'
    }).encode()
    req = urllib.request.Request(
        f"{BASE_URL}/api/admin/product-import/preview",
        data=prev_payload,
        headers={'Content-Type': 'application/json'}
    )
    with opener.open(req) as res:
        assert res.status == 200
        prev_data = json.loads(res.read().decode())
        products_json = prev_data.get('products', [])
        assert len(products_json) == 2
        bloom = next(p for p in products_json if p['slug'] == 'royal-bloom-bracelet')
        assert len(bloom['images']) >= 4
        print(f"✓ Royal Bloom Bracelet matched {len(bloom['images'])} images: {bloom['images']}")

    # Step 5: Test Local Image Upload
    print("\n5. Testing POST /api/admin/product-import/upload-local-image...")
    boundary = '----WebKitFormBoundary7MA4YWxkTrZu0gW'
    body = bytearray()
    body.extend(f'--{boundary}\r\n'.encode())
    body.extend(b'Content-Disposition: form-data; name="files"; filename="test-local-jewel.jpg"\r\n')
    body.extend(b'Content-Type: image/jpeg\r\n\r\n')
    # Valid 1x1 JPEG bytes
    jpeg_bytes = bytes([
        0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46, 0x49, 0x46, 0x00, 0x01, 0x01, 0x01, 0x00, 0x48,
        0x00, 0x48, 0x00, 0x00, 0xFF, 0xDB, 0x00, 0x43, 0x00, 0x08, 0x06, 0x06, 0x07, 0x06, 0x05, 0x08,
        0x07, 0x07, 0x07, 0x09, 0x09, 0x08, 0x0A, 0x0C, 0x14, 0x0D, 0x0C, 0x0B, 0x0B, 0x0C, 0x19, 0x12,
        0x13, 0x0F, 0x14, 0x1D, 0x1A, 0x1F, 0x1E, 0x1D, 0x1A, 0x1C, 0x1C, 0x20, 0x24, 0x2E, 0x27, 0x20,
        0x22, 0x2C, 0x23, 0x1C, 0x1C, 0x28, 0x37, 0x29, 0x2C, 0x30, 0x31, 0x34, 0x34, 0x34, 0x1F, 0x27,
        0x39, 0x3D, 0x38, 0x32, 0x3C, 0x2E, 0x33, 0x34, 0x32, 0xFF, 0xC0, 0x00, 0x0B, 0x08, 0x00, 0x01,
        0x00, 0x01, 0x01, 0x01, 0x11, 0x00, 0xFF, 0xC4, 0x00, 0x1F, 0x00, 0x00, 0x01, 0x05, 0x01, 0x01,
        0x01, 0x01, 0x01, 0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x01, 0x02, 0x03, 0x04,
        0x05, 0x06, 0x07, 0x08, 0x09, 0x0A, 0x0B, 0xFF, 0xDA, 0x00, 0x08, 0x01, 0x01, 0x00, 0x00, 0x3F,
        0x00, 0xBF, 0x80, 0xFF, 0xD9
    ])
    body.extend(jpeg_bytes)
    body.extend(b'\r\n')
    body.extend(f'--{boundary}--\r\n'.encode())

    req = urllib.request.Request(
        f"{BASE_URL}/api/admin/product-import/upload-local-image",
        data=body,
        headers={'Content-Type': f'multipart/form-data; boundary={boundary}'}
    )
    with opener.open(req) as res:
        assert res.status == 200
        up_data = json.loads(res.read().decode())
        assert up_data.get('success') is True
        uploaded_item = up_data.get('uploaded', [])[0]
        uploaded_url = uploaded_item.get('url')
        print(f"✓ Uploaded local image: {uploaded_url}")

        # Verify uploaded image is accessible
        img_req = urllib.request.Request(f"{BASE_URL}{uploaded_url}")
        with opener.open(img_req) as img_res:
            assert img_res.status == 200
            assert img_res.headers.get('Content-Type') == 'image/jpeg'
            print("✓ Uploaded image verified accessible over HTTP")

    # Step 6: Test Save Products
    print("\n6. Testing POST /api/admin/product-import/save...")
    save_payload = json.dumps({
        'products': products,
        'duplicateStrategy': 'update'
    }).encode()
    req = urllib.request.Request(
        f"{BASE_URL}/api/admin/product-import/save",
        data=save_payload,
        headers={'Content-Type': 'application/json'}
    )
    with opener.open(req) as res:
        assert res.status == 200
        save_resp = json.loads(res.read().decode())
        assert save_resp.get('success') is True
        print(f"✓ Save response: Imported={save_resp['importedCount']}, Updated={save_resp['updatedCount']}, Skipped={save_resp['skippedCount']}, Failed={save_resp['failedCount']}")
        assert (save_resp['importedCount'] + save_resp['updatedCount']) >= 4

    # Step 7: Test Storefront & Catalog Verification
    print("\n7. Testing Storefront & Catalog endpoints for imported products...")
    # 7a. Public /api/products contains the imported products
    req = urllib.request.Request(f"{BASE_URL}/api/products?limit=50")
    with opener.open(req) as res:
        assert res.status == 200
        cat_data = json.loads(res.read().decode())
        all_prods = cat_data.get('products', [])
        found_mayur = any(p['slug'] == 'mayur-veda-chandbali-earrings' for p in all_prods)
        assert found_mayur, "Mayur Veda Chandbali should be in public /api/products"
        print("✓ Verified imported product appears in public catalog list")

    # 7b. Single product endpoint
    req = urllib.request.Request(f"{BASE_URL}/api/products/mayur-veda-chandbali-earrings")
    with opener.open(req) as res:
        assert res.status == 200
        single_data = json.loads(res.read().decode())
        prod = single_data.get('product')
        assert prod is not None
        assert prod['name'] == 'Mayur Veda Chandbali Earrings'
        assert prod['price'] == 1299
        assert len(prod['images']) >= 4
        print(f"✓ Product detail endpoint returned valid product with {len(prod['images'])} images")

    # 7c. Direct static / public image serving test
    image_to_test = prod['images'][0]
    print(f"✓ Testing static serving of image {image_to_test}...")
    req = urllib.request.Request(f"{BASE_URL}{image_to_test}")
    with opener.open(req) as res:
        assert res.status == 200
        assert 'image' in res.headers.get('Content-Type')
        img_content = res.read()
        assert len(img_content) > 1000, "Image content too small"
        print(f"✓ Static image file served successfully ({len(img_content)} bytes, {res.headers.get('Content-Type')})")

    # Step 8: Test Duplicate Skip Strategy
    print("\n8. Testing Re-import with duplicateStrategy='skip'...")
    skip_payload = json.dumps({
        'products': products,
        'duplicateStrategy': 'skip'
    }).encode()
    req = urllib.request.Request(
        f"{BASE_URL}/api/admin/product-import/save",
        data=skip_payload,
        headers={'Content-Type': 'application/json'}
    )
    with opener.open(req) as res:
        assert res.status == 200
        skip_resp = json.loads(res.read().decode())
        print(f"✓ Duplicate skip results: Skipped={skip_resp['skippedCount']}, Imported={skip_resp['importedCount']}")
        assert skip_resp['skippedCount'] >= 4, "All duplicates should be safely skipped"

    print("\n========================================================")
    print("ALL END-TO-END TESTS PASSED SUCCESSFULLY! (100% PASS)")
    print("========================================================\n")

if __name__ == '__main__':
    run()
