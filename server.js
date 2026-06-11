const http       = require('http');
const fs         = require('fs');
const path       = require('path');
const { MongoClient, ObjectId } = require('mongodb');

const PORT     = process.env.PORT || 3000;
const MONGO_URI = process.env.MONGO_URI;
const HTML     = path.join(__dirname, 'index.html');

if (!MONGO_URI) {
  console.error('');
  console.error('❌  ERROR: No se encontró la variable MONGO_URI.');
  console.error('   Agrega MONGO_URI en las variables de entorno de Render.');
  console.error('');
  process.exit(1);
}

let db;

async function conectarMongo() {
  try {
    const client = new MongoClient(MONGO_URI);
    await client.connect();
    db = client.db('broker_polizas');
    console.log('✅  Conectado a MongoDB Atlas');
  } catch(e) {
    console.error('❌  Error conectando a MongoDB:', e.message);
    process.exit(1);
  }
}

function col() { return db.collection('polizas'); }

function body(req) {
  return new Promise((res, rej) => {
    let d = '';
    req.on('data', c => d += c);
    req.on('end', () => { try { res(JSON.parse(d)); } catch(e) { rej(e); } });
  });
}

const server = http.createServer(async (req, res) => {
  const { url, method } = req;

  res.setHeader('Access-Control-Allow-Origin',  '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (method === 'OPTIONS') { res.writeHead(204); res.end(); return; }

  const json = (data, status = 200) => {
    res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify(data));
  };

  try {

    // Página principal
    if (method === 'GET' && (url === '/' || url === '/index.html')) {
      const html = fs.readFileSync(HTML);
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(html);
      return;
    }

    // GET /api/polizas — listar todas
    if (method === 'GET' && url === '/api/polizas') {
      const lista = await col().find({}).toArray();
      // Convertir _id de MongoDB a id numérico que usa el front
      const resultado = lista.map(p => ({ ...p, id: p._id.toString() }));
      json(resultado);
      return;
    }

    // POST /api/polizas — crear nueva
    if (method === 'POST' && url === '/api/polizas') {
      const data = await body(req);
      data.creadoEn = new Date();
      const r = await col().insertOne(data);
      json({ ...data, id: r.insertedId.toString(), _id: r.insertedId }, 201);
      return;
    }

    // PUT /api/polizas/:id — actualizar
    if (method === 'PUT' && url.startsWith('/api/polizas/')) {
      const id  = url.split('/').pop();
      const data = await body(req);
      delete data._id;
      delete data.id;
      const r = await col().findOneAndUpdate(
        { _id: new ObjectId(id) },
        { $set: data },
        { returnDocument: 'after' }
      );
      if (!r) { res.writeHead(404); res.end('No encontrada'); return; }
      json({ ...r, id: r._id.toString() });
      return;
    }

    // DELETE /api/polizas/:id — eliminar
    if (method === 'DELETE' && url.startsWith('/api/polizas/')) {
      const id = url.split('/').pop();
      await col().deleteOne({ _id: new ObjectId(id) });
      json({ ok: true });
      return;
    }

    res.writeHead(404); res.end('Ruta no encontrada');

  } catch(e) {
    console.error('Error en petición:', e.message);
    res.writeHead(500); res.end('Error interno del servidor');
  }
});

conectarMongo().then(() => {
  server.listen(PORT, '0.0.0.0', () => {
    console.log('');
    console.log('==============================================');
    console.log('  ✅  Servidor de Pólizas con MongoDB Atlas');
    console.log(`  →  Puerto: ${PORT}`);
    console.log('==============================================');
  });
});
