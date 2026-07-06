// RENDER PÓLIZAS
// ════════════════════════════════════════════════════════════════════
const SEM_COLORS = ['#dc2626','#d97706','#16a34a'];
const SEM_LABELS = ['Pendiente','Liquidado','Cobrado'];
const SEM_SHADOWS = ['rgba(220,38,38,0.5)','rgba(217,119,6,0.5)','rgba(22,163,74,0.5)'];

function semaforoHtml(idx, polizaId) {
  const i = idx||0;
  return `<span class="sem-dot" data-id="${polizaId}" data-idx="${i}" title="${SEM_LABELS[i]}" style="width:12px;height:12px;border-radius:50%;display:inline-block;background:${SEM_COLORS[i]};box-shadow:0 0 5px ${SEM_SHADOWS[i]};cursor:default;flex-shrink:0"></span>`;
}

function polizasVisibles() {
  if (esVendedorRestringido())
    return polizas.filter(p=>p.vendedor===(currentUser.vendedor||''));
  return polizas;
}

function renderStats() {
  const lista=polizasVisibles();
  const c={vencida:0,critica:0,alerta:0,vigente:0};
  lista.forEach(p=>c[est(dr(p.vence))]++);
  document.getElementById('stats-row').innerHTML=`
    <div class="stat"><div class="stat-label">Total pólizas</div><div class="stat-value blue">${lista.length}</div></div>
    <div class="stat"><div class="stat-label">Vencidas</div><div class="stat-value red">${c.vencida}</div></div>
    <div class="stat"><div class="stat-label">Críticas ≤7d</div><div class="stat-value red">${c.critica}</div></div>
    <div class="stat"><div class="stat-label">Alerta ≤30d</div><div class="stat-value amber">${c.alerta}</div></div>
    <div class="stat"><div class="stat-label">Vigentes</div><div class="stat-value green">${c.vigente}</div></div>`;
}

function renderAlertas() {
  const lista=polizasVisibles();
  const v=lista.filter(p=>dr(p.vence)<0);
  const c=lista.filter(p=>{const d=dr(p.vence);return d>=0&&d<=7;});
  const a=lista.filter(p=>{const d=dr(p.vence);return d>7&&d<=30;});
  let h='';
  if(v.length)h+=`<div class="alert-banner alert-red"><i class="ti ti-alert-triangle" style="font-size:15px;flex-shrink:0;margin-top:1px" aria-hidden="true"></i><div><strong>${v.length} póliza${v.length>1?'s':''} vencida${v.length>1?'s':''}:</strong> ${v.map(p=>p.cliente).join(', ')} — gestionar urgente.</div></div>`;
  if(c.length)h+=`<div class="alert-banner alert-red"><i class="ti ti-bell-ringing" style="font-size:15px;flex-shrink:0;margin-top:1px" aria-hidden="true"></i><div><strong>${c.length} vence en ≤7 días:</strong> ${c.map(p=>`${p.cliente} (${dr(p.vence)}d)`).join(', ')}</div></div>`;
  if(a.length)h+=`<div class="alert-banner alert-amber"><i class="ti ti-bell" style="font-size:15px;flex-shrink:0;margin-top:1px" aria-hidden="true"></i><div><strong>${a.length} vence en ≤30 días:</strong> ${a.map(p=>`${p.cliente} (${dr(p.vence)}d)`).join(', ')}</div></div>`;
  document.getElementById('alertas-banner').innerHTML=h;
}

