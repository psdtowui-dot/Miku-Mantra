import next from 'next';
import http from 'http';
import { spawn } from 'child_process';

async function run() {
  console.log('Starting Next.js production server on 3000 for Full Regression Suite...');
  const app = next({ dev: false, dir: '.' });
  const handle = app.getRequestHandler();
  await app.prepare();

  const server = http.createServer((req, res) => {
    handle(req, res);
  });

  await new Promise((resolve) => server.listen(3000, '127.0.0.1', resolve));
  console.log('Production server listening on http://127.0.0.1:3000');

  const runPy = (file, args = []) => {
    return new Promise((resolve) => {
      console.log(`\n============================================================`);
      console.log(`RUNNING: ${file}`);
      console.log(`============================================================`);
      const proc = spawn('python', [file, ...args], { stdio: 'inherit' });
      proc.on('close', (code) => {
        console.log(`Finished ${file} -> Exit Code: ${code}`);
        resolve(code);
      });
    });
  };

  const results = {};
  results['test_mock_razorpay.py'] = await runPy('test_mock_razorpay.py');
  results['test_stock_system.py'] = await runPy('test_stock_system.py');
  results['test_dynamic_return_window.py'] = await runPy('test_dynamic_return_window.py');
  results['test_admin_reviews_full_control.py'] = await runPy('test_admin_reviews_full_control.py');
  results['test_cancellation.py'] = await runPy('test_cancellation.py');

  console.log('\n' + '='.repeat(70));
  console.log('FULL REGRESSION SUITE FINAL AUDIT REPORT');
  console.log('='.repeat(70));
  let allPassed = true;
  for (const [test, code] of Object.entries(results)) {
    const passed = code === 0;
    if (!passed) allPassed = false;
    console.log(`${test.padEnd(40)}: ${passed ? '✓ PASSED (100%)' : '✗ FAILED'}`);
  }
  console.log('='.repeat(70));
  console.log(`FINAL RESULT: ${allPassed ? 'ALL TESTS PASSED WITH ZERO REGRESSIONS' : 'TEST FAILURES DETECTED'}`);
  console.log('='.repeat(70) + '\n');

  server.close();
  process.exit(allPassed ? 0 : 1);
}

run().catch((e) => {
  console.error('Fatal regression suite error:', e);
  process.exit(1);
});
