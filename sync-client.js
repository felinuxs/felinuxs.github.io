// sync-client.js — Sync bidireccional via formato backup JSON
(function(){
'use strict';
function makeKey(){var b=new Uint8Array(16);crypto.getRandomValues(b);return Array.from(b).map(function(x){return x.toString(16).padStart(2,'0');}).join('');}
var _url=localStorage.getItem('jam_sync_url')||'';
var _name=localStorage.getItem('jam_sync_name')||'';
var _key=localStorage.getItem('jam_sync_key')||'';
var _active=false;var _timer=null;
function isConnected(){return _active;}
function getName(){return _name;}
function getUrl(){return _url;}

async function setupPrincipal(name){
    _name=name;_key=_key||makeKey();
    var base='http://'+(location.hostname||location.host||'localhost')+':3000';
    try{var r=await fetch(base+'/ip');var d=await r.json();if(d.ok&&d.ip){_url='http://'+d.ip+':3000';}else{_url=base;}}
    catch(e){_url=base;}
    localStorage.setItem('jam_sync_url',_url);
    localStorage.setItem('jam_sync_name',_name);
    localStorage.setItem('jam_sync_key',_key);
    _active=true;
    if(_timer)clearInterval(_timer);
    _timer=setInterval(bidirectionalSync,30000);
    try{await bidirectionalSync();}catch(e){console.log('[SYNC] Initial sync err:',e.message);}
    return{payload:JSON.stringify({u:_url,n:_name,k:_key}),name:_name,url:_url};
}

function showQR(canvasId,payload){
    var c=document.getElementById(canvasId);if(!c)return;
    try{var qr=qrcode(0,'M');qr.addData(payload);qr.make();var mc=qr.getModuleCount(),sz=256,cl=sz/mc;var ctx=c.getContext('2d');c.width=sz;c.height=sz;ctx.fillStyle='#fff';ctx.fillRect(0,0,sz,sz);ctx.fillStyle='#000';for(var r=0;r<mc;r++)for(var co=0;co<mc;co++)if(qr.isDark(r,co))ctx.fillRect(co*cl,r*cl,cl+.5,cl+.5);}
    catch(e){var ctx2=c.getContext('2d');c.width=256;c.height=256;ctx2.fillStyle='#fff';ctx2.fillRect(0,0,256,256);ctx2.fillStyle='#f00';ctx2.font='12px sans-serif';ctx2.fillText('Error: '+e.message,20,130);}
}

function scanAndConnect(){
    return new Promise(function(resolve,reject){
        var overlay=document.createElement('div');
        overlay.style.cssText='position:fixed;top:0;left:0;width:100%;height:100%;background:#000;z-index:99999;display:flex;flex-direction:column;align-items:center;justify-content:center';
        var videoEl=document.createElement('video');videoEl.setAttribute('playsinline','true');videoEl.setAttribute('autoplay','true');
        videoEl.style.cssText='max-width:100%;max-height:70vh;border-radius:12px;border:3px solid #8b5cf6';
        var hint=document.createElement('div');hint.style.cssText='color:#fff;font-size:14px;margin-top:12px;text-align:center';hint.textContent='Apunta al QR del dispositivo principal...';
        var cancelBtn=document.createElement('button');cancelBtn.textContent='Cancelar';cancelBtn.style.cssText='color:#fff;background:#ef4444;border:none;padding:10px 30px;border-radius:8px;margin-top:16px;font-size:14px;cursor:pointer';
        overlay.appendChild(videoEl);overlay.appendChild(hint);overlay.appendChild(cancelBtn);document.body.appendChild(overlay);
        var stream=null,done=false,scanner=null;
        function cleanup(){done=true;if(scanner)clearInterval(scanner);if(stream)stream.getTracks().forEach(function(t){t.stop();});if(overlay.parentNode)overlay.parentNode.removeChild(overlay);}
        cancelBtn.onclick=function(){cleanup();reject(new Error('Cancelado'));};
        if(typeof jsQR==='undefined'){cleanup();reject(new Error('Libreria jsQR no cargada'));return;}
        var scanCanvas=document.createElement('canvas');var scanCtx=scanCanvas.getContext('2d',{willReadFrequently:true});scanCanvas.width=400;scanCanvas.height=300;
        navigator.mediaDevices.getUserMedia({video:{facingMode:'environment'}})
        .then(function(s){
            stream=s;videoEl.srcObject=stream;videoEl.play();
            videoEl.onplaying=function(){hint.textContent='Escaneando... apunta al QR';};
            scanner=setInterval(function(){
                if(done)return;if(videoEl.readyState<2||!videoEl.videoWidth||!videoEl.videoHeight)return;
                scanCtx.drawImage(videoEl,0,0,400,300);var imageData=scanCtx.getImageData(0,0,400,300);
                var code=jsQR(imageData.data,imageData.width,imageData.height,{inversionAttempts:'attemptBoth'});
                if(!code)return;
                try{var obj=JSON.parse(code.data);if(!obj.u||!obj.k)return;done=true;cleanup();_url=obj.u;_name=obj.n||'Principal';_key=obj.k;localStorage.setItem('jam_sync_url',_url);localStorage.setItem('jam_sync_name',_name);localStorage.setItem('jam_sync_key',_key);resolve({name:_name,url:_url});}catch(e){}
            },150);
        })
        .catch(function(){cleanup();scanFallbackFile().then(resolve).catch(reject);});
    });
}

function scanFallbackFile(){
    return new Promise(function(resolve,reject){
        var input=document.createElement('input');input.type='file';input.accept='image/*';input.setAttribute('capture','environment');input.style.display='none';
        document.body.appendChild(input);
        input.addEventListener('change',function(){
            var file=input.files[0];document.body.removeChild(input);
            if(!file)return reject(new Error('No se selecciono imagen'));
            var img=new Image();
            img.onload=function(){var cv=document.createElement('canvas');cv.width=img.width;cv.height=img.height;cv.getContext('2d').drawImage(img,0,0);var id=cv.getContext('2d').getImageData(0,0,cv.width,cv.height);var code=jsQR(id.data,id.width,id.height,{inversionAttempts:'attemptBoth'});if(!code)return reject(new Error('No se detecto QR'));try{var obj=JSON.parse(code.data);if(!obj.u||!obj.k)return reject(new Error('QR invalido'));_url=obj.u;_name=obj.n||'Principal';_key=obj.k;localStorage.setItem('jam_sync_url',_url);localStorage.setItem('jam_sync_name',_name);localStorage.setItem('jam_sync_key',_key);resolve({name:_name,url:_url});}catch(e){reject(new Error('QR invalido'));}};
            img.onerror=function(){reject(new Error('Error leyendo imagen'));};img.src=URL.createObjectURL(file);
        });input.click();
    });
}

var STORES=['productos','ventas','clientes','proveedores','gastos','empleados'];

async function bidirectionalSync(){
    if(!_url)return{ok:false,msg:'Sin URL'};
    var getDatos=window.jamGetAllDatos;
    var combinar=window.jamCombinarImportacion;
    var saveIDB=window.jamSaveIDB;
    if(!getDatos||!combinar)return{ok:false,msg:'App no lista (recarga la pagina)'};
    try{
        var localData=await getDatos();
        console.log('[SYNC] POST '+_url+'/sync — productos:'+(localData.productos||[]).length+' ventas:'+(localData.ventas||[]).length+' bytes:'+JSON.stringify(localData).length);
        var r=await fetch(_url+'/sync',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(localData)});
        var serverResult=await r.json();
        console.log('[SYNC] POST resultado:',JSON.stringify(serverResult));
        if(!serverResult.ok)return{ok:false,msg:serverResult.err||'Error del servidor'};
        var serverStore=await fetch(_url+'/pull').then(function(res){return res.json();});
        console.log('[SYNC] GET /pull productos:'+(serverStore.productos||[]).length+' ventas:'+(serverStore.ventas||[]).length);
        var d=window.D;
        if(!d)return{ok:false,msg:'Datos no disponibles'};
        var totalAdded=0,totalSkipped=0;
        for(var j=0;j<STORES.length;j++){
            var st=STORES[j];
            if(!serverStore[st]||!Array.isArray(serverStore[st]))continue;
            var campoNombre=st==='productos'?'nombre':null;
            var result=combinar(d[st]||[],serverStore[st],campoNombre);
            d[st]=result.lista;
            totalAdded+=result.agregados;
            totalSkipped+=result.omitidos;
            console.log('[SYNC] '+st+': '+result.lista.length+' items (+'+result.agregados+' nuevos, '+result.omitidos+' dup)');
            if(saveIDB){try{await saveIDB(st,result.lista);}catch(e){console.log('[SYNC] IDB err:',e.message);}}
        }
        var notify=typeof mostrarNotificacion==='function'?mostrarNotificacion:null;
        console.log('[SYNC] DONE +'+totalAdded+' skip'+totalSkipped);
        if(totalAdded>0){if(notify)notify('Sync: '+totalAdded+' registros nuevos integrados','success');}
        else{if(notify)notify('Bases de datos al dia','info');}
        return{ok:true,added:totalAdded,skipped:totalSkipped};
    }catch(e){
        console.log('[SYNC] ERROR:',e.message);
        var notify2=typeof mostrarNotificacion==='function'?mostrarNotificacion:null;
        if(notify2)notify2('Error sync: '+e.message,'error');
        return{ok:false,msg:e.message};
    }
}

function startSync(){if(_active||!_url)return;_active=true;_timer=setInterval(bidirectionalSync,30000);bidirectionalSync();}
function stopSync(){_active=false;if(_timer){clearInterval(_timer);_timer=null;}}

if(_url&&_name){
    console.log('[SYNC] Auto-reconnect: '+_url+' '+_name);
    fetch(_url+'/info').then(function(r){if(r.ok){_active=true;_timer=setInterval(bidirectionalSync,30000);bidirectionalSync();}}).catch(function(e){console.log('[SYNC] Auto-reconnect fail:',e.message);});
}

window.JAMSync={setupPrincipal:setupPrincipal,showQR:showQR,scanAndConnect:scanAndConnect,startSync:startSync,stopSync:stopSync,isConnected:isConnected,getName:getName,getUrl:getUrl,bidirectionalSync:bidirectionalSync};
})();
