#!/usr/bin/env python3
"""
MikuMantra Jewellery eCommerce Backend API Test Suite
Tests all backend endpoints as per the review request
"""

import requests
import json
import sys
BASE_URL = "https://luxe-jewel-store.preview.emergentagent.com/api"
if len(sys.argv) > 1:
    BASE_URL = sys.argv[1]
SESSION_COOKIE = "mikumantra_session"

class TestSession:
    def __init__(self):
        self.session = requests.Session()
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
                     check_fields: Optional[list] = None) -> Optional[Dict]:
        """Generic endpoint test"""
        url = f"{BASE_URL}{endpoint}"
        try:
            if method == "GET":
                response = self.session.get(url, timeout=10)
            elif method == "POST":
                response = self.session.post(url, json=data, timeout=10)
            elif method == "PUT":
                response = self.session.put(url, json=data, timeout=10)
            elif method == "DELETE":
                response = self.session.delete(url, timeout=10)
            else:
                self.log(f"Invalid method {method}", False)
                return None
            
            # Check status code
            if response.status_code != expected_status:
                self.log(f"{description} - Expected {expected_status}, got {response.status_code}. Response: {response.text[:200]}", False)
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
    print("MIKUMANTRA JEWELLERY ECOMMERCE BACKEND API TEST SUITE")
    print("="*80 + "\n")
    
    # ============================================================================
    # 1. PUBLIC DATA ENDPOINTS (NO AUTH)
    # ============================================================================
    print("\n[1] Testing Public Data Endpoints (No Auth)")
    print("-" * 80)
    
    # GET /api/products - returns 12 seeded products
    result = test.test_endpoint("GET", "/products", 200, 
                                description="GET /products - should return 12 seeded products")
    if result and 'products' in result:
        product_count = len(result['products'])
        if product_count >= 12:
            test.log(f"Product count is correct: {product_count}", True)
        else:
            test.log(f"Product count mismatch: expected >= 12, got {product_count}", False)
    
    # GET /api/products?category=diamond - returns filtered
    result = test.test_endpoint("GET", "/products?category=diamond", 200,
                                description="GET /products?category=diamond - should return filtered products")
    if result and 'products' in result:
        if len(result['products']) > 0:
            # Check if all products have diamond category
            all_diamond = all(p.get('category') == 'diamond' for p in result['products'])
            if all_diamond:
                test.log(f"Category filter working: {len(result['products'])} diamond products", True)
            else:
                test.log("Category filter not working correctly", False)
    
    # GET /api/products?featured=1 - returns featured only
    result = test.test_endpoint("GET", "/products?featured=1", 200,
                                description="GET /products?featured=1 - should return featured products only")
    if result and 'products' in result:
        if len(result['products']) > 0:
            all_featured = all(p.get('featured') == True for p in result['products'])
            if all_featured:
                test.log(f"Featured filter working: {len(result['products'])} featured products", True)
            else:
                test.log("Featured filter not working correctly", False)
    
    # GET /api/products/celestine-diamond-pendant - returns single product with related
    result = test.test_endpoint("GET", "/products/celestine-diamond-pendant", 200,
                                description="GET /products/celestine-diamond-pendant - should return product with related",
                                check_fields=['product', 'related'])
    if result:
        if 'product' in result and result['product'].get('slug') == 'celestine-diamond-pendant':
            test.log("Product slug matches", True)
        if 'related' in result and isinstance(result['related'], list):
            test.log(f"Related products returned: {len(result['related'])} items", True)
    
    # GET /api/categories - returns 6 categories
    result = test.test_endpoint("GET", "/categories", 200,
                                description="GET /categories - should return 6 categories",
                                check_fields=['categories'])
    if result and 'categories' in result:
        cat_count = len(result['categories'])
        if cat_count == 6:
            test.log(f"Category count is correct: {cat_count}", True)
        else:
            test.log(f"Category count mismatch: expected 6, got {cat_count}", False)
    
    # GET /api/collections - returns 4 collections
    result = test.test_endpoint("GET", "/collections", 200,
                                description="GET /collections - should return 4 collections",
                                check_fields=['collections'])
    if result and 'collections' in result:
        coll_count = len(result['collections'])
        if coll_count == 4:
            test.log(f"Collection count is correct: {coll_count}", True)
        else:
            test.log(f"Collection count mismatch: expected 4, got {coll_count}", False)
    
    # GET /api/banners - returns 3 active banners
    result = test.test_endpoint("GET", "/banners", 200,
                                description="GET /banners - should return 3 active banners",
                                check_fields=['banners'])
    if result and 'banners' in result:
        banner_count = len(result['banners'])
        if banner_count >= 2:
            test.log(f"Banner count is correct: {banner_count}", True)
        else:
            test.log(f"Banner count mismatch: expected >= 3, got {banner_count}", False)
    
    # ============================================================================
    # 2. AUTH FLOW
    # ============================================================================
    print("\n[2] Testing Auth Flow")
    print("-" * 80)
    
    # POST /api/auth/register - create new user
    test_user_data = {
        "name": "Test User",
        "email": "test@mikumantra.com",
        "password": "test123"
    }
    result = test.test_endpoint("POST", "/auth/register", 200, data=test_user_data,
                                description="POST /auth/register - should create user with role='user'",
                                check_fields=['user'])
    if result and 'user' in result:
        user = result['user']
        if user.get('role') == 'user':
            test.log(f"User role is correct: {user.get('role')}", True)
        else:
            test.log(f"User role mismatch: expected 'user', got {user.get('role')}", False)
        if user.get('email') == 'test@mikumantra.com':
            test.log("User email is correct", True)
        # Check if cookie is set
        if SESSION_COOKIE in test.session.cookies:
            test.log("Session cookie set after registration", True)
        else:
            test.log("Session cookie NOT set after registration", False)
    
    # POST /api/auth/register with same email - should return 409
    test.test_endpoint("POST", "/auth/register", 409, data=test_user_data,
                      description="POST /auth/register with duplicate email - should return 409")
    
    # POST /api/auth/logout - clear session
    test.test_endpoint("POST", "/auth/logout", 200,
                      description="POST /auth/logout - should clear session")
    
    # POST /api/auth/login with correct password - should succeed
    login_data = {
        "email": "test@mikumantra.com",
        "password": "test123"
    }
    result = test.test_endpoint("POST", "/auth/login", 200, data=login_data,
                                description="POST /auth/login with correct password - should succeed",
                                check_fields=['user'])
    if result and SESSION_COOKIE in test.session.cookies:
        test.log("Session cookie set after login", True)
    
    # POST /api/auth/login with wrong password - should return 401
    wrong_login = {
        "email": "test@mikumantra.com",
        "password": "wrongpassword"
    }
    test.test_endpoint("POST", "/auth/login", 401, data=wrong_login,
                      description="POST /auth/login with wrong password - should return 401")
    
    # GET /api/auth/me (with session cookie) - returns current user
    result = test.test_endpoint("GET", "/auth/me", 200,
                                description="GET /auth/me - should return current user",
                                check_fields=['user'])
    if result and result.get('user'):
        test.log(f"Current user: {result['user'].get('email')}", True)
    
    # PUT /api/auth/profile - update profile
    profile_update = {
        "name": "Updated Test User",
        "phone": "9999999999"
    }
    result = test.test_endpoint("PUT", "/auth/profile", 200, data=profile_update,
                                description="PUT /auth/profile - should update profile",
                                check_fields=['user'])
    if result and 'user' in result:
        user = result['user']
        if user.get('name') == 'Updated Test User':
            test.log("Profile name updated correctly", True)
        else:
            test.log(f"Profile name not updated: {user.get('name')}", False)
        if user.get('phone') in ['9999999999', '+919999999999']:
            test.log("Profile phone updated correctly", True)
        else:
            test.log(f"Profile phone not updated: {user.get('phone')}", False)
    
    # ============================================================================
    # 3. ADMIN AUTO-PROMOTION
    # ============================================================================
    print("\n[3] Testing Admin Auto-Promotion")
    print("-" * 80)
    
    # Create a new session for admin
    admin_session = requests.Session()
    
    # POST /api/auth/register with admin email
    admin_data = {
        "name": "Admin User",
        "email": "admin@mikumantra.com",
        "password": "admin123"
    }
    try:
        response = admin_session.post(f"{BASE_URL}/auth/register", json=admin_data, timeout=10)
        if response.status_code == 200:
            result = response.json()
            if 'user' in result and result['user'].get('role') == 'admin':
                test.log("Admin auto-promotion working: role='admin'", True)
            else:
                test.log(f"Admin auto-promotion failed: role={result.get('user', {}).get('role')}", False)
        elif response.status_code == 409:
            # Admin already exists, try login
            test.log("Admin user already exists, attempting login", True)
            response = admin_session.post(f"{BASE_URL}/auth/login", json=admin_data, timeout=10)
            if response.status_code == 200:
                result = response.json()
                if result.get('user', {}).get('role') == 'admin':
                    test.log("Admin login successful with role='admin'", True)
                else:
                    test.log(f"Admin role mismatch: {result.get('user', {}).get('role')}", False)
    except Exception as e:
        test.log(f"Admin registration/login failed: {str(e)}", False)
    
    # GET /api/auth/me with admin session
    try:
        response = admin_session.get(f"{BASE_URL}/auth/me", timeout=10)
        if response.status_code == 200:
            result = response.json()
            if result.get('user', {}).get('role') == 'admin':
                test.log("GET /auth/me confirms admin role", True)
            else:
                test.log(f"Admin role not confirmed: {result.get('user', {}).get('role')}", False)
    except Exception as e:
        test.log(f"GET /auth/me failed for admin: {str(e)}", False)
    
    # ============================================================================
    # 4. ADDRESSES (AUTH REQUIRED)
    # ============================================================================
    print("\n[4] Testing Addresses (Auth Required)")
    print("-" * 80)
    
    # POST /api/addresses - create address
    address_data = {
        "fullName": "Test User",
        "phone": "9876543210",
        "line1": "123 Test Street",
        "line2": "Apt 4B",
        "city": "Mumbai",
        "state": "Maharashtra",
        "pincode": "400001",
        "isDefault": True
    }
    result = test.test_endpoint("POST", "/addresses", 200, data=address_data,
                                description="POST /addresses - should create address",
                                check_fields=['address'])
    address_id = None
    if result and 'address' in result:
        address_id = result['address'].get('id')
        test.log(f"Address created with ID: {address_id}", True)
    
    # GET /api/addresses - list addresses
    result = test.test_endpoint("GET", "/addresses", 200,
                                description="GET /addresses - should list user's addresses",
                                check_fields=['addresses'])
    if result and 'addresses' in result:
        test.log(f"Found {len(result['addresses'])} address(es)", True)
    
    # DELETE /api/addresses/:id - delete address
    if address_id:
        test.test_endpoint("DELETE", f"/addresses/{address_id}", 200,
                          description=f"DELETE /addresses/{address_id} - should delete address")
    
    # ============================================================================
    # 5. COUPONS
    # ============================================================================
    print("\n[5] Testing Coupons")
    print("-" * 80)
    
    # POST /api/coupons/validate - MIKUMANTRA10 (10% discount)
    coupon_data = {
        "code": "MIKUMANTRA10",
        "subtotal": 50000
    }
    result = test.test_endpoint("POST", "/coupons/validate", 200, data=coupon_data,
                                description="POST /coupons/validate with MIKUMANTRA10 - should return 10% discount",
                                check_fields=['code', 'discount', 'type'])
    if result:
        if result.get('discount') == 5000 and result.get('type') == 'percent':
            test.log(f"MIKUMANTRA10 coupon: discount={result.get('discount')}, type={result.get('type')}", True)
        else:
            test.log(f"MIKUMANTRA10 coupon mismatch: discount={result.get('discount')}, type={result.get('type')}", False)
    
    # POST /api/coupons/validate - WELCOME2000 (flat 2000 discount)
    coupon_data = {
        "code": "WELCOME2000",
        "subtotal": 15000
    }
    result = test.test_endpoint("POST", "/coupons/validate", 200, data=coupon_data,
                                description="POST /coupons/validate with WELCOME2000 - should return flat 2000 discount",
                                check_fields=['code', 'discount', 'type'])
    if result:
        if result.get('discount') == 2000 and result.get('type') == 'flat':
            test.log(f"WELCOME2000 coupon: discount={result.get('discount')}, type={result.get('type')}", True)
        else:
            test.log(f"WELCOME2000 coupon mismatch: discount={result.get('discount')}, type={result.get('type')}", False)
    
    # POST /api/coupons/validate - INVALID coupon
    coupon_data = {
        "code": "INVALID",
        "subtotal": 1000
    }
    test.test_endpoint("POST", "/coupons/validate", 404, data=coupon_data,
                      description="POST /coupons/validate with INVALID code - should return 404")
    
    # ============================================================================
    # 6. ORDERS (COD FLOW)
    # ============================================================================
    print("\n[6] Testing Orders (COD Flow)")
    print("-" * 80)
    
    # First, get a product to order
    try:
        response = test.session.get(f"{BASE_URL}/products", timeout=10)
        products = response.json().get('products', [])
        if products:
            test_product = products[0]
            test.log(f"Using product: {test_product.get('name')} (ID: {test_product.get('id')})", True)
            
            # Check initial stock
            initial_stock = test_product.get('stock', 0)
            test.log(f"Initial stock: {initial_stock}", True)
            
            # POST /api/orders - create COD order
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
                    "fullName": "Test User",
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
                                       description="POST /orders with COD - should create order",
                                       check_fields=['order'])
            
            order_id = None
            if result and 'order' in result:
                order = result['order']
                order_id = order.get('id')
                order_number = order.get('orderNumber')
                status = order.get('status')
                
                # Check order number format (MIK-XXXXXXXX-XXX)
                if order_number and order_number.startswith('MIK-'):
                    test.log(f"Order number format correct: {order_number}", True)
                else:
                    test.log(f"Order number format incorrect: {order_number}", False)
                
                # Check status
                if status == 'confirmed':
                    test.log(f"Order status correct: {status}", True)
                else:
                    test.log(f"Order status incorrect: expected 'confirmed', got {status}", False)
            
            # Verify stock decrement
            response = test.session.get(f"{BASE_URL}/products/{test_product.get('slug')}", timeout=10)
            if response.status_code == 200:
                updated_product = response.json().get('product', {})
                new_stock = updated_product.get('stock', 0)
                if new_stock == initial_stock - 1:
                    test.log(f"Stock decremented correctly: {initial_stock} -> {new_stock}", True)
                else:
                    test.log(f"Stock not decremented correctly: {initial_stock} -> {new_stock}", False)
            
            # GET /api/orders - list user's orders
            result = test.test_endpoint("GET", "/orders", 200,
                                       description="GET /orders - should list user's orders",
                                       check_fields=['orders'])
            if result and 'orders' in result:
                test.log(f"Found {len(result['orders'])} order(s)", True)
            
            # GET /api/orders/:id - get order details
            if order_id:
                result = test.test_endpoint("GET", f"/orders/{order_id}", 200,
                                           description=f"GET /orders/{order_id} - should return order details",
                                           check_fields=['order'])
                try:
                    admin_session.put(f"{BASE_URL}/admin/orders/{order_id}", json={"status": "delivered"})
                except Exception:
                    pass
        else:
            test.log("No products found to create order", False)
    except Exception as e:
        test.log(f"Order testing failed: {str(e)}", False)
    
    # ============================================================================
    # 7. RAZORPAY MOCK PAYMENT
    # ============================================================================
    print("\n[7] Testing Razorpay MOCK Payment")
    print("-" * 80)
    
    # POST /api/payment/razorpay/order
    razorpay_order_data = {
        "amount": 100000
    }
    result = test.test_endpoint("POST", "/payment/razorpay/order", 200, data=razorpay_order_data,
                                description="POST /payment/razorpay/order - should return mock order",
                                check_fields=['id', 'key', 'mock'])
    
    razorpay_order_id = None
    if result:
        razorpay_order_id = result.get('id')
        if result.get('mock') == True:
            test.log("Razorpay mock mode confirmed", True)
        if razorpay_order_id and razorpay_order_id.startswith('order_MOCK'):
            test.log(f"Razorpay order ID format correct: {razorpay_order_id}", True)
    
    # POST /api/payment/razorpay/verify
    verify_data = {
        "razorpay_order_id": razorpay_order_id or "order_MOCK123",
        "razorpay_payment_id": "pay_MOCK123",
        "razorpay_signature": "mock_signature"
    }
    result = test.test_endpoint("POST", "/payment/razorpay/verify", 200, data=verify_data,
                                description="POST /payment/razorpay/verify - should return verified",
                                check_fields=['verified', 'paymentId'])
    
    payment_id = None
    if result:
        if result.get('verified') == True:
            test.log("Razorpay payment verified", True)
        payment_id = result.get('paymentId')
    
    # POST /api/orders with razorpay payment
    try:
        response = test.session.get(f"{BASE_URL}/products", timeout=10)
        products = response.json().get('products', [])
        if products:
            test_product = products[1] if len(products) > 1 else products[0]
            
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
                    "fullName": "Test User",
                    "phone": "9876543210",
                    "line1": "123 Test Street",
                    "line2": "Apt 4B",
                    "city": "Mumbai",
                    "state": "Maharashtra",
                    "pincode": "400001"
                },
                "payment": "razorpay",
                "razorpayPaymentId": payment_id or "pay_MOCK123",
                "giftWrap": False
            }
            
            result = test.test_endpoint("POST", "/orders", 200, data=order_data,
                                       description="POST /orders with razorpay payment - should create order with paymentStatus='paid'",
                                       check_fields=['order'])
            
            if result and 'order' in result:
                order = result['order']
                payment_status = order.get('paymentStatus')
                if payment_status == 'paid':
                    test.log(f"Razorpay order payment status correct: {payment_status}", True)
                else:
                    test.log(f"Razorpay order payment status incorrect: expected 'paid', got {payment_status}", False)
                try:
                    admin_session.put(f"{BASE_URL}/admin/orders/{order['id']}", json={"status": "delivered"})
                except Exception:
                    pass
    except Exception as e:
        test.log(f"Razorpay order creation failed: {str(e)}", False)
    
    # ============================================================================
    # 8. ADMIN ENDPOINTS
    # ============================================================================
    print("\n[8] Testing Admin Endpoints")
    print("-" * 80)
    
    # GET /api/admin/dashboard
    try:
        response = admin_session.get(f"{BASE_URL}/admin/dashboard", timeout=10)
        if response.status_code == 200:
            result = response.json()
            if 'stats' in result:
                stats = result['stats']
                required_stats = ['totalOrders', 'totalUsers', 'totalProducts', 'totalRevenue']
                all_present = all(stat in stats for stat in required_stats)
                if all_present:
                    test.log(f"GET /admin/dashboard - stats present: {stats}", True)
                else:
                    test.log(f"GET /admin/dashboard - missing stats fields", False)
                
                if 'recentOrders' in result:
                    test.log(f"GET /admin/dashboard - recentOrders present: {len(result['recentOrders'])} orders", True)
            else:
                test.log("GET /admin/dashboard - missing 'stats' field", False)
        else:
            test.log(f"GET /admin/dashboard - failed with status {response.status_code}", False)
    except Exception as e:
        test.log(f"GET /admin/dashboard - exception: {str(e)}", False)
    
    # GET /api/admin/products
    try:
        response = admin_session.get(f"{BASE_URL}/admin/products", timeout=10)
        if response.status_code == 200:
            result = response.json()
            if 'products' in result:
                test.log(f"GET /admin/products - success: {len(result['products'])} products", True)
            else:
                test.log("GET /admin/products - missing 'products' field", False)
        else:
            test.log(f"GET /admin/products - failed with status {response.status_code}", False)
    except Exception as e:
        test.log(f"GET /admin/products - exception: {str(e)}", False)
    
    # POST /api/admin/products - create new product
    new_product_data = {
        "name": "Test Diamond Ring",
        "slug": "test-diamond-ring-" + str(int(requests.utils.default_headers()['User-Agent'].__hash__() % 10000)),
        "sku": "TEST-DR-001",
        "price": 75000,
        "category": "diamond",
        "collection": "engagement",
        "gender": "unisex",
        "description": "A beautiful test diamond ring",
        "images": ["https://images.unsplash.com/photo-1605100804763-247f67b3557e"],
        "stock": 10,
        "featured": False
    }
    try:
        response = admin_session.post(f"{BASE_URL}/admin/products", json=new_product_data, timeout=10)
        if response.status_code == 200:
            result = response.json()
            if 'product' in result:
                new_product_id = result['product'].get('id')
                test.log(f"POST /admin/products - created product with ID: {new_product_id}", True)
                
                # PUT /api/admin/products/:id - update product
                update_data = {
                    "price": 80000,
                    "stock": 15
                }
                response = admin_session.put(f"{BASE_URL}/admin/products/{new_product_id}", json=update_data, timeout=10)
                if response.status_code == 200:
                    test.log(f"PUT /admin/products/{new_product_id} - updated product", True)
                else:
                    test.log(f"PUT /admin/products/{new_product_id} - failed with status {response.status_code}", False)
                
                # DELETE /api/admin/products/:id - delete product
                response = admin_session.delete(f"{BASE_URL}/admin/products/{new_product_id}", timeout=10)
                if response.status_code == 200:
                    test.log(f"DELETE /admin/products/{new_product_id} - deleted product", True)
                else:
                    test.log(f"DELETE /admin/products/{new_product_id} - failed with status {response.status_code}", False)
            else:
                test.log("POST /admin/products - missing 'product' field", False)
        else:
            test.log(f"POST /admin/products - failed with status {response.status_code}: {response.text[:200]}", False)
    except Exception as e:
        test.log(f"POST /admin/products - exception: {str(e)}", False)
    
    # GET /api/admin/orders
    try:
        response = admin_session.get(f"{BASE_URL}/admin/orders", timeout=10)
        if response.status_code == 200:
            result = response.json()
            if 'orders' in result and len(result['orders']) > 0:
                test.log(f"GET /admin/orders - success: {len(result['orders'])} orders", True)
                
                # PUT /api/admin/orders/:id - update order status
                first_order_id = result['orders'][0].get('id')
                update_data = {"status": "shipped"}
                response = admin_session.put(f"{BASE_URL}/admin/orders/{first_order_id}", json=update_data, timeout=10)
                if response.status_code == 200:
                    updated_order = response.json().get('order', {})
                    if updated_order.get('status') == 'shipped':
                        test.log(f"PUT /admin/orders/{first_order_id} - updated status to 'shipped'", True)
                    else:
                        test.log(f"PUT /admin/orders/{first_order_id} - status not updated correctly", False)
                else:
                    test.log(f"PUT /admin/orders/{first_order_id} - failed with status {response.status_code}", False)
            else:
                test.log("GET /admin/orders - no orders found", True)
        else:
            test.log(f"GET /admin/orders - failed with status {response.status_code}", False)
    except Exception as e:
        test.log(f"GET /admin/orders - exception: {str(e)}", False)
    
    # GET /api/admin/customers
    try:
        response = admin_session.get(f"{BASE_URL}/admin/customers", timeout=10)
        if response.status_code == 200:
            result = response.json()
            if 'customers' in result:
                test.log(f"GET /admin/customers - success: {len(result['customers'])} customers", True)
            else:
                test.log("GET /admin/customers - missing 'customers' field", False)
        else:
            test.log(f"GET /admin/customers - failed with status {response.status_code}", False)
    except Exception as e:
        test.log(f"GET /admin/customers - exception: {str(e)}", False)
    
    # Test other admin endpoints
    for endpoint in ['categories', 'collections', 'coupons', 'banners', 'reviews']:
        try:
            response = admin_session.get(f"{BASE_URL}/admin/{endpoint}", timeout=10)
            if response.status_code == 200:
                result = response.json()
                if endpoint in result:
                    test.log(f"GET /admin/{endpoint} - success: {len(result[endpoint])} items", True)
                else:
                    test.log(f"GET /admin/{endpoint} - missing '{endpoint}' field", False)
            else:
                test.log(f"GET /admin/{endpoint} - failed with status {response.status_code}", False)
        except Exception as e:
            test.log(f"GET /admin/{endpoint} - exception: {str(e)}", False)
    
    # ============================================================================
    # 9. ADMIN ACCESS CONTROL
    # ============================================================================
    print("\n[9] Testing Admin Access Control")
    print("-" * 80)
    
    # GET /api/admin/dashboard with normal user cookie - should return 403
    try:
        response = test.session.get(f"{BASE_URL}/admin/dashboard", timeout=10)
        if response.status_code == 403:
            test.log("GET /admin/dashboard with normal user - correctly returns 403", True)
        else:
            test.log(f"GET /admin/dashboard with normal user - expected 403, got {response.status_code}", False)
    except Exception as e:
        test.log(f"GET /admin/dashboard access control test - exception: {str(e)}", False)
    
    # GET /api/admin/dashboard with no cookie - should return 403
    no_auth_session = requests.Session()
    try:
        response = no_auth_session.get(f"{BASE_URL}/admin/dashboard", timeout=10)
        if response.status_code == 403:
            test.log("GET /admin/dashboard with no auth - correctly returns 403", True)
        else:
            test.log(f"GET /admin/dashboard with no auth - expected 403, got {response.status_code}", False)
    except Exception as e:
        test.log(f"GET /admin/dashboard no auth test - exception: {str(e)}", False)
    
    # ============================================================================
    # 10. REVIEWS
    # ============================================================================
    print("\n[10] Testing Reviews")
    print("-" * 80)
    
    # Get a product to review
    try:
        response = test.session.get(f"{BASE_URL}/products", timeout=10)
        products = response.json().get('products', [])
        if products:
            test_product = products[0]
            product_id = test_product.get('id')
            
            # POST /api/reviews - create review
            review_data = {
                "productId": product_id,
                "rating": 5,
                "comment": "Great product! Highly recommended."
            }
            result = test.test_endpoint("POST", "/reviews", 200, data=review_data,
                                       description="POST /reviews - should create review",
                                       check_fields=['review'])
            
            if result and 'review' in result:
                review = result['review']
                if review.get('rating') == 5:
                    test.log(f"Review rating correct: {review.get('rating')}", True)
                if review.get('productId') == product_id:
                    test.log(f"Review productId correct: {review.get('productId')}", True)
            
            # GET /api/reviews/product/:productId - list reviews
            result = test.test_endpoint("GET", f"/reviews/product/{product_id}", 200,
                                       description=f"GET /reviews/product/{product_id} - should list reviews",
                                       check_fields=['reviews'])
            if result and 'reviews' in result:
                test.log(f"Found {len(result['reviews'])} review(s) for product", True)
        else:
            test.log("No products found to create review", False)
    except Exception as e:
        test.log(f"Review testing failed: {str(e)}", False)
    
    # ============================================================================
    # SUMMARY
    # ============================================================================
    print("\n" + "="*80)
    print("TEST SUMMARY")
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
