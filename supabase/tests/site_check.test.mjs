// site-check edge function: the pure analysis and host checks (analyse.ts).
// Node strips the TypeScript types itself (Node 22.18+ / 24).
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { analyseHtml, isPublicHost } from '../functions/site-check/analyse.ts';

const meta = { status: 200, finalUrl: 'https://example.co.nz/', seconds: 0.42 };

describe('analyseHtml', () => {
  test('a healthy page has no issues', () => {
    const html = `<html><head><title>Cleaning Services Auckland | Example</title>
      <meta name="viewport" content="width=device-width"><meta name="description" content="x"></head>
      <body><a href="tel:+6421000000">Call</a><form></form><p>© 2026 Example</p></body></html>`;
    const r = analyseHtml(html, meta, 2026);
    assert.deepEqual(r.issues, []);
    assert.equal(r.telLink, true);
    assert.equal(r.copyright, 2026);
    assert.equal(r.seconds, 0.4);
  });

  test('finds the problems seen during prospect research', () => {
    const html = `<title>Home - CleanAF</title>
      <a href="mailto:http://info@angel.test">Email</a>
      <a href="#" aria-label="Facebook"></a>
      <p>&copy; 2021</p>`;
    const r = analyseHtml(html, meta, 2026);
    assert.ok(r.issues.includes('The email link is broken (mailto points to a web address)'));
    assert.ok(r.issues.includes('Social media icons link nowhere (#)'));
    assert.ok(r.issues.includes('Generic page title ("Home - CleanAF")'));
    assert.ok(r.issues.includes('Footer copyright says 2021'));
    assert.ok(r.issues.includes('No click-to-call phone link on the homepage'));
    assert.ok(r.issues.includes('No mobile viewport tag, so it may not display properly on phones'));
  });

  test('flags a private WordPress.com site and HTTP errors', () => {
    const r = analyseHtml('<title>Private Site</title>This site is currently private.', { ...meta, status: 403 }, 2026);
    assert.equal(r.privateSite, true);
    assert.ok(r.issues.some((i) => i.startsWith('Visitors see a private')));
    assert.ok(r.issues.includes('The homepage returns an error (HTTP 403)'));
  });

  test('detects the platform', () => {
    assert.equal(analyseHtml('<link href="/wp-content/x.css">', meta).platform, 'WordPress');
    assert.equal(analyseHtml('<script src="https://static.wix.com/x.js">', meta).platform, 'Wix');
  });
});

describe('isPublicHost', () => {
  test('blocks local and private addresses', () => {
    for (const h of ['localhost', 'app.localhost', '127.0.0.1', '10.1.2.3', '192.168.1.1', '172.20.0.1',
      '169.254.169.254', '100.64.0.1', '::1', 'fd00::1', 'printer', 'db.internal']) {
      assert.equal(isPublicHost(h), false, h);
    }
  });
  test('allows public hosts', () => {
    for (const h of ['www.oreece.co.nz', '8.8.8.8', '172.32.0.1', '2606:4700::1111']) {
      assert.equal(isPublicHost(h), true, h);
    }
  });
});
