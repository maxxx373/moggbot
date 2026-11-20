// Открывает страницу проекта на фиктивном адресе http://mogg.test/ — файлы отдаются с диска (нужно для fetch)
const fs = require('fs'), path = require('path');
const ROOT = path.resolve(__dirname, '..');
const TYPES = { '.html': 'text/html; charset=utf-8', '.json': 'application/json', '.webp': 'image/webp', '.jpg': 'image/jpeg', '.png': 'image/png', '.onnx': 'application/octet-stream' };
module.exports = async function serve(page, overrides = {}) {
  await page.route('http://mogg.test/**', (route) => {
    const u = new URL(route.request().url()); const rel = decodeURIComponent(u.pathname).replace(/^\/+/, '');
    if (overrides[rel] !== undefined) return route.fulfill({ status: 200, contentType: TYPES[path.extname(rel)] || 'text/plain', body: overrides[rel] });
    const f = path.join(ROOT, rel);
    if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) return route.fulfill({ status: 404, body: 'nope' });
    route.fulfill({ status: 200, contentType: TYPES[path.extname(f)] || 'application/octet-stream', body: fs.readFileSync(f) });
  });
};
