// SM Gestión — frontend
const $ = s => document.querySelector(s);
const $$ = s => document.querySelectorAll(s);
const fmtCOP = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 });

const TIPOS_NOTIF = {
  poliza_por_vencer: 'Póliza por vencer', poliza_vencida: 'Póliza vencida',
  cuota_por_vencer: 'Cuota por vencer', cuota_vencida: 'Cuota vencida',
  soat: 'SOAT', tecno: 'Tecnomecánica', cumpleanos: 'Cumpleaños', manual: 'Manual'
};

async function api(ruta, metodo = 'GET', cuerpo = null) {
  const opts = { method: metodo, headers: {} };
  if (cuerpo !== null) {
    if (cuerpo instanceof ArrayBuffer) { opts.body = cuerpo; opts.headers['Content-Type'] = 'application/octet-stream'; }
    else { opts.body = JSON.stringify(cuerpo); opts.headers['Content-Type'] = 'application/json'; }
  }
  const r = await fetch('/api' + ruta, opts);
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(data.error || `Error ${r.status}`);
  return data;
}

function toast(msg, esError = false) {
  const t = $('#toast');
  t.textContent = msg;
  t.className = esError ? 'error' : '';
  clearTimeout(t._timer);
  t._timer = setTimeout(() => t.classList.add('oculta'), 4500);
}
function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
function pill(estado) {
  return `<span class="estado-pill estado-${esc(estado)}">${esc(estado)}</span>`;
}

// ---------- Navegación ----------
$$('#menu nav a').forEach(a => a.addEventListener('click', e => {
  e.preventDefault();
  mostrarVista(a.dataset.vista);
}));
function mostrarVista(nombre) {
  $$('#menu nav a').forEach(x => x.classList.toggle('activo', x.dataset.vista === nombre));
  $$('.vista').forEach(v => v.classList.add('oculta'));
  $(`#vista-${nombre}`).classList.remove('oculta');
  ({ panel: cargarPanel, clientes: cargarClientes, polizas: cargarPolizas, runt: cargarRunt, negocios: cargarNegocios,
     oportunidades: cargarOportunidades, asistente: cargarAsistente, notificaciones: cargarNotif,
     plantillas: cargarPlantillas, config: cargarConfig }[nombre] || (() => {}))();
}

// ---------- Panel / Dashboard ----------
const fmtCOPk = v => v >= 1e6 ? '$' + (v / 1e6).toFixed(1).replace('.0', '') + 'M'
  : v >= 1e3 ? '$' + Math.round(v / 1e3) + 'k' : fmtCOP.format(v || 0);
const ETAPA_ETQ = { nuevo: 'Nuevo', contactado: 'Contactado', cotizacion: 'Cotización', negociacion: 'Negociación', ganado: 'Ganado', perdido: 'Perdido' };
const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

function barrasHTML(items, etiqueta = e => e.etiqueta, valor = e => e.n, sufijo = '') {
  if (!items.length) return '<p class="nota" style="margin:0">Sin datos aún.</p>';
  const max = Math.max(...items.map(valor), 1);
  return items.map(it => {
    const v = valor(it), pct = Math.max(v / max * 100, 2);
    return `<div class="barra-fila">
      <span class="barra-etq" title="${esc(etiqueta(it))}">${esc(etiqueta(it))}</span>
      <span class="barra-pista"><span class="barra-relleno" style="width:${pct}%"></span></span>
      <span class="barra-val">${esc(v)}${sufijo}</span>
    </div>`;
  }).join('');
}
function columnasHTML(items) {
  if (!items.length) return '<p class="nota" style="margin:0">Sin datos aún.</p>';
  const max = Math.max(...items.map(i => i.n), 1);
  return `<div class="columnas-wrap">${items.map(it => {
    const [a, m] = it.mes.split('-');
    const etq = `${MESES[parseInt(m, 10) - 1]} ${a.slice(2)}`;
    return `<div class="columna-item">
      <span class="columna-val">${it.n}</span>
      <span class="columna-barra" style="height:${Math.max(it.n / max * 100, 4)}%"></span>
      <span class="columna-etq">${etq}</span>
    </div>`;
  }).join('')}</div>`;
}

async function cargarPanel() {
  const d = await api('/kpis');
  const fechaTxt = new Date().toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  $('#panel-fecha').textContent = fechaTxt.charAt(0).toUpperCase() + fechaTxt.slice(1);
  const tasa = v => v == null ? '—' : v + '%';
  $('#panel-tarjetas').innerHTML = `
    <div class="tarjeta azul"><div class="num">${d.clientes}</div><div class="etq">Clientes${d.prospectos ? ` · ${d.prospectos} prospectos` : ''}</div></div>
    <div class="tarjeta verde"><div class="num">${d.polizasVigentes}</div><div class="etq">Pólizas vigentes</div></div>
    <div class="tarjeta azul"><div class="num">${fmtCOPk(d.primaAdministrada)}</div><div class="etq">Prima administrada</div></div>
    <div class="tarjeta verde"><div class="num">${fmtCOPk(d.comisionAnual)}</div><div class="etq">Comisión anual estimada</div></div>
    <div class="tarjeta ambar"><div class="num">${d.porRenovar30}</div><div class="etq">Por renovar (30 días)</div></div>
    <div class="tarjeta rojo"><div class="num">${d.vencidas}</div><div class="etq">Pólizas vencidas</div></div>
    <div class="tarjeta rojo"><div class="num">${d.cuotasVencidasN}</div><div class="etq">Cuotas vencidas${d.cuotasVencidasV ? ` · ${fmtCOPk(d.cuotasVencidasV)}` : ''}</div></div>
    <div class="tarjeta ambar"><div class="num">${d.cuotasPendientesN}</div><div class="etq">Cuotas por cobrar${d.cuotasPendientesV ? ` · ${fmtCOPk(d.cuotasPendientesV)}` : ''}</div></div>
    <div class="tarjeta azul"><div class="num">${d.negociosAbiertos}</div><div class="etq">Negocios abiertos${d.valorPipeline ? ` · ${fmtCOPk(d.valorPipeline)}` : ''}</div></div>
    <div class="tarjeta verde"><div class="num">${tasa(d.tasaRenovacion)}</div><div class="etq">Tasa de renovación</div></div>
    <div class="tarjeta verde"><div class="num">${tasa(d.tasaCierre)}</div><div class="etq">Tasa de cierre (ventas)</div></div>`;

  $('#grafico-aseguradora').innerHTML = barrasHTML(d.porAseguradora);
  $('#grafico-ramo').innerHTML = barrasHTML(d.porRamo);
  $('#grafico-mes').innerHTML = columnasHTML(d.nuevasPorMes);
  const embudoOrden = ['nuevo', 'contactado', 'cotizacion', 'negociacion', 'ganado', 'perdido']
    .map(et => d.embudo.find(e => e.etapa === et)).filter(Boolean)
    .map(e => ({ etiqueta: ETAPA_ETQ[e.etapa] || e.etapa, n: e.n }));
  $('#grafico-embudo').innerHTML = barrasHTML(embudoOrden);

  $('#tabla-renovaciones tbody').innerHTML = d.proximasRenovaciones.map(p => `
    <tr><td><b>${esc(p.fecha_fin)}</b></td><td>${esc(p.cliente)}</td><td>${esc(p.ramo)}</td>
    <td>${esc(p.aseguradora)}</td><td>${esc(p.riesgo)}</td><td>${fmtCOP.format(p.prima_total || 0)}</td></tr>`).join('')
    || '<tr><td colspan="6">Sin renovaciones próximas</td></tr>';
  $('#lista-cumple').innerHTML = d.cumpleanos.map(c =>
    `<li>🎂 <b>${esc(c.nombres)} ${esc(c.apellidos || '')}</b> — ${esc((c.fecha_nacimiento || '').slice(5))}</li>`).join('')
    || '<li>Sin cumpleaños en los próximos 7 días</li>';
}

