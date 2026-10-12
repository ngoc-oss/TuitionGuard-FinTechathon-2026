import {build} from 'vite';
import {readFileSync,writeFileSync} from 'node:fs';
const result=await build({configFile:false,publicDir:false,logLevel:'warn',define:{'process.env.NODE_ENV':'"production"'},build:{write:false,minify:true,target:'es2020',lib:{entry:'scripts/offline-entry.tsx',name:'TuitionGuard',formats:['iife']},rollupOptions:{output:{inlineDynamicImports:true}}}});
const bundle=Array.isArray(result)?result[0]:result;
const js=bundle.output.find(x=>x.type==='chunk').code.replace(/<\/script/gi,'<\\/script');
const css='*{box-sizing:border-box}body{margin:0}button,input,select{font:inherit}'+readFileSync('app/judge.css','utf8');
writeFileSync('public/tuitionguard-offline.html','<!doctype html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>TuitionGuard — Offline Simulation</title><style>'+css+'</style></head><body><div id="root"></div><script>'+js+'</script></body></html>');
console.log('Self-contained offline demo built.');
