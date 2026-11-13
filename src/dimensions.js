// Scene units are metres. The comparison view uses one camera for both sizes.
export const dimensions = {
 a3:{width:.297,height:.420,metal:.002,label:'297 × 420 мм'},
 large:{width:1,height:1.5,metal:.003,label:'1000 × 1500 мм'},
 lamp:{width:.3,height:1,metal:.002,depth:.07,label:'300 × 1000 × 70 мм'},
};
export function cameraDistance(format,mode,aspect=1){
 const d=dimensions[format];
 const height=mode==='scale'?1.85:mode==='detail'?.5:d.height+(format==='a3'?.16:.2);
 const width=mode==='scale'?1.4:mode==='detail'?.57:d.width+(format==='a3'?.16:.25);
 return Math.max(height,width/Math.max(.3,aspect))/(2*Math.tan(34*Math.PI/360))*(mode==='assembly'?1.28:1);
}