// ---------- Clientes ----------
let timerBuscarCliente;
$('#buscar-cliente').addEventListener('input', () => {
  clearTimeout(timerBuscarCliente);
  timerBuscarCliente = setTimeout(cargarClientes, 300);
});
async function cargarClientes() {
  const lista = await api('/clientes?q=' + encodeURIComponent($('#buscar-cliente').value));
  $('#tabla-clientes tbody').innerHTML = lista.map(c => `
    <tr>
      <td><b>${esc(c.nombres)} ${esc(c.apellidos || '')}</b>${c.placa ? `<br><small>🚗 ${esc(c.placa)}</small>` : ''}</td>
      <td>${esc(c.num_doc)}</td><td>${esc(c.celular || '')}</td><td>${esc(c.email || '')}</td>
      <td>${pill(c.estado)}</td>
      <td>${c.notif_whatsapp ? '📱' : ''}${c.notif_email ? '✉️' : ''}</td>
      <td class="acciones">
        <button class="mini" onclick="abrirMensajeManual(${c.id}, '${esc(c.nombres)}')">💬</button>
        <button class="mini" onclick="abrirCliente(${c.id})">Editar</button>
      </td>
    </tr>`).join('') || '<tr><td colspan="7">Sin clientes. Importa los Excel de SOFTseguros en 📥 Importar.</td></tr>';
}

window.abrirCliente = async function (id = null, prefill = null) {
  const c = id ? await api('/clientes/' + id) : (prefill || {});
  $('#modal-contenido').innerHTML = `
    <h3>${id ? 'Editar' : 'Crear'} cliente</h3>
    <div class="form-grid">
      <div class="ancho-2"><label>Nombres / Razón social *</label><input id="f-nombres" value="${esc(c.nombres || '')}"></div>
      <div><label>Apellidos</label><input id="f-apellidos" value="${esc(c.apellidos || '')}"></div>
      <div><label>Tipo doc.</label><select id="f-tipo_doc">
        ${['CC', 'NIT', 'CE', 'TI', 'PAS'].map(t => `<option ${c.tipo_doc === t ? 'selected' : ''}>${t}</option>`).join('')}
      </select></div>
      <div><label>Documento *</label><input id="f-num_doc" value="${esc(c.num_doc || '')}"></div>
      <div><label>Fecha nacimiento</label><input id="f-fecha_nacimiento" type="date" value="${esc(c.fecha_nacimiento || '')}"></div>
      <div><label>Celular</label><input id="f-celular" value="${esc(c.celular || '')}"></div>
      <div><label>Email</label><input id="f-email" value="${esc(c.email || '')}"></div>
      <div><label>Estado</label><select id="f-estado">
        ${['cliente', 'prospecto', 'inactivo'].map(t => `<option ${c.estado === t ? 'selected' : ''}>${t}</option>`).join('')}
      </select></div>
      <div><label>Ciudad</label><input id="f-ciudad" value="${esc(c.ciudad || '')}"></div>
      <div class="ancho-2"><label>Dirección</label><input id="f-direccion" value="${esc(c.direccion || '')}"></div>
      <div><label>Placa vehículo</label><input id="f-placa" value="${esc(c.placa || '')}"></div>
      <div><label>SOAT vence</label><input id="f-soat_vence" type="date" value="${esc(c.soat_vence || '')}"></div>
      <div><label>Tecnomecánica vence</label><input id="f-tecno_vence" type="date" value="${esc(c.tecno_vence || '')}"></div>
      <div class="ancho-3"><label>Observaciones</label><textarea id="f-observaciones">${esc(c.observaciones || '')}</textarea></div>
      <div class="ancho-3" style="display:flex;gap:18px;margin-top:10px">
        <label class="check"><input type="checkbox" id="f-notif_whatsapp" ${c.notif_whatsapp !== 0 ? 'checked' : ''}> Recordatorios WhatsApp</label>
        <label class="check"><input type="checkbox" id="f-notif_email" ${c.notif_email !== 0 ? 'checked' : ''}> Recordatorios correo</label>
        <label class="check"><input type="checkbox" id="f-notif_cumpleanos" ${c.notif_cumpleanos !== 0 ? 'checked' : ''}> Tarjeta cumpleaños</label>
      </div>
    </div>
    ${id && c.polizas?.length ? `<hr><h3>Pólizas (${c.polizas.length})</h3>
      ${c.polizas.map(p => `<div>📄 ${esc(p.numero)} — ${esc(p.ramo)} ${esc(p.aseguradora)} ${pill(p.estado)} vence ${esc(p.fecha_fin || '')}</div>`).join('')}` : ''}
    <div class="fila-botones" style="justify-content:flex-end">
      ${id ? `<button class="peligro" onclick="inactivarCliente(${id})">Inactivar</button>` : ''}
      <button onclick="cerrarModal()">Cancelar</button>
      <button class="primario" onclick="guardarCliente(${id || 'null'})">Guardar</button>
    </div>`;
  $('#modal').classList.remove('oculta');
};

window.guardarCliente = async function (id) {
  const datos = {};
  ['nombres','apellidos','tipo_doc','num_doc','fecha_nacimiento','celular','email','estado','ciudad','direccion','placa','soat_vence','tecno_vence','observaciones']
    .forEach(k => datos[k] = $(`#f-${k}`).value || null);
  ['notif_whatsapp','notif_email','notif_cumpleanos'].forEach(k => datos[k] = $(`#f-${k}`).checked ? 1 : 0);
  if (id) {
    const previo = await api('/clientes/' + id);
    Object.keys(previo).forEach(k => { if (datos[k] === undefined && !['polizas','notificaciones','id'].includes(k)) datos[k] = previo[k]; });
  }
  try {
    const r = await (id ? api('/clientes/' + id, 'PUT', datos) : api('/clientes', 'POST', datos));
    cerrarModal(); toast('Cliente guardado ✅'); cargarClientes();
    if (!id && window._trasCrearCliente) {
      const cb = window._trasCrearCliente; window._trasCrearCliente = null;
      cb(r.id);
    }
  } catch (e) { toast(e.message, true); }
};
window.inactivarCliente = async function (id) {
  if (!confirm('¿Inactivar este cliente? Dejará de recibir recordatorios.')) return;
  await api('/clientes/' + id, 'DELETE');
  cerrarModal(); cargarClientes();
};

// ---------- Mensaje manual ----------
window.abrirMensajeManual = function (clienteId, nombre, contexto = '') {
  $('#modal-contenido').innerHTML = `
    <h3>Enviar mensaje a ${esc(nombre)}</h3>
    <label>Canal</label>
    <select id="mm-canal"><option value="whatsapp">WhatsApp</option><option value="email">Correo</option></select>
    <label>¿Sobre qué es el mensaje? (opcional, para la IA)</label>
    <input id="mm-contexto" value="${esc(contexto)}" placeholder="Ej: invitarlo a cotizar un seguro de vida, o agradecer su renovación">
    <label>Asunto (solo correo)</label><input id="mm-asunto">
    <label>Mensaje</label><textarea id="mm-mensaje" style="min-height:110px"></textarea>
    <div class="fila-botones" style="justify-content:space-between">
      <button onclick="redactarIA(${clienteId})" id="btn-ia-mm">✨ Redactar con IA</button>
      <span>
        <button onclick="cerrarModal()">Cancelar</button>
        <button class="primario" onclick="enviarMensajeManual(${clienteId})">📤 Enviar</button>
      </span>
    </div>`;
  $('#modal').classList.remove('oculta');
};
window.redactarIA = async function (clienteId) {
  const btn = $('#btn-ia-mm');
  const original = btn.textContent;
  btn.disabled = true; btn.textContent = '✨ Redactando…';
  try {
    const r = await api('/ia/redactar', 'POST', {
      cliente_id: clienteId, tipo: 'manual', canal: $('#mm-canal').value,
      contexto: $('#mm-contexto').value
    });
    $('#mm-mensaje').value = r.mensaje || '';
    if (r.asunto && $('#mm-asunto')) $('#mm-asunto').value = r.asunto;
    toast('Mensaje redactado por IA ✨ — revísalo antes de enviar');
  } catch (e) { toast(e.message, true); }
  finally { btn.disabled = false; btn.textContent = original; }
};
window.enviarMensajeManual = async function (clienteId) {
  try {
    await api('/mensaje-manual', 'POST', {
      cliente_id: clienteId, canal: $('#mm-canal').value,
      asunto: $('#mm-asunto').value, mensaje: $('#mm-mensaje').value
    });
    cerrarModal(); toast('Mensaje enviado ✅');
  } catch (e) { toast(e.message, true); }
};

