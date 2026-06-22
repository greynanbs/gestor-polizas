const http = require('http');
const fs   = require('fs');
const path = require('path');
const { MongoClient, ObjectId } = require('mongodb');

const PORT      = process.env.PORT || 3000;
const MONGO_URI = process.env.MONGO_URI;
const HTML      = path.join(__dirname, 'index.html');

if (!MONGO_URI) {
  console.error('ERROR: No se encontró MONGO_URI'); process.exit(1);
}

let db;

async function conectar() {
  const client = new MongoClient(MONGO_URI);
  await client.connect();
  db = client.db('broker_polizas');
  console.log('Conectado a MongoDB Atlas con éxito');
  await seed();
}

// ── COLECCIONES ──────────────────────────────────────────────────────
const C = {
  polizas:        () => db.collection('polizas'),
  aseguradoras:   () => db.collection('aseguradoras'),
  ramos:          () => db.collection('ramos'),
  vendedores:     () => db.collection('vendedores'),
  usuarios:       () => db.collection('usuarios'),
  comisiones:     () => db.collection('comisiones'),
  liquidaciones:  () => db.collection('liquidaciones'),
  descPagos:      () => db.collection('descuentos_pagos'),
  descCobros:     () => db.collection('descuentos_cobros'),
  movPagos:       () => db.collection('movimientos_pagos'),
  movCobros:      () => db.collection('movimientos_cobros'),
  liqCobros:      () => db.collection('liquidaciones_cobros')
};

async function seed() {
  const u = await C.usuarios().findOne({ $or: [{ email: d.usuario }, { usuario: d.usuario }], password: d.password });
  if (count === 0) {
    await C.usuarios().insertOne({
      usuario: "greyna",
      email: "admin@reynaseguros.com",
      password: "Keanu2018",
      rol: "administrador",
      nombre: "Gerente Reyna"
    });
    console.log("Usuario inicial creado con éxito.");
  }

function toOid(id) {
  if(!id) return null;
  try { return new ObjectId(id); } catch(e) { return id; }
}
function wId(obj) {
  if(!obj) return null;
  if(obj._id) obj.id = obj._id.toString();
  return obj;
}

const mimeTypes = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'text/javascript',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml'
};

