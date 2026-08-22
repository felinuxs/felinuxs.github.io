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
        var videoWrap=document.createElement('div');
        videoWrap.style.cssText='position:relative;width:300px;height:300px;border-radius:16px;overflow:hidden;border:2px solid #8b5cf6;box-shadow:0 0 30px rgba(139,92,246,0.3)';
        var videoEl=document.createElement('video');
        videoEl.setAttribute('playsinline','true');
        videoEl.setAttribute('autoplay','true');
        videoEl.setAttribute('muted','true');
        videoEl.style.cssText='width:100%;height:100%;object-fit:cover;display:block';
        var scanCanvas=document.createElement('canvas');
        scanCanvas.style.cssText='position:absolute;top:0;left:0;width:100%;height:100%;pointer-events:none';
        videoWrap.appendChild(videoEl);
        videoWrap.appendChild(scanCanvas);
        var scanLine=document.createElement('div');
        scanLine.style.cssText='position:absolute;top:0;left:10%;width:80%;height:3px;background:linear-gradient(90deg,transparent,#00e5ff,#00e5ff,transparent);box-shadow:0 0 12px #00e5ff;border-radius:2px;transition:none;z-index:2;animation:scanMove 2s ease-in-out infinite';
        videoWrap.appendChild(scanLine);
        var cornerTL=document.createElement('div');cornerTL.style.cssText='position:absolute;top:20px;left:20px;width:30px;height:30px;border-top:3px solid #00e5ff;border-left:3px solid #00e5ff;z-index:3';
        var cornerTR=document.createElement('div');cornerTR.style.cssText='position:absolute;top:20px;right:20px;width:30px;height:30px;border-top:3px solid #00e5ff;border-right:3px solid #00e5ff;z-index:3';
        var cornerBL=document.createElement('div');cornerBL.style.cssText='position:absolute;bottom:20px;left:20px;width:30px;height:30px;border-bottom:3px solid #00e5ff;border-left:3px solid #00e5ff;z-index:3';
        var cornerBR=document.createElement('div');cornerBR.style.cssText='position:absolute;bottom:20px;right:20px;width:30px;height:30px;border-bottom:3px solid #00e5ff;border-right:3px solid #00e5ff;z-index:3';
        videoWrap.appendChild(cornerTL);videoWrap.appendChild(cornerTR);
        videoWrap.appendChild(cornerBL);videoWrap.appendChild(cornerBR);
        var statusDot=document.createElement('div');
        statusDot.style.cssText='position:absolute;bottom:12px;left:50%;transform:translateX(-50%);width:10px;height:10px;border-radius:50%;background:#22c55e;box-shadow:0 0 8px #22c55e;z-index:4;animation:pulse 1.5s ease-in-out infinite';
        videoWrap.appendChild(statusDot);
        var hint=document.createElement('div');
        hint.style.cssText='color:#e2e8f0;font-size:15px;margin-top:16px;text-align:center;max-width:320px;line-height:1.4';
        hint.innerHTML='<span style="color:#00e5ff;font-weight:600">Escaneando QR</span><br><span style="color:#94a3b8;font-size:13px">Apunta la camara al codigo QR del dispositivo principal</span>';
        var cancelBtn=document.createElement('button');
        cancelBtn.textContent='Cancelar';
        cancelBtn.style.cssText='color:#fff;background:#ef4444;border:none;padding:10px 30px;border-radius:8px;margin-top:16px;font-size:14px;cursor:pointer;font-weight:600';
        overlay.appendChild(videoWrap);overlay.appendChild(hint);overlay.appendChild(cancelBtn);
        document.body.appendChild(overlay);
        var style=document.createElement('style');
        style.textContent='@keyframes scanMove{0%{top:5%}50%{top:90%}100%{top:5%}}@keyframes pulse{0%,100%{opacity:1;transform:translateX(-50%) scale(1)}50%{opacity:0.5;transform:translateX(-50%) scale(0.7)}}';
        overlay.appendChild(style);
        var stream=null,done=false,scanner=null,scanCount=0;
        function cleanup(){done=true;if(scanner)clearInterval(scanner);if(stream)stream.getTracks().forEach(function(t){t.stop();});if(overlay.parentNode)overlay.parentNode.removeChild(overlay);}
        cancelBtn.onclick=function(){cleanup();reject(new Error('Cancelado'));};
        if(typeof jsQR==='undefined'){cleanup();reject(new Error('Libreria jsQR no cargada'));return;}
        var scanW=800,scanH=600;
        var scanCtx2=scanCanvas.getContext('2d',{willReadFrequently:true});
        navigator.mediaDevices.getUserMedia({video:{facingMode:'environment',width:{ideal:1280},height:{ideal:960}}})
        .then(function(s){
            stream=s;videoEl.srcObject=stream;videoEl.play();
            videoEl.onplaying=function(){
                scanW=videoEl.videoWidth||800;
                scanH=videoEl.videoHeight||600;
                scanCanvas.width=scanW;
                scanCanvas.height=scanH;
                hint.innerHTML='<span style="color:#00e5ff;font-weight:600">Escaneando QR</span><br><span style="color:#94a3b8;font-size:13px">Apunta la camara al codigo QR del dispositivo principal</span>';
            };
            scanner=setInterval(function(){
                if(done)return;
                if(videoEl.readyState<2||!videoEl.videoWidth||!videoEl.videoHeight)return;
                scanCtx2.drawImage(videoEl,0,0,scanW,scanH);
                var imageData=scanCtx2.getImageData(0,0,scanW,scanH);
                var code=jsQR(imageData.data,imageData.width,imageData.height,{inversionAttempts:'attemptBoth',binaryThreshold:128});
                scanCount++;
                if(!code){
                    if(scanCount%20===0){statusDot.style.background='#eab308';statusDot.style.boxShadow='0 0 8px #eab308';}
                    return;
                }
                try{
                    var obj=JSON.parse(code.data);
                    if(!obj.u||!obj.k)return;
                    done=true;
                    statusDot.style.background='#22c55e';
                    scanLine.style.background='linear-gradient(90deg,transparent,#22c55e,#22c55e,transparent)';
                    scanLine.style.boxShadow='0 0 12px #22c55e';
                    cornerTL.style.borderColor='#22c55e';cornerTR.style.borderColor='#22c55e';
                    cornerBL.style.borderColor='#22c55e';cornerBR.style.borderColor='#22c55e';
                    hint.innerHTML='<span style="color:#22c55e;font-weight:600">QR Detectado!</span>';
                    setTimeout(function(){cleanup();},600);
                    _url=obj.u;_name=obj.n||'Principal';_key=obj.k;
                    localStorage.setItem('jam_sync_url',_url);
                    localStorage.setItem('jam_sync_name',_name);
                    localStorage.setItem('jam_sync_key',_key);
                    resolve({name:_name,url:_url});
                }catch(e){}
            },80);
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