// ---------- Pólizas ----------
let timerBuscarPoliza;
$('#buscar-poliza').addEventListener('input', () => {
  clearTimeout(timerBuscarPoliza);
  timerBuscarPoliza = setTimeout(cargarPolizas, 300);
});
$('#filtro-estado-poliza').addEventListener('change', cargarPolizas);
async function cargarPolizas() {
  const q = encodeURIComponent($('#buscar-poliza').value);
  const est = $('#filtro-estado-poliza').value;
  const lista = await api(`/polizas?q=${q}${est ? '&estado=' + est : ''}`);
  $('#tabla-polizas tbody').innerHTML = lista.map(p => `
    <tr>
      <td><b>${esc(p.numero)}</b></td><td>${esc(p.cliente)}</td><td>${esc(p.aseguradora)}</td>
      <td>${esc(p.ramo)}</td><td>${esc(p.riesgo || '')}</td><td>${esc(p.fecha_fin || '')}</td>
      <td>${fmtCOP.format(p.prima_total || 0)}</td><td>${fmtCOP.format(p.comision_agencia || 0)}</td>
      <td>${pill(p.estado)}</td>
      <td class="acciones"><button class="mini" onclick="abrirPoliza(${p.id})">Editar</button></td>
    </tr>`).join('') || '<tr><td colspan="10">Sin pólizas</td></tr>';
}

// Leer carátula de póliza en PDF con IA y precargar el formulario
window.leerPolizaPDF = async function (input) {
  const file = input.files[0];
  input.value = '';
  if (!file) return;
  const btn = $('#btn-leer-pdf');
  const original = btn.textContent;
  btn.disabled = true; btn.textContent = '✨ Leyendo PDF…';
  try {
    const buf = await file.arrayBuffer();
    const resp = await fetch('/api/ia/leer-poliza', {
      method: 'POST', headers: { 'Content-Type': 'application/pdf' }, body: buf
    });
    const data = await resp.json();
    if (!resp.ok) throw new Error(data.error || 'No se pudo leer el PDF');
    const pol = data.poliza || {}, cl = data.cliente || {};
    const prefillPoliza = {
      numero: pol.numero || '', aseguradora: pol.aseguradora || '', ramo: pol.ramo || '',
      riesgo: pol.riesgo || '', fecha_inicio: pol.fecha_inicio || '', fecha_fin: pol.fecha_fin || '',
      prima_neta: pol.prima_neta || '', prima_total: pol.prima_total || '', estado: 'vigente'
    };
    if (data.cliente_existente) {
      prefillPoliza.cliente_id = data.cliente_existente.id;
      toast(`Cliente encontrado: ${data.cliente_existente.nombres}. Revisa los datos extraídos antes de guardar ✨`);
      abrirPoliza(null, prefillPoliza);
    } else {
      const nombre = `${cl.nombres || ''} ${cl.apellidos || ''}`.trim() || 'sin nombre';
      if (!confirm(`El tomador "${nombre}" (doc ${cl.num_doc || '—'}) no está en tus clientes.\n\nRevisa y guarda primero el cliente; luego seguimos con la póliza.`)) return;
      window._trasCrearCliente = (nuevoId) => { prefillPoliza.cliente_id = nuevoId; abrirPoliza(null, prefillPoliza); };
      abrirCliente(null, { ...cl, estado: 'cliente' });
    }
  } catch (e) { toast(e.message, true); }
  finally { btn.disabled = false; btn.textContent = original; }
};

window.abrirPoliza = async function (id = null, prefill = null) {
  let p = prefill || {};
  if (id) {
    const todas = await api('/polizas?q=');
    p = todas.find(x => x.id === id) || {};
  }
  const clientes = await api('/clientes?q=');
  $('#modal-contenido').innerHTML = `
    <h3>${id ? 'Editar' : 'Crear'} póliza</h3>
    <div class="form-grid">
      <div class="ancho-2"><label>Cliente *</label><select id="p-cliente_id">
        <option value="">— seleccionar —</option>
        ${clientes.map(c => `<option value="${c.id}" ${p.cliente_id === c.id ? 'selected' : ''}>${esc(c.nombres)} ${esc(c.apellidos || '')} (${esc(c.num_doc)})</option>`).join('')}
      </select></div>
      <div><label>Número póliza *</label><input id="p-numero" value="${esc(p.numero || '')}"></div>
      <div><label>Aseguradora</label><input id="p-aseguradora" list="lista-aseguradoras" value="${esc(p.aseguradora || '')}">
        <datalist id="lista-aseguradoras">
          ${['ASEGURADORA SOLIDARIA','AXA COLPATRIA SEGUROS','HDI SEGUROS','SEGUROS MUNDIAL','SEGUROS DEL ESTADO','ALLIANZ SEGUROS','SBS SEGUROS','SEGUROS COMERCIALES BOLÍVAR','SEGUROS GENERALES SURAMERICANA'].map(a => `<option>${a}</option>`).join('')}
        </datalist></div>
      <div><label>Ramo</label><input id="p-ramo" list="lista-ramos" value="${esc(p.ramo || 'Automóviles')}">
        <datalist id="lista-ramos">${['Automóviles','SOAT','Todo riesgo','Vida','Salud','Transporte','Hogar'].map(r => `<option>${r}</option>`).join('')}</datalist></div>
      <div><label>Riesgo (placa…)</label><input id="p-riesgo" value="${esc(p.riesgo || '')}"></div>
      <div><label>Estado</label><select id="p-estado">
        ${['vigente','cotizacion','en_expedicion','vencida','renovada','cancelada'].map(t => `<option ${p.estado === t ? 'selected' : ''}>${t}</option>`).join('')}
      </select></div>
      <div><label>Fecha inicio</label><input id="p-fecha_inicio" type="date" value="${esc(p.fecha_inicio || '')}"></div>
      <div><label>Fecha fin</label><input id="p-fecha_fin" type="date" value="${esc(p.fecha_fin || '')}"></div>
      <div><label>Prima neta</label><input id="p-prima_neta" type="number" value="${p.prima_neta || ''}"></div>
      <div><label>Prima total</label><input id="p-prima_total" type="number" value="${p.prima_total || ''}"></div>
      <div><label>% comisión</label><input id="p-pct_comision" type="number" step="0.1" value="${p.pct_comision || ''}"></div>
      <div><label>Comisión agencia</label><input id="p-comision_agencia" type="number" value="${p.comision_agencia || ''}"></div>
      <div class="ancho-3"><label>Observaciones</label><textarea id="p-observaciones">${esc(p.observaciones || '')}</textarea></div>
      <div class="ancho-3" style="display:flex;gap:18px;margin-top:10px">
        <label class="check"><input type="checkbox" id="p-renovable" ${p.renovable !== 0 ? 'checked' : ''}> Renovable</label>
        <label class="check"><input type="checkbox" id="p-notif_renovacion" ${p.notif_renovacion !== 0 ? 'checked' : ''}> Avisar renovación al cliente</label>
      </div>
    </div>
    ${id ? `<hr><div id="cuotas-zona"><h3>Cuotas de pago</h3><div id="lista-cuotas">Cargando…</div>
      <div class="fila-botones"><input id="q-valor" type="number" placeholder="Valor"><input id="q-fecha" type="date">
      <button onclick="agregarCuota(${id})">+ Agregar cuota</button></div></div>` : ''}
    <div class="fila-botones" style="justify-content:flex-end">
      ${id ? `<button class="peligro" onclick="eliminarPoliza(${id})">Eliminar</button>` : ''}
      <button onclick="cerrarModal()">Cancelar</button>
      <button class="primario" onclick="guardarPoliza(${id || 'null'})">Guardar</button>
    </div>`;
  $('#modal').classList.remove('oculta');
  if (id) cargarCuotas(id);
};

