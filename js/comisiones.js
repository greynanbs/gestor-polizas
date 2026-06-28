// MÓDULO CONTABILIDAD — Pagos (vendedores) + Cobros (aseguradoras) + Balance
// ════════════════════════════════════════════════════════════════════
function cambiarSubtabContabilidad(sub){
  contabSubtab=sub;
  document.querySelectorAll('#view-contabilidad .subtab-contab').forEach(b=>b.classList.toggle('active',b.dataset.sub===sub));
  renderContabilidad();
}
function renderContabilidad(){
  const c=document.getElementById('contabilidad-content');
  if(contabSubtab==='pagos')   return renderContabPagos(c);
  if(contabSubtab==='cobros')  return renderContabCobros(c);
  if(contabSubtab==='balance') return renderContabBalance(c);
}

// ════════════════════════════════════════════════════════════════════
// PAGOS (vendedores)
// ════════════════════════════════════════════════════════════════════
function renderContabPagos(c){
  const vO=[...vendedores].sort((a,b)=>a.nombre.localeCompare(b.nombre));
  const totalLiquidado=liquidaciones.reduce((s,l)=>s+(l.totalNeto||0),0);
  // Anticipos activos = emitidos − descontados en liquidaciones
  const antEmitidosTot=movPagos.filter(m=>m.tipo==='Anticipo').reduce((s,m)=>s+(parseFloat(m.monto)||0),0);
  const antDescontadosTot=liquidaciones.reduce((s,l)=>s+((l.descuentosAplicados||[]).filter(d=>/^anticipo/i.test(d.nombre||'')).reduce((ss,d)=>ss+(parseFloat(d.monto)||0),0)),0);
  const anticiposActivos=Math.max(0,antEmitidosTot-antDescontadosTot);
  // Total pagado = solo pagos de liquidación (excluye anticipos)
  const totalPagado=movPagos.filter(m=>m.tipo!=='Anticipo').reduce((s,m)=>s+(parseFloat(m.monto)||0),0);
  // Pendiente = Total liquidado + Anticipos activos - Total pagado
  const pendientePagar=totalLiquidado-anticiposActivos-totalPagado;
  c.innerHTML=`
  <div class="stats-row">
    <div class="stat"><div class="stat-label">Total liquidado</div><div class="stat-value blue">${fmtMoney(totalLiquidado)}</div></div>
    <div class="stat"><div class="stat-label">Anticipos activos</div><div class="stat-value amber">${fmtMoney(anticiposActivos)}</div></div>
    <div class="stat"><div class="stat-label">Total pagado</div><div class="stat-value green">${fmtMoney(totalPagado)}</div></div>
    <div class="stat"><div class="stat-label">Pendiente pagar</div><div class="stat-value ${pendientePagar<0?'green':'red'}">${fmtMoney(pendientePagar)}</div></div>
  </div>
  <div class="toolbar">
    <select id="mpag-fvend" onchange="renderTablaPagos()"><option value="">Todos los vendedores</option>${vO.map(v=>`<option>${v.nombre}</option>`).join('')}</select>
    <select id="mpag-ftipo" onchange="renderTablaPagos()"><option value="">Todos los tipos</option>${[...new Set(movPagos.map(m=>m.tipo).filter(Boolean))].map(t=>`<option>${t}</option>`).join('')}</select>
    <select id="mpag-fperiodo" onchange="onPeriodoContabPagos()" style="font-size:12px;border:1px solid #e2e8f0;border-radius:6px;padding:5px 8px;background:#f8fafc;outline:none">
      <option value="todo">Todo el tiempo</option>
      <option value="semana">Esta semana</option><option value="mes">Este mes</option>
      <option value="trimestre">Este trimestre</option><option value="semestre">Este semestre</option>
      <option value="anio">Este año</option><option value="custom">Fechas específicas</option>
    </select>
    <div id="mpag-custom" style="display:none;gap:6px;align-items:flex-end">
      <input type="date" id="mpag-fi" onchange="renderTablaPagos()" style="font-size:12px;border:1px solid #e2e8f0;border-radius:6px;padding:5px 8px;background:#f8fafc;outline:none">
      <input type="date" id="mpag-ff" onchange="renderTablaPagos()" style="font-size:12px;border:1px solid #e2e8f0;border-radius:6px;padding:5px 8px;background:#f8fafc;outline:none">
    </div>
    <button class="btn btn-outline btn-sm" style="margin-left:auto" onclick="exportarDiarioPagosCSV()"><i class="ti ti-download" aria-hidden="true"></i> CSV</button>
    <button class="btn btn-outline btn-sm" onclick="exportarDiarioPagosPDF()"><i class="ti ti-file-text" aria-hidden="true"></i> PDF</button>
    <button class="btn btn-primary btn-sm" onclick="abrirModalMovPago()"><i class="ti ti-plus" aria-hidden="true"></i> Nuevo movimiento</button>
  </div>
  <div class="table-wrap"><div class="table-scroll"><table><thead><tr><th>Fecha</th><th>Vendedor</th><th>Tipo</th><th>Descripción</th><th>Comprobante</th><th>Liquidación ref.</th><th style="text-align:right">Monto</th><th>Acciones</th></tr></thead><tbody id="mpag-tbody"></tbody><tfoot id="mpag-tfoot"></tfoot></table></div></div>`;
  renderTablaPagos();
}

function onPeriodoContabPagos(){
  const p=(document.getElementById('mpag-fperiodo')||{}).value;
  const div=document.getElementById('mpag-custom');
  if(div) div.style.display=p==='custom'?'flex':'none';
  renderTablaPagos();
}
function renderTablaPagos(){
  const fV=(document.getElementById('mpag-fvend')||{}).value||'';
  const fT=(document.getElementById('mpag-ftipo')||{}).value||'';
  const p=(document.getElementById('mpag-fperiodo')||{}).value||'todo';
  let ini=null,fin=null;
  if(p!=='todo'&&p!=='custom'){
    fin=new Date();fin.setHours(23,59,59,999);
    ini=new Date();ini.setHours(0,0,0,0);
    if(p==='semana') ini.setDate(ini.getDate()-ini.getDay());
    else if(p==='mes') ini.setDate(1);
    else if(p==='trimestre') ini.setMonth(Math.floor(ini.getMonth()/3)*3,1);
    else if(p==='semestre') ini.setMonth(Math.floor(ini.getMonth()/6)*6,1);
    else if(p==='anio') ini.setMonth(0,1);
  } else if(p==='custom'){
    const vi=(document.getElementById('mpag-fi')||{}).value;
    const vf=(document.getElementById('mpag-ff')||{}).value;
    if(vi) ini=new Date(vi+'T00:00:00');
    if(vf) fin=new Date(vf+'T23:59:59');
  }
  const canDel=puedeEliminar();
  const lista=movPagos.filter(m=>{
    if(fV&&m.vendedor!==fV) return false;
    if(fT&&m.tipo!==fT) return false;
    if(ini||fin){const d=new Date(m.fecha);if(ini&&d<ini)return false;if(fin&&d>fin)return false;}
    return true;
  });
  const tbody=document.getElementById('mpag-tbody');
  const tfoot=document.getElementById('mpag-tfoot');
  if(!tbody)return;
  if(!lista.length){tbody.innerHTML='<tr><td colspan="8"><div class="empty-state"><i class="ti ti-receipt"></i>No hay movimientos de pago.</div></td></tr>';if(tfoot)tfoot.innerHTML='';return;}
  const totalMonto=lista.reduce((s,m)=>s+(parseFloat(m.monto)||0),0);
  tbody.innerHTML=lista.map(m=>{
    const liq=m.liquidacionId?liquidaciones.find(x=>x.id===m.liquidacionId):null;
    return`<tr><td>${fd(m.fecha)}</td><td>${m.vendedor}</td><td><span class="badge badge-blue">${m.tipo}</span></td><td>${m.descripcion||'—'}</td><td>${m.comprobante||'—'}</td><td>${liq?`${liq.vendedor} — ${new Date(liq.fecha).toLocaleDateString('es-EC')}`:'—'}</td><td style="text-align:right;font-weight:600;color:#16a34a">${fmtMoney(m.monto)}</td><td><div style="display:flex;gap:4px"><button class="btn-icon" onclick="exportarMovPagoCSV('${m.id}')" title="CSV"><i class="ti ti-table"></i></button><button class="btn-icon" onclick="exportarMovPagoPDF('${m.id}')" title="PDF"><i class="ti ti-file-text"></i></button>${canDel?`<button class="btn-icon danger" onclick="eliminarMovPago('${m.id}')" title="Eliminar"><i class="ti ti-trash"></i></button>`:''}</div></td></tr>`;
  }).join('');
  if(tfoot) tfoot.innerHTML=`<tr style="background:#f1f5f9;font-weight:700"><td colspan="6" style="text-align:right;padding:5px 8px">TOTAL</td><td style="text-align:right;padding:5px 8px;color:#16a34a">${fmtMoney(totalMonto)}</td><td></td></tr>`;
}

function abrirModalMovPago(){
  const vO=[...vendedores].sort((a,b)=>a.nombre.localeCompare(b.nombre));
  document.getElementById('mp-vendedor').innerHTML='<option value="">Seleccionar...</option>'+vO.map(v=>`<option>${v.nombre}</option>`).join('');
  document.getElementById('mp-vendedor').value='';
  const tipos=[...new Set(['Pago liquidación','Anticipo',...descPagos.map(d=>d.nombre)])];
  document.getElementById('mp-tipo').innerHTML='<option value="">Seleccionar...</option>'+tipos.map(t=>`<option>${t}</option>`).join('');
  document.getElementById('mp-liq').innerHTML='<option value="">Ninguna (anticipo libre)</option>';
  document.getElementById('mp-monto').value='';
  document.getElementById('mp-fecha').value=new Date().toISOString().split('T')[0];
  document.getElementById('mp-comprobante').value='';
  document.getElementById('mp-descripcion').value='';
  document.getElementById('mp-error').style.display='none';
  abrirOverlay('overlay-movpago');
}

function cargarLiquidacionesVendedor(){
  const vend=document.getElementById('mp-vendedor').value;
  const sel=document.getElementById('mp-liq');
  sel.innerHTML='<option value="">Ninguna (anticipo libre)</option>';
  if(!vend)return;
  liquidaciones.filter(l=>l.vendedor===vend).forEach(l=>{
    const fecha=new Date(l.fecha).toLocaleDateString('es-EC');
    sel.innerHTML+=`<option value="${l.id}">#LIQ — ${fecha} — ${fmtMoney(l.totalNeto)}</option>`;
  });
}

async function guardarMovPago(){
  const vendedor=document.getElementById('mp-vendedor').value;
  const tipo=document.getElementById('mp-tipo').value;
  const monto=parseFloat(document.getElementById('mp-monto').value)||0;
  const fecha=document.getElementById('mp-fecha').value;
  const comprobante=document.getElementById('mp-comprobante').value.trim();
  const descripcion=document.getElementById('mp-descripcion').value.trim();
  const liquidacionId=document.getElementById('mp-liq').value||null;
  const err=document.getElementById('mp-error');
  if(!vendedor||!tipo||!monto){err.textContent='Vendedor, tipo y monto son obligatorios';err.style.display='block';return;}
  try{
    const nv=await apiPost('movimientos-pagos',{vendedor,tipo,monto,fecha,comprobante,descripcion,liquidacionId,aplicado:false});
    movPagos.unshift(nv);cerrarModal('overlay-movpago');renderContabilidad();mostrarToast('Movimiento registrado');
  }catch(e){err.textContent='Error al guardar';err.style.display='block';}
}