function renderTabla() {
  const busq=document.getElementById('buscador').value.toLowerCase();
  const fE=document.getElementById('filtro-estado').value;
  const fT=document.getElementById('filtro-ramo').value;
  const fV=document.getElementById('filtro-vendedor').value;
  const canEdit=puedeEditar(), canDel=puedeEliminar();
  let lista=polizasVisibles().filter(p=>{
    const d=dr(p.vence),e=est(d);
    const mb=!busq||p.cliente.toLowerCase().includes(busq)||(p.placa||'').toLowerCase().includes(busq)||p.aseguradora.toLowerCase().includes(busq)||(p.numero||'').toLowerCase().includes(busq);
    return mb&&(!fE||e===fE)&&(!fT||p.tipo===fT)&&(!fV||p.vendedor===fV);
  }).sort((a,b)=>dr(a.vence)-dr(b.vence));
  const tbody=document.getElementById('tabla-body');
  if(!lista.length){tbody.innerHTML=`<tr><td colspan="11"><div class="empty-state"><i class="ti ti-search"></i>No se encontraron pólizas.</div></td></tr>`;return;}
  tbody.innerHTML=lista.map(p=>{
    const dias=dr(p.vence),e=est(dias);
    const dStr=dias<0?`<span style="color:#dc2626;font-weight:600">${Math.abs(dias)}d v.</span>`:`<span style="color:${e==='critica'?'#dc2626':e==='alerta'?'#d97706':'#16a34a'};font-weight:600">${dias}d</span>`;
    const esAviso30=dias===30;
    return`<tr>
      <td style="text-align:center">${semaforoHtml(p.estatusCobroIdx||0, p.id)}</td>
      <td title="${p.notas||''}">${p.cliente}</td>
      <td>${p.placa||'-'}</td>
      <td title="${p.aseguradora}">${p.aseguradora}</td>
      <td title="${p.tipo}">${p.tipo||'-'}</td>
      <td title="${p.vendedor}">${p.vendedor||'-'}</td>
      <td>${p.numero||'-'}</td>
      <td>${fd(p.vence)}</td>
      <td>${dStr}</td>
      <td>${badge(e)}</td>
      <td><div class="row-actions">
        ${p.telefono?`<button class="btn-icon wa" onclick="enviarWAIndividual('${p.id}')" title="WhatsApp"><i class="ti ti-brand-whatsapp"></i></button>`:''}
        ${esAviso30?`<button class="btn-icon" style="color:#185FA5;border-color:#bfdbfe" onclick="abrirAviso30('${p.id}')" title="Aviso 30 días"><i class="ti ti-bell-ringing"></i></button>`:''}
        <button class="btn-icon cal" onclick="exportarCalendarIndividual('${p.id}')" title="Calendar"><i class="ti ti-calendar-plus"></i></button>
        ${canEdit?`<button class="btn-icon" onclick="editarPoliza('${p.id}')" title="Editar"><i class="ti ti-edit"></i></button>`:''}
        ${canDel?`<button class="btn-icon danger" onclick="eliminarPoliza('${p.id}')" title="Eliminar"><i class="ti ti-trash"></i></button>`:''}
      </div></td>
    </tr>`;
  }).join('');
}

function render(){renderStats();renderAlertas();renderTabla();}

// ════════════════════════════════════════════════════════════════════
// CRUD PÓLIZAS
// ════════════════════════════════════════════════════════════════════
function abrirModalPoliza(id=null) {
  if(!puedeCrear()&&!id)return;
  if(id&&!puedeEditar())return;
  editingId=id;
  document.getElementById('modal-title').textContent=id?'Editar póliza':'Nueva póliza';
  document.getElementById('comision-preview').style.display='none';
  document.getElementById('bienvenida-box').style.display=id?'none':'block';
  const campos=['cliente','placa','numero','aseguradora','tipo','vendedor','inicio','vence','primaNeta','primaTotal','telefono','email','notas','tipoContrato','formaCobroAseg','formaPagoVend','diaAniversario'];
  if(id){
    const p=polizas.find(x=>x.id===id);
    campos.forEach(c=>{const el=document.getElementById('f-'+c);if(el)el.value=p[c]||'';});
    if(!document.getElementById('f-tipoContrato').value)document.getElementById('f-tipoContrato').value='nuevo';
    if(!document.getElementById('f-formaCobroAseg').value)document.getElementById('f-formaCobroAseg').value='anual';
    if(!document.getElementById('f-formaPagoVend').value)document.getElementById('f-formaPagoVend').value='anual';
    actualizarComisionPreview();
  } else {
    campos.forEach(c=>{const el=document.getElementById('f-'+c);if(el)el.value='';});
    document.getElementById('f-inicio').value=new Date().toISOString().split('T')[0];
    const s=new Date();s.setFullYear(s.getFullYear()+1);
    document.getElementById('f-vence').value=s.toISOString().split('T')[0];
    document.getElementById('f-tipoContrato').value='nuevo';
    document.getElementById('f-formaCobroAseg').value='anual';
    document.getElementById('f-formaPagoVend').value='anual';
    if(esVendedorRestringido()){
      document.getElementById('f-vendedor').value=currentUser.vendedor||'';
      document.getElementById('f-vendedor').disabled=true;
    } else {
      document.getElementById('f-vendedor').disabled=false;
    }
  }
  toggleDiaAniversario();
  document.getElementById('form-error').style.display='none';
  abrirOverlay('overlay-form');
}

function enlazarEventosComision() {
  ['f-aseguradora','f-tipo','f-vendedor','f-primaNeta'].forEach(id=>{
    const el=document.getElementById(id);
    if(el){el.oninput=actualizarComisionPreview;el.onchange=actualizarComisionPreview;}
  });
}

