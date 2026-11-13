import React,{useEffect,useRef,useState} from 'react';
import {createARAsset} from './arAsset';
import {configurationLink} from './arState';
import {createFormatAsset} from './arOffscreen';
import {isAppleMobile,quickLookURL,observeARAvailability,probeWebAR,webARHelp,chromeIntent} from './arPlatform';
import {Icon} from './Icons';
// model-viewer disables WebXR for the document after a rejected session.
// Preserve a working reload action even if the user closes and reopens this modal.
let needsARReload=false;
const sizes=[['a3','А3','29,7 × 42 см'],['large','100 × 150','100 × 150 см']];
const nativeIcon='data:image/svg+xml,'+encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#f6f7ef" stroke-width="1.4"><path d="M3 8V3h5m8 0h5v5M3 16v5h5m8 0h5v-5M7 9l5-3 5 3v6l-5 3-5-3zM7 9l5 3 5-3m-5 3v6"/></svg>');

export default function ARPreview({modelSource,modelProps,config,onClose,onFormatChange,unavailable}){
 const viewer=useRef(),dialog=useRef();
 const initialFormat=useRef(config.format==='large'?'large':'a3').current,buildProps=useRef(modelProps).current,urls=useRef([]);
 const [assets,setAssets]=useState({}),[size,setSize]=useState(initialFormat),[sizeError,setSizeError]=useState(false),asset=assets[size];
 const [ready,setReady]=useState(false),[supported,setSupported]=useState(false);
 const [status,setStatus]=useState(()=>needsARReload?'failed':'not-presenting'),[error,setError]=useState('');
 const [copied,setCopied]=useState(false),[copyFallback,setCopyFallback]=useState(false),[native,setNative]=useState(false);
 const [viewerDefined,setViewerDefined]=useState(false),[capability,setCapability]=useState('checking');
 const ios=isAppleMobile(navigator),android=/Android/i.test(navigator.userAgent);
 const pageURL=configurationLink(config,location.href);

 useEffect(()=>{
  // Quick Look needs no second WebGL renderer or WebXR capability check.
  if(ios)return;
  let active=true;
  import('@google/model-viewer').then(()=>customElements.whenDefined('model-viewer')).then(()=>{if(active)setViewerDefined(true)}).catch(()=>active&&setError('Не удалось загрузить AR-просмотрщик. Проверьте соединение и откройте примерку снова.'));
  const check=()=>{if(document.visibilityState==='hidden')return;probeWebAR().then(result=>{if(active)setCapability(result)})};
  check();document.addEventListener('visibilitychange',check);
  return()=>{active=false;document.removeEventListener('visibilitychange',check)};
 },[ios]);

 useEffect(()=>{
  let active=true,raf;const before=document.activeElement,start=performance.now();
  dialog.current?.querySelector('button')?.focus({preventScroll:true});
  const capture=()=>{
   if(!active)return;
   const source=modelSource.current?.();
   if(!source){if(performance.now()-start>12000){setError('Модель ещё не готова. Закройте примерку и попробуйте снова.');return}raf=requestAnimationFrame(capture);return}
   const keep=(format,result)=>{if(!active){URL.revokeObjectURL(result.url);return}urls.current.push(result.url);setAssets(a=>({...a,[format]:result}))};
   createARAsset(source,{quickLook:ios}).then(result=>{
    keep(initialFormat,result);if(!active)return;
    if(ios){setReady(true);setSupported(true)}
    // Prepare the other size in the background, so the switch is instant, also inside AR.
    const other=initialFormat==='a3'?'large':'a3';
    if(buildProps)createFormatAsset(buildProps,other,{quickLook:ios}).then(r=>keep(other,r)).catch(()=>active&&setSizeError(true));
   }).catch(()=>active&&setError('Не удалось подготовить модель для AR. Закройте примерку и обновите страницу.'));
  };
  if(unavailable)setError('В этом браузере недоступна 3D-графика. Откройте ссылку в Safari на iPhone или Chrome на совместимом Android.');else capture();
  return()=>{active=false;cancelAnimationFrame(raf);urls.current.forEach(u=>URL.revokeObjectURL(u));urls.current=[];requestAnimationFrame(()=>before?.focus({preventScroll:true}))};
 },[modelSource,unavailable,ios]);

 const hasAsset=!!asset;
 useEffect(()=>{
  const el=viewer.current;if(ios||!el||!hasAsset||!viewerDefined)return;
  const release=observeARAvailability(el,state=>{setReady(state.ready);setSupported(state.supported)});
  const changed=e=>{if(e.detail.status==='failed')needsARReload=true;setStatus(e.detail.status);if(e.detail.status==='not-presenting')setNative(false)};
  const failed=()=>setError('Браузер не смог загрузить 3D-модель. Попробуйте обновить страницу.');
  el.addEventListener('ar-status',changed);el.addEventListener('error',failed);
  return()=>{release();el.removeEventListener('ar-status',changed);el.removeEventListener('error',failed)};
 },[hasAsset,ios,viewerDefined]);

 const failed=status==='failed';
 const choose=format=>{if(!assets[format]||format===size)return;setSize(format);onFormatChange?.(format)};
 const sizeSwitch=extra=><div className={'ar-size'+(extra?' '+extra:'')} role="group" aria-label="Размер картины">{sizes.map(([id,label])=><button key={id} type="button" aria-pressed={size===id} className={size===id?'active':''} disabled={!assets[id]} onClick={()=>choose(id)}>{label}{!assets[id]&&!sizeError&&<span className="ar-spinner" aria-hidden="true"/>}</button>)}</div>;
 const blocked=!ios&&!supported&&capability!=='checking'&&capability!=='supported';
 const launch=()=>{
  // Do not await export or capability checks here: WebXR requires the original tap.
  setStatus('launching');setError('');
  viewer.current?.activateAR().catch(()=>{needsARReload=true;setStatus('failed')});
 };
 const share=async()=>{try{await navigator.clipboard.writeText(pageURL);setCopied(true)}catch{setCopyFallback(true)}};
 function keys(e){
  if(e.key==='Escape')onClose();
  if(e.key==='Tab'){const nodes=[...dialog.current.querySelectorAll('button:not(:disabled),a[href],input')].filter(x=>x.offsetParent!==null);const first=nodes[0],last=nodes.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus()}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus()}}
 }
 return <div className="ar-backdrop"><section className="ar-dialog" ref={dialog} role="dialog" aria-modal="true" aria-labelledby="ar-title" onKeyDown={keys}>
  <header className="ar-header"><div><span className="small-label">ATRIA / В ВАШЕМ ПРОСТРАНСТВЕ</span><h2 id="ar-title">Примерка на стену</h2></div><button className="icon-button" onClick={onClose} aria-label="Закрыть AR"><Icon name="close"/></button></header>
  <div className={'ar-model-area'+(ios?' ar-native-area':'')}>{ios&&asset?<div className="ar-native-ready" role="status"><Icon name="ar" size={44}/><strong>Картина готова к примерке</strong><span>Ваша конфигурация и масштаб 1:1</span></div>:asset&&viewerDefined?<model-viewer ref={viewer} src={asset.url} ar={true} ar-modes="webxr" ar-placement="wall" ar-scale="fixed" xr-environment="" ar-usdz-max-texture-size="1536" camera-controls="" disable-pan="" shadow-intensity="1" environment-image="neutral" exposure="1" interaction-prompt="none" alt="Выбранная картина ATRIA в реальном размере">
   <button slot="ar-button" className="ar-hidden-button" aria-hidden="true" tabIndex={-1}/>
   {sizeSwitch('ar-size-live')}
   <button slot="exit-webxr-ar-button" className="ar-exit"><Icon name="close"/> Закончить примерку</button>
  </model-viewer>:<div className="ar-loading" role="status">{error?'Модель недоступна':<><span className="ar-spinner"/>Подготавливаем вашу конфигурацию…</>}</div>}</div>
  <div className="ar-info">
   {sizeSwitch()}
   <div className="ar-dimensions"><span>Изображение · {sizes.find(s=>s[0]===size)[2]}</span>{asset&&<span>Снаружи · {(asset.size[0]*100).toFixed(1)} × {(asset.size[1]*100).toFixed(1)} см</span>}</div>
   <p>{ios?'В Quick Look выберите «AR» и направьте камеру на стену. Дождитесь распознавания поверхности, затем сдвиньте картину в нужное место.':'Наведите камеру на стену и медленно перемещайте телефон. После размещения картину можно двигать одним пальцем, а размер — менять кнопками внизу экрана.'}</p>
   <p className="ar-note">Нужны свет и заметная фактура стены. Размер зафиксирован; точность привязки зависит от камеры и отслеживания.</p>
   {error&&<p role="alert" className="ar-error">{error}</p>}
   {failed&&<p role="alert" className="ar-error">Не удалось включить камеру. Проверьте разрешения камеры и AR в настройках сайта. После отказа нужен новый запуск страницы.</p>}
   {native&&<p role="status">Если появился предварительный просмотр файла, коснитесь модели, затем выберите «AR».</p>}
   {ios&&<p className="ar-note">Если примерка не открылась во встроенном браузере, откройте эту страницу в Safari.</p>}
   {!supported&&!ios&&!error&&!failed&&<p className="ar-unsupported" role="status" data-capability={capability}>{webARHelp(capability,android)}</p>}
   {ios&&asset&&!error?<a key={asset.url} className="primary-action ar-native-action" rel="ar" href={quickLookURL(asset.url)} download="atria.usdz" aria-label="Открыть камеру и примерить" data-label="Открыть камеру и примерить" onClick={()=>setNative(true)}><img src={nativeIcon} alt=""/></a>:failed||error||blocked?<a className="primary-action ar-retry" href={pageURL} target="_top">Перезагрузить и попробовать<Icon name="arrow"/></a>:<button className="primary-action ar-launch" disabled={!ready||!supported||status==='launching'} onClick={launch}>{!ready?'Подготовка модели…':status==='launching'?'Запускаем камеру…':!supported?'Проверяем AR…':'Включить камеру и примерить'}<Icon name="ar"/></button>}
   {android&&(blocked||failed)&&<a className="ar-share ar-open-chrome" href={chromeIntent(pageURL)}>Открыть в Chrome<Icon name="arrow"/></a>}
   {android&&blocked&&<a className="ar-share" href="https://play.google.com/store/apps/details?id=com.google.ar.core" target="_blank" rel="noopener noreferrer">Проверить сервисы Google Play для AR<Icon name="arrow"/></a>}
   {copyFallback&&<input className="ar-copy-url" aria-label="Ссылка на конфигурацию" readOnly value={pageURL} onFocus={e=>e.target.select()}/>}
   <button className="ar-share" onClick={share}>{copied?'Ссылка скопирована':'Скопировать ссылку на эту конфигурацию'}<Icon name={copied?'check':'arrow'}/></button>
  </div>
 </section></div>;
}