function exportarMovPagoCSV(id){
  const m=movPagos.find(x=>x.id===id);
  if(!m) return;
  const liq=m.liquidacionId?liquidaciones.find(x=>x.id===m.liquidacionId):null;
  let csv=`MOVIMIENTO DE PAGO - REYNA SEGUROS GESTION\n`;
  csv+=`Fecha:,${fd(m.fecha)}\nVendedor:,${m.vendedor}\nTipo:,${m.tipo}\nDescripcion:,${m.descripcion||''}\nComprobante:,${m.comprobante||''}\nLiquidacion ref.:,${liq?liq.vendedor+' - '+fd(liq.fecha):''}\nMonto:,${m.monto}\n`;
  const blob=new Blob(['\uFEFF'+csv],{type:'text/csv;charset=utf-8'});
  const a=document.createElement('a');a.href=URL.createObjectURL(blob);
  a.download=`pago_${m.vendedor.replace(/\s+/g,'_')}_${fd(m.fecha)}.csv`;a.click();
}
function exportarMovPagoPDF(id){
  const m=movPagos.find(x=>x.id===id);
  if(!m) return;
  const liq=m.liquidacionId?liquidaciones.find(x=>x.id===m.liquidacionId):null;
  const logoB64=document.querySelector('#login-screen .login-logo img').src;
  const html=`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Pago ${m.vendedor}</title><style>body{font-family:Arial,sans-serif;font-size:13px;padding:2rem;color:#1a1a2e}.header{display:flex;align-items:center;gap:16px;border-bottom:2px solid #1a2744;padding-bottom:12px;margin-bottom:20px}.logo{width:48px;height:48px;border-radius:8px;overflow:hidden}.logo img{width:100%;height:100%;object-fit:cover}.title{font-size:16px;font-weight:700;color:#1a2744}.sub{font-size:10px;color:#64748b}.grid{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:16px}.card{background:#f8fafc;border:1px solid #e2e8f0;border-radius:6px;padding:10px 12px}.card-lbl{font-size:10px;color:#64748b;text-transform:uppercase;margin-bottom:3px}.card-val{font-size:15px;font-weight:700}.amount{background:#1a2744;color:#fff;border-radius:8px;padding:14px 16px;display:flex;justify-content:space-between;align-items:center;margin-top:16px;font-size:16px;font-weight:700}.footer{text-align:center;font-size:9px;color:#94a3b8;margin-top:20px;border-top:1px solid #e2e8f0;padding-top:8px}</style></head><body>
  <div class="header"><div class="logo"><img src="${logoB64}"></div><div style="flex:1"><div class="title">Reyna Seguros Gesti\u00f3n</div><div class="sub">Asesor\u00eda experta y protecci\u00f3n a tu medida</div></div><div style="text-align:right"><div style="font-size:13px;font-weight:700;color:#D97757">Comprobante de pago</div><div style="font-size:10px;color:#64748b">Fecha: ${fd(m.fecha)}</div></div></div>
  <div class="grid">
    <div class="card"><div class="card-lbl">Vendedor</div><div class="card-val">${m.vendedor}</div></div>
    <div class="card"><div class="card-lbl">Tipo</div><div class="card-val">${m.tipo}</div></div>
    <div class="card"><div class="card-lbl">Comprobante</div><div class="card-val">${m.comprobante||'—'}</div></div>
    <div class="card"><div class="card-lbl">Descripci\u00f3n</div><div class="card-val">${m.descripcion||'—'}</div></div>
    ${liq?`<div class="card" style="grid-column:1/-1"><div class="card-lbl">Liquidaci\u00f3n referenciada</div><div class="card-val">${liq.vendedor} — ${fd(liq.fecha)}</div></div>`:''}
  </div>
  <div class="amount"><span>MONTO PAGADO</span><span style="color:#4ade80">${fmtMoney(m.monto)}</span></div>
  <div class="footer">${FOOTER_TEXT}</div>
  </body></html>`;
  const w=window.open('','_blank');w.document.write(html);w.document.close();w.print();
}
function exportarMovCobroCSV(id){
  const m=movCobros.find(x=>x.id===id);
  if(!m) return;
  const liq=m.liquidacionCobroId?liqCobros.find(x=>x.id===m.liquidacionCobroId):null;
  let csv=`MOVIMIENTO DE COBRO - REYNA SEGUROS GESTION\n`;
  csv+=`Fecha:,${fd(m.fecha)}\nAseguradora:,${m.aseguradora}\nTipo:,${m.tipo}\nDescripcion:,${m.descripcion||''}\nComprobante:,${m.comprobante||''}\nLiquidacion ref.:,${liq?liq.aseguradora+' - '+fd(liq.fecha):''}\nMonto:,${m.monto}\n`;
  const blob=new Blob(['\uFEFF'+csv],{type:'text/csv;charset=utf-8'});
  const a=document.createElement('a');a.href=URL.createObjectURL(blob);
  a.download=`cobro_${m.aseguradora.replace(/\s+/g,'_')}_${fd(m.fecha)}.csv`;a.click();
}
function exportarMovCobroPDF(id){
  const m=movCobros.find(x=>x.id===id);
  if(!m) return;
  const liq=m.liquidacionCobroId?liqCobros.find(x=>x.id===m.liquidacionCobroId):null;
  const logoB64=document.querySelector('#login-screen .login-logo img').src;
  const html=`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Cobro ${m.aseguradora}</title><style>body{font-family:Arial,sans-serif;font-size:13px;padding:2rem;color:#1a1a2e}.header{display:flex;align-items:center;gap:16px;border-bottom:2px solid #D97757;padding-bottom:12px;margin-bottom:20px}.logo{width:48px;height:48px;border-radius:8px;overflow:hidden}.logo img{width:100%;height:100%;object-fit:cover}.title{font-size:16px;font-weight:700;color:#1a2744}.sub{font-size:10px;color:#64748b}.grid{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:16px}.card{background:#f8fafc;border:1px solid #e2e8f0;border-radius:6px;padding:10px 12px}.card-lbl{font-size:10px;color:#64748b;text-transform:uppercase;margin-bottom:3px}.card-val{font-size:15px;font-weight:700}.amount{background:#D97757;color:#fff;border-radius:8px;padding:14px 16px;display:flex;justify-content:space-between;align-items:center;margin-top:16px;font-size:16px;font-weight:700}.footer{text-align:center;font-size:9px;color:#94a3b8;margin-top:20px;border-top:1px solid #e2e8f0;padding-top:8px}</style></head><body>
  <div class="header"><div class="logo"><img src="${logoB64}"></div><div style="flex:1"><div class="title">Reyna Seguros Gesti\u00f3n</div><div class="sub">Asesor\u00eda experta y protecci\u00f3n a tu medida</div></div><div style="text-align:right"><div style="font-size:13px;font-weight:700;color:#D97757">Comprobante de cobro</div><div style="font-size:10px;color:#64748b">Fecha: ${fd(m.fecha)}</div></div></div>
  <div class="grid">
    <div class="card"><div class="card-lbl">Aseguradora</div><div class="card-val">${m.aseguradora}</div></div>
    <div class="card"><div class="card-lbl">Tipo</div><div class="card-val">${m.tipo}</div></div>
    <div class="card"><div class="card-lbl">Comprobante</div><div class="card-val">${m.comprobante||'—'}</div></div>
    <div class="card"><div class="card-lbl">Descripci\u00f3n</div><div class="card-val">${m.descripcion||'—'}</div></div>
    ${liq?`<div class="card" style="grid-column:1/-1"><div class="card-lbl">Liquidaci\u00f3n referenciada</div><div class="card-val">${liq.aseguradora} — ${fd(liq.fecha)}</div></div>`:''}
  </div>
  <div class="amount"><span>MONTO COBRADO</span><span>${fmtMoney(m.monto)}</span></div>
  <div class="footer">${FOOTER_TEXT}</div>
  </body></html>`;
  const w=window.open('','_blank');w.document.write(html);w.document.close();w.print();
}

async function eliminarMovPago(id){
  if(!confirm('¿Eliminar este movimiento?'))return;
  try{
    await apiDel('movimientos-pagos',id);
    movPagos=movPagos.filter(x=>x.id!==id);
    renderContabilidad();
    // Refrescar tablas de comisiones y contabilidad balance si están visibles
    renderTablaBalanceVendedores();
    renderTablaContabVend();
    mostrarToast('Movimiento eliminado');
  }
  catch(e){mostrarToast('Error al eliminar');}
}

// ════════════════════════════════════════════════════════════════════
// COBROS (aseguradoras) — solo movimientos de cobro
// ════════════════════════════════════════════════════════════════════
function renderContabCobros(c){
  const aO=[...aseguradoras].sort((a,b)=>a.nombre.localeCompare(b.nombre));
  const totalCobrado=movCobros.reduce((s,m)=>s+(parseFloat(m.monto)||0),0);
  const totalLiqCobros=liqCobros.reduce((s,l)=>s+(l.totalNeto||0),0);
  c.innerHTML=`
  <div class="stats-row">
    <div class="stat"><div class="stat-label">Total por cobrar</div><div class="stat-value blue">${fmtMoney(totalLiqCobros)}</div></div>
    <div class="stat"><div class="stat-label">Total cobrado</div><div class="stat-value green">${fmtMoney(totalCobrado)}</div></div>
    <div class="stat"><div class="stat-label">Pendiente cobro</div><div class="stat-value red">${fmtMoney(Math.max(0,totalLiqCobros-totalCobrado))}</div></div>
  </div>
  <div class="toolbar">
    <select id="mcob-faseg" onchange="renderTablaCobros()"><option value="">Todas las aseguradoras</option>${aO.map(a=>`<option>${a.nombre}</option>`).join('')}</select>
    <select id="mcob-ftipo" onchange="renderTablaCobros()"><option value="">Todos los tipos</option>${[...new Set(movCobros.map(m=>m.tipo).filter(Boolean))].map(t=>`<option>${t}</option>`).join('')}</select>
    <select id="mcob-fperiodo" onchange="onPeriodoContabCobros()" style="font-size:12px;border:1px solid #e2e8f0;border-radius:6px;padding:5px 8px;background:#f8fafc;outline:none">
      <option value="todo">Todo el tiempo</option>
      <option value="semana">Esta semana</option><option value="mes">Este mes</option>
      <option value="trimestre">Este trimestre</option><option value="semestre">Este semestre</option>
      <option value="anio">Este año</option><option value="custom">Fechas específicas</option>
    </select>
    <div id="mcob-custom" style="display:none;gap:6px;align-items:flex-end">
      <input type="date" id="mcob-fi" onchange="renderTablaCobros()" style="font-size:12px;border:1px solid #e2e8f0;border-radius:6px;padding:5px 8px;background:#f8fafc;outline:none">
      <input type="date" id="mcob-ff" onchange="renderTablaCobros()" style="font-size:12px;border:1px solid #e2e8f0;border-radius:6px;padding:5px 8px;background:#f8fafc;outline:none">
    </div>
    <button class="btn btn-outline btn-sm" style="margin-left:auto" onclick="exportarDiarioCobrosCSV()"><i class="ti ti-download" aria-hidden="true"></i> CSV</button>
    <button class="btn btn-outline btn-sm" onclick="exportarDiarioCobrosPDF()"><i class="ti ti-file-text" aria-hidden="true"></i> PDF</button>
    <button class="btn btn-primary btn-sm" onclick="abrirModalMovCobro()"><i class="ti ti-plus" aria-hidden="true"></i> Registrar cobro</button>
  </div>
  <div class="table-wrap"><div class="table-scroll"><table><thead><tr><th>Fecha</th><th>Aseguradora</th><th>Tipo</th><th>Descripción</th><th>Comprobante</th><th>Liquidación ref.</th><th style="text-align:right">Monto</th><th>Acciones</th></tr></thead><tbody id="mcob-tbody"></tbody><tfoot id="mcob-tfoot"></tfoot></table></div></div>`;
  renderTablaCobros();
}

