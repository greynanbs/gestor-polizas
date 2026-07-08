// ════════════════════════════════════════════════════════════════════
// MÓDULO COMISIONES — vendedores + aseguradoras
// ════════════════════════════════════════════════════════════════════
function cambiarSubtabComisiones(sub){
  comisionesSubtab=sub;
  document.querySelectorAll('#view-comisiones .subtab').forEach(b=>b.classList.toggle('active',b.dataset.sub===sub));
  renderComisiones();
}
function renderComisiones(){
  const c=document.getElementById('comisiones-content');
  if(comisionesSubtab==='vendedores-det') return renderComisionesDetalle(c);
  if(comisionesSubtab==='vendedores-liq') return renderComisionesLiquidaciones(c);
  if(comisionesSubtab==='aseg-liq')       return renderLiqCobros(c);
  if(comisionesSubtab==='balance')        return renderComisionesBalance(c);
}

// ── DETALLE VENDEDORES ────────────────────────────────────────────────
function renderComisionesDetalle(c){
  const vO=[...vendedores].sort((a,b)=>a.nombre.localeCompare(b.nombre));
  c.innerHTML=`<div class="toolbar" style="flex-wrap:wrap;gap:8px">
    <input type="text" id="com-busq" placeholder="Buscar cliente, aseguradora..." oninput="renderTablaComisiones()">
    <select id="com-fvend" onchange="renderTablaComisiones()"><option value="">Todos los vendedores</option>${vO.map(v=>`<option>${v.nombre}</option>`).join('')}</select>
    <select id="com-fest" onchange="renderTablaComisiones()"><option value="">Todos los estados</option><option value="facturado">Facturado</option><option value="cobrado">Cobrado</option><option value="pagado">Pagado</option><option value="pendiente">Pendiente</option></select>
    <select id="com-fperiodo" onchange="onPeriodoComDet()" style="font-size:12px;border:1px solid #e2e8f0;border-radius:6px;padding:5px 8px;background:#f8fafc;outline:none">
      <option value="todo">Todo el tiempo</option>
      <option value="semana">Esta semana</option><option value="mes">Este mes</option>
      <option value="trimestre">Este trimestre</option><option value="semestre">Este semestre</option>
      <option value="anio">Este año</option><option value="custom">Fechas específicas</option>
    </select>
    <div id="com-custom" style="display:none;gap:6px;align-items:flex-end">
      <input type="date" id="com-fi" onchange="renderTablaComisiones()" style="font-size:12px;border:1px solid #e2e8f0;border-radius:6px;padding:5px 8px;background:#f8fafc;outline:none">
      <input type="date" id="com-ff" onchange="renderTablaComisiones()" style="font-size:12px;border:1px solid #e2e8f0;border-radius:6px;padding:5px 8px;background:#f8fafc;outline:none">
    </div>
    <button class="btn btn-outline btn-sm" style="margin-left:auto" onclick="exportarComisionesCSV()"><i class="ti ti-download" aria-hidden="true"></i> CSV</button>
    <button class="btn btn-outline btn-sm" onclick="exportarComisionesPDF()"><i class="ti ti-file-text" aria-hidden="true"></i> PDF</button>
  </div>
  <div class="table-wrap"><div class="table-scroll"><table><thead><tr><th>Cliente</th><th>Aseguradora</th><th>Ramo</th><th>Vendedor</th><th style="text-align:right">Prima Neta</th><th style="text-align:right">% Bróker</th><th style="text-align:right">Com. Bróker</th><th style="text-align:right">% Vend.</th><th style="text-align:right">Com. Vend.</th><th>Estado</th></tr></thead><tbody id="com-tbody"></tbody></table></div></div>`;
  renderTablaComisiones();
}
function onPeriodoComDet(){
  const p=(document.getElementById('com-fperiodo')||{}).value;
  const div=document.getElementById('com-custom');
  if(div) div.style.display=p==='custom'?'flex':'none';
  renderTablaComisiones();
}
function renderTablaComisiones(){
  const busq=(document.getElementById('com-busq').value||'').toLowerCase();
  const fV=document.getElementById('com-fvend').value;
  const fE=document.getElementById('com-fest').value;
  const p=(document.getElementById('com-fperiodo')||{}).value||'todo';
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
    const vi=(document.getElementById('com-fi')||{}).value;
    const vf=(document.getElementById('com-ff')||{}).value;
    if(vi) ini=new Date(vi+'T00:00:00');
    if(vf) fin=new Date(vf+'T23:59:59');
  }
  const canEdit=puedeEditar();
  let lista=comisiones.filter(cm=>{
    const mb=!busq||cm.cliente.toLowerCase().includes(busq)||cm.aseguradora.toLowerCase().includes(busq);
    const mv=!fV||cm.vendedor===fV;
    let me=true;
    if(fE==='facturado')me=cm.facturado;
    if(fE==='cobrado')me=cm.cobrado;
    if(fE==='pagado')me=cm.pagado;
    if(fE==='pendiente')me=!cm.facturado&&!cm.cobrado&&!cm.pagado;
    let mp=true;
    if(ini||fin){const d=new Date(cm.fechaInicio||cm.inicio||cm.fechaCreacion||'');if(ini&&d<ini)mp=false;if(fin&&d>fin)mp=false;}
    return mb&&mv&&me&&mp;
  });
  const tbody=document.getElementById('com-tbody');
  if(!lista.length){tbody.innerHTML='<tr><td colspan="10"><div class="empty-state"><i class="ti ti-cash-off"></i>No hay comisiones.</div></td></tr>';return;}
  const totPrimaNeta=lista.reduce((s,cm)=>s+(cm.primaNeta||0),0);
  const totBroker=lista.reduce((s,cm)=>s+(cm.comisionBroker||0),0);
  const totVend=lista.reduce((s,cm)=>s+(cm.comisionVendedor||0),0);
  tbody.innerHTML=lista.map(cm=>`<tr><td>${cm.cliente}</td><td title="${cm.aseguradora}">${cm.aseguradora}</td><td>${cm.ramo}</td><td>${cm.vendedor}</td><td style="text-align:right">${fmtMoney(cm.primaNeta)}</td><td style="text-align:right">${cm.pctAseguradora}%</td><td style="text-align:right">${fmtMoney(cm.comisionBroker)}</td><td style="text-align:right">${cm.pctVendedor}%</td><td style="text-align:right;font-weight:600;color:#16a34a">${fmtMoney(cm.comisionVendedor)}</td><td><div style="display:flex;gap:4px;flex-wrap:wrap"><label style="display:flex;align-items:center;gap:3px;font-size:11px"><input type="checkbox" ${cm.facturado?'checked':''} ${canEdit?'':'disabled'} onchange="toggleEstadoCom('${cm.id}','facturado',this.checked)"> Factur.</label><label style="display:flex;align-items:center;gap:3px;font-size:11px"><input type="checkbox" ${cm.cobrado?'checked':''} ${canEdit?'':'disabled'} onchange="toggleEstadoCom('${cm.id}','cobrado',this.checked)"> Cobrado</label><label style="display:flex;align-items:center;gap:3px;font-size:11px"><input type="checkbox" ${cm.pagado?'checked':''} ${canEdit?'':'disabled'} onchange="toggleEstadoCom('${cm.id}','pagado',this.checked)"> Pagado</label></div></td></tr>`).join('');
  // Totals row
  const tbl=tbody.closest('table');
  let tfoot=tbl.querySelector('tfoot');
  if(!tfoot){tfoot=document.createElement('tfoot');tbl.appendChild(tfoot);}
  tfoot.innerHTML=`<tr style="background:#f1f5f9;font-weight:700"><td colspan="4">TOTAL (${lista.length} registros)</td><td style="text-align:right">${fmtMoney(totPrimaNeta)}</td><td></td><td style="text-align:right">${fmtMoney(totBroker)}</td><td></td><td style="text-align:right;color:#16a34a">${fmtMoney(totVend)}</td><td></td></tr>`;
}
async function toggleEstadoCom(id,campo,valor){
  try{const a=await apiPut('comisiones',id,{[campo]:valor});const i=comisiones.findIndex(x=>x.id===id);comisiones[i]=a;mostrarToast('Estado actualizado');}
  catch(e){mostrarToast('Error al actualizar');renderTablaComisiones();}
}
function exportarComisionesPDF(){
  const fecha = new Date().toLocaleDateString('es-EC');
  const logoB64 = document.querySelector('#login-screen .login-logo img').src;
  const lista = comisiones;
  const totalBroker = lista.reduce((s,cm)=>s+(cm.comisionBroker||0),0);
  const totalVend   = lista.reduce((s,cm)=>s+(cm.comisionVendedor||0),0);
  const filas = lista.map(cm=>`<tr>
    <td>${cm.cliente}</td>
    <td>${cm.aseguradora}</td>
    <td>${cm.ramo}</td>
    <td>${cm.vendedor}</td>
    <td style="text-align:right">${fmtMoney(cm.primaNeta)}</td>
    <td style="text-align:right">${cm.pctAseguradora}%</td>
    <td style="text-align:right">${fmtMoney(cm.comisionBroker)}</td>
    <td style="text-align:right">${cm.pctVendedor}%</td>
    <td style="text-align:right;font-weight:600;color:#15803d">${fmtMoney(cm.comisionVendedor)}</td>
    <td style="text-align:center">${cm.facturado?'✓':''}${cm.cobrado?' ✓':''}${cm.pagado?' ✓':''}</td>
  </tr>`).join('');
  const html=`<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"><title>Comisiones_${new Date().toISOString().split('T')[0]}</title>
  <style>*{box-sizing:border-box;margin:0;padding:0}body{font-family:Arial,sans-serif;font-size:11px;color:#1a1a2e;padding:2rem}
  .header{display:flex;align-items:center;gap:16px;border-bottom:2px solid #1a2744;padding-bottom:12px;margin-bottom:14px}
  .logo{width:50px;height:50px;border-radius:8px;overflow:hidden;flex-shrink:0}.logo img{width:100%;height:100%;object-fit:cover}
  .brand-name{font-size:14px;font-weight:700;color:#1a2744}.brand-sub{font-size:10px;color:#64748b}
  .rep-title{text-align:right;font-size:14px;font-weight:700;color:#1a2744}.rep-meta{font-size:10px;color:#64748b}
  .section{font-size:10px;font-weight:700;letter-spacing:0.07em;color:#fff;background:#1a2744;padding:4px 8px;border-radius:3px;margin:12px 0 6px;text-transform:uppercase}
  .grid{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:12px}
  .card{background:#f8fafc;border:1px solid #e2e8f0;border-radius:6px;padding:8px 10px}
  .card-lbl{font-size:9px;color:#64748b;text-transform:uppercase;margin-bottom:2px}.card-val{font-size:15px;font-weight:700}
  table{width:100%;border-collapse:collapse;font-size:10px;margin-bottom:10px}
  th{text-align:left;padding:4px 6px;background:#e8ecf4;color:#1a2744;font-size:9px;font-weight:700;text-transform:uppercase}
  td{padding:4px 6px;border-bottom:0.5px solid #e2e8f0}
  .footer{text-align:center;font-size:9px;color:#94a3b8;margin-top:12px;border-top:1px solid #e2e8f0;padding-top:8px}
  </style></head><body>
  <div class="header"><div class="logo"><img src="${logoB64}" alt="Reyna Seguros"></div>
  <div style="flex:1"><div class="brand-name">Reyna Seguros Gestión</div><div class="brand-sub">Asesoría experta y protección a tu medida</div></div>
  <div><div class="rep-title">Detalle de comisiones</div><div class="rep-meta">Fecha: ${fecha}</div></div></div>
  <div class="section">Resumen</div>
  <div class="grid">
    <div class="card"><div class="card-lbl">Com. Bróker Total</div><div class="card-val" style="color:#1a2744">${fmtMoney(totalBroker)}</div></div>
    <div class="card"><div class="card-lbl">Com. Vendedores Total</div><div class="card-val" style="color:#d97706">${fmtMoney(totalVend)}</div></div>
    <div class="card"><div class="card-lbl">N° Registros</div><div class="card-val" style="color:#1a2744">${lista.length}</div></div>
  </div>
  <div class="section">Detalle</div>
  <table><thead><tr><th>Cliente</th><th>Aseguradora</th><th>Ramo</th><th>Vendedor</th><th style="text-align:right">Prima Neta</th><th style="text-align:right">% Bróker</th><th style="text-align:right">Com. Bróker</th><th style="text-align:right">% Vend.</th><th style="text-align:right">Com. Vend.</th><th style="text-align:center">F/C/P</th></tr></thead>
  <tbody>${filas}</tbody></table>
  <div class="footer">${FOOTER_TEXT}</div></body></html>`;
  const w=window.open('','_blank'); w.document.write(html); w.document.close(); w.print();
}

