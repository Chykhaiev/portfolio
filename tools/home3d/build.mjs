import { createRequire } from 'node:module';
const require = createRequire('/opt/npm-tools/node_modules/');
const esbuild = require('esbuild');
const V = '/home/claude/vendor';
await esbuild.build({
  entryPoints: [new URL('./main.js', import.meta.url).pathname],
  bundle: true, minify: true, format: 'esm', target: 'es2020',
  outfile: '/home/claude/portfolio/home3d.js', legalComments: 'none', logLevel: 'error',
  plugins: [{ name: 'v', setup(b) { b.onResolve({ filter: /^lenis$/ }, () => ({ path: `${V}/lenis/packages/core/index.ts` })); b.onResolve({ filter: /^three$/ }, () => ({ path: `${V}/three/build/three.module.js` })); b.onResolve({ filter: /^three\/addons\// }, (a) => ({ path: `${V}/three/examples/jsm/${a.path.slice(13)}` })); } }],
});
console.log('ok');
// cache-busting: stamp the bundle and stylesheet versions into the page, so a normal reload picks up new builds
import fs from 'node:fs'; import crypto from 'node:crypto';
const h = (f) => crypto.createHash('md5').update(fs.readFileSync(f)).digest('hex').slice(0, 8);
const page = '/home/claude/portfolio/new/index.html';
let html = fs.readFileSync(page, 'utf8');
html = html.replace(/\/home3d\.js(\?v=\w+)?/, `/home3d.js?v=${h('/home/claude/portfolio/home3d.js')}`)
  .replace(/\/home\.css(\?v=\w+)?/, `/home.css?v=${h('/home/claude/portfolio/home.css')}`)
  .replace(/\/styles\.css(\?v=\w+)?/, `/styles.css?v=${h('/home/claude/portfolio/styles.css')}`);
fs.writeFileSync(page, html);
