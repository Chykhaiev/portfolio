import { createRequire } from 'node:module';
const require = createRequire('/opt/npm-tools/node_modules/');
const esbuild = require('esbuild');
const V = '/home/claude/vendor';
await esbuild.build({
  entryPoints: [new URL('./main.js', import.meta.url).pathname],
  bundle: true, minify: true, format: 'esm', target: 'es2020',
  outfile: '/home/claude/portfolio/home3d.js', legalComments: 'none', logLevel: 'error',
  plugins: [{ name: 'v', setup(b) { b.onResolve({ filter: /^three$/ }, () => ({ path: `${V}/three/build/three.module.js` })); } }],
});
console.log('ok');
