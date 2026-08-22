// sync-server.js — Servidor central de sincronizacion
const http = require('http');
const fs = require('fs');
const os = require('os');
const path = require('path');

const PORT = 3000;
const DATA = path.join(__dirname, 'sync-data.json');
const STORES = ['productos','ventas','clientes','proveedores','gastos','empleados'];

let store = { config:{}, productos:[], ventas:[], clientes:[], proveedores:[], gastos:[], empleados:[], historialTasa:[], tasaDiaria:[], timestamp:'', version:'0.1' };
if (fs.existsSync(DATA)) try { store = JSON.parse(fs.readFileSync(DATA, 'utf8')); } catch(e) {}
const save = () => fs.writeFileSync(DATA, JSON.stringify(store));

function combinarImportacion(destino, nuevos, campoNombre) {
    let existentes = Array.isArray(destino) ? destino.slice() : [];
    let porId = new Map(), porCodigo = new Map(), porNombre = new Map();
    const keyCod = c => c != null ? String(c).toLowerCase() : '';
    existentes.forEach((x, idx) => {
        if(!x) return;
        if(x.id) porId.set(x.id, idx);
        if(x.codigo) porCodigo.set(keyCod(x.codigo), true);
        if(campoNombre && !x.codigo && x[campoNombre]) porNombre.set(keyCod(x[campoNombre]), true);
    });
    let agregados = 0, actualizados = 0, omitidos = 0;
    (nuevos || []).forEach(item => {
        if(!item) return;
        if(item.id && porId.has(item.id)){
            let existente = existentes[porId.get(item.id)];
            let tsNuevo = item.updatedAt || 0;
            let tsExistente = (existente && existente.updatedAt) || 0;
            if(tsNuevo > tsExistente){
                existentes[porId.get(item.id)] = Object.assign({}, item);
                actualizados++;
            }else{ omitidos++; }
            return;
        }
        let esNombre = campoNombre && !item.codigo && item[campoNombre];
        let duplicado = !!(item.codigo && porCodigo.has(keyCod(item.codigo)))
            || !!(esNombre && porNombre.has(keyCod(item[campoNombre])));
        if(duplicado){ omitidos++; return; }
        let nuevo = Object.assign({}, item);
        if(!nuevo.id) nuevo.id = 'imp' + Date.now() + '_' + Math.random().toString(36).slice(2, 8);
        existentes.push(nuevo);
        porId.set(nuevo.id, existentes.length - 1);
        if(nuevo.codigo) porCodigo.set(keyCod(nuevo.codigo), true);
        if(esNombre) porNombre.set(keyCod(nuevo[campoNombre]), true);
        agregados++;
    });
    return { lista: existentes, agregados: agregados, actualizados: actualizados, omitidos: omitidos };
}

function mergeAll(remote) {
    let stats = {};
    let totalAdded = 0, totalUpdated = 0, totalSkipped = 0;
    STORES.forEach(s => {
        if (remote[s] && Array.isArray(remote[s])) {
            let campoNombre = s === 'productos' ? 'nombre' : null;
            let r = combinarImportacion(store[s]||[], remote[s], campoNombre);
            store[s] = r.lista;
            stats[s] = { total: r.lista.length, added: r.agregados, updated: r.actualizados || 0, skipped: r.omitidos };
            totalAdded += r.agregados;
            totalUpdated += r.actualizados || 0;
            totalSkipped += r.omitidos;
        }
    });
    if (remote.historialTasa && Array.isArray(remote.historialTasa)) {
        let existentes = store.historialTasa || [];
        let mapa = new Map();
        existentes.forEach(h => { if(h && h.fecha) mapa.set(h.fecha, true); });
        let nuevos = 0;
        remote.historialTasa.forEach(h => { if(h && h.fecha && !mapa.has(h.fecha)){ existentes.push(h); nuevos++; }});
        store.historialTasa = existentes;
        stats.historialTasa = { total: existentes.length, added: nuevos };
        totalAdded += nuevos;
    }
    if (remote.tasaDiaria && Array.isArray(remote.tasaDiaria)) {
        let existentes = store.tasaDiaria || [];
        let mapa = new Map();
        existentes.forEach(t => { if(t && t.id) mapa.set(t.id, true); });
        let nuevos = 0;
        remote.tasaDiaria.forEach(t => { if(t && t.id && !mapa.has(t.id)){ existentes.push(t); nuevos++; }});
        store.tasaDiaria = existentes;
        stats.tasaDiaria = { total: existentes.length, added: nuevos };
        totalAdded += nuevos;
    }
    store.timestamp = new Date().toISOString();
    return { ok: true, stats: stats, total: { added: totalAdded, updated: totalUpdated, skipped: totalSkipped } };
}

const ip = (() => { for (const n of Object.values(os.networkInterfaces())) for (const net of n) if (net.family==='IPv4' && !net.internal) return net.address; return '127.0.0.1'; })();

http.createServer((req, res) => {
    res.setHeader('Access-Control-Allow-Origin','*');
    res.setHeader('Access-Control-Allow-Methods','GET,POST,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers','Content-Type');
    if (req.method==='OPTIONS') return res.writeHead(200).end();

    if (req.url==='/info' && req.method==='GET')
        return res.writeHead(200,{'Content-Type':'application/json'}).end(JSON.stringify({ok:1,stores:STORES,ip:ip,port:PORT}));

    if (req.url==='/ip' && req.method==='GET')
        return res.writeHead(200,{'Content-Type':'application/json'}).end(JSON.stringify({ok:1,ip:ip,port:PORT}));

    if (req.url==='/pull' && req.method==='GET')
        return res.writeHead(200,{'Content-Type':'application/json'}).end(JSON.stringify(store));

    if (req.url==='/sync' && req.method==='POST') {
        let b=''; req.on('data',c=>b+=c);
        req.on('end',()=>{
            try {
                const remote = JSON.parse(b);
                const result = mergeAll(remote);
                save();
                res.writeHead(200,{'Content-Type':'application/json'}).end(JSON.stringify(result));
            } catch(e) {
                res.writeHead(400,{'Content-Type':'application/json'}).end(JSON.stringify({ok:0,err:e.message}));
            }
        });
        return;
    }

    const f = path.join(__dirname, req.url==='/' ? 'index.html' : req.url);
    const m = {'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.png':'image/png','.svg':'image/svg+xml'};
    fs.readFile(f, (e,d) => { if(e) return res.writeHead(404).end(); res.writeHead(200,{'Content-Type':m[path.extname(f)]||'text/plain'}).end(d); });
}).listen(PORT, '0.0.0.0', () => console.log('\n  JAM POS Sync listo en http://'+ip+':'+PORT+'\n'));