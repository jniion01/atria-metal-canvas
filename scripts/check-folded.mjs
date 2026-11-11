import assert from 'node:assert/strict';
import * as THREE from 'three';
import pc from 'polygon-clipping';
import {patterns} from '../src/artwork.js';
import {dimensions} from '../src/dimensions.js';
import {createFoldedGeometry,bendPoint} from '../src/foldedGeometry.js';
import {foldedAssembly,sheetSpec} from '../src/forming.js';
import {blankPolygons,flangeLayouts,flangeOutline,flatDrawing} from '../src/sheetMetal.js';
const area=poly=>Math.abs(poly.slice(1).reduce((sum,p,i)=>sum+poly[i][0]*p[1]-p[0]*poly[i][1],0)/2);
for(const format of ['a3','large']){
 const d=dimensions[format],s=sheetSpec(d.width,d.height,d.metal,format==='a3'?.024:.04);
 assert.ok(Math.abs(s.allowance-Math.PI/2*(s.radius+s.k*s.t))<1e-12);
 assert.ok(s.allowance>s.outerRadius,'Flat corner ears do not overlap neighbouring bend zones');
 const layouts=flangeLayouts(s);
 for(let i=0;i<4;i++)for(let j=i+1;j<4;j++)assert.equal(pc.intersection(flangeOutline(s,layouts[i]),flangeOutline(s,layouts[j])).length,0,'No overlaps in the flat blank');
 for(const pattern of patterns){
  assert.equal(pattern.folded.polygons.length,1,'Retaining bridges attach all metal islands: '+pattern.id);
  for(const hole of pattern.folded.polygons[0].slice(1))for(const [x,y] of hole){assert.ok(x>=20&&x<=280&&y>=22&&y<=398,'All cutouts stay away from outer bends: '+pattern.id)}
  const shell=createFoldedGeometry(pattern,s.w,s.h,s.t,s.depth),blank=blankPolygons(pattern,s);
  assert.equal(blank.length,1,'One connected blank, including all four flanges: '+pattern.id);
  assert.equal(shell.flanges.length,4,'Only outer rectangular flanges');
  // Both full caps must cover exactly the polygon area, not merely the thin cut walls.
  const pos=shell.face.attributes.position,norm=shell.face.attributes.normal;let frontArea=0,backArea=0;
  for(let i=0;i<pos.count;i+=3){const a=Math.abs((pos.getX(i+1)-pos.getX(i))*(pos.getY(i+2)-pos.getY(i))-(pos.getX(i+2)-pos.getX(i))*(pos.getY(i+1)-pos.getY(i)))/2;if(norm.getZ(i)>.9)frontArea+=a;if(norm.getZ(i)<-.9)backArea+=a;}
  const expected=shell.polygons.reduce((sum,p)=>sum+area(p[0])-p.slice(1).reduce((x,h)=>x+area(h),0),0);
  assert.ok(frontArea>s.w*s.h*.08,'Metal front cap is present');
  assert.ok(Math.abs(frontArea-expected)<expected*1e-5,'Front cap equals the complete sheet minus apertures');
  assert.ok(Math.abs(backArea-expected)<expected*1e-5,'Rear cap equals the complete sheet minus apertures');
  const fixed=Array.from(shell.face.attributes.position.array),initial=shell.flanges.map(f=>Array.from(f.geometry.attributes.position.array));
  for(const value of [0,45,60,72,85,100,85,72,60,45,0]){
   const progress=foldedAssembly(value);shell.update(progress.fold);
   assert.deepEqual(Array.from(shell.face.attributes.position.array),fixed,'Cutout edges never bend');
   for(const f of shell.flanges){
    assert.ok(f.geometry.attributes.position.array.every(Number.isFinite));
    f.geometry.computeBoundingBox();const b=f.geometry.boundingBox;
    if(value===100){assert.ok(Math.abs(b.max.z)<1e-7&&Math.abs(b.min.z+s.t)<1e-7,'Flat sheet thickness preserved')}
    if(value===0){assert.ok(Math.abs(b.min.z+s.depth)<1e-7,'Finished wall height')}
   }
  }
  shell.flanges.forEach((f,i)=>assert.deepEqual(Array.from(f.geometry.attributes.position.array),initial[i],'No cumulative rotation or geometry drift'));
  assert.ok(flatDrawing(pattern,format).includes('id="BEND"'));
  console.log(format+' / '+pattern.id+': connected blank, '+pattern.folded.bridges+' bridges, fixed aperture edges, four repeatable flanges');
  shell.dispose();
 }
 // Collision check along the actual sequential timeline, including intermediate angles.
 const shell=createFoldedGeometry(patterns.find(p=>p.id==='11'),s.w,s.h,s.t,s.depth);
 const triangles=g=>{const p=g.attributes.position,a=[];for(let i=0;i<p.count;i+=3){const v=[0,1,2].map(j=>new THREE.Vector3().fromBufferAttribute(p,i+j));a.push({v,box:new THREE.Box3().setFromPoints(v)})}return a};
 const ray=new THREE.Ray(),hit=new THREE.Vector3(),direction=new THREE.Vector3();
 function intersects(a,b){
  if(!a.box.intersectsBox(b.box))return false;
  for(const [x,y] of [[a,b],[b,a]])for(let k=0;k<3;k++){
   const start=x.v[k],end=x.v[(k+1)%3],length=start.distanceTo(end);if(length<1e-10)continue;
   direction.subVectors(end,start).normalize();ray.set(start,direction);
   if(ray.intersectTriangle(...y.v,false,hit)&&hit.distanceTo(start)>1e-7&&hit.distanceTo(start)<length-1e-7)return true;
  }
  return false;
 }
 for(let value=45;value<=100;value+=1.25){
  const fold=foldedAssembly(value).fold;
  assert.ok(fold.long===1||fold.short===0,'Unfold side walls before end walls');
  shell.update(fold);const tris=shell.flanges.map(f=>triangles(f.geometry));
  for(let i=0;i<4;i++)for(let j=i+1;j<4;j++)for(const a of tris[i])for(const b of tris[j])assert.ok(!intersects(a,b),'Flange intersection at '+format+' / '+value+' / '+i+':'+j);
 }
 // Numerically integrate the neutral bend arc; its length must equal BA at every angle.
 for(const theta of [.01,.2,.8,Math.PI/2]){
  let length=0,prev;for(let j=0;j<=1000;j++){const p=new THREE.Vector3(...bendPoint(s.allowance*j/1000,0,s.k*s.t,theta,s,layouts[0]).position);if(prev)length+=p.distanceTo(prev);prev=p}
  assert.ok(Math.abs(length-s.allowance)<1e-8,'Neutral-axis length changes during bending');
 }
 shell.dispose();console.log(format+': collision-free sequential folds; neutral-axis bend allowance preserved');
}
