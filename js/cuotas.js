// ════════════════════════════════════════════════════════════════════
// CUOTAS MENSUALES - vista, filtros, marcar liquidada, export CSV/PDF
// ════════════════════════════════════════════════════════════════════

let cuotasFiltroMes = '';        // 'YYYY-MM' o '' (todos)
let cuotasFiltroEntidad = '';    // aseguradora o vendedor (según tab)
let cuotasFiltroEstado = 'pendientes'; // 'todas'|'pendientes'|'vencidas'|'liquidadas'
let cuotasSubtab = 'cobros';     // 'cobros'|'pagos'

function cuotasVisibles(tipo){
  let lista = cuotasMensuales.filter(c=>c.tipoCuota===tipo);
  if (esVendedorRestringido()) {
    // Vendedor solo ve sus pagos (no cobros a aseguradoras)
    if (tipo==='cobro') return [];
    lista = lista.filter(c=>c.vendedor===(currentUser.vendedor||''));
  }
  return lista;
}

function fechaVencidaCuota(c){
  if (c.estado==='liquidada') return false;
  const hoy = new Date(); hoy.setHours(0,0,0,0);
  const f = new Date(c.fechaVencimiento+'T00:00:00');
  return f < hoy;
}

function filtrarCuotas(lista){
  return lista.filter(c=>{
    if (cuotasFiltroMes) {
      const ym = (c.fechaVencimiento||'').substring(0,7);
      if (ym!==cuotasFiltroMes) return false;
    }
    if (cuotasFiltroEntidad) {
      const nombre = cuotasSubtab==='cobros'?c.aseguradora:c.vendedor;
      if (nombre!==cuotasFiltroEntidad) return false;
    }
    if (cuotasFiltroEstado==='pendientes' && c.estado!=='pendiente') return false;
    if (cuotasFiltroEstado==='liquidadas' && c.estado!=='liquidada') return false;
    if (cuotasFiltroEstado==='vencidas' && !fechaVencidaCuota(c)) return false;
    return true;
  }).sort((a,b)=>(a.fechaVencimiento||'').localeCompare(b.fechaVencimiento||'')
                 || (a.polizaCliente||'').localeCompare(b.polizaCliente||''));
}

function renderCuotas(){
  const c = document.getElementById('cuotas-content');
  if (!c) return;
  const esVend = esVendedorRestringido();
  const cobrosPend = cuotasVisibles('cobro').filter(x=>x.estado==='pendiente').length;
  const pagosPend  = cuotasVisibles('pago').filter(x=>x.estado==='pendiente').length;
  const cobrosVenc = cuotasVisibles('cobro').filter(fechaVencidaCuota).length;
  const pagosVenc  = cuotasVisibles('pago').filter(fechaVencidaCuota).length;

  const tabCobros = esVend ? '' :
    `<button class="subtab ${cuotasSubtab==='cobros'?'active':''}" onclick="cambiarSubtabCuotas('cobros')">Cobros a aseguradoras ${cobrosVenc?`<span style="background:#dc2626;color:#fff;border-radius:10px;padding:1px 7px;font-size:11px;margin-left:4px">${cobrosVenc}</span>`:''}</button>`;
  const tabPagos =
    `<button class="subtab ${cuotasSubtab==='pagos'?'active':''}" onclick="cambiarSubtabCuotas('pagos')">${esVend?'Mis pagos':'Pagos a vendedores'} ${pagosVenc?`<span style="background:#dc2626;color:#fff;border-radius:10px;padding:1px 7px;font-size:11px;margin-left:4px">${pagosVenc}</span>`:''}</button>`;

  // Si el vendedor está viendo, forzar subtab pagos
  if (esVend) cuotasSubtab='pagos';

  c.innerHTML = `
    <div class="subtabs">${tabCobros}${tabPagos}</div>
    <div class="table-toolbar" style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin:12px 0">
      <label style="font-size:12px;color:#64748b">Mes:</label>
      <input type="month" id="cuotas-filtro-mes" value="${cuotasFiltroMes}" onchange="cuotasFiltroMes=this.value;renderCuotasTabla()" style="font-size:12px;padding:6px 8px;border:1px solid var(--color-border-secondary,#e2e8f0);border-radius:6px">
      <select id="cuotas-filtro-entidad" onchange="cuotasFiltroEntidad=this.value;renderCuotasTabla()" style="font-size:12px;padding:6px 8px;border:1px solid var(--color-border-secondary,#e2e8f0);border-radius:6px"></select>
      <select id="cuotas-filtro-estado" onchange="cuotasFiltroEstado=this.value;renderCuotasTabla()" style="font-size:12px;padding:6px 8px;border:1px solid var(--color-border-secondary,#e2e8f0);border-radius:6px">
        <option value="pendientes" ${cuotasFiltroEstado==='pendientes'?'selected':''}>Solo pendientes</option>
        <option value="vencidas" ${cuotasFiltroEstado==='vencidas'?'selected':''}>Solo vencidas</option>
        <option value="liquidadas" ${cuotasFiltroEstado==='liquidadas'?'selected':''}>Solo liquidadas</option>
        <option value="todas" ${cuotasFiltroEstado==='todas'?'selected':''}>Todas</option>
      </select>
      <button class="btn btn-outline btn-sm" onclick="cuotasFiltroMes='';cuotasFiltroEntidad='';cuotasFiltroEstado='pendientes';renderCuotas()"><i class="ti ti-x" aria-hidden="true"></i> Limpiar</button>
      <div style="margin-left:auto;display:flex;gap:6px">
        <button class="btn btn-outline btn-sm" onclick="exportCuotasCSV()"><i class="ti ti-file-spreadsheet" aria-hidden="true"></i> CSV</button>
        <button class="btn btn-outline btn-sm" onclick="exportCuotasPDF()"><i class="ti ti-file-text" aria-hidden="true"></i> PDF</button>
      </div>
    </div>
    <div id="cuotas-summary" style="margin-bottom:10px"></div>
    <div id="cuotas-tabla-wrap"></div>`;
  poblarFiltroEntidadCuotas();
  renderCuotasTabla();
}