function onPeriodoContabCobros(){
  const p=(document.getElementById('mcob-fperiodo')||{}).value;
  const div=document.getElementById('mcob-custom');
  if(div) div.style.display=p==='custom'?'flex':'none';
  renderTablaCobros();
}
function renderTablaCobros(){
  const fA=(document.getElementById('mcob-faseg')||{}).value||'';
  const fT=(document.getElementById('mcob-ftipo')||{}).value||'';
  const p=(document.getElementById('mcob-fperiodo')||{}).value||'todo';
  let ini=null,fin=null;
  if(p!=='todo'&&p!=='custom'){
    fin=new Date();fin.setHours(23,59,59,999);
    ini=new Date();ini.setHours(0,0,0,0);
    if(p==='semana') ini.setDate(ini.getDate()-ini.getDay());
    else if(p==='mes') ini.setDate(1);
    else if(p==='trimestre') ini.setMonth(Math.floor(ini.getMonth()/3)*3,1);
    else if(p==='semestre') ini.setMonth(Math.floor(ini.getMonth()/6)*6,1);
    else if(p==='anio') ini.setMonth(0,1);
  } else if(p==='custom'){
    const vi=(document.getElementById('mcob-fi')||{}).value;
    const vf=(document.getElementById('mcob-ff')||{}).value;
    if(vi) ini=new Date(vi+'T00:00:00');
    if(vf) fin=new Date(vf+'T23:59:59');
  }
  const canDel=puedeEliminar();
  const lista=movCobros.filter(m=>{
    if(fA&&m.aseguradora!==fA) return false;
    if(fT&&m.tipo!==fT) return false;
    if(ini||fin){const d=new Date(m.fecha);if(ini&&d<ini)return false;if(fin&&d>fin)return false;}
    return true;
  });
  const tbody=document.getElementById('mcob-tbody');
  const tfoot=document.getElementById('mcob-tfoot');
  if(!tbody)return;
  if(!lista.length){tbody.innerHTML='<tr><td colspan="8"><div class="empty-state"><i class="ti ti-cash-off"></i>No hay movimientos de cobro.</div></td></tr>';if(tfoot)tfoot.innerHTML='';return;}
  const totalMonto=lista.reduce((s,m)=>s+(parseFloat(m.monto)||0),0);
  tbody.innerHTML=lista.map(m=>{
    const liq=m.liquidacionCobroId?liqCobros.find(x=>x.id===m.liquidacionCobroId):null;
    return`<tr><td>${fd(m.fecha)}</td><td>${m.aseguradora}</td><td><span class="badge badge-blue">${m.tipo}</span></td><td>${m.descripcion||'—'}</td><td>${m.comprobante||'—'}</td><td>${liq?`${liq.aseguradora} — ${new Date(liq.fecha).toLocaleDateString('es-EC')}`:'—'}</td><td style="text-align:right;font-weight:600;color:#16a34a">${fmtMoney(m.monto)}</td><td><div style="display:flex;gap:4px"><button class="btn-icon" onclick="exportarMovCobroCSV('${m.id}')" title="CSV"><i class="ti ti-table"></i></button><button class="btn-icon" onclick="exportarMovCobroPDF('${m.id}')" title="PDF"><i class="ti ti-file-text"></i></button>${canDel?`<button class="btn-icon danger" onclick="eliminarMovCobro('${m.id}')" title="Eliminar"><i class="ti ti-trash"></i></button>`:''}</div></td></tr>`;
  }).join('');
  if(tfoot)tfoot.innerHTML=`<tr style="background:#f1f5f9;font-weight:700"><td colspan="6" style="text-align:right;padding:5px 8px">TOTAL</td><td style="text-align:right;padding:5px 8px;color:#16a34a">${fmtMoney(totalMonto)}</td><td></td></tr>`;
}

function abrirModalMovCobro(){
  const aO=[...aseguradoras].sort((a,b)=>a.nombre.localeCompare(b.nombre));
  document.getElementById('mc-aseguradora').innerHTML='<option value="">Seleccionar...</option>'+aO.map(a=>`<option>${a.nombre}</option>`).join('');
  document.getElementById('mc-aseguradora').value='';
  const tipos=[...new Set(['Cobro liquidación','Anticipo aseguradora',...descCobros.map(d=>d.nombre)])];
  document.getElementById('mc-tipo').innerHTML='<option value="">Seleccionar...</option>'+tipos.map(t=>`<option>${t}</option>`).join('');
  document.getElementById('mc-liq').innerHTML='<option value="">Ninguna</option>';
  document.getElementById('mc-monto').value='';
  document.getElementById('mc-fecha').value=new Date().toISOString().split('T')[0];
  document.getElementById('mc-comprobante').value='';
  document.getElementById('mc-descripcion').value='';
  document.getElementById('mc-error').style.display='none';
  abrirOverlay('overlay-movcobro');
}

function cargarLiqCobrosAseguradora(){
  const aseg=document.getElementById('mc-aseguradora').value;
  const sel=document.getElementById('mc-liq');
  sel.innerHTML='<option value="">Ninguna</option>';
  if(!aseg)return;
  liqCobros.filter(l=>l.aseguradora===aseg&&l.estatus!=='cobrada').forEach(l=>{
    const fecha=new Date(l.fecha).toLocaleDateString('es-EC');
    sel.innerHTML+=`<option value="${l.id}">${aseg} — ${fecha} — ${fmtMoney(l.totalNeto)}</option>`;
  });
}

async function guardarMovCobro(){
  const aseguradora=document.getElementById('mc-aseguradora').value;
  const tipo=document.getElementById('mc-tipo').value;
  const monto=parseFloat(document.getElementById('mc-monto').value)||0;
  const fecha=document.getElementById('mc-fecha').value;
  const comprobante=document.getElementById('mc-comprobante').value.trim();
  const descripcion=document.getElementById('mc-descripcion').value.trim();
  const liquidacionCobroId=document.getElementById('mc-liq').value||null;
  const err=document.getElementById('mc-error');
  if(!aseguradora||!tipo||!monto){err.textContent='Aseguradora, tipo y monto son obligatorios';err.style.display='block';return;}
  try{
    const nv=await apiPost('movimientos-cobros',{aseguradora,tipo,monto,fecha,comprobante,descripcion,liquidacionCobroId});
    movCobros.unshift(nv);
    await cargarPolizas();await cargarLiqCobros();
    cerrarModal('overlay-movcobro');renderContabilidad();mostrarToast('Cobro registrado');
  }catch(e){err.textContent='Error al guardar';err.style.display='block';}
}

async function eliminarMovCobro(id){
  if(!confirm('¿Eliminar este movimiento?'))return;
  try{await apiDel('movimientos-cobros',id);movCobros=movCobros.filter(x=>x.id!==id);renderContabilidad();mostrarToast('Movimiento eliminado');}
  catch(e){mostrarToast('Error al eliminar');}
}

function exportarDiarioPagosCSV(){
  const fecha = new Date().toLocaleDateString('es-EC');
  const h=['Fecha','Vendedor','Tipo','Descripción','Comprobante','Monto'];
  const rows = movPagos.map(m=>[fd(m.fecha),m.vendedor,m.tipo,m.descripcion||'',m.comprobante||'',parseFloat(m.monto)||0]);
  const total = movPagos.reduce((s,m)=>s+(parseFloat(m.monto)||0),0);
  let csv = `DIARIO DE PAGOS A VENDEDORES - REYNA SEGUROS GESTION\nFecha:,${fecha}\n\n`;
  csv += [h,...rows].map(r=>r.map(x=>`"${String(x).replace(/"/g,'""')}"`).join(',')).join('\n');
  csv += `\n\nTOTAL PAGADO:,${total}\n\n${FOOTER_TEXT}`;
  const blob = new Blob(['\uFEFF'+csv],{type:'text/csv;charset=utf-8'});
  const a = document.createElement('a'); a.href=URL.createObjectURL(blob);
  a.download=`diario_pagos_${new Date().toISOString().split('T')[0]}.csv`; a.click();
}

function exportarDiarioPagosPDF(){
  const fecha = new Date().toLocaleDateString('es-EC');
  const logoB64 = document.querySelector('#login-screen .login-logo img').src;
  const total = movPagos.reduce((s,m)=>s+(parseFloat(m.monto)||0),0);
  const filas = movPagos.map(m=>`<tr><td>${fd(m.fecha)}</td><td>${m.vendedor}</td><td>${m.tipo}</td><td>${m.descripcion||'—'}</td><td>${m.comprobante||'—'}</td><td style="text-align:right;font-weight:600;color:#16a34a">${fmtMoney(parseFloat(m.monto)||0)}</td></tr>`).join('');
  const html=`<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"><title>Diario_Pagos_${new Date().toISOString().split('T')[0]}</title>
  <style>*{box-sizing:border-box;margin:0;padding:0}body{font-family:Arial,sans-serif;font-size:12px;color:#1a1a2e;padding:2rem}
  .header{display:flex;align-items:center;gap:16px;border-bottom:2px solid #1a2744;padding-bottom:12px;margin-bottom:14px}
  .logo{width:50px;height:50px;border-radius:8px;overflow:hidden;flex-shrink:0}.logo img{width:100%;height:100%;object-fit:cover}
  .brand-name{font-size:14px;font-weight:700;color:#1a2744}.brand-sub{font-size:10px;color:#64748b}
  .rep-title{text-align:right;font-size:14px;font-weight:700;color:#1a2744}.rep-meta{font-size:10px;color:#64748b}
  .section{font-size:10px;font-weight:700;letter-spacing:.07em;color:#fff;background:#1a2744;padding:4px 8px;border-radius:3px;margin:12px 0 6px;text-transform:uppercase}
  .total-box{background:#1a2744;color:#fff;border-radius:5px;padding:8px 12px;display:flex;justify-content:space-between;margin:10px 0;font-weight:700}
  table{width:100%;border-collapse:collapse;font-size:11px}
  th{text-align:left;padding:5px 7px;background:#e8ecf4;color:#1a2744;font-size:9px;font-weight:700;text-transform:uppercase}
  td{padding:5px 7px;border-bottom:0.5px solid #e2e8f0}
  .footer{text-align:center;font-size:9px;color:#94a3b8;margin-top:12px;border-top:1px solid #e2e8f0;padding-top:8px}
  </style></head><body>
  <div class="header"><div class="logo"><img src="${logoB64}" alt="Reyna Seguros"></div>
  <div style="flex:1"><div class="brand-name">Reyna Seguros Gestión</div><div class="brand-sub">Asesoría experta y protección a tu medida</div></div>
  <div><div class="rep-title">Diario de pagos a vendedores</div><div class="rep-meta">Fecha: ${fecha}</div></div></div>
  <div class="section">Movimientos</div>
  <table><thead><tr><th>Fecha</th><th>Vendedor</th><th>Tipo</th><th>Descripción</th><th>Comprobante</th><th style="text-align:right">Monto</th></tr></thead>
  <tbody>${filas||'<tr><td colspan="6" style="text-align:center;color:#94a3b8">Sin movimientos</td></tr>'}</tbody></table>
  <div class="total-box"><span>Total pagado</span><span>${fmtMoney(total)}</span></div>
  <div class="footer">${FOOTER_TEXT}</div></body></html>`;
  const w=window.open('','_blank'); w.document.write(html); w.document.close(); w.print();
}

function exportarDiarioCobrosCSV(){
  const fecha = new Date().toLocaleDateString('es-EC');
  const h=['Fecha','Aseguradora','Tipo','Descripción','Comprobante','Monto'];
  const rows = movCobros.map(m=>[fd(m.fecha),m.aseguradora,m.tipo,m.descripcion||'',m.comprobante||'',parseFloat(m.monto)||0]);
  const total = movCobros.reduce((s,m)=>s+(parseFloat(m.monto)||0),0);
  let csv = `DIARIO DE COBROS DE ASEGURADORAS - REYNA SEGUROS GESTION\nFecha:,${fecha}\n\n`;
  csv += [h,...rows].map(r=>r.map(x=>`"${String(x).replace(/"/g,'""')}"`).join(',')).join('\n');
  csv += `\n\nTOTAL COBRADO:,${total}\n\n${FOOTER_TEXT}`;
  const blob = new Blob(['\uFEFF'+csv],{type:'text/csv;charset=utf-8'});
  const a = document.createElement('a'); a.href=URL.createObjectURL(blob);
  a.download=`diario_cobros_${new Date().toISOString().split('T')[0]}.csv`; a.click();
}

