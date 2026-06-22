const http = require('http');
const url = require('url');
const fs = require('fs');
const path = require('path');
const { MongoClient, ObjectId } = require('mongodb');

const PORT = process.env.PORT || 3000;
const MONGO_URI = process.env.MONGO_URI || "mongodb+srv://greynanbs:Keanu2018@cluster0.p7831.mongodb.net/gestor_polizas?retryWrites=true&w=majority";

let db;
const client = new MongoClient(MONGO_URI);

async function conectar() {
  try {
    await client.connect();
    db = client.db();
    console.log("Conectado exitosamente a MongoDB Atlas");
    await seed();
  } catch (e) {
    console.error("Error al conectar a MongoDB:", e.message);
    process.exit(1);
  }
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
  const count = await C.usuarios().countDocuments();
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
}

function json(req) {
  return new Promise((res, rej) => {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try { res(JSON.parse(body || '{}')); }
      catch(e) { rej(e); }
    });
  });
}

const app = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  const uParsed = url.parse(req.url, true);
  const pn = uParsed.pathname;
  const method = req.method;

  const ok = (data, status = 200) => {
    res.writeHead(status, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(data));
  };

  const fail = (msg, status = 400) => {
    res.writeHead(status, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: msg }));
  };

  try {
    // ── RUTA LOGIN CENTRALIZADA Y CORREGIDA ───────────────────────────
    if (pn === '/api/login' && method === 'POST') {
      const d = await json(req);
      const u = await C.usuarios().findOne({ 
        $or: [
          { email: d.usuario }, 
          { usuario: d.usuario }
        ], 
        password: d.password 
      });
      if (!u) { fail('Usuario o contraseña incorrectos', 401); return; }
      ok({ ok: true, usuario: { usuario: u.usuario, nombre: u.nombre, rol: u.rol } });
      return;
    }

    // ── ENTIDAD: PÓLIZAS ──────────────────────────────────────────────
    if (pn === '/api/polizas' && method === 'GET') {
      const list = await C.polizas().find().toArray();
      ok(list); return;
    }
    if (pn === '/api/polizas' && method === 'POST') {
      const d = await json(req);
      d.fechaCreacion = new Date();
      const r = await C.polizas().insertOne(d);
      ok({ ok: true, id: r.insertedId }); return;
    }
    if (pn.startsWith('/api/polizas/') && method === 'PUT') {
      const id = pn.split('/')[3];
      const d = await json(req);
      delete d._id;
      await C.polizas().updateOne({ _id: new ObjectId(id) }, { $set: d });
      ok({ ok: true }); return;
    }
    if (pn.startsWith('/api/polizas/') && method === 'DELETE') {
      const id = pn.split('/')[3];
      await C.polizas().deleteOne({ _id: new ObjectId(id) });
      ok({ ok: true }); return;
    }

    // ── ENTIDAD: ASEGURADORAS ─────────────────────────────────────────
    if (pn === '/api/aseguradoras' && method === 'GET') {
      ok(await C.aseguradoras().find().toArray()); return;
    }
    if (pn === '/api/aseguradoras' && method === 'POST') {
      const d = await json(req);
      const r = await C.aseguradoras().insertOne(d);
      ok({ ok: true, id: r.insertedId }); return;
    }

    // ── ENTIDAD: RAMOS ───────────────────────────────────────────────
    if (pn === '/api/ramos' && method === 'GET') {
      ok(await C.ramos().find().toArray()); return;
    }
    if (pn === '/api/ramos' && method === 'POST') {
      const d = await json(req);
      const r = await C.ramos().insertOne(d);
      ok({ ok: true, id: r.insertedId }); return;
    }

    // ── ENTIDAD: VENDEDORES ──────────────────────────────────────────
    if (pn === '/api/vendedores' && method === 'GET') {
      ok(await C.vendedores().find().toArray()); return;
    }
    if (pn === '/api/vendedores' && method === 'POST') {
      const d = await json(req);
      const r = await C.vendedores().insertOne(d);
      ok({ ok: true, id: r.insertedId }); return;
    }

    // ── ENTIDAD: USUARIOS ────────────────────────────────────────────
    if (pn === '/api/usuarios' && method === 'GET') {
      ok(await C.usuarios().find().toArray()); return;
    }
    if (pn === '/api/usuarios' && method === 'POST') {
      const d = await json(req);
      const r = await C.usuarios().insertOne(d);
      ok({ ok: true, id: r.insertedId }); return;
    }

    // ── ENTIDAD: COMISIONES ──────────────────────────────────────────
    if (pn === '/api/comisiones' && method === 'GET') {
      ok(await C.comisiones().find().toArray()); return;
    }
    if (pn === '/api/comisiones' && method === 'POST') {
      const d = await json(req);
      const r = await C.comisiones().insertOne(d);
      ok({ ok: true, id: r.insertedId }); return;
    }

    // ── ENTIDAD: LIQUIDACIONES (PAGOS) ────────────────────────────────
    if (pn === '/api/liquidaciones' && method === 'GET') {
      ok(await C.liquidaciones().find().toArray()); return;
    }
    if (pn === '/api/liquidaciones' && method === 'POST') {
      const d = await json(req);
      const r = await C.liquidaciones().insertOne(d);
      ok({ ok: true, id: r.insertedId }); return;
    }

    // ── ENTIDAD: LIQUIDACIONES COBROS ───────────────────────────────
    if (pn === '/api/liquidaciones-cobros' && method === 'GET') {
      ok(await C.liqCobros().find().toArray()); return;
    }
    if (pn === '/api/liquidaciones-cobros' && method === 'POST') {
      const d = await json(req);
      const r = await C.liqCobros().insertOne(d);
      ok({ ok: true, id: r.insertedId }); return;
    }

    // ── ENTIDAD: MOVIMIENTOS Y DESCUENTOS ────────────────────────────
    if (pn === '/api/descuentos-pagos' && method === 'GET') { ok(await C.descPagos().find().toArray()); return; }
    if (pn === '/api/descuentos-pagos' && method === 'POST') { const r = await C.descPagos().insertOne(await json(req)); ok({ ok: true, id: r.insertedId }); return; }
    
    if (pn === '/api/descuentos-cobros' && method === 'GET') { ok(await C.descCobros().find().toArray()); return; }
    if (pn === '/api/descuentos-cobros' && method === 'POST') { const r = await C.descCobros().insertOne(await json(req)); ok({ ok: true, id: r.insertedId }); return; }

    if (pn === '/api/movimientos-pagos' && method === 'GET') { ok(await C.movPagos().find().toArray()); return; }
    if (pn === '/api/movimientos-pagos' && method === 'POST') { const r = await C.movPagos().insertOne(await json(req)); ok({ ok: true, id: r.insertedId }); return; }

    if (pn === '/api/movimientos-cobros' && method === 'GET') { ok(await C.movCobros().find().toArray()); return; }
    if (pn === '/api/movimientos-cobros' && method === 'POST') { const r = await C.movCobros().insertOne(await json(req)); ok({ ok: true, id: r.insertedId }); return; }

    // ── SERVIDOR DE ARCHIVOS ESTÁTICOS (FRONTEND) ─────────────────────
    let fPath = path.join(__dirname, pn === '/' ? 'index.html' : pn);
    if (fs.existsSync(fPath) && fs.lstatSync(fPath).isFile()) {
      const ext = path.extname(fPath);
      let cType = 'text/html';
      if (ext === '.js') cType = 'application/javascript';
      if (ext === '.css') cType = 'text/css';
      if (ext === '.json') cType = 'application/json';
      if (ext === '.jpg' || ext === '.jpeg') cType = 'image/jpeg';
      if (ext === '.png') cType = 'image/png';

      res.writeHead(200, { 'Content-Type': cType });
      fs.createReadStream(fPath).pipe(res);
      return;
    }

    res.writeHead(404); res.end('Ruta no encontrada');
  } catch(e) {
    console.error('Error:', e.message);
    res.writeHead(500); res.end('Error interno');
  }
};

conectar().then(() => {
  http.createServer(app).listen(PORT, () => {
    console.log(`Servidor ejecutándose en puerto ${PORT}`);
  });
}).catch(err => {
  console.error('Error crítico al iniciar:', err);
});
