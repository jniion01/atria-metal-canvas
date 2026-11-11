import React,{useMemo,useRef,useEffect,Component} from 'react';
import {Canvas,useFrame,useThree} from '@react-three/fiber';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import * as THREE from 'three';
import {SVGLoader} from 'three/addons/loaders/SVGLoader.js';
import {RectAreaLightUniformsLib} from 'three/addons/lights/RectAreaLightUniformsLib.js';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import RenderEngine from './RenderEngine';
import {bindSceneGestures} from './sceneGestures';
import {createFoldedGeometry,foldedAssembly} from './foldedGeometry';
RectAreaLightUniformsLib.init();
import {dimensions,cameraDistance} from './dimensions';
import {getMetalMaps,getFabricMaps,getStudioEnvironment,getPlaster} from './textures';

function Environment({room,theme}){
 const {scene,invalidate}=useThree();
 useEffect(()=>{scene.environment=getStudioEnvironment();scene.background=room?new THREE.Color(theme==='dark'?'#333731':'#bcb5a8'):null;invalidate();return()=>{scene.environment=null;scene.background=null}},[scene,room,theme,invalidate]);return null;
}
function Part({id,onSelect,children}){
 return <group onClick={e=>{if(e.delta>5)return;e.stopPropagation();onSelect(id)}} onPointerOver={e=>{e.stopPropagation();document.body.style.cursor='pointer'}} onPointerOut={()=>{document.body.style.cursor=''}}>{children}</group>;
}
function Cloth({color,fabric,macro=false,selected=false}){
 const textures=getFabricMaps(fabric,macro);
 return <meshPhysicalMaterial color={color} map={fabric==='smooth'?null:textures.map} roughness={fabric==='smooth'?.77:.96} bumpMap={fabric==='smooth'?null:textures.bump} bumpScale={macro?.0012:.00035} sheen={fabric==='smooth'?0:.35} sheenColor="#c1c4cd" sheenRoughness={.9} emissive={selected?'#335258':'#000'} emissiveIntensity={.06}/>;
}
function Metal({maps,selected=false}){return <meshPhysicalMaterial side={THREE.DoubleSide} map={maps.map} roughnessMap={maps.roughness} color="#e9e9e5" metalness={1} roughness={.57} envMapIntensity={1} anisotropy={.45} emissive={selected?'#335258':'#000'} emissiveIntensity={.06}/>}
const rimMaterials=new Map();
function Rim({selected=false}){if(!rimMaterials.has(selected))rimMaterials.set(selected,new THREE.MeshStandardMaterial({color:'#aab0ac',metalness:1,roughness:.28,emissive:selected?'#335258':'#000',emissiveIntensity:.06}));return <primitive object={rimMaterials.get(selected)} attach="material"/>}
const patternGeometry=new Map();
function getPatternGeometry(pattern){if(!patternGeometry.has(pattern.id)){const geometries=new SVGLoader().parse(pattern.svg).paths.flatMap(p=>SVGLoader.createShapes(p)).map(s=>new THREE.ExtrudeGeometry(s,{depth:2,bevelEnabled:true,bevelThickness:.08,bevelSize:.12,bevelSegments:1,curveSegments:24}));const merged=mergeGeometries(geometries,false);geometries.forEach(g=>g.dispose());const uv=merged.getAttribute('uv');for(let i=0;i<uv.count;i++)uv.setXY(i,uv.getX(i)/300,1-uv.getY(i)/420);uv.needsUpdate=true;patternGeometry.set(pattern.id,merged)}return patternGeometry.get(pattern.id)}
function Comparison({theme}){
 const lines=useMemo(()=>{
  return ['large','a3'].map(id=>{const {width:w,height:h}=dimensions[id],bottom=-.75;return new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(-w/2,bottom,.06),new THREE.Vector3(w/2,bottom,.06),new THREE.Vector3(w/2,bottom+h,.06),new THREE.Vector3(-w/2,bottom+h,.06),new THREE.Vector3(-w/2,bottom,.06)])});
 },[]);
 useEffect(()=>()=>lines.forEach(g=>g.dispose()),[lines]);
 return <>{lines.map((g,i)=><line key={i} geometry={g} onUpdate={line=>line.computeLineDistances()} renderOrder={4}>{i?<lineDashedMaterial color={theme==='dark'?'#fff':'#1a3121'} dashSize={.018} gapSize={.012} depthTest={false}/>:<lineBasicMaterial color={theme==='dark'?'#d1d8c8':'#3b4932'} transparent opacity={.65} depthTest={false}/>}</line>)}</>;
}
function Model({color,mode,explode,selected,onSelect,format,pattern,fabric,engraving,theme,motion,construction}){
 const root=useRef(),face=useRef(),bg=useRef(),back=useRef(),mount=useRef();
 const {invalidate,gl}=useThree();
 const folded=construction==='folded';
 const maps=getMetalMaps(engraving,false,folded?'cut:'+pattern.id:pattern.id),geometry=folded?null:getPatternGeometry(pattern);
 const {width:w,height:h,metal:t}=dimensions[format],rim=format==='large'?.02:.015,depth=format==='large'?.04:.024;
 const shell=useMemo(()=>folded?createFoldedGeometry(pattern,w,h,t,depth):null,[folded,pattern,w,h,t,depth]);
 const foldProgress=useRef(explode);
 useEffect(()=>{if(shell)shell.update(foldedAssembly(foldProgress.current).fold);gl.shadowMap.needsUpdate=true;invalidate();return()=>shell?.dispose()},[shell,gl,invalidate]);
 useFrame((_,delta)=>{
  const k=1-Math.exp(-Math.min(delta,.05)*8),old=foldProgress.current;
  foldProgress.current=Math.abs(old-explode)<.001?explode:THREE.MathUtils.lerp(old,explode,k);
  const progress=foldedAssembly(foldProgress.current),d=folded?progress.separation:explode/100;let changed=old!==foldProgress.current;
  // Animate one timeline, never two independent angle lerps: pairs remain sequential even on a jump from 0 to 100.
  if(shell&&changed)shell.update(progress.fold);
  const ease=(object,key,target)=>{const old=object[key];object[key]=Math.abs(old-target)<.00001?target:THREE.MathUtils.lerp(old,target,k);changed ||= object[key]!==old};
  ease(root.current.position,'y',mode==='scale'?-.75+h/2:0);
  ease(face.current.position,'z',.012+d*h*.47);ease(bg.current.position,'z',-d*h*.10);ease(back.current.position,'z',(folded?.012+t-depth-.002:-depth)-d*h*.34);ease(mount.current.position,'z',(folded?.012+t-depth-.014:-depth-.012)-d*h*.55);
  if(changed){motion.changedAt=performance.now();gl.shadowMap.needsUpdate=true;invalidate()}
 });
 const pick={onSelect};
 return <><group ref={root}>
  {!folded&&<Part id="frame" {...pick}>{[-1,1].map(s=><React.Fragment key={s}><mesh castShadow receiveShadow position={[s*(w/2+rim/2),0,0]}><boxGeometry args={[rim,h+rim*2,depth]}/><Rim selected={selected==='frame'}/></mesh><mesh castShadow receiveShadow position={[0,s*(h/2+rim/2),0]}><boxGeometry args={[w,rim,depth]}/><Rim selected={selected==='frame'}/></mesh></React.Fragment>)}</Part>}
  <group ref={face}>{folded?<group position={[0,0,t]}><Part id="metal" {...pick}><mesh geometry={shell.face} dispose={null} castShadow receiveShadow><Metal maps={maps} selected={selected==='metal'}/></mesh></Part><Part id="frame" {...pick}>{shell.flanges.map(f=><mesh key={f.id} geometry={f.geometry} dispose={null} castShadow receiveShadow><Metal maps={maps} selected={selected==='frame'}/></mesh>)}</Part></group>:<Part id="metal" {...pick}><group position={[-w/2,h/2,t]} rotation={[Math.PI,0,0]} scale={[w/300,h/420,t/2]}><mesh geometry={geometry} dispose={null} castShadow receiveShadow><Metal maps={maps} selected={selected==='metal'}/></mesh></group></Part>}</group>
  <group ref={bg}><Part id="background" {...pick}><mesh castShadow receiveShadow><boxGeometry args={[w,h,.004]}/><Cloth color={color} fabric={fabric} selected={selected==='background'}/></mesh></Part></group>
  <group ref={back}><Part id="back" {...pick}><mesh castShadow><boxGeometry args={[w+(folded?-.012:.006),h+(folded?-.012:.006),.003]}/><meshStandardMaterial color={selected==='back'?'#778c83':'#414740'} roughness={.8}/></mesh>{[-1,1].flatMap(s=>[-.32,0,.32].map(y=><mesh key={`${s}-${y}`} position={[s*(w/2-.005),h*y,.003]}><boxGeometry args={[.018,.008,.002]}/><Rim/></mesh>))}</Part></group>
  <group ref={mount}><Part id="mount" {...pick}><mesh position={[0,h*.39,0]} castShadow><boxGeometry args={[w*.67,.02,.004]}/><Rim selected={selected==='mount'}/></mesh><mesh position={[0,h*.39+.01,-.004]} rotation={[.5,0,0]}><boxGeometry args={[w*.67,.01,.004]}/><Rim selected={selected==='mount'}/></mesh><mesh position={[0,h*.39,-.012]} rotation={[-.5,0,0]}><boxGeometry args={[w*.67,.01,.004]}/><Rim selected={selected==='mount'}/></mesh>{[-1,1].map(s=><mesh key={s} position={[s*(w/2-.025),-h*.42,0]} rotation={[Math.PI/2,0,0]}><cylinderGeometry args={[.007,.007,.005,16]}/><meshStandardMaterial color="#222820" roughness={1}/></mesh>)}</Part></group>
 </group>{mode==='scale'&&<Comparison theme={theme}/>}</>;
}
function MaterialStudy({color,fabric,engraving,detail,pattern,construction}){
 const maps=getMetalMaps(engraving,true,construction==='folded'?'cut:'+pattern.id:pattern.id);
 return <group rotation={[-.05,-.16,0]}><mesh castShadow receiveShadow><boxGeometry args={[.37,.37,.009]}/>{detail==='fabric'?<Cloth color={color} fabric={fabric} macro/>:<Metal maps={maps}/>}</mesh>{detail==='fabric'&&fabric!=='smooth'&&<mesh position={[.13,-.16,.012]} rotation={[0,0,-.15]}><boxGeometry args={[.09,.07,.005]}/><Cloth color={color} fabric={fabric} macro/></mesh>}</group>;
}
function Controls({format,resetKey,mode,wall,motion}){
 const {camera,gl,size,invalidate}=useThree(),interacting=useRef(false);
 const mounted=wall&&mode==='object';
 const controls=useMemo(()=>{
  // OrbitControls captures its up axis when constructed. Keep it upright in every mode.
  camera.up.set(0,1,0);
  // Connect after the previous effect's cleanup, which resets touchAction.
  return new OrbitControls(camera);
 },[camera,gl]);
 useEffect(()=>{
  controls.connect(gl.domElement);
  const releaseGestures=bindSceneGestures(gl.domElement.closest('.scene')||gl.domElement);
  controls.enablePan=false;controls.enableDamping=true;controls.dampingFactor=.12;
  controls.rotateSpeed=mounted?.5:.65;
  // Free inspection keeps the full horizontal orbit, but cannot roll over a pole.
  controls.minPolarAngle=mounted?Math.PI*.3:.06;
  controls.maxPolarAngle=mounted?Math.PI*.68:Math.PI-.06;
  controls.minAzimuthAngle=mounted?-.85:-Infinity;
  controls.maxAzimuthAngle=mounted?.85:Infinity;
  controls.touches.ONE=THREE.TOUCH.ROTATE;
  controls.touches.TWO=THREE.TOUCH.DOLLY_PAN; // Pinch zoom; pan is disabled above.
  controls.zoomSpeed=.7;
  const changed=()=>{motion.changedAt=performance.now();invalidate()},start=()=>{interacting.current=true;changed()},end=()=>{interacting.current=false;changed()};
  controls.addEventListener('change',changed);controls.addEventListener('start',start);controls.addEventListener('end',end);
  return()=>{controls.removeEventListener('change',changed);controls.removeEventListener('start',start);controls.removeEventListener('end',end);controls.dispose();releaseGestures();document.body.style.cursor=''};
 },[controls,gl,mounted,invalidate,motion]);
 useEffect(()=>{
  const base=cameraDistance(format,mode,size.width/Math.max(1,size.height)),d=mounted?base*1.46:mode==='object'?base*1.22:base;
  controls.target.set(0,mounted?-dimensions[format].height*.08:0,0);
  controls.minDistance=mode==='detail'?.28:dimensions[format].height*.4;controls.maxDistance=d*3;
  camera.up.set(0,1,0);
  camera.position.set(mode==='assembly'?-d*.48:0,mode==='assembly'?d*.12:0,d);
  // Flush residual damping before recording the exact upright home view.
  controls.enableDamping=false;camera.lookAt(controls.target);controls.update();
  camera.position.set(mode==='assembly'?-d*.48:0,mode==='assembly'?d*.12:0,d);
  controls.update();controls.saveState();controls.enableDamping=true;
  motion.changedAt=performance.now();invalidate();
 },[format,mode,mounted,resetKey,size.width,size.height,controls,camera,invalidate,motion]);
 useFrame(()=>{controls.update();if(interacting.current)invalidate()});return null;
}
function Gallery({wall,format,mode,theme}){
 const {width:w,height:h}=dimensions[format],depth=format==='large'?.04:.024,z=-depth-.026,dark=theme==='dark',plaster=getPlaster();
 if(!wall||mode!=='object')return null;
 const gap=h*.11,mw=w+gap*2,mh=h+gap*2,trim=Math.max(.006,h*.009),base=-h*.76;
 const mat=<meshStandardMaterial color={dark?'#66685f':'#d4d0c6'} roughness={.82}/>;
 return <group>
  <mesh receiveShadow position={[0,0,z]}><planeGeometry args={[10,10]}/><meshStandardMaterial color={dark?'#555950':'#c8c5bc'} roughness={.96} bumpMap={plaster} bumpScale={.00022}/></mesh>
  {[-1,1].map(s=><React.Fragment key={s}>
   <mesh castShadow receiveShadow position={[s*mw/2,0,z+.006]}><boxGeometry args={[trim,mh,.012]}/>{mat}</mesh>
   <mesh castShadow receiveShadow position={[0,s*mh/2,z+.006]}><boxGeometry args={[mw,trim,.012]}/>{mat}</mesh>
  </React.Fragment>)}
  <mesh castShadow receiveShadow position={[0,base,z+.009]}><boxGeometry args={[10,h*.065,.018]}/>{mat}</mesh>
  <mesh castShadow receiveShadow position={[0,base+h*.035,z+.014]}><boxGeometry args={[10,h*.009,.028]}/>{mat}</mesh>
 </group>;
}
function Lighting({format}){
 const key=useRef(),fill=useRef(),{invalidate,gl}=useThree();const extent=format==='large'?1.55:.5;
 useEffect(()=>{key.current.lookAt(0,0,0);fill.current.lookAt(0,0,0);gl.shadowMap.needsUpdate=true;invalidate()},[format,gl,invalidate]);
 return <><ambientLight intensity={.16}/><rectAreaLight ref={key} color="#fff5e8" intensity={2.6} width={2.4} height={3} position={[-2,.45,3.5]}/><rectAreaLight ref={fill} color="#ecf0fa" intensity={1.3} width={1.3} height={2.8} position={[2.2,.15,2.8]}/><directionalLight color="#fff8ef" position={[-2,.9,4]} intensity={.9} castShadow shadow-mapSize={[2048,2048]} shadow-camera-left={-extent} shadow-camera-right={extent} shadow-camera-top={extent} shadow-camera-bottom={-extent} shadow-camera-near={.5} shadow-camera-far={12} shadow-radius={3} shadow-normalBias={.0002} shadow-bias={-.00002}/></>;
}
class Boundary extends Component{state={error:false};static getDerivedStateFromError(){return {error:true}}render(){return this.state.error?this.props.fallback:this.props.children}}
function Scene(props){
 const motion=useMemo(()=>({changedAt:performance.now()}),[]);
 const revision=[props.format,props.pattern.id,props.color,props.fabric,props.engraving,props.mode,props.room,props.wall,props.theme,props.selected,props.explode,props.construction].join('|');
 return <Boundary fallback={<div className="poster-fallback"><div dangerouslySetInnerHTML={{__html:props.pattern.svg}}/><p>3D недоступно в этом браузере.</p></div>}><Canvas frameloop="demand" dpr={window.innerWidth<800?Math.min(2,Math.max(1.5,window.devicePixelRatio||1)):1.5} shadows={{type:THREE.PCFSoftShadowMap}} camera={{position:[0,0,1.5],fov:34,near:.015,far:30}} gl={{antialias:true,alpha:true,powerPreference:'high-performance',toneMapping:THREE.ACESFilmicToneMapping,toneMappingExposure:1}} onPointerMissed={()=>props.onSelect(null)}>
 <Environment room={props.room} theme={props.theme}/><Lighting format={props.format} room={props.room}/><Gallery {...props}/>
 {props.mode==='detail'?<MaterialStudy {...props}/>:<Model {...props} motion={motion}/>}
 <Controls key={props.mode+props.wall+props.resetKey} format={props.format} mode={props.mode} wall={props.wall} resetKey={props.resetKey} motion={motion}/>
 <RenderEngine photo={props.photo&&props.construction!=='folded'} revision={revision} motion={motion} onPhotoStatus={props.onPhotoStatus} onStats={props.onStats} benchmark={props.benchmark} room={props.room} artwork={props}/>
 </Canvas></Boundary>
}
export default React.memo(Scene);
