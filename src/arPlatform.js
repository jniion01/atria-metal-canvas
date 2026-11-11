export function isAppleMobile(nav){
 return /iPad|iPhone|iPod/.test(nav.userAgent)||(nav.platform==='MacIntel'&&nav.maxTouchPoints>1);
}
export function quickLookURL(url){return url+'#allowsContentScaling=0'}
// canActivateAR is selected asynchronously, independently of the model's load.
// Recheck while the dialog is open, and on return from the native AR viewer.
export function observeARAvailability(viewer,onChange,doc=document){
 const check=()=>onChange({ready:!!viewer.loaded,supported:!!viewer.canActivateAR});
 const events=['load','ar-status','progress'];
 events.forEach(type=>viewer.addEventListener(type,check));
 doc.addEventListener('visibilitychange',check);
 const timer=setInterval(check,300);check();
 return()=>{clearInterval(timer);events.forEach(type=>viewer.removeEventListener(type,check));doc.removeEventListener('visibilitychange',check)};
}
