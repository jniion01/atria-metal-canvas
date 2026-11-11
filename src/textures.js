import * as THREE from 'three';
import {drawPatternEngraving} from './patternEngraving';
export function metalTexture(style='ascii',channel='color',patternId='04'){
 const canvas=document.createElement('canvas');canvas.width=1024;canvas.height=1434;const c=canvas.getContext('2d');
 c.fillStyle=channel==='color'?'#d8dad6':'#c8c8c8';c.fillRect(0,0,canvas.width,canvas.height);
 // Low-contrast, broad satin grain: avoids subpixel stripes and specular moiré.
 if(channel==='color'){let seed=84;const rnd=()=>{seed=seed*16807%2147483647;return seed/2147483647};for(let i=0;i<700;i++){c.strokeStyle=i%3?'rgba(255,255,255,.022)':'rgba(80,84,80,.018)';c.lineWidth=.7+rnd()*.6;const y=rnd()*1434;c.beginPath();c.moveTo(0,y);c.lineTo(1024,y);c.stroke()}}
 c.save();c.scale(canvas.width/300,canvas.height/420);
 drawPatternEngraving(c,patternId,style,{ink:channel==='color'?'#535a55':'#fafafa'});
 c.restore();const t=new THREE.CanvasTexture(canvas);t.colorSpace=channel==='color'?THREE.SRGBColorSpace:THREE.NoColorSpace;t.flipY=true;t.anisotropy=8;t.minFilter=THREE.LinearMipmapLinearFilter;t.magFilter=THREE.LinearFilter;return t;
}
export function fabricTextures(kind='linen',macro=false){
 const canvas=document.createElement('canvas');canvas.width=canvas.height=256;const c=canvas.getContext('2d');c.fillStyle='#777';c.fillRect(0,0,256,256);
 const step=16;
 for(let y=0;y<256;y+=step)for(let x=0;x<256;x+=step){
  const horizontal=(x/step+y/step)%2===0;
  const g=c.createLinearGradient(x,y,horizontal?x:x+step,horizontal?y+step:y);
  g.addColorStop(0,'#454545');g.addColorStop(.2,'#999');g.addColorStop(.48,kind==='linen'?'#e5e5e5':'#c8c8c8');g.addColorStop(.78,'#929292');g.addColorStop(1,'#454545');c.fillStyle=g;c.fillRect(x+1,y+1,step-1,step-1);
  for(let j=3;j<15;j+=3){c.strokeStyle=`rgba(255,255,255,${kind==='linen'?.12:.07})`;c.lineWidth=.6;c.beginPath();c.moveTo(x+(horizontal?0:j),y+(horizontal?j:0));c.lineTo(x+(horizontal?16:j+.5),y+(horizontal?j+.5:16));c.stroke()}
 }
 if(kind==='linen'){let s=65;for(let i=0;i<2800;i++){s=s*16807%2147483647;const x=s%256;s=s*16807%2147483647;const y=s%256;c.fillStyle=i%2?'#fff2':'#0002';c.fillRect(x,y,1,2)}}
 const bump=new THREE.CanvasTexture(canvas);bump.wrapS=bump.wrapT=THREE.RepeatWrapping;const n=macro?(kind==='linen'?2.4:3.8):kind==='linen'?13:20;bump.repeat.set(n,n*1.414);bump.anisotropy=4;
 const albedoCanvas=document.createElement('canvas');albedoCanvas.width=albedoCanvas.height=256;const a=albedoCanvas.getContext('2d');a.fillStyle='#ddd';a.fillRect(0,0,256,256);a.globalAlpha=.22;a.drawImage(canvas,0,0);
 const map=new THREE.CanvasTexture(albedoCanvas);map.wrapS=map.wrapT=THREE.RepeatWrapping;map.repeat.copy(bump.repeat);map.colorSpace=THREE.SRGBColorSpace;map.anisotropy=4;return {bump,map};
}

const metalCache=new Map(),fabricCache=new Map();
export function getMetalMaps(style,macro=false,patternId='04'){
 const key=patternId+':'+style;
 if(metalCache.has(key)){const value=metalCache.get(key);metalCache.delete(key);metalCache.set(key,value);return value}
 const map=metalTexture(style,'color',patternId),roughness=metalTexture(style,'roughness',patternId),value={map,roughness};
 metalCache.set(key,value);
 // Keep the active maps and two recent configurations, not 7 × 2 full-size atlases.
 if(metalCache.size>3){const first=metalCache.keys().next().value,old=metalCache.get(first);old.map.dispose();old.roughness.dispose();metalCache.delete(first)}
 return value;
}
export function getFabricMaps(kind,macro=false){const key=kind+macro;if(!fabricCache.has(key))fabricCache.set(key,fabricTextures(kind,macro));return fabricCache.get(key)}
let studioEnv,plaster;
export function getStudioEnvironment(){
 if(studioEnv)return studioEnv;
 const w=512,h=256,data=new Float32Array(w*h*4);
 const soft=(v,a,b)=>{const x=Math.max(0,Math.min(1,(v-a)/(b-a)));return x*x*(3-2*x)};
 for(let y=0;y<h;y++)for(let x=0;x<w;x++){
  const u=x/w,v=y/h;
  const key=(1-soft(Math.abs(u-.18),.055,.095))*(1-soft(Math.abs(v-.49),.14,.2));
  const strip=(1-soft(Math.abs(u-.64),.018,.038))*(1-soft(Math.abs(v-.48),.21,.25));
  const fill=Math.max(0,1-Math.hypot((u-.82)*5,(v-.25)*4));
  const ambient=.045+.13*Math.max(0,1-v*1.3),i=(y*w+x)*4;
  data[i]=ambient+key*2.6+strip*1.65+fill*.5;data[i+1]=ambient+key*2.5+strip*1.75+fill*.55;data[i+2]=ambient+key*2.35+strip*1.9+fill*.7;data[i+3]=1;
 }
 studioEnv=new THREE.DataTexture(data,w,h,THREE.RGBAFormat,THREE.FloatType);studioEnv.mapping=THREE.EquirectangularReflectionMapping;studioEnv.needsUpdate=true;return studioEnv;
}
export function getPlaster(){
 if(plaster)return plaster;const n=128,data=new Uint8Array(n*n*4);let s=77;for(let i=0;i<n*n;i++){s=s*16807%2147483647;const v=115+(s%25);data.set([v,v,v,255],i*4)}plaster=new THREE.DataTexture(data,n,n);plaster.wrapS=plaster.wrapT=THREE.RepeatWrapping;plaster.repeat.set(24,24);plaster.needsUpdate=true;return plaster;
}