async function cargarCuotas(polizaId) {
  const cuotas = await api(`/polizas/${polizaId}/cuotas`);
  $('#lista-cuotas').innerHTML = cuotas.map(q => `
    <div style="display:flex;gap:10px;align-items:center;padding:5px 0">
      <span>#${q.numero}</span><b>${fmtCOP.format(q.valor)}</b><span>vence ${esc(q.fecha_vence)}</span>${pill(q.estado)}
      ${q.estado === 'pendiente' ? `<button class="mini" onclick="pagarCuota(${q.id}, ${polizaId})">✓ Marcar pagada</button>` : ''}
    </div>`).join('') || '<p class="nota">Sin cuotas registradas (pago de contado o sin financiación).</p>';
}
window.agregarCuota = async function (polizaId) {
  const valor = parseFloat($('#q-valor').value), fecha = $('#q-fecha').value;
  if (!valor || !fecha) return toast('Valor y fecha son obligatorios', true);
  const existentes = await api(`/polizas/${polizaId}/cuotas`);
  await api(`/polizas/${polizaId}/cuotas`, 'POST', { numero: existentes.length + 1, valor, fecha_vence: fecha });
  cargarCuotas(polizaId);
};
window.pagarCuota = async function (cuotaId, polizaId) {
  await api(`/cuotas/${cuotaId}`, 'PUT', { estado: 'pagada', fecha_pago: new Date().toISOString().slice(0, 10) });
  cargarCuotas(polizaId);
};

window.guardarPoliza = async function (id) {
  const datos = {};
  ['cliente_id','numero','aseguradora','ramo','riesgo','estado','fecha_inicio','fecha_fin',
   'prima_neta','prima_total','pct_comision','comision_agencia','observaciones']
    .forEach(k => datos[k] = $(`#p-${k}`).value || null);
  datos.renovable = $('#p-renovable').checked ? 1 : 0;
  datos.notif_renovacion = $('#p-notif_renovacion').checked ? 1 : 0;
  try {
    await (id ? api('/polizas/' + id, 'PUT', datos) : api('/polizas', 'POST', datos));
    cerrarModal(); toast('Póliza guardada ✅'); cargarPolizas();
  } catch (e) { toast(e.message, true); }
};
window.eliminarPoliza = async function (id) {
  if (!confirm('¿Eliminar esta póliza definitivamente?')) return;
  await api('/polizas/' + id, 'DELETE');
  cerrarModal(); cargarPolizas();
};

// ---------- RUNT (SOAT / tecnomecánica) ----------
let runtVehiculos = [];
function estadoVenc(fecha) {
  if (!fecha) return { txt: 'sin fecha', cls: 'estado-inactivo', grupo: 'sin' };
  const hoy = new Date().toISOString().slice(0, 10);
  const en30 = new Date(Date.now() + 30 * 864e5).toISOString().slice(0, 10);
  if (fecha < hoy) return { txt: 'vencido ' + fecha, cls: 'estado-vencida', grupo: 'vencido' };
  if (fecha <= en30) return { txt: 'vence ' + fecha, cls: 'estado-pendiente', grupo: 'pronto' };
  return { txt: fecha, cls: 'estado-vigente', grupo: 'vigente' };
}
async function cargarRunt() {
  runtVehiculos = await api('/runt/pendientes');
  pintarRunt();
}
function pintarRunt() {
  const f = $('#filtro-runt').value;
  const q = ($('#buscar-runt').value || '').toLowerCase();
  const lista = runtVehiculos.filter(v => {
    if (q && !(`${v.nombre} ${v.placa} ${v.num_doc}`.toLowerCase().includes(q))) return false;
    if (!f) return true;
    const s = estadoVenc(v.soat_vence).grupo, t = estadoVenc(v.tecno_vence).grupo;
    return s === f || t === f;
  });
  const pillVenc = fecha => { const e = estadoVenc(fecha); return `<span class="estado-pill ${e.cls}">${esc(e.txt)}</span>`; };
  $('#tabla-runt tbody').innerHTML = lista.map(v => `
    <tr>
      <td><b>${esc(v.nombre)}</b></td>
      <td>🚗 ${esc(v.placa)}</td>
      <td>${esc(v.num_doc)}</td>
      <td>${pillVenc(v.soat_vence)}</td>
      <td>${pillVenc(v.tecno_vence)}</td>
      <td class="acciones"><button class="mini primario" onclick="abrirCapturaRunt(${v.id})">Consultar RUNT</button></td>
    </tr>`).join('') || '<tr><td colspan="6">Sin vehículos. Importa clientes con placa o agrégala en cada cliente.</td></tr>';
}

window.copiar = async function (texto, btn) {
  try { await navigator.clipboard.writeText(texto); if (btn) { const o = btn.textContent; btn.textContent = '✓ copiado'; setTimeout(() => btn.textContent = o, 1200); } }
  catch { toast('No se pudo copiar', true); }
};
window.abrirCapturaRunt = function (id) {
  const v = runtVehiculos.find(x => x.id === id);
  if (!v) return;
  $('#modal-contenido').innerHTML = `
    <h3>Consultar RUNT — ${esc(v.nombre)}</h3>
    <p class="nota">1) Copia placa y cédula · 2) Abre el RUNT y resuelve el captcha · 3) Pega el resultado o escribe las fechas.</p>
    <div class="runt-datos">
      <div><label>Placa</label><div class="runt-dato"><b>${esc(v.placa)}</b><button class="mini" onclick="copiar('${esc(v.placa)}', this)">Copiar</button></div></div>
      <div><label>Documento</label><div class="runt-dato"><b>${esc(v.num_doc)}</b><button class="mini" onclick="copiar('${esc(v.num_doc)}', this)">Copiar</button></div></div>
      <div style="align-self:end"><a href="https://www.runt.gov.co/" target="_blank" rel="noopener"><button class="primario">Abrir RUNT ↗</button></a></div>
    </div>
    <label>Pega aquí el resultado del RUNT (opcional, extrae las fechas solo)</label>
    <textarea id="runt-texto" style="min-height:90px" placeholder="Pega el texto de la consulta del RUNT…"></textarea>
    <div class="fila-botones"><button onclick="extraerRunt()">✨ Extraer fechas del texto</button></div>
    <div class="form-grid" style="margin-top:6px">
      <div><label>SOAT vence</label><input id="runt-soat" type="date" value="${esc(v.soat_vence || '')}"></div>
      <div><label>Tecnomecánica vence</label><input id="runt-tecno" type="date" value="${esc(v.tecno_vence || '')}"></div>
      <div><label>Impuestos vence</label><input id="runt-impuestos" type="date" value="${esc(v.impuestos_vence || '')}"></div>
    </div>
    <div class="fila-botones" style="justify-content:flex-end">
      <button onclick="cerrarModal()">Cancelar</button>
      <button class="primario" onclick="guardarVencimientos(${id})">Guardar fechas</button>
    </div>`;
  $('#modal').classList.remove('oculta');
};
window.extraerRunt = async function () {
  const texto = $('#runt-texto').value;
  if (!texto.trim()) return toast('Pega primero el resultado del RUNT', true);
  try {
    const r = await api('/runt/extraer', 'POST', { texto });
    if (r.soat_vence) $('#runt-soat').value = r.soat_vence;
    if (r.tecno_vence) $('#runt-tecno').value = r.tecno_vence;
    toast(r.soat_vence || r.tecno_vence ? 'Fechas extraídas ✨ — revísalas antes de guardar' : 'No encontré fechas en el texto', !(r.soat_vence || r.tecno_vence));
  } catch (e) { toast(e.message, true); }
};
window.guardarVencimientos = async function (id) {
  await api(`/clientes/${id}/vencimientos`, 'PUT', {
    soat_vence: $('#runt-soat').value || null,
    tecno_vence: $('#runt-tecno').value || null,
    impuestos_vence: $('#runt-impuestos').value || null
  });
  cerrarModal(); toast('Vencimientos guardados ✅'); cargarRunt();
};
$('#filtro-runt').addEventListener('change', pintarRunt);
let timerBuscarRunt;
$('#buscar-runt').addEventListener('input', () => { clearTimeout(timerBuscarRunt); timerBuscarRunt = setTimeout(pintarRunt, 250); });

