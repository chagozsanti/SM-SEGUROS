# Estado del proyecto — Agencia de seguros (traspaso a Mac)

> Archivo de traspaso para continuar en otro computador. Al retomar, pídele a Claude que lea este archivo.

**Última actualización:** 2026-06-13 (noche, cont.: correo corporativo conectado y verificado)

## Sesión 2026-06-13 (noche, continuación): correo corporativo conectado
- ✅ **Correo corporativo SMTP operativo** (WhatsApp ya quedó listo en la sesión previa; ahora ambos canales funcionan). El sistema envía por Gmail/Google Workspace.
- ✅ **Diagnóstico y causa del fallo `535-5.7.8 BadCredentials`:** la contraseña de aplicación se había generado bajo `santiago@smseguros.com.co`, pero el usuario en Configuración estaba como `info@smseguros.com.co` (desajuste de cuenta). Corregido: `smtp_usuario` = `santiago@smseguros.com.co`.
- ✅ **Remitente con alias:** `info@smseguros.com.co` es alias del buzón de `santiago@`, así que el remitente quedó como `SM Seguros <info@smseguros.com.co>` (auth con santiago@, envío mostrando info@). Verificado con envío real. *Pendiente de Santi:* confirmar que el campo De: del correo recibido muestre `info@` (si no, agregar info@ en Gmail → Cuentas → "Enviar como").
- ✅ **Fix de código (PR [#3](https://github.com/chagozsanti/SM-SEGUROS/pull/3), fusionado a `main`):** `sistema-gestion/app/src/correo.js` ahora limpia los espacios de la contraseña de aplicación (Google la muestra en 4 grupos de 4; el login SMTP espera los 16 caracteres seguidos) y recorta espacios del usuario. Así "Probar conexión" funciona aunque se pegue con el formato de Google.
- ✅ **Verificado end-to-end:** `probarConexion()`/verify SMTP, envío de prueba real recibido, y endpoint `POST /api/correo/probar` del servidor en marcha → `{"ok":true}`. Servidor reiniciado para cargar el fix.
- ⚠️ **Nota operativa:** Google puede devolver un `535 BadCredentials` **transitorio** tras varios logins SMTP muy seguidos (throttle); reintentar resuelve. En uso normal los envíos van espaciados y no se repite.

## Sesión 2026-06-13 (noche): repo git como único runtime + diálogo de WhatsApp + trazabilidad
- ✅ **El proyecto ahora vive y corre desde el repositorio git**: `/Users/santiago/Documents/cotizador-autos` (remoto GitHub: `chagozsanti/SM-SEGUROS`). El código del sistema está en `sistema-gestion/app/`. Para arrancar: doble clic en `sistema-gestion/app/iniciar.command` (o `cd` ahí y `node server.js`) → http://localhost:3477.
- ✅ **Migrado desde la antigua copia de desarrollo `~/Projects/sm-gestion`** (que queda solo como respaldo, ya NO se usa para correr): se copió la base de datos real (`datos/sm-gestion.db` + WAL, 119 clientes / 149 pólizas) y la sesión de WhatsApp (`datos/whatsapp-auth`, vinculada como +573009018745) a `sistema-gestion/app/datos/`, y se instaló `node_modules` con `npm ci`. `datos/` y `node_modules/` siguen en .gitignore (no se versionan).
- ✅ **`gh` (GitHub CLI)** instalado en `~/.local/bin/gh` y autenticado como `chagozsanti` (sin Homebrew; `brew` no está instalado).
- ✅ **Diálogo de conexión de WhatsApp** (PR #1, fusionado a main): el chip de WhatsApp del menú lateral abre un modal con estado en vivo, QR para vincular, conectar/cerrar sesión y envío de prueba. Reusa la conexión Baileys existente. Verificado en navegador (QR se genera y renderiza).
- ✅ **Trazabilidad entre sesiones** (PR #2, abierto): se creó `CLAUDE.md` (se auto-carga en cada sesión y apunta a este diario como fuente de verdad: leer al iniciar, actualizar al terminar) y el comando de proyecto **`/handoff`** (`.claude/commands/handoff.md`) que resume la sesión y la añade a este archivo. Memoria local de Claude: `proyecto-sm-seguros.md` y `gh-cli-setup.md` (NO viajan en git; la trazabilidad que viaja es la del repo).
- 💬 **Discusión de producto (sin código)**: cómo escalar SM Gestión a SaaS multi-asesor (login, multi-tenant con `agencia_id`/RLS en Postgres, secretos cifrados, WhatsApp Cloud API a escala, Habeas Data Ley 1581). Stack para multiplataforma: Cristian (dev del equipo) usa Flutter + Firebase; recomendación = mantener Flutter y Firebase Auth/FCM/Storage, pero usar **Postgres** (no Firestore) para el CRM relacional/reporting y un **servicio Node always-on (Cloud Run)** para WhatsApp/Baileys e IA (no caben en Cloud Functions).
- **PENDIENTE**: fusionar el **PR #2** para activar `CLAUDE.md` y `/handoff` en `main`. Decisiones de producto pendientes de aterrizar: modelo de negocio (agencia con varios asesores vs. asesores independientes; gratis vs. de pago) antes de dimensionar el multi-tenant.
- IMPORTANTE para futuras sesiones: editar y correr SIEMPRE desde el repo de Documents, NO desde `~/Projects/sm-gestion`.

## Sesión 2026-06-13 (tarde): Dashboard KPIs + diseño Apple + commit
- ✅ **Commit del trabajo previo**: las 4 fases de IA, el embudo y el logo quedaron asegurados en git (`~/Projects/sm-gestion`, commit "v0.2"). El historial ya tiene v0.1 (base) y v0.2.
- ✅ **Dashboard de KPIs ampliado** (vista Panel): 11 indicadores (clientes/prospectos, pólizas vigentes, prima administrada, comisión anual estimada, por renovar 30d, vencidas, cuotas vencidas y por cobrar con monto, negocios abiertos + valor pipeline, tasa de renovación, tasa de cierre de ventas). Gráficos sin librerías (CSS puro): pólizas por aseguradora, por ramo, nuevas por mes (columnas) y embudo por etapa. Endpoint `GET /api/kpis`. Maneja estado vacío con "Sin datos aún."
- ✅ **Rediseño visual estilo Apple**: `public/styles.css` reescrito con tipografía del sistema (SF/-apple-system), paleta de neutros Apple (#f5f5f7, #1d1d1f), azul de acento Apple (#0071e3), barra lateral translúcida (backdrop-filter), tarjetas redondeadas con sombras suaves, controles tipo iOS (pills, radios 10-18px, focus ring azul), modales con blur. Se conservaron todas las clases para no romper la lógica. El azul de la marca quedó como `--marca` de reserva.
- ✅ **Diagnóstico del bloqueo de navegación de la extensión**: NO es un bug del software ni del proyecto. Es el modelo de permisos por dominio de la extensión Claude in Chrome. En sesión nueva, navegar a dominios nuevos (Wikipedia, Guro) funcionó sin bloqueo. Solución permanente para Santi: en Chrome → extensión Claude → Acceso a sitios → "En todos los sitios". No es algo que se arregle en el código.
- **PENDIENTE de Santi**: pasar la **nueva identidad de marca** (logo + colores) para reemplazar el logo actual y ajustar el acento del diseño. Quiere que el sistema se vea/sienta como el ecosistema Apple (ya aplicado a nivel de diseño; faltan los colores/logo de la marca nueva).
- Próximos módulos tipo Guro aún por construir: **gestión de siniestros** y, opcional/costoso, **agentes de voz (Fase E)**.

## Importación de datos reales — HECHA ✅ (2026-06-13)
- Santi cargó sus planillas reales (en el SSD, carpeta `/Volumes/Extreme SSD/Planillas SM Seguros/`): `Planilla clientes.xlsx`, `Planilla pólizas.xlsx`, `Datos vehiculo de clientes.xlsx`.
- Se **mejoró el importador** (`src/importar.js`) para el formato real (tipo SOFTseguros): celular desde "TELÉFONO MÓVIL", ramo desde "SUBRAMO", cálculo de **prima total** (neta+gastos+iva si viene vacía) y de **comisión** (prima neta × % si viene vacía), y soporte del **tercer archivo de vehículos** (placa/SOAT/tecnomecánica/impuestos por documento → enriquece clientes). Nueva ruta `/api/importar/vehiculos` y tercera tarjeta en la vista Importar. Orden recomendado: clientes → vehículos → pólizas (o clientes → pólizas → vehículos en carga inicial).
- El importador de pólizas ahora **auto-crea el cliente** cuando falta en la planilla (usa nombre del tomador + documento), así no se pierde ninguna póliza.
- **Resultado cargado en la base local**: 119 clientes (114 de la planilla + 5 auto-creados que no estaban: Raul Eduardo Duque Ramirez con 16 pólizas, Richard Torres, Jhon Jiménez, Laura Giraldo, Deisy Giraldo), 149 pólizas (todas Automóviles), prima administrada ~$442M, comisión anual estimada ~$55M. 30 pólizas figuran vencidas por fecha (estado 'vigente' pero fecha_fin pasada) → revisar/renovar. Los 5 auto-creados quedaron **sin celular/correo** (Santi debe completarlos).
- NOTA: la base de datos (`datos/`) está en .gitignore (no se versiona); solo se versiona el código.

## Conexión con el RUNT (SOAT y tecnomecánica) — sesión 2026-06-13
- Santi pidió actualizar automáticamente SOAT y RTM de todos los vehículos para que los recordatorios sean efectivos.
- **Realidad técnica:** el RUNT NO tiene API abierta gratis. El portal público (www.runt.gov.co, consulta ciudadana) es gratis y sin cuenta pero tiene **captcha** (bloquea automatización; Claude no lo resuelve). El API oficial es solo para entidades autorizadas con convenio. Plataformas como SOFTseguros/Guro logran el "importar planilla → fechas solas" porque pagan un **API de datos con licencia** (Verifik `api.verifik.co/v2/co/runt/...`, Apitude `apitude.co/.../runt-vehicle-co/` — devuelven fecha_vencimiento SOAT y fecha_vigente RTM) y lo esconden en su mensualidad.
- **Decisión de Santi:** NO pagar API (cartera pequeña). Se hace por el **camino gratis**: consultar el RUNT uno por uno, él resuelve el captcha.
- ✅ **CONSTRUIDO (módulo "SOAT/RTM")**: vista con la lista de vehículos (vencidos y sin fecha primero) + por vehículo un modal que copia placa/cédula, abre el RUNT, y permite **pegar el resultado** para que el sistema **extraiga SOAT y tecnomecánica** (parser por secciones, probado) o escribir las fechas a mano. Guarda en el cliente; los recordatorios SOAT/tecno ya usan esas fechas. Endpoints `/api/runt/pendientes`, `/api/runt/extraer`, `PUT /api/clientes/:id/vencimientos`.
- **Siguiente paso (operativo):** cargar las fechas de los ~150 vehículos. Opción: en una sesión, Claude abre el RUNT por vehículo, Santi resuelve el captcha y Claude lee/guarda; o Santi lo hace con el módulo a su ritmo (pegar resultado → extraer → guardar).

## Contexto

Santi tiene una agencia de seguros en Colombia. Dos proyectos:

1. **Cotizador automático de pólizas todo riesgo de autos** (PRIORIDAD — empezamos por este):
   - Flujo: Santi entrega datos del cliente (placa, Fasecolda, datos del tomador) → Claude ingresa con credenciales a los portales de intermediarios de cada aseguradora vía navegador → cotiza → genera informe PDF comparativo con la marca de la empresa.
   - **Aseguradoras a cotizar:** Aseguradora Solidaria, HDI Seguros, Seguros Mundial, Seguros del Estado, AXA Colpatria.
   - La primera vez con cada portal será guiada (Santi supervisa, Claude documenta el paso a paso en `portales/`). Captchas y OTP/2FA los resuelve Santi manualmente.

2. **Sistema de gestión propio (reemplazo de SOFTseguros)** — para después. Decidido: funcionará **local en el PC** (sin costo de hosting). No se copia código de SOFTseguros; se construye desde cero con los módulos que Santi realmente usa (clientes, pólizas, renovaciones, cobros, comisiones, reportes).

## Estructura de carpetas (en el disco externo "Extreme SSD"; en Windows es `E:\CLAUDE CODE`)

- `clientes/` — datos de clientes a cotizar
- `portales/` — documentación paso a paso de cada portal de aseguradora
- `informes/` — informes PDF de cotización generados
- `plantillas/` — plantilla de toma de datos del cliente y plantilla del informe PDF

## Próximos pasos

1. ~~Instalar/abrir Claude Code en el Mac y conectar la extensión Claude in Chrome~~ ✓ Hecho (2026-06-11). Extensión del PC Windows desconectada; solo queda el Chrome del Mac.
2. ~~Conectar el disco externo "Extreme SSD" al Mac y abrir la carpeta de trabajo~~ ✓ Hecho.
3. ~~Crear la plantilla de toma de datos del cliente~~ ✓ Hecho (`plantillas/toma-de-datos-cliente.md`).
4. Pedir a Santi: logo y datos de la empresa para el informe PDF, y las URLs de los portales de intermediarios. (PENDIENTE)
5. ~~Hacer la primera cotización guiada en un portal~~ ✓ Hecha en AXA Colpatria (2026-06-11): Chevrolet Onix 2023, placa KTT097, plan PLUS $7.001.830, cotización 01601344 enviada al correo de la agencia (santiago@smseguros.com.co). Flujo completo documentado en `portales/axa-colpatria.md` y reglas generales en `portales/notas-generales.md`.
6. Siguientes portales por documentar: Aseguradora Solidaria, HDI, Mundial, Seguros del Estado.
7. Plantilla del informe PDF comparativo: pendiente logo y datos de la empresa (correo agencia: santiago@smseguros.com.co, cel Santi: 3148974193).

## Proyecto 2 — Sistema de gestión propio (sesión 2026-06-12)

- Santi quiere que Claude recorra SOFTseguros (https://app.softseguros.com/srv1/home/inicio, usuario santiago.sm, credenciales guardadas en Chrome) para levantar un mapa funcional y construir el sistema propio con marca de la agencia. NO se copia diseño/código de SOFTseguros; se extraen funcionalidades y flujos.
- ~~BLOQUEO de dominio de la extensión~~ ✓ Resuelto (2026-06-12, sesión nueva): la navegación a app.softseguros.com ya funciona sin aviso de bloqueo.
- ✓ **Mapa funcional de SOFTseguros levantado completo** (2026-06-12): ver `sistema-gestion/mapa-funcional-softseguros.md`. Incluye todos los módulos, campos de cliente y póliza, modelo de comisiones, notificaciones, catálogos y vías de exportación de datos (Excel por listado + backup a Dropbox).
- Datos de la empresa encontrados en SOFTseguros (sirven también para el informe PDF del cotizador): **SM SEGUROS., NIT 1036948123-9, Marinilla, info@smseguros.com.co, contacto Santiago Zuluaga, cel 3148974193**. Hay un logo cargado en Configuración → Información de agencia (falta descargarlo o que Santi pase el archivo original).
- ✓ **Sistema propio "SM Gestión" v0.1 construido** (2026-06-12): Node.js + SQLite, corre local en http://localhost:3477.
  - Código fuente: `sistema-gestion/app/` en el SSD (copia portable); desarrollo en `~/Projects/sm-gestion` del Mac (el SSD es exFAT y no soporta node_modules). Script `sincronizar-a-ssd.sh` para actualizar la copia.
  - Módulos: panel, clientes, pólizas con cuotas, notificaciones (cola con revisión o envío automático), plantillas editables, importador de los Excel de SOFTseguros, configuración.
  - **WhatsApp**: vinculación como dispositivo (Baileys, igual que Evolution de SOFTseguros) — falta que Santi escanee el QR con el celular de la agencia.
  - **Correo corporativo**: Gmail/Google Workspace por SMTP — falta que Santi cree una contraseña de aplicación en https://myaccount.google.com/apppasswords y la pegue en Configuración.
  - Recordatorios: pólizas por vencer/vencidas (30,15,7,1 días), cuotas, SOAT, tecnomecánica y cumpleaños — con toggles por cliente y por póliza, igual que SOFTseguros.
  - Probado end-to-end con datos de prueba (generación de alertas, dedupe, importador). Base de datos limpia esperando los Excel reales.
  - Node.js instalado en el Mac en `~/.local/node` (al PC Windows hay que instalarle Node y correr `npm install`).
- Siguiente paso: Santi descarga los Excel reales de SOFTseguros → importarlos en el sistema → escanear QR de WhatsApp → crear contraseña de aplicación de Gmail → probar envíos reales.
- El login de SOFTseguros lo hace Santi (páginas de login siempre bloqueadas para Claude). La sesión de SOFTseguros expira — verificar que esté dentro antes de navegar.
- Módulos previstos del sistema propio: clientes, pólizas, renovaciones/vencimientos, cobros/cartera, comisiones, reportes. Pendiente: export de datos de SOFTseguros (Excel/CSV), nombre/marca del sistema, logo.

## Análisis de Guro + plan de IA (sesión 2026-06-13)

- Santi pidió aprender de **Guro (guro.co)**, insurtech LATAM con IA dentro del sistema, y traer lo mejor. Análisis y plan en `sistema-gestion/analisis-guro-y-plan-ia.md`.
- Fases de IA: (A) redactor IA de mensajes ✅, (B) análisis de cartera/venta cruzada ✅, (C) lector de PDF de pólizas → carga automática ✅, (D) asistente "pregúntale a tu cartera" en lenguaje natural ✅. **LAS 4 FASES ESTÁN CONSTRUIDAS Y VERIFICADAS** (2026-06-13). Detalle en `sistema-gestion/analisis-guro-y-plan-ia.md`. Se activan poniendo la API key de Anthropic en Configuración → Inteligencia Artificial.
- Se construye sobre la **API de Claude (Anthropic)**: requiere API key de Santi (console.anthropic.com) y tiene costo por uso (Haiku barato para mensajes, Opus para análisis). El sistema funciona sin IA; es un add-on que se activa con la key. Modelo recomendado: `claude-opus-4-8` / `claude-haiku-4-5`.
- ✅ **RECORRIDO DE GURO COMPLETADO (2026-06-13):** guro.co ya cargó sin bloqueo en sesión nueva. Hallazgos documentados en `sistema-gestion/analisis-guro-y-plan-ia.md` (sección "Recorrido directo de guro.co").
  - **Agentes de voz con IA (Call Center):** confirmado que existen (llamadas automáticas para cobros, recordatorios de vencimiento, renovaciones, venta cruzada). En Guro es add-on del plan ENTERPRISE ($870.000/mes) con cobro por consumo aparte → es la pieza más cara/compleja. **Decisión: Fase E futura/opcional** (requiere telefonía + voz en tiempo real). Alternativa barata: nota de voz por WhatsApp con TTS.
  - **Hallazgo clave:** las 3 funciones de IA que Guro cobra en su plan "más popular" ($480.000/mes) — chatbot IA, lector PDF IA, IA de venta cruzada — **SM Gestión ya las tiene** (Fases C, B y base de WhatsApp). Lo que nos falta frente a Guro son módulos de gestión: ~~embudo de ventas/pipeline~~ ✅, gestión de siniestros, dashboard de KPIs.

## Módulo Embudo de ventas (pipeline) — CONSTRUIDO ✅ (2026-06-13)
- Nuevo módulo "Embudo" en el menú: tablero kanban con 6 etapas (Nuevo → Contactado → Cotización enviada → Negociación → Ganado / Perdido). Gestiona **prospectos antes de que sean clientes**.
- Cada negocio tiene: título, vínculo a cliente existente *o* datos de prospecto (nombre/celular/email), ramo, aseguradora de interés, valor estimado (prima), origen (referido/WhatsApp/Instagram…), vendedor, próxima acción + fecha, notas y motivo de pérdida.
- **Arrastrar tarjetas** entre columnas mueve la etapa (drag & drop). Al soltar en **Ganado**, ofrece crear el cliente (si era prospecto) y encadenar la creación de la póliza, reutilizando los modales existentes. Botón "💬 Mensaje al cliente" en negocios ya vinculados (reusa el redactor IA).
- Tabla `negocios` en SQLite. Rutas: `GET/POST /api/negocios`, `GET/PUT/DELETE /api/negocios/:id`, `PUT /api/negocios/:id/etapa`. El panel ahora muestra tarjeta "Negocios abiertos · valor en juego".
- **Verificado end-to-end** (crear, mover etapa, edición parcial, dashboard, render del tablero y modal). Base limpia tras las pruebas. Código sincronizado a la copia del SSD (`sistema-gestion/app/`).
- Pendiente de Guro aún por construir: **gestión de siniestros** y **dashboard de KPIs** ampliado.
- **Marca**: Santi tiene una identidad de marca MÁS RECIENTE que la del logo actual (no estaba en el disco) — actualizar logo/colores del sistema cuando la pase.

## Pendientes de Santi

- Credenciales de los 5 portales (las ingresa él directamente al momento del login; Claude no guarda contraseñas).
- Logo y datos de la empresa para el membrete del informe.
- Un cliente de prueba real para la primera cotización.
