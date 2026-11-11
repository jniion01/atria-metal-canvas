// These labels follow real runtime events; elapsed time never means a wall was found.
export function arMessage(status,tracking){
 if(tracking==='not-tracking')return {title:'Восстанавливаем привязку',text:'Остановитесь и наведите камеру на освещённый участок стены.'};
 if(status==='session-started')return {title:'Ищем стену',text:'Медленно перемещайте телефон. Наведите его на вертикальную поверхность с заметной фактурой.'};
 if(status==='object-placed')return {title:'Картина размещена',text:'Перетащите её одним пальцем вдоль стены. Масштаб 1:1 зафиксирован.'};
 if(status==='failed')return {title:'AR не удалось запустить',text:'Откройте страницу в Safari на iPhone или Chrome на Android с поддержкой AR. Проверьте разрешение камеры.'};
 return {title:'Примерка на стене',text:'Размер выбранной картины передаётся в метрах. В AR её можно передвигать, не меняя масштаб.'};
}
export function configurationLink(config,location){
 const url=new URL(location);url.searchParams.set('view',JSON.stringify(config));url.hash='';return url.href;
}