function exportarDiarioCobrosPDF(){
  const fecha = new Date().toLocaleDateString('es-EC');
  const logoB64 = document.querySelector('#login-screen .login-logo img').src;
  const C2 = COLOR_COBROS;
  const total = movCobros.reduce((s,m)=>s+(parseFloat(m.monto)||0),0);
  const filas = movCobros.map(m=>`<tr><td>${fd(m.fecha)}</td><td>${m.aseguradora}</td><td>${m.tipo}</td><td>${m.descripcion||'—'}</td><td>${m.comprobante||'—'}</td><td style="text-align:right;font-weight:600;color:#16a34a">${fmtMoney(parseFloat(m.monto)||0)}</td></tr>`).join('');
  const html=`<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"><title>Diario_Cobros_${new Date().toISOString().split('T')[0]}</title>
  <style>*{box-sizing:border-box;margin:0;padding:0}body{font-family:Arial,sans-serif;font-size:12px;color:#1a1a2e;padding:2rem}
  .header{display:flex;align-items:center;gap:16px;border-bottom:2px solid ${C2};padding-bottom:12px;margin-bottom:14px}
  .logo{width:50px;height:50px;border-radius:8px;overflow:hidden;flex-shrink:0}.logo img{width:100%;height:100%;object-fit:cover}
  .brand-name{font-size:14px;font-weight:700;color:#1a2744}.brand-sub{font-size:10px;color:#64748b}
  .rep-title{text-align:right;font-size:14px;font-weight:700;color:${C2}}.rep-meta{font-size:10px;color:#64748b}
  .section{font-size:10px;font-weight:700;letter-spacing:.07em;color:#fff;background:${C2};padding:4px 8px;border-radius:3px;margin:12px 0 6px;text-transform:uppercase}
  .total-box{background:${C2};color:#fff;border-radius:5px;padding:8px 12px;display:flex;justify-content:space-between;margin:10px 0;font-weight:700}
  table{width:100%;border-collapse:collapse;font-size:11px}
  th{text-align:left;padding:5px 7px;background:#fdf0eb;color:${C2};font-size:9px;font-weight:700;text-transform:uppercase}
  td{padding:5px 7px;border-bottom:0.5px solid #e2e8f0}
  .footer{text-align:center;font-size:9px;color:#94a3b8;margin-top:12px;border-top:1px solid #e2e8f0;padding-top:8px}
  </style></head><body>
  <div class="header"><div class="logo"><img src="${logoB64}" alt="Reyna Seguros"></div>
  <div style="flex:1"><div class="brand-name">Reyna Seguros Gestión</div><div class="brand-sub">Asesoría experta y protección a tu medida</div></div>
  <div><div class="rep-title">Diario de cobros de aseguradoras</div><div class="rep-meta">Fecha: ${fecha}</div></div></div>
  <div class="section">Movimientos</div>
  <table><thead><tr><th>Fecha</th><th>Aseguradora</th><th>Tipo</th><th>Descripción</th><th>Comprobante</th><th style="text-align:right">Monto</th></tr></thead>
  <tbody>${filas||'<tr><td colspan="6" style="text-align:center;color:#94a3b8">Sin movimientos</td></tr>'}</tbody></table>
  <div class="total-box"><span>Total cobrado</span><span>${fmtMoney(total)}</span></div>
  <div class="footer">${FOOTER_TEXT}</div></body></html>`;
  const w=window.open('','_blank'); w.document.write(html); w.document.close(); w.print();
}

// ════════════════════════════════════════════════════════════════════
// BALANCE GENERAL CONTABILIDAD
// ════════════════════════════════════════════════════════════════════
function filtrarTablaBalance(tbodyId, texto) {
  const q = texto.toLowerCase().trim();
  document.querySelectorAll('#' + tbodyId + ' tr[data-nombre]').forEach(tr => {
    tr.style.display = (!q || tr.dataset.nombre.includes(q)) ? '' : 'none';
  });
}

function getRangoContab(prefijoId) {
  const sel = document.getElementById(prefijoId + '-periodo');
  const p = sel ? sel.value : 'todo';
  if (p === 'todo') return { ini: null, fin: null };
  const hoy = new Date(); hoy.setHours(23,59,59,999);
  const ini = new Date(); ini.setHours(0,0,0,0);
  if      (p === 'semana')    { ini.setDate(ini.getDate() - ini.getDay()); }
  else if (p === 'mes')       { ini.setDate(1); }
  else if (p === 'trimestre') { ini.setMonth(Math.floor(ini.getMonth()/3)*3, 1); }
  else if (p === 'semestre')  { ini.setMonth(Math.floor(ini.getMonth()/6)*6, 1); }
  else if (p === 'anio')      { ini.setMonth(0,1); }
  else if (p === 'custom') {
    const vi = (document.getElementById(prefijoId + '-fi') || {}).value;
    const vf = (document.getElementById(prefijoId + '-ff') || {}).value;
    return { ini: vi ? new Date(vi+'T00:00:00') : null, fin: vf ? new Date(vf+'T23:59:59') : null };
  }
  return { ini, fin: hoy };
}

function onPeriodoContab(prefijo) {
  const p = (document.getElementById(prefijo+'-periodo')||{}).value;
  const div = document.getElementById(prefijo+'-custom');
  if (div) div.style.display = p==='custom' ? 'flex' : 'none';
  if (prefijo==='cba') renderTablaContabAseg();
  else renderTablaContabVend();
}

function renderTablaContabAseg() {
  const tbody = document.getElementById('balance-tbody-aseg');
  if (!tbody) return;
  const fA = (document.getElementById('cba-faseg')||{}).value || '';
  const { ini, fin } = getRangoContab('cba');
  const enRango = fecha => {
    if (!ini && !fin) return true;
    const d = new Date(fecha);
    if (ini && d < ini) return false;
    if (fin && d > fin) return false;
    return true;
  };
  const aO = [...aseguradoras].sort((a,b)=>a.nombre.localeCompare(b.nombre))
    .filter(a => !fA || a.nombre === fA);
  const filas = aO.map(a => {
    const ca   = comisiones.filter(cm=>cm.aseguradora===a.nombre&&enRango(cm.fechaInicio||cm.fecha||'')).reduce((s,cm)=>s+(cm.comisionBroker||0),0);
    const liqA = liqCobros.filter(l=>l.aseguradora===a.nombre&&enRango(l.fecha||'')).reduce((s,l)=>s+(l.totalNeto||0),0);
    const cobA = movCobros.filter(m=>m.aseguradora===a.nombre&&enRango(m.fecha||'')).reduce((s,m)=>s+(parseFloat(m.monto)||0),0);
    const descA= liqCobros.filter(l=>l.aseguradora===a.nombre&&enRango(l.fecha||''))
      .reduce((s,l)=>s+((l.descuentosAplicados||[]).reduce((ss,d)=>ss+(parseFloat(d.monto)||0),0)),0);
    if (!ca && !liqA && !cobA) return '';
    return `<tr data-nombre="${a.nombre.toLowerCase()}">
      <td>${a.nombre}</td>
      <td style="text-align:right">${fmtMoney(ca)}</td>
      <td style="text-align:right">${fmtMoney(liqA)}</td>
      <td style="text-align:right;color:#dc2626">${descA?'-'+fmtMoney(descA):'—'}</td>
      <td style="text-align:right">${fmtMoney(cobA)}</td>
      <td style="text-align:right;color:#dc2626;font-weight:600">${fmtMoney(Math.max(0,liqA-cobA))}</td>
    </tr>`;
  }).join('');
  tbody.innerHTML = filas || '<tr><td colspan="6"><div class="empty-state">Sin datos para el período.</div></td></tr>';
  // Totals row
  const tfoot=document.getElementById('balance-tfoot-aseg');
  if(tfoot){
    let tca=0,tliqA=0,tdA=0,tcobA=0,tpendA=0;
    aO.forEach(a=>{
      const ca=comisiones.filter(cm=>cm.aseguradora===a.nombre&&enRango(cm.fechaInicio||cm.fecha||'')).reduce((s,cm)=>s+(cm.comisionBroker||0),0);
      if(!ca) return;
      const liqA=liqCobros.filter(l=>l.aseguradora===a.nombre&&enRango(l.fecha||'')).reduce((s,l)=>s+(l.totalNeto||0),0);
      const cobA=movCobros.filter(m=>m.aseguradora===a.nombre&&enRango(m.fecha||'')).reduce((s,m)=>s+(parseFloat(m.monto)||0),0);
      const dA=liqCobros.filter(l=>l.aseguradora===a.nombre&&enRango(l.fecha||'')).reduce((s,l)=>s+((l.descuentosAplicados||[]).filter(d=>!/^anticipo/i.test(d.nombre||'')).reduce((ss,d)=>ss+(parseFloat(d.monto)||0),0)),0);
      tca+=ca; tliqA+=liqA; tdA+=dA; tcobA+=cobA; tpendA+=Math.max(0,liqA-cobA);
    });
    tfoot.innerHTML=`<tr style="background:#f1f5f9;font-weight:700"><td>TOTAL</td><td style="text-align:right">${fmtMoney(tca)}</td><td style="text-align:right">${fmtMoney(tliqA)}</td><td style="text-align:right;color:#dc2626">${tdA?'-'+fmtMoney(tdA):'—'}</td><td style="text-align:right">${fmtMoney(tcobA)}</td><td style="text-align:right;color:#dc2626">${fmtMoney(tpendA)}</td></tr>`;
  }
}

function renderTablaContabVend() {
  const tbody = document.getElementById('balance-tbody-vend');
  if (!tbody) return;
  const fV = (document.getElementById('cbv-fvend')||{}).value || '';
  const { ini, fin } = getRangoContab('cbv');
  const enRango = fecha => {
    if (!ini && !fin) return true;
    const d = new Date(fecha);
    if (ini && d < ini) return false;
    if (fin && d > fin) return false;
    return true;
  };
  const vO = [...vendedores].sort((a,b)=>a.nombre.localeCompare(b.nombre))
    .filter(v => !fV || v.nombre === fV);
  const filas = vO.map(v => {
    const cv   = comisiones.filter(cm=>cm.vendedor===v.nombre&&enRango(cm.fechaInicio||cm.fecha||'')).reduce((s,cm)=>s+(cm.comisionVendedor||0),0);
    const liqV = liquidaciones.filter(l=>l.vendedor===v.nombre&&enRango(l.fecha||'')).reduce((s,l)=>s+(l.totalNeto||0),0);
    // Pagado = solo pagos de liquidación (excluye anticipos)
    const pagV = movPagos.filter(m=>m.vendedor===v.nombre&&m.tipo!=='Anticipo'&&enRango(m.fecha||'')).reduce((s,m)=>s+(parseFloat(m.monto)||0),0);
    // Retenciones = descuentos excluyendo anticipos
    const descV = liquidaciones.filter(l=>l.vendedor===v.nombre&&enRango(l.fecha||''))
      .reduce((s,l)=>s+((l.descuentosAplicados||[]).filter(d=>!/^anticipo/i.test(d.nombre||'')).reduce((ss,d)=>ss+(parseFloat(d.monto)||0),0)),0);
    // Anticipos pendientes = emitidos − descontados en liquidaciones
    const antEmitidos = movPagos.filter(m=>m.vendedor===v.nombre&&m.tipo==='Anticipo').reduce((s,m)=>s+(parseFloat(m.monto)||0),0);
    const antDescontados = liquidaciones.filter(l=>l.vendedor===v.nombre).reduce((s,l)=>s+((l.descuentosAplicados||[]).filter(d=>/^anticipo/i.test(d.nombre||'')).reduce((ss,d)=>ss+(parseFloat(d.monto)||0),0)),0);
    const antV = Math.max(0, antEmitidos - antDescontados);
    if (!cv && !liqV && !pagV) return '';
    // Pendiente = liquidado − pagado − anticipos pendientes
    const pend = liqV - pagV - antV;
    const pendStr=pend===0?'—':(pend<0?'<span style="color:#16a34a;font-weight:600">'+fmtMoney(pend)+'</span>':'<span style="color:#dc2626;font-weight:600">'+fmtMoney(pend)+'</span>');
    return `<tr data-nombre="${v.nombre.toLowerCase()}">
      <td>${v.nombre}</td>
      <td style="text-align:right">${fmtMoney(cv)}</td>
      <td style="text-align:right">${fmtMoney(liqV)}</td>
      <td style="text-align:right;color:#dc2626">${descV?'-'+fmtMoney(descV):'—'}</td>
      <td style="text-align:right">${fmtMoney(pagV)}</td>
      <td style="text-align:right;color:#d97706">${antV?fmtMoney(antV):'—'}</td>
      <td style="text-align:right">${pendStr}</td>
    </tr>`;
  }).join('');
  tbody.innerHTML = filas || '<tr><td colspan="7"><div class="empty-state">Sin datos para el período.</div></td></tr>';
  // Totals row
  const tfoot=document.getElementById('balance-tfoot-vend');
  if(tfoot){
    let tcv=0,tliqV=0,tdV=0,tpagV=0,tantV=0,tpend=0;
    vO.forEach(v=>{
      const cv=comisiones.filter(cm=>cm.vendedor===v.nombre&&enRango(cm.fechaInicio||cm.fecha||'')).reduce((s,cm)=>s+(cm.comisionVendedor||0),0);
      const liqV=liquidaciones.filter(l=>l.vendedor===v.nombre&&enRango(l.fecha||'')).reduce((s,l)=>s+(l.totalNeto||0),0);
      const pagV=movPagos.filter(m=>m.vendedor===v.nombre&&m.tipo!=='Anticipo'&&enRango(m.fecha||'')).reduce((s,m)=>s+(parseFloat(m.monto)||0),0);
      const descV=liquidaciones.filter(l=>l.vendedor===v.nombre&&enRango(l.fecha||'')).reduce((s,l)=>s+((l.descuentosAplicados||[]).filter(d=>!/^anticipo/i.test(d.nombre||'')).reduce((ss,d)=>ss+(parseFloat(d.monto)||0),0)),0);
      const antE=movPagos.filter(m=>m.vendedor===v.nombre&&m.tipo==='Anticipo').reduce((s,m)=>s+(parseFloat(m.monto)||0),0);
      const antD=liquidaciones.filter(l=>l.vendedor===v.nombre).reduce((s,l)=>s+((l.descuentosAplicados||[]).filter(d=>/^anticipo/i.test(d.nombre||'')).reduce((ss,d)=>ss+(parseFloat(d.monto)||0),0)),0);
      const antV=Math.max(0,antE-antD);
      if(!cv&&!liqV&&!pagV) return;
      tcv+=cv; tliqV+=liqV; tdV+=descV; tpagV+=pagV; tantV+=antV; tpend+=liqV-pagV-antV;
    });
    const tpendColor=tpend<0?'#16a34a':tpend>0?'#dc2626':'#64748b';
    tfoot.innerHTML=`<tr style="background:#f1f5f9;font-weight:700"><td>TOTAL</td><td style="text-align:right">${fmtMoney(tcv)}</td><td style="text-align:right">${fmtMoney(tliqV)}</td><td style="text-align:right;color:#dc2626">${tdV?'-'+fmtMoney(tdV):'—'}</td><td style="text-align:right">${fmtMoney(tpagV)}</td><td style="text-align:right;color:#d97706">${tantV?fmtMoney(tantV):'—'}</td><td style="text-align:right;color:${tpendColor}">${fmtMoney(tpend)}</td></tr>`;
  }
}