// ---------- Embudo de ventas (negocios) ----------
const ETAPAS = [
  { id: 'nuevo', etq: 'Nuevo' },
  { id: 'contactado', etq: 'Contactado' },
  { id: 'cotizacion', etq: 'Cotización enviada' },
  { id: 'negociacion', etq: 'Negociación' },
  { id: 'ganado', etq: 'Ganado' },
  { id: 'perdido', etq: 'Perdido' }
];
const ORIGENES = ['Referido', 'WhatsApp', 'Instagram', 'Facebook', 'Llamada', 'Página web', 'Recomendado', 'Base existente'];
let negociosActuales = [];

async function cargarNegocios() {
  negociosActuales = await api('/negocios');
  const abiertos = negociosActuales.filter(n => !['ganado', 'perdido'].includes(n.etapa));
  const suma = abiertos.reduce((s, n) => s + (n.valor_estimado || 0), 0);
  $('#embudo-resumen').textContent = `${abiertos.length} negocio(s) abiertos · ${fmtCOP.format(suma)} en juego`;
  pintarEmbudo();
}
function pintarEmbudo() {
  $('#embudo-board').innerHTML = ETAPAS.map(et => {
    const lista = negociosActuales.filter(n => n.etapa === et.id);
    const suma = lista.reduce((s, n) => s + (n.valor_estimado || 0), 0);
    return `<div class="embudo-col col-${et.id}">
      <div class="embudo-col-cab">
        <div class="tit"><span>${et.etq}</span><span class="cuenta">${lista.length}</span></div>
        <div class="sub">${fmtCOP.format(suma)}</div>
      </div>
      <div class="embudo-cards" data-etapa="${et.id}"
        ondragover="embudoDragOver(event)" ondragleave="embudoDragLeave(event)" ondrop="embudoDrop(event,'${et.id}')">
        ${lista.map(cardNegocio).join('') || '<p class="embudo-vacio">—</p>'}
      </div>
    </div>`;
  }).join('');
}
function cardNegocio(n) {
  const nombre = n.cliente_nombre || n.prospecto_nombre || 'Sin nombre';
  return `<div class="negocio-card" draggable="true" ondragstart="embudoDragStart(event,${n.id})" onclick="abrirNegocio(${n.id})">
    <div class="nc-tit">${esc(n.titulo)}</div>
    <div class="nc-cliente">${n.cliente_id ? '👤' : '✨'} ${esc(nombre)}${n.ramo ? ` · ${esc(n.ramo)}` : ''}</div>
    <div class="nc-meta">
      <span class="nc-valor">${n.valor_estimado ? fmtCOP.format(n.valor_estimado) : ''}</span>
      <span class="nc-origen">${esc(n.origen || '')}</span>
    </div>
    ${n.proxima_accion ? `<div class="nc-accion">⏰ ${esc(n.proxima_accion)}${n.fecha_proxima_accion ? ` · ${esc(n.fecha_proxima_accion)}` : ''}</div>` : ''}
  </div>`;
}

let _negocioArrastrado = null;
window.embudoDragStart = (e, id) => { _negocioArrastrado = id; e.dataTransfer.effectAllowed = 'move'; };
window.embudoDragOver = (e) => { e.preventDefault(); e.currentTarget.classList.add('drag-over'); };
window.embudoDragLeave = (e) => { e.currentTarget.classList.remove('drag-over'); };
window.embudoDrop = async (e, etapa) => {
  e.preventDefault(); e.currentTarget.classList.remove('drag-over');
  const id = _negocioArrastrado; _negocioArrastrado = null;
  if (id == null) return;
  const n = negociosActuales.find(x => x.id === id);
  if (!n || n.etapa === etapa) return;
  try {
    await api(`/negocios/${id}/etapa`, 'PUT', { etapa });
    await cargarNegocios();
    if (etapa === 'ganado') ofrecerConversion({ ...n, etapa });
    else if (etapa === 'perdido') toast('Negocio marcado como perdido');
  } catch (err) { toast(err.message, true); }
};

// Al ganar: ofrece crear el cliente (si es prospecto) y la póliza, reutilizando los modales existentes
function ofrecerConversion(n) {
  const prefillPoliza = {
    ramo: n.ramo || 'Automóviles', aseguradora: n.aseguradora || '',
    prima_total: n.valor_estimado || '', estado: 'vigente'
  };
  if (n.cliente_id) {
    if (confirm('¡Negocio ganado! 🎉 ¿Crear ahora la póliza con estos datos?')) {
      prefillPoliza.cliente_id = n.cliente_id;
      abrirPoliza(null, prefillPoliza);
    }
  } else {
    if (confirm('¡Negocio ganado! 🎉 Este prospecto aún no es cliente. ¿Crearlo como cliente y luego su póliza?')) {
      const partes = (n.prospecto_nombre || '').trim().split(' ');
      const prefillCliente = {
        nombres: partes.slice(0, -1).join(' ') || partes[0] || '',
        apellidos: partes.length > 1 ? partes.slice(-1).join(' ') : '',
        celular: n.prospecto_celular || '', email: n.prospecto_email || '', estado: 'cliente'
      };
      window._trasCrearCliente = async (nuevoId) => {
        await api('/negocios/' + n.id, 'PUT', { cliente_id: nuevoId });
        prefillPoliza.cliente_id = nuevoId;
        abrirPoliza(null, prefillPoliza);
      };
      abrirCliente(null, prefillCliente);
    }
  }
}

