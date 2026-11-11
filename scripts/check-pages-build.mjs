import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,existsSync} from 'node:fs';
import {resolve,relative} from 'node:path';
const dist=resolve('dist'),html=readFileSync(resolve(dist,'index.html'),'utf8');
const manifest=JSON.parse(readFileSync(resolve(dist,'asset-manifest.json'),'utf8'));
function checkAsset(file){
 assert.ok(!file.startsWith('/')&&!/^(?:https?:|file:)/.test(file),'Assets must work in a repository subpath: '+file);
 const target=resolve(dist,file);
 assert.ok(!relative(dist,target).startsWith('..'),'Asset escapes dist');
 assert.ok(existsSync(target),'Missing built asset: '+file);
}
for(const [,file] of html.matchAll(/(?:src|href)="([^"#]+)"/g))checkAsset(file);
for(const [key,chunk] of Object.entries(manifest)){
 checkAsset(chunk.file);
 for(const file of [...(chunk.css||[]),...(chunk.assets||[])])checkAsset(file);
 for(const name of [...(chunk.imports||[]),...(chunk.dynamicImports||[])])assert.ok(manifest[name],'Missing chunk '+name+' from '+key);
}
// Preserve a ready-to-host folder for users who deploy static files directly.
writeFileSync(resolve(dist,'.nojekyll'),'');
console.log('PASS: relative entry/assets, complete lazy chunk graph, ready for GitHub Pages subpaths.');
