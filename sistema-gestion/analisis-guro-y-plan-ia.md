# Análisis de Guro (guro.co) y plan de IA para SM Gestión

> Levantado el 2026-06-12. Guro es una insurtech LATAM: "Software con IA para Agencias y Corredores de Seguros".
> El sitio carga con JavaScript y la extensión del navegador tiene bloqueado el dominio, así que el análisis se hizo
> con investigación web (guro.co + comparativas + competidores Sherpa y Figuro). Pendiente: si Santi aprueba el
> dominio guro.co en la extensión, se puede recorrer la demo directamente para más detalle.
>
> **ACTUALIZACIÓN 2026-06-13: recorrido directo de guro.co realizado** (el sitio ya cargó sin bloqueo en sesión nueva).
> Hallazgos del sitio real abajo en la sección "Recorrido directo de guro.co (2026-06-13)".

## Recorrido directo de guro.co (2026-06-13)
Confirma y amplía el análisis previo. Guro se posiciona como **"el canal que conecta tu agencia con las aseguradoras"**
(integración directa para cotizar y expedir sincronizado, no solo CRM). Respaldado por Meta y Sura como "proveedor autorizado".
Cifras que muestran: +500 agencias LATAM, 97K+ pólizas, +$500MM en pólizas administradas.

**Conjunto completo de módulos que anuncia Guro** (los que NO tenemos aún están marcados ⬜; los que ya tenemos ✅):
- Gestión de Pólizas (emisión, endosos, anexos, renovación) — ✅ tenemos pólizas + cuotas
- CRM de Clientes (ficha 360°, segmentación, etiquetas, historial) — ✅ parcial (clientes); ⬜ etiquetas/segmentación
- Asistente IA 24/7 (consultas en lenguaje natural) — ✅ **Fase D**
- **Call Center con IA** (agentes de voz que llaman para cobros, recordatorios de vencimiento, renovaciones) — ⬜ NO tenemos
- Reportes y Dashboards (KPIs en tiempo real, export Excel/PDF) — ⬜ parcial
- Lector PDF con IA (extracción 95%+) — ✅ **Fase C**
- WhatsApp Marketing (campañas masivas, chatbots de venta cruzada) — ✅ parcial (WhatsApp Baileys); ⬜ chatbot/campañas
- Gestión de Cartera (cobros, pagos a aseguradoras, morosidad, estados de cuenta) — ✅ parcial (cuotas)
- Embudo de Ventas (pipeline, lead scoring, asignación por agente) — ✅ **CONSTRUIDO** (kanban de negocios, 2026-06-13); ⬜ falta lead scoring automático
- Gestión de Siniestros (SLA, priorización, notificaciones) — ⬜ NO tenemos
- Control de Renovaciones (alertas 30/15/7 días) — ✅ tenemos (recordatorios)
- Comisiones Automáticas (cálculo por póliza, liquidación por vendedor) — ⬜ parcial

**La pieza que entusiasmaba a Santi — Call Center con IA / agentes de voz:**
- Anunciado como: agentes de voz IA personalizables, llamadas masivas automáticas, métricas de éxito en tiempo real.
- Casos de uso de Guro: cobros, recordatorios de vencimiento, seguimiento de renovaciones, venta cruzada. Dicen haber
  recuperado "+40% de renovaciones que antes se perdían" con alertas + llamadas IA, y atención 24/7 sin contratar personal.
- **Disponibilidad / costo en Guro:** la "IA para llamadas" está SOLO en el plan **ENTERPRISE** ($870.000/mes) y va con
  **cobro por consumo** aparte. Confirma que es la pieza de IA más compleja y cara (telefonía + voz en tiempo real).

**Planes y precios de Guro (referencia de mercado, COP/mes):**
- START $249.000 (1 usuario, 10 GB) — módulos base.
- BUSINESS $480.000 ("más popular", 3 usuarios, 30 GB) — añade **Chatbot IA, Lector PDF con IA, IA de venta cruzada**.
- ENTERPRISE $870.000 (5 usuarios, 50 GB) — añade app móvil, facturación, nómina electrónica, **IA para llamadas (cobro por consumo)**.
- Usuario adicional $30.000/mes. Anual con 12% de descuento.
- **Lectura para SM Gestión:** las 3 funciones que Guro cobra en su plan "más popular" ($480.000/mes) — chatbot IA, lector
  PDF IA, IA de venta cruzada — **ya las tenemos construidas** (Fases C, B y, vía WhatsApp, base para chatbot). Nuestro
  sistema corre local sin mensualidad; el único costo es el consumo de la API de Claude (centavos por operación).

