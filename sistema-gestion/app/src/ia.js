// Funciones de IA con Claude (Anthropic): redactor de mensajes para clientes.
// La API key se guarda en Configuración; el sistema funciona sin ella (la IA es opcional).
const Anthropic = require('@anthropic-ai/sdk');
const { getConfig, db } = require('./db');

function clienteIA() {
  const apiKey = getConfig('anthropic_api_key', '');
  if (!apiKey) throw new Error('Falta la API key de Anthropic. Configúrala en Configuración → Inteligencia Artificial.');
  return new Anthropic({ apiKey });
}

const fmtCOP = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 });

const ETIQUETA_TIPO = {
  poliza_por_vencer: 'recordatorio de que su póliza está por vencer e invitación a renovar',
  poliza_vencida: 'aviso de que su póliza venció y ya no tiene cobertura, invitando a renovar de inmediato',
  cuota_por_vencer: 'recordatorio amable de que tiene una cuota de pago por vencer',
  cuota_vencida: 'aviso de que una cuota de pago venció, invitando a ponerse al día para no perder el seguro',
  soat: 'recordatorio de que el SOAT del vehículo está por vencer, ofreciendo renovarlo',
  tecno: 'recordatorio de que la revisión tecnomecánica del vehículo está por vencer',
  cumpleanos: 'felicitación de cumpleaños cordial, sin vender nada',
  manual: 'mensaje',
  bienvenida: 'mensaje de bienvenida a un cliente nuevo de la agencia'
};

// Redacta un mensaje personalizado para un cliente.
// datos: { tipo, canal, cliente:{nombres,apellidos,...}, poliza:{...}, contexto }
async function redactarMensaje({ tipo, canal, cliente = {}, poliza = {}, contexto = '' }) {
  const client = clienteIA();
  const modelo = getConfig('ia_modelo', 'claude-haiku-4-5');
  const agencia = getConfig('nombre_agencia', 'SM SEGUROS');
  const celAgencia = getConfig('celular_agencia', '');
  const tono = getConfig('ia_tono', 'cercano, cálido y profesional');

  const esWhatsApp = canal === 'whatsapp';
  const nombreCorto = (cliente.nombres || '').split(' ')[0] || 'cliente';

  const datosCliente = [
    `Nombre: ${cliente.nombres || ''} ${cliente.apellidos || ''}`.trim(),
    cliente.celular ? `Celular: ${cliente.celular}` : '',
    poliza.ramo ? `Ramo/seguro: ${poliza.ramo}` : '',
    poliza.numero ? `N.º de póliza: ${poliza.numero}` : '',
    poliza.aseguradora ? `Aseguradora: ${poliza.aseguradora}` : '',
    poliza.riesgo ? `Riesgo/placa: ${poliza.riesgo}` : '',
    poliza.fecha_fin ? `Fecha de vencimiento: ${poliza.fecha_fin}` : '',
    poliza.prima_total ? `Prima total: ${fmtCOP.format(poliza.prima_total)}` : '',
    poliza.valor != null ? `Valor de la cuota: ${fmtCOP.format(poliza.valor)}` : ''
  ].filter(Boolean).join('\n');

  const instruccionesCanal = esWhatsApp
    ? `Es un mensaje de WhatsApp. Usa un saludo con el primer nombre (${nombreCorto}). Puedes usar 1-2 emojis con moderación y *negrita de WhatsApp* (un asterisco a cada lado) para resaltar lo importante. Máximo 4-5 líneas. Termina firmando con el nombre de la agencia.`
    : `Es un correo electrónico. Devuelve PRIMERO una línea "ASUNTO: <asunto breve>" y luego el cuerpo del correo. Saludo con el primer nombre, cuerpo claro de 1-2 párrafos cortos, sin emojis excesivos, cierre cordial firmando con el nombre de la agencia.`;

  const prompt = `Eres el asistente de comunicaciones de la agencia de seguros "${agencia}" en Colombia. Tu tono es ${tono}. Escribes mensajes para clientes reales, en español de Colombia, naturales (que no suenen robóticos ni a plantilla), respetuosos y al grano. Nunca inventes datos que no te den. Si falta un dato, omítelo con naturalidad.

Objetivo del mensaje: ${ETIQUETA_TIPO[tipo] || 'mensaje al cliente'}.
${contexto ? `Contexto adicional del asesor: ${contexto}\n` : ''}
Datos del cliente y su seguro:
${datosCliente || '(sin datos adicionales)'}

Datos de contacto de la agencia para invitar a escribir/llamar: ${celAgencia || '(no incluir número)'}.

${instruccionesCanal}

Devuelve ÚNICAMENTE el mensaje listo para enviar (y el ASUNTO si es correo), sin comentarios tuyos, sin comillas alrededor, sin explicaciones.`;

  const resp = await client.messages.create({
    model: modelo,
    max_tokens: 1024,
    messages: [{ role: 'user', content: prompt }]
  });

  const texto = resp.content.filter(b => b.type === 'text').map(b => b.text).join('').trim();

  if (!esWhatsApp) {
    const m = texto.match(/^\s*ASUNTO:\s*(.+?)\s*\n+([\s\S]+)$/i);
    if (m) return { asunto: m[1].trim(), mensaje: m[2].trim() };
    return { asunto: '', mensaje: texto };
  }
  return { asunto: '', mensaje: texto };
}