function actualizarComisionPreview() {
  const aseg=document.getElementById('f-aseguradora').value;
  const ramo=document.getElementById('f-tipo').value;
  const vend=document.getElementById('f-vendedor').value;
  const primaNeta=parseFloat(document.getElementById('f-primaNeta').value)||0;
  const box=document.getElementById('comision-preview');
  if(!aseg||!ramo||!vend||!primaNeta){box.style.display='none';return;}
  const a=aseguradoras.find(x=>x.nombre===aseg);
  const v=vendedores.find(x=>x.nombre===vend);
  const pA=(a?.comisiones?.[ramo])||0;
  const pV=(v?.comisiones?.[ramo])||0;
  const cB=(primaNeta*pA)/100;
  const cV=(cB*pV)/100;
  box.style.display='block';
  if(esVendedorRestringido()) {
    box.innerHTML=`<i class="ti ti-star" style="margin-right:4px;color:#d97706" aria-hidden="true"></i>¡Felicidades por este cierre! Tu comisión proyectada para esta póliza es de <strong>${fmtMoney(cV)}</strong>`;
  } else {
    box.innerHTML=`<i class="ti ti-calculator" style="margin-right:4px" aria-hidden="true"></i>Comisión bróker (${pA}% de prima neta): <strong>${fmtMoney(cB)}</strong> · Comisión vendedor (${pV}% de la comisión bróker): <strong>${fmtMoney(cV)}</strong>`;
  }
}

async function guardarPoliza() {
  const g=id=>(document.getElementById('f-'+id)||{}).value||'';
  const cliente=g('cliente').trim(),aseguradora=g('aseguradora'),tipo=g('tipo'),vendedor=g('vendedor'),inicio=g('inicio'),vence=g('vence');
  const errEl=document.getElementById('form-error');
  if(!cliente||!aseguradora||!tipo||!vendedor||!inicio||!vence){errEl.textContent='Completa los campos obligatorios (*)';errEl.style.display='block';return;}
  const tipoContrato=g('tipoContrato')||'nuevo';
  const formaCobroAseg=g('formaCobroAseg')||'anual';
  const formaPagoVend=g('formaPagoVend')||'anual';
  const diaAniversario=parseInt(g('diaAniversario'))||0;
  if((formaCobroAseg==='mensual'||formaPagoVend==='mensual')&&(diaAniversario<1||diaAniversario>31)){
    errEl.textContent='Día de aniversario obligatorio (1-31) cuando hay cobro o pago mensual';errEl.style.display='block';return;
  }
  errEl.style.display='none';
  const data={cliente,placa:g('placa'),numero:g('numero'),aseguradora,tipo,vendedor,inicio,vence,
    primaNeta:parseFloat(g('primaNeta'))||0,primaTotal:parseFloat(g('primaTotal'))||0,
    telefono:g('telefono'),email:g('email'),notas:g('notas'),
    tipoContrato,formaCobroAseg,formaPagoVend,diaAniversario};
  try {
    if(editingId){
      const act=await apiPut('polizas',editingId,data);
      const i=polizas.findIndex(x=>x.id===editingId);
      polizas[i]=act; mostrarToast('Póliza actualizada');
    } else {
      const nv=await apiPost('polizas',data);
      polizas.push(nv); mostrarToast('Póliza registrada');
      await cargarComisiones();
    }
    cerrarModal('overlay-form'); render();
  } catch(e){errEl.textContent='Error al guardar.';errEl.style.display='block';}
}

function toggleDiaAniversario(){
  const c=(document.getElementById('f-formaCobroAseg')||{}).value;
  const p=(document.getElementById('f-formaPagoVend')||{}).value;
  const grp=document.getElementById('f-diaAniversario-group');
  if(!grp)return;
  grp.style.display=(c==='mensual'||p==='mensual')?'':'none';
}

function editarPoliza(id){abrirModalPoliza(id);}

async function eliminarPoliza(id) {
  const p=polizas.find(x=>x.id===id);
  if(!confirm(`¿Eliminar la póliza de ${p.cliente}?`))return;
  try{await apiDel('polizas',id);polizas=polizas.filter(x=>x.id!==id);await cargarComisiones();render();mostrarToast('Póliza eliminada');}
  catch(e){mostrarToast('Error al eliminar.');}
}

function exportCSV() {
  const lista=polizasVisibles();
  const h=['Estado cobro','Cliente','Placa','No. Póliza','Aseguradora','Ramo','Vendedor','Inicio','Vencimiento','Días','Estado póliza','Prima Neta','Prima Total','Teléfono','Email','Notas'];
  const rows=lista.map(p=>{const d=dr(p.vence);return[SEM_LABELS[p.estatusCobroIdx||0],p.cliente,p.placa||'',p.numero||'',p.aseguradora,p.tipo||'',p.vendedor||'',p.inicio,p.vence,d,est(d),p.primaNeta||0,p.primaTotal||0,p.telefono||'',p.email||'',p.notas||''];});
  const csv=[h,...rows].map(r=>r.map(c=>`"${String(c).replace(/"/g,'""')}"`).join(',')).join('\n');
  const blob=new Blob(['\uFEFF'+csv],{type:'text/csv;charset=utf-8'});
  const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='polizas_'+new Date().toISOString().split('T')[0]+'.csv';a.click();
}

