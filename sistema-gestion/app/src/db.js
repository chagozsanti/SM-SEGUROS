// Base de datos SQLite (node:sqlite, incluido en Node 22+)
const { DatabaseSync } = require('node:sqlite');
const path = require('node:path');
const fs = require('node:fs');

const DATA_DIR = path.join(__dirname, '..', 'datos');
fs.mkdirSync(DATA_DIR, { recursive: true });

const db = new DatabaseSync(path.join(DATA_DIR, 'sm-gestion.db'));

db.exec(`
PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS clientes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tipo_persona TEXT NOT NULL DEFAULT 'natural',      -- natural | juridica
  nombres TEXT NOT NULL,                              -- o razón social si jurídica
  apellidos TEXT DEFAULT '',
  alias TEXT DEFAULT '',
  tipo_doc TEXT DEFAULT 'CC',                         -- CC, NIT, CE, TI, PAS
  num_doc TEXT NOT NULL,
  fecha_nacimiento TEXT,                              -- YYYY-MM-DD (o constitución)
  genero TEXT,
  celular TEXT,
  telefono TEXT,
  email TEXT,
  direccion TEXT,
  ciudad TEXT,
  departamento TEXT,
  categorias TEXT DEFAULT '',                         -- separadas por coma
  estado TEXT NOT NULL DEFAULT 'cliente',             -- cliente | prospecto | inactivo
  placa TEXT,
  soat_vence TEXT,                                    -- YYYY-MM-DD
  tecno_vence TEXT,                                   -- YYYY-MM-DD
  impuestos_vence TEXT,
  observaciones TEXT DEFAULT '',
  notif_whatsapp INTEGER NOT NULL DEFAULT 1,          -- toggle general por cliente
  notif_email INTEGER NOT NULL DEFAULT 1,
  notif_cumpleanos INTEGER NOT NULL DEFAULT 1,
  creado_en TEXT NOT NULL DEFAULT (datetime('now','localtime')),
  actualizado_en TEXT NOT NULL DEFAULT (datetime('now','localtime')),
  UNIQUE(num_doc)
);

CREATE TABLE IF NOT EXISTS polizas (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  cliente_id INTEGER NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
  numero TEXT NOT NULL,
  aseguradora TEXT NOT NULL,
  ramo TEXT NOT NULL,
  riesgo TEXT DEFAULT '',                             -- placa, dirección, etc.
  estado TEXT NOT NULL DEFAULT 'vigente',             -- cotizacion | en_expedicion | vigente | vencida | cancelada | renovada
  renovable INTEGER NOT NULL DEFAULT 1,
  fecha_expedicion TEXT,
  fecha_inicio TEXT,
  fecha_fin TEXT,
  valor_asegurado REAL DEFAULT 0,
  prima_neta REAL DEFAULT 0,
  gastos REAL DEFAULT 0,
  iva REAL DEFAULT 0,
  prima_total REAL DEFAULT 0,
  pct_comision REAL DEFAULT 0,
  comision_agencia REAL DEFAULT 0,
  vendedor TEXT DEFAULT '',
  periodicidad TEXT DEFAULT 'anual',                  -- anual | semestral | trimestral | mensual | contado
  forma_pago TEXT DEFAULT '',
  tomador TEXT DEFAULT '',
  beneficiario_oneroso TEXT DEFAULT '',
  observaciones TEXT DEFAULT '',
  notif_renovacion INTEGER NOT NULL DEFAULT 1,        -- toggle por póliza
  creado_en TEXT NOT NULL DEFAULT (datetime('now','localtime')),
  actualizado_en TEXT NOT NULL DEFAULT (datetime('now','localtime'))
);

CREATE TABLE IF NOT EXISTS cuotas (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  poliza_id INTEGER NOT NULL REFERENCES polizas(id) ON DELETE CASCADE,
  numero INTEGER NOT NULL DEFAULT 1,
  valor REAL NOT NULL DEFAULT 0,
  fecha_vence TEXT NOT NULL,                          -- YYYY-MM-DD
  estado TEXT NOT NULL DEFAULT 'pendiente',           -- pendiente | pagada | anulada
  fecha_pago TEXT,
  medio_pago TEXT DEFAULT '',
  observaciones TEXT DEFAULT ''
);

CREATE TABLE IF NOT EXISTS negocios (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  titulo TEXT NOT NULL,
  cliente_id INTEGER REFERENCES clientes(id) ON DELETE SET NULL,  -- si el prospecto ya es cliente
  prospecto_nombre TEXT DEFAULT '',                               -- si aún no es cliente
  prospecto_celular TEXT DEFAULT '',
  prospecto_email TEXT DEFAULT '',
  ramo TEXT DEFAULT 'Automóviles',
  aseguradora TEXT DEFAULT '',
  etapa TEXT NOT NULL DEFAULT 'nuevo',     -- nuevo | contactado | cotizacion | negociacion | ganado | perdido
  valor_estimado REAL DEFAULT 0,           -- prima estimada del negocio
  origen TEXT DEFAULT '',                  -- referido, WhatsApp, Instagram, llamada, web…
  vendedor TEXT DEFAULT '',
  proxima_accion TEXT DEFAULT '',          -- siguiente paso a dar
  fecha_proxima_accion TEXT,               -- YYYY-MM-DD
  notas TEXT DEFAULT '',
  motivo_perdido TEXT DEFAULT '',
  creado_en TEXT NOT NULL DEFAULT (datetime('now','localtime')),
  actualizado_en TEXT NOT NULL DEFAULT (datetime('now','localtime')),
  cerrado_en TEXT                          -- se llena al pasar a ganado/perdido
);

CREATE TABLE IF NOT EXISTS notificaciones (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tipo TEXT NOT NULL,            -- poliza_por_vencer | poliza_vencida | cuota_por_vencer | cuota_vencida | soat | tecno | cumpleanos | manual
  canal TEXT NOT NULL,           -- whatsapp | email
  cliente_id INTEGER REFERENCES clientes(id) ON DELETE SET NULL,
  poliza_id INTEGER REFERENCES polizas(id) ON DELETE SET NULL,
  destinatario TEXT NOT NULL,    -- número o correo
  asunto TEXT DEFAULT '',
  mensaje TEXT NOT NULL,
  estado TEXT NOT NULL DEFAULT 'pendiente',  -- pendiente | enviada | error | descartada
  error TEXT,
  clave_unica TEXT,              -- evita duplicados: tipo|canal|ref|fecha-objetivo
  creado_en TEXT NOT NULL DEFAULT (datetime('now','localtime')),
  enviado_en TEXT,
  UNIQUE(clave_unica)
);

CREATE TABLE IF NOT EXISTS plantillas (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tipo TEXT NOT NULL,            -- mismo catálogo de notificaciones.tipo
  canal TEXT NOT NULL,           -- whatsapp | email
  asunto TEXT DEFAULT '',
  cuerpo TEXT NOT NULL,
  UNIQUE(tipo, canal)
);

CREATE TABLE IF NOT EXISTS config (
  clave TEXT PRIMARY KEY,
  valor TEXT
);
`);

