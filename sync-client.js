// sync-client.js — WebRTC P2P Sync (sin servidores)
(function(){
'use strict';
function genKey(){var b=new Uint8Array(16);crypto.getRandomValues(b);return Array.from(b).map(function(x){return x.toString(16).padStart(2,'0');}).join('');}

var _name=localStorage.getItem('jam_sync_name')||'';
var _key=localStorage.getItem('jam_sync_key')||'';
var _connected=false;
var _pc=null;
var _dc=null;
var _syncing=false;
var _timer=null;
var _remoteName='';

var ICE_SERVERS=[{urls:'stun:stun.l.google.com:19302'},{urls:'stun:stun1.l.google.com:19302'}];
var STORES=['productos','ventas','clientes','proveedores','gastos','empleados'];

function isConnected(){return _connected;}
function getName(){return _name;}
function getUrl(){return _connected?('P2P: '+_remoteName):'';}

function makePC(){
    var pc=new RTCPeerConnection({iceServers:ICE_SERVERS});
    pc.oniceconnectionstatechange=function(){
        console.log('[P2P] ICE: '+pc.iceConnectionState);
        if(pc.iceConnectionState==='connected'||pc.iceConnectionState==='completed'){_connected=true;}
        if(pc.iceConnectionState==='disconnected'||pc.iceConnectionState==='failed'||pc.iceConnectionState==='closed'){
            _connected=false;_dc=null;_pc=null;
            var n=typeof mostrarNotificacion==='function'?mostrarNotificacion:null;
            if(n)n('Conexion P2P perdida','warning');
        }
    };
    return pc;
}

function waitForICE(pc){
    return new Promise(function(resolve){
        if(pc.iceGatheringState==='complete'){resolve();return;}
        var t=setTimeout(resolve,3000);
        pc.onicegatheringstatechange=function(){if(pc.iceGatheringState==='complete'){clearTimeout(t);resolve();}};
    });
}

function setupDataChannel(dc){
    dc.onopen=function(){console.log('[P2P] Canal abierto');_connected=true;};
    dc.onclose=function(){console.log('[P2P] Canal cerrado');_connected=false;};
    dc.onmessage=function(e){try{handleMessage(JSON.parse(e.data));}catch(err){console.log('[P2P] Msg err:',err.message);}};
}

async function handleMessage(msg){
    if(msg.type==='sync-request'){
        console.log('[P2P] sync-request recibido');
        var getDatos=window.jamGetAllDatos;
        if(!getDatos)return;
        var data=await getDatos();
        send({type:'sync',data:data});
    }
    if(msg.type==='sync'){
        console.log('[P2P] sync data recibido');
        await integrateRemoteData(msg.data);
        send({type:'ack',ok:true});
        var n=typeof mostrarNotificacion==='function'?mostrarNotificacion:null;
        if(n)n('Sincronizacion completada','success');
        _syncing=false;
    }
    if(msg.type==='ack'){console.log('[P2P] ack ok');_syncing=false;}
}

async function integrateRemoteData(remoteData){
    var combinar=window.jamCombinarImportacion;
    var saveIDB=window.jamSaveIDB;
    var d=window.D;
    if(!combinar||!d)return{added:0,updated:0,skipped:0};
    var totalAdded=0,totalUpdated=0,totalSkipped=0;
    for(var j=0;j<STORES.length;j++){
        var st=STORES[j];
        if(!remoteData[st]||!Array.isArray(remoteData[st]))continue;
        var campoNombre=st==='productos'?'nombre':null;
        var result=combinar(d[st]||[],remoteData[st],campoNombre);
        d[st]=result.lista;
        totalAdded+=result.agregados;
        totalUpdated+=result.actualizados||0;
        totalSkipped+=result.omitidos;
        console.log('[P2P] '+st+': '+result.lista.length+' (+'+result.agregados+' new, ~'+(result.actualizados||0)+' upd)');
        if(saveIDB){try{await saveIDB(st,result.lista);}catch(e){console.log('[P2P] IDB err:',e.message);}}
    }
    console.log('[P2P] Fusion: +'+totalAdded+' new, ~'+totalUpdated+' upd, ~'+totalSkipped+' skip');
    return{added:totalAdded,updated:totalUpdated,skipped:totalSkipped};
}

function send(obj){
    if(_dc&&_dc.readyState==='open'){_dc.send(JSON.stringify(obj));return true;}
    return false;
}

function notify(msg,type){
    var n=typeof mostrarNotificacion==='function'?mostrarNotificacion:null;
    if(n)n(msg,type);
}
async function setupPrincipal(name){
    _name=name;_key=_key||genKey();
    localStorage.setItem('jam_sync_name',_name);
    localStorage.setItem('jam_sync_key',_key);
    if(_pc){try{_pc.close();}catch(e){}}
    _pc=makePC();
    _dc=_pc.createDataChannel('jampos-sync',{ordered:true});
    setupDataChannel(_dc);
    var offer=await _pc.createOffer();
    await _pc.setLocalDescription(offer);
    await waitForICE(_pc);
    var payload=JSON.stringify({type:'offer',sdp:_pc.localDescription.sdp,name:_name,id:_key});
    console.log('[P2P] Offer listo, SDP: '+payload.length+' bytes');
    return{payload:payload,name:_name};
}

function showQR(canvasId,payload){
    var c=document.getElementById(canvasId);if(!c)return;
    try{var qr=qrcode(0,'L');qr.addData(payload);qr.make();var mc=qr.getModuleCount(),sz=256,cl=sz/mc;var ctx=c.getContext('2d');c.width=sz;c.height=sz;ctx.fillStyle='#fff';ctx.fillRect(0,0,sz,sz);ctx.fillStyle='#000';for(var r=0;r<mc;r++)for(var co=0;co<mc;co++)if(qr.isDark(r,co))ctx.fillRect(co*cl,r*cl,cl+.5,cl+.5);}
    catch(e){var ctx2=c.getContext('2d');c.width=256;c.height=256;ctx2.fillStyle='#fff';ctx2.fillRect(0,0,256,256);ctx2.fillStyle='#f00';ctx2.font='12px sans-serif';ctx2.fillText('Error: '+e.message,20,130);}
}

function scanAndConnect(){
    return new Promise(function(resolve,reject){
        var overlay=document.createElement('div');
        overlay.style.cssText='position:fixed;top:0;left:0;width:100%;height:100%;background:#000;z-index:99999;display:flex;flex-direction:column;align-items:center;justify-content:center';
        var videoEl=document.createElement('video');
        videoEl.setAttribute('playsinline','true');videoEl.setAttribute('autoplay','true');videoEl.setAttribute('muted','true');
        videoEl.style.cssText='width:400px;height:400px;object-fit:cover;border-radius:12px;border:3px solid #8b5cf6';
        var hint=document.createElement('div');hint.style.cssText='color:#fff;font-size:14px;margin-top:12px;text-align:center';hint.textContent='Apunta al QR del dispositivo principal...';
        var cancelBtn=document.createElement('button');cancelBtn.textContent='Cancelar';cancelBtn.style.cssText='color:#fff;background:#ef4444;border:none;padding:10px 30px;border-radius:8px;margin-top:16px;font-size:14px;cursor:pointer';
        overlay.appendChild(videoEl);overlay.appendChild(hint);overlay.appendChild(cancelBtn);document.body.appendChild(overlay);
        var stream=null,done=false,scanner=null;
        function cleanup(){done=true;if(scanner)clearInterval(scanner);if(stream)stream.getTracks().forEach(function(t){t.stop();});if(overlay.parentNode)overlay.parentNode.removeChild(overlay);}
        cancelBtn.onclick=function(){cleanup();reject(new Error('Cancelado'));};
        if(typeof jsQR==='undefined'){cleanup();reject(new Error('Libreria jsQR no cargada'));return;}
        var scanCanvas=document.createElement('canvas');var scanCtx=scanCanvas.getContext('2d',{willReadFrequently:true});scanCanvas.width=400;scanCanvas.height=400;
        navigator.mediaDevices.getUserMedia({video:{facingMode:'environment'}})
        .then(function(s){
            stream=s;videoEl.srcObject=stream;videoEl.play();
            videoEl.onplaying=function(){hint.textContent='Escaneando... apunta al QR';};
            scanner=setInterval(function(){
                if(done)return;if(videoEl.readyState<2||!videoEl.videoWidth||!videoEl.videoHeight)return;
                scanCtx.drawImage(videoEl,0,0,400,400);var imageData=scanCtx.getImageData(0,0,400,400);
                var code=jsQR(imageData.data,imageData.width,imageData.height,{inversionAttempts:'attemptBoth'});
                if(!code)return;
                try{var obj=JSON.parse(code.data);if(!obj.type||!obj.sdp)return;done=true;cleanup();resolve(obj);}catch(e){}
            },100);
        })
        .catch(function(){cleanup();scanFallbackFile().then(resolve).catch(reject);});
    }).then(async function(payload){
        if(payload.type==='offer'){
            _name=localStorage.getItem('jam_sync_name')||'Secundario';
            _key=localStorage.getItem('jam_sync_key')||genKey();
            if(_pc){try{_pc.close();}catch(e){}}
            _pc=makePC();
            await _pc.setRemoteDescription({type:'offer',sdp:payload.sdp});
            _remoteName=payload.name||'Principal';
            var answer=await _pc.createAnswer();
            await _pc.setLocalDescription(answer);
            await waitForICE(_pc);
            var ansPayload=JSON.stringify({type:'answer',sdp:_pc.localDescription.sdp,name:_name,id:_key});
            console.log('[P2P] Answer listo');
            _pc.ondatachannel=function(e){_dc=e.channel;setupDataChannel(_dc);};
            showAnswerQR(ansPayload);
            return{name:_remoteName};
        }
        if(payload.type==='answer'){
            await _pc.setRemoteDescription({type:'answer',sdp:payload.sdp});
            _remoteName=payload.name||'Secundario';
            console.log('[P2P] Conexion lista con '+_remoteName);
            return{name:_remoteName};
        }
        throw new Error('QR no reconocido');
    });
}

function showAnswerQR(payload){
    var overlay=document.createElement('div');
    overlay.style.cssText='position:fixed;top:0;left:0;width:100%;height:100%;background:#000;z-index:99999;display:flex;flex-direction:column;align-items:center;justify-content:center';
    var canvas=document.createElement('canvas');canvas.style.cssText='width:256px;height:256px;border-radius:12px;border:3px solid #22c55e';
    var hint=document.createElement('div');hint.style.cssText='color:#fff;font-size:14px;margin-top:12px;text-align:center';hint.textContent='Escanea este QR desde el dispositivo principal';
    var okBtn=document.createElement('button');okBtn.textContent='Listo';okBtn.style.cssText='color:#fff;background:#22c55e;border:none;padding:10px 30px;border-radius:8px;margin-top:16px;font-size:14px;cursor:pointer';
    overlay.appendChild(canvas);overlay.appendChild(hint);overlay.appendChild(okBtn);document.body.appendChild(overlay);
    try{var qr=qrcode(0,'L');qr.addData(payload);qr.make();var mc=qr.getModuleCount(),sz=256,cl=sz/mc;var ctx=canvas.getContext('2d');canvas.width=sz;canvas.height=sz;ctx.fillStyle='#fff';ctx.fillRect(0,0,sz,sz);ctx.fillStyle='#000';for(var r=0;r<mc;r++)for(var co=0;co<mc;co++)if(qr.isDark(r,co))ctx.fillRect(co*cl,r*cl,cl+.5,cl+.5);}
    catch(e){ctx.fillStyle='#f00';ctx.font='12px sans-serif';ctx.fillText('Error QR',20,130);}
    okBtn.onclick=function(){if(overlay.parentNode)overlay.parentNode.removeChild(overlay);};
}

function scanFallbackFile(){
    return new Promise(function(resolve,reject){
        var input=document.createElement('input');input.type='file';input.accept='image/*';input.style.display='none';
        document.body.appendChild(input);
        input.onchange=function(){
            var file=input.files[0];if(file&&input.parentNode)input.parentNode.removeChild(input);
            if(!file){reject(new Error('No se selecciono imagen'));return;}
            var reader=new FileReader();
            reader.onload=function(){
                var img=new Image();
                img.onload=function(){
                    var scanCanvas=document.createElement('canvas');var scanCtx=scanCanvas.getContext('2d',{willReadFrequently:true});
                    scanCanvas.width=img.width;scanCanvas.height=img.height;scanCtx.drawImage(img,0,0);
                    var imageData=scanCtx.getImageData(0,0,scanCanvas.width,scanCanvas.height);
                    var code=jsQR(imageData.data,imageData.width,imageData.height,{inversionAttempts:'attemptBoth'});
                    if(!code){reject(new Error('No se detecto QR en la imagen'));return;}
                    try{var obj=JSON.parse(code.data);if(!obj.type||!obj.sdp){reject(new Error('QR invalido'));return;}resolve(obj);}
                    catch(e){reject(new Error('Error leyendo QR'));}};
                img.src=reader.result;};
            reader.readAsDataURL(file);
        };
        input.click();
    });
}

async function bidirectionalSync(){
    if(!isConnected()){
        var fn=window.JAMSync&&window.JAMSync.showAnswerQR?window.JAMSync.scanAndConnect:null;
        if(!fn)throw new Error('No conectado. Escanea el QR primero.');
        return{added:0,updated:0,skipped:0,total:0};
    }
    if(_syncing)return{added:0,updated:0,skipped:0,total:0};
    _syncing=true;
    console.log('[P2P] Iniciando sync...');
    try{
        var getDatos=window.jamGetAllDatos;
        if(!getDatos)throw new Error('Datos no disponibles');
        var localData=await getDatos();
        var syncPromise=new Promise(function(res,rej){
            var t=setTimeout(function(){rej(new Error('Timeout sync'));},20000);
            // Solo señala la finalización; el procesamiento del mensaje lo hace
            // el handler permanente de setupDataChannel (handleMessage una sola vez).
            var oldOnMsg=_dc?_dc.onmessage:null;
            _dc.onmessage=function(e){
                try{
                    var msg=JSON.parse(e.data);
                    if(msg.type==='sync'||msg.type==='ack'){clearTimeout(t);res();}
                }catch(err){}
                if(oldOnMsg)oldOnMsg(e);
            };
        });
        send({type:'sync',data:localData});
        send({type:'sync-request'});
        await syncPromise;
        await new Promise(function(r){setTimeout(r,2000);});
        var freshData=await getDatos();
        var total=freshData.productos.length+freshData.clientes.length+freshData.ventas.length+freshData.gastos.length+freshData.empleados.length+freshData.proveedores.length;
        return{added:0,updated:0,skipped:0,total:total};
    }finally{_syncing=false;}
}

function startSync(){
    if(_timer)return;
    _timer=setInterval(function(){
        if(isConnected()&&!_syncing){bidirectionalSync().catch(function(e){console.log('[P2P] Auto sync err:',e.message);});}
    },60000);
}

function stopSync(){
    if(_timer){clearInterval(_timer);_timer=null;}
    if(_dc){try{_dc.close();}catch(e){}}
    if(_pc){try{_pc.close();}catch(e){}}
    _connected=false;_dc=null;_pc=null;_remoteName='';_syncing=false;
    localStorage.removeItem('jam_sync_url');
    localStorage.removeItem('jam_sync_key');
    console.log('[P2P] Detenido');
}

async function tryAutoReconnect(){
    var n=localStorage.getItem('jam_sync_name');
    var k=localStorage.getItem('jam_sync_key');
    if(!n||!k)return false;
    try{
        await setupPrincipal(n);
        console.log('[P2P] Auto-reconnect offer listo, escanea el QR desde el otro dispositivo');
        return true;
    }catch(e){console.log('[P2P] Auto-reconnect err:',e.message);return false;}
}

window.JAMSync={
    setupPrincipal:setupPrincipal,
    showQR:showQR,
    scanAndConnect:scanAndConnect,
    bidirectionalSync:bidirectionalSync,
    startSync:startSync,
    stopSync:stopSync,
    isConnected:isConnected,
    getName:getName,
    getUrl:getUrl,
    tryAutoReconnect:tryAutoReconnect
};

console.log('[P2P] sync-client.js cargado (WebRTC P2P)');
})();
