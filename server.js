const http = require('http');
const fs   = require('fs');
const path = require('path');
const { MongoClient, ObjectId } = require('mongodb');

const PORT     = process.env.PORT || 3000;
const MONGO_URI = process.env.MONGO_URI;
const HTML     = path.join(__dirname, 'index.html');

if (!MONGO_URI) {
  console.error('');
  console.error('ERROR: No se encontro la variable MONGO_URI.');
  console.error('Agrega MONGO_URI en las variables de entorno de Render.');
  console.error('');
  process.exit(1);
}

let db;

async function conectarMongo() {
  try {
    const client = new MongoClient(MONGO_URI);
    await client.connect();
    db = client.db('broker_polizas');
    console.log('Conectado a MongoDB Atlas');
    await inicializarDatos();
  } catch(e) {
    console.error('Error conectando a MongoDB:', e.message);
    process.exit(1);
  }
}

// ── COLECCIONES ─────────────────────────────────────────────────────────
function colPolizas()      { return db.collection('polizas'); }
function colAseguradoras()  { return db.collection('aseguradoras'); }
function colRamos()         { return db.collection('ramos'); }
function colVendedores()    { return db.collection('vendedores'); }
function colUsuarios()      { return db.collection('usuarios'); }
function colComisiones()    { return db.collection('comisiones'); }
function colLiquidaciones() { return db.collection('liquidaciones'); }

// ── DATOS INICIALES (seed) ──────────────────────────────────────────────
const RAMOS_INICIALES = [
  "ACCIDENTES PERSONALES","AGRICOLA GANADERO","AVIACION","CREDITO",
  "FIANZAS","INCENDIO Y LINEAS ALIADAS","LUCRO SESANTE",
  "MAQUINARIA AGRICOLA","MARITIMO","ASISTENCIA MEDICA","MULTIRIESGO HOGAR",
  "MULTIRIESGO INDUSTRIAL","PROGRAMA DE SEGUROS","RESPONSABILIDAD CIVIL",
  "ROTURA DE MAQUINARIA","TRANSPORTE","VEHICULOS","VIDA","OTRO"
];

const ASEGURADORAS_INICIALES = [
  "AIG","ALIANZA","ASEGURADORA DEL SUR","ASISKEN","ATLANTIDA",
  "BEST DOCTORS","BMI","BUPA","CHUBB","CONDOR","CONFIAMED",
  "CONFIANZA","EQUISUIZA","GENERALI","HDI","HISPANA","HUMANA",
  "INTEROCEANICA","LATINA","LIBERTY","MAPFRE","MEDIKEN",
  "PLAN VITAL","SALUDSA","SWEADEN","UNIDOS","VAZ","VUMI","ZURICH","OTRO"
];

const VENDEDORES_INICIALES = [
  "GUILLERMO REYNA","PRISCILA SALAZAR","ALEJANDRO ALARCON",
  "GABRIEL HIDALGO","CARLOS VARGAS","CESAR VARGAS",
  "LEONARDO BAQUERIZO","OTRO"
];

const USUARIOS_INICIALES = [
  { username: "greyna",  password: "Keanu2018", role: "admin",   vendedor: null },
  { username: "editor1", password: "RSeditor1", role: "editor",  vendedor: null },
  { username: "visual1", password: "RSvisual",  role: "viewer",  vendedor: null }
];

async function inicializarDatos() {
  // Limpiar polizas viejas (datos de prueba) - solo si se solicita via flag
  const ramosCount = await colRamos().countDocuments();
  if (ramosCount === 0) {
    await colRamos().insertMany(RAMOS_INICIALES.map(nombre => ({ nombre })));
    console.log('Ramos iniciales creados:', RAMOS_INICIALES.length);
  }

  const asegCount = await colAseguradoras().countDocuments();
  if (asegCount === 0) {
    // Cada aseguradora con comisiones por ramo en 0 por defecto
    const ramosDb = await colRamos().find({}).toArray();
    const docs = ASEGURADORAS_INICIALES.map(nombre => ({
      nombre,
      comisiones: ramosDb.reduce((acc, r) => { acc[r.nombre] = 0; return acc; }, {})
    }));
    await colAseguradoras().insertMany(docs);
    console.log('Aseguradoras iniciales creadas:', ASEGURADORAS_INICIALES.length);
  }

  const vendCount = await colVendedores().countDocuments();
  if (vendCount === 0) {
    const ramosDb = await colRamos().find({}).toArray();
    const docs = VENDEDORES_INICIALES.map(nombre => ({
      nombre,
      comisiones: ramosDb.reduce((acc, r) => { acc[r.nombre] = 0; return acc; }, {})
    }));
    await colVendedores().insertMany(docs);
    console.log('Vendedores iniciales creados:', VENDEDORES_INICIALES.length);
  }

  const userCount = await colUsuarios().countDocuments();
  if (userCount === 0) {
    await colUsuarios().insertMany(USUARIOS_INICIALES);
    console.log('Usuarios iniciales creados:', USUARIOS_INICIALES.length);
  }
}

