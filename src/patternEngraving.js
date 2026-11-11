// Coordinates match every 300 × 420 stencil. Rendering is clipped by the metal mesh.
// Channels can supply their own ink (albedo / roughness / bump).
export function drawPatternEngraving(ctx, patternId='04', style='ascii', {ink='#424a47'}={}) {
 const c=ctx,id=String(patternId);c.save();c.fillStyle=ink;c.strokeStyle=ink;c.lineWidth=.42;c.lineCap='round';c.lineJoin='round';
 const line=(x1,y1,x2,y2,w=.42)=>{c.lineWidth=w;c.beginPath();c.moveTo(x1,y1);c.lineTo(x2,y2);c.stroke()};
 const path=points=>{c.lineWidth=.42;c.beginPath();for(const [op,...v] of points)c[op](...v);c.stroke()};
 const label=(text,x,y,size=3.6,align='left')=>{c.font=size+'px monospace';c.textAlign=align;c.fillText(text,x,y)};
 const cross=(x,y,s=2)=>{line(x-s,y,x+s,y);line(x,y-s,x,y+s)};
 const dots=(x,y,n=5)=>{for(let i=0;i<n;i++){c.beginPath();c.arc(x+i*3,y,.42,0,Math.PI*2);c.fill()}};
 const columns=(x,y,width,height,count=7)=>{for(let i=0;i<count;i++){const h=height*(.54+.46*Math.sin((i+1)*Math.PI/(count+1))),top=y+(height-h)/2;for(let j=0;j<9;j++){if((j+i)%5===1)continue;const dy=h/9;c.fillRect(x+i*width/(count-1),top+j*dy,.58,dy*.64)}}};
 const matrix=(x,y,scale=1,variant=0)=>{for(let row=0;row<11;row++)for(let col=0;col<11;col++){const frame=(row===0||row===10||col===0||col===10),on=frame?(row+col)%2===0:((row*7+col*3+variant*5)%11)<5;if(on)c.fillRect(x+col*scale*1.8,y+row*scale*1.8,scale,scale)}cross(x-3,y-3,1);cross(x+20*scale,y+20*scale,1)};
 if(id.startsWith('cut:')){const code=id.slice(4);label('ATRIA / '+code,12,14,3.7);label('AL / FORM',288,14,3.3,'right');line(12,20,65,20,.35);label('[ void ]',12,402,3.5);label('90 : 00',288,402,3.5,'right');if(style==='pixels'){matrix(10,190,.4,Number(code));matrix(281,190,.3,Number(code)+1)}else{columns(10,173,3,62,2);columns(287,173,3,62,2)}dots(12,389,4);cross(286,385,2);c.restore();return}
 // Registration is discreet and remains identical for the interchangeable frame.
 for(const x of [22,278]){line(x,3.5,x+4,3.5,.35);line(x,416.5,x+4,416.5,.35)}
 label('ATRIA / '+id,150,417.2,2.7,'center');
 const layouts={
  '04':{x:139,y:186,w:22,h:70,code:'<init>',tx:107,ty:217,sx:169,sy:290},
  '05':{x:145,y:164,w:10,h:91,code:'[orb]',tx:140,ty:213,sx:146,sy:304},
  '06':{x:176,y:205,w:22,h:57,code:'// guard',tx:167,ty:270,sx:110,sy:264},
  '07':{x:171,y:214,w:23,h:58,code:'[sol]',tx:166,ty:280,sx:113,sy:263},
  '08':{x:174,y:247,w:26,h:55,code:'<rise>',tx:169,ty:309,sx:101,sy:183},
  '09':{x:147,y:170,w:6,h:80,code:'[ ]',tx:146,ty:214,sx:145,sy:294},
  '11':{x:35,y:62,w:24,h:36,code:'[ void ]',tx:35,ty:112,sx:231,sy:325},
  '10':{x:146,y:229,w:30,h:67,code:'<duo>',tx:142,ty:303,sx:88,sy:181},
 };
 const a=layouts[id]||layouts['04'];
 if(style==='pixels'){
  matrix(a.x-1,a.y+13,.9,Number(id));matrix(a.sx,a.sy,.52,Number(id)+1);
  label('0x'+Number(id).toString(16).padStart(2,'0').toUpperCase(),a.tx,a.ty,4.2);
 }else{
  columns(a.x,a.y,a.w,a.h,id==='09'?3:7);label(a.code,a.tx,a.ty,id==='09'?3.2:4.2);
  label('01 : 10',a.sx,a.sy,3.2);dots(a.sx,a.sy+5,5);
 }
 if(id==='04'){label('//run',111,263,3.8);cross(150,27,2);dots(130,350,7)}
 if(id==='05'){cross(150,210,2.2);label('N',149,33,3.4);dots(143,387,5)}
 if(id==='06'||id==='07'){
  columns(300-a.x-a.w,a.y,a.w,a.h,7);cross(150,id==='06'?77:44,3);
  label('01',101,303,3.4);label('10',190,303,3.4);dots(141,382,7);
 }
 if(id==='08'){
  label('0b1010',162,37,4.2);label('// phase',32,394,3.7);
  path([['moveTo',270,26],['bezierCurveTo',223,25,179,52,157,91]]);
  cross(269,76,3);
 }
 if(id==='09'){
  label('// north',22,15,3.5);label('// south',240,408,3.5);
  for(const y of [70,350]){dots(21,y,4);dots(270,y,4)}
  cross(150,210,3);label('01',147,93,3.3);label('10',147,333,3.3);
 }
 if(id==='11'){label('FORM / 011',33,38,3.8);line(33,44,85,44,.35);label('90°',232,376,3.7);cross(266,36,3);dots(34,378,5)}
 if(id==='10'){
  // A continuous, authored arc inscription replaces the noisy marks in the reference.
  label('0xFF',23,31,5);label('/ CONSTELLATION',23,40,2.9);
  path([['moveTo',28,52],['bezierCurveTo',72,43,113,59,144,77]]);
  path([['moveTo',33,55],['bezierCurveTo',74,49,107,61,133,75]]);
  cross(258,55,4);dots(253,65,4);
  label('[01:10]',85,207,3.7);line(87,213,105,213,.35);
  path([['moveTo',284,318],['bezierCurveTo',285,344,284,370,282,394]]);
  label('>>',275,405,3.2);dots(21,389,5);
 }
 c.restore();
}