function poblarFiltroEntidadCuotas(){
  const sel=document.getElementById('cuotas-filtro-entidad');
  if(!sel)return;
  const esVend=esVendedorRestringido();
  const tipo=cuotasSubtab==='cobros'?'cobro':'pago';
  const lista=cuotasVisibles(tipo);
  const nombres=[...new Set(lista.map(c=>cuotasSubtab==='cobros'?c.aseguradora:c.vendedor).filter(Boolean))].sort();
  const label=cuotasSubtab==='cobros'?'Todas las aseguradoras':(esVend?'':'Todos los vendedores');
  sel.innerHTML=`<option value="">${label}</option>`+nombres.map(n=>`<option ${cuotasFiltroEntidad===n?'selected':''}>${n}</option>`).join('');
  // Vendedor restringido: forzar su propio nombre y ocultar selector
  if (esVend) {
    sel.style.display='none';
    cuotasFiltroEntidad='';
  } else {
    sel.style.display='';
  }
}

function cambiarSubtabCuotas(sub){
  cuotasSubtab=sub;
  cuotasFiltroEntidad='';
  renderCuotas();
}

function renderCuotasTabla(){
  const wrap=document.getElementById('cuotas-tabla-wrap');
  if(!wrap)return;
  const tipo=cuotasSubtab==='cobros'?'cobro':'pago';
  const lista=filtrarCuotas(cuotasVisibles(tipo));
  const esVend=esVendedorRestringido();
  const canEdit=!esVend && (currentUser.role==='admin'||currentUser.role==='editor');
  const totalMonto=lista.reduce((s,c)=>s+(parseFloat(c.monto)||0),0);
  const totalPend=lista.filter(c=>c.estado==='pendiente').reduce((s,c)=>s+(parseFloat(c.monto)||0),0);
  const totalLiq=lista.filter(c=>c.estado==='liquidada').reduce((s,c)=>s+(parseFloat(c.monto)||0),0);
  const sumary=document.getElementById('cuotas-summary');
  if(sumary){
    const colorTitulo=tipo==='cobro'?COLOR_COBROS:'#1a2744';
    sumary.innerHTML=`
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:10px">
        <div class="stat"><div class="stat-label">Cuotas mostradas</div><div class="stat-value" style="color:${colorTitulo}">${lista.length}</div></div>
        <div class="stat"><div class="stat-label">Total</div><div class="stat-value" style="color:${colorTitulo}">${fmtMoney(totalMonto)}</div></div>
        <div class="stat"><div class="stat-label">Pendiente</div><div class="stat-value red">${fmtMoney(totalPend)}</div></div>
        <div class="stat"><div class="stat-label">Liquidado</div><div class="stat-value green">${fmtMoney(totalLiq)}</div></div>
      </div>`;
  }
  if(!lista.length){
    wrap.innerHTML=`<div class="empty-state"><i class="ti ti-calendar-off"></i>No hay cuotas para los filtros seleccionados.</div>`;
    return;
  }
  const tituloEntidad=tipo==='cobro'?'Aseguradora':'Vendedor';
  const filas=lista.map(c=>{
    const venc=fechaVencidaCuota(c);
    let estadoBadge, liqRef='';
    if (c.estado==='liquidada') {
      estadoBadge=`<span class="badge badge-green">Liquidada</span>`;
      if (c.liquidacionId) {
        // Buscar la liquidación referenciada
        const liq = tipo==='cobro'
          ? (liqCobros||[]).find(x=>x.id===c.liquidacionId)
          : (liquidaciones||[]).find(x=>x.id===c.liquidacionId);
        if (liq) {
          const fLiq = liq.fecha ? new Date(liq.fecha).toLocaleDateString('es-EC') : '';
          liqRef=`<div style="font-size:10px;color:#64748b;margin-top:2px">Liq. ${fLiq} · ${fmtMoney(liq.totalNeto||liq.total||0)}</div>`;
        }
      }
    } else {
      estadoBadge=venc?`<span class="badge badge-red">Vencida</span>`:`<span class="badge badge-amber">Pendiente</span>`;
    }
    const entidad=tipo==='cobro'?c.aseguradora:c.vendedor;
    const btn=canEdit
      ? (c.estado==='liquidada'
          ? `<button class="btn-icon" title="Desmarcar" onclick="cambiarEstadoCuota('${c.id}','pendiente')"><i class="ti ti-arrow-back-up"></i></button>`
          : `<button class="btn-icon" style="color:#16a34a;border-color:#bbf7d0" title="Marcar como liquidada" onclick="cambiarEstadoCuota('${c.id}','liquidada')"><i class="ti ti-check"></i></button>`)
      : '';
    return `<tr${venc?' style="background:#fef2f2"':''}>
      <td>${fd(c.fechaVencimiento)}</td>
      <td>${c.numeroCuota}/12</td>
      <td>${c.polizaCliente||'-'}</td>
      <td>${c.polizaNumero||'-'}</td>
      <td>${c.ramo||'-'}</td>
      <td>${entidad||'-'}</td>
      <td style="text-align:right">${fmtMoney(c.primaNetaMensual)}</td>
      <td style="text-align:right">${c.pctComision||0}%</td>
      <td style="text-align:right;font-weight:600">${fmtMoney(c.monto)}</td>
      <td style="text-align:center">${estadoBadge}${liqRef}</td>
      <td style="text-align:center">${btn}</td>
    </tr>`;
  }).join('');
  wrap.innerHTML=`
    <div class="table-wrap"><div class="table-scroll"><table>
      <thead><tr>
        <th style="width:9%">Vence</th>
        <th style="width:6%">Cuota</th>
        <th style="width:16%">Cliente</th>
        <th style="width:9%">N° Póliza</th>
        <th style="width:12%">Ramo</th>
        <th style="width:14%">${tituloEntidad}</th>
        <th style="width:9%;text-align:right">Prima mens.</th>
        <th style="width:5%;text-align:right">%</th>
        <th style="width:8%;text-align:right">Monto</th>
        <th style="width:8%;text-align:center">Estado</th>
        <th style="width:4%;text-align:center">Acción</th>
      </tr></thead>
      <tbody>${filas}</tbody>
    </table></div></div>`;
}

