import * as T from 'three';
import {OutputPass} from 'three/addons/postprocessing/OutputPass.js';
// One multisampled target. Resolve edges before tone mapping; no permanent frame loop.
export class RasterRenderer{
 constructor(gl){
  this.gl=gl;this.size=new T.Vector2();
  this.target=new T.WebGLRenderTarget(1,1,{type:gl.extensions.has('EXT_color_buffer_float')?T.HalfFloatType:T.UnsignedByteType,minFilter:T.LinearFilter,magFilter:T.LinearFilter,depthBuffer:true,stencilBuffer:false});
  this.target.samples=Math.min(4,gl.capabilities.maxSamples);
  this.target.resolveDepthBuffer=false;this.target.texture.generateMipmaps=false;
  this.output=new OutputPass();this.output.renderToScreen=true;
 }
 render(scene,camera){
  const gl=this.gl;gl.getDrawingBufferSize(this.size);
  if(this.target.width!==this.size.x||this.target.height!==this.size.y)this.target.setSize(this.size.x,this.size.y);
  gl.setRenderTarget(this.target);gl.clear();gl.render(scene,camera);
  this.output.render(gl,null,this.target);
 }
 dispose(){this.target.dispose();this.output.dispose()}
}