function exportPolizasPDF() {
  const lista=polizasVisibles();
  if(!lista.length){mostrarToast('No hay pólizas para exportar');return;}
  const fecha=new Date().toLocaleDateString('es-EC');
  const logoB64=document.querySelector('#login-screen .login-logo img').src;
  const c={vencida:0,critica:0,alerta:0,vigente:0};
  lista.forEach(p=>c[est(dr(p.vence))]++);
  const filas=lista.map(p=>{
    const d=dr(p.vence),e=est(d);
    const col=e==='vencida'||e==='critica'?'#dc2626':e==='alerta'?'#d97706':'#16a34a';
    const estLabel={vencida:'Vencida',critica:'Crítica',alerta:'Alerta',vigente:'Vigente'}[e];
    const cobLabel=SEM_LABELS[p.estatusCobroIdx||0];
    return`<tr>
      <td>${p.cliente}</td>
      <td>${p.placa||'—'}</td>
      <td>${p.aseguradora}</td>
      <td>${p.tipo||'—'}</td>
      <td>${p.vendedor||'—'}</td>
      <td>${p.numero||'—'}</td>
      <td>${fd(p.inicio)}</td>
      <td>${fd(p.vence)}</td>
      <td style="text-align:right;color:${col};font-weight:600">${d}d</td>
      <td style="font-weight:600;color:${col}">${estLabel}</td>
      <td style="text-align:right">${fmtMoney(p.primaNeta||0)}</td>
      <td style="text-align:right">${fmtMoney(p.primaTotal||0)}</td>
      <td style="color:#64748b;font-size:10px">${cobLabel}</td>
    </tr>`;
  }).join('');
  const html=`<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"><title>Polizas_${new Date().toISOString().split('T')[0]}</title>
  <style>*{box-sizing:border-box;margin:0;padding:0}body{font-family:Arial,sans-serif;font-size:10px;color:#1a1a2e;padding:1.5rem}
  .header{display:flex;align-items:center;gap:14px;border-bottom:2px solid #1a2744;padding-bottom:10px;margin-bottom:12px}
  .logo{width:44px;height:44px;border-radius:7px;overflow:hidden;flex-shrink:0}.logo img{width:100%;height:100%;object-fit:cover}
  .brand-name{font-size:13px;font-weight:700;color:#1a2744}.brand-sub{font-size:9px;color:#64748b}
  .rep-title{text-align:right;font-size:13px;font-weight:700;color:#1a2744}.rep-meta{font-size:9px;color:#64748b}
  .stats{display:grid;grid-template-columns:repeat(5,1fr);gap:6px;margin-bottom:10px}
  .stat{background:#f8fafc;border:1px solid #e2e8f0;border-radius:5px;padding:6px 8px}
  .stat-lbl{font-size:8px;color:#64748b;text-transform:uppercase;margin-bottom:2px}
  .stat-val{font-size:14px;font-weight:700}
  table{width:100%;border-collapse:collapse;font-size:9px}
  th{text-align:left;padding:4px 5px;background:#e8ecf4;color:#1a2744;font-size:8px;font-weight:700;text-transform:uppercase;border-bottom:1px solid #cbd5e1}
  td{padding:4px 5px;border-bottom:0.5px solid #f1f5f9}
  .footer{text-align:center;font-size:8px;color:#94a3b8;margin-top:10px;border-top:1px solid #e2e8f0;padding-top:7px}
  @media print{body{padding:1rem}}</style></head><body>
  <div class="header">
    <div class="logo"><img src="${logoB64}" alt="Reyna Seguros"></div>
    <div style="flex:1"><div class="brand-name">Reyna Seguros Gestión</div><div class="brand-sub">Asesoría experta y protección a tu medida</div></div>
    <div><div class="rep-title">Listado de pólizas</div><div class="rep-meta">Fecha: ${fecha} · Total: ${lista.length} pólizas</div></div>
  </div>
  <div class="stats">
    <div class="stat"><div class="stat-lbl">Total</div><div class="stat-val" style="color:#1a2744">${lista.length}</div></div>
    <div class="stat"><div class="stat-lbl">Vencidas</div><div class="stat-val" style="color:#dc2626">${c.vencida}</div></div>
    <div class="stat"><div class="stat-lbl">Críticas ≤7d</div><div class="stat-val" style="color:#dc2626">${c.critica}</div></div>
    <div class="stat"><div class="stat-lbl">Alerta ≤30d</div><div class="stat-val" style="color:#d97706">${c.alerta}</div></div>
    <div class="stat"><div class="stat-lbl">Vigentes</div><div class="stat-val" style="color:#16a34a">${c.vigente}</div></div>
  </div>
  <table><thead><tr>
    <th>Cliente</th><th>Placa/ID</th><th>Aseguradora</th><th>Ramo</th><th>Vendedor</th>
    <th>N° Póliza</th><th>Inicio</th><th>Vence</th><th style="text-align:right">Días</th>
    <th>Estado</th><th style="text-align:right">Prima Neta</th><th style="text-align:right">Prima Total</th><th>Cobro</th>
  </tr></thead><tbody>${filas}</tbody></table>
  <div class="footer">${FOOTER_TEXT}</div></body></html>`;
  const w=window.open('','_blank');w.document.write(html);w.document.close();w.print();
}



