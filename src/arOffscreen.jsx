import React from 'react';
import * as THREE from 'three';
import {createRoot,extend,advance} from '@react-three/fiber';
import {Model} from './Scene';
import {createARAsset} from './arAsset';
extend(THREE);
const wait=ms=>new Promise(r=>setTimeout(r,ms));
// Builds the same R3F Model in a tiny detached root, so another size can be
// exported without touching the visible scene. Frames are advanced manually
// with timers: window.requestAnimationFrame pauses during an immersive session.
export async function createFormatAsset(props,format,options){
 const canvas=document.createElement('canvas');canvas.width=canvas.height=2;
 const root=createRoot(canvas);let store,getModel=null;
 try{
  await root.configure({frameloop:'never',dpr:1,size:{width:2,height:2,top:0,left:0},shadows:true,gl:{antialias:false,powerPreference:'low-power',preserveDrawingBuffer:false}});
  store=root.render(<Model {...props} format={format} mode="object" explode={0} selected={null} onSelect={()=>{}} motion={{changedAt:0}} onModelReady={fn=>{getModel=fn}}/>);
  for(let i=0;i<200;i++){
   await wait(16);
   advance(performance.now(),true,store.getState());
   const model=getModel?.();
   if(model)return await createARAsset(model,options);
  }
  throw new Error('Model did not settle');
 }finally{
  // R3F disposes the renderer and releases the WebGL context after unmount.
  root.unmount();
 }
}
