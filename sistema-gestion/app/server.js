// SM Gestión — servidor local
const express = require('express');
const path = require('node:path');
const fs = require('node:fs');
const os = require('node:os');
const { db, getConfig, setConfig, DATA_DIR } = require('./src/db');
const whatsapp = require('./src/whatsapp');
const correo = require('./src/correo');
const notif = require('./src/notificaciones');
const { importarClientes, importarPolizas, importarVehiculos } = require('./src/importar');
const ia = require('./src/ia');

const app = express();
app.use(express.json({ limit: '2mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// Carga de archivos Excel (multipart simple sin dependencias)
app.use('/api/importar/:tipo', express.raw({ type: '*/*', limit: '50mb' }));
// Carga del PDF de la póliza para lectura con IA
app.use('/api/ia/leer-poliza', express.raw({ type: '*/*', limit: '25mb' }));

const PUERTO = 3477;

// ---------- Dashboard ----------
app.get('/api/dashboard', (req, res) => {
  const hoy = new Date().toISOString().slice(0, 10);
  const en30 = new Date(Date.now() + 30 * 864e5).toISOString().slice(0, 10);
  const q = (sql, ...p) => db.prepare(sql).get(...p);
  res.json({
    clientes: q(`SELECT COUNT(*) n FROM clientes WHERE estado != 'inactivo'`).n,
    polizasVigentes: q(`SELECT COUNT(*) n FROM polizas WHERE estado = 'vigente'`).n,
    porRenovar: q(`SELECT COUNT(*) n FROM polizas WHERE estado = 'vigente' AND fecha_fin BETWEEN ? AND ?`, hoy, en30).n,
    vencidas: q(`SELECT COUNT(*) n FROM polizas WHERE estado IN ('vigente','vencida') AND fecha_fin < ?`, hoy).n,
    notifPendientes: q(`SELECT COUNT(*) n FROM notificaciones WHERE estado = 'pendiente'`).n,
    notifHoy: q(`SELECT COUNT(*) n FROM notificaciones WHERE estado = 'enviada' AND date(enviado_en) = ?`, hoy).n,
    negociosAbiertos: q(`SELECT COUNT(*) n FROM negocios WHERE etapa NOT IN ('ganado','perdido')`).n,
    valorPipeline: q(`SELECT COALESCE(SUM(valor_estimado),0) v FROM negocios WHERE etapa NOT IN ('ganado','perdido')`).v,
    cumpleanos: db.prepare(`SELECT nombres, apellidos, fecha_nacimiento FROM clientes
      WHERE fecha_nacimiento IS NOT NULL AND tipo_persona = 'natural' AND estado != 'inactivo'
      AND strftime('%m-%d', fecha_nacimiento) BETWEEN strftime('%m-%d', 'now', 'localtime')
        AND strftime('%m-%d', 'now', 'localtime', '+5 days')
      ORDER BY strftime('%m-%d', fecha_nacimiento) LIMIT 10`).all(),
    proximasRenovaciones: db.prepare(`SELECT p.id, p.numero, p.ramo, p.aseguradora, p.riesgo, p.fecha_fin, p.prima_total,
        c.nombres || ' ' || c.apellidos cliente, c.celular
      FROM polizas p JOIN clientes c ON c.id = p.cliente_id
      WHERE p.estado = 'vigente' AND p.fecha_fin BETWEEN ? AND ?
      ORDER BY p.fecha_fin LIMIT 25`).all(hoy, en30)
  });
});

// ---------- KPIs (dashboard ampliado) ----------
app.get('/api/kpis', (req, res) => {
  const hoy = new Date().toISOString().slice(0, 10);
  const dia = n => new Date(Date.now() + n * 864e5).toISOString().slice(0, 10);
  const q = (sql, ...p) => db.prepare(sql).get(...p);
  const all = (sql, ...p) => db.prepare(sql).all(...p);

  const cuotasPend = q(`SELECT COUNT(*) n, COALESCE(SUM(valor),0) v FROM cuotas WHERE estado='pendiente'`);
  const cuotasVenc = q(`SELECT COUNT(*) n, COALESCE(SUM(valor),0) v FROM cuotas WHERE estado='pendiente' AND fecha_vence < ?`, hoy);
  const ganados = q(`SELECT COUNT(*) n FROM negocios WHERE etapa='ganado'`).n;
  const perdidos = q(`SELECT COUNT(*) n FROM negocios WHERE etapa='perdido'`).n;
  const renovadas12 = q(`SELECT COUNT(*) n FROM polizas WHERE estado='renovada' AND COALESCE(fecha_fin, creado_en) >= date('now','-12 months')`).n;
  const vencidas12 = q(`SELECT COUNT(*) n FROM polizas WHERE estado='vencida' AND COALESCE(fecha_fin, creado_en) >= date('now','-12 months')`).n;

  res.json({
    // Indicadores principales
    clientes: q(`SELECT COUNT(*) n FROM clientes WHERE estado != 'inactivo'`).n,
    prospectos: q(`SELECT COUNT(*) n FROM clientes WHERE estado='prospecto'`).n,
    polizasVigentes: q(`SELECT COUNT(*) n FROM polizas WHERE estado='vigente'`).n,
    primaAdministrada: q(`SELECT COALESCE(SUM(prima_total),0) v FROM polizas WHERE estado='vigente'`).v,
    comisionAnual: q(`SELECT COALESCE(SUM(comision_agencia),0) v FROM polizas WHERE estado='vigente'`).v,
    porRenovar30: q(`SELECT COUNT(*) n FROM polizas WHERE estado='vigente' AND fecha_fin BETWEEN ? AND ?`, hoy, dia(30)).n,
    porRenovar60: q(`SELECT COUNT(*) n FROM polizas WHERE estado='vigente' AND fecha_fin BETWEEN ? AND ?`, dia(30), dia(60)).n,
    vencidas: q(`SELECT COUNT(*) n FROM polizas WHERE estado IN ('vigente','vencida') AND fecha_fin < ?`, hoy).n,
    cuotasPendientesN: cuotasPend.n, cuotasPendientesV: cuotasPend.v,
    cuotasVencidasN: cuotasVenc.n, cuotasVencidasV: cuotasVenc.v,
    negociosAbiertos: q(`SELECT COUNT(*) n FROM negocios WHERE etapa NOT IN ('ganado','perdido')`).n,
    valorPipeline: q(`SELECT COALESCE(SUM(valor_estimado),0) v FROM negocios WHERE etapa NOT IN ('ganado','perdido')`).v,
    // Tasas
    tasaCierre: (ganados + perdidos) > 0 ? Math.round(ganados / (ganados + perdidos) * 100) : null,
    tasaRenovacion: (renovadas12 + vencidas12) > 0 ? Math.round(renovadas12 / (renovadas12 + vencidas12) * 100) : null,
    // Distribuciones
    porAseguradora: all(`SELECT aseguradora etiqueta, COUNT(*) n, COALESCE(SUM(prima_total),0) prima
      FROM polizas WHERE estado='vigente' AND aseguradora != '' GROUP BY aseguradora ORDER BY n DESC LIMIT 8`),
    porRamo: all(`SELECT ramo etiqueta, COUNT(*) n FROM polizas WHERE estado='vigente' AND ramo != '' GROUP BY ramo ORDER BY n DESC LIMIT 8`),
    nuevasPorMes: all(`SELECT strftime('%Y-%m', COALESCE(fecha_expedicion, fecha_inicio, creado_en)) mes, COUNT(*) n
      FROM polizas WHERE COALESCE(fecha_expedicion, fecha_inicio, creado_en) >= date('now','-5 months','start of month')
      GROUP BY mes ORDER BY mes`),
    embudo: all(`SELECT etapa, COUNT(*) n, COALESCE(SUM(valor_estimado),0) v FROM negocios GROUP BY etapa`),
    // Listados
    proximasRenovaciones: all(`SELECT p.id, p.numero, p.ramo, p.aseguradora, p.riesgo, p.fecha_fin, p.prima_total,
        TRIM(c.nombres || ' ' || COALESCE(c.apellidos,'')) cliente, c.celular
      FROM polizas p JOIN clientes c ON c.id = p.cliente_id
      WHERE p.estado='vigente' AND p.fecha_fin BETWEEN ? AND ? ORDER BY p.fecha_fin LIMIT 12`, hoy, dia(30)),
    cumpleanos: all(`SELECT nombres, apellidos, fecha_nacimiento FROM clientes
      WHERE fecha_nacimiento IS NOT NULL AND tipo_persona='natural' AND estado != 'inactivo'
      AND strftime('%m-%d', fecha_nacimiento) BETWEEN strftime('%m-%d','now','localtime')
        AND strftime('%m-%d','now','localtime','+7 days')
      ORDER BY strftime('%m-%d', fecha_nacimiento) LIMIT 10`)
  });
});

// ---------- Clientes ----------
app.get('/api/clientes', (req, res) => {
  const buscar = `%${req.query.q || ''}%`;
  res.json(db.prepare(`SELECT * FROM clientes
    WHERE (nombres || ' ' || apellidos || ' ' || num_doc || ' ' || COALESCE(celular,'') || ' ' || COALESCE(placa,'')) LIKE ?
    ORDER BY nombres LIMIT 500`).all(buscar));
});
app.get('/api/clientes/:id', (req, res) => {
  const c = db.prepare('SELECT * FROM clientes WHERE id = ?').get(req.params.id);
  if (!c) return res.status(404).json({ error: 'No existe' });
  c.polizas = db.prepare('SELECT * FROM polizas WHERE cliente_id = ? ORDER BY fecha_fin DESC').all(c.id);
  c.notificaciones = db.prepare('SELECT * FROM notificaciones WHERE cliente_id = ? ORDER BY id DESC LIMIT 50').all(c.id);
  res.json(c);
});
const CAMPOS_CLIENTE = ['tipo_persona','nombres','apellidos','alias','tipo_doc','num_doc','fecha_nacimiento','genero',
  'celular','telefono','email','direccion','ciudad','departamento','categorias','estado','placa',
  'soat_vence','tecno_vence','impuestos_vence','observaciones','notif_whatsapp','notif_email','notif_cumpleanos'];
const DEFECTOS_CLIENTE = { tipo_persona: 'natural', tipo_doc: 'CC', estado: 'cliente',
  apellidos: '', alias: '', categorias: '', observaciones: '',
  notif_whatsapp: 1, notif_email: 1, notif_cumpleanos: 1 };
function valoresCliente(b) {
  return CAMPOS_CLIENTE.map(c => b[c] ?? DEFECTOS_CLIENTE[c] ?? null);
}
app.post('/api/clientes', (req, res) => {
  const b = req.body;
  if (!b.nombres || !b.num_doc) return res.status(400).json({ error: 'Nombres y documento son obligatorios' });
  try {
    const r = db.prepare(`INSERT INTO clientes (${CAMPOS_CLIENTE.join(',')})
      VALUES (${CAMPOS_CLIENTE.map(() => '?').join(',')})`)
      .run(...valoresCliente(b));
    res.json({ id: Number(r.lastInsertRowid) });
  } catch (e) { res.status(400).json({ error: e.message.includes('UNIQUE') ? 'Ya existe un cliente con ese documento' : e.message }); }
});
app.put('/api/clientes/:id', (req, res) => {
  db.prepare(`UPDATE clientes SET ${CAMPOS_CLIENTE.map(c => `${c} = ?`).join(', ')},
    actualizado_en = datetime('now','localtime') WHERE id = ?`)
    .run(...valoresCliente(req.body), req.params.id);
  res.json({ ok: true });
});
app.delete('/api/clientes/:id', (req, res) => {
  db.prepare('UPDATE clientes SET estado = ? WHERE id = ?').run('inactivo', req.params.id);
  res.json({ ok: true });
});

// ---------- RUNT (SOAT / tecnomecánica) ----------
// Lista de vehículos de clientes para consultar/actualizar vencimientos (sin dato y vencidos primero)
app.get('/api/runt/pendientes', (req, res) => {
  res.json(db.prepare(`SELECT id, TRIM(nombres || ' ' || COALESCE(apellidos,'')) nombre, num_doc, tipo_doc,
      celular, placa, soat_vence, tecno_vence, impuestos_vence
    FROM clientes
    WHERE estado != 'inactivo' AND placa IS NOT NULL AND placa != ''
    ORDER BY (soat_vence IS NULL) DESC, soat_vence ASC, nombre`).all());
});
// Guarda solo los vencimientos (consulta del RUNT) sin tocar el resto del cliente
app.put('/api/clientes/:id/vencimientos', (req, res) => {
  const { soat_vence, tecno_vence, impuestos_vence } = req.body || {};
  db.prepare(`UPDATE clientes SET
      soat_vence = COALESCE(?, soat_vence), tecno_vence = COALESCE(?, tecno_vence),
      impuestos_vence = COALESCE(?, impuestos_vence), actualizado_en = datetime('now','localtime')
    WHERE id = ?`).run(soat_vence || null, tecno_vence || null, impuestos_vence || null, req.params.id);
  res.json({ ok: true });
});
// Extrae fechas de SOAT y tecnomecánica del texto pegado del resultado del RUNT
function parsearTextoRunt(texto) {
  const norm = String(texto || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  const aISO = (d, m, y) => `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  const fechas = [];
  const re = /(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{4})|(\d{4})[\/\-.](\d{1,2})[\/\-.](\d{1,2})/g;
  let m;
  while ((m = re.exec(norm))) {
    const iso = m[1] ? aISO(+m[1], +m[2], +m[3]) : aISO(+m[6], +m[5], +m[4]);
    fechas.push({ idx: m.index, iso });
  }
  const idxSoat = norm.indexOf('soat');
  // RTM puede nombrarse de varias formas en el mismo título: se toma el inicio más temprano como una sola sección
  const idxRtm = ['revision tecn', 'tecnico mecanic', 'tecnomecanic', 'rtm']
    .map(k => norm.indexOf(k)).filter(i => i >= 0).sort((a, b) => a - b)[0] ?? -1;
  const otras = ['comparend', 'licencia', 'limitacion', 'prenda', 'garantia', 'medida', 'gravamen', 'multas']
    .map(k => norm.indexOf(k)).filter(i => i >= 0);
  // Límites de sección: una sección llega hasta donde empieza la siguiente
  const limites = [...new Set([idxSoat, idxRtm, ...otras].filter(i => i >= 0)), norm.length].sort((a, b) => a - b);
  // La fecha más tardía dentro de la sección que empieza en kwIdx = fecha de vencimiento
  const maxEnSeccion = (kwIdx, tope = 320) => {
    if (kwIdx < 0) return null;
    const fin = Math.min(limites.find(i => i > kwIdx) ?? norm.length, kwIdx + tope);
    const f = fechas.filter(x => x.idx >= kwIdx && x.idx < fin).map(x => x.iso).sort();
    return f.length ? f[f.length - 1] : null;
  };
  return { soat_vence: maxEnSeccion(idxSoat), tecno_vence: maxEnSeccion(idxRtm) };
}
app.post('/api/runt/extraer', (req, res) => {
  res.json(parsearTextoRunt(req.body?.texto || ''));
});

// ---------- Pólizas ----------
app.get('/api/polizas', (req, res) => {
  const buscar = `%${req.query.q || ''}%`;
  const filtroEstado = req.query.estado ? 'AND p.estado = ?' : '';
  const params = req.query.estado ? [buscar, req.query.estado] : [buscar];
  res.json(db.prepare(`SELECT p.*, c.nombres || ' ' || c.apellidos cliente, c.num_doc doc_cliente, c.celular
    FROM polizas p JOIN clientes c ON c.id = p.cliente_id
    WHERE (p.numero || ' ' || p.riesgo || ' ' || p.aseguradora || ' ' || c.nombres || ' ' || c.apellidos || ' ' || c.num_doc) LIKE ? ${filtroEstado}
    ORDER BY p.fecha_fin DESC LIMIT 500`).all(...params));
});
const CAMPOS_POLIZA = ['cliente_id','numero','aseguradora','ramo','riesgo','estado','renovable','fecha_expedicion',
  'fecha_inicio','fecha_fin','valor_asegurado','prima_neta','gastos','iva','prima_total','pct_comision',
  'comision_agencia','vendedor','periodicidad','forma_pago','tomador','beneficiario_oneroso','observaciones','notif_renovacion'];
const DEFECTOS_POLIZA = { estado: 'vigente', renovable: 1, notif_renovacion: 1, ramo: 'Automóviles',
  riesgo: '', vendedor: '', periodicidad: 'anual', forma_pago: '', tomador: '',
  beneficiario_oneroso: '', observaciones: '', valor_asegurado: 0, prima_neta: 0,
  gastos: 0, iva: 0, prima_total: 0, pct_comision: 0, comision_agencia: 0 };
function valoresPoliza(b) {
  return CAMPOS_POLIZA.map(c => b[c] ?? DEFECTOS_POLIZA[c] ?? null);
}
app.post('/api/polizas', (req, res) => {
  const b = req.body;
  if (!b.cliente_id || !b.numero) return res.status(400).json({ error: 'Cliente y número de póliza son obligatorios' });
  try {
    const r = db.prepare(`INSERT INTO polizas (${CAMPOS_POLIZA.join(',')})
      VALUES (${CAMPOS_POLIZA.map(() => '?').join(',')})`)
      .run(...valoresPoliza(b));
    res.json({ id: Number(r.lastInsertRowid) });
  } catch (e) { res.status(400).json({ error: e.message.includes('FOREIGN KEY') ? 'El cliente indicado no existe' : e.message }); }
});
app.put('/api/polizas/:id', (req, res) => {
  db.prepare(`UPDATE polizas SET ${CAMPOS_POLIZA.map(c => `${c} = ?`).join(', ')},
    actualizado_en = datetime('now','localtime') WHERE id = ?`)
    .run(...valoresPoliza(req.body), req.params.id);
  res.json({ ok: true });
});
app.delete('/api/polizas/:id', (req, res) => {
  db.prepare('DELETE FROM polizas WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

// ---------- Negocios (embudo de ventas) ----------
const CAMPOS_NEGOCIO = ['titulo','cliente_id','prospecto_nombre','prospecto_celular','prospecto_email','ramo',
  'aseguradora','etapa','valor_estimado','origen','vendedor','proxima_accion','fecha_proxima_accion','notas','motivo_perdido'];
const DEFECTOS_NEGOCIO = { etapa: 'nuevo', ramo: 'Automóviles', valor_estimado: 0, prospecto_nombre: '',
  prospecto_celular: '', prospecto_email: '', aseguradora: '', origen: '', vendedor: '', proxima_accion: '',
  notas: '', motivo_perdido: '' };
app.get('/api/negocios', (req, res) => {
  res.json(db.prepare(`SELECT ne.*, TRIM(c.nombres || ' ' || COALESCE(c.apellidos,'')) cliente_nombre,
      c.celular cliente_celular, c.email cliente_email
    FROM negocios ne LEFT JOIN clientes c ON c.id = ne.cliente_id
    ORDER BY ne.actualizado_en DESC`).all());
});
app.get('/api/negocios/:id', (req, res) => {
  const n = db.prepare('SELECT * FROM negocios WHERE id = ?').get(req.params.id);
  if (!n) return res.status(404).json({ error: 'No existe' });
  res.json(n);
});
app.post('/api/negocios', (req, res) => {
  const b = req.body;
  if (!b.titulo) return res.status(400).json({ error: 'El título del negocio es obligatorio' });
  const r = db.prepare(`INSERT INTO negocios (${CAMPOS_NEGOCIO.join(',')})
    VALUES (${CAMPOS_NEGOCIO.map(() => '?').join(',')})`)
    .run(...CAMPOS_NEGOCIO.map(c => b[c] ?? DEFECTOS_NEGOCIO[c] ?? null));
  res.json({ id: Number(r.lastInsertRowid) });
});
app.put('/api/negocios/:id', (req, res) => {
  const ex = db.prepare('SELECT * FROM negocios WHERE id = ?').get(req.params.id);
  if (!ex) return res.status(404).json({ error: 'No existe' });
  const b = { ...ex, ...req.body };   // mezcla: permite actualizaciones parciales
  db.prepare(`UPDATE negocios SET ${CAMPOS_NEGOCIO.map(c => `${c} = ?`).join(', ')},
    actualizado_en = datetime('now','localtime') WHERE id = ?`)
    .run(...CAMPOS_NEGOCIO.map(c => b[c] ?? null), req.params.id);
  res.json({ ok: true });
});
app.put('/api/negocios/:id/etapa', (req, res) => {
  const { etapa } = req.body;
  const cierra = ['ganado', 'perdido'].includes(etapa);
  db.prepare(`UPDATE negocios SET etapa = ?,
      cerrado_en = ${cierra ? "datetime('now','localtime')" : 'NULL'},
      actualizado_en = datetime('now','localtime') WHERE id = ?`)
    .run(etapa, req.params.id);
  res.json({ ok: true });
});
app.delete('/api/negocios/:id', (req, res) => {
  db.prepare('DELETE FROM negocios WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

// ---------- Cuotas ----------
app.get('/api/polizas/:id/cuotas', (req, res) => {
  res.json(db.prepare('SELECT * FROM cuotas WHERE poliza_id = ? ORDER BY fecha_vence').all(req.params.id));
});
app.post('/api/polizas/:id/cuotas', (req, res) => {
  const { numero, valor, fecha_vence } = req.body;
  const r = db.prepare('INSERT INTO cuotas (poliza_id, numero, valor, fecha_vence) VALUES (?,?,?,?)')
    .run(req.params.id, numero || 1, valor || 0, fecha_vence);
  res.json({ id: Number(r.lastInsertRowid) });
});
app.put('/api/cuotas/:id', (req, res) => {
  const { estado, fecha_pago, medio_pago, valor, fecha_vence } = req.body;
  db.prepare(`UPDATE cuotas SET estado = COALESCE(?, estado), fecha_pago = COALESCE(?, fecha_pago),
    medio_pago = COALESCE(?, medio_pago), valor = COALESCE(?, valor), fecha_vence = COALESCE(?, fecha_vence) WHERE id = ?`)
    .run(estado ?? null, fecha_pago ?? null, medio_pago ?? null, valor ?? null, fecha_vence ?? null, req.params.id);
  res.json({ ok: true });
});

// ---------- Notificaciones ----------
app.get('/api/notificaciones', (req, res) => {
  const estado = req.query.estado || 'pendiente';
  res.json(db.prepare(`SELECT n.*, c.nombres || ' ' || COALESCE(c.apellidos,'') cliente
    FROM notificaciones n LEFT JOIN clientes c ON c.id = n.cliente_id
    WHERE n.estado = ? ORDER BY n.id DESC LIMIT 300`).all(estado));
});
app.post('/api/notificaciones/generar', (req, res) => {
  res.json({ creadas: notif.generarPendientes() });
});
app.post('/api/notificaciones/enviar', async (req, res) => {
  try {
    res.json(await notif.enviarPendientes(req.body?.ids || null));
  } catch (e) { res.status(500).json({ error: e.message }); }
});
app.post('/api/notificaciones/:id/descartar', (req, res) => {
  db.prepare(`UPDATE notificaciones SET estado = 'descartada' WHERE id = ? AND estado = 'pendiente'`).run(req.params.id);
  res.json({ ok: true });
});
// Reescribe el mensaje de una notificación pendiente usando la IA
app.post('/api/notificaciones/:id/redactar-ia', async (req, res) => {
  const n = db.prepare('SELECT * FROM notificaciones WHERE id = ?').get(req.params.id);
  if (!n) return res.status(404).json({ error: 'No existe' });
  try {
    const cliente = n.cliente_id ? db.prepare('SELECT * FROM clientes WHERE id = ?').get(n.cliente_id) : {};
    const poliza = n.poliza_id ? db.prepare('SELECT * FROM polizas WHERE id = ?').get(n.poliza_id) : {};
    const r = await ia.redactarMensaje({ tipo: n.tipo, canal: n.canal, cliente: cliente || {}, poliza: poliza || {} });
    db.prepare('UPDATE notificaciones SET mensaje = ?, asunto = COALESCE(NULLIF(?,\'\'), asunto) WHERE id = ?')
      .run(r.mensaje, r.asunto || '', n.id);
    res.json({ ok: true, mensaje: r.mensaje });
  } catch (e) { res.status(500).json({ error: e.message }); }
});
app.post('/api/mensaje-manual', async (req, res) => {
  // mensaje suelto a un cliente (whatsapp o email)
  const { cliente_id, canal, asunto, mensaje } = req.body;
  const c = db.prepare('SELECT * FROM clientes WHERE id = ?').get(cliente_id);
  if (!c) return res.status(404).json({ error: 'Cliente no existe' });
  const destinatario = canal === 'whatsapp' ? c.celular : c.email;
  if (!destinatario) return res.status(400).json({ error: `El cliente no tiene ${canal === 'whatsapp' ? 'celular' : 'correo'}` });
  try {
    if (canal === 'whatsapp') await whatsapp.enviarMensaje(destinatario, mensaje);
    else await correo.enviarCorreo(destinatario, asunto || 'Mensaje de SM Seguros', mensaje);
    db.prepare(`INSERT INTO notificaciones (tipo, canal, cliente_id, destinatario, asunto, mensaje, estado, enviado_en)
      VALUES ('manual', ?, ?, ?, ?, ?, 'enviada', datetime('now','localtime'))`)
      .run(canal, cliente_id, destinatario, asunto || '', mensaje);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ---------- IA (redactor de mensajes con Claude) ----------
app.post('/api/ia/redactar', async (req, res) => {
  const { cliente_id, poliza_id, tipo, canal, contexto } = req.body;
  try {
    const cliente = cliente_id ? db.prepare('SELECT * FROM clientes WHERE id = ?').get(cliente_id) : {};
    const poliza = poliza_id ? db.prepare('SELECT * FROM polizas WHERE id = ?').get(poliza_id) : {};
    const r = await ia.redactarMensaje({
      tipo: tipo || 'manual', canal: canal || 'whatsapp',
      cliente: cliente || {}, poliza: poliza || {}, contexto: contexto || ''
    });
    res.json(r);
  } catch (e) { res.status(500).json({ error: e.message }); }
});
app.post('/api/ia/probar', async (req, res) => {
  try { await ia.probarConexion(); res.json({ ok: true }); }
  catch (e) { res.status(500).json({ error: e.message }); }
});
// Análisis de cartera: corre la IA y guarda el resultado para no repetir el costo en cada visita
app.post('/api/ia/analizar-cartera', async (req, res) => {
  try {
    const r = await ia.analizarCartera();
    setConfig('ultimo_analisis_cartera', JSON.stringify(r));
    res.json(r);
  } catch (e) { res.status(500).json({ error: e.message }); }
});
app.get('/api/ia/oportunidades', (req, res) => {
  const guardado = getConfig('ultimo_analisis_cartera', '');
  res.json(guardado ? JSON.parse(guardado) : { resumen: '', oportunidades: [], analizado_en: null });
});
// Lectura de carátula de póliza en PDF (cuerpo = bytes del PDF)
app.post('/api/ia/leer-poliza', async (req, res) => {
  if (!req.body || !req.body.length) return res.status(400).json({ error: 'No llegó el archivo PDF' });
  try {
    const r = await ia.leerPolizaPDF(Buffer.from(req.body).toString('base64'));
    res.json(r);
  } catch (e) { res.status(500).json({ error: e.message }); }
});
// Asistente: pregunta en lenguaje natural sobre la cartera
app.post('/api/ia/consultar', async (req, res) => {
  const { pregunta, historial } = req.body || {};
  if (!pregunta || !pregunta.trim()) return res.status(400).json({ error: 'Escribe una pregunta' });
  try {
    const respuesta = await ia.consultarCartera(pregunta.trim(), Array.isArray(historial) ? historial : []);
    res.json({ respuesta });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ---------- Plantillas ----------
app.get('/api/plantillas', (req, res) => {
  res.json(db.prepare('SELECT * FROM plantillas ORDER BY tipo, canal').all());
});
app.put('/api/plantillas/:id', (req, res) => {
  db.prepare('UPDATE plantillas SET asunto = ?, cuerpo = ? WHERE id = ?')
    .run(req.body.asunto || '', req.body.cuerpo, req.params.id);
  res.json({ ok: true });
});

// ---------- WhatsApp ----------
app.get('/api/whatsapp/estado', (req, res) => res.json(whatsapp.estado));
app.post('/api/whatsapp/conectar', async (req, res) => {
  try { await whatsapp.iniciar(); res.json({ ok: true }); }
  catch (e) { res.status(500).json({ error: e.message }); }
});
app.post('/api/whatsapp/cerrar', async (req, res) => {
  await whatsapp.cerrarSesion();
  res.json({ ok: true });
});
app.post('/api/whatsapp/prueba', async (req, res) => {
  try {
    const numero = await whatsapp.enviarMensaje(req.body.celular, req.body.mensaje || 'Mensaje de prueba de SM Gestión ✅');
    res.json({ ok: true, numero });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ---------- Correo ----------
app.post('/api/correo/probar', async (req, res) => {
  try { await correo.probarConexion(); res.json({ ok: true }); }
  catch (e) { res.status(500).json({ error: e.message }); }
});
app.post('/api/correo/prueba', async (req, res) => {
  try {
    await correo.enviarCorreo(req.body.destinatario, 'Prueba de SM Gestión', 'El correo corporativo quedó conectado correctamente. ✅');
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ---------- Configuración ----------
const CLAVES_CONFIG = ['dias_aviso_renovacion','dias_aviso_cuota','dias_aviso_soat','dias_aviso_tecno',
  'hora_envio','smtp_usuario','smtp_clave_app','smtp_remitente','nombre_agencia','celular_agencia','envio_automatico',
  'anthropic_api_key','ia_modelo','ia_modelo_analisis','ia_tono'];
const CLAVES_SECRETAS = ['smtp_clave_app', 'anthropic_api_key'];
app.get('/api/config', (req, res) => {
  const out = {};
  for (const k of CLAVES_CONFIG) out[k] = getConfig(k, '');
  for (const k of CLAVES_SECRETAS) out[k] = out[k] ? '••••••••' : '';
  res.json(out);
});
app.put('/api/config', (req, res) => {
  for (const k of CLAVES_CONFIG) {
    if (req.body[k] === undefined) continue;
    if (CLAVES_SECRETAS.includes(k) && req.body[k] === '••••••••') continue;
    setConfig(k, req.body[k]);
  }
  notif.programar();
  res.json({ ok: true });
});

// ---------- Importación ----------
app.post('/api/importar/:tipo', async (req, res) => {
  const tmp = path.join(os.tmpdir(), `import-${Date.now()}.xlsx`);
  try {
    fs.writeFileSync(tmp, req.body);
    const fn = { clientes: importarClientes, polizas: importarPolizas, vehiculos: importarVehiculos }[req.params.tipo];
    if (!fn) throw new Error('Tipo de importación no válido');
    res.json(await fn(tmp));
  } catch (e) {
    res.status(400).json({ error: e.message });
  } finally {
    fs.rmSync(tmp, { force: true });
  }
});

app.listen(PUERTO, '127.0.0.1', () => {
  console.log(`SM Gestión corriendo en http://localhost:${PUERTO}`);
  notif.programar();
  // intenta reconectar WhatsApp si ya había sesión guardada
  const authDir = path.join(DATA_DIR, 'whatsapp-auth');
  if (fs.existsSync(path.join(authDir, 'creds.json'))) {
    whatsapp.iniciar().catch(e => console.log('[whatsapp] no se pudo reconectar:', e.message));
  }
});