window.abrirNegocio = async function (id = null) {
  const n = id ? (negociosActuales.find(x => x.id === id) || await api('/negocios/' + id)) : {};
  const clientes = await api('/clientes?q=');
  $('#modal-contenido').innerHTML = `
    <h3>${id ? 'Editar' : 'Nuevo'} negocio</h3>
    <div class="form-grid">
      <div class="ancho-3"><label>Título / qué busca *</label><input id="n-titulo" value="${esc(n.titulo || '')}" placeholder="Ej: Todo riesgo Mazda 3 — referido de Ana"></div>
      <div class="ancho-2"><label>Cliente (si ya existe en tu base)</label><select id="n-cliente_id">
        <option value="">— es un prospecto nuevo —</option>
        ${clientes.map(c => `<option value="${c.id}" ${n.cliente_id === c.id ? 'selected' : ''}>${esc(c.nombres)} ${esc(c.apellidos || '')} (${esc(c.num_doc)})</option>`).join('')}
      </select></div>
      <div><label>Etapa</label><select id="n-etapa">
        ${ETAPAS.map(e => `<option value="${e.id}" ${(n.etapa || 'nuevo') === e.id ? 'selected' : ''}>${e.etq}</option>`).join('')}
      </select></div>
      <div><label>Nombre del prospecto</label><input id="n-prospecto_nombre" value="${esc(n.prospecto_nombre || '')}" placeholder="Si aún no es cliente"></div>
      <div><label>Celular</label><input id="n-prospecto_celular" value="${esc(n.prospecto_celular || '')}"></div>
      <div><label>Email</label><input id="n-prospecto_email" value="${esc(n.prospecto_email || '')}"></div>
      <div><label>Ramo</label><input id="n-ramo" list="lista-ramos-neg" value="${esc(n.ramo || 'Automóviles')}">
        <datalist id="lista-ramos-neg">${['Automóviles','SOAT','Todo riesgo','Vida','Salud','Transporte','Hogar'].map(r => `<option>${r}</option>`).join('')}</datalist></div>
      <div><label>Aseguradora de interés</label><input id="n-aseguradora" list="lista-aseguradoras-neg" value="${esc(n.aseguradora || '')}">
        <datalist id="lista-aseguradoras-neg">${['ASEGURADORA SOLIDARIA','AXA COLPATRIA SEGUROS','HDI SEGUROS','SEGUROS MUNDIAL','SEGUROS DEL ESTADO'].map(a => `<option>${a}</option>`).join('')}</datalist></div>
      <div><label>Valor estimado (prima)</label><input id="n-valor_estimado" type="number" value="${n.valor_estimado || ''}"></div>
      <div><label>Origen</label><input id="n-origen" list="lista-origenes" value="${esc(n.origen || '')}">
        <datalist id="lista-origenes">${ORIGENES.map(o => `<option>${o}</option>`).join('')}</datalist></div>
      <div><label>Vendedor</label><input id="n-vendedor" value="${esc(n.vendedor || '')}"></div>
      <div><label>Próxima acción</label><input id="n-proxima_accion" value="${esc(n.proxima_accion || '')}" placeholder="Ej: llamar para confirmar"></div>
      <div><label>Fecha próxima acción</label><input id="n-fecha_proxima_accion" type="date" value="${esc(n.fecha_proxima_accion || '')}"></div>
      <div class="ancho-3"><label>Notas</label><textarea id="n-notas">${esc(n.notas || '')}</textarea></div>
      <div class="ancho-3"><label>Motivo si se pierde</label><input id="n-motivo_perdido" value="${esc(n.motivo_perdido || '')}" placeholder="Ej: precio, se fue con otra agencia"></div>
    </div>
    <div class="fila-botones" style="justify-content:space-between">
      <span>
        ${id && n.cliente_id ? `<button onclick="abrirMensajeManual(${n.cliente_id}, '${esc((n.cliente_nombre || '').replace(/'/g, ''))}', '${esc((n.titulo || '').replace(/'/g, '’'))}')">💬 Mensaje al cliente</button>` : ''}
        ${id ? `<button class="peligro" onclick="eliminarNegocio(${id})">Eliminar</button>` : ''}
      </span>
      <span>
        <button onclick="cerrarModal()">Cancelar</button>
        <button class="primario" onclick="guardarNegocio(${id || 'null'})">Guardar</button>
      </span>
    </div>`;
  $('#modal').classList.remove('oculta');
};

window.guardarNegocio = async function (id) {
  const datos = {};
  ['titulo','cliente_id','prospecto_nombre','prospecto_celular','prospecto_email','ramo','aseguradora',
   'etapa','origen','vendedor','proxima_accion','fecha_proxima_accion','notas','motivo_perdido']
    .forEach(k => datos[k] = $(`#n-${k}`).value || null);
  if (!datos.titulo) return toast('El título es obligatorio', true);
  datos.cliente_id = datos.cliente_id ? Number(datos.cliente_id) : null;
  datos.valor_estimado = parseFloat($('#n-valor_estimado').value) || 0;
  try {
    await (id ? api('/negocios/' + id, 'PUT', datos) : api('/negocios', 'POST', datos));
    cerrarModal(); toast('Negocio guardado ✅'); cargarNegocios();
  } catch (e) { toast(e.message, true); }
};
window.eliminarNegocio = async function (id) {
  if (!confirm('¿Eliminar este negocio del embudo?')) return;
  await api('/negocios/' + id, 'DELETE');
  cerrarModal(); cargarNegocios();
};

// ---------- Notificaciones ----------
$('#filtro-notif').addEventListener('change', cargarNotif);
async function cargarNotif() {
  const estado = $('#filtro-notif').value;
  const lista = await api('/notificaciones?estado=' + estado);
  $('#btn-enviar-todas').style.display = estado === 'pendiente' ? '' : 'none';
  $('#tabla-notif tbody').innerHTML = lista.map(n => `
    <tr>
      <td>${TIPOS_NOTIF[n.tipo] || esc(n.tipo)}</td>
      <td>${n.canal === 'whatsapp' ? '📱 WhatsApp' : '✉️ Correo'}</td>
      <td>${esc(n.cliente || '')}</td><td>${esc(n.destinatario)}</td>
      <td class="msg-celda">${esc(n.mensaje.slice(0, 160))}${n.mensaje.length > 160 ? '…' : ''}
        ${n.error ? `<br><b style="color:var(--rojo)">⚠ ${esc(n.error)}</b>` : ''}</td>
      <td>${pill(n.estado)}${n.enviado_en ? `<br><small>${esc(n.enviado_en)}</small>` : ''}</td>
      <td class="acciones">${n.estado === 'pendiente'
        ? `<button class="mini" title="Reescribir con IA" onclick="redactarNotifIA(${n.id}, this)">✨</button>
           <button class="mini" onclick="enviarNotif([${n.id}])">📤</button>
           <button class="mini peligro" onclick="descartarNotif(${n.id})">✕</button>` : ''}</td>
    </tr>`).join('') || `<tr><td colspan="7">Sin notificaciones ${estado === 'pendiente' ? 'pendientes — usa "Generar alertas de hoy"' : esc(estado + 's')}</td></tr>`;
}
window.generarNotif = async function () {
  const r = await api('/notificaciones/generar', 'POST');
  toast(`Se generaron ${r.creadas} alertas nuevas`);
  cargarNotif();
};
window.enviarNotif = async function (ids = null) {
  toast('Enviando…');
  try {
    const r = await api('/notificaciones/enviar', 'POST', ids ? { ids } : {});
    toast(`Enviadas: ${r.enviadas} · Errores: ${r.errores}`, r.errores > 0);
  } catch (e) { toast(e.message, true); }
  cargarNotif();
};
window.descartarNotif = async function (id) {
  await api(`/notificaciones/${id}/descartar`, 'POST');
  cargarNotif();
};
window.redactarNotifIA = async function (id, btn) {
  btn.disabled = true; btn.textContent = '…';
  try {
    await api(`/notificaciones/${id}/redactar-ia`, 'POST');
    toast('Mensaje reescrito por IA ✨');
    cargarNotif();
  } catch (e) { toast(e.message, true); btn.disabled = false; btn.textContent = '✨'; }
};

// ---------- Oportunidades (análisis de cartera con IA) ----------
const TIPOS_OPORT = {
  venta_cruzada: { etq: 'Venta cruzada', icono: '🎯' },
  renovacion_proxima: { etq: 'Renovación próxima', icono: '🔄' },
  reactivacion: { etq: 'Reactivar cliente', icono: '🌱' },
  soat_tecno: { etq: 'SOAT / Tecnomecánica', icono: '🚗' },
  cumpleanos: { etq: 'Cumpleaños', icono: '🎂' },
  al_dia: { etq: 'Al día', icono: '✅' }
};
const ORDEN_PRIORIDAD = { alta: 0, media: 1, baja: 2 };
let oportActuales = [];

async function cargarOportunidades() {
  const r = await api('/ia/oportunidades');
  oportActuales = r.oportunidades || [];
  $('#oport-fecha').textContent = r.analizado_en
    ? 'Último análisis: ' + new Date(r.analizado_en).toLocaleString('es-CO')
    : '';
  const resumen = $('#oport-resumen');
  if (r.resumen) { resumen.textContent = r.resumen; resumen.classList.remove('oculta'); }
  else resumen.classList.add('oculta');
  // poblar filtro de tipos presentes
  const tipos = [...new Set(oportActuales.map(o => o.tipo))];
  $('#filtro-oport').innerHTML = '<option value="">Todas</option>' +
    tipos.map(t => `<option value="${t}">${TIPOS_OPORT[t]?.etq || t}</option>`).join('');
  $('#filtro-oport').onchange = pintarOportunidades;
  pintarOportunidades();
}

