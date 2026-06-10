const http = require('http');
const fs   = require('fs');
const path = require('path');

// Render.com asigna el puerto automáticamente via variable de entorno
const PORT    = process.env.PORT || 3000;
const DB_FILE = path.join(__dirname, 'polizas.json');
const HTML    = path.join(__dirname, 'index.html');

if (!fs.existsSync(DB_FILE)) fs.writeFileSync(DB_FILE, '[]', 'utf8');

function leer()     { try { return JSON.parse(fs.readFileSync(DB_FILE,'utf8')); } catch(e){ return []; } }
function guardar(d) { fs.writeFileSync(DB_FILE, JSON.stringify(d,null,2), 'utf8'); }

const server = http.createServer((req, res) => {
  const { url, method } = req;

  res.setHeader('Access-Control-Allow-Origin',  '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (method === 'OPTIONS') { res.writeHead(204); res.end(); return; }

  // Página principal
  if (method === 'GET' && (url === '/' || url === '/index.html')) {
    fs.readFile(HTML, (err, data) => {
      if (err) { res.writeHead(404); res.end('No se encontró index.html'); return; }
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(data);
    });
    return;
  }

  // GET /api/polizas
  if (method === 'GET' && url === '/api/polizas') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(leer()));
    return;
  }

  // POST /api/polizas
  if (method === 'POST' && url === '/api/polizas') {
    let body = '';
    req.on('data', c => body += c);
    req.on('end', () => {
      try {
        const nueva = JSON.parse(body);
        const lista = leer();
        nueva.id = Date.now();
        lista.push(nueva);
        guardar(lista);
        res.writeHead(201, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(nueva));
      } catch(e) { res.writeHead(400); res.end('Error'); }
    });
    return;
  }

  // PUT /api/polizas/:id
  if (method === 'PUT' && url.startsWith('/api/polizas/')) {
    const id = parseInt(url.split('/').pop());
    let body = '';
    req.on('data', c => body += c);
    req.on('end', () => {
      try {
        const data  = JSON.parse(body);
        const lista = leer();
        const idx   = lista.findIndex(p => p.id === id);
        if (idx === -1) { res.writeHead(404); res.end('No encontrada'); return; }
        lista[idx] = { ...lista[idx], ...data, id };
        guardar(lista);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(lista[idx]));
      } catch(e) { res.writeHead(400); res.end('Error'); }
    });
    return;
  }

  // DELETE /api/polizas/:id
  if (method === 'DELETE' && url.startsWith('/api/polizas/')) {
    const id    = parseInt(url.split('/').pop());
    let lista   = leer();
    const antes = lista.length;
    lista = lista.filter(p => p.id !== id);
    if (lista.length === antes) { res.writeHead(404); res.end('No encontrada'); return; }
    guardar(lista);
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ ok: true }));
    return;
  }

  res.writeHead(404); res.end('Ruta no encontrada');
});

server.listen(PORT, '0.0.0.0', () => {
  console.log('');
  console.log('==============================================');
  console.log('  ✅  Servidor de Pólizas en funcionamiento');
  console.log(`  →  Puerto: ${PORT}`);
  console.log('==============================================');
});
