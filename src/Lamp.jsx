import React,{useMemo,useRef,useEffect} from 'react';
import {useFrame,useThree} from '@react-three/fiber';
import * as THREE from 'three';
import {dimensions} from './dimensions';
// Night light: a 300 × 1000 × 70 mm aluminium box. A four-point star is cut
// through the face; an opal acrylic diffuser behind it is lit by an LED module.
export const lampFront=.012;
export function starSlit(w,h){
 // A thin blade that pinches into a small four-point star at the centre.
 const y=h*.44,x=w*.31,p=new THREE.Path();p.moveTo(0,y);
 for(const [sx,sy] of [[1,1],[1,-1],[-1,-1],[-1,1]]){
  const out=sx*sy>0; // alternate direction: tip → side point, then side point → tip
  const blade=[[.03*w,.3*h],[.045*w,.15*h],[.05*w,.055*h]],flare=[[.06*w,.02*h],[.14*w,.006*h],[x,0]];
  const q=([a,b])=>[a*sx,b*sy];
  if(out){p.bezierCurveTo(...q(blade[0]),...q(blade[1]),...q(blade[2]));p.bezierCurveTo(...q(flare[0]),...q(flare[1]),...q(flare[2]))}
  else{p.bezierCurveTo(...q(flare[1]),...q(flare[0]),...q(blade[2]));p.bezierCurveTo(...q(blade[1]),...q(blade[0]),0,y*sy)}
 }
 return p;
}
function faceGeometry(w,h,t){
 const s=new THREE.Shape();s.moveTo(-w/2,-h/2);s.lineTo(w/2,-h/2);s.lineTo(w/2,h/2);s.lineTo(-w/2,h/2);s.closePath();
 s.holes.push(starSlit(w,h));
 const g=new THREE.ExtrudeGeometry(s,{depth:t,bevelEnabled:false,curveSegments:40});g.translate(0,0,-t);return g;
}
// Soft bloom around the slit. Drawn once; shadowBlur works in every browser.
function glowTexture(w,h){
 const scale=512,c=document.createElement('canvas');c.width=Math.round(scale*w/h*2);c.height=scale*2;
 const x=c.getContext('2d'),k=c.height/h;x.fillStyle='#000';x.fillRect(0,0,c.width,c.height);
 const draw=()=>{x.beginPath();const pts=starSlit(w,h).getPoints(40);pts.forEach((p,i)=>x[i?'lineTo':'moveTo'](c.width/2+p.x*k,c.height/2-p.y*k-4000));x.closePath();x.fill()};
 x.shadowColor='#9fc2ff';x.shadowOffsetY=4000;
 for(const [blur,alpha] of [[90,.55],[40,.5],[14,.6]]){x.shadowBlur=blur;x.globalAlpha=alpha;draw()}
 const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;return t;
}
function Part({id,onSelect,children}){
 return <group onClick={e=>{if(e.delta>5)return;e.stopPropagation();onSelect(id)}} onPointerOver={e=>{e.stopPropagation();document.body.style.cursor='pointer'}} onPointerOut={()=>{document.body.style.cursor=''}}>{children}</group>;
}
const Body=({selected})=><meshPhysicalMaterial color="#d6d6d1" metalness={1} roughness={.52} side={THREE.DoubleSide} emissive={selected?'#335258':'#000'} emissiveIntensity={.06}/>;
export function LampModel({mode,explode,selected,onSelect,motion,onModelReady}){
 const root=useRef(),shell=useRef(),diffuser=useRef(),light=useRef(),back=useRef(),mount=useRef(),halo=useRef();
 const {invalidate,gl}=useThree();
 const {width:w,height:h,metal:t,depth}=dimensions.lamp,f=lampFront;
 const face=useMemo(()=>faceGeometry(w,h,t),[w,h,t]),glow=useMemo(()=>glowTexture(w,h),[w,h]);
 useEffect(()=>()=>{face.dispose();glow.dispose()},[face,glow]);
 useEffect(()=>{onModelReady?.(()=>root.current?.userData.arReady?root.current:null);return()=>onModelReady?.(null)},[onModelReady]);
 useEffect(()=>{gl.shadowMap.needsUpdate=true;invalidate()},[gl,invalidate]);
 useFrame((_,delta)=>{
  const k=mode==='assembly'?1-Math.exp(-Math.min(delta,.05)*8):1,d=mode==='assembly'?explode/100:0;let changed=false;
  const ease=(object,key,target)=>{const old=object[key];object[key]=Math.abs(old-target)<.00001?target:THREE.MathUtils.lerp(old,target,k);changed ||= object[key]!==old};
  root.current.position.y=mode==='scale'?-.75+h/2:0;
  ease(shell.current.position,'z',d*h*.26);ease(diffuser.current.position,'z',d*h*.06);ease(light.current.position,'z',-d*h*.1);ease(back.current.position,'z',-d*h*.22);ease(mount.current.position,'z',-d*h*.3);
  halo.current.material.opacity=Math.max(0,1-shell.current.position.z/(h*.04));
  root.current.userData.arReady=mode==='object'&&explode===0&&!changed;
  if(changed){motion.changedAt=performance.now();gl.shadowMap.needsUpdate=true;invalidate()}
 });
 const pick={onSelect},inner=depth-t,zc=f-t-inner/2;
 return <group ref={root}>
  <group ref={shell}><Part id="metal" {...pick}>
   <mesh geometry={face} dispose={null} position={[0,0,f]} castShadow receiveShadow><Body selected={selected==='metal'}/></mesh>
   {[-1,1].map(s=><React.Fragment key={s}>
    <mesh castShadow receiveShadow position={[s*(w/2-t/2),0,zc]}><boxGeometry args={[t,h,inner]}/><Body selected={selected==='metal'}/></mesh>
    <mesh castShadow receiveShadow position={[0,s*(h/2-t/2),zc]}><boxGeometry args={[w-t*2,t,inner]}/><Body selected={selected==='metal'}/></mesh>
   </React.Fragment>)}
   <mesh ref={halo} position={[0,0,f+.0006]} userData={{arSkip:true}} renderOrder={3}><planeGeometry args={[w,h]}/><meshBasicMaterial map={glow} transparent blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false}/></mesh>
  </Part></group>
  <group ref={diffuser}><Part id="diffuser" {...pick}><mesh position={[0,0,f-t-.0025]}><boxGeometry args={[w-t*2-.004,h-t*2-.004,.003]}/><meshStandardMaterial color="#f4f7ff" roughness={.92} emissive={selected==='diffuser'?'#bfe6ff':'#d7e6ff'} emissiveIntensity={1.7} userData={{glow:true}}/></mesh></Part></group>
  <group ref={light}><Part id="light" {...pick}>
   <mesh position={[0,0,f-depth+.012]}><boxGeometry args={[w*.5,h*.9,.004]}/><meshStandardMaterial color={selected==='light'?'#778c83':'#8d918d'} metalness={.9} roughness={.5}/></mesh>
   {[-1,1].map(s=><mesh key={s} position={[s*w*.09,0,f-depth+.0148]}><boxGeometry args={[.008,h*.86,.0016]}/><meshStandardMaterial color="#fffdf2" roughness={.6} emissive="#e6efff" emissiveIntensity={1.2} userData={{glow:true}}/></mesh>)}
  </Part></group>
  <group ref={back}><Part id="back" {...pick}><mesh castShadow position={[0,0,f-depth+.0015]}><boxGeometry args={[w-t*2-.002,h-t*2-.002,.003]}/><meshStandardMaterial color={selected==='back'?'#778c83':'#414740'} roughness={.8}/></mesh></Part></group>
  <group ref={mount}><Part id="mount" {...pick}>
   <mesh castShadow position={[0,h*.36,f-depth-.004]}><boxGeometry args={[w*.6,.02,.008]}/><meshStandardMaterial color={selected==='mount'?'#778c83':'#aab0ac'} metalness={1} roughness={.3}/></mesh>
   {[-1,1].map(s=><mesh key={s} position={[s*(w/2-.03),-h*.42,f-depth-.004]} rotation={[Math.PI/2,0,0]}><cylinderGeometry args={[.007,.007,.008,16]}/><meshStandardMaterial color="#222820" roughness={1}/></mesh>)}
  </Part></group>
 </group>;
}