function _filtroBarHTML(prefijo, tipo, lista) {
  const opts = lista.map(n=>`<option value="${n}">${n}</option>`).join('');
  const labelNombre = tipo==='aseg' ? 'Aseguradora' : 'Vendedor';
  const onChange = tipo==='aseg' ? 'renderTablaContabAseg()' : 'renderTablaContabVend()';
  const fId = tipo==='aseg' ? prefijo+'-faseg' : prefijo+'-fvend';
  return `<div style="display:flex;flex-wrap:wrap;gap:8px;margin-bottom:10px;align-items:flex-end">
    <div>
      <div style="font-size:10px;font-weight:600;color:#64748b;text-transform:uppercase;margin-bottom:3px">${labelNombre}</div>
      <select id="${fId}" onchange="${onChange}" style="font-size:12px;border:1px solid #e2e8f0;border-radius:6px;padding:5px 8px;background:#f8fafc;outline:none">
        <option value="">Todos</option>${opts}
      </select>
    </div>
    <div>
      <div style="font-size:10px;font-weight:600;color:#64748b;text-transform:uppercase;margin-bottom:3px">Período</div>
      <select id="${prefijo}-periodo" onchange="onPeriodoContab('${prefijo}')" style="font-size:12px;border:1px solid #e2e8f0;border-radius:6px;padding:5px 8px;background:#f8fafc;outline:none">
        <option value="todo">Todo el tiempo</option>
        <option value="semana">Esta semana</option>
        <option value="mes">Este mes</option>
        <option value="trimestre">Este trimestre</option>
        <option value="semestre">Este semestre</option>
        <option value="anio">Este año</option>
        <option value="custom">Fechas específicas</option>
      </select>
    </div>
    <div id="${prefijo}-custom" style="display:none;gap:6px;align-items:flex-end;flex-wrap:wrap">
      <div>
        <div style="font-size:10px;font-weight:600;color:#64748b;text-transform:uppercase;margin-bottom:3px">Desde</div>
        <input type="date" id="${prefijo}-fi" onchange="${onChange}" style="font-size:12px;border:1px solid #e2e8f0;border-radius:6px;padding:5px 8px;background:#f8fafc;outline:none">
      </div>
      <div>
        <div style="font-size:10px;font-weight:600;color:#64748b;text-transform:uppercase;margin-bottom:3px">Hasta</div>
        <input type="date" id="${prefijo}-ff" onchange="${onChange}" style="font-size:12px;border:1px solid #e2e8f0;border-radius:6px;padding:5px 8px;background:#f8fafc;outline:none">
      </div>
    </div>
  </div>`;
}

