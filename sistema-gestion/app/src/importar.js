// Importador de los Excel exportados de SOFTseguros (clientes y pólizas).
// Mapea por nombre de encabezado normalizado, tolerante a variaciones.
const ExcelJS = require('exceljs');
const { db } = require('./db');

function norm(s) {
  return String(s || '')
    .toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9 ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// Devuelve {indiceColumna: campo} buscando sinónimos en los encabezados
function mapearEncabezados(headers, sinonimos) {
  const mapa = {};
  headers.forEach((h, i) => {
    const n = norm(h);
    if (!n) return;
    for (const [campo, opciones] of Object.entries(sinonimos)) {
      if (Object.values(mapa).includes(campo)) continue;
      if (opciones.some(o => n === o || n.startsWith(o))) { mapa[i] = campo; break; }
    }
  });
  return mapa;
}

function valorCelda(cell) {
  if (cell == null) return '';
  if (cell instanceof Date) {
    return `${cell.getFullYear()}-${String(cell.getMonth() + 1).padStart(2, '0')}-${String(cell.getDate()).padStart(2, '0')}`;
  }
  if (typeof cell === 'object') {
    if (cell.text) return String(cell.text);
    if (cell.result != null) return valorCelda(cell.result);
    if (cell.richText) return cell.richText.map(t => t.text).join('');
    return '';
  }
  return String(cell).trim();
}

function aFechaISO(v) {
  const s = valorCelda(v);
  if (!s) return null;
  let m = s.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
  if (m) return `${m[1]}-${m[2].padStart(2, '0')}-${m[3].padStart(2, '0')}`;
  m = s.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})/);
  if (m) return `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
  return null;
}

function aNumero(v) {
  if (typeof v === 'number') return v;
  const s = valorCelda(v).replace(/[^\d.,-]/g, '');
  if (!s) return 0;
  // El último separador es decimal solo si le siguen 1-2 dígitos;
  // grupos de 3 se tratan como separador de miles (formato dinero).
  const m = s.match(/^(.*?)([.,])(\d{1,2})$/);
  const limpio = m
    ? m[1].replace(/[.,]/g, '') + '.' + m[3]
    : s.replace(/[.,]/g, '');
  const n = parseFloat(limpio);
  return isNaN(n) ? 0 : n;
}

async function leerFilas(rutaArchivo) {
  const wb = new ExcelJS.Workbook();
  if (rutaArchivo.toLowerCase().endsWith('.csv')) {
    await wb.csv.readFile(rutaArchivo);
  } else {
    await wb.xlsx.readFile(rutaArchivo);
  }
  const ws = wb.worksheets[0];
  const filas = [];
  ws.eachRow((row) => {
    const valores = [];
    row.eachCell({ includeEmpty: true }, (cell, col) => { valores[col - 1] = cell.value; });
    filas.push(valores);
  });
  return filas;
}

// Detecta la fila de encabezados (la primera que matchee 2+ sinónimos)
function detectarEncabezado(filas, sinonimos) {
  for (let i = 0; i < Math.min(filas.length, 10); i++) {
    const mapa = mapearEncabezados(filas[i].map(valorCelda), sinonimos);
    if (Object.keys(mapa).length >= 2) return { filaIdx: i, mapa };
  }
  return null;
}

const SIN_CLIENTES = {
  nombres: ['nombres', 'nombre', 'razon social'],
  apellidos: ['apellidos', 'apellido'],
  alias: ['sobrenombre', 'alias'],
  num_doc: ['numero de documento', 'n documento', 'no documento', 'documento', 'nit', 'cedula', 'identificacion'],
  tipo_doc: ['tipo de documento', 'tipo documento'],
  fecha_nacimiento: ['fecha de nacimiento', 'f nacimiento', 'fecha nacimiento', 'f constitucion'],
  genero: ['genero', 'sexo'],
  celular: ['celular', 'telefono movil', 'telefono celular', 'movil'],
  telefono: ['telefono principal', 'telefono fijo', 'telefono secundario', 'telefono'],
  email: ['email', 'correo'],
  direccion: ['direccion principal', 'direccion'],
  ciudad: ['ciudad'],
  categorias: ['categorias', 'categoria'],
  placa: ['placa'],
  soat_vence: ['fecha vencimiento soat', 'soat'],
  tecno_vence: ['fecha vencimiento tecnomecanica', 'tecnomecanica'],
  observaciones: ['observaciones', 'observacion']
};

const SIN_POLIZAS = {
  numero: ['numero de poliza', 'n poliza', 'no poliza', 'poliza'],
  aseguradora: ['aseguradora', 'compania'],
  ramo: ['ramo', 'subramo'],
  riesgo: ['riesgo'],
  num_doc_cliente: ['documento del cliente', 'documento', 'n documento', 'numero de documento', 'identificacion', 'cedula'],
  nombre_cliente: ['nombre del asegurado', 'cliente', 'nombre cliente', 'asegurado'],
  tomador: ['nombre del tomador', 'tomador', 'nombre tomador'],
  vendedor: ['nombre del vendedor', 'vendedor'],
  estado: ['estado de poliza', 'estado poliza', 'estado'],
  renovable: ['renovable'],
  prima_neta: ['prima neta'],
  gastos: ['gastos de expedicion', 'gastos'],
  iva: ['iva'],
  prima_total: ['prima total', 'total'],
  pct_comision: ['porcentaje de comision', 'porcentaje comision', 'porcentaje'],
  comision_agencia: ['comision agencia', 'comision'],
  forma_pago: ['forma pago', 'forma de pago'],
  fecha_inicio: ['fecha inicio', 'f inicio', 'fecha de inicio', 'vigencia desde'],
  fecha_fin: ['fecha fin', 'f fin', 'fecha de fin', 'vigencia hasta', 'fecha vencimiento'],
  fecha_expedicion: ['fecha de expedicion', 'fecha expedicion', 'f expedicion', 'fecha creacion'],
  valor_asegurado: ['valor riesgo asegurado', 'valor asegurado'],
  observaciones: ['observaciones', 'observacion']
};

const SIN_VEHICULOS = {
  num_doc: ['numero de documento', 'n documento', 'documento', 'cedula', 'identificacion'],
  placa: ['placa'],
  soat_vence: ['fecha vencimiento soat', 'soat'],
  impuestos_vence: ['fecha pago impuestos', 'fecha vencimiento impuestos', 'impuestos'],
  tecno_vence: ['fecha vencimiento tecnomecanica', 'tecnomecanica']
};

async function importarClientes(rutaArchivo) {
  const filas = await leerFilas(rutaArchivo);
  const det = detectarEncabezado(filas, SIN_CLIENTES);
  if (!det) throw new Error('No reconocí los encabezados del Excel de clientes');
  const { filaIdx, mapa } = det;

  const ins = db.prepare(`INSERT INTO clientes
    (tipo_persona, nombres, apellidos, tipo_doc, num_doc, fecha_nacimiento, genero, celular,
     telefono, email, direccion, ciudad, departamento, categorias, estado, placa,
     soat_vence, tecno_vence, observaciones)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
    ON CONFLICT(num_doc) DO UPDATE SET
      nombres=excluded.nombres, apellidos=excluded.apellidos, celular=excluded.celular,
      email=excluded.email, fecha_nacimiento=COALESCE(excluded.fecha_nacimiento, clientes.fecha_nacimiento),
      categorias=excluded.categorias, actualizado_en=datetime('now','localtime')`);

  let insertados = 0, omitidos = 0;
  for (let i = filaIdx + 1; i < filas.length; i++) {
    const f = filas[i];
    const get = campo => {
      const col = Object.keys(mapa).find(k => mapa[k] === campo);
      return col != null ? f[col] : undefined;
    };
    const numDoc = valorCelda(get('num_doc')).replace(/\D/g, '');
    const nombres = valorCelda(get('nombres'));
    if (!numDoc || !nombres) { omitidos++; continue; }

    const celular = valorCelda(get('celular')).replace(/\D/g, '').replace(/^57(?=3\d{9}$)/, '');
    const estadoRaw = norm(valorCelda(get('estado')));
    const estado = estadoRaw.includes('prospecto') ? 'prospecto' : 'cliente';
    const tipoDocRaw = norm(valorCelda(get('tipo_doc')));
    const esJuridica = tipoDocRaw.includes('nit') || (!valorCelda(get('apellidos')) && numDoc.length === 9);

    ins.run(
      esJuridica ? 'juridica' : 'natural', nombres, valorCelda(get('apellidos')),
      tipoDocRaw.includes('nit') ? 'NIT' : 'CC', numDoc,
      aFechaISO(get('fecha_nacimiento')), valorCelda(get('genero')) || null,
      celular || null, valorCelda(get('telefono')) || null, valorCelda(get('email')) || null,
      valorCelda(get('direccion')) || null, valorCelda(get('ciudad')) || null,
      valorCelda(get('departamento')) || null, valorCelda(get('categorias')),
      estado, valorCelda(get('placa')) || null,
      aFechaISO(get('soat_vence')), aFechaISO(get('tecno_vence')),
      valorCelda(get('observaciones'))
    );
    insertados++;
  }
  return { insertados, omitidos };
}

// Separa un nombre completo en nombres / apellidos (convención: últimos 2 tokens = apellidos)
function partirNombre(completo) {
  const t = String(completo || '').trim().split(/\s+/).filter(Boolean);
  if (t.length <= 1) return { nombres: t[0] || '', apellidos: '' };
  if (t.length === 2) return { nombres: t[0], apellidos: t[1] };
  return { nombres: t.slice(0, t.length - 2).join(' '), apellidos: t.slice(-2).join(' ') };
}

async function importarPolizas(rutaArchivo) {
  const filas = await leerFilas(rutaArchivo);
  const det = detectarEncabezado(filas, SIN_POLIZAS);
  if (!det) throw new Error('No reconocí los encabezados del Excel de pólizas');
  const { filaIdx, mapa } = det;

  const buscarCliente = db.prepare('SELECT id FROM clientes WHERE num_doc = ?');
  const existePoliza = db.prepare('SELECT id FROM polizas WHERE numero = ? AND cliente_id = ?');
  const crearCliente = db.prepare(`INSERT OR IGNORE INTO clientes (tipo_persona, nombres, apellidos, tipo_doc, num_doc, estado)
    VALUES (?,?,?,?,?,'cliente')`);
  const ins = db.prepare(`INSERT INTO polizas
    (cliente_id, numero, aseguradora, ramo, riesgo, estado, renovable, fecha_expedicion,
     fecha_inicio, fecha_fin, valor_asegurado, prima_neta, gastos, iva, prima_total, pct_comision,
     comision_agencia, vendedor, forma_pago, tomador, observaciones)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`);

  let insertadas = 0, omitidas = 0, clientesCreados = 0, sinCliente = [];
  for (let i = filaIdx + 1; i < filas.length; i++) {
    const f = filas[i];
    const get = campo => {
      const col = Object.keys(mapa).find(k => mapa[k] === campo);
      return col != null ? f[col] : undefined;
    };
    const numero = valorCelda(get('numero'));
    if (!numero) { omitidas++; continue; }

    const docCliente = valorCelda(get('num_doc_cliente')).replace(/\D/g, '');
    let cli = docCliente ? buscarCliente.get(docCliente) : null;
    if (!cli) {
      // Cliente ausente en la planilla de clientes: se crea uno mínimo con el nombre del tomador/asegurado
      const nombreCompleto = valorCelda(get('tomador')) || valorCelda(get('nombre_cliente'));
      if (!docCliente || !nombreCompleto) {
        sinCliente.push(`${numero} (doc ${docCliente || 'sin doc'} — ${nombreCompleto || 'sin nombre'})`);
        omitidas++;
        continue;
      }
      const { nombres, apellidos } = partirNombre(nombreCompleto);
      const tipoDoc = docCliente.length === 9 && !apellidos ? 'NIT' : 'CC';
      crearCliente.run(tipoDoc === 'NIT' ? 'juridica' : 'natural', nombres, apellidos, tipoDoc, docCliente);
      cli = buscarCliente.get(docCliente);
      clientesCreados++;
    }
    if (existePoliza.get(numero, cli.id)) { omitidas++; continue; }

    const estadoRaw = norm(valorCelda(get('estado')));
    let estado = 'vigente';
    if (estadoRaw.includes('venc')) estado = 'vencida';
    else if (estadoRaw.includes('cancel')) estado = 'cancelada';
    else if (estadoRaw.includes('renov')) estado = 'renovada';
    else if (estadoRaw.includes('cotiz')) estado = 'cotizacion';
    else if (estadoRaw.includes('exped')) estado = 'en_expedicion';

    const renovableRaw = norm(valorCelda(get('renovable')));
    const primaNeta = aNumero(get('prima_neta'));
    const gastos = aNumero(get('gastos'));
    const iva = aNumero(get('iva'));
    const pct = aNumero(get('pct_comision'));
    // Si la planilla no trae prima total, se calcula (neta + gastos + iva)
    let primaTotal = aNumero(get('prima_total'));
    if (!primaTotal) primaTotal = primaNeta + gastos + iva;
    // Si no trae comisión en valor, se calcula con el % sobre la prima neta
    let comision = aNumero(get('comision_agencia'));
    if (!comision && pct) comision = Math.round(primaNeta * pct / 100);

    ins.run(
      cli.id, numero, valorCelda(get('aseguradora')), valorCelda(get('ramo')) || 'Automóviles',
      valorCelda(get('riesgo')), estado,
      renovableRaw.startsWith('n') ? 0 : 1,
      aFechaISO(get('fecha_expedicion')), aFechaISO(get('fecha_inicio')), aFechaISO(get('fecha_fin')),
      aNumero(get('valor_asegurado')), primaNeta, gastos, iva, primaTotal, pct, comision,
      valorCelda(get('vendedor')), valorCelda(get('forma_pago')), valorCelda(get('tomador')), valorCelda(get('observaciones'))
    );
    insertadas++;
  }
  return { insertadas, omitidas, clientesCreados, sinCliente: sinCliente.slice(0, 20) };
}

async function importarVehiculos(rutaArchivo) {
  const filas = await leerFilas(rutaArchivo);
  const det = detectarEncabezado(filas, SIN_VEHICULOS);
  if (!det) throw new Error('No reconocí los encabezados del Excel de vehículos');
  const { filaIdx, mapa } = det;

  const upd = db.prepare(`UPDATE clientes SET
      placa = COALESCE(?, placa), soat_vence = COALESCE(?, soat_vence),
      tecno_vence = COALESCE(?, tecno_vence), impuestos_vence = COALESCE(?, impuestos_vence),
      actualizado_en = datetime('now','localtime') WHERE num_doc = ?`);

  let actualizados = 0, omitidos = 0, sinCliente = [];
  for (let i = filaIdx + 1; i < filas.length; i++) {
    const f = filas[i];
    const get = campo => {
      const col = Object.keys(mapa).find(k => mapa[k] === campo);
      return col != null ? f[col] : undefined;
    };
    const numDoc = valorCelda(get('num_doc')).replace(/\D/g, '');
    const placa = valorCelda(get('placa')).toUpperCase().replace(/\s/g, '') || null;
    if (!numDoc) { omitidos++; continue; }
    const r = upd.run(placa, aFechaISO(get('soat_vence')), aFechaISO(get('tecno_vence')),
      aFechaISO(get('impuestos_vence')), numDoc);
    if (r.changes > 0) actualizados++;
    else { omitidos++; sinCliente.push(`doc ${numDoc}${placa ? ' / ' + placa : ''}`); }
  }
  return { actualizados, omitidos, sinCliente: sinCliente.slice(0, 20) };
}

module.exports = { importarClientes, importarPolizas, importarVehiculos };