// ---- Config helpers ----
function getConfig(clave, porDefecto = null) {
  const row = db.prepare('SELECT valor FROM config WHERE clave = ?').get(clave);
  return row ? row.valor : porDefecto;
}
function setConfig(clave, valor) {
  db.prepare(`INSERT INTO config (clave, valor) VALUES (?, ?)
              ON CONFLICT(clave) DO UPDATE SET valor = excluded.valor`).run(clave, String(valor));
}

// Valores iniciales de configuración
const CONFIG_DEFECTO = {
  dias_aviso_renovacion: '30,15,7,1',
  dias_aviso_cuota: '5,1',
  dias_aviso_soat: '15,5,1',
  dias_aviso_tecno: '15,5,1',
  hora_envio: '08:00',
  smtp_usuario: '',
  smtp_clave_app: '',
  smtp_remitente: 'SM Seguros <info@smseguros.com.co>',
  nombre_agencia: 'SM SEGUROS',
  celular_agencia: '3148974193',
  envio_automatico: '0',  // 0 = revisar y aprobar manualmente; 1 = enviar solo
  anthropic_api_key: '',  // API key de Claude para las funciones de IA
  ia_modelo: 'claude-haiku-4-5',  // modelo para redactar mensajes (rápido y económico)
  ia_modelo_analisis: 'claude-opus-4-8',  // modelo para análisis de cartera (más capaz)
  ia_tono: 'cercano, cálido y profesional'  // tono de la agencia para los mensajes IA
};
for (const [k, v] of Object.entries(CONFIG_DEFECTO)) {
  db.prepare('INSERT OR IGNORE INTO config (clave, valor) VALUES (?, ?)').run(k, v);
}

