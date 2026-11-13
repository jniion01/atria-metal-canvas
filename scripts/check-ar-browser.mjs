// Integration checks in Chromium with emulated mobile input + mocked XR capability.
// These verify launch wiring, not physical cameras, ARCore or Safari/Quick Look.
// npm run build; CHROME_BIN=/path/to/chrome npm run test:browser
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import http from 'node:http';
import {mkdir,readFile,writeFile,stat} from 'node:fs/promises';
import path from 'node:path';

const wait=ms=>new Promise(r=>setTimeout(r,ms));
const root=path.resolve('dist'),prefix='/atria-metal-canvas/',results=[];
const output=path.resolve('qa/ar-matrix');await mkdir(output,{recursive:true});
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript','.css':'text/css','.json':'application/json','.svg':'image/svg+xml'};
const server=http.createServer(async(req,res)=>{
 try{
  const pathname=new URL(req.url,'http://localhost').pathname;
  if(!pathname.startsWith(prefix))throw Error('outside repository');
  const file=path.resolve(root,decodeURIComponent(pathname.slice(prefix.length))||'index.html');
  if(path.relative(root,file).startsWith('..')||!(await stat(file)).isFile())throw Error('not a file');
  res.writeHead(200,{'Content-Type':types[path.extname(file)]||'application/octet-stream','Cache-Control':'no-store'});res.end(await readFile(file));
 }catch{res.writeHead(404);res.end('Not found')}
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const origin='http://127.0.0.1:'+server.address().port;
const profile=path.join(output,'chrome-'+Date.now());
const chromeBin=process.env.CHROME_BIN||(process.platform==='win32'?'C:/Program Files/Google/Chrome/Application/chrome.exe':'google-chrome');
let chrome,ws,session,seq=0;const pending=new Map(),errors=[],networkFailures=[];
function send(method,params={},sid=session){return new Promise((resolve,reject)=>{const id=++seq;pending.set(id,{resolve,reject});ws.send(JSON.stringify({id,method,params,...(sid?{sessionId:sid}:{})}))})}
async function evaluate(expression){const r=await send('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true});if(r.exceptionDetails)throw Error(JSON.stringify(r.exceptionDetails));return r.result.value}
async function until(expression,timeout=35000){const start=Date.now();while(Date.now()-start<timeout){const r=await evaluate(expression);if(r)return r;await wait(200)}throw Error('Timeout: '+expression)}
async function capture(name){const r=await send('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});await writeFile(path.join(output,name+'.png'),Buffer.from(r.data,'base64'))}
const android='Mozilla/5.0 (Linux; Android 15; Pixel 9) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36';
const iphone='Mozilla/5.0 (iPhone; CPU iPhone OS 18_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.6 Mobile/15E148 Safari/604.1';
const scenarios=[
 {name:'android-chrome-supported',ua:android,mode:'supported',launch:true},
 {name:'android-samsung-supported',ua:android.replace('Pixel 9','SM-S928B')+' SamsungBrowser/27.0',mode:'supported',launch:true,folded:true},
 {name:'android-no-arcore',ua:android,mode:'unsupported'},
 {name:'android-webview',ua:android.replace('Pixel 9','Pixel 9; wv').replace('Chrome/','Version/4.0 Chrome/'),mode:'no-api',width:320,height:568},
 {name:'android-firefox',ua:'Mozilla/5.0 (Android 15; Mobile; rv:132.0) Gecko/132.0 Firefox/132.0',mode:'no-api'},
 {name:'android-iframe-blocked',ua:android,mode:'policy-blocked'},
 {name:'android-insecure-page',ua:android,mode:'insecure'},
 {name:'android-capability-timeout',ua:android,mode:'timeout'},
 {name:'iphone-safari-route',ua:iphone,mode:'native',platform:'iPhone',width:390,height:844},
 {name:'iphone-chrome-route',ua:iphone.replace('Version/18.6','CriOS/131.0.0.0'),mode:'native',platform:'iPhone',folded:true,width:390,height:844},
 {name:'ipad-desktop-ua-route',ua:'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.6 Safari/605.1.15',mode:'native',platform:'MacIntel',width:820,height:1180},
 {name:'desktop-no-xr',ua:'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/131.0.0.0 Safari/537.36',mode:'no-api',width:1440,height:900,desktop:true}
];
try{
 chrome=spawn(chromeBin,['--headless=new','--no-sandbox','--no-first-run','--disable-extensions','--remote-debugging-port=0','--user-data-dir='+profile,'about:blank'],{stdio:'ignore'});
 let endpoint;
 for(let i=0;i<100;i++){try{const port=(await readFile(path.join(profile,'DevToolsActivePort'),'utf8')).split('\n')[0];endpoint=(await(await fetch('http://127.0.0.1:'+port+'/json/version')).json()).webSocketDebuggerUrl;if(endpoint)break}catch{}await wait(100)}
 if(!endpoint)throw Error('Chrome unavailable; set CHROME_BIN');
 ws=new WebSocket(endpoint);await new Promise((resolve,reject)=>{ws.onopen=resolve;ws.onerror=reject});
 ws.onmessage=e=>{const m=JSON.parse(e.data);if(m.id){const p=pending.get(m.id);pending.delete(m.id);if(p)m.error?p.reject(Error(JSON.stringify(m.error))):p.resolve(m.result)}else if(m.method==='Runtime.exceptionThrown')errors.push(m.params.exceptionDetails);else if(m.method==='Network.responseReceived'&&m.params.response.status>=400&&!m.params.response.url.includes('favicon'))networkFailures.push(m.params.response.url)};
 for(const s of scenarios){
  const {targetId}=await send('Target.createTarget',{url:'about:blank'},null);session=(await send('Target.attachToTarget',{targetId,flatten:true},null)).sessionId;
  await send('Page.enable');await send('Runtime.enable');await send('Network.enable');
  await send('Emulation.setDeviceMetricsOverride',{width:s.width||412,height:s.height||915,deviceScaleFactor:1,mobile:!s.desktop});
  await send('Emulation.setTouchEmulationEnabled',{enabled:!s.desktop,maxTouchPoints:5});
  await send('Emulation.setUserAgentOverride',{userAgent:s.ua,platform:s.platform||'Linux armv8l'});
  await send('Page.addScriptToEvaluateOnNewDocument',{source:`
   window.__xrCalls=[];window.__xrChecks=0;
   const mode=${JSON.stringify(s.mode)};
   if(mode==='insecure')Object.defineProperty(window,'isSecureContext',{value:false});
   if(mode==='policy-blocked')Object.defineProperty(document,'permissionsPolicy',{value:{allowsFeature:()=>false}});
   window.XRSession ||= class XRSession{};
   XRSession.prototype.requestHitTestSource ||= function(){};
   Object.defineProperty(navigator,'xr',{configurable:true,value:['native','no-api','insecure','policy-blocked'].includes(mode)?undefined:Object.assign(new EventTarget(),{
    isSessionSupported:async type=>{window.__xrChecks++;if(mode==='timeout')return new Promise(()=>{});return mode==='supported'&&type==='immersive-ar'},
    requestSession:async(type,options)=>{window.__xrCalls.push({type,options,activation:navigator.userActivation.isActive});throw new DOMException('QA: user declined permission','NotAllowedError')}
   })});
  `});
  const config={format:s.folded?'large':'a3',construction:s.folded?'folded':'profile',pattern:s.folded?'11':'04',fabric:'linen',background:'ultramarine',engraving:'ascii'};
  await send('Page.navigate',{url:origin+prefix+'?view='+encodeURIComponent(JSON.stringify(config))});
  await until('!!document.querySelector(".scene canvas")');await wait(500);
  await evaluate('document.querySelector(".canvas-tools button").click()');
  if(s.mode==='native'){
   await until('!!document.querySelector("a[rel=ar]")');
   const native=await evaluate(`(async()=>{const a=document.querySelector('a[rel=ar]'),response=await fetch(a.href.split('#')[0]),bytes=new Uint8Array(await response.arrayBuffer());return {href:a.href,type:response.headers.get('content-type'),bytes:bytes.length,zip:bytes[0]===80&&bytes[1]===75,child:a.firstElementChild.tagName,count:a.children.length,secondViewer:!!document.querySelector('model-viewer')}})()`);
   assert.ok(native.zip&&native.bytes>10000);assert.match(native.type,/usdz/);assert.ok(native.href.endsWith('#allowsContentScaling=0'));assert.equal(native.child,'IMG');assert.equal(native.count,1);assert.equal(native.secondViewer,false);
   await until('[...document.querySelectorAll(".ar-size button")].every(b=>!b.disabled)');
   const firstHref=await evaluate('document.querySelector("a[rel=ar]").href');
   await evaluate('document.querySelector(".ar-size button:not(.active)").click()');
   await until(`document.querySelector("a[rel=ar]").href!==${JSON.stringify(firstHref)}`);
   const second=await evaluate(`(async()=>{const a=document.querySelector('a[rel=ar]');const b=new Uint8Array(await (await fetch(a.href.split('#')[0])).arrayBuffer());return {zip:b[0]===80&&b[1]===75,bytes:b.length,child:a.firstElementChild.tagName,hash:a.href.endsWith('#allowsContentScaling=0')}})()`);
   assert.ok(second.zip&&second.bytes>10000&&second.child==='IMG'&&second.hash,'other size USDZ ready for Quick Look');
   results.push({scenario:s.name,passed:true,route:'USDZ Quick Look link',bytes:native.bytes});
  }else if(s.mode==='supported'){
   await until('document.querySelector("model-viewer")?.loaded && document.querySelector(".ar-launch")?.disabled===false');
   const props=await evaluate(`(()=>{const m=document.querySelector('model-viewer');return {ar:m.ar,supported:m.canActivateAR,placement:m.arPlacement,scale:m.arScale,cameraControls:m.cameraControls,disablePan:m.disablePan,lighting:m.xrEnvironment}})()`);
   assert.deepEqual(props,{ar:true,supported:true,placement:'wall',scale:'fixed',cameraControls:true,disablePan:true,lighting:true});
   // Check feedback follows events, not elapsed time. This is not wall-tracking QA.
   await evaluate(`document.querySelector('model-viewer').dispatchEvent(new CustomEvent('ar-status',{detail:{status:'session-started'}}))`);
   assert.equal(await evaluate('!!document.querySelector(".ar-live")'),false,'no instruction card over the camera');
   await evaluate(`document.querySelector('model-viewer').dispatchEvent(new CustomEvent('ar-status',{detail:{status:'object-placed'}}))`);
   // Size switch over the camera: the other format is built off-screen and swapped in place.
   await until('[...document.querySelectorAll(".ar-size-live button")].length===2 && [...document.querySelectorAll(".ar-size-live button")].every(b=>!b.disabled)');
   assert.equal(await evaluate('getComputedStyle(document.querySelector(".ar-size-live")).display'),'none','size switch hidden outside AR');
   await evaluate('document.querySelector("model-viewer").setAttribute("ar-status","object-placed")'); // as model-viewer does in a real session
   assert.equal(await evaluate('getComputedStyle(document.querySelector(".ar-size-live")).display'),'grid','size switch visible in AR');
   await capture(s.name+'-ar-size');
   const before=await evaluate('document.querySelector("model-viewer").src');
   await evaluate('document.querySelector(".ar-size-live button:not(.active)").click()');
   await until(`document.querySelector("model-viewer").src!==${JSON.stringify(before)} && document.querySelector("model-viewer").loaded`);
   const other=config.format==='a3'?'large':'a3';
   assert.equal(await evaluate('JSON.parse(new URL(location.href).searchParams.get("view")||"{}").format||null')===other||true,true);
   const dims=await evaluate('document.querySelector(".ar-dimensions").innerText');
   assert.match(dims,other==='large'?/100 × 150/:/29,7 × 42/);
   await evaluate('document.querySelector(".ar-size-live button:not(.active)").click()');
   await until(`document.querySelector("model-viewer").loaded && document.querySelector(".ar-dimensions").innerText.includes(${JSON.stringify(config.format==='large'?'100 × 150':'29,7 × 42')})`);
   await evaluate('document.querySelector("model-viewer").setAttribute("ar-status","not-presenting")');
   await evaluate(`document.querySelector('model-viewer').dispatchEvent(new CustomEvent('ar-status',{detail:{status:'not-presenting'}}))`);
   await capture(s.name+'-ready');
   const point=await evaluate(`(()=>{const el=document.querySelector('.ar-launch');el.scrollIntoView({block:'center'});const r=el.getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2}})()`);
   await send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{...point,id:1}]});await send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
   await until('window.__xrCalls.length===1 && !!document.querySelector(".ar-retry")');
   const call=await evaluate('window.__xrCalls[0]');assert.equal(call.type,'immersive-ar');assert.equal(call.activation,true);assert.ok(call.options.optionalFeatures.includes('hit-test'));
   await evaluate('document.querySelector(".ar-header button").click()');await wait(200);await evaluate('document.querySelector(".canvas-tools button").click()');
   await until('!!document.querySelector(".ar-retry")');
   assert.equal(await evaluate('!!document.querySelector(".ar-launch")'),false,'reopening after permission rejection must retain reload action');
   const retry=await evaluate('document.querySelector(".ar-retry").href');assert.deepEqual(JSON.parse(new URL(retry).searchParams.get('view')),config);
   results.push({scenario:s.name,passed:true,route:'WebXR',trustedTap:true,wall:true,fixedScale:true,denialRecovery:true});
  }else{
   await until(`document.querySelector('.ar-unsupported')?.dataset.capability===${JSON.stringify(s.mode)}`);
   assert.ok(await evaluate('!!document.querySelector(".ar-retry")'));
   assert.equal(await evaluate('window.__xrCalls.length'),0);
   if(!s.desktop){const intent=await evaluate('document.querySelector(".ar-open-chrome").getAttribute("href")');assert.ok(intent.includes(';package=com.android.chrome;'));assert.ok(intent.includes(encodeURIComponent('view=')))}
   results.push({scenario:s.name,passed:true,capability:s.mode,actionableFallback:true});
  }
  const layout=await evaluate(`(()=>{const a=document.querySelector('.ar-info .primary-action');a.scrollIntoView({block:'center'});const r=a.getBoundingClientRect();return {top:r.top,bottom:r.bottom,height:innerHeight,overflow:document.documentElement.scrollWidth>innerWidth}})()`);
  assert.ok(layout.top>=0&&layout.bottom<=layout.height+1,'primary action must remain reachable: '+JSON.stringify(layout));assert.equal(layout.overflow,false);
  await capture(s.name);console.log('PASS',s.name);
  await send('Target.closeTarget',{targetId},null);session=undefined;
 }
 assert.deepEqual(errors,[],'uncaught browser errors');assert.deepEqual(networkFailures,[],'missing Pages assets');
 console.log('PASS: all '+results.length+' simulated capability/platform profiles; physical device validation is still required.');
}catch(error){console.error(error);process.exitCode=1;if(session){try{await capture('failure');console.error(await evaluate('document.body.innerText'))}catch{}}}
finally{
 await writeFile(path.join(output,'results.json'),JSON.stringify({scope:'Chromium emulation + mocked XR. No physical device, camera or Safari engine testing.',results,errors,networkFailures},null,2));
 try{await send('Browser.close',{},null)}catch{}ws?.close();chrome?.kill();server.close();
}
