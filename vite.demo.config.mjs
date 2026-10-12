import {defineConfig} from 'vite';
import react from '@vitejs/plugin-react';
import {fileURLToPath} from 'node:url';
export default defineConfig({root:fileURLToPath(new URL('./local-demo/',import.meta.url)),publicDir:fileURLToPath(new URL('./public/',import.meta.url)),plugins:[react()],server:{host:'127.0.0.1',port:5173,strictPort:true},preview:{host:'127.0.0.1',port:4173,strictPort:true},build:{outDir:fileURLToPath(new URL('./dist-demo/',import.meta.url)),emptyOutDir:true}});
