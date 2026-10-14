const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');

const bridge = `<script>
(() => {
  let value = 0;
  let failNext = false;
  window.__counterDemo = {
    failNext() { failNext = true; },
    get value() { return value; }
  };
  const runner = (success, failure) => ({
    withSuccessHandler(callback) { return runner(callback, failure); },
    withFailureHandler(callback) { return runner(success, callback); },
    getCounterState() { invoke(false, success, failure); },
    incrementCounter() { invoke(true, success, failure); }
  });
  function invoke(increment, success, failure) {
    setTimeout(() => {
      if (failNext) {
        failNext = false;
        if (failure) failure(new Error('Koneksi demo terputus. Silakan coba lagi.'));
        return;
      }
      if (increment) value += 1;
      if (success) success({ value });
    }, 250);
  }
  window.google = { script: { run: runner() } };
  document.addEventListener('DOMContentLoaded', () => {
    const badge = document.createElement('div');
    badge.textContent = 'Demo lokal — data simulasi';
    badge.setAttribute('role', 'note');
    badge.style.cssText = 'position:fixed;left:12px;bottom:12px;z-index:10000;padding:8px 12px;border-radius:8px;background:#fff7df;color:#6e4a00;font:12px system-ui;box-shadow:0 2px 10px #0002';
    document.body.append(badge);
  });
})();
</script>`;

function createServer() {
  return http.createServer((request, response) => {
    if (request.url !== '/' && request.url !== '/index.html') {
      response.writeHead(404); response.end('Not found'); return;
    }
    try {
      const source = fs.readFileSync(path.join(__dirname, '..', 'src', 'Index.html'), 'utf8');
      response.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' });
      response.end(source.replace(/<head([^>]*)>/i, '<head$1>' + bridge));
    } catch (error) {
      response.writeHead(500); response.end('Preview source unavailable: ' + error.message);
    }
  });
}

if (require.main === module) {
  const port = Number(process.env.PORT || 4173);
  createServer().listen(port, '127.0.0.1', () => console.log('Local simulated preview: http://127.0.0.1:' + port));
}
module.exports = { createServer };
