import urllib.request
import json
import http.cookiejar
import sys

sys.stdout.reconfigure(encoding='utf-8')

BASE = 'http://localhost:3000'
print('=== Testing Mock Razorpay Integration ===')

# 1. Check site settings
with urllib.request.urlopen(f'{BASE}/api/site-settings') as res:
    data = json.loads(res.read().decode())
    rzp = data.get('paymentSettings', {}).get('razorpay', {})
    print('1. Site Settings Razorpay:')
    print('   - enabled:', rzp.get('enabled'))
    print('   - isMock:', rzp.get('isMock'))
    print('   - mockMode:', rzp.get('mockMode'))
    print('   - keyId:', rzp.get('keyId'))
    assert rzp.get('enabled') is True
    assert rzp.get('isMock') is True
    print('   ✓ Site settings correctly configured for Mock Razorpay')

# Find an in-stock product
with urllib.request.urlopen(f'{BASE}/api/products') as res:
    pdata = json.loads(res.read().decode())
    in_stock = [p for p in pdata.get('products', []) if p.get('stock', 0) > 0]
    assert len(in_stock) > 0, "No in-stock products found for test"
    test_prod = in_stock[0]
    print(f"\nUsing in-stock product: {test_prod['name']} (ID: {test_prod['id']}, Stock: {test_prod['stock']})")

# 2. Test create mock Razorpay order
order_payload = json.dumps({'amount': test_prod['price'], 'items': [{'id': test_prod['id'], 'qty': 1}]}).encode()
req = urllib.request.Request(f'{BASE}/api/payment/razorpay/order', data=order_payload, headers={'Content-Type': 'application/json'})
with urllib.request.urlopen(req) as res:
    order_data = json.loads(res.read().decode())
    print('\n2. Razorpay Order Creation:')
    print('   - order id:', order_data.get('id'))
    print('   - amount:', order_data.get('amount'))
    print('   - mock:', order_data.get('mock'))
    assert order_data.get('mock') is True
    assert order_data.get('id', '').startswith('order_MOCK')
    print('   ✓ Order creation returns mock order successfully')

# 3. Test verify mock payment
verify_payload = json.dumps({
    'razorpay_order_id': order_data['id'],
    'razorpay_payment_id': 'pay_MOCK_TEST_123',
    'razorpay_signature': 'mock_sig_test'
}).encode()
req = urllib.request.Request(f'{BASE}/api/payment/razorpay/verify', data=verify_payload, headers={'Content-Type': 'application/json'})
with urllib.request.urlopen(req) as res:
    verify_data = json.loads(res.read().decode())
    print('\n3. Razorpay Verify Payment:')
    print('   - verified:', verify_data.get('verified'))
    print('   - paymentId:', verify_data.get('paymentId'))
    assert verify_data.get('verified') is True
    print('   ✓ Payment verification succeeded for mock order')

# 4. Test placing order with mock razorpay payment
cj = http.cookiejar.CookieJar()
opener = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(cj))

login_data = json.dumps({'email': 'akash@unictechnology.com', 'password': '12341234'}).encode()
req = urllib.request.Request(f'{BASE}/api/auth/login', data=login_data, headers={'Content-Type': 'application/json'})
with opener.open(req) as res:
    login_res = json.loads(res.read().decode())
    print('\n4. User Login for Order Placement:')
    print('   - logged in:', login_res.get('user', {}).get('email'))

order_body = json.dumps({
    'items': [{
        'id': test_prod['id'],
        'name': test_prod['name'],
        'price': test_prod['price'],
        'qty': 1,
        'image': test_prod.get('images', [''])[0] if isinstance(test_prod.get('images'), list) else ''
    }],
    'address': {
        'fullName': 'Mock Razorpay Test Customer',
        'phone': '9876543210',
        'line1': 'Flat 101, Test Residency',
        'city': 'Jaipur',
        'state': 'Rajasthan',
        'pincode': '302001'
    },
    'payment': 'razorpay',
    'razorpayPaymentId': verify_data['paymentId'],
    'razorpayOrderId': order_data['id'],
    'razorpaySignature': 'mock_sig_test',
    'giftWrap': False
}).encode()
req = urllib.request.Request(f'{BASE}/api/orders', data=order_body, headers={'Content-Type': 'application/json'})
with opener.open(req) as res:
    placed = json.loads(res.read().decode())
    print('\n5. Placed Order Response:')
    o = placed.get('order', {})
    print('   - orderNumber:', o.get('orderNumber'))
    print('   - payment:', o.get('payment'))
    print('   - paymentStatus:', o.get('paymentStatus'))
    print('   - razorpayPaymentId:', o.get('razorpayPaymentId'))
    assert o.get('payment') == 'razorpay'
    assert o.get('paymentStatus') == 'paid'
    print('   ✓ Order successfully placed and marked as PAID with Mock Razorpay!')

print('\n=============================================')
print('ALL MOCK RAZORPAY VERIFICATION TESTS PASSED!')
print('=============================================')