function renderContabBalance(c){
  // ── Totales generales ──────────────────────────────────────────────
  // Com. Bróker = total de liquidaciones de cobros (subtotal + IVA)
  const totalComBroker = liqCobros.reduce((s,l)=>s+(l.total||l.totalNeto||0),0);
  // Com. Vendedores = total de liquidaciones de vendedores (subtotal + IVA)
  const totalComVend   = liquidaciones.reduce((s,l)=>s+(l.total||l.totalNeto||0),0);
  const totalCobrado   = movCobros.reduce((s,m)=>s+(parseFloat(m.monto)||0),0);
  // Pagado a vendedores = solo pagos tipo ≠ Anticipo
  const totalPagado    = movPagos.filter(m=>m.tipo!=='Anticipo').reduce((s,m)=>s+(parseFloat(m.monto)||0),0);

  // ── Descuentos — ASEGURADORAS (excluye anticipos) ───────────────────
  const descCobMap = {};
  liqCobros.forEach(liq=>{
    (liq.descuentosAplicados||[]).forEach(d=>{
      if(/^anticipo/i.test(d.nombre||'')) return;
      if(!descCobMap[d.nombre]) descCobMap[d.nombre]=0;
      descCobMap[d.nombre]+=parseFloat(d.monto)||0;
    });
  });
  const totalDescCob  = Object.values(descCobMap).reduce((s,v)=>s+v,0);
  // Neto cobrado real = cobrado + descuentos en cobros
  const netoCobrado   = totalCobrado + totalDescCob;
  // Pendiente por cobrar = Com. Bróker - neto cobrado real
  const pendienteCobrar = Math.max(0, totalComBroker - netoCobrado);

  // ── Descuentos — VENDEDORES (excluye anticipos) ─────────────────────
  const descPagMap = {};
  liquidaciones.forEach(liq=>{
    (liq.descuentosAplicados||[]).forEach(d=>{
      if(/^anticipo/i.test(d.nombre||'')) return;
      if(!descPagMap[d.nombre]) descPagMap[d.nombre]=0;
      descPagMap[d.nombre]+=parseFloat(d.monto)||0;
    });
  });
  const totalDescPag  = Object.values(descPagMap).reduce((s,v)=>s+v,0);
  // Neto pagado real = pagado + descuentos en pagos
  const netoPagado    = totalPagado + totalDescPag;
  // Pendiente por pagar = neto pagado real - Com. Vendedores (puede ser negativo)
  const pendientePagar = netoPagado - totalComVend;

  // ── Resumen fiscal — retenciones consolidadas ───────────────────────
  // Unir ambos mapas por nombre, sumando los dos lados
  const fiscalMap = {};
  const RETENCIONES = ['Retención IR','Retención IVA','Retención SuperBancos'];
  [...Object.entries(descCobMap), ...Object.entries(descPagMap)].forEach(([nombre,monto])=>{
    if(!fiscalMap[nombre]) fiscalMap[nombre]={cobros:0,pagos:0};
  });
  Object.entries(descCobMap).forEach(([n,v])=>{ if(!fiscalMap[n]) fiscalMap[n]={cobros:0,pagos:0}; fiscalMap[n].cobros+=v; });
  Object.entries(descPagMap).forEach(([n,v])=>{ if(!fiscalMap[n]) fiscalMap[n]={cobros:0,pagos:0}; fiscalMap[n].pagos+=v;  });
  // Añadir anticipos descontados al fiscalMap (para mostrarlos en la sección informativa)
  liqCobros.forEach(liq=>(liq.descuentosAplicados||[]).forEach(d=>{
    if(!/^anticipo/i.test(d.nombre||'')) return;
    if(!fiscalMap[d.nombre]) fiscalMap[d.nombre]={cobros:0,pagos:0};
    fiscalMap[d.nombre].cobros+=parseFloat(d.monto)||0;
  }));
  liquidaciones.forEach(liq=>(liq.descuentosAplicados||[]).forEach(d=>{
    if(!/^anticipo/i.test(d.nombre||'')) return;
    if(!fiscalMap[d.nombre]) fiscalMap[d.nombre]={cobros:0,pagos:0};
    fiscalMap[d.nombre].pagos+=parseFloat(d.monto)||0;
  }));

  // ── Tablas por vendedor / aseguradora ──────────────────────────────
  const vO=[...vendedores].sort((a,b)=>a.nombre.localeCompare(b.nombre));
  const aO=[...aseguradoras].sort((a,b)=>a.nombre.localeCompare(b.nombre));

  const filasVend = vO.map(v=>{
    const cv   = comisiones.filter(cm=>cm.vendedor===v.nombre).reduce((s,cm)=>s+(cm.comisionVendedor||0),0);
    const liqV = liquidaciones.filter(l=>l.vendedor===v.nombre).reduce((s,l)=>s+(l.totalNeto||0),0);
    const pagV = movPagos.filter(m=>m.vendedor===v.nombre&&m.tipo!=='Anticipo').reduce((s,m)=>s+(parseFloat(m.monto)||0),0);
    const descV = liquidaciones.filter(l=>l.vendedor===v.nombre)
      .reduce((s,l)=>s+((l.descuentosAplicados||[]).filter(d=>!/^anticipo/i.test(d.nombre||'')).reduce((ss,d)=>ss+(parseFloat(d.monto)||0),0)),0);
    const antEmitidos=movPagos.filter(m=>m.vendedor===v.nombre&&m.tipo==='Anticipo').reduce((s,m)=>s+(parseFloat(m.monto)||0),0);
    const antDescontados=liquidaciones.filter(l=>l.vendedor===v.nombre).reduce((s,l)=>s+((l.descuentosAplicados||[]).filter(d=>/^anticipo/i.test(d.nombre||'')).reduce((ss,d)=>ss+(parseFloat(d.monto)||0),0)),0);
    const antV=Math.max(0,antEmitidos-antDescontados);
    if(!cv&&!liqV&&!pagV) return'';
    const pend=liqV-pagV-antV;
    const pendColor=pend<0?'#16a34a':pend>0?'#dc2626':'#64748b';
    return`<tr data-nombre="${v.nombre.toLowerCase()}">
      <td>${v.nombre}</td>
      <td style="text-align:right">${fmtMoney(cv)}</td>
      <td style="text-align:right">${fmtMoney(liqV)}</td>
      <td style="text-align:right;color:#dc2626">${descV?'-'+fmtMoney(descV):'—'}</td>
      <td style="text-align:right">${fmtMoney(pagV)}</td>
      <td style="text-align:right;color:#d97706">${antV?fmtMoney(antV):'—'}</td>
      <td style="text-align:right;color:${pendColor};font-weight:600">${pend===0?'—':fmtMoney(pend)}</td>
    </tr>`;
  }).join('');

  const filasAseg = aO.map(a=>{
    const ca   = comisiones.filter(cm=>cm.aseguradora===a.nombre).reduce((s,cm)=>s+(cm.comisionBroker||0),0);
    const liqA = liqCobros.filter(l=>l.aseguradora===a.nombre).reduce((s,l)=>s+(l.totalNeto||0),0);
    const cobA = movCobros.filter(m=>m.aseguradora===a.nombre).reduce((s,m)=>s+(parseFloat(m.monto)||0),0);
    const descA= liqCobros.filter(l=>l.aseguradora===a.nombre)
      .reduce((s,l)=>s+((l.descuentosAplicados||[]).reduce((ss,d)=>ss+(parseFloat(d.monto)||0),0)),0);
    if(!ca&&!liqA&&!cobA) return'';
    return`<tr data-nombre="${a.nombre.toLowerCase()}">
      <td>${a.nombre}</td>
      <td style="text-align:right">${fmtMoney(ca)}</td>
      <td style="text-align:right">${fmtMoney(liqA)}</td>
      <td style="text-align:right;color:#dc2626">${descA?'-'+fmtMoney(descA):'—'}</td>
      <td style="text-align:right">${fmtMoney(cobA)}</td>
      <td style="text-align:right;color:#dc2626;font-weight:600">${fmtMoney(Math.max(0,ca-cobA))}</td>
    </tr>`;
  }).join('');

  // ── Filas resumen fiscal ───────────────────────────────────────────
  const filasFiscal = Object.entries(fiscalMap).map(([nombre,v])=>{
    const total=v.cobros-v.pagos;
    const totalColor=total>0?'#16a34a':total<0?'#dc2626':'#64748b';
    return`<tr>
      <td>${nombre}</td>
      <td style="text-align:right;color:#16a34a">${v.cobros?fmtMoney(v.cobros):'—'}</td>
      <td style="text-align:right;color:#dc2626">${v.pagos?fmtMoney(v.pagos):'—'}</td>
      <td style="text-align:right;font-weight:700;color:${totalColor}">${fmtMoney(total)}</td>
    </tr>`;
  }).join('');

  // ── Render ─────────────────────────────────────────────────────────
  c.innerHTML=`
  <div style="display:flex;gap:8px;justify-content:flex-end;margin-bottom:1rem">
    <button class="btn btn-outline btn-sm" onclick="exportarBalanceContabCSV()"><i class="ti ti-download" aria-hidden="true"></i> CSV</button>
    <button class="btn btn-outline btn-sm" onclick="exportarBalanceContabPDF()"><i class="ti ti-file-text" aria-hidden="true"></i> PDF</button>
  </div>

  <!-- Resumen general -->
  <div class="stats-row">
    <div class="stat"><div class="stat-label">Com. Bróker generadas</div><div class="stat-value blue">${fmtMoney(totalComBroker)}</div></div>
    <div class="stat"><div class="stat-label">Cobrado de aseguradoras</div><div class="stat-value green">${fmtMoney(totalCobrado)}</div></div>
    <div class="stat"><div class="stat-label">Descuentos en cobros</div><div class="stat-value red">${fmtMoney(totalDescCob)}</div></div>
    <div class="stat"><div class="stat-label">Neto cobrado real</div><div class="stat-value green">${fmtMoney(netoCobrado)}</div></div>
    <div class="stat"><div class="stat-label">Pendiente por cobrar</div><div class="stat-value red">${fmtMoney(pendienteCobrar)}</div></div>
  </div>
  <div class="stats-row" style="margin-top:8px">
    <div class="stat"><div class="stat-label">Com. Vendedores</div><div class="stat-value amber">${fmtMoney(totalComVend)}</div></div>
    <div class="stat"><div class="stat-label">Pagado a vendedores</div><div class="stat-value green">${fmtMoney(totalPagado)}</div></div>
    <div class="stat"><div class="stat-label">Descuentos en pagos</div><div class="stat-value red">${fmtMoney(totalDescPag)}</div></div>
    <div class="stat"><div class="stat-label">Neto pagado real</div><div class="stat-value green">${fmtMoney(netoPagado)}</div></div>
    <div class="stat"><div class="stat-label">Pendiente por pagar</div><div class="stat-value ${pendientePagar<0?'red':'green'}">${fmtMoney(pendientePagar)}</div></div>
  </div>

  <!-- Balance por aseguradora -->
  <div class="actions-panel" style="margin-top:1.25rem">
    <div class="actions-panel-title"><i class="ti ti-building" style="font-size:13px" aria-hidden="true"></i> Balance por aseguradora</div>
    ${_filtroBarHTML('cba','aseg',[...aseguradoras].sort((a,b)=>a.nombre.localeCompare(b.nombre)).map(a=>a.nombre))}
    <div class="table-wrap"><div class="table-scroll"><table>
      <thead><tr>
        <th>Aseguradora</th>
        <th style="text-align:right">Com. generadas</th>
        <th style="text-align:right">Liquidado</th>
        <th style="text-align:right">Descuentos</th>
        <th style="text-align:right">Cobrado</th>
        <th style="text-align:right">Pendiente cobro</th>
      </tr></thead>
      <tbody id="balance-tbody-aseg"></tbody>
      <tfoot id="balance-tfoot-aseg"></tfoot>
    </table></div></div>
    ${Object.keys(descCobMap).length?`
    <div style="margin-top:10px;padding:10px 12px;background:var(--color-background-secondary);border-radius:6px;font-size:12px">
      <div style="font-weight:600;margin-bottom:6px;color:var(--color-text-secondary);font-size:11px;text-transform:uppercase;letter-spacing:.05em">Descuentos desglosados — cobros</div>
      ${Object.entries(descCobMap).map(([nombre,monto])=>`
        <div style="display:flex;justify-content:space-between;padding:3px 0;border-bottom:0.5px solid var(--color-border-tertiary)">
          <span>${nombre}</span><span style="color:#dc2626;font-weight:600">-${fmtMoney(monto)}</span>
        </div>`).join('')}
      <div style="display:flex;justify-content:space-between;padding:5px 0;font-weight:700">
        <span>Total descuentos cobros</span><span style="color:#dc2626">-${fmtMoney(totalDescCob)}</span>
      </div>
    </div>`:''}
  </div>

  <!-- Balance por vendedor -->
  <div class="actions-panel" style="margin-top:1.25rem">
    <div class="actions-panel-title"><i class="ti ti-users" style="font-size:13px" aria-hidden="true"></i> Balance por vendedor</div>
    ${_filtroBarHTML('cbv','vend',[...vendedores].sort((a,b)=>a.nombre.localeCompare(b.nombre)).map(v=>v.nombre))}
    <div class="table-wrap"><div class="table-scroll"><table>
      <thead><tr>
        <th>Vendedor</th>
        <th style="text-align:right">Com. generadas</th>
        <th style="text-align:right">Liquidado</th>
        <th style="text-align:right">Descuentos</th>
        <th style="text-align:right">Pagado</th>
        <th style="text-align:right">Anticipos activos</th>
        <th style="text-align:right">Pendiente pagar</th>
      </tr></thead>
      <tbody id="balance-tbody-vend"></tbody>
      <tfoot id="balance-tfoot-vend"></tfoot>
    </table></div></div>
    ${Object.keys(descPagMap).length?`
    <div style="margin-top:10px;padding:10px 12px;background:var(--color-background-secondary);border-radius:6px;font-size:12px">
      <div style="font-weight:600;margin-bottom:6px;color:var(--color-text-secondary);font-size:11px;text-transform:uppercase;letter-spacing:.05em">Descuentos desglosados — pagos</div>
      ${Object.entries(descPagMap).map(([nombre,monto])=>`
        <div style="display:flex;justify-content:space-between;padding:3px 0;border-bottom:0.5px solid var(--color-border-tertiary)">
          <span>${nombre}</span><span style="color:#dc2626;font-weight:600">-${fmtMoney(monto)}</span>
        </div>`).join('')}
      <div style="display:flex;justify-content:space-between;padding:5px 0;font-weight:700">
        <span>Total descuentos pagos</span><span style="color:#dc2626">-${fmtMoney(totalDescPag)}</span>
      </div>
    </div>`:''}
  </div>

  <!-- Resumen fiscal -->
  <div class="actions-panel" style="margin-top:1.25rem;border:1.5px solid #1a2744">
    <div class="actions-panel-title" style="background:#1a2744;color:#fff;border-radius:4px 4px 0 0;margin:-1px -1px 0 -1px;padding:8px 12px">
      <i class="ti ti-receipt-tax" style="font-size:13px" aria-hidden="true"></i> Detalle de descuentos y retenciones
    </div>
    <div style="padding:8px 0">
    ${(()=>{
      if(!Object.keys(fiscalMap).length) return '<div class="empty-state" style="padding:1rem"><i class="ti ti-receipt-tax"></i>No hay descuentos registrados aún.</div>';
      const esFiscal=n=>/retenci/i.test(n)||/impuesto/i.test(n)||/nota.*cr/i.test(n)||/reliquid/i.test(n)||/superban/i.test(n);
      const esAnticipo=n=>/^anticipo/i.test(n);
      const mapFiscal={}, mapFee={}, mapAnticipo={};
      Object.entries(fiscalMap).forEach(([n,v])=>{
        if(esAnticipo(n)) mapAnticipo[n]=v;
        else if(esFiscal(n)) mapFiscal[n]=v;
        else mapFee[n]=v;
      });
      // Totales fiscales (resta)
      const totFC=Object.values(mapFiscal).reduce((s,v)=>s+v.cobros,0);
      const totFP=Object.values(mapFiscal).reduce((s,v)=>s+v.pagos,0);
      // Totales fee (solo informativos)
      const totFeeC=Object.values(mapFee).reduce((s,v)=>s+v.cobros,0);
      const totFeeP=Object.values(mapFee).reduce((s,v)=>s+v.pagos,0);
      // Totales anticipos (solo informativos)
      const totAntC=Object.values(mapAnticipo).reduce((s,v)=>s+v.cobros,0);
      const totAntP=Object.values(mapAnticipo).reduce((s,v)=>s+v.pagos,0);
      // Grand total cobros y pagos
      const grandTotC=totFC+totFeeC+totAntC;
      const grandTotP=totFP+totFeeP+totAntP;

      const theadFiscal='<thead><tr><th>Concepto</th><th style="text-align:right;color:#16a34a">Cobros (aseguradoras)</th><th style="text-align:right;color:#dc2626">Pagos (vendedores)</th><th style="text-align:right">Acumulado (cobros − pagos)</th></tr></thead>';
      const filaFiscal=([n,v])=>{const t=v.cobros-v.pagos;return'<tr><td>'+n+'</td><td style="text-align:right;color:#16a34a">'+(v.cobros?fmtMoney(v.cobros):'—')+'</td><td style="text-align:right;color:#dc2626">'+(v.pagos?fmtMoney(v.pagos):'—')+'</td><td style="text-align:right;font-weight:700;color:'+(t>=0?'#16a34a':'#dc2626')+'">'+fmtMoney(t)+'</td></tr>';};
      const filaInfo=([n,v])=>'<tr><td>'+n+'</td><td style="text-align:right;color:#16a34a">'+(v.cobros?fmtMoney(v.cobros):'—')+'</td><td style="text-align:right;color:#dc2626">'+(v.pagos?fmtMoney(v.pagos):'—')+'</td><td></td></tr>';

      let html='';

      // Sección 1: Retenciones fiscales (resta)
      if(Object.keys(mapFiscal).length){
        html+='<div style="font-size:11px;font-weight:700;color:#fff;background:#1a2744;padding:5px 10px;border-radius:4px;margin:0 0 6px;text-transform:uppercase;letter-spacing:.05em">Retenciones fiscales</div>';
        html+='<div class="table-wrap"><div class="table-scroll"><table>'+theadFiscal+'<tbody>'+Object.entries(mapFiscal).map(filaFiscal).join('')+'</tbody>';
        html+='<tfoot><tr style="background:#e8ecf4;font-weight:700"><td>TOTAL RETENCIONES FISCALES</td><td style="text-align:right;color:#16a34a">'+fmtMoney(totFC)+'</td><td style="text-align:right;color:#dc2626">-'+fmtMoney(totFP)+'</td><td style="text-align:right;color:'+(totFC-totFP>=0?'#16a34a':'#dc2626')+'">'+fmtMoney(totFC-totFP)+'</td></tr></tfoot></table></div></div>';
      }

      // Sección 2: Fee administrativo (informativo)
      if(Object.keys(mapFee).length){
        html+='<div style="font-size:11px;font-weight:700;color:#fff;background:#64748b;padding:5px 10px;border-radius:4px;margin:12px 0 6px;text-transform:uppercase;letter-spacing:.05em">Fee administrativo y otros</div>';
        html+='<div class="table-wrap"><div class="table-scroll"><table>'+theadFiscal+'<tbody>'+Object.entries(mapFee).map(filaInfo).join('')+'</tbody>';
        html+='<tfoot><tr style="background:#e8ecf4;font-weight:700"><td>TOTAL FEE ADMINISTRATIVO Y OTROS</td><td style="text-align:right;color:#16a34a">'+fmtMoney(totFeeC)+'</td><td style="text-align:right;color:#dc2626">'+fmtMoney(totFeeP)+'</td><td></td></tr></tfoot></table></div></div>';
      }

      // Sección 3: Anticipos (informativo)
      if(Object.keys(mapAnticipo).length){
        html+='<div style="font-size:11px;font-weight:700;color:#fff;background:#d97706;padding:5px 10px;border-radius:4px;margin:12px 0 6px;text-transform:uppercase;letter-spacing:.05em">Anticipos descontados</div>';
        html+='<div class="table-wrap"><div class="table-scroll"><table>'+theadFiscal+'<tbody>'+Object.entries(mapAnticipo).map(filaInfo).join('')+'</tbody>';
        html+='<tfoot><tr style="background:#e8ecf4;font-weight:700"><td>TOTAL ANTICIPOS DESCONTADOS</td><td style="text-align:right;color:#16a34a">'+fmtMoney(totAntC)+'</td><td style="text-align:right;color:#dc2626">'+fmtMoney(totAntP)+'</td><td></td></tr></tfoot></table></div></div>';
      }

      // Fila grand total
      html+='<div style="display:flex;justify-content:space-between;align-items:center;background:#1a2744;color:#fff;border-radius:6px;padding:10px 14px;margin-top:14px;font-weight:700;font-size:13px">';
      html+='<span>TOTAL GENERAL DE DESCUENTOS</span>';
      html+='<span style="display:flex;gap:24px"><span style="color:#4ade80">Cobros: '+fmtMoney(grandTotC)+'</span><span style="color:#fca5a5">Pagos: '+fmtMoney(grandTotP)+'</span></span>';
      html+='</div>';

      return html;
    })()}
    </div>
  </div>`;
  // Poblar tablas reactivas con valores iniciales (todo el tiempo, todos)
  renderTablaContabAseg();
  renderTablaContabVend();
}

