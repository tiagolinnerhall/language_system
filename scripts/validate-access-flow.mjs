import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();

function mustExist(path) {
  if (!existsSync(join(root, path))) throw new Error(`Missing ${path}`);
}

function mustNotExist(path) {
  if (existsSync(join(root, path))) throw new Error(`Public course file should not exist: ${path}`);
}

function mustInclude(path, marker) {
  const content = readFileSync(join(root, path), 'utf8');
  if (!content.includes(marker)) throw new Error(`${path} missing marker: ${marker}`);
}

['data1.js', 'data2.js', 'data3.js', 'data4.js', 'data5.js'].forEach(file => {
  mustNotExist(`languages/russian/${file}`);
  mustExist(`api/_data/russian/${file}`);
});

mustExist('api/create-checkout-session.js');
mustExist('api/verify-checkout-session.js');
mustExist('api/verify-access-token.js');
mustExist('api/course.js');
mustExist('api/restore-access.js');
mustExist('checkout.html');
mustExist('access.html');

mustInclude('app.html', '/api/course');
mustInclude('app.html', 'lang5k_access_token');
mustInclude('api/course.js', 'retrieveCheckoutSession');
mustInclude('api/course.js', 'isCheckoutSessionPaid');
mustInclude('api/verify-access-token.js', 'retrieveCheckoutSession');
mustInclude('checkout.html', '/api/create-checkout-session');
mustInclude('access.html', '/api/verify-checkout-session');
mustInclude('access.html', '/api/restore-access');
mustInclude('sw.js', 'lang5k-static-v5');
mustInclude('privacy.html', 'paid-access tokens');

console.log('Lang5K paid access flow validation passed.');