// ── LIQUIDACIONES VENDEDORES ──────────────────────────────────────────
function renderComisionesLiquidaciones(c){
  const canDel=puedeEliminar();
  const vO=[...vendedores].sort((a,b)=>a.nombre.localeCompare(b.nombre));
  // Cards resumen (mismos conceptos que balance)
  const totLiq=liquidaciones.reduce((s,l)=>s+(l.totalNeto||0),0);
  const antEmitidos=movPagos.filter(m=>m.tipo==='Anticipo').reduce((s,m)=>s+(parseFloat(m.monto)||0),0);
  const antDescontados=liquidaciones.reduce((s,l)=>s+((l.descuentosAplicados||[]).filter(d=>/^anticipo/i.test(d.nombre||'')).reduce((ss,d)=>ss+(parseFloat(d.monto)||0),0)),0);
  const antActivos=Math.max(0,antEmitidos-antDescontados);
  const totPagado=movPagos.filter(m=>m.tipo!=='Anticipo').reduce((s,m)=>s+(parseFloat(m.monto)||0),0);
  const pendPagar=totLiq-antActivos-totPagado;
  c.innerHTML=`
  <div class="stats-row" style="margin-bottom:1rem">
    <div class="stat"><div class="stat-label">Total liquidado</div><div class="stat-value blue">${fmtMoney(totLiq)}</div></div>
    <div class="stat"><div class="stat-label">Anticipos activos</div><div class="stat-value amber">${fmtMoney(antActivos)}</div></div>
    <div class="stat"><div class="stat-label">Total pagado</div><div class="stat-value green">${fmtMoney(totPagado)}</div></div>
    <div class="stat"><div class="stat-label">Pendiente pagar</div><div class="stat-value ${pendPagar>0?'red':'green'}">${fmtMoney(pendPagar)}</div></div>
  </div>
  <div style="display:flex;flex-wrap:wrap;gap:8px;margin-bottom:10px;align-items:flex-end">
    <select id="llv-fvend" onchange="filtrarTablaLiqVend()" style="font-size:12px;border:1px solid #e2e8f0;border-radius:6px;padding:5px 8px;background:#f8fafc;outline:none">
      <option value="">Todos los vendedores</option>${vO.map(v=>`<option>${v.nombre}</option>`).join('')}
    </select>
    <select id="llv-fperiodo" onchange="onPeriodoLiqVend()" style="font-size:12px;border:1px solid #e2e8f0;border-radius:6px;padding:5px 8px;background:#f8fafc;outline:none">
      <option value="todo">Todo el tiempo</option>
      <option value="semana">Esta semana</option>
      <option value="mes">Este mes</option>
      <option value="trimestre">Este trimestre</option>
      <option value="semestre">Este semestre</option>
      <option value="anio">Este año</option>
      <option value="custom">Fechas específicas</option>
    </select>
    <select id="llv-festado" onchange="filtrarTablaLiqVend()" style="font-size:12px;border:1px solid #e2e8f0;border-radius:6px;padding:5px 8px;background:#f8fafc;outline:none">
      <option value="">Todos los estados</option>
      <option value="emitida">Emitida</option>
      <option value="pagada">Pagada</option>
    </select>
    <div id="llv-custom" style="display:none;gap:6px;align-items:flex-end;flex-wrap:wrap">
      <div><div style="font-size:10px;font-weight:600;color:#64748b;margin-bottom:3px">Desde</div><input type="date" id="llv-fi" onchange="filtrarTablaLiqVend()" style="font-size:12px;border:1px solid #e2e8f0;border-radius:6px;padding:5px 8px;background:#f8fafc;outline:none"></div>
      <div><div style="font-size:10px;font-weight:600;color:#64748b;margin-bottom:3px">Hasta</div><input type="date" id="llv-ff" onchange="filtrarTablaLiqVend()" style="font-size:12px;border:1px solid #e2e8f0;border-radius:6px;padding:5px 8px;background:#f8fafc;outline:none"></div>
    </div>
    <button class="btn btn-outline btn-sm" onclick="exportarTodasLiqVendCSV()"><i class="ti ti-download" aria-hidden="true"></i> CSV</button>
    <button class="btn btn-outline btn-sm" onclick="exportarTodasLiqVendPDF()"><i class="ti ti-file-text" aria-hidden="true"></i> PDF</button>
    <button class="btn btn-primary btn-sm" style="margin-left:auto" onclick="abrirModalLiquidacion()"><i class="ti ti-plus" aria-hidden="true"></i> Nueva liquidación</button>
  </div>
  <div class="table-wrap"><div class="table-scroll">
    <table id="llv-tabla">
      <thead><tr>
        <th style="width:28px"></th>
        <th>Fecha</th><th>Vendedor</th><th style="text-align:right">Subtotal</th>
        <th style="text-align:right">IVA</th><th style="text-align:right">Total</th>
        <th style="text-align:right">Descuentos</th><th style="text-align:right">A pagar</th>
        <th>Estado</th><th>Acciones</th>
      </tr></thead>
      <tbody id="llv-tbody"></tbody>
      <tfoot id="llv-tfoot"></tfoot>
    </table>
  </div></div>

  <!-- Tabla descuentos por tipo — solo pagos vendedores -->
  <div class="actions-panel" style="margin-top:1rem;border:1.5px solid #1a2744">
    <div class="actions-panel-title" style="background:#1a2744;color:#fff;border-radius:4px 4px 0 0;margin:-1px -1px 0 -1px;padding:8px 12px">
      <i class="ti ti-receipt-tax" style="font-size:13px" aria-hidden="true"></i> Detalle de descuentos por tipo
    </div>
    <div id="llv-descuentos-content" style="padding:8px 0"></div>
  </div>`;
  filtrarTablaLiqVend();
  renderLiqVendDescuentos();
}
function onPeriodoLiqVend(){
  const p=(document.getElementById('llv-fperiodo')||{}).value;
  const div=document.getElementById('llv-custom');
  if(div) div.style.display=p==='custom'?'flex':'none';
  filtrarTablaLiqVend();
}
function filtrarTablaLiqVend(){
  const fV=(document.getElementById('llv-fvend')||{}).value||'';
  const fE=(document.getElementById('llv-festado')||{}).value||'';
  const p=(document.getElementById('llv-fperiodo')||{}).value||'todo';
  let ini=null,fin=null;
  if(p!=='todo'&&p!=='custom'){
    fin=new Date(); fin.setHours(23,59,59,999);
    ini=new Date(); ini.setHours(0,0,0,0);
    if(p==='semana') ini.setDate(ini.getDate()-ini.getDay());
    else if(p==='mes') ini.setDate(1);
    else if(p==='trimestre') ini.setMonth(Math.floor(ini.getMonth()/3)*3,1);
    else if(p==='semestre') ini.setMonth(Math.floor(ini.getMonth()/6)*6,1);
    else if(p==='anio') ini.setMonth(0,1);
  } else if(p==='custom'){
    const vi=(document.getElementById('llv-fi')||{}).value;
    const vf=(document.getElementById('llv-ff')||{}).value;
    if(vi) ini=new Date(vi+'T00:00:00');
    if(vf) fin=new Date(vf+'T23:59:59');
  }
  const lista=liquidaciones.filter(l=>{
    if(fV&&l.vendedor!==fV) return false;
    if(fE&&(l.estatus||'emitida')!==fE) return false;
    if(ini||fin){const d=new Date(l.fecha);if(ini&&d<ini)return false;if(fin&&d>fin)return false;}
    return true;
  });
  const canDel=puedeEliminar();
  const tbody=document.getElementById('llv-tbody');
  const tfoot=document.getElementById('llv-tfoot');
  if(!tbody)return;
  if(!lista.length){tbody.innerHTML='<tr><td colspan="10"><div class="empty-state"><i class="ti ti-receipt"></i>No hay liquidaciones.</div></td></tr>';if(tfoot)tfoot.innerHTML='';return;}
  let tSub=0,tIva=0,tTot=0,tDesc=0,tNeto=0;
  tbody.innerHTML=lista.map(liq=>{
    const fecha=new Date(liq.fecha).toLocaleDateString('es-EC');
    const estBadge=liq.estatus==='pagada'?'badge-green':'badge-amber';
    const est=liq.estatus||'emitida';
    const descSub=liq.descuentosAplicados&&liq.descuentosAplicados.length?
      liq.descuentosAplicados.map(d=>`<div style="display:flex;justify-content:space-between;font-size:11px;padding:2px 0;border-bottom:0.5px solid #f1f5f9"><span style="color:#64748b">${d.nombre}</span><span style="color:#dc2626">-${fmtMoney(d.monto)}</span></div>`).join('')+
      `<div style="display:flex;justify-content:space-between;font-size:11px;padding:3px 0;font-weight:700"><span>Total descuentos</span><span style="color:#dc2626">-${fmtMoney(liq.totalDescuentos||0)}</span></div>`
      :'<span style="font-size:11px;color:#94a3b8">Sin descuentos</span>';
    const polizasDet=(liq.detalle||[]).map(p=>`<tr style="background:#fafafa"><td style="padding:4px 8px;font-size:11px">${fd(p.inicio||'')}</td><td style="padding:4px 8px;font-size:11px">${p.cliente||'—'}</td><td style="padding:4px 8px;font-size:11px">${p.aseguradora||'—'}</td><td style="padding:4px 8px;font-size:11px">${p.ramo||'—'}</td><td style="padding:4px 8px;font-size:11px">${p.numero||'—'}</td><td style="padding:4px 8px;text-align:right;font-size:11px">${fmtMoney(p.primaNeta||0)}</td><td style="padding:4px 8px;text-align:right;font-size:11px">${fmtMoney(p.comision||0)}</td></tr>`).join('');
    tSub+=liq.subtotal||0;tIva+=liq.montoIva||0;tTot+=liq.total||0;tDesc+=liq.totalDescuentos||0;tNeto+=liq.totalNeto||0;
    return`<tr id="llv-row-${liq.id}">
      <td><button onclick="toggleLiqVendDet('${liq.id}')" style="background:none;border:none;cursor:pointer;font-size:14px;padding:0 4px" title="Ver pólizas"><i class="ti ti-chevron-right" id="llv-icon-${liq.id}"></i></button></td>
      <td>${fecha}</td><td>${liq.vendedor}</td>
      <td style="text-align:right">${fmtMoney(liq.subtotal||0)}</td>
      <td style="text-align:right">${liq.montoIva?fmtMoney(liq.montoIva):'—'}</td>
      <td style="text-align:right">${fmtMoney(liq.total||0)}</td>
      <td style="text-align:right;color:#dc2626">${liq.totalDescuentos?'-'+fmtMoney(liq.totalDescuentos):'—'}</td>
      <td style="text-align:right;font-weight:600;color:#16a34a">${fmtMoney(liq.totalNeto||0)}</td>
      <td><span class="badge ${estBadge}">${est}</span></td>
      <td><div style="display:flex;gap:4px">
        <button class="btn-icon" onclick="descargarLiquidacionCSV('${liq.id}')" title="CSV"><i class="ti ti-table"></i></button>
        <button class="btn-icon" onclick="descargarLiquidacionPDF('${liq.id}')" title="PDF"><i class="ti ti-file-text"></i></button>
        ${canDel?`<button class="btn-icon danger" onclick="eliminarLiquidacion('${liq.id}')" title="Eliminar"><i class="ti ti-trash"></i></button>`:''}
      </div></td>
    </tr>
    <tr id="llv-det-${liq.id}" style="display:none">
      <td colspan="10" style="padding:0 8px 10px 32px;background:#f8fafc">
        <div style="font-size:11px;font-weight:600;color:#64748b;text-transform:uppercase;margin:6px 0 4px">Pólizas incluidas</div>
        ${polizasDet?`<table style="width:100%;border-collapse:collapse;font-size:11px;margin-bottom:8px"><thead><tr style="background:#e8ecf4"><th style="padding:4px 8px;text-align:left">Fecha</th><th style="padding:4px 8px;text-align:left">Cliente</th><th style="padding:4px 8px;text-align:left">Aseguradora</th><th style="padding:4px 8px;text-align:left">Ramo</th><th style="padding:4px 8px;text-align:left">N° Póliza</th><th style="padding:4px 8px;text-align:right">Prima Neta</th><th style="padding:4px 8px;text-align:right">Comisión</th></tr></thead><tbody>${polizasDet}</tbody></table>`:'<div style="font-size:11px;color:#94a3b8;margin-bottom:6px">Sin detalle de pólizas.</div>'}
        <div style="font-size:11px;font-weight:600;color:#64748b;text-transform:uppercase;margin:4px 0">${liq.descuentosAplicados&&liq.descuentosAplicados.length?'Descuentos aplicados':''}</div>
        <div style="max-width:360px">${descSub}</div>
      </td>
    </tr>`;
  }).join('');
  if(tfoot)tfoot.innerHTML=`<tr style="background:#f1f5f9;font-weight:700"><td></td><td colspan="2">TOTAL (${lista.length})</td><td style="text-align:right">${fmtMoney(tSub)}</td><td style="text-align:right">${tIva?fmtMoney(tIva):'—'}</td><td style="text-align:right">${fmtMoney(tTot)}</td><td style="text-align:right;color:#dc2626">${tDesc?'-'+fmtMoney(tDesc):'—'}</td><td style="text-align:right;color:#16a34a">${fmtMoney(tNeto)}</td><td colspan="2"></td></tr>`;
}
function exportarTodasLiqVendCSV(){
  const lista=liquidaciones;
  if(!lista.length){mostrarToast('No hay liquidaciones para exportar');return;}
  let csv='LIQUIDACIONES DE VENDEDORES\n';
  csv+='Fecha,Vendedor,Subtotal,IVA,Total,Descuentos,A Pagar,Estado\n';
  lista.forEach(l=>{
    csv+=`"${fd(l.fecha)}","${l.vendedor}",${l.subtotal||0},${l.montoIva||0},${l.total||0},${l.totalDescuentos||0},${l.totalNeto||0},"${l.estatus||'emitida'}"\n`;
  });
  const tSub=lista.reduce((s,l)=>s+(l.subtotal||0),0);
  const tIva=lista.reduce((s,l)=>s+(l.montoIva||0),0);
  const tTot=lista.reduce((s,l)=>s+(l.total||0),0);
  const tDesc=lista.reduce((s,l)=>s+(l.totalDescuentos||0),0);
  const tNeto=lista.reduce((s,l)=>s+(l.totalNeto||0),0);
  csv+=`"TOTAL","",${tSub},${tIva},${tTot},${tDesc},${tNeto},""\n`;
  const blob=new Blob(['\uFEFF'+csv],{type:'text/csv;charset=utf-8'});
  const a=document.createElement('a');a.href=URL.createObjectURL(blob);
  a.download=`liquidaciones_vendedores_${new Date().toISOString().split('T')[0]}.csv`;a.click();
}
function exportarTodasLiqVendPDF(){
  const lista=liquidaciones;
  if(!lista.length){mostrarToast('No hay liquidaciones para exportar');return;}
  const logoB64=document.querySelector('#login-screen .login-logo img').src;
  const fecha=new Date().toLocaleDateString('es-EC');
  let tSub=0,tIva=0,tTot=0,tDesc=0,tNeto=0;
  const filas=lista.map(l=>{
    tSub+=l.subtotal||0;tIva+=l.montoIva||0;tTot+=l.total||0;tDesc+=l.totalDescuentos||0;tNeto+=l.totalNeto||0;
    return`<tr><td>${fd(l.fecha)}</td><td>${l.vendedor}</td><td style="text-align:right">${fmtMoney(l.subtotal||0)}</td><td style="text-align:right">${l.montoIva?fmtMoney(l.montoIva):'—'}</td><td style="text-align:right">${fmtMoney(l.total||0)}</td><td style="text-align:right;color:#dc2626">${l.totalDescuentos?'-'+fmtMoney(l.totalDescuentos):'—'}</td><td style="text-align:right;font-weight:700;color:#16a34a">${fmtMoney(l.totalNeto||0)}</td><td><span style="font-size:10px;font-weight:600;color:${l.estatus==='pagada'?'#16a34a':'#d97706'}">${l.estatus||'emitida'}</span></td></tr>`;
  }).join('');
  // Descuentos desglosados — solo pagos vendedores
  const mapPag={};
  lista.forEach(l=>(l.descuentosAplicados||[]).forEach(d=>{const n=d.nombre||'';if(!mapPag[n])mapPag[n]=0;mapPag[n]+=parseFloat(d.monto)||0;}));
  const descHTML=_buildDescPDFSingle(mapPag,'#1a2744');
  const html=`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Liquidaciones Vendedores</title><style>*{box-sizing:border-box;margin:0;padding:0}body{font-family:Arial,sans-serif;font-size:11px;padding:1.5rem;color:#1a1a2e}.header{display:flex;align-items:center;gap:12px;border-bottom:2px solid #1a2744;padding-bottom:10px;margin-bottom:14px}.logo{width:40px;height:40px;border-radius:6px;overflow:hidden}.logo img{width:100%;height:100%;object-fit:cover}table{width:100%;border-collapse:collapse;margin-top:6px}th{background:#e8ecf4;padding:5px 7px;text-align:left;font-size:9px;text-transform:uppercase}td{padding:5px 7px;border-bottom:0.5px solid #e2e8f0}tfoot tr{background:#f1f5f9;font-weight:700}.sec{font-size:10px;font-weight:700;color:#fff;padding:4px 8px;border-radius:3px;margin:12px 0 4px;text-transform:uppercase}.footer{text-align:center;font-size:9px;color:#94a3b8;margin-top:10px}.grand{display:flex;justify-content:space-between;align-items:center;background:#1a2744;color:#fff;border-radius:5px;padding:8px 12px;margin-top:12px;font-weight:700;font-size:11px}</style></head><body>
  <div class="header"><div class="logo"><img src="${logoB64}"></div><div><div style="font-size:13px;font-weight:700;color:#1a2744">Reyna Seguros Gesti\u00f3n</div><div style="font-size:10px;color:#64748b">Asesor\u00eda experta y protecci\u00f3n a tu medida</div></div><div style="margin-left:auto;text-align:right"><div style="font-size:13px;font-weight:700">Liquidaciones de vendedores</div><div style="font-size:10px;color:#64748b">Fecha: ${fecha}</div></div></div>
  <table><thead><tr><th>Fecha</th><th>Vendedor</th><th style="text-align:right">Subtotal</th><th style="text-align:right">IVA</th><th style="text-align:right">Total</th><th style="text-align:right">Descuentos</th><th style="text-align:right">A Pagar</th><th>Estado</th></tr></thead>
  <tbody>${filas}</tbody>
  <tfoot><tr><td colspan="2">TOTAL (${lista.length})</td><td style="text-align:right">${fmtMoney(tSub)}</td><td style="text-align:right">${tIva?fmtMoney(tIva):'—'}</td><td style="text-align:right">${fmtMoney(tTot)}</td><td style="text-align:right;color:#dc2626">${tDesc?'-'+fmtMoney(tDesc):'—'}</td><td style="text-align:right;color:#16a34a">${fmtMoney(tNeto)}</td><td></td></tr></tfoot></table>
  ${descHTML}
  <div class="footer">${FOOTER_TEXT}</div></body></html>`;
  const w=window.open('','_blank');w.document.write(html);w.document.close();w.print();
}
function exportarTodasLiqAsegCSV(){
  const lista=liqCobros;
  if(!lista.length){mostrarToast('No hay liquidaciones para exportar');return;}
  let csv='LIQUIDACIONES DE ASEGURADORAS\n';
  csv+='Fecha,Aseguradora,Subtotal,IVA,Total,Descuentos,A Cobrar,Estado\n';
  lista.forEach(l=>{
    csv+=`"${fd(l.fecha)}","${l.aseguradora}",${l.subtotal||0},${l.montoIva||0},${l.total||0},${l.totalDescuentos||0},${l.totalNeto||0},"${l.estatus||'emitida'}"\n`;
  });
  const tSub=lista.reduce((s,l)=>s+(l.subtotal||0),0);
  const tIva=lista.reduce((s,l)=>s+(l.montoIva||0),0);
  const tTot=lista.reduce((s,l)=>s+(l.total||0),0);
  const tDesc=lista.reduce((s,l)=>s+(l.totalDescuentos||0),0);
  const tNeto=lista.reduce((s,l)=>s+(l.totalNeto||0),0);
  csv+=`"TOTAL","",${tSub},${tIva},${tTot},${tDesc},${tNeto},""\n`;
  const blob=new Blob(['\uFEFF'+csv],{type:'text/csv;charset=utf-8'});
  const a=document.createElement('a');a.href=URL.createObjectURL(blob);
  a.download=`liquidaciones_aseguradoras_${new Date().toISOString().split('T')[0]}.csv`;a.click();
}
function exportarTodasLiqAsegPDF(){
  const lista=liqCobros;
  if(!lista.length){mostrarToast('No hay liquidaciones para exportar');return;}
  const logoB64=document.querySelector('#login-screen .login-logo img').src;
  const fecha=new Date().toLocaleDateString('es-EC');
  let tSub=0,tIva=0,tTot=0,tDesc=0,tNeto=0;
  const filas=lista.map(l=>{
    tSub+=l.subtotal||0;tIva+=l.montoIva||0;tTot+=l.total||0;tDesc+=l.totalDescuentos||0;tNeto+=l.totalNeto||0;
    return`<tr><td>${fd(l.fecha)}</td><td>${l.aseguradora}</td><td style="text-align:right">${fmtMoney(l.subtotal||0)}</td><td style="text-align:right">${l.montoIva?fmtMoney(l.montoIva):'—'}</td><td style="text-align:right">${fmtMoney(l.total||0)}</td><td style="text-align:right;color:#dc2626">${l.totalDescuentos?'-'+fmtMoney(l.totalDescuentos):'—'}</td><td style="text-align:right;font-weight:700;color:#D97757">${fmtMoney(l.totalNeto||0)}</td><td><span style="font-size:10px;font-weight:600;color:${l.estatus==='cobrada'?'#16a34a':'#d97706'}">${l.estatus||'emitida'}</span></td></tr>`;
  }).join('');
  // Descuentos desglosados — solo cobros aseguradoras
  const mapCob={};
  lista.forEach(l=>(l.descuentosAplicados||[]).forEach(d=>{const n=d.nombre||'';if(!mapCob[n])mapCob[n]=0;mapCob[n]+=parseFloat(d.monto)||0;}));
  const descHTML=_buildDescPDFSingle(mapCob,'#D97757');
  const html=`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Liquidaciones Aseguradoras</title><style>*{box-sizing:border-box;margin:0;padding:0}body{font-family:Arial,sans-serif;font-size:11px;padding:1.5rem;color:#1a1a2e}.header{display:flex;align-items:center;gap:12px;border-bottom:2px solid #D97757;padding-bottom:10px;margin-bottom:14px}.logo{width:40px;height:40px;border-radius:6px;overflow:hidden}.logo img{width:100%;height:100%;object-fit:cover}table{width:100%;border-collapse:collapse;margin-top:6px}th{background:#fdf0eb;padding:5px 7px;text-align:left;font-size:9px;text-transform:uppercase;color:#D97757}td{padding:5px 7px;border-bottom:0.5px solid #e2e8f0}tfoot tr{background:#f1f5f9;font-weight:700}.sec{font-size:10px;font-weight:700;color:#fff;padding:4px 8px;border-radius:3px;margin:12px 0 4px;text-transform:uppercase}.footer{text-align:center;font-size:9px;color:#94a3b8;margin-top:10px}.grand{display:flex;justify-content:space-between;align-items:center;background:#D97757;color:#fff;border-radius:5px;padding:8px 12px;margin-top:12px;font-weight:700;font-size:11px}</style></head><body>
  <div class="header"><div class="logo"><img src="${logoB64}"></div><div><div style="font-size:13px;font-weight:700;color:#1a2744">Reyna Seguros Gesti\u00f3n</div><div style="font-size:10px;color:#64748b">Asesor\u00eda experta y protecci\u00f3n a tu medida</div></div><div style="margin-left:auto;text-align:right"><div style="font-size:13px;font-weight:700;color:#D97757">Liquidaciones de aseguradoras</div><div style="font-size:10px;color:#64748b">Fecha: ${fecha}</div></div></div>
  <table><thead><tr><th>Fecha</th><th>Aseguradora</th><th style="text-align:right">Subtotal</th><th style="text-align:right">IVA</th><th style="text-align:right">Total</th><th style="text-align:right">Descuentos</th><th style="text-align:right">A Cobrar</th><th>Estado</th></tr></thead>
  <tbody>${filas}</tbody>
  <tfoot><tr><td colspan="2">TOTAL (${lista.length})</td><td style="text-align:right">${fmtMoney(tSub)}</td><td style="text-align:right">${tIva?fmtMoney(tIva):'—'}</td><td style="text-align:right">${fmtMoney(tTot)}</td><td style="text-align:right;color:#dc2626">${tDesc?'-'+fmtMoney(tDesc):'—'}</td><td style="text-align:right;color:#D97757">${fmtMoney(tNeto)}</td><td></td></tr></tfoot></table>
  ${descHTML}
  <div class="footer">${FOOTER_TEXT}</div></body></html>`;
  const w=window.open('','_blank');w.document.write(html);w.document.close();w.print();
}

// ── Helpers para tabla de descuentos en PDFs ───────────────────────────
function _buildDescPDFSingle(map, accentColor){
  // Una sola columna (cobros o pagos según contexto)
  if(!Object.keys(map).length) return '';
  const esFiscal=n=>/retenci/i.test(n)||/impuesto/i.test(n)||/nota.*cr/i.test(n)||/reliquid/i.test(n)||/superban/i.test(n);
  const esAnticipo=n=>/^anticipo/i.test(n);
  const grpF=[],grpFee=[],grpAnt=[];
  Object.entries(map).forEach(([n,v])=>{
    if(esAnticipo(n)) grpAnt.push([n,v]);
    else if(esFiscal(n)) grpF.push([n,v]);
    else grpFee.push([n,v]);
  });
  const th='<thead><tr><th>Concepto</th><th style="text-align:right">Monto</th></tr></thead>';
  const buildGrp=(grp,label,bg)=>{
    if(!grp.length) return '';
    let tot=0;
    const rows=grp.map(([n,v])=>{tot+=v;return`<tr><td>${n}</td><td style="text-align:right">${fmtMoney(v)}</td></tr>`;}).join('');
    return`<div class="sec" style="background:${bg}">${label}</div>
    <table>${th}<tbody>${rows}</tbody><tfoot><tr><td>TOTAL ${label.toUpperCase()}</td><td style="text-align:right">${fmtMoney(tot)}</td></tr></tfoot></table>`;
  };
  const grand=Object.values(map).reduce((s,v)=>s+v,0);
  return buildGrp(grpF,'Retenciones fiscales','#1a2744')+
    buildGrp(grpFee,'Fee administrativo y otros','#64748b')+
    buildGrp(grpAnt,'Anticipos descontados','#d97706')+
    `<div class="grand"><span>TOTAL GENERAL DE DESCUENTOS</span><span>${fmtMoney(grand)}</span></div>`;
}