function exportarBalanceContabCSV(){
  const fecha = new Date().toLocaleDateString('es-EC');
  const totalComBroker = liqCobros.reduce((s,l)=>s+(l.total||l.totalNeto||0),0);
  const totalComVend   = liquidaciones.reduce((s,l)=>s+(l.total||l.totalNeto||0),0);
  const totalCobrado   = movCobros.reduce((s,m)=>s+(parseFloat(m.monto)||0),0);
  const totalPagado    = movPagos.filter(m=>m.tipo!=='Anticipo').reduce((s,m)=>s+(parseFloat(m.monto)||0),0);

  const descCobMap = {};
  liqCobros.forEach(liq=>(liq.descuentosAplicados||[]).forEach(d=>{
    if(/^anticipo/i.test(d.nombre||'')) return;
    if(!descCobMap[d.nombre]) descCobMap[d.nombre]=0; descCobMap[d.nombre]+=parseFloat(d.monto)||0;
  }));
  const totalDescCob = Object.values(descCobMap).reduce((s,v)=>s+v,0);
  const netoCobrado  = totalCobrado + totalDescCob;
  const pendienteCobrar = Math.max(0, totalComBroker - netoCobrado);

  const descPagMap = {};
  liquidaciones.forEach(liq=>(liq.descuentosAplicados||[]).forEach(d=>{
    if(/^anticipo/i.test(d.nombre||'')) return;
    if(!descPagMap[d.nombre]) descPagMap[d.nombre]=0; descPagMap[d.nombre]+=parseFloat(d.monto)||0;
  }));
  const totalDescPag = Object.values(descPagMap).reduce((s,v)=>s+v,0);
  const netoPagado   = totalPagado + totalDescPag;
  const pendientePagar = netoPagado - totalComVend;

  const fiscalMap = {};
  Object.entries(descCobMap).forEach(([n,v])=>{ if(!fiscalMap[n]) fiscalMap[n]={cobros:0,pagos:0}; fiscalMap[n].cobros+=v; });
  Object.entries(descPagMap).forEach(([n,v])=>{ if(!fiscalMap[n]) fiscalMap[n]={cobros:0,pagos:0}; fiscalMap[n].pagos+=v; });

  let csv = `BALANCE GENERAL - REYNA SEGUROS GESTION\nFecha:,${fecha}\n\n`;

  csv += `RESUMEN GENERAL\n`;
  csv += `Com. Broker Generadas:,${totalComBroker}\n`;
  csv += `Cobrado de Aseguradoras:,${totalCobrado}\n`;
  csv += `Descuentos en Cobros:,${totalDescCob}\n`;
  csv += `Neto Cobrado Real:,${netoCobrado}\n`;
  csv += `Pendiente por Cobrar:,${pendienteCobrar}\n`;
  csv += `Com. Vendedores:,${totalComVend}\n`;
  csv += `Pagado a Vendedores:,${totalPagado}\n`;
  csv += `Descuentos en Pagos:,${totalDescPag}\n`;
  csv += `Neto Pagado Real:,${netoPagado}\n`;
  csv += `Pendiente por Pagar:,${pendientePagar}\n\n`;

  csv += `BALANCE POR ASEGURADORA\n`;
  csv += `Aseguradora,Com. Generadas,Liquidado,Descuentos,Cobrado,Pendiente Cobro\n`;
  [...aseguradoras].sort((a,b)=>a.nombre.localeCompare(b.nombre)).forEach(a=>{
    const ca   = comisiones.filter(cm=>cm.aseguradora===a.nombre).reduce((s,cm)=>s+(cm.comisionBroker||0),0);
    if(!ca) return;
    const liqA = liqCobros.filter(l=>l.aseguradora===a.nombre).reduce((s,l)=>s+(l.totalNeto||0),0);
    const cobA = movCobros.filter(m=>m.aseguradora===a.nombre).reduce((s,m)=>s+(parseFloat(m.monto)||0),0);
    const dA   = liqCobros.filter(l=>l.aseguradora===a.nombre).reduce((s,l)=>s+((l.descuentosAplicados||[]).reduce((ss,d)=>ss+(parseFloat(d.monto)||0),0)),0);
    csv += `"${a.nombre}",${ca},${liqA},${dA},${cobA},${Math.max(0,ca-cobA)}\n`;
  });

  csv += `\nDescuentos Desglosados — Cobros\nConcepto,Monto\n`;
  Object.entries(descCobMap).forEach(([n,v])=>csv+=`"${n}",${v}\n`);
  csv += `Total Descuentos Cobros,${totalDescCob}\n\n`;

  csv += `BALANCE POR VENDEDOR\n`;
  csv += `Vendedor,Com. Generadas,Liquidado,Retenciones,Pagado,Anticipos Pendientes,Pendiente Pagar\n`;
  [...vendedores].sort((a,b)=>a.nombre.localeCompare(b.nombre)).forEach(v=>{
    const cv   = comisiones.filter(cm=>cm.vendedor===v.nombre).reduce((s,cm)=>s+(cm.comisionVendedor||0),0);
    const liqV = liquidaciones.filter(l=>l.vendedor===v.nombre).reduce((s,l)=>s+(l.totalNeto||0),0);
    const pagV = movPagos.filter(m=>m.vendedor===v.nombre&&m.tipo!=='Anticipo').reduce((s,m)=>s+(parseFloat(m.monto)||0),0);
    const dV   = liquidaciones.filter(l=>l.vendedor===v.nombre).reduce((s,l)=>s+((l.descuentosAplicados||[]).filter(d=>!/^anticipo/i.test(d.nombre||'')).reduce((ss,d)=>ss+(parseFloat(d.monto)||0),0)),0);
    const antEmitidos=movPagos.filter(m=>m.vendedor===v.nombre&&m.tipo==='Anticipo').reduce((s,m)=>s+(parseFloat(m.monto)||0),0);
    const antDescontados=liquidaciones.filter(l=>l.vendedor===v.nombre).reduce((s,l)=>s+((l.descuentosAplicados||[]).filter(d=>/^anticipo/i.test(d.nombre||'')).reduce((ss,d)=>ss+(parseFloat(d.monto)||0),0)),0);
    const antV=Math.max(0,antEmitidos-antDescontados);
    if(!cv&&!liqV&&!pagV) return;
    csv += `"${v.nombre}",${cv},${liqV},${dV},${pagV},${antV},${liqV-pagV-antV}\n`;
  });

  csv += `\nDescuentos Desglosados — Pagos\nConcepto,Monto\n`;
  Object.entries(descPagMap).forEach(([n,v])=>csv+=`"${n}",${v}\n`);
  csv += `Total Descuentos Pagos,${totalDescPag}\n\n`;

  csv += `RESUMEN FISCAL — RETENCIONES Y DESCUENTOS\n`;
  csv += `Concepto,Desde Cobros (aseguradoras),Desde Pagos (vendedores),Total Acumulado\n`;
  Object.entries(fiscalMap).forEach(([n,v])=>csv+=`"${n}",${v.cobros},${v.pagos},${v.cobros+v.pagos}\n`);
  csv += `TOTAL DESCUENTOS,${totalDescCob},${totalDescPag},${totalDescCob+totalDescPag}\n\n`;
  csv += `${FOOTER_TEXT}`;

  const blob = new Blob(['\uFEFF'+csv],{type:'text/csv;charset=utf-8'});
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `balance_general_${new Date().toISOString().split('T')[0]}.csv`;
  a.click();
}

