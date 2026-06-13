# SM Gestión — Sistema de gestión de SM Seguros

Sistema local (sin hosting) para administrar clientes, pólizas, renovaciones, cobros
y **recordatorios automáticos por WhatsApp y correo corporativo**.

## Cómo iniciarlo

- **Mac:** doble clic en `iniciar.command` (o `node server.js`). Abre http://localhost:3477
- **Windows:** instalar Node.js (nodejs.org, botón LTS), copiar esta carpeta, ejecutar
  `npm install` una vez dentro de la carpeta, y luego doble clic en `iniciar-windows.bat`.

## Puesta en marcha (una sola vez)

1. **Importar datos:** menú *Importar* → subir el Excel de clientes de SOFTseguros y
   luego el de pólizas (en ese orden).
2. **Conectar WhatsApp:** *Configuración* → WhatsApp → "Conectar / Mostrar QR" →
   en el celular de la agencia: WhatsApp → Dispositivos vinculados → Vincular dispositivo →
   escanear el QR. La sesión queda guardada.
3. **Conectar el correo corporativo (Gmail/Workspace):**
   - Entrar a https://myaccount.google.com/apppasswords con la cuenta de la agencia
     (requiere verificación en dos pasos activa) y crear una "contraseña de aplicación".
   - Pegarla en *Configuración* → Correo corporativo, junto con el correo. Probar conexión.
4. Revisar las **plantillas** de mensajes y los **días de aviso** en Configuración.

## Cómo funcionan los recordatorios

Cada día a la hora configurada (8:00 por defecto) el sistema genera alertas de:
- Pólizas por vencer (30, 15, 7 y 1 días antes) y vencidas
- Cuotas de pago por vencer y vencidas
- SOAT y tecnomecánica por vencer
- Cumpleaños del día

Quedan en *Notificaciones* → Pendientes para revisarlas y enviarlas con un clic
(o marcar "Enviar automáticamente" en Configuración para que salgan solas).
Cada cliente tiene interruptores para activar/desactivar WhatsApp, correo y cumpleaños.

## Datos

Todo se guarda en `datos/sm-gestion.db` (SQLite). Para respaldar, copiar esa carpeta.
La sesión de WhatsApp queda en `datos/whatsapp-auth/`.
