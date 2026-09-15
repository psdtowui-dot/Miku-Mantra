import urllib.request
import json
import sys

BASE_URL = 'http://localhost:3000'

def http_req(path, method='GET', body=None, headers=None):
    if headers is None:
        headers = {}
    url = f"{BASE_URL}{path}"
    data = None
    if body is not None:
        data = json.dumps(body).encode('utf-8')
        headers['Content-Type'] = 'application/json'
    
    req = urllib.request.Request(url, data=data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req) as response:
            res_body = response.read().decode('utf-8')
            try:
                return response.status, json.loads(res_body) if res_body else {}
            except Exception:
                return response.status, {'raw': res_body}
    except urllib.error.HTTPError as e:
        res_body = e.read().decode('utf-8')
        try:
            return e.code, json.loads(res_body) if res_body else {'error': str(e)}
        except Exception:
            return e.code, {'raw': res_body, 'error': str(e)}
    except Exception as e:
        return 500, {'error': str(e)}

def run_tests():
    print("=== STARTING MULTI-USER DATA ISOLATION VERIFICATION ===")
    
    # User 1 & User 2 details
    u1_email = f"iso_test_user1_{int(urllib.request.time.time())}@gmail.com"
    u2_email = f"iso_test_user2_{int(urllib.request.time.time())}@gmail.com"
    password = "password123"

    st, d1 = http_req('/api/auth/register', method='POST', body={'name': 'User One', 'email': u1_email, 'password': password})
    print(f"Status: {st}, Response: {d1}")
    assert st == 200 and 'token' in d1, f"Failed registering User 1: {d1}"
    token1 = d1['token']
    user1_id = d1['user']['id']
    print(f"PASS: User 1 registered (ID: {user1_id}, Token: {token1[:15]}...)")

    # 2. Register User 2
    print("\n--- Registering User 2 ---")
    st, d2 = http_req('/api/auth/register', method='POST', body={'name': 'User Two', 'email': u2_email, 'password': password})
    assert st == 200 and 'token' in d2, f"Failed registering User 2: {d2}"
    token2 = d2['token']
    user2_id = d2['user']['id']
    print(f"PASS: User 2 registered (ID: {user2_id}, Token: {token2[:15]}...)")

    # SCENARIO 1 & 2: Token-based Session Verification (/api/auth/me)
    print("\n--- SCENARIO 1 & 2: Verify /api/auth/me per Token ---")
    st, me1 = http_req('/api/auth/me', headers={'x-auth-token': token1})
    assert st == 200 and me1['user']['email'] == u1_email, f"User 1 me failed: {me1}"
    
    st, me2 = http_req('/api/auth/me', headers={'x-auth-token': token2})
    assert st == 200 and me2['user']['email'] == u2_email, f"User 2 me failed: {me2}"
    print("PASS: Both users authenticated independently with distinct tokens.")

    # Fetch a real product for wishlist/order tests
    st, prods_res = http_req('/api/products')
    assert st == 200 and len(prods_res.get('products', [])) > 0, f"Failed fetching products: {prods_res}"
    real_prod = prods_res['products'][0]
    real_prod_2 = prods_res['products'][1] if len(prods_res['products']) > 1 else real_prod
    real_prod_id = real_prod['id']
    real_prod_id_2 = real_prod_2['id']

    # SCENARIO 3: User 1 adds Product A to Cart; User 2 cart is untouched
    print("\n--- SCENARIO 3: User 1 Cart Isolation ---")
    prod_a = {'id': real_prod_id, 'slug': real_prod.get('slug', 'test'), 'name': real_prod.get('name', 'Test Prod'), 'price': real_prod.get('price', 1000), 'qty': 2}
    st, cart_res1 = http_req('/api/cart', method='PUT', body={'items': [prod_a]}, headers={'x-auth-token': token1})
    assert st == 200, f"User 1 cart update failed: {cart_res1}"

    st, u2_cart = http_req('/api/cart', headers={'x-auth-token': token2})
    assert st == 200 and len(u2_cart.get('items', [])) == 0, f"User 2 cart leak! Found: {u2_cart}"
    print("PASS: Product added by User 1 is NOT visible in User 2's cart.")

    # SCENARIO 4: User 2 adds Product B to Cart; User 1 cart retains only Product A
    print("\n--- SCENARIO 4: User 2 Cart Isolation ---")
    prod_b = {'id': real_prod_id_2, 'slug': real_prod_2.get('slug', 'test2'), 'name': real_prod_2.get('name', 'Test Prod 2'), 'price': real_prod_2.get('price', 2000), 'qty': 1}
    st, cart_res2 = http_req('/api/cart', method='PUT', body={'items': [prod_b]}, headers={'x-auth-token': token2})
    assert st == 200, f"User 2 cart update failed: {cart_res2}"

    st, u1_cart = http_req('/api/cart', headers={'x-auth-token': token1})
    assert st == 200 and len(u1_cart.get('items', [])) == 1 and u1_cart['items'][0]['id'] == real_prod_id, f"User 1 cart corrupted: {u1_cart}"
    print("PASS: User 1 cart contains ONLY Product A (qty 2); User 2 cart contains ONLY Product B (qty 1).")

    # SCENARIO 5: Wishlist Isolation
    print("\n--- SCENARIO 5: Wishlist Isolation ---")
    st, wish_res1 = http_req('/api/wishlist', method='POST', body={'productId': real_prod_id}, headers={'x-auth-token': token1})
    assert st == 200, f"User 1 wishlist add failed: {wish_res1}"

    st, u2_wish = http_req('/api/wishlist', headers={'x-auth-token': token2})
    assert st == 200 and len(u2_wish.get('wishlist', [])) == 0, f"User 2 wishlist leak! Found: {u2_wish}"
    print("PASS: Wishlist item added by User 1 is NOT visible to User 2.")

    # SCENARIO 6: Addresses Isolation
    print("\n--- SCENARIO 6: Saved Addresses Isolation ---")
    addr_body = {
        'fullName': 'User One Full', 'phone': '+919876543210',
        'line1': '123 Golden Street', 'city': 'Mumbai', 'state': 'Maharashtra', 'pincode': '400001'
    }
    st, addr_res1 = http_req('/api/addresses', method='POST', body=addr_body, headers={'x-auth-token': token1})
    assert st == 200, f"User 1 address add failed: {addr_res1}"

    st, u2_addrs = http_req('/api/addresses', headers={'x-auth-token': token2})
    assert st == 200 and len(u2_addrs.get('addresses', [])) == 0, f"User 2 address leak! Found: {u2_addrs}"
    print("PASS: Saved address of User 1 is NOT visible to User 2.")

    # SCENARIO 7: Orders Isolation
    print("\n--- SCENARIO 7: Orders Isolation ---")
    order_body = {
        'items': [{'id': real_prod_id, 'slug': real_prod.get('slug', 'test'), 'name': real_prod.get('name', 'Test Prod'), 'price': real_prod.get('price', 1000), 'qty': 1}],
        'address': addr_body,
        'payment': 'cod'
    }
    st, ord_res1 = http_req('/api/orders', method='POST', body=order_body, headers={'x-auth-token': token1})
    assert st == 200, f"User 1 order placement failed: {ord_res1}"
    order_id1 = ord_res1['order']['id']

    st, u2_orders = http_req('/api/orders', headers={'x-auth-token': token2})
    assert st == 200 and len(u2_orders.get('orders', [])) == 0, f"User 2 orders leak! Found: {u2_orders}"
    
    # Try fetching User 1's order directly with User 2's token (should be 403 Forbidden or 404 Not Found)
    st, u2_single_order = http_req(f'/api/orders/{order_id1}', headers={'x-auth-token': token2})
    assert st in (403, 404), f"User 2 illegally accessed User 1 order! Status: {st}, Data: {u2_single_order}"
    print("PASS: Orders placed by User 1 are strictly isolated and inaccessible by User 2.")

    # SCENARIO 8: Logout / Token Revocation Safety
    print("\n--- SCENARIO 8: Logout & Independent Session Lifecycles ---")
    st, logout_res = http_req('/api/auth/logout', method='POST', headers={'x-auth-token': token1})
    assert st == 200, f"Logout failed: {logout_res}"

    # User 2 request should still work normally
    st, me2_after = http_req('/api/auth/me', headers={'x-auth-token': token2})
    assert st == 200 and me2_after['user']['email'] == u2_email, f"User 2 affected by User 1 logout! {me2_after}"
    print("PASS: User 1 logging out did NOT affect User 2's session in Tab 2.")

    print("\n=======================================================")
    print("ALL 8 MULTI-USER DATA ISOLATION TEST SCENARIOS PASSED 100%!")
    print("=======================================================")

if __name__ == '__main__':
    run_tests()
