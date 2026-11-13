export function isAppleMobile(nav){
 return /iPad|iPhone|iPod/.test(nav.userAgent)||(nav.platform==='MacIntel'&&nav.maxTouchPoints>1);
}
export function quickLookURL(url){return url+'#allowsContentScaling=0'}

// Capability, not a phone-name allowlist, decides whether WebXR can launch.
// A timeout is inconclusive; never describe it as an unsupported phone.
export async function probeWebAR({nav=navigator,win=window,doc=document,timeoutMs=8000}={}){
 if(!win.isSecureContext)return 'insecure';
 const policy=doc.permissionsPolicy||doc.featurePolicy;
 if(policy?.allowsFeature&&!policy.allowsFeature('xr-spatial-tracking'))return 'policy-blocked';
 if(!nav.xr?.isSessionSupported||!nav.xr?.requestSession||!win.XRSession?.prototype.requestHitTestSource)return 'no-api';
 let timer;
 try{
  return await Promise.race([
   Promise.resolve().then(()=>nav.xr.isSessionSupported('immersive-ar')).then(ok=>ok?'supported':'unsupported',error=>error.name==='SecurityError'?'policy-blocked':'unavailable'),
   new Promise(resolve=>{timer=setTimeout(()=>resolve('timeout'),timeoutMs)})
  ]);
 }finally{clearTimeout(timer)}
}
export function webARHelp(capability,android){
 const messages={
  checking:'Проверяем поддержку AR…',
  insecure:'Для камеры нужен защищённый адрес HTTPS. Откройте опубликованный сайт GitHub Pages.',
  'policy-blocked':'В этом окне доступ к AR запрещён. Откройте сайт отдельной вкладкой браузера.',
  'no-api':android?'Этот браузер не предоставляет доступ к AR. Откройте страницу в Chrome; внутри Telegram и других приложений примерка может быть недоступна.':'Для примерки откройте ссылку на iPhone в Safari или на Android с поддержкой AR в Chrome.',
  unsupported:android?'Телефон или браузер не подтвердил поддержку AR. Проверьте совместимость с ARCore и обновите Chrome и «Сервисы Google Play для AR». 3D-просмотр остаётся доступен.':'На этом устройстве браузер не поддерживает AR. Отправьте ссылку на совместимый телефон.',
  unavailable:'Не удалось проверить AR. Откройте сайт отдельной вкладкой и повторите проверку.',
  timeout:'Браузер не ответил на проверку AR. Можно перезагрузить страницу и попробовать снова.',
  supported:'Подготавливаем запуск AR…'
 };
 return messages[capability]||messages.unavailable;
}
// Pass the page URL, never a browser-local GLB blob, to another application.
export function chromeIntent(pageURL){
 const url=new URL(pageURL);
 if(!['https:','http:'].includes(url.protocol))throw new TypeError('Expected a web page URL');
 url.hash='';
 return 'intent://'+url.host+url.pathname+url.search+'#Intent;scheme='+url.protocol.slice(0,-1)+';package=com.android.chrome;S.browser_fallback_url='+encodeURIComponent(url.href)+';end';
}
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
