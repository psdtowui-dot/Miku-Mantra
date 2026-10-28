import time
import requests
import json
import sys

session = requests.Session()
session.trust_env = False

def bench(name, url, method='GET', json_data=None):
    times = []
    status = None
    resp_size = 0
    for _ in range(5):
        t0 = time.perf_counter()
        try:
            if method == 'GET':
                r = session.get(url, timeout=15)
            else:
                r = session.post(url, json=json_data, timeout=15)
            t1 = time.perf_counter()
            times.append((t1 - t0) * 1000)
            status = r.status_code
            resp_size = len(r.content)
        except Exception as e:
            print(f"{name:<32} ERROR: {e}")
            return
    avg = sum(times) / len(times)
    min_t = min(times)
    max_t = max(times)
    print(f"{name:<32} Status: {status} | Avg: {avg:6.1f}ms | Min: {min_t:6.1f}ms | Max: {max_t:6.1f}ms | Size: {resp_size/1024:5.1f}KB")

print("=" * 90)
print("BASELINE PERFORMANCE AUDIT & BENCHMARKS")
print("=" * 90)
bench("Home Page (/)", "http://localhost:3000/")
bench("Coupons Settings API", "http://localhost:3000/api/coupons/settings")
bench("Coupon Validate MIKUMANTRA10", "http://localhost:3000/api/coupons/validate", method="POST", json_data={"code": "MIKUMANTRA10", "subtotal": 50000})
bench("Coupon Validate WELCOME2000", "http://localhost:3000/api/coupons/validate", method="POST", json_data={"code": "WELCOME2000", "subtotal": 25000})
bench("Cart Validate API", "http://localhost:3000/api/cart/validate", method="POST", json_data={"items": [{"id": "prod_ring_01", "qty": 1}]})
bench("Cart Pricing API", "http://localhost:3000/api/cart/pricing", method="POST", json_data={"items": [{"id": "prod_ring_01", "qty": 1}], "coupon": "MIKUMANTRA10"})
bench("Categories API", "http://localhost:3000/api/categories")
bench("Collections API", "http://localhost:3000/api/collections")
bench("Banners API", "http://localhost:3000/api/banners")
bench("Products API (limit 12)", "http://localhost:3000/api/products?limit=12")
bench("Site Settings API", "http://localhost:3000/api/site-settings")
print("=" * 90)