const server = http.createServer(async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(200); res.end(); return;
  }

  const urlObj = new URL(req.url, `http://${req.headers.host}`);
  const pn = urlObj.pathname;
  const method = req.method;

  // Servir frontend estático
  if (method === 'GET' && (pn === '/' || pn === '/index.html')) {
    fs.readFile(HTML, (err, data) => {
      if (err) { res.writeHead(500); res.end('Error leyendo index.html'); }
      else { res.writeHead(200, {'Content-Type':'text/html'}); res.end(data); }
    });
    return;
  }

  // Utilidades de lectura de cuerpo JSON
  async function bodyJson() {
    return new Promise((resolve, reject) => {
      let body = '';
      req.on('data', chunk => body += chunk);
      req.on('end', () => {
        try { resolve(body ? JSON.parse(body) : {}); }
        catch(e) { reject(e); }
      });
    });
  }

  function ok(data, code=200) {
    res.writeHead(code, {'Content-Type':'application/json'});
    res.end(JSON.stringify(data));
  }

  try {
    // ── AUTH ──
    if (pn === '/api/login' && method === 'POST') {
      const { usuario, clave } = await bodyJson();
      const user = await C.usuarios().findOne({ usuario, clave });
      if (user) ok({ id: user._id.toString(), nombre: user.nombre, rol: user.rol, usuario: user.usuario });
      else { res.writeHead(401); res.end(JSON.stringify({ error: 'Credenciales inválidas' })); }
      return;
    }

    // ── POLIZAS ──
    if (pn === '/api/polizas' && method === 'GET') {
      const arr = await C.polizas().find().toArray();
      ok(arr.map(wId)); return;
    }
    if (pn === '/api/polizas' && method === 'POST') {
      const d = await bodyJson();
      delete d.id; delete d._id;
      const r = await C.polizas().insertOne(d);
      ok(wId(await C.polizas().findOne({_id:r.insertedId})), 201); return;
    }
    if (pn.startsWith('/api/polizas/') && method === 'PUT') {
      const id = pn.split('/').pop();
      const d = await bodyJson();
      delete d.id; delete d._id;
      await C.polizas().updateOne({_id:toOid(id)}, {$set:d});
      ok(wId(await C.polizas().findOne({_id:toOid(id)}))); return;
    }
    if (pn.startsWith('/api/polizas/') && method === 'DELETE') {
      const id = pn.split('/').pop();
      await C.polizas().deleteOne({_id:toOid(id)});
      ok({ok:true}); return;
    }

    // ── ASEGURADORAS ──
    if (pn === '/api/aseguradoras' && method === 'GET') {
      const arr = await C.aseguradoras().find().toArray();
      ok(arr.map(wId)); return;
    }
    if (pn === '/api/aseguradoras' && method === 'POST') {
      const d = await bodyJson();
      const r = await C.aseguradoras().insertOne(d);
      ok(wId(await C.aseguradoras().findOne({_id:r.insertedId})), 201); return;
    }
    if (pn.startsWith('/api/aseguradoras/') && method === 'DELETE') {
      const id = pn.split('/').pop();
      await C.aseguradoras().deleteOne({_id:toOid(id)}); ok({ok:true}); return;
    }

    // ── RAMOS ──
    if (pn === '/api/ramos' && method === 'GET') {
      const arr = await C.ramos().find().toArray();
      ok(arr.map(wId)); return;
    }
    if (pn === '/api/ramos' && method === 'POST') {
      const d = await bodyJson();
      const r = await C.ramos().insertOne(d);
      ok(wId(await C.ramos().findOne({_id:r.insertedId})), 201); return;
    }
    if (pn.startsWith('/api/ramos/') && method === 'DELETE') {
      const id = pn.split('/').pop();
      await C.ramos().deleteOne({_id:toOid(id)}); ok({ok:true}); return;
    }

    // ── VENDEDORES ──
    if (pn === '/api/vendedores' && method === 'GET') {
      const arr = await C.vendedores().find().toArray();
      ok(arr.map(wId)); return;
    }
    if (pn === '/api/vendedores' && method === 'POST') {
      const d = await bodyJson();
      const r = await C.vendedores().insertOne(d);
      ok(wId(await C.vendedores().findOne({_id:r.insertedId})), 201); return;
    }
    if (pn.startsWith('/api/vendedores/') && method === 'DELETE') {
      const id = pn.split('/').pop();
      await C.vendedores().deleteOne({_id:toOid(id)}); ok({ok:true}); return;
    }

    // ── USUARIOS ──
    if (pn === '/api/usuarios' && method === 'GET') {
      const arr = await C.usuarios().find().toArray();
      ok(arr.map(wId)); return;
    }
    if (pn === '/api/usuarios' && method === 'POST') {
      const d = await bodyJson();
      const r = await C.usuarios().insertOne(d);
      ok(wId(await C.usuarios().findOne({_id:r.insertedId})), 201); return;
    }
    if (pn.startsWith('/api/usuarios/') && method === 'DELETE') {
      const id = pn.split('/').pop();
      await C.usuarios().deleteOne({_id:toOid(id)}); ok({ok:true}); return;
    }

    // ── COMISIONES ──
    if (pn === '/api/comisiones' && method === 'GET') {
      const arr = await C.comisiones().find().toArray();
      ok(arr.map(wId)); return;
    }
    if (pn === '/api/comisiones' && method === 'POST') {
      const d = await bodyJson();
      const r = await C.comisiones().insertOne(d);
      ok(wId(await C.comisiones().findOne({_id:r.insertedId})), 201); return;
    }
    if (pn.startsWith('/api/comisiones/') && method === 'PUT') {
      const id = pn.split('/').pop();
      const d = await bodyJson();
      delete d.id; delete d._id;
      await C.comisiones().updateOne({_id:toOid(id)}, {$set:d});
      ok(wId(await C.comisiones().findOne({_id:toOid(id)}))); return;
    }

    // ── ANTICIPOS VENDEDORES ──
    if (pn === '/api/anticipos' && method === 'GET') {
      const arr = await C.anticipos().find().toArray();
      ok(arr.map(wId)); return;
    }
    if (pn === '/api/anticipos' && method === 'POST') {
      const d = await bodyJson();
      const r = await C.anticipos().insertOne(d);
      ok(wId(await C.anticipos().findOne({_id:r.insertedId})), 201); return;
    }
    if (pn.startsWith('/api/anticipos/') && method === 'DELETE') {
      const id = pn.split('/').pop();
      await C.anticipos().deleteOne({_id:toOid(id)}); ok({ok:true}); return;
    }

    // ── LIQUIDACIONES (PAGOS VENDEDORES) ──
    if (pn === '/api/liquidaciones' && method === 'GET') {
      const arr = await C.liquidaciones().find().toArray();
      ok(arr.map(wId)); return;
    }
    if (pn === '/api/liquidaciones' && method === 'POST') {
      const d = await bodyJson();
      const r = await C.liquidaciones().insertOne(d);
      if(d.comisionIds && d.comisionIds.length) {
        await C.comisiones().updateMany(
          { _id: { $in: d.comisionIds.map(toOid) } },
          { $set: { liquidado: true } }
        );
      }
      ok(wId(await C.liquidaciones().findOne({_id:r.insertedId})), 201); return;
    }

    // ── LIQUIDACIONES COBROS (ASEGURADORAS) ──
    if (pn === '/api/liquidaciones-cobros' && method === 'GET') {
      const arr = await C.liqCobros().find().toArray();
      ok(arr.map(wId)); return;
    }
    if (pn === '/api/liquidaciones-cobros' && method === 'POST') {
      const d = await bodyJson();
      const r = await C.liqCobros().insertOne(d);
      if (d.polizaIds && d.polizaIds.length) {
        await C.polizas().updateMany(
          { _id: { $in: d.polizaIds.map(toOid) } },
          { $set: { estatusCobroIdx: 1 } } // Liquidado Parcial / Pendiente Cobro Completo
        );
      }
      ok(wId(await C.liqCobros().findOne({_id:r.insertedId})), 201); return;
    }

    // ── MOVIMIENTOS PAGOS (A VENDEDORES) ──
    if (pn === '/api/movimientos-pagos' && method === 'GET') {
      const arr = await C.movPagos().find().toArray();
      ok(arr.map(wId)); return;
    }
    if (pn === '/api/movimientos-pagos' && method === 'POST') {
      const d = await bodyJson();
      const r = await C.movPagos().insertOne(d);
      
      // Auto-completar liquidaciones si el total pagado alcanza la meta
      if (d.liquidacionId) {
        const liq = await C.liquidaciones().findOne({_id:toOid(d.liquidacionId)});
        if (liq) {
          const pagos = await C.movPagos().find({liquidacionId:d.liquidacionId}).toArray();
          const totalPagado = pagos.reduce((s,p)=> s + (parseFloat(p.monto)||0), 0);
          if (totalPagado >= liq.totalNeto) {
            await C.liquidaciones().updateOne({_id:toOid(d.liquidacionId)}, {$set:{estatus:'pagada'}});
          }
        }
      }
      ok(wId(await C.movPagos().findOne({_id:r.insertedId})), 201); return;
    }
    if (pn.startsWith('/api/movimientos-pagos/')) {
      const id = pn.split('/').pop();
      if (method === 'DELETE') {
        await C.movPagos().deleteOne({_id:toOid(id)}); ok({ok:true}); return;
      }
    }

    // ── MOVIMIENTOS COBROS (DE ASEGURADORAS) ──
    if (pn === '/api/movimientos-cobros' && method === 'GET') {
      const arr = await C.movCobros().find().toArray();
      ok(arr.map(wId)); return;
    }
    if (pn === '/api/movimientos-cobros' && method === 'POST') {
      const d = await bodyJson();
      const r = await C.movCobros().insertOne(d);
      
      if (d.liquidacionCobroId) {
        const liq = await C.liqCobros().findOne({_id:toOid(d.liquidacionCobroId)});
        if (liq) {
          const cobros = await C.movCobros().find({liquidacionCobroId:d.liquidacionCobroId}).toArray();
          const totalCobrado = cobros.reduce((s,c)=> s + (parseFloat(c.monto)||0), 0);
          if (totalCobrado >= liq.totalNeto) {
            if (liq.polizaIds?.length) {
              await C.polizas().updateMany(
                { _id: { $in: liq.polizaIds.map(toOid) } },
                { $set: { estatusCobroIdx: 2 } } // Cobrado Completo
              );
            }
            await C.liqCobros().updateOne({_id:toOid(d.liquidacionCobroId)}, {$set:{estatus:'cobrada'}});
            if (liq.comisionIds?.length) {
              await C.comisiones().updateMany(
                { _id: { $in: liq.comisionIds.map(toOid) } },
                { $set: { cobrado: true } }
              );
            }
          }
        }
      }
      ok(wId(await C.movCobros().findOne({_id:r.insertedId})), 201); return;
    }
    if (pn.startsWith('/api/movimientos-cobros/')) {
      const id = pn.split('/').pop();
      if (method === 'DELETE') {
        await C.movCobros().deleteOne({_id:toOid(id)}); ok({ok:true}); return;
      }
    }

    res.writeHead(404); res.end('Ruta no encontrada');
  } catch(e) {
    console.error('Error:', e.message);
    res.writeHead(500); res.end('Error interno del servidor');
  }
});

conectar().then(() => {
  server.listen(PORT, () => {
    console.log(`Servidor corriendo en puerto ${PORT}`);
  });
}).catch(err => {
  console.error('Error inicializando base de datos:', err);
});
