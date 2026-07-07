// ════════════════════════════════════════════════════════════════════
// ESTADO GLOBAL
// ════════════════════════════════════════════════════════════════════
const API = '/api';
let currentUser = null;
let polizas = [], aseguradoras = [], ramos = [], vendedores = [];
let usuarios = [], comisiones = [], liquidaciones = [], liqCobros = [];
let movPagos = [], movCobros = [], descPagos = [], descCobros = [];
let cuotasMensuales = [];
let editingId = null;
let currentView = 'polizas';
let adminSubtab = 'aseguradoras';
let comisionesSubtab = 'detalle';
let contabSubtab = 'pagos';
let contabPagosSubtab = 'movimientos';
let contabCobrosSubtab = 'movimientos';

const WA_BROKER = '593983880443';
const INSTAGRAM = '@greyna.nbs';
const FIRMA_NOMBRE = 'GUILLERMO REYNA';
const COLOR_COBROS = '#D97757';
const FOOTER_TEXT = '© 2026 Desarrollado por Reyna Seguros. Todos los derechos reservados.';

// ════════════════════════════════════════════════════════════════════
// LOGIN
// ════════════════════════════════════════════════════════════════════
async function iniciarSesion() {
  const u = document.getElementById('login-user').value.trim().toLowerCase();
  const p = document.getElementById('login-pass').value;
  const errEl = document.getElementById('login-error');
  try {
    const r = await fetch(`${API}/login`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({username:u,password:p})});
    if (!r.ok) { errEl.style.display='block'; return; }
    currentUser = await r.json();
    sessionStorage.setItem('rsg_user', JSON.stringify(currentUser));
    errEl.style.display='none';
    await mostrarApp();
  } catch(e) { errEl.textContent='Error de conexión'; errEl.style.display='block'; }
}
document.addEventListener('keydown', e => {
  if (e.key==='Enter' && document.getElementById('login-screen').style.display!=='none') iniciarSesion();
});
function cerrarSesion() {
  sessionStorage.removeItem('rsg_user'); currentUser=null;
  document.getElementById('main-app').style.display='none';
  document.getElementById('login-screen').style.display='block';
  document.getElementById('login-user').value='';
  document.getElementById('login-pass').value='';
}
function rolLabel(r){return{admin:'Administrador',editor:'Editor',vendedor:'Vendedor',viewer:'Visualizador'}[r]||r;}
function rolClass(r){return{admin:'role-admin',editor:'role-editor',vendedor:'role-vendedor',viewer:'role-viewer'}[r]||'';}

// ════════════════════════════════════════════════════════════════════
// NAVEGACIÓN
// ════════════════════════════════════════════════════════════════════
function construirNav() {
  const nav = document.getElementById('nav-tabs');
  const role = currentUser.role;
  let html = `<button class="nav-tab active" data-view="polizas" onclick="cambiarVista('polizas')"><i class="ti ti-file-text" style="font-size:13px" aria-hidden="true"></i> Pólizas</button>`;
  if (role==='admin'||role==='editor') {
    html += `<button class="nav-tab" data-view="admin" onclick="cambiarVista('admin')"><i class="ti ti-settings" style="font-size:13px" aria-hidden="true"></i> Administración</button>`;
    html += `<button class="nav-tab" data-view="comisiones" onclick="cambiarVista('comisiones')"><i class="ti ti-cash" style="font-size:13px" aria-hidden="true"></i> Liquidaciones</button>`;
    html += `<button class="nav-tab" data-view="contabilidad" onclick="cambiarVista('contabilidad')"><i class="ti ti-calculator" style="font-size:13px" aria-hidden="true"></i> Comisiones</button>`;
    html += `<button class="nav-tab" data-view="cuotas" onclick="cambiarVista('cuotas')"><i class="ti ti-calendar-repeat" style="font-size:13px" aria-hidden="true"></i> Cuotas mensuales</button>`;
  } else if (role==='vendedor') {
    html += `<button class="nav-tab" data-view="cuotas" onclick="cambiarVista('cuotas')"><i class="ti ti-calendar-repeat" style="font-size:13px" aria-hidden="true"></i> Mis cuotas</button>`;
  }
  nav.innerHTML = html;
}
function cambiarVista(view) {
  currentView = view;
  document.querySelectorAll('.nav-tab').forEach(b => b.classList.toggle('active', b.dataset.view===view));
  ['polizas','admin','comisiones','contabilidad','cuotas'].forEach(v => {
    const el=document.getElementById('view-'+v);
    if(el) el.style.display = v===view?'block':'none';
  });
  if (view==='admin') renderAdmin();
  if (view==='comisiones') renderComisiones();
  if (view==='contabilidad') renderContabilidad();
  if (view==='cuotas') renderCuotas();
}