async function cambiarEstadoCuota(id, nuevoEstado){
  const cu=cuotasMensuales.find(x=>x.id===id);
  if(!cu)return;
  const data={...cu, estado:nuevoEstado, fechaLiquidada: nuevoEstado==='liquidada'?new Date().toISOString():null};
  delete data.id; delete data._id;
  try{
    const act=await apiPut('cuotas-mensuales',id,data);
    const i=cuotasMensuales.findIndex(x=>x.id===id);
    cuotasMensuales[i]=act;
    renderCuotasTabla();
    mostrarToast(nuevoEstado==='liquidada'?'Cuota marcada como liquidada':'Cuota marcada como pendiente');
  }catch(e){mostrarToast('Error al actualizar cuota');}
}

// ── EXPORTS ─────────────────────────────────────────────────────────
function exportCuotasCSV(){
  const tipo=cuotasSubtab==='cobros'?'cobro':'pago';
  const lista=filtrarCuotas(cuotasVisibles(tipo));
  if(!lista.length){mostrarToast('No hay cuotas para exportar');return;}
  const entLabel=tipo==='cobro'?'Aseguradora':'Vendedor';
  const rows=[['Fecha vencimiento','N° cuota','Cliente','N° Póliza','Ramo',entLabel,'Prima mensual','% Comisión','Monto','Estado','Fecha liquidada']];
  lista.forEach(c=>rows.push([
    c.fechaVencimiento||'', `${c.numeroCuota}/12`, c.polizaCliente||'', c.polizaNumero||'',
    c.ramo||'', (tipo==='cobro'?c.aseguradora:c.vendedor)||'',
    (parseFloat(c.primaNetaMensual)||0).toFixed(2),
    (c.pctComision||0)+'%',
    (parseFloat(c.monto)||0).toFixed(2),
    c.estado||'',
    c.fechaLiquidada?new Date(c.fechaLiquidada).toISOString().split('T')[0]:''
  ]));
  const csv=rows.map(r=>r.map(v=>`"${(v+'').replace(/"/g,'""')}"`).join(',')).join('\n');
  const blob=new Blob(['\ufeff'+csv],{type:'text/csv;charset=utf-8;'});
  const url=URL.createObjectURL(blob);
  const a=document.createElement('a');
  a.href=url; a.download=`Cuotas_${tipo}_${new Date().toISOString().split('T')[0]}.csv`;
  a.click(); URL.revokeObjectURL(url);
  mostrarToast('CSV exportado');
}

