import React,{useEffect,useRef,useState} from 'react';
import {createARAsset} from './arAsset';
import {arMessage,configurationLink} from './arState';
import {isAppleMobile,quickLookURL,observeARAvailability} from './arPlatform';
import {Icon} from './Icons';
const nativeIcon='data:image/svg+xml,'+encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#f6f7ef" stroke-width="1.4"><path d="M3 8V3h5m8 0h5v5M3 16v5h5m8 0h5v-5M7 9l5-3 5 3v6l-5 3-5-3zM7 9l5 3 5-3m-5 3v6"/></svg>');
export default function ARPreview({modelSource,config,onClose,unavailable}){
 const viewer=useRef(),dialog=useRef(),[asset,setAsset]=useState(null),[ready,setReady]=useState(false),[supported,setSupported]=useState(false),[status,setStatus]=useState('not-presenting'),[tracking,setTracking]=useState('tracking'),[error,setError]=useState(''),[copied,setCopied]=useState(false),[copyFallback,setCopyFallback]=useState(false),[native,setNative]=useState(false);
 const ios=isAppleMobile(navigator),[viewerDefined,setViewerDefined]=useState(false);
 useEffect(()=>{
  // Quick Look needs no second WebGL renderer or WebXR capability check.
  if(ios)return;
  let active=true;
  import('@google/model-viewer').then(()=>customElements.whenDefined('model-viewer')).then(()=>{if(active)setViewerDefined(true)}).catch(()=>active&&setError('Не удалось загрузить AR-просмотрщик. Проверьте соединение и откройте примерку снова.'));
  return()=>{active=false};
 },[ios]);
 useEffect(()=>{
  let active=true,url,raf;const before=document.activeElement,start=performance.now();
  dialog.current?.querySelector('button')?.focus({preventScroll:true});
  const capture=()=>{
   if(!active)return;
   const source=modelSource.current?.();
   if(!source){if(performance.now()-start>12000){setError('Модель ещё не готова. Закройте примерку и попробуйте снова.');return}raf=requestAnimationFrame(capture);return}
   createARAsset(source,{quickLook:ios}).then(result=>{url=result.url;if(active){setAsset(result);if(ios){setReady(true);setSupported(true)}}else URL.revokeObjectURL(url)}).catch(()=>active&&setError('Не удалось подготовить модель для AR. Закройте примерку и повторите попытку.'));
  };if(unavailable)setError('В этом браузере недоступна 3D-графика. Откройте ссылку в Safari на iPhone или Chrome на совместимом Android.');else capture();
  return()=>{active=false;cancelAnimationFrame(raf);if(url)URL.revokeObjectURL(url);requestAnimationFrame(()=>before?.focus({preventScroll:true}))};
 },[modelSource,unavailable,ios]);
 useEffect(()=>{
  const el=viewer.current;if(ios||!el||!asset||!viewerDefined)return;
  const release=observeARAvailability(el,state=>{setReady(state.ready);setSupported(state.supported)});
  const changed=e=>{setStatus(e.detail.status);if(e.detail.status==='not-presenting'){setTracking('tracking');setNative(false)}};
  const track=e=>setTracking(e.detail.status);
  const failed=()=>setError('Браузер не смог загрузить 3D-модель. Попробуйте обновить страницу.');
  el.addEventListener('ar-status',changed);el.addEventListener('ar-tracking',track);el.addEventListener('error',failed);
  return()=>{release();el.removeEventListener('ar-status',changed);el.removeEventListener('ar-tracking',track);el.removeEventListener('error',failed)};
 },[asset,ios,viewerDefined]);
 const message=arMessage(status,tracking);
 const launch=()=>{setError('');viewer.current?.activateAR().catch(()=>setStatus('failed'))};
 const share=async()=>{try{await navigator.clipboard.writeText(configurationLink(config,location.href));setCopied(true)}catch{setCopyFallback(true)}};
 function keys(e){
  if(e.key==='Escape')onClose();
  if(e.key==='Tab'){const nodes=[...dialog.current.querySelectorAll('button:not(:disabled),a[href],input')].filter(x=>x.offsetParent!==null);const first=nodes[0],last=nodes.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus()}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus()}}
 }
 return <div className="ar-backdrop"><section className="ar-dialog" ref={dialog} role="dialog" aria-modal="true" aria-labelledby="ar-title" onKeyDown={keys}>
  <header className="ar-header"><div><span className="small-label">ATRIA / В ВАШЕМ ПРОСТРАНСТВЕ</span><h2 id="ar-title">Примерка на стене</h2></div><button className="icon-button" onClick={onClose} aria-label="Закрыть AR"><Icon name="close"/></button></header>
  <div className={'ar-model-area'+(ios?' ar-native-area':'')}>{ios&&asset?<div className="ar-native-ready" role="status"><Icon name="ar" size={44}/><strong>Картина готова к примерке</strong><span>Ваша конфигурация · масштаб 1:1</span></div>:asset&&viewerDefined?<model-viewer ref={viewer} src={asset.url} ar="" ar-modes="webxr" ar-placement="wall" ar-scale="fixed" xr-environment="" ar-usdz-max-texture-size="1536" camera-controls="" disable-pan="" shadow-intensity="1" environment-image="neutral" exposure="1" interaction-prompt="none" alt="Выбранная картина ATRIA в реальном размере">
   <button slot="ar-button" className="ar-hidden-button" aria-hidden="true" tabIndex={-1}/>
   <div className="ar-live" aria-live="polite"><span className={'ar-scan-mark '+(status==='object-placed'?'placed':'')}><Icon name={status==='object-placed'?'check':'ar'} size={24}/></span><strong>{message.title}</strong><p>{message.text}</p><span>МАСШТАБ 1:1</span></div>
   <button slot="exit-webxr-ar-button" className="ar-exit"><Icon name="close"/> Завершить примерку</button>
  </model-viewer>:<div className="ar-loading" role="status">{error?'Модель недоступна':<><span className="ar-spinner"/>Подготавливаем вашу конфигурацию…</>}</div>}</div>
  <div className="ar-info">
   <div className="ar-dimensions"><span>Изображение · {config.format==='large'?'100 × 150 см':'29,7 × 42 см'}</span>{asset&&<span>Снаружи · {(asset.size[0]*100).toFixed(1)} × {(asset.size[1]*100).toFixed(1)} см</span>}</div>
   <p>{ios?'В Quick Look выберите «AR» и направьте камеру на стену. Дождитесь распознавания поверхности, затем перетащите картину в нужное место.':'Наведите камеру на стену и медленно перемещайте телефон. После размещения картину можно двигать одним пальцем.'}</p>
   <p className="ar-note">Нужны свет и заметная фактура стены. Размер зафиксирован; точность привязки зависит от камеры и отслеживания.</p>
   {error&&<p role="alert" className="ar-error">{error}</p>}
   {status==='failed'&&<p role="alert">{message.text}</p>}
   {native&&<p role="status">Если появился предварительный просмотр файла, коснитесь модели, затем выберите «AR».</p>}
   {ios&&<p className="ar-note">Если примерка не открылась во встроенном браузере, откройте эту страницу в Safari.</p>}
   {ready&&!supported&&!ios&&<p className="ar-unsupported">Проверяем доступность AR. Если кнопка остаётся неактивной, откройте ссылку в Chrome на Android с поддержкой AR.</p>}
   {ios&&asset&&!error?<a className="primary-action ar-native-action" rel="ar" href={quickLookURL(asset.url)} download="atria.usdz" aria-label="Открыть камеру и примерить" data-label="Открыть камеру и примерить" onClick={()=>setNative(true)}><img src={nativeIcon} alt=""/></a>:<button className="primary-action" disabled={!ready||!supported||!!error} onClick={launch}>{error?'Примерка недоступна':!ready?'Подготовка модели…':status==='failed'?'Повторить запуск AR':'Включить камеру и примерить'}<Icon name="ar"/></button>}
   {copyFallback&&<input className="ar-copy-url" aria-label="Ссылка на конфигурацию" readOnly value={configurationLink(config,location.href)} onFocus={e=>e.target.select()}/>}
   <button className="ar-share" onClick={share}>{copied?'Ссылка скопирована':'Скопировать ссылку на эту конфигурацию'}<Icon name={copied?'check':'arrow'}/></button>
  </div>
 </section></div>;
}
