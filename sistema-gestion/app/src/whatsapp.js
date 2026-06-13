// Conexión a WhatsApp como dispositivo vinculado (Baileys).
// La sesión queda guardada en datos/whatsapp-auth para no escanear el QR cada vez.
const path = require('node:path');
const fs = require('node:fs');
const pino = require('pino');
const QRCode = require('qrcode');
const { DATA_DIR } = require('./db');

const AUTH_DIR = path.join(DATA_DIR, 'whatsapp-auth');

const estado = {
  conexion: 'desconectado',   // desconectado | esperando_qr | conectando | conectado
  qrDataUrl: null,            // QR como imagen base64 para mostrar en la web
  numero: null,
  ultimoError: null
};

let sock = null;
let baileys = null;

async function iniciar() {
  if (!baileys) baileys = await import('baileys');
  const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion } = baileys;

  const { state, saveCreds } = await useMultiFileAuthState(AUTH_DIR);
  const { version } = await fetchLatestBaileysVersion();

  estado.conexion = 'conectando';
  sock = makeWASocket({
    version,
    auth: state,
    logger: pino({ level: 'warn' }),
    printQRInTerminal: false,
    browser: ['SM Gestion', 'Desktop', '1.0'],
    syncFullHistory: false
  });

  sock.ev.on('creds.update', saveCreds);

  sock.ev.on('connection.update', async (u) => {
    const { connection, lastDisconnect, qr } = u;
    if (qr) {
      estado.conexion = 'esperando_qr';
      estado.qrDataUrl = await QRCode.toDataURL(qr, { margin: 1, width: 280 });
    }
    if (connection === 'open') {
      estado.conexion = 'conectado';
      estado.qrDataUrl = null;
      estado.numero = sock.user?.id?.split(':')[0] || null;
      estado.ultimoError = null;
      console.log('[whatsapp] conectado como', estado.numero);
    }
    if (connection === 'close') {
      const codigo = lastDisconnect?.error?.output?.statusCode;
      const cerroSesion = codigo === DisconnectReason.loggedOut;
      estado.conexion = 'desconectado';
      estado.ultimoError = cerroSesion ? 'Sesión cerrada desde el teléfono' : `Conexión perdida (${codigo || 's/c'})`;
      if (cerroSesion) {
        fs.rmSync(AUTH_DIR, { recursive: true, force: true });
      } else {
        setTimeout(() => iniciar().catch(e => { estado.ultimoError = e.message; }), 5000);
      }
    }
  });
}

function normalizarNumero(celular) {
  // Colombia por defecto: 10 dígitos que empiezan por 3 → +57
  let n = String(celular || '').replace(/\D/g, '');
  if (!n) return null;
  if (n.length === 10 && n.startsWith('3')) n = '57' + n;
  if (n.startsWith('0')) n = n.replace(/^0+/, '');
  return n.length >= 11 ? n : null;
}

async function enviarMensaje(celular, texto) {
  if (estado.conexion !== 'conectado' || !sock) {
    throw new Error('WhatsApp no está conectado');
  }
  const numero = normalizarNumero(celular);
  if (!numero) throw new Error(`Número inválido: ${celular}`);
  const jid = `${numero}@s.whatsapp.net`;
  const [check] = await sock.onWhatsApp(jid);
  if (!check?.exists) throw new Error(`El número ${numero} no tiene WhatsApp`);
  await sock.sendMessage(check.jid, { text: texto });
  return numero;
}

async function cerrarSesion() {
  try { await sock?.logout(); } catch {}
  fs.rmSync(AUTH_DIR, { recursive: true, force: true });
  estado.conexion = 'desconectado';
  estado.qrDataUrl = null;
  estado.numero = null;
}

module.exports = { iniciar, enviarMensaje, cerrarSesion, estado, normalizarNumero };