function exportCuotasPDF(){
  const tipo=cuotasSubtab==='cobros'?'cobro':'pago';
  const lista=filtrarCuotas(cuotasVisibles(tipo));
  if(!lista.length){mostrarToast('No hay cuotas para exportar');return;}
  const entLabel=tipo==='cobro'?'Aseguradora':'Vendedor';
  const titulo=tipo==='cobro'?'Cuotas mensuales por cobrar a aseguradoras':'Cuotas mensuales por pagar a vendedores';
  const totalMonto=lista.reduce((s,c)=>s+(parseFloat(c.monto)||0),0);
  const totalPend=lista.filter(c=>c.estado==='pendiente').reduce((s,c)=>s+(parseFloat(c.monto)||0),0);
  const totalLiq=lista.filter(c=>c.estado==='liquidada').reduce((s,c)=>s+(parseFloat(c.monto)||0),0);
  const filas=lista.map(c=>{
    const venc=fechaVencidaCuota(c);
    const est=c.estado==='liquidada'?'Liquidada':(venc?'Vencida':'Pendiente');
    return `<tr${venc?' style="background:#fef2f2"':''}>
      <td>${c.fechaVencimiento||''}</td>
      <td>${c.numeroCuota}/12</td>
      <td>${c.polizaCliente||''}</td>
      <td>${c.polizaNumero||''}</td>
      <td>${c.ramo||''}</td>
      <td>${(tipo==='cobro'?c.aseguradora:c.vendedor)||''}</td>
      <td style="text-align:right">${fmtMoney(c.primaNetaMensual)}</td>
      <td style="text-align:right">${c.pctComision||0}%</td>
      <td style="text-align:right">${fmtMoney(c.monto)}</td>
      <td>${est}</td>
    </tr>`;
  }).join('');
  const hoy=new Date().toLocaleDateString('es-EC');
  const html=`<!doctype html><html><head><meta charset="utf-8"><title>${titulo}</title>
    <style>
      body{font-family:Arial,sans-serif;padding:20px;color:#1a2744}
      h1{color:#1a2744;font-size:18px;margin:0 0 4px 0}
      .sub{color:#64748b;font-size:11px;margin-bottom:14px}
      table{width:100%;border-collapse:collapse;font-size:11px}
      th{background:#1a2744;color:#fff;padding:6px;text-align:left}
      td{padding:5px 6px;border-bottom:0.5px solid #e2e8f0}
      .totales{margin-top:14px;padding:10px;background:#f8fafc;border-radius:6px}
      .totales div{display:flex;justify-content:space-between;padding:3px 0}
      .footer{margin-top:20px;font-size:9px;color:#64748b;text-align:center}
    </style></head>
    <body>
      <h1>Reyna Seguros — ${titulo}</h1>
      <div class="sub">Generado: ${hoy} · Filtro: ${cuotasFiltroMes||'Todos los meses'} · ${cuotasFiltroEntidad||'Todas las entidades'} · ${cuotasFiltroEstado}</div>
      <table>
        <thead><tr>
          <th>Vence</th><th>Cuota</th><th>Cliente</th><th>N° Póliza</th><th>Ramo</th><th>${entLabel}</th>
          <th style="text-align:right">Prima mens.</th><th style="text-align:right">%</th><th style="text-align:right">Monto</th><th>Estado</th>
        </tr></thead>
        <tbody>${filas}</tbody>
      </table>
      <div class="totales">
        <div><span>Cuotas mostradas</span><strong>${lista.length}</strong></div>
        <div><span>Total</span><strong>${fmtMoney(totalMonto)}</strong></div>
        <div><span>Pendiente</span><strong style="color:#dc2626">${fmtMoney(totalPend)}</strong></div>
        <div><span>Liquidado</span><strong style="color:#16a34a">${fmtMoney(totalLiq)}</strong></div>
      </div>
      <div class="footer">${FOOTER_TEXT}</div>
      <script>window.onload=()=>{window.print();setTimeout(()=>window.close(),500);}<\/script>
    </body></html>`;
  const w=window.open('','_blank');
  w.document.write(html); w.document.close();
}