function _buildDescPDFDual(mapCob, mapPag){
  // Dos columnas: cobros y pagos
  const esFiscal=n=>/retenci/i.test(n)||/impuesto/i.test(n)||/nota.*cr/i.test(n)||/reliquid/i.test(n)||/superban/i.test(n);
  const esAnticipo=n=>/^anticipo/i.test(n);
  const allKeys=[...new Set([...Object.keys(mapCob),...Object.keys(mapPag)])];
  if(!allKeys.length) return '';
  const grpF=[],grpFee=[],grpAnt=[];
  allKeys.forEach(n=>{
    const e={n,c:mapCob[n]||0,p:mapPag[n]||0};
    if(esAnticipo(n)) grpAnt.push(e);
    else if(esFiscal(n)) grpF.push(e);
    else grpFee.push(e);
  });
  const thFiscal='<thead><tr><th>Concepto</th><th style="text-align:right;color:#16a34a">Cobros</th><th style="text-align:right;color:#dc2626">Pagos</th><th style="text-align:right">Acumulado</th></tr></thead>';
  const buildFiscal=(grp)=>{
    if(!grp.length) return '';
    let tC=0,tP=0;
    const rows=grp.map(e=>{const ac=e.c-e.p;tC+=e.c;tP+=e.p;return`<tr><td>${e.n}</td><td style="text-align:right;color:#16a34a">${e.c?fmtMoney(e.c):'—'}</td><td style="text-align:right;color:#dc2626">${e.p?fmtMoney(e.p):'—'}</td><td style="text-align:right;color:${ac>=0?'#16a34a':'#dc2626'}">${fmtMoney(ac)}</td></tr>`;}).join('');
    const ac=tC-tP;
    return`<div class="sec" style="background:#1a2744">Retenciones fiscales</div>
    <table>${thFiscal}<tbody>${rows}</tbody><tfoot><tr><td>TOTAL RETENCIONES FISCALES</td><td style="text-align:right;color:#16a34a">${fmtMoney(tC)}</td><td style="text-align:right;color:#dc2626">-${fmtMoney(tP)}</td><td style="text-align:right;color:${ac>=0?'#16a34a':'#dc2626'}">${fmtMoney(ac)}</td></tr></tfoot></table>`;
  };
  const buildInfo=(grp,label,bg)=>{
    if(!grp.length) return '';
    let tC=0,tP=0;
    const rows=grp.map(e=>{tC+=e.c;tP+=e.p;return`<tr><td>${e.n}</td><td style="text-align:right;color:#16a34a">${e.c?fmtMoney(e.c):'—'}</td><td style="text-align:right;color:#dc2626">${e.p?fmtMoney(e.p):'—'}</td><td></td></tr>`;}).join('');
    return`<div class="sec" style="background:${bg}">${label}</div>
    <table>${thFiscal}<tbody>${rows}</tbody><tfoot><tr><td>TOTAL ${label.toUpperCase()}</td><td style="text-align:right;color:#16a34a">${fmtMoney(tC)}</td><td style="text-align:right;color:#dc2626">${fmtMoney(tP)}</td><td></td></tr></tfoot></table>`;
  };
  const grandC=allKeys.reduce((s,n)=>s+(mapCob[n]||0),0);
  const grandP=allKeys.reduce((s,n)=>s+(mapPag[n]||0),0);
  return buildFiscal(grpF)+
    buildInfo(grpFee,'Fee administrativo y otros','#64748b')+
    buildInfo(grpAnt,'Anticipos descontados','#d97706')+
    `<div class="grand"><span>TOTAL GENERAL DE DESCUENTOS</span><span style="display:flex;gap:20px"><span style="color:#4ade80">Cobros: ${fmtMoney(grandC)}</span><span style="color:#fca5a5">Pagos: ${fmtMoney(grandP)}</span></span></div>`;
}

function toggleLiqVendDet(id){
  const det=document.getElementById('llv-det-'+id);
  const icon=document.getElementById('llv-icon-'+id);
  if(!det)return;
  const open=det.style.display==='none';
  det.style.display=open?'':'none';
  if(icon)icon.className=open?'ti ti-chevron-down':'ti ti-chevron-right';
}

let liqDescuentosActivos=[];
function abrirModalLiquidacion(){
  liqDescuentosActivos=[];
  document.getElementById('liq-vendedor').value='';
  document.getElementById('liq-iva-switch').checked=false;
  document.getElementById('liq-iva-pct').value=15;
  document.getElementById('liq-iva-row').style.display='none';
  document.getElementById('liq-comisiones-body').innerHTML='';
  document.getElementById('liq-descuentos-lista').innerHTML='';
  document.getElementById('liq-resumen').innerHTML='';
  document.getElementById('liq-error').style.display='none';
  const cuotasWrap=document.getElementById('liq-cuotas-wrap');
  if(cuotasWrap)cuotasWrap.innerHTML='';
  const sel=document.getElementById('liq-desc-select');
  if(sel)sel.innerHTML='<option value="">Seleccionar descuento...</option>'+descPagos.map(d=>`<option>${d.nombre}</option>`).join('');
  abrirOverlay('overlay-liquidacion');
}
function toggleIvaLiq(){
  const on=document.getElementById('liq-iva-switch').checked;
  document.getElementById('liq-iva-row').style.display=on?'flex':'none';
  document.querySelectorAll('.liq-iva-check').forEach(cb=>cb.checked=on);
  recalcularLiquidacion();
}

function cargarComisionesParaLiquidar(){
  const vend=document.getElementById('liq-vendedor').value;
  const tbody=document.getElementById('liq-comisiones-body');
  renderCuotasPendientesEnModal('pago', vend, 'liq-cuotas-wrap', 'liq-cuota-check', 'recalcularLiquidacion');
  if(!vend){tbody.innerHTML='';document.getElementById('liq-resumen').innerHTML='';return;}
  const pendientes=comisiones.filter(cm=>{
    if(cm.vendedor!==vend||cm.pagado)return false;
    // Excluir comisiones cuya póliza ya fue eliminada
    const p=polizas.find(x=>x.id===cm.polizaId);
    if(!p)return false;
    // Excluir pólizas cuyo pago al vendedor es mensual: esas se liquidan por cuotas
    if(p.formaPagoVend==='mensual')return false;
    return true;
  });
  if(!pendientes.length){
    tbody.innerHTML='<tr><td colspan="9"><div class="empty-state" style="padding:1rem">No hay comisiones anuales facturadas pendientes. Puedes liquidar solo cuotas mensuales.</div></td></tr>';
    liqDescuentosActivos=[];
    const anticipos=movPagos.filter(m=>m.vendedor===vend&&m.tipo==='Anticipo'&&!m.aplicado);
    if(anticipos.length){
      anticipos.forEach(a=>{liqDescuentosActivos.push({id:'ant_'+a.id,nombre:'Anticipo ('+fd(a.fecha)+')',tipo:'monto',base:'total',valor:parseFloat(a.monto)||0,editable:true});});
      renderDescuentosLiq();
    }
    recalcularLiquidacion();
    return;
  }
  const ivaPct=parseFloat(document.getElementById('liq-iva-pct').value)||15;
  tbody.innerHTML=pendientes.map(cm=>{
    const p=polizas.find(x=>x.id===cm.polizaId);
    // Refresco automático: recalcular comisión bróker con % actual según tipo de contrato
    const pctAsegActual=_pctAsegActualizado(cm);
    const comBrokerActual=Math.round((cm.primaNeta||0)*pctAsegActual)/100;
    // Refresco automático: % vendedor de configuración actual
    const pctVendActual=_pctVendActualizado(cm);
    const comVendActual=Math.round(comBrokerActual*pctVendActual)/100;
    return `<tr>
    <td><input type="checkbox" class="liq-com-check" data-id="${cm.id}" data-monto="${comVendActual}" data-com-broker="${comBrokerActual}" data-pct-aseg="${pctAsegActual}" checked onchange="recalcularLiquidacion()"></td>
    <td>${fd(cm.inicio||cm.fechaCreacion)}</td>
    <td>${cm.cliente}</td>
    <td>${cm.ramo}</td>
    <td style="text-align:center">${_tipoContratoAbbr(p)}</td>
    <td>${cm.aseguradora}</td>
    <td style="text-align:right"><input type="number" step="0.01" min="0" max="100" class="liq-pct-input" data-com-broker="${comBrokerActual}" value="${pctVendActual}" style="width:60px;text-align:right;font-size:12px;border:0.5px solid var(--color-border-secondary);border-radius:4px;padding:2px 4px" onchange="onPctVendChange(this)" oninput="onPctVendChange(this)"></td>
    <td class="liq-com-monto" style="text-align:right">${fmtMoney(comVendActual)}</td>
    <td style="text-align:center"><input type="checkbox" class="liq-iva-check" data-monto="${comVendActual}" onchange="recalcularLiquidacion()" title="Aplica IVA a esta comisión"></td>
  </tr>`;
  }).join('');
  // Precargar anticipos disponibles para este vendedor
  liqDescuentosActivos=[];
  const anticipos=movPagos.filter(m=>m.vendedor===vend&&m.tipo==='Anticipo'&&!m.aplicado);
  if(anticipos.length){
    anticipos.forEach(a=>{liqDescuentosActivos.push({id:'ant_'+a.id,nombre:'Anticipo ('+fd(a.fecha)+')',tipo:'monto',base:'total',valor:parseFloat(a.monto)||0,editable:true});});
    renderDescuentosLiq();
  }
  recalcularLiquidacion();
}

function onPctVendChange(inp){
  const row=inp.closest('tr');
  const comBroker=parseFloat(inp.dataset.comBroker)||0;
  const pct=parseFloat(inp.value)||0;
  const nuevoMonto=Math.round(comBroker*pct)/100;
  const chk=row.querySelector('.liq-com-check');
  const ivaChk=row.querySelector('.liq-iva-check');
  const monto=row.querySelector('.liq-com-monto');
  if(chk)chk.dataset.monto=nuevoMonto;
  if(ivaChk)ivaChk.dataset.monto=nuevoMonto;
  if(monto)monto.textContent=fmtMoney(nuevoMonto);
  recalcularLiquidacion();
}

// ── CUOTAS MENSUALES en modales de liquidación ─────────────────────────
function renderCuotasPendientesEnModal(tipo, entidad, wrapId, checkClass, recalcFn){
  // tipo: 'pago' (vendedor) | 'cobro' (aseguradora)
  // entidad: nombre del vendedor o aseguradora
  const wrap=document.getElementById(wrapId);
  if(!wrap)return;
  if(!entidad){wrap.innerHTML='';return;}
  const campo=tipo==='pago'?'vendedor':'aseguradora';
  const pend=(cuotasMensuales||[]).filter(c=>c.tipoCuota===tipo && c[campo]===entidad && c.estado==='pendiente')
    .sort((a,b)=>(a.fechaVencimiento||'').localeCompare(b.fechaVencimiento||''));
  if(!pend.length){wrap.innerHTML='';return;}
  const titulo=tipo==='pago'?'Cuotas mensuales pendientes de pago':'Cuotas mensuales pendientes de cobro';
  const hoy=new Date();hoy.setHours(0,0,0,0);
  const filas=pend.map(c=>{
    const venc=new Date(c.fechaVencimiento+'T00:00:00')<hoy;
    return `<tr${venc?' style="background:#fef2f2"':''}>
      <td><input type="checkbox" class="${checkClass}" data-cuota-id="${c.id}" data-monto="${c.monto||0}" onchange="${recalcFn}()"></td>
      <td>${fd(c.fechaVencimiento)}</td>
      <td>${c.numeroCuota}/12</td>
      <td>${c.polizaCliente||'-'}</td>
      <td>${c.polizaNumero||'-'}</td>
      <td>${c.ramo||'-'}</td>
      <td style="text-align:right">${fmtMoney(c.primaNetaMensual)}</td>
      <td style="text-align:right">${c.pctComision||0}%</td>
      <td style="text-align:right;font-weight:600">${fmtMoney(c.monto)}</td>
      <td style="text-align:center">${venc?'<span class="badge badge-red" style="font-size:10px">Vencida</span>':'<span class="badge badge-amber" style="font-size:10px">Pendiente</span>'}</td>
    </tr>`;
  }).join('');
  wrap.innerHTML=`
    <div style="font-size:12px;font-weight:600;color:#1a1a2e;margin-bottom:6px;display:flex;align-items:center;gap:8px">
      <i class="ti ti-calendar-repeat" style="color:${tipo==='cobro'?COLOR_COBROS:'#1a2744'}" aria-hidden="true"></i>
      ${titulo}
      <button class="btn btn-outline btn-sm" style="margin-left:auto;padding:2px 8px;font-size:11px" onclick="marcarTodasCuotasModal('${checkClass}','${recalcFn}',true)"><i class="ti ti-checks" aria-hidden="true"></i> Todas</button>
      <button class="btn btn-outline btn-sm" style="padding:2px 8px;font-size:11px" onclick="marcarTodasCuotasModal('${checkClass}','${recalcFn}',false)"><i class="ti ti-square-off" aria-hidden="true"></i> Ninguna</button>
    </div>
    <div style="max-height:200px;overflow-y:auto;border:1px solid #e2e8f0;border-radius:8px;margin-bottom:10px">
      <table class="pct-table">
        <thead><tr>
          <th style="width:30px"></th><th>Vence</th><th>Cuota</th><th>Cliente</th><th>N° Póliza</th><th>Ramo</th>
          <th style="text-align:right">Prima mens.</th><th style="text-align:right">%</th><th style="text-align:right">Monto</th><th style="text-align:center">Estado</th>
        </tr></thead>
        <tbody>${filas}</tbody>
      </table>
    </div>`;
}

function marcarTodasCuotasModal(checkClass, recalcFn, marcar){
  document.querySelectorAll('.'+checkClass).forEach(cb=>cb.checked=!!marcar);
  if(typeof window[recalcFn]==='function') window[recalcFn]();
}

function calcMontoDescuento(d, subtotal, montoIva, total){
  const base = d.base==='subtotal'?subtotal : d.base==='iva'?montoIva : total;
  return d.tipo==='pct' ? (base*d.valor/100) : (parseFloat(d.valor)||0);
}

function agregarDescuentoLiq(){
  const sel=document.getElementById('liq-desc-select').value;
  if(!sel)return;
  const d=descPagos.find(x=>x.nombre===sel);
  if(!d)return;
  liqDescuentosActivos.push({id:'d_'+Date.now(),nombre:d.nombre,tipo:d.tipo,base:d.base,valor:d.valor,editable:true});
  document.getElementById('liq-desc-select').value='';
  renderDescuentosLiq();
  recalcularLiquidacion();
}

function renderDescuentosLiq(){
  const checks=document.querySelectorAll('.liq-com-check:checked');
  let subtotal=0; checks.forEach(ch=>subtotal+=parseFloat(ch.dataset.monto)||0);
  const ivaPct=parseFloat(document.getElementById('liq-iva-pct').value)||15;
  let montoIva=0;
  document.querySelectorAll('.liq-iva-check').forEach(cb=>{
    const fila=cb.closest('tr');
    if(!fila)return;
    const comCheck=fila.querySelector('.liq-com-check');
    if(comCheck&&comCheck.checked&&cb.checked) montoIva+=parseFloat(cb.dataset.monto||comCheck.dataset.monto||0)*ivaPct/100;
  });
  const total=subtotal+montoIva;

  document.getElementById('liq-descuentos-lista').innerHTML=liqDescuentosActivos.map((d,i)=>{
    const monto=calcMontoDescuento(d,subtotal,montoIva,total);
    return`<div style="display:grid;grid-template-columns:1fr 80px 40px 80px 22px;gap:6px;align-items:center;margin-bottom:6px;font-size:12px">
      <span>${d.nombre} <span style="font-size:10px;color:#64748b">(${d.base})</span></span>
      <input type="number" step="0.01" value="${d.valor}" style="font-size:12px;border:0.5px solid var(--color-border-secondary);border-radius:5px;padding:4px 6px;text-align:right" onchange="liqDescuentosActivos[${i}].valor=parseFloat(this.value)||0;renderDescuentosLiq();recalcularLiquidacion()">
      <span style="color:#64748b;text-align:center">${d.tipo==='pct'?'%':'$'}</span>
      <span style="text-align:right;color:#dc2626;font-weight:600">-${fmtMoney(monto)}</span>
      <button onclick="liqDescuentosActivos.splice(${i},1);renderDescuentosLiq();recalcularLiquidacion()" style="background:transparent;border:none;color:#dc2626;cursor:pointer;font-size:14px;padding:0">×</button>
    </div>`;
  }).join('');
}

function recalcularLiquidacion(){
  const checks=document.querySelectorAll('.liq-com-check:checked');
  let subtotal=0; checks.forEach(ch=>subtotal+=parseFloat(ch.dataset.monto)||0);
  // Sumar cuotas mensuales seleccionadas
  const cuotasChecks=document.querySelectorAll('.liq-cuota-check:checked');
  let subtotalCuotas=0; cuotasChecks.forEach(ch=>subtotalCuotas+=parseFloat(ch.dataset.monto)||0);
  subtotal+=subtotalCuotas;
  const ivaPct=parseFloat(document.getElementById('liq-iva-pct').value)||15;
  let montoIva=0;
  document.querySelectorAll('.liq-iva-check').forEach(cb=>{
    const fila=cb.closest('tr');
    if(!fila)return;
    const comCheck=fila.querySelector('.liq-com-check');
    if(comCheck&&comCheck.checked&&cb.checked) montoIva+=parseFloat(cb.dataset.monto||comCheck.dataset.monto||0)*ivaPct/100;
  });
  const ivaOn=montoIva>0;
  const hayIvaFila=document.querySelectorAll('.liq-iva-check:checked').length>0;
  const switchOn=document.getElementById('liq-iva-switch').checked;
  document.getElementById('liq-iva-row').style.display=(hayIvaFila||switchOn)?'flex':'none';
  const total=subtotal+montoIva;
  let totalDescuentos=0;
  liqDescuentosActivos.forEach(d=>totalDescuentos+=calcMontoDescuento(d,subtotal,montoIva,total));
  const neto=total-totalDescuentos;
  renderDescuentosLiq();
  document.getElementById('liq-resumen').innerHTML=`
    <div style="display:flex;justify-content:space-between;padding:4px 0;border-bottom:0.5px solid var(--color-border-tertiary)"><span>Subtotal comisiones anuales</span><strong>${fmtMoney(subtotal-subtotalCuotas)}</strong></div>
    ${subtotalCuotas>0?`<div style="display:flex;justify-content:space-between;padding:4px 0;border-bottom:0.5px solid var(--color-border-tertiary)"><span>Subtotal cuotas mensuales (${cuotasChecks.length})</span><strong>${fmtMoney(subtotalCuotas)}</strong></div>`:''}
    <div style="display:flex;justify-content:space-between;padding:4px 0;border-bottom:0.5px solid var(--color-border-tertiary)"><span>Subtotal</span><strong>${fmtMoney(subtotal)}</strong></div>
    ${ivaOn?`<div style="display:flex;justify-content:space-between;padding:4px 0;border-bottom:0.5px solid var(--color-border-tertiary)"><span>IVA (${ivaPct}%)</span><strong>${fmtMoney(montoIva)}</strong></div>`:''}
    <div style="display:flex;justify-content:space-between;padding:4px 0;border-bottom:0.5px solid var(--color-border-tertiary);background:var(--color-background-secondary)"><span>Total</span><strong>${fmtMoney(total)}</strong></div>
    <div style="display:flex;justify-content:space-between;padding:4px 0;border-bottom:0.5px solid var(--color-border-tertiary);color:#dc2626"><span>Total descuentos</span><strong>-${fmtMoney(totalDescuentos)}</strong></div>
    <div style="display:flex;justify-content:space-between;padding:6px 8px;background:#1a2744;color:#fff;border-radius:4px;margin-top:4px"><span style="font-weight:500">Total comisiones a pagar</span><strong style="font-size:15px">${fmtMoney(neto)}</strong></div>`;
}

