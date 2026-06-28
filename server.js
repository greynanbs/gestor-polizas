const http = require('http');
const fs   = require('fs');
const path = require('path');
const { MongoClient, ObjectId } = require('mongodb');

const PORT      = process.env.PORT || 3000;
const MONGO_URI = process.env.MONGO_URI;
const HTML      = path.join(__dirname, 'index.html');

if (!MONGO_URI) {
  console.error('ERROR: No se encontro MONGO_URI'); process.exit(1);
}

let db;

async function conectar() {
  const client = new MongoClient(MONGO_URI);
  await client.connect();
  db = client.db('broker_polizas');
  console.log('Conectado a MongoDB Atlas');
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
  liqCobros:      () => db.collection('liquidaciones_cobros'),
};

// ── SEED ─────────────────────────────────────────────────────────────
async function seed() {
  const RAMOS = ["ACCIDENTES PERSONALES","AGRICOLA GANADERO","AVIACION","CREDITO",
    "FIANZAS","INCENDIO Y LINEAS ALIADAS","LUCRO SESANTE","MAQUINARIA AGRICOLA",
    "MARITIMO","ASISTENCIA MEDICA","MULTIRIESGO HOGAR","MULTIRIESGO INDUSTRIAL",
    "PROGRAMA DE SEGUROS","RESPONSABILIDAD CIVIL","ROTURA DE MAQUINARIA",
    "TRANSPORTE","VEHICULOS","VIDA","OTRO"];

  const ASEGURADORAS = ["AIG","ALIANZA","ASEGURADORA DEL SUR","ASISKEN","ATLANTIDA",
    "BEST DOCTORS","BMI","BUPA","CHUBB","CONDOR","CONFIAMED","CONFIANZA","EQUISUIZA",
    "GENERALI","HDI","HISPANA","HUMANA","INTEROCEANICA","LATINA","LIBERTY","MAPFRE",
    "MEDIKEN","PLAN VITAL","SALUDSA","SWEADEN","UNIDOS","VAZ","VUMI","ZURICH","OTRO"];

  const VENDEDORES = ["GUILLERMO REYNA","PRISCILA SALAZAR","ALEJANDRO ALARCON",
    "GABRIEL HIDALGO","CARLOS VARGAS","CESAR VARGAS","LEONARDO BAQUERIZO","OTRO"];

  const USUARIOS = [
    { username:"greyna",  password:"Keanu2018", role:"admin",   vendedor:null },
    { username:"editor1", password:"RSeditor1", role:"editor",  vendedor:null },
    { username:"visual1", password:"RSvisual",  role:"viewer",  vendedor:null }
  ];

  const DESC_PAGOS = [
    { nombre:"Anticipo",             tipo:"monto", base:"total",    valor:0, activo:true },
    { nombre:"Impuesto a la renta",  tipo:"pct",   base:"subtotal", valor:10, activo:true },
    { nombre:"Retención IVA",        tipo:"pct",   base:"iva",      valor:70, activo:true },
    { nombre:"Retención SuperBancos",tipo:"pct",   base:"subtotal", valor:0.2,activo:true },
    { nombre:"Fee administrativo",   tipo:"pct",   base:"total",    valor:8,  activo:true },
    { nombre:"Reliquidación",        tipo:"monto", base:"total",    valor:0,  activo:true },
  ];

  const DESC_COBROS = [
    { nombre:"Anticipo aseguradora", tipo:"monto", base:"total",    valor:0,  activo:true },
    { nombre:"Impuesto a la renta",  tipo:"pct",   base:"subtotal", valor:10, activo:true },
    { nombre:"Retención IVA",        tipo:"pct",   base:"iva",      valor:70, activo:true },
    { nombre:"Retención SuperBancos",tipo:"pct",   base:"subtotal", valor:0.2,activo:true },
    { nombre:"Nota de crédito",      tipo:"monto", base:"total",    valor:0,  activo:true },
  ];

  if (!await C.ramos().countDocuments()) {
    await C.ramos().insertMany(RAMOS.map(n=>({nombre:n})));
    console.log('Ramos creados:', RAMOS.length);
  }
  if (!await C.aseguradoras().countDocuments()) {
    const rs = await C.ramos().find({}).toArray();
    await C.aseguradoras().insertMany(ASEGURADORAS.map(n=>({
      nombre:n, comisiones: rs.reduce((a,r)=>({...a,[r.nombre]:0}),{})
    })));
    console.log('Aseguradoras creadas:', ASEGURADORAS.length);
  }
  if (!await C.vendedores().countDocuments()) {
    const rs = await C.ramos().find({}).toArray();
    await C.vendedores().insertMany(VENDEDORES.map(n=>({
      nombre:n, comisiones: rs.reduce((a,r)=>({...a,[r.nombre]:0}),{})
    })));
    console.log('Vendedores creados:', VENDEDORES.length);
  }
  if (!await C.usuarios().countDocuments()) {
    await C.usuarios().insertMany(USUARIOS);
    console.log('Usuarios creados:', USUARIOS.length);
  }
  if (!await C.descPagos().countDocuments()) {
    await C.descPagos().insertMany(DESC_PAGOS);
    console.log('Descuentos pagos creados');
  }
  if (!await C.descCobros().countDocuments()) {
    await C.descCobros().insertMany(DESC_COBROS);
    console.log('Descuentos cobros creados');
  }
}