**Veredicto sobre los agentes de voz para SM Gestión:** Guro mismo lo trata como add-on premium con cobro por consumo, lo
que valida que NO es parte de una v1 local sencilla. Para replicarlo haría falta: un proveedor de telefonía (Twilio/Plivo o
similar), voz en tiempo real (STT + TTS, ej. modelos de voz + un orquestador) y manejo de números colombianos. Es viable
técnicamente pero es un proyecto aparte con costo recurrente real (minutos de llamada + voz). **Recomendación:** dejarlo
como Fase E futura, opcional; priorizar primero lo que ya da valor sin telefonía. Alternativa intermedia de bajo costo:
recordatorios de cobro/renovación por **nota de voz de WhatsApp** generada con TTS (sin llamada telefónica real), que se
apoya en el WhatsApp que ya tenemos.

## Qué hace Guro (funciones núcleo)
- **CRM para corredores**: centraliza clientes, pólizas, comisiones y renovaciones en un solo lugar (igual que el sistema que ya construimos).
- **WhatsApp integrado**: comunicación con clientes desde el sistema (ya lo tenemos con Baileys).
- **Cotizador**: integraciones con aseguradoras LATAM para cotizar (es el Proyecto 1 de Santi — el cotizador de portales).
- **Gestión centralizada** de siniestros y renovaciones.
- **Diferenciador que entusiasma a Santi: IA dentro del sistema.**

## La IA en seguros — qué hacen Guro y competidores (Sherpa, Figuro)
De la investigación, las capacidades de IA que aportan valor real a un corredor:

1. **Asistente que redacta mensajes** (ChatGPT-like): genera correos/WhatsApp de seguimiento, renovación y bienvenida personalizados en segundos. → En vez de plantillas fijas, mensajes con el tono de la agencia adaptados a cada cliente.
2. **Análisis de cartera para venta cruzada** (Figuro): la IA revisa toda la base y detecta oportunidades — "de 200 clientes, estos 40 tienen perfil para un seguro adicional" (ej: cliente con auto pero sin vida, o sin SOAT al día).
3. **Extracción de datos de documentos** (Sherpa "Andes"): subes el PDF de una póliza o la cédula y la IA extrae número, fechas, prima, placa, tomador… y crea/actualiza la póliza sola. Ahorra la digitación manual.
4. **Asistente conversacional sobre tus datos**: preguntas en lenguaje natural — "¿qué clientes vencen en junio y no tienen correo?", "¿cuánto llevo de comisiones este mes?" — y responde consultando la base.
5. **Bot de WhatsApp con IA** (Sherpa): responde solo a consultas de clientes (cotización, estado de póliza, avisos de pago), pide datos paso a paso, valida y escala a humano. (Más avanzado — fase posterior.)
6. **Clasificación de intención + resúmenes**: clasifica mensajes entrantes (venta, siniestro, cobro) y los enruta.

## Cómo aplicamos lo mejor a SM Gestión
Nuestra ventaja: el sistema corre sobre **Claude (Anthropic)**, el mismo motor de IA de primera línea. Podemos integrar
estas capacidades nativamente. Modelo recomendado: **claude-opus-4-8** (el más capaz) para análisis; **claude-haiku-4-5**
(rápido y barato) para redacción de mensajes en volumen.

### Plan por fases (lo mejor de Guro, aplicado)
**Fase A — Redactor IA de mensajes (la más alineada con lo que ya construimos)**
- Botón "✨ Redactar con IA" en cada notificación y en el mensaje manual al cliente.
- La IA toma los datos reales del cliente y su póliza y escribe un WhatsApp/correo cálido y personalizado, con la marca SM Seguros.
- Reemplaza las plantillas rígidas por mensajes que no suenan robóticos. Editable antes de enviar.

**Fase B — Análisis de cartera / oportunidades** ✅ CONSTRUIDA (2026-06-13)
- Pantalla "Oportunidades" en el menú. Botón "✨ Analizar cartera con IA" → la IA (Opus por defecto) revisa todos los clientes y sus pólizas vigentes y devuelve oportunidades clasificadas: venta cruzada, renovación próxima, reactivación, SOAT/tecnomecánica. Cada una con prioridad (alta/media/baja), motivo y acción sugerida.
- Tarjetas con color por prioridad + filtro por tipo + resumen general de la cartera. Botón "✨ Redactar mensaje" en cada oportunidad → abre el modal de mensaje con la acción precargada como contexto para que la IA (Haiku) escriba el WhatsApp/correo. Reutiliza la Fase A.
- El resultado se guarda (config `ultimo_analisis_cartera`) para no repetir el costo de IA en cada visita; solo se recalcula al pulsar "Analizar". Modelo de análisis configurable (Opus/Haiku).
- Endpoints: `POST /api/ia/analizar-cartera`, `GET /api/ia/oportunidades`. Lógica en `src/ia.js` (`analizarCartera`, `resumenCartera`) con structured outputs (json_schema) para resultado confiable; valida los cliente_id contra la base.

