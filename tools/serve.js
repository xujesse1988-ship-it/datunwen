'use strict';
/* 大同语项目静态服务器（零依赖）
   鉴权：HTTP Basic Auth，密码取自项目根 .env 的 PASS=xxx（用户名任意）
   启动：node tools/serve.js   （PORT 环境变量可改端口，默认 8080） */
const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ROOT = path.resolve(__dirname, '..');
const PORT = Number(process.env.PORT || 8080);

/* —— 读 .env —— */
const env = {};
try {
  for (const line of fs.readFileSync(path.join(ROOT, '.env'), 'utf8').split('\n')) {
    const m = /^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/.exec(line);
    if (m) env[m[1]] = m[2];
  }
} catch (e) { /* fallthrough */ }
const PASS = env.PASS;
if (!PASS) { console.error('错误：项目根目录需要 .env 文件，内容形如 PASS=xxx'); process.exit(1); }

const MIME = {
  '.html': 'text/html; charset=utf-8', '.json': 'application/json; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.md': 'text/markdown; charset=utf-8', '.txt': 'text/plain; charset=utf-8',
  '.wav': 'audio/wav', '.mp3': 'audio/mpeg',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.ico': 'image/x-icon'
};

const INDEX = `<!DOCTYPE html><html lang="zh-CN"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1"><title>大同语 · Datunwen</title>
<style>body{font-family:Georgia,"Songti SC","Noto Serif CJK SC",serif;max-width:640px;margin:60px auto;padding:0 24px;line-height:1.9;color:#1F2328;background:#FAF9F6}
@media(prefers-color-scheme:dark){body{color:#E8E6E1;background:#17191D}a{color:#5E90EE}}
h1{font-size:26px}a{color:#35558F;text-decoration:none;font-weight:700}li{margin:10px 0}
small{opacity:.65}</style></head><body>
<h1>大同语 · Datunwen</h1>
<ul>
<li><a href="/datunwen.html">设计书（中文）</a> <small>— 音系 · 音高语法 · 文字 · 压力测试，可点击发音</small></li>
<li><a href="/course-en.html">A First Course (English)</a> <small>— 8 lessons for English speakers</small></li>
<li><a href="/course-zh.html">入门课程（中文）</a> <small>— 8 节课，写给中文使用者</small></li>
<li><a href="/dictionary.html">词典 · Dictionary v0.2</a> <small>— 263 词条，三语检索</small></li>
<li><a href="/README.md">README</a> · <a href="/lexicon.json">lexicon.json</a></li>
</ul></body></html>`;

function deny(res) {
  setTimeout(() => {
    res.writeHead(401, {
      'WWW-Authenticate': 'Basic realm="datunwen"',
      'Content-Type': 'text/plain; charset=utf-8'
    });
    res.end('需要密码 / password required（用户名随意，密码见 .env）');
  }, 400); /* 轻微延迟，抬高爆破成本 */
}
function passOK(pw) {
  const a = crypto.createHash('sha256').update(String(pw)).digest();
  const b = crypto.createHash('sha256').update(PASS).digest();
  return crypto.timingSafeEqual(a, b);
}

const server = http.createServer((req, res) => {
  const ip = req.socket.remoteAddress;
  /* —— 鉴权 —— */
  let ok = false;
  const m = /^Basic (.+)$/.exec(req.headers.authorization || '');
  if (m) {
    try {
      const dec = Buffer.from(m[1], 'base64').toString('utf8');
      ok = passOK(dec.slice(dec.indexOf(':') + 1));
    } catch (e) { ok = false; }
  }
  if (!ok) { console.log(new Date().toISOString(), ip, '401', req.url); return deny(res); }

  /* —— 路由 —— */
  let p;
  try { p = decodeURIComponent(new URL(req.url, 'http://x').pathname); }
  catch (e) { res.writeHead(400); return res.end('bad url'); }
  if (p === '/') {
    console.log(new Date().toISOString(), ip, '200', '/');
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    return res.end(INDEX);
  }
  /* 隐藏文件与敏感目录一律 404（.env / .git / 任何点开头路径段） */
  if (/(^|\/)\./.test(p)) { res.writeHead(404); return res.end('404'); }
  const fp = path.normalize(path.join(ROOT, p));
  if (fp !== ROOT && !fp.startsWith(ROOT + path.sep)) { res.writeHead(403); return res.end('403'); }
  fs.stat(fp, (err, st) => {
    if (err || !st.isFile()) {
      console.log(new Date().toISOString(), ip, '404', p);
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      return res.end('404 not found');
    }
    console.log(new Date().toISOString(), ip, '200', p);
    res.writeHead(200, {
      'Content-Type': MIME[path.extname(fp).toLowerCase()] || 'application/octet-stream',
      'Content-Length': st.size,
      'Cache-Control': 'no-cache'
    });
    fs.createReadStream(fp).pipe(res);
  });
});
server.listen(PORT, '0.0.0.0', () => console.log(`datunwen serving at http://0.0.0.0:${PORT} (root: ${ROOT})`));
