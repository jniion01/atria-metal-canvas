import * as THREE from 'three';
import {sheetSpec,foldedAssembly} from './forming.js';
import {flangeLayouts,panelPolygons} from './sheetMetal.js';
export {foldedAssembly};

// Exact developed length of the neutral surface stays constant during bending.
export function bendPoint(u,v,skin,theta,s,f){
 const delta=skin-s.k*s.t,neutralZ=-(1-s.k)*s.t;
 let x,z,alpha;
 if(theta<1e-8){x=u;z=skin-s.t;alpha=0}
 else{
  const q=Math.min(u,s.allowance),N=s.allowance/theta;alpha=theta*q/s.allowance;
  x=(N+delta)*Math.sin(alpha);z=neutralZ-N*(1-Math.cos(alpha))+delta*Math.cos(alpha);
  if(u>s.allowance){x+=(u-s.allowance)*Math.cos(theta);z-=(u-s.allowance)*Math.sin(theta)}
 }
 return {position:[f.origin[0]+f.out[0]*x+f.tangent[0]*v,f.origin[1]+f.out[1]*x+f.tangent[1]*v,z],alpha};
}
function plateGeometry(polygons,s){
 // Explicit caps avoid the upstream ExtrudeGeometry no-bevel cap regression.
 const positions=[],normals=[],uv=[];
 const vertex=(p,z,n)=>{positions.push(p.x,p.y,z);normals.push(...n);uv.push(p.x/s.w+.5,p.y/s.h+.5)};
 for(const poly of polygons){
  const rings=poly.map(r=>r.slice(0,-1).map(([x,y])=>new THREE.Vector2(x,y)));
  const triangles=THREE.ShapeUtils.triangulateShape(rings[0],rings.slice(1)),points=rings.flat();
  for(const indices of triangles){
   let [a,b,c]=indices.map(i=>points[i]);
   if((b.x-a.x)*(c.y-a.y)-(b.y-a.y)*(c.x-a.x)<0)[b,c]=[c,b];
   [a,b,c].forEach(p=>vertex(p,0,[0,0,1]));
   [c,b,a].forEach(p=>vertex(p,-s.t,[0,0,-1]));
  }
  for(const ring of rings)for(let i=0;i<ring.length;i++){
   const a=ring[i],b=ring[(i+1)%ring.length],length=a.distanceTo(b);
   if(length<1e-12)continue;
   const n=[(b.y-a.y)/length,(a.x-b.x)/length,0];
   [[a,0],[a,-s.t],[b,-s.t],[a,0],[b,-s.t],[b,0]].forEach(([p,z])=>vertex(p,z,n));
  }
 }
 const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));g.setAttribute('normal',new THREE.Float32BufferAttribute(normals,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));return g;
}
function flangeGeometry(s,f){
 const p=[],n=[],uv=[];
 const vertex=(a,normal)=>{p.push(...a);n.push(...normal);const q=bendPoint(...a,0,s,f).position;uv.push(q[0]/s.w+.5,q[1]/s.h+.5)};
 const quad=(a,b,c,d,normal)=>{const cross=new THREE.Vector3().crossVectors(new THREE.Vector3().subVectors(new THREE.Vector3(...b),new THREE.Vector3(...a)),new THREE.Vector3().subVectors(new THREE.Vector3(...c),new THREE.Vector3(...a)));
  if(cross.dot(new THREE.Vector3(...normal))<0)[b,d]=[d,b];
  [a,b,c,a,c,d].forEach(v=>vertex(v,normal));
 };
 const {allowance:A,extension:E,t}=s,{rootHalf:B,endHalf:C}=f,steps=16;
 function slab(a,b,half){
  quad([a,-half,t],[b,-half,t],[b,half,t],[a,half,t],[0,0,1]);
  quad([a,-half,0],[a,half,0],[b,half,0],[b,-half,0],[0,0,-1]);
  for(const side of [-1,1])quad([a,side*half,0],[b,side*half,0],[b,side*half,t],[a,side*half,t],[0,side,0]);
 }
 for(let j=0;j<steps;j++)slab(A*j/steps,A*(j+1)/steps,B);
 slab(A,E,C);
 for(const side of [-1,1])quad([A,side*B,0],[A,side*C,0],[A,side*C,t],[A,side*B,t],[-1,0,0]);
 quad([E,-C,0],[E,C,0],[E,C,t],[E,-C,t],[1,0,0]);
 quad([0,-B,0],[0,-B,t],[0,B,t],[0,B,0],[-1,0,0]);
 const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(p,3));geo.setAttribute('normal',new THREE.Float32BufferAttribute(n,3));geo.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));
 const originalP=p.slice(),originalN=n.slice();
 function update(fold){
  const theta=fold*Math.PI/2,pos=geo.attributes.position,norm=geo.attributes.normal;
  for(let i=0;i<pos.count;i++){
   const j=i*3,point=bendPoint(originalP[j],originalP[j+1],originalP[j+2],theta,s,f),c=Math.cos(point.alpha),a=Math.sin(point.alpha),du=originalN[j],dv=originalN[j+1],dz=originalN[j+2],radial=du*c+dz*a;
   pos.setXYZ(i,...point.position);norm.setXYZ(i,f.out[0]*radial+f.tangent[0]*dv,f.out[1]*radial+f.tangent[1]*dv,-du*a+dz*c);
  }
  pos.needsUpdate=true;norm.needsUpdate=true;geo.computeBoundingSphere();
 }
 update(1);return {id:f.id,pair:f.pair,geometry:geo,update};
}
export function createFoldedGeometry(pattern,w,h,t,depth){
 const spec=sheetSpec(w,h,t,depth),polygons=panelPolygons(pattern,spec),face=plateGeometry(polygons,spec),flanges=flangeLayouts(spec).map(f=>flangeGeometry(spec,f));
 return {face,flanges,spec,polygons,update(fold){flanges.forEach(f=>f.update(fold[f.pair]))},dispose(){face.dispose();flanges.forEach(f=>f.geometry.dispose())}};
}