async function guardarLiquidacion(){
  const vendedor=document.getElementById('liq-vendedor').value;
  const err=document.getElementById('liq-error');
  if(!vendedor){err.textContent='Selecciona un vendedor';err.style.display='block';return;}
  const checks=document.querySelectorAll('.liq-com-check:checked');
  const cuotasChecks=document.querySelectorAll('.liq-cuota-check:checked');
  if(!checks.length && !cuotasChecks.length){err.textContent='Selecciona al menos una comisión anual o cuota mensual';err.style.display='block';return;}
  const ivaPct=parseFloat(document.getElementById('liq-iva-pct').value)||15;
  let subtotal=0; const comisionIds=[]; const detalle=[];
  checks.forEach(ch=>{
    const montoUsado=parseFloat(ch.dataset.monto)||0;
    subtotal+=montoUsado; comisionIds.push(ch.dataset.id);
    const cm=comisiones.find(x=>x.id===ch.dataset.id);
    if(cm){
      const row=ch.closest('tr');
      const pctInp=row?row.querySelector('.liq-pct-input'):null;
      const pctVendUsado=pctInp?parseFloat(pctInp.value)||0:cm.pctVendedor;
      const p=polizas.find(x=>x.id===cm.polizaId);
      detalle.push({inicio:cm.inicio||'',cliente:cm.cliente,aseguradora:cm.aseguradora,ramo:cm.ramo,tipoContrato:(p&&p.tipoContrato)||'nuevo',primaNeta:cm.primaNeta,pctVendedor:pctVendUsado,comision:montoUsado,tipoFuente:'anual'});
    }
  });
  // Detalle de cuotas mensuales seleccionadas
  const cuotaIds=[];
  cuotasChecks.forEach(ch=>{
    const cuotaId=ch.dataset.cuotaId;
    const monto=parseFloat(ch.dataset.monto)||0;
    subtotal+=monto; cuotaIds.push(cuotaId);
    const cu=(cuotasMensuales||[]).find(x=>x.id===cuotaId);
    if(cu){
      detalle.push({inicio:cu.fechaVencimiento||'',cliente:cu.polizaCliente||'',aseguradora:cu.aseguradora,ramo:cu.ramo,tipoContrato:'',primaNeta:cu.primaNetaMensual,pctVendedor:cu.pctComision,comision:monto,tipoFuente:'cuota',numeroCuota:cu.numeroCuota,cuotaId:cuotaId});
    }
  });
  let montoIva=0;
  document.querySelectorAll('.liq-iva-check').forEach(cb=>{
    const fila=cb.closest('tr');
    if(!fila)return;
    const comCheck=fila.querySelector('.liq-com-check');
    if(comCheck&&comCheck.checked&&cb.checked) montoIva+=parseFloat(cb.dataset.monto||comCheck.dataset.monto||0)*ivaPct/100;
  });
  const ivaOn=montoIva>0;
  const total=subtotal+montoIva;
  let totalDescuentos=0;
  const descuentosAplicados=liqDescuentosActivos.map(d=>{
    const monto=calcMontoDescuento(d,subtotal,montoIva,total);
    totalDescuentos+=monto;
    return{nombre:d.nombre,tipo:d.tipo,base:d.base,valor:d.valor,monto:Math.round(monto*100)/100};
  });
  const data={vendedor,comisionIds,cuotaIds,detalle,subtotal:Math.round(subtotal*100)/100,ivaOn,ivaPct,montoIva:Math.round(montoIva*100)/100,total:Math.round(total*100)/100,descuentosAplicados,totalDescuentos:Math.round(totalDescuentos*100)/100,totalNeto:Math.round((total-totalDescuentos)*100)/100};
  try{
    const nv=await apiPost('liquidaciones',data);
    liquidaciones.unshift(nv);
    // Marcar cuotas seleccionadas como liquidadas
    if(cuotaIds.length){
      for(const cid of cuotaIds){
        const cu=(cuotasMensuales||[]).find(x=>x.id===cid);
        if(!cu)continue;
        const upd={...cu,estado:'liquidada',fechaLiquidada:new Date().toISOString(),liquidacionId:nv.id};
        delete upd.id; delete upd._id;
        try{
          const act=await apiPut('cuotas-mensuales',cid,upd);
          const i=cuotasMensuales.findIndex(x=>x.id===cid);
          if(i>=0)cuotasMensuales[i]=act;
        }catch(e){console.error('Error marcando cuota',cid,e);}
      }
    }
    await cargarComisiones();
    cerrarModal('overlay-liquidacion');renderComisiones();
    mostrarToast('Liquidación generada'+(cuotaIds.length?` (${cuotaIds.length} cuota${cuotaIds.length>1?'s':''} liquidada${cuotaIds.length>1?'s':''})`:''));
  }
  catch(e){err.textContent='Error al generar';err.style.display='block';}
}
async function eliminarLiquidacion(id){
  if(!confirm('¿Eliminar esta liquidación? Las cuotas mensuales vinculadas volverán a estado pendiente.'))return;
  try{
    // Revertir cuotas vinculadas a esta liquidación
    const cuotasVinc=(cuotasMensuales||[]).filter(c=>c.liquidacionId===id);
    for(const cu of cuotasVinc){
      const upd={...cu,estado:'pendiente',fechaLiquidada:null,liquidacionId:null};
      delete upd.id; delete upd._id;
      try{
        const act=await apiPut('cuotas-mensuales',cu.id,upd);
        const i=cuotasMensuales.findIndex(x=>x.id===cu.id);
        if(i>=0)cuotasMensuales[i]=act;
      }catch(e){console.error('Error revirtiendo cuota',cu.id,e);}
    }
    await apiDel('liquidaciones',id);
    liquidaciones=liquidaciones.filter(x=>x.id!==id);
    await cargarComisiones();
    renderComisiones();
    mostrarToast('Liquidación eliminada'+(cuotasVinc.length?` (${cuotasVinc.length} cuota${cuotasVinc.length>1?'s':''} revertida${cuotasVinc.length>1?'s':''})`:''));
  }catch(e){mostrarToast('Error al eliminar');}
}

// ── PDF/CSV LIQUIDACIÓN VENDEDOR ──────────────────────────────────────
const LEGAL_TEXT='Este fichero contiene datos personales de clientes de Aseguradoras, y tiene el carácter de confidencial. Es información compartida con usted en virtud de la relación comercial como Agente de Seguros, con este Broker. La finalidad del tratamiento de los datos compartidos es únicamente la de atender al cliente en la contratación del producto y/o servicio solicitado. No seremos responsable del tratamiento inadecuado que usted pueda otorgar a los datos personales aquí compartidos.';

function descargarLiquidacionCSV(id){
  const liq=liquidaciones.find(x=>x.id===id);
  const fecha=new Date(liq.fecha).toLocaleDateString('es-EC');
  const h=['Fecha inicio','Cliente','Aseguradora','Ramo','Prima Neta','Comisión Vendedor'];
  const rows=(liq.detalle||[]).map(d=>[fd(d.inicio),d.cliente,d.aseguradora,d.ramo,d.primaNeta,d.comision]);
  let csv=`LIQUIDACION DE COMISIONES - REYNA SEGUROS GESTION\nVendedor:,${liq.vendedor}\nFecha:,${fecha}\n\n`;
  csv+=[h,...rows].map(r=>r.map(x=>`"${String(x).replace(/"/g,'""')}"`).join(',')).join('\n');
  csv+=`\n\nSubtotal:,${liq.subtotal}\n${liq.ivaOn?`IVA (${liq.ivaPct}%):,${liq.montoIva}\n`:''}Total:,${liq.total}\n`;
  (liq.descuentosAplicados||[]).forEach(d=>csv+=`${d.nombre} (${d.base}):,-${d.monto}\n`);
  csv+=`TOTAL COMISIONES A PAGAR:,${liq.totalNeto}\n\n${LEGAL_TEXT}\n\n${FOOTER_TEXT}`;
  const blob=new Blob(['\uFEFF'+csv],{type:'text/csv;charset=utf-8'});
  const a=document.createElement('a');a.href=URL.createObjectURL(blob);
  a.download=`liquidacion_${liq.vendedor.replace(/\s+/g,'_')}_${fecha.replace(/\//g,'-')}.csv`;a.click();
}

function descargarLiquidacionPDF(id){
  const liq=liquidaciones.find(x=>x.id===id);
  const fecha=new Date(liq.fecha).toLocaleDateString('es-EC');
  const logoB64=document.querySelector('#login-screen .login-logo img').src;
  const filas=(liq.detalle||[]).map(d=>`<tr><td>${fd(d.inicio)}</td><td>${d.cliente}</td><td>${d.aseguradora}</td><td>${d.ramo}</td><td style="text-align:right">${fmtMoney(d.primaNeta)}</td><td style="text-align:right;font-weight:600;color:#15803d">${fmtMoney(d.comision)}</td></tr>`).join('');
  const descRows=(liq.descuentosAplicados||[]).map(d=>`<tr><td>${d.nombre}</td><td>${d.base}</td><td>${d.tipo==='pct'?d.valor+'%':'$'+d.valor}</td><td style="text-align:right;color:#dc2626">-${fmtMoney(d.monto)}</td></tr>`).join('');
  const totalDescRow=(liq.descuentosAplicados||[]).length?`<tfoot><tr style="background:#e8ecf4;font-weight:700"><td colspan="3">Total descuentos</td><td style="text-align:right;color:#dc2626">-${fmtMoney(liq.totalDescuentos||0)}</td></tr></tfoot>`:'';
  const html=`<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"><title>Liquidacion_${liq.vendedor}_${fecha.replace(/\//g,'-')}</title><style>*{box-sizing:border-box;margin:0;padding:0}body{font-family:Arial,sans-serif;font-size:12px;color:#1a1a2e;padding:2rem}.header{display:flex;align-items:center;gap:16px;border-bottom:2px solid #1a2744;padding-bottom:12px;margin-bottom:16px}.logo{width:50px;height:50px;border-radius:8px;overflow:hidden;flex-shrink:0}.logo img{width:100%;height:100%;object-fit:cover}.brand-name{font-size:14px;font-weight:700;color:#1a2744}.brand-sub{font-size:10px;color:#64748b}.rep-title{text-align:right;font-size:14px;font-weight:700;color:#1a2744}.rep-meta{font-size:10px;color:#64748b}.info{display:grid;grid-template-columns:1fr 1fr;gap:4px;margin-bottom:14px;font-size:11px}.info-row{display:flex;gap:6px}.info-lbl{color:#64748b;min-width:70px}.info-val{font-weight:600}.section{font-size:10px;font-weight:700;letter-spacing:0.07em;color:#fff;background:#1a2744;padding:4px 8px;border-radius:3px;margin:12px 0 6px;text-transform:uppercase}table{width:100%;border-collapse:collapse;font-size:11px;margin-bottom:12px}th{text-align:left;padding:5px 7px;background:#e8ecf4;color:#1a2744;font-size:9px;font-weight:700;text-transform:uppercase}th:last-child{text-align:right}td{padding:5px 7px;border-bottom:0.5px solid #e2e8f0}td:last-child{text-align:right}tfoot td{padding:5px 7px}.totales{margin-left:auto;width:260px}.tot{display:flex;justify-content:space-between;padding:4px 8px;border-bottom:0.5px solid #e2e8f0;font-size:11px}.tot.sub{background:#e8ecf4;font-weight:700;color:#1a2744}.tot.tot-total{background:#1a2744;color:#fff;font-weight:700}.pago{background:#1a2744;color:#fff;border-radius:5px;padding:8px 12px;display:flex;justify-content:space-between;margin:12px 0;font-weight:700}.pago-val{font-size:15px}.legal{border-top:0.5px solid #e2e8f0;padding-top:8px;font-size:9px;color:#64748b;line-height:1.5;font-style:italic;margin-top:12px}.footer{text-align:center;font-size:9px;color:#94a3b8;margin-top:8px}</style></head><body>
  <div class="header"><div class="logo"><img src="${logoB64}" alt="Reyna Seguros"></div><div style="flex:1"><div class="brand-name">Reyna Seguros Gestión</div><div class="brand-sub">Asesoría experta y protección a tu medida</div></div><div><div class="rep-title">Liquidación de comisiones</div><div class="rep-meta">Fecha: ${fecha}</div></div></div>
  <div class="info"><div class="info-row"><span class="info-lbl">Vendedor:</span><span class="info-val">${liq.vendedor}</span></div><div class="info-row"><span class="info-lbl">N° pólizas:</span><span class="info-val">${(liq.detalle||[]).length}</span></div></div>
  <div class="section">Detalle de comisiones</div>
  <table><thead><tr><th>Fecha inicio</th><th>Cliente</th><th>Aseguradora</th><th>Ramo</th><th style="text-align:right">Prima Neta</th><th style="text-align:right">Comisión</th></tr></thead><tbody>${filas}</tbody></table>
  <div class="totales"><div class="tot sub"><span>Subtotal</span><span>${fmtMoney(liq.subtotal)}</span></div>${liq.ivaOn?`<div class="tot"><span>IVA (${liq.ivaPct}%)</span><span>${fmtMoney(liq.montoIva)}</span></div>`:''}<div class="tot tot-total"><span>Total</span><span>${fmtMoney(liq.total)}</span></div></div>
  ${descRows?`<div class="section">Descuentos aplicados</div><table><thead><tr><th>Concepto</th><th>Base</th><th>Valor/%</th><th style="text-align:right">Monto</th></tr></thead><tbody>${descRows}</tbody>${totalDescRow}</table>`:''}
  <div class="pago"><span>Total comisiones a pagar</span><span class="pago-val">${fmtMoney(liq.totalNeto)}</span></div>
  <div class="legal">${LEGAL_TEXT}</div><div class="footer">${FOOTER_TEXT}</div>
  </body></html>`;
  const w=window.open('','_blank');w.document.write(html);w.document.close();w.print();
}

// ── LIQUIDACIONES POR COBRAR (aseguradoras) — movidas aquí desde Contabilidad ──
let liqCobDescActivos=[];

function renderLiqCobros(c){
  const canDel=puedeEliminar();
  const aO=[...aseguradoras].sort((a,b)=>a.nombre.localeCompare(b.nombre));
  // Cards resumen (mismos conceptos que balance)
  const facturado=liqCobros.reduce((s,l)=>s+(l.total||l.totalNeto||0),0);
  const liquidado=liqCobros.reduce((s,l)=>s+(l.totalNeto||0),0);
  const retenciones=liqCobros.reduce((s,l)=>s+((l.descuentosAplicados||[]).filter(d=>!/^anticipo/i.test(d.nombre||'')).reduce((ss,d)=>ss+(parseFloat(d.monto)||0),0)),0);
  const cobrado=movCobros.reduce((s,m)=>s+(parseFloat(m.monto)||0),0);
  const pendCobro=facturado-retenciones-cobrado;
  c.innerHTML=`
  <div class="stats-row" style="margin-bottom:1rem">
    <div class="stat"><div class="stat-label">Facturado</div><div class="stat-value blue">${fmtMoney(facturado)}</div></div>
    <div class="stat"><div class="stat-label">Liquidado</div><div class="stat-value blue">${fmtMoney(liquidado)}</div></div>
    <div class="stat"><div class="stat-label">Retenciones</div><div class="stat-value red">-${fmtMoney(retenciones)}</div></div>
    <div class="stat"><div class="stat-label">Cobrado</div><div class="stat-value green">${fmtMoney(cobrado)}</div></div>
    <div class="stat"><div class="stat-label">Pendiente de cobro</div><div class="stat-value ${pendCobro>0?'red':'green'}">${fmtMoney(pendCobro)}</div></div>
  </div>
  <div style="display:flex;flex-wrap:wrap;gap:8px;margin-bottom:10px;align-items:flex-end">
    <select id="lla-faseg" onchange="filtrarTablaLiqAseg()" style="font-size:12px;border:1px solid #e2e8f0;border-radius:6px;padding:5px 8px;background:#f8fafc;outline:none">
      <option value="">Todas las aseguradoras</option>${aO.map(a=>`<option>${a.nombre}</option>`).join('')}
    </select>
    <select id="lla-fperiodo" onchange="onPeriodoLiqAseg()" style="font-size:12px;border:1px solid #e2e8f0;border-radius:6px;padding:5px 8px;background:#f8fafc;outline:none">
      <option value="todo">Todo el tiempo</option>
      <option value="semana">Esta semana</option>
      <option value="mes">Este mes</option>
      <option value="trimestre">Este trimestre</option>
      <option value="semestre">Este semestre</option>
      <option value="anio">Este año</option>
      <option value="custom">Fechas específicas</option>
    </select>
    <select id="lla-festado" onchange="filtrarTablaLiqAseg()" style="font-size:12px;border:1px solid #e2e8f0;border-radius:6px;padding:5px 8px;background:#f8fafc;outline:none">
      <option value="">Todos los estados</option>
      <option value="emitida">Emitida</option>
      <option value="cobrada">Cobrada</option>
    </select>
    <div id="lla-custom" style="display:none;gap:6px;align-items:flex-end;flex-wrap:wrap">
      <div><div style="font-size:10px;font-weight:600;color:#64748b;margin-bottom:3px">Desde</div><input type="date" id="lla-fi" onchange="filtrarTablaLiqAseg()" style="font-size:12px;border:1px solid #e2e8f0;border-radius:6px;padding:5px 8px;background:#f8fafc;outline:none"></div>
      <div><div style="font-size:10px;font-weight:600;color:#64748b;margin-bottom:3px">Hasta</div><input type="date" id="lla-ff" onchange="filtrarTablaLiqAseg()" style="font-size:12px;border:1px solid #e2e8f0;border-radius:6px;padding:5px 8px;background:#f8fafc;outline:none"></div>
    </div>
    <button class="btn btn-outline btn-sm" onclick="exportarTodasLiqAsegCSV()"><i class="ti ti-download" aria-hidden="true"></i> CSV</button>
    <button class="btn btn-outline btn-sm" onclick="exportarTodasLiqAsegPDF()"><i class="ti ti-file-text" aria-hidden="true"></i> PDF</button>
    <button class="btn btn-primary btn-sm" style="margin-left:auto" onclick="abrirModalLiqCobro()"><i class="ti ti-plus" aria-hidden="true"></i> Nueva liquidación por cobrar</button>
  </div>
  <div class="table-wrap"><div class="table-scroll">
    <table id="lla-tabla">
      <thead><tr>
        <th style="width:28px"></th>
        <th>Fecha</th><th>Aseguradora</th>
        <th style="text-align:right">Subtotal</th><th style="text-align:right">IVA</th>
        <th style="text-align:right">Total</th><th style="text-align:right">Descuentos</th>
        <th style="text-align:right">A cobrar</th><th>Estado</th><th>Acciones</th>
      </tr></thead>
      <tbody id="lla-tbody"></tbody>
      <tfoot id="lla-tfoot"></tfoot>
    </table>
  </div></div>

  <!-- Tabla descuentos por tipo — solo cobros aseguradoras -->
  <div class="actions-panel" style="margin-top:1rem;border:1.5px solid #D97757">
    <div class="actions-panel-title" style="background:#D97757;color:#fff;border-radius:4px 4px 0 0;margin:-1px -1px 0 -1px;padding:8px 12px">
      <i class="ti ti-receipt-tax" style="font-size:13px" aria-hidden="true"></i> Detalle de descuentos por tipo
    </div>
    <div id="lla-descuentos-content" style="padding:8px 0"></div>
  </div>`;
  filtrarTablaLiqAseg();
  renderLiqAsegDescuentos();
}
function onPeriodoLiqAseg(){
  const p=(document.getElementById('lla-fperiodo')||{}).value;
  const div=document.getElementById('lla-custom');
  if(div) div.style.display=p==='custom'?'flex':'none';
  filtrarTablaLiqAseg();
}
function filtrarTablaLiqAseg(){
  const fA=(document.getElementById('lla-faseg')||{}).value||'';
  const fE=(document.getElementById('lla-festado')||{}).value||'';
  const p=(document.getElementById('lla-fperiodo')||{}).value||'todo';
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
    const vi=(document.getElementById('lla-fi')||{}).value;
    const vf=(document.getElementById('lla-ff')||{}).value;
    if(vi) ini=new Date(vi+'T00:00:00');
    if(vf) fin=new Date(vf+'T23:59:59');
  }
  const lista=liqCobros.filter(l=>{
    if(fA&&l.aseguradora!==fA) return false;
    if(fE&&(l.estatus||'emitida')!==fE) return false;
    if(ini||fin){const d=new Date(l.fecha);if(ini&&d<ini)return false;if(fin&&d>fin)return false;}
    return true;
  });
  const canDel=puedeEliminar();
  const tbody=document.getElementById('lla-tbody');
  const tfoot=document.getElementById('lla-tfoot');
  if(!tbody)return;
  if(!lista.length){tbody.innerHTML='<tr><td colspan="10"><div class="empty-state"><i class="ti ti-receipt"></i>No hay liquidaciones por cobrar.</div></td></tr>';if(tfoot)tfoot.innerHTML='';return;}
  let tSub=0,tIva=0,tTot=0,tDesc=0,tNeto=0;
  tbody.innerHTML=lista.map(liq=>{
    const fecha=new Date(liq.fecha).toLocaleDateString('es-EC');
    const cobrosLiq=movCobros.filter(m=>m.liquidacionCobroId===liq.id).reduce((s,m)=>s+(parseFloat(m.monto)||0),0);
    const est=liq.estatus||'emitida';
    const estBadge=est==='cobrada'?'badge-green':'badge-amber';
    const descSub=(liq.descuentosAplicados&&liq.descuentosAplicados.length)?
      liq.descuentosAplicados.map(d=>`<div style="display:flex;justify-content:space-between;font-size:11px;padding:2px 0;border-bottom:0.5px solid #f1f5f9"><span style="color:#64748b">${d.nombre}</span><span style="color:#dc2626">-${fmtMoney(d.monto)}</span></div>`).join('')+
      `<div style="display:flex;justify-content:space-between;font-size:11px;padding:3px 0;font-weight:700"><span>Total descuentos</span><span style="color:#dc2626">-${fmtMoney(liq.totalDescuentos||0)}</span></div>`
      :'<span style="font-size:11px;color:#94a3b8">Sin descuentos</span>';
    const polizasDet=(liq.detalle||[]).map(p=>`<tr style="background:#fafafa"><td style="padding:4px 8px;font-size:11px">${fd(p.inicio||'')}</td><td style="padding:4px 8px;font-size:11px">${p.cliente||'—'}</td><td style="padding:4px 8px;font-size:11px">${p.ramo||'—'}</td><td style="padding:4px 8px;font-size:11px">${p.numero||'—'}</td><td style="padding:4px 8px;text-align:right;font-size:11px">${fmtMoney(p.primaNeta||0)}</td><td style="padding:4px 8px;text-align:right;font-size:11px">${p.pct||0}%</td><td style="padding:4px 8px;text-align:right;font-size:11px">${fmtMoney(p.comision||0)}</td></tr>`).join('');
    const sub=liq.subtotal||0;const iva=liq.montoIva||0;const tot=liq.total||0;const desc=liq.totalDescuentos||0;const neto=liq.totalNeto||0;
    tSub+=sub;tIva+=iva;tTot+=tot;tDesc+=desc;tNeto+=neto;
    return`<tr id="lla-row-${liq.id}">
      <td><button onclick="toggleLiqAsegDet('${liq.id}')" style="background:none;border:none;cursor:pointer;font-size:14px;padding:0 4px" title="Ver pólizas"><i class="ti ti-chevron-right" id="lla-icon-${liq.id}"></i></button></td>
      <td>${fecha}</td><td>${liq.aseguradora}</td>
      <td style="text-align:right">${fmtMoney(sub)}</td>
      <td style="text-align:right">${iva?fmtMoney(iva):'—'}</td>
      <td style="text-align:right">${fmtMoney(tot)}</td>
      <td style="text-align:right;color:#dc2626">${desc?'-'+fmtMoney(desc):'—'}</td>
      <td style="text-align:right;font-weight:600;color:#D97757">${fmtMoney(neto)}</td>
      <td><span class="badge ${estBadge}">${est}</span></td>
      <td><div style="display:flex;gap:4px">
        <button class="btn-icon" onclick="descargarLiqCobroCSV('${liq.id}')" title="CSV"><i class="ti ti-table"></i></button>
        <button class="btn-icon" onclick="descargarLiqCobroPDF('${liq.id}')" title="PDF"><i class="ti ti-file-text"></i></button>
        ${canDel?`<button class="btn-icon danger" onclick="eliminarLiqCobro('${liq.id}')" title="Eliminar"><i class="ti ti-trash"></i></button>`:''}
      </div></td>
    </tr>
    <tr id="lla-det-${liq.id}" style="display:none">
      <td colspan="10" style="padding:0 8px 10px 32px;background:#f8fafc">
        <div style="font-size:11px;font-weight:600;color:#64748b;text-transform:uppercase;margin:6px 0 4px">Pólizas incluidas</div>
        ${polizasDet?`<table style="width:100%;border-collapse:collapse;font-size:11px;margin-bottom:8px"><thead><tr style="background:#e8ecf4"><th style="padding:4px 8px;text-align:left">Fecha</th><th style="padding:4px 8px;text-align:left">Cliente</th><th style="padding:4px 8px;text-align:left">Ramo</th><th style="padding:4px 8px;text-align:left">N° Póliza</th><th style="padding:4px 8px;text-align:right">Prima Neta</th><th style="padding:4px 8px;text-align:right">%</th><th style="padding:4px 8px;text-align:right">Comisión</th></tr></thead><tbody>${polizasDet}</tbody></table>`:'<div style="font-size:11px;color:#94a3b8;margin-bottom:6px">Sin detalle de pólizas.</div>'}
        <div style="font-size:11px;font-weight:600;color:#64748b;text-transform:uppercase;margin:4px 0">${liq.descuentosAplicados&&liq.descuentosAplicados.length?'Descuentos aplicados':''}</div>
        <div style="max-width:360px">${descSub}</div>
      </td>
    </tr>`;
  }).join('');
  if(tfoot)tfoot.innerHTML=`<tr style="background:#f1f5f9;font-weight:700"><td></td><td colspan="2">TOTAL (${lista.length})</td><td style="text-align:right">${fmtMoney(tSub)}</td><td style="text-align:right">${tIva?fmtMoney(tIva):'—'}</td><td style="text-align:right">${fmtMoney(tTot)}</td><td style="text-align:right;color:#dc2626">${tDesc?'-'+fmtMoney(tDesc):'—'}</td><td style="text-align:right;color:#D97757">${fmtMoney(tNeto)}</td><td colspan="2"></td></tr>`;
}
function toggleLiqAsegDet(id){
  const det=document.getElementById('lla-det-'+id);
  const icon=document.getElementById('lla-icon-'+id);
  if(!det)return;
  const open=det.style.display==='none';
  det.style.display=open?'':'none';
  if(icon)icon.className=open?'ti ti-chevron-down':'ti ti-chevron-right';
}

function abrirModalLiqCobro(){
  liqCobDescActivos=[];
  document.getElementById('liqcob-aseguradora').value='';
  document.getElementById('liqcob-iva-switch').checked=false;
  document.getElementById('liqcob-iva-row').style.display='none';
  document.getElementById('liqcob-iva-pct').value=15;
  document.getElementById('liqcob-comisiones-body').innerHTML='';
  document.getElementById('liqcob-descuentos-lista').innerHTML='';
  document.getElementById('liqcob-resumen').innerHTML='';
  document.getElementById('liqcob-error').style.display='none';
  const cuotasWrap=document.getElementById('liqcob-cuotas-wrap');
  if(cuotasWrap)cuotasWrap.innerHTML='';
  const sel=document.getElementById('liqcob-desc-select');
  if(sel)sel.innerHTML='<option value="">Seleccionar descuento...</option>'+descCobros.map(d=>`<option>${d.nombre}</option>`).join('');
  abrirOverlay('overlay-liqcobro');
}
function toggleIvaLiqCob(){
  const on=document.getElementById('liqcob-iva-switch').checked;
  document.getElementById('liqcob-iva-row').style.display=on?'flex':'none';
  // Marcar/desmarcar todos los checkboxes de IVA por fila
  document.querySelectorAll('.liqcob-iva-check').forEach(cb=>cb.checked=on);
  recalcularLiqCobro();
}

// Helpers Tipo de contrato y % actualizado
function _tipoContratoAbbr(p){
  const tc=(p&&p.tipoContrato)||'nuevo';
  const abbr={nuevo:'N',renovacion:'R',agenciamiento:'A'}[tc]||'N';
  const color={nuevo:'#16a34a',renovacion:'#2563eb',agenciamiento:'#7c3aed'}[tc]||'#64748b';
  const label={nuevo:'Nuevo',renovacion:'Renovación',agenciamiento:'Agenciamiento'}[tc]||'Nuevo';
  return `<span title="${label}" style="display:inline-block;min-width:22px;padding:2px 6px;border-radius:4px;background:${color};color:#fff;font-size:11px;font-weight:600;text-align:center">${abbr}</span>`;
}
function _pctAsegActualizado(cm){
  // Refresco automático: leer % actual de la aseguradora según tipo de contrato de la póliza
  const p=polizas.find(x=>x.id===cm.polizaId);
  const tc=(p&&p.tipoContrato)||'nuevo';
  const a=aseguradoras.find(x=>x.nombre===cm.aseguradora);
  const porTipo=a?.comisionesPorTipo?.[cm.ramo];
  const pct=porTipo?(porTipo[tc]||0):((a?.comisiones?.[cm.ramo])||cm.pctAseguradora||0);
  return pct;
}
function _pctVendActualizado(cm){
  const v=vendedores.find(x=>x.nombre===cm.vendedor);
  return (v?.comisiones?.[cm.ramo])||cm.pctVendedor||0;
}

function cargarComisionesParaCobrar(){
  const aseg=document.getElementById('liqcob-aseguradora').value;
  const tbody=document.getElementById('liqcob-comisiones-body');
  renderCuotasPendientesEnModal('cobro', aseg, 'liqcob-cuotas-wrap', 'liqcob-cuota-check', 'recalcularLiqCobro');
  if(!aseg){tbody.innerHTML='';return;}
  const pendientes=comisiones.filter(cm=>{
    if(cm.aseguradora!==aseg||cm.facturado)return false;
    // Excluir comisiones cuya póliza ya fue eliminada
    const p=polizas.find(x=>x.id===cm.polizaId);
    if(!p)return false;
    // Excluir pólizas cuyo cobro a la aseguradora es mensual: esas se cobran por cuotas
    if(p.formaCobroAseg==='mensual')return false;
    return true;
  });
  if(!pendientes.length){
    tbody.innerHTML='<tr><td colspan="10"><div class="empty-state" style="padding:1rem">No hay comisiones anuales pendientes. Puedes liquidar solo cuotas mensuales.</div></td></tr>';
    recalcularLiqCobro();
    return;
  }
  const ivaOn=document.getElementById('liqcob-iva-switch').checked;
  tbody.innerHTML=pendientes.map(cm=>{
    const p=polizas.find(x=>x.id===cm.polizaId);
    const pctActual=_pctAsegActualizado(cm);
    const comActual=Math.round((cm.primaNeta||0)*pctActual)/100;
    return `<tr>
    <td><input type="checkbox" class="liqcob-com-check" data-id="${cm.id}" data-monto="${comActual}" checked onchange="recalcularLiqCobro()"></td>
    <td>${fd(cm.inicio||cm.fechaCreacion)}</td>
    <td>${cm.cliente}</td>
    <td>${cm.ramo}</td>
    <td style="text-align:center">${_tipoContratoAbbr(p)}</td>
    <td>${cm.numero||'N/A'}</td>
    <td style="text-align:right">${fmtMoney(cm.primaNeta)}</td>
    <td style="text-align:right"><input type="number" step="0.01" min="0" max="100" class="liqcob-pct-input" data-prima="${cm.primaNeta||0}" value="${pctActual}" style="width:60px;text-align:right;font-size:12px;border:0.5px solid var(--color-border-secondary);border-radius:4px;padding:2px 4px" onchange="onPctAsegChange(this)" oninput="onPctAsegChange(this)"></td>
    <td class="liqcob-com-monto" style="text-align:right;font-weight:600">${fmtMoney(comActual)}</td>
    <td style="text-align:center"><input type="checkbox" class="liqcob-iva-check" data-monto="${comActual}" ${ivaOn?'checked':''} onchange="recalcularLiqCobro()" title="Aplica IVA a esta póliza"></td>
  </tr>`;
  }).join('');
  recalcularLiqCobro();
}

function onPctAsegChange(inp){
  const row=inp.closest('tr');
  const prima=parseFloat(inp.dataset.prima)||0;
  const pct=parseFloat(inp.value)||0;
  const nuevoMonto=Math.round(prima*pct)/100;
  const chk=row.querySelector('.liqcob-com-check');
  const ivaChk=row.querySelector('.liqcob-iva-check');
  const monto=row.querySelector('.liqcob-com-monto');
  if(chk)chk.dataset.monto=nuevoMonto;
  if(ivaChk)ivaChk.dataset.monto=nuevoMonto;
  if(monto)monto.textContent=fmtMoney(nuevoMonto);
  recalcularLiqCobro();
}

function agregarDescuentoLiqCob(){
  const sel=document.getElementById('liqcob-desc-select').value;
  if(!sel)return;
  const d=descCobros.find(x=>x.nombre===sel);
  if(!d)return;
  liqCobDescActivos.push({id:'d_'+Date.now(),nombre:d.nombre,tipo:d.tipo,base:d.base,valor:d.valor});
  document.getElementById('liqcob-desc-select').value='';
  renderDescuentosLiqCob();
  recalcularLiqCobro();
}

function renderDescuentosLiqCob(){
  const checks=document.querySelectorAll('.liqcob-com-check:checked');
  let subtotal=0; checks.forEach(ch=>subtotal+=parseFloat(ch.dataset.monto)||0);
  const ivaPct=parseFloat(document.getElementById('liqcob-iva-pct').value)||15;
  // IVA calculado por fila independientemente del switch global
  let montoIva=0;
  document.querySelectorAll('.liqcob-iva-check:checked').forEach(cb=>{
    const row=cb.closest('tr');
    const comCheck=row?row.querySelector('.liqcob-com-check'):null;
    if(comCheck&&comCheck.checked) montoIva+=((parseFloat(cb.dataset.monto)||0)*ivaPct/100);
  });
  const total=subtotal+montoIva;
  document.getElementById('liqcob-descuentos-lista').innerHTML=liqCobDescActivos.map((d,i)=>{
    const monto=calcMontoDescuento(d,subtotal,montoIva,total);
    return`<div style="display:grid;grid-template-columns:1fr 80px 40px 80px 22px;gap:6px;align-items:center;margin-bottom:6px;font-size:12px">
      <span>${d.nombre} <span style="font-size:10px;color:#64748b">(${d.base})</span></span>
      <input type="number" step="0.01" value="${d.valor}" style="font-size:12px;border:0.5px solid var(--color-border-secondary);border-radius:5px;padding:4px 6px;text-align:right" onchange="liqCobDescActivos[${i}].valor=parseFloat(this.value)||0;renderDescuentosLiqCob();recalcularLiqCobro()">
      <span style="color:#64748b;text-align:center">${d.tipo==='pct'?'%':'$'}</span>
      <span style="text-align:right;color:#dc2626;font-weight:600">-${fmtMoney(monto)}</span>
      <button onclick="liqCobDescActivos.splice(${i},1);renderDescuentosLiqCob();recalcularLiqCobro()" style="background:transparent;border:none;color:#dc2626;cursor:pointer;font-size:14px;padding:0">×</button>
    </div>`;
  }).join('');
}

function recalcularLiqCobro(){
  const checks=document.querySelectorAll('.liqcob-com-check:checked');
  let subtotal=0; checks.forEach(ch=>subtotal+=parseFloat(ch.dataset.monto)||0);
  // Sumar cuotas mensuales seleccionadas
  const cuotasChecks=document.querySelectorAll('.liqcob-cuota-check:checked');
  let subtotalCuotas=0; cuotasChecks.forEach(ch=>subtotalCuotas+=parseFloat(ch.dataset.monto)||0);
  subtotal+=subtotalCuotas;
  const ivaGlobal=document.getElementById('liqcob-iva-switch').checked;
  const ivaPct=parseFloat(document.getElementById('liqcob-iva-pct').value)||15;
  const hayIvaFila=document.querySelectorAll('.liqcob-iva-check:checked').length>0;
  const ivaActivo=ivaGlobal||hayIvaFila;
  document.getElementById('liqcob-iva-row').style.display=ivaActivo?'flex':'none';
  let montoIva=0;
  document.querySelectorAll('.liqcob-iva-check:checked').forEach(cb=>{
    const row=cb.closest('tr');
    const comCheck=row?row.querySelector('.liqcob-com-check'):null;
    if(comCheck&&comCheck.checked) montoIva+=((parseFloat(cb.dataset.monto)||0)*ivaPct/100);
  });
  const total=subtotal+montoIva;
  let totalDesc=0;
  liqCobDescActivos.forEach(d=>totalDesc+=calcMontoDescuento(d,subtotal,montoIva,total));
  const neto=total-totalDesc;
  renderDescuentosLiqCob();
  document.getElementById('liqcob-resumen').innerHTML=`
    <div style="display:flex;justify-content:space-between;padding:4px 0;border-bottom:0.5px solid var(--color-border-tertiary)"><span>Subtotal comisiones anuales</span><strong>${fmtMoney(subtotal-subtotalCuotas)}</strong></div>
    ${subtotalCuotas>0?`<div style="display:flex;justify-content:space-between;padding:4px 0;border-bottom:0.5px solid var(--color-border-tertiary)"><span>Subtotal cuotas mensuales (${cuotasChecks.length})</span><strong>${fmtMoney(subtotalCuotas)}</strong></div>`:''}
    <div style="display:flex;justify-content:space-between;padding:4px 0;border-bottom:0.5px solid var(--color-border-tertiary)"><span>Subtotal</span><strong>${fmtMoney(subtotal)}</strong></div>
    ${montoIva>0?`<div style="display:flex;justify-content:space-between;padding:4px 0"><span>IVA (${ivaPct}%)</span><strong>${fmtMoney(montoIva)}</strong></div>`:''}
    <div style="display:flex;justify-content:space-between;padding:4px 0;background:var(--color-background-secondary)"><span>Total</span><strong>${fmtMoney(total)}</strong></div>
    <div style="display:flex;justify-content:space-between;padding:6px 8px;background:${COLOR_COBROS};color:#fff;border-radius:4px;margin-top:4px"><span style="font-weight:500">Total a cobrar</span><strong style="font-size:15px">${fmtMoney(neto)}</strong></div>`;
}

async function guardarLiqCobro(){
  const aseguradora=document.getElementById('liqcob-aseguradora').value;
  const err=document.getElementById('liqcob-error');
  if(!aseguradora){err.textContent='Selecciona una aseguradora';err.style.display='block';return;}
  const checks=document.querySelectorAll('.liqcob-com-check:checked');
  const cuotasChecks=document.querySelectorAll('.liqcob-cuota-check:checked');
  if(!checks.length && !cuotasChecks.length){err.textContent='Selecciona al menos una comisión anual o cuota mensual';err.style.display='block';return;}
  const ivaOn=document.getElementById('liqcob-iva-switch').checked;
  const ivaPct=ivaOn?(parseFloat(document.getElementById('liqcob-iva-pct').value)||15):0;
  let subtotal=0; const comisionIds=[]; const polizaIds=[]; const detalle=[];
  checks.forEach(ch=>{
    const montoUsado=parseFloat(ch.dataset.monto)||0;
    subtotal+=montoUsado; comisionIds.push(ch.dataset.id);
    const cm=comisiones.find(x=>x.id===ch.dataset.id);
    if(cm){
      if(cm.polizaId)polizaIds.push(cm.polizaId);
      const row=ch.closest('tr');
      const pctInp=row?row.querySelector('.liqcob-pct-input'):null;
      const pctUsado=pctInp?parseFloat(pctInp.value)||0:cm.pctAseguradora;
      const p=polizas.find(x=>x.id===cm.polizaId);
      detalle.push({inicio:cm.inicio||'',cliente:cm.cliente,ramo:cm.ramo,tipoContrato:(p&&p.tipoContrato)||'nuevo',numero:cm.numero||'',primaNeta:cm.primaNeta,pct:pctUsado,comision:montoUsado,tipoFuente:'anual'});
    }
  });
  // Cuotas mensuales seleccionadas
  const cuotaIds=[];
  cuotasChecks.forEach(ch=>{
    const cuotaId=ch.dataset.cuotaId;
    const monto=parseFloat(ch.dataset.monto)||0;
    subtotal+=monto; cuotaIds.push(cuotaId);
    const cu=(cuotasMensuales||[]).find(x=>x.id===cuotaId);
    if(cu){
      if(cu.polizaId)polizaIds.push(cu.polizaId);
      detalle.push({inicio:cu.fechaVencimiento||'',cliente:cu.polizaCliente||'',ramo:cu.ramo,tipoContrato:'',numero:cu.polizaNumero||'',primaNeta:cu.primaNetaMensual,pct:cu.pctComision,comision:monto,tipoFuente:'cuota',numeroCuota:cu.numeroCuota,cuotaId:cuotaId});
    }
  });
  let montoIva=0;
  if(ivaOn){
    document.querySelectorAll('.liqcob-iva-check:checked').forEach(cb=>{
      const row=cb.closest('tr');
      const comCheck=row?row.querySelector('.liqcob-com-check'):null;
      if(comCheck&&comCheck.checked) montoIva+=((parseFloat(cb.dataset.monto)||0)*ivaPct/100);
    });
  }
  montoIva=Math.round(montoIva*100)/100;
  const total=subtotal+montoIva;
  let totalDesc=0;
  const descApl=liqCobDescActivos.map(d=>{const monto=calcMontoDescuento(d,subtotal,montoIva,total);totalDesc+=monto;return{nombre:d.nombre,tipo:d.tipo,base:d.base,valor:d.valor,monto:Math.round(monto*100)/100};});
  const data={aseguradora,comisionIds,cuotaIds,polizaIds,detalle,subtotal:Math.round(subtotal*100)/100,ivaOn,ivaPct,montoIva:Math.round(montoIva*100)/100,total:Math.round(total*100)/100,descuentosAplicados:descApl,totalDescuentos:Math.round(totalDesc*100)/100,totalNeto:Math.round((total-totalDesc)*100)/100};
  try{
    const nv=await apiPost('liquidaciones-cobros',data);
    liqCobros.unshift(nv);
    // Marcar cuotas seleccionadas como liquidadas
    if(cuotaIds.length){
      for(const cid of cuotaIds){
        const cu=(cuotasMensuales||[]).find(x=>x.id===cid);
        if(!cu)continue;
        const upd={...cu,estado:'liquidada',fechaLiquidada:new Date().toISOString(),liquidacionId:nv.id};
        delete upd.id; delete upd._id;
        try{
          const act=await apiPut('cuotas-mensuales',cid,upd);
          const i=cuotasMensuales.findIndex(x=>x.id===cid);
          if(i>=0)cuotasMensuales[i]=act;
        }catch(e){console.error('Error marcando cuota',cid,e);}
      }
    }
    await cargarPolizas();await cargarComisiones();
    cerrarModal('overlay-liqcobro');renderComisiones();
    mostrarToast('Liquidación por cobrar generada'+(cuotaIds.length?` (${cuotaIds.length} cuota${cuotaIds.length>1?'s':''} liquidada${cuotaIds.length>1?'s':''})`:''));
  }
  catch(e){err.textContent='Error al generar';err.style.display='block';}
}
async function eliminarLiqCobro(id){
  if(!confirm('¿Eliminar esta liquidación? Las cuotas mensuales vinculadas volverán a estado pendiente.'))return;
  try{
    // Revertir cuotas vinculadas
    const cuotasVinc=(cuotasMensuales||[]).filter(c=>c.liquidacionId===id);
    for(const cu of cuotasVinc){
      const upd={...cu,estado:'pendiente',fechaLiquidada:null,liquidacionId:null};
      delete upd.id; delete upd._id;
      try{
        const act=await apiPut('cuotas-mensuales',cu.id,upd);
        const i=cuotasMensuales.findIndex(x=>x.id===cu.id);
        if(i>=0)cuotasMensuales[i]=act;
      }catch(e){console.error('Error revirtiendo cuota',cu.id,e);}
    }
    await apiDel('liquidaciones-cobros',id);
    liqCobros=liqCobros.filter(x=>x.id!==id);
    await cargarPolizas();await cargarComisiones();
    renderComisiones();
    mostrarToast('Liquidación eliminada'+(cuotasVinc.length?` (${cuotasVinc.length} cuota${cuotasVinc.length>1?'s':''} revertida${cuotasVinc.length>1?'s':''})`:''));
  }catch(e){mostrarToast('Error al eliminar');}
}

function descargarLiqCobroCSV(id){
  const liq=liqCobros.find(x=>x.id===id);
  const fecha=new Date(liq.fecha).toLocaleDateString('es-EC');
  const h=['Fecha inicio','Cliente','Ramo','N° Póliza','Prima Neta','% Com.','Comisión Bróker'];
  const rows=(liq.detalle||[]).map(d=>[fd(d.inicio),d.cliente,d.ramo,d.numero||'N/A',d.primaNeta,d.pct+'%',d.comision]);
  let csv=`LIQUIDACION POR COBRAR - REYNA SEGUROS GESTION\nAseguradora:,${liq.aseguradora}\nFecha:,${fecha}\n\n`;
  csv+=[h,...rows].map(r=>r.map(x=>`"${String(x).replace(/"/g,'""')}"`).join(',')).join('\n');
  csv+=`\n\nSubtotal:,${liq.subtotal}\n${liq.ivaOn?`IVA (${liq.ivaPct}%):,${liq.montoIva}\n`:''}Total:,${liq.total}\n`;
  (liq.descuentosAplicados||[]).forEach(d=>csv+=`${d.nombre} (${d.base}):,-${d.monto}\n`);
  csv+=`TOTAL A COBRAR:,${liq.totalNeto}\n\n${LEGAL_TEXT}\n\n${FOOTER_TEXT}`;
  const blob=new Blob(['\uFEFF'+csv],{type:'text/csv;charset=utf-8'});
  const a=document.createElement('a');a.href=URL.createObjectURL(blob);
  a.download=`liq_cobro_${liq.aseguradora.replace(/\s+/g,'_')}_${fecha.replace(/\//g,'-')}.csv`;a.click();
}

function descargarLiqCobroPDF(id){
  const liq=liqCobros.find(x=>x.id===id);
  const fecha=new Date(liq.fecha).toLocaleDateString('es-EC');
  const logoB64=document.querySelector('#login-screen .login-logo img').src;
  const C2=COLOR_COBROS;
  const filas=(liq.detalle||[]).map(d=>`<tr><td>${fd(d.inicio)}</td><td>${d.cliente}</td><td>${d.ramo}</td><td>${d.numero||'N/A'}</td><td style="text-align:right">${fmtMoney(d.primaNeta)}</td><td style="text-align:right">${d.pct}%</td><td style="text-align:right;font-weight:600">${fmtMoney(d.comision)}</td></tr>`).join('');
  const descRows=(liq.descuentosAplicados||[]).map(d=>`<tr><td>${d.nombre}</td><td>${d.base}</td><td>${d.tipo==='pct'?d.valor+'%':'$'+d.valor}</td><td style="text-align:right;color:#dc2626">-${fmtMoney(d.monto)}</td></tr>`).join('');
  const html=`<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"><title>LiqCobro_${liq.aseguradora.replace(/\s+/g,'_')}_${fecha.replace(/\//g,'-')}</title><style>*{box-sizing:border-box;margin:0;padding:0}body{font-family:Arial,sans-serif;font-size:12px;color:#1a1a2e;padding:2rem}.header{display:flex;align-items:center;gap:16px;border-bottom:2px solid ${C2};padding-bottom:12px;margin-bottom:16px}.logo{width:50px;height:50px;border-radius:8px;overflow:hidden;flex-shrink:0}.logo img{width:100%;height:100%;object-fit:cover}.brand-name{font-size:14px;font-weight:700;color:#1a2744}.brand-sub{font-size:10px;color:#64748b}.rep-title{text-align:right;font-size:14px;font-weight:700;color:${C2}}.rep-meta{font-size:10px;color:#64748b}.info{display:grid;grid-template-columns:1fr 1fr;gap:4px;margin-bottom:14px;font-size:11px}.info-row{display:flex;gap:6px}.info-lbl{color:#64748b;min-width:70px}.info-val{font-weight:600}.section{font-size:10px;font-weight:700;letter-spacing:0.07em;color:#fff;background:${C2};padding:4px 8px;border-radius:3px;margin:12px 0 6px;text-transform:uppercase}table{width:100%;border-collapse:collapse;font-size:11px;margin-bottom:12px}th{text-align:left;padding:5px 7px;background:#fdf0eb;color:${C2};font-size:9px;font-weight:700;text-transform:uppercase}th:last-child{text-align:right}td{padding:5px 7px;border-bottom:0.5px solid #e2e8f0}td:last-child{text-align:right}.totales{margin-left:auto;width:260px}.tot{display:flex;justify-content:space-between;padding:4px 8px;border-bottom:0.5px solid #e2e8f0;font-size:11px}.tot.sub{background:#fdf0eb;font-weight:700;color:${C2}}.tot.tot-total{background:${C2};color:#fff;font-weight:700}.pago{background:${C2};color:#fff;border-radius:5px;padding:8px 12px;display:flex;justify-content:space-between;margin:12px 0;font-weight:700}.pago-val{font-size:15px}.legal{border-top:0.5px solid #e2e8f0;padding-top:8px;font-size:9px;color:#64748b;line-height:1.5;font-style:italic;margin-top:12px}.footer{text-align:center;font-size:9px;color:#94a3b8;margin-top:8px}</style></head><body>
  <div class="header"><div class="logo"><img src="${logoB64}" alt="Reyna Seguros"></div><div style="flex:1"><div class="brand-name">Reyna Seguros Gestión</div><div class="brand-sub">Asesoría experta y protección a tu medida</div></div><div><div class="rep-title">Liquidación por cobrar</div><div class="rep-meta">Fecha: ${fecha}</div></div></div>
  <div class="info"><div class="info-row"><span class="info-lbl">Aseguradora:</span><span class="info-val">${liq.aseguradora}</span></div><div class="info-row"><span class="info-lbl">N° pólizas:</span><span class="info-val">${(liq.detalle||[]).length}</span></div></div>
  <div class="section">Detalle de comisiones por cobrar</div>
  <table><thead><tr><th>Fecha inicio</th><th>Cliente</th><th>Ramo</th><th>N° Póliza</th><th style="text-align:right">Prima Neta</th><th style="text-align:right">% Com.</th><th style="text-align:right">Comisión Bróker</th></tr></thead><tbody>${filas}</tbody></table>
  <div class="totales"><div class="tot sub"><span>Subtotal</span><span>${fmtMoney(liq.subtotal)}</span></div>${liq.ivaOn?`<div class="tot"><span>IVA (${liq.ivaPct}%)</span><span>${fmtMoney(liq.montoIva)}</span></div>`:''}<div class="tot tot-total"><span>Total</span><span>${fmtMoney(liq.total)}</span></div></div>
  ${descRows?`<div class="section">Descuentos / retenciones</div><table><thead><tr><th>Concepto</th><th>Base</th><th>Valor/%</th><th style="text-align:right">Monto</th></tr></thead><tbody>${descRows}</tbody><tfoot><tr style="background:#fdf0eb;font-weight:700"><td colspan="3">Total descuentos</td><td style="text-align:right;color:#dc2626">-${fmtMoney(liq.totalDescuentos||0)}</td></tr></tfoot></table>`:''}
  <div class="pago"><span>Total a cobrar</span><span class="pago-val">${fmtMoney(liq.totalNeto)}</span></div>
  <div class="legal">${LEGAL_TEXT}</div><div class="footer">${FOOTER_TEXT}</div>
  </body></html>`;
  const w=window.open('','_blank');w.document.write(html);w.document.close();w.print();
}

// ── BALANCE COMISIONES ────────────────────────────────────────────────
function getRangoBalanceAseg(){
  const p=(document.getElementById('bal-aseg-periodo')||{}).value||'todo';
  if(p==='todo') return {ini:null,fin:null};
  const hoy=new Date(); hoy.setHours(23,59,59,999);
  const ini=new Date(); ini.setHours(0,0,0,0);
  if(p==='semana'){ ini.setDate(ini.getDate()-ini.getDay()); }
  else if(p==='mes'){ ini.setDate(1); }
  else if(p==='trimestre'){ ini.setMonth(Math.floor(ini.getMonth()/3)*3,1); }
  else if(p==='semestre'){ ini.setMonth(Math.floor(ini.getMonth()/6)*6,1); }
  else if(p==='anio'){ ini.setMonth(0,1); }
  else if(p==='custom'){
    const vi=(document.getElementById('bal-aseg-fi')||{}).value;
    const vf=(document.getElementById('bal-aseg-ff')||{}).value;
    return {ini:vi?new Date(vi+'T00:00:00'):null,fin:vf?new Date(vf+'T23:59:59'):null};
  }
  return {ini,fin:hoy};
}
function onCambiarPeriodoBalanceAseg(){
  const p=document.getElementById('bal-aseg-periodo').value;
  const div=document.getElementById('bal-aseg-custom');
  if(div) div.style.display=p==='custom'?'flex':'none';
  renderTablaBalanceAseg();
}
function renderTablaBalanceAseg(){
  const tbody=document.getElementById('bal-aseg-tbody');
  if(!tbody) return;
  const fA=(document.getElementById('bal-faseg')||{}).value||'';
  const {ini,fin}=getRangoBalanceAseg();
  const enRango=f=>{if(!ini&&!fin)return true;const d=new Date(f);if(ini&&d<ini)return false;if(fin&&d>fin)return false;return true;};
  const aO=[...aseguradoras].sort((a,b)=>a.nombre.localeCompare(b.nombre)).filter(a=>!fA||a.nombre===fA);
  const filas=aO.map(a=>{
    const ca  =comisiones.filter(cm=>cm.aseguradora===a.nombre&&enRango(cm.fechaInicio||cm.fecha||'')).reduce((s,cm)=>s+(cm.comisionBroker||0),0);
    const liqA=liqCobros.filter(l=>l.aseguradora===a.nombre&&enRango(l.fecha||'')).reduce((s,l)=>s+(l.totalNeto||0),0);
    const cobA=movCobros.filter(m=>m.aseguradora===a.nombre&&enRango(m.fecha||'')).reduce((s,m)=>s+(parseFloat(m.monto)||0),0);
    const dA  =liqCobros.filter(l=>l.aseguradora===a.nombre&&enRango(l.fecha||'')).reduce((s,l)=>s+((l.descuentosAplicados||[]).reduce((ss,d)=>ss+(parseFloat(d.monto)||0),0)),0);
    if(!ca&&!liqA&&!cobA) return'';
    return`<tr>
      <td>${a.nombre}</td>
      <td style="text-align:right">${fmtMoney(ca)}</td>
      <td style="text-align:right">${fmtMoney(liqA)}</td>
      <td style="text-align:right;color:#dc2626">${dA?'-'+fmtMoney(dA):'—'}</td>
      <td style="text-align:right">${fmtMoney(cobA)}</td>
      <td style="text-align:right;color:#dc2626;font-weight:600">${fmtMoney(Math.max(0,liqA-cobA))}</td>
    </tr>`;
  }).join('');
  tbody.innerHTML=filas||'<tr><td colspan="6"><div class="empty-state">Sin datos para el período seleccionado.</div></td></tr>';
  // Totals row
  let ta_ca=0,ta_liq=0,ta_dA=0,ta_cob=0,ta_pend=0;
  aO.forEach(a=>{
    const ca=comisiones.filter(cm=>cm.aseguradora===a.nombre&&enRango(cm.fechaInicio||cm.fecha||'')).reduce((s,cm)=>s+(cm.comisionBroker||0),0);
    const liqA=liqCobros.filter(l=>l.aseguradora===a.nombre&&enRango(l.fecha||'')).reduce((s,l)=>s+(l.totalNeto||0),0);
    const cobA=movCobros.filter(m=>m.aseguradora===a.nombre&&enRango(m.fecha||'')).reduce((s,m)=>s+(parseFloat(m.monto)||0),0);
    const dA=liqCobros.filter(l=>l.aseguradora===a.nombre&&enRango(l.fecha||'')).reduce((s,l)=>s+((l.descuentosAplicados||[]).filter(d=>!/^anticipo/i.test(d.nombre||'')).reduce((ss,d)=>ss+(parseFloat(d.monto)||0),0)),0);
    if(!ca&&!liqA&&!cobA) return;
    ta_ca+=ca; ta_liq+=liqA; ta_dA+=dA; ta_cob+=cobA; ta_pend+=Math.max(0,liqA-cobA);
  });
  const tfootEl=document.getElementById('bal-aseg-tfoot')||tbody.closest('table').querySelector('tfoot')||tbody.closest('table').appendChild(document.createElement('tfoot'));
  tfootEl.innerHTML=`<tr style="background:#f1f5f9;font-weight:700"><td>TOTAL</td><td style="text-align:right">${fmtMoney(ta_ca)}</td><td style="text-align:right">${fmtMoney(ta_liq)}</td><td style="text-align:right;color:#dc2626">${ta_dA?'-'+fmtMoney(ta_dA):'—'}</td><td style="text-align:right">${fmtMoney(ta_cob)}</td><td style="text-align:right;color:#dc2626">${fmtMoney(ta_pend)}</td></tr>`;
}

function renderComisionesBalance(c){
  const tb=comisiones.reduce((s,cm)=>s+(cm.comisionBroker||0),0);
  const tv=comisiones.reduce((s,cm)=>s+(cm.comisionVendedor||0),0);
  // Facturado = total con IVA de liquidaciones de cobros
  const facturado=liqCobros.reduce((s,l)=>s+(l.total||l.totalNeto||0),0);
  // Liquidado = total a cobrar (total − descuentos) = totalNeto
  const liquidado=liqCobros.reduce((s,l)=>s+(l.totalNeto||0),0);
  // Retenciones = descuentos en liqCobros EXCEPTO anticipos
  const retenciones=liqCobros.reduce((s,l)=>s+((l.descuentosAplicados||[])
    .filter(d=>!/^anticipo/i.test(d.nombre||''))
    .reduce((ss,d)=>ss+(parseFloat(d.monto)||0),0)),0);
  // Anticipos descontados en liqCobros
  const anticiposDesc=liqCobros.reduce((s,l)=>s+((l.descuentosAplicados||[])
    .filter(d=>/^anticipo/i.test(d.nombre||''))
    .reduce((ss,d)=>ss+(parseFloat(d.monto)||0),0)),0);
  // Anticipos pendientes de aseguradoras (si existieran)
  const anticiposPend=0; // actualmente no hay sistema de anticipos de aseguradoras
  // Cobrado = movCobros reales registrados
  const cobrado=movCobros.reduce((s,m)=>s+(parseFloat(m.monto)||0),0);
  // Pendiente de cobro = Facturado − Retenciones − Anticipos − Cobrado
  const pendienteCobro=facturado-retenciones-anticiposDesc-anticiposPend-cobrado;
  const pagado=movPagos.reduce((s,m)=>s+(parseFloat(m.monto)||0),0);
  const vO=[...vendedores].sort((a,b)=>a.nombre.localeCompare(b.nombre));
  const aO=[...aseguradoras].sort((a,b)=>a.nombre.localeCompare(b.nombre));
  c.innerHTML=`
  <div style="display:flex;gap:8px;justify-content:flex-end;margin-bottom:1rem">
    <button class="btn btn-outline btn-sm" onclick="exportarBalanceComisionesCSV()"><i class="ti ti-download" aria-hidden="true"></i> CSV</button>
    <button class="btn btn-outline btn-sm" onclick="exportarBalanceComisionesPDF()"><i class="ti ti-file-text" aria-hidden="true"></i> PDF</button>
  </div>
  <div class="stats-row">
    <div class="stat"><div class="stat-label">Com. Bróker total</div><div class="stat-value blue">${fmtMoney(tb)}</div></div>
    <div class="stat"><div class="stat-label">Com. Vendedores</div><div class="stat-value amber">${fmtMoney(tv)}</div></div>
    <div class="stat"><div class="stat-label">Neto Bróker</div><div class="stat-value green">${fmtMoney(tb-tv)}</div></div>
  </div>
  <div class="actions-panel">
    <div class="actions-panel-title"><i class="ti ti-file-invoice" style="font-size:13px" aria-hidden="true"></i> Resumen de cobros a aseguradoras</div>
    <div class="stats-row">
      <div class="stat"><div class="stat-label">Facturado</div><div class="stat-value blue">${fmtMoney(facturado)}</div></div>
      <div class="stat"><div class="stat-label">Liquidado</div><div class="stat-value blue">${fmtMoney(liquidado)}</div></div>
      <div class="stat"><div class="stat-label">Retenciones</div><div class="stat-value red">-${fmtMoney(retenciones)}</div></div>
      ${anticiposDesc?`<div class="stat"><div class="stat-label">Anticipos</div><div class="stat-value amber">-${fmtMoney(anticiposDesc)}</div></div>`:''}
      ${anticiposPend?`<div class="stat"><div class="stat-label">Ant. Pendientes</div><div class="stat-value amber">-${fmtMoney(anticiposPend)}</div></div>`:''}
      <div class="stat"><div class="stat-label">Cobrado</div><div class="stat-value green">${fmtMoney(cobrado)}</div></div>
      <div class="stat"><div class="stat-label">Pendiente de cobro</div><div class="stat-value ${pendienteCobro>0?'red':'green'}">${fmtMoney(pendienteCobro)}</div></div>
    </div>
  </div>
  <!-- Panel aseguradoras -->
  <div class="actions-panel">
    <div class="actions-panel-title"><div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px"><span><i class="ti ti-building" style="font-size:13px" aria-hidden="true"></i> Balance por aseguradora</span><span style="font-size:11px;font-weight:400;color:#64748b">Solo con valores</span></div></div>
    <div style="display:flex;flex-wrap:wrap;gap:8px;margin-bottom:10px;align-items:flex-end">
      <div>
        <div style="font-size:10px;font-weight:600;color:#64748b;text-transform:uppercase;margin-bottom:3px">Aseguradora</div>
        <select id="bal-faseg" onchange="renderTablaBalanceAseg()" style="font-size:12px;border:1px solid #e2e8f0;border-radius:6px;padding:5px 8px;background:#f8fafc;outline:none">
          <option value="">Todas</option>
          ${aO.map(a=>`<option value="${a.nombre}">${a.nombre}</option>`).join('')}
        </select>
      </div>
      <div>
        <div style="font-size:10px;font-weight:600;color:#64748b;text-transform:uppercase;margin-bottom:3px">Período</div>
        <select id="bal-aseg-periodo" onchange="onCambiarPeriodoBalanceAseg()" style="font-size:12px;border:1px solid #e2e8f0;border-radius:6px;padding:5px 8px;background:#f8fafc;outline:none">
          <option value="todo">Todo el tiempo</option>
          <option value="semana">Esta semana</option>
          <option value="mes">Este mes</option>
          <option value="trimestre">Este trimestre</option>
          <option value="semestre">Este semestre</option>
          <option value="anio">Este año</option>
          <option value="custom">Fechas específicas</option>
        </select>
      </div>
      <div id="bal-aseg-custom" style="display:none;gap:6px;align-items:flex-end;flex-wrap:wrap">
        <div>
          <div style="font-size:10px;font-weight:600;color:#64748b;text-transform:uppercase;margin-bottom:3px">Desde</div>
          <input type="date" id="bal-aseg-fi" onchange="renderTablaBalanceAseg()" style="font-size:12px;border:1px solid #e2e8f0;border-radius:6px;padding:5px 8px;background:#f8fafc;outline:none">
        </div>
        <div>
          <div style="font-size:10px;font-weight:600;color:#64748b;text-transform:uppercase;margin-bottom:3px">Hasta</div>
          <input type="date" id="bal-aseg-ff" onchange="renderTablaBalanceAseg()" style="font-size:12px;border:1px solid #e2e8f0;border-radius:6px;padding:5px 8px;background:#f8fafc;outline:none">
        </div>
      </div>
    </div>
    <div class="table-wrap"><div class="table-scroll">
      <table><thead><tr>
        <th>Aseguradora</th>
        <th style="text-align:right">Com. generadas</th>
        <th style="text-align:right">Liquidado</th>
        <th style="text-align:right">Descuentos</th>
        <th style="text-align:right">Cobrado</th>
        <th style="text-align:right">Pendiente cobro</th>
      </tr></thead>
      <tbody id="bal-aseg-tbody"></tbody>
      <tfoot id="bal-aseg-tfoot"></tfoot>
      </table>
    </div></div>
  </div>
  <div class="actions-panel">
    <div class="actions-panel-title"><div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px"><span><i class="ti ti-users" style="font-size:13px" aria-hidden="true"></i> Balance por vendedor</span><span style="font-size:11px;font-weight:400;color:#64748b">Solo vendedores con valores</span></div></div>
    <!-- Filtros -->
    <div style="display:flex;flex-wrap:wrap;gap:8px;margin-bottom:10px;align-items:flex-end">
      <div>
        <div style="font-size:10px;font-weight:600;color:#64748b;text-transform:uppercase;margin-bottom:3px">Vendedor</div>
        <select id="bal-fvend" onchange="renderTablaBalanceVendedores()" style="font-size:12px;border:1px solid #e2e8f0;border-radius:6px;padding:5px 8px;background:#f8fafc;outline:none">
          <option value="">Todos</option>
          ${vO.map(v=>`<option value="${v.nombre}">${v.nombre}</option>`).join('')}
        </select>
      </div>
      <div>
        <div style="font-size:10px;font-weight:600;color:#64748b;text-transform:uppercase;margin-bottom:3px">Período</div>
        <select id="bal-periodo" onchange="onCambiarPeriodoBalance()" style="font-size:12px;border:1px solid #e2e8f0;border-radius:6px;padding:5px 8px;background:#f8fafc;outline:none">
          <option value="todo">Todo el tiempo</option>
          <option value="semana">Esta semana</option>
          <option value="mes">Este mes</option>
          <option value="trimestre">Este trimestre</option>
          <option value="semestre">Este semestre</option>
          <option value="anio">Este año</option>
          <option value="custom">Fechas específicas</option>
        </select>
      </div>
      <div id="bal-custom-dates" style="display:none;display:flex;gap:6px;align-items:flex-end;flex-wrap:wrap">
        <div>
          <div style="font-size:10px;font-weight:600;color:#64748b;text-transform:uppercase;margin-bottom:3px">Desde</div>
          <input type="date" id="bal-fecha-ini" onchange="renderTablaBalanceVendedores()" style="font-size:12px;border:1px solid #e2e8f0;border-radius:6px;padding:5px 8px;background:#f8fafc;outline:none">
        </div>
        <div>
          <div style="font-size:10px;font-weight:600;color:#64748b;text-transform:uppercase;margin-bottom:3px">Hasta</div>
          <input type="date" id="bal-fecha-fin" onchange="renderTablaBalanceVendedores()" style="font-size:12px;border:1px solid #e2e8f0;border-radius:6px;padding:5px 8px;background:#f8fafc;outline:none">
        </div>
      </div>
    </div>
    <div class="table-wrap"><div class="table-scroll">
      <table><thead><tr>
        <th>Vendedor</th>
        <th style="text-align:right">Com. generadas</th>
        <th style="text-align:right">Liquidado</th>
        <th style="text-align:right">Pagado</th>
        <th style="text-align:right">Anticipos activos</th>
        <th style="text-align:right">Pendiente pagar</th>
      </tr></thead>
      <tbody id="bal-vend-tbody"></tbody>
      </table>
    </div></div>
  </div>

  <!-- Tabla de descuentos detallados -->
  <div class="actions-panel" id="bal-descuentos-panel" style="margin-top:1rem;border:1.5px solid #1a2744">
    <div class="actions-panel-title" style="background:#1a2744;color:#fff;border-radius:4px 4px 0 0;margin:-1px -1px 0 -1px;padding:8px 12px">
      <i class="ti ti-receipt-tax" style="font-size:13px" aria-hidden="true"></i> Detalle de descuentos por tipo
    </div>
    <div id="bal-descuentos-content" style="padding:8px 0"></div>
  </div>`;
  renderTablaBalanceVendedores();
  renderTablaBalanceAseg();
  renderBalanceDescuentos();
}

function renderBalanceDescuentos(){
  const cont=document.getElementById('bal-descuentos-content');
  if(!cont) return;

  const esFiscal=n=>/retenci/i.test(n)||/impuesto/i.test(n)||/nota.*cr/i.test(n)||/reliquid/i.test(n)||/superban/i.test(n);
  const esAnticipo=n=>/^anticipo/i.test(n);

  const mapCob={}, mapPag={};
  liqCobros.forEach(l=>(l.descuentosAplicados||[]).forEach(d=>{
    const n=d.nombre||''; if(!mapCob[n])mapCob[n]=0; mapCob[n]+=parseFloat(d.monto)||0;
  }));
  liquidaciones.forEach(l=>(l.descuentosAplicados||[]).forEach(d=>{
    const n=d.nombre||''; if(!mapPag[n])mapPag[n]=0; mapPag[n]+=parseFloat(d.monto)||0;
  }));

  const allKeys=[...new Set([...Object.keys(mapCob),...Object.keys(mapPag)])];
  if(!allKeys.length){
    cont.innerHTML='<div class="empty-state" style="padding:1rem"><i class="ti ti-receipt"></i> No hay descuentos registrados.</div>';
    return;
  }

  const grpFiscal=[], grpFee=[], grpAnticipo=[];
  allKeys.forEach(n=>{
    const e={nombre:n,cob:mapCob[n]||0,pag:mapPag[n]||0};
    if(esAnticipo(n)) grpAnticipo.push(e);
    else if(esFiscal(n)) grpFiscal.push(e);
    else grpFee.push(e);
  });

  const theadFiscal=`<thead><tr>
    <th>Concepto</th>
    <th style="text-align:right;color:#D97757">Cobros (aseguradoras)</th>
    <th style="text-align:right;color:#1a2744">Pagos (vendedores)</th>
    <th style="text-align:right">Acumulado (cobros − pagos)</th>
  </tr></thead>`;



  function buildFiscal(grupo){
    if(!grupo.length) return '';
    let totCob=0,totPag=0;
    const filas=grupo.map(e=>{
      const acum=e.cob-e.pag;
      totCob+=e.cob; totPag+=e.pag;
      const acumColor=acum>=0?'#16a34a':'#dc2626';
      return`<tr>
        <td>${e.nombre}</td>
        <td style="text-align:right;color:#D97757">${e.cob?fmtMoney(e.cob):'—'}</td>
        <td style="text-align:right;color:#1a2744">${e.pag?fmtMoney(e.pag):'—'}</td>
        <td style="text-align:right;font-weight:600;color:${acumColor}">${fmtMoney(acum)}</td>
      </tr>`;
    }).join('');
    const totAcum=totCob-totPag;
    const totColor=totAcum>=0?'#16a34a':'#dc2626';
    return`<div style="font-size:11px;font-weight:700;color:#fff;background:#1a2744;padding:5px 10px;border-radius:4px;margin:12px 0 6px;text-transform:uppercase;letter-spacing:.05em">Retenciones fiscales</div>
    <div class="table-wrap"><div class="table-scroll"><table style="font-size:12px">
      ${theadFiscal}<tbody>${filas}</tbody>
      <tfoot><tr style="background:#e8ecf4;font-weight:700">
        <td>TOTAL RETENCIONES FISCALES</td>
        <td style="text-align:right;color:#D97757">${fmtMoney(totCob)}</td>
        <td style="text-align:right;color:#1a2744">${fmtMoney(totPag)}</td>
        <td style="text-align:right;color:${totColor}">${fmtMoney(totAcum)}</td>
      </tr></tfoot>
    </table></div></div>`;
  }

  function buildInfo(grupo, label, colorLabel){
    if(!grupo.length) return '';
    let totCob=0,totPag=0;
    const filas=grupo.map(e=>{
      totCob+=e.cob; totPag+=e.pag;
      return`<tr>
        <td>${e.nombre}</td>
        <td style="text-align:right;color:#D97757">${e.cob?fmtMoney(e.cob):'—'}</td>
        <td style="text-align:right;color:#1a2744">${e.pag?fmtMoney(e.pag):'—'}</td>
        <td></td>
      </tr>`;
    }).join('');
    return`<div style="font-size:11px;font-weight:700;color:#fff;background:${colorLabel};padding:5px 10px;border-radius:4px;margin:12px 0 6px;text-transform:uppercase;letter-spacing:.05em">${label}</div>
    <div class="table-wrap"><div class="table-scroll"><table style="font-size:12px">
      ${theadFiscal}<tbody>${filas}</tbody>
      <tfoot><tr style="background:#e8ecf4;font-weight:700">
        <td>TOTAL ${label.toUpperCase()}</td>
        <td style="text-align:right;color:#D97757">${fmtMoney(totCob)}</td>
        <td style="text-align:right;color:#1a2744">${fmtMoney(totPag)}</td>
        <td></td>
      </tr></tfoot>
    </table></div></div>`;
  }

  cont.innerHTML=
    buildFiscal(grpFiscal) +
    buildInfo(grpFee,      'Fee administrativo y otros', '#64748b') +
    buildInfo(grpAnticipo, 'Anticipos descontados',      '#d97706');

  // Grand total
  let grandTotC=0, grandTotP=0;
  allKeys.forEach(n=>{grandTotC+=mapCob[n]||0; grandTotP+=mapPag[n]||0;});
  cont.innerHTML+='<div style="display:flex;justify-content:space-between;align-items:center;background:#1a2744;color:#fff;border-radius:6px;padding:10px 14px;margin-top:14px;font-weight:700;font-size:13px"><span>TOTAL GENERAL DE DESCUENTOS</span><span style="display:flex;gap:24px"><span style="color:#4ade80">Cobros: '+fmtMoney(grandTotC)+'</span><span style="color:#fca5a5">Pagos: '+fmtMoney(grandTotP)+'</span></span></div>';
}

// Tabla descuentos liquidaciones vendedores (solo columna pagos)
function renderLiqVendDescuentos(){
  const cont=document.getElementById('llv-descuentos-content');
  if(!cont) return;
  const esFiscal=n=>/retenci/i.test(n)||/impuesto/i.test(n)||/nota.*cr/i.test(n)||/reliquid/i.test(n)||/superban/i.test(n);
  const esAnticipo=n=>/^anticipo/i.test(n);
  const map={};
  liquidaciones.forEach(l=>(l.descuentosAplicados||[]).forEach(d=>{
    const n=d.nombre||''; if(!map[n])map[n]=0; map[n]+=parseFloat(d.monto)||0;
  }));
  const allKeys=Object.keys(map);
  if(!allKeys.length){cont.innerHTML='<div class="empty-state" style="padding:1rem"><i class="ti ti-receipt"></i> No hay descuentos registrados.</div>';return;}
  const grpFiscal=[], grpFee=[], grpAnticipo=[];
  allKeys.forEach(n=>{
    const e={nombre:n, val:map[n]};
    if(esAnticipo(n)) grpAnticipo.push(e);
    else if(esFiscal(n)) grpFiscal.push(e);
    else grpFee.push(e);
  });
  const thead=`<thead><tr><th>Concepto</th><th style="text-align:right;color:#1a2744">Pagos (vendedores)</th></tr></thead>`;
  function buildGrp(grupo, label, bg, isFiscal){
    if(!grupo.length) return '';
    let tot=0;
    const filas=grupo.map(e=>{tot+=e.val;return`<tr><td>${e.nombre}</td><td style="text-align:right;font-weight:600;color:#1a2744">${fmtMoney(e.val)}</td></tr>`;}).join('');
    const acumColor=isFiscal?(tot>=0?'#16a34a':'#dc2626'):'#1a2744';
    return`<div style="font-size:11px;font-weight:700;color:#fff;background:${bg};padding:5px 10px;border-radius:4px;margin:10px 0 5px;text-transform:uppercase;letter-spacing:.05em">${label}</div>
    <div class="table-wrap"><div class="table-scroll"><table style="font-size:12px">${thead}<tbody>${filas}</tbody>
    <tfoot><tr style="background:#e8ecf4;font-weight:700"><td>TOTAL ${label.toUpperCase()}</td><td style="text-align:right;color:${acumColor}">${fmtMoney(tot)}</td></tr></tfoot>
    </table></div></div>`;
  }
  let totGrand=0;
  cont.innerHTML=
    buildGrp(grpFiscal,  'Retenciones fiscales',       '#1a2744', true)+
    buildGrp(grpFee,     'Fee administrativo y otros',  '#64748b', false)+
    buildGrp(grpAnticipo,'Anticipos descontados',       '#d97706', false);
  // Grand total
  Object.values(map).forEach(v=>totGrand+=v);
  cont.innerHTML+='<div style="display:flex;justify-content:space-between;align-items:center;background:#1a2744;color:#fff;border-radius:6px;padding:10px 14px;margin-top:14px;font-weight:700;font-size:13px"><span>TOTAL GENERAL DE DESCUENTOS</span><span style="color:#4ade80">'+fmtMoney(totGrand)+'</span></div>';
}
function renderLiqAsegDescuentos(){
  const cont=document.getElementById('lla-descuentos-content');
  if(!cont) return;
  const esFiscal=n=>/retenci/i.test(n)||/impuesto/i.test(n)||/nota.*cr/i.test(n)||/reliquid/i.test(n)||/superban/i.test(n);
  const esAnticipo=n=>/^anticipo/i.test(n);
  const map={};
  liqCobros.forEach(l=>(l.descuentosAplicados||[]).forEach(d=>{
    const n=d.nombre||''; if(!map[n])map[n]=0; map[n]+=parseFloat(d.monto)||0;
  }));
  const allKeys=Object.keys(map);
  if(!allKeys.length){cont.innerHTML='<div class="empty-state" style="padding:1rem"><i class="ti ti-receipt"></i> No hay descuentos registrados.</div>';return;}
  const grpFiscal=[], grpFee=[], grpAnticipo=[];
  allKeys.forEach(n=>{
    const e={nombre:n,val:map[n]};
    if(esAnticipo(n)) grpAnticipo.push(e);
    else if(esFiscal(n)) grpFiscal.push(e);
    else grpFee.push(e);
  });
  const thead=`<thead><tr><th>Concepto</th><th style="text-align:right;color:#D97757">Cobros (aseguradoras)</th></tr></thead>`;
  function buildGrp(grupo, label, bg){
    if(!grupo.length) return '';
    let tot=0;
    const filas=grupo.map(e=>{tot+=e.val;return`<tr><td>${e.nombre}</td><td style="text-align:right;font-weight:600;color:#D97757">${fmtMoney(e.val)}</td></tr>`;}).join('');
    return`<div style="font-size:11px;font-weight:700;color:#fff;background:${bg};padding:5px 10px;border-radius:4px;margin:10px 0 5px;text-transform:uppercase;letter-spacing:.05em">${label}</div>
    <div class="table-wrap"><div class="table-scroll"><table style="font-size:12px">${thead}<tbody>${filas}</tbody>
    <tfoot><tr style="background:#e8ecf4;font-weight:700"><td>TOTAL ${label.toUpperCase()}</td><td style="text-align:right;color:#D97757">${fmtMoney(tot)}</td></tr></tfoot>
    </table></div></div>`;
  }
  let totGrand=0;
  cont.innerHTML=
    buildGrp(grpFiscal,  'Retenciones fiscales',      '#1a2744')+
    buildGrp(grpFee,     'Fee administrativo y otros', '#64748b')+
    buildGrp(grpAnticipo,'Anticipos descontados',      '#d97706');
  Object.values(map).forEach(v=>totGrand+=v);
  cont.innerHTML+='<div style="display:flex;justify-content:space-between;align-items:center;background:#D97757;color:#fff;border-radius:6px;padding:10px 14px;margin-top:14px;font-weight:700;font-size:13px"><span>TOTAL GENERAL DE DESCUENTOS</span><span>'+fmtMoney(totGrand)+'</span></div>';
}

function onCambiarPeriodoBalance(){
  const p=document.getElementById('bal-periodo').value;
  const div=document.getElementById('bal-custom-dates');
  if(div) div.style.display = p==='custom'?'flex':'none';
  renderTablaBalanceVendedores();
}

function getRangoBalance(){
  const p=(document.getElementById('bal-periodo')||{}).value||'todo';
  if(p==='todo') return {ini:null,fin:null};
  const hoy=new Date(); hoy.setHours(23,59,59,999);
  const ini=new Date(); ini.setHours(0,0,0,0);
  if(p==='semana'){ ini.setDate(ini.getDate()-ini.getDay()); }
  else if(p==='mes'){ ini.setDate(1); }
  else if(p==='trimestre'){ ini.setMonth(Math.floor(ini.getMonth()/3)*3,1); }
  else if(p==='semestre'){ ini.setMonth(Math.floor(ini.getMonth()/6)*6,1); }
  else if(p==='anio'){ ini.setMonth(0,1); }
  else if(p==='custom'){
    const vi=(document.getElementById('bal-fecha-ini')||{}).value;
    const vf=(document.getElementById('bal-fecha-fin')||{}).value;
    return {ini:vi?new Date(vi+'T00:00:00'):null, fin:vf?new Date(vf+'T23:59:59'):null};
  }
  return {ini,fin:hoy};
}

function renderTablaBalanceVendedores(){
  const tbody=document.getElementById('bal-vend-tbody');
  if(!tbody) return;
  const fV=(document.getElementById('bal-fvend')||{}).value||'';
  const {ini,fin}=getRangoBalance();
  const enRango=fecha=>{
    if(!ini&&!fin) return true;
    const d=new Date(fecha);
    if(ini&&d<ini) return false;
    if(fin&&d>fin) return false;
    return true;
  };
  const vO=[...vendedores].sort((a,b)=>a.nombre.localeCompare(b.nombre))
    .filter(v=>!fV||v.nombre===fV);
  const filas=vO.map(v=>{
    const cv=comisiones.filter(cm=>cm.vendedor===v.nombre&&enRango(cm.fechaInicio||cm.fecha||'')).reduce((s,cm)=>s+(cm.comisionVendedor||0),0);
    const liqV=liquidaciones.filter(l=>l.vendedor===v.nombre&&enRango(l.fecha||'')).reduce((s,l)=>s+(l.totalNeto||0),0);
    // Pagado = solo pagos de liquidación (excluye anticipos)
    const pagV=movPagos.filter(m=>m.vendedor===v.nombre&&m.tipo!=='Anticipo'&&enRango(m.fecha||'')).reduce((s,m)=>s+(parseFloat(m.monto)||0),0);
    // Anticipos pendientes = emitidos − descontados en liquidaciones
    const antEmitidos=movPagos.filter(m=>m.vendedor===v.nombre&&m.tipo==='Anticipo').reduce((s,m)=>s+(parseFloat(m.monto)||0),0);
    const antDescontados=liquidaciones.filter(l=>l.vendedor===v.nombre).reduce((s,l)=>s+((l.descuentosAplicados||[]).filter(d=>/^anticipo/i.test(d.nombre||'')).reduce((ss,d)=>ss+(parseFloat(d.monto)||0),0)),0);
    const antV=Math.max(0,antEmitidos-antDescontados);
    if(!cv&&!liqV&&!pagV) return '';
    // Pendiente = liquidado − pagado − anticipos pendientes
    const pend=liqV-pagV-antV;
    const pendColor=pend<0?'#16a34a':pend>0?'#dc2626':'#64748b';
    const pendStr=pend===0?'—':(pend<0?'<span style="color:#16a34a;font-weight:600">'+fmtMoney(pend)+'</span>':'<span style="color:#dc2626;font-weight:600">'+fmtMoney(pend)+'</span>');
    return`<tr>
      <td>${v.nombre}</td>
      <td style="text-align:right">${fmtMoney(cv)}</td>
      <td style="text-align:right">${fmtMoney(liqV)}</td>
      <td style="text-align:right">${fmtMoney(pagV)}</td>
      <td style="text-align:right;color:#d97706">${antV?fmtMoney(antV):'—'}</td>
      <td style="text-align:right">${pendStr}</td>
    </tr>`;
  }).join('');
  tbody.innerHTML=filas||`<tr><td colspan="6"><div class="empty-state">Sin datos para el período seleccionado.</div></td></tr>`;
  // Totals
  let tv_cv=0,tv_liq=0,tv_pag=0,tv_ant=0,tv_pend=0;
  vO.forEach(v=>{
    const cv=comisiones.filter(cm=>cm.vendedor===v.nombre&&enRango(cm.fechaInicio||cm.fecha||'')).reduce((s,cm)=>s+(cm.comisionVendedor||0),0);
    const liqV=liquidaciones.filter(l=>l.vendedor===v.nombre&&enRango(l.fecha||'')).reduce((s,l)=>s+(l.totalNeto||0),0);
    const pagV=movPagos.filter(m=>m.vendedor===v.nombre&&m.tipo!=='Anticipo'&&enRango(m.fecha||'')).reduce((s,m)=>s+(parseFloat(m.monto)||0),0);
    const antE=movPagos.filter(m=>m.vendedor===v.nombre&&m.tipo==='Anticipo').reduce((s,m)=>s+(parseFloat(m.monto)||0),0);
    const antD=liquidaciones.filter(l=>l.vendedor===v.nombre).reduce((s,l)=>s+((l.descuentosAplicados||[]).filter(d=>/^anticipo/i.test(d.nombre||'')).reduce((ss,d)=>ss+(parseFloat(d.monto)||0),0)),0);
    const antV=Math.max(0,antE-antD);
    if(!cv&&!liqV&&!pagV) return;
    tv_cv+=cv; tv_liq+=liqV; tv_pag+=pagV; tv_ant+=antV; tv_pend+=liqV-pagV-antV;
  });
  const tpendColor=tv_pend<0?'#16a34a':tv_pend>0?'#dc2626':'#64748b';
  const tfootV=tbody.closest('table').querySelector('tfoot')||tbody.closest('table').appendChild(document.createElement('tfoot'));
  tfootV.innerHTML=`<tr style="background:#f1f5f9;font-weight:700"><td>TOTAL</td><td style="text-align:right">${fmtMoney(tv_cv)}</td><td style="text-align:right">${fmtMoney(tv_liq)}</td><td style="text-align:right">${fmtMoney(tv_pag)}</td><td style="text-align:right;color:#d97706">${tv_ant?fmtMoney(tv_ant):'—'}</td><td style="text-align:right;color:${tpendColor}">${fmtMoney(tv_pend)}</td></tr>`;
}

function exportarBalanceComisionesCSV(){
  const tb=comisiones.reduce((s,cm)=>s+(cm.comisionBroker||0),0);
  const tv=comisiones.reduce((s,cm)=>s+(cm.comisionVendedor||0),0);
  const facturado=liqCobros.reduce((s,l)=>s+(l.total||l.totalNeto||0),0);
  const liquidado=liqCobros.reduce((s,l)=>s+(l.totalNeto||0),0);
  const retenciones=liqCobros.reduce((s,l)=>s+((l.descuentosAplicados||[]).filter(d=>!/^anticipo/i.test(d.nombre||'')).reduce((ss,d)=>ss+(parseFloat(d.monto)||0),0)),0);
  const anticiposDesc=liqCobros.reduce((s,l)=>s+((l.descuentosAplicados||[]).filter(d=>/^anticipo/i.test(d.nombre||'')).reduce((ss,d)=>ss+(parseFloat(d.monto)||0),0)),0);
  const cobrado=movCobros.reduce((s,m)=>s+(parseFloat(m.monto)||0),0);
  const pendienteCobro=facturado-retenciones-anticiposDesc-cobrado;
  const pagado=movPagos.reduce((s,m)=>s+(parseFloat(m.monto)||0),0);
  const fecha=new Date().toLocaleDateString('es-EC');
  // Leer filtros activos del balance en pantalla
  const fV=(document.getElementById('bal-fvend')||{}).value||'';
  const {ini,fin}=getRangoBalance();
  const enRango=f=>{if(!ini&&!fin)return true;const d=new Date(f);if(ini&&d<ini)return false;if(fin&&d>fin)return false;return true;};
  let csv=`BALANCE DE COMISIONES - REYNA SEGUROS GESTION\nFecha:,${fecha}\n\n`;
  csv+=`RESUMEN GENERAL\nCom. Broker Total:,${tb}\nCom. Vendedores:,${tv}\nNeto Broker:,${tb-tv}\n\n`;
  csv+=`RESUMEN COBROS ASEGURADORAS\nFacturado:,${facturado}\nLiquidado:,${liquidado}\nRetenciones:,-${retenciones}\nAnticipos descontados:,-${anticiposDesc}\nCobrado:,${cobrado}\nPendiente de cobro:,${pendienteCobro}\n\n`;
  csv+=`DETALLE POR VENDEDOR\nVendedor,Com. Generadas,Liquidado,Pagado,Anticipos Pendientes,Pendiente Pagar\n`;
  [...vendedores].sort((a,b)=>a.nombre.localeCompare(b.nombre))
    .filter(v=>!fV||v.nombre===fV)
    .forEach(v=>{
      const cv=comisiones.filter(cm=>cm.vendedor===v.nombre&&enRango(cm.fechaInicio||cm.fecha||'')).reduce((s,cm)=>s+(cm.comisionVendedor||0),0);
      const liqV=liquidaciones.filter(l=>l.vendedor===v.nombre&&enRango(l.fecha||'')).reduce((s,l)=>s+(l.totalNeto||0),0);
      const pagV=movPagos.filter(m=>m.vendedor===v.nombre&&m.tipo!=='Anticipo'&&enRango(m.fecha||'')).reduce((s,m)=>s+(parseFloat(m.monto)||0),0);
      const antEmitidos=movPagos.filter(m=>m.vendedor===v.nombre&&m.tipo==='Anticipo').reduce((s,m)=>s+(parseFloat(m.monto)||0),0);
      const antDescontados=liquidaciones.filter(l=>l.vendedor===v.nombre).reduce((s,l)=>s+((l.descuentosAplicados||[]).filter(d=>/^anticipo/i.test(d.nombre||'')).reduce((ss,d)=>ss+(parseFloat(d.monto)||0),0)),0);
      const antV=Math.max(0,antEmitidos-antDescontados);
      if(!cv&&!liqV&&!pagV) return;
      csv+=`"${v.nombre}",${cv},${liqV},${pagV},${antV},${liqV-pagV-antV}\n`;
    });
  const blob=new Blob(['\uFEFF'+csv],{type:'text/csv;charset=utf-8'});
  const a=document.createElement('a');a.href=URL.createObjectURL(blob);
  a.download=`balance_comisiones_${new Date().toISOString().split('T')[0]}.csv`;a.click();
}

function exportarBalanceComisionesPDF(){
  const tb=comisiones.reduce((s,cm)=>s+(cm.comisionBroker||0),0);
  const tv=comisiones.reduce((s,cm)=>s+(cm.comisionVendedor||0),0);
  const facturado=liqCobros.reduce((s,l)=>s+(l.total||l.totalNeto||0),0);
  const liquidado=liqCobros.reduce((s,l)=>s+(l.totalNeto||0),0);
  const retenciones=liqCobros.reduce((s,l)=>s+((l.descuentosAplicados||[]).filter(d=>!/^anticipo/i.test(d.nombre||'')).reduce((ss,d)=>ss+(parseFloat(d.monto)||0),0)),0);
  const anticiposDesc=liqCobros.reduce((s,l)=>s+((l.descuentosAplicados||[]).filter(d=>/^anticipo/i.test(d.nombre||'')).reduce((ss,d)=>ss+(parseFloat(d.monto)||0),0)),0);
  const cobrado=movCobros.reduce((s,m)=>s+(parseFloat(m.monto)||0),0);
  const pendienteCobro=facturado-retenciones-anticiposDesc-cobrado;
  const pagado=movPagos.reduce((s,m)=>s+(parseFloat(m.monto)||0),0);
  const fecha=new Date().toLocaleDateString('es-EC');
  const logoB64=document.querySelector('#login-screen .login-logo img').src;
  // Leer filtros activos del balance en pantalla
  const fV=(document.getElementById('bal-fvend')||{}).value||'';
  const {ini,fin}=getRangoBalance();
  const enRango=f=>{if(!ini&&!fin)return true;const d=new Date(f);if(ini&&d<ini)return false;if(fin&&d>fin)return false;return true;};
  // Filtros aseguradoras
  const fA=(document.getElementById('bal-faseg')||{}).value||'';
  const {ini:iniA,fin:finA}=getRangoBalanceAseg();
  const enRangoA=f=>{if(!iniA&&!finA)return true;const d=new Date(f);if(iniA&&d<iniA)return false;if(finA&&d>finA)return false;return true;};
  // Filas aseguradoras
  const filasAseg=[...aseguradoras].sort((a,b)=>a.nombre.localeCompare(b.nombre))
    .filter(a=>!fA||a.nombre===fA)
    .map(a=>{
      const ca  =comisiones.filter(cm=>cm.aseguradora===a.nombre&&enRangoA(cm.fechaInicio||cm.fecha||'')).reduce((s,cm)=>s+(cm.comisionBroker||0),0);
      const liqA=liqCobros.filter(l=>l.aseguradora===a.nombre&&enRangoA(l.fecha||'')).reduce((s,l)=>s+(l.totalNeto||0),0);
      const cobA=movCobros.filter(m=>m.aseguradora===a.nombre&&enRangoA(m.fecha||'')).reduce((s,m)=>s+(parseFloat(m.monto)||0),0);
      const dA  =liqCobros.filter(l=>l.aseguradora===a.nombre&&enRangoA(l.fecha||'')).reduce((s,l)=>s+((l.descuentosAplicados||[]).reduce((ss,d)=>ss+(parseFloat(d.monto)||0),0)),0);
      if(!ca&&!liqA&&!cobA) return'';
      return`<tr><td>${a.nombre}</td><td style="text-align:right">${fmtMoney(ca)}</td><td style="text-align:right">${fmtMoney(liqA)}</td><td style="text-align:right;color:#dc2626">${dA?'-'+fmtMoney(dA):'—'}</td><td style="text-align:right">${fmtMoney(cobA)}</td><td style="text-align:right;color:#dc2626;font-weight:700">${fmtMoney(Math.max(0,liqA-cobA))}</td></tr>`;
    }).join('');
  // Filas vendedores
  const filas=[...vendedores].sort((a,b)=>a.nombre.localeCompare(b.nombre))
    .filter(v=>!fV||v.nombre===fV)
    .map(v=>{
      const cv=comisiones.filter(cm=>cm.vendedor===v.nombre&&enRango(cm.fechaInicio||cm.fecha||'')).reduce((s,cm)=>s+(cm.comisionVendedor||0),0);
      const liqV=liquidaciones.filter(l=>l.vendedor===v.nombre&&enRango(l.fecha||'')).reduce((s,l)=>s+(l.totalNeto||0),0);
      const pagV=movPagos.filter(m=>m.vendedor===v.nombre&&m.tipo!=='Anticipo'&&enRango(m.fecha||'')).reduce((s,m)=>s+(parseFloat(m.monto)||0),0);
      const antEmitidos=movPagos.filter(m=>m.vendedor===v.nombre&&m.tipo==='Anticipo').reduce((s,m)=>s+(parseFloat(m.monto)||0),0);
      const antDescontados=liquidaciones.filter(l=>l.vendedor===v.nombre).reduce((s,l)=>s+((l.descuentosAplicados||[]).filter(d=>/^anticipo/i.test(d.nombre||'')).reduce((ss,d)=>ss+(parseFloat(d.monto)||0),0)),0);
      const antV=Math.max(0,antEmitidos-antDescontados);
      if(!cv&&!liqV&&!pagV) return '';
      const pend=liqV-pagV-antV;
      const pendColor=pend<0?'#16a34a':pend>0?'#dc2626':'#94a3b8';
      return`<tr><td>${v.nombre}</td><td style="text-align:right">${fmtMoney(cv)}</td><td style="text-align:right">${fmtMoney(liqV)}</td><td style="text-align:right">${fmtMoney(pagV)}</td><td style="text-align:right;color:#d97706">${antV?fmtMoney(antV):'—'}</td><td style="text-align:right;color:${pendColor};font-weight:700">${pend===0?'—':fmtMoney(pend)}</td></tr>`;
    }).join('');
  // Compute totals for PDF tfoot rows
  let tA_ca=0,tA_liq=0,tA_dA=0,tA_cob=0,tA_pend=0;
  [...aseguradoras].forEach(a=>{
    const ca=comisiones.filter(cm=>cm.aseguradora===a.nombre&&enRango(cm.fechaInicio||cm.fecha||'')).reduce((s,cm)=>s+(cm.comisionBroker||0),0);
    if(!ca) return;
    const liqA=liqCobros.filter(l=>l.aseguradora===a.nombre&&enRango(l.fecha||'')).reduce((s,l)=>s+(l.total||l.totalNeto||0),0);
    const cobA=movCobros.filter(m=>m.aseguradora===a.nombre&&enRango(m.fecha||'')).reduce((s,m)=>s+(parseFloat(m.monto)||0),0);
    const dA=liqCobros.filter(l=>l.aseguradora===a.nombre&&enRango(l.fecha||'')).reduce((s,l)=>s+((l.descuentosAplicados||[]).filter(d=>!/^anticipo/i.test(d.nombre||'')).reduce((ss,d)=>ss+(parseFloat(d.monto)||0),0)),0);
    tA_ca+=ca;tA_liq+=liqA;tA_dA+=dA;tA_cob+=cobA;tA_pend+=Math.max(0,liqA-cobA);
  });
  let tV_cv=0,tV_liq=0,tV_pag=0,tV_ant=0,tV_pend=0;
  [...vendedores].filter(v=>!fV||v.nombre===fV).forEach(v=>{
    const cv=comisiones.filter(cm=>cm.vendedor===v.nombre&&enRango(cm.fechaInicio||cm.fecha||'')).reduce((s,cm)=>s+(cm.comisionVendedor||0),0);
    const liqV=liquidaciones.filter(l=>l.vendedor===v.nombre&&enRango(l.fecha||'')).reduce((s,l)=>s+(l.totalNeto||0),0);
    const pagV=movPagos.filter(m=>m.vendedor===v.nombre&&m.tipo!=='Anticipo'&&enRango(m.fecha||'')).reduce((s,m)=>s+(parseFloat(m.monto)||0),0);
    const antE=movPagos.filter(m=>m.vendedor===v.nombre&&m.tipo==='Anticipo').reduce((s,m)=>s+(parseFloat(m.monto)||0),0);
    const antD=liquidaciones.filter(l=>l.vendedor===v.nombre).reduce((s,l)=>s+((l.descuentosAplicados||[]).filter(d=>/^anticipo/i.test(d.nombre||'')).reduce((ss,d)=>ss+(parseFloat(d.monto)||0),0)),0);
    const antV=Math.max(0,antE-antD);
    if(!cv&&!liqV&&!pagV) return;
    tV_cv+=cv;tV_liq+=liqV;tV_pag+=pagV;tV_ant+=antV;tV_pend+=liqV-pagV-antV;
  });
  const tV_pendColor=tV_pend<0?'#16a34a':tV_pend>0?'#dc2626':'#94a3b8';
  // Maps completos de descuentos (incluyendo anticipos) para tabla detalle PDF
  const descCobMapAll={},descPagMapAll={};
  liqCobros.forEach(l=>(l.descuentosAplicados||[]).forEach(d=>{const n=d.nombre||'';if(!descCobMapAll[n])descCobMapAll[n]=0;descCobMapAll[n]+=parseFloat(d.monto)||0;}));
  liquidaciones.forEach(l=>(l.descuentosAplicados||[]).forEach(d=>{const n=d.nombre||'';if(!descPagMapAll[n])descPagMapAll[n]=0;descPagMapAll[n]+=parseFloat(d.monto)||0;}));
  const html=`<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"><title>Balance_Liquidaciones_${new Date().toISOString().split('T')[0]}</title><style>*{box-sizing:border-box;margin:0;padding:0}body{font-family:Arial,sans-serif;font-size:12px;color:#1a1a2e;padding:2rem}.header{display:flex;align-items:center;gap:16px;border-bottom:2px solid #1a2744;padding-bottom:12px;margin-bottom:16px}.logo{width:50px;height:50px;border-radius:8px;overflow:hidden;flex-shrink:0}.logo img{width:100%;height:100%;object-fit:cover}.brand-name{font-size:14px;font-weight:700;color:#1a2744}.brand-sub{font-size:10px;color:#64748b}.rep-title{text-align:right;font-size:14px;font-weight:700;color:#1a2744}.rep-meta{font-size:10px;color:#64748b}.section{font-size:10px;font-weight:700;letter-spacing:0.07em;color:#fff;background:#1a2744;padding:4px 8px;border-radius:3px;margin:12px 0 6px;text-transform:uppercase}.grid{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:12px}.card{background:#f8fafc;border:1px solid #e2e8f0;border-radius:6px;padding:8px 10px}.card-lbl{font-size:9px;color:#64748b;text-transform:uppercase;margin-bottom:2px}.card-val{font-size:16px;font-weight:700}.blue{color:#1a2744}.green{color:#16a34a}.amber{color:#d97706}.red{color:#dc2626}table{width:100%;border-collapse:collapse;font-size:11px;margin-bottom:8px}th{text-align:left;padding:5px 7px;background:#e8ecf4;color:#1a2744;font-size:9px;font-weight:700;text-transform:uppercase}td{padding:5px 7px;border-bottom:0.5px solid #e2e8f0}tfoot tr{background:#e8ecf4;font-weight:700}.sec{font-size:10px;font-weight:700;color:#fff;padding:4px 8px;border-radius:3px;margin:10px 0 4px;text-transform:uppercase}.grand{display:flex;justify-content:space-between;align-items:center;background:#1a2744;color:#fff;border-radius:5px;padding:8px 12px;margin-top:10px;font-weight:700;font-size:11px}.footer{text-align:center;font-size:9px;color:#94a3b8;margin-top:12px;border-top:1px solid #e2e8f0;padding-top:8px}</style></head><body>
  <div class="header"><div class="logo"><img src="${logoB64}" alt="Reyna Seguros"></div><div style="flex:1"><div class="brand-name">Reyna Seguros Gesti\u00f3n</div><div class="brand-sub">Asesor\u00eda experta y protecci\u00f3n a tu medida</div></div><div><div class="rep-title">Balance de liquidaciones</div><div class="rep-meta">Fecha: ${fecha}</div></div></div>
  <div class="section">Resumen de cobros a aseguradoras</div>
  <div class="grid"><div class="card"><div class="card-lbl">Facturado</div><div class="card-val blue">${fmtMoney(facturado)}</div></div><div class="card"><div class="card-lbl">Liquidado</div><div class="card-val blue">${fmtMoney(liquidado)}</div></div><div class="card"><div class="card-lbl">Retenciones</div><div class="card-val red">-${fmtMoney(retenciones)}</div></div>${anticiposDesc?`<div class="card"><div class="card-lbl">Anticipos</div><div class="card-val amber">-${fmtMoney(anticiposDesc)}</div></div>`:''}<div class="card"><div class="card-lbl">Cobrado</div><div class="card-val green">${fmtMoney(cobrado)}</div></div><div class="card"><div class="card-lbl">Pendiente de cobro</div><div class="card-val ${pendienteCobro>0?'red':'green'}">${fmtMoney(pendienteCobro)}</div></div></div>
  <div class="section">Balance por aseguradora</div>
  <table><thead><tr><th>Aseguradora</th><th style="text-align:right">Com. Generadas</th><th style="text-align:right">Liquidado</th><th style="text-align:right">Descuentos</th><th style="text-align:right">Cobrado</th><th style="text-align:right">Pendiente Cobro</th></tr></thead><tbody>${filasAseg||'<tr><td colspan="6" style="text-align:center;color:#94a3b8">Sin datos</td></tr>'}</tbody><tfoot><tr><td>TOTAL</td><td style="text-align:right">${fmtMoney(tA_ca)}</td><td style="text-align:right">${fmtMoney(tA_liq)}</td><td style="text-align:right;color:#dc2626">${tA_dA?'-'+fmtMoney(tA_dA):'—'}</td><td style="text-align:right">${fmtMoney(tA_cob)}</td><td style="text-align:right;color:#dc2626">${fmtMoney(tA_pend)}</td></tr></tfoot></table>
  <div class="section">Balance por vendedor</div>
  <table><thead><tr><th>Vendedor</th><th style="text-align:right">Com. Generadas</th><th style="text-align:right">Liquidado</th><th style="text-align:right">Pagado</th><th style="text-align:right">Anticipos</th><th style="text-align:right">Pendiente Pagar</th></tr></thead><tbody>${filas||'<tr><td colspan="6" style="text-align:center;color:#94a3b8">Sin datos</td></tr>'}</tbody><tfoot><tr><td>TOTAL</td><td style="text-align:right">${fmtMoney(tV_cv)}</td><td style="text-align:right">${fmtMoney(tV_liq)}</td><td style="text-align:right">${fmtMoney(tV_pag)}</td><td style="text-align:right;color:#d97706">${tV_ant?fmtMoney(tV_ant):'—'}</td><td style="text-align:right;color:${tV_pendColor}">${fmtMoney(tV_pend)}</td></tr></tfoot></table>
  <div class="section">Detalle de descuentos y retenciones</div>
  ${_buildDescPDFDual(descCobMapAll,descPagMapAll)}
  <div class="footer">${FOOTER_TEXT}</div></body></html>`;
  const w=window.open('','_blank');w.document.write(html);w.document.close();w.print();
}


// ════════════════════════════════════════════════════════════════════