// ── HELPERS ──────────────────────────────────────────────────────────────
function body(req) {
  return new Promise((res, rej) => {
    let d = '';
    req.on('data', c => d += c);
    req.on('end', () => { try { res(d ? JSON.parse(d) : {}); } catch(e) { rej(e); } });
  });
}

function withId(doc) {
  if (!doc) return doc;
  const { _id, ...rest } = doc;
  return { ...rest, id: _id.toString() };
}

// Calcula la comisión de una póliza dado aseguradora, ramo, vendedor y prima neta
async function calcularComision(aseguradoraNombre, ramoNombre, vendedorNombre, primaNeta) {
  const aseg = await colAseguradoras().findOne({ nombre: aseguradoraNombre });
  const vend = await colVendedores().findOne({ nombre: vendedorNombre });
  const pctAseguradora = (aseg && aseg.comisiones && aseg.comisiones[ramoNombre]) || 0;
  const pctVendedor    = (vend && vend.comisiones && vend.comisiones[ramoNombre]) || 0;
  const comisionBroker = (primaNeta * pctAseguradora) / 100;
  const comisionVendedor = (comisionBroker * pctVendedor) / 100;
  return {
    pctAseguradora,
    pctVendedor,
    comisionBroker: Math.round(comisionBroker * 100) / 100,
    comisionVendedor: Math.round(comisionVendedor * 100) / 100
  };
}