function pintarOportunidades() {
  const filtro = $('#filtro-oport').value;
  const lista = oportActuales
    .filter(o => !filtro || o.tipo === filtro)
    .sort((a, b) => (ORDEN_PRIORIDAD[a.prioridad] ?? 9) - (ORDEN_PRIORIDAD[b.prioridad] ?? 9));
  if (!lista.length) {
    $('#oport-lista').innerHTML = `<p class="nota">${oportActuales.length
      ? 'Sin oportunidades de ese tipo.'
      : 'Aún no has analizado la cartera. Pulsa "✨ Analizar cartera con IA".'}</p>`;
    return;
  }
  $('#oport-lista').innerHTML = lista.map(o => {
    const t = TIPOS_OPORT[o.tipo] || { etq: o.tipo, icono: '•' };
    return `<div class="oport-card prio-${esc(o.prioridad)}">
      <div class="oport-cab">
        <span class="oport-tipo">${t.icono} ${esc(t.etq)}</span>
        <span class="estado-pill prio-pill-${esc(o.prioridad)}">${esc(o.prioridad)}</span>
      </div>
      <div class="oport-cliente"><b>${esc(o.cliente_nombre || '')}</b></div>
      <div class="oport-motivo">${esc(o.motivo)}</div>
      <div class="oport-accion">💡 ${esc(o.accion_sugerida)}</div>
      <div class="fila-botones" style="justify-content:flex-end">
        <button class="mini" onclick="abrirMensajeManual(${o.cliente_id}, '${esc((o.cliente_nombre||'').replace(/'/g,''))}', '${esc((o.accion_sugerida||'').replace(/'/g,'’'))}')">✨ Redactar mensaje</button>
        <button class="mini" onclick="verCliente(${o.cliente_id})">Ver cliente</button>
      </div>
    </div>`;
  }).join('');
}

window.analizarCartera = async function () {
  const btn = $('#btn-analizar');
  btn.disabled = true; btn.textContent = '✨ Analizando cartera…';
  try {
    await api('/ia/analizar-cartera', 'POST');
    toast('Análisis completado ✨');
    await cargarOportunidades();
  } catch (e) { toast(e.message, true); }
  finally { btn.disabled = false; btn.textContent = '✨ Analizar cartera con IA'; }
};
window.verCliente = function (id) { mostrarVista('clientes'); setTimeout(() => abrirCliente(id), 100); };

// ---------- Asistente IA (pregúntale a tu cartera) ----------
let chatHistorial = [];  // turnos para dar contexto a seguimientos
function cargarAsistente() {
  setTimeout(() => $('#chat-input')?.focus(), 50);
}
window.preguntarEjemplo = function (btn) {
  $('#chat-input').value = btn.textContent;
  enviarPregunta(new Event('submit'));
};
window.enviarPregunta = async function (ev) {
  ev.preventDefault();
  const input = $('#chat-input');
  const pregunta = input.value.trim();
  if (!pregunta) return;
  input.value = '';
  $('#chat-ejemplos').style.display = 'none';
  agregarBurbuja('usuario', pregunta);
  const burbujaIA = agregarBurbuja('ia', '…', true);
  $('#chat-enviar').disabled = true;
  try {
    const r = await api('/ia/consultar', 'POST', { pregunta, historial: chatHistorial });
    burbujaIA.querySelector('.chat-texto').textContent = r.respuesta;
    burbujaIA.classList.remove('cargando');
    chatHistorial.push({ role: 'user', content: pregunta }, { role: 'assistant', content: r.respuesta });
    if (chatHistorial.length > 6) chatHistorial = chatHistorial.slice(-6);
  } catch (e) {
    burbujaIA.querySelector('.chat-texto').textContent = '⚠ ' + e.message;
    burbujaIA.classList.remove('cargando');
  } finally {
    $('#chat-enviar').disabled = false;
    input.focus();
  }
};
function agregarBurbuja(quien, texto, cargando = false) {
  const div = document.createElement('div');
  div.className = `chat-burbuja chat-${quien}${cargando ? ' cargando' : ''}`;
  div.innerHTML = `<div class="chat-texto"></div>`;
  div.querySelector('.chat-texto').textContent = texto;
  $('#chat-conversacion').appendChild(div);
  div.scrollIntoView({ behavior: 'smooth', block: 'end' });
  return div;
}

// ---------- Plantillas ----------
async function cargarPlantillas() {
  const lista = await api('/plantillas');
  $('#lista-plantillas').innerHTML = lista.map(p => `
    <div class="plantilla-item">
      <b>${TIPOS_NOTIF[p.tipo] || esc(p.tipo)}</b> — ${p.canal === 'whatsapp' ? '📱 WhatsApp' : '✉️ Correo'}
      ${p.canal === 'email' ? `<label>Asunto</label><input id="pl-asunto-${p.id}" value="${esc(p.asunto)}">` : ''}
      <label>Mensaje</label><textarea id="pl-cuerpo-${p.id}">${esc(p.cuerpo)}</textarea>
      <div class="fila-botones" style="justify-content:flex-end">
        <button class="mini primario" onclick="guardarPlantilla(${p.id}, '${p.canal}')">Guardar</button>
      </div>
    </div>`).join('');
}
window.guardarPlantilla = async function (id, canal) {
  await api('/plantillas/' + id, 'PUT', {
    asunto: canal === 'email' ? $(`#pl-asunto-${id}`).value : '',
    cuerpo: $(`#pl-cuerpo-${id}`).value
  });
  toast('Plantilla guardada ✅');
};

// ---------- Importar ----------
window.importar = async function (tipo) {
  const input = $(`#archivo-${tipo}`);
  const salida = $(`#resultado-imp-${tipo}`);
  if (!input.files[0]) return toast('Selecciona el archivo primero', true);
  salida.textContent = 'Importando…';
  try {
    const buf = await input.files[0].arrayBuffer();
    const r = await api('/importar/' + tipo, 'POST', buf);
    if (tipo === 'clientes')
      salida.textContent = `✅ Importados/actualizados: ${r.insertados}\nOmitidos (sin documento o nombre): ${r.omitidos}`;
    else if (tipo === 'vehiculos')
      salida.textContent = `✅ Clientes actualizados con vehículo: ${r.actualizados}\nOmitidos (sin cliente): ${r.omitidos}` +
        (r.sinCliente?.length ? `\n\n⚠ Documentos sin cliente (importa clientes primero):\n- ${r.sinCliente.join('\n- ')}` : '');
    else
      salida.textContent = `✅ Importadas: ${r.insertadas}\nOmitidas (duplicadas o sin datos): ${r.omitidas}` +
        (r.clientesCreados ? `\nClientes creados automáticamente (no estaban en la planilla): ${r.clientesCreados}` : '') +
        (r.sinCliente?.length ? `\n\n⚠ Pólizas sin documento de cliente:\n- ${r.sinCliente.join('\n- ')}` : '');
    toast('Importación terminada ✅');
  } catch (e) {
    salida.textContent = '❌ ' + e.message;
    toast(e.message, true);
  }
};

// ---------- Configuración ----------
const CLAVES_CFG = ['dias_aviso_renovacion','dias_aviso_cuota','dias_aviso_soat','dias_aviso_tecno',
  'hora_envio','smtp_usuario','smtp_clave_app','smtp_remitente','nombre_agencia','celular_agencia',
  'anthropic_api_key','ia_modelo','ia_modelo_analisis','ia_tono'];
