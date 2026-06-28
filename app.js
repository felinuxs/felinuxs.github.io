// ==================== UTILIDADES ====================
    const escapeHtml = s => s ? s.replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m])) : '';
    const fmtPrecio = v => { let num = Number(v); if(isNaN(num)) num = 0; let p = num.toFixed(2).split('.'); p[0] = p[0].replace(/\B(?=(\d{3})+(?!\d))/g, '.'); return p.join(','); };
    const fmtDolar = v => Number(v).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    const parseBs = v => parseFloat(String(v).replace(/\./g, '').replace(',', '.')) || 0;
    const esOscuro = c => { let r=parseInt(c.slice(1,3),16), g=parseInt(c.slice(3,5),16), b=parseInt(c.slice(5,7),16); return(.299*r + .587*g + .114*b) < 128; };
    const normalizeText = s => (s||'').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
    const capitalizeWords = s => s.replace(/\b\w/g, c => c.toUpperCase());
    function mostrarNotificacion(mensaje, tipo = 'info') { const notif = document.createElement('div'); notif.className = 'notificacion-flotante'; notif.style.backgroundColor = tipo === 'success' ? '#10b981' : (tipo === 'error' ? '#ef4444' : '#3b82f6'); notif.style.color = 'white'; notif.innerText = mensaje; document.body.appendChild(notif); setTimeout(() => notif.remove(), 3000); }
    
    // ==================== FUNCIÓN PARA TINTAR BARRA DE NAVEGACIÓN INFERIOR (ANDROID) ====================
    function setNavigationBarColor(color) {
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
    const STORAGE_KEYS = {
        productos: 'jam_pos_productos',
        clientes: 'jam_pos_clientes',
        proveedores: 'jam_pos_proveedores',
        gastos: 'jam_pos_gastos',
        empleados: 'jam_pos_empleados',
        ventas: 'jam_pos_ventas',
        config: 'jam_pos_config',
        session_cart: 'jam_pos_cart',
        session_meta: 'jam_pos_meta'
    };
    
    function loadFromStorage(key, defaultValue = []) { const data = localStorage.getItem(key); if (!data) return defaultValue; try { return JSON.parse(data); } catch(e) { return defaultValue; } }
    function saveToStorage(key, data) { localStorage.setItem(key, JSON.stringify(data)); }
    async function saveItem(store, item) {
        const key = STORAGE_KEYS[store];
        if (DATA_STORES.includes(store)) {
            D[store] = D[store] || [];
            const i = D[store].findIndex(x => x.id === item.id);
            if (i !== -1) D[store][i] = item; else D[store].push(item);
            await saveToIDB(store, D[store]);
            encolarSync(store, 'save', item);
        } else {
            const items = loadFromStorage(key, []);
            const idx = items.findIndex(x => x.id === item.id);
            if (idx !== -1) items[idx] = item; else items.push(item);
            saveToStorage(key, items);
            D[store] = items;
        }
    }
    async function deleteItem(store, id) {
        const key = STORAGE_KEYS[store];
        if (DATA_STORES.includes(store)) {
            D[store] = (D[store] || []).filter(x => x.id !== id);
            await saveToIDB(store, D[store]);
            encolarSync(store, 'delete', { id });
        } else {
            const items = loadFromStorage(key, []).filter(x => x.id !== id);
            saveToStorage(key, items);
            D[store] = items;
        }
    }
    async function getAll(store) {
        if (DATA_STORES.includes(store)) return await loadFromIDB(store);
        return loadFromStorage(STORAGE_KEYS[store], []);
    }
    
    // ==================== DATOS GLOBALES ====================
    let D = {
        productos: [], clientes: [], proveedores: [], gastos: [], empleados: [], ventas: [],
        config: { 
            key:'mainConfig', theme:'#3b82f6', dolarRate:67.85, lastUpdate:new Date().toLocaleDateString(), 
            ivaActivo:true, usarMargen:false, backgroundMode:'light', autoOscuro:false, prevenirCierre:true,
            mostrarDolar: true, tasaManual: false, tasaManualValue: 67.85,
            empresa: { nombre:'JAM POS', direccion:'', telefono:'', rif:'', logo:'' },
            alertaStockBajo: true, alertaTasa: true, sonidoAlertas: true
        }
    };
    let currentModule = 'home', volverBloqueado = false, timeoutTitulo = null;
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
        D.productos = await getAll('productos');
        D.clientes = await getAll('clientes');
        D.proveedores = await getAll('proveedores');
        D.gastos = await getAll('gastos');
        D.empleados = await getAll('empleados');
        D.ventas = await getAll('ventas');
        const savedConfig = localStorage.getItem(STORAGE_KEYS.config);
        if (savedConfig) try { D.config = { ...D.config, ...JSON.parse(savedConfig) }; } catch(e) {}
        if(!D.config.backgroundMode) D.config.backgroundMode = 'light';
        if(!D.config.empresa) D.config.empresa = { nombre:'JAM POS', direccion:'', telefono:'', rif:'', logo:'' };
        if(D.config.mostrarDolar === undefined) D.config.mostrarDolar = true;
        if(D.config.prevenirCierre === undefined) D.config.prevenirCierre = true;
        if(D.config.tasaManual === undefined) D.config.tasaManual = false;
        if(!D.config.tasaManualValue) D.config.tasaManualValue = D.config.dolarRate || 67.85;
        if(D.config.autoOscuro === undefined) D.config.autoOscuro = false;
        
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
    
    function getNavBarColorFromMode() {
        switch(D.config.backgroundMode) {
            case 'light': return '#ffffff';
            case 'gray': return '#2c2c2c';
            case 'dark': return '#000000';
            default: return '#ffffff';
        }
    }
    
    function applyTheme(){
        document.documentElement.style.setProperty('--accent', D.config.theme);
        document.body.className = '';
        document.body.classList.add(`${D.config.backgroundMode}-mode`);
        actualizarModoLayout();
        
        let navBarColor = getNavBarColorFromMode();
        
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
        statusBarMeta.setAttribute('content', D.config.backgroundMode === 'light' ? 'default' : 'black');
        
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
            saveConfig();
            actualizarDisplayTasa();
            return;
        }
        const tasaNueva = await obtenerTasaDesdeAPI();
        if (tasaNueva !== null) {
            D.config.dolarRate = tasaNueva;
            D.config.lastUpdate = new Date().toLocaleDateString() + " " + new Date().toLocaleTimeString();
            if (forzar && D.config.tasaManual) D.config.tasaManualValue = tasaNueva;
            saveConfig();
            if(forzar) mostrarNotificacion(`Tasa actualizada: ${fmtDolar(tasaNueva)} Bs/USD`, 'success');
        } else if(!D.config.dolarRate) D.config.dolarRate = 67.85;
        actualizarDisplayTasa();
    }
    
    function actualizarDisplayTasa() {
        if (D.config.mostrarDolar) {
            let span = document.getElementById('tasaDolarMostrar');
            if (span) span.innerText = fmtDolar(D.config.dolarRate);
            let tasaDisplay = document.getElementById('tasaActualDisplay');
            if(tasaDisplay) tasaDisplay.innerText = fmtDolar(D.config.dolarRate);
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
    
    // Control de navegacion movil: back siempre a home
    let salirCount = 0;
    window.addEventListener('beforeunload', function(e) {
        if (D.config?.prevenirCierre !== false) {
            guardarSesionVenta();
            e.preventDefault();
            e.returnValue = '';
            return '';
        }
    });
    
    history.pushState(null, null, location.href);
    window.addEventListener('popstate', function(e) {
        if (D.config?.prevenirCierre === false) return;
        if (currentModule !== 'home') {
            salirCount = 0;
            if (window.backToHome) window.backToHome();
            history.pushState(null, null, location.href);
        } else {
            salirCount++;
            if (salirCount >= 2) {
                if (confirm('Presiona OK para salir de la aplicacion')) {
                    if (window.close) window.close();
                }
                salirCount = 0;
            }
            history.pushState(null, null, location.href);
        }
    });
    
    // ==================== VENTAS ====================
    async function renderVentas(){
        let bloqueado = volverBloqueado, accent = D.config.theme;
        const html = `
            <div class="page-header-fixed"><div class="module-header"><h2 id="tituloModule" class="module-title ${bloqueado?'module-title-bloqueado':''}" style="color:${accent}" onmousedown="iniciarBloqueo(this,'Ventas')" onmouseup="cancelarBloqueo()" onmouseleave="cancelarBloqueo()">Ventas</h2><div id="btnVolverModule" class="btn-back ${bloqueado?'btn-back-bloqueado':''}" onclick="${bloqueado?'':'backToHome()'}">${bloqueado?'<i class="fas fa-lock"></i> Bloqueado':'<i class="fas fa-arrow-left"></i> Volver'}</div></div></div>
            <div class="page-container ventas-layout">
                <div class="ventas-top">
                    <div class="cliente-search-wrap"><label class="text-xs">Cliente</label>
                        <div class="cliente-wrapper">
                            <input type="text" id="clienteInput" placeholder="Buscar por nombre o cédula..." class="border rounded-xl p-2 w-full" autocomplete="off" value="${escapeHtml(clienteInputText)}">
                            <button id="btnNuevoClienteIcon" class="btn-nuevo-cliente-icon" title="Nuevo cliente"><i class="fas fa-plus"></i></button>
                        </div>
                        <div id="sugerenciasClientes" class="sugerencias-clientes hidden"></div>
                        <input type="hidden" id="clienteIdHidden" value="${clienteSeleccionadoId || ''}">
                    </div>
                    <div class="sugerencias-wrap"><div class="flex gap-2"><input type="text" id="buscarProducto" placeholder="Buscar por nombre o código de barras..." class="border-2 rounded-xl p-2 flex-1" style="border-color:${accent}" autocomplete="off"><button id="btnScanVentas" class="btn-redondeado px-3 flex-shrink-0" style="background:var(--accent,#3b82f6);color:#fff" title="Escanear con cámara">📷</button></div><div id="sugerencias" class="hidden"></div></div>
                </div>
                <div class="ventas-cart-scroll"><div id="carritoLista"></div></div>
                <div class="ventas-bottom">
                    <div class="p-3 rounded-xl" style="background:rgba(0,0,0,0.05)"><div class="border-b pb-2 mb-2"><div class="ticket-line"><span>SUBTOTAL</span><span id="subtotal">0,00 Bs</span></div>${D.config.ivaActivo?'<div class="ticket-line"><span>IVA (${D.config.ivaPorcentaje}%)</span><span id="iva">0,00 Bs</span></div>':''}<div class="ticket-line font-bold"><span>TOTAL</span><span id="total">0,00 Bs</span></div></div>
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
            let valor = item ? (item[key]||'') : '';
            let tipoInput = (key === 'cedula' || key === 'telefono') ? 'tel' : 'text';
            let valDisplay = (key === 'montoBs' || key === 'salarioBs') ? fmtPrecio(valor) : escapeHtml(valor.toString());
            camposHtml += `<div class="mb-3"><label>${nombres[key]||key}</label><input type="${tipoInput}" id="field${i}" value="${valDisplay}" class="border rounded-xl p-2 w-full" inputmode="${tipoInput === 'tel' ? 'numeric' : key === 'montoBs' || key === 'salarioBs' ? 'decimal' : 'text'}"></div>`;
        }
        modal.innerHTML = `<div class="modal-form-content"><h3 class="text-xl font-bold mb-4">${id ? 'Editar' : 'Nuevo'} ${store === 'clientes' ? 'Cliente' : 'Elemento'}</h3>${camposHtml}<div class="flex gap-3 mt-4"><button id="guardarCrud" class="btn-azul-redondeado btn-redondeado flex-1 py-2 font-bold">Guardar</button><button id="cancelarCrud" class="btn-redondeado flex-1 py-2 bg-gray-200">Cancelar</button></div></div>`;
        document.body.appendChild(modal);
        document.getElementById('cancelarCrud').onclick = () => modal.remove();
        document.getElementById('guardarCrud').onclick = async () => {
            let nuevo = { id: id || (store === 'clientes' ? 'c' : 'pr') + Date.now() + '_' + Date.now() };
            for(let i=0; i<campos.length; i++) {
                let val = document.getElementById(`field${i}`).value;
                nuevo[campos[i]] = (campos[i] === 'nombre' || campos[i] === 'concepto' || campos[i] === 'contacto' || campos[i] === 'cargo') ? capitalizeWords(val) : val;
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
    
    window.agregarAlCarrito = id => {
        let prod = D.productos.find(p => p.id === id);
        if(prod && prod.stock > 0){
            let ex = carrito.find(c => c.id === id);
            if(ex) ex.cantidad++;
            else carrito.push({...prod, cantidad:1});
            actualizarCarritoUI();
            let bp = document.getElementById('buscarProducto');
            if(bp){ bp.value = '';             document.getElementById('sugerencias')?.classList.add('hidden'); }
            guardarSesionVenta();
        }
    };
    
    // ==================== CÓDIGO DE BARRAS ====================
    window.agregarPorCodigoBarras = codigo => {
        if(!codigo) return;
        let prod = D.productos.find(p => p.codigo && normalizeText(p.codigo.toString()) === normalizeText(codigo));
        if(!prod) { mostrarNotificacion(`❌ Producto con código "${escapeHtml(codigo)}" no encontrado`, 'error'); return; }
        if(prod.stock <= 0) { mostrarNotificacion(`⚠️ Stock insuficiente para "${escapeHtml(prod.nombre)}"`, 'error'); return; }
        let ex = carrito.find(c => c.id === prod.id);
        if(ex) ex.cantidad++;
        else carrito.push({...prod, cantidad:1});
        actualizarCarritoUI();
        document.getElementById('buscarProducto').value = '';
        let sug = document.getElementById('sugerencias'); if(sug) sug.classList.add('hidden');
        guardarSesionVenta();
        mostrarNotificacion(`✅ Agregado: ${escapeHtml(prod.nombre)} × ${ex ? ex.cantidad : 1}`, 'success');
    };
    window.buscarPorCodigoInventario = codigo => {
        if(!codigo) return;
        let prod = D.productos.find(p => p.codigo && normalizeText(p.codigo.toString()) === normalizeText(codigo));
        if(!prod) { mostrarNotificacion(`❌ Producto con código "${escapeHtml(codigo)}" no encontrado`, 'error'); return; }
        document.getElementById('searchInv').value = normalizeText(prod.nombre).slice(0,30);
        renderListaProductos(normalizeText(prod.nombre).slice(0,30));
        document.getElementById('barcodeInvInput').value = '';
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
            let subit = it.precioVentaBs * it.cantidad;
            suma += subit;
            html += `<div class="flex justify-between text-sm py-1"><div>${escapeHtml(it.nombre)} x${it.cantidad}</div><div>${fmtPrecio(subit)} Bs <button onclick="eliminarDelCarrito(${i})" class="text-red-500 ml-2"><i class="fas fa-trash"></i></button></div></div>`;
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
        let status = document.getElementById('splitTotalStatus');
        if(status){
            let diff = totalPagos - totalVenta;
            if(Math.abs(diff) < 0.01) status.className = 'split-total-match ok';
            else status.className = 'split-total-match err';
            status.innerHTML = `Total asignado: ${fmtPrecio(totalPagos)} Bs ${Math.abs(diff) < 0.01 ? '✅' : `(faltan ${fmtPrecio(Math.abs(diff))} Bs)`}`;
        }
    }
    window.cambiarMetodoSplit = (i, v) => { pagosDivididos[i].metodo = v; renderPagosDivididosUI(); };
    window.cambiarMontoSplit = (i, v) => { pagosDivididos[i].monto = parseFloat(v) || 0; renderPagosDivididosUI(); };
    window.eliminarSplit = (i) => { if(pagosDivididos.length > 1) { pagosDivididos.splice(i,1); renderPagosDivididosUI(); } };
    
    function calcularCambio(){
        let pagado = parseFloat(document.getElementById('montoPagado')?.value || '0');
        let cambio = document.getElementById('cambioMensaje');
        if(!isNaN(pagado) && pagado >= totalVenta) cambio.innerHTML = `Cambio: ${fmtPrecio(pagado - totalVenta)} Bs`;
        else cambio.innerHTML = 'Monto insuficiente';
    }
    
    async function finalizarVenta(){
        if(carrito.length === 0) { alert("Carrito vacío"); return; }
        if(!confirm(`¿Desea finalizar la venta por ${fmtPrecio(totalVenta)} Bs?`)) return;
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
        let codigo = `${ahora.getFullYear()}${(ahora.getMonth()+1).toString().padStart(2,'0')}${ahora.getDate().toString().padStart(2,'0')}-${ahora.getHours().toString().padStart(2,'0')}${ahora.getMinutes().toString().padStart(2,'0')}${ahora.getSeconds().toString().padStart(2,'0')}`;
        let clienteId = document.getElementById('clienteIdHidden')?.value || null;
        let clienteNombre = "Cliente General";
        if(clienteId) {
            let clienteEncontrado = D.clientes.find(c => c.id === clienteId);
            if(clienteEncontrado) clienteNombre = clienteEncontrado.nombre;
        } else {
            let nombreIngresado = document.getElementById('clienteInput')?.value.trim();
            if(nombreIngresado) clienteNombre = nombreIngresado;
        }
        
        let itemsVenta = carrito.map(i => ({ idProducto: i.id, nombre: i.nombre, cantidad: i.cantidad, precioUnitario: i.precioVentaBs, costoUnitario: i.costoRealBs || 0, subtotal: i.precioVentaBs * i.cantidad, ganancia: (i.precioVentaBs - (i.costoRealBs || 0)) * i.cantidad }));
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
            pago: pagado, 
            cambio: pagado - totalVenta, 
            tipoPago: tipoPago,
            detallePagos: detallePagos
        };
        await saveItem('ventas', nuevaVenta);
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
        t += cen(new Date(venta.fecha).toLocaleString()) + '\n';
        t += cen('Ticket: ' + venta.id) + '\n';
        t += 'Cliente: ' + esc(venta.cliente) + '\n';
        t += eq + '\n';
        // Items: nombre a izq, precio a der
        venta.items.forEach(item => {
            let nom = item.cantidad + 'x ' + esc(item.nombre);
            let pre = fmtPrecio(item.subtotal) + ' Bs';
            t += padR(nom, W - 10) + padL(pre, 10) + '\n';
        });
        t += gui + '\n';
        t += padR('SUBTOTAL', W - 10) + padL(fmtPrecio(venta.subtotal) + ' Bs', 10) + '\n';
        if (venta.iva) t += padR('IVA (' + D.config.ivaPorcentaje + '%)', W - 10) + padL(fmtPrecio(venta.iva) + ' Bs', 10) + '\n';
        t += padR('TOTAL', W - 10) + padL(fmtPrecio(venta.total) + ' Bs', 10) + '\n';
        t += gui + '\n';
        t += padR('PAGO', W - 10) + padL(fmtPrecio(venta.pago) + ' Bs', 10) + '\n';
        t += padR('CAMBIO', W - 10) + padL(fmtPrecio(venta.cambio) + ' Bs', 10) + '\n';
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
    
    function mostrarTicket(venta) {
        const formasPago = { 'efectivo_bs':'EFECTIVO Bs','pago_movil':'PAGO MÓVIL','transferencia':'TRANSFERENCIA','tarjeta_debito':'TARJETA DÉBITO','dolares':'DÓLARES','pago_dividido':'PAGO DIVIDIDO' };
        const itemsHtml = venta.items.map(item => `<div class="item"><span>${item.cantidad}x ${escapeHtml(item.nombre)}</span><span>${fmtPrecio(item.subtotal)} Bs</span></div>`).join('');
        const logoHtml = D.config.empresa.logo ? `<div class="logo"><img src="${D.config.empresa.logo}" style="max-width:60px; max-height:60px;"></div>` : '';
        let formaPagoHtml = `<div class="ticket-line"><span>FORMA DE PAGO</span><span>${formasPago[venta.tipoPago] || venta.tipoPago}</span></div>`;
        if(venta.detallePagos){
            let etiqMetodo = {'efectivo_bs':'Efectivo Bs','dolares':'Dólares','tarjeta_debito':'Tarjeta Débito','transferencia':'Transferencia','pago_movil':'Pago Móvil'};
            let detalleHtml = venta.detallePagos.map(d => `<div class="ticket-line" style="font-size:9px"><span>${etiqMetodo[d.metodo]||d.metodo}</span><span>${fmtPrecio(d.monto)} Bs</span></div>`).join('');
            formaPagoHtml = `<div class="ticket-line" style="font-weight:bold"><span>FORMA DE PAGO</span><span>PAGO DIVIDIDO</span></div>${detalleHtml}`;
        }
        const ticketHtml = `<div class="ticket-virtual" id="ticketParaImprimir">${logoHtml}<div class="header"><h3>${escapeHtml(D.config.empresa.nombre)}</h3>${D.config.empresa.direccion ? `<p>${escapeHtml(D.config.empresa.direccion)}</p>` : ''}${D.config.empresa.telefono ? `<p>📞 ${escapeHtml(D.config.empresa.telefono)}</p>` : ''}${D.config.empresa.rif ? `<p>RIF: ${escapeHtml(D.config.empresa.rif)}</p>` : ''}<p>${new Date(venta.fecha).toLocaleString()}</p><p>Ticket: ${venta.id}</p><p>Cliente: ${escapeHtml(venta.cliente)}</p></div><div class="items">${itemsHtml}</div><div class="ticket-line"><span>SUBTOTAL</span><span>${fmtPrecio(venta.subtotal)} Bs</span></div>${venta.iva ? `<div class="ticket-line"><span>IVA (${D.config.ivaPorcentaje}%)</span><span>${fmtPrecio(venta.iva)} Bs</span></div>` : ''}<div class="ticket-line total"><span>TOTAL</span><span>${fmtPrecio(venta.total)} Bs</span></div><div class="ticket-line"><span>PAGO</span><span>${fmtPrecio(venta.pago)} Bs</span></div><div class="ticket-line"><span>CAMBIO</span><span>${fmtPrecio(venta.cambio)} Bs</span></div>${formaPagoHtml}<div class="footer"><p>¡Gracias por su compra!</p><p>${D.config.empresa.nombre}</p></div></div><div class="ticket-buttons"><button class="ticket-btn btn-print" onclick="window.imprimirTicketDirecto('${venta.id}')"><i class="fas fa-print"></i> Imprimir</button><button class="ticket-btn btn-wa" onclick="window.enviarTicketPorWhatsApp('${venta.id}')"><i class="fab fa-whatsapp"></i> WhatsApp</button><button class="ticket-btn btn-img" onclick="window.descargarTicketImagen()"><i class="fas fa-download"></i> Imagen</button><button class="ticket-btn btn-copy" onclick="window.copiarTicketTexto()"><i class="fas fa-copy"></i> Copiar</button><button class="ticket-btn btn-cerrar" onclick="window.cerrarTicketModalYVolverInicio()"><i class="fas fa-times"></i> Cerrar</button></div>`;
        const modal = document.createElement('div'); modal.className = 'modal-form';
        modal.innerHTML = `<div class="modal-form-content" style="max-width:350px; text-align:center;">${ticketHtml}</div>`;
        document.body.appendChild(modal);
        window.ticketActual = venta;
        window.modalTicketActual = modal;
        modal.onclick = e => { if(e.target === modal) window.cerrarTicketModalYVolverInicio(); };
    }
    
    window.cerrarTicketModalYVolverInicio = () => { if(window.modalTicketActual) { window.modalTicketActual.remove(); window.modalTicketActual = null; } };
    window.imprimirTicketDirecto = (ventaId) => { const venta = D.ventas.find(v => v.id === ventaId); if(venta) imprimirTicket(venta); };
    window.enviarTicketPorWhatsApp = (ventaId) => { const venta = D.ventas.find(v => v.id === ventaId); if(!venta) return; const formasPago = { 'efectivo_bs':'EFECTIVO Bs','pago_movil':'PAGO MÓVIL','transferencia':'TRANSFERENCIA','tarjeta_debito':'TARJETA DÉBITO','dolares':'DÓLARES','pago_dividido':'PAGO DIVIDIDO' }; const etiqMetodo = {'efectivo_bs':'Efectivo Bs','dolares':'Dólares','tarjeta_debito':'Tarjeta Débito','transferencia':'Transferencia','pago_movil':'Pago Móvil'}; let mensaje = `🏪 *${D.config.empresa.nombre}* 🏪\n`; if(D.config.empresa.direccion) mensaje += `📍 ${D.config.empresa.direccion}\n`; if(D.config.empresa.telefono) mensaje += `📞 ${D.config.empresa.telefono}\n`; mensaje += `━━━━━━━━━━━━━━━━━━━━\n📅 ${new Date(venta.fecha).toLocaleString()}\n🧾 *${venta.id}*\n👤 Cliente: ${venta.cliente}\n━━━━━━━━━━━━━━━━━━━━\n`; venta.items.forEach(item => { mensaje += `${item.cantidad}x ${item.nombre} → ${fmtPrecio(item.subtotal)} Bs\n`; }); mensaje += `━━━━━━━━━━━━━━━━━━━━\n💰 *SUBTOTAL:* ${fmtPrecio(venta.subtotal)} Bs\n`; if(venta.iva) mensaje += `📊 *IVA:* ${fmtPrecio(venta.iva)} Bs\n`; mensaje += `💵 *TOTAL:* ${fmtPrecio(venta.total)} Bs\n💸 *PAGO:* ${fmtPrecio(venta.pago)} Bs\n🔄 *CAMBIO:* ${fmtPrecio(venta.cambio)} Bs\n`; if(venta.detallePagos) { venta.detallePagos.forEach(d => { mensaje += `└ ${etiqMetodo[d.metodo]||d.metodo}: ${fmtPrecio(d.monto)} Bs\n`; }); } else { mensaje += `💳 *FORMA DE PAGO:* ${formasPago[venta.tipoPago] || venta.tipoPago}\n`; } mensaje += `━━━━━━━━━━━━━━━━━━━━\n🙏 ¡Gracias por su compra!\n${D.config.empresa.nombre}`; const telefono = prompt("📱 Ingrese el número de teléfono (ej: 584121234567):"); if(telefono) { let numeroLimpio = telefono.replace(/[^0-9]/g, ''); if(numeroLimpio.startsWith('0')) numeroLimpio = '58' + numeroLimpio.substring(1); if(!numeroLimpio.startsWith('58')) numeroLimpio = '58' + numeroLimpio; window.open(`https://wa.me/${numeroLimpio}?text=${encodeURIComponent(mensaje)}`, '_blank'); } };
    window.descargarTicketImagen = async () => { const ticket = document.getElementById('ticketParaImprimir'); if(!ticket) return; try { const canvas = await html2canvas(ticket, { scale: 2, backgroundColor: '#ffffff' }); const link = document.createElement('a'); link.download = `ticket_${Date.now()}.png`; link.href = canvas.toDataURL(); link.click(); } catch(e) { alert('Error al generar imagen'); } };
    window.copiarTicketTexto = () => { const ticket = document.getElementById('ticketParaImprimir'); if(!ticket) return; const texto = ticket.innerText; navigator.clipboard.writeText(texto).then(() => alert('✓ Ticket copiado')).catch(() => alert('Error al copiar')); };
    
    // ==================== NAVEGACIÓN CON PERSISTENCIA ====================
    window.navigateTo = m => {
        if(volverBloqueado && currentModule !== 'home') { mostrarOverlayBloqueo(); return; }
        if(currentModule === 'ventas') guardarSesionVenta();
        currentModule = m;
        if(m === 'ventas') renderVentas();
        else if(m === 'inventario') renderInventario();
        else if(m === 'clientes') renderCrud('clientes', 'Clientes', ['cedula','nombre','telefono','direccion','email']);
        else if(m === 'proveedores') renderCrud('proveedores', 'Proveedores', ['rif','nombre','telefono','contacto','direccion']);
        else if(m === 'gastos') renderCrud('gastos', 'Gastos', ['concepto','montoBs','categoria','fecha']);
        else if(m === 'empleados') renderCrud('empleados', 'Empleados', ['cedula','nombre','cargo','salarioBs','fechaContrato']);
        else if(m === 'reportes') renderReportes();
        else if(m === 'config') renderConfig();
        if(esDesktop()) renderSidebar();
    };
    
    function mostrarOverlayBloqueo() {
        const overlay = document.createElement('div'); overlay.className = 'modulo-bloqueado-overlay';
        overlay.innerHTML = `<div class="modulo-bloqueado-mensaje"><i class="fas fa-lock"></i><p><strong>Módulo Bloqueado</strong></p><p>Para desbloquear, mantén presionado el título del módulo por 2 segundos.</p><small>Modo profesional activado</small></div>`;
        document.body.appendChild(overlay);
        setTimeout(() => overlay.remove(), 2000);
    }
    
    window.backToHome = () => { if(!volverBloqueado){ if(currentModule === 'ventas') guardarSesionVenta(); renderHome(); } else mostrarOverlayBloqueo(); };
    
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
        {icon:"fa-palette", label:"Config", id:"config"}
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
        let accent = D.config.theme;
        let mostrarDolarHtml = D.config.mostrarDolar ? 
            `<div class="flex justify-center items-baseline gap-1 info-dinamica"><span id="tasaDolarMostrar" class="text-5xl font-black" style="color:${accent}">${fmtDolar(D.config.dolarRate)}</span><span class="text-2xl font-bold" style="color:${accent}">Bs/USD</span></div>` :
            `<div class="info-dinamica" style="text-align:center"></div>`;
        const enDesktop = esDesktop();
        const homeGridHtml = enDesktop ? `<div class="home-grid sidebar-hidden">` : `<div class="home-grid">`;
        document.getElementById('appRoot').innerHTML = `
            <div class="home-container">
                <div class="mb-4 relative">
                    <i class="fas fa-search absolute left-4 top-3.5 text-gray-400"></i>
                    <input type="text" id="searchGlobalInput" placeholder="Buscar productos, clientes..." class="w-full pl-10 pr-4 py-3 rounded-2xl border-2 shadow-sm" style="border-color:${accent}">
                    <div id="globalResults" class="absolute z-30 w-full mt-2 rounded-2xl shadow-xl max-h-72 overflow-auto hidden" style="border:1px solid var(--accent);"></div>
                </div>
                <div class="card-bcv">
                    <div class="led-converter" onclick="mostrarConvertidor()"><i class="fas fa-exchange-alt text-sm"></i></div>
                    <p class="text-xs font-bold">${D.config.mostrarDolar ? 'TIPO DE CAMBIO (USD → VES)' : 'FECHA'}</p>
                    ${mostrarDolarHtml}
                    <p class="text-[11px] mt-1">${D.config.mostrarDolar ? 'Actualizado: ' + D.config.lastUpdate : ''}</p>
                    <p class="text-[9px] opacity-70 mt-0.5">📡 ExchangeRate-API.com</p>
                </div>
                ${homeGridHtml}
                    ${MODULOS_SIDEBAR.map(m => `<button onclick="navigateTo('${m.id}')" class="main-module-btn" style="background:${accent};"><i class="fas ${m.icon}"></i><span>${m.label}</span></button>`).join('')}
                </div>
                <div class="text-center text-xs mt-4 opacity-60">${enDesktop ? 'Usa la barra lateral ' : ''}JAM POS v2.0</div>
            </div>
        `;
        actualizarModoLayout();
        document.getElementById('searchGlobalInput').addEventListener('input', e => globalSearch(e.target.value));
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
    }
    
    async function globalSearch(term){
        let div = document.getElementById('globalResults');
        if(term.length < 2){ div.classList.add('hidden'); return; }
        let norm = normalizeText(term);
        let prod = D.productos.filter(p => normalizeText(p.nombre).includes(norm) || (p.codigo && normalizeText(p.codigo).includes(norm)));
        let cli = D.clientes.filter(c => normalizeText(c.nombre).includes(norm));
        let html = '';
        prod.slice(0,5).forEach(p => {
            html += `<div class="global-result p-3 cursor-pointer border-b" style="border-bottom-color:var(--accent);">
                        <div class="font-bold">${escapeHtml(p.nombre)}</div>
                        <div class="text-sm flex justify-between flex-wrap">
                            <span>💰 ${fmtPrecio(p.precioVentaBs)} Bs</span>
                            <span>💵 $${p.precioVentaUsd}</span>
                            <span>📦 Stock: ${p.stock}</span>
                        </div>
                        <div class="flex gap-2 mt-2">
                            <button onclick="event.stopPropagation();editarProductoDesdeBusqueda('${p.id}')" class="btn-editar-redondeado">✏️ Editar</button>
                            <button onclick="event.stopPropagation();venderProductoDesdeBusqueda('${p.id}')" class="btn-verde-redondeado">🛒 Vender</button>
                        </div>
                    </div>`;
        });
        cli.slice(0,3).forEach(c => html += `<div class="global-result p-3 cursor-pointer" onclick="alert('👤 ${escapeHtml(c.nombre)} - ${escapeHtml(c.cedula||'')}')"><i class="fas fa-user mr-2"></i>${escapeHtml(c.nombre)}</div>`);
        if(!html) html = '<div class="p-3 text-center">Sin resultados</div>';
        div.innerHTML = html; div.classList.remove('hidden');
        if(window._closeGlobalSearch) { document.removeEventListener('click', window._closeGlobalSearch); }
        window._closeGlobalSearch = e => {
            let inp = document.getElementById('searchGlobalInput');
            if(!div.contains(e.target) && e.target !== inp && !inp?.contains(e.target)){ div.classList.add('hidden'); document.removeEventListener('click', window._closeGlobalSearch); window._closeGlobalSearch = null; }
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
        document.getElementById('appRoot').innerHTML = `<div class="page-header-fixed"><div class="module-header"><h2 id="tituloModule" class="module-title ${bloqueado?'module-title-bloqueado':''}" style="color:${accent}" onmousedown="iniciarBloqueo(this,'Inventario')" onmouseup="cancelarBloqueo()" onmouseleave="cancelarBloqueo()">Inventario</h2><div id="btnVolverModule" class="btn-back ${bloqueado?'btn-back-bloqueado':''}" onclick="${bloqueado?'':'backToHome()'}">${bloqueado?'<i class="fas fa-lock"></i> Bloqueado':'<i class="fas fa-arrow-left"></i> Volver'}</div></div></div><div class="page-container"><div class="mb-3 relative"><i class="fas fa-search absolute left-3 top-3 text-gray-400"></i><input type="text" id="searchInv" placeholder="Buscar producto..." class="pl-9 pr-3 py-2 border rounded-xl w-full"></div><div class="mb-3"><label class="text-xs font-semibold">📷 Código de barras</label><div class="flex gap-2"><input type="text" id="barcodeInvInput" placeholder="Escanee o escriba código..." class="border rounded-xl p-2 flex-1" autocomplete="off"><button id="btnScanInv" class="btn-redondeado px-3" style="background:var(--accent,#3b82f6);color:#fff" title="Escanear con cámara">📷</button></div></div><div class="batch-toolbar"><label class="flex items-center gap-2 text-sm"><input type="checkbox" id="selectAllCheckbox" class="select-all-checkbox" onchange="toggleSelectAll(this.checked)"> Seleccionar todo</label><button id="nuevoProducto" class="btn-azul-redondeado btn-redondeado py-2 px-4">+ Nuevo</button><button id="btnEditarLote" class="btn-azul-redondeado btn-redondeado py-2 px-4" onclick="editarSeleccionLote()" style="display:none">✏️ Editar selección</button><span id="batchCount" class="batch-count"></span></div><div id="listaProductos" class="scroll-area"></div></div>`;
        if(volverBloqueado) document.getElementById('btnVolverModule').onclick = () => mostrarOverlayBloqueo();
        document.getElementById('searchInv').addEventListener('input', e => renderListaProductos(e.target.value.toLowerCase()));
        document.getElementById('searchInv').addEventListener('keydown', e => { if(e.key === 'Enter') buscarPorCodigoInventario(e.target.value.trim()); });
        document.getElementById('barcodeInvInput').addEventListener('keydown', e => { if(e.key === 'Enter') buscarPorCodigoInventario(e.target.value.trim()); });
        if(!('ontouchstart' in window)) setTimeout(() => document.getElementById('barcodeInvInput')?.focus(), 300);
        document.getElementById('btnScanInv').onclick = () => abrirEscanerCamara('barcodeInvInput', cod => { document.getElementById('barcodeInvInput').value = cod; buscarPorCodigoInventario(cod); });
        document.getElementById('nuevoProducto').onclick = () => mostrarFormProducto(null);
        renderListaProductos('');
    }
    
    function renderListaProductos(filtro = ''){
        let norm = normalizeText(filtro);
        let filt = D.productos.filter(p => normalizeText(p.nombre).includes(norm) || (p.codigo && normalizeText(p.codigo).includes(norm)));
        let cont = document.getElementById('listaProductos'); if(!cont) return;
        cont.innerHTML = filt.map(p => {
            let checked = productosSeleccionados.has(p.id);
            return `<div class="product-card"><div class="flex items-start gap-2"><input type="checkbox" class="product-checkbox mt-1" data-id="${p.id}" ${checked?'checked':''} onchange="toggleProductoSeleccionado('${p.id}',this.checked)"><div class="flex-1"><div class="flex justify-between flex-wrap"><span class="font-bold">${escapeHtml(p.nombre)}</span><span class="text-xs">${escapeHtml(p.codigo||'')}</span></div><div class="text-sm">💰 ${fmtPrecio(p.precioVentaBs)} Bs / $${p.precioVentaUsd} | 📦 Stock: ${p.stock}</div><div class="text-xs break-words">🏷️ ${escapeHtml(p.categoria||'')} | 🚚 ${escapeHtml(p.proveedor||'—')}</div><div class="flex gap-2 mt-2"><button onclick="mostrarFormProducto('${p.id}')" class="btn-editar-redondeado">✏️ Editar</button><button onclick="copiarProducto('${p.id}')" class="btn-redondeado" style="background:var(--accent,#3b82f6);color:#fff;padding:4px 10px;font-size:12px">📋 Copiar</button><button onclick="eliminarProducto('${p.id}')" class="btn-eliminar-redondeado">🗑️ Eliminar</button></div></div></div></div>`;
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
    
    async function mostrarFormProducto(id, desdeBusqueda = false){
        let prod = id ? D.productos.find(p => p.id === id) : null;
        let esNuevo = !prod;
        let modal = document.createElement('div'); modal.className = 'modal-form';
        modal.innerHTML = `<div class="modal-form-content"><h3 class="text-xl font-bold mb-4">${esNuevo ? 'Nuevo Producto' : 'Editar Producto'}</h3><div class="mb-3"><label>Nombre</label><input id="nombre" value="${escapeHtml(prod?.nombre||'')}" class="border rounded-xl p-2 w-full"></div><div class="mb-3"><label>📷 Código de barras</label><div class="flex gap-2"><input id="codigo" value="${escapeHtml(prod?.codigo||'')}" class="border rounded-xl p-2 flex-1"><button id="btnScanProducto" class="btn-redondeado px-3" style="background:var(--accent,#3b82f6);color:#fff" title="Escanear con cámara">📷</button></div></div><div class="mb-3"><label>Categoría</label><input id="categoria" value="${escapeHtml(prod?.categoria||'')}" class="border rounded-xl p-2 w-full"></div><div class="mb-3"><label>Proveedor</label><input id="proveedor" value="${escapeHtml(prod?.proveedor||'')}" class="border rounded-xl p-2 w-full"></div><div class="mb-3"><label>Stock</label><input type="number" id="stock" value="${prod?.stock||0}" class="border rounded-xl p-2 w-full"></div><div class="mb-3"><label>Precio de Compra (Bs)</label><input type="text" id="compraBs" value="${fmtPrecio(prod?.costoRealBs||0)}" class="border rounded-xl p-2 w-full"></div><div class="mb-3"><label>Precio de Compra (USD)</label><input type="number" id="compraUsd" step="any" value="${prod?.costoRealUsd||''}" class="border rounded-xl p-2 w-full"></div><div class="mb-3"><label>Precio Venta (Bs)</label><input type="text" id="ventaBs" value="${fmtPrecio(prod?.precioVentaBs||0)}" class="border rounded-xl p-2 w-full"></div><div class="mb-3"><label>Precio Venta (USD)</label><input type="number" id="ventaUsd" step="any" value="${prod?.precioVentaUsd||''}" class="border rounded-xl p-2 w-full"></div><div class="flex gap-3 mt-4"><button id="guardarBtn" class="btn-azul-redondeado btn-redondeado flex-1 py-2 font-bold">Guardar</button><button id="cancelarBtn" class="btn-redondeado flex-1 py-2 bg-gray-200">Cancelar</button></div></div>`;
        document.body.appendChild(modal);
        document.getElementById('cancelarBtn').onclick = () => modal.remove();
        document.getElementById('btnScanProducto').onclick = () => abrirEscanerCamara('codigo', cod => { document.getElementById('codigo').value = cod; });
        let ventaBs = document.getElementById('ventaBs'), ventaUsd = document.getElementById('ventaUsd'), compraBs = document.getElementById('compraBs'), compraUsd = document.getElementById('compraUsd');
        let tasa = () => D.config.dolarRate;
        ventaBs.oninput = () => { let bs = parseBs(ventaBs.value); if(bs > 0) ventaUsd.value = (bs / tasa()).toFixed(2); };
        ventaUsd.oninput = () => { let usd = parseFloat(ventaUsd.value); if(!isNaN(usd) && usd > 0) ventaBs.value = fmtPrecio(usd * tasa()); };
        compraBs.oninput = () => { let bs = parseBs(compraBs.value); if(bs > 0) compraUsd.value = (bs / tasa()).toFixed(2); };
        compraUsd.oninput = () => { let usd = parseFloat(compraUsd.value); if(!isNaN(usd) && usd > 0) compraBs.value = fmtPrecio(usd * tasa()); };
        document.getElementById('guardarBtn').onclick = async () => {
            let precioVentaBs = parseBs(ventaBs.value);
            let precioVentaUsd = parseFloat(ventaUsd.value) || 0;
            let costoRealBs = parseBs(compraBs.value);
            let costoRealUsd = parseFloat(compraUsd.value) || 0;
            if(precioVentaBs <= 0 && precioVentaUsd > 0) precioVentaBs = precioVentaUsd * tasa();
            else if(precioVentaUsd <= 0 && precioVentaBs > 0) precioVentaUsd = precioVentaBs / tasa();
            precioVentaUsd = parseFloat(precioVentaUsd.toFixed(2));
            if(costoRealBs <= 0 && costoRealUsd > 0) costoRealBs = costoRealUsd * tasa();
            else if(costoRealUsd <= 0 && costoRealBs > 0) costoRealUsd = costoRealBs / tasa();
            costoRealUsd = parseFloat(costoRealUsd.toFixed(2));
            if(!document.getElementById('nombre').value.trim()) { alert('El nombre del producto es obligatorio'); return; }
            if(precioVentaBs <= 0) { alert('El precio de venta debe ser mayor a 0'); return; }
            let nombre = capitalizeWords(document.getElementById('nombre').value.trim());
            let nuevo = { id: esNuevo ? 'p'+Date.now() : prod.id, nombre, codigo: document.getElementById('codigo').value, categoria: document.getElementById('categoria').value, proveedor: document.getElementById('proveedor').value, stock: parseInt(document.getElementById('stock').value) || 0, precioVentaBs, precioVentaUsd, costoRealBs, costoRealUsd };
            await saveItem('productos', nuevo);
            modal.remove();
            if(desdeBusqueda) renderHome(); else renderInventario();
        };
    }
    
    window.eliminarProducto = async id => { if(confirm('¿Eliminar producto?')){ await deleteItem('productos', id); D.productos = D.productos.filter(p => p.id !== id); renderInventario(); } };
    
    window.copiarProducto = (id) => {
        let p = D.productos.find(x => x.id === id);
        if (!p) return;
        let h = new Date().getHours();
        let hoy = new Date().toLocaleDateString();
        let saludo = h < 12 ? '¡Buenos días' : h < 18 ? '¡Buenas tardes' : '¡Buenas noches';
        let hayStock = p.stock > 0;
        let bsPrecio = fmtPrecio(p.precioVentaBs);
        let usdPrecio = p.precioVentaUsd ? '$' + p.precioVentaUsd + ' USD' : '';
        let msg = `${saludo}, estimado cliente! 🌟\n\n${hayStock ? '📦 SÍ tenemos en existencia:' : '❌ Por ahora NO tenemos en stock este producto. Le avisaremos cuando se reponga.'}\n\n📌 *${p.nombre.toUpperCase()}*\n${p.codigo ? '🔖 Código: ' + p.codigo + '\n' : ''}${hayStock ? '💰 *Precio por unidad:*' : '💰 *Precio de referencia:*'} ${bsPrecio} Bs  |  ${usdPrecio}\n📅 Precio en Bs válido solo para el ${hoy} (sujeto a cambios tasa BCV).\n💵 El precio en USD se mantiene fijo.\n\n${hayStock ? '✅ Por favor confirme su pedido para gestionarlo con anticipación. Le enviaremos confirmación una vez verificado el pago. 🙏' : ''}`;
        navigator.clipboard.writeText(msg).then(() => mostrarNotificacion('✅ Copiado al portapapeles', 'success')).catch(() => {});
    };
    
    // ==================== CRUD GENÉRICO ====================
    async function renderCrud(store, titulo, campos){
        let bloqueado = volverBloqueado, accent = D.config.theme;
        let items = await getAll(store); D[store] = items;
        document.getElementById('appRoot').innerHTML = `<div class="page-header-fixed"><div class="module-header"><h2 id="tituloModule" class="module-title ${bloqueado?'module-title-bloqueado':''}" style="color:${accent}" onmousedown="iniciarBloqueo(this,'${titulo}')" onmouseup="cancelarBloqueo()" onmouseleave="cancelarBloqueo()">${titulo}</h2><div id="btnVolverModule" class="btn-back ${bloqueado?'btn-back-bloqueado':''}" onclick="${bloqueado?'':'backToHome()'}">${bloqueado?'<i class="fas fa-lock"></i> Bloqueado':'<i class="fas fa-arrow-left"></i> Volver'}</div></div></div><div class="page-container"><div class="mb-3 relative"><i class="fas fa-search absolute left-3 top-3 text-gray-400"></i><input type="text" id="searchCrud" placeholder="Buscar..." class="pl-9 pr-3 py-2 border rounded-xl w-full"></div><button id="agregarBtn" class="btn-azul-redondeado btn-redondeado mb-4 py-2 px-4">+ Agregar ${titulo}</button><div id="listaCrud" class="scroll-area"></div></div>`;
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
                else if(store === 'gastos') detalles = `<div class="text-xs text-gray-500 mt-1">💰 ${fmtPrecio(i.montoBs||0)} Bs | 📅 ${escapeHtml(i.fecha||'')}</div>`;
                else if(store === 'empleados') detalles = `<div class="text-xs text-gray-500 mt-1">💼 ${escapeHtml(i.cargo||'')} | 💵 ${fmtPrecio(i.salarioBs||0)} Bs</div>`;
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
        if(confirm('¿Eliminar este elemento?')){
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
    function generarDiasSemana(){
        let dias = [];
        for(let i=6; i>=0; i--){
            let d = new Date(); d.setDate(d.getDate()-i);
            dias.push({ fecha: msToDateStr(d.getTime()), label: d.toLocaleDateString('es-ES',{weekday:'short'}), ventas: [] });
        }
        return dias;
    }
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
            let H = 160;
            canvas.width = W * 2; canvas.height = H * 2;
            canvas.style.width = W + 'px'; canvas.style.height = H + 'px';
            ctx.scale(2,2);
            let accent = D.config.theme;
            let maxVal = Math.max(...dias.map(d => d.ventas.reduce((a,b)=>a+b,0)), 1);
            let barW = Math.max(16, (W - 40) / dias.length - 8);
            let gap = 8;
            ctx.clearRect(0,0,W,H);
            dias.forEach((d,i) => {
                let val = d.ventas.reduce((a,b)=>a+b,0);
                let barH = (val / maxVal) * (H - 30);
                let x = 20 + i * (barW + gap) + (W - 40 - dias.length*(barW+gap) + gap)/2;
                let y = H - 10 - barH;
                ctx.fillStyle = accent;
                ctx.beginPath();
                ctx.roundRect(x, y, barW, barH, [4,4,0,0]);
                ctx.fill();
                ctx.fillStyle = getComputedStyle(document.body).color;
                ctx.font = '9px sans-serif';
                ctx.textAlign = 'center';
                ctx.fillText(d.label, x + barW/2, H - 2);
                if(val > 0){
                    ctx.fillStyle = accent;
                    ctx.font = 'bold 8px sans-serif';
                    ctx.fillText(fmtPrecio(val), x + barW/2, y - 3);
                }
            });
        }, 50);
    }
    async function renderReportes(){
        let ventas = await getAll('ventas');
        let totalVentas = ventas.reduce((a,b)=>a+(b.total||0),0);
        let totalGanancia = ventas.reduce((a,b)=>a+(b.gananciaTotal||0),0);
        let totalGastos = D.gastos.reduce((a,b)=>a+(b.montoBs||0),0);
        let utilidad = totalGanancia - totalGastos;
        let hoy = msToDateStr(Date.now());
        let ventasHoy = ventas.filter(v => msToDateStr(v.timestamp || new Date(v.fecha).getTime()) === hoy);
        let totalHoy = ventasHoy.reduce((a,b)=>a+(b.total||0),0);
        let gananciaHoy = ventasHoy.reduce((a,b)=>a+(b.gananciaTotal||0),0);
        let gastosHoy = D.gastos.reduce((a,b)=>a+(b.montoBs||0),0);
        let utilidadHoy = gananciaHoy - gastosHoy;
        let clientesUnicos = new Set(ventas.map(v => v.clienteId)).size;
        let stockBajo = D.productos.filter(p => p.stock < 5).length;
        let formasPago = { 'efectivo_bs':'EFECTIVO Bs','pago_movil':'PAGO MÓVIL','transferencia':'TRANSFERENCIA','tarjeta_debito':'TARJETA DÉBITO','dolares':'DÓLARES','pago_dividido':'PAGO DIVIDIDO' };
        let bloqueado = volverBloqueado, accent = D.config.theme;
        document.getElementById('appRoot').innerHTML = `
            <div class="page-header-fixed"><div class="module-header"><h2 id="tituloModule" class="module-title ${bloqueado?'module-title-bloqueado':''}" style="color:${accent}" onmousedown="iniciarBloqueo(this,'Reportes')" onmouseup="cancelarBloqueo()" onmouseleave="cancelarBloqueo()">Reportes</h2><div id="btnVolverModule" class="btn-back ${bloqueado?'btn-back-bloqueado':''}" onclick="${bloqueado?'':'backToHome()'}">${bloqueado?'<i class="fas fa-lock"></i> Bloqueado':'<i class="fas fa-arrow-left"></i> Volver'}</div></div></div>
            <div class="page-container">
                <div class="kpi-grid">
                    <div class="kpi-card"><div class="kpi-icon">💰</div><div class="kpi-value">${fmtPrecio(totalHoy)} Bs</div><div class="kpi-label">Ventas hoy</div></div>
                    <div class="kpi-card"><div class="kpi-icon">📈</div><div class="kpi-value">${fmtPrecio(gananciaHoy)} Bs</div><div class="kpi-label">Ganancia hoy</div></div>
                    <div class="kpi-card"><div class="kpi-icon">📊</div><div class="kpi-value">${fmtPrecio(utilidadHoy)} Bs</div><div class="kpi-label">Utilidad hoy</div></div>
                    <div class="kpi-card"><div class="kpi-icon">🧾</div><div class="kpi-value">${ventasHoy.length}</div><div class="kpi-label">Ventas hoy (cnt)</div></div>
                    <div class="kpi-card"><div class="kpi-icon">📦</div><div class="kpi-value">${fmtPrecio(totalVentas)} Bs</div><div class="kpi-label">Ventas totales</div></div>
                    <div class="kpi-card"><div class="kpi-icon">📈</div><div class="kpi-value">${fmtPrecio(totalGanancia)} Bs</div><div class="kpi-label">Ganancia bruta total</div></div>
                    <div class="kpi-card"><div class="kpi-icon">💸</div><div class="kpi-value">${fmtPrecio(totalGastos)} Bs</div><div class="kpi-label">Gastos totales</div></div>
                    <div class="kpi-card"><div class="kpi-icon">📊</div><div class="kpi-value">${fmtPrecio(utilidad)} Bs</div><div class="kpi-label">Utilidad neta total</div></div>
                    <div class="kpi-card"><div class="kpi-icon">👥</div><div class="kpi-value">${clientesUnicos}</div><div class="kpi-label">Clientes</div></div>
                    <div class="kpi-card ${stockBajo > 0 ? 'kpi-low-stock' : ''}"><div class="kpi-icon">⚠️</div><div class="kpi-value">${stockBajo}</div><div class="kpi-label">Stock bajo (&lt;5)</div></div>
                </div>
                <div class="chart-container"><canvas id="chartVentas"></canvas></div>
                <h3 class="font-bold mb-2">Últimas ventas</h3>
                <div class="max-h-64 overflow-auto">${ventas.slice().reverse().map(v => `<div class="border rounded-xl p-3 mb-2 cursor-pointer hover:opacity-80" style="border-color:var(--accent)" onclick="window.mostrarTicketDesdeReporte('${v.id}')"><div class="flex justify-between items-start"><div><b>${escapeHtml(v.id)}</b></div><div class="text-xs opacity-60">${escapeHtml(v.fecha)}</div></div><div class="text-sm mt-1">👤 ${escapeHtml(v.cliente)}</div><div class="flex justify-between items-center mt-1"><span class="text-sm font-bold" style="color:var(--accent)">${fmtPrecio(v.total)} Bs</span><span class="text-xs">${formasPago[v.tipoPago] || v.tipoPago}</span></div><div class="text-xs mt-1 opacity-60">${v.items.map(i=>`${escapeHtml(i.nombre)} x${i.cantidad}`).join(', ')}</div></div>`).join('')}</div>
            </div>`;
        if(volverBloqueado) document.getElementById('btnVolverModule').onclick = () => mostrarOverlayBloqueo();
        renderGraficoVentas(ventas);
    }
    
    window.mostrarTicketDesdeReporte = (ventaId) => {
        let venta = D.ventas.find(v => v.id === ventaId);
        if(venta) mostrarTicket(venta);
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
    async function obtenerTodosLosDatos(){
        let stores = ['productos','clientes','proveedores','gastos','empleados','ventas'];
        let data = { config: D.config, timestamp: new Date().toISOString(), version: '1.0' };
        for (const s of stores) { data[s] = await getAll(s); }
        return data;
    }
    async function exportarBackupJSON(){
        let data = await obtenerTodosLosDatos();
        let blob = new Blob([JSON.stringify(data, null, 2)], {type: 'application/json'});
        let url = URL.createObjectURL(blob);
        let a = document.createElement('a'); a.href = url;
        a.download = `jampos_backup_${new Date().toISOString().slice(0,10)}.json`;
        a.click(); URL.revokeObjectURL(url);
        mostrarNotificacion('✅ Backup JSON descargado', 'success');
    }
    async function exportarBackupCSV(){
        let data = await obtenerTodosLosDatos();
        let csvLines = ['# JAM POS - Exportación CSV', `# Generado: ${data.timestamp}`, ''];
        let stores = ['productos','clientes','proveedores','gastos','empleados','ventas'];
        stores.forEach(s => {
            if(data[s].length === 0) return;
            csvLines.push(`# === ${s.toUpperCase()} ===`);
            csvLines.push(Object.keys(data[s][0]).join(','));
            data[s].forEach(item => {
                let row = Object.values(item).map(v => {
                    if(v === null || v === undefined) return '';
                    let str = String(v);
                    if(str.includes(',') || str.includes('"') || str.includes('\n')) str = '"' + str.replace(/"/g, '""') + '"';
                    return str;
                }).join(',');
                csvLines.push(row);
            });
            csvLines.push('');
        });
        let blob = new Blob([csvLines.join('\n')], {type: 'text/csv;charset=utf-8;'});
        let url = URL.createObjectURL(blob);
        let a = document.createElement('a'); a.href = url;
        a.download = `jampos_export_${new Date().toISOString().slice(0,10)}.csv`;
        a.click(); URL.revokeObjectURL(url);
        mostrarNotificacion('✅ CSV exportado (ábralo con Excel)', 'success');
    }
    function importarBackupJSON(file){
        let reader = new FileReader();
        reader.onload = async function(e){
            try {
                let data = JSON.parse(e.target.result);
                if(!data.config || !data.productos) { alert('Archivo JSON no válido'); return; }
                let stores = ['productos','clientes','proveedores','gastos','empleados','ventas'];
                let confirmacion = confirm(`¿Restaurar datos? Se sobrescribirán ${data.productos.length} productos, ${data.ventas.length} ventas y más.`);
                if(!confirmacion) return;
                for(let s of stores){
                    if(data[s]) {
                        D[s] = data[s];
                        if (DATA_STORES.includes(s)) await saveToIDB(s, data[s]);
                        else localStorage.setItem(STORAGE_KEYS[s], JSON.stringify(data[s]));
                    }
                }
                if(data.config) { D.config = data.config; saveToStorage(STORAGE_KEYS.config, D.config); }
                mostrarNotificacion('✅ Datos restaurados correctamente', 'success');
                if(currentModule === 'home') renderHome(); else renderConfig();
            } catch(err) { alert('Error al leer el archivo: ' + err.message); }
        };
        reader.readAsText(file);
    }
    function importarBackupCSV(file){
        let reader = new FileReader();
        reader.onload = async function(e){
            try {
                let text = e.target.result.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
                let lines = text.split('\n');
                let data = { config: null, productos: [], clientes: [], proveedores: [], gastos: [], empleados: [], ventas: [] };
                let storeMap = { 'PRODUCTOS':'productos','CLIENTES':'clientes','PROVEEDORES':'proveedores','GASTOS':'gastos','EMPLEADOS':'empleados','VENTAS':'ventas' };
                let currentStore = null, headers = null;
                let stores = ['productos','clientes','proveedores','gastos','empleados','ventas'];
                for(let line of lines){
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
                        let val = values[i] || '';
                        if(val === 'true') val = true;
                        else if(val === 'false') val = false;
                        else if(val !== '' && !isNaN(val) && val.indexOf(',') === -1) val = Number(val);
                        row[h] = val;
                    });
                    data[currentStore].push(row);
                }
                let totalItems = stores.reduce((s,store) => s + data[store].length, 0);
                if(totalItems === 0) { alert('No se encontraron datos en el archivo CSV'); return; }
                if(!confirm(`¿Restaurar datos desde CSV? Se cargarán:\n${stores.filter(s=>data[s].length).map(s=>`  • ${s}: ${data[s].length} registros`).join('\n')}`)) return;
                for(let s of stores){
                    if(data[s].length) {
                        D[s] = data[s];
                        if (DATA_STORES.includes(s)) await saveToIDB(s, data[s]);
                        else localStorage.setItem(STORAGE_KEYS[s], JSON.stringify(data[s]));
                    }
                }
                mostrarNotificacion('✅ Datos restaurados desde CSV correctamente', 'success');
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
            if(D.config.sonidoAlertas) reproducirSonidoAlerta();
        }
    }
    function notificarTasaActualizada(tasaAnterior, tasaNueva){
        if(!D.config.alertaTasa) return;
        let diff = Math.abs(tasaNueva - tasaAnterior);
        if(diff > 0.5){
            mostrarNotificacion(`💱 La tasa USD cambió: ${fmtDolar(tasaAnterior)} → ${fmtDolar(tasaNueva)} Bs`, 'info');
            if(D.config.sonidoAlertas) reproducirSonidoAlerta();
        }
    }
    let _tasaAnterior = D.config.dolarRate;

    
    // ==================== CONFIGURACIÓN ====================
    async function renderConfig(){
        let colores = ['#3b82f6','#8b5cf6','#10b981','#f59e0b','#ef4444','#ec4899','#000000','#22c55e','#a855f7','#f97316','#ff69b4','#00ced1'];
        let fondos = [{id:'light',nombre:'Blanco'},{id:'gray',nombre:'Grisáceo'},{id:'dark',nombre:'Negro'}];
        let bloqueado = volverBloqueado, accent = D.config.theme;
        let html = `
            <div class="page-header-fixed"><div class="module-header"><h2 id="tituloModule" class="module-title ${bloqueado?'module-title-bloqueado':''}" style="color:${accent}" onmousedown="iniciarBloqueo(this,'Configuración')" onmouseup="cancelarBloqueo()" onmouseleave="cancelarBloqueo()">Configuración</h2><div id="btnVolverModule" class="btn-back ${bloqueado?'btn-back-bloqueado':''}" onclick="${bloqueado?'':'backToHome()'}">${bloqueado?'<i class="fas fa-lock"></i> Bloqueado':'<i class="fas fa-arrow-left"></i> Volver'}</div></div></div>
            <div class="page-container">
                <div class="config-section"><button id="btnToggleEmpresa" class="btn-azul-redondeado btn-redondeado w-full mb-2 py-2">🏢 Datos de la Empresa</button><div id="panelEmpresa" style="display:none;" class="mt-2 config-inner"><div class="mb-2"><label>Nombre de la tienda</label><input type="text" id="empresaNombre" value="${escapeHtml(D.config.empresa.nombre)}" class="border rounded-xl p-2 w-full"></div><div class="mb-2"><label>Dirección</label><input type="text" id="empresaDireccion" value="${escapeHtml(D.config.empresa.direccion)}" class="border rounded-xl p-2 w-full"></div><div class="mb-2"><label>Teléfono</label><input type="text" id="empresaTelefono" value="${escapeHtml(D.config.empresa.telefono)}" class="border rounded-xl p-2 w-full"></div><div class="mb-2"><label>RIF</label><input type="text" id="empresaRif" value="${escapeHtml(D.config.empresa.rif)}" class="border rounded-xl p-2 w-full"></div><div class="mb-2"><label>Logo (URL o emoji)</label><input type="text" id="empresaLogo" value="${escapeHtml(D.config.empresa.logo)}" placeholder="🛍️ o URL de imagen" class="border rounded-xl p-2 w-full"></div><button id="guardarEmpresa" class="btn-azul-redondeado btn-redondeado w-full mt-2 py-2">💾 Guardar datos empresa</button></div></div>
                <div class="config-section"><button id="btnToggleTasa" class="btn-azul-redondeado btn-redondeado w-full mb-2 py-2">💰 Tasa de Cambio (USD/BS)</button><div id="panelTasa" style="display:none;" class="mt-2 config-inner">
                    <div class="mb-3">
                        <div class="bg-gray-100 dark:bg-gray-800 p-3 rounded-lg mb-3">
                            <div class="flex justify-between items-center">
                                <span class="font-semibold">API activa:</span>
                                <span class="text-xs font-mono">ExchangeRate-API.com</span>
                            </div>
                            <div class="flex justify-between items-center mt-2">
                                <span>Tasa actual:</span>
                                <span id="tasaActualDisplay" class="font-mono text-xl font-bold" style="color:${accent}">${fmtDolar(D.config.dolarRate)}</span>
                                <span>Bs/USD</span>
                            </div>
                            <div class="text-xs text-gray-500 mt-1">Actualizado: ${D.config.lastUpdate}</div>
                        </div>
                        <div class="flex flex-col gap-3">
                            <label class="flex items-center gap-2 cursor-pointer">
                                <input type="checkbox" id="modoManualCheck" ${D.config.tasaManual ? 'checked' : ''}> 
                                <span>🔒 Usar tasa manual (fija, sin internet)</span>
                            </label>
                            <div id="tasaManualDiv" style="${D.config.tasaManual ? 'display:flex' : 'display:none'}" class="flex gap-2 items-center">
                                <input type="number" id="tasaManualInput" step="0.01" value="${D.config.tasaManualValue}" placeholder="Ej: 68.50" class="border rounded-xl p-2 flex-1">
                                <button id="guardarTasaManualBtn" class="btn-azul-redondeado btn-redondeado py-2 px-4">Fijar</button>
                            </div>
                            <button id="actualizarTasaInternetBtn" class="btn-redondeado py-2 px-4" style="background:#3b82f6; color:white;">
                                🌐 Actualizar desde Internet (ExchangeRate-API)
                            </button>
                            <div class="text-xs text-gray-500 mt-2">
                                ℹ️ La API se actualiza automáticamente. ${!D.config.tasaManual ? '✅ Modo AUTOMÁTICO activado' : '🔒 Modo MANUAL activado'}
                            </div>
                        </div>
                    </div>
                </div></div>
                <div class="config-section"><button id="btnToggleOpciones" class="btn-azul-redondeado btn-redondeado w-full mb-2 py-2">⚙️ Opciones generales</button><div id="panelOpciones" style="display:none;" class="mt-2 config-inner"><div class="flex flex-wrap justify-center gap-4"><label class="flex items-center gap-2"><span class="font-semibold">IVA (${D.config.ivaPorcentaje}%)</span><input type="checkbox" id="toggleIVA" ${D.config.ivaActivo?'checked':''}></label><label class="flex items-center gap-2"><span class="font-semibold">Prevenir cierre</span><input type="checkbox" id="togglePrevenirCierre" ${D.config.prevenirCierre?'checked':''}></label><label class="flex items-center gap-2"><span class="font-semibold">Mostrar Dólar</span><input type="checkbox" id="toggleMostrarDolar" ${D.config.mostrarDolar?'checked':''}></label><label class="flex items-center gap-2"><span class="font-semibold">🌓 Auto oscuro</span><input type="checkbox" id="toggleAutoOscuro" ${D.config.autoOscuro?'checked':''}></label></div><p class="text-xs text-center mt-2 opacity-60">Al activar, el fondo oscuro se sincroniza automáticamente con el modo del sistema</p><hr class="my-3 opacity-20"><h4 class="font-bold text-sm mb-2 text-center">🔔 Alertas inteligentes</h4><div class="flex flex-wrap justify-center gap-4"><label class="flex items-center gap-2"><span class="font-semibold">Stock bajo</span><input type="checkbox" id="toggleAlertaStock" ${D.config.alertaStockBajo?'checked':''}></label><label class="flex items-center gap-2"><span class="font-semibold">Cambio tasa USD</span><input type="checkbox" id="toggleAlertaTasa" ${D.config.alertaTasa?'checked':''}></label><label class="flex items-center gap-2"><span class="font-semibold">🔊 Sonido</span><input type="checkbox" id="toggleSonidoAlertas" ${D.config.sonidoAlertas?'checked':''}></label></div><p class="text-xs text-center mt-2 opacity-60">Las alertas aparecen como notificaciones al iniciar y al realizar acciones clave</p></div></div></div>
                <div class="config-section"><button id="btnToggleSeguridad" class="btn-azul-redondeado btn-redondeado w-full mb-2 py-2">🔒 Seguridad (PIN)</button><div id="panelSeguridad" style="display:none;" class="mt-2 config-inner"><div class="mb-2"><label>PIN de acceso (4 dígitos, dejar vacío para deshabilitar)</label><input type="password" id="pinInput" value="${escapeHtml(D.config.pin)}" maxlength="4" pattern="[0-9]*" inputmode="numeric" class="border rounded-xl p-2 w-full text-center text-2xl tracking-widest" placeholder="****"></div><button id="guardarPinBtn" class="btn-azul-redondeado btn-redondeado w-full py-2">🔐 Guardar PIN</button><p class="text-xs text-center mt-2 opacity-60">${D.config.pin ? '✅ PIN activo. Se pedirá al abrir la app.' : 'ℹ️ Sin PIN. Cualquiera puede acceder.'}</p></div></div>
                <div class="config-section"><button id="btnToggleColores" class="btn-azul-redondeado btn-redondeado w-full mb-2 py-2">🎨 Temas de color</button><div id="panelColores" style="display:none;" class="mt-2 config-inner"><div class="flex flex-wrap justify-center gap-2" id="paletaColores"></div></div></div>
                <div class="config-section"><button id="btnToggleFondos" class="btn-azul-redondeado btn-redondeado w-full mb-2 py-2">🖌️ Fondos de contraste</button><div id="panelFondos" style="display:none;" class="mt-2 config-inner"><div class="flex justify-center gap-4 flex-wrap">${fondos.map(f => `<div class="bg-option ${D.config.backgroundMode===f.id?'selected':''}" style="background:${f.id==='light'?'#ffffff':f.id==='gray'?'#2c2c2c':'#000000'}; border:2px solid var(--accent);" data-mode="${f.id}"><div class="text-center text-xs" style="color:${f.id==='light'?'#000':'#fff'}">${f.nombre}</div></div>`).join('')}</div></div></div>
                <div class="config-section"><button id="btnToggleBackup" class="btn-azul-redondeado btn-redondeado w-full mb-2 py-2">💾 Copia de seguridad</button><div id="panelBackup" style="display:none;" class="mt-2 config-inner"><div class="flex flex-col gap-3"><button id="exportJsonBtn" class="btn-redondeado py-2 px-4" style="background:#3b82f6;color:#fff">📥 Exportar todo (JSON)</button><button id="exportCsvBtn" class="btn-redondeado py-2 px-4" style="background:#10b981;color:#fff">📥 Exportar todo (CSV / Excel)</button><button id="importJsonBtn" class="btn-redondeado py-2 px-4" style="background:#8b5cf6;color:#fff">📤 Importar desde JSON</button><button id="importCsvBtn" class="btn-redondeado py-2 px-4" style="background:#f59e0b;color:#fff">📤 Importar desde CSV / Excel</button><input type="file" id="importFileInput" accept=".json" style="display:none"><input type="file" id="importCsvFileInput" accept=".csv,.xlsx,.xls,.txt" style="display:none"><p class="text-xs text-center mt-2 opacity-60">Los archivos CSV se abren directamente en Excel</p></div></div></div>
                <div class="mt-4 text-xs text-center">💰 POS Profesional - Datos locales</div>
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
        toggle('btnToggleFondos', 'panelFondos');
        toggle('btnToggleBackup', 'panelBackup');
        
        const modoManualCheck = document.getElementById('modoManualCheck');
        const tasaManualDiv = document.getElementById('tasaManualDiv');
        const tasaManualInput = document.getElementById('tasaManualInput');
        const guardarTasaManualBtn = document.getElementById('guardarTasaManualBtn');
        const actualizarInternetBtn = document.getElementById('actualizarTasaInternetBtn');
        
        modoManualCheck.addEventListener('change', (e) => {
            D.config.tasaManual = e.target.checked;
            if (e.target.checked) {
                D.config.dolarRate = D.config.tasaManualValue;
                D.config.lastUpdate = new Date().toLocaleDateString() + " (Manual)";
                tasaManualDiv.style.display = 'flex';
            } else {
                tasaManualDiv.style.display = 'none';
                D.config.lastUpdate = "Pendiente de actualización automática";
            }
            saveConfig();
            document.getElementById('tasaActualDisplay').innerText = fmtDolar(D.config.dolarRate);
            actualizarInfoCard();
        });
        
        document.getElementById('guardarPinBtn').onclick = () => {
            let pin = document.getElementById('pinInput').value.replace(/\D/g, '').slice(0, 4);
            document.getElementById('pinInput').value = pin;
            D.config.pin = pin;
            saveConfig();
            renderConfig();
            mostrarNotificacion(pin ? '🔒 PIN guardado. Se pedirá al abrir la app.' : '🔓 PIN eliminado. Acceso sin restricciones.', 'success');
        };

        guardarTasaManualBtn.onclick = () => {
            const nuevoValor = parseFloat(tasaManualInput.value);
            if (!isNaN(nuevoValor) && nuevoValor > 0) {
                D.config.tasaManualValue = nuevoValor;
                if (D.config.tasaManual) {
                    D.config.dolarRate = nuevoValor;
                    D.config.lastUpdate = new Date().toLocaleDateString() + " (Manual)";
                }
                saveConfig();
                document.getElementById('tasaActualDisplay').innerText = fmtDolar(D.config.dolarRate);
                actualizarInfoCard();
                mostrarNotificacion(`Tasa manual establecida en ${fmtDolar(nuevoValor)} Bs/USD`, 'success');
            } else {
                alert("Ingrese un valor numérico válido (mayor a 0)");
            }
        };
        
        actualizarInternetBtn.onclick = async () => {
            const wasManual = D.config.tasaManual;
            if (wasManual) D.config.tasaManual = false;
            mostrarNotificacion("Actualizando tasa desde ExchangeRate-API...", 'info');
            await actualizarTasa(true);
            if (wasManual) {
                const mantenerManual = confirm("Se ha obtenido una tasa actualizada desde internet. ¿Desea seguir usando tasa MANUAL?");
                if (mantenerManual) {
                    D.config.tasaManual = true;
                    const usarNueva = confirm(`La tasa obtenida es ${fmtDolar(D.config.dolarRate)}. ¿Desea actualizar la tasa manual a este valor?`);
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
        colores.forEach(c => { let circle = document.createElement('div'); circle.className = 'color-circle'; circle.style.backgroundColor = c; circle.onclick = async () => { D.config.theme = c; if(esOscuro(c)) D.config.backgroundMode = 'light'; await saveConfig(); renderConfig(); }; paleta.appendChild(circle); });
        
        document.querySelectorAll('.bg-option').forEach(opt => { opt.onclick = async () => { 
            D.config.autoOscuro = false;
            let nuevo = opt.getAttribute('data-mode'); 
            if(esOscuro(D.config.theme) && nuevo === 'dark') return; 
            D.config.backgroundMode = nuevo; 
            await saveConfig(); 
            renderConfig(); 
        }; });
        
        document.getElementById('toggleIVA').onchange = async e => { D.config.ivaActivo = e.target.checked; await saveConfig(); };
        document.getElementById('togglePrevenirCierre').onchange = async e => { D.config.prevenirCierre = e.target.checked; await saveConfig(); };
        document.getElementById('toggleMostrarDolar').onchange = async e => { D.config.mostrarDolar = e.target.checked; await saveConfig(); renderHome(); };
        document.getElementById('toggleAutoOscuro').onchange = async e => { 
            D.config.autoOscuro = e.target.checked; 
            if(D.config.autoOscuro) { aplicarModoSistema(); if(currentModule === 'home') renderHome(); else renderConfig(); }
            else { await saveConfig(); renderConfig(); }
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
    }
    
    // ==================== SERVICE WORKER Y PWA ====================
    (function setupPWA() {
        var esTauri = window.__TAURI__ !== undefined || navigator.userAgent.includes('Tauri');
        if (!esTauri && 'serviceWorker' in navigator) {
            navigator.serviceWorker.register('/sw.js').catch(function(err) {
                console.log('SW registration failed (non-critical):', err);
            });
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
// ==================== INICIALIZACIÓN ====================
    loadAllData();
    if(D.config.pin && D.config.pin.length === 4) {
        if(!sessionStorage.getItem('jam_pin_authed')) askPin(() => { renderHome(); actualizarTasa(false); });
        else { renderHome(); actualizarTasa(false); }
    } else {
        renderHome();
        actualizarTasa(false);
    }
    
    // Detectar cambio de tamaño (rotación, resize escritorio)
    let resizeTimer;
    window.addEventListener('resize', () => {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(() => {
            actualizarModoLayout();
            if(currentModule === 'home') renderHome();
        }, 300);
    });