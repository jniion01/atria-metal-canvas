import assert from 'node:assert/strict';
import {PerspectiveCamera,TOUCH} from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {bindSceneGestures} from '../src/sceneGestures.js';

// Native event fixtures exercise the boundary and the installed OrbitControls
// pointer handlers. This is not a physical Safari/viewport-zoom test.
const surface=new EventTarget(),outside=new EventTarget(),root=new EventTarget();
class CanvasFixture extends EventTarget {
 style={};clientWidth=390;clientHeight=648;
 getRootNode(){return root}
 setPointerCapture(){}
 releasePointerCapture(){}
 getBoundingClientRect(){return {left:0,top:0,width:390,height:648}}
}
const canvas=new CanvasFixture();
function event(type,properties={}){return Object.assign(new Event(type,{cancelable:true}),properties)}
const release=bindSceneGestures(surface);
for(const type of ['touchstart','touchmove']){
 const one=event(type,{touches:[{}]});surface.dispatchEvent(one);assert.equal(one.defaultPrevented,false);
 const two=event(type,{touches:[{},{}]});surface.dispatchEvent(two);assert.equal(two.defaultPrevented,true);
 const other=event(type,{touches:[{},{}]});outside.dispatchEvent(other);assert.equal(other.defaultPrevented,false);
}
for(const type of ['gesturestart','gesturechange','gestureend']){
 const native=event(type);surface.dispatchEvent(native);assert.equal(native.defaultPrevented,true);
 const other=event(type);outside.dispatchEvent(other);assert.equal(other.defaultPrevented,false);
}
let pointerReached=false;
surface.addEventListener('pointermove',()=>{pointerReached=true},{once:true});
const pointer=event('pointermove',{pointerType:'touch'});surface.dispatchEvent(pointer);
assert.equal(pointerReached,true);assert.equal(pointer.defaultPrevented,false);
release();const after=event('gesturestart');surface.dispatchEvent(after);assert.equal(after.defaultPrevented,false);

const camera=new PerspectiveCamera(34,390/648,.015,30);camera.position.set(0,0,1);
let controls=new OrbitControls(camera);controls.connect(canvas);
for(let i=0;i<3;i++){
 // Render creates a disconnected replacement; React cleans up before setup.
 const next=new OrbitControls(camera);controls.dispose();next.connect(canvas);controls=next;
 assert.equal(canvas.style.touchAction,'none');
}
controls.enablePan=false;controls.touches.TWO=TOUCH.DOLLY_PAN;
const send=(type,id,x)=>canvas.dispatchEvent(event(type,{pointerId:id,pointerType:'touch',pageX:x,pageY:300,clientX:x,clientY:300,button:0}));
const initial=camera.position.distanceTo(controls.target);
send('pointerdown',1,150);send('pointerdown',2,250);
send('pointermove',1,100);send('pointermove',2,300);
assert.ok(camera.position.distanceTo(controls.target)<initial,'spread must zoom the model in');
assert.deepEqual(controls.target.toArray(),[0,0,0],'two-finger translation must not pan the center');
send('pointermove',1,150);send('pointermove',2,250);
assert.ok(Math.abs(camera.position.distanceTo(controls.target)-initial)<1e-8,'reverse pinch restores model distance');
send('pointerup',1,150);send('pointerup',2,250);controls.dispose();
console.log('PASS: scoped native pinch prevention; outside gestures; pointer delivery; cleanup; reset/reconnect touchAction; two-finger model zoom in/out; fixed orbit center.');
