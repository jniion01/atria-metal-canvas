import React,{useMemo,useRef,useEffect} from 'react';
import {useFrame,useThree} from '@react-three/fiber';
import * as THREE from 'three';
import {dimensions} from './dimensions';
import {lampFront,faceGeometry,glowTexture} from './Lamp';
import {lampStages} from './lampStages';
// ATRIA L1, production concept (rev. C): bent stainless shell, one opal sheet,
// and a screwed back cover that carries the light, the power supply and the
// keyhole hangers. Dimensions follow the engineering drawing, in metres.
export const L1={t:.0012,acrylic:.003,cover:.001,bump:.004,tabs:[.45,.15,-.15,-.45],tabW:.03,tabD:.013,tabX:.142,
 starX:.045,profile:[.0164,.007],st:[-.43,.47],keyX:.1,keyY:.42,press:[.4,0,-.4],pressX:.115,
 psu:[.15,.04,.03],psuY:-.472,ctrl:[.034,.095,.018],ctrlY:-.3925,cordX:.12};
function coverGeometry(w,h,t){
 const s=new THREE.Shape();s.moveTo(-w/2,-h/2);s.lineTo(w/2,-h/2);s.lineTo(w/2,h/2);s.lineTo(-w/2,h/2);s.closePath();
 for(const sx of [-1,1]){ // L-shaped keyhole: enter, drop 12 mm, slide 8 mm
  const x=sx*L1.keyX,y=L1.keyY,p=new THREE.Path();
  p.moveTo(x-.003,y+.003);p.lineTo(x+.011,y+.003);p.lineTo(x+.011,y-.003);p.lineTo(x+.003,y-.003);p.lineTo(x+.003,y-.008);
  p.absarc(x,y-.012,.006,Math.PI*.33,Math.PI*.67,true);p.lineTo(x-.003,y-.008);p.closePath();s.holes.push(p);
 }
 const g=new THREE.ExtrudeGeometry(s,{depth:t,bevelEnabled:false,curveSegments:16});return g;
}
function Part({id,onSelect,children}){
 return <group onClick={e=>{if(e.delta>5)return;e.stopPropagation();onSelect(id)}} onPointerOver={e=>{e.stopPropagation();document.body.style.cursor='pointer'}} onPointerOut={()=>{document.body.style.cursor=''}}>{children}</group>;
}
const hi=on=>on?'#335258':'#000';
const Steel=({on})=><meshPhysicalMaterial color="#cfd0cc" metalness={1} roughness={.42} anisotropy={.5} side={THREE.DoubleSide} emissive={hi(on)} emissiveIntensity={.06}/>;
const Alu=({on})=><meshStandardMaterial color="#c9ccce" metalness={1} roughness={.4} emissive={hi(on)} emissiveIntensity={.06}/>;
export function RealLampModel({mode,explode,selected,onSelect,motion,onModelReady}){
 const root=useRef(),shell=useRef(),acrylic=useRef(),light=useRef(),power=useRef(),cover=useRef(),fix=useRef(),wall=useRef(),halo=useRef();
 const {invalidate,gl}=useThree();
 const {width:w,height:h,depth}=dimensions.lamp,f=lampFront,t=L1.t,zc=f-depth; // zc — back edge of the shell, front face of the cover
 const face=useMemo(()=>faceGeometry(w,h,t),[w,h,t]),glow=useMemo(()=>glowTexture(w,h),[w,h]),plate=useMemo(()=>coverGeometry(w-.001,h-.001,L1.cover),[w,h]);
 useEffect(()=>()=>{face.dispose();glow.dispose();plate.dispose()},[face,glow,plate]);
 useEffect(()=>{onModelReady?.(()=>root.current?.userData.arReady?root.current:null);return()=>onModelReady?.(null)},[onModelReady]);
 useEffect(()=>{gl.shadowMap.needsUpdate=true;invalidate()},[gl,invalidate]);
 useFrame((_,delta)=>{
  const k=mode==='assembly'?1-Math.exp(-Math.min(delta,.05)*8):1,s=lampStages(mode==='assembly'?explode:0);let changed=false;
  const ease=(object,target)=>{const old=object.position.z;object.position.z=Math.abs(old-target)<.00001?target:THREE.MathUtils.lerp(old,target,k);changed ||= object.position.z!==old};
  root.current.position.y=mode==='scale'?-.75+h/2:0;
  ease(shell.current,s.shell*.3+s.acrylic*.1);ease(acrylic.current,s.acrylic*.2);ease(light.current,s.parts*.09);ease(power.current,s.parts*.05);ease(fix.current,-s.parts*.07);ease(wall.current,-s.parts*.14);
  halo.current.material.opacity=Math.max(0,1-(shell.current.position.z-acrylic.current.position.z)/.03);
  root.current.userData.arReady=mode==='object'&&explode===0&&!changed;
  if(changed){motion.changedAt=performance.now();gl.shadowMap.needsUpdate=true;invalidate()}
 });
 const pick={onSelect},inner=depth-t,zm=f-t-inner/2,on=id=>selected===id,[pw,ph]=L1.profile;
 return <group ref={root}>
  <group ref={shell}><Part id="metal" {...pick}>
   <mesh geometry={face} dispose={null} position={[0,0,f]} castShadow receiveShadow><Steel on={on('metal')}/></mesh>
   {[-1,1].map(s=><React.Fragment key={s}>
    <mesh castShadow receiveShadow position={[s*(w/2-t/2),0,zm]}><boxGeometry args={[t,h,inner]}/><Steel on={on('metal')}/></mesh>
    <mesh castShadow receiveShadow position={[0,s*(h/2-t/2),zm]}><boxGeometry args={[w-t*2,t,inner]}/><Steel on={on('metal')}/></mesh>
    {L1.tabs.map(y=><mesh key={y} position={[s*(w/2-t-(L1.tabD-t)/2),y,zc+t/2]}><boxGeometry args={[L1.tabD-t,L1.tabW,t]}/><Steel on={on('metal')}/></mesh>)}
   </React.Fragment>)}
   <mesh position={[-.06,-h/2-.0015,f-.035]}><cylinderGeometry args={[.008,.008,.003,24]}/><meshStandardMaterial color="#8f9391" metalness={1} roughness={.3}/></mesh>
   <mesh ref={halo} position={[0,0,f+.0006]} userData={{arSkip:true}} renderOrder={3}><planeGeometry args={[w,h]}/><meshBasicMaterial map={glow} transparent blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false}/></mesh>
  </Part></group>
  <group ref={acrylic}><Part id="diffuser" {...pick}><mesh position={[0,0,f-t-L1.acrylic/2-.0003]}><boxGeometry args={[w-.006,h-.008,L1.acrylic]}/><meshStandardMaterial color="#f4f7ff" roughness={.92} emissive={on('diffuser')?'#bfe6ff':'#d7e6ff'} emissiveIntensity={1.7} userData={{glow:true}}/></mesh></Part></group>
  <group ref={light}><Part id="light" {...pick}>{[-1,1].map(s=><group key={s} position={[s*L1.starX,(L1.st[0]+L1.st[1])/2,zc]}>
   <mesh position={[0,0,.00075]}><boxGeometry args={[pw,L1.st[1]-L1.st[0],.0015]}/><Alu on={on('light')}/></mesh>
   {[-1,1].map(d=><mesh key={d} position={[d*(pw/2-.0006),0,ph/2]}><boxGeometry args={[.0012,L1.st[1]-L1.st[0],ph]}/><Alu on={on('light')}/></mesh>)}
   <mesh position={[0,0,.0024]}><boxGeometry args={[.008,L1.st[1]-L1.st[0]-.01,.0018]}/><meshStandardMaterial color="#fffdf2" roughness={.6} emissive="#e6efff" emissiveIntensity={1.4} userData={{glow:true}}/></mesh>
  </group>)}</Part></group>
  <group ref={power}><Part id="power" {...pick}>
   <mesh castShadow position={[0,L1.psuY,zc+L1.psu[2]/2]}><boxGeometry args={L1.psu}/><meshStandardMaterial color={on('power')?'#778c83':'#9a9da0'} metalness={.8} roughness={.45}/></mesh>
   <mesh position={[0,L1.ctrlY,zc+L1.ctrl[2]/2]}><boxGeometry args={L1.ctrl}/><meshStandardMaterial color={on('power')?'#a9c1b7':'#ecece8'} roughness={.6}/></mesh>
   <mesh position={[L1.cordX,-.481,zc+.0045]}><boxGeometry args={[.012,.01,.009]}/><meshStandardMaterial color="#1c1d1c" roughness={.6}/></mesh>
   <mesh position={[L1.cordX,-h/2-.11,zc-.0035]}><cylinderGeometry args={[.0031,.0031,.24,12]}/><meshStandardMaterial color="#ecece8" roughness={.7}/></mesh>
  </Part></group>
  <group ref={cover}><Part id="cover" {...pick}>
   <mesh geometry={plate} dispose={null} position={[0,0,zc-L1.cover]} castShadow receiveShadow><meshStandardMaterial color={on('cover')?'#cfe3da':'#eeeeea'} roughness={.7} side={THREE.DoubleSide}/></mesh>
   {L1.press.flatMap(y=>[-1,1].map(s=><group key={`${s}${y}`} position={[s*L1.pressX,y,0]}>
    <mesh position={[0,0,(zc+f-t-L1.acrylic-.008)/2]} rotation={[Math.PI/2,0,0]}><cylinderGeometry args={[.0035,.0035,depth-t-L1.acrylic-.008,12]}/><meshStandardMaterial color="#e6e5df" roughness={.6}/></mesh>
    <mesh position={[0,0,f-t-L1.acrylic-.004]} rotation={[Math.PI/2,0,0]}><cylinderGeometry args={[.005,.005,.008,16]}/><meshStandardMaterial color="#c9ccd0" roughness={.9}/></mesh>
   </group>))}
  </Part></group>
  <group ref={fix}><Part id="mount" {...pick}>
   {[-1,1].flatMap(s=>L1.tabs.map(y=><mesh key={`${s}${y}`} position={[s*L1.tabX,y,zc-L1.cover-.001]} rotation={[Math.PI/2,0,0]}><cylinderGeometry args={[.0036,.0036,.002,16]}/><meshStandardMaterial color={on('mount')?'#778c83':'#b9bcbb'} metalness={1} roughness={.3}/></mesh>))}
   {[-1,1].flatMap(s=>[-1,1].map(q=><mesh key={`${s}${q}`} position={[s*.125,q*.478,zc-L1.cover-L1.bump/2]} rotation={[Math.PI/2,0,0]}><cylinderGeometry args={[.006,.006,L1.bump,16]}/><meshStandardMaterial color="#d9dadb" roughness={.9}/></mesh>))}
  </Part></group>
  <group ref={wall}><Part id="mount" {...pick}>{[-1,1].map(s=><group key={s} position={[s*L1.keyX,L1.keyY,0]}>
   <mesh position={[0,0,zc+.0016]} rotation={[Math.PI/2,0,0]}><cylinderGeometry args={[.0044,.0044,.003,16]}/><meshStandardMaterial color={on('mount')?'#778c83':'#b9bcbb'} metalness={1} roughness={.3}/></mesh>
   <mesh position={[0,0,zc-.012]} rotation={[Math.PI/2,0,0]}><cylinderGeometry args={[.0022,.0022,.03,12]}/><meshStandardMaterial color="#b9bcbb" metalness={1} roughness={.35}/></mesh>
  </group>)}</Part></group>
 </group>;
}