// ════════════════════════════════════════════════════════════════════
// CARGA INICIAL
// ════════════════════════════════════════════════════════════════════
async function mostrarApp() {
  document.getElementById('login-screen').style.display='none';
  document.getElementById('main-app').style.display='block';
  document.getElementById('nav-username').textContent=currentUser.username;
  document.getElementById('nav-rolebadge').innerHTML=` <span class="role-badge ${rolClass(currentUser.role)}">${rolLabel(currentUser.role)}</span>`;
  construirNav();
  const canCreate=['admin','editor','vendedor'].includes(currentUser.role);
  document.getElementById('btn-nueva').style.display=canCreate?'inline-flex':'none';
  await cargarTodo();
  cambiarVista('polizas');
  setTimeout(()=>verificarRecordatoriosBroker(),2500);
  setInterval(cargarPolizas,30000);
}
window.addEventListener('load',()=>{
  const s=sessionStorage.getItem('rsg_user');
  if(s){currentUser=JSON.parse(s);mostrarApp();}
});
async function cargarTodo() {
  await Promise.all([
    cargarPolizas(),cargarAseguradoras(),cargarRamos(),cargarVendedores(),
    cargarUsuarios(),cargarComisiones(),cargarLiquidaciones(),
    cargarLiqCobros(),cargarMovPagos(),cargarMovCobros(),
    cargarDescPagos(),cargarDescCobros(),cargarCuotasMensuales()
  ]);
  poblarSelects();
}

// ════════════════════════════════════════════════════════════════════
// API GENÉRICA
// ════════════════════════════════════════════════════════════════════
async function apiGet(p)      { const r=await fetch(`${API}/${p}`); if(!r.ok)throw new Error(); return r.json(); }
async function apiPost(p,d)   { const r=await fetch(`${API}/${p}`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(d)}); if(!r.ok)throw new Error(); return r.json(); }
async function apiPut(p,id,d) { const r=await fetch(`${API}/${p}/${id}`,{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify(d)}); if(!r.ok)throw new Error(); return r.json(); }
async function apiDel(p,id)   { const r=await fetch(`${API}/${p}/${id}`,{method:'DELETE'}); if(!r.ok)throw new Error(); return r.json(); }

// ════════════════════════════════════════════════════════════════════
// LOADERS
// ════════════════════════════════════════════════════════════════════
async function cargarPolizas()      { try{ polizas=await apiGet('polizas'); if(currentView==='polizas')render(); }catch(e){ document.getElementById('server-status').innerHTML='<span class="dot" style="background:#dc2626"></span>Error'; } }
async function cargarAseguradoras() { try{ aseguradoras=await apiGet('aseguradoras'); }catch(e){} }
async function cargarRamos()        { try{ ramos=await apiGet('ramos'); }catch(e){} }
async function cargarVendedores()   { try{ vendedores=await apiGet('vendedores'); }catch(e){} }
async function cargarUsuarios()     { try{ usuarios=await apiGet('usuarios'); }catch(e){} }
async function cargarComisiones()   { try{ comisiones=await apiGet('comisiones'); }catch(e){} }
async function cargarLiquidaciones(){ try{ liquidaciones=await apiGet('liquidaciones'); }catch(e){} }
async function cargarLiqCobros()    { try{ liqCobros=await apiGet('liquidaciones-cobros'); }catch(e){} }
async function cargarMovPagos()     { try{ movPagos=await apiGet('movimientos-pagos'); }catch(e){} }
async function cargarMovCobros()    { try{ movCobros=await apiGet('movimientos-cobros'); }catch(e){} }
async function cargarDescPagos()    { try{ descPagos=await apiGet('descuentos-pagos'); }catch(e){} }
async function cargarDescCobros()   { try{ descCobros=await apiGet('descuentos-cobros'); }catch(e){} }
async function cargarCuotasMensuales(){ try{ cuotasMensuales=await apiGet('cuotas-mensuales'); }catch(e){ cuotasMensuales=[]; } }

