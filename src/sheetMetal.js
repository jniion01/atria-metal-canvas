import pc from 'polygon-clipping';
import {sheetSpec} from './forming.js';
import {dimensions} from './dimensions.js';

export function flangeLayouts(s){
 const {w,h,relief,radius,outerRadius,clearance}=s;
 return [
  {id:'right',pair:'short',origin:[w/2,0],out:[1,0],tangent:[0,1],rootHalf:h/2-relief/2,endHalf:h/2+radius-clearance},
  {id:'left',pair:'short',origin:[-w/2,0],out:[-1,0],tangent:[0,-1],rootHalf:h/2-relief/2,endHalf:h/2+radius-clearance},
  {id:'top',pair:'long',origin:[0,h/2],out:[0,1],tangent:[-1,0],rootHalf:w/2-relief/2,endHalf:w/2+outerRadius},
  {id:'bottom',pair:'long',origin:[0,-h/2],out:[0,-1],tangent:[1,0],rootHalf:w/2-relief/2,endHalf:w/2+outerRadius},
 ];
}
export function flangeOutline(s,f){
 const {allowance:a,extension:e}=s,{rootHalf:b,endHalf:c,origin:o,out:n,tangent:t}=f;
 return [[[0,-b],[a,-b],[a,-c],[e,-c],[e,c],[a,c],[a,b],[0,b],[0,-b]].map(([u,v])=>[o[0]+n[0]*u+t[0]*v,o[1]+n[1]*u+t[1]*v])];
}
export function panelPolygons(pattern,s){
 const panel=pattern.folded.polygons.map(p=>p.map(r=>r.map(([x,y])=>[(x/300-.5)*s.w,(.5-y/420)*s.h])));
 const reliefs=[];
 for(const x of [-s.w/2,s.w/2])for(const y of [-s.h/2,s.h/2]){
  const ring=[];for(let j=0;j<=32;j++){const a=j*Math.PI/16;ring.push([x+s.relief/2*Math.cos(a),y+s.relief/2*Math.sin(a)])}reliefs.push([ring]);
 }
 return pc.difference(panel,...reliefs);
}
export function blankPolygons(pattern,s){return pc.union(panelPolygons(pattern,s),...flangeLayouts(s).map(f=>flangeOutline(s,f)))}
const number=n=>(n*1000).toFixed(2);
export function flatDrawing(pattern,format){
 const d=dimensions[format],s=sheetSpec(d.width,d.height,d.metal,format==='large'?.04:.024),margin=s.w*.11,top=s.blankHeight/2+margin,half=s.blankWidth/2+margin;
 const path=blankPolygons(pattern,s).flatMap(p=>p.map(r=>'M'+r.map(([x,y])=>number(x)+' '+number(-y)).join('L')+'Z')).join(' ');
 const lines=flangeLayouts(s).map(f=>{const x=f.origin[0]+f.out[0]*s.allowance/2,y=f.origin[1]+f.out[1]*s.allowance/2;return '<line x1="'+number(x-f.tangent[0]*f.rootHalf)+'" y1="'+number(-y+f.tangent[1]*f.rootHalf)+'" x2="'+number(x+f.tangent[0]*f.rootHalf)+'" y2="'+number(-y-f.tangent[1]*f.rootHalf)+'"/>'}).join('');
 const font=s.w*1000*.015,line=s.w*1000*.0012;
 return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="'+number(-half)+' '+number(-top)+' '+number(2*half)+' '+number(2*top)+'" width="'+number(half*2)+'mm" height="'+number(top*2)+'mm"><rect x="'+number(-half)+'" y="'+number(-top)+'" width="'+number(2*half)+'" height="'+number(2*top)+'" fill="#fafaf7"/><g id="CUT" fill="#e2e2da" fill-rule="evenodd" stroke="#252923" stroke-width="'+line+'"><path d="'+path+'"/></g><g id="BEND" fill="none" stroke="#277e86" stroke-width="'+line+'" stroke-dasharray="'+line*8+' '+line*5+'">'+lines+'</g><g fill="#252923" font-family="Arial,sans-serif" font-size="'+font+'"><text x="'+number(-s.blankWidth/2)+'" y="'+number(-s.blankHeight/2-margin*.58)+'">ATRIA / '+pattern.id+' · CUT / BEND · mm</text><text x="'+number(-s.blankWidth/2)+'" y="'+number(s.blankHeight/2+margin*.47)+'">'+number(s.blankWidth)+' × '+number(s.blankHeight)+' · t '+number(s.t)+' · R '+number(s.radius)+' · K '+s.k+'</text><text x="'+number(-s.blankWidth/2)+'" y="'+number(s.blankHeight/2+margin*.80)+'">BA '+number(s.allowance)+' · gap '+number(s.clearance)+' · trial bend required</text></g></svg>';
}
