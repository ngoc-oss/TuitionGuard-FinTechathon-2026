import { build } from 'vite';
import { readFileSync, writeFileSync } from 'node:fs';
const result = await build({ configFile: false, publicDir: false, logLevel: 'warn', define: { 'process.env.NODE_ENV': '"production"' }, build: { write: false, minify: true, target: 'es2020', lib: { entry: 'scripts/offline-entry.tsx', name: 'TuitionGuard', formats: ['iife'] }, rollupOptions: { output: { inlineDynamicImports: true } } } });
const bundle = Array.isArray(result) ? result[0] : result;
const rawJs = bundle.output.find(x => x.type === 'chunk').code.replace(/<\/script/gi, '<\\/script');
const js = rawJs.replace(/;(?=[a-zA-Z_$])/g, ';\n');
const css = '*{box-sizing:border-box}body{margin:0}button,input,select{font:inherit}\n' + readFileSync('app/judge.css', 'utf8');
writeFileSync('public/tuitionguard-offline.html', '<!doctype html>\n<html lang="en">\n<head>\n<meta charset="UTF-8">\n<meta name="viewport" content="width=device-width, initial-scale=1">\n<title>TuitionGuard — Offline Simulation</title>\n<style>\n' + css + '\n</style>\n</head>\n<body>\n<div id="root"></div>\n<script>\n' + js + '\n</script>\n</body>\n</html>\n');
console.log('Self-contained offline demo built.');
