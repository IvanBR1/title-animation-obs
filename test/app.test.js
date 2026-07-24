const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const { validateBuild } = require('../src/build-static');
const { createServer, resolvePublicPath } = require('../src/server');

const ROOT = path.resolve(__dirname, '..');

test('valida todos los recursos del sitio estático', () => assert.equal(validateBuild(), 7));

test('resuelve rutas públicas sin permitir escapar de public', () => {
  assert.equal(resolvePublicPath('/panel/'), path.join(ROOT, 'public/panel/index.html'));
  assert.equal(resolvePublicPath('/visualizador/'), path.join(ROOT, 'public/visualizador/index.html'));
  assert.equal(resolvePublicPath('/../../etc/passwd'), null);
});

test('sirve el panel y el visualizador', async context => {
  const server = createServer();
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  context.after(() => new Promise(resolve => server.close(resolve)));
  const origin = `http://127.0.0.1:${server.address().port}`;
  const panel = await fetch(`${origin}/panel/`);
  assert.equal(panel.status, 200);
  assert.match(await panel.text(), /Crear título/u);
  const viewer = await fetch(`${origin}/visualizador/`);
  assert.equal(viewer.status, 200);
  assert.match(await viewer.text(), /title-stage/u);
});

test('incluye ocho temas, fuentes y ajuste proporcional de logo', () => {
  const panel = fs.readFileSync(path.join(ROOT, 'public/panel/index.html'), 'utf8');
  const runtime = fs.readFileSync(path.join(ROOT, 'public/assets/js/titles.js'), 'utf8');
  assert.equal((panel.match(/class="theme-card/g) || []).length, 8);
  assert.match(panel, /Cormorant Garamond/u);
  assert.match(runtime, /objectFit = 'contain'/u);
});