// ---- Análisis de cartera / oportunidades de venta cruzada y retención ----
const TIPOS_OPORTUNIDAD = ['venta_cruzada', 'renovacion_proxima', 'reactivacion', 'soat_tecno', 'cumpleanos', 'al_dia'];

// Arma un resumen compacto de cada cliente activo y sus pólizas vigentes
function resumenCartera() {
  const clientes = db.prepare(`SELECT * FROM clientes WHERE estado != 'inactivo'`).all();
  const polizasPorCliente = {};
  for (const p of db.prepare(`SELECT cliente_id, ramo, aseguradora, estado, fecha_fin, prima_total FROM polizas`).all()) {
    (polizasPorCliente[p.cliente_id] ||= []).push(p);
  }
  return clientes.map(c => {
    const pol = polizasPorCliente[c.id] || [];
    const vigentes = pol.filter(p => p.estado === 'vigente');
    const ramos = [...new Set(vigentes.map(p => p.ramo).filter(Boolean))];
    const fechasFin = vigentes.map(p => p.fecha_fin).filter(Boolean).sort();
    return {
      id: c.id,
      nombre: `${c.nombres || ''} ${c.apellidos || ''}`.trim(),
      ciudad: c.ciudad || '',
      estado: c.estado,
      categorias: c.categorias || '',
      tiene_vehiculo: !!c.placa,
      placa: c.placa || '',
      soat_vence: c.soat_vence || '',
      tecno_vence: c.tecno_vence || '',
      ramos_vigentes: ramos,
      num_polizas_vigentes: vigentes.length,
      num_polizas_total: pol.length,
      proximo_vencimiento: fechasFin[0] || '',
      prima_anual: Math.round(vigentes.reduce((s, p) => s + (p.prima_total || 0), 0))
    };
  });
}

const ESQUEMA_OPORTUNIDADES = {
  type: 'object',
  additionalProperties: false,
  properties: {
    resumen: { type: 'string' },
    oportunidades: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          cliente_id: { type: 'integer' },
          tipo: { type: 'string', enum: TIPOS_OPORTUNIDAD },
          prioridad: { type: 'string', enum: ['alta', 'media', 'baja'] },
          motivo: { type: 'string' },
          accion_sugerida: { type: 'string' }
        },
        required: ['cliente_id', 'tipo', 'prioridad', 'motivo', 'accion_sugerida']
      }
    }
  },
  required: ['resumen', 'oportunidades']
};

