import assert from 'node:assert/strict';
import {isAppleMobile,quickLookURL,observeARAvailability,probeWebAR,webARHelp,chromeIntent} from '../src/arPlatform.js';
assert.ok(isAppleMobile({userAgent:'Mozilla/5.0 (iPhone; CPU iPhone OS 18_6 like Mac OS X)',platform:'iPhone',maxTouchPoints:5}));
assert.ok(isAppleMobile({userAgent:'Macintosh',platform:'MacIntel',maxTouchPoints:5}));
assert.equal(isAppleMobile({userAgent:'Macintosh',platform:'MacIntel',maxTouchPoints:0}),false);
assert.equal(quickLookURL('blob:example'),'blob:example#allowsContentScaling=0');
const viewer=new EventTarget(),doc=new EventTarget(),states=[];
viewer.loaded=false;viewer.canActivateAR=false;
const dispose=observeARAvailability(viewer,state=>states.push(state),doc);
viewer.loaded=true;viewer.dispatchEvent(new Event('load'));
assert.deepEqual(states.at(-1),{ready:true,supported:false});
// Regression: support resolves AFTER load with no new load event.
viewer.canActivateAR=true;
await new Promise(resolve=>setTimeout(resolve,360));
assert.deepEqual(states.at(-1),{ready:true,supported:true});
dispose();const count=states.length;
viewer.dispatchEvent(new Event('load'));doc.dispatchEvent(new Event('visibilitychange'));
await new Promise(resolve=>setTimeout(resolve,350));
assert.equal(states.length,count,'availability polling and listeners cleaned up on close');
const supportedEnvironment=()=>({
 nav:{xr:{isSessionSupported:async mode=>mode==='immersive-ar',requestSession:()=>{}}},
 win:{isSecureContext:true,XRSession:{prototype:{requestHitTestSource(){}}}},
 doc:{permissionsPolicy:{allowsFeature:()=>true}},timeoutMs:25
});
assert.equal(await probeWebAR(supportedEnvironment()),'supported');
let env=supportedEnvironment();env.nav.xr.isSessionSupported=async()=>false;
assert.equal(await probeWebAR(env),'unsupported');
env=supportedEnvironment();env.nav.xr=undefined;
assert.equal(await probeWebAR(env),'no-api');
env=supportedEnvironment();env.win.XRSession.prototype={};
assert.equal(await probeWebAR(env),'no-api');
env=supportedEnvironment();env.win.isSecureContext=false;
assert.equal(await probeWebAR(env),'insecure');
env=supportedEnvironment();env.doc.permissionsPolicy.allowsFeature=()=>false;
assert.equal(await probeWebAR(env),'policy-blocked');
env=supportedEnvironment();env.nav.xr.isSessionSupported=()=>{throw new DOMException('blocked','SecurityError')};
assert.equal(await probeWebAR(env),'policy-blocked');
env=supportedEnvironment();env.nav.xr.isSessionSupported=()=>Promise.reject(new Error('runtime unavailable'));
assert.equal(await probeWebAR(env),'unavailable');
env=supportedEnvironment();env.nav.xr.isSessionSupported=()=>new Promise(()=>{});
assert.equal(await probeWebAR(env),'timeout');
assert.match(webARHelp('unsupported',true),/ARCore/);
assert.match(webARHelp('no-api',true),/Chrome/);
assert.match(webARHelp('no-api',false),/iPhone/);
const page='https://example.github.io/atria/?view=%7B%22pattern%22%3A%2211%22%7D';
const intent=chromeIntent(page+'#old');
assert.ok(intent.startsWith('intent://example.github.io/atria/?view='));
assert.ok(intent.includes(';package=com.android.chrome;'));
assert.ok(intent.includes('S.browser_fallback_url='+encodeURIComponent(page)));
assert.throws(()=>chromeIntent('blob:https://example.com/model'),TypeError);
console.log('PASS: iPhone/iPad route; fixed native scale; late AR readiness; cleanup; capability/error/timeout branches; safe Chrome handoff.');
