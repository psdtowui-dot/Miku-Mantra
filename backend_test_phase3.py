#!/usr/bin/env python3
"""
MikuMantra Jewellery eCommerce Backend API - Phase 3 Test Suite
Tests NEW Phase 3 features: pagination, status history, PDF invoices, cache invalidation, sitemap/robots
"""

import requests
import json
import sys
import time
from typing import Dict, Any, Optional

BASE_URL = "https://luxe-jewel-store.preview.emergentagent.com/api"
FRONTEND_URL = "https://luxe-jewel-store.preview.emergentagent.com"
if len(sys.argv) > 1:
    BASE_URL = sys.argv[1]
    if len(sys.argv) > 2:
        FRONTEND_URL = sys.argv[2]
    else:
        if BASE_URL.endswith('/api'):
            FRONTEND_URL = BASE_URL[:-4]
SESSION_COOKIE = "mikumantra_session"

class TestSession:
    def __init__(self):
        self.session = requests.Session()
        self.admin_session = requests.Session()
        self.test_results = []
        self.failed_tests = []
        
    def log(self, message: str, success: bool = True):
        """Log test result"""
        prefix = "✅" if success else "❌"
        print(f"{prefix} {message}")
        self.test_results.append({"message": message, "success": success})
        if not success:
            self.failed_tests.append(message)
    
    def test_endpoint(self, method: str, endpoint: str, expected_status: int = 200, 
                     data: Optional[Dict] = None, description: str = "", 
                     check_fields: Optional[list] = None, session=None) -> Optional[Dict]:
        """Generic endpoint test"""
        if session is None:
            session = self.session
        
        url = f"{BASE_URL}{endpoint}"
        try:
            if method == "GET":
                response = session.get(url, timeout=15)
            elif method == "POST":
                response = session.post(url, json=data, timeout=15)
            elif method == "PUT":
                response = session.put(url, json=data, timeout=15)
            elif method == "DELETE":
                response = session.delete(url, timeout=15)
            else:
                self.log(f"Invalid method {method}", False)
                return None
            
            # Check status code
            if response.status_code != expected_status:
                self.log(f"{description} - Expected {expected_status}, got {response.status_code}. Response: {response.text[:300]}", False)
                return None
            
            # Parse JSON response
            try:
                result = response.json()
            except:
                if expected_status == 200:
                    self.log(f"{description} - Failed to parse JSON response", False)
                    return None
                result = {}
            
            # Check required fields
            if check_fields:
                for field in check_fields:
                    if field not in result:
                        self.log(f"{description} - Missing field '{field}' in response", False)
                        return None
            
            self.log(f"{description} - Success", True)
            return result
            
        except Exception as e:
            self.log(f"{description} - Exception: {str(e)}", False)
            return None

