// This boundary owns gestures only inside the 3D surface. Pointer events keep
// reaching OrbitControls; the rest of the document keeps native page zoom.
export function bindSceneGestures(surface) {
 const options={passive:false,capture:true};
 const prevent=e=>{if(e.cancelable)e.preventDefault()};
 const pinch=e=>{if(e.touches.length>1)prevent(e)};
 const listeners=[
  ['touchstart',pinch],['touchmove',pinch],
  // WebKit's native pinch/rotation events are separate from pointer events.
  ['gesturestart',prevent],['gesturechange',prevent],['gestureend',prevent]
 ];
 for(const [type,handler] of listeners)surface.addEventListener(type,handler,options);
 return()=>{for(const [type,handler] of listeners)surface.removeEventListener(type,handler,options)};
}
