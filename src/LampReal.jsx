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
 psu:[.15,.04,.03],psuY:-.472,ctrl:[.034,.095,.018],ctrlY:-.3925,cordX:.12,buttonX:-.06,glow:'#8fbcff'};
function coverGeometry(w,h,t){
 // Outline with the cord notch; holes: 2 keyholes, 8 for the M4 screws, 6 for the acrylic standoffs.
 const s=new THREE.Shape(),n=.0045,x=L1.cordX;
 s.moveTo(-w/2,-h/2);s.lineTo(x-n,-h/2);s.lineTo(x-n,-h/2+.011);s.lineTo(x+n,-h/2+.011);s.lineTo(x+n,-h/2);s.lineTo(w/2,-h/2);s.lineTo(w/2,h/2);s.lineTo(-w/2,h/2);s.closePath();
 const round=(cx,cy,r)=>{const p=new THREE.Path();p.absarc(cx,cy,r,0,Math.PI*2,true);s.holes.push(p)};
 for(const sx of [-1,1]){ // L-shaped keyhole: enter, drop 12 mm, slide 8 mm
  const kx=sx*L1.keyX,y=L1.keyY,p=new THREE.Path();
  p.moveTo(kx-.003,y+.003);p.lineTo(kx+.011,y+.003);p.lineTo(kx+.011,y-.003);p.lineTo(kx+.003,y-.003);p.lineTo(kx+.003,y-.008);
  p.absarc(kx,y-.012,.006,Math.PI*.33,Math.PI*.67,true);p.lineTo(kx-.003,y-.008);p.closePath();s.holes.push(p);
  L1.tabs.forEach(ty=>round(sx*L1.tabX,ty,.00225));L1.press.forEach(py=>round(sx*L1.pressX,py,.00225));
 }
 return new THREE.ExtrudeGeometry(s,{depth:t,bevelEnabled:false,curveSegments:14});
}
// Tab on the shell's back edge with the hole for a rivet nut.
function tabGeometry(side){
 const a=(L1.tabD-L1.t)/2,b=L1.tabW/2,s=new THREE.Shape();s.moveTo(-a,-b);s.lineTo(a,-b);s.lineTo(a,b);s.lineTo(-a,b);s.closePath();
 const p=new THREE.Path();p.absarc(-side*.0009,0,.003,0,Math.PI*2,true);s.holes.push(p);
 return new THREE.ExtrudeGeometry(s,{depth:L1.t,bevelEnabled:false,curveSegments:14});
}
function Part({id,onSelect,children}){
 return <group onClick={e=>{if(e.delta>5)return;e.stopPropagation();onSelect(id)}} onPointerOver={e=>{e.stopPropagation();document.body.style.cursor='pointer'}} onPointerOut={()=>{document.body.style.cursor=''}}>{children}</group>;
}
function Wire({points,color='#d8d8d2',radius=.0011}){
 const g=useMemo(()=>new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p))),24,radius,8),[points,radius]);
 useEffect(()=>()=>g.dispose(),[g]);
 return <mesh geometry={g} dispose={null}><meshStandardMaterial color={color} roughness={.7}/></mesh>;
}
const hi=on=>on?'#335258':'#000';
const Steel=({on})=><meshPhysicalMaterial color="#cfd0cc" metalness={1} roughness={.42} anisotropy={.5} side={THREE.DoubleSide} emissive={hi(on)} emissiveIntensity={.06}/>;
const Alu=({on})=><meshStandardMaterial color="#c9ccce" metalness={1} roughness={.4} emissive={hi(on)} emissiveIntensity={.06}/>;
const Zinc=({on})=><meshStandardMaterial color={on?'#778c83':'#b9bcbb'} metalness={1} roughness={.3}/>;
export function RealLampModel({mode,explode,selected,onSelect,motion,onModelReady,lampLight=1,onLampButton}){
 const root=useRef(),shell=useRef(),acrylic=useRef(),light=useRef(),power=useRef(),cover=useRef(),fix=useRef(),wall=useRef(),halo=useRef();
 const {invalidate,gl}=useThree();
 const {width:w,height:h,depth}=dimensions.lamp,f=lampFront,t=L1.t,zc=f-depth; // zc — back edge of the shell, front face of the cover
 const face=useMemo(()=>faceGeometry(w,h,t),[w,h,t]),glow=useMemo(()=>glowTexture(w,h),[w,h]),plate=useMemo(()=>coverGeometry(w-.001,h-.001,L1.cover),[w,h]);
 const tabs=useMemo(()=>({'-1':tabGeometry(-1),'1':tabGeometry(1)}),[]);
 const wires=useMemo(()=>{const x=L1.buttonX,by=-h/2,P=[x,-.452,zc+.03];return {
  pigtail:[[x,by+.02,f-.035],[x,by+.034,f-.04],[x-.004,-.458,zc+.04],P],
  lead:[P,[x+.012,-.447,zc+.02],[-.03,-.44,zc+.012],[-.012,-.432,zc+.012]],
  feed:[[.02,L1.psuY+.02,zc+.012],[.024,-.447,zc+.008],[.008,-.436,zc+.01]],
  left:[[-.012,-.4,zc+.02],[-.03,-.405,zc+.012],[-L1.starX,-.422,zc+.006]],right:[[.012,-.4,zc+.02],[.03,-.405,zc+.012],[L1.starX,-.422,zc+.006]],
  cord:[[.075,L1.psuY,zc+.015],[.105,-.474,zc+.012],[L1.cordX,-.481,zc+.006],[L1.cordX,-.496,zc+.002],[L1.cordX,-.512,zc-.0035],[L1.cordX,-.74,zc-.0035]],P}},[h,f,zc]);
 useEffect(()=>()=>{face.dispose();glow.dispose();plate.dispose();tabs['-1'].dispose();tabs['1'].dispose()},[face,glow,plate,tabs]);
 useEffect(()=>{onModelReady?.(()=>root.current?.userData.arReady?root.current:null);return()=>onModelReady?.(null)},[onModelReady]);
 useEffect(()=>{gl.shadowMap.needsUpdate=true;invalidate()},[gl,invalidate,lampLight]);
 useFrame((_,delta)=>{
  const k=mode==='assembly'?1-Math.exp(-Math.min(delta,.05)*8):1,s=lampStages(mode==='assembly'?explode:0);let changed=false;
  const ease=(object,target)=>{const old=object.position.z;object.position.z=Math.abs(old-target)<.00001?target:THREE.MathUtils.lerp(old,target,k);changed ||= object.position.z!==old};
  root.current.position.y=mode==='scale'?-.75+h/2:0;
  ease(shell.current,s.shell*.3+s.acrylic*.1);ease(acrylic.current,s.acrylic*.2);ease(light.current,s.parts*.09);ease(power.current,s.parts*.05);ease(fix.current,-s.parts*.07);ease(wall.current,-s.parts*.14);
  halo.current.material.opacity=lampLight*Math.max(0,1-(shell.current.position.z-acrylic.current.position.z)/.03);
  root.current.userData.arReady=mode==='object'&&explode===0&&!changed;
  if(changed){motion.changedAt=performance.now();gl.shadowMap.needsUpdate=true;invalidate()}
 });
 const pick={onSelect},inner=depth-t,zm=f-t-inner/2,on=id=>selected===id,[pw,ph]=L1.profile,n=.0045,cx=L1.cordX;
 const press=e=>{if(e.delta>5)return;e.stopPropagation();onLampButton?.()};
 return <group ref={root}>
  <group ref={shell}><Part id="metal" {...pick}>
   <mesh geometry={face} dispose={null} position={[0,0,f]} castShadow receiveShadow><Steel on={on('metal')}/></mesh>
   {[-1,1].map(s=><React.Fragment key={s}>
    <mesh castShadow receiveShadow position={[s*(w/2-t/2),0,zm]}><boxGeometry args={[t,h,inner]}/><Steel on={on('metal')}/></mesh>
    {L1.tabs.map(y=><group key={y} position={[s*(w/2-t-(L1.tabD-t)/2),y,zc]}>
     <mesh geometry={tabs[s]} dispose={null}><Steel on={on('metal')}/></mesh>
     <mesh position={[-s*.0009,0,t+.0045]} rotation={[Math.PI/2,0,0]}><cylinderGeometry args={[.0034,.0034,.009,16,1,true]}/><meshStandardMaterial color="#aeb2b0" metalness={1} roughness={.35} side={THREE.DoubleSide}/></mesh>
    </group>)}
   </React.Fragment>)}
   <mesh castShadow receiveShadow position={[0,h/2-t/2,zm]}><boxGeometry args={[w-t*2,t,inner]}/><Steel on={on('metal')}/></mesh>
   {/* bottom side with the cord notch at the back edge */}
   <mesh castShadow receiveShadow position={[(-w/2+t+cx-n)/2,-h/2+t/2,zm]}><boxGeometry args={[cx-n+w/2-t,t,inner]}/><Steel on={on('metal')}/></mesh>
   <mesh castShadow receiveShadow position={[(cx+n+w/2-t)/2,-h/2+t/2,zm]}><boxGeometry args={[w/2-t-cx-n,t,inner]}/><Steel on={on('metal')}/></mesh>
   <mesh castShadow receiveShadow position={[cx,-h/2+t/2,zm+.0045]}><boxGeometry args={[n*2,t,inner-.009]}/><Steel on={on('metal')}/></mesh>
  </Part>
   {/* push button: head under the bottom side, body and pigtail inside */}
   <group onClick={press} onPointerOver={e=>{e.stopPropagation();document.body.style.cursor='pointer'}} onPointerOut={()=>{document.body.style.cursor=''}}>
    <mesh position={[L1.buttonX,-h/2-.002,f-.035]}><cylinderGeometry args={[.009,.009,.004,28]}/><meshStandardMaterial color="#8f9391" metalness={1} roughness={.3} emissive={L1.glow} emissiveIntensity={lampLight>0?.25:0}/></mesh>
    <mesh position={[L1.buttonX,-h/2+.011,f-.035]}><cylinderGeometry args={[.0078,.0078,.02,20]}/><meshStandardMaterial color="#6c706e" metalness={.9} roughness={.4}/></mesh>
   </group>
   <Wire points={wires.pigtail} color="#2b2c2b"/><mesh position={[wires.P[0],wires.P[1]+.004,wires.P[2]]}><boxGeometry args={[.008,.009,.006]}/><meshStandardMaterial color="#f1f1ec" roughness={.6}/></mesh>
   <mesh ref={halo} position={[0,0,f+.0006]} userData={{arSkip:true}} renderOrder={3}><planeGeometry args={[w,h]}/><meshBasicMaterial map={glow} transparent blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false}/></mesh>
  </group>
  <group ref={acrylic}><Part id="diffuser" {...pick}><mesh position={[0,0,f-t-L1.acrylic/2-.0003]}><boxGeometry args={[w-.006,h-.008,L1.acrylic]}/><meshStandardMaterial color={on('diffuser')?'#dff0ea':'#f1f4f8'} roughness={.92} emissive={L1.glow} emissiveIntensity={1.9*lampLight} userData={{glow:true}}/></mesh></Part></group>
  <group ref={light}><Part id="light" {...pick}>{[-1,1].map(s=><group key={s} position={[s*L1.starX,(L1.st[0]+L1.st[1])/2,zc]}>
   <mesh position={[0,0,.00075]}><boxGeometry args={[pw,L1.st[1]-L1.st[0],.0015]}/><Alu on={on('light')}/></mesh>
   {[-1,1].map(d=><mesh key={d} position={[d*(pw/2-.0006),0,ph/2]}><boxGeometry args={[.0012,L1.st[1]-L1.st[0],ph]}/><Alu on={on('light')}/></mesh>)}
   <mesh position={[0,0,.0024]}><boxGeometry args={[.008,L1.st[1]-L1.st[0]-.01,.0018]}/><meshStandardMaterial color="#fffdf2" roughness={.6} emissive={L1.glow} emissiveIntensity={1.6*lampLight} userData={{glow:true}}/></mesh>
  </group>)}</Part></group>
  <group ref={power}><Part id="power" {...pick}>
   <mesh castShadow position={[0,L1.psuY,zc+L1.psu[2]/2]}><boxGeometry args={L1.psu}/><meshStandardMaterial color={on('power')?'#778c83':'#9a9da0'} metalness={.8} roughness={.45}/></mesh>
   <mesh position={[0,L1.ctrlY,zc+L1.ctrl[2]/2]}><boxGeometry args={L1.ctrl}/><meshStandardMaterial color={on('power')?'#a9c1b7':'#ecece8'} roughness={.6}/></mesh>
   <mesh position={[cx,-.481,zc+.0045]}><boxGeometry args={[.012,.01,.009]}/><meshStandardMaterial color="#1c1d1c" roughness={.6}/></mesh>
   <Wire points={wires.cord} color="#ecece8" radius={.0031}/><Wire points={wires.feed} color="#c8322c"/><Wire points={wires.left}/><Wire points={wires.right}/><Wire points={wires.lead} color="#2b2c2b"/>
  </Part></group>
  <group ref={cover}><Part id="cover" {...pick}>
   <mesh geometry={plate} dispose={null} position={[0,0,zc-L1.cover]} castShadow receiveShadow><meshStandardMaterial color={on('cover')?'#a9c1b7':'#c4c6c5'} metalness={1} roughness={.45} side={THREE.DoubleSide}/></mesh>
   {L1.press.flatMap(y=>[-1,1].map(s=><group key={`${s}${y}`} position={[s*L1.pressX,y,0]}>
    <mesh position={[0,0,(zc+f-t-L1.acrylic-.008)/2]} rotation={[Math.PI/2,0,0]}><cylinderGeometry args={[.0035,.0035,depth-t-L1.acrylic-.008,12]}/><meshStandardMaterial color="#e6e5df" roughness={.6}/></mesh>
    <mesh position={[0,0,f-t-L1.acrylic-.004]} rotation={[Math.PI/2,0,0]}><cylinderGeometry args={[.005,.005,.008,16]}/><meshStandardMaterial color="#c9ccd0" roughness={.9}/></mesh>
   </group>))}
  </Part></group>
  <group ref={fix}><Part id="mount" {...pick}>
   {/* M4 × 8 screws: head behind the cover, shank through the cover into the rivet nut */}
   {[-1,1].flatMap(s=>L1.tabs.map(y=><group key={`${s}${y}`} position={[s*L1.tabX,y,zc-L1.cover]} rotation={[Math.PI/2,0,0]}>
    <mesh position={[0,-.001,0]}><cylinderGeometry args={[.0038,.0034,.002,18]}/><Zinc on={on('mount')}/></mesh>
    <mesh position={[0,.004,0]}><cylinderGeometry args={[.002,.002,.008,12]}/><Zinc on={on('mount')}/></mesh>
   </group>))}
   {[-1,1].flatMap(s=>[-1,1].map(q=><mesh key={`${s}${q}`} position={[s*.125,q*.478,zc-L1.cover-L1.bump/2]} rotation={[Math.PI/2,0,0]}><cylinderGeometry args={[.006,.006,L1.bump,16]}/><meshStandardMaterial color="#d9dadb" roughness={.9}/></mesh>))}
  </Part></group>
  <group ref={wall}><Part id="mount" {...pick}>{[-1,1].map(s=><group key={s} position={[s*L1.keyX,L1.keyY,0]}>
   <mesh position={[0,0,zc+.0016]} rotation={[Math.PI/2,0,0]}><cylinderGeometry args={[.0044,.0044,.003,16]}/><Zinc on={on('mount')}/></mesh>
   <mesh position={[0,0,zc-.012]} rotation={[Math.PI/2,0,0]}><cylinderGeometry args={[.0022,.0022,.03,12]}/><Zinc on={on('mount')}/></mesh>
  </group>)}</Part></group>
 </group>;
}
