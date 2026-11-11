import {useEffect,useRef,useMemo} from 'react';
import {useFrame,useThree} from '@react-three/fiber';
import {RasterRenderer} from './RasterRenderer';
export default function RenderEngine({photo,revision,motion,onPhotoStatus,onStats,benchmark,room,artwork}){
 const {gl,scene,camera,size,invalidate,setDpr}=useThree();
 const raster=useMemo(()=>new RasterRenderer(gl),[gl]);
 const engine=useRef(null),ready=useRef(false),ticket=useRef(0),timer=useRef(),lastStatus=useRef('');
 const measure=useRef({frames:0,last:performance.now(),times:[],cpu:[],result:'',test:null});
 const status=text=>{if(lastStatus.current!==text){lastStatus.current=text;onPhotoStatus(text)}};
 const small=size.width<500,maxSamples=small?192:256;
 useEffect(()=>{gl.info.autoReset=false;gl.shadowMap.autoUpdate=false;gl.shadowMap.needsUpdate=true},[gl]);
 useEffect(()=>{gl.shadowMap.needsUpdate=true;motion.changedAt=performance.now();invalidate()},[revision,gl,invalidate,motion]);
 useEffect(()=>{
  const id=++ticket.current;ready.current=false;clearTimeout(timer.current);
  if(!photo){status('');invalidate();return}
  if(!gl.extensions.has('EXT_color_buffer_float')){status('Быстрый рендер · фоторежим недоступен');return}
  status('Подготавливаем свет…');
  import('./PhotoRenderer').then(async({PhotoRenderer})=>{if(ticket.current!==id)return;engine.current ||=new PhotoRenderer(gl,camera);await engine.current.configure(artwork,camera,()=>ticket.current===id);if(ticket.current!==id)return;ready.current=true;invalidate()}).catch(error=>{status('Быстрый рендер · фоторежим не прошёл проверку');console.warn('Photo renderer:',error.message)});
 },[photo,revision,gl,camera,invalidate]);
 useEffect(()=>()=>{++ticket.current;clearTimeout(timer.current);engine.current?.dispose();raster.dispose()},[]);
 useEffect(()=>{engine.current?.updateCamera();invalidate()},[size.width,size.height,invalidate]);
 useEffect(()=>{const resume=()=>{if(!document.hidden)invalidate()};document.addEventListener('visibilitychange',resume);return()=>document.removeEventListener('visibilitychange',resume)},[invalidate]);
 useEffect(()=>{
  if(!benchmark)return;measure.current.test={start:performance.now(),last:null,intervals:[],cpu:[],position:camera.position.clone(),calls:0,triangles:0};invalidate();
 },[benchmark,camera,invalidate]);
 useEffect(()=>{
  const interval=setInterval(()=>{
   const s=measure.current,now=performance.now(),elapsed=(now-s.last)/1000;
   onStats({fps:Math.round(s.frames/elapsed),calls:gl.info.render.calls,triangles:gl.info.render.triangles,textures:gl.info.memory.textures,geometries:gl.info.memory.geometries,dpr:+gl.getPixelRatio().toFixed(2),buffer:gl.domElement.width+' × '+gl.domElement.height,samples:raster.target.samples,roll:+(Math.atan2(camera.matrixWorld.elements[1],camera.matrixWorld.elements[5])*180/Math.PI).toFixed(2),testing:!!s.test,result:s.result});s.frames=0;s.last=now;
  },1000);return()=>clearInterval(interval);
 },[gl,onStats]);
 useFrame(()=>{
  const now=performance.now(),s=measure.current,test=s.test;let moving=now-motion.changedAt<250;
  if(test){
   const t=(now-test.start)/1000;
   if(t<6){const radius=test.position.length(),angle=.18+Math.sin(t*1.2)*.22;camera.position.set(Math.sin(angle)*radius,test.position.y,Math.cos(angle)*radius);camera.lookAt(0,room?-.1:0,0);motion.changedAt=now;moving=true;invalidate();if(t>1&&test.last!==null)test.intervals.push(now-test.last);test.last=now}
   else{camera.position.copy(test.position);camera.lookAt(0,room?-.1:0,0);const times=test.intervals.sort((a,b)=>a-b),mean=times.reduce((a,b)=>a+b,0)/Math.max(1,times.length),p95=times[Math.floor(times.length*.95)]||0,cpu=test.cpu.reduce((a,b)=>a+b,0)/Math.max(1,test.cpu.length);s.result=`${Math.round(1000/mean)} FPS · p95 ${p95.toFixed(1)} мс · CPU ${cpu.toFixed(1)} мс · ${test.calls} вызовов · ${test.triangles} треугольников`;s.test=null;motion.changedAt=now;invalidate();}
  }
  const start=performance.now(),pt=engine.current;gl.info.reset();
  try{
   if(photo&&pt&&ready.current&&!s.test){
    if(moving){raster.render(scene,camera);pt.updateCamera();clearTimeout(timer.current);timer.current=setTimeout(invalidate,280);status('Двигайте камеру · свет уточнится после остановки')}
    else{pt.renderSample();const count=Math.min(maxSamples,pt.samples);status(count>=maxSamples?'Свет рассчитан':'Уточняем свет · '+count+' / '+maxSamples);if(pt.samples<maxSamples&&!document.hidden)invalidate()}
   }else raster.render(scene,camera);
  }catch(error){ready.current=false;status('Быстрый рендер · фоторежим не прошёл проверку');raster.render(scene,camera);console.warn('Photo renderer:',error.message)}
  s.frames++;const cpu=performance.now()-start;
  if(s.test&&now-s.test.start>1000){s.test.cpu.push(cpu);s.test.calls=gl.info.render.calls;s.test.triangles=gl.info.render.triangles;}
  if(moving&&!s.test&&!photo){if(s.times.length&&now-s.times[s.times.length-1]>200)s.times=[];s.times.push(now);if(s.times.length>50){const span=now-s.times[0];if(span/49>40&&gl.getPixelRatio()>1.5){setDpr(Math.max(1.5,gl.getPixelRatio()*.85));s.times=[]}else s.times.shift()}}
 },1);
 return null;
}
