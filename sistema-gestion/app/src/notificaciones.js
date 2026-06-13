// Motor de recordatorios: genera notificaciones pendientes según reglas de días
// configurables y las envía por WhatsApp y/o correo respetando los toggles del cliente.
const cron = require('node-cron');
const { db, getConfig } = require('./db');
const whatsapp = require('./whatsapp');
const correo = require('./correo');

const fmtCOP = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 });

function hoyISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
function sumarDias(iso, dias) {
  const d = new Date(iso + 'T12:00:00');
  d.setDate(d.getDate() + dias);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
function listaDias(clave) {
  return (getConfig(clave, '') || '').split(',').map(s => parseInt(s.trim(), 10)).filter(n => !isNaN(n));
}

function renderizar(texto, vars) {
  return texto.replace(/\{\{(\w+)\}\}/g, (_, k) => vars[k] ?? '');
}

function plantilla(tipo, canal) {
  return db.prepare('SELECT asunto, cuerpo FROM plantillas WHERE tipo = ? AND canal = ?').get(tipo, canal);
}

// Encola una notificación si no existe ya (clave_unica evita repetir el mismo aviso)
function encolar({ tipo, cliente, poliza, vars, refExtra = '' }) {
  const agencia = getConfig('nombre_agencia', 'SM SEGUROS');
  const celAgencia = getConfig('celular_agencia', '');
  const todasVars = {
    nombre: (cliente.nombres || '').split(' ')[0] + (cliente.apellidos ? '' : ''),
    agencia, celular_agencia: celAgencia,
    ...vars
  };
  todasVars.riesgo_txt = vars.riesgo ? `, ${vars.riesgo}` : '';

  const objetivos = [];
  if (cliente.notif_whatsapp && cliente.celular) objetivos.push(['whatsapp', cliente.celular]);
  if (cliente.notif_email && cliente.email) objetivos.push(['email', cliente.email]);

  const ins = db.prepare(`INSERT OR IGNORE INTO notificaciones
    (tipo, canal, cliente_id, poliza_id, destinatario, asunto, mensaje, clave_unica)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)`);

  let creadas = 0;
  for (const [canal, destinatario] of objetivos) {
    const p = plantilla(tipo, canal);
    if (!p) continue;
    const clave = [tipo, canal, cliente.id, poliza?.id || '', refExtra].join('|');
    const r = ins.run(tipo, canal, cliente.id, poliza?.id || null, destinatario,
      renderizar(p.asunto || '', todasVars), renderizar(p.cuerpo, todasVars), clave);
    creadas += r.changes;
  }
  return creadas;
}

// ---- Generadores de alertas ----
function generarPendientes() {
  const hoy = hoyISO();
  let creadas = 0;

  // 1. Pólizas por vencer (en N días exactos)
  for (const dias of listaDias('dias_aviso_renovacion')) {
    const fecha = sumarDias(hoy, dias);
    const rows = db.prepare(`
      SELECT p.*, c.id cid, c.nombres, c.apellidos, c.celular, c.email,
             c.notif_whatsapp, c.notif_email
      FROM polizas p JOIN clientes c ON c.id = p.cliente_id
      WHERE p.estado = 'vigente' AND p.renovable = 1 AND p.notif_renovacion = 1
        AND p.fecha_fin = ?`).all(fecha);
    for (const r of rows) {
      creadas += encolar({
        tipo: 'poliza_por_vencer',
        cliente: { id: r.cid, nombres: r.nombres, apellidos: r.apellidos, celular: r.celular, email: r.email, notif_whatsapp: r.notif_whatsapp, notif_email: r.notif_email },
        poliza: r,
        vars: { numero_poliza: r.numero, aseguradora: r.aseguradora, ramo: r.ramo, riesgo: r.riesgo, fecha_fin: r.fecha_fin, dias },
        refExtra: fecha
      });
    }
  }

  // 2. Pólizas que vencieron ayer (aviso único de vencida)
  const ayer = sumarDias(hoy, -1);
  const vencidas = db.prepare(`
    SELECT p.*, c.id cid, c.nombres, c.apellidos, c.celular, c.email,
           c.notif_whatsapp, c.notif_email
    FROM polizas p JOIN clientes c ON c.id = p.cliente_id
    WHERE p.estado = 'vigente' AND p.notif_renovacion = 1 AND p.fecha_fin = ?`).all(ayer);
  for (const r of vencidas) {
    creadas += encolar({
      tipo: 'poliza_vencida',
      cliente: { id: r.cid, nombres: r.nombres, apellidos: r.apellidos, celular: r.celular, email: r.email, notif_whatsapp: r.notif_whatsapp, notif_email: r.notif_email },
      poliza: r,
      vars: { numero_poliza: r.numero, aseguradora: r.aseguradora, ramo: r.ramo, riesgo: r.riesgo, fecha_fin: r.fecha_fin, dias: 0 },
      refExtra: ayer
    });
  }

  // 3. Cuotas por vencer y vencidas
  for (const dias of listaDias('dias_aviso_cuota')) {
    const fecha = sumarDias(hoy, dias);
    const rows = db.prepare(`
      SELECT q.*, p.numero numero_poliza, p.ramo, p.aseguradora, p.riesgo, p.id pid,
             c.id cid, c.nombres, c.apellidos, c.celular, c.email, c.notif_whatsapp, c.notif_email
      FROM cuotas q JOIN polizas p ON p.id = q.poliza_id JOIN clientes c ON c.id = p.cliente_id
      WHERE q.estado = 'pendiente' AND q.fecha_vence = ?`).all(fecha);
    for (const r of rows) {
      creadas += encolar({
        tipo: 'cuota_por_vencer',
        cliente: { id: r.cid, nombres: r.nombres, apellidos: r.apellidos, celular: r.celular, email: r.email, notif_whatsapp: r.notif_whatsapp, notif_email: r.notif_email },
        poliza: { id: r.pid },
        vars: { numero_poliza: r.numero_poliza, ramo: r.ramo, aseguradora: r.aseguradora, riesgo: r.riesgo, fecha_fin: r.fecha_vence, valor: fmtCOP.format(r.valor), dias },
        refExtra: `cuota${r.id}|${fecha}`
      });
    }
  }
  const cuotasVencidas = db.prepare(`
    SELECT q.*, p.numero numero_poliza, p.ramo, p.aseguradora, p.riesgo, p.id pid,
           c.id cid, c.nombres, c.apellidos, c.celular, c.email, c.notif_whatsapp, c.notif_email
    FROM cuotas q JOIN polizas p ON p.id = q.poliza_id JOIN clientes c ON c.id = p.cliente_id
    WHERE q.estado = 'pendiente' AND q.fecha_vence = ?`).all(ayer);
  for (const r of cuotasVencidas) {
    creadas += encolar({
      tipo: 'cuota_vencida',
      cliente: { id: r.cid, nombres: r.nombres, apellidos: r.apellidos, celular: r.celular, email: r.email, notif_whatsapp: r.notif_whatsapp, notif_email: r.notif_email },
      poliza: { id: r.pid },
      vars: { numero_poliza: r.numero_poliza, ramo: r.ramo, aseguradora: r.aseguradora, riesgo: r.riesgo, fecha_fin: r.fecha_vence, valor: fmtCOP.format(r.valor), dias: 0 },
      refExtra: `cuota${r.id}|vencida`
    });
  }

  // 4. SOAT y tecnomecánica (fechas en la ficha del cliente)
  for (const [campo, tipo, claveDias] of [['soat_vence', 'soat', 'dias_aviso_soat'], ['tecno_vence', 'tecno', 'dias_aviso_tecno']]) {
    for (const dias of listaDias(claveDias)) {
      const fecha = sumarDias(hoy, dias);
      const rows = db.prepare(`SELECT * FROM clientes WHERE estado != 'inactivo' AND ${campo} = ?`).all(fecha);
      for (const c of rows) {
        creadas += encolar({
          tipo,
          cliente: c,
          poliza: null,
          vars: { riesgo: c.placa || 'registrado', fecha_fin: fecha, dias },
          refExtra: fecha
        });
      }
    }
  }

  // 5. Cumpleaños de hoy
  const mmdd = hoy.slice(5);
  const cumpleaneros = db.prepare(`
    SELECT * FROM clientes
    WHERE estado != 'inactivo' AND notif_cumpleanos = 1 AND tipo_persona = 'natural'
      AND fecha_nacimiento IS NOT NULL AND substr(fecha_nacimiento, 6) = ?`).all(mmdd);
  for (const c of cumpleaneros) {
    creadas += encolar({ tipo: 'cumpleanos', cliente: c, poliza: null, vars: {}, refExtra: hoy });
  }

  return creadas;
}

// ---- Envío de la cola ----
async function enviarPendientes(idsEspecificos = null) {
  let filtro = "estado = 'pendiente'";
  let params = [];
  if (idsEspecificos && idsEspecificos.length) {
    filtro += ` AND id IN (${idsEspecificos.map(() => '?').join(',')})`;
    params = idsEspecificos;
  }
  const pendientes = db.prepare(`SELECT * FROM notificaciones WHERE ${filtro} ORDER BY id`).all(...params);
  const marcar = db.prepare(`UPDATE notificaciones SET estado = ?, error = ?, enviado_en = datetime('now','localtime') WHERE id = ?`);
  const resumen = { enviadas: 0, errores: 0 };

  for (const n of pendientes) {
    try {
      if (n.canal === 'whatsapp') {
        await whatsapp.enviarMensaje(n.destinatario, n.mensaje);
        // pausa entre mensajes para un envío natural
        await new Promise(r => setTimeout(r, 3000 + Math.random() * 4000));
      } else {
        await correo.enviarCorreo(n.destinatario, n.asunto || 'Notificación de SM Seguros', n.mensaje);
        await new Promise(r => setTimeout(r, 500));
      }
      marcar.run('enviada', null, n.id);
      resumen.enviadas++;
    } catch (e) {
      marcar.run('error', e.message, n.id);
      resumen.errores++;
    }
  }
  return resumen;
}

// ---- Programación diaria ----
let tareaCron = null;
function programar() {
  if (tareaCron) tareaCron.stop();
  const [hh, mm] = (getConfig('hora_envio', '08:00')).split(':');
  tareaCron = cron.schedule(`${parseInt(mm, 10)} ${parseInt(hh, 10)} * * *`, async () => {
    const creadas = generarPendientes();
    console.log(`[notificaciones] generadas ${creadas} pendientes`);
    if (getConfig('envio_automatico', '0') === '1') {
      const r = await enviarPendientes();
      console.log(`[notificaciones] enviadas ${r.enviadas}, errores ${r.errores}`);
    }
  });
  console.log(`[notificaciones] programadas a las ${hh}:${mm}`);
}

module.exports = { generarPendientes, enviarPendientes, programar };