// ════════════════════════════════════════════════════════════════════
// MENSAJES WHATSAPP / CORREO
// ════════════════════════════════════════════════════════════════════
function mensajeAviso30WA(p) {
  const e_phone = String.fromCodePoint(0x1F4F2); // 📲
  return 'Estimado/a *' + p.cliente + '*:\n\nLe saluda ' + FIRMA_NOMBRE + '. Por medio del presente mensaje, me comunico con usted para recordarle que su p\u00f3liza de *' + p.tipo + '*' + (p.placa&&p.placa!=='-'?' ('+p.placa+')':'') + ' contratada con la aseguradora *' + p.aseguradora + '*' + (p.numero?' con N\u00b0 '+p.numero:'') + ' vencer\u00e1 el pr\u00f3ximo *' + fd(p.vence) + '* (30 d\u00edas restantes).\n\nPara mantener su cobertura activa y garantizar su protecci\u00f3n y la de su patrimonio sin ning\u00fan tipo de interrupciones, en los pr\u00f3ximos d\u00edas me estar\u00e9 contactando con usted para presentarle las condiciones de su renovaci\u00f3n.\n\nSi tiene alguna consulta previa o prefiere adelantar este proceso, quedo a su total disposici\u00f3n por esta v\u00eda o a trav\u00e9s de nuestros canales digitales oficiales.\n\nAgradecemos de antemano su confianza.\n\nSaludos cordiales,\n*' + FIRMA_NOMBRE + '*\n_Asesor\u00eda experta y protecci\u00f3n a tu medida_\n' + e_phone + ' Instagram: ' + INSTAGRAM;
}

function cuerpoAviso30Correo(p) {
  return `Estimado/a ${p.cliente}:\n\nEspero que se encuentre muy bien.\n\nPor medio del presente correo, me comunico con usted para recordarle que su póliza de ${p.tipo}${p.placa&&p.placa!=='-'?` (${p.placa})`:''} contratada con la aseguradora ${p.aseguradora} con N° ${p.numero||'N/A'} vencerá el próximo ${fd(p.vence)} (30 días restantes).\n\nPara mantener su cobertura activa y garantizar su protección y la de su patrimonio sin ningún tipo de interrupciones, en los próximos días me estaré contactando con usted para presentarle las condiciones de su renovación.\n\nSi tiene alguna consulta previa o prefiere adelantar este proceso, quedo a su total disposición por esta vía o a través de nuestros canales digitales oficiales.\n\nAgradecemos de antemano su confianza.\n\nSaludos cordiales,`;
}

function mensajeBienvenidaWA(p) {
  const e_handshake = String.fromCodePoint(0x1F91D); // 🤝
  const e_calendar  = String.fromCodePoint(0x1F4C5); // 📅
  const e_phone     = String.fromCodePoint(0x1F4F2); // 📲
  const bullet = '\u2022';
  return 'Estimado/a *' + p.cliente + '*:\n\nLe saluda Guillermo Reyna. Es un verdadero gusto darle la bienvenida. ' + e_handshake + '\n\nGracias por confiar en nosotros para proteger lo que m\u00e1s le importa. Desde hoy, mi compromiso como su broker de seguros es cuidar de su tranquilidad con el respaldo experto que se merece.\n\nLe comparto los datos oficiales de su nueva cobertura para que los tenga siempre a mano:\n\n' + bullet + ' Aseguradora: ' + p.aseguradora + '\n' + bullet + ' Ramo: ' + p.tipo + '\n' + bullet + ' Placa / ID: ' + (p.placa||'-') + '\n' + bullet + ' N\u00b0 de P\u00f3liza: ' + (p.numero||'N/A') + '\n' + bullet + ' ' + e_calendar + ' Vigencia desde: ' + fd(p.inicio) + '\n' + bullet + ' ' + e_calendar + ' Vigencia hasta: ' + fd(p.vence) + '\n\nRecuerde que estoy a su total disposici\u00f3n por este medio ante cualquier consulta o asistencia que requiera. \u00a1Bienvenido/a!\n\nSaludos cordiales,\n*GUILLERMO REYNA*\n_Asesor\u00eda experta y protecci\u00f3n a tu medida_\n' + e_phone + ' Instagram: ' + INSTAGRAM;
}

