import {defineConfig} from 'vite';

export default defineConfig({
 // Works both at username.github.io/ and username.github.io/repository/.
 base:'./',
 build:{
  manifest:'asset-manifest.json',
  rollupOptions:{output:{manualChunks(id){
   // Keep the shared renderer in one chunk. Exporters and optional addons stay
   // with AR/photo imports instead of inflating the first 3D download.
   const file=id.replaceAll('\\','/');
   if(file.includes('/node_modules/three/build/')||file.includes('/node_modules/three/src/'))return 'three-core';
  }}},
  chunkSizeWarningLimit:1000
 }
});