// ── HELPERS ──────────────────────────────────────────────────────────
const body = req => new Promise((res,rej)=>{
  let d=''; req.on('data',c=>d+=c);
  req.on('end',()=>{try{res(d?JSON.parse(d):{});}catch(e){rej(e);}});
});
const wId = doc => { if(!doc)return doc; const{_id,...r}=doc; return{...r,id:_id.toString()}; };
const toOid = id => new ObjectId(id);

async function calcComision(asegNombre, ramoNombre, vendNombre, primaNeta) {
  const [aseg, vend] = await Promise.all([
    C.aseguradoras().findOne({nombre:asegNombre}),
    C.vendedores().findOne({nombre:vendNombre})
  ]);
  const pA = (aseg?.comisiones?.[ramoNombre]) || 0;
  const pV = (vend?.comisiones?.[ramoNombre]) || 0;
  const cB = Math.round(primaNeta*pA)/100;
  const cV = Math.round(cB*pV)/100;
  return { pctAseguradora:pA, pctVendedor:pV, comisionBroker:cB, comisionVendedor:cV };
}

// ── SERVIDOR ─────────────────────────────────────────────────────────
const server = http.createServer(async (req, res) => {
  const {url, method} = req;
  const pn = new URL(url, `http://${req.headers.host}`).pathname;

  res.setHeader('Access-Control-Allow-Origin','*');
  res.setHeader('Access-Control-Allow-Methods','GET,POST,PUT,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers','Content-Type');
  if (method==='OPTIONS'){res.writeHead(204);res.end();return;}

  const ok  = (d,s=200) => { res.writeHead(s,{'Content-Type':'application/json;charset=utf-8'}); res.end(JSON.stringify(d)); };
  const err = (m,s=500) => { res.writeHead(s); res.end(m); };

  try {
    // ARCHIVOS ESTÁTICOS JS
    if (method==='GET'&&pn.startsWith('/js/')) {
      const filePath=path.join(__dirname,pn);
      if(fs.existsSync(filePath)){
        res.writeHead(200,{'Content-Type':'application/javascript;charset=utf-8'});
        res.end(fs.readFileSync(filePath)); return;
      }
    }

    // HTML
    if (method==='GET'&&(pn==='/'||pn==='/index.html')) {
      const html=fs.readFileSync(HTML);
      res.writeHead(200,{'Content-Type':'text/html;charset=utf-8'});
      res.end(html); return;
    }

    // LOGIN
    if (pn==='/api/login'&&method==='POST') {
      const d=await body(req);
      const u=await C.usuarios().findOne({username:(d.username||'').toLowerCase(),password:d.password});
      if(!u){ok({error:'Credenciales incorrectas'},401);return;}
      ok(wId(u)); return;
    }

    // ── POLIZAS ──────────────────────────────────────────────────────
    if (pn==='/api/polizas') {
      if (method==='GET') { ok((await C.polizas().find({}).toArray()).map(wId)); return; }
      if (method==='POST') {
        const d=await body(req);
        d.creadoEn=new Date();
        d.estatusCobroIdx=0; // 0=pendiente,1=liquidado,2=cobrado
        if (d.aseguradora&&d.tipo&&d.vendedor&&d.primaNeta) {
          d.comision=await calcComision(d.aseguradora,d.tipo,d.vendedor,parseFloat(d.primaNeta)||0);
        }
        const r=await C.polizas().insertOne(d);
        const created=await C.polizas().findOne({_id:r.insertedId});
        // crear comisión asociada
        if (d.comision) {
          await C.comisiones().insertOne({
            polizaId:r.insertedId.toString(), cliente:d.cliente,
            aseguradora:d.aseguradora, ramo:d.tipo, vendedor:d.vendedor,
            numero:d.numero||'', primaNeta:parseFloat(d.primaNeta)||0,
            pctAseguradora:d.comision.pctAseguradora, pctVendedor:d.comision.pctVendedor,
            comisionBroker:d.comision.comisionBroker, comisionVendedor:d.comision.comisionVendedor,
            facturado:false, cobrado:false, pagado:false,
            fechaCreacion:new Date(), vence:d.vence, inicio:d.inicio
          });
        }
        ok(wId(created),201); return;
      }
    }
    if (pn.startsWith('/api/polizas/')) {
      const id=pn.split('/').pop();
      if (method==='PUT') {
        const d=await body(req); delete d._id; delete d.id;
        if (d.aseguradora&&d.tipo&&d.vendedor&&d.primaNeta!==undefined) {
          d.comision=await calcComision(d.aseguradora,d.tipo,d.vendedor,parseFloat(d.primaNeta)||0);
          await C.comisiones().updateOne(
            {polizaId:id},
            {$set:{aseguradora:d.aseguradora,ramo:d.tipo,vendedor:d.vendedor,numero:d.numero||'',
              primaNeta:parseFloat(d.primaNeta)||0,pctAseguradora:d.comision.pctAseguradora,
              pctVendedor:d.comision.pctVendedor,comisionBroker:d.comision.comisionBroker,
              comisionVendedor:d.comision.comisionVendedor,inicio:d.inicio,vence:d.vence,cliente:d.cliente}}
          );
        }
        const r=await C.polizas().findOneAndUpdate({_id:toOid(id)},{$set:d},{returnDocument:'after'});
        if(!r){err('No encontrada',404);return;}
        ok(wId(r)); return;
      }
      if (method==='DELETE') {
        await C.polizas().deleteOne({_id:toOid(id)});
        await C.comisiones().deleteMany({polizaId:id});
        ok({ok:true}); return;
      }
    }

    // ── CRUD GENÉRICO (aseguradoras, ramos, vendedores, usuarios) ────
    const simples = {
      aseguradoras: C.aseguradoras,
      ramos:        C.ramos,
      vendedores:   C.vendedores,
      usuarios:     C.usuarios,
      'descuentos-pagos':  C.descPagos,
      'descuentos-cobros': C.descCobros,
    };
    for (const [seg, colFn] of Object.entries(simples)) {
      if (pn===`/api/${seg}`) {
        if (method==='GET') { ok((await colFn().find({}).toArray()).map(wId)); return; }
        if (method==='POST') {
          const d=await body(req);
          if (seg==='usuarios') {
            const ex=await colFn().findOne({username:d.username});
            if(ex){ok({error:'Usuario ya existe'},400);return;}
          }
          const r=await colFn().insertOne(d);
          ok(wId(await colFn().findOne({_id:r.insertedId})),201); return;
        }
      }
      if (pn.startsWith(`/api/${seg}/`)) {
        const id=pn.split('/').pop();
        if (method==='PUT') {
          const d=await body(req); delete d._id; delete d.id;
          const r=await colFn().findOneAndUpdate({_id:toOid(id)},{$set:d},{returnDocument:'after'});
          if(!r){err('No encontrada',404);return;}
          ok(wId(r)); return;
        }
        if (method==='DELETE') {
          await colFn().deleteOne({_id:toOid(id)}); ok({ok:true}); return;
        }
      }
    }

    // ── COMISIONES ───────────────────────────────────────────────────
    if (pn==='/api/comisiones') {
      if (method==='GET') { ok((await C.comisiones().find({}).toArray()).map(wId)); return; }
    }
    if (pn.startsWith('/api/comisiones/')) {
      const id=pn.split('/').pop();
      if (method==='PUT') {
        const d=await body(req); delete d._id; delete d.id;
        const r=await C.comisiones().findOneAndUpdate({_id:toOid(id)},{$set:d},{returnDocument:'after'});
        ok(wId(r)); return;
      }
    }

    // ── LIQUIDACIONES VENDEDORES ──────────────────────────────────────
    if (pn==='/api/liquidaciones') {
      if (method==='GET') { ok((await C.liquidaciones().find({}).sort({fecha:-1}).toArray()).map(wId)); return; }
      if (method==='POST') {
        const d=await body(req); d.fecha=new Date(); d.estatus='emitida';
        const r=await C.liquidaciones().insertOne(d);
        // marcar comisiones incluidas como pagadas
        if (d.comisionIds?.length)
          await C.comisiones().updateMany(
            {_id:{$in:d.comisionIds.map(toOid)}},
            {$set:{pagado:true,liquidacionId:r.insertedId.toString()}}
          );
        ok(wId(await C.liquidaciones().findOne({_id:r.insertedId})),201); return;
      }
    }
    if (pn.startsWith('/api/liquidaciones/')) {
      const id=pn.split('/').pop();
      if (method==='DELETE') {
        await C.comisiones().updateMany({liquidacionId:id},{$set:{pagado:false,liquidacionId:null}});
        await C.liquidaciones().deleteOne({_id:toOid(id)}); ok({ok:true}); return;
      }
    }

    // ── LIQUIDACIONES COBROS (aseguradoras) ──────────────────────────
    if (pn==='/api/liquidaciones-cobros') {
      if (method==='GET') { ok((await C.liqCobros().find({}).sort({fecha:-1}).toArray()).map(wId)); return; }
      if (method==='POST') {
        const d=await body(req); d.fecha=new Date(); d.estatus='emitida';
        const r=await C.liqCobros().insertOne(d);
        // cambiar estatus de las pólizas incluidas a 1=liquidado
        if (d.polizaIds?.length)
          await C.polizas().updateMany(
            {_id:{$in:d.polizaIds.map(toOid)}},
            {$set:{estatusCobroIdx:1, ultimaLiqCobroId:r.insertedId.toString()}}
          );
        // marcar comisiones broker como facturadas
        if (d.comisionIds?.length)
          await C.comisiones().updateMany(
            {_id:{$in:d.comisionIds.map(toOid)}},
            {$set:{facturado:true,liqCobroId:r.insertedId.toString()}}
          );
        ok(wId(await C.liqCobros().findOne({_id:r.insertedId})),201); return;
      }
    }
    if (pn.startsWith('/api/liquidaciones-cobros/')) {
      const id=pn.split('/').pop();
      if (method==='DELETE') {
        const liq=await C.liqCobros().findOne({_id:toOid(id)});
        if (liq?.polizaIds?.length)
          await C.polizas().updateMany(
            {_id:{$in:liq.polizaIds.map(toOid)}},
            {$set:{estatusCobroIdx:0,ultimaLiqCobroId:null}}
          );
        if (liq?.comisionIds?.length)
          await C.comisiones().updateMany(
            {_id:{$in:liq.comisionIds.map(toOid)}},
            {$set:{facturado:false,liqCobroId:null}}
          );
        await C.liqCobros().deleteOne({_id:toOid(id)}); ok({ok:true}); return;
      }
    }

    // ── MOVIMIENTOS PAGOS (diario de pagos a vendedores) ─────────────
    if (pn==='/api/movimientos-pagos') {
      if (method==='GET') { ok((await C.movPagos().find({}).sort({fecha:-1}).toArray()).map(wId)); return; }
      if (method==='POST') {
        const d=await body(req); d.fecha=new Date(d.fecha||Date.now());
        const r=await C.movPagos().insertOne(d);
        ok(wId(await C.movPagos().findOne({_id:r.insertedId})),201); return;
      }
    }
    if (pn.startsWith('/api/movimientos-pagos/')) {
      const id=pn.split('/').pop();
      if (method==='DELETE') {
        await C.movPagos().deleteOne({_id:toOid(id)}); ok({ok:true}); return;
      }
    }

    // ── MOVIMIENTOS COBROS (diario de cobros de aseguradoras) ─────────
    if (pn==='/api/movimientos-cobros') {
      if (method==='GET') { ok((await C.movCobros().find({}).sort({fecha:-1}).toArray()).map(wId)); return; }
      if (method==='POST') {
        const d=await body(req); d.fecha=new Date(d.fecha||Date.now());
        const r=await C.movCobros().insertOne(d);
        // Si el cobro completa la liquidación → cambiar pólizas a verde
        if (d.liquidacionCobroId) {
          const liq=await C.liqCobros().findOne({_id:toOid(d.liquidacionCobroId)});
          if (liq) {
            // sumar todos los cobros de esta liquidación
            const cobros=await C.movCobros().find({liquidacionCobroId:d.liquidacionCobroId}).toArray();
            const totalCobrado=cobros.reduce((s,c)=>s+(parseFloat(c.monto)||0),0);
            if (totalCobrado>=liq.totalNeto) {
              // cobro completo → verde
              if (liq.polizaIds?.length)
                await C.polizas().updateMany(
                  {_id:{$in:liq.polizaIds.map(toOid)}},
                  {$set:{estatusCobroIdx:2}}
                );
              await C.liqCobros().updateOne({_id:toOid(d.liquidacionCobroId)},{$set:{estatus:'cobrada'}});
              if (liq.comisionIds?.length)
                await C.comisiones().updateMany(
                  {_id:{$in:liq.comisionIds.map(toOid)}},
                  {$set:{cobrado:true}}
                );
            }
          }
        }
        ok(wId(await C.movCobros().findOne({_id:r.insertedId})),201); return;
      }
    }
    if (pn.startsWith('/api/movimientos-cobros/')) {
      const id=pn.split('/').pop();
      if (method==='DELETE') {
        await C.movCobros().deleteOne({_id:toOid(id)}); ok({ok:true}); return;
      }
    }

    res.writeHead(404); res.end('Ruta no encontrada');
  } catch(e) {
    console.error('Error:', e.message);
    res.writeHead(500); res.end('Error interno');
  }
});

conectar().then(()=>{
  server.listen(PORT,'0.0.0.0',()=>{
    console.log('');
    console.log('==============================================');
    console.log('  Reyna Seguros Gestion v3.1 - MongoDB Atlas');
    console.log(`  Puerto: ${PORT}`);
    console.log('==============================================');
  });
});