**Fase C — Lector de pólizas (PDF → sistema)** ✅ CONSTRUIDA (2026-06-13)
- Botón "✨ Leer póliza de PDF" en la vista de Pólizas. Subes la carátula en PDF y la IA (Opus, lectura nativa de PDF) extrae número, aseguradora, ramo, riesgo/placa, fechas, primas y los datos del tomador.
- Si el tomador ya es cliente (match por documento), abre el modal de póliza precargado con ese cliente seleccionado. Si no existe, abre primero el modal de cliente precargado con los datos del PDF; al guardarlo, encadena automáticamente al modal de póliza precargado con el cliente nuevo.
- Siempre se abren los datos para que Santi los revise antes de guardar (no crea nada sin confirmación). Acelera la carga de pólizas que no vengan en Excel.
- Endpoint: `POST /api/ia/leer-poliza` (recibe los bytes del PDF). Lógica en `src/ia.js` (`leerPolizaPDF`) con structured outputs (json_schema) y match de cliente por documento contra la base.

**Fase D — Asistente "Pregúntale a tu cartera"** ✅ CONSTRUIDA (2026-06-13)
- Vista "Asistente IA" tipo chat. Escribes preguntas en lenguaje natural (ej: "¿cuántas pólizas vencen este mes?", "¿qué clientes no tienen correo?", "¿cuánto suman las comisiones de las pólizas vigentes?") y la IA responde consultando la base.
- Enfoque seguro: la IA usa una herramienta `consultar_base` que SOLO ejecuta SELECT (validador `validarSelect` bloquea INSERT/UPDATE/DELETE/DROP/ALTER/PRAGMA/etc. y el `;` de inyección; agrega LIMIT 200 si falta). Loop agéntico de tool use (máx 6 pasos) con el esquema de la base en el system prompt. Guardia probado con casos de prueba (✓ todos).
- Soporta seguimientos (mantiene los últimos turnos como contexto). Chips con preguntas de ejemplo.
- Endpoint: `POST /api/ia/consultar`. Lógica en `src/ia.js` (`consultarCartera`, `validarSelect`, `ESQUEMA_BASE`). Modelo: el de análisis (Opus por defecto).

## ESTADO: las 4 fases de IA están construidas ✅
Todas funcionan sobre la API de Claude y se activan poniendo la API key en Configuración → Inteligencia Artificial. Pendiente de Santi: conseguir/pegar la API key para usarlas.

## Requisito técnico (importante)
Todas estas funciones se conectan a la API de Claude (Anthropic), lo que requiere:
- Una **API key de Anthropic** (la crea Santi en console.anthropic.com con la cuenta de la agencia).
- Tiene **costo por uso** (centavos de dólar por mensaje/análisis). Redacción de mensajes con Haiku es muy barato;
  análisis de cartera con Opus cuesta un poco más pero se corre pocas veces.
- La key se guarda en Configuración del sistema (local, no se comparte). El sistema sigue funcionando sin IA;
  la IA es un "plus" que se activa al poner la key.

## Pendiente
- Que Santi obtenga la API key de Anthropic para activar las 4 fases ya construidas (Fases A–D).
- Decidir si se aborda alguna de las funciones que Guro tiene y a SM Gestión aún le faltan:
  **gestión de siniestros**, **dashboard de KPIs**, **chatbot de WhatsApp con IA** y, como Fase E opcional, los **agentes de voz**.
  (El **embudo de ventas/pipeline** ya quedó construido — 2026-06-13.)
- Marca nueva: Santi tiene identidad de marca más reciente (no la encontré en el disco) — actualizar logo/colores cuando la pase.

## Recorrido de Guro: COMPLETADO ✅ (2026-06-13)
El recorrido directo del sitio público ya no está bloqueado y se hizo. Conclusión: las 3 funciones de IA que Guro cobra en
su plan "más popular" ya las tenemos. Lo que claramente nos falta frente a Guro son módulos de gestión (pipeline de ventas,
siniestros, dashboard) y los agentes de voz (add-on premium, Fase E futura).
