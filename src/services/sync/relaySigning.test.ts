// Pins the relay's request signing against SnapTrade's published spec: canonical JSON with keys
// sorted at EVERY level, no whitespace, content null when absent, HMAC-SHA256 base64.
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { sortedJson, sign } = require('../../../functions/signing.js');

test('canonical JSON sorts keys at every level, compact, nulls preserved', () => {
  expect(sortedJson({ content: { b: 2, a: { z: 1, y: [3, { d: 4, c: 5 }] } }, path: '/api/v1/x', query: 'q=1' }))
    .toBe('{"content":{"a":{"y":[3,{"c":5,"d":4}],"z":1},"b":2},"path":"/api/v1/x","query":"q=1"}');
  expect(sortedJson({ content: null, path: '/p', query: '' }))
    .toBe('{"content":null,"path":"/p","query":""}');
});

test('signature is deterministic base64 HMAC-SHA256 keyed by the consumer key', () => {
  const sig = sign('test-key', { content: null, path: '/api/v1/snapTrade/login', query: 'clientId=X&timestamp=1' });
  expect(sig).toMatch(/^[A-Za-z0-9+/]+=*$/);
  expect(sig).toBe(sign('test-key', { content: null, path: '/api/v1/snapTrade/login', query: 'clientId=X&timestamp=1' }));
  expect(sig).not.toBe(sign('other-key', { content: null, path: '/api/v1/snapTrade/login', query: 'clientId=X&timestamp=1' }));
});