// ── SERVIDOR HTTP ────────────────────────────────────────────────────────
const server = http.createServer(async (req, res) => {
  const { url, method } = req;
  const u = new URL(url, `http://${req.headers.host}`);
  const pathname = u.pathname;

  res.setHeader('Access-Control-Allow-Origin',  '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (method === 'OPTIONS') { res.writeHead(204); res.end(); return; }

  const json = (data, status = 200) => {
    res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify(data));
  };
  const notFound = () => { res.writeHead(404); res.end('Ruta no encontrada'); };
  const error = (e) => { console.error('Error:', e.message); res.writeHead(500); res.end('Error interno'); };

  try {

    // ── PAGINA PRINCIPAL ────────────────────────────────────────────────
    if (method === 'GET' && (pathname === '/' || pathname === '/index.html')) {
      const html = fs.readFileSync(HTML);
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(html);
      return;
    }

    // ════════════════════════════════════════════════════════════════
    // POLIZAS
    // ════════════════════════════════════════════════════════════════
    if (pathname === '/api/polizas') {
      if (method === 'GET') {
        const lista = await colPolizas().find({}).toArray();
        json(lista.map(withId));
        return;
      }
      if (method === 'POST') {
        const data = await body(req);
        data.creadoEn = new Date();
        // Calcular comisión al crear
        if (data.aseguradora && data.tipo && data.vendedor && data.primaNeta) {
          const c = await calcularComision(data.aseguradora, data.tipo, data.vendedor, parseFloat(data.primaNeta) || 0);
          data.comision = c;
        }
        const r = await colPolizas().insertOne(data);
        const created = await colPolizas().findOne({ _id: r.insertedId });
        json(withId(created), 201);

        // Crear registro de comisión asociado
        if (data.comision) {
          await colComisiones().insertOne({
            polizaId: r.insertedId.toString(),
            cliente: data.cliente,
            aseguradora: data.aseguradora,
            ramo: data.tipo,
            vendedor: data.vendedor,
            numero: data.numero || '',
            primaNeta: parseFloat(data.primaNeta) || 0,
            pctAseguradora: data.comision.pctAseguradora,
            pctVendedor: data.comision.pctVendedor,
            comisionBroker: data.comision.comisionBroker,
            comisionVendedor: data.comision.comisionVendedor,
            facturado: false,
            cobrado: false,
            pagado: false,
            fechaCreacion: new Date(),
            vence: data.vence
          });
        }
        return;
      }
    }

    if (pathname.startsWith('/api/polizas/')) {
      const id = pathname.split('/').pop();
      if (method === 'PUT') {
        const data = await body(req);
        delete data._id; delete data.id;
        // Recalcular comisión si cambian datos relevantes
        if (data.aseguradora && data.tipo && data.vendedor && data.primaNeta !== undefined) {
          const c = await calcularComision(data.aseguradora, data.tipo, data.vendedor, parseFloat(data.primaNeta) || 0);
          data.comision = c;
        }
        const r = await colPolizas().findOneAndUpdate(
          { _id: new ObjectId(id) },
          { $set: data },
          { returnDocument: 'after' }
        );
        if (!r) { notFound(); return; }
        json(withId(r));
        return;
      }
      if (method === 'DELETE') {
        await colPolizas().deleteOne({ _id: new ObjectId(id) });
        await colComisiones().deleteMany({ polizaId: id });
        json({ ok: true });
        return;
      }
    }

    // ════════════════════════════════════════════════════════════════
    // ASEGURADORAS
    // ════════════════════════════════════════════════════════════════
    if (pathname === '/api/aseguradoras') {
      if (method === 'GET') {
        const lista = await colAseguradoras().find({}).sort({ nombre: 1 }).toArray();
        json(lista.map(withId));
        return;
      }
      if (method === 'POST') {
        const data = await body(req);
        if (!data.comisiones) data.comisiones = {};
        const r = await colAseguradoras().insertOne(data);
        const created = await colAseguradoras().findOne({ _id: r.insertedId });
        json(withId(created), 201);
        return;
      }
    }
    if (pathname.startsWith('/api/aseguradoras/')) {
      const id = pathname.split('/').pop();
      if (method === 'PUT') {
        const data = await body(req);
        delete data._id; delete data.id;
        const r = await colAseguradoras().findOneAndUpdate(
          { _id: new ObjectId(id) }, { $set: data }, { returnDocument: 'after' }
        );
        if (!r) { notFound(); return; }
        json(withId(r));
        return;
      }
      if (method === 'DELETE') {
        await colAseguradoras().deleteOne({ _id: new ObjectId(id) });
        json({ ok: true });
        return;
      }
    }

    // ════════════════════════════════════════════════════════════════
    // RAMOS
    // ════════════════════════════════════════════════════════════════
    if (pathname === '/api/ramos') {
      if (method === 'GET') {
        const lista = await colRamos().find({}).sort({ nombre: 1 }).toArray();
        json(lista.map(withId));
        return;
      }
      if (method === 'POST') {
        const data = await body(req);
        const r = await colRamos().insertOne(data);
        const created = await colRamos().findOne({ _id: r.insertedId });
        json(withId(created), 201);
        return;
      }
    }
    if (pathname.startsWith('/api/ramos/')) {
      const id = pathname.split('/').pop();
      if (method === 'PUT') {
        const data = await body(req);
        delete data._id; delete data.id;
        const r = await colRamos().findOneAndUpdate(
          { _id: new ObjectId(id) }, { $set: data }, { returnDocument: 'after' }
        );
        if (!r) { notFound(); return; }
        json(withId(r));
        return;
      }
      if (method === 'DELETE') {
        await colRamos().deleteOne({ _id: new ObjectId(id) });
        json({ ok: true });
        return;
      }
    }

    // ════════════════════════════════════════════════════════════════
    // VENDEDORES
    // ════════════════════════════════════════════════════════════════
    if (pathname === '/api/vendedores') {
      if (method === 'GET') {
        const lista = await colVendedores().find({}).sort({ nombre: 1 }).toArray();
        json(lista.map(withId));
        return;
      }
      if (method === 'POST') {
        const data = await body(req);
        if (!data.comisiones) data.comisiones = {};
        const r = await colVendedores().insertOne(data);
        const created = await colVendedores().findOne({ _id: r.insertedId });
        json(withId(created), 201);
        return;
      }
    }
    if (pathname.startsWith('/api/vendedores/')) {
      const id = pathname.split('/').pop();
      if (method === 'PUT') {
        const data = await body(req);
        delete data._id; delete data.id;
        const r = await colVendedores().findOneAndUpdate(
          { _id: new ObjectId(id) }, { $set: data }, { returnDocument: 'after' }
        );
        if (!r) { notFound(); return; }
        json(withId(r));
        return;
      }
      if (method === 'DELETE') {
        await colVendedores().deleteOne({ _id: new ObjectId(id) });
        json({ ok: true });
        return;
      }
    }

    // ════════════════════════════════════════════════════════════════
    // USUARIOS
    // ════════════════════════════════════════════════════════════════
    if (pathname === '/api/usuarios') {
      if (method === 'GET') {
        const lista = await colUsuarios().find({}).toArray();
        json(lista.map(withId));
        return;
      }
      if (method === 'POST') {
        const data = await body(req);
        const existe = await colUsuarios().findOne({ username: data.username });
        if (existe) { json({ error: 'El usuario ya existe' }, 400); return; }
        const r = await colUsuarios().insertOne(data);
        const created = await colUsuarios().findOne({ _id: r.insertedId });
        json(withId(created), 201);
        return;
      }
    }
    if (pathname.startsWith('/api/usuarios/')) {
      const id = pathname.split('/').pop();
      if (method === 'PUT') {
        const data = await body(req);
        delete data._id; delete data.id;
        const r = await colUsuarios().findOneAndUpdate(
          { _id: new ObjectId(id) }, { $set: data }, { returnDocument: 'after' }
        );
        if (!r) { notFound(); return; }
        json(withId(r));
        return;
      }
      if (method === 'DELETE') {
        await colUsuarios().deleteOne({ _id: new ObjectId(id) });
        json({ ok: true });
        return;
      }
    }

    // Login - verificar credenciales
    if (pathname === '/api/login' && method === 'POST') {
      const data = await body(req);
      const user = await colUsuarios().findOne({
        username: (data.username || '').toLowerCase(),
        password: data.password
      });
      if (!user) { json({ error: 'Credenciales incorrectas' }, 401); return; }
      json(withId(user));
      return;
    }

    // ════════════════════════════════════════════════════════════════
    // COMISIONES
    // ════════════════════════════════════════════════════════════════
    if (pathname === '/api/comisiones') {
      if (method === 'GET') {
        const lista = await colComisiones().find({}).toArray();
        json(lista.map(withId));
        return;
      }
    }
    if (pathname.startsWith('/api/comisiones/')) {
      const id = pathname.split('/').pop();
      if (method === 'PUT') {
        const data = await body(req);
        delete data._id; delete data.id;
        const r = await colComisiones().findOneAndUpdate(
          { _id: new ObjectId(id) }, { $set: data }, { returnDocument: 'after' }
        );
        if (!r) { notFound(); return; }
        json(withId(r));
        return;
      }
    }

    // ════════════════════════════════════════════════════════════════
    // LIQUIDACIONES
    // ════════════════════════════════════════════════════════════════
    if (pathname === '/api/liquidaciones') {
      if (method === 'GET') {
        const lista = await colLiquidaciones().find({}).sort({ fecha: -1 }).toArray();
        json(lista.map(withId));
        return;
      }
      if (method === 'POST') {
        const data = await body(req);
        data.fecha = new Date();
        const r = await colLiquidaciones().insertOne(data);
        const created = await colLiquidaciones().findOne({ _id: r.insertedId });
        // Marcar las comisiones incluidas como pagadas
        if (data.comisionIds && data.comisionIds.length) {
          await colComisiones().updateMany(
            { _id: { $in: data.comisionIds.map(x => new ObjectId(x)) } },
            { $set: { pagado: true, liquidacionId: r.insertedId.toString() } }
          );
        }
        json(withId(created), 201);
        return;
      }
    }
    if (pathname.startsWith('/api/liquidaciones/')) {
      const id = pathname.split('/').pop();
      if (method === 'DELETE') {
        await colComisiones().updateMany(
          { liquidacionId: id },
          { $set: { pagado: false, liquidacionId: null } }
        );
        await colLiquidaciones().deleteOne({ _id: new ObjectId(id) });
        json({ ok: true });
        return;
      }
    }

    notFound();

  } catch(e) {
    error(e);
  }
});

conectarMongo().then(() => {
  server.listen(PORT, '0.0.0.0', () => {
    console.log('');
    console.log('==============================================');
    console.log('  Reyna Seguros Gestion v3.0 - MongoDB Atlas');
    console.log(`  Puerto: ${PORT}`);
    console.log('==============================================');
  });
});