function exportarBalanceContabPDF(){
  const fecha = new Date().toLocaleDateString('es-EC');
  const logoB64 = document.querySelector('#login-screen .login-logo img').src;

  const totalComBroker = liqCobros.reduce((s,l)=>s+(l.total||l.totalNeto||0),0);
  const totalComVend   = liquidaciones.reduce((s,l)=>s+(l.total||l.totalNeto||0),0);
  const totalCobrado   = movCobros.reduce((s,m)=>s+(parseFloat(m.monto)||0),0);
  const totalPagado    = movPagos.filter(m=>m.tipo!=='Anticipo').reduce((s,m)=>s+(parseFloat(m.monto)||0),0);

  const descCobMap = {};
  liqCobros.forEach(liq=>(liq.descuentosAplicados||[]).forEach(d=>{
    if(/^anticipo/i.test(d.nombre||'')) return;
    if(!descCobMap[d.nombre]) descCobMap[d.nombre]=0; descCobMap[d.nombre]+=parseFloat(d.monto)||0;
  }));
  const totalDescCob  = Object.values(descCobMap).reduce((s,v)=>s+v,0);
  const netoCobrado   = totalCobrado + totalDescCob;
  const pendienteCobrar = Math.max(0, totalComBroker - netoCobrado);

  const descPagMap = {};
  liquidaciones.forEach(liq=>(liq.descuentosAplicados||[]).forEach(d=>{
    if(/^anticipo/i.test(d.nombre||'')) return;
    if(!descPagMap[d.nombre]) descPagMap[d.nombre]=0; descPagMap[d.nombre]+=parseFloat(d.monto)||0;
  }));
  const totalDescPag  = Object.values(descPagMap).reduce((s,v)=>s+v,0);
  const netoPagado    = totalPagado + totalDescPag;
  const pendientePagar = netoPagado - totalComVend;

  const fiscalMap = {};
  Object.entries(descCobMap).forEach(([n,v])=>{ if(!fiscalMap[n]) fiscalMap[n]={cobros:0,pagos:0}; fiscalMap[n].cobros+=v; });
  Object.entries(descPagMap).forEach(([n,v])=>{ if(!fiscalMap[n]) fiscalMap[n]={cobros:0,pagos:0}; fiscalMap[n].pagos+=v; });

  // Mapas completos (incluyendo anticipos) para el detalle de descuentos del PDF
  const descCobMapAll = {};
  liqCobros.forEach(liq=>(liq.descuentosAplicados||[]).forEach(d=>{
    if(!descCobMapAll[d.nombre]) descCobMapAll[d.nombre]=0; descCobMapAll[d.nombre]+=parseFloat(d.monto)||0;
  }));
  const descPagMapAll = {};
  liquidaciones.forEach(liq=>(liq.descuentosAplicados||[]).forEach(d=>{
    if(!descPagMapAll[d.nombre]) descPagMapAll[d.nombre]=0; descPagMapAll[d.nombre]+=parseFloat(d.monto)||0;
  }));

  let totA_ca=0,totA_liq=0,totA_dA=0,totA_cob=0,totA_pend=0;
  const filasAseg = [...aseguradoras].sort((a,b)=>a.nombre.localeCompare(b.nombre)).map(a=>{
    const ca  = comisiones.filter(cm=>cm.aseguradora===a.nombre).reduce((s,cm)=>s+(cm.comisionBroker||0),0);
    if(!ca) return"";
    const liqA= liqCobros.filter(l=>l.aseguradora===a.nombre).reduce((s,l)=>s+(l.total||l.totalNeto||0),0);
    const cobA= movCobros.filter(m=>m.aseguradora===a.nombre).reduce((s,m)=>s+(parseFloat(m.monto)||0),0);
    const dA  = liqCobros.filter(l=>l.aseguradora===a.nombre).reduce((s,l)=>s+((l.descuentosAplicados||[]).filter(d=>!/^anticipo/i.test(d.nombre||"")).reduce((ss,d)=>ss+(parseFloat(d.monto)||0),0)),0);
    const pend= Math.max(0, liqA - cobA);
    totA_ca+=ca; totA_liq+=liqA; totA_dA+=dA; totA_cob+=cobA; totA_pend+=pend;
    return`<tr><td>${a.nombre}</td><td style="text-align:right">${fmtMoney(ca)}</td><td style="text-align:right">${fmtMoney(liqA)}</td><td style="text-align:right;color:#dc2626">${dA?"-"+fmtMoney(dA):"\u2014"}</td><td style="text-align:right">${fmtMoney(cobA)}</td><td style="text-align:right;color:#dc2626;font-weight:700">${fmtMoney(pend)}</td></tr>`;
  }).join("");
  const totAsegRow=`<tr style="background:#e8ecf4;font-weight:700"><td>TOTAL</td><td style="text-align:right">${fmtMoney(totA_ca)}</td><td style="text-align:right">${fmtMoney(totA_liq)}</td><td style="text-align:right;color:#dc2626">${totA_dA?"-"+fmtMoney(totA_dA):"\u2014"}</td><td style="text-align:right">${fmtMoney(totA_cob)}</td><td style="text-align:right;color:#dc2626">${fmtMoney(totA_pend)}</td></tr>`;

  let totV_cv=0,totV_liq=0,totV_dV=0,totV_pag=0,totV_ant=0,totV_pend=0;
  const filasVend = [...vendedores].sort((a,b)=>a.nombre.localeCompare(b.nombre)).map(v=>{
    const cv  = comisiones.filter(cm=>cm.vendedor===v.nombre).reduce((s,cm)=>s+(cm.comisionVendedor||0),0);
    const liqV= liquidaciones.filter(l=>l.vendedor===v.nombre).reduce((s,l)=>s+(l.totalNeto||0),0);
    const pagV= movPagos.filter(m=>m.vendedor===v.nombre&&m.tipo!=="Anticipo").reduce((s,m)=>s+(parseFloat(m.monto)||0),0);
    const dV  = liquidaciones.filter(l=>l.vendedor===v.nombre).reduce((s,l)=>s+((l.descuentosAplicados||[]).filter(d=>!/^anticipo/i.test(d.nombre||"")).reduce((ss,d)=>ss+(parseFloat(d.monto)||0),0)),0);
    const antE= movPagos.filter(m=>m.vendedor===v.nombre&&m.tipo==="Anticipo").reduce((s,m)=>s+(parseFloat(m.monto)||0),0);
    const antD= liquidaciones.filter(l=>l.vendedor===v.nombre).reduce((s,l)=>s+((l.descuentosAplicados||[]).filter(d=>/^anticipo/i.test(d.nombre||"")).reduce((ss,d)=>ss+(parseFloat(d.monto)||0),0)),0);
    const antV= Math.max(0,antE-antD);
    if(!cv&&!liqV&&!pagV) return"";
    const pend=liqV-pagV-antV;
    const pendColor=pend<0?"#16a34a":pend>0?"#dc2626":"#94a3b8";
    totV_cv+=cv; totV_liq+=liqV; totV_dV+=dV; totV_pag+=pagV; totV_ant+=antV; totV_pend+=pend;
    return`<tr><td>${v.nombre}</td><td style="text-align:right">${fmtMoney(cv)}</td><td style="text-align:right">${fmtMoney(liqV)}</td><td style="text-align:right;color:#dc2626">${dV?"-"+fmtMoney(dV):"\u2014"}</td><td style="text-align:right">${fmtMoney(pagV)}</td><td style="text-align:right;color:#d97706">${antV?fmtMoney(antV):"\u2014"}</td><td style="text-align:right;color:${pendColor};font-weight:700">${pend===0?"\u2014":fmtMoney(pend)}</td></tr>`;
  }).join("");
  const totVendColor=totV_pend<0?"#16a34a":totV_pend>0?"#dc2626":"#94a3b8";
  const totVendRow=`<tr style="background:#e8ecf4;font-weight:700"><td>TOTAL</td><td style="text-align:right">${fmtMoney(totV_cv)}</td><td style="text-align:right">${fmtMoney(totV_liq)}</td><td style="text-align:right;color:#dc2626">${totV_dV?"-"+fmtMoney(totV_dV):"\u2014"}</td><td style="text-align:right">${fmtMoney(totV_pag)}</td><td style="text-align:right;color:#d97706">${totV_ant?fmtMoney(totV_ant):"\u2014"}</td><td style="text-align:right;color:${totVendColor}">${fmtMoney(totV_pend)}</td></tr>`;

  const descCobRows = Object.entries(descCobMap).map(([n,v])=>`<div class="desc-row"><span>${n}</span><span style="color:#dc2626">-${fmtMoney(v)}</span></div>`).join("");
  const descPagRows = Object.entries(descPagMap).map(([n,v])=>`<div class="desc-row"><span>${n}</span><span style="color:#dc2626">-${fmtMoney(v)}</span></div>`).join("");
  const descDetalle = _buildDescPDFDual(descCobMapAll, descPagMapAll);

  const html=`<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"><title>Balance_Comisiones_${new Date().toISOString().split("T")[0]}</title><style>*{box-sizing:border-box;margin:0;padding:0}body{font-family:Arial,sans-serif;font-size:12px;color:#1a1a2e;padding:2rem}.header{display:flex;align-items:center;gap:16px;border-bottom:2px solid #1a2744;padding-bottom:12px;margin-bottom:16px}.logo{width:50px;height:50px;border-radius:8px;overflow:hidden;flex-shrink:0}.logo img{width:100%;height:100%;object-fit:cover}.brand-name{font-size:14px;font-weight:700;color:#1a2744}.brand-sub{font-size:10px;color:#64748b}.rep-title{text-align:right;font-size:14px;font-weight:700;color:#1a2744}.rep-meta{font-size:10px;color:#64748b}.section{font-size:10px;font-weight:700;letter-spacing:0.07em;color:#fff;background:#1a2744;padding:4px 8px;border-radius:3px;margin:14px 0 6px;text-transform:uppercase}.section.fiscal{background:#7c3aed}.grid{display:grid;grid-template-columns:repeat(5,1fr);gap:6px;margin-bottom:10px}.card{background:#f8fafc;border:1px solid #e2e8f0;border-radius:6px;padding:7px 9px}.card-lbl{font-size:9px;color:#64748b;text-transform:uppercase;margin-bottom:2px}.card-val{font-size:14px;font-weight:700}.blue{color:#1a2744}.green{color:#16a34a}.amber{color:#d97706}.red{color:#dc2626}table{width:100%;border-collapse:collapse;font-size:11px;margin-bottom:10px}th{text-align:left;padding:5px 7px;background:#e8ecf4;color:#1a2744;font-size:9px;font-weight:700;text-transform:uppercase}td{padding:5px 7px;border-bottom:0.5px solid #e2e8f0}tfoot tr{background:#e8ecf4}.desc-bloque{background:#f8fafc;border:1px solid #e2e8f0;border-radius:5px;padding:8px 10px;margin-bottom:10px;font-size:11px}.desc-row{display:flex;justify-content:space-between;padding:2px 0;border-bottom:0.5px solid #e2e8f0}.desc-total{display:flex;justify-content:space-between;padding:4px 0;font-weight:700}.sec{font-size:10px;font-weight:700;color:#fff;padding:4px 8px;border-radius:3px;margin:10px 0 4px;text-transform:uppercase}.grand{display:flex;justify-content:space-between;align-items:center;background:#1a2744;color:#fff;border-radius:5px;padding:8px 12px;margin-top:10px;font-weight:700;font-size:11px}.footer{text-align:center;font-size:9px;color:#94a3b8;margin-top:12px;border-top:1px solid #e2e8f0;padding-top:8px}</style></head><body>
  <div class="header"><div class="logo"><img src="${logoB64}" alt="Reyna Seguros"></div><div style="flex:1"><div class="brand-name">Reyna Seguros Gesti\u00f3n</div><div class="brand-sub">Asesor\u00eda experta y protecci\u00f3n a tu medida</div></div><div><div class="rep-title">Balance de comisiones</div><div class="rep-meta">Fecha: ${fecha}</div></div></div>
  <div class="section">Resumen \u2014 Aseguradoras (cobros)</div>
  <div class="grid"><div class="card"><div class="card-lbl">Com. Br\u00f3ker Generadas</div><div class="card-val blue">${fmtMoney(totalComBroker)}</div></div><div class="card"><div class="card-lbl">Cobrado</div><div class="card-val green">${fmtMoney(totalCobrado)}</div></div><div class="card"><div class="card-lbl">Descuentos en cobros</div><div class="card-val red">-${fmtMoney(totalDescCob)}</div></div><div class="card"><div class="card-lbl">Neto Cobrado Real</div><div class="card-val green">${fmtMoney(netoCobrado)}</div></div><div class="card"><div class="card-lbl">Pendiente por Cobrar</div><div class="card-val red">${fmtMoney(pendienteCobrar)}</div></div></div>
  <div class="section">Resumen \u2014 Vendedores (pagos)</div>
  <div class="grid"><div class="card"><div class="card-lbl">Com. Vendedores</div><div class="card-val amber">${fmtMoney(totalComVend)}</div></div><div class="card"><div class="card-lbl">Pagado</div><div class="card-val green">${fmtMoney(totalPagado)}</div></div><div class="card"><div class="card-lbl">Descuentos en pagos</div><div class="card-val red">-${fmtMoney(totalDescPag)}</div></div><div class="card"><div class="card-lbl">Neto Pagado Real</div><div class="card-val green">${fmtMoney(netoPagado)}</div></div><div class="card"><div class="card-lbl">Pendiente por Pagar</div><div class="card-val ${pendientePagar<0?"green":"red"}">${fmtMoney(pendientePagar)}</div></div></div>
  <div class="section">Balance por aseguradora</div>
  <table><thead><tr><th>Aseguradora</th><th style="text-align:right">Com. Generadas</th><th style="text-align:right">Liquidado</th><th style="text-align:right">Descuentos</th><th style="text-align:right">Cobrado</th><th style="text-align:right">Pendiente</th></tr></thead><tbody>${filasAseg||"<tr><td colspan=\"6\" style=\"text-align:center;color:#94a3b8\">Sin datos</td></tr>"}</tbody><tfoot>${totAsegRow}</tfoot></table>
  ${descCobRows?`<div class="desc-bloque"><div style="font-size:9px;font-weight:700;text-transform:uppercase;color:#64748b;margin-bottom:5px">Descuentos desglosados \u2014 cobros</div>${descCobRows}<div class="desc-total"><span>Total descuentos cobros</span><span style="color:#dc2626">-${fmtMoney(totalDescCob)}</span></div></div>`:""}
  <div class="section">Balance por vendedor</div>
  <table><thead><tr><th>Vendedor</th><th style="text-align:right">Com. Generadas</th><th style="text-align:right">Liquidado</th><th style="text-align:right">Descuentos</th><th style="text-align:right">Pagado</th><th style="text-align:right">Anticipos</th><th style="text-align:right">Pendiente</th></tr></thead><tbody>${filasVend||"<tr><td colspan=\"7\" style=\"text-align:center;color:#94a3b8\">Sin datos</td></tr>"}</tbody><tfoot>${totVendRow}</tfoot></table>
  ${descPagRows?`<div class="desc-bloque"><div style="font-size:9px;font-weight:700;text-transform:uppercase;color:#64748b;margin-bottom:5px">Descuentos desglosados \u2014 pagos</div>${descPagRows}<div class="desc-total"><span>Total descuentos pagos</span><span style="color:#dc2626">-${fmtMoney(totalDescPag)}</span></div></div>`:""}
  <div class="section fiscal">Detalle de descuentos y retenciones</div>
  ${descDetalle||"<p style=\"font-size:11px;color:#94a3b8;padding:6px 0\">No hay descuentos registrados.</p>"}
  <div class="footer">${FOOTER_TEXT}</div></body></html>`;

  const w = window.open("","_blank"); w.document.write(html); w.document.close(); w.print();
}