async function analizarCartera() {
  const client = clienteIA();
  const modelo = getConfig('ia_modelo_analisis', 'claude-opus-4-8');
  const agencia = getConfig('nombre_agencia', 'SM SEGUROS');
  const hoy = new Date().toISOString().slice(0, 10);
  const cartera = resumenCartera();
  if (!cartera.length) return { resumen: 'No hay clientes en la cartera todavía.', oportunidades: [] };
  const idsValidos = new Set(cartera.map(c => c.id));

  const prompt = `Eres analista de cartera de la agencia de seguros "${agencia}" en Colombia. Hoy es ${hoy}.
Te paso la cartera de clientes con sus pólizas vigentes. Identifica las MEJORES oportunidades comerciales y de retención, priorizando las más concretas y accionables. Tipos de oportunidad:
- "venta_cruzada": cliente con un ramo pero al que le falta otro relevante (ej: tiene Automóviles pero no Vida, Hogar o Salud; o tiene vehículo y solo SOAT sin todo riesgo).
- "renovacion_proxima": póliza vigente que vence pronto y conviene asegurar la renovación.
- "reactivacion": cliente o prospecto sin pólizas vigentes a quien reactivar.
- "soat_tecno": SOAT o tecnomecánica por vencer pronto.
- "cumpleanos": no lo uses salvo que sea claramente útil.
- "al_dia": cliente bien cubierto, sin acción urgente (usar poco).

Reglas:
- Usa SOLO el cliente_id exacto que te doy. No inventes clientes ni datos.
- Devuelve entre 10 y 30 oportunidades, ordenadas de mayor a menor prioridad, las más valiosas primero.
- "motivo": 1 frase explicando por qué (basada en los datos reales).
- "accion_sugerida": qué ofrecerle, concreto y breve (esto se usará luego para redactar el mensaje al cliente).
- "resumen": 2-3 frases con el panorama general de la cartera y dónde está el mayor potencial.

Cartera (JSON):
${JSON.stringify(cartera)}`;

  const resp = await client.messages.create({
    model: modelo,
    max_tokens: 8000,
    messages: [{ role: 'user', content: prompt }],
    output_config: { format: { type: 'json_schema', schema: ESQUEMA_OPORTUNIDADES } }
  });

  const texto = resp.content.filter(b => b.type === 'text').map(b => b.text).join('').trim();
  let datos;
  try { datos = JSON.parse(texto); }
  catch { throw new Error('La IA devolvió una respuesta que no se pudo leer. Intenta de nuevo.'); }

  // Validar ids y enriquecer con el nombre real del cliente
  const nombrePorId = Object.fromEntries(cartera.map(c => [c.id, c.nombre]));
  const oportunidades = (datos.oportunidades || [])
    .filter(o => idsValidos.has(o.cliente_id))
    .map(o => ({ ...o, cliente_nombre: nombrePorId[o.cliente_id] }));

  return { resumen: datos.resumen || '', oportunidades, analizado_en: new Date().toISOString() };
}

// ---- Lectura de carátula de póliza en PDF → datos estructurados ----
const ESQUEMA_POLIZA_PDF = {
  type: 'object',
  additionalProperties: false,
  properties: {
    poliza: {
      type: 'object',
      additionalProperties: false,
      properties: {
        numero: { type: 'string' },
        aseguradora: { type: 'string' },
        ramo: { type: 'string' },
        riesgo: { type: 'string' },            // placa, dirección, etc.
        fecha_inicio: { type: 'string' },       // YYYY-MM-DD
        fecha_fin: { type: 'string' },
        fecha_expedicion: { type: 'string' },
        valor_asegurado: { type: 'number' },
        prima_neta: { type: 'number' },
        prima_total: { type: 'number' },
        tomador: { type: 'string' }
      },
      required: ['numero', 'aseguradora', 'ramo', 'riesgo', 'fecha_inicio', 'fecha_fin',
                 'fecha_expedicion', 'valor_asegurado', 'prima_neta', 'prima_total', 'tomador']
    },
    cliente: {
      type: 'object',
      additionalProperties: false,
      properties: {
        nombres: { type: 'string' },
        apellidos: { type: 'string' },
        tipo_doc: { type: 'string' },           // CC, NIT, CE...
        num_doc: { type: 'string' },
        celular: { type: 'string' },
        email: { type: 'string' },
        direccion: { type: 'string' },
        ciudad: { type: 'string' },
        placa: { type: 'string' }
      },
      required: ['nombres', 'apellidos', 'tipo_doc', 'num_doc', 'celular', 'email', 'direccion', 'ciudad', 'placa']
    }
  },
  required: ['poliza', 'cliente']
};

