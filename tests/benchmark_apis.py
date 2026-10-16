import requests
import time

endpoints = [
    ('/', 'Root Health API'),
    ('/site-settings', 'Site Settings'),
    ('/categories', 'Categories Showcase'),
    ('/collections', 'Collections List'),
    ('/banners', 'Promotional Banners'),
    ('/footer', 'Footer Configuration'),
    ('/homepage-content', 'Homepage CMS Content'),
    ('/product-filters', 'Product Filters'),
    ('/coupons/settings', 'Coupon Settings'),
    ('/products', 'Product Catalog List'),
    ('/products/emerald-floral-3-pair-earrings-set', 'Single Product Detail'),
    ('/reviews/product/emerald-floral-3-pair-earrings-set', 'Product Reviews')
]

print("=" * 76)
print("             MIKUMANTRA API SPEED BENCHMARK RESULTS")
print("=" * 76)
header = f"{'Endpoint':32s} | {'Run 1':>9s} | {'Run 2':>9s} | {'Run 3':>9s} | {'Avg Warm':>9s}"
print(header)
print("-" * 76)

total_warm = []
for ep, name in endpoints:
    times = []
    for _ in range(3):
        t0 = time.time()
        r = requests.get('http://localhost:3000/api' + ep, timeout=10)
        ms = round((time.time() - t0) * 1000, 2)
        times.append(ms)
    avg_warm = round((times[1] + times[2]) / 2, 2)
    total_warm.append(avg_warm)
    print(f"{ep:32s} | {times[0]:7.2f}ms | {times[1]:7.2f}ms | {times[2]:7.2f}ms | {avg_warm:7.2f}ms")

print("-" * 76)
print(f"Overall Average Warm Response Time: {round(sum(total_warm) / len(total_warm), 2)}ms")
print("=" * 76)