function cuerpoBienvenidaCorreo(p) {
  return `Estimado/a ${p.cliente}:\n\nEspero que se encuentre muy bien.\n\nLe saluda Guillermo Reyna. Por medio de este correo, es un verdadero gusto darle la bienvenida y agradecerle por confiar en mí para proteger lo que más le importa. Desde hoy, mi compromiso como su broker de seguros es cuidar de su tranquilidad y brindarle el respaldo experto y la protección a su medida que usted y su patrimonio se merecen.\n\nA continuación, detallamos la información oficial y de control correspondiente a la emisión de su nueva póliza:\n\n• Aseguradora: ${p.aseguradora}\n• Ramo: ${p.tipo}\n• Placa/ID: ${p.placa||'-'}\n• Número de Póliza: ${p.numero||'N/A'}\n• Inicio de Cobertura: ${fd(p.inicio)}\n• Vencimiento de Póliza: ${fd(p.vence)}\n\nLe sugiero almacenar los archivos de su póliza en un lugar de fácil acceso para que pueda consultar las condiciones contractuales, asistencias de emergencia y deducibles establecidos.\n\nRecuerde que mis canales de atención están completamente abiertos para resolver cualquier duda o gestionar de forma inmediata lo que necesite.\n\nNuevamente, gracias por su confianza.\n\nSaludos cordiales,\nGUILLERMO REYNA\nAsesoría experta y protección a tu medida\n\nNota: Este es un mensaje automático de bienvenida y notificación de servicio. 🌐`;
}

function datosFormulario() {
  const g=id=>(document.getElementById('f-'+id)||{}).value||'';
  return {cliente:g('cliente')||'(nombre)',aseguradora:g('aseguradora')||'(aseguradora)',tipo:g('tipo')||'(ramo)',placa:g('placa')||'-',numero:g('numero')||'N/A',inicio:g('inicio'),vence:g('vence'),telefono:g('telefono')};
}

function copiarBienvenidaWA() {
  const p=datosFormulario();
  copiarTexto(mensajeBienvenidaWA(p),'Mensaje WhatsApp copiado');
}
function abrirWABienvenida() {
  const p=datosFormulario();
  if(!p.telefono){mostrarToast('Ingresa el tel\u00e9fono del cliente primero');return;}
  const texto=mensajeBienvenidaWA(p);
  const num=numWA(p.telefono);
  // Usar el API nativo del navegador para construir la URL — preserva emojis UTF-8 correctamente
  const url=new URL('https://wa.me/'+num);
  url.searchParams.set('text',texto);
  window.open(url.toString(),'_blank');
}
function copiarBienvenidaCorreo() {
  const p=datosFormulario();
  const e_mail = String.fromCodePoint(0x2709, 0xFE0F); // ✉️
  const asunto= e_mail + ' \u00a1Bienvenido/a! - Confirmaci\u00f3n y detalles de su p\u00f3liza de ' + p.tipo;
  copiarTexto('Asunto: ' + asunto + '\n\n' + cuerpoBienvenidaCorreo(p),'Mensaje de correo copiado');
}

// ── PANEL WA MASIVO (30 días exactos) ────────────────────────────────
function enviarWAIndividual(id) {
  const p=polizas.find(x=>x.id===id);
  if(!p.telefono){mostrarToast('Sin teléfono registrado.');return;}
  window.open(`https://wa.me/${numWA(p.telefono)}?text=${encodeURIComponent(mensajeAviso30WA(p))}`,'_blank');
}
function mostrarPanelWA() {
  const lista=polizasVisibles().filter(p=>dr(p.vence)===30);
  document.getElementById('wa-vacio').style.display=lista.length?'none':'block';
  if(lista.length) {
    document.getElementById('wa-lista').innerHTML=lista.map(p=>`<div class="wa-item"><div style="display:flex;align-items:center;gap:8px;margin-bottom:4px"><input type="checkbox" class="wa-sel" data-id="${p.id}" checked><strong style="font-size:13px">${p.cliente}</strong><span style="font-size:11px;color:#d97706;margin-left:4px">30 días — ${fd(p.vence)}</span><span style="font-size:11px;color:#64748b;margin-left:auto">${p.telefono||'sin tel.'}</span></div><div class="wa-preview">${mensajeAviso30WA(p).substring(0,200)}…</div>${!p.telefono?`<div style="font-size:11px;color:#dc2626;margin-top:4px">Sin teléfono</div>`:''}</div>`).join('');
  }
  abrirOverlay('overlay-wa');
}
function enviarWASeleccionados() {
  const checks=document.querySelectorAll('.wa-sel:checked');
  if(!checks.length){mostrarToast('Selecciona al menos una póliza.');return;}
  let env=0,sinTel=0;
  checks.forEach((ch,i)=>{const p=polizas.find(x=>x.id===ch.dataset.id);if(!p||!p.telefono){sinTel++;return;}setTimeout(()=>window.open(`https://wa.me/${numWA(p.telefono)}?text=${encodeURIComponent(mensajeAviso30WA(p))}`,'_blank'),i*800);env++;});
  mostrarToast(`Abriendo ${env} chat${env!==1?'s':''}${sinTel?' ('+sinTel+' sin tel.)':''}`);
  setTimeout(()=>cerrarModal('overlay-wa'),1000);
}