async function leerPolizaPDF(base64Pdf) {
  const client = clienteIA();
  const modelo = getConfig('ia_modelo_analisis', 'claude-opus-4-8');

  const prompt = `Eres un asistente de una agencia de seguros en Colombia. Te paso la carátula de una póliza (PDF). Extrae los datos para registrarla en el sistema.

Reglas:
- Fechas en formato YYYY-MM-DD. Si una fecha no aparece, deja "".
- Valores monetarios como número entero en pesos colombianos, sin puntos ni símbolos (ej: 775584). Si no aparece, usa 0.
- "ramo": el tipo de seguro (ej: "Automóviles", "Vida", "Hogar", "SOAT"...).
- "riesgo": la placa del vehículo si es de autos, o la dirección/bien asegurado.
- En "cliente" pon los datos del TOMADOR/ASEGURADO: nombres y apellidos por separado; tipo_doc (CC, NIT, CE); num_doc solo dígitos. Si es empresa, pon la razón social en "nombres", apellidos "" y tipo_doc "NIT".
- Si un campo de texto no aparece en el documento, déjalo como cadena vacía "". No inventes datos.`;

  const resp = await client.messages.create({
    model: modelo,
    max_tokens: 2000,
    messages: [{
      role: 'user',
      content: [
        { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: base64Pdf } },
        { type: 'text', text: prompt }
      ]
    }],
    output_config: { format: { type: 'json_schema', schema: ESQUEMA_POLIZA_PDF } }
  });

  const texto = resp.content.filter(b => b.type === 'text').map(b => b.text).join('').trim();
  let datos;
  try { datos = JSON.parse(texto); }
  catch { throw new Error('No se pudo leer el PDF. Asegúrate de que sea la carátula de la póliza.'); }

  // Buscar si el cliente ya existe por documento
  const numDoc = (datos.cliente.num_doc || '').replace(/\D/g, '');
  let clienteExistente = null;
  if (numDoc) {
    clienteExistente = db.prepare('SELECT id, nombres, apellidos, num_doc FROM clientes WHERE num_doc = ?').get(numDoc) || null;
  }
  datos.cliente.num_doc = numDoc;
  return { ...datos, cliente_existente: clienteExistente };
}

// ---- Asistente "pregúntale a tu cartera" (lenguaje natural → consultas de solo lectura) ----
const ESQUEMA_BASE = `Base de datos SQLite. Tablas y columnas:

clientes(id, tipo_persona['natural'|'juridica'], nombres, apellidos, alias, tipo_doc['CC'|'NIT'|'CE'|'TI'|'PAS'], num_doc, fecha_nacimiento, genero, celular, telefono, email, direccion, ciudad, departamento, categorias, estado['cliente'|'prospecto'|'inactivo'], placa, soat_vence, tecno_vence, impuestos_vence, observaciones, notif_whatsapp[0/1], notif_email[0/1], notif_cumpleanos[0/1], creado_en, actualizado_en)

polizas(id, cliente_id→clientes.id, numero, aseguradora, ramo, riesgo, estado['cotizacion'|'en_expedicion'|'vigente'|'vencida'|'cancelada'|'renovada'], renovable[0/1], fecha_expedicion, fecha_inicio, fecha_fin, valor_asegurado, prima_neta, gastos, iva, prima_total, pct_comision, comision_agencia, vendedor, periodicidad, forma_pago, tomador, beneficiario_oneroso, observaciones, notif_renovacion[0/1])

cuotas(id, poliza_id→polizas.id, numero, valor, fecha_vence, estado['pendiente'|'pagada'|'anulada'], fecha_pago, medio_pago)

notificaciones(id, tipo, canal['whatsapp'|'email'], cliente_id, poliza_id, destinatario, asunto, mensaje, estado['pendiente'|'enviada'|'error'|'descartada'], error, creado_en, enviado_en)

Notas: las fechas son texto 'YYYY-MM-DD' (usa funciones date() de SQLite). Los montos son números en pesos colombianos (COP). La comisión de la agencia está en polizas.comision_agencia. "vencen" / "por vencer" se refiere a polizas.fecha_fin. Un cliente "sin correo" es email NULL o ''.`;

