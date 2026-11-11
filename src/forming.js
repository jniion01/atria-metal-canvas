const clamp=x=>Math.max(0,Math.min(1,x));
const smooth=x=>{x=clamp(x);return x*x*(3-2*x)};
export function foldedAssembly(value){
 const separation=smooth(value/45),short=1-smooth((value-45)/27),long=1-smooth((value-72)/28);
 const stage=value===0?'Собрано':value<45?'Разделение слоёв':value===45?'Четыре борта по 90°':value<72?'Боковые борта':value<100?'Верхний и нижний борта':'Развёртка с угловыми вырезами';
 return {separation,fold:{short,long},angle:Math.round((value<=72?short:long)*90),stage};
}
export function sheetSpec(w,h,t,depth){
 const radius=2*t,k=.42,clearance=.3*t,relief=1.5*t;
 const allowance=Math.PI/2*(radius+k*t),outerRadius=radius+t,leg=depth-outerRadius,extension=allowance+leg;
 return {w,h,t,depth,radius,k,clearance,relief,allowance,outerRadius,leg,extension,blankWidth:w+2*extension,blankHeight:h+2*extension,outerWidth:w+2*outerRadius,outerHeight:h+2*outerRadius};
}

