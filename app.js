// ==================== UTILIDADES ====================
    const escapeHtml = s => s ? s.replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m])) : '';
    const fmtPrecio = v => { let num = Number(v); if(isNaN(num)) num = 0; let p = num.toFixed(2).split('.'); p[0] = p[0].replace(/\B(?=(\d{3})+(?!\d))/g, '.'); return p.join(','); };
    const fmtDolar = v => Number(v).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    const parseBs = v => parseFloat(String(v).replace(/\./g, '').replace(',', '.')) || 0;
    const esOscuro = c => { let r=parseInt(c.slice(1,3),16), g=parseInt(c.slice(3,5),16), b=parseInt(c.slice(5,7),16); return(.299*r + .587*g + .114*b) < 128; };
    const normalizeText = s => (s||'').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
    const capitalizeWords = s => s.replace(/(^|[^\p{L}\p{N}])(\p{L})/gu, (m, p1, p2) => p1 + p2.toUpperCase());
    function mostrarNotificacion(mensaje, tipo = 'info') { const notif = document.createElement('div'); notif.className = 'notificacion-flotante'; notif.style.backgroundColor = tipo === 'success' ? '#10b981' : (tipo === 'error' ? '#ef4444' : '#3b82f6'); notif.style.color = 'white'; notif.innerText = mensaje; document.body.appendChild(notif); setTimeout(() => notif.remove(), 3000); }
    async function puenteResultado(v){ return (v && typeof v.then === 'function') ? await v : v; }
    function mostrarNotificacionNativa(titulo, cuerpo, tag) {
        if (!('Notification' in window) || !('serviceWorker' in navigator)) return;
        if (Notification.permission === 'granted') {
            navigator.serviceWorker.ready.then(function(reg) { if(reg.active) reg.active.postMessage({ type: 'showNotification', title: titulo, body: cuerpo, tag: tag || 'jampos' }); });
        } else if (Notification.permission !== 'denied') {
            Notification.requestPermission().then(function(perm) {
                if (perm === 'granted') {
                    navigator.serviceWorker.ready.then(function(reg) { if(reg.active) reg.active.postMessage({ type: 'showNotification', title: titulo, body: cuerpo, tag: tag || 'jampos' }); });
                }
            });
        }
    }
    
    // ==================== DIÁLOGOS NATIVOS (reemplazan alert/confirm/prompt) ====================
    function jamDialogo(opciones) {
        return new Promise((resolve) => {
            const overlay = document.createElement('div');
            overlay.className = 'modal-form';
            overlay.style.zIndex = '12000';
            const iconos = { info: 'ℹ️', error: '⚠️', success: '✅', pregunta: '❓' };
            const tipo = opciones.tipo || 'info';
            const cerrar = (i) => {
                let val = i >= 0 ? opciones.botones[i].valor : null;
                if (opciones.input && val === '__ok__') {
                    const inp = document.getElementById('dialogoInput');
                    val = inp ? inp.value : '';
                }
                overlay.remove();
                resolve(val);
            };
            const dialogo = document.createElement('div');
            dialogo.className = 'dialogo-nativo';
            const titulo = document.createElement('div');
            titulo.className = 'dialogo-titulo';
            const icono = document.createElement('span');
            icono.className = 'dialogo-icono';
            icono.textContent = iconos[tipo];
            titulo.appendChild(icono);
            titulo.appendChild(document.createTextNode(opciones.titulo || 'Aviso'));
            dialogo.appendChild(titulo);
            const cuerpo = document.createElement('div');
            cuerpo.className = 'dialogo-cuerpo';
            cuerpo.textContent = opciones.mensaje;
            dialogo.appendChild(cuerpo);
            let inp = null;
            if (opciones.input) {
                inp = document.createElement('input');
                inp.id = 'dialogoInput';
                inp.className = 'dialogo-input';
                inp.type = 'text';
                inp.value = opciones.input.valor || '';
                inp.placeholder = opciones.input.placeholder || '';
                inp.autocomplete = 'off';
                dialogo.appendChild(inp);
            }
            const botones = document.createElement('div');
            botones.className = 'dialogo-botones';
            opciones.botones.forEach((b, i) => {
                const btn = document.createElement('button');
                btn.className = 'dialogo-boton' + (b.destacado ? ' dialogo-boton-primario' : '');
                btn.textContent = b.texto;
                btn.onclick = () => cerrar(i);
                botones.appendChild(btn);
            });
            dialogo.appendChild(botones);
            overlay.appendChild(dialogo);
            document.body.appendChild(overlay);
            overlay.onclick = (e) => { if (e.target === overlay) cerrar(opciones.botones.length === 1 ? 0 : -1); };
            if (inp) {
                const idxOk = opciones.botones.findIndex(b => b.valor === '__ok__');
                inp.focus();
                inp.addEventListener('keydown', (e) => { if (e.key === 'Enter' && idxOk >= 0) cerrar(idxOk); });
            }
        });
    }
    function jamAlert(mensaje, tipo = 'info') {
        return jamDialogo({ titulo: tipo === 'error' ? 'Error' : 'Aviso', mensaje, tipo, botones: [{ texto: 'Aceptar', valor: true, destacado: true }] });
    }
    function jamConfirm(mensaje) {
        return jamDialogo({ titulo: 'Confirmación', mensaje, tipo: 'pregunta', botones: [{ texto: 'Cancelar', valor: false }, { texto: 'Aceptar', valor: true, destacado: true }] });
    }
    function jamPrompt(mensaje, valor, placeholder) {
        return jamDialogo({ titulo: 'Ingreso de datos', mensaje, tipo: 'info', input: { valor, placeholder }, botones: [{ texto: 'Cancelar', valor: null }, { texto: 'Aceptar', valor: '__ok__', destacado: true }] });
    }
    window.alert = (m) => jamAlert(String(m));
    
    // ==================== FUNCIÓN PARA TINTAR BARRA DE NAVEGACIÓN INFERIOR (ANDROID) ====================
    function setNavigationBarColor(color) {
        // Método nativo (WebView): pinta de verdad la barra de estado y la de navegación
        try {
            if (window.AndroidBridge && AndroidBridge.setSystemBarsColor) {
                AndroidBridge.setSystemBarsColor(color);
            }
        } catch(e) {}
        
        // Método 1: Tintar mediante theme-color (solo barra superior, pero ayuda)
        let metaTheme = document.querySelector('meta[name="theme-color"]');
        if(metaTheme) metaTheme.setAttribute('content', color);
        
        // Método 2: Intentar usar la API experimental de Android (WebView/Chrome)
        if(window.navigator?.virtualKeyboard) {
            // No es suficiente, pero intentamos con CSS
        }
        // Método 3: La forma más efectiva es usar la siguiente línea (solo funciona si la app está instalada o en standalone)
        // No hay API directa, pero podemos forzar un cambio de color-scheme y usar env()
        document.documentElement.style.setProperty('--nav-bar-color', color);
        
        // Método 4: Para Chrome en Android (>= 2020) se puede usar 'displayCutout' y background
        // Creamos un style dinámico para forzar el color de la barra de navegación
        let style = document.getElementById('dynamic-nav-style');
        if(!style) {
            style = document.createElement('style');
            style.id = 'dynamic-nav-style';
            document.head.appendChild(style);
        }
        style.innerHTML = `
            @media (display-mode: standalone) {
                body {
                    padding-bottom: env(safe-area-inset-bottom);
                }
            }
            /* Forzar el color de fondo de la barra de navegación en Android (truco visual) */
            body::before {
                display: none;
            }
        `;
        
        // Truco: Si el modo es light, claro; si dark, negro; si gray, gris oscuro
        // Esto no es perfecto pero muchos navegadores lo respetan con theme-color
        // Además agregamos un meta para color-scheme
        let colorSchemeMeta = document.getElementById('colorSchemeMeta');
        if(colorSchemeMeta) {
            if(color === '#ffffff' || color === '#fff') colorSchemeMeta.setAttribute('content', 'light');
            else colorSchemeMeta.setAttribute('content', 'dark');
        }
        
        // Método avanzado: Forzar repintado visual
        document.body.style.transform = 'translateZ(0)';
        setTimeout(() => { document.body.style.transform = ''; }, 100);
    }
    
    // ==================== STORAGE KEYS ====================
    const DATA_STORES = ['productos', 'clientes', 'proveedores', 'gastos', 'empleados', 'ventas', 'tasa_diaria'];
    const STORAGE_KEYS = {
        productos: 'jam_pos_productos',
        clientes: 'jam_pos_clientes',
        proveedores: 'jam_pos_proveedores',
        gastos: 'jam_pos_gastos',
        empleados: 'jam_pos_empleados',
        ventas: 'jam_pos_ventas',
        config: 'jam_pos_config',
        session_meta: 'jam_pos_meta',
        tasa_diaria: 'jam_pos_tasa_diaria'
    };

    let _idbAvisada = false;
    function avisarIDBCaida(err){
        if (_idbAvisada) return;
        _idbAvisada = true;
        console.warn('IndexedDB no disponible:', err);
        try { mostrarNotificacion('⚠️ Base de datos local no disponible. Los datos se conservan en memoria durante esta sesión.', 'error'); } catch(e) {}
    }
    // ==================== DATOS SUCIOS / CACHÉ DE MÓDULOS ====================
    // Cada escritura de datos marca "datos sucios"; en la siguiente navegación
    // se descarta la caché visual de los módulos para que las listas se
    // reconstruyan desde la base de datos (visibilidad instantánea entre
    // módulos: cliente creado en Ventas aparece ya en Clientes y viceversa).
    let datosSucios = false;
    const MODULOS_CACHEABLES = ['ventas','inventario','clientes','proveedores','gastos','empleados','reportes','config'];
    function limpiarCacheSiDatosSucios(){
        if(!datosSucios) return;
        datosSucios = false;
        MODULOS_CACHEABLES.forEach(m => { const el = document.getElementById('_cache_' + m); if(el) el.remove(); });
    }
    function abrirBaseDatos() {
        return new Promise((resolve, reject) => {
            const configurar = req => {
                req.onupgradeneeded = e => { const db = e.target.result; DATA_STORES.forEach(s => { if (!db.objectStoreNames.contains(s)) db.createObjectStore(s); }); if (!db.objectStoreNames.contains('session')) db.createObjectStore('session'); };
                req.onsuccess = e => resolve(e.target.result);
            };
            const abrirSinVersion = errOriginal => {
                try { if (req1.result) req1.result.close(); } catch(e) {}
                const req2 = indexedDB.open('jampos_db');
                configurar(req2);
                req2.onerror = () => { avisarIDBCaida(req2.error || errOriginal); reject(req2.error || errOriginal); };
            };
            // Versión 3: coincide con instalaciones previas (evita VersionError)
            const req1 = indexedDB.open('jampos_db', 3);
            configurar(req1);
            req1.onerror = () => abrirSinVersion(req1.error);
            req1.onblocked = () => abrirSinVersion(new Error('DB bloqueada'));
        });
    }
    async function saveToIDB(store, data) {
        datosSucios = true;
        const db = await abrirBaseDatos();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(store, 'readwrite');
            const obj = tx.objectStore(store);
            obj.clear();
            (data || []).forEach(item => {
                if (!item) return;
                if (!item.id) item.id = 'idb' + Date.now() + '_' + Math.random().toString(36).slice(2, 8);
                try { obj.put(item, item.id); } catch (e) {}
            });
            tx.oncomplete = () => { db.close(); resolve(); };
            tx.onerror = e => { db.close(); reject(e.target.error); };
        });
    }
    async function loadFromIDB(store) {
        const db = await abrirBaseDatos();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(store, 'readonly');
            const obj = tx.objectStore(store);
            const req = obj.getAll();
            req.onsuccess = () => { db.close(); resolve(req.result || []); };
            req.onerror = e => { db.close(); reject(e.target.error); };
        });
    }
    async function addToIDB(store, items) {
        datosSucios = true;
        const db = await abrirBaseDatos();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(store, 'readwrite');
            const obj = tx.objectStore(store);
            (items || []).forEach(item => {
                if (!item || !item.id) return;
                try { obj.put(item, item.id); } catch (e) {}
            });
            tx.oncomplete = () => { db.close(); resolve(); };
            tx.onerror = e => { db.close(); reject(e.target.error); };
        });
    }
    
    function loadFromStorage(key, defaultValue = []) { const data = localStorage.getItem(key); if (!data) return defaultValue; try { return JSON.parse(data); } catch(e) { return defaultValue; } }
    function saveToStorage(key, data) { localStorage.setItem(key, JSON.stringify(data)); }
    async function saveItem(store, item) {
        const key = STORAGE_KEYS[store];
        if (DATA_STORES.includes(store)) {
            item.updatedAt = Date.now();
            D[store] = D[store] || [];
            const i = D[store].findIndex(x => x.id === item.id);
            if (i !== -1) D[store][i] = item; else D[store].push(item);
            try { await saveToIDB(store, D[store]); } catch(e) { console.warn('IDB save error', e); avisarIDBCaida(e); }
        } else {
            const items = loadFromStorage(key, []);
            const idx = items.findIndex(x => x.id === item.id);
            if (idx !== -1) items[idx] = item; else items.push(item);
            saveToStorage(key, items);
            D[store] = items;
            datosSucios = true;
        }
    }
    async function deleteItem(store, id) {
        const key = STORAGE_KEYS[store];
        if (DATA_STORES.includes(store)) {
            D[store] = (D[store] || []).filter(x => x.id !== id);
            try { await saveToIDB(store, D[store]); } catch(e) { console.warn('IDB delete error', e); avisarIDBCaida(e); }
        } else {
            const items = loadFromStorage(STORAGE_KEYS[store], []).filter(x => x.id !== id);
            saveToStorage(STORAGE_KEYS[store], items);
            D[store] = items;
            datosSucios = true;
        }
    }
    async function getAll(store) {
        if (DATA_STORES.includes(store)) {
            try { return await loadFromIDB(store); } catch(e) { console.warn('IDB load error', e); avisarIDBCaida(e); }
            // Respaldo NO destructivo: conservar lo que hay en memoria antes de
            // recurrir al espejo localStorage (que puede estar vacío).
            if (Array.isArray(D[store]) && D[store].length) return D[store];
            return loadFromStorage(STORAGE_KEYS[store] || store, []);
        }
        return loadFromStorage(STORAGE_KEYS[store], []);
    }
    
    // ==================== DATOS GLOBALES ====================
    let D = {
        productos: [], clientes: [], proveedores: [], gastos: [], empleados: [], ventas: [],
        config: { 
            key:'mainConfig', theme:'#3b82f6', dolarRate:777.42, lastUpdate:new Date().toLocaleDateString(), 
            ivaActivo:false, ivaPorcentaje:16, usarMargen:false, backgroundMode:'light', autoOscuro:true, prevenirCierre:true,
            mostrarDolar: true, tasaManual: false, tasaManualValue: 777.42,
            empresa: { nombre:'JAM POS', direccion:'', telefono:'', rif:'', logo:'' },
            alertaStockBajo: true, alertaTasa: true, sonidoAlertas: true
        }
    };
    window.D = D;
    window.jamSaveIDB = async function(store, data) { await saveToIDB(store, data); };
    window.jamLoadIDB = async function(store) { return await loadFromIDB(store); };
    window.jamLoadAll = async function() { await loadAllData(); };
    window.jamGetAllDatos = async function() { return await obtenerTodosLosDatos(); };
    window.jamCombinarImportacion = function(dest, src, campo) { return combinarImportacion(dest, src, campo); };
    window.jamRefrescarModuloActual = function(){
        try {
            if(currentModule === 'clientes') renderCrud('clientes','Clientes',['cedula','nombre','telefono','direccion','email']);
            else if(currentModule === 'proveedores') renderCrud('proveedores','Proveedores',['rif','nombre','telefono','contacto','direccion']);
            else if(currentModule === 'gastos') renderCrud('gastos','Gastos',['concepto','montoBs','categoria','fecha']);
            else if(currentModule === 'empleados') renderCrud('empleados','Empleados',['cedula','nombre','cargo','salarioBs','fechaContrato']);
            else if(currentModule === 'inventario') renderInventario();
            else if(currentModule === 'ventas') sincronizarUIVenta();
        } catch(e) { console.warn('refrescar modulo', e); }
    };
    let currentModule = 'home', volverBloqueado = false, timeoutTitulo = null;
    const KIOSCO_KEY = 'jam_kiosco_ventas';
    let kioscoVentas = false;
    try { kioscoVentas = localStorage.getItem(KIOSCO_KEY) === '1'; } catch(e) {}
    let carrito = [], tipoPago = 'pago_movil', clienteSeleccionadoId = null, clienteInputText = '', totalVenta = 0;
    let productosSeleccionados = new Set(), selectAllChecked = false;
    let pagosDivididos = [{ metodo: 'efectivo_bs', monto: 0 }];
    
    // ==================== PERSISTENCIA DE SESIÓN DE VENTA ====================
    function guardarSesionVenta() {
        saveToStorage(STORAGE_KEYS.session_cart, carrito);
        saveToStorage(STORAGE_KEYS.session_meta, { tipoPago, clienteSeleccionadoId, clienteInputText });
    }
    function cargarSesionVenta() {
        const savedCart = loadFromStorage(STORAGE_KEYS.session_cart, null);
        if(savedCart && Array.isArray(savedCart)) carrito = savedCart;
        const savedMeta = loadFromStorage(STORAGE_KEYS.session_meta, null);
        if(savedMeta) { tipoPago = savedMeta.tipoPago || 'pago_movil'; clienteSeleccionadoId = savedMeta.clienteSeleccionadoId || null; clienteInputText = savedMeta.clienteInputText || ''; }
    }
    function sincronizarUIVenta() {
        if(document.getElementById('clienteIdHidden')) document.getElementById('clienteIdHidden').value = clienteSeleccionadoId || '';
        if(document.getElementById('clienteInput')) document.getElementById('clienteInput').value = clienteInputText;
        if(document.getElementById('tipoPago')) document.getElementById('tipoPago').value = tipoPago;
        actualizarCarritoUI();
    }
    
    async function loadAllData(){
        leerCarpetaNativa();
        D.productos = await getAll('productos');
        D.clientes = await getAll('clientes');
        D.proveedores = await getAll('proveedores');
        D.gastos = await getAll('gastos');
        D.empleados = await getAll('empleados');
        D.ventas = await getAll('ventas');
        D.tasaDiaria = await getAll('tasa_diaria');
        const savedConfig = localStorage.getItem(STORAGE_KEYS.config);
        if (savedConfig) try { D.config = { ...D.config, ...JSON.parse(savedConfig) }; } catch(e) {}
        if(!D.config.backgroundMode) D.config.backgroundMode = 'light';
        if(!D.config.empresa) D.config.empresa = { nombre:'JAM POS', direccion:'', telefono:'', rif:'', logo:'' };
        if(D.config.mostrarDolar === undefined) D.config.mostrarDolar = true;
        if(D.config.prevenirCierre === undefined) D.config.prevenirCierre = true;
        if(D.config.tasaManual === undefined) D.config.tasaManual = false;
        if(!D.config.tasaManualValue) D.config.tasaManualValue = D.config.dolarRate || 777.42;
        if(D.config.autoOscuro === undefined) D.config.autoOscuro = true;
        if(D.config.ivaActivo === undefined) D.config.ivaActivo = false;
        
        try { await migrarTasaDiaria(); } catch(e) { console.warn('tasa_diaria migrate', e); }
        refrescarCacheTasaDiaria();
        
        if(D.productos.length === 0){}
        if(D.clientes.length === 0){}
        aplicarModoSistema();
        applyTheme();
        saveConfig();
        cargarSesionVenta();
        setTimeout(verificarStockBajo, 1000);
    }
    
    function saveConfig(){ saveToStorage(STORAGE_KEYS.config, D.config); applyTheme(); actualizarManifestPWA(); }
    
    function actualizarManifestPWA() {
    }
    
    function esTemaOscuro(color) {
        if (typeof color !== 'string') return false;
        const hex = color.replace('#', '').trim();
        if (hex.length !== 6) return false;
        const r = parseInt(hex.slice(0, 2), 16), g = parseInt(hex.slice(2, 4), 16), b = parseInt(hex.slice(4, 6), 16);
        if (isNaN(r) || isNaN(g) || isNaN(b)) return false;
        return (0.299 * r + 0.587 * g + 0.114 * b) / 255 < 0.3;
    }
    
    function applyTheme(){
        document.documentElement.style.setProperty('--accent', D.config.theme);
        // Modo efectivo: si el tema elegido es negro/oscuro y el fondo es oscuro,
        // el fondo se cambia automáticamente a blanco para que todo resalte.
        const temaOscuro = esTemaOscuro(D.config.theme);
        let modo = D.config.backgroundMode;
        if (temaOscuro && modo === 'dark') modo = 'light';
        document.body.className = '';
        document.body.classList.add(`${modo}-mode`);
        if (temaOscuro) document.body.classList.add('accent-oscuro');
        actualizarModoLayout();
        
        const navBarColor = modo === 'dark' ? '#000000' : '#ffffff';
        
        // Actualizar theme-color para barra superior y para intentar pintar la inferior
        let themeColorMeta = document.getElementById('themeColorMeta');
        if(!themeColorMeta){
            themeColorMeta = document.createElement('meta');
            themeColorMeta.id = 'themeColorMeta';
            themeColorMeta.name = 'theme-color';
            document.head.appendChild(themeColorMeta);
        }
        themeColorMeta.setAttribute('content', navBarColor);
        
        // Forzar tintado de barra de navegación inferior mediante función especial
        setNavigationBarColor(navBarColor);
        
        // Actualizar barra de estado iOS
        let statusBarMeta = document.querySelector('meta[name="apple-mobile-web-app-status-bar-style"]');
        if(!statusBarMeta){
            statusBarMeta = document.createElement('meta');
            statusBarMeta.name = 'apple-mobile-web-app-status-bar-style';
            document.head.appendChild(statusBarMeta);
        }
        statusBarMeta.setAttribute('content', modo === 'light' ? 'default' : 'black');
        
        actualizarInfoCard();
    }
    
    function actualizarInfoCard() {
        const container = document.querySelector('.card-bcv .info-dinamica');
        if (!container) return;
        if (D.config.mostrarDolar) {
            container.innerHTML = `<span id="tasaDolarMostrar" class="text-5xl font-black" style="color:${D.config.theme}">${fmtDolar(D.config.dolarRate)}</span><span class="text-2xl font-bold" style="color:${D.config.theme}">Bs/USD</span>`;
        } else {
            const ahora = new Date();
            let diaSemana = ahora.toLocaleDateString('es-ES', { weekday: 'long' }).toUpperCase();
            const diaNumero = ahora.getDate();
            const mes = ahora.toLocaleDateString('es-ES', { month: 'long' });
            const año = ahora.getFullYear();
            container.innerHTML = `<div class="text-4xl font-black" style="color:${D.config.theme}">${diaSemana}</div><div class="text-base" style="color:${D.config.theme}">${diaNumero} de ${mes} del ${año}</div>`;
        }
    }
    
    // ==================== API TASA ====================
    async function obtenerTasaDesdeAPI() {
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 8000);
            const response = await fetch('https://api.exchangerate-api.com/v4/latest/USD', { signal: controller.signal });
            clearTimeout(timeoutId);
            if (!response.ok) throw new Error();
            const data = await response.json();
            if (data && data.rates && data.rates.VES) return parseFloat(data.rates.VES.toFixed(2));
            throw new Error();
        } catch(e) { return null; }
    }
    
    async function actualizarTasa(forzar = false) {
        if (D.config.tasaManual && !forzar) {
            D.config.dolarRate = D.config.tasaManualValue;
            registrarCambioTasa(D.config.dolarRate);
            saveConfig();
            actualizarDisplayTasa();
            recalcularPreciosPorTasa();
            return;
        }
        const tasaNueva = await obtenerTasaDesdeAPI();
        if (tasaNueva !== null) {
            const tasaPrevia = D.config.dolarRate;
            D.config.dolarRate = tasaNueva;
            D.config.lastUpdate = new Date().toLocaleDateString() + " " + new Date().toLocaleTimeString();
            if (forzar && D.config.tasaManual) D.config.tasaManualValue = tasaNueva;
            registrarCambioTasa(D.config.dolarRate);
            saveConfig();
            if(forzar) mostrarNotificacion(`Tasa actualizada: ${fmtDolar(tasaNueva)} Bs/USD`, 'success');
            notificarTasaActualizada(tasaPrevia, tasaNueva);
        } else if(!D.config.dolarRate) D.config.dolarRate = 777.42;
        actualizarDisplayTasa();
        recalcularPreciosPorTasa();
    }
    
    function actualizarDisplayTasa() {
        if (D.config.mostrarDolar) {
            let span = document.getElementById('tasaDolarMostrar');
            if (span) span.innerText = fmtDolar(D.config.dolarRate);
            let tasaDisplay = document.getElementById('tasaActualDisplay');
            if(tasaDisplay) tasaDisplay.innerText = fmtDolar(D.config.dolarRate);
        }
    }
    async function recalcularPreciosPorTasa() {
        let cambios = 0, tasa = D.config.dolarRate;
        for(const p of D.productos) {
            if(p.precioVentaUsd && p.precioVentaUsd > 0) {
                const nuevoBs = Math.round(p.precioVentaUsd * tasa * 100) / 100;
                if(Math.abs(nuevoBs - p.precioVentaBs) > 0.01) { p.precioVentaBs = nuevoBs; cambios++; }
            }
            if(p.costoRealUsd && p.costoRealUsd > 0) {
                const nuevoBs = Math.round(p.costoRealUsd * tasa * 100) / 100;
                if(Math.abs(nuevoBs - p.costoRealBs) > 0.01) { p.costoRealBs = nuevoBs; cambios++; }
            }
            if(p.precioDescuentoUsd && p.precioDescuentoUsd > 0) {
                const nuevoBs = Math.round(p.precioDescuentoUsd * tasa * 100) / 100;
                if(Math.abs(nuevoBs - (p.precioDescuentoBs || 0)) > 0.01) { p.precioDescuentoBs = nuevoBs; cambios++; }
            }
        }
        if(cambios > 0) {
            try { await saveToIDB('productos', D.productos); } catch(e) {}
            saveToStorage(STORAGE_KEYS.productos, D.productos);
            mostrarNotificacion(`Precios actualizados: ${cambios} producto(s)`, 'success');
        }
    }
    
    // ==================== MODO OSCURO AUTOMÁTICO ====================
    function aplicarModoSistema() {
        if(!D.config.autoOscuro) return;
        const prefiereOscuro = window.matchMedia('(prefers-color-scheme: dark)').matches;
        const modoSistema = prefiereOscuro ? 'dark' : 'light';
        if(D.config.backgroundMode !== modoSistema) {
            D.config.backgroundMode = modoSistema;
            saveConfig();
        }
    }
    
    // Escuchar cambios del sistema
    const mqModoOscuro = window.matchMedia('(prefers-color-scheme: dark)');
    mqModoOscuro.addEventListener('change', () => aplicarModoSistema());
    
    // Control de navegacion movil: el botón atrás NUNCA agota el historial (así el navegador no puede cerrar la app).
    // En móviles Chrome/Safari el navegador ignora beforeunload y cierra la pestaña en silencio cuando el historial se agota;
    // por eso aquí SIEMPRE se re-empuja una entrada al instante. El cierre real solo ocurre con el botón "Cerrar" del popup.
    function guardarYPrevenirCierre(e) {
        guardarSesionVenta();
        localStorage.setItem('jam_last_module', currentModule || '');
        if (window._permitirSalida || D.config?.prevenirCierre === false) return;
        e.preventDefault();
        e.returnValue = '';
        return '';
    }
    window.addEventListener('beforeunload', guardarYPrevenirCierre);
    
    function cerrarAplicacion() {
        window._permitirSalida = true;
        guardarSesionVenta();
        localStorage.setItem('jam_last_module', '');
        try {
            if (window.AndroidBridge && AndroidBridge.cerrarApp) {
                AndroidBridge.cerrarApp();
                return;
            }
        } catch(e) {}
        setTimeout(() => { try { if (window.close) window.close(); } catch(e) {} }, 50);
        setTimeout(() => {
            try { if (!document.hidden) location.replace('about:blank'); } catch(e) {}
        }, 400);
    }
    
    let dialogoSalidaAbierto = false;
    function mostrarDialogoSalida() {
        dialogoSalidaAbierto = true;
        return jamDialogo({
            titulo: '¿Salir de la aplicación?',
            mensaje: 'Al cerrar la aplicación se guardará el trabajo actual. Solo podrás salir con el botón "Cerrar"; usa "Volver" para continuar.',
            tipo: 'pregunta',
            botones: [
                { texto: 'Volver', valor: false },
                { texto: 'Cerrar', valor: true, destacado: true }
            ]
        }).then(decision => {
            if (decision === true) cerrarAplicacion();
        }).finally(() => {
            dialogoSalidaAbierto = false;
        });
    }
    // Expuesto para que el WebView nativo (Kotlin) lance el popup desde el botón atrás
    window.mostrarDialogoSalida = mostrarDialogoSalida;
    
    // El listener se registra ANTES de empujar historial y el push va en try/catch,
    // para que ningún error de pushState deje a la app sin protección.
    function empujarHistorial() {
        try { history.pushState(null, null, location.href); } catch(e) {}
    }
    empujarHistorial();
    window.addEventListener('popstate', async function(e) {
        empujarHistorial();
        if (kioscoVentas) {
            if (currentModule !== 'ventas') { currentModule = 'ventas'; renderVentas(); }
            return;
        }
        if (currentModule !== 'home') {
            if (window.backToHome) window.backToHome();
            return;
        }
        if (!dialogoSalidaAbierto) await mostrarDialogoSalida();
    });
    
    // ==================== VENTAS ====================
    async function renderVentas(){
        let bloqueado = volverBloqueado, accent = D.config.theme;
        // Pantalla única de Ventas (kiosco): sin Volver; candado rojo para salir.
        const btnHeader = kioscoVentas
            ? `<div id="btnKioscoCandado" class="kiosco-candado" title="Pantalla única activada: mantén presionado el candado 4 segundos para salir"><i class="fas fa-lock"></i></div>`
            : `<div id="btnVolverModule" class="btn-back ${bloqueado?'btn-back-bloqueado':''}" onclick="${bloqueado?'':'backToHome()'}">${bloqueado?'<i class="fas fa-lock"></i> Bloqueado':'<i class="fas fa-arrow-left"></i> Volver'}</div>`;
        const html = `
            <div class="page-header-fixed"><div class="module-header"><h2 id="tituloModule" class="module-title ${bloqueado?'module-title-bloqueado':''} ${kioscoVentas?'titulo-kiosco':''}" style="color:${accent}">Ventas</h2>${btnHeader}</div></div>
            <div class="page-container ventas-layout">
                <div class="ventas-top">
                    <div class="cliente-search-wrap">
                        <div class="buscador">
                            <i class="fas fa-search icono-busqueda"></i>
                            <input type="text" id="clienteInput" placeholder="Buscar cliente por nombre o cédula..." class="border-2 rounded-xl p-2 w-full" style="border-color:${accent}" autocomplete="off" value="${escapeHtml(clienteInputText)}">
                            <button id="btnNuevoClienteIcon" class="btn-icon-cuadrado" title="Nuevo cliente"><i class="fas fa-plus"></i></button>
                        </div>
                        <div id="sugerenciasClientes" class="sugerencias-clientes hidden"></div>
                        <input type="hidden" id="clienteIdHidden" value="${clienteSeleccionadoId || ''}">
                    </div>
                    <div class="sugerencias-wrap" style="margin-top:14px">
                        <div class="buscador">
                            <i class="fas fa-search icono-busqueda"></i>
                            <input type="text" id="buscarProducto" placeholder="Buscar por nombre o código de barras..." class="border-2 rounded-xl p-2 w-full" style="border-color:${accent}" autocomplete="off">
                            <button id="btnScanVentas" class="btn-icon-cuadrado" title="Escanear con cámara"><i class="fas fa-camera"></i></button>
                        </div>
                        <div id="sugerencias" class="hidden"></div>
                    </div>
                </div>
                <div class="ventas-cart-scroll"><div id="carritoLista"></div></div>
                <div class="ventas-bottom">
                    <div class="p-3 rounded-xl" style="background:rgba(0,0,0,0.05)"><div class="border-b pb-2 mb-2"><div class="ticket-line"><span>SUBTOTAL</span><span id="subtotal">0,00 Bs</span></div>${D.config.ivaActivo?`<div class="ticket-line"><span>IVA (${D.config.ivaPorcentaje}%)</span><span id="iva">0,00 Bs</span></div>`:''}<div class="ticket-line font-bold"><span>TOTAL</span><span id="total">0,00 Bs</span></div></div>
                    <div class="mb-2"><label class="text-xs">Tipo de pago</label><select id="tipoPago" class="border rounded-xl p-2 w-full">
                        <option value="efectivo_bs">💵 Efectivo (Bs)</option>
                        <option value="dolares">💵 Dólares (USD)</option>
                        <option value="tarjeta_debito">💳 Tarjeta Débito</option>
                        <option value="transferencia">🏦 Transferencia</option>
                        <option value="pago_movil">📱 Pago Móvil</option>
                        <option value="pago_dividido">🔀 Pago dividido</option>
                    </select></div>
                    <div id="cambioContainer" style="display:none"><div class="grid grid-cols-2 gap-2 mb-2"><input type="number" id="montoPagado" placeholder="Monto recibido (Bs)" class="border rounded-xl p-2"><button id="calcularCambio" class="btn-azul-redondeado btn-redondeado py-2">Calcular cambio</button></div><div id="cambioMensaje" class="text-green-600 text-sm mb-2"></div></div>
                    <div id="pagoDivididoContainer" style="display:none"><div id="pagosDivididosLista"></div><button id="agregarPagoDividido" class="btn-add-split mt-1"><i class="fas fa-plus"></i> Agregar método</button><div id="splitTotalStatus" class="split-total-match mt-2"></div></div>
                    <button id="finalizarVenta" class="btn-finalizar-venta">✅ Finalizar Venta</button>
                </div>
            </div>
        `;
        document.getElementById('appRoot').innerHTML = html;
        if(volverBloqueado && document.getElementById('btnVolverModule')) document.getElementById('btnVolverModule').onclick = () => mostrarOverlayBloqueo();
        conectarGestosKiosco();
        actualizarCarritoUI();
        sincronizarUIVenta();
        
        const inputCliente = document.getElementById('clienteInput');
        const sugerenciasDiv = document.getElementById('sugerenciasClientes');
        const hiddenId = document.getElementById('clienteIdHidden');
        
        const buscarClientes = () => {
            const term = normalizeText(inputCliente.value);
            if (!term) { sugerenciasDiv.classList.add('hidden'); hiddenId.value = ''; clienteSeleccionadoId = null; clienteInputText=''; guardarSesionVenta(); return; }
            const filtrados = D.clientes.filter(c => normalizeText(c.nombre).includes(term) || (c.cedula && normalizeText(c.cedula).includes(term)));
            if (filtrados.length === 0) { sugerenciasDiv.innerHTML = '<div class="sugerencia-cliente">No se encontraron clientes</div>'; sugerenciasDiv.classList.remove('hidden'); hiddenId.value = ''; clienteSeleccionadoId = null; return; }
            sugerenciasDiv.innerHTML = filtrados.map(c => `<div class="sugerencia-cliente" data-id="${c.id}" data-nombre="${escapeHtml(c.nombre)} (${c.cedula || 'Sin cédula'})"><strong>${escapeHtml(c.nombre)}</strong> - ${escapeHtml(c.cedula || 'Sin cédula')}</div>`).join('');
            sugerenciasDiv.classList.remove('hidden');
            document.querySelectorAll('.sugerencia-cliente').forEach(el => { el.onclick = () => { hiddenId.value = el.dataset.id; clienteSeleccionadoId = el.dataset.id; clienteInputText = el.dataset.nombre; inputCliente.value = clienteInputText; sugerenciasDiv.classList.add('hidden'); guardarSesionVenta(); }; });
        };
        inputCliente.addEventListener('input', e => { clienteInputText = e.target.value; buscarClientes(); guardarSesionVenta(); });
        
        document.getElementById('btnNuevoClienteIcon').onclick = async () => { await window.mostrarFormCrud('clientes', null, ['cedula','nombre','telefono','direccion','email'], true); D.clientes = await getAll('clientes'); };
        
        document.getElementById('buscarProducto').addEventListener('input', e => buscarProductos(e.target.value));
        document.getElementById('buscarProducto').addEventListener('keydown', e => { if(e.key === 'Enter') agregarPorCodigoBarras(e.target.value.trim()); });
        if(!('ontouchstart' in window)) setTimeout(() => document.getElementById('buscarProducto')?.focus(), 300);
        document.getElementById('btnScanVentas').onclick = () => abrirEscanerCamara('buscarProducto', agregarPorCodigoBarras);
        document.getElementById('finalizarVenta').onclick = () => finalizarVenta();
        const tipoPagoSelect = document.getElementById('tipoPago');
        tipoPagoSelect.value = tipoPago;
        tipoPagoSelect.onchange = () => {
            tipoPago = tipoPagoSelect.value;
            document.getElementById('cambioContainer').style.display = tipoPago === 'efectivo_bs' ? 'block' : 'none';
            document.getElementById('pagoDivididoContainer').style.display = tipoPago === 'pago_dividido' ? 'block' : 'none';
            guardarSesionVenta();
        };
        document.getElementById('cambioContainer').style.display = tipoPago === 'efectivo_bs' ? 'block' : 'none';
        document.getElementById('pagoDivididoContainer').style.display = tipoPago === 'pago_dividido' ? 'block' : 'none';
        if(document.getElementById('calcularCambio')) document.getElementById('calcularCambio').onclick = () => calcularCambio();
        renderPagosDivididosUI();
        document.getElementById('agregarPagoDividido').onclick = () => {
            pagosDivididos.push({ metodo: 'efectivo_bs', monto: 0 });
            renderPagosDivididosUI();
        };
    }
    
    window.mostrarFormCrud = async function(store, id, campos, desdeVentas = false) {
        let items = D[store], item = id ? items.find(i => i.id === id) : null;
        let modal = document.createElement('div'); modal.className = 'modal-form';
        let nombres = { cedula:'Cédula/RIF', nombre:'Nombre', telefono:'Teléfono', direccion:'Dirección', email:'Email', rif:'RIF', contacto:'Contacto', concepto:'Concepto', montoBs:'Monto (Bs)', categoria:'Categoría', fecha:'Fecha', cargo:'Cargo', salarioBs:'Salario (Bs)', fechaContrato:'Fecha Contrato' };
        let camposHtml = '';
        for(let i=0; i<campos.length; i++){
            let key = campos[i];
            let esFecha = (key === 'fecha' || key === 'fechaContrato');
            let valor = item ? (item[key]||'') : (esFecha ? msToDateStr(Date.now()) : '');
            let tipoInput = (key === 'cedula' || key === 'telefono') ? 'tel' : (esFecha ? 'date' : 'text');
            let valDisplay = (key === 'montoBs' || key === 'salarioBs') ? fmtPrecio(valor) : (esFecha ? aFechaISO(valor) : escapeHtml(valor.toString()));
            let inputmode = tipoInput === 'tel' ? 'numeric' : (key === 'montoBs' || key === 'salarioBs') ? 'decimal' : (esFecha ? 'date' : 'text');
            camposHtml += `<div class="mb-3"><label>${nombres[key]||key}</label><input type="${tipoInput}" id="field${i}" value="${valDisplay}" class="border rounded-xl p-2 w-full" inputmode="${inputmode}"></div>`;
        }
        modal.innerHTML = `<div class="modal-form-content"><h3 class="text-xl font-bold mb-4">${id ? 'Editar' : 'Nuevo'} ${store === 'clientes' ? 'Cliente' : 'Elemento'}</h3>${camposHtml}<div class="flex gap-3 mt-4"><button id="guardarCrud" class="btn-azul-redondeado btn-redondeado flex-1 py-2 font-bold">Guardar</button><button id="cancelarCrud" class="btn-redondeado flex-1 py-2 bg-gray-200">Cancelar</button></div></div>`;
        document.body.appendChild(modal);
        document.getElementById('cancelarCrud').onclick = () => modal.remove();
        document.getElementById('guardarCrud').onclick = async () => {
            const requeridos = { clientes:['nombre'], proveedores:['nombre'], gastos:['concepto'], empleados:['nombre'] };
            const titulosStore = { clientes:'Cliente', proveedores:'Proveedor', gastos:'Gasto', empleados:'Empleado' };
            let errores = [];
            for(let i=0; i<campos.length; i++){
                let val = document.getElementById(`field${i}`).value.trim();
                if((requeridos[store]||[]).includes(campos[i]) && !val) errores.push(nombres[campos[i]] || campos[i]);
                if(campos[i] === 'montoBs' && store === 'gastos' && parseBs(val) <= 0) errores.push('Monto (Bs)');
            }
            if(errores.length){
                await jamDialogo({ titulo:'Faltan datos', tipo:'error', mensaje: `No se puede guardar el ${titulosStore[store] || store}. Complete los siguientes campos:\n\n• ${errores.join('\n• ')}`, botones:[{ texto:'Entendido', valor:true, destacado:true }] });
                return;
            }
            let nuevo = { id: id || (store === 'clientes' ? 'c' : 'pr') + Date.now() + '_' + Date.now() };
            for(let i=0; i<campos.length; i++) {
                let val = document.getElementById(`field${i}`).value.trim();
                nuevo[campos[i]] = (campos[i] === 'nombre' || campos[i] === 'concepto' || campos[i] === 'contacto' || campos[i] === 'cargo') ? capitalizeWords(val) : val;
                if(campos[i] === 'fecha' || campos[i] === 'fechaContrato'){
                    let p = val.split('-').map(Number);
                    nuevo.timestamp = new Date(p[0], (p[1]||1)-1, p[2]||1).getTime();
                }
            }
            if(store === 'gastos') nuevo.montoBs = parseBs(nuevo.montoBs);
            if(store === 'empleados') nuevo.salarioBs = parseBs(nuevo.salarioBs);
            await saveItem(store, nuevo);
            modal.remove();
            if(desdeVentas && store === 'clientes') {
                D.clientes = await getAll('clientes');
                const inputCliente = document.getElementById('clienteInput');
                const hiddenId = document.getElementById('clienteIdHidden');
                if(inputCliente) {
                    inputCliente.value = `${nuevo.nombre} (${nuevo.cedula || 'Sin cédula'})`;
                    hiddenId.value = nuevo.id;
                    clienteSeleccionadoId = nuevo.id;
                    clienteInputText = inputCliente.value;
                    guardarSesionVenta();
                }
                return;
            }
            if(store === 'clientes') renderCrud('clientes','Clientes',campos);
            else if(store === 'proveedores') renderCrud('proveedores','Proveedores',campos);
            else if(store === 'gastos') renderCrud('gastos','Gastos',campos);
            else if(store === 'empleados') renderCrud('empleados','Empleados',campos);
        };
    };
    
    function buscarProductos(term){
        let sug = document.getElementById('sugerencias');
        if(term.length < 2){ sug.classList.add('hidden'); return; }
        let norm = normalizeText(term);
        let filt = D.productos.filter(p => normalizeText(p.nombre).includes(norm) || (p.codigo && normalizeText(p.codigo).includes(norm)));
        if(!filt.length){ sug.classList.add('hidden'); return; }
        sug.innerHTML = filt.map(p => `<div class="sugerencia-item" onclick="agregarAlCarrito('${p.id}')">${escapeHtml(p.nombre)} | ${fmtPrecio(p.precioVentaBs)} Bs | Stock: ${p.stock}</div>`).join('');
        sug.classList.remove('hidden');
    }
    
    function mostrarSelectorPrecio(prod, pr, cb){
        const descPct = (typeof prod.porcentajeDescuento === 'number' && prod.porcentajeDescuento > 0) ? prod.porcentajeDescuento : 0;
        let modal = document.createElement('div'); modal.className = 'modal-form';
        modal.innerHTML = `<div class="modal-form-content" style="max-width:340px">
            <h3 class="text-lg font-bold mb-1" style="color:var(--accent,#3b82f6)">💰 Elegir precio de venta</h3>
            <p class="text-xs mb-3 opacity-70">${escapeHtml(prod.nombre)}</p>
            <div class="flex flex-col gap-2">
                <button id="selNormal" class="btn-redondeado p-3 text-left" style="border:2px solid var(--accent,#3b82f6)">
                    <div class="font-bold">Precio normal</div>
                    <div class="text-sm">${fmtPrecio(pr.normalBs)} Bs</div>
                    <div class="text-xs opacity-60">USD $${pr.normalUsd}</div>
                </button>
                <button id="selOferta" class="btn-redondeado p-3 text-left" style="border:2px solid #10b981">
                    <div class="font-bold" style="color:#10b981">🏷️ Precio con descuento (-${descPct}%)</div>
                    <div class="text-sm">${fmtPrecio(pr.desc.bs)} Bs</div>
                    <div class="text-xs opacity-60">USD $${pr.desc.usd}</div>
                </button>
            </div>
            <button id="cancelarPrecio" class="w-full mt-3 py-2 rounded-xl bg-gray-200">Cancelar</button>
        </div>`;
        document.body.appendChild(modal);
        modal.querySelector('#selNormal').onclick = () => { modal.remove(); cb({ bs: pr.normalBs, usd: pr.normalUsd }, false); };
        modal.querySelector('#selOferta').onclick = () => { modal.remove(); cb({ bs: pr.desc.bs, usd: pr.desc.usd }, true); };
        modal.querySelector('#cancelarPrecio').onclick = () => modal.remove();
        modal.onclick = e => { if(e.target === modal) modal.remove(); };
    }
    function agregarProductoAlCarrito(prod){
        let ex = carrito.find(c => c.id === prod.id);
        let enCarrito = ex ? ex.cantidad : 0;
        if(prod.stock <= 0) { mostrarNotificacion(`⚠️ "${escapeHtml(prod.nombre)}" está agotado`, 'error'); return false; }
        if(enCarrito + 1 > prod.stock) { mostrarNotificacion(`⚠️ Solo hay ${prod.stock} de "${escapeHtml(prod.nombre)}" en stock`, 'error'); return false; }
        const confirmar = (precio, oferta) => {
            if(ex) ex.cantidad++;
            else {
                let item = Object.assign({}, prod, { cantidad: 1, precioUsadoBs: precio.bs, precioUsadoUsd: precio.usd, precioOferta: oferta });
                carrito.push(item);
            }
            actualizarCarritoUI();
            guardarSesionVenta();
            return true;
        };
        const pr = preciosProducto(prod);
        if(pr.tieneDesc){
            mostrarSelectorPrecio(prod, pr, confirmar);
        } else {
            return confirmar({ bs: pr.normalBs, usd: pr.normalUsd }, false);
        }
        return true;
    }
    window.agregarAlCarrito = id => {
        let prod = D.productos.find(p => p.id === id);
        if(!prod) return;
        agregarProductoAlCarrito(prod);
        let bp = document.getElementById('buscarProducto');
        if(bp){ bp.value = '';             document.getElementById('sugerencias')?.classList.add('hidden'); }
        guardarSesionVenta();
    };
    
    // ==================== CÓDIGO DE BARRAS ====================
    window.agregarPorCodigoBarras = codigo => {
        if(!codigo) return;
        let prod = D.productos.find(p => p.codigo && normalizeText(p.codigo.toString()) === normalizeText(codigo));
        if(!prod) { mostrarNotificacion(`❌ Producto con código "${escapeHtml(codigo)}" no encontrado`, 'error'); return; }
        const ok = agregarProductoAlCarrito(prod);
        document.getElementById('buscarProducto').value = '';
        let sug = document.getElementById('sugerencias'); if(sug) sug.classList.add('hidden');
        guardarSesionVenta();
        if(ok) mostrarNotificacion(`✅ Agregado: ${escapeHtml(prod.nombre)}`, 'success');
    };
    window.buscarPorCodigoInventario = codigo => {
        if(!codigo) return;
        let prod = D.productos.find(p => p.codigo && normalizeText(p.codigo.toString()) === normalizeText(codigo));
        if(!prod) { mostrarNotificacion(`❌ Producto con código "${escapeHtml(codigo)}" no encontrado`, 'error'); return; }
        document.getElementById('searchInv').value = normalizeText(prod.nombre).slice(0,30);
        renderListaProductos(normalizeText(prod.nombre).slice(0,30));
        setTimeout(() => { let cards = document.querySelectorAll('.product-card'); if(cards.length > 0) cards[0].scrollIntoView({behavior:'smooth', block:'center'}); }, 100);
    };
    function detenerScanner(escaneo, stream) {
        if(escaneo) { clearInterval(escaneo); }
        if(window.Quagga && typeof Quagga.stop === 'function') { try { Quagga.stop(); } catch(e) {} }
        if(stream) { stream.getTracks().forEach(t => t.stop()); }
    }
    window.abrirEscanerCamara = (inputId, callback) => {
        let modal = document.createElement('div'); modal.className = 'modal-form';
        modal.innerHTML = `<div class="modal-form-content" style="max-width:500px"><h3 class="text-xl font-bold mb-3">📷 Escanear código de barras</h3><div id="scannerContainer" style="width:100%;border-radius:12px;overflow:hidden;background:#000;max-height:300px"></div><div id="scannerResult" class="text-center mt-2 text-sm font-bold" style="color:var(--accent,#3b82f6)">Esperando código...</div><div class="flex gap-3 mt-3"><button id="btnStopScan" class="btn-redondeado flex-1 py-2 bg-gray-200">Cancelar</button></div></div>`;
        document.body.appendChild(modal);
        function limpiarYCerrar() { detenerScanner(escaneo, stream); modal.remove(); }
        let escaneo = null, stream = null;

        if('BarcodeDetector' in window) {
            let video = document.createElement('video');
            video.id = 'scannerVideo'; video.autoplay = true; video.playsInline = true;
            video.style.cssText = 'width:100%;border-radius:12px;background:#000;max-height:300px';
            document.getElementById('scannerContainer').appendChild(video);
            navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } }).then(s => {
                stream = s; video.srcObject = s;
                const detector = new BarcodeDetector({ formats: ['ean_13','ean_8','code_128','code_39','qr_code','upc_a','upc_e','codabar','itf','data_matrix','pdf417'] });
                escaneo = setInterval(async () => {
                    try {
                        let codigos = await detector.detect(video);
                        if(codigos.length > 0){
                            clearInterval(escaneo); escaneo = null;
                            stream.getTracks().forEach(t => t.stop()); stream = null;
                            modal.remove();
                            let inp = document.getElementById(inputId); if(inp) inp.value = codigos[0].rawValue;
                            if(callback) callback(codigos[0].rawValue);
                        }
                    } catch(e) {}
                }, 500);
            }).catch(() => { mostrarNotificacion('📷 No se pudo acceder a la cámara', 'error'); modal.remove(); });
        } else if(window.Quagga) {
            Quagga.init({
                inputStream: { name: 'Live', type: 'LiveStream', target: document.querySelector('#scannerContainer'),
                    constraints: { width: 640, height: 480, facingMode: 'environment' } },
                decoder: { readers: ['ean_reader','ean_8_reader','code_128_reader','code_39_reader','upc_reader','upc_e_reader','codabar_reader','i2of5_reader','pdf417_reader'] }
            }, err => {
                if(err) { mostrarNotificacion('📷 Error al iniciar escáner: ' + (err.message||err), 'error'); modal.remove(); return; }
                Quagga.start();
                Quagga.onDetected(data => {
                    let cod = data.codeResult.code;
                    Quagga.offDetected();
                    try { Quagga.stop(); } catch(e) {}
                    modal.remove();
                    let inp = document.getElementById(inputId); if(inp) inp.value = cod;
                    if(callback) callback(cod);
                });
            });
        } else {
            mostrarNotificacion('📷 Escáner por cámara no disponible. Instale Quagga o use Chrome/Edge.', 'error');
            modal.remove(); return;
        }
        document.getElementById('btnStopScan').onclick = limpiarYCerrar;
        modal.onclick = e => { if(e.target === modal) limpiarYCerrar(); };
    };
    
    function actualizarCarritoUI(){
        let cont = document.getElementById('carritoLista'), sub = document.getElementById('subtotal'), tot = document.getElementById('total'), ivaSpan = document.getElementById('iva');
        if(!cont) return;
        if(carrito.length === 0){
            cont.innerHTML = '<div class="text-center py-2">Vacío</div>';
            if(sub) sub.innerText = '0,00 Bs';
            if(tot) tot.innerText = '0,00 Bs';
            if(ivaSpan) ivaSpan.innerText = '0,00 Bs';
            totalVenta = 0;
            return;
        }
        let suma = 0, html = '';
        carrito.forEach((it,i) => {
            let precioU = (it.precioUsadoBs != null && it.precioUsadoBs > 0) ? it.precioUsadoBs : it.precioVentaBs;
            let subit = precioU * it.cantidad;
            suma += subit;
            html += `<div class="flex justify-between text-sm py-1"><div>${escapeHtml(it.nombre)} x${it.cantidad}${it.precioOferta ? ' <span class="text-xs" style="color:#10b981">(Oferta)</span>' : ''}</div><div>${fmtPrecio(subit)} Bs <button onclick="eliminarDelCarrito(${i})" class="text-red-500 ml-2"><i class="fas fa-trash"></i></button></div></div>`;
        });
        cont.innerHTML = html;
        let pctIva = D.config.ivaPorcentaje / 100;
        let iva = D.config.ivaActivo ? suma * pctIva : 0, total = suma + iva;
        sub.innerText = `${fmtPrecio(suma)} Bs`;
        if(ivaSpan) ivaSpan.innerText = `${fmtPrecio(iva)} Bs`;
            if(tot) tot.innerText = `${fmtPrecio(total)} Bs`;
        totalVenta = total;
        window.eliminarDelCarrito = i => { carrito.splice(i,1); actualizarCarritoUI(); guardarSesionVenta(); };
    }
    
    function renderPagosDivididosUI(){
        let cont = document.getElementById('pagosDivididosLista');
        if(!cont) return;
        let suma = 0;
        cont.innerHTML = pagosDivididos.map((p,i) => {
            let metodos = ['efectivo_bs','dolares','tarjeta_debito','transferencia','pago_movil'];
            let etiquetas = {'efectivo_bs':'💵 Efectivo Bs','dolares':'💵 Dólares','tarjeta_debito':'💳 Tarjeta Débito','transferencia':'🏦 Transferencia','pago_movil':'📱 Pago Móvil'};
            suma += parseFloat(p.monto) || 0;
            return `<div class="split-payment-row">
                <select onchange="cambiarMetodoSplit(${i},this.value)">${metodos.map(m => `<option value="${m}" ${m===p.metodo?'selected':''}>${etiquetas[m]}</option>`).join('')}</select>
                <input type="number" step="any" min="0" value="${p.monto||''}" placeholder="Monto Bs" oninput="cambiarMontoSplit(${i},this.value)">
                ${pagosDivididos.length > 1 ? `<button class="remove-split" onclick="eliminarSplit(${i})"><i class="fas fa-times"></i></button>` : ''}
            </div>`;
        }).join('');
        let totalPagos = suma;
        actualizarSplitStatus(totalPagos);
    }
    function actualizarSplitStatus(totalPagos){
        let status = document.getElementById('splitTotalStatus');
        if(!status) return;
        let diff = totalPagos - totalVenta;
        if(Math.abs(diff) < 0.01) status.className = 'split-total-match ok';
        else status.className = 'split-total-match err';
        status.innerHTML = `Total asignado: ${fmtPrecio(totalPagos)} Bs ${Math.abs(diff) < 0.01 ? '✅' : `(faltan ${fmtPrecio(Math.abs(diff))} Bs)`}`;
    }
    window.cambiarMetodoSplit = (i, v) => { pagosDivididos[i].metodo = v; actualizarSplitStatus(pagosDivididos.reduce((s,p)=>s+(parseFloat(p.monto)||0),0)); };
    window.cambiarMontoSplit = (i, v) => { pagosDivididos[i].monto = parseFloat(v) || 0; actualizarSplitStatus(pagosDivididos.reduce((s,p)=>s+(parseFloat(p.monto)||0),0)); };
    window.eliminarSplit = (i) => { if(pagosDivididos.length > 1) { pagosDivididos.splice(i,1); renderPagosDivididosUI(); } };
    
    function calcularCambio(){
        let pagado = parseFloat(document.getElementById('montoPagado')?.value || '0');
        let cambio = document.getElementById('cambioMensaje');
        if(!isNaN(pagado) && pagado >= totalVenta) cambio.innerHTML = `Cambio: ${fmtPrecio(pagado - totalVenta)} Bs`;
        else cambio.innerHTML = 'Monto insuficiente';
    }
    
    async function finalizarVenta(){
        if(carrito.length === 0) { alert("Carrito vacío"); return; }
        if(!(await jamConfirm(`¿Desea finalizar la venta por ${fmtPrecio(totalVenta)} Bs?`))) return;
        let pagado = totalVenta, detallePagos = null;
        if(tipoPago === 'efectivo_bs') {
            pagado = parseFloat(document.getElementById('montoPagado')?.value);
            if(isNaN(pagado) || pagado < totalVenta) { alert("Monto insuficiente"); return; }
        } else if(tipoPago === 'pago_dividido') {
            pagado = pagosDivididos.reduce((s,p) => s + (parseFloat(p.monto) || 0), 0);
            if(pagado < totalVenta - 0.01) { alert(`Monto insuficiente. Asignó ${fmtPrecio(pagado)} Bs, necesita ${fmtPrecio(totalVenta)} Bs`); return; }
            detallePagos = pagosDivididos.map(p => ({ ...p }));
        }
        for(let it of carrito){
            let prod = D.productos.find(p => p.id === it.id);
            if(!prod || prod.stock < it.cantidad) { alert(`Stock insuficiente para ${it.nombre}`); return; }
        }
        for(let it of carrito){
            let prod = D.productos.find(p => p.id === it.id);
            prod.stock -= it.cantidad;
            await saveItem('productos', prod);
            let idx = D.productos.findIndex(p => p.id === it.id);
            if(idx !== -1) D.productos[idx].stock = prod.stock;
        }
        verificarStockBajo();
        let ahora = new Date();
        let codigo = `${ahora.getFullYear()}${(ahora.getMonth()+1).toString().padStart(2,'0')}${ahora.getDate().toString().padStart(2,'0')}-${ahora.getHours().toString().padStart(2,'0')}${ahora.getMinutes().toString().padStart(2,'0')}${ahora.getSeconds().toString().padStart(2,'0')}${ahora.getMilliseconds().toString().padStart(3,'0')}`;
        let clienteId = document.getElementById('clienteIdHidden')?.value || null;
        let clienteNombre = "Cliente General";
        if(clienteId) {
            let clienteEncontrado = D.clientes.find(c => c.id === clienteId);
            if(clienteEncontrado) clienteNombre = clienteEncontrado.nombre;
        } else {
            let nombreIngresado = document.getElementById('clienteInput')?.value.trim();
            if(nombreIngresado) clienteNombre = nombreIngresado;
        }
        
        let itemsVenta = carrito.map(i => {
            const precioU = (i.precioUsadoBs != null && i.precioUsadoBs > 0) ? i.precioUsadoBs : i.precioVentaBs;
            const precioUsd = (i.precioUsadoUsd != null && i.precioUsadoUsd > 0) ? i.precioUsadoUsd : i.precioVentaUsd;
            const costoUsd = parseFloat(i.costoRealUsd) || 0;
            const costoBsActual = costoUsd > 0 ? Math.round(costoUsd * (D.config.dolarRate || 1) * 100) / 100 : (i.costoRealBs || 0);
            return { idProducto: i.id, nombre: i.nombre, cantidad: i.cantidad, precioUnitario: precioU, precioUsd: precioUsd, costoUnitario: costoBsActual, subtotal: precioU * i.cantidad, ganancia: (precioU - costoBsActual) * i.cantidad, precioOferta: !!i.precioOferta };
        });
        let subtotalVenta = itemsVenta.reduce((s,i) => s + i.subtotal, 0);
        let ivaVenta = D.config.ivaActivo ? subtotalVenta * (D.config.ivaPorcentaje / 100) : 0;
        let gananciaTotal = itemsVenta.reduce((s,i) => s + i.ganancia, 0);
        let nuevaVenta = { 
            id: codigo, 
            fecha: ahora.toLocaleString(), 
            timestamp: ahora.getTime(), 
            cliente: clienteNombre,
            clienteId: clienteId,
            items: itemsVenta, 
            subtotal: subtotalVenta, 
            iva: ivaVenta, 
            total: totalVenta, 
            gananciaTotal: gananciaTotal, 
            dolarRate: D.config.dolarRate || 0,
            ivaPorcentaje: D.config.ivaPorcentaje,
            pago: pagado, 
            cambio: pagado - totalVenta, 
            tipoPago: tipoPago,
            detallePagos: detallePagos
        };
        await saveItem('ventas', nuevaVenta);
        mostrarNotificacionNativa('Venta registrada', `${clienteNombre} — ${fmtPrecio(totalVenta)} Bs`, 'venta');
        mostrarTicket(nuevaVenta);
        carrito = [];
        clienteSeleccionadoId = null;
        clienteInputText = '';
        tipoPago = 'pago_movil';
        pagosDivididos = [{ metodo: 'efectivo_bs', monto: 0 }];
        guardarSesionVenta();
        if(document.getElementById('clienteInput')) document.getElementById('clienteInput').value = '';
        if(document.getElementById('clienteIdHidden')) document.getElementById('clienteIdHidden').value = '';
        actualizarCarritoUI();
    }
    
    // ==================== TICKET ====================
    function esPagoEfectivo(venta){
        if(!venta) return false;
        if(venta.tipoPago === 'efectivo_bs' || venta.tipoPago === 'dolares') return true;
        if(venta.tipoPago === 'pago_dividido' && Array.isArray(venta.detallePagos) && venta.detallePagos.length){
            return venta.detallePagos.every(d => d.metodo === 'efectivo_bs' || d.metodo === 'dolares');
        }
        return false;
    }
    function textoFechaVenta(venta){
        if(!venta) return '';
        if(venta.timestamp && !isNaN(new Date(venta.timestamp).getTime())) return new Date(venta.timestamp).toLocaleString();
        let f = String(venta.fecha || '').trim();
        if(!f) return '';
        let iso = f.match(/^(\d{4})-(\d{1,2})-(\d{1,2})(?:[T ](\d{1,2}):(\d{1,2}))?/);
        if(iso){
            let d = new Date(+iso[1], +iso[2]-1, +iso[3], +(iso[4]||0), +(iso[5]||0));
            if(!isNaN(d.getTime())) return d.toLocaleString();
        }
        let m = f.match(/^(\d{1,2})[-\/](\d{1,2})[-\/](\d{2,4})(?:[ ,]+(\d{1,2}):(\d{1,2}))?/);
        if(m){
            let aa = m[3].length === 2 ? '20' + m[3] : m[3];
            let d = new Date(+aa, +m[2]-1, +m[1], +(m[4]||0), +(m[5]||0));
            if(!isNaN(d.getTime())) return d.toLocaleString();
        }
        let d2 = new Date(f);
        if(!isNaN(d2.getTime())) return d2.toLocaleString();
        return f;
    }
    function imprimirTicket(venta) {
        // 42 columnas = estandar 80mm; cambiar a 32 si es ticketera 58mm
        const W = 42;
        const formasPago = { 'efectivo_bs':'EFECTIVO Bs','pago_movil':'PAGO MOVIL','transferencia':'TRANSFERENCIA','tarjeta_debito':'TARJETA DEBITO','dolares':'DOLARES','pago_dividido':'PAGO DIVIDIDO' };
        const etiqMetodo = {'efectivo_bs':'Efectivo Bs','dolares':'Dolares','tarjeta_debito':'Tjta Debito','transferencia':'Transferencia','pago_movil':'Pago Movil'};
        const rep = (c, n) => { let r = ''; for (let i=0; i<n; i++) r += c; return r; };
        const padR = (s, n) => { s = String(s); return s.length >= n ? s.slice(0,n) : s + rep(' ', n - s.length); };
        const padL = (s, n) => { s = String(s); return s.length >= n ? s.slice(-n) : rep(' ', n - s.length) + s; };
        const cen = (s) => { s = String(s); let p = Math.max(0, W - s.length); return rep(' ', Math.floor(p/2)) + s + rep(' ', Math.ceil(p/2)); };
        const eq  = rep('=', W);
        const gui = rep('-', W);
        const esc = (v) => v ? String(v).replace(/[<>&"']/g, '') : '';
        let t = '';
        // Header centrado (como ticket virtual)
        t += cen(D.config.empresa.nombre.toUpperCase()) + '\n';
        if (D.config.empresa.direccion) t += cen(esc(D.config.empresa.direccion)) + '\n';
        if (D.config.empresa.telefono) t += cen('TEL: ' + esc(D.config.empresa.telefono)) + '\n';
        if (D.config.empresa.rif) t += cen('RIF: ' + esc(D.config.empresa.rif)) + '\n';
        t += eq + '\n';
        t += cen(textoFechaVenta(venta)) + '\n';
        t += cen('Ticket: ' + venta.id) + '\n';
        t += 'Cliente: ' + esc(venta.cliente) + '\n';
        t += eq + '\n';
        // Items: nombre a izq, precio a der
        venta.items.forEach(item => {
            let nom = item.cantidad + 'x ' + esc(item.nombre) + (item.precioOferta ? ' (OFERTA)' : '');
            let pre = fmtPrecio(item.subtotal) + ' Bs';
            t += padR(nom, W - 10) + padL(pre, 10) + '\n';
        });
        t += gui + '\n';
        t += padR('SUBTOTAL', W - 10) + padL(fmtPrecio(venta.subtotal) + ' Bs', 10) + '\n';
        if (venta.iva) t += padR('IVA (' + (venta.ivaPorcentaje != null ? venta.ivaPorcentaje : D.config.ivaPorcentaje) + '%)', W - 10) + padL(fmtPrecio(venta.iva) + ' Bs', 10) + '\n';
        t += padR('TOTAL', W - 10) + padL(fmtPrecio(venta.total) + ' Bs', 10) + '\n';
        t += gui + '\n';
        t += padR('PAGO', W - 10) + padL(fmtPrecio(venta.pago) + ' Bs', 10) + '\n';
        if (esPagoEfectivo(venta)) t += padR('CAMBIO', W - 10) + padL(fmtPrecio(venta.cambio) + ' Bs', 10) + '\n';
        if (venta.detallePagos) {
            t += padR('FORMA DE PAGO:', W - 10) + padL('DIVIDIDO', 10) + '\n';
            venta.detallePagos.forEach(d => {
                t += '  ' + padR(etiqMetodo[d.metodo]||d.metodo, W - 22) + padL(fmtPrecio(d.monto)+' Bs', 10) + '\n';
            });
        } else {
            t += padR('FORMA DE PAGO:', W - 10) + padL(formasPago[venta.tipoPago]||venta.tipoPago, 10) + '\n';
        }
        t += eq + '\n';
        t += cen('GRACIAS POR SU COMPRA!') + '\n';
        t += cen(D.config.empresa.nombre) + '\n';
        // Abrir ventana para impresion con estilo minimo
        let v = window.open('', '_blank', 'width=380,height=600');
        if(!v) { mostrarNotificacion('Permite ventanas emergentes para imprimir', 'error'); return; }
        v.document.write(
            '<html><head><meta charset="UTF-8"><title>Ticket</title>' +
            '<style>' +
            'body{font-family:"Courier New",monospace;font-size:11px;line-height:1.3;margin:0;padding:8px;white-space:pre;color:#000;background:#fff}' +
            '@media print{@page{margin:0}body{padding:0}}' +
            '</style></head><body>' + t.replace(/\n/g, '<br>') +
            '</body></html>'
        );
        v.document.close();
        setTimeout(() => { try { v.focus(); v.print(); } catch(e){} }, 500);
    }
    
    function generarTicketHTML(venta, mostrarTasa = false) {
        const formasPago = { 'efectivo_bs':'EFECTIVO Bs','pago_movil':'PAGO MÓVIL','transferencia':'TRANSFERENCIA','tarjeta_debito':'TARJETA DÉBITO','dolares':'DÓLARES','pago_dividido':'PAGO DIVIDIDO' };
        const itemsHtml = venta.items.map(item => `<div class="item"><span>${item.cantidad}x ${escapeHtml(item.nombre)}${item.precioOferta ? ' <span style="color:#10b981;font-size:9px">(OFERTA)</span>' : ''}</span><span>${fmtPrecio(item.subtotal)} Bs</span></div>`).join('');
        const logoHtml = D.config.empresa.logo ? `<div class="logo"><img src="${escapeHtml(D.config.empresa.logo)}" style="max-width:60px; max-height:60px;"></div>` : '';
        let formaPagoHtml = `<div class="ticket-line"><span>FORMA DE PAGO</span><span>${formasPago[venta.tipoPago] || venta.tipoPago}</span></div>`;
        if(venta.detallePagos){
            let etiqMetodo = {'efectivo_bs':'Efectivo Bs','dolares':'Dólares','tarjeta_debito':'Tarjeta Débito','transferencia':'Transferencia','pago_movil':'Pago Móvil'};
            let detalleHtml = venta.detallePagos.map(d => `<div class="ticket-line" style="font-size:9px"><span>${etiqMetodo[d.metodo]||d.metodo}</span><span>${fmtPrecio(d.monto)} Bs</span></div>`).join('');
            formaPagoHtml = `<div class="ticket-line" style="font-weight:bold"><span>FORMA DE PAGO</span><span>PAGO DIVIDIDO</span></div>${detalleHtml}`;
        }
        return `<div class="ticket-virtual" id="ticketParaImprimir">${logoHtml}<div class="header"><h3>${escapeHtml(D.config.empresa.nombre)}</h3>${D.config.empresa.direccion ? `<p>${escapeHtml(D.config.empresa.direccion)}</p>` : ''}${D.config.empresa.telefono ? `<p>📞 ${escapeHtml(D.config.empresa.telefono)}</p>` : ''}${D.config.empresa.rif ? `<p>RIF: ${escapeHtml(D.config.empresa.rif)}</p>` : ''}<p>${textoFechaVenta(venta)}</p>${mostrarTasa && venta.dolarRate ? `<p>Tasa: 1 USD = ${fmtDolar(venta.dolarRate)} Bs</p>` : ''}<p>Ticket: ${venta.id}</p><p>Cliente: ${escapeHtml(venta.cliente)}</p></div><div class="items">${itemsHtml}</div><div class="ticket-line"><span>SUBTOTAL</span><span>${fmtPrecio(venta.subtotal)} Bs</span></div>${venta.iva ? `<div class="ticket-line"><span>IVA (${venta.ivaPorcentaje != null ? venta.ivaPorcentaje : D.config.ivaPorcentaje}%)</span><span>${fmtPrecio(venta.iva)} Bs</span></div>` : ''}<div class="ticket-line total"><span>TOTAL</span><span>${fmtPrecio(venta.total)} Bs</span></div><div class="ticket-line"><span>PAGO</span><span>${fmtPrecio(venta.pago)} Bs</span></div>${esPagoEfectivo(venta) ? `<div class="ticket-line"><span>CAMBIO</span><span>${fmtPrecio(venta.cambio)} Bs</span></div>` : ''}${formaPagoHtml}<div class="footer"><p>¡Gracias por su compra!</p><p>${D.config.empresa.nombre}</p></div></div>`;
    }
    function mostrarTicket(venta, mostrarTasa = false) {
        const modal = document.createElement('div'); modal.className = 'modal-form';
        modal.innerHTML = `<div class="modal-form-content" style="max-width:350px; text-align:center;">${generarTicketHTML(venta, mostrarTasa)}<div class="ticket-buttons"><button class="ticket-btn btn-print" onclick="window.imprimirTicketDirecto('${venta.id}')"><i class="fas fa-print"></i> Imprimir</button><button class="ticket-btn btn-wa" onclick="window.enviarTicketPorWhatsApp('${venta.id}')"><i class="fab fa-whatsapp"></i> WhatsApp</button><button class="ticket-btn btn-img" onclick="window.descargarTicketImagen()"><i class="fas fa-download"></i> Imagen</button><button class="ticket-btn btn-copy" onclick="window.copiarTicketTexto()"><i class="fas fa-copy"></i> Copiar</button><button class="ticket-btn btn-cerrar" onclick="window.cerrarTicketModalYVolverInicio()"><i class="fas fa-times"></i> Cerrar</button></div></div>`;
        document.body.appendChild(modal);
        window.ticketActual = venta;
        window.modalTicketActual = modal;
        modal.onclick = e => { if(e.target === modal) window.cerrarTicketModalYVolverInicio(); };
    }
    
    window.cerrarTicketModalYVolverInicio = () => { if(window.modalTicketActual) { window.modalTicketActual.remove(); window.modalTicketActual = null; } };
    window.imprimirTicketDirecto = (ventaId) => {
        const venta = D.ventas.find(v => v.id === ventaId);
        if(!venta) return;
        if (window.AndroidBridge && typeof AndroidBridge.printTicket === 'function') {
            const html = '<!DOCTYPE html><html><head><meta charset="UTF-8"><link rel="stylesheet" href="style.css"><style>html,body{margin:0;padding:0;background:#fff}@media print{@page{margin:8px}body{padding:0}.ticket-buttons{display:none!important}}</style></head><body>' + generarTicketHTML(venta) + '</body></html>';
            try { AndroidBridge.printTicket(html, 'Ticket ' + venta.id); }
            catch(e) { imprimirTicket(venta); }
        } else {
            imprimirTicket(venta);
        }
    };
    window.enviarTicketPorWhatsApp = async (ventaId) => {
        const venta = D.ventas.find(v => v.id === ventaId);
        if(!venta) return;
        const formasPago = { 'efectivo_bs':'EFECTIVO Bs','pago_movil':'PAGO MÓVIL','transferencia':'TRANSFERENCIA','tarjeta_debito':'TARJETA DÉBITO','dolares':'DÓLARES','pago_dividido':'PAGO DIVIDIDO' };
        const etiqMetodo = {'efectivo_bs':'Efectivo Bs','dolares':'Dólares','tarjeta_debito':'Tarjeta Débito','transferencia':'Transferencia','pago_movil':'Pago Móvil'};
        let mensaje = `🏪 *${D.config.empresa.nombre}* 🏪\n`;
        if(D.config.empresa.direccion) mensaje += `📍 ${D.config.empresa.direccion}\n`;
        if(D.config.empresa.telefono) mensaje += `📞 ${D.config.empresa.telefono}\n`;
        mensaje += `━━━━━━━━━━━━━━━━━━━━\n📅 ${textoFechaVenta(venta)}\n🧾 *${venta.id}*\n👤 Cliente: ${venta.cliente}\n━━━━━━━━━━━━━━━━━━━━\n`;
        venta.items.forEach(item => { mensaje += `${item.cantidad}x ${item.nombre} → ${fmtPrecio(item.subtotal)} Bs\n`; });
        mensaje += `━━━━━━━━━━━━━━━━━━━━\n💰 *SUBTOTAL:* ${fmtPrecio(venta.subtotal)} Bs\n`;
        if(venta.iva) mensaje += `📊 *IVA:* ${fmtPrecio(venta.iva)} Bs\n`;
        mensaje += `💵 *TOTAL:* ${fmtPrecio(venta.total)} Bs\n💸 *PAGO:* ${fmtPrecio(venta.pago)} Bs\n${esPagoEfectivo(venta) ? `🔄 *CAMBIO:* ${fmtPrecio(venta.cambio)} Bs\n` : ''}`;
        if(venta.detallePagos) {
            venta.detallePagos.forEach(d => { mensaje += `└ ${etiqMetodo[d.metodo]||d.metodo}: ${fmtPrecio(d.monto)} Bs\n`; });
        } else {
            mensaje += `💳 *FORMA DE PAGO:* ${formasPago[venta.tipoPago] || venta.tipoPago}\n`;
        }
        mensaje += `━━━━━━━━━━━━━━━━━━━━\n🙏 ¡Gracias por su compra!\n${D.config.empresa.nombre}`;
        try { await navigator.clipboard.writeText(mensaje); mostrarNotificacion('📋 Ticket copiado al portapapeles', 'success'); } catch(e) {}
        const telefono = await jamPrompt("📱 Ingrese el número de teléfono (ej: 584121234567):");
        if(telefono) {
            let numeroLimpio = telefono.replace(/[^0-9]/g, '');
            if(numeroLimpio.startsWith('0')) numeroLimpio = '58' + numeroLimpio.substring(1);
            if(!numeroLimpio.startsWith('58')) numeroLimpio = '58' + numeroLimpio;
            window.open(`https://wa.me/${numeroLimpio}?text=${encodeURIComponent(mensaje)}`, '_blank');
        }
    };
    async function capturarTicketImagen() {
        const ticket = document.getElementById('ticketParaImprimir');
        if(!ticket) return null;
        try {
            return await html2canvas(ticket, { scale: 2, backgroundColor: '#ffffff', useCORS: true });
        } catch(e) {
            const logo = ticket.querySelector('.logo');
            const oculto = logo ? logo.style.display : null;
            if (logo) logo.style.display = 'none';
            try {
                return await html2canvas(ticket, { scale: 2, backgroundColor: '#ffffff' });
            } finally {
                if (logo) logo.style.display = oculto || '';
            }
        }
    }
    window.descargarTicketImagen = async () => {
        const ticket = document.getElementById('ticketParaImprimir');
        if(!ticket) return;
        try {
            const canvas = await capturarTicketImagen();
            if(!canvas) throw new Error('canvas vacío');
            const nombre = `ticket_${Date.now()}.png`;
            const dataUrl = canvas.toDataURL('image/png');
            // 1) App nativa (APK): guardar directamente vía puente Android
            if (window.AndroidBridge && typeof AndroidBridge.saveTicketImage === 'function') {
                const res = await puenteResultado(AndroidBridge.saveTicketImage(dataUrl, nombre));
                if (res && res.startsWith('ok')) {
                    mostrarNotificacion('✅ Factura guardada en Imágenes/JAMPOS', 'success');
                    return;
                }
            }
            // 2) Compartir/Guardar con Web Share API (Android moderno / navegador)
            if (navigator.canShare && window.File && typeof canvas.toBlob === 'function') {
                try {
                    const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
                    const file = new File([blob], nombre, { type: 'image/png' });
                    if (navigator.canShare({ files: [file] })) {
                        await navigator.share({ files: [file], title: 'Factura JAM POS' });
                        return;
                    }
                } catch(e) { /* el usuario canceló o no soportado */ }
            }
            // 3) Fallback navegador/PWA: Blob + createObjectURL (Chrome Android sí lo descarga)
            const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
            if (blob) {
                const link = document.createElement('a');
                link.download = nombre;
                link.href = URL.createObjectURL(blob);
                document.body.appendChild(link);
                link.click();
                setTimeout(() => { URL.revokeObjectURL(link.href); link.remove(); }, 5000);
                mostrarNotificacion('✅ Factura descargada en Descargas', 'success');
            } else {
                const link = document.createElement('a');
                link.download = nombre;
                link.href = dataUrl;
                link.click();
            }
        } catch(e) { alert('Error al generar imagen: ' + (e && e.message ? e.message : e)); }
    };
    window.copiarTicketTexto = () => { const ticket = document.getElementById('ticketParaImprimir'); if(!ticket) return; const texto = ticket.innerText; navigator.clipboard.writeText(texto).then(() => alert('✓ Ticket copiado')).catch(() => alert('Error al copiar')); };
    
    // ==================== NAVEGACIÓN CON PERSISTENCIA ====================
    function cacheModuleDOM(mod) {
        if(!mod || mod === 'home') return;
        const appRoot = document.getElementById('appRoot');
        if(!appRoot || appRoot.children.length === 0) return;
        let cacheEl = document.getElementById('_cache_' + mod);
        if(!cacheEl) {
            cacheEl = document.createElement('div');
            cacheEl.id = '_cache_' + mod;
            cacheEl.style.display = 'none';
            document.body.appendChild(cacheEl);
        }
        while(appRoot.firstChild) cacheEl.appendChild(appRoot.firstChild);
    }
    function restoreModuleDOM(mod) {
        const cacheEl = document.getElementById('_cache_' + mod);
        if(!cacheEl || cacheEl.children.length === 0) return false;
        const appRoot = document.getElementById('appRoot');
        while(cacheEl.firstChild) appRoot.appendChild(cacheEl.firstChild);
        return true;
    }
    function cleanModuleCache(mod) {
        const el = document.getElementById('_cache_' + mod);
        if(el) el.remove();
    }
    
    window.navigateTo = m => {
        if(kioscoVentas && m !== 'ventas') { mostrarAvisoKiosco(); return; }
        if(volverBloqueado && currentModule !== 'home') { mostrarOverlayBloqueo(); return; }
        if(currentModule === m) return;
        if(currentModule === 'ventas') guardarSesionVenta();
        
        // Cache current module DOM
        limpiarCacheSiDatosSucios();
        cacheModuleDOM(currentModule);
        currentModule = m;
        localStorage.setItem('jam_last_module', m);
        history.pushState(null, null, location.href);
        
        // Try to restore cached module DOM
        if(restoreModuleDOM(m)) {
            if(m === 'ventas') sincronizarUIVenta();
            if(esDesktop()) renderSidebar();
            inyectarBotonAyudaModulo();
            iniciarGuiaModuloSiPrimeraVez(m);
            return;
        }
        
        // Render fresh
        if(m === 'ventas') renderVentas();
        else if(m === 'inventario') renderInventario();
        else if(m === 'clientes') renderCrud('clientes', 'Clientes', ['cedula','nombre','telefono','direccion','email']);
        else if(m === 'proveedores') renderCrud('proveedores', 'Proveedores', ['rif','nombre','telefono','contacto','direccion']);
        else if(m === 'gastos') renderCrud('gastos', 'Gastos', ['concepto','montoBs','categoria','fecha']);
        else if(m === 'empleados') renderCrud('empleados', 'Empleados', ['cedula','nombre','cargo','salarioBs','fechaContrato']);
        else if(m === 'reportes') renderReportes();
        else if(m === 'config') renderConfig();
        inyectarBotonAyudaModulo();
        iniciarGuiaModuloSiPrimeraVez(m);
        if(esDesktop()) renderSidebar();
    };
    
    function mostrarOverlayBloqueo() {
        const overlay = document.createElement('div'); overlay.className = 'modulo-bloqueado-overlay';
        overlay.innerHTML = `<div class="modulo-bloqueado-mensaje"><i class="fas fa-lock"></i><p><strong>Módulo Bloqueado</strong></p><p>Para desbloquear, mantén presionado el título del módulo por 2 segundos.</p><small>Modo profesional activado</small></div>`;
        document.body.appendChild(overlay);
        setTimeout(() => overlay.remove(), 2000);
    }
    
    window.backToHome = () => {
        if(kioscoVentas) { mostrarAvisoKiosco(); if(currentModule !== 'ventas') { currentModule = 'ventas'; renderVentas(); } return; }
        if(volverBloqueado) { mostrarOverlayBloqueo(); return; }
        if(currentModule === 'home') return;
        if(currentModule === 'ventas') guardarSesionVenta();
        cacheModuleDOM(currentModule);
        currentModule = 'home'; volverBloqueado = false;
        localStorage.setItem('jam_last_module', '');
        renderHome();
    };
    
    window.iniciarBloqueo = (el, nombre) => {
        if(timeoutTitulo) clearTimeout(timeoutTitulo);
        timeoutTitulo = setTimeout(() => {
            volverBloqueado = !volverBloqueado;
            if(el) { el.classList.toggle('module-title-bloqueado', volverBloqueado); }
            let btn = document.getElementById('btnVolverModule');
            if(btn){
                if(volverBloqueado){ btn.classList.add('btn-back-bloqueado'); btn.innerHTML = '<i class="fas fa-lock"></i> Bloqueado'; btn.onclick = () => mostrarOverlayBloqueo(); }
                else{ btn.classList.remove('btn-back-bloqueado'); btn.innerHTML = '<i class="fas fa-arrow-left"></i> Volver'; btn.onclick = () => window.backToHome(); }
            }
            const toast = document.createElement('div');
            toast.style.cssText = 'position:fixed;bottom:80px;left:50%;transform:translateX(-50%);padding:10px 20px;border-radius:50px;z-index:10000;font-size:12px;';
            if(volverBloqueado){ toast.style.background='#dc2626'; toast.style.color='white'; toast.innerHTML='🔒 Módulo BLOQUEADO - Modo profesional activado'; }
            else{ toast.style.background='#10b981'; toast.style.color='white'; toast.innerHTML='🔓 Módulo DESBLOQUEADO'; }
            document.body.appendChild(toast);
            setTimeout(() => toast.remove(), 2000);
            timeoutTitulo = null;
        }, 2000);
    };
    
    window.cancelarBloqueo = () => { if(timeoutTitulo){ clearTimeout(timeoutTitulo); timeoutTitulo = null; } };

    // ==================== PANTALLA ÚNICA DE VENTAS (KIOSCO) ====================
    // Se activa manteniendo presionado el título "Ventas" 4 s: el módulo queda
    // fijado como única pantalla (sin Volver ni acceso a otros módulos).
    // Persiste en localStorage (sobrevive reinicios y segundo plano). Se
    // desactiva manteniendo presionado el candado rojo 4 s.
    // Gesto táctil robusto: Pointer Events + captura de puntero (sobrevive a
    // micro-deslizamientos), tolerancia 12 px, barra de progreso --kiosco-p,
    // sin selección de texto ni menú contextual durante la pulsación.
    function mostrarAvisoKiosco() {
        const overlay = document.createElement('div'); overlay.className = 'modulo-bloqueado-overlay';
        overlay.innerHTML = `<div class="modulo-bloqueado-mensaje"><i class="fas fa-lock" style="color:#ef4444"></i><p><strong>Pantalla única de Ventas</strong></p><p>Solo puedes usar este módulo. Mantén presionado el candado rojo por 4 segundos para salir.</p></div>`;
        document.body.appendChild(overlay);
        setTimeout(() => overlay.remove(), 2200);
    }
    function crearGestoMantener(el, ms, alCompletar, claseVisual) {
        if(!el || el.dataset.holdBound) return;
        el.dataset.holdBound = '1';
        el.style.setProperty('--kiosco-p', '0%');
        let timer = null, raf = null, x0 = 0, y0 = 0;
        const pintar = () => {
            const p = Math.min(100, ((Date.now() - el._holdInicio) / ms) * 100);
            el.style.setProperty('--kiosco-p', p + '%');
            if(p < 100) raf = requestAnimationFrame(pintar); else raf = null;
        };
        const limpiar = () => {
            if(timer){ clearTimeout(timer); timer = null; }
            if(raf){ cancelAnimationFrame(raf); raf = null; }
            el.style.setProperty('--kiosco-p', '0%');
            if(claseVisual) el.classList.remove(claseVisual);
        };
        const abajo = e => {
            if(timer) return;
            x0 = e.clientX; y0 = e.clientY; el._holdInicio = Date.now();
            if(claseVisual) el.classList.add(claseVisual);
            if(navigator.vibrate) navigator.vibrate(15);
            try { el.setPointerCapture(e.pointerId); } catch(err) {}
            if(e.pointerType !== 'mouse') e.preventDefault();
            pintar();
            timer = setTimeout(() => { limpiar(); alCompletar(); }, ms);
        };
        const mover = e => {
            if(!timer) return;
            if(Math.hypot(e.clientX - x0, e.clientY - y0) > 12) limpiar();
        };
        el.addEventListener('pointerdown', abajo);
        el.addEventListener('pointermove', mover);
        ['pointerup','pointercancel','lostpointercapture'].forEach(ev => el.addEventListener(ev, () => limpiar()));
        el.addEventListener('contextmenu', e => e.preventDefault());
    }
    window.iniciarKioscoVentas = () => {
        kioscoVentas = true;
        try { localStorage.setItem(KIOSCO_KEY, '1'); } catch(e) {}
        localStorage.setItem('jam_last_module', 'ventas');
        renderVentas();
        mostrarNotificacion('🔒 Pantalla única de Ventas ACTIVADA', 'error');
        if(navigator.vibrate) navigator.vibrate([40,60,40]);
    };
    window.desactivarKioscoVentas = () => {
        kioscoVentas = false;
        try { localStorage.setItem(KIOSCO_KEY, '0'); } catch(e) {}
        renderVentas();
        mostrarNotificacion('🔓 Pantalla única DESACTIVADA', 'success');
        if(navigator.vibrate) navigator.vibrate(30);
    };
    function conectarGestosKiosco() {
        if(kioscoVentas) {
            const c = document.getElementById('btnKioscoCandado');
            if(c) crearGestoMantener(c, 4000, () => window.desactivarKioscoVentas(), 'kiosco-sostenido');
        } else {
            const t = document.getElementById('tituloModule');
            if(t) crearGestoMantener(t, 4000, () => window.iniciarKioscoVentas(), 'titulo-sostenido');
        }
    }
    
    // ==================== DETECCIÓN DE ESCRITORIO ====================
    function esDesktop() { return window.innerWidth >= 1024; }
    function actualizarModoLayout() {
        const sidebar = document.getElementById('sidebarNav');
        if(!sidebar) return;
        if(esDesktop()) {
            document.body.classList.add('has-sidebar');
            sidebar.style.display = 'flex';
            renderSidebar();
        } else {
            document.body.classList.remove('has-sidebar');
            sidebar.style.display = 'none';
        }
    }
    
    // ==================== SIDEBAR ====================
    const MODULOS_SIDEBAR = [
        {icon:"fa-shopping-cart", label:"Ventas", id:"ventas"},
        {icon:"fa-boxes", label:"Inventario", id:"inventario"},
        {icon:"fa-users", label:"Clientes", id:"clientes"},
        {icon:"fa-truck", label:"Proveedores", id:"proveedores"},
        {icon:"fa-coins", label:"Gastos", id:"gastos"},
        {icon:"fa-user-tie", label:"Empleados", id:"empleados"},
        {icon:"fa-chart-line", label:"Reportes", id:"reportes"},
        {icon:"fa-palette", label:"Configuración", id:"config"}
    ];
    
    function renderSidebar() {
        const sidebar = document.getElementById('sidebarNav');
        if(!sidebar) return;
        const accent = D.config.theme;
        const actual = currentModule || 'home';
        sidebar.innerHTML = `<div class="sidebar-brand" style="color:${accent}">JAM</div><div class="sidebar-sep"></div>${MODULOS_SIDEBAR.map(m => {
            const activo = actual === m.id ? 'filter:brightness(1.3);' : '';
            return `<button class="sidebar-item" style="${activo}color:${accent}" onclick="navigateTo('${m.id}')" title="${m.label}"><i class="fas ${m.icon}" style="color:${accent}"></i><span>${m.label}</span></button>`;
        }).join('')}<div class="sidebar-sep" style="margin-top:auto"></div><button class="sidebar-item" onclick="backToHome()" title="Inicio" style="margin-top:auto"><i class="fas fa-home" style="color:${accent}"></i><span>Inicio</span></button>`;
    }
    
    // ==================== PANTALLA PRINCIPAL ====================
    function renderHome(){
        if(window.fechaHoraInterval) { clearInterval(window.fechaHoraInterval); window.fechaHoraInterval = null; }
        currentModule = 'home'; volverBloqueado = false;
        document.querySelectorAll('[id^="_cache_"]').forEach(el => el.remove());
        let accent = D.config.theme;
        let mostrarDolarHtml = D.config.mostrarDolar ? 
            `<div class="flex justify-center items-baseline gap-1 info-dinamica"><span id="tasaDolarMostrar" class="text-5xl font-black" style="color:${accent}">${fmtDolar(D.config.dolarRate)}</span><span class="text-2xl font-bold" style="color:${accent}">Bs/USD</span></div>` :
            `<div class="info-dinamica" style="text-align:center"></div>`;
        const enDesktop = esDesktop();
        const homeGridHtml = enDesktop ? `<div class="home-grid sidebar-hidden">` : `<div class="home-grid">`;
        document.getElementById('appRoot').innerHTML = `
            <div class="home-container" style="padding-top:16px">
                <div class="mb-4">
                    <div class="relative">
                        <i class="fas fa-search absolute left-4 top-3.5 text-gray-400"></i>
                        <input type="text" id="searchGlobalInput" placeholder="Buscar productos, clientes..." class="w-full pl-10 pr-12 p-2 rounded-2xl border-2 shadow-sm" style="border-color:${accent}">
                        <button class="btn-ayuda-home" onclick="mostrarGuiaApp()" title="Guía de la app"><i class="fas fa-circle-question"></i></button>
                        <div id="globalResults" class="absolute z-30 w-full mt-2 rounded-2xl shadow-xl max-h-72 overflow-auto hidden" style="border:1px solid var(--accent);"></div>
                    </div>
                </div>
                <div class="card-bcv">
                    <div class="led-converter" onclick="mostrarConvertidor()"><i class="fas fa-exchange-alt text-sm"></i></div>
                    <p class="text-xs font-bold">${D.config.mostrarDolar ? 'TIPO DE CAMBIO (USD → VES)' : 'FECHA'}</p>
                    ${mostrarDolarHtml}
                    <p class="text-[11px] mt-1">${D.config.mostrarDolar ? 'Actualizado: ' + D.config.lastUpdate : ''}</p>
                    <p class="text-[9px] opacity-70 mt-0.5">Tasa oficial BCV</p>
                </div>
                ${homeGridHtml}
                    ${MODULOS_SIDEBAR.map(m => `<button onclick="navigateTo('${m.id}')" class="main-module-btn" style="background:${accent};"><i class="fas ${m.icon}"></i><span>${m.label}</span></button>`).join('')}
                </div>
                <div class="text-center text-xs mt-4 opacity-60">${enDesktop ? 'Usa la barra lateral ' : ''}JAM POS v${APP_VERSION}</div>
            </div>
        `;
        actualizarModoLayout();
        const inputGlobal = document.getElementById('searchGlobalInput');
        inputGlobal.addEventListener('input', e => globalSearch(e.target.value));
        inputGlobal.addEventListener('focus', () => { document.body.classList.add('teclado-abierto'); if(window.scrollTo) window.scrollTo(0, 0); });
        inputGlobal.addEventListener('blur', () => document.body.classList.remove('teclado-abierto'));
        if(!D.config.mostrarDolar) {
            const actualizarFechaSolamente = () => {
                const infoDiv = document.querySelector('.card-bcv .info-dinamica');
                if(infoDiv) {
                    const ahora = new Date();
                    let diaSemana = ahora.toLocaleDateString('es-ES', { weekday: 'long' }).toUpperCase();
                    const diaNumero = ahora.getDate();
                    const mes = ahora.toLocaleDateString('es-ES', { month: 'long' });
                    const año = ahora.getFullYear();
                    infoDiv.innerHTML = `<div class="text-4xl font-black" style="color:${accent}">${diaSemana}</div><div class="text-base" style="color:${accent}">${diaNumero} de ${mes} del ${año}</div>`;
                }
            };
            actualizarFechaSolamente();
            window.fechaHoraInterval = setInterval(actualizarFechaSolamente, 60000);
        }
        iniciarTutorialSiPrimeraVez();
        if(window._pruebaInfo) mostrarBannerPrueba(window._pruebaInfo);
    }
    
    async function globalSearch(term){
        let div = document.getElementById('globalResults');
        if(term.length < 2){ div.classList.add('hidden'); return; }
        let norm = normalizeText(term);
        let prod = D.productos.filter(p => normalizeText(p.nombre).includes(norm) || (p.codigo && normalizeText(p.codigo).includes(norm)));
        let cli = D.clientes.filter(c => normalizeText(c.nombre).includes(norm));
        let html = '';
        prod.slice(0,5).forEach(p => {
            const prg = preciosProducto(p);
            const ofG = prg.tieneDesc ? `<div class="text-xs" style="color:#10b981">🏷️ Oferta: ${fmtPrecio(prg.desc.bs)} Bs / $${prg.desc.usd}</div>` : '';
            html += `<div class="global-result p-3 cursor-pointer border-b" style="border-bottom-color:var(--accent);">
                        <div class="font-bold">${escapeHtml(p.nombre)}</div>
                        <div class="text-sm flex justify-between flex-wrap">
                            <span>💰 ${fmtPrecio(prg.normalBs)} Bs</span>
                            <span>💵 $${prg.normalUsd}</span>
                            <span>📦 Stock: ${p.stock}</span>
                        </div>
                        ${ofG}
                        <div class="flex gap-2 mt-2">
                            <button onclick="event.stopPropagation();editarProductoDesdeBusqueda('${p.id}')" class="btn-editar-redondeado">✏️ Editar</button>
                            <button onclick="event.stopPropagation();venderProductoDesdeBusqueda('${p.id}')" class="btn-verde-redondeado">🛒 Vender</button>
                        </div>
                    </div>`;
        });
        cli.slice(0,3).forEach(c => html += `<div class="global-result p-3 cursor-pointer" onclick="alert('👤 ${escapeHtml(c.nombre)} - ${escapeHtml(c.cedula||'')}')"><i class="fas fa-user mr-2"></i>${escapeHtml(c.nombre)}</div>`);
        if(!html) html = '<div class="p-3 text-center">Sin resultados</div>';
        let inp = document.getElementById('searchGlobalInput');
        if(window._gsTimer) cancelAnimationFrame(window._gsTimer);
        window._gsTimer = requestAnimationFrame(() => {
            div.textContent = '';
            div.insertAdjacentHTML('beforeend', html);
            div.classList.remove('hidden');
            if(inp && document.activeElement !== inp) inp.focus();
            window._gsTimer = null;
        });
        if(window._closeGlobalSearch) { document.removeEventListener('click', window._closeGlobalSearch); }
        window._closeGlobalSearch = e => {
            let inp2 = document.getElementById('searchGlobalInput');
            if(!div.contains(e.target) && e.target !== inp2 && !inp2?.contains(e.target)){ div.classList.add('hidden'); document.removeEventListener('click', window._closeGlobalSearch); window._closeGlobalSearch = null; }
        };
        setTimeout(() => document.addEventListener('click', window._closeGlobalSearch), 100);
    }
    
    window.editarProductoDesdeBusqueda = id => mostrarFormProducto(id, true);
    window.venderProductoDesdeBusqueda = id => { navigateTo('ventas'); setTimeout(() => agregarAlCarrito(id), 100); };
    
    window.mostrarConvertidor = () => {
        if(window.convMod) window.convMod.remove();
        let m = document.createElement('div'); m.className = 'modal-form';
        m.innerHTML = `<div class="modal-form-content"><h3 class="font-bold text-lg mb-3">🔄 Convertidor Bs ↔ USD</h3><div class="mb-3"><label>Bolívares (Bs)</label><input type="number" id="bsInput" placeholder="Bs" class="border p-2 rounded w-full"></div><div class="mb-3"><label>Dólares (USD)</label><input type="number" id="usdInput" placeholder="USD" class="border p-2 rounded w-full"></div><p class="text-sm">Tasa: 1 USD = ${fmtDolar(D.config.dolarRate)} Bs</p><button id="closeConv" class="mt-3 w-full py-2 rounded-xl bg-gray-200">Cerrar</button></div>`;
        document.body.appendChild(m);
        window.convMod = m;
        let bs = document.getElementById('bsInput'), usd = document.getElementById('usdInput');
        bs.oninput = () => { if(bs.value) usd.value = (parseFloat(bs.value) / D.config.dolarRate).toFixed(2); };
        usd.oninput = () => { if(usd.value) bs.value = (parseFloat(usd.value) * D.config.dolarRate).toFixed(2); };
        document.getElementById('closeConv').onclick = () => { m.remove(); window.convMod = null; };
        m.onclick = e => { if(e.target === m) { m.remove(); window.convMod = null; } };
    };
    
    // ==================== INVENTARIO ====================
    async function renderInventario(){
        let bloqueado = volverBloqueado, accent = D.config.theme;
        productosSeleccionados = new Set(); selectAllChecked = false;
        document.getElementById('appRoot').innerHTML = `<div class="page-header-fixed"><div class="module-header"><h2 id="tituloModule" class="module-title ${bloqueado?'module-title-bloqueado':''}" style="color:${accent}" onmousedown="iniciarBloqueo(this,'Inventario')" onmouseup="cancelarBloqueo()" onmouseleave="cancelarBloqueo()">Inventario</h2><div id="btnVolverModule" class="btn-back ${bloqueado?'btn-back-bloqueado':''}" onclick="${bloqueado?'':'backToHome()'}">${bloqueado?'<i class="fas fa-lock"></i> Bloqueado':'<i class="fas fa-arrow-left"></i> Volver'}</div></div></div><div class="page-container"><div class="mb-3"><div class="buscador"><i class="fas fa-search icono-busqueda"></i><input type="text" id="searchInv" placeholder="Buscar producto o código de barras..." class="border-2 rounded-xl p-2 w-full" style="border-color:${accent}" autocomplete="off"><button id="btnScanInv" class="btn-icon-cuadrado" title="Escanear con cámara"><i class="fas fa-camera"></i></button></div></div><div class="batch-toolbar"><label class="flex items-center gap-2 text-sm"><input type="checkbox" id="selectAllCheckbox" class="select-all-checkbox" onchange="toggleSelectAll(this.checked)"> Seleccionar todo</label><button id="nuevoProducto" class="btn-azul-redondeado btn-redondeado py-2 px-4">+ Nuevo</button><button id="btnEditarLote" class="btn-azul-redondeado btn-redondeado py-2 px-4" onclick="editarSeleccionLote()" style="display:none">✏️ Editar selección</button><span id="batchCount" class="batch-count"></span></div><div id="listaProductos" class="scroll-area"></div></div>`;
        if(volverBloqueado) document.getElementById('btnVolverModule').onclick = () => mostrarOverlayBloqueo();
        document.getElementById('searchInv').addEventListener('input', e => renderListaProductos(e.target.value.toLowerCase()));
        document.getElementById('searchInv').addEventListener('keydown', e => { if(e.key === 'Enter') buscarPorCodigoInventario(e.target.value.trim()); });
        if(!('ontouchstart' in window)) setTimeout(() => document.getElementById('searchInv')?.focus(), 300);
        document.getElementById('btnScanInv').onclick = () => abrirEscanerCamara('searchInv', cod => { document.getElementById('searchInv').value = cod; buscarPorCodigoInventario(cod); });
        document.getElementById('nuevoProducto').onclick = () => mostrarFormProducto(null);
        renderListaProductos('');
    }
    
    function renderListaProductos(filtro = ''){
        let norm = normalizeText(filtro);
        let filt = D.productos.filter(p => normalizeText(p.nombre).includes(norm) || (p.codigo && normalizeText(p.codigo).includes(norm)));
        let cont = document.getElementById('listaProductos'); if(!cont) return;
        cont.innerHTML = filt.map(p => {
            let checked = productosSeleccionados.has(p.id);
            return `<div class="product-card"><div class="flex items-start gap-2"><input type="checkbox" class="product-checkbox mt-1" data-id="${p.id}" ${checked?'checked':''} onchange="toggleProductoSeleccionado('${p.id}',this.checked)"><div class="flex-1"><div class="flex justify-between flex-wrap"><span class="font-bold">${escapeHtml(p.nombre)}</span><span class="text-xs">${escapeHtml(p.codigo||'')}</span></div><div class="text-sm">💰 ${fmtPrecio(preciosProducto(p).normalBs)} Bs / $${preciosProducto(p).normalUsd} | 📦 Stock: ${p.stock}</div>${tieneDescuentoProducto(p) ? `<div class="text-sm" style="color:#10b981">🏷️ Oferta: ${fmtPrecio(preciosProducto(p).desc.bs)} Bs / $${preciosProducto(p).desc.usd} <span class="text-xs">(-${typeof p.porcentajeDescuento === 'number' ? p.porcentajeDescuento : 0}%)</span></div>` : ''}<div class="text-xs break-words">🏷️ ${escapeHtml(p.categoria||'')} | 🚚 ${escapeHtml(p.proveedor||'—')}</div><div class="flex gap-2 mt-2"><button onclick="mostrarFormProducto('${p.id}')" class="btn-editar-redondeado">✏️ Editar</button><button onclick="copiarProducto('${p.id}')" class="btn-redondeado" style="background:var(--accent,#3b82f6);color:#fff;padding:4px 10px;font-size:12px">📋 Copiar</button><button onclick="eliminarProducto('${p.id}')" class="btn-eliminar-redondeado">🗑️ Eliminar</button></div></div></div></div>`;
        }).join('');
        actualizarToolbarBatch();
    }
    window.toggleProductoSeleccionado = (id, checked) => {
        if(checked) productosSeleccionados.add(id);
        else productosSeleccionados.delete(id);
        actualizarToolbarBatch();
    };
    window.toggleSelectAll = (checked) => {
        selectAllChecked = checked;
        document.querySelectorAll('.product-checkbox').forEach(cb => { cb.checked = checked; let id = cb.dataset.id; if(checked) productosSeleccionados.add(id); else productosSeleccionados.delete(id); });
        actualizarToolbarBatch();
    };
    function actualizarToolbarBatch(){
        let btn = document.getElementById('btnEditarLote');
        let count = document.getElementById('batchCount');
        let n = productosSeleccionados.size;
        if(!btn || !count) return;
        if(n > 0) { btn.style.display = 'inline-flex'; count.innerText = `${n} seleccionado(s)`; }
        else { btn.style.display = 'none'; count.innerText = ''; }
    }
    window.editarSeleccionLote = () => {
        let ids = [...productosSeleccionados];
        if(ids.length === 0){ alert('Seleccione al menos un producto'); return; }
        let prods = ids.map(id => D.productos.find(p => p.id === id)).filter(Boolean);
        let modal = document.createElement('div'); modal.className = 'modal-form';
        modal.innerHTML = `<div class="modal-form-content"><h3 class="text-xl font-bold mb-4">✏️ Editar lote (${prods.length} productos)</h3>
            <p class="text-xs mb-3 opacity-60">Los campos vacíos no se modificarán</p>
            <div class="mb-3"><label>Precio Venta (Bs) <span class="text-xs opacity-50">(nuevo valor)</span></label><input type="text" id="lotePrecioBs" placeholder="Dejar vacío para no cambiar" class="border rounded-xl p-2 w-full"></div>
            <div class="mb-3"><label>Precio Venta (USD) <span class="text-xs opacity-50">(nuevo valor)</span></label><input type="number" id="lotePrecioUsd" step="any" placeholder="Dejar vacío para no cambiar" class="border rounded-xl p-2 w-full"></div>
            <div class="mb-3"><label>Categoría <span class="text-xs opacity-50">(nuevo valor)</span></label><input id="loteCategoria" placeholder="Dejar vacío para no cambiar" class="border rounded-xl p-2 w-full"></div>
            <div class="mb-3"><label>Proveedor <span class="text-xs opacity-50">(nuevo valor)</span></label><input id="loteProveedor" placeholder="Dejar vacío para no cambiar" class="border rounded-xl p-2 w-full"></div>
            <div class="mb-3"><label>Stock <span class="text-xs opacity-50">(sumar este valor al actual)</span></label><input type="number" id="loteStock" placeholder="0 = no cambiar" class="border rounded-xl p-2 w-full"></div>
            <div class="flex gap-3 mt-4"><button id="aplicarLoteBtn" class="btn-azul-redondeado btn-redondeado flex-1 py-2 font-bold">Aplicar cambios</button><button id="cancelarLoteBtn" class="btn-redondeado flex-1 py-2 bg-gray-200">Cancelar</button></div></div>`;
        document.body.appendChild(modal);
        document.getElementById('cancelarLoteBtn').onclick = () => modal.remove();
        document.getElementById('aplicarLoteBtn').onclick = async () => {
            let precioBsRaw = document.getElementById('lotePrecioBs').value;
            let precioUsd = document.getElementById('lotePrecioUsd').value;
            let categoria = document.getElementById('loteCategoria').value.trim();
            let proveedor = document.getElementById('loteProveedor').value.trim();
            let stockDelta = parseInt(document.getElementById('loteStock').value) || 0;
            let cambios = false;
            for(let p of prods){
                let cambiado = false;
                if(precioBsRaw !== ''){ p.precioVentaBs = parseBs(precioBsRaw); cambiado = true; }
                if(precioUsd !== ''){ p.precioVentaUsd = parseFloat(precioUsd); cambiado = true; }
                if(categoria){ p.categoria = categoria; cambiado = true; }
                if(proveedor){ p.proveedor = proveedor; cambiado = true; }
                if(stockDelta !== 0){ p.stock = (parseInt(p.stock)||0) + stockDelta; if(p.stock < 0) p.stock = 0; cambiado = true; }
                if(cambiado){ await saveItem('productos', p); cambios = true; }
            }
            modal.remove();
            if(cambios){ productosSeleccionados = new Set(); mostrarNotificacion(`✅ ${prods.length} producto(s) actualizados`, 'success'); renderInventario(); }
            else mostrarNotificacion('ℹ️ No se realizaron cambios', 'info');
        };
        modal.onclick = e => { if(e.target === modal) modal.remove(); };
    };
    
    // ==================== PRECIOS CENTRALES DEL PRODUCTO ====================
    // Toda la matemática de precios pasa por aquí para que CUADRE en todos los
    // módulos (inventario, ventas, ticket, WhatsApp, reportes).
    // Reglas:
    //   - El costo se ingresa en USD; el costo en Bs se deriva con la tasa del día.
    //   - Precio normal USD = costo USD × (1 + ganancia%). Bs = USD × tasa.
    //   - Si hay descuento: precio oferta USD = normal USD × (1 - descuento%).
    function calcGananciaProducto(p){
        if(p && typeof p.porcentajeGanancia === 'number' && p.porcentajeGanancia > 0) return p.porcentajeGanancia;
        const c = parseFloat(p && p.costoRealUsd) || 0, v = parseFloat(p && p.precioVentaUsd) || 0;
        if(c > 0 && v > 0) return Math.round((v - c) / c * 100);
        return 0;
    }
    function tieneDescuentoProducto(p){
        if(!p) return false;
        if(typeof p.porcentajeDescuento === 'number' && p.porcentajeDescuento > 0) return true;
        return parseFloat(p.precioDescuentoUsd) > 0;
    }
    function precioDescuentoProducto(p, tasa){
        tasa = tasa || (D.config && D.config.dolarRate) || 1;
        const usd = parseFloat(p && p.precioDescuentoUsd);
        if(usd > 0) return { usd: usd, bs: parseFloat(p.precioDescuentoBs) > 0 ? p.precioDescuentoBs : Math.round(usd * tasa * 100) / 100 };
        const normal = parseFloat(p && p.precioVentaUsd) || 0;
        const pct = parseFloat(p && p.porcentajeDescuento) || 0;
        if(normal > 0 && pct > 0){ const d = Math.round(normal * (1 - pct / 100) * 100) / 100; return { usd: d, bs: Math.round(d * tasa * 100) / 100 }; }
        return null;
    }
    function preciosProducto(p, tasa){
        tasa = tasa || (D.config && D.config.dolarRate) || 1;
        const costoUsd = parseFloat(p && p.costoRealUsd) || 0;
        const costoBs = parseFloat(p && p.costoRealBs) > 0 ? p.costoRealBs : Math.round(costoUsd * tasa * 100) / 100;
        const normalUsd = parseFloat(p && p.precioVentaUsd) || 0;
        const normalBs = parseFloat(p && p.precioVentaBs) > 0 ? p.precioVentaBs : (normalUsd > 0 ? Math.round(normalUsd * tasa * 100) / 100 : 0);
        const desc = precioDescuentoProducto(p, tasa);
        return {
            costoUsd, costoBs,
            normalUsd, normalBs,
            ganancia: calcGananciaProducto(p),
            desc, tieneDesc: !!desc
        };
    }
    
    async function mostrarFormProducto(id, desdeBusqueda = false){
        let prod = id ? D.productos.find(p => p.id === id) : null;
        let esNuevo = !prod;
        const tasa = D.config.dolarRate || 1;
        const prIni = prod ? preciosProducto(prod, tasa) : { costoUsd:0, costoBs:0, normalUsd:0, normalBs:0, desc:null };
        const ganIni = prod ? (prIni.ganancia || 30) : 30;
        const descPct = prod ? (typeof prod.porcentajeDescuento === 'number' ? prod.porcentajeDescuento : 0) : 0;
        const descUsdIni = prIni.desc ? prIni.desc.usd : 0;
        const descBsIni = prIni.desc ? prIni.desc.bs : 0;
        let modal = document.createElement('div'); modal.className = 'modal-form';
        modal.innerHTML = `<div class="modal-form-content" style="max-width:420px"><h3 class="text-xl font-bold mb-4">${esNuevo ? 'Nuevo Producto' : 'Editar Producto'}</h3>
            <div class="mb-3"><label>Nombre</label><input id="nombre" value="${escapeHtml(prod?.nombre||'')}" class="border rounded-xl p-2 w-full"></div>
            <div class="mb-3"><label>📷 Código de barras</label><div class="flex gap-2"><input id="codigo" value="${escapeHtml(prod?.codigo||'')}" class="border-2 rounded-xl p-2 flex-1" style="border-color:var(--accent,#3b82f6)"><button id="btnScanProducto" class="btn-icon-cuadrado" title="Escanear con cámara"><i class="fas fa-camera"></i></button></div></div>
            <div class="mb-3"><label>Categoría</label><input id="categoria" value="${escapeHtml(prod?.categoria||'')}" class="border rounded-xl p-2 w-full"></div>
            <div class="mb-3"><label>Proveedor</label><input id="proveedor" value="${escapeHtml(prod?.proveedor||'')}" class="border rounded-xl p-2 w-full"></div>
            <div class="mb-3"><label>Stock</label><input type="number" id="stock" value="${prod?.stock||0}" class="border rounded-xl p-2 w-full"></div>
            <div class="mb-3"><label>💵 Costo del producto (USD)</label><input type="number" id="compraUsd" step="any" min="0" value="${prod?.costoRealUsd||''}" placeholder="Ej: 3.00" class="border rounded-xl p-2 w-full"></div>
            <div class="mb-3"><label>💰 % de Ganancia</label><input type="range" id="gananciaRange" min="5" max="100" step="1" value="${ganIni}" class="w-full"><input type="number" id="gananciaInput" step="any" min="5" max="100" value="${ganIni}" class="border rounded-xl p-2 w-full"></div>
            <div class="mb-3"><label class="flex items-center gap-2 cursor-pointer"><input type="checkbox" id="descOn" ${descPct > 0 ? 'checked' : ''}> <span>🏷️ Aplicar descuento al producto</span></label><div id="descDiv" style="${descPct > 0 ? 'display:block' : 'display:none'}"><label>% de Descuento</label><input type="number" id="descuentoInput" step="any" min="0" max="99.99" value="${descPct || ''}" placeholder="Ej: 10" class="border rounded-xl p-2 w-full"></div></div>
            <div class="rounded-xl p-3 mb-3" style="background:rgba(128,128,128,0.08)">
                <p class="font-bold text-sm mb-2" style="color:var(--accent)">💲 Precios calculados <span class="text-xs opacity-60">(tasa: 1 USD = ${fmtDolar(tasa)} Bs)</span></p>
                <div class="grid grid-cols-2 gap-2 text-xs">
                    <div><label class="opacity-70">Costo en Bs</label><input type="text" id="compraBs" value="${fmtPrecio(prIni.costoBs)}" class="border rounded p-1 w-full"></div>
                    <div><label class="opacity-70">Precio normal USD</label><input type="number" id="ventaUsd" step="any" min="0" value="${prIni.normalUsd || ''}" class="border rounded p-1 w-full"></div>
                    <div><label class="opacity-70">Precio normal Bs</label><input type="text" id="ventaBs" value="${fmtPrecio(prIni.normalBs)}" class="border rounded p-1 w-full"></div>
                    <div><label class="opacity-70">Precio oferta USD</label><input type="number" id="descUsd" step="any" min="0" value="${descUsdIni || ''}" class="border rounded p-1 w-full"></div>
                    <div><label class="opacity-70">Precio oferta Bs</label><input type="text" id="descBs" value="${fmtPrecio(descBsIni)}" class="border rounded p-1 w-full"></div>
                    <div class="flex items-end"><button id="recalcBtn" class="btn-redondeado py-1 px-3 text-xs" style="border:1px solid var(--accent,#3b82f6)">↺ Recalcular</button></div>
                </div>
                <p id="margenInfo" class="text-xs mt-2 opacity-80"></p>
                <p class="text-[10px] opacity-60 mt-1">Se calculan solos con el costo y los %; puede ajustarlos a mano. "↺ Recalcular" los vuelve a la fórmula.</p>
            </div>
            <div class="flex gap-3 mt-4"><button id="guardarBtn" class="btn-azul-redondeado btn-redondeado flex-1 py-2 font-bold">Guardar</button><button id="cancelarBtn" class="btn-redondeado flex-1 py-2 bg-gray-200">Cancelar</button></div></div>`;
        document.body.appendChild(modal);
        document.getElementById('cancelarBtn').onclick = () => modal.remove();
        document.getElementById('btnScanProducto').onclick = () => abrirEscanerCamara('codigo', cod => { document.getElementById('codigo').value = cod; });
        const compraUsd = document.getElementById('compraUsd'), compraBs = document.getElementById('compraBs');
        const ventaUsd = document.getElementById('ventaUsd'), ventaBs = document.getElementById('ventaBs');
        const descUsd = document.getElementById('descUsd'), descBs = document.getElementById('descBs');
        const gananciaInput = document.getElementById('gananciaInput'), gananciaRange = document.getElementById('gananciaRange');
        const descOn = document.getElementById('descOn'), descuentoInput = document.getElementById('descuentoInput');
        const descDiv = document.getElementById('descDiv'), recalcBtn = document.getElementById('recalcBtn');
        let manual = { costo:false, venta:false, desc:false };
        const tRedondeo = (v) => Math.round(v * 100) / 100;
        function recalcular(){
            const tasaV = D.config.dolarRate || 1;
            const costoUsdVal = parseFloat(compraUsd.value) || 0;
            let ganVal = parseFloat(gananciaInput.value) || 0;
            if(ganVal < 0) ganVal = 0;
            let descVal = descOn.checked ? (parseFloat(descuentoInput.value) || 0) : 0;
            if(descVal < 0) descVal = 0; if(descVal >= 100) descVal = 99.99;
            if(!manual.costo) compraBs.value = costoUsdVal > 0 ? fmtPrecio(tRedondeo(costoUsdVal * tasaV)) : '';
            const precioUsd = costoUsdVal > 0 ? tRedondeo(costoUsdVal * (1 + ganVal / 100)) : 0;
            if(!manual.venta){
                ventaUsd.value = precioUsd > 0 ? precioUsd.toFixed(2) : '';
                ventaBs.value = precioUsd > 0 ? fmtPrecio(tRedondeo(precioUsd * tasaV)) : '';
            }
            if(!manual.desc){
                const dUsd = (precioUsd > 0 && descVal > 0) ? tRedondeo(precioUsd * (1 - descVal / 100)) : 0;
                descUsd.value = dUsd > 0 ? dUsd.toFixed(2) : '';
                descBs.value = dUsd > 0 ? fmtPrecio(tRedondeo(dUsd * tasaV)) : '';
            }
            descDiv.style.display = descOn.checked ? 'block' : 'none';
            const cUsd = parseFloat(compraUsd.value) || 0;
            const vUsd = parseFloat(ventaUsd.value) || 0;
            const dUsd2 = parseFloat(descUsd.value) || 0;
            let margenNormal = cUsd > 0 ? Math.round((vUsd - cUsd) / cUsd * 100) : 0;
            let margenOferta = (cUsd > 0 && dUsd2 > 0) ? Math.round((dUsd2 - cUsd) / cUsd * 100) : 0;
            const info = document.getElementById('margenInfo');
            if(info) info.innerHTML = `Ganancia normal: <b>${margenNormal}%</b>${descOn.checked && dUsd2 > 0 ? ` | Ganancia con oferta: <b>${margenOferta}%</b>` : ''}`;
        }
        compraUsd.oninput = () => { manual = { costo:false, venta:false, desc:false }; recalcular(); };
        gananciaInput.oninput = () => { gananciaRange.value = gananciaInput.value; manual.venta = false; manual.desc = false; recalcular(); };
        gananciaRange.oninput = () => { gananciaInput.value = gananciaRange.value; manual.venta = false; manual.desc = false; recalcular(); };
        descuentoInput.oninput = () => { manual.desc = false; recalcular(); };
        descOn.onchange = () => { manual.desc = false; if(descOn.checked && !descuentoInput.value) descuentoInput.value = 10; recalcular(); };
        compraBs.oninput = () => { manual.costo = true; recalcular(); };
        ventaBs.oninput = () => { manual.venta = true; const bs = parseBs(ventaBs.value); if(bs > 0) ventaUsd.value = (bs / (D.config.dolarRate || 1)).toFixed(2); recalcular(); };
        ventaUsd.oninput = () => { manual.venta = true; const usd = parseFloat(ventaUsd.value); if(!isNaN(usd) && usd > 0) ventaBs.value = fmtPrecio(tRedondeo(usd * (D.config.dolarRate || 1))); recalcular(); };
        descBs.oninput = () => { manual.desc = true; const bs = parseBs(descBs.value); if(bs > 0) descUsd.value = (bs / (D.config.dolarRate || 1)).toFixed(2); recalcular(); };
        descUsd.oninput = () => { manual.desc = true; const usd = parseFloat(descUsd.value); if(!isNaN(usd) && usd > 0) descBs.value = fmtPrecio(tRedondeo(usd * (D.config.dolarRate || 1))); recalcular(); };
        recalcBtn.onclick = () => { manual = { costo:false, venta:false, desc:false }; recalcular(); };
        recalcular();
        document.getElementById('guardarBtn').onclick = async () => {
            const tasaV = D.config.dolarRate || 1;
            let costoRealUsd = parseFloat(compraUsd.value) || 0;
            let costoRealBs = parseBs(compraBs.value);
            if(costoRealBs <= 0 && costoRealUsd > 0) costoRealBs = tRedondeo(costoRealUsd * tasaV);
            let precioVentaUsd = parseFloat(ventaUsd.value) || 0;
            let precioVentaBs = parseBs(ventaBs.value);
            if(precioVentaBs <= 0 && precioVentaUsd > 0) precioVentaBs = tRedondeo(precioVentaUsd * tasaV);
            else if(precioVentaUsd <= 0 && precioVentaBs > 0) precioVentaUsd = tRedondeo(precioVentaBs / tasaV);
            let porcentajeGanancia = parseFloat(gananciaInput.value) || 0;
            let porcentajeDescuento = descOn.checked ? (parseFloat(descuentoInput.value) || 0) : 0;
            if(porcentajeDescuento >= 100) porcentajeDescuento = 99.99; if(porcentajeDescuento < 0) porcentajeDescuento = 0;
            let precioDescuentoUsd = parseFloat(descUsd.value) || 0;
            let precioDescuentoBs = parseBs(descBs.value);
            if(precioDescuentoUsd <= 0 && porcentajeDescuento > 0 && precioVentaUsd > 0) precioDescuentoUsd = tRedondeo(precioVentaUsd * (1 - porcentajeDescuento / 100));
            if(precioDescuentoBs <= 0 && precioDescuentoUsd > 0) precioDescuentoBs = tRedondeo(precioDescuentoUsd * tasaV);
            precioVentaUsd = tRedondeo(precioVentaUsd); costoRealUsd = tRedondeo(costoRealUsd); precioDescuentoUsd = tRedondeo(precioDescuentoUsd);
            if(!document.getElementById('nombre').value.trim()) { alert('El nombre del producto es obligatorio'); return; }
            if(precioVentaBs <= 0) { alert('El precio de venta debe ser mayor a 0'); return; }
            let nombre = capitalizeWords(document.getElementById('nombre').value.trim());
            let nuevo = { id: esNuevo ? 'p'+Date.now() : prod.id, nombre, codigo: document.getElementById('codigo').value, categoria: document.getElementById('categoria').value, proveedor: document.getElementById('proveedor').value, stock: parseInt(document.getElementById('stock').value) || 0, precioVentaBs, precioVentaUsd, costoRealBs, costoRealUsd, porcentajeGanancia, porcentajeDescuento, precioDescuentoUsd, precioDescuentoBs, tasaRegistro: tasaV };
            await saveItem('productos', nuevo);
            modal.remove();
            if(desdeBusqueda) renderHome(); else renderInventario();
        };
    }
    
    window.eliminarProducto = async id => { if(await jamConfirm('¿Eliminar producto?')){ await deleteItem('productos', id); D.productos = D.productos.filter(p => p.id !== id); renderInventario(); } };
    
    window.copiarProducto = (id) => {
        let p = D.productos.find(x => x.id === id);
        if (!p) return;
        let h = new Date().getHours();
        let hoy = new Date().toLocaleDateString();
        let saludo = h < 12 ? '¡Buenos días' : h < 18 ? '¡Buenas tardes' : '¡Buenas noches';
        let hayStock = p.stock > 0;
        const pr = preciosProducto(p);
        let bsPrecio = fmtPrecio(pr.normalBs);
        let usdPrecio = pr.normalUsd ? '$' + pr.normalUsd + ' USD' : '';
        let msg = `${saludo}, estimado cliente! 🌟\n\n${hayStock ? '📦 SÍ tenemos en existencia:' : '❌ Por ahora NO tenemos en stock este producto. Le avisaremos cuando se reponga.'}\n\n📌 *${p.nombre.toUpperCase()}*\n${p.codigo ? '🔖 Código: ' + p.codigo + '\n' : ''}${hayStock ? '💰 *Precio por unidad:*' : '💰 *Precio de referencia:*'} ${bsPrecio} Bs  |  ${usdPrecio}\n${pr.tieneDesc ? `🏷️ *OFERTA:* ${fmtPrecio(pr.desc.bs)} Bs | $${pr.desc.usd} USD (-${typeof p.porcentajeDescuento === 'number' ? p.porcentajeDescuento : 0}%)\n` : ''}📅 Precio en Bs válido solo para el ${hoy} (sujeto a cambios tasa BCV).\n💵 El precio en USD se mantiene fijo.\n\n${hayStock ? '✅ Por favor confirme su pedido para gestionarlo con anticipación. Le enviaremos confirmación una vez verificado el pago. 🙏' : ''}`;
        navigator.clipboard.writeText(msg).then(() => mostrarNotificacion('✅ Copiado al portapapeles', 'success')).catch(() => {});
    };
    
    // ==================== CRUD GENÉRICO ====================
    async function renderCrud(store, titulo, campos){
        let bloqueado = volverBloqueado, accent = D.config.theme;
        let items = await getAll(store); D[store] = items;
        document.getElementById('appRoot').innerHTML = `<div class="page-header-fixed"><div class="module-header"><h2 id="tituloModule" class="module-title ${bloqueado?'module-title-bloqueado':''}" style="color:${accent}" onmousedown="iniciarBloqueo(this,'${titulo}')" onmouseup="cancelarBloqueo()" onmouseleave="cancelarBloqueo()">${titulo}</h2><div id="btnVolverModule" class="btn-back ${bloqueado?'btn-back-bloqueado':''}" onclick="${bloqueado?'':'backToHome()'}">${bloqueado?'<i class="fas fa-lock"></i> Bloqueado':'<i class="fas fa-arrow-left"></i> Volver'}</div></div></div><div class="page-container"><div class="mb-3 relative"><i class="fas fa-search absolute left-3 top-3 text-gray-400"></i><input type="text" id="searchCrud" placeholder="Buscar..." class="pl-9 pr-3 py-2 border-2 rounded-xl w-full" style="border-color:${accent}"></div><button id="agregarBtn" class="btn-azul-redondeado btn-redondeado mb-4 py-2 px-4">+ Agregar ${titulo}</button><div id="listaCrud" class="scroll-area"></div></div>`;
        if(volverBloqueado) document.getElementById('btnVolverModule').onclick = () => mostrarOverlayBloqueo();
        let search = document.getElementById('searchCrud'), agregar = document.getElementById('agregarBtn');
        let renderLista = filtro => {
            let norm = normalizeText(filtro);
            let filt = items.filter(i => { let texto = campos.map(c => (i[c]!==undefined && i[c]!==null ? String(i[c]) : '')).join(' '); return normalizeText(texto).includes(norm); });
            let cont = document.getElementById('listaCrud'); if(!cont) return;
            if(!filt.length){ cont.innerHTML = '<div class="text-center py-4 text-gray-500">No hay registros</div>'; return; }
            cont.innerHTML = filt.map(i => {
                let detalles = '';
                if(store === 'clientes') detalles = `<div class="text-xs text-gray-500 mt-1">📞 ${escapeHtml(i.telefono||'')} | ✉️ ${escapeHtml(i.email||'')}</div>`;
                else if(store === 'proveedores') detalles = `<div class="text-xs text-gray-500 mt-1">📞 ${escapeHtml(i.telefono||'')} | 👤 ${escapeHtml(i.contacto||'')}</div>`;
                else if(store === 'gastos') detalles = `<div class="text-xs text-gray-500 mt-1">💰 ${fmtPrecio(i.montoBs||0)} Bs | 📅 ${escapeHtml(fmtFechaDisplay(i.fecha)||'')}</div>`;
                else if(store === 'empleados') detalles = `<div class="text-xs text-gray-500 mt-1">💼 ${escapeHtml(i.cargo||'')} | 💵 ${fmtPrecio(i.salarioBs||0)} Bs | 📅 ${escapeHtml(fmtFechaDisplay(i.fechaContrato)||'')}</div>`;
                return `<div class="client-card" data-id="${i.id}"><div class="font-bold break-words">${escapeHtml((i[campos[0]]||'Sin nombre').toString())}</div>${detalles}<div class="flex gap-2 mt-2"><button class="btn-editar-item btn-editar-redondeado">✏️ Editar</button><button class="btn-eliminar-item btn-eliminar-redondeado">🗑️ Eliminar</button></div></div>`;
            }).join('');
            document.querySelectorAll('.btn-editar-item').forEach((btn, idx) => { let it = filt[idx]; btn.onclick = () => window.mostrarFormCrud(store, it.id, campos, false); });
            document.querySelectorAll('.btn-eliminar-item').forEach((btn, idx) => { let it = filt[idx]; btn.onclick = () => eliminarItemCrud(store, it.id); });
        };
        search.oninput = e => renderLista(e.target.value.toLowerCase());
        agregar.onclick = () => window.mostrarFormCrud(store, null, campos, false);
        renderLista('');
    }
    
    async function eliminarItemCrud(store, id){
        if(await jamConfirm('¿Eliminar este elemento?')){
            await deleteItem(store, id);
            D[store] = D[store].filter(i => i.id !== id);
            if(store === 'clientes') renderCrud('clientes','Clientes',['cedula','nombre','telefono','direccion','email']);
            else if(store === 'proveedores') renderCrud('proveedores','Proveedores',['rif','nombre','telefono','contacto','direccion']);
            else if(store === 'gastos') renderCrud('gastos','Gastos',['concepto','montoBs','categoria','fecha']);
            else if(store === 'empleados') renderCrud('empleados','Empleados',['cedula','nombre','cargo','salarioBs','fechaContrato']);
        }
    }
    
    // ==================== REPORTES (Dashboard KPIs) ====================
    function msToDateStr(ms){ let d = new Date(ms); return d.getFullYear()+'-'+(d.getMonth()+1).toString().padStart(2,'0')+'-'+d.getDate().toString().padStart(2,'0'); }
    const KEY_HISTORIAL_TASA = 'jam_pos_historial_tasa';
    function cargarHistorialTasa(){ try { return JSON.parse(localStorage.getItem(KEY_HISTORIAL_TASA)) || []; } catch(e) { return []; } }
    function guardarHistorialTasa(arr){ try { localStorage.setItem(KEY_HISTORIAL_TASA, JSON.stringify(arr)); } catch(e) {} }
    function horaActual(){ return new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }); }
    function registrarCambioTasa(tasa){
        if(!(tasa > 0)) return false;
        let arr = cargarHistorialTasa();
        let ultimo = arr.length ? arr[arr.length - 1] : null;
        const hoy = msToDateStr(Date.now());
        let nuevo = false;
        if(ultimo && Math.abs(tasa - ultimo.tasa) < 0.01){
            if(ultimo.fecha === hoy){
                ultimo.hora = horaActual();
                guardarHistorialTasa(arr);
            }
        } else {
            arr.push({ fecha: hoy, hora: horaActual(), tasa: tasa });
            guardarHistorialTasa(arr);
            nuevo = true;
        }
        if(tasa > 0) registrarTasaDia(tasa, hoy, horaActual()).catch(() => {});
        return nuevo;
    }
    
    // ==================== TASA DIARIA (calendario inmutable) ====================
    // Cada día tiene UN valor de tasa. El del día de HOY se puede ajustar durante
    // la jornada; en cuanto el día se completa (o se fija manualmente) queda
    // INMUTABLE para siempre en el calendario.
    const KEY_TASA_DIARIA = 'jam_pos_tasa_diaria';
    let cacheTasaDiaria = [];
    function hoyISO(){ return msToDateStr(Date.now()); }
    async function cargarTasaDiaria(){
        try { const arr = await loadFromIDB('tasa_diaria'); if(Array.isArray(arr) && arr.length) return arr; } catch(e) {}
        return loadFromStorage(KEY_TASA_DIARIA, []);
    }
    async function guardarTasaDiaria(arr){
        try { await saveToIDB('tasa_diaria', arr); } catch(e) {}
        try { saveToStorage(KEY_TASA_DIARIA, arr); } catch(e) {}
        cacheTasaDiaria = arr.slice();
    }
    function refrescarCacheTasaDiaria(){ cacheTasaDiaria = D.tasaDiaria || []; }
    // Rellena cada día sin registro desde la primera tasa hasta HOY con el
    // último valor conocido (registro diario completo). Los días impresos
    // quedan fijada:true; solo HOY puede quedar editable.
    function completarRegistroDiario(arr, hoy){
        if(!Array.isArray(arr) || !arr.length) return arr;
        hoy = hoy || hoyISO();
        const porFecha = {};
        arr.forEach(r => { porFecha[r.fecha] = r; });
        const fechas = Object.keys(porFecha).sort();
        const primero = fechas[0];
        const cursor = new Date(primero + 'T00:00:00');
        const fin = new Date(hoy + 'T00:00:00');
        if(cursor.getTime() > fin.getTime()) return arr;
        let ultimoValor = 0;
        let ultimaHora = '';
        let cambio = false;
        const nuevos = [];
        while(cursor.getTime() <= fin.getTime()){
            const iso = msToDateStr(cursor.getTime());
            const existente = porFecha[iso];
            if(existente){
                if(existente.tasa > 0){ ultimoValor = existente.tasa; ultimaHora = existente.hora || ''; }
            } else if(ultimoValor > 0){
                nuevos.push({ id: iso, fecha: iso, tasa: ultimoValor, hora: ultimaHora, fijada: iso !== hoy });
                cambio = true;
            }
            cursor.setDate(cursor.getDate() + 1);
        }
        if(cambio) arr = arr.concat(nuevos).sort((a,b) => a.fecha < b.fecha ? -1 : 1);
        return arr;
    }
    async function migrarTasaDiaria(){
        let arr = await cargarTasaDiaria();
        let cambio = false;
        if(!arr.length){
            let hist = cargarHistorialTasa();
            let porDia = {};
            hist.forEach(h => { if(h && h.fecha && h.tasa > 0) porDia[h.fecha] = { fecha: h.fecha, tasa: h.tasa, hora: h.hora || '' }; });
            Object.keys(porDia).sort().forEach(f => { arr.push({ id: f, fecha: f, tasa: Math.round(porDia[f].tasa * 100) / 100, hora: porDia[f].hora, fijada: true }); });
            cambio = true;
        }
        const hoy = hoyISO();
        if(!arr.find(x => x.fecha === hoy)){
            let tasaHoy = (D.config && D.config.dolarRate > 0) ? D.config.dolarRate : 0;
            if(tasaHoy <= 0 && arr.length){
                const ultimo = arr[arr.length - 1];
                if(ultimo && ultimo.tasa > 0) tasaHoy = ultimo.tasa;
            }
            if(tasaHoy > 0){ arr.push({ id: hoy, fecha: hoy, tasa: Math.round(tasaHoy * 100) / 100, hora: horaActual(), fijada: false }); cambio = true; }
        }
        const antes = arr.length;
        arr = completarRegistroDiario(arr, hoy);
        if(arr.length !== antes) cambio = true;
        arr.forEach(r => { if(r.fecha < hoy && !r.fijada){ r.fijada = true; cambio = true; } });
        if(cambio) await guardarTasaDiaria(arr);
        D.tasaDiaria = arr;
        return arr;
    }
    async function registrarTasaDia(tasa, fechaISO, hora){
        if(!(tasa > 0)) return false;
        fechaISO = fechaISO || hoyISO();
        let arr = await cargarTasaDiaria();
        let existente = arr.find(x => x.fecha === fechaISO);
        const val = Math.round(tasa * 100) / 100;
        if(existente){
            if(existente.fijada) return false;
            if(existente.tasa > 0 && Math.abs(existente.tasa - val) < 0.001){ existente.hora = hora || existente.hora; await guardarTasaDiaria(arr); return false; }
            existente.tasa = val;
            existente.hora = hora || existente.hora;
            existente.fijada = false;
            await guardarTasaDiaria(arr);
            return true;
        }
        arr.push({ id: fechaISO, fecha: fechaISO, tasa: val, hora: hora || '', fijada: false });
        arr.sort((a,b) => a.fecha < b.fecha ? -1 : 1);
        await guardarTasaDiaria(arr);
        return true;
    }
    async function fijarTasaDia(fechaISO){
        fechaISO = fechaISO || hoyISO();
        let arr = await cargarTasaDiaria();
        let existente = arr.find(x => x.fecha === fechaISO);
        if(existente){
            if(existente.fijada) return false;
            existente.fijada = true;
            await guardarTasaDiaria(arr);
            return true;
        }
        if(fechaISO === hoyISO() && D.config.dolarRate > 0){
            arr.push({ id: fechaISO, fecha: fechaISO, tasa: Math.round(D.config.dolarRate * 100) / 100, hora: horaActual(), fijada: true });
            arr.sort((a,b) => a.fecha < b.fecha ? -1 : 1);
            await guardarTasaDiaria(arr);
            return true;
        }
        return false;
    }
    function tasaParaFecha(fechaISO){
        let r = cacheTasaDiaria.find(x => x.fecha === fechaISO);
        if(r) return { tasa: r.tasa, fijada: r.fijada, hora: r.hora, directo: true };
        return { tasa: 0, fijada: false, hora: '', directo: false };
    }
    async function importarTasaDiariaDesde(lista){
        let arr = await cargarTasaDiaria();
        let cont = 0;
        (lista || []).forEach(r => {
            if(!r || !r.fecha) return;
            const fecha = aFechaISO(r.fecha) || String(r.fecha);
            const tasa = parseFloat(r.tasa);
            if(!(tasa > 0) || !/^\d{4}-\d{2}-\d{2}$/.test(fecha)) return;
            const ex = arr.find(x => x.fecha === fecha);
            if(!ex){
                arr.push({ id: fecha, fecha, tasa: Math.round(tasa * 100) / 100, hora: r.hora || '', fijada: !!r.fijada || fecha < hoyISO() });
                cont++;
            }
        });
        arr.sort((a,b) => a.fecha < b.fecha ? -1 : 1);
        const antes = arr.length;
        arr = completarRegistroDiario(arr, hoyISO());
        if(cont > 0 || arr.length !== antes) await guardarTasaDiaria(arr);
        D.tasaDiaria = arr;
        return cont;
    }
    function agregarTasaHistorial(tasa, fechaISO, hora){
        if(!(tasa > 0)) return false;
        if(!fechaISO) return false;
        let arr = cargarHistorialTasa();
        let duplicado = arr.some(h => h.fecha === fechaISO && Math.abs(Number(h.tasa) - tasa) < 0.01);
        if(duplicado) return false;
        arr.push({ fecha: fechaISO, hora: hora || '--:--', tasa: tasa });
        arr.sort((a,b) => a.fecha === b.fecha ? 0 : (a.fecha < b.fecha ? -1 : 1));
        guardarHistorialTasa(arr);
        return true;
    }
    function importarHistorialTasaDesde(historial){
        let cont = 0;
        (historial || []).forEach(h => {
            if(!h) return;
            let tasa = parseFloat(h.tasa);
            let fecha = aFechaISO(h.fecha);
            if(!fecha && String(h.fecha||'').match(/^\d{4}-\d{2}-\d{2}/)) fecha = h.fecha;
            if(tasa > 0 && fecha){
                if(agregarTasaHistorial(tasa, fecha, h.hora || '')) cont++;
            }
        });
        return cont;
    }
    function aplicarConfigInteligente(configBackup, timestampBackup){
        const prev = Object.assign({}, D.config);
        const tasaVigente = parseFloat(prev.dolarRate);
        const tasaBackup = parseFloat(configBackup && configBackup.dolarRate);
        const fechaVigente = aFechaISO(prev.lastUpdate) || msToDateStr(Date.now());
        const fechaBackup = aFechaISO(configBackup && configBackup.lastUpdate) || aFechaISO(timestampBackup) || '';
        if(tasaBackup > 0 && fechaBackup) agregarTasaHistorial(tasaBackup, fechaBackup, configBackup.lastUpdate);
        D.config = Object.assign({}, prev, configBackup || {});
        const backupEsMasNueva = !!(tasaBackup > 0 && fechaBackup && fechaBackup > fechaVigente);
        let estado = '';
        if(backupEsMasNueva){
            if(tasaVigente > 0) agregarTasaHistorial(tasaVigente, fechaVigente, prev.lastUpdate);
            D.config.dolarRate = tasaBackup;
            if(!(configBackup.tasaManualValue > 0)) D.config.tasaManualValue = tasaBackup;
            estado = `💱 Tasa: se aplicó la del archivo (${fmtDolar(tasaBackup)}, más nueva que la vigente ${fmtDolar(tasaVigente)})`;
        } else {
            D.config.dolarRate = tasaVigente > 0 ? tasaVigente : (tasaBackup > 0 ? tasaBackup : D.config.dolarRate);
            D.config.tasaManualValue = prev.tasaManualValue > 0 ? prev.tasaManualValue : D.config.dolarRate;
            D.config.tasaManual = prev.tasaManual;
            D.config.lastUpdate = prev.lastUpdate;
            estado = `💱 Tasa: se conservó la vigente (${fmtDolar(D.config.dolarRate)}); la del archivo (${fmtDolar(tasaBackup > 0 ? tasaBackup : D.config.dolarRate)}) quedó en el historial`;
        }
        saveToStorage(STORAGE_KEYS.config, D.config);
        return estado;
    }
    function aFechaISO(v){
        if(!v) return '';
        let s = String(v);
        let lim = s.indexOf('T'); if(lim !== -1) s = s.slice(0, lim);
        if(/^\d{4}-\d{1,2}-\d{1,2}/.test(s)){ let p = s.split(/[-\/]/); return p[0] + '-' + String(p[1]).padStart(2,'0') + '-' + String(p[2]).padStart(2,'0'); }
        let m = s.match(/(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})/);
        if(m){ let aa = m[3].length === 2 ? '20' + m[3] : m[3]; return aa + '-' + String(m[2]).padStart(2,'0') + '-' + String(m[1]).padStart(2,'0'); }
        let t = new Date(s).getTime();
        return isNaN(t) ? '' : msToDateStr(t);
    }
    function fmtFechaDisplay(v){
        if(!v) return '';
        let s = String(v);
        if(/^\d{4}-\d{2}-\d{2}$/.test(s)){ let p = s.split('-'); return p[2] + '/' + p[1] + '/' + p[0]; }
        return s;
    }
    function generarDiasSemana(){
        let dias = [];
        for(let i=6; i>=0; i--){
            let d = new Date(); d.setDate(d.getDate()-i);
            dias.push({ fecha: msToDateStr(d.getTime()), label: d.toLocaleDateString('es-ES',{weekday:'short'}), ventas: [] });
        }
        return dias;
    }
    let _barsInfo = [];
    function renderGraficoVentas(ventas){
        let dias = generarDiasSemana();
        ventas.forEach(v => {
            let ts = v.timestamp || new Date(v.fecha).getTime();
            let idx = dias.findIndex(d => d.fecha === msToDateStr(ts));
            if(idx !== -1) dias[idx].ventas.push(v.total||0);
        });
        setTimeout(() => {
            let canvas = document.getElementById('chartVentas');
            if(!canvas) return;
            let ctx = canvas.getContext('2d');
            let W = canvas.parentElement.clientWidth - 24;
            let H = 180;
            canvas.width = W * 2; canvas.height = H * 2;
            canvas.style.width = W + 'px'; canvas.style.height = H + 'px';
            ctx.scale(2,2);
            let accent = D.config.theme;
            let maxVal = Math.max(...dias.map(d => d.ventas.reduce((a,b)=>a+b,0)), 1);
            let barW = Math.max(16, (W - 40) / dias.length - 8);
            let gap = 8;
            ctx.clearRect(0,0,W,H);
            _barsInfo = [];
            dias.forEach((d,i) => {
                let val = d.ventas.reduce((a,b)=>a+b,0);
                let barH = Math.max(4, (val / maxVal) * (H - 36));
                let x = 20 + i * (barW + gap) + (W - 40 - dias.length*(barW+gap) + gap)/2;
                let y = H - 16 - barH;
                _barsInfo.push({x, y, w: barW, h: barH, fecha: d.fecha, label: d.label, val});
                ctx.fillStyle = accent;
                ctx.globalAlpha = 0.85;
                ctx.beginPath();
                if (ctx.roundRect) ctx.roundRect(x, y, barW, barH, [4,4,0,0]);
                else ctx.rect(x, y, barW, barH);
                ctx.fill();
                ctx.globalAlpha = 1;
                ctx.fillStyle = getComputedStyle(document.body).color;
                ctx.font = '9px sans-serif';
                ctx.textAlign = 'center';
                ctx.fillText(d.label, x + barW/2, H - 3);
                if(val > 0){
                    ctx.fillStyle = accent;
                    ctx.font = 'bold 8px sans-serif';
                    ctx.fillText(fmtPrecio(val), x + barW/2, y - 3);
                }
            });
        }, 50);
    }

    function mostrarKPIsDelDia(fecha, label){
        document.querySelectorAll('.kpi-popup').forEach(e => e.remove());
        let ventasAll = D.ventas || [];
        let ventasDia = ventasAll.filter(v => msToDateStr(v.timestamp || new Date(v.fecha).getTime()) === fecha);
        let totalVentasAll = ventasAll.reduce((a,b)=>a+(b.total||0),0);
        let totalGananciaAll = ventasAll.reduce((a,b)=>a+(b.gananciaTotal||0),0);
        let totalGastosAll = D.gastos.reduce((a,b)=>a+(b.montoBs||0),0);
        let utilidadAll = totalGananciaAll - totalGastosAll;
        let cnt = ventasDia.length;
        let total = ventasDia.reduce((a,b)=>a+(b.total||0),0);
        let ganancia = ventasDia.reduce((a,b)=>a+(b.gananciaTotal||0),0);
        let gastos = D.gastos.filter(g => msToDateStr(g.timestamp || new Date(g.fecha).getTime()) === fecha).reduce((a,b)=>a+(b.montoBs||0),0);
        let utilidad = ganancia - gastos;
        let accent = D.config.theme;
        let overlay = document.createElement('div');
        overlay.className = 'kpi-popup-overlay';
        overlay.onclick = e => { if(e.target === overlay) overlay.remove(); };
        let popup = document.createElement('div');
        popup.className = 'kpi-popup';
        popup.innerHTML = `<div class="kpi-popup-titulo" style="color:${accent}"><i class="fas fa-chart-bar"></i> ${label} <button class="kpi-popup-cerrar" onclick="this.closest('.kpi-popup-overlay').remove()">✕</button></div>
        <div class="kpi-popup-grid">
            <div class="kpi-popup-card"><div class="kpi-popup-icon">💰</div><div class="kpi-popup-val">${fmtPrecio(total)} Bs</div><div class="kpi-popup-lbl">Ventas</div></div>
            <div class="kpi-popup-card"><div class="kpi-popup-icon">🧾</div><div class="kpi-popup-val">${cnt}</div><div class="kpi-popup-lbl">Ticket(s)</div></div>
            <div class="kpi-popup-card"><div class="kpi-popup-icon">📈</div><div class="kpi-popup-val">${fmtPrecio(ganancia)} Bs</div><div class="kpi-popup-lbl">Ganancia</div></div>
            <div class="kpi-popup-card"><div class="kpi-popup-icon">💸</div><div class="kpi-popup-val">${fmtPrecio(gastos)} Bs</div><div class="kpi-popup-lbl">Gastos</div></div>
            <div class="kpi-popup-card"><div class="kpi-popup-icon">📊</div><div class="kpi-popup-val" style="color:${utilidad >= 0 ? '#10b981' : '#ef4444'}">${fmtPrecio(utilidad)} Bs</div><div class="kpi-popup-lbl">Utilidad</div></div>
            <div class="kpi-popup-card"><div class="kpi-popup-icon">👥</div><div class="kpi-popup-val">${new Set(ventasDia.map(v => v.clienteId)).size}</div><div class="kpi-popup-lbl">Clientes</div></div>
        </div>
        <div class="kpi-popup-totales"><span>Acumulado: ${fmtPrecio(totalVentasAll)} Bs</span><span>Ganancia: ${fmtPrecio(totalGananciaAll)} Bs</span><span>Gastos: ${fmtPrecio(totalGastosAll)} Bs</span><span>Utilidad: <b style="color:${utilidadAll >= 0 ? '#10b981' : '#ef4444'}">${fmtPrecio(utilidadAll)} Bs</b></span></div>`;
        overlay.appendChild(popup);
        document.body.appendChild(overlay);
    }
    async function renderReportes(){
        let ventas = await getAll('ventas');
        let bloqueado = volverBloqueado, accent = D.config.theme;
        let histTasa = cargarHistorialTasa();
        let histSemana = histTasa.slice(-7).reverse();
        let tasaHtml = histSemana.length > 0 ? histSemana.map(h => {
            let prev = histTasa.filter(x => x.fecha < h.fecha).slice(-1)[0];
            let flecha = '';
            if(prev){
                let diff = h.tasa - prev.tasa;
                if(diff > 0.001) flecha = '<span style="color:#ef4444">▲</span>';
                else if(diff < -0.001) flecha = '<span style="color:#10b981">▼</span>';
            }
            return `<div class="flex justify-between items-center" style="padding:5px 0;border-bottom:1px solid rgba(128,128,128,.1)"><span class="text-xs" style="opacity:.6">${fmtFechaDisplay(h.fecha)}</span><span class="text-xs font-bold" style="color:${accent}">${flecha} ${fmtDolar(h.tasa)} Bs</span></div>`;
        }).join('') : '<div class="text-xs" style="opacity:.5;text-align:center;padding:8px">Sin datos de tasa esta semana</div>';
        document.getElementById('appRoot').innerHTML = `
            <div class="page-header-fixed"><div class="module-header"><h2 id="tituloModule" class="module-title ${bloqueado?'module-title-bloqueado':''}" style="color:${accent}" onmousedown="iniciarBloqueo(this,'Reportes')" onmouseup="cancelarBloqueo()" onmouseleave="cancelarBloqueo()">Reportes</h2><div id="btnVolverModule" class="btn-back ${bloqueado?'btn-back-bloqueado':''}" onclick="${bloqueado?'':'backToHome()'}">${bloqueado?'<i class="fas fa-lock"></i> Bloqueado':'<i class="fas fa-arrow-left"></i> Volver'}</div></div></div>
            <div class="page-container">
                <div class="chart-hint" style="text-align:center;font-size:.75rem;opacity:.5;margin-bottom:6px">Toca una barra para ver los indicadores del día</div>
                <div class="chart-container"><canvas id="chartVentas"></canvas></div>
                <div class="config-section" style="margin-bottom:16px">
                    <div class="config-section-title" style="font-size:.75rem;font-weight:700;opacity:.6;margin-bottom:8px">💱 Tasa del dólar — últimos 7 días</div>
                    ${tasaHtml}
                </div>
                <h3 class="font-bold mb-2">Registro de ventas</h3>
                <div class="flex gap-2 mb-2">
                    <div class="buscador" style="flex:1">
                        <i class="fas fa-search icono-busqueda"></i>
                        <input id="buscarVentas" type="text" placeholder="Buscar por fecha, artículo o cliente..." oninput="window.onBuscarVentasTexto()" class="border-2 rounded-xl p-2 w-full" autocomplete="off">
                        <button id="btnCalendarioVentas" class="btn-icon-cuadrado" title="Ver ventas por fecha" onclick="window.abrirCalendarioVentas()"><i class="fas fa-calendar-alt"></i></button>
                    </div>
                </div>
                <div class="text-xs opacity-60 mb-2" id="contadorVentas">${ventas.length} venta(s)</div>
                <div id="listaVentasReporte" class="max-h-64 overflow-auto">${ventas.slice().reverse().map(v => ventaCardReporte(v)).join('')}</div>
            </div>`;
        if(volverBloqueado) document.getElementById('btnVolverModule').onclick = () => mostrarOverlayBloqueo();
        renderGraficoVentas(ventas);
        D.ventas = ventas;
        setTimeout(() => {
            let canvas = document.getElementById('chartVentas');
            if(!canvas) return;
            let handler = (ex, ey) => {
                let r = canvas.getBoundingClientRect();
                let cx = ex - r.left, cy = ey - r.top;
                for(let b of _barsInfo){
                    if(cx >= b.x && cx <= b.x + b.w && cy >= b.y - 10 && cy <= b.y + b.h + 14){
                        document.querySelectorAll('.kpi-popup-overlay').forEach(e => e.remove());
                        mostrarKPIsDelDia(b.fecha, b.label);
                        return;
                    }
                }
            };
            canvas.addEventListener('click', e => handler(e.clientX, e.clientY));
            canvas.addEventListener('touchstart', e => { e.preventDefault(); handler(e.touches[0].clientX, e.touches[0].clientY); }, {passive:false});
        }, 100);
    }
    
    const formasPagoGlobal = { 'efectivo_bs':'EFECTIVO Bs','pago_movil':'PAGO MÓVIL','transferencia':'TRANSFERENCIA','tarjeta_debito':'TARJETA DÉBITO','dolares':'DÓLARES','pago_dividido':'PAGO DIVIDIDO' };
    function ventaCardReporte(v){
        return `<div class="border rounded-xl p-3 mb-2 cursor-pointer hover:opacity-80" style="border-color:var(--accent)" onclick="window.mostrarTicketDesdeReporte('${v.id}')"><div class="flex justify-between items-start"><div><b>${escapeHtml(v.id)}</b></div><div class="text-xs opacity-60">${escapeHtml(v.fecha)}</div></div><div class="text-sm mt-1">👤 ${escapeHtml(v.cliente)}</div><div class="flex justify-between items-center mt-1"><span class="text-sm font-bold" style="color:var(--accent)">${fmtPrecio(v.total)} Bs</span><span class="text-xs">${formasPagoGlobal[v.tipoPago] || v.tipoPago}</span></div>${v.dolarRate ? `<div class="text-xs mt-1 opacity-60">💲 Tasa del día: 1 USD = ${fmtDolar(v.dolarRate)} Bs</div>` : ''}<div class="text-xs mt-1 opacity-60">${(v.items||[]).map(i=>`${escapeHtml(i.nombre)} x${i.cantidad}`).join(', ')}</div></div>`;
    }
    let filtroCalendario = null;
    const mesNombre = m => ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'][m];
    function isoFechaVenta(v){
        if(v.timestamp) return msToDateStr(v.timestamp);
        return aFechaISO(v.fecha);
    }
    window.filtrarVentasReporte = () => {
        const input = document.getElementById('buscarVentas');
        const lista = document.getElementById('listaVentasReporte');
        const contador = document.getElementById('contadorVentas');
        const btnCal = document.getElementById('btnCalendarioVentas');
        if(!lista) return;
        let q = (input ? input.value : '').toLowerCase().trim();
        let base = D.ventas;
        if(filtroCalendario){
            base = D.ventas.filter(v => {
                let iso = isoFechaVenta(v);
                if(!iso) return false;
                return filtroCalendario.tipo === 'dia' ? iso === filtroCalendario.valor : iso.startsWith(filtroCalendario.valor);
            });
        }
        let result;
        if(filtroCalendario || !q) result = base.slice().reverse();
        else result = base.filter(v => {
            let hayFecha = String(v.fecha||'').toLowerCase().includes(q);
            let hayCliente = String(v.cliente||'').toLowerCase().includes(q);
            let hayItem = (v.items||[]).some(i => String(i.nombre||'').toLowerCase().includes(q));
            let hayId = String(v.id||'').toLowerCase().includes(q);
            return hayFecha || hayCliente || hayItem || hayId;
        }).reverse();
        lista.innerHTML = result.map(v => ventaCardReporte(v)).join('');
        if(contador) contador.innerText = result.length + ' venta(s)';
        if(btnCal) btnCal.style.background = filtroCalendario ? (D.config.theme || '#3b82f6') : '';
    };
    window.onBuscarVentasTexto = () => { if(filtroCalendario) filtroCalendario = null; window.filtrarVentasReporte(); };
    window.limpiarBuscarVentas = () => {
        filtroCalendario = null;
        const input = document.getElementById('buscarVentas');
        if(input) input.value = '';
        window.filtrarVentasReporte();
    };
    window.aplicarFiltroDia = (iso) => {
        filtroCalendario = { tipo:'dia', valor: iso };
        const input = document.getElementById('buscarVentas');
        if(input) input.value = iso;
        window.filtrarVentasReporte();
        const modal = document.getElementById('modalCalendarioVentas');
        if(modal) modal.remove();
    };
    window.aplicarFiltroMes = (prefix, etiqueta) => {
        filtroCalendario = { tipo:'mes', valor: prefix };
        const input = document.getElementById('buscarVentas');
        if(input) input.value = etiqueta;
        window.filtrarVentasReporte();
        const modal = document.getElementById('modalCalendarioVentas');
        if(modal) modal.remove();
    };
    window.quitarFiltroFecha = () => {
        filtroCalendario = null;
        const input = document.getElementById('buscarVentas');
        if(input) input.value = '';
        window.filtrarVentasReporte();
        const modal = document.getElementById('modalCalendarioVentas');
        if(modal) modal.remove();
    };
    function renderCalendarioVentas(){
        const modal = document.getElementById('modalCalendarioVentas');
        if(!modal) return;
        const a = window._calYear, m = window._calMonth;
        const primerDia = new Date(a, m, 1).getDay();
        const numDias = new Date(a, m + 1, 0).getDate();
        const prefijo = a + '-' + String(m + 1).padStart(2, '0');
        let ventasMes = D.ventas.filter(v => isoFechaVenta(v).startsWith(prefijo));
        let totalMes = ventasMes.reduce((s, v) => s + (v.total || 0), 0);
        const semana = ['Do','Lu','Ma','Mi','Ju','Vi','Sá'];
        let celdas = semana.map(d => `<div class="cal-cabecera">${d}</div>`).join('');
        for(let i = 0; i < primerDia; i++) celdas += `<div class="cal-vacio"></div>`;
        let prevTasa = 0;
        for(let d = 1; d <= numDias; d++){
            const iso = prefijo + '-' + String(d).padStart(2, '0');
            const n = ventasMes.filter(v => isoFechaVenta(v) === iso).length;
            const info = tasaParaFecha(iso);
            const conTasa = info.tasa > 0;
            let flecha = '';
            if(conTasa){
                if(prevTasa > 0 && info.tasa > prevTasa) flecha = '<span class="cal-flecha cal-flecha-up">▲</span>';
                else if(prevTasa > 0 && info.tasa < prevTasa) flecha = '<span class="cal-flecha cal-flecha-down">▼</span>';
                prevTasa = info.tasa;
            }
            const tasaHtml = conTasa ? `<span class="cal-tasa">${flecha}${fmtDolar(info.tasa)}</span>` : '';
            celdas += `<button class="cal-dia ${n > 0 ? 'cal-dia-venta' : ''}" onclick="window.aplicarFiltroDia('${iso}')"><span class="cal-dia-num">${d}</span>${n > 0 ? `<span class="cal-badge">${n}</span>` : ''}${tasaHtml}</button>`;
        }
        modal.innerHTML = `<div class="modal-form-content" style="max-width:340px">
            <h3 class="font-bold text-lg mb-1" style="color:${D.config.theme}">📅 Ventas por fecha</h3>
            <p class="text-xs opacity-70 mb-2">La tasa del día aparece en cada casilla.</p>
            <div class="cal-nav"><button onclick="window._calMonth--;if(window._calMonth<0){window._calMonth=11;window._calYear--;}renderCalendarioVentas()">◀</button><div class="cal-titulo">${mesNombre(m)} ${a}</div><button onclick="window._calMonth++;if(window._calMonth>11){window._calMonth=0;window._calYear++;}renderCalendarioVentas()">▶</button></div>
            <div class="cal-nav cal-nav-ano"><button onclick="window._calYear--;renderCalendarioVentas()">◀ Año</button><div class="cal-titulo">${ventasMes.length} venta(s) · ${fmtPrecio(totalMes)} Bs</div><button onclick="window._calYear++;renderCalendarioVentas()">Año ▶</button></div>
            <div class="cal-grid">${celdas}</div>
            <div class="flex gap-2 mt-3">
                <button class="btn-azul-redondeado btn-redondeado flex-1 py-2 text-sm" onclick="window.aplicarFiltroMes('${prefijo}','${mesNombre(m)} ${a}')">📆 Ver todo ${mesNombre(m)}</button>
                <button class="btn-redondeado flex-1 py-2 bg-gray-200 text-sm" onclick="window.quitarFiltroFecha()">🗑 Quitar</button>
            </div>
            <button class="w-full mt-2 py-2 rounded-xl bg-gray-200" onclick="document.getElementById('modalCalendarioVentas').remove()">Cerrar</button>
        </div>`;
    }
    window.abrirCalendarioVentas = () => {
        const ahora = new Date();
        window._calYear = ahora.getFullYear();
        window._calMonth = ahora.getMonth();
        const modal = document.createElement('div');
        modal.className = 'modal-form';
        modal.id = 'modalCalendarioVentas';
        modal.onclick = e => { if(e.target === modal) modal.remove(); };
        document.body.appendChild(modal);
        renderCalendarioVentas();
    };
    
    window.mostrarTicketDesdeReporte = (ventaId) => {
        let venta = D.ventas.find(v => v.id === ventaId);
        if(venta) mostrarTicket(venta, true);
    };
    window.mostrarDetalleCliente = (clienteId) => {
        if (!clienteId) return;
        const cliente = D.clientes.find(c => c.id === clienteId);
        if (!cliente) return;
        const modal = document.createElement('div'); modal.className = 'modal-form';
        modal.innerHTML = `<div class="modal-form-content"><h3 class="text-xl font-bold mb-4">Detalles del Cliente</h3><div class="mb-2"><strong>Nombre:</strong> ${escapeHtml(cliente.nombre)}</div><div class="mb-2"><strong>Cédula/RIF:</strong> ${escapeHtml(cliente.cedula || 'N/A')}</div><div class="mb-2"><strong>Teléfono:</strong> ${escapeHtml(cliente.telefono || 'N/A')}</div><div class="mb-2"><strong>Dirección:</strong> ${escapeHtml(cliente.direccion || 'N/A')}</div><div class="mb-2"><strong>Email:</strong> ${escapeHtml(cliente.email || 'N/A')}</div><div class="flex gap-3 mt-4"><button id="closeDetalle" class="btn-redondeado flex-1 py-2 bg-gray-200">Cerrar</button></div></div>`;
        document.body.appendChild(modal);
        document.getElementById('closeDetalle').onclick = () => modal.remove();
        modal.onclick = e => { if(e.target === modal) modal.remove(); };
    };
    
    // ==================== RESPALDO Y RESTAURACIÓN ====================
    function esAppNativa() { return !!(window.AndroidBridge); }
    function utf8ToBase64(str) {
        const bytes = new TextEncoder().encode(str);
        let binary = '';
        for (let i = 0; i < bytes.length; i += 0x8000) {
            binary += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
        }
        return btoa(binary);
    }
    function base64ToUtf8(b64) {
        const binary = atob(b64);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
        return new TextDecoder().decode(bytes);
    }
    let carpetaNativa = null;
    let carpetaAccionPendiente = null;
    async function leerCarpetaNativa() {
        if (!esAppNativa()) return;
        try {
            const info = await puenteResultado(AndroidBridge.getCarpetaInfo());
            if (info) {
                const idx = info.indexOf('|');
                carpetaNativa = idx >= 0
                    ? { nombre: info.slice(0, idx), uri: info.slice(idx + 1) }
                    : { nombre: info, uri: info };
            }
        } catch (e) { carpetaNativa = null; }
    }
    window.carpetaSeleccionadaCallback = function (nombre, uri) {
        const accion = carpetaAccionPendiente;
        carpetaAccionPendiente = null;
        if (uri) {
            carpetaNativa = { nombre: nombre || 'Carpeta', uri: uri };
            actualizarUICarpeta();
            mostrarNotificacion('✅ Carpeta configurada: ' + (nombre || 'carpeta') + '/JAMPOS', 'success');
            if (accion) setTimeout(accion, 200);
        } else {
            mostrarNotificacion('⚠️ No se eligió carpeta', 'info');
        }
    };
    function asegurarCarpetaNativa(accion) {
        if (!esAppNativa()) { accion(); return; }
        if (carpetaNativa && carpetaNativa.uri) { accion(); return; }
        carpetaAccionPendiente = accion;
        mostrarNotificacion('Primero elija una carpeta donde JAM POS guardará sus archivos', 'info');
        try { AndroidBridge.elegirCarpeta(); } catch (e) { carpetaAccionPendiente = null; accion(); }
    }
    function actualizarUICarpeta() {
        if (!esAppNativa()) return;
        const estado = document.getElementById('carpetaEstado');
        if (estado) {
            estado.innerHTML = carpetaNativa && carpetaNativa.uri
                ? '✅ Carpeta activa: <b>' + escapeHtml(carpetaNativa.nombre) + '/JAMPOS</b>. Ahí se guardan tickets y respaldos.'
                : 'ℹ️ Sin carpeta configurada. Elija una carpeta para guardar tickets y respaldos (se creará la subcarpeta JAMPOS).';
        }
        const btn = document.getElementById('elegirCarpetaBtn');
        if (btn) btn.innerText = carpetaNativa && carpetaNativa.uri ? '📂 Cambiar carpeta' : '📂 Elegir carpeta';
    }
    async function obtenerTodosLosDatos(){
        let stores = ['productos','clientes','proveedores','gastos','empleados','ventas'];
        let data = { config: D.config, timestamp: new Date().toISOString(), version: '0.1' };
        for (const s of stores) { data[s] = await getAll(s); }
        data.historialTasa = cargarHistorialTasa();
        data.tasaDiaria = await cargarTasaDiaria();
        return data;
    }
    async function exportarBackupJSON(){
        let data = await obtenerTodosLosDatos();
        if (esAppNativa()) {
            asegurarCarpetaNativa(async () => {
                try {
                    const nombre = `jampos_backup_${new Date().toISOString().slice(0,10)}.json`;
                    const res = await puenteResultado(AndroidBridge.guardarArchivo(nombre, 'application/json', utf8ToBase64(JSON.stringify(data, null, 2))));
                    if (res && res.startsWith('ok')) {
                        mostrarNotificacion('✅ Backup JSON guardado en ' + (carpetaNativa ? carpetaNativa.nombre : 'carpeta') + '/JAMPOS/' + nombre, 'success');
                    } else {
                        mostrarNotificacion('❌ No se pudo exportar: ' + (res || 'error desconocido'), 'error');
                    }
                } catch (e) { mostrarNotificacion('❌ Error al exportar: ' + e.message, 'error'); }
            });
            return;
        }
        let blob = new Blob([JSON.stringify(data, null, 2)], {type: 'application/json'});
        let url = URL.createObjectURL(blob);
        let a = document.createElement('a'); a.href = url;
        a.download = `jampos_backup_${new Date().toISOString().slice(0,10)}.json`;
        a.click(); URL.revokeObjectURL(url);
        mostrarNotificacion('✅ Backup JSON descargado', 'success');
    }
    function celdaCSV(v){
        if(v === null || v === undefined) return '';
        let str = (typeof v === 'object') ? JSON.stringify(v) : String(v);
        if(str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) str = '"' + str.replace(/"/g, '""') + '"';
        return str;
    }
    async function exportarBackupCSV(){
        let data = await obtenerTodosLosDatos();
        let csvLines = ['\uFEFF# JAM POS - Exportación CSV', `# Generado: ${data.timestamp}`, ''];
        let stores = ['productos','clientes','proveedores','gastos','empleados','ventas'];
        stores.forEach(s => {
            if(data[s].length === 0) return;
            let headersSet = new Set();
            data[s].forEach(item => Object.keys(item).forEach(k => headersSet.add(k)));
            let headers = Array.from(headersSet);
            csvLines.push(`# === ${s.toUpperCase()} ===`);
            csvLines.push(headers.join(','));
            data[s].forEach(item => {
                csvLines.push(headers.map(h => celdaCSV(item[h])).join(','));
            });
            csvLines.push('');
        });
        let historialTasa = cargarHistorialTasa();
        if(historialTasa.length){
            csvLines.push('# === HISTORIALTASA ===');
            csvLines.push('fecha,hora,tasa');
            historialTasa.forEach(h => { csvLines.push(celdaCSV(h.fecha) + ',' + celdaCSV(h.hora) + ',' + celdaCSV(h.tasa)); });
            csvLines.push('');
        }
        if(data.tasaDiaria && data.tasaDiaria.length){
            csvLines.push('# === TASADIARIA ===');
            csvLines.push('fecha,hora,tasa,fijada');
            data.tasaDiaria.forEach(h => { csvLines.push(celdaCSV(h.fecha) + ',' + celdaCSV(h.hora || '') + ',' + celdaCSV(h.tasa) + ',' + celdaCSV(h.fijada ? 1 : 0)); });
            csvLines.push('');
        }
        if (esAppNativa()) {
            asegurarCarpetaNativa(async () => {
                try {
                    const nombre = `jampos_export_${new Date().toISOString().slice(0,10)}.csv`;
                    const res = await puenteResultado(AndroidBridge.guardarArchivo(nombre, 'text/csv', utf8ToBase64(csvLines.join('\n'))));
                    if (res && res.startsWith('ok')) {
                        mostrarNotificacion('✅ CSV guardado en ' + (carpetaNativa ? carpetaNativa.nombre : 'carpeta') + '/JAMPOS/' + nombre, 'success');
                    } else {
                        mostrarNotificacion('❌ No se pudo exportar: ' + (res || 'error desconocido'), 'error');
                    }
                } catch (e) { mostrarNotificacion('❌ Error al exportar: ' + e.message, 'error'); }
            });
            return;
        }
        let blob = new Blob([csvLines.join('\n')], {type: 'text/csv;charset=utf-8;'});
        let url = URL.createObjectURL(blob);
        let a = document.createElement('a'); a.href = url;
        a.download = `jampos_export_${new Date().toISOString().slice(0,10)}.csv`;
        a.click(); URL.revokeObjectURL(url);
        mostrarNotificacion('✅ CSV exportado (ábralo con Excel)', 'success');
    }
    async function importarDesdeCarpeta(){
        if (!esAppNativa()) { alert('Esta opción solo está disponible en la app Android.'); return; }
        if (!(carpetaNativa && carpetaNativa.uri)) {
            carpetaAccionPendiente = importarDesdeCarpeta;
            mostrarNotificacion('Primero elija una carpeta de la que importar', 'info');
            try { AndroidBridge.elegirCarpeta(); } catch (e) { alert('No se pudo abrir el selector de carpeta'); }
            return;
        }
        let lista = [];
        try { lista = JSON.parse(await puenteResultado(AndroidBridge.listarArchivos()) || '[]'); } catch (e) { lista = []; }
        const jsonFiles = lista.filter(f => /\.json$/i.test(f));
        const csvFiles = lista.filter(f => /\.(csv|txt)$/i.test(f));
        if (jsonFiles.length === 0 && csvFiles.length === 0) {
            alert('No hay archivos de respaldo en la carpeta ' + (carpetaNativa ? carpetaNativa.nombre : 'JAMPOS') + '/JAMPOS');
            return;
        }
        let mensaje = 'Archivos disponibles:\n';
        if (jsonFiles.length) mensaje += '\n📦 JSON:\n' + jsonFiles.map(f => '  ' + f).join('\n');
        if (csvFiles.length) mensaje += '\n📊 CSV:\n' + csvFiles.map(f => '  ' + f).join('\n');
        mensaje += '\n\nEscriba el nombre exacto del archivo a importar:';
        const nombre = await jamPrompt(mensaje);
        if (!nombre) return;
        let contenido = null;
        try { contenido = await puenteResultado(AndroidBridge.leerArchivo(nombre)); } catch (e) {}
        if (!contenido || contenido === 'null') { alert('No se encontró el archivo: ' + nombre); return; }
        try {
            const texto = base64ToUtf8(contenido);
            const file = new File([texto], nombre, { type: /\.json$/i.test(nombre) ? 'application/json' : 'text/csv' });
            if (/\.json$/i.test(nombre)) importarBackupJSON(file);
            else importarBackupCSV(file);
        } catch (e) { alert('Error al leer el archivo: ' + e.message); }
    }
    function combinarImportacion(destino, nuevos, campoNombre = null){
        let existentes = Array.isArray(destino) ? destino.slice() : [];
        let porId = new Map(), porCodigo = new Map(), porNombre = new Map();
        const keyCod = c => c != null ? String(c).toLowerCase() : '';
        existentes.forEach((x, idx) => {
            if(!x) return;
            if(x.id) porId.set(x.id, idx);
            if(x.codigo) porCodigo.set(keyCod(x.codigo), true);
            if(campoNombre && !x.codigo && x[campoNombre]) porNombre.set(keyCod(x[campoNombre]), true);
        });
        let agregados = 0, actualizados = 0, omitidos = 0, nuevosItems = [];
        (nuevos || []).forEach(item => {
            if(!item) return;
            if(item.id && porId.has(item.id)){
                let existente = existentes[porId.get(item.id)];
                let tsNuevo = item.updatedAt || 0;
                let tsExistente = (existente && existente.updatedAt) || 0;
                if(tsNuevo > tsExistente){
                    existentes[porId.get(item.id)] = Object.assign({}, item);
                    actualizados++;
                }else{
                    omitidos++;
                }
                return;
            }
            let esNombre = campoNombre && !item.codigo && item[campoNombre];
            let duplicado = !!(item.codigo && porCodigo.has(keyCod(item.codigo)))
                || !!(esNombre && porNombre.has(keyCod(item[campoNombre])));
            if(duplicado){ omitidos++; return; }
            let nuevo = Object.assign({}, item);
            if(!nuevo.id) nuevo.id = 'imp' + Date.now() + '_' + Math.random().toString(36).slice(2, 8);
            existentes.push(nuevo);
            nuevosItems.push(nuevo);
            porId.set(nuevo.id, existentes.length - 1);
            if(nuevo.codigo) porCodigo.set(keyCod(nuevo.codigo), true);
            if(esNombre) porNombre.set(keyCod(nuevo[campoNombre]), true);
            agregados++;
        });
        return { lista: existentes, nuevos: nuevosItems, agregados: agregados, actualizados: actualizados, omitidos: omitidos };
    }
    function importarBackupJSON(file){
        let reader = new FileReader();
        reader.onload = async function(e){
            try {
                let data = JSON.parse(e.target.result);
                if(!data || typeof data !== 'object') { alert('Archivo JSON no válido'); return; }
                let stores = ['productos','clientes','proveedores','gastos','empleados','ventas'];
                let resumen = stores.filter(s => data[s] && Array.isArray(data[s]) && data[s].length).map(s => `  • ${s}: ${data[s].length} registros`);
                if(resumen.length === 0) { alert('El archivo no contiene registros que integrar'); return; }
                let confirmacion = await jamConfirm(`¿INTEGRAR datos del archivo?\nSe agregarán los registros que no existan ya en el teléfono:\n${resumen.join('\n')}\n\n✅ Los datos actuales (ventas, artículos, gastos...) NO se borrarán.`);
                if(!confirmacion) return;
                let resumenFinal = [];
                for(let s of stores){
                    if(data[s] && Array.isArray(data[s]) && data[s].length){
                        let campoNombre = s === 'productos' ? 'nombre' : null;
                        let r = combinarImportacion(D[s], data[s], campoNombre);
                        D[s] = r.lista;
                        if (DATA_STORES.includes(s)) await addToIDB(s, r.nuevos);
                        else localStorage.setItem(STORAGE_KEYS[s], JSON.stringify(r.lista));
                        resumenFinal.push(`${s}: +${r.agregados} | ${r.omitidos} duplicado(s) omitido(s)`);
                    }
                }
                if(data.historialTasa && Array.isArray(data.historialTasa)){
                    let nHist = importarHistorialTasaDesde(data.historialTasa);
                    if(nHist > 0) resumenFinal.push(`historial de tasa: +${nHist} día(s) con tasa`);
                }
                if(data.tasaDiaria && Array.isArray(data.tasaDiaria)){
                    let nTd = await importarTasaDiariaDesde(data.tasaDiaria);
                    if(nTd > 0) resumenFinal.push(`tasa diaria: +${nTd} día(s)`);
                }
                let aplicaConfig = false;
                if(data.config){
                    aplicaConfig = await jamConfirm('Los registros se integraron correctamente.\n\n¿Restaurar también la configuración del archivo (empresa, tasa del dólar, tema)?\nPulsa NO para conservar la configuración actual.\n\n💡 Tasa del dólar INTELIGENTE: si la del archivo es MÁS ANTIGUA que la vigente, se conserva la vigente y la del archivo pasa al historial (no se sobrepone).');
                }
                if(aplicaConfig){
                    const tasaInfo = aplicarConfigInteligente(data.config, data.timestamp);
                    if(tasaInfo) resumenFinal.push(tasaInfo);
                }
                mostrarNotificacion('✅ Integración completada\n' + resumenFinal.join('\n'), 'success');
                if(currentModule === 'home') renderHome(); else renderConfig();
            } catch(err) { alert('Error al leer el archivo: ' + err.message); }
        };
        reader.readAsText(file);
    }
    const CAMPOS_NUMERICOS_CSV = new Set(['stock','cantidad','precioVentaBs','precioVentaUsd','costoRealBs','costoRealUsd','precioUnitario','costoUnitario','subtotal','ganancia','gananciaTotal','total','pago','cambio','monto','dolarRate','iva','ivaPorcentaje','timestamp','salario','tasa']);
    function parsearValorCSV(campo, val){
        if(val === '' ) return '';
        let v = val.trim();
        if(v[0] === '[' || v[0] === '{'){
            try { return JSON.parse(v); } catch(e) { return val; }
        }
        if(CAMPOS_NUMERICOS_CSV.has(campo) && /^-?\d+(\.\d+)?$/.test(v)) return Number(v);
        if(v === 'true') return true;
        if(v === 'false') return false;
        return val;
    }
    function parsearBackupCSV(text){
        let data = { config: null, productos: [], clientes: [], proveedores: [], gastos: [], empleados: [], ventas: [], historialTasa: [], tasaDiaria: [] };
        let storeMap = { 'PRODUCTOS':'productos','CLIENTES':'clientes','PROVEEDORES':'proveedores','GASTOS':'gastos','EMPLEADOS':'empleados','VENTAS':'ventas','HISTORIALTASA':'historialTasa','TASADIARIA':'tasaDiaria' };
        let currentStore = null, headers = null;
        for(let line of text.split('\n')){
            line = line.trim();
            if(line === '' || line.startsWith('# JAM POS') || line.startsWith('# Generado')) continue;
            let sectionMatch = line.match(/^# ===\s*(\w+)\s*===/);
            if(sectionMatch){
                currentStore = storeMap[sectionMatch[1]] || null;
                headers = null;
                continue;
            }
            if(!currentStore) continue;
            if(line.startsWith('#')) continue;
            if(!headers) { headers = line.split(',').map(h => h.trim()); continue; }
            let row = {};
            let values = parseCSVLine(line);
            headers.forEach((h, i) => {
                row[h] = parsearValorCSV(h, (values[i] !== undefined) ? values[i] : '');
            });
            data[currentStore].push(row);
        }
        return data;
    }
    function importarBackupCSV(file){
        let reader = new FileReader();
        reader.onload = async function(e){
            try {
                let text = e.target.result.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
                let data = parsearBackupCSV(text);
                let stores = ['productos','clientes','proveedores','gastos','empleados','ventas'];
                let totalItems = stores.reduce((s,store) => s + data[store].length, 0);
                if(totalItems === 0) { alert('No se encontraron datos en el archivo CSV'); return; }
                let resumen = stores.filter(s=>data[s].length).map(s=>`  • ${s}: ${data[s].length} registros`);
                if(!(await jamConfirm(`¿INTEGRAR datos desde CSV?\nSe agregarán los registros que no existan ya:\n${resumen.join('\n')}\n\n✅ Los datos actuales del teléfono NO se borrarán.`))) return;
                let resumenFinal = [];
                for(let s of stores){
                    if(data[s].length) {
                        let campoNombre = s === 'productos' ? 'nombre' : null;
                        let r = combinarImportacion(D[s], data[s], campoNombre);
                        D[s] = r.lista;
                        if (DATA_STORES.includes(s)) await addToIDB(s, r.nuevos);
                        else localStorage.setItem(STORAGE_KEYS[s], JSON.stringify(r.lista));
                        resumenFinal.push(`${s}: +${r.agregados} | ${r.omitidos} duplicado(s) omitido(s)`);
                    }
                }
                if(data.historialTasa && Array.isArray(data.historialTasa)){
                    let nHist = importarHistorialTasaDesde(data.historialTasa);
                    if(nHist > 0) resumenFinal.push(`historial de tasa: +${nHist} día(s) con tasa`);
                }
                if(data.tasaDiaria && Array.isArray(data.tasaDiaria)){
                    let nTd = await importarTasaDiariaDesde(data.tasaDiaria);
                    if(nTd > 0) resumenFinal.push(`tasa diaria: +${nTd} día(s)`);
                }
                mostrarNotificacion('✅ Integración completada\n' + resumenFinal.join('\n'), 'success');
                if(currentModule === 'home') renderHome(); else renderConfig();
            } catch(err) { alert('Error al leer el archivo CSV: ' + err.message); }
        };
        reader.readAsText(file);
    }
    function parseCSVLine(str){
        let result = [], current = '', inQuotes = false;
        for(let i=0; i<str.length; i++){
            let c = str[i];
            if(inQuotes){
                if(c === '"' && str[i+1] === '"') { current += '"'; i++; }
                else if(c === '"') { inQuotes = false; }
                else { current += c; }
            } else {
                if(c === '"') { inQuotes = true; }
                else if(c === ',') { result.push(current); current = ''; }
                else { current += c; }
            }
        }
        result.push(current);
        return result;
    }
    
    // ==================== ALERTAS INTELIGENTES ====================
    function reproducirSonidoAlerta(){
        if(!D.config.sonidoAlertas) return;
        try {
            let ctx = new (window.AudioContext || window.webkitAudioContext)();
            let osc = ctx.createOscillator(); osc.type = 'sine'; osc.frequency.value = 800;
            let gain = ctx.createGain(); gain.gain.value = 0.3;
            osc.connect(gain); gain.connect(ctx.destination);
            osc.start(); setTimeout(() => { osc.stop(); ctx.close(); }, 200);
        } catch(e) { /* fallo silencioso */ }
    }
    function verificarStockBajo(){
        if(!D.config.alertaStockBajo) return;
        let bajos = D.productos.filter(p => p.stock < 5);
        if(bajos.length > 0){
            let nombres = bajos.slice(0,3).map(p => `${escapeHtml(p.nombre)} (${p.stock})`).join(', ');
            let msj = `⚠️ ${bajos.length} producto(s) con stock bajo: ${nombres}${bajos.length > 3 ? ` y ${bajos.length-3} más` : ''}`;
            mostrarNotificacion(msj, 'error');
            mostrarNotificacionNativa('Stock bajo', `${bajos.length} producto(s) con stock bajo`, 'stock-bajo');
            if(D.config.sonidoAlertas) reproducirSonidoAlerta();
        }
    }
    function notificarTasaActualizada(tasaAnterior, tasaNueva){
        if(!D.config.alertaTasa) return;
        let diff = Math.abs(tasaNueva - tasaAnterior);
        if(diff > 0.5){
            mostrarNotificacion(`💱 La tasa USD cambió: ${fmtDolar(tasaAnterior)} → ${fmtDolar(tasaNueva)} Bs`, 'info');
            mostrarNotificacionNativa('Tasa USD actualizada', `${fmtDolar(tasaAnterior)} → ${fmtDolar(tasaNueva)} Bs`, 'tasa');
            if(D.config.sonidoAlertas) reproducirSonidoAlerta();
        }
    }

    
    // ==================== CONFIGURACIÓN ====================
    async function renderConfig(){
        let colores = ['#ef4444','#f97316','#f59e0b','#10b981','#22c55e','#3b82f6','#00ced1','#8b5cf6','#a855f7','#ec4899','#ff69b4','#000000'];
        let bloqueado = volverBloqueado, accent = D.config.theme;
        const filaOpcion = (icono, nombre, desc, id, checked) => `
            <label class="opcion-fila">
                <span class="opcion-izq"><span class="opcion-icono">${icono}</span><span class="opcion-nombre">${nombre}${desc ? `<span class="opcion-desc">${desc}</span>` : ''}</span></span>
                <span class="switch"><input type="checkbox" id="${id}" ${checked?'checked':''}><span class="slider"></span></span>
            </label>`;
        let html = `
            <div class="page-header-fixed"><div class="module-header"><h2 id="tituloModule" class="module-title ${bloqueado?'module-title-bloqueado':''}" style="color:${accent}" onmousedown="iniciarBloqueo(this,'Configuración')" onmouseup="cancelarBloqueo()" onmouseleave="cancelarBloqueo()">Configuración</h2><div id="btnVolverModule" class="btn-back ${bloqueado?'btn-back-bloqueado':''}" onclick="${bloqueado?'':'backToHome()'}">${bloqueado?'<i class="fas fa-lock"></i> Bloqueado':'<i class="fas fa-arrow-left"></i> Volver'}</div></div></div>
            <div class="page-container">
                <div class="config-section"><button id="btnToggleEmpresa" class="btn-azul-redondeado btn-redondeado w-full mb-2 py-2">🏢 Datos de la Empresa</button><div id="panelEmpresa" style="display:none;" class="mt-2 config-inner"><div class="mb-2"><label>Nombre de la tienda</label><input type="text" id="empresaNombre" value="${escapeHtml(D.config.empresa.nombre)}" class="border rounded-xl p-2 w-full"></div><div class="mb-2"><label>Dirección</label><input type="text" id="empresaDireccion" value="${escapeHtml(D.config.empresa.direccion)}" class="border rounded-xl p-2 w-full"></div><div class="mb-2"><label>Teléfono</label><input type="text" id="empresaTelefono" value="${escapeHtml(D.config.empresa.telefono)}" class="border rounded-xl p-2 w-full"></div><div class="mb-2"><label>RIF</label><input type="text" id="empresaRif" value="${escapeHtml(D.config.empresa.rif)}" class="border rounded-xl p-2 w-full"></div><div class="mb-2"><label>Logo (URL o emoji)</label><input type="text" id="empresaLogo" value="${escapeHtml(D.config.empresa.logo)}" placeholder="🛍️ o URL de imagen" class="border rounded-xl p-2 w-full"></div><button id="guardarEmpresa" class="btn-azul-redondeado btn-redondeado w-full mt-2 py-2">💾 Guardar datos empresa</button></div></div>
                <div class="config-section"><button id="btnToggleTasa" class="btn-azul-redondeado btn-redondeado w-full mb-2 py-2">💰 Tasa de Cambio (USD/BS)</button><div id="panelTasa" style="display:none;" class="mt-2 config-inner">
                    <div class="mb-3">
                        <div class="bg-gray-100 dark:bg-gray-800 p-3 rounded-lg mb-3">
                            <div class="flex justify-between items-center">
                                <span class="font-semibold">API activa:</span>
                                <span class="text-xs font-mono">BCV</span>
                            </div>
                            <div class="flex justify-between items-center mt-2">
                                <span>Tasa actual:</span>
                                <span id="tasaActualDisplay" class="font-mono text-xl font-bold" style="color:${accent}">${fmtDolar(D.config.dolarRate)}</span>
                                <span>Bs/USD</span>
                            </div>
                            <div class="text-xs text-gray-500 mt-1">Actualizado: ${D.config.lastUpdate}</div>
                            ${D.config.tasaManual ? `<div class="text-xs mt-1 p-2 rounded" style="background:rgba(239,68,68,.1);color:#ef4444;font-weight:600">⚠️ Modo manual activo. Verifique siempre el valor actual en el BCV antes de fijar un precio.</div>` : `<div class="text-xs mt-1 p-2 rounded" style="background:rgba(16,185,129,.1);color:#10b981;font-weight:600">✅ Modo automático — la tasa se actualiza sola al abrir la app.</div>`}
                        </div>
                        <div class="flex flex-col gap-3">
                            <label class="flex items-center gap-2 cursor-pointer">
                                <input type="checkbox" id="modoManualCheck" ${D.config.tasaManual ? 'checked' : ''}> 
                                <span>🔒 Usar tasa manual (fija, sin internet)</span>
                            </label>
                            <div id="tasaManualDiv" style="${D.config.tasaManual ? 'display:flex' : 'display:none'}" class="flex gap-2 items-center">
                                <input type="number" id="tasaManualInput" step="0.01" value="${D.config.tasaManualValue}" placeholder="Ej: 777.42" class="border rounded-xl p-2 flex-1">
                                <button id="guardarTasaManualBtn" class="btn-azul-redondeado btn-redondeado py-2 px-4">Fijar</button>
                            </div>
                            <button id="actualizarTasaInternetBtn" class="btn-redondeado py-2 px-4" style="background:#3b82f6; color:white;">
                                🌐 Actualizar tasa desde Internet
                            </button>
                            <button id="fijarTasaDiaBtn" class="btn-redondeado py-2 px-4" style="background:#10b981; color:white;">
                                🔒 Fijar tasa del día (inmutable en el calendario)
                            </button>
                            <div class="text-xs text-gray-500 mt-2">
                                ℹ️ La API se actualiza automáticamente. ${!D.config.tasaManual ? '✅ Modo AUTOMÁTICO activado' : '🔒 Modo MANUAL activado'}
                            </div>
                        </div>
                    </div>
                </div></div>
                <div class="config-section"><button id="btnToggleOpciones" class="btn-azul-redondeado btn-redondeado w-full mb-2 py-2">⚙️ Opciones generales</button><div id="panelOpciones" style="display:none;" class="mt-2 config-inner">
                    <div class="grupo-opciones">
                        <div class="grupo-opciones-titulo">💳 Facturación</div>
                        ${filaOpcion('📊','IVA', 'Aplicar ' + D.config.ivaPorcentaje + '% sobre el subtotal de cada venta', 'toggleIVA', D.config.ivaActivo)}
                        ${filaOpcion('💰','Mostrar dólar', 'Mostrar la tasa USD en la pantalla principal', 'toggleMostrarDolar', D.config.mostrarDolar)}
                        ${filaOpcion('🔒','Prevenir cierre', 'Confirmar antes de salir de un módulo', 'togglePrevenirCierre', D.config.prevenirCierre)}
                    </div>
                    <div class="grupo-opciones">
                        <div class="grupo-opciones-titulo">🌗 Apariencia</div>
                        ${filaOpcion('🌓','Modo oscuro automático', 'Se sincroniza con el modo del sistema', 'toggleAutoOscuro', D.config.autoOscuro)}
                        ${filaOpcion('🌙','Fondo oscuro', 'Activar el tema oscuro manualmente', 'toggleFondoOscuro', D.config.backgroundMode==='dark')}
                    </div>
                    <div class="grupo-opciones">
                        <div class="grupo-opciones-titulo">🔔 Alertas inteligentes</div>
                        ${filaOpcion('📦','Stock bajo', 'Notificar cuando hay productos con stock bajo', 'toggleAlertaStock', D.config.alertaStockBajo)}
                        ${filaOpcion('💱','Cambio de tasa USD', 'Notificar cuando cambia la tasa del dólar', 'toggleAlertaTasa', D.config.alertaTasa)}
                        ${filaOpcion('🔊','Sonido', 'Reproducir sonido cuando se emite una alerta', 'toggleSonidoAlertas', D.config.sonidoAlertas)}
                    </div>
                    <p class="text-xs text-center mt-3 opacity-60">Las alertas aparecen como notificaciones al iniciar y al realizar acciones clave</p>
                </div></div>
                <div class="config-section"><button id="btnToggleSeguridad" class="btn-azul-redondeado btn-redondeado w-full mb-2 py-2">🔒 Seguridad (PIN)</button><div id="panelSeguridad" style="display:none;" class="mt-2 config-inner"><div class="mb-2"><label>PIN de acceso (4 dígitos, dejar vacío para deshabilitar)</label><input type="password" id="pinInput" value="${escapeHtml(D.config.pin)}" maxlength="4" pattern="[0-9]*" inputmode="numeric" class="border rounded-xl p-2 w-full text-center text-2xl tracking-widest" placeholder="****"></div><button id="guardarPinBtn" class="btn-azul-redondeado btn-redondeado w-full py-2">🔐 Guardar PIN</button><p class="text-xs text-center mt-2 opacity-60">${D.config.pin ? '✅ PIN activo. Se pedirá al abrir la app.' : 'ℹ️ Sin PIN. Cualquiera puede acceder.'}</p></div></div>
                <div class="config-section"><button id="btnToggleColores" class="btn-azul-redondeado btn-redondeado w-full mb-2 py-2">🎨 Temas de color</button><div id="panelColores" style="display:none;" class="mt-2 config-inner"><div class="flex flex-wrap justify-center gap-2" id="paletaColores" style="max-width:290px;margin:0 auto"></div></div></div>
                <div class="config-section"><button id="btnToggleBackup" class="btn-azul-redondeado btn-redondeado w-full mb-2 py-2">💾 Copia de seguridad</button><div id="panelBackup" style="display:none;" class="mt-2 config-inner"><div class="flex flex-col gap-3">${esAppNativa() ? `<div class="rounded-xl p-3" style="background:rgba(14,165,233,0.08);border:1px solid rgba(14,165,233,0.3)"><p class="text-sm font-semibold mb-1">📁 Carpeta de la aplicación</p><p id="carpetaEstado" class="text-xs opacity-70 mb-2">ℹ️ Elija una carpeta para guardar tickets y respaldos (se creará la subcarpeta JAMPOS).</p><button id="elegirCarpetaBtn" class="btn-redondeado py-2 px-4 w-full" style="background:#0ea5e9;color:#fff">📂 Elegir carpeta</button></div>` : `<p class="text-xs text-center opacity-60">💡 En la app Android podrás elegir una carpeta donde guardar los archivos.</p>`}<button id="exportJsonBtn" class="btn-redondeado py-2 px-4" style="background:#3b82f6;color:#fff">📥 Exportar todo (JSON)</button><button id="exportCsvBtn" class="btn-redondeado py-2 px-4" style="background:#10b981;color:#fff">📥 Exportar todo (CSV / Excel)</button><button id="importJsonBtn" class="btn-redondeado py-2 px-4" style="background:#8b5cf6;color:#fff">📤 Importar desde JSON</button><button id="importCsvBtn" class="btn-redondeado py-2 px-4" style="background:#f59e0b;color:#fff">📤 Importar desde CSV / Excel</button>${esAppNativa() ? `<button id="importCarpetaBtn" class="btn-redondeado py-2 px-4" style="background:#14b8a6;color:#fff">📂 Importar desde la carpeta JAMPOS</button>` : ''}<input type="file" id="importFileInput" accept=".json" style="display:none"><input type="file" id="importCsvFileInput" accept=".csv,.xlsx,.xls,.txt" style="display:none"><p class="text-xs text-center mt-2 opacity-60">Los archivos CSV se abren directamente en Excel</p></div></div></div>
                <div class="config-section"><button id="btnToggleSync" class="btn-azul-redondeado btn-redondeado w-full mb-2 py-2">🔄 Sincronizar terminales</button><div id="panelSync" style="display:none;" class="mt-2 config-inner">${window.JAMSync && window.JAMSync.isConnected() ? `<div class="mb-3 p-3 rounded-xl" style="background:rgba(16,185,129,0.1);border:1px solid #10b98140"><div class="flex items-center gap-2"><span style="color:#10b981;font-size:1.2rem">&#9679;</span><div><div class="text-sm font-bold" style="color:#10b981">Conectado a ${window.JAMSync.getName()}</div><div class="text-xs opacity-70">Sync automatico cada 30s</div></div></div></div><div class="mb-2 p-2 rounded-lg" style="background:rgba(139,92,246,0.1);border:1px solid #8b5cf640"><div class="text-xs opacity-70 mb-1">URL de conexion</div><div class="text-sm font-mono font-bold" style="color:#8b5cf6">${window.JAMSync.getUrl()}</div></div><button id="syncNowBtn" class="btn-redondeado w-full py-3 mb-2" style="background:#3b82f6;color:#fff"><i class="fas fa-sync-alt mr-1"></i> Sincronizar ahora</button><button id="syncStopBtn" class="btn-redondeado w-full py-2" style="background:#ef4444;color:#fff">Desconectar</button>` : `<div class="mb-2"><label class="text-sm font-semibold">Nombre de este dispositivo</label><div class="flex gap-2 mt-1"><input type="text" id="syncNameInput" placeholder="Nombre de la tienda..." class="border rounded-xl p-2 flex-1" value="${window.JAMSync ? window.JAMSync.getName() : ''}"><button id="syncNowBtn" class="btn-redondeado px-3 py-2" style="background:#3b82f6;color:#fff" title="Sincronizar datos"><i class="fas fa-sync-alt"></i></button></div><p class="text-xs mt-1 opacity-60">Escribe el nombre → QR se genera solo</p></div><div id="syncUrlRow" style="display:none" class="mb-2 p-2 rounded-lg"><div class="text-xs opacity-70 mb-1">URL de conexion</div><div id="syncUrlText" class="text-sm font-mono font-bold" style="color:#8b5cf6"></div></div><div id="syncQRDiv" style="display:none" class="text-center my-3"><canvas id="syncQRCanvas" width="256" height="256" style="width:200px;height:200px;border:3px solid #333;border-radius:12px"></canvas><p class="text-xs mt-2 opacity-60">Escanear este codigo desde el otro dispositivo</p></div><div class="border-t border-gray-200 dark:border-gray-700 pt-3 mt-3"><button id="syncScanBtn" class="btn-redondeado w-full py-3" style="background:#10b981;color:#fff"><i class="fas fa-camera mr-1"></i> Escanear QR del principal</button><p class="text-xs text-center mt-1 opacity-60">Dispositivo secundario: escanea para enlazar</p></div>`}<p class="text-xs text-center opacity-60 mt-3">Ambos dispositivos en la misma WiFi<br>Escribe el nombre → genera QR → escanea desde el otro</p></div></div>
            </div>
        `;
        document.getElementById('appRoot').innerHTML = html;
        if(volverBloqueado) document.getElementById('btnVolverModule').onclick = () => mostrarOverlayBloqueo();
        
        const toggle = (btnId, panelId) => { document.getElementById(btnId).onclick = () => { let p = document.getElementById(panelId); p.style.display = p.style.display === 'none' ? 'block' : 'none'; }; };
        toggle('btnToggleEmpresa', 'panelEmpresa');
        toggle('btnToggleTasa', 'panelTasa');
        toggle('btnToggleOpciones', 'panelOpciones');
        toggle('btnToggleSeguridad', 'panelSeguridad');
        toggle('btnToggleColores', 'panelColores');
        toggle('btnToggleBackup', 'panelBackup');
        toggle('btnToggleSync', 'panelSync');
        
        var syncNameInput = document.getElementById('syncNameInput');
        var syncScanBtn = document.getElementById('syncScanBtn');
        var syncStopBtn = document.getElementById('syncStopBtn');
        var syncNowBtn = document.getElementById('syncNowBtn');
        
        if (syncNowBtn) {
            syncNowBtn.addEventListener('click', function () {
                if (!window.JAMSync) { mostrarNotificacion('Modulo sync no disponible', 'error'); return; }
                syncNowBtn.disabled = true;
                syncNowBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-1"></i> Sincronizando...';
                window.JAMSync.bidirectionalSync().then(function (result) {
                    syncNowBtn.disabled = false;
                    syncNowBtn.innerHTML = '<i class="fas fa-sync-alt mr-1"></i> Sincronizar ahora';
                    if (result && result.ok) {
                        if (result.added > 0 || result.updated > 0) {
                            mostrarNotificacion('Sync completada: ' + result.added + ' nuevos, ' + result.updated + ' actualizados', 'success');
                        } else {
                            mostrarNotificacion('Bases de datos al dia', 'info');
                        }
                    } else if (result && result.msg) {
                        mostrarNotificacion('Sync: ' + result.msg, 'warning');
                    }
                }).catch(function (e) {
                    syncNowBtn.disabled = false;
                    syncNowBtn.innerHTML = '<i class="fas fa-sync-alt mr-1"></i> Sincronizar ahora';
                    mostrarNotificacion('Error sync: ' + e.message, 'error');
                });
            });
        }
        
        if (syncNameInput) {
            var syncDebounce = null;
            syncNameInput.addEventListener('input', function () {
                clearTimeout(syncDebounce);
                var name = syncNameInput.value.trim();
                if (name.length < 2) {
                    var qrDiv = document.getElementById('syncQRDiv');
                    if (qrDiv) qrDiv.style.display = 'none';
                    return;
                }
                syncDebounce = setTimeout(function () {
                    if (!window.JAMSync) return;
                    window.JAMSync.setupPrincipal(name).then(function (result) {
                        var urlRow = document.getElementById('syncUrlRow');
                        var urlText = document.getElementById('syncUrlText');
                        if (urlRow) urlRow.style.display = 'block';
                        if (urlText) urlText.textContent = result.url;
                        var qrDiv = document.getElementById('syncQRDiv');
                        if (qrDiv) qrDiv.style.display = 'block';
                        window.JAMSync.showQR('syncQRCanvas', result.payload);
                    }).catch(function (e) {
                        mostrarNotificacion('Error config sync: ' + e.message, 'error');
                    });
                }, 300);
            });
            if (syncNameInput.value.trim().length >= 2 && window.JAMSync && window.JAMSync.getUrl()) {
                var urlRow = document.getElementById('syncUrlRow');
                var urlText = document.getElementById('syncUrlText');
                if (urlRow) urlRow.style.display = 'block';
                if (urlText) urlText.textContent = window.JAMSync.getUrl();
                var qrDiv = document.getElementById('syncQRDiv');
                if (qrDiv) qrDiv.style.display = 'block';
                window.JAMSync.showQR('syncQRCanvas', JSON.stringify({u:window.JAMSync.getUrl(),n:window.JAMSync.getName(),k:localStorage.getItem('jam_sync_key')||''}));
            }
        }
        
        if (syncScanBtn) {
            syncScanBtn.addEventListener('click', function () {
                if (!window.JAMSync) return;
                window.JAMSync.scanAndConnect().then(function (info) {
                    mostrarNotificacion('Conectado a ' + info.name + ' - Sincronizando...', 'success');
                    return window.JAMSync.bidirectionalSync();
                }).then(function () {
                    window.JAMSync.startSync();
                    renderConfig();
                }).catch(function (e) {
                    mostrarNotificacion('Error: ' + e.message, 'error');
                });
            });
        }
        
        if (syncStopBtn) {
            syncStopBtn.addEventListener('click', function () {
                if (!window.JAMSync) return;
                window.JAMSync.stopSync();
                localStorage.removeItem('jam_sync_url');
                localStorage.removeItem('jam_sync_name');
                localStorage.removeItem('jam_sync_key');
                mostrarNotificacion('Desconectado', 'info');
                renderConfig();
            });
        }
        
        if (window.JAMSync && window.JAMSync.isConnected()) {
            window.JAMSync.startSync();
        }
        
        const modoManualCheck = document.getElementById('modoManualCheck');
        const tasaManualDiv = document.getElementById('tasaManualDiv');
        const tasaManualInput = document.getElementById('tasaManualInput');
        const guardarTasaManualBtn = document.getElementById('guardarTasaManualBtn');
        const actualizarInternetBtn = document.getElementById('actualizarTasaInternetBtn');
        
        document.getElementById('fijarTasaDiaBtn').onclick = async () => {
            const ok = await fijarTasaDia(hoyISO());
            if(ok){
                D.tasaDiaria = await cargarTasaDiaria();
                refrescarCacheTasaDiaria();
                mostrarNotificacion('🔒 Tasa del día fijada. Quedará inmutable en el calendario.', 'success');
            } else {
                mostrarNotificacion('ℹ️ La tasa del día ya estaba fijada', 'info');
            }
        };
        
        modoManualCheck.addEventListener('change', async (e) => {
            D.config.tasaManual = e.target.checked;
            if (e.target.checked) {
                D.config.dolarRate = D.config.tasaManualValue;
                D.config.lastUpdate = new Date().toLocaleDateString() + " (Manual)";
                registrarCambioTasa(D.config.dolarRate);
                tasaManualDiv.style.display = 'flex';
            } else {
                tasaManualDiv.style.display = 'none';
                D.config.lastUpdate = "Pendiente de actualización automática";
            }
            saveConfig();
            document.getElementById('tasaActualDisplay').innerText = fmtDolar(D.config.dolarRate);
            actualizarInfoCard();
            await recalcularPreciosPorTasa();
        });
        
        document.getElementById('guardarPinBtn').onclick = () => {
            let pin = document.getElementById('pinInput').value.replace(/\D/g, '').slice(0, 4);
            document.getElementById('pinInput').value = pin;
            D.config.pin = pin;
            saveConfig();
            renderConfig();
            mostrarNotificacion(pin ? '🔒 PIN guardado. Se pedirá al abrir la app.' : '🔓 PIN eliminado. Acceso sin restricciones.', 'success');
        };

        guardarTasaManualBtn.onclick = async () => {
            const nuevoValor = parseFloat(tasaManualInput.value);
            if (!isNaN(nuevoValor) && nuevoValor > 0) {
                D.config.tasaManualValue = nuevoValor;
                if (D.config.tasaManual) {
                    D.config.dolarRate = nuevoValor;
                    D.config.lastUpdate = new Date().toLocaleDateString() + " (Manual)";
                    registrarCambioTasa(nuevoValor);
                }
                saveConfig();
                document.getElementById('tasaActualDisplay').innerText = fmtDolar(D.config.dolarRate);
                actualizarInfoCard();
                await recalcularPreciosPorTasa();
                mostrarNotificacion(`Tasa manual establecida en ${fmtDolar(nuevoValor)} Bs/USD`, 'success');
            } else {
                alert("Ingrese un valor numérico válido (mayor a 0)");
            }
        };
        
        actualizarInternetBtn.onclick = async () => {
            const wasManual = D.config.tasaManual;
            if (wasManual) D.config.tasaManual = false;
            mostrarNotificacion("Actualizando tasa desde internet...", 'info');
            await actualizarTasa(true);
            if (wasManual) {
                const mantenerManual = await jamConfirm("Se ha obtenido una tasa actualizada desde internet. ¿Desea seguir usando tasa MANUAL?");
                if (mantenerManual) {
                    D.config.tasaManual = true;
                    const usarNueva = await jamConfirm(`La tasa obtenida es ${fmtDolar(D.config.dolarRate)}. ¿Desea actualizar la tasa manual a este valor?`);
                    if (usarNueva) {
                        D.config.tasaManualValue = D.config.dolarRate;
                    }
                } else {
                    D.config.tasaManual = false;
                }
                saveConfig();
            }
            renderConfig();
        };
        
        document.getElementById('guardarEmpresa').onclick = async () => { 
            D.config.empresa = { 
                nombre: document.getElementById('empresaNombre').value, 
                direccion: document.getElementById('empresaDireccion').value, 
                telefono: document.getElementById('empresaTelefono').value, 
                rif: document.getElementById('empresaRif').value, 
                logo: document.getElementById('empresaLogo').value 
            }; 
            await saveConfig(); 
            mostrarNotificacion('✓ Datos de empresa guardados', 'success');
            document.getElementById('panelEmpresa').style.display = 'none'; 
        };
        
        let paleta = document.getElementById('paletaColores');
        colores.forEach(c => { let circle = document.createElement('div'); circle.className = 'color-circle'; circle.style.backgroundColor = c; circle.onclick = async () => { D.config.theme = c; await saveConfig(); renderConfig(); }; paleta.appendChild(circle); });
        
        document.getElementById('toggleIVA').onchange = async e => { D.config.ivaActivo = e.target.checked; await saveConfig(); };
        document.getElementById('togglePrevenirCierre').onchange = async e => { D.config.prevenirCierre = e.target.checked; await saveConfig(); };
        document.getElementById('toggleMostrarDolar').onchange = async e => { D.config.mostrarDolar = e.target.checked; await saveConfig(); actualizarInfoCard(); };
        document.getElementById('toggleAutoOscuro').onchange = async e => { 
            D.config.autoOscuro = e.target.checked; 
            if(D.config.autoOscuro) aplicarModoSistema();
            await saveConfig();
            document.getElementById('toggleFondoOscuro').checked = D.config.backgroundMode === 'dark';
        };
        document.getElementById('toggleFondoOscuro').onchange = async e => {
            D.config.autoOscuro = false;
            D.config.backgroundMode = e.target.checked ? 'dark' : 'light';
            document.getElementById('toggleAutoOscuro').checked = false;
            await saveConfig();
        };
        document.getElementById('toggleAlertaStock').onchange = async e => { D.config.alertaStockBajo = e.target.checked; await saveConfig(); };
        document.getElementById('toggleAlertaTasa').onchange = async e => { D.config.alertaTasa = e.target.checked; await saveConfig(); };
        document.getElementById('toggleSonidoAlertas').onchange = async e => { D.config.sonidoAlertas = e.target.checked; await saveConfig(); };
        document.getElementById('exportJsonBtn').onclick = async () => await exportarBackupJSON();
        document.getElementById('exportCsvBtn').onclick = async () => await exportarBackupCSV();
        document.getElementById('importJsonBtn').onclick = () => document.getElementById('importFileInput').click();
        document.getElementById('importFileInput').onchange = e => { if(e.target.files[0]) importarBackupJSON(e.target.files[0]); };
        document.getElementById('importCsvBtn').onclick = () => document.getElementById('importCsvFileInput').click();
        document.getElementById('importCsvFileInput').onchange = e => { if(e.target.files[0]) importarBackupCSV(e.target.files[0]); };
        const elegirCarpetaBtn = document.getElementById('elegirCarpetaBtn');
        if (elegirCarpetaBtn) elegirCarpetaBtn.onclick = () => {
            if (!esAppNativa()) return;
            try { AndroidBridge.elegirCarpeta(); } catch (e) { alert('No se pudo abrir el selector de carpeta'); }
        };
        const importCarpetaBtn = document.getElementById('importCarpetaBtn');
        if (importCarpetaBtn) importCarpetaBtn.onclick = importarDesdeCarpeta;
        actualizarUICarpeta();
    }
    
    // ==================== SERVICE WORKER Y PWA ====================
    (function setupPWA() {
        var esTauri = window.__TAURI__ !== undefined || navigator.userAgent.includes('Tauri');
        if (!esTauri && 'serviceWorker' in navigator) {
            navigator.serviceWorker.register('sw.js').catch(function(err) {
                console.log('SW registration failed (non-critical):', err);
            });
        }

        if (window.AndroidBridge && window.AndroidBridge.requestWakeLock) {
            window.AndroidBridge.requestWakeLock();
        }
        if (window.AndroidBridge && window.AndroidBridge.lockPortrait) {
            window.AndroidBridge.lockPortrait();
        }

        let deferredPrompt;
        window.addEventListener('beforeinstallprompt', function(e) {
            e.preventDefault();
            deferredPrompt = e;
            var btn = document.querySelector('.install-btn');
            if (!btn) {
                btn = document.createElement('button');
                btn.innerText = '📲 Instalar App';
                btn.className = 'install-btn';
                btn.style.setProperty('background', D.config.theme);
                btn.style.setProperty('color', '#ffffff');
                btn.onclick = function() {
                    if (deferredPrompt) {
                        deferredPrompt.prompt();
                        deferredPrompt.userChoice.then(function() {
                            if (btn && btn.parentNode) btn.remove();
                        });
                    } else if (btn && btn.parentNode) {
                        btn.remove();
                    }
                };
                document.body.appendChild(btn);
            }
        });

        window.addEventListener('appinstalled', function() {
            var btn = document.querySelector('.install-btn');
            if (btn) btn.remove();
            console.log('JAM POS instalada como PWA');
        });
    })();
    
        function askPin(callback){
        let overlay = document.createElement('div');
        overlay.id = 'pinOverlay';
        overlay.style.cssText = 'position:fixed;inset:0;z-index:99999;display:flex;flex-direction:column;align-items:center;justify-content:center;background:var(--bg,#000);color:var(--text,#fff);';
        overlay.innerHTML = '<h2 class=\"text-xl font-bold mb-4\">🔒 PIN de acceso</h2><input type=\"password\" id=\"pinAuthInput\" maxlength=\"4\" pattern=\"[0-9]*\" inputmode=\"numeric\" class=\"border rounded-xl p-2 text-center text-2xl tracking-widest w-48\" placeholder=\"****\" autofocus style=\"background:var(--card-bg,#222);color:var(--text,#fff)\"><p id=\"pinErrorMsg\" class=\"text-red-400 text-sm mt-2 hidden\">PIN incorrecto</p>';
        document.body.appendChild(overlay);
        let input = document.getElementById('pinAuthInput');
        input.focus();
        input.addEventListener('keydown', function handler(e){
            if(e.key !== 'Enter') return;
            let val = this.value.replace(/\D/g,'').slice(0,4);
            if(val === D.config.pin){
                sessionStorage.setItem('jam_pin_authed','1');
                overlay.remove();
                if(callback) callback();
            } else {
                document.getElementById('pinErrorMsg').classList.remove('hidden');
                this.value = '';
                this.focus();
            }
        });
    }
// ==================== GUÍA DE LA APP Y TUTORIAL ====================
    const APP_VERSION = '0.1';
    const APP_NOMBRE = 'JAM POS';
    const APP_TAGLINE = 'Tienda Profesional';
    const MODULOS_GUIA = [
        { icon: 'fa-shopping-cart', nombre: 'Ventas', uso: 'Registra ventas buscando por nombre o código de barras, elige el tipo de pago, aplica descuentos y genera el ticket de la venta.' },
        { icon: 'fa-boxes', nombre: 'Inventario', uso: 'Administra tus productos: precios en Bs y USD, stock mínimo, categorías, escaneo de código de barras e imágenes.' },
        { icon: 'fa-users', nombre: 'Clientes', uso: 'Lleva tu cartera de clientes con cédula, teléfono, saldo pendiente y historial de compras.' },
        { icon: 'fa-truck', nombre: 'Proveedores', uso: 'Registra tus proveedores, tiempos de entrega y datos de contacto para tus compras.' },
        { icon: 'fa-coins', nombre: 'Gastos', uso: 'Registra los gastos del negocio y clasifícalos por categoría para controlar tus costos.' },
        { icon: 'fa-user-tie', nombre: 'Empleados', uso: 'Gestiona tu personal: cédula, cargo, salario en Bs y fecha de contratación.' },
        { icon: 'fa-chart-line', nombre: 'Reportes', uso: 'Consulta tus estadísticas: total de ventas, ticket promedio, gráficos y calendario de ventas.' },
        { icon: 'fa-palette', nombre: 'Config', uso: 'Personaliza el tema y colores, configura la empresa, la tasa de cambio, impresión y la copia de seguridad.' }
    ];

    function inyectarBotonAyudaModulo() {
        const header = document.querySelector('.module-header');
        if(!header) return;
        if(header.querySelector('.btn-ayuda-modulo')) return;
        const btn = document.createElement('button');
        btn.className = 'btn-ayuda-modulo';
        btn.title = 'Guía de la app';
        btn.innerHTML = '<i class="fas fa-circle-question"></i>';
        btn.onclick = () => {
            const g = GUIA_MODULOS[currentModule];
            if(g) iniciarTutorial(g.pasos, g.clave);
            else mostrarGuiaApp();
        };
        const titulo = header.querySelector('.module-title');
        if(titulo) {
            let grupo = header.querySelector('.module-header-izq');
            if(!grupo) {
                grupo = document.createElement('div');
                grupo.className = 'module-header-izq';
                titulo.parentNode.insertBefore(grupo, titulo);
            }
            grupo.appendChild(titulo);
            grupo.appendChild(btn);
        } else {
            header.insertBefore(btn, header.firstChild);
        }
    }

    function mostrarGuiaApp() {
        if (document.querySelector('.tuto-overlay')) return;
        const accent = D.config.theme;
        const versionTxt = `Versión ${APP_VERSION}`;
        const modulosHtml = MODULOS_GUIA.map(m =>
            `<div class="guia-item"><i class="fas ${m.icon}"></i><div><strong>${m.nombre}</strong><small>${m.uso}</small></div></div>`
        ).join('');
        const fondo = document.createElement('div');
        fondo.className = 'guia-fondo';
        fondo.innerHTML = `
            <div class="guia-caja">
                <div class="guia-titulo" style="color:${accent}"><i class="fas fa-circle-question"></i>Guía de la aplicación</div>
                <div class="guia-version">${APP_NOMBRE} · ${APP_TAGLINE} · ${versionTxt}</div>
                <div class="guia-fila"><span>Nombre</span><span>${APP_NOMBRE}</span></div>
                <div class="guia-fila"><span>Versión</span><span>${APP_VERSION}</span></div>
                <div class="guia-fila"><span>Tipo de cambio</span><span>${D.config.mostrarDolar ? 'Tasa BCV (Bs/USD)' : 'Desactivado'}</span></div>
                <div class="guia-fila"><span>Empresa</span><span>${D.config.empresa?.nombre || '—'}</span></div>
                <div class="guia-seccion">
                    <h4>Cómo usar los módulos</h4>
                    <div class="guia-lista">${modulosHtml}</div>
                </div>
                <div class="guia-botones">
                    <button class="guia-boton-secundario" onclick="cerrarGuiaApp()">Cerrar</button>
                    <button class="guia-boton-primario" style="background:${accent}" onclick="cerrarGuiaApp();iniciarTutorial()">Ver recorrido interactivo</button>
                </div>
            </div>`;
        document.body.appendChild(fondo);
        window.cerrarGuiaApp = () => fondo.remove();
    }

    const GUIA_HOME = [
        { sel: null, titulo: 'Bienvenido a JAM POS', texto: 'Tu tienda profesional: gestiona ventas, inventario, clientes y más, todo desde este dispositivo.' },
        { sel: '#searchGlobalInput', titulo: 'Búsqueda rápida', texto: 'Escribe aquí para buscar productos, clientes y proveedores desde cualquier parte.' },
        { sel: '.card-bcv', titulo: 'Tipo de cambio', texto: 'Muestra la tasa oficial del dólar (BCV). Toca el icono de intercambio para usar el convertidor USD ⇄ Bs.' },
        { sel: '.home-grid', titulo: 'Tus módulos', texto: 'Cada botón abre un módulo: Ventas, Inventario, Clientes, Proveedores, Gastos, Empleados, Reportes y Configuración.' },
        { sel: '.btn-ayuda-home', titulo: 'Guía de la app', texto: 'Este botón abre la guía completa con la versión, los datos de la empresa y cómo usar cada módulo.' },
        { sel: null, titulo: '¡Listo!', texto: 'Ya conoces lo esencial. Explora cada módulo cuando quieras, y vuelve a la guía cuando lo necesites.' }
    ];
    const GUIA_VENTAS = [
        { sel: '#clienteInput', titulo: '1. El cliente', texto: 'Escribe el nombre o la cédula del cliente y toca la sugerencia para seleccionarlo. Usa el botón "+" para crear uno nuevo al instante.' },
        { sel: '#buscarProducto', titulo: '2. Buscar productos', texto: 'Escribe el nombre o el código de barras. Toca un resultado para agregarlo al carrito; con Enter y un código se agrega directo.' },
        { sel: '#btnScanVentas', titulo: '3. Escáner con cámara', texto: 'Toca la cámara para escanear un código de barras y agregar el producto automáticamente.' },
        { sel: '#carritoLista', titulo: '4. Carrito', texto: 'Aquí ves lo agregado: cambia cantidades, quita productos y mira el subtotal, IVA y total en tiempo real.' },
        { sel: '#tipoPago', titulo: '5. Tipo de pago', texto: 'Elige cómo paga el cliente: efectivo en Bs, dólares, tarjeta, transferencia, pago móvil o pago dividido (varios métodos en una venta).' },
        { sel: '#finalizarVenta', titulo: '6. Finalizar venta', texto: 'Al finalizar se genera el TICKET virtual: puedes guardarlo como imagen, imprimirlo o reenviarlo. Con efectivo en Bs puedes calcular el cambio.' },
        { sel: null, titulo: '¡Listo!', texto: 'Con eso dominas Ventas. Haz tu primera venta cuando quieras; el ticket te da imagen e impresión.' }
    ];
    const GUIA_INVENTARIO = [
        { sel: '#searchInv', titulo: '1. Buscar en inventario', texto: 'Escribe el nombre o el código de barras para filtrar tus productos al instante. Con Enter y un código se agrega o busca directo.' },
        { sel: '#btnScanInv', titulo: '2. Escáner', texto: 'Toca la cámara para escanear un código de barras y encontrar el producto al instante.' },
        { sel: '#nuevoProducto', titulo: '3. Nuevo producto', texto: 'Abre el formulario completo: nombre, código de barras, categoría, proveedor, stock, y precios de compra y venta.' },
        { sel: null, titulo: '4. Conversión Bs ⇄ USD', texto: 'En el formulario de producto los precios se convierten SOLOS: escribe un precio en Bs y el campo en USD se rellena con la tasa del día (y viceversa). Compra y venta se convierten por separado.' },
        { sel: '.product-card', titulo: '5. Tus productos', texto: 'Cada tarjeta muestra precios en Bs y USD, stock y categoría. Toca ✏️ Editar, 📋 Copiar o 🗑️ Eliminar según necesites.' },
        { sel: '#selectAllCheckbox', titulo: '6. Selección en lote', texto: 'Marca varios productos y pulsa "✏️ Editar selección" para cambiar precios, categoría, proveedor o stock de todos a la vez.' },
        { sel: null, titulo: '¡Listo!', texto: 'Ya sabes manejar inventario y sus conversiones. ¡Agrega tu primer producto!' }
    ];
    const GUIA_REPORTES = [
        { sel: '.chart-container', titulo: '1. Gráfico diario', texto: 'Toca cualquier barra del gráfico para ver las ventas, ganancia y utilidad de ese día.' },
        { sel: '#chartVentas', titulo: '2. Gráfico', texto: 'Gráfica de tus ventas en el tiempo para detectar tendencias de un vistazo.' },
        { sel: '#buscarVentas', titulo: '3. Buscar ventas', texto: 'Escribe para filtrar por fecha, artículo, cliente o número de venta. También puedes usar el calendario de la derecha.' },
        { sel: '#btnCalendarioVentas', titulo: '4. Calendario', texto: 'Abre un calendario para ver las ventas de un día o de un mes específicos.' },
        { sel: '#listaVentasReporte', titulo: '5. Detalle de venta', texto: 'Toca cualquier venta para ver su ticket completo: cliente, productos, total y forma de pago.' },
        { sel: null, titulo: '¡Listo!', texto: 'Con Reportes controlas tu negocio: ganancias, gastos, ventas por día y más.' }
    ];
    const GUIA_MODULOS = {
        ventas: { clave: 'jam_guia_ventas_visto', pasos: GUIA_VENTAS },
        inventario: { clave: 'jam_guia_inventario_visto', pasos: GUIA_INVENTARIO },
        reportes: { clave: 'jam_guia_reportes_visto', pasos: GUIA_REPORTES }
    };

    function iniciarTutorial(pasos, claveVisto) {
        if (document.querySelector('.tuto-overlay') || document.querySelector('.guia-fondo')) return;
        const accent = D.config.theme;
        const fondo = document.createElement('div');
        fondo.className = 'tuto-overlay';
        const resalto = document.createElement('div');
        resalto.className = 'tuto-resalto';
        const burbuja = document.createElement('div');
        burbuja.className = 'tuto-burbuja';
        burbuja.innerHTML = `<div class="tuto-flecha"></div><h3></h3><p></p><div class="tuto-botones"><button class="tuto-saltar">Saltar</button><button class="tuto-siguiente" style="background:${accent}">Siguiente</button></div><div class="tuto-contador"></div>`;
        fondo.appendChild(resalto);
        fondo.appendChild(burbuja);
        document.body.appendChild(fondo);

        let paso = 0;
        const pintar = () => {
            const p = pasos[paso];
            burbuja.querySelector('h3').textContent = p.titulo;
            burbuja.querySelector('p').textContent = p.texto;
            burbuja.querySelector('.tuto-contador').textContent = `${paso + 1} de ${pasos.length}`;
            burbuja.querySelector('.tuto-siguiente').textContent = paso === pasos.length - 1 ? 'Terminar' : 'Siguiente';
            if (p.sel) {
                const el = document.querySelector(p.sel);
                if (el) {
                    const r = el.getBoundingClientRect();
                    resalto.style.display = 'block';
                    resalto.style.left = (r.left - 6) + 'px';
                    resalto.style.top = (r.top - 6) + 'px';
                    resalto.style.width = (r.width + 12) + 'px';
                    resalto.style.height = (r.height + 12) + 'px';
                } else {
                    resalto.style.display = 'none';
                }
            } else {
                resalto.style.display = 'none';
            }
        };
        const marcarVisto = () => { if(claveVisto) localStorage.setItem(claveVisto, '1'); };
        const siguiente = () => {
            paso++;
            if (paso >= pasos.length) { fondo.remove(); marcarVisto(); return; }
            pintar();
        };
        burbuja.querySelector('.tuto-saltar').onclick = () => { fondo.remove(); marcarVisto(); };
        burbuja.querySelector('.tuto-siguiente').onclick = siguiente;
        pintar();
    }

    function iniciarTutorialSiPrimeraVez() {
        if(localStorage.getItem('jam_tutorial_visto')) {
            setTimeout(() => {
                if(currentModule === 'home') {
                    const btn = document.querySelector('.btn-ayuda-home');
                    const inp = document.getElementById('searchGlobalInput');
                    if(btn) btn.classList.add('oculto');
                    if(inp) inp.classList.add('sin-ayuda');
                }
            }, 400);
            return;
        }
        setTimeout(() => {
            if(currentModule === 'home' && document.querySelector('.home-grid')) iniciarTutorial(GUIA_HOME, 'jam_tutorial_visto');
        }, 600);
    }

    function iniciarGuiaModuloSiPrimeraVez(mod) {
        const g = GUIA_MODULOS[mod];
        if(!g || localStorage.getItem(g.clave)) return;
        setTimeout(() => {
            if(currentModule === mod) iniciarTutorial(g.pasos, g.clave);
        }, 500);
    }
// ==================== VERSIÓN DE PRUEBA (CANDADO) ====================
    // ==================== SISTEMA DE PRUEBA 30 DÍAS ====================
    const JAM_EMAIL_VENTA = 'jamaplicativo@gmail.com';
    window._pruebaInfo = null;

    function mostrarBloqueoPrueba() {
        if(document.querySelector('.prueba-bloqueo')) return;
        document.body.innerHTML = '';
        const fondo = document.createElement('div');
        fondo.className = 'prueba-bloqueo';
        fondo.innerHTML = `<div class="prueba-bloqueo-caja">
            <div class="prueba-bloqueo-icono">&#128274;</div>
            <h2>Periodo de prueba finalizado</h2>
            <p>Tu periodo de prueba de <b>30 dias</b> de JAM POS ha terminado.</p>
            <p class="prueba-bloqueo-detalle">Para seguir usando el sistema necesitas la version completa con todas las caracteristicas premium.</p>
            <div class="prueba-bloqueo-email">
                <div class="prueba-bloqueo-email-label">Contacta para obtener la version completa:</div>
                <a href="mailto:${JAM_EMAIL_VENTA}" class="prueba-bloqueo-email-link">${JAM_EMAIL_VENTA}</a>
            </div>
            <div class="prueba-bloqueo-premium">
                <div class="prueba-bloqueo-premium-titulo">Version Premium incluye:</div>
                <div class="prueba-bloqueo-premium-item">&#10003; Sin limite de tiempo</div>
                <div class="prueba-bloqueo-premium-item">&#10003; Sincronizacion entre dispositivos</div>
                <div class="prueba-bloqueo-premium-item">&#10003; Soporte tecnico prioritario</div>
                <div class="prueba-bloqueo-premium-item">&#10003; Actualizaciones de por vida</div>
                <div class="prueba-bloqueo-premium-item">&#10003; Personalizacion para tu tienda</div>
            </div>
            <button class="prueba-bloqueo-btn" onclick="window.location.href='mailto:${JAM_EMAIL_VENTA}'">Enviar correo</button>
            <button class="prueba-bloqueo-btn-cerrar" onclick="if(window.AndroidBridge&&AndroidBridge.cerrarApp)AndroidBridge.cerrarApp();else window.close();">Cerrar</button>
        </div>`;
        document.body.appendChild(fondo);
    }

    function mostrarContadorPrueba(info) {
        if(!info || info.bloqueada) return;
        if(sessionStorage.getItem('jam_trial_popup_shown')) return;
        sessionStorage.setItem('jam_trial_popup_shown', '1');
        const overlay = document.createElement('div');
        overlay.className = 'prueba-contador-overlay';
        const pct = Math.round((info.diasRestantes / 30) * 100);
        const diasText = info.diasRestantes === 1 ? '1 dia' : info.diasRestantes + ' dias';
        const urgente = info.diasRestantes <= 7;
        overlay.innerHTML = `<div class="prueba-contador-caja">
            <div class="prueba-contador-header">
                <div class="prueba-contador-icono">&#128230;</div>
                <h2>JAM POS</h2>
                <span class="prueba-contador-tag">Version de Prueba</span>
            </div>
            <div class="prueba-contador-cuerpo">
                <div class="prueba-contador-numero ${urgente ? 'prueba-contador-urgente' : ''}">${info.diasRestantes}</div>
                <div class="prueba-contador-label">${diasText} restantes</div>
                <div class="prueba-contador-barra">
                    <div class="prueba-contador-barra-fill" style="width:${pct}%"></div>
                </div>
                <div class="prueba-contador-dias-total">30 dias de prueba</div>
            </div>
            <div class="prueba-contador-footer">
                <p>¿Necesitas la version completa?</p>
                <a href="mailto:${JAM_EMAIL_VENTA}" class="prueba-contador-email">${JAM_EMAIL_VENTA}</a>
                <button class="prueba-contador-btn" id="btnCerrarContador">Continuar usando</button>
            </div>
        </div>`;
        document.body.appendChild(overlay);
        overlay.querySelector('#btnCerrarContador').onclick = function() { overlay.remove(); };
    }

    function mostrarBannerPrueba(info) {
        if(!info || info.bloqueada) return;
        window._pruebaInfo = info;
        const home = document.querySelector('.home-container');
        if(!home) return;
        const existente = document.querySelector('.prueba-banner');
        if(existente) existente.remove();
        const b = document.createElement('div');
        b.className = 'prueba-banner';
        const diasText = info.diasRestantes === 1 ? '1 dia' : info.diasRestantes + ' dias';
        b.innerHTML = `<span>&#128274; Prueba — <b>${diasText}</b> restantes</span><a href="mailto:${JAM_EMAIL_VENTA}" class="prueba-banner-link">Version completa</a><button onclick="this.parentElement.remove()">&#10005;</button>`;
        home.prepend(b);
    }

    function sincronizarPrueba(info) {
        if(info.bloqueada) { window._pruebaInfo = null; mostrarBloqueoPrueba(); }
        else { mostrarBannerPrueba(info); mostrarContadorPrueba(info); }
    }

    function verificarPruebaInicio() {
        var TRIAL_DAYS = 30;
        var TRIAL_KEY = 'jam_trial_data';

        // Función local de verificación (funciona sin AndroidBridge)
        function verificarLocal() {
            var fecha = 0;
            try {
                var stored = localStorage.getItem(TRIAL_KEY);
                if (stored) {
                    try { fecha = JSON.parse(atob(stored)).f; } catch(e) {}
                }
            } catch(e) {}
            if (!fecha) {
                try {
                    var idbData = localStorage.getItem(TRIAL_KEY + '_idb');
                    if (idbData) {
                        try { fecha = JSON.parse(atob(idbData)).f; } catch(e) {}
                    }
                } catch(e) {}
            }
            if (!fecha) {
                fecha = Date.now();
                var encoded = btoa(JSON.stringify({ f: fecha, k: 'j27', v: 1 }));
                try { localStorage.setItem(TRIAL_KEY, encoded); } catch(e) {}
                try { localStorage.setItem(TRIAL_KEY + '_idb', encoded); } catch(e) {}
            }
            var diffDias = Math.floor((Date.now() - fecha) / 86400000);
            var diasRestantes = Math.max(0, TRIAL_DAYS - diffDias);
            return { bloqueada: diasRestantes <= 0, diasRestantes: diasRestantes, fechaInicio: fecha, tamper: false };
        }

        // Intentar con AndroidBridge primero, si no existe usar local
        var info;
        if (window.AndroidBridge && typeof AndroidBridge.esVersionPrueba === 'function' && AndroidBridge.esVersionPrueba()) {
            try { info = JSON.parse(AndroidBridge.verificarPrueba()); } catch(e) { info = verificarLocal(); }
        } else {
            info = verificarLocal();
        }
        sincronizarPrueba(info);
        if(info.bloqueada) { mostrarBloqueoPrueba(); return true; }
        window._pruebaInfo = info;
        return false;
    }
// ==================== INICIALIZACIÓN ====================
    // Bloquear orientación vertical cuando está instalado como PWA (standalone).
    // En navegador normal no aplica (screen.orientation.lock solo funciona en
    // pantalla completa / standalone) para no molestar al usuario.
    function bloquearOrientacionVertical() {
        if (window.matchMedia('(display-mode: standalone)').matches && screen.orientation && screen.orientation.lock) {
            screen.orientation.lock('portrait').catch(function(){});
        }
    }
    bloquearOrientacionVertical();
    // Bloquear menú contextual, selección y copia de texto (feeling nativo).
    (function bloquearCopiadoYSeleccion() {
        const editable = t => t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.isContentEditable);
        document.addEventListener('contextmenu', e => e.preventDefault());
        document.addEventListener('selectstart', e => { if(!editable(e.target)) e.preventDefault(); });
        document.addEventListener('copy', e => { if(!editable(e.target)) e.preventDefault(); });
        document.addEventListener('cut', e => { if(!editable(e.target)) e.preventDefault(); });
        document.addEventListener('dragstart', e => e.preventDefault());
    })();
    // Feedback háptico nativo al presionar botones
    (function setupHaptico() {
        if (!navigator.vibrate) return;
        document.addEventListener('pointerdown', function(e) {
            var t = e.target;
            if (t.closest('button,.btn-redondeado,.sidebar-item,.main-module-btn,.color-circle,.btn-editar-redondeado,.btn-eliminar-redondeado,.btn-verde-redondeado,#btnFinalizarVenta')) {
                navigator.vibrate(10);
            }
        }, { passive: true });
    })();
    loadAllData().then(() => {
        if(window.JAMSync && window.JAMSync.tryAutoReconnect){
            window.JAMSync.tryAutoReconnect().then(function(ok){
                if(ok) console.log('[APP] Sync reconectado automaticamente');
            });
        }
        if(verificarPruebaInicio()) return;
        if(kioscoVentas) {
            localStorage.setItem('jam_last_module', 'ventas');
            const irKiosco = () => { currentModule = 'ventas'; renderVentas(); actualizarTasa(false); };
            if(D.config.pin && D.config.pin.length === 4 && !sessionStorage.getItem('jam_pin_authed')) askPin(irKiosco);
            else irKiosco();
            return;
        }
        const lastModule = localStorage.getItem('jam_last_module');
        if(lastModule && lastModule !== 'home' && lastModule !== '' && window.navigateTo) {
            if(D.config.pin && D.config.pin.length === 4) {
                if(!sessionStorage.getItem('jam_pin_authed')) askPin(() => { renderHome(); window.navigateTo(lastModule); actualizarTasa(false); });
                else { renderHome(); setTimeout(() => window.navigateTo(lastModule), 50); actualizarTasa(false); }
            } else {
                renderHome();
                setTimeout(() => window.navigateTo(lastModule), 50);
                actualizarTasa(false);
            }
            return;
        }
        if(D.config.pin && D.config.pin.length === 4) {
            if(!sessionStorage.getItem('jam_pin_authed')) askPin(() => { renderHome(); actualizarTasa(false); });
            else { renderHome(); actualizarTasa(false); }
        } else {
            renderHome();
            actualizarTasa(false);
        }
    });
    
    // Detectar cambio de tamaño (rotación, resize escritorio)
    let resizeTimer;
    window.addEventListener('resize', () => {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(() => {
            actualizarModoLayout();
            if(currentModule === 'home' && document.activeElement?.id !== 'searchGlobalInput') renderHome();
        }, 300);
    });

    // Pantalla única de Ventas: al regresar de segundo plano siempre vuelve al módulo.
    document.addEventListener('visibilitychange', () => {
        if(!kioscoVentas) return;
        if(document.hidden) guardarSesionVenta();
        else if(currentModule !== 'ventas') { currentModule = 'ventas'; renderVentas(); }
    });