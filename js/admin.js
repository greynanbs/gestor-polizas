// MÓDULO ADMINISTRACIÓN
// ════════════════════════════════════════════════════════════════════
function cambiarSubtabAdmin(sub) {
  adminSubtab=sub;
  document.querySelectorAll('#view-admin .subtab').forEach(b=>b.classList.toggle('active',b.dataset.sub===sub));
  renderAdmin();
}
function renderAdmin() {
  const c=document.getElementById('admin-content');
  if(adminSubtab==='aseguradoras')return renderAdminAseguradoras(c);
  if(adminSubtab==='ramos')return renderAdminRamos(c);
  if(adminSubtab==='vendedores')return renderAdminVendedores(c);
  if(adminSubtab==='usuarios')return renderAdminUsuarios(c);
  if(adminSubtab==='descuentos')return renderAdminDescuentos(c);
  if(adminSubtab==='resumen')return renderAdminResumen(c);
}

// ── ASEGURADORAS ─────────────────────────────────────────────────────
function renderAdminAseguradoras(c) {
  const canDel=puedeEliminar();
  const lista=[...aseguradoras].sort((a,b)=>a.nombre.localeCompare(b.nombre));
  c.innerHTML=`<div style="display:flex;justify-content:flex-end;margin-bottom:10px"><button class="btn btn-primary btn-sm" onclick="abrirModalAseguradora()"><i class="ti ti-plus" aria-hidden="true"></i> Nueva aseguradora</button></div><div class="card-list">${lista.map(a=>{const rConPct=ramos.filter(r=>(a.comisiones&&a.comisiones[r.nombre]>0));return`<div class="list-card"><div><div class="list-card-title">${a.nombre}</div><div class="list-card-sub">${rConPct.length?rConPct.map(r=>`${r.nombre}: ${a.comisiones[r.nombre]}%`).join(' · '):'Sin comisiones configuradas'}</div></div><div class="row-actions"><button class="btn-icon" onclick="abrirModalAseguradora('${a.id}')" title="Editar"><i class="ti ti-edit"></i></button>${canDel?`<button class="btn-icon danger" onclick="eliminarAseguradora('${a.id}')" title="Eliminar"><i class="ti ti-trash"></i></button>`:''}</div></div>`;}).join('')||'<div class="empty-state"><i class="ti ti-building"></i>No hay aseguradoras.</div>'}</div>`;
}
function abrirModalAseguradora(id=null) {
  editingId=id;
  document.getElementById('aseg-title').textContent=id?'Editar aseguradora':'Nueva aseguradora';
  const rO=[...ramos].sort((a,b)=>a.nombre.localeCompare(b.nombre));
  const aseg=id?aseguradoras.find(x=>x.id===id):null;
  document.getElementById('aseg-nombre').value=aseg?aseg.nombre:'';
  document.getElementById('aseg-pct-body').innerHTML=rO.map(r=>{const val=(aseg?.comisiones?.[r.nombre])||0;return`<tr><td>${r.nombre}</td><td><input type="number" step="0.01" min="0" max="100" data-ramo="${r.nombre}" class="aseg-pct-input" value="${val}"></td></tr>`;}).join('');
  document.getElementById('aseg-error').style.display='none';
  abrirOverlay('overlay-aseguradora');
}
async function guardarAseguradora() {
  const nombre=document.getElementById('aseg-nombre').value.trim().toUpperCase();
  const err=document.getElementById('aseg-error');
  if(!nombre){err.textContent='Nombre obligatorio';err.style.display='block';return;}
  const comisiones={};
  document.querySelectorAll('.aseg-pct-input').forEach(i=>comisiones[i.dataset.ramo]=parseFloat(i.value)||0);
  try {
    if(editingId){const a=await apiPut('aseguradoras',editingId,{nombre,comisiones});const i=aseguradoras.findIndex(x=>x.id===editingId);aseguradoras[i]=a;mostrarToast('Aseguradora actualizada');}
    else{const nv=await apiPost('aseguradoras',{nombre,comisiones});aseguradoras.push(nv);mostrarToast('Aseguradora creada');}
    poblarSelects();cerrarModal('overlay-aseguradora');renderAdmin();
  }catch(e){err.textContent='Error al guardar';err.style.display='block';}
}
async function eliminarAseguradora(id) {
  if(!confirm('¿Eliminar esta aseguradora?'))return;
  try{await apiDel('aseguradoras',id);aseguradoras=aseguradoras.filter(x=>x.id!==id);poblarSelects();renderAdmin();mostrarToast('Aseguradora eliminada');}catch(e){mostrarToast('Error al eliminar');}
}

// ── RAMOS ─────────────────────────────────────────────────────────────
function renderAdminRamos(c) {
  const canDel=puedeEliminar();
  const lista=[...ramos].sort((a,b)=>a.nombre.localeCompare(b.nombre));
  c.innerHTML=`<div style="display:flex;justify-content:flex-end;margin-bottom:10px"><button class="btn btn-primary btn-sm" onclick="abrirModalRamo()"><i class="ti ti-plus" aria-hidden="true"></i> Nuevo ramo</button></div><div class="card-list">${lista.map(r=>`<div class="list-card"><div class="list-card-title">${r.nombre}</div><div class="row-actions"><button class="btn-icon" onclick="abrirModalRamo('${r.id}')" title="Editar"><i class="ti ti-edit"></i></button>${canDel?`<button class="btn-icon danger" onclick="eliminarRamo('${r.id}')" title="Eliminar"><i class="ti ti-trash"></i></button>`:''}</div></div>`).join('')||'<div class="empty-state">No hay ramos.</div>'}</div>`;
}
function abrirModalRamo(id=null){editingId=id;document.getElementById('ramo-title').textContent=id?'Editar ramo':'Nuevo ramo';const r=id?ramos.find(x=>x.id===id):null;document.getElementById('ramo-nombre').value=r?r.nombre:'';document.getElementById('ramo-error').style.display='none';abrirOverlay('overlay-ramo');}
async function guardarRamo(){const nombre=document.getElementById('ramo-nombre').value.trim().toUpperCase();const err=document.getElementById('ramo-error');if(!nombre){err.textContent='Nombre obligatorio';err.style.display='block';return;}try{if(editingId){const a=await apiPut('ramos',editingId,{nombre});const i=ramos.findIndex(x=>x.id===editingId);ramos[i]=a;mostrarToast('Ramo actualizado');}else{const nv=await apiPost('ramos',{nombre});ramos.push(nv);mostrarToast('Ramo creado');}poblarSelects();cerrarModal('overlay-ramo');renderAdmin();}catch(e){err.textContent='Error al guardar';err.style.display='block';}}
async function eliminarRamo(id){if(!confirm('¿Eliminar este ramo?'))return;try{await apiDel('ramos',id);ramos=ramos.filter(x=>x.id!==id);poblarSelects();renderAdmin();mostrarToast('Ramo eliminado');}catch(e){mostrarToast('Error al eliminar');}}

// ── VENDEDORES ────────────────────────────────────────────────────────
function renderAdminVendedores(c) {
  const canDel=puedeEliminar();
  const lista=[...vendedores].sort((a,b)=>a.nombre.localeCompare(b.nombre));
  c.innerHTML=`<div style="display:flex;justify-content:flex-end;margin-bottom:10px"><button class="btn btn-primary btn-sm" onclick="abrirModalVendedor()"><i class="ti ti-plus" aria-hidden="true"></i> Nuevo vendedor</button></div><div class="card-list">${lista.map(v=>{const rConPct=ramos.filter(r=>(v.comisiones&&v.comisiones[r.nombre]>0));return`<div class="list-card"><div><div class="list-card-title">${v.nombre}</div><div class="list-card-sub">${rConPct.length?rConPct.map(r=>`${r.nombre}: ${v.comisiones[r.nombre]}%`).join(' · '):'Sin comisiones configuradas'}</div></div><div class="row-actions"><button class="btn-icon" onclick="abrirModalVendedor('${v.id}')" title="Editar"><i class="ti ti-edit"></i></button>${canDel?`<button class="btn-icon danger" onclick="eliminarVendedor('${v.id}')" title="Eliminar"><i class="ti ti-trash"></i></button>`:''}</div></div>`;}).join('')||'<div class="empty-state">No hay vendedores.</div>'}</div>`;
}

function cambiarTabVendedor(tab) {
  const tabs = ['datos','pct','anticipos','balance'];
  tabs.forEach(t => {
    const panel = document.getElementById('vend-panel-' + t);
    const btn   = document.getElementById('vend-tab-' + t);
    if (panel) panel.style.display = t === tab ? 'block' : 'none';
    if (btn) {
      btn.style.borderBottomColor = t === tab ? '#1a2744' : 'transparent';
      btn.style.color             = t === tab ? '#1a2744' : '#64748b';
    }
  });
  if (tab === 'anticipos' && editingId) renderAnticiposVendedor(editingId);
  if (tab === 'balance'   && editingId) renderBalanceVendedor(editingId);
}

function renderAnticiposVendedor(id) {
  const v = vendedores.find(x => x.id === id);
  if (!v) return;
  const c = document.getElementById('vend-anticipos-content');
  const anticipos = movPagos.filter(m => m.vendedor === v.nombre && m.tipo === 'Anticipo');
  if (!anticipos.length) {
    c.innerHTML = '<div class="empty-state" style="padding:1rem"><i class="ti ti-cash-off"></i> Sin anticipos registrados.</div>';
    return;
  }

  // Para cada anticipo, busca cuánto se descontó en liquidaciones
  // Los descuentos de anticipos en liquidaciones tienen nombre que empieza con "Anticipo"
  const totalEmitido = anticipos.reduce((s,a) => s + (parseFloat(a.monto)||0), 0);
  const totalDescontado = liquidaciones.filter(l => l.vendedor === v.nombre)
    .reduce((s,l) => s + ((l.descuentosAplicados||[])
      .filter(d => /^anticipo/i.test(d.nombre||''))
      .reduce((ss,d) => ss + (parseFloat(d.monto)||0), 0)), 0);
  const saldoPendiente = Math.max(0, totalEmitido - totalDescontado);

  // Construir líneas detalladas: anticipos emitidos + descuentos aplicados cronológicamente
  const lineas = [];
  anticipos.forEach(a => {
    lineas.push({ fecha: a.fecha, desc: a.descripcion || 'Anticipo entregado', monto: parseFloat(a.monto)||0, tipo: 'anticipo' });
  });
  liquidaciones.filter(l => l.vendedor === v.nombre).forEach(l => {
    (l.descuentosAplicados||[]).filter(d => /^anticipo/i.test(d.nombre||'')).forEach(d => {
      lineas.push({ fecha: l.fecha, desc: 'Descuento en liquidación (' + fd(l.fecha) + ')', monto: -(parseFloat(d.monto)||0), tipo: 'descuento' });
    });
  });
  lineas.sort((a,b) => (a.fecha||'') < (b.fecha||'') ? -1 : 1);

  const filas = lineas.map(ln =>
    '<tr style="border-top:0.5px solid #f1f5f9">' +
      '<td style="padding:5px 8px;font-size:12px">' + fd(ln.fecha) + '</td>' +
      '<td style="padding:5px 8px;font-size:12px">' + ln.desc + '</td>' +
      '<td style="padding:5px 8px;text-align:right;font-size:12px;font-weight:600;color:' + (ln.monto >= 0 ? '#d97706' : '#dc2626') + '">' +
        (ln.monto >= 0 ? fmtMoney(ln.monto) : '-' + fmtMoney(Math.abs(ln.monto))) +
      '</td>' +
    '</tr>'
  ).join('');

  c.innerHTML =
    '<div style="display:flex;gap:10px;margin-bottom:12px">' +
      '<div style="flex:1;background:#fef3c7;border-radius:8px;padding:10px;text-align:center">' +
        '<div style="font-size:11px;color:#92400e;font-weight:600">EMITIDO</div>' +
        '<div style="font-size:16px;font-weight:700;color:#d97706">' + fmtMoney(totalEmitido) + '</div>' +
      '</div>' +
      '<div style="flex:1;background:#fef2f2;border-radius:8px;padding:10px;text-align:center">' +
        '<div style="font-size:11px;color:#991b1b;font-weight:600">DESCONTADO</div>' +
        '<div style="font-size:16px;font-weight:700;color:#dc2626">' + fmtMoney(totalDescontado) + '</div>' +
      '</div>' +
      '<div style="flex:1;background:' + (saldoPendiente > 0 ? '#fffbeb' : '#f0fdf4') + ';border-radius:8px;padding:10px;text-align:center">' +
        '<div style="font-size:11px;color:' + (saldoPendiente > 0 ? '#92400e' : '#166534') + ';font-weight:600">SALDO PENDIENTE</div>' +
        '<div style="font-size:16px;font-weight:700;color:' + (saldoPendiente > 0 ? '#d97706' : '#16a34a') + '">' + fmtMoney(saldoPendiente) + '</div>' +
      '</div>' +
    '</div>' +
    '<div style="max-height:240px;overflow-y:auto">' +
      '<table style="width:100%;font-size:12px;border-collapse:collapse">' +
        '<thead><tr style="background:#f8fafc">' +
          '<th style="text-align:left;padding:5px 8px;font-size:10px;font-weight:600;color:#64748b;text-transform:uppercase;border-bottom:1px solid #e2e8f0">Fecha</th>' +
          '<th style="text-align:left;padding:5px 8px;font-size:10px;font-weight:600;color:#64748b;text-transform:uppercase;border-bottom:1px solid #e2e8f0">Descripción</th>' +
          '<th style="text-align:right;padding:5px 8px;font-size:10px;font-weight:600;color:#64748b;text-transform:uppercase;border-bottom:1px solid #e2e8f0">Monto</th>' +
        '</tr></thead>' +
        '<tbody>' + filas + '</tbody>' +
      '</table>' +
    '</div>';
}

function renderBalanceVendedor(id) {
  const v = vendedores.find(x => x.id === id);
  if (!v) return;

  // 1. Total comisiones generadas (bruto, sin descuentos)
  const totalGenerado = comisiones.filter(c => c.vendedor === v.nombre)
    .reduce((s,c) => s + (parseFloat(c.comisionVendedor)||0), 0);

  // 2. Retenciones = descuentos en liquidaciones EXCEPTO los de tipo Anticipo
  const totalRetenciones = liquidaciones.filter(l => l.vendedor === v.nombre)
    .reduce((s,l) => s + ((l.descuentosAplicados||[])
      .filter(d => !/^anticipo/i.test(d.nombre||''))
      .reduce((ss,d) => ss + (parseFloat(d.monto)||0), 0)), 0);

  // 3. Anticipos realizados = total de todos los anticipos entregados al vendedor
  const totalAnticiposRealizados = movPagos
    .filter(m => m.vendedor === v.nombre && m.tipo === 'Anticipo')
    .reduce((s,m) => s + (parseFloat(m.monto)||0), 0);

  // 4. Total liquidado al vendedor = suma de totalNeto de liquidaciones emitidas
  //    (= comisiones generadas − retenciones − anticipos descontados en cada liquidación)
  const totalLiquidado = liquidaciones.filter(l => l.vendedor === v.nombre)
    .reduce((s,l) => s + (l.totalNeto||0), 0);

  // 5. Ya pagado al vendedor = pagos de liquidación (movPagos tipo ≠ Anticipo)
  const totalPagado = movPagos
    .filter(m => m.vendedor === v.nombre && m.tipo !== 'Anticipo')
    .reduce((s,m) => s + (parseFloat(m.monto)||0), 0);

  // 6. Anticipos pendientes de descontar = anticipos realizados − lo ya descontado en liquidaciones
  const totalAnticiposDescontados = liquidaciones.filter(l => l.vendedor === v.nombre)
    .reduce((s,l) => s + ((l.descuentosAplicados||[])
      .filter(d => /^anticipo/i.test(d.nombre||''))
      .reduce((ss,d) => ss + (parseFloat(d.monto)||0), 0)), 0);
  const anticiposPendientes = Math.max(0, totalAnticiposRealizados - totalAnticiposDescontados);

  // 7. Saldo pendiente por pagar = totalLiquidado − pagado − anticiposPendientes
  const saldoPendiente = totalLiquidado - totalPagado - anticiposPendientes;

  const colorSaldo = saldoPendiente > 0 ? '#dc2626' : saldoPendiente < 0 ? '#16a34a' : '#64748b';

  document.getElementById('vend-balance-content').innerHTML =
    '<div style="display:flex;flex-direction:column;gap:8px;padding:4px 0">' +

    // 1. Comisiones generadas
    '<div style="display:flex;justify-content:space-between;align-items:center;padding:10px 12px;background:#f8fafc;border-radius:8px">' +
      '<span style="font-size:13px;color:#64748b">Total comisiones generadas</span>' +
      '<strong style="font-size:14px">' + fmtMoney(totalGenerado) + '</strong>' +
    '</div>' +

    // 2. Retenciones (solo si existe)
    (totalRetenciones > 0 ?
    '<div style="display:flex;justify-content:space-between;align-items:center;padding:10px 12px;background:#fef2f2;border-radius:8px">' +
      '<span style="font-size:13px;color:#991b1b">Retenciones y descuentos</span>' +
      '<strong style="font-size:14px;color:#dc2626">-' + fmtMoney(totalRetenciones) + '</strong>' +
    '</div>' : '') +

    // 3. Anticipos descontados = lo ya descontado en liquidaciones (no el total emitido)
    (totalAnticiposDescontados > 0 ?
    '<div style="display:flex;justify-content:space-between;align-items:center;padding:10px 12px;background:#fef3c7;border-radius:8px">' +
      '<span style="font-size:13px;color:#92400e">Anticipos descontados</span>' +
      '<strong style="font-size:14px;color:#d97706">-' + fmtMoney(totalAnticiposDescontados) + '</strong>' +
    '</div>' : '') +

    // 4. Total liquidado
    '<div style="display:flex;justify-content:space-between;align-items:center;padding:10px 12px;background:#f8fafc;border-radius:8px;border-left:3px solid #1a2744">' +
      '<span style="font-size:13px;color:#1a2744;font-weight:600">Total liquidado al vendedor</span>' +
      '<strong style="font-size:14px;color:#1a2744">' + fmtMoney(totalLiquidado) + '</strong>' +
    '</div>' +

    // 5. Ya pagado al vendedor
    '<div style="display:flex;justify-content:space-between;align-items:center;padding:10px 12px;background:#f0fdf4;border-radius:8px">' +
      '<span style="font-size:13px;color:#166534">Ya pagado al vendedor</span>' +
      '<strong style="font-size:14px;color:#16a34a">-' + fmtMoney(totalPagado) + '</strong>' +
    '</div>' +

    // 6. Anticipos pendientes (solo si existe)
    (anticiposPendientes > 0 ?
    '<div style="display:flex;justify-content:space-between;align-items:center;padding:10px 12px;background:#fff7ed;border-radius:8px">' +
      '<span style="font-size:13px;color:#9a3412">Anticipos pendientes de descontar</span>' +
      '<strong style="font-size:14px;color:#ea580c">-' + fmtMoney(anticiposPendientes) + '</strong>' +
    '</div>' : '') +

    // 7. Saldo final
    '<div style="display:flex;justify-content:space-between;align-items:center;padding:13px 14px;background:#1a2744;border-radius:8px;margin-top:4px">' +
      '<span style="font-size:13px;color:#fff;font-weight:600">Saldo pendiente por pagar</span>' +
      '<strong style="font-size:15px;color:' + colorSaldo + '">' + fmtMoney(saldoPendiente) + '</strong>' +
    '</div>' +

    '</div>';
}

function abrirModalVendedor(id = null) {
  editingId = id;
  document.getElementById('vend-title').textContent = id ? 'Editar vendedor' : 'Nuevo vendedor';
  const rO = [...ramos].sort((a, b) => a.nombre.localeCompare(b.nombre));
  const v = id ? vendedores.find(x => x.id === id) : null;

  // Datos generales
  document.getElementById('vend-nombre').value    = v ? v.nombre    : '';
  document.getElementById('vend-cedula').value    = v ? (v.cedula    || '') : '';
  document.getElementById('vend-fnac').value      = v ? (v.fnac      || '') : '';
  document.getElementById('vend-correo').value    = v ? (v.correo    || '') : '';
  document.getElementById('vend-telefono').value  = v ? (v.telefono  || '') : '';
  document.getElementById('vend-direccion').value = v ? (v.direccion || '') : '';

  // Porcentajes
  document.getElementById('vend-pct-body').innerHTML = rO.map(r => {
    const val = (v?.comisiones?.[r.nombre]) || '';
    return '<tr>' +
      '<td style="padding:7px 10px;border-bottom:1px solid #f1f5f9;font-size:13px;color:#1a1a2e;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + r.nombre + '</td>' +
      '<td style="padding:7px 10px;border-bottom:1px solid #f1f5f9;text-align:center">' +
        '<input type="number" step="0.01" min="0" max="100"' +
        ' data-ramo="' + r.nombre + '" class="vend-pct-input pct-inp"' +
        ' value="' + val + '" placeholder="0">' +
      '</td>' +
    '</tr>';
  }).join('');

  document.getElementById('vend-error').style.display = 'none';
  cambiarTabVendedor('datos'); // siempre abre en el primer tab
  abrirOverlay('overlay-vendedor');
}

async function guardarVendedor() {
  const nombre    = document.getElementById('vend-nombre').value.trim().toUpperCase();
  const cedula    = document.getElementById('vend-cedula').value.trim();
  const fnac      = document.getElementById('vend-fnac').value;
  const correo    = document.getElementById('vend-correo').value.trim();
  const telefono  = document.getElementById('vend-telefono').value.trim();
  const direccion = document.getElementById('vend-direccion').value.trim();
  const err = document.getElementById('vend-error');

  if (!nombre) { err.textContent = 'Nombre obligatorio'; err.style.display = 'block'; return; }

  const comisiones = {};
  document.querySelectorAll('.vend-pct-input').forEach(i => comisiones[i.dataset.ramo] = parseFloat(i.value) || 0);

  const payload = { nombre, cedula, fnac, correo, telefono, direccion, comisiones };

  try {
    if (editingId) {
      const a = await apiPut('vendedores', editingId, payload);
      const i = vendedores.findIndex(x => x.id === editingId);
      vendedores[i] = a;
      mostrarToast('Vendedor actualizado');
    } else {
      const nv = await apiPost('vendedores', payload);
      vendedores.push(nv);
      mostrarToast('Vendedor creado');
    }
    poblarSelects();
    cerrarModal('overlay-vendedor');
    renderAdmin();
  } catch (e) {
    err.textContent = 'Error al guardar';
    err.style.display = 'block';
  }
}
async function eliminarVendedor(id){if(!confirm('¿Eliminar este vendedor?'))return;try{await apiDel('vendedores',id);vendedores=vendedores.filter(x=>x.id!==id);poblarSelects();renderAdmin();mostrarToast('Vendedor eliminado');}catch(e){mostrarToast('Error al eliminar');}}

// ── USUARIOS ──────────────────────────────────────────────────────────
function renderAdminUsuarios(c) {
  const canDel=puedeEliminar();
  c.innerHTML=`<div style="display:flex;justify-content:flex-end;margin-bottom:10px"><button class="btn btn-primary btn-sm" onclick="abrirModalUsuario()"><i class="ti ti-plus" aria-hidden="true"></i> Nuevo usuario</button></div><div class="card-list">${usuarios.map(u=>`<div class="list-card"><div><div class="list-card-title">${u.username} <span class="role-badge ${rolClass(u.role)}">${rolLabel(u.role)}</span></div><div class="list-card-sub">${u.vendedor?'Vendedor: '+u.vendedor:'Sin vendedor asociado'} · Contraseña: ${u.password}</div></div><div class="row-actions"><button class="btn-icon" onclick="abrirModalUsuario('${u.id}')" title="Editar"><i class="ti ti-edit"></i></button>${canDel&&u.username!=='greyna'?`<button class="btn-icon danger" onclick="eliminarUsuario('${u.id}')" title="Eliminar"><i class="ti ti-trash"></i></button>`:''}</div></div>`).join('')}</div>`;
}
function abrirModalUsuario(id=null){editingId=id;document.getElementById('user-title').textContent=id?'Editar usuario':'Nuevo usuario';const u=id?usuarios.find(x=>x.id===id):null;document.getElementById('user-username').value=u?u.username:'';document.getElementById('user-password').value=u?u.password:'';document.getElementById('user-role').value=u?u.role:'vendedor';document.getElementById('user-vendedor').value=u?(u.vendedor||''):'';document.getElementById('user-error').style.display='none';toggleGrupoUserVendedor();abrirOverlay('overlay-usuario');}
function toggleGrupoUserVendedor(){const r=document.getElementById('user-role').value;document.getElementById('grupo-user-vendedor').style.display=r==='vendedor'?'block':'none';}
document.addEventListener('change',e=>{if(e.target&&e.target.id==='user-role')toggleGrupoUserVendedor();});
async function guardarUsuario(){const username=document.getElementById('user-username').value.trim().toLowerCase();const password=document.getElementById('user-password').value.trim();const role=document.getElementById('user-role').value;const vendedor=role==='vendedor'?document.getElementById('user-vendedor').value:null;const err=document.getElementById('user-error');if(!username||!password){err.textContent='Usuario y contraseña obligatorios';err.style.display='block';return;}const data={username,password,role,vendedor};try{if(editingId){const a=await apiPut('usuarios',editingId,data);const i=usuarios.findIndex(x=>x.id===editingId);usuarios[i]=a;mostrarToast('Usuario actualizado');if(currentUser.id===editingId){currentUser=a;sessionStorage.setItem('rsg_user',JSON.stringify(a));}}else{const nv=await apiPost('usuarios',data);if(nv.error){err.textContent=nv.error;err.style.display='block';return;}usuarios.push(nv);mostrarToast('Usuario creado');}cerrarModal('overlay-usuario');renderAdmin();}catch(e){err.textContent='Error al guardar';err.style.display='block';}}
async function eliminarUsuario(id){if(!confirm('¿Eliminar este usuario?'))return;try{await apiDel('usuarios',id);usuarios=usuarios.filter(x=>x.id!==id);renderAdmin();mostrarToast('Usuario eliminado');}catch(e){mostrarToast('Error al eliminar');}}

// ── DESCUENTOS ────────────────────────────────────────────────────────
function renderAdminDescuentos(c) {
  const canDel=puedeEliminar();
  const renderLista=(lista,tipo)=>`<div class="card-list">${lista.map(d=>`<div class="list-card"><div><div class="list-card-title">${d.nombre} <span class="badge badge-gray" style="font-size:10px">${d.tipo==='pct'?d.valor+'%':'$'+d.valor} sobre ${d.base}</span></div></div><div class="row-actions"><button class="btn-icon" onclick="abrirModalDescuento('${tipo}','${d.id}')" title="Editar"><i class="ti ti-edit"></i></button>${canDel?`<button class="btn-icon danger" onclick="eliminarDescuento('${tipo}','${d.id}')" title="Eliminar"><i class="ti ti-trash"></i></button>`:''}</div></div>`).join('')||'<div class="empty-state" style="padding:1rem">No hay descuentos.</div>'}</div>`;
  c.innerHTML=`
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem">
      <div>
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
          <div style="font-size:12px;font-weight:600;color:var(--color-text-primary)">Descuentos de Pagos (vendedores)</div>
          <button class="btn btn-primary btn-sm" onclick="abrirModalDescuento('pagos')"><i class="ti ti-plus" aria-hidden="true"></i> Nuevo</button>
        </div>
        ${renderLista(descPagos,'pagos')}
      </div>
      <div>
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
          <div style="font-size:12px;font-weight:600;color:var(--color-text-primary)">Descuentos de Cobros (aseguradoras)</div>
          <button class="btn btn-primary btn-sm" onclick="abrirModalDescuento('cobros')"><i class="ti ti-plus" aria-hidden="true"></i> Nuevo</button>
        </div>
        ${renderLista(descCobros,'cobros')}
      </div>
    </div>`;
}
let editingDescTipo=null;
function abrirModalDescuento(tipo,id=null){
  editingDescTipo=tipo; editingId=id;
  document.getElementById('desc-modal-title').textContent=(id?'Editar':'Nuevo')+' descuento — '+(tipo==='pagos'?'Pagos':'Cobros');
  const lista=tipo==='pagos'?descPagos:descCobros;
  const d=id?lista.find(x=>x.id===id):null;
  document.getElementById('desc-nombre').value=d?d.nombre:'';
  document.getElementById('desc-tipo').value=d?d.tipo:'pct';
  document.getElementById('desc-base').value=d?d.base:'subtotal';
  document.getElementById('desc-valor').value=d?d.valor:0;
  document.getElementById('desc-error').style.display='none';
  abrirOverlay('overlay-descuento');
}
async function guardarDescuento(){
  const nombre=document.getElementById('desc-nombre').value.trim();
  const tipo=document.getElementById('desc-tipo').value;
  const base=document.getElementById('desc-base').value;
  const valor=parseFloat(document.getElementById('desc-valor').value)||0;
  const err=document.getElementById('desc-error');
  if(!nombre){err.textContent='Nombre obligatorio';err.style.display='block';return;}
  const data={nombre,tipo,base,valor,activo:true};
  const seg=editingDescTipo==='pagos'?'descuentos-pagos':'descuentos-cobros';
  try{
    if(editingId){
      const a=await apiPut(seg,editingId,data);
      if(editingDescTipo==='pagos'){const i=descPagos.findIndex(x=>x.id===editingId);descPagos[i]=a;}
      else{const i=descCobros.findIndex(x=>x.id===editingId);descCobros[i]=a;}
      mostrarToast('Descuento actualizado');
    }else{
      const nv=await apiPost(seg,data);
      if(editingDescTipo==='pagos')descPagos.push(nv);else descCobros.push(nv);
      mostrarToast('Descuento creado');
    }
    cerrarModal('overlay-descuento');renderAdmin();
  }catch(e){err.textContent='Error al guardar';err.style.display='block';}
}
async function eliminarDescuento(tipo,id){
  if(!confirm('¿Eliminar este descuento?'))return;
  const seg=tipo==='pagos'?'descuentos-pagos':'descuentos-cobros';
  try{
    await apiDel(seg,id);
    if(tipo==='pagos')descPagos=descPagos.filter(x=>x.id!==id);
    else descCobros=descCobros.filter(x=>x.id!==id);
    renderAdmin();mostrarToast('Descuento eliminado');
  }catch(e){mostrarToast('Error al eliminar');}
}

// ── RESUMEN POR VENDEDOR ──────────────────────────────────────────────
function renderAdminResumen(c) {
  const lista=[...vendedores].sort((a,b)=>a.nombre.localeCompare(b.nombre));
  c.innerHTML=`<div class="table-wrap"><div class="table-scroll"><table><thead><tr><th>Vendedor</th><th style="text-align:center">Pólizas</th><th style="text-align:center">Próx. 30d</th><th style="text-align:right">Primas Netas</th><th style="text-align:right">Com. Bróker</th><th style="text-align:right;color:#16a34a">Com. Vendedor</th></tr></thead><tbody>${lista.map(v=>{const pV=polizas.filter(p=>p.vendedor===v.nombre);const cV=comisiones.filter(cm=>cm.vendedor===v.nombre);const tp=pV.reduce((s,p)=>s+(parseFloat(p.primaNeta)||0),0);const cb=cV.reduce((s,cm)=>s+(cm.comisionBroker||0),0);const cv=cV.reduce((s,cm)=>s+(cm.comisionVendedor||0),0);const prox=pV.filter(p=>{const d=dr(p.vence);return d>=0&&d<=30;}).length;return`<tr><td>${v.nombre}</td><td style="text-align:center">${pV.length}</td><td style="text-align:center">${prox}</td><td style="text-align:right">${fmtMoney(tp)}</td><td style="text-align:right">${fmtMoney(cb)}</td><td style="text-align:right;font-weight:600;color:#16a34a">${fmtMoney(cv)}</td></tr>`;}).join('')}</tbody></table></div></div>`;
}


