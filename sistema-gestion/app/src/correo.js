// Envío de correos por el Gmail corporativo (Google Workspace) vía SMTP.
// Requiere una "contraseña de aplicación" de Google (Cuenta → Seguridad → Verificación
// en dos pasos → Contraseñas de aplicaciones), se guarda en Configuración.
const nodemailer = require('nodemailer');
const { getConfig } = require('./db');

let transporter = null;
let credencialesUsadas = '';

function obtenerTransporte() {
  const usuario = getConfig('smtp_usuario', '').trim();
  // La contraseña de aplicación de Google se muestra en 4 grupos de 4 con espacios,
  // pero el login espera los 16 caracteres seguidos: quitamos cualquier espacio.
  const clave = getConfig('smtp_clave_app', '').replace(/\s/g, '');
  if (!usuario || !clave) throw new Error('Configura el correo corporativo y la contraseña de aplicación en Configuración');
  const firma = usuario + '|' + clave;
  if (!transporter || credencialesUsadas !== firma) {
    transporter = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 465,
      secure: true,
      auth: { user: usuario, pass: clave }
    });
    credencialesUsadas = firma;
  }
  return transporter;
}

async function enviarCorreo(destinatario, asunto, cuerpo) {
  const t = obtenerTransporte();
  const remitente = getConfig('smtp_remitente', getConfig('smtp_usuario'));
  await t.sendMail({
    from: remitente,
    to: destinatario,
    subject: asunto,
    text: cuerpo
  });
}

async function probarConexion() {
  const t = obtenerTransporte();
  await t.verify();
  return true;
}

module.exports = { enviarCorreo, probarConexion };