async function cargarConfig() {
  const c = await api('/config');
  CLAVES_CFG.forEach(k => { const el = $(`#cfg-${k}`); if (el) el.value = c[k] || ''; });
  $('#cfg-envio_automatico').checked = c.envio_automatico === '1';
  actualizarEstadoWA();
}
window.guardarConfig = async function () {
  const datos = {};
  CLAVES_CFG.forEach(k => { const el = $(`#cfg-${k}`); if (el) datos[k] = el.value; });
  datos.envio_automatico = $('#cfg-envio_automatico').checked ? '1' : '0';
  await api('/config', 'PUT', datos);
  toast('Configuración guardada ✅');
  actualizarChips();
};

// ---------- WhatsApp ----------
let timerWA = null;
async function actualizarEstadoWA() {
  const e = await api('/whatsapp/estado');
  const txt = {
    desconectado: '🔴 Desconectado' + (e.ultimoError ? ` — ${e.ultimoError}` : ''),
    esperando_qr: '🟡 Escanea el código QR con el WhatsApp del celular de la agencia:\nWhatsApp → Dispositivos vinculados → Vincular dispositivo',
    conectando: '🟡 Conectando…',
    conectado: `🟢 Conectado como +${e.numero}`
  }[e.conexion];
  $('#wa-estado-txt').textContent = txt;
  const img = $('#wa-qr');
  if (e.qrDataUrl) { img.src = e.qrDataUrl; img.classList.remove('oculta'); }
  else img.classList.add('oculta');
  if (['esperando_qr', 'conectando'].includes(e.conexion) && !$('#vista-config').classList.contains('oculta')) {
    clearTimeout(timerWA);
    timerWA = setTimeout(actualizarEstadoWA, 2500);
  }
  return e;
}
window.waConectar = async function () {
  await api('/whatsapp/conectar', 'POST');
  setTimeout(actualizarEstadoWA, 1500);
};
window.waCerrar = async function () {
  if (!confirm('¿Cerrar la sesión de WhatsApp? Tendrás que volver a escanear el QR.')) return;
  await api('/whatsapp/cerrar', 'POST');
  actualizarEstadoWA();
};
window.waPrueba = async function () {
  try {
    const r = await api('/whatsapp/prueba', 'POST', { celular: $('#wa-prueba-numero').value });
    toast(`Prueba enviada a +${r.numero} ✅`);
  } catch (e) { toast(e.message, true); }
};

// ---------- Diálogo de WhatsApp (desde el chip del menú) ----------
let timerWAModal = null;
window.abrirWhatsAppDialog = function () {
  $('#modal-contenido').innerHTML = `
    <h3>📱 Conexión de WhatsApp</h3>
    <p class="nota">Vincula el WhatsApp del celular de la agencia para enviar recordatorios y mensajes. Es una conexión por dispositivo (igual que WhatsApp Web): no requiere una API de pago.</p>
    <div id="wad-estado" class="wa-estado">Cargando…</div>
    <div id="wad-qr-cont" class="wa-qr-cont oculta">
      <p class="nota" style="margin:0 0 10px">En el celular: WhatsApp → <b>Dispositivos vinculados</b> → <b>Vincular un dispositivo</b>, y escanea este código.</p>
      <img id="wad-qr" alt="Código QR de WhatsApp">
    </div>
    <div class="fila-botones">
      <button class="primario" id="wad-conectar" onclick="wadConectar()">Conectar / Mostrar QR</button>
      <button class="peligro" onclick="wadCerrar()">Cerrar sesión</button>
    </div>
    <hr>
    <label>Enviar mensaje de prueba a (celular):</label>
    <div class="fila-botones">
      <input id="wad-prueba-numero" placeholder="3001234567" inputmode="numeric">
      <button onclick="wadPrueba()">Enviar prueba</button>
    </div>
    <div class="fila-botones" style="justify-content:flex-end;margin-top:14px">
      <button onclick="cerrarWhatsAppDialog()">Cerrar</button>
    </div>`;
  $('#modal').classList.remove('oculta');
  wadRefrescar();
};
async function wadRefrescar() {
  if ($('#modal').classList.contains('oculta') || !$('#wad-estado')) { clearTimeout(timerWAModal); return; }
  let e;
  try { e = await api('/whatsapp/estado'); } catch { return; }
  const txt = {
    desconectado: '🔴 Desconectado' + (e.ultimoError ? ` — ${e.ultimoError}` : ''),
    esperando_qr: '🟡 Esperando que escanees el código QR…',
    conectando: '🟡 Conectando…',
    conectado: `🟢 Conectado como +${e.numero}`
  }[e.conexion] || '…';
  const elEstado = $('#wad-estado');
  if (!elEstado) { clearTimeout(timerWAModal); return; }
  elEstado.textContent = txt;
  elEstado.className = 'wa-estado ' + (e.conexion === 'conectado' ? 'ok' : e.conexion === 'desconectado' ? 'mal' : 'esperando');
  const cont = $('#wad-qr-cont'), img = $('#wad-qr');
  if (e.qrDataUrl && img) { img.src = e.qrDataUrl; cont.classList.remove('oculta'); }
  else if (cont) cont.classList.add('oculta');
  const btn = $('#wad-conectar');
  if (btn) btn.disabled = ['esperando_qr', 'conectando'].includes(e.conexion);
  actualizarChips();
  if (['esperando_qr', 'conectando'].includes(e.conexion)) {
    clearTimeout(timerWAModal);
    timerWAModal = setTimeout(wadRefrescar, 2500);
  }
}
window.wadConectar = async function () {
  try { await api('/whatsapp/conectar', 'POST'); setTimeout(wadRefrescar, 1200); }
  catch (e) { toast(e.message, true); }
};
window.wadCerrar = async function () {
  if (!confirm('¿Cerrar la sesión de WhatsApp? Tendrás que volver a escanear el QR.')) return;
  try { await api('/whatsapp/cerrar', 'POST'); wadRefrescar(); }
  catch (e) { toast(e.message, true); }
};
window.wadPrueba = async function () {
  try {
    const r = await api('/whatsapp/prueba', 'POST', { celular: $('#wad-prueba-numero').value });
    toast(`Prueba enviada a +${r.numero} ✅`);
  } catch (e) { toast(e.message, true); }
};
window.cerrarWhatsAppDialog = function () { clearTimeout(timerWAModal); cerrarModal(); };

// ---------- Correo ----------
window.probarCorreo = async function () {
  await guardarConfig();
  try { await api('/correo/probar', 'POST'); toast('Conexión con Gmail correcta ✅'); }
  catch (e) { toast(e.message, true); }
};
window.probarIA = async function () {
  await guardarConfig();
  try { await api('/ia/probar', 'POST'); toast('Conexión con la IA correcta ✨'); }
  catch (e) { toast(e.message, true); }
};
window.enviarCorreoPrueba = async function () {
  try {
    await api('/correo/prueba', 'POST', { destinatario: $('#mail-prueba-dest').value });
    toast('Correo de prueba enviado ✅');
  } catch (e) { toast(e.message, true); }
};

// ---------- Chips de estado ----------
async function actualizarChips() {
  try {
    const e = await api('/whatsapp/estado');
    const chipW = $('#chip-wa');
    chipW.textContent = 'WhatsApp: ' + (e.conexion === 'conectado' ? 'conectado' : 'desconectado');
    chipW.className = 'chip ' + (e.conexion === 'conectado' ? 'ok' : 'mal');
    const c = await api('/config');
    const chipM = $('#chip-mail');
    chipM.textContent = 'Correo: ' + (c.smtp_usuario ? c.smtp_usuario : 'sin configurar');
    chipM.className = 'chip ' + (c.smtp_usuario && c.smtp_clave_app ? 'ok' : 'mal');
  } catch {}
}

window.cerrarModal = () => $('#modal').classList.add('oculta');
$('#modal').addEventListener('click', e => { if (e.target.id === 'modal') cerrarModal(); });
$('#chip-wa').addEventListener('keydown', e => {
  if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); abrirWhatsAppDialog(); }
});

// Inicio
mostrarVista(location.hash.replace('#', '') || 'panel');
actualizarChips();
setInterval(actualizarChips, 30000);
