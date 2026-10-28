import next from 'next';
import http from 'http';

async function run() {
  console.log('Preparing Next.js server...');
  const app = next({ dev: false, dir: '.' });
  const handle = app.getRequestHandler();
  await app.prepare();

  const server = http.createServer((req, res) => {
    handle(req, res);
  });

  await new Promise((resolve) => server.listen(3002, '127.0.0.1', resolve));
  console.log('Server listening on http://127.0.0.1:3002');

  const bench = async (name, path, options = {}) => {
    const times = [];
    let status = 0;
    let size = 0;
    for (let i = 0; i < 5; i++) {
      const t0 = performance.now();
      try {
        const res = await fetch(`http://127.0.0.1:3002${path}`, options);
        const data = await res.arrayBuffer();
        const t1 = performance.now();
        times.push(t1 - t0);
        status = res.status;
        size = data.byteLength;
      } catch (err) {
        console.log(`${name.padEnd(35)} ERROR: ${err.message}`);
        return;
      }
    }
    const avg = times.reduce((a, b) => a + b, 0) / times.length;
    const min = Math.min(...times);
    const max = Math.max(...times);
    console.log(`${name.padEnd(35)} Status: ${status} | Avg: ${avg.toFixed(1).padStart(6)}ms | Min: ${min.toFixed(1).padStart(6)}ms | Max: ${max.toFixed(1).padStart(6)}ms | Size: ${(size / 1024).toFixed(1)}KB`);
  };

  console.log('\n==========================================================================================');
  console.log('BASELINE PERFORMANCE MEASUREMENTS (PRODUCTION)');
  console.log('==========================================================================================');
  await bench('Home Page (/)', '/');
  await bench('Coupons Settings API', '/api/coupons/settings');
  await bench('Coupon Validate MIKUMANTRA10', '/api/coupons/validate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code: 'MIKUMANTRA10', subtotal: 50000 })
  });
  await bench('Coupon Validate WELCOME2000', '/api/coupons/validate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code: 'WELCOME2000', subtotal: 25000 })
  });
  await bench('Cart Validate API', '/api/cart/validate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ items: [{ id: 'prod_ring_01', qty: 1 }] })
  });
  await bench('Cart Pricing API', '/api/cart/pricing', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ items: [{ id: 'prod_ring_01', qty: 1 }], coupon: 'MIKUMANTRA10' })
  });
  await bench('Categories API', '/api/categories');
  await bench('Collections API', '/api/collections');
  await bench('Banners API', '/api/banners');
  await bench('Products API (limit 12)', '/api/products?limit=12');
  await bench('Site Settings API', '/api/site-settings');
  console.log('==========================================================================================\n');

  server.close();
  process.exit(0);
}

run().catch((e) => {
  console.error('Measurement error:', e);
  process.exit(1);
});