// ── AVISO 30 DÍAS INDIVIDUAL ─────────────────────────────────────────
function abrirAviso30(id) {
  const p=polizas.find(x=>x.id===id);
  const e_warn = String.fromCodePoint(0x26A0, 0xFE0F); // ⚠️
  const asunto= e_warn + ' Aviso de vencimiento: Su p\u00f3liza de ' + p.tipo + ' est\u00e1 pr\u00f3xima a vencer';
  const cuerpo=cuerpoAviso30Correo(p);
  document.getElementById('aviso30-content').innerHTML=`
    <div style="font-size:13px;color:var(--color-text-secondary);margin-bottom:10px"><strong>${p.cliente}</strong> — vence el ${fd(p.vence)} (30 días)</div>
    <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:10px">
      <button class="btn btn-wa btn-sm" onclick='copiarTexto(${JSON.stringify(mensajeAviso30WA(p))},"Mensaje WA copiado")'><i class="ti ti-copy" aria-hidden="true"></i> Copiar WA</button>
      ${p.telefono?`<button class="btn btn-wa btn-sm" onclick="window.open('https://wa.me/${numWA(p.telefono)}?text='+encodeURIComponent(${JSON.stringify(mensajeAviso30WA(p))}),'_blank')"><i class="ti ti-brand-whatsapp" aria-hidden="true"></i> Abrir WA</button>`:''}
      <button class="btn btn-mail btn-sm" onclick='copiarTexto(${JSON.stringify("Asunto: "+asunto+"\n\n"+cuerpo)},"Correo copiado")'><i class="ti ti-copy" aria-hidden="true"></i> Copiar correo</button>
      <button class="btn btn-outline btn-sm" onclick="window.open('https://mail.google.com/mail/u/0/#inbox?compose=new','_blank')"><i class="ti ti-external-link" aria-hidden="true"></i> Abrir Gmail</button>
    </div>
    <div class="wa-preview" style="max-height:200px">${mensajeAviso30WA(p)}</div>`;
  abrirOverlay('overlay-aviso30');
}

// ── RECORDATORIO AL BROKER ───────────────────────────────────────────
function verificarRecordatoriosBroker() {
  // ── Vencimientos de pólizas ──────────────────────────────────────
  const todas = polizasVisibles();
  const crit  = todas.filter(p => { const d=dr(p.vence); return d>=0&&d<=7; });
  const a15   = todas.filter(p => { const d=dr(p.vence); return d>7&&d<=15; });
  const a30   = todas.filter(p => { const d=dr(p.vence); return d>15&&d<=30; });
  const total = [...crit,...a15,...a30];
  if (total.length) {
    const resumen = total.map(p=>`• ${p.cliente} | ${p.tipo} | ${p.aseguradora} | Vence: ${fd(p.vence)} (${dr(p.vence)}d)`).join('\n');
    const msg = `🔔 *REYNA SEGUROS — RECORDATORIO DE VENCIMIENTOS*\n\n${crit.length?`🔴 CRÍTICAS (≤7 días): ${crit.length}\n`:''}${a15.length?`🟠 ALERTA 15 DÍAS: ${a15.length}\n`:''}${a30.length?`🟡 ALERTA 30 DÍAS: ${a30.length}\n`:''}\n${resumen}\n\n_Sistema Reyna Seguros Gestión_`;
    const url = `https://wa.me/${WA_BROKER}?text=${encodeURIComponent(msg)}`;
    const b = document.createElement('div');
    b.style.cssText = 'position:fixed;bottom:5rem;right:1rem;background:#1a2744;color:#fff;border-radius:10px;padding:12px 16px;font-size:13px;z-index:250;max-width:320px;box-shadow:0 4px 20px rgba(0,0,0,0.3)';
    b.innerHTML = `<div style="font-weight:600;margin-bottom:6px">🔔 ${total.length} póliza${total.length>1?'s':''} requieren atención</div><div style="font-size:12px;color:rgba(255,255,255,0.8);margin-bottom:10px">Pólizas próximas a vencer o vencidas.</div><button onclick="window.open('${url}','_blank');this.parentElement.remove()" style="background:#16a34a;color:#fff;border:none;border-radius:6px;padding:6px 12px;font-size:12px;font-weight:600;cursor:pointer;width:100%">📲 Enviarme recordatorio por WhatsApp</button><button onclick="this.parentElement.remove()" style="background:transparent;color:rgba(255,255,255,0.6);border:none;font-size:11px;cursor:pointer;margin-top:6px;width:100%">Cerrar</button>`;
    document.body.appendChild(b);
  }

  // ── Cumpleaños próximos (7 días) ─────────────────────────────────
  const hoy   = new Date();
  const cumples = vendedores.filter(v => {
    if (!v.fnac) return false;
    const fnac  = new Date(v.fnac);
    const este  = new Date(hoy.getFullYear(), fnac.getMonth(), fnac.getDate());
    // Si ya pasó este año, revisar el próximo
    if (este < new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate())) {
      este.setFullYear(hoy.getFullYear() + 1);
    }
    const diff = Math.round((este - hoy) / 86400000);
    v._diasCumple = diff;
    return diff >= 0 && diff <= 7;
  });

  if (cumples.length) {
    const bc = document.createElement('div');
    bc.style.cssText = 'position:fixed;bottom:5rem;left:1rem;background:#7c3aed;color:#fff;border-radius:10px;padding:12px 16px;font-size:13px;z-index:250;max-width:300px;box-shadow:0 4px 20px rgba(0,0,0,0.3)';
    bc.innerHTML = `
      <div style="font-weight:600;margin-bottom:6px">🎂 Cumpleaños próximos</div>
      <div style="font-size:12px;color:rgba(255,255,255,0.85);margin-bottom:10px">
        ${cumples.map(v =>
          `• <strong>${v.nombre}</strong> — ${v._diasCumple === 0 ? '¡Hoy!' : 'en ' + v._diasCumple + ' día' + (v._diasCumple > 1 ? 's' : '')}`
        ).join('<br>')}
      </div>
      <button onclick="this.parentElement.remove()" style="background:rgba(255,255,255,0.2);color:#fff;border:none;border-radius:6px;padding:5px 12px;font-size:12px;cursor:pointer;width:100%">Cerrar</button>`;
    document.body.appendChild(bc);
  }
}

