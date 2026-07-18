// SnapTrade request signing — PURE, no dependencies, extracted so the app's test suite can pin it
// against their spec (HMAC-SHA256 over sorted-key compact JSON of {content,path,query}, base64).
const crypto = require('crypto');

function sortedJson(value) {
  if (Array.isArray(value)) return `[${value.map(sortedJson).join(',')}]`;
  if (value && typeof value === 'object') {
    const keys = Object.keys(value).sort();
    return `{${keys.map((k) => `${JSON.stringify(k)}:${sortedJson(value[k])}`).join(',')}}`;
  }
  return JSON.stringify(value);
}
function sign(consumerKey, { content, path, query }) {
  const canonical = sortedJson({ content: content ?? null, path, query });
  return crypto.createHmac('sha256', consumerKey).update(canonical, 'utf8').digest('base64');
}
module.exports = { sortedJson, sign };
