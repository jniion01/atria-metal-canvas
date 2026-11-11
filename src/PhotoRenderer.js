import {WebGLPathTracer} from 'three-gpu-pathtracer';
import {WebGLRenderTarget,ShaderMaterial,NoBlending} from 'three';
import {FullScreenQuad} from 'three/addons/postprocessing/Pass.js';
// Trace the actual scene, including cut-outs, bent radii, engraving and fabric.
// Loaded only on demand. A bounded sample count stops GPU work when complete.
export class PhotoRenderer{
 constructor(gl,camera){
  this.gl=gl;this.camera=camera;this.tracer=new WebGLPathTracer(gl);
  this.tracer.bounces=3;this.tracer.transmissiveBounces=1;
  this.tracer.filterGlossyFactor=.5;this.tracer.renderDelay=0;
  this.tracer.fadeDuration=180;this.tracer.minSamples=1;
  this.tracer.tiles.set(2,2);this.tracer.textureSize.set(1024,1536);
  // Check coverage once per view. Some GPU drivers compile the tracer without
  // errors but output a transparent image. Keep the raster preview until valid.
  this.probe=new WebGLRenderTarget(64,64,{depthBuffer:false});
  this.pixels=new Uint8Array(64*64*4);this.hasImage=false;
  this.probeQuad=new FullScreenQuad(new ShaderMaterial({
   depthTest:false,depthWrite:false,blending:NoBlending,toneMapped:false,
   uniforms:{image:{value:null}},
   vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=vec4(position.xy,0.0,1.0);}',
   fragmentShader:'uniform sampler2D image;varying vec2 vUv;void main(){gl_FragColor=texture2D(image,vUv);}'
  }));
 }
 async configure(settings,camera,isCurrent,scene){
  if(!isCurrent())return;
  this.camera=camera;
  this.tracer.renderScale=Math.min(1,(window.innerWidth<800?900:1200)/Math.max(this.gl.domElement.width,this.gl.domElement.height));
  this.tracer.setScene(scene,camera);this.updateCamera();
 }
 get samples(){return this.tracer.samples}
 updateCamera(){this.hasImage=false;this.tracer.updateCamera()}
 renderSample(){
  const showImage=this.hasImage;
  this.gl.setRenderTarget(null);this.tracer.renderToCanvas=showImage;this.tracer.renderSample();
  if(!showImage&&this.samples>=2){
   const previous=this.gl.getRenderTarget();
   try{
    this.probeQuad.material.uniforms.image.value=this.tracer.target.texture;
    this.gl.setRenderTarget(this.probe);this.gl.clear();this.probeQuad.render(this.gl);
    this.gl.readRenderTargetPixels(this.probe,0,0,64,64,this.pixels);
    this.hasImage=this.pixels.some((value,index)=>index%4===3&&value>8);
    if(!this.hasImage)throw new Error('GPU path tracer returned an empty image');
   }finally{this.gl.setRenderTarget(previous)}
  }
  return showImage;
 }
 dispose(){this.tracer.dispose();this.probe.dispose();this.probeQuad.material.dispose();this.probeQuad.dispose()}
}
