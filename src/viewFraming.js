import {dimensions} from './dimensions.js';
// A sphere encloses every orbital orientation, including the unfolded flanges.
export function viewRadius(format,mode,folded=false){
 const {width:w,height:h}=dimensions[format];
 if(mode==='detail')return .285;
 if(mode==='scale')return Math.hypot(1.12,1.62)/2;
 const rim=folded?(format==='large'?.018:.012):(format==='large'?.04:.03);
 if(mode==='assembly')return Math.hypot(w/2+(folded?.085:rim),h/2+(folded?.085:rim),h*.58+.06);
 return Math.hypot(w+rim,h+rim,.09)/2;
}
export function fitDistance(radius,width,height,rect,fov=34){
 const tan=Math.tan(fov*Math.PI/360);
 const half=Math.atan(Math.min(rect.width/height,rect.height/height)*tan);
 return radius/Math.sin(half)*1.035;
}
// Fitting the whole silhouette is a starting view, never a dolly limit.
// The minimum is measured in metres and leaves clearance in front of the metal.
export function inspectionDistance(format,mode){
 if(mode==='detail')return .045;
 if(mode==='assembly')return format==='large'?.20:.08;
 return format==='large'?.09:.065;
}
export function resizedDistance(distance,previousFit,nextFit,minDistance,maxDistance){
 return Math.max(minDistance,Math.min(maxDistance,distance*nextFit/previousFit));
}
export function safeView(width,height,top,bottom){
 const margin=Math.min(24,width*.045),available=Math.max(height*.26,height-top-bottom);
 const center=Math.min(height-available/2,Math.max(available/2,(top+height-bottom)/2));
 return {x:margin,y:center-available/2,width:width-margin*2,height:available};
}