// ════════════════════════════════════════════════════════════════════
// UTILS
// ════════════════════════════════════════════════════════════════════
function dr(v){const h=new Date();h.setHours(0,0,0,0);const d=new Date(v);d.setHours(0,0,0,0);return Math.round((d-h)/86400000);}
function est(d){if(d<0)return'vencida';if(d<=7)return'critica';if(d<=30)return'alerta';return'vigente';}
function badge(e){const m={vencida:['badge-red','Vencida'],critica:['badge-red','Crítica'],alerta:['badge-amber','Alerta'],vigente:['badge-green','Vigente']};const[c,l]=m[e];return`<span class="badge ${c}">${l}</span>`;}
function fd(s){if(!s||s==='-')return'-';const pts=s.split('T')[0].split('-');return`${pts[2]}/${pts[1]}/${pts[0]}`;}
function fmtMoney(n){return'$'+(parseFloat(n)||0).toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2});}
function numWA(tel){const n=(tel||'').replace(/\D/g,'');if(n.startsWith('593'))return n;if(n.startsWith('0'))return'593'+n.slice(1);return'593'+n;}
function mostrarToast(msg){const t=document.getElementById('toast');t.textContent=msg;t.classList.add('show');setTimeout(()=>t.classList.remove('show'),3500);}
function cerrarModal(id){document.getElementById(id).classList.remove('open');}
function abrirOverlay(id){document.getElementById(id).classList.add('open');}
function copiarTexto(texto,msg){
  navigator.clipboard.writeText(texto).then(()=>mostrarToast(msg||'Copiado')).catch(()=>{
    const t=document.createElement('textarea');t.value=texto;document.body.appendChild(t);t.select();document.execCommand('copy');document.body.removeChild(t);mostrarToast(msg||'Copiado');
  });
}
function puedeCrear()   {return['admin','editor','vendedor'].includes(currentUser.role);}
function puedeEditar()  {return['admin','editor'].includes(currentUser.role);}
function puedeEliminar(){return currentUser.role==='admin';}
function esVendedorRestringido(){return currentUser.role==='vendedor';}

// ════════════════════════════════════════════════════════════════════
// POBLAR SELECTS
// ════════════════════════════════════════════════════════════════════
function poblarSelects() {
  const rO=[...ramos].sort((a,b)=>a.nombre.localeCompare(b.nombre));
  const aO=[...aseguradoras].sort((a,b)=>a.nombre.localeCompare(b.nombre));
  const vO=[...vendedores].sort((a,b)=>a.nombre.localeCompare(b.nombre));
  const opts=(arr,k='nombre')=>arr.map(x=>`<option>${x[k]}</option>`).join('');

  ['filtro-ramo','f-tipo'].forEach(id=>{
    const el=document.getElementById(id);
    if(el)el.innerHTML='<option value="">'+(id.startsWith('filtro')?'Todos los ramos':'Seleccionar...')+'</option>'+opts(rO);
  });
  const fv=document.getElementById('filtro-vendedor');
  if(fv)fv.innerHTML='<option value="">Todos los vendedores</option>'+opts(vO);
  const fa=document.getElementById('f-aseguradora');
  if(fa)fa.innerHTML='<option value="">Seleccionar...</option>'+opts(aO);
  const fvf=document.getElementById('f-vendedor');
  if(fvf)fvf.innerHTML='<option value="">Seleccionar...</option>'+opts(vO);
  const uv=document.getElementById('user-vendedor');
  if(uv)uv.innerHTML='<option value="">Ninguno</option>'+opts(vO);
  const lv=document.getElementById('liq-vendedor');
  if(lv)lv.innerHTML='<option value="">Seleccionar...</option>'+opts(vO);
  const lcv=document.getElementById('liqcob-aseguradora');
  if(lcv)lcv.innerHTML='<option value="">Seleccionar...</option>'+opts(aO);
  const mpv=document.getElementById('mp-vendedor');
  if(mpv)mpv.innerHTML='<option value="">Seleccionar...</option>'+opts(vO);
  const mcv=document.getElementById('mc-aseguradora');
  if(mcv)mcv.innerHTML='<option value="">Seleccionar...</option>'+opts(aO);
  enlazarEventosComision();
}
