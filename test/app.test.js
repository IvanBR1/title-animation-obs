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

test('incluye diez temas, fuentes y ajuste proporcional de logo', () => {
  const panel = fs.readFileSync(path.join(ROOT, 'public/panel/index.html'), 'utf8');
  const runtime = fs.readFileSync(path.join(ROOT, 'public/assets/js/titles.js'), 'utf8');
  assert.equal((panel.match(/class="theme-card/g) || []).length, 10);
  assert.match(panel, /Cormorant Garamond/u);
  assert.match(runtime, /objectFit = 'contain'/u);
});

test('sincroniza automáticamente con un solo switch y mantiene el preview visible', () => {
  const panel = fs.readFileSync(path.join(ROOT, 'public/panel/index.html'), 'utf8');
  const panelRuntime = fs.readFileSync(path.join(ROOT, 'public/assets/js/panel.js'), 'utf8');
  const viewerRuntime = fs.readFileSync(path.join(ROOT, 'public/assets/js/titles.js'), 'utf8');
  assert.doesNotMatch(panel, /id="(?:update|show)-button"/u);
  assert.doesNotMatch(panel, /title="Abrir visualizador"/u);
  assert.match(panelRuntime, /commit\(state\.visible \? 'show' : 'hide'\)/u);
  assert.match(viewerRuntime, /const visible = isPreview \|\| Boolean\(state\.visible\)/u);
});

test('ofrece fondos de color, imagen y video con ajuste y matriz de anclaje', () => {
  const panel = fs.readFileSync(path.join(ROOT, 'public/panel/index.html'), 'utf8');
  const panelRuntime = fs.readFileSync(path.join(ROOT, 'public/assets/js/panel.js'), 'utf8');
  const viewer = fs.readFileSync(path.join(ROOT, 'public/visualizador/index.html'), 'utf8');
  const styles = fs.readFileSync(path.join(ROOT, 'public/assets/css/titles.css'), 'utf8');
  for (const type of ['color', 'image', 'video']) assert.match(panel, new RegExp(`value="${type}"`, 'u'));
  for (const fit of ['cover', 'stretch', 'contain']) assert.match(panel, new RegExp(`value="${fit}"`, 'u'));
  assert.match(panel, /id="image-animation"/u);
  assert.match(panel, /id="video-effect"/u);
  assert.equal((panelRuntime.match(/\['(?:left|center|right) (?:top|center|bottom)'/gu) || []).length, 9);
  assert.match(viewer, /id="background-video"/u);
  assert.match(styles, /\.title-stage\.is-visible \.scene-background/u);
});

test('oculta opciones por tipo y permite recortar los efectos del video', () => {
  const panel = fs.readFileSync(path.join(ROOT, 'public/panel/index.html'), 'utf8');
  const panelRuntime = fs.readFileSync(path.join(ROOT, 'public/assets/js/panel.js'), 'utf8');
  const viewerRuntime = fs.readFileSync(path.join(ROOT, 'public/assets/js/titles.js'), 'utf8');
  assert.match(panel, /id="image-options"/u);
  assert.match(panel, /id="video-options"[^>]*hidden[^>]*aria-hidden="true"/u);
  for (const effect of ['none', 'loop', 'alternate', 'mirror']) {
    assert.match(panel, new RegExp(`value="${effect}"`, 'u'));
  }
  assert.match(panel, /id="video-start"/u);
  assert.match(panel, /id="video-end"/u);
  assert.match(panelRuntime, /state\.videoStart >= state\.videoEnd/u);
  assert.match(viewerRuntime, /function swapVideoBuffer/u);
  assert.match(viewerRuntime, /requestVideoFrameCallback/u);
  assert.match(viewerRuntime, /function videoBounds/u);
});

test('concentra todos los controles del logotipo en Personalización', () => {
  const panel = fs.readFileSync(path.join(ROOT, 'public/panel/index.html'), 'utf8');
  const main = panel.match(/<main class="workspace">([\s\S]*?)<\/main>/u)?.[1] || '';
  const settings = panel.match(/<aside id="settings-drawer"([\s\S]*?)<\/aside>/u)?.[1] || '';
  assert.doesNotMatch(main, /id="logo-input"/u);
  assert.match(settings, /id="logo-input"/u);
  assert.match(settings, /id="logo-file-button"/u);
  assert.match(settings, /id="logo-width"/u);
  assert.match(settings, /id="logo-height"/u);
});

test('conserva fuente y color por tema y permite tratar el color del logo', () => {
  const panel = fs.readFileSync(path.join(ROOT, 'public/panel/index.html'), 'utf8');
  const panelRuntime = fs.readFileSync(path.join(ROOT, 'public/assets/js/panel.js'), 'utf8');
  const viewerRuntime = fs.readFileSync(path.join(ROOT, 'public/assets/js/titles.js'), 'utf8');
  const styles = fs.readFileSync(path.join(ROOT, 'public/assets/css/titles.css'), 'utf8');
  assert.match(panelRuntime, /themeStyles/u);
  assert.match(panelRuntime, /state\.themeStyles\[state\.theme\]/u);
  assert.match(styles, /font-family:var\(--title-font\)!important/u);
  assert.match(panel, /value="invert"/u);
  assert.match(panel, /value="colorize"/u);
  assert.match(viewerRuntime, /logo-color-matrix/u);
});

test('usa un campo de archivo uniforme y retrasa el texto hasta terminar el fondo', () => {
  const panel = fs.readFileSync(path.join(ROOT, 'public/panel/index.html'), 'utf8');
  const panelStyles = fs.readFileSync(path.join(ROOT, 'public/assets/css/panel.css'), 'utf8');
  const viewerStyles = fs.readFileSync(path.join(ROOT, 'public/assets/css/titles.css'), 'utf8');
  assert.equal((panel.match(/class="upload-control"/gu) || []).length, 2);
  assert.match(panelStyles, /\.upload-control\.has-file/u);
  assert.match(panelStyles, /\.upload-control\.has-file:hover/u);
  assert.match(viewerStyles, /\.title-stage\.is-visible \.title-card\{transition-delay:var\(--duration\)\}/u);
});

test('publica la información contextual del proyecto en versión 1.1.0', () => {
  const info = fs.readFileSync(path.join(ROOT, 'public/index.html'), 'utf8');
  const manifest = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
  assert.match(info, /Títulos animados para OBS/u);
  assert.match(info, /Versión 1\.1\.0/u);
  assert.match(info, /Iván Bermúdez Regino/u);
  assert.equal(manifest.version, '1.1.0');
});