// ── GOOGLE CALENDAR ──────────────────────────────────────────────────
function fmtICS(d,o=0){const dt=new Date(d+'T12:00:00');dt.setDate(dt.getDate()+o);return dt.toISOString().replace(/[-:]/g,'').split('.')[0]+'Z';}
function generarICS(p) {
  const uid=`pol-${p.id}-${Date.now()}@reynaseguros`;
  const uid2=`pol-${p.id}-a30-${Date.now()}@reynaseguros`;
  const now=new Date().toISOString().replace(/[-:]/g,'').split('.')[0]+'Z';
  const desc=`Poliza: ${p.numero||'N/A'} | Aseguradora: ${p.aseguradora} | Ramo: ${p.tipo}${p.vendedor?' | Vendedor: '+p.vendedor:''}${p.placa&&p.placa!=='-'?' | Placa: '+p.placa:''}`;
  const vDate=p.vence.replace(/-/g,'');
  const a30=new Date(p.vence+'T12:00:00');a30.setDate(a30.getDate()-30);
  const a30str=a30.toISOString().substring(0,10).replace(/-/g,'');
  const gcUrl=`https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent('🔴 VENCIMIENTO | '+p.cliente+' — '+p.tipo+' | '+p.aseguradora)}&dates=${vDate}/${vDate}&details=${encodeURIComponent(desc)}&sf=true&output=xml`;
  return{ics:`BEGIN:VEVENT\r\nUID:${uid}\r\nDTSTAMP:${now}\r\nDTSTART;VALUE=DATE:${vDate}\r\nDTEND;VALUE=DATE:${vDate}\r\nSUMMARY:🔴 VENCIMIENTO | ${p.cliente} — ${p.tipo} | ${p.aseguradora}\r\nDESCRIPTION:${desc}\r\nBEGIN:VALARM\r\nTRIGGER;VALUE=DATE-TIME:${fmtICS(p.vence,-30)}\r\nACTION:DISPLAY\r\nDESCRIPTION:Vence en 30 días: ${p.cliente}\r\nEND:VALARM\r\nEND:VEVENT\r\nBEGIN:VEVENT\r\nUID:${uid2}\r\nDTSTAMP:${now}\r\nDTSTART;VALUE=DATE:${a30str}\r\nDTEND;VALUE=DATE:${a30str}\r\nSUMMARY:🟡 ALERTA 30 DÍAS | ${p.cliente} — ${p.tipo} | ${p.aseguradora}\r\nDESCRIPTION:${desc}\r\nBEGIN:VALARM\r\nTRIGGER:-PT0M\r\nACTION:DISPLAY\r\nDESCRIPTION:Gestionar renovación: ${p.cliente}\r\nEND:VALARM\r\nEND:VEVENT`,gcUrl};
}
function descargarICS(eventos,nombre){const c=`BEGIN:VCALENDAR\r\nVERSION:2.0\r\nPRODID:-//Reyna Seguros//Polizas//ES\r\nCALSCALE:GREGORIAN\r\nMETHOD:PUBLISH\r\n${eventos.join('\r\n')}\r\nEND:VCALENDAR`;const blob=new Blob([c],{type:'text/calendar;charset=utf-8'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=nombre+'.ics';a.click();}
function exportarCalendar(){const prox=polizasVisibles().filter(p=>dr(p.vence)>=-30);if(!prox.length){mostrarToast('No hay pólizas activas.');return;}descargarICS(prox.map(p=>generarICS(p).ics),`polizas_${new Date().toISOString().split('T')[0]}`);}
function exportarCalendarIndividual(id){const p=polizas.find(x=>x.id===id);const{ics,gcUrl}=generarICS(p);window.open(gcUrl,'_blank');descargarICS([ics],`poliza_${p.cliente.replace(/\s+/g,'_')}`);mostrarToast('Abriendo Google Calendar y descargando .ics');}