function validarSelect(sql) {
  let q = String(sql || '').trim().replace(/;+\s*$/, '');
  if (/;/.test(q)) throw new Error('Solo se permite una consulta');
  if (!/^(select|with)\b/i.test(q)) throw new Error('Solo se permiten consultas de lectura (SELECT)');
  if (/\b(insert|update|delete|drop|alter|attach|detach|pragma|create|replace|vacuum|reindex|truncate)\b/i.test(q))
    throw new Error('Consulta no permitida');
  if (!/\blimit\b/i.test(q)) q += ' LIMIT 200';
  return q;
}

async function consultarCartera(pregunta, historial = []) {
  const client = clienteIA();
  const modelo = getConfig('ia_modelo_analisis', 'claude-opus-4-8');
  const agencia = getConfig('nombre_agencia', 'SM SEGUROS');
  const hoy = new Date().toISOString().slice(0, 10);

  const system = `Eres el asistente de datos de la agencia de seguros "${agencia}" en Colombia. Hoy es ${hoy}.
Respondes preguntas del asesor sobre su cartera consultando la base de datos con la herramienta consultar_base (solo lectura, SELECT).
${ESQUEMA_BASE}

Instrucciones:
- Para responder, consulta la base con SELECT. Puedes hacer varias consultas si lo necesitas.
- Responde de forma BREVE y clara en español, con los números o la lista que pida el asesor. Formatea los montos en pesos (ej: $775.584).
- Si una lista es larga, resume y da el total y algunos ejemplos.
- No inventes datos: si la base no tiene la información, dilo.
- Responde directamente, sin explicar tu razonamiento ni las consultas que hiciste.`;

  const herramientas = [{
    name: 'consultar_base',
    description: 'Ejecuta una consulta SELECT de solo lectura sobre la base de datos y devuelve las filas en JSON.',
    input_schema: {
      type: 'object',
      properties: { sql: { type: 'string', description: 'Una sola consulta SELECT de SQLite' } },
      required: ['sql']
    }
  }];

  const mensajes = [
    ...historial.slice(-6).map(h => ({ role: h.role, content: h.content })),
    { role: 'user', content: pregunta }
  ];

  for (let i = 0; i < 6; i++) {
    const resp = await client.messages.create({ model: modelo, max_tokens: 1500, system, tools: herramientas, messages: mensajes });
    mensajes.push({ role: 'assistant', content: resp.content });

    if (resp.stop_reason !== 'tool_use') {
      return resp.content.filter(b => b.type === 'text').map(b => b.text).join('').trim();
    }

    const resultados = [];
    for (const bloque of resp.content) {
      if (bloque.type !== 'tool_use') continue;
      let salida;
      try {
        const sql = validarSelect(bloque.input.sql);
        const filas = db.prepare(sql).all();
        let json = JSON.stringify(filas);
        if (json.length > 8000) json = json.slice(0, 8000) + '… (resultado recortado)';
        salida = json;
      } catch (e) {
        salida = `Error: ${e.message}`;
      }
      resultados.push({ type: 'tool_result', tool_use_id: bloque.id, content: salida });
    }
    mensajes.push({ role: 'user', content: resultados });
  }
  return 'No pude resolver la consulta en los pasos disponibles. Intenta reformular la pregunta.';
}

async function probarConexion() {
  const client = clienteIA();
  const modelo = getConfig('ia_modelo', 'claude-haiku-4-5');
  const resp = await client.messages.create({
    model: modelo,
    max_tokens: 16,
    messages: [{ role: 'user', content: 'Responde solo con la palabra: OK' }]
  });
  return resp.content.some(b => b.type === 'text' && /ok/i.test(b.text));
}

module.exports = { redactarMensaje, analizarCartera, leerPolizaPDF, consultarCartera, probarConexion };