def main():
    test = TestSession()
    
    print("\n" + "="*80)
    print("MIKUMANTRA JEWELLERY - PHASE 3 BACKEND API TEST SUITE")
    print("="*80 + "\n")
    
    # ============================================================================
    # SETUP: Login as admin
    # ============================================================================
    print("\n[SETUP] Logging in as admin")
    print("-" * 80)
    
    admin_data = {
        "email": "admin@mikumantra.com",
        "password": "admin123"
    }
    
    # Try to register admin first (in case it doesn't exist)
    try:
        response = test.admin_session.post(f"{BASE_URL}/auth/register", json={
            "name": "Admin User",
            "email": "admin@mikumantra.com",
            "password": "admin123"
        }, timeout=10)
        if response.status_code == 200:
            test.log("Admin user registered successfully", True)
        elif response.status_code == 409:
            test.log("Admin user already exists", True)
    except Exception as e:
        test.log(f"Admin registration check: {str(e)}", True)
    
    # Login as admin
    try:
        response = test.admin_session.post(f"{BASE_URL}/auth/login", json=admin_data, timeout=10)
        if response.status_code == 200:
            result = response.json()
            if result.get('user', {}).get('role') == 'admin':
                test.log("Admin login successful with role='admin'", True)
            else:
                test.log(f"Admin role mismatch: {result.get('user', {}).get('role')}", False)
                sys.exit(1)
        else:
            test.log(f"Admin login failed with status {response.status_code}", False)
            sys.exit(1)
    except Exception as e:
        test.log(f"Admin login failed: {str(e)}", False)
        sys.exit(1)
    
    # Also create a regular user for order testing
    user_data = {
        "name": "Phase3 Test User",
        "email": f"phase3test{int(time.time())}@mikumantra.com",
        "password": "test123"
    }
    try:
        response = test.session.post(f"{BASE_URL}/auth/register", json=user_data, timeout=10)
        if response.status_code == 200:
            test.log("Regular user created for testing", True)
        else:
            test.log(f"Regular user creation failed: {response.status_code}", False)
    except Exception as e:
        test.log(f"Regular user creation exception: {str(e)}", False)
    
    # ============================================================================
    # 1. PRODUCTS PAGINATION (BACKWARDS COMPATIBLE)
    # ============================================================================
    print("\n[1] Testing Products Pagination (Backwards Compatible)")
    print("-" * 80)
    
    # Test 1.1: GET /api/products (no params) - should still return { products, total, page, totalPages }
    result = test.test_endpoint("GET", "/products", 200,
                                description="GET /products (no params) - should return products with pagination fields",
                                check_fields=['products', 'total', 'page', 'totalPages'])
    if result:
        total = result.get('total', 0)
        page = result.get('page', 0)
        total_pages = result.get('totalPages', 0)
        products_count = len(result.get('products', []))
        test.log(f"Pagination fields present: total={total}, page={page}, totalPages={total_pages}, products={products_count}", True)
        
        # Verify total is >= 12 (seeded products)
        if total >= 12:
            test.log(f"Total products count correct: {total}", True)
        else:
            test.log(f"Total products count mismatch: expected >= 12, got {total}", False)
    
    # Test 1.2: GET /api/products?page=1&limit=5 - should return exactly 5 products with total=12
    result = test.test_endpoint("GET", "/products?page=1&limit=5", 200,
                                description="GET /products?page=1&limit=5 - should return exactly 5 products",
                                check_fields=['products', 'total', 'page', 'totalPages'])
    if result:
        products_count = len(result.get('products', []))
        total = result.get('total', 0)
        page = result.get('page', 0)
        total_pages = result.get('totalPages', 0)
        
        if products_count == 5:
            test.log(f"Page 1 limit 5: returned exactly 5 products", True)
        else:
            test.log(f"Page 1 limit 5: expected 5 products, got {products_count}", False)
        
        if total >= 12:
            test.log(f"Page 1 limit 5: total={total} correct", True)
        else:
            test.log(f"Page 1 limit 5: total mismatch, expected >= 12, got {total}", False)
        
        if page == 1:
            test.log(f"Page 1 limit 5: page=1 correct", True)
        else:
            test.log(f"Page 1 limit 5: page mismatch, expected 1, got {page}", False)
        
        if total_pages == 3:  # 12 products / 5 per page = 3 pages (rounded up)
            test.log(f"Page 1 limit 5: totalPages=3 correct", True)
        else:
            test.log(f"Page 1 limit 5: totalPages mismatch, expected 3, got {total_pages}", False)
    
    # Test 1.3: GET /api/products?page=2&limit=5 - returns remaining products
    result = test.test_endpoint("GET", "/products?page=2&limit=5", 200,
                                description="GET /products?page=2&limit=5 - should return next 5 products",
                                check_fields=['products', 'total', 'page', 'totalPages'])
    if result:
        products_count = len(result.get('products', []))
        page = result.get('page', 0)
        
        if products_count == 5:
            test.log(f"Page 2 limit 5: returned 5 products", True)
        else:
            test.log(f"Page 2 limit 5: expected 5 products, got {products_count}", False)
        
        if page == 2:
            test.log(f"Page 2 limit 5: page=2 correct", True)
        else:
            test.log(f"Page 2 limit 5: page mismatch, expected 2, got {page}", False)
    
    # Test 1.4: Response cache - Same request should be faster on 2nd hit (cache TTL 30s)
    print("\nTesting response cache (30s TTL)...")
    start_time = time.time()
    test.test_endpoint("GET", "/products?page=1&limit=5", 200,
                      description="GET /products?page=1&limit=5 - First request (cache miss)")
    first_request_time = time.time() - start_time
    
    start_time = time.time()
    test.test_endpoint("GET", "/products?page=1&limit=5", 200,
                      description="GET /products?page=1&limit=5 - Second request (cache hit)")
    second_request_time = time.time() - start_time
    
    test.log(f"Cache timing: 1st request={first_request_time:.3f}s, 2nd request={second_request_time:.3f}s", True)
    if second_request_time < first_request_time:
        test.log("Cache working: 2nd request faster than 1st", True)
    else:
        test.log("Cache may not be working optimally (2nd request not faster)", True)  # Not a failure, just info
    
    # ============================================================================
    # 2. ORDER STATUS HISTORY TRACKING
    # ============================================================================
    print("\n[2] Testing Order Status History Tracking")
    print("-" * 80)
    
    # Test 2.1: Create order with COD and verify statusHistory
    try:
        # Get a product to order
        response = test.session.get(f"{BASE_URL}/products", timeout=10)
        products = response.json().get('products', [])
        if products:
            test_product = products[0]
            
            order_data = {
                "items": [
                    {
                        "id": test_product.get('id'),
                        "name": test_product.get('name'),
                        "price": test_product.get('price'),
                        "qty": 1,
                        "image": test_product.get('images')[0] if test_product.get('images') else ""
                    }
                ],
                "address": {
                    "fullName": "Phase3 Test User",
                    "phone": "9876543210",
                    "line1": "123 Test Street",
                    "line2": "Apt 4B",
                    "city": "Mumbai",
                    "state": "Maharashtra",
                    "pincode": "400001"
                },
                "payment": "cod",
                "giftWrap": False
            }
            
            result = test.test_endpoint("POST", "/orders", 200, data=order_data,
                                       description="POST /orders with COD - should create order with statusHistory",
                                       check_fields=['order'])
            
            order_id = None
            if result and 'order' in result:
                order = result['order']
                order_id = order.get('id')
                status_history = order.get('statusHistory', [])
                
                # Verify statusHistory exists and has initial entry
                if isinstance(status_history, list) and len(status_history) > 0:
                    test.log(f"Order has statusHistory with {len(status_history)} entry(ies)", True)
                    
                    first_entry = status_history[0]
                    if first_entry.get('status') == 'confirmed':
                        test.log(f"Initial status is 'confirmed'", True)
                    else:
                        test.log(f"Initial status mismatch: expected 'confirmed', got {first_entry.get('status')}", False)
                    
                    if 'at' in first_entry:
                        test.log(f"Status entry has 'at' timestamp: {first_entry.get('at')}", True)
                    else:
                        test.log("Status entry missing 'at' timestamp", False)
                    
                    if first_entry.get('note') == 'Order placed successfully.':
                        test.log(f"Initial note correct: '{first_entry.get('note')}'", True)
                    else:
                        test.log(f"Initial note mismatch: got '{first_entry.get('note')}'", False)
                else:
                    test.log("Order missing statusHistory or empty", False)
                
                # Test 2.2: Update order status to 'packed' as admin
                if order_id:
                    print("\nUpdating order status to 'packed'...")
                    update_data = {"status": "packed"}
                    result = test.test_endpoint("PUT", f"/admin/orders/{order_id}", 200, 
                                               data=update_data,
                                               description="PUT /admin/orders/:id with status='packed'",
                                               check_fields=['order'],
                                               session=test.admin_session)
                    
                    if result and 'order' in result:
                        order = result['order']
                        status_history = order.get('statusHistory', [])
                        
                        if len(status_history) == 2:
                            test.log(f"Status history now has 2 entries (confirmed + packed)", True)
                            
                            # Verify both entries
                            confirmed_entry = status_history[0]
                            packed_entry = status_history[1]
                            
                            if confirmed_entry.get('status') == 'confirmed' and packed_entry.get('status') == 'packed':
                                test.log("Both status entries present: confirmed and packed", True)
                            else:
                                test.log(f"Status entries mismatch: {[e.get('status') for e in status_history]}", False)
                            
                            # Verify different timestamps
                            if 'at' in confirmed_entry and 'at' in packed_entry:
                                if confirmed_entry['at'] != packed_entry['at']:
                                    test.log("Status entries have different timestamps", True)
                                else:
                                    test.log("Status entries have same timestamp (should be different)", False)
                        else:
                            test.log(f"Status history length mismatch: expected 2, got {len(status_history)}", False)
                    
                    # Test 2.3: Update to 'shipped' - history should have 3 entries
                    print("\nUpdating order status to 'shipped'...")
                    update_data = {"status": "shipped"}
                    result = test.test_endpoint("PUT", f"/admin/orders/{order_id}", 200, 
                                               data=update_data,
                                               description="PUT /admin/orders/:id with status='shipped'",
                                               check_fields=['order'],
                                               session=test.admin_session)
                    
                    if result and 'order' in result:
                        order = result['order']
                        status_history = order.get('statusHistory', [])
                        
                        if len(status_history) == 3:
                            test.log(f"Status history now has 3 entries (confirmed + packed + shipped)", True)
                            statuses = [e.get('status') for e in status_history]
                            if statuses == ['confirmed', 'packed', 'shipped']:
                                test.log(f"Status history in correct order: {statuses}", True)
                            else:
                                test.log(f"Status history order incorrect: {statuses}", False)
                        else:
                            test.log(f"Status history length mismatch: expected 3, got {len(status_history)}", False)
                    
                    # Test 2.4: Update to 'delivered' - history should have 4 entries
                    print("\nUpdating order status to 'delivered'...")
                    update_data = {"status": "delivered"}
                    result = test.test_endpoint("PUT", f"/admin/orders/{order_id}", 200, 
                                               data=update_data,
                                               description="PUT /admin/orders/:id with status='delivered'",
                                               check_fields=['order'],
                                               session=test.admin_session)
                    
                    if result and 'order' in result:
                        order = result['order']
                        status_history = order.get('statusHistory', [])
                        
                        if len(status_history) == 4:
                            test.log(f"Status history now has 4 entries (confirmed + packed + shipped + delivered)", True)
                            statuses = [e.get('status') for e in status_history]
                            if statuses == ['confirmed', 'packed', 'shipped', 'delivered']:
                                test.log(f"Status history in chronological order: {statuses}", True)
                            else:
                                test.log(f"Status history order incorrect: {statuses}", False)
                        else:
                            test.log(f"Status history length mismatch: expected 4, got {len(status_history)}", False)
                    
                    # Test 2.5: GET /api/orders/:id - full statusHistory should be visible
                    print("\nVerifying statusHistory is visible in GET /orders/:id...")
                    result = test.test_endpoint("GET", f"/orders/{order_id}", 200,
                                               description="GET /orders/:id - should return full statusHistory",
                                               check_fields=['order'])
                    
                    if result and 'order' in result:
                        order = result['order']
                        status_history = order.get('statusHistory', [])
                        
                        if len(status_history) == 4:
                            test.log(f"GET /orders/:id returns full statusHistory with 4 entries", True)
                        else:
                            test.log(f"GET /orders/:id statusHistory incomplete: {len(status_history)} entries", False)
        else:
            test.log("No products found to create order", False)
    except Exception as e:
        test.log(f"Order status history testing failed: {str(e)}", False)
    
    # ============================================================================
    # 3. PDF INVOICE GENERATION
    # ============================================================================
    print("\n[3] Testing PDF Invoice Generation")
    print("-" * 80)
    
    # Test 3.1: GET /api/orders/:id/invoice - should return PDF
    if order_id:
        try:
            url = f"{BASE_URL}/orders/{order_id}/invoice"
            response = test.session.get(url, timeout=15)
            
            # Check HTTP 200
            if response.status_code == 200:
                test.log(f"GET /orders/{order_id}/invoice - HTTP 200", True)
            else:
                test.log(f"GET /orders/{order_id}/invoice - Expected 200, got {response.status_code}", False)
            
            # Check Content-Type: application/pdf
            content_type = response.headers.get('Content-Type', '')
            if 'application/pdf' in content_type:
                test.log(f"Content-Type is application/pdf", True)
            else:
                test.log(f"Content-Type mismatch: expected application/pdf, got {content_type}", False)
            
            # Check response body starts with %PDF magic bytes
            if response.content[:4] == b'%PDF':
                test.log(f"Response body starts with %PDF magic bytes", True)
            else:
                test.log(f"Response body does not start with %PDF (got {response.content[:10]})", False)
            
            # Check Content-Disposition header with filename containing order number
            content_disposition = response.headers.get('Content-Disposition', '')
            if 'MikuMantra-Invoice-' in content_disposition:
                test.log(f"Content-Disposition header contains order number: {content_disposition}", True)
            else:
                test.log(f"Content-Disposition header missing or incorrect: {content_disposition}", False)
            
            # Verify PDF is not empty (size > 1KB)
            pdf_size = len(response.content)
            if pdf_size > 1024:
                test.log(f"PDF size is {pdf_size} bytes (> 1KB)", True)
            else:
                test.log(f"PDF size too small: {pdf_size} bytes", False)
        except Exception as e:
            test.log(f"PDF invoice generation test failed: {str(e)}", False)
    else:
        test.log("No order_id available for PDF invoice test", False)
    
    # Test 3.2: Test with non-existent order ID - should return 404
    try:
        url = f"{BASE_URL}/orders/non-existent-order-id/invoice"
        response = test.session.get(url, timeout=10)
        
        if response.status_code == 404:
            test.log(f"GET /orders/non-existent-id/invoice - correctly returns 404", True)
        else:
            test.log(f"GET /orders/non-existent-id/invoice - expected 404, got {response.status_code}", False)
    except Exception as e:
        test.log(f"PDF 404 test failed: {str(e)}", False)
    
    # ============================================================================
    # 4. CACHE INVALIDATION
    # ============================================================================
    print("\n[4] Testing Cache Invalidation")
    print("-" * 80)
    
    # Test 4.1: GET /api/products - note first product name
    try:
        response = test.session.get(f"{BASE_URL}/products", timeout=10)
        if response.status_code == 200:
            products_before = response.json().get('products', [])
            products_count_before = len(products_before)
            test.log(f"GET /products - {products_count_before} products before admin write", True)
            
            # Test 4.2: Login as admin, POST /api/admin/products (create new)
            new_product_data = {
                "name": f"Cache Test Product {int(time.time())}",
                "slug": f"cache-test-product-{int(time.time())}",
                "sku": f"CACHE-TEST-{int(time.time())}",
                "price": 99999,
                "category": "diamond",
                "collection": "engagement",
                "gender": "unisex",
                "description": "A test product for cache invalidation",
                "images": ["https://images.unsplash.com/photo-1605100804763-247f67b3557e"],
                "stock": 5,
                "featured": False
            }
            
            response = test.admin_session.post(f"{BASE_URL}/admin/products", json=new_product_data, timeout=10)
            if response.status_code == 200:
                result = response.json()
                new_product_id = result.get('product', {}).get('id')
                test.log(f"POST /admin/products - created product with ID: {new_product_id}", True)
                
                # Test 4.3: GET /api/products - should show new product (cache busted)
                time.sleep(0.5)  # Small delay to ensure cache is updated
                response = test.session.get(f"{BASE_URL}/products", timeout=10)
                if response.status_code == 200:
                    products_after = response.json().get('products', [])
                    products_count_after = len(products_after)
                    
                    if products_count_after > products_count_before:
                        test.log(f"GET /products - {products_count_after} products after admin write (cache busted)", True)
                        
                        # Verify new product is in the list
                        new_product_found = any(p.get('id') == new_product_id for p in products_after)
                        if new_product_found:
                            test.log(f"New product found in products list (cache invalidation working)", True)
                        else:
                            test.log(f"New product NOT found in products list (cache may not be busted)", False)
                    else:
                        test.log(f"Product count did not increase after admin write (cache may not be busted)", False)
                
                # Clean up: delete the test product
                response = test.admin_session.delete(f"{BASE_URL}/admin/products/{new_product_id}", timeout=10)
                if response.status_code == 200:
                    test.log(f"Cleanup: deleted test product {new_product_id}", True)
            else:
                test.log(f"POST /admin/products failed with status {response.status_code}", False)
        else:
            test.log(f"GET /products failed with status {response.status_code}", False)
    except Exception as e:
        test.log(f"Cache invalidation test failed: {str(e)}", False)
    
    # Test 4.4: Test categories/collections/banners cache invalidation
    print("\nTesting cache invalidation for categories/collections/banners...")
    for collection_name in ['categories', 'collections', 'banners']:
        try:
            # Get initial count
            response = test.session.get(f"{BASE_URL}/{collection_name}", timeout=10)
            if response.status_code == 200:
                items_before = response.json().get(collection_name, [])
                count_before = len(items_before)
                test.log(f"GET /{collection_name} - {count_before} items before admin write", True)
                
                # Create new item as admin
                if collection_name == 'categories':
                    new_item = {
                        "name": f"Cache Test Category {int(time.time())}",
                        "slug": f"cache-test-cat-{int(time.time())}",
                        "description": "Test category"
                    }
                elif collection_name == 'collections':
                    new_item = {
                        "name": f"Cache Test Collection {int(time.time())}",
                        "slug": f"cache-test-col-{int(time.time())}",
                        "description": "Test collection"
                    }
                else:  # banners
                    new_item = {
                        "title": f"Cache Test Banner {int(time.time())}",
                        "kicker": "Test",
                        "copy": "Test banner",
                        "cta": "Test",
                        "href": "/test",
                        "img": "https://images.unsplash.com/photo-1601121141461-9d6647bca1ed",
                        "order": 99,
                        "active": True
                    }
                
                response = test.admin_session.post(f"{BASE_URL}/admin/{collection_name}", json=new_item, timeout=10)
                if response.status_code == 200:
                    result = response.json()
                    new_item_id = result.get('item', {}).get('id')
                    test.log(f"POST /admin/{collection_name} - created item with ID: {new_item_id}", True)
                    
                    # Check if cache is busted
                    time.sleep(0.5)
                    response = test.session.get(f"{BASE_URL}/{collection_name}", timeout=10)
                    if response.status_code == 200:
                        items_after = response.json().get(collection_name, [])
                        count_after = len(items_after)
                        
                        if count_after > count_before:
                            test.log(f"GET /{collection_name} - {count_after} items after admin write (cache busted)", True)
                        else:
                            test.log(f"GET /{collection_name} - count did not increase (cache may not be busted)", False)
                    
                    # Clean up
                    response = test.admin_session.delete(f"{BASE_URL}/admin/{collection_name}/{new_item_id}", timeout=10)
                    if response.status_code == 200:
                        test.log(f"Cleanup: deleted test {collection_name} item {new_item_id}", True)
        except Exception as e:
            test.log(f"Cache invalidation test for {collection_name} failed: {str(e)}", False)
    
    # ============================================================================
    # 5. SITEMAP & ROBOTS (FRONTEND ROUTES)
    # ============================================================================
    print("\n[5] Testing Sitemap & Robots (Frontend Routes)")
    print("-" * 80)
    
    # Test 5.1: GET /sitemap.xml
    try:
        url = f"{FRONTEND_URL}/sitemap.xml"
        response = requests.get(url, timeout=15)
        
        if response.status_code == 200:
            test.log(f"GET /sitemap.xml - HTTP 200", True)
        else:
            test.log(f"GET /sitemap.xml - Expected 200, got {response.status_code}", False)
        
        # Check Content-Type
        content_type = response.headers.get('Content-Type', '')
        if 'application/xml' in content_type or 'text/xml' in content_type:
            test.log(f"GET /sitemap.xml - Content-Type is XML: {content_type}", True)
        else:
            test.log(f"GET /sitemap.xml - Content-Type not XML: {content_type}", False)
        
        # Check if response contains product URLs
        content = response.text
        if '/product/' in content:
            test.log(f"GET /sitemap.xml - contains product URLs", True)
        else:
            test.log(f"GET /sitemap.xml - missing product URLs", False)
        
        # Check if response contains category URLs
        if 'category=' in content:
            test.log(f"GET /sitemap.xml - contains category URLs", True)
        else:
            test.log(f"GET /sitemap.xml - missing category URLs", False)
        
        # Check if response contains collection URLs
        if 'collection=' in content:
            test.log(f"GET /sitemap.xml - contains collection URLs", True)
        else:
            test.log(f"GET /sitemap.xml - missing collection URLs", False)
    except Exception as e:
        test.log(f"GET /sitemap.xml failed: {str(e)}", False)
    
    # Test 5.2: GET /robots.txt
    try:
        url = f"{FRONTEND_URL}/robots.txt"
        response = requests.get(url, timeout=10)
        
        if response.status_code == 200:
            test.log(f"GET /robots.txt - HTTP 200", True)
        else:
            test.log(f"GET /robots.txt - Expected 200, got {response.status_code}", False)
        
        # Check if response contains "Sitemap:" line
        content = response.text
        if 'Sitemap:' in content or 'sitemap:' in content.lower():
            test.log(f"GET /robots.txt - contains 'Sitemap:' line", True)
        else:
            test.log(f"GET /robots.txt - missing 'Sitemap:' line", False)
        
        # Check if response contains "/admin" disallow
        if '/admin' in content:
            test.log(f"GET /robots.txt - contains '/admin' disallow", True)
        else:
            test.log(f"GET /robots.txt - missing '/admin' disallow", False)
    except Exception as e:
        test.log(f"GET /robots.txt failed: {str(e)}", False)
    
    # ============================================================================
    # 6. REGRESSION TESTS - VERIFY EXISTING FEATURES STILL WORK
    # ============================================================================
    print("\n[6] Regression Tests - Verify Existing Features Still Work")
    print("-" * 80)
    
    # Test 6.1: GET /api/products/celestine-diamond-pendant returns product + related
    result = test.test_endpoint("GET", "/products/celestine-diamond-pendant", 200,
                                description="REGRESSION: GET /products/celestine-diamond-pendant - should return product + related",
                                check_fields=['product', 'related'])
    if result:
        if result.get('product', {}).get('slug') == 'celestine-diamond-pendant':
            test.log("REGRESSION: Product slug matches", True)
        if isinstance(result.get('related'), list):
            test.log(f"REGRESSION: Related products returned: {len(result['related'])} items", True)
    
    # Test 6.2: GET /api/categories, /api/collections, /api/banners all return
    for endpoint in ['categories', 'collections', 'banners']:
        result = test.test_endpoint("GET", f"/{endpoint}", 200,
                                   description=f"REGRESSION: GET /{endpoint} - should return data",
                                   check_fields=[endpoint])
        if result and endpoint in result:
            test.log(f"REGRESSION: GET /{endpoint} returned {len(result[endpoint])} items", True)
    
    # Test 6.3: POST /api/coupons/validate with MIKUMANTRA10 works
    coupon_data = {
        "code": "MIKUMANTRA10",
        "subtotal": 50000
    }
    result = test.test_endpoint("POST", "/coupons/validate", 200, data=coupon_data,
                                description="REGRESSION: POST /coupons/validate with MIKUMANTRA10 - should work",
                                check_fields=['code', 'discount'])
    if result:
        if result.get('discount') == 5000:
            test.log(f"REGRESSION: MIKUMANTRA10 coupon discount correct: {result.get('discount')}", True)
    
    # Test 6.4: POST /api/orders with COD placement works and decrements stock
    try:
        response = test.session.get(f"{BASE_URL}/products", timeout=10)
        products = response.json().get('products', [])
        if products:
            test_product = products[2] if len(products) > 2 else products[0]
            initial_stock = test_product.get('stock', 0)
            
            order_data = {
                "items": [
                    {
                        "id": test_product.get('id'),
                        "name": test_product.get('name'),
                        "price": test_product.get('price'),
                        "qty": 1,
                        "image": test_product.get('images')[0] if test_product.get('images') else ""
                    }
                ],
                "address": {
                    "fullName": "Regression Test User",
                    "phone": "9876543210",
                    "line1": "123 Test Street",
                    "city": "Mumbai",
                    "state": "Maharashtra",
                    "pincode": "400001"
                },
                "payment": "cod",
                "giftWrap": False
            }
            
            result = test.test_endpoint("POST", "/orders", 200, data=order_data,
                                       description="REGRESSION: POST /orders with COD - should create order",
                                       check_fields=['order'])
            
            if result:
                # Verify stock decrement
                response = test.session.get(f"{BASE_URL}/products/{test_product.get('slug')}", timeout=10)
                if response.status_code == 200:
                    updated_product = response.json().get('product', {})
                    new_stock = updated_product.get('stock', 0)
                    if new_stock == initial_stock - 1:
                        test.log(f"REGRESSION: Stock decremented correctly: {initial_stock} -> {new_stock}", True)
                    else:
                        test.log(f"REGRESSION: Stock not decremented correctly: {initial_stock} -> {new_stock}", False)
    except Exception as e:
        test.log(f"REGRESSION: Order placement test failed: {str(e)}", False)
    
    # ============================================================================
    # SUMMARY
    # ============================================================================
    print("\n" + "="*80)
    print("PHASE 3 TEST SUMMARY")
    print("="*80)
    
    total_tests = len(test.test_results)
    passed_tests = sum(1 for t in test.test_results if t['success'])
    failed_tests = total_tests - passed_tests
    
    print(f"\nTotal Tests: {total_tests}")
    print(f"Passed: {passed_tests}")
    print(f"Failed: {failed_tests}")
    print(f"Success Rate: {(passed_tests/total_tests*100):.1f}%")
    
    if test.failed_tests:
        print("\n" + "="*80)
        print("FAILED TESTS:")
        print("="*80)
        for i, failed in enumerate(test.failed_tests, 1):
            print(f"{i}. {failed}")
    
    print("\n" + "="*80)
    
    return 0 if failed_tests == 0 else 1

if __name__ == "__main__":
    sys.exit(main())
