const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const requiredFiles = [
  'public/index.html',
  'public/panel/index.html',
  'public/visualizador/index.html',
  'public/assets/css/panel.css',
  'public/assets/css/titles.css',
  'public/assets/js/panel.js',
  'public/assets/js/titles.js'
];

function validateBuild() {
  const missing = requiredFiles.filter(file => !fs.existsSync(path.join(ROOT, file)));
  if (missing.length) throw new Error(`Faltan recursos públicos: ${missing.join(', ')}`);
  return requiredFiles.length;
}

if (require.main === module) {
  console.log(`Sitio estático validado: ${validateBuild()} recursos.`);
}

module.exports = { requiredFiles, validateBuild };
