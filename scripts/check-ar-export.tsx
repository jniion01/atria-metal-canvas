import assert from 'node:assert/strict';
import React from 'react';
import {createCanvas,CanvasElement,Image,ImageData} from '@napi-rs/canvas';
import {DOMParser} from '@xmldom/xmldom';
import {Box3,Vector3,FrontSide} from 'three';
import {create} from '@react-three/test-renderer';
import {Model} from '../src/Scene';
import {patterns} from '../src/artwork';
import {createARAsset} from '../src/arAsset';
import {PathTracingSceneGenerator} from 'three-gpu-pathtracer';
import {unzipSync,strFromU8} from 'three/addons/libs/fflate.module.js';
// Native canvas encodes real texture pixels; WebGL is mocked only by the official
// R3F test renderer. This validates scene/export data, not visual GPU rendering.
Object.assign(globalThis,{IS_REACT_ACT_ENVIRONMENT:true,self:{requestAnimationFrame:()=>0,cancelAnimationFrame(){}},ImageData,DOMParser,HTMLCanvasElement:CanvasElement,HTMLImageElement:Image,Image,document:{createElement(tag){assert.equal(tag,'canvas');const c=createCanvas(1,1);Object.assign(c,{style:{},addEventListener(){},removeEventListener(){},setAttribute(){}});return c},createElementNS(ns,tag){return this.createElement(tag)}},FileReader:class{
 result:any;onloadend:any;
 async readAsArrayBuffer(blob){this.result=await blob.arrayBuffer();this.onloadend?.()}
 async readAsDataURL(blob){this.result='data:'+blob.type+';base64,'+Buffer.from(await blob.arrayBuffer()).toString('base64');this.onloadend?.()}
}});
let total=0;
for(const construction of ['profile','folded'])for(const format of ['a3','large']){
 let getModel;const props={construction,format,pattern:patterns.find(p=>p.id===(construction==='folded'?'11':'04')),color:'#184197',mode:'object',explode:0,selected:null,onSelect:()=>{},fabric:'linen',engraving:'ascii',theme:'light',motion:{changedAt:0},onModelReady:fn=>getModel=fn};
 const renderer=await create(<Model {...props}/>);
 await renderer.advanceFrames(160,.05);
 const model=getModel();assert.ok(model,'assembled model ready');
 const before=new Box3().setFromObject(model).getSize(new Vector3()),positions=[];let triangles=0;
 model.traverse(o=>{if(o.isMesh){positions.push(o.geometry.attributes.position.array.slice());triangles+=(o.geometry.index?.count||o.geometry.attributes.position.count)/3}});
 const traced=new PathTracingSceneGenerator([model]).generate();
 assert.ok(traced.bvh,'real geometry builds a path-tracing BVH');
 assert.equal(traced.geometry.index.count/3,triangles,'photo mode retains every source triangle');
 assert.ok(traced.materials.some(m=>m.normalMap)&&traced.textures.length>=4,'photo mode retains fabric and engraving maps');
 traced.geometry.dispose();
 const asset=await createARAsset(model),buffer=await (await fetch(asset.url)).arrayBuffer(),view=new DataView(buffer);
 assert.equal(view.getUint32(0,true),0x46546c67,'GLB binary');
 const gltf=JSON.parse(new TextDecoder().decode(new Uint8Array(buffer,20,view.getUint32(12,true))));
 assert.ok(gltf.meshes.length>10,'all layers, frame and mounting present');
 assert.ok(gltf.materials.some(m=>m.normalTexture),'textile normal map included');
 assert.ok(gltf.materials.some(m=>m.pbrMetallicRoughness.metallicFactor===1),'metal remains metal');
 assert.ok(gltf.images.length>=3,'engraving, roughness and textile embedded');
 asset.size.forEach((v,i)=>assert.ok(Math.abs(v-before.toArray()[i])<1e-7,'metre dimensions unchanged'));
 let index=0;model.traverse(o=>{if(o.isMesh)assert.deepEqual(o.geometry.attributes.position.array,positions[index++],'export leaves live geometry unchanged')});
 const nativeAsset=await createARAsset(model,{quickLook:true});
 const nativeBlob=await(await fetch(nativeAsset.url)).blob();
 assert.equal(nativeBlob.type,'model/vnd.usdz+zip');
 const files=unzipSync(new Uint8Array(await nativeBlob.arrayBuffer())),usd=strFromU8(files['model.usda']);
 assert.match(usd,/metersPerUnit = 1/);assert.doesNotMatch(usd,/preliminary:planeAnchoring/,'Quick Look must not force a floor anchor');
 assert.ok(Object.keys(files).some(k=>k.startsWith('textures/')),'USDZ textures embedded');
 nativeAsset.size.forEach((v,i)=>assert.equal(v,asset.size[i],'native and web AR physical dimensions match'));
 URL.revokeObjectURL(nativeAsset.url);
 // Returning from scale or disassembly must fit immediately, even on the first
 // rendered frame. Old layer positions used to survive the new camera fit.
 await renderer.update(<Model {...props} mode="assembly" explode={100}/>);
 await renderer.advanceFrames(160,.05);
 await renderer.update(<Model {...props}/>);
 await renderer.advanceFrames(1,.016);
 const returnedBounds=new Box3().setFromObject(model).getSize(new Vector3());
 returnedBounds.toArray().forEach((v,i)=>assert.ok(Math.abs(v-before.toArray()[i])<1e-7,'assembled geometry restored before the first object frame'));
 await renderer.update(<Model {...props} mode="scale"/>);await renderer.advanceFrames(2,.016);
 await renderer.update(<Model {...props}/>);await renderer.advanceFrames(1,.016);
 assert.equal(model.position.y,0,'scale comparison never leaves a transient shifted center');

 console.log(`${construction} ${format}: ${asset.size.map(x=>(x*1000).toFixed(1)).join(' × ')} mm; ${Math.round(triangles)} triangles; ${Math.round(buffer.byteLength/1024)} KiB GLB; textures embedded`);
 URL.revokeObjectURL(asset.url);await renderer.unmount();total++;
}
console.log(`PASS: ${total} real R3F assemblies exported; physical size, textured materials and source geometry retained.`);