// Plantillas por defecto (variables: {{nombre}}, {{numero_poliza}}, {{aseguradora}}, {{ramo}},
// {{riesgo}}, {{fecha_fin}}, {{dias}}, {{valor}}, {{agencia}}, {{celular_agencia}})
const PLANTILLAS_DEFECTO = [
  ['poliza_por_vencer', 'whatsapp', '',
   'Hola {{nombre}} 👋. Te recordamos de parte de *{{agencia}}* que tu póliza de {{ramo}} N.º {{numero_poliza}} ({{aseguradora}}{{riesgo_txt}}) vence el *{{fecha_fin}}* (en {{dias}} días). Escríbenos para gestionar tu renovación y mantener tu protección al día. 🚗🛡️'],
  ['poliza_por_vencer', 'email', 'Tu póliza {{ramo}} vence el {{fecha_fin}} — {{agencia}}',
   'Hola {{nombre}},\n\nTe recordamos que tu póliza de {{ramo}} N.º {{numero_poliza}} con {{aseguradora}}{{riesgo_txt}} vence el {{fecha_fin}} (en {{dias}} días).\n\nResponde este correo o escríbenos al {{celular_agencia}} para gestionar tu renovación.\n\nUn saludo,\n{{agencia}}'],
  ['poliza_vencida', 'whatsapp', '',
   'Hola {{nombre}}. Tu póliza de {{ramo}} N.º {{numero_poliza}} ({{aseguradora}}) *venció el {{fecha_fin}}* y tu vehículo/bien quedó sin cobertura. En *{{agencia}}* podemos renovarla hoy mismo, escríbenos. 🙏'],
  ['poliza_vencida', 'email', 'Tu póliza {{ramo}} está vencida — {{agencia}}',
   'Hola {{nombre}},\n\nTu póliza de {{ramo}} N.º {{numero_poliza}} con {{aseguradora}} venció el {{fecha_fin}} y ya no tienes cobertura.\n\nEscríbenos al {{celular_agencia}} y la renovamos de inmediato.\n\n{{agencia}}'],
  ['cuota_por_vencer', 'whatsapp', '',
   'Hola {{nombre}} 👋. Te recordamos que la cuota de tu póliza {{ramo}} N.º {{numero_poliza}} por *{{valor}}* vence el *{{fecha_fin}}*. Gracias por mantener tu seguro al día. — {{agencia}}'],
  ['cuota_por_vencer', 'email', 'Recordatorio de pago — póliza {{numero_poliza}}',
   'Hola {{nombre}},\n\nLa cuota de tu póliza de {{ramo}} N.º {{numero_poliza}} por {{valor}} vence el {{fecha_fin}}.\n\nGracias por mantener tu seguro al día.\n\n{{agencia}}'],
  ['cuota_vencida', 'whatsapp', '',
   'Hola {{nombre}}. La cuota de tu póliza {{ramo}} N.º {{numero_poliza}} por *{{valor}}* venció el {{fecha_fin}}. Evita la cancelación de tu seguro poniéndote al día. Escríbenos si necesitas ayuda. — {{agencia}}'],
  ['cuota_vencida', 'email', 'Pago vencido — póliza {{numero_poliza}}',
   'Hola {{nombre}},\n\nLa cuota de tu póliza de {{ramo}} N.º {{numero_poliza}} por {{valor}} venció el {{fecha_fin}}. Evita la cancelación de tu póliza poniéndote al día.\n\n{{agencia}}'],
  ['soat', 'whatsapp', '',
   'Hola {{nombre}} 👋. Tu *SOAT* del vehículo {{riesgo}} vence el *{{fecha_fin}}* (en {{dias}} días). En *{{agencia}}* te lo renovamos fácil y rápido, escríbenos. 🚗'],
  ['soat', 'email', 'Tu SOAT vence el {{fecha_fin}} — {{agencia}}',
   'Hola {{nombre}},\n\nTu SOAT del vehículo {{riesgo}} vence el {{fecha_fin}} (en {{dias}} días). Escríbenos al {{celular_agencia}} y te lo renovamos de una vez.\n\n{{agencia}}'],
  ['tecno', 'whatsapp', '',
   'Hola {{nombre}} 👋. La *tecnomecánica* de tu vehículo {{riesgo}} vence el *{{fecha_fin}}* (en {{dias}} días). Recuerda agendar la revisión para evitar comparendos. — {{agencia}}'],
  ['tecno', 'email', 'Tu tecnomecánica vence el {{fecha_fin}}',
   'Hola {{nombre}},\n\nLa revisión tecnomecánica de tu vehículo {{riesgo}} vence el {{fecha_fin}} (en {{dias}} días). Agenda tu revisión a tiempo para evitar comparendos.\n\n{{agencia}}'],
  ['cumpleanos', 'whatsapp', '',
   '🎉 ¡Feliz cumpleaños, {{nombre}}! 🎂 De parte de todo el equipo de *{{agencia}}* te deseamos un día maravilloso. Gracias por confiar en nosotros para proteger lo que más quieres. 🥳'],
  ['cumpleanos', 'email', '🎉 ¡Feliz cumpleaños, {{nombre}}!',
   '¡Feliz cumpleaños, {{nombre}}!\n\nDe parte de todo el equipo de {{agencia}} te deseamos un día maravilloso. Gracias por confiar en nosotros.\n\nUn abrazo,\n{{agencia}}']
];
const insPlantilla = db.prepare('INSERT OR IGNORE INTO plantillas (tipo, canal, asunto, cuerpo) VALUES (?, ?, ?, ?)');
for (const p of PLANTILLAS_DEFECTO) insPlantilla.run(...p);

module.exports = { db, getConfig, setConfig, DATA_DIR };
