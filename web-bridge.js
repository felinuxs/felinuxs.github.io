// ============================================================
// web-bridge.js · JAM POS Web 2027
// Emula el puente nativo AndroidBridge (WebView -> JS) usando
// exclusivamente APIs de navegador:
//   - Carpeta elegida  -> File System Access API (showDirectoryPicker)
//   - Guardar/Leer     -> subcarpeta JAMPOS dentro de la carpeta
//   - Ticket imagen    -> Blob + descarga (o carpeta si hay una elegida)
//   - Impresión        -> iframe oculto + window.print()
//   - Notificaciones   -> Notification API + service worker
//   - Prueba/Dispositivo -> versión completa (sin límites de prueba)
// ============================================================
(function () {
    'use strict';

    // Si ya existe un puente nativo REAL (APK: inyectado por MainActivity vía
    // addJavascriptInterface), NO sobreescribirlo: esta emulación es solo para
    // navegador/PWA. En el APK este archivo queda inerte.
    if (window.AndroidBridge) return;

    const DB_NAME = 'jampos-web-fs';
    const DB_STORE = 'handles';
    const SUB_CARPETA = 'JAMPOS';

    let carpetaHandle = null;
    let carpetaNombre = '';

    // ---------- IndexedDB para conservar el handle de la carpeta ----------
    function abrirIDB() {
        return new Promise(function (resolve, reject) {
            var req = indexedDB.open(DB_NAME, 1);
            req.onupgradeneeded = function () {
                if (!req.result.objectStoreNames.contains(DB_STORE)) {
                    req.result.createObjectStore(DB_STORE);
                }
            };
            req.onsuccess = function () { resolve(req.result); };
            req.onerror = function () { reject(req.error); };
        });
    }
    function guardarHandle(h) {
        return abrirIDB().then(function (db) {
            return new Promise(function (resolve, reject) {
                var tx = db.transaction(DB_STORE, 'readwrite');
                tx.objectStore(DB_STORE).put(h, 'carpeta');
                tx.oncomplete = function () { db.close(); resolve(); };
                tx.onerror = function () { db.close(); reject(tx.error); };
            });
        });
    }
    function cargarHandle() {
        return abrirIDB().then(function (db) {
            return new Promise(function (resolve, reject) {
                var tx = db.transaction(DB_STORE, 'readonly');
                var g = tx.objectStore(DB_STORE).get('carpeta');
                g.onsuccess = function () { db.close(); resolve(g.result || null); };
                g.onerror = function () { db.close(); reject(g.error); };
            });
        });
    }

    // ---------- base64 <-> bytes ----------
    function b64ToBytes(b64) {
        var bin = atob(b64);
        var bytes = new Uint8Array(bin.length);
        for (var i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
        return bytes;
    }
    function bytesToB64(bytes) {
        var bin = '';
        var chunk = 0x8000;
        for (var i = 0; i < bytes.length; i += chunk) {
            bin += String.fromCharCode.apply(null, bytes.subarray(i, i + chunk));
        }
        return btoa(bin);
    }
    function dataUrlToBytes(dataUrl) {
        var b64 = String(dataUrl).indexOf('base64,') >= 0
            ? String(dataUrl).split('base64,')[1]
            : '';
        return b64ToBytes(b64);
    }

    // ---------- helpers UI ----------
    function notificar(mensaje, tipo) {
        try {
            if (window.mostrarNotificacion) { window.mostrarNotificacion(mensaje, tipo || 'info'); return; }
        } catch (e) {}
        try { alert(mensaje); } catch (e) {}
    }
    function descargarBlob(blob, nombre) {
        var url = URL.createObjectURL(blob);
        var a = document.createElement('a');
        a.href = url;
        a.download = nombre;
        document.body.appendChild(a);
        a.click();
        setTimeout(function () { URL.revokeObjectURL(url); a.remove(); }, 5000);
    }

    // ---------- carpeta (File System Access API) ----------
    async function subCarpetaJAMPOS() {
        if (!carpetaHandle) return null;
        try {
            for await (const entry of carpetaHandle.values()) {
                if (entry.kind === 'directory' && entry.name === SUB_CARPETA) return entry;
            }
        } catch (e) {}
        try {
            return await carpetaHandle.getDirectoryHandle(SUB_CARPETA, { create: true });
        } catch (e) { return null; }
    }

    async function elegirCarpeta() {
        if (!window.showDirectoryPicker) {
            notificar('Tu navegador no soporta elegir carpeta (usa Chrome/Edge). Los archivos se descargarán a Descargas.', 'info');
            if (window.carpetaSeleccionadaCallback) window.carpetaSeleccionadaCallback('', '');
            return;
        }
        try {
            var h = await window.showDirectoryPicker({ mode: 'readwrite' });
            carpetaHandle = h;
            carpetaNombre = h.name || 'Carpeta';
            try { await guardarHandle(h); } catch (e) {}
            if (window.carpetaSeleccionadaCallback) window.carpetaSeleccionadaCallback(carpetaNombre, 'web:' + (h.name || ''));
        } catch (e) {
            if (window.carpetaSeleccionadaCallback) window.carpetaSeleccionadaCallback('', '');
        }
    }

    async function getCarpetaInfo() {
        if (!carpetaHandle) return '';
        return (carpetaNombre || 'Carpeta') + '|web:' + (carpetaHandle.name || '');
    }

    async function escribirEnCarpeta(nombre, bytes) {
        var sub = await subCarpetaJAMPOS();
        if (!sub) return false;
        try {
            var f = await sub.getFileHandle(nombre, { create: true });
            var w = await f.createWritable();
            await w.write(bytes);
            await w.close();
            return true;
        } catch (e) { return false; }
    }

    async function guardarArchivo(nombre, mime, base64) {
        var bytes = b64ToBytes(base64);
        if (await escribirEnCarpeta(nombre, bytes)) return 'ok:web:' + nombre;
        descargarBlob(new Blob([bytes], { type: mime || 'application/octet-stream' }), nombre);
        return 'ok:web-descarga';
    }

    async function saveTicketImage(dataUrl, nombre) {
        var bytes = dataUrlToBytes(dataUrl);
        if (await escribirEnCarpeta(nombre, bytes)) return 'ok:web:' + nombre;
        descargarBlob(new Blob([bytes], { type: 'image/png' }), nombre);
        return 'ok:web-descarga';
    }

    async function leerArchivo(nombre) {
        try {
            var sub = await subCarpetaJAMPOS();
            if (!sub) return 'null';
            var f = await sub.getFileHandle(nombre);
            var file = await f.getFile();
            var buf = await file.arrayBuffer();
            return bytesToB64(new Uint8Array(buf));
        } catch (e) { return 'null'; }
    }

    async function listarArchivos() {
        try {
            var sub = await subCarpetaJAMPOS();
            if (!sub) return '[]';
            var nombres = [];
            for await (const entry of sub.values()) {
                if (entry.kind === 'file') nombres.push(entry.name);
            }
            return JSON.stringify(nombres);
        } catch (e) { return '[]'; }
    }

    // ---------- impresión ----------
    function printTicket(html, nombre) {
        var iframe = document.createElement('iframe');
        iframe.style.position = 'fixed';
        iframe.style.right = '0';
        iframe.style.bottom = '0';
        iframe.style.width = '0';
        iframe.style.height = '0';
        iframe.style.border = '0';
        iframe.setAttribute('aria-hidden', 'true');
        iframe.srcdoc = html;
        document.body.appendChild(iframe);
        iframe.onload = function () {
            try {
                iframe.contentWindow.focus();
                iframe.contentWindow.print();
            } catch (e) {}
            setTimeout(function () { iframe.remove(); }, 2000);
        };
    }

    // ---------- misc ----------
    function setSystemBarsColor(color) {
        try {
            var meta = document.getElementById('themeColorMeta') ||
                document.querySelector('meta[name="theme-color"]');
            if (meta) meta.setAttribute('content', color);
            var cs = document.getElementById('colorSchemeMeta');
            if (cs) {
                var hex = String(color).replace('#', '');
                var r = parseInt(hex.substr(0, 2), 16) || 0;
                var g = parseInt(hex.substr(2, 2), 16) || 0;
                var b = parseInt(hex.substr(4, 2), 16) || 0;
                cs.setAttribute('content', (0.299 * r + 0.587 * g + 0.114 * b) < 150 ? 'dark' : 'light');
            }
        } catch (e) {}
    }
    function deviceId() {
        var id = localStorage.getItem('jampos_device_id');
        if (!id) {
            id = 'web-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 12);
            localStorage.setItem('jampos_device_id', id);
        }
        return id;
    }
    function cerrarApp() {
        try { window.close(); } catch (e) {}
    }
    function toast(mensaje) {
        notificar(mensaje, 'info');
    }
    function esVersionPrueba() {
        return true;
    }

    // ---------- Trial 30 días con fingerprint ----------
    var TRIAL_DAYS = 30;
    var TRIAL_KEY = 'jam_trial_data';

    function generarFingerprint() {
        var parts = [];
        try { parts.push(navigator.userAgent.length.toString(36)); } catch(e) {}
        try { parts.push(screen.width + 'x' + screen.height); } catch(e) {}
        try { parts.push(screen.colorDepth.toString()); } catch(e) {}
        try { parts.push(navigator.language); } catch(e) {}
        try { parts.push(navigator.hardwareConcurrency || 0); } catch(e) {}
        try { parts.push(navigator.deviceMemory || 0); } catch(e) {}
        try {
            var c = document.createElement('canvas');
            var ctx = c.getContext('2d');
            ctx.textBaseline = 'top';
            ctx.font = '14px Arial';
            ctx.fillText('JAM2027', 2, 2);
            parts.push(c.toDataURL().length.toString(36));
        } catch(e) {}
        var raw = parts.join('|');
        var hash = 0;
        for (var i = 0; i < raw.length; i++) {
            hash = ((hash << 5) - hash) + raw.charCodeAt(i);
            hash |= 0;
        }
        return 'fp_' + Math.abs(hash).toString(36);
    }

    function codificarFecha(ts) {
        try {
            var obj = { f: ts, k: 'j27', v: 1 };
            return btoa(JSON.stringify(obj));
        } catch(e) { return btoa(String(ts)); }
    }

    function decodificarFecha(encoded) {
        try {
            var obj = JSON.parse(atob(encoded));
            if (obj && obj.k === 'j27' && obj.f) return Number(obj.f);
        } catch(e) {}
        try { return Number(atob(encoded)); } catch(e) {}
        return 0;
    }

    // ---------- Real IndexedDB para persistencia trial ----------
    var TRIAL_IDB = 'jampos_trial_db';
    var TRIAL_IDB_STORE = 'meta';
    var _fechaCache = 0;

    function idbOpen() {
        return new Promise(function(resolve, reject) {
            var req = indexedDB.open(TRIAL_IDB, 1);
            req.onupgradeneeded = function() {
                if (!req.result.objectStoreNames.contains(TRIAL_IDB_STORE))
                    req.result.createObjectStore(TRIAL_IDB_STORE);
            };
            req.onsuccess = function() { resolve(req.result); };
            req.onerror = function() { reject(req.error); };
        });
    }
    function idbSave(key, val) {
        return idbOpen().then(function(db) {
            return new Promise(function(resolve, reject) {
                var tx = db.transaction(TRIAL_IDB_STORE, 'readwrite');
                tx.objectStore(TRIAL_IDB_STORE).put(val, key);
                tx.oncomplete = function() { db.close(); resolve(); };
                tx.onerror = function() { db.close(); reject(tx.error); };
            });
        });
    }
    function idbLoad(key) {
        return idbOpen().then(function(db) {
            return new Promise(function(resolve, reject) {
                var tx = db.transaction(TRIAL_IDB_STORE, 'readonly');
                var g = tx.objectStore(TRIAL_IDB_STORE).get(key);
                g.onsuccess = function() { db.close(); resolve(g.result || null); };
                g.onerror = function() { db.close(); reject(g.error); };
            });
        });
    }

    // ---------- Cookie persistente (1 año) ----------
    function setCookie(name, val, days) {
        var exp = new Date(Date.now() + days * 86400000).toUTCString();
        document.cookie = name + '=' + encodeURIComponent(val) + ';expires=' + exp + ';path=/;SameSite=Lax';
    }
    function getCookie(name) {
        var match = document.cookie.match(new RegExp('(?:^|; )' + name + '=([^;]*)'));
        return match ? decodeURIComponent(match[1]) : null;
    }

    function guardarFechaTodasLasCapas(fecha) {
        var encoded = codificarFecha(fecha);
        // Capa 1: localStorage
        try { localStorage.setItem(TRIAL_KEY, encoded); } catch(e) {}
        try { localStorage.setItem(TRIAL_KEY + '_idb', encoded); } catch(e) {}
        // Capa 2: Cookie (1 año)
        try { setCookie(TRIAL_KEY, encoded, 365); } catch(e) {}
        // Capa 3: Real IndexedDB
        try { idbSave(TRIAL_KEY, { f: fecha, encoded: encoded }); } catch(e) {}
        // Capa 4: navigator.storage.persist()
        try {
            if (navigator.storage && navigator.storage.persist) {
                navigator.storage.persist().then(function(granted) {
                    if (granted) console.log('[TRIAL] Storage persistente activado');
                });
            }
        } catch(e) {}
        // Capa 5: SW cache
        try {
            if (navigator.serviceWorker && navigator.serviceWorker.controller) {
                navigator.serviceWorker.controller.postMessage({ type: 'saveTrialStart', timestamp: fecha });
            }
        } catch(e) {}
    }

    function obtenerFechaInstalacion() {
        if (_fechaCache > 0) return _fechaCache;
        var fecha = 0;
        // Capa 1: localStorage
        try {
            var stored = localStorage.getItem(TRIAL_KEY);
            if (stored) {
                var decoded = decodificarFecha(stored);
                if (decoded > 0) fecha = decoded;
            }
        } catch(e) {}
        // Capa 2: Cookie
        if (!fecha) {
            try {
                var ck = getCookie(TRIAL_KEY);
                if (ck) {
                    var decoded2 = decodificarFecha(ck);
                    if (decoded2 > 0) fecha = decoded2;
                }
            } catch(e) {}
        }
        // Capa 3: Real IndexedDB (async pero intentamos sync con localStorage como respaldo)
        if (!fecha) {
            try {
                var idbData = localStorage.getItem(TRIAL_KEY + '_idb');
                if (idbData) {
                    var decoded3 = decodificarFecha(idbData);
                    if (decoded3 > 0) fecha = decoded3;
                }
            } catch(e) {}
        }
        // Si no hay fecha, es primera vez → guardarla en TODAS las capas
        if (!fecha) {
            fecha = Date.now();
            guardarFechaTodasLasCapas(fecha);
        } else {
            // Asegurar que esté en todas las capas (refuerzo)
            guardarFechaTodasLasCapas(fecha);
        }
        // Leer también de IndexedDB real para cruzar datos
        try {
            idbLoad(TRIAL_KEY).then(function(data) {
                if (data && data.f && (!fecha || data.f < fecha)) {
                    _fechaCache = data.f;
                    guardarFechaTodasLasCapas(data.f);
                }
            });
        } catch(e) {}
        _fechaCache = fecha;
        return fecha;
    }

    function verificarPrueba() {
        var fechaInicio = obtenerFechaInstalacion();
        var ahora = Date.now();
        var diffMs = ahora - fechaInicio;
        var diffDias = Math.floor(diffMs / 86400000);
        var diasRestantes = TRIAL_DAYS - diffDias;
        var bloqueada = diasRestantes <= 0;
        diasRestantes = Math.max(0, diasRestantes);
        var fp = generarFingerprint();
        // Verificar si el fingerprint coincide (anti-copia)
        var fpGuardada = localStorage.getItem(TRIAL_KEY + '_fp');
        if (!fpGuardada) {
            localStorage.setItem(TRIAL_KEY + '_fp', fp);
        } else if (fpGuardada !== fp) {
            // Fingerprint cambió → posible reinstalación
            // Usar la fecha más antigua
            localStorage.setItem(TRIAL_KEY + '_fp', fp);
        }
        return JSON.stringify({
            bloqueada: bloqueada,
            diasRestantes: diasRestantes,
            fechaInicio: fechaInicio,
            tamper: false,
            fingerprint: fp,
            version: 'trial-30d'
        });
    }

    // ---------- Wake Lock (pantalla encendida) ----------
    var _wakeLock = null;
    async function requestWakeLock() {
        try {
            if ('wakeLock' in navigator) {
                _wakeLock = await navigator.wakeLock.request('screen');
                _wakeLock.addEventListener('release', function() { _wakeLock = null; });
                console.log('[PWA] Wake Lock activo');
                return true;
            }
        } catch (e) { console.log('[PWA] Wake Lock no disponible:', e.message); }
        return false;
    }
    async function releaseWakeLock() {
        try { if (_wakeLock) { await _wakeLock.release(); _wakeLock = null; } } catch (e) {}
    }

    // ---------- Orientation Lock ----------
    function lockPortrait() {
        try {
            if (screen.orientation && screen.orientation.lock) {
                screen.orientation.lock('portrait').catch(function() {});
            }
        } catch (e) {}
    }

    // ---------- iOS Standalone Detection ----------
    function esAppInstalada() {
        return window.navigator.standalone === true || window.matchMedia('(display-mode: standalone)').matches;
    }

    // ---------- Visibility: re-request Wake Lock al volver ----------
    document.addEventListener('visibilitychange', function() {
        if (document.visibilityState === 'visible' && !_wakeLock) {
            requestWakeLock();
        }
    });

    // ---------- restaurar carpeta persistida ----------
    cargarHandle().then(function (h) {
        if (h) { carpetaHandle = h; carpetaNombre = h.name || 'Carpeta'; }
    }).catch(function () {});

    window.AndroidBridge = {
        cerrarApp: cerrarApp,
        toast: toast,
        esVersionPrueba: esVersionPrueba,
        deviceId: deviceId,
        verificarPrueba: verificarPrueba,
        setSystemBarsColor: setSystemBarsColor,
        saveTicketImage: saveTicketImage,
        printTicket: printTicket,
        elegirCarpeta: elegirCarpeta,
        getCarpetaInfo: getCarpetaInfo,
        guardarArchivo: guardarArchivo,
        leerArchivo: leerArchivo,
        listarArchivos: listarArchivos,
        requestWakeLock: requestWakeLock,
        releaseWakeLock: releaseWakeLock,
        lockPortrait: lockPortrait,
        esAppInstalada: esAppInstalada
    };
})();
