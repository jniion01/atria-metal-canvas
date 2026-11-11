import assert from 'node:assert/strict';
import {PerspectiveCamera,Vector3} from 'three';
import {viewRadius,fitDistance,safeView,inspectionDistance,resizedDistance} from '../src/viewFraming.js';
import {arMessage,configurationLink} from '../src/arState.js';
let checks=0;
for(const [width,height] of [[320,440],[390,648],[430,736],[683,860],[800,644],[1366,768]])for(const mode of ['object','detail','assembly','scale'])for(const format of ['a3','large'])for(const folded of [false,true]){
 const safe=safeView(width,height,mode==='detail'?185:145,mode==='assembly'?245:110),r=viewRadius(format,mode,folded),d=fitDistance(r,width,height,safe);
 const close=inspectionDistance(format,mode);
 assert.ok(close<d/3,'close inspection must allow more than 3x the fitted view');
 const camera=new PerspectiveCamera(34,width/height,.015,30);
 camera.setViewOffset(width,height,width/2-(safe.x+safe.width/2),height/2-(safe.y+safe.height/2),width,height);
 camera.position.set(-.42,.12,1).normalize().multiplyScalar(d);camera.lookAt(0,0,0);camera.updateMatrixWorld();
 for(let i=0;i<1000;i++){
  const y=1-2*i/999,a=i*2.399963229728653,p=new Vector3(Math.cos(a)*Math.sqrt(1-y*y),y,Math.sin(a)*Math.sqrt(1-y*y)).multiplyScalar(r).project(camera);
  const x=(p.x+1)*width/2,py=(1-p.y)*height/2;
  assert.ok(x>=safe.x-.01&&x<=safe.x+safe.width+.01&&py>=safe.y-.01&&py<=safe.y+safe.height+.01,`${mode} fits ${width}x${height}`);
 }checks++;
}
assert.equal(resizedDistance(.25,1,1.2,.065,4),.3,'resize preserves relative close zoom');
assert.equal(resizedDistance(.25,1,1,.065,4),.25,'UI reflow cannot snap back to the fitted view');
assert.equal(resizedDistance(.04,1,.5,.065,4),.065,'physical near limit is respected');
assert.match(arMessage('session-started').title,/Ищем/);
assert.match(arMessage('object-placed').title,/размещена/);
assert.match(arMessage('object-placed','not-tracking').title,/Восстанавливаем/);
assert.match(arMessage('failed').text,/разрешение/);
const config={format:'large',construction:'folded',pattern:'11',fabric:'linen',background:'blue',engraving:'pixels'};
assert.deepEqual(JSON.parse(new URL(configurationLink(config,'https://example.com/atria/')).searchParams.get('view')),config);
console.log(`PASS: ${checks} viewport/format/construction combinations, 96000 sphere projections; truthful AR states; configuration link round-trip.`);
