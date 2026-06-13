# Mapa funcional de SOFTseguros (levantamiento para el sistema propio)

> Levantado el 2026-06-12 recorriendo la cuenta de SM SEGUROS en app.softseguros.com.
> Objetivo: extraer funcionalidades y flujos (NO diseño ni código) para construir el sistema de gestión propio.

## Datos de la cuenta observados

- 128 clientes activos, casi todos categoría AUTOMÓVILES, sede "Principal".
- Resumen del panel de inicio: pólizas en expedición (0), por renovar (34), vencidas (30), clientes activos 89%, cobros por recaudar a 90 días, tareas, cumpleaños próximos, siniestros pendientes.

## Árbol de navegación completo

- **Inicio** (`/home/inicio`) — panel con tabs: Panel, Asistente virtual, Almacenamiento y Recursos, Metas, Módulos/Funciones.
- **Clientes**
  - Listado de Clientes (`/home/clientes`)
  - Gestor de negocios (`/home/crm`) — CRM de oportunidades/negocios
- **Pólizas**
  - Listado de Pólizas (`/home/polizas`)
  - Cumplimiento, Judicial, etc (`/home/polizas-cumplimiento`)
  - Remisiones (`/home/remisiones`)
  - Gestor de Renovaciones (`/home/polizas/renovaciones`)
- **Tareas** (`/home/tareas`)
- **Cobros**
  - Listado de pagos
  - Recibos y Cuadre de caja
  - Liquidar vendedores
- **Informes** (`/home/informes`) — dashboards
- **Archivos** (`/home/archivos`)
- **Siniestros** (`/home/siniestros`)
- **Facturas** (`/home/facturas`)
- **Diligencias** (`/home/diligencias`)
- **Plantillas** (`/home/plantillas`)
- **Configuración Agencia**: Información de agencia, Sedes, Aseguradoras, Ramos, Vendedores, Estados Siniestros, Motivos estados póliza, Tipo afiliación, Mensajeros, Coberturas, WhatsApp.
- **Importar Plantillas** (importación masiva de datos)

## Módulo Clientes

### Listado
- Tabs: **Clientes (128)** | **Contactos (0)**.
- Búsqueda libre (por documento, etc.), panel de **Filtros**, "Limpiar filtros".
- **Gestionar columnas** (columnas configurables) y **Acciones globales** (operaciones masivas sobre seleccionados, con checkbox por fila y "seleccionar todos").
- Columnas: Nombres/Razón social, Apellidos, Sobrenombre (Alias), N. documento/NIT, F. nacimiento/F. constitución, Celular, Email, Estado cliente (Cliente/Prospecto), Usuario creado, Recordatorios, Pólizas/Cobros, Sede, Categorías, Acción.
- Acciones por fila: editar, ver, eliminar, menú "más" (⋮).
- Paginación (13 páginas de ~10).
- Soporta persona natural y jurídica (campos duales: Nombres/Razón social, F. nacimiento/F. constitución, documento/NIT).

### Ficha del cliente (tabs internas)
1. **Datos del cliente**
2. **Archivos** (documentos adjuntos del cliente)
3. **Pólizas** (las pólizas del cliente — mismo listado que el módulo Pólizas filtrado)
4. **Tareas**
5. **Contactos** (personas de contacto asociadas)
6. **Bitácora de Cobro**
7. **Estado de cuenta**
8. **Historial de cambios** (auditoría)
9. **Siniestros**

### Campos de "Datos del cliente"
- **Datos principales:** Nombres*, Apellido*, Sobrenombre (Alias), Tipo documento* (Cédula, …), Número de documento*, Fecha de expedición, Género*, Fecha de nacimiento* (calcula Edad), Autorizar tratamiento de datos (Sí/No — habeas data), Categorías (multiselección, configurable), Observaciones.
- **Datos de contacto:** País, Departamento, Ciudad, Dirección* (tipo: Residencial…), Teléfono* (indicativo país), Celular* (tipo: Personal), Email* (tipo: Personal).
- **Información laboral:** Ocupación (catálogo), Empresa.
- **Información CRM:** Estado civil, Ingreso mensual, Patrimonio, Casa propia (Sí/No + No. Casas), Hijos (Sí/No + No.), Vehículo (Sí/No + No. + Placa), Fecha vencimiento SOAT, Fecha pago de impuestos, Fecha vencimiento tecnomecánica.
- **Notificaciones por correo** (toggles Sí/No por cliente): póliza por vencer, cobros por vencer, SOAT por vencer, tecnomecánica por vencer, póliza vencida, pago vencido, tarjeta de cumpleaños, póliza renovada, aviso de cancelación.
- **Notificaciones por WhatsApp** (mismos toggles, sin cumpleaños ni renovada): póliza por vencer, cobros por vencer, SOAT, tecnomecánica, póliza vencida, pago vencido, aviso de cancelación.
- **Usuario de acceso:** portal del asegurado (app.softseguros.com/portal-asegurado/) — crear usuario/contraseña al cliente, asignar, enviar por WhatsApp.
- **Comentarios:** observaciones con historial de actividad.

## Módulo Pólizas

### Listado (también embebido en la ficha del cliente)
- Filtro por tipo ("Todos"), búsqueda, Filtros avanzados, Gestionar columnas, **Vista Table** (hay otras vistas), Acciones globales, "Ver totales" (totaliza primas/comisiones del listado).
- Columnas: Tipo de póliza, Número de póliza (+ etiqueta "Nueva"), Aseguradora, Ramo, Riesgo (placa), Documento, Vendedor, Estado cobros ("Sin pagos Asignados"), Tiene siniestros, Renovable, Sincronizada, Categorías, **Prima Neta, Prima Total, Tasa de cambio, Prima equivalente (USD/COP), Comisión agencia, Comisión vendedor**, Estado póliza (Vigente…), Fecha inicio, Fecha fin, Fecha creación, Observaciones, Creada por, Acción.
- Acciones por fila: editar, ver, **renovar** (icono ↻), menú ⋮.

### Detalle de póliza (tabs internas)
1. **Póliza** (formulario principal)
2. **Anexos** (modificaciones/endosos de la póliza)
3. **Archivos**
4. **Tareas**
5. **Remisiones** (documento que se envía al cliente)
6. **Bitácora de cobro**
7. **Bitácora póliza**
8. **Historial de cambios**
9. **Rec. Email** (recordatorios enviados)
10. **Rec. WhatsApp**
11. **Siniestros**
12. **Pagos**

### Campos del formulario de póliza
- **Información principal:** Número de póliza*, Estado Póliza (Vigente, …), Es renovable (Sí/No), Aseguradora* (catálogo), Ramo* (catálogo, editable), Fecha de Expedición*, Fecha de Recepción*, Fecha de Inicio*, Fecha de Fin*, Riesgo (placa, dirección, etc.), Valor asegurado, Cliente (vinculado, editable), Categorías.
- **Tomador/Asegurado/Beneficiario:** Nombre y Documento del Tomador, Nombre y Documento del Asegurado, Beneficiarios, ¿Beneficiario en la Remisión?, Beneficiario oneroso (nombre y documento — p. ej. banco con prenda).
- **Observaciones:** internas + observaciones que salen en la remisión al cliente.
- **Prima y comisiones:** Prima neta, Gastos (Expedición, RUNT, Fosyga) con autocalcular, Participación (%, para copartícipes), IVA (autocalcular, % IVA prima — 19%), Porcentaje comisión (editable, ej. 12.5%), Comisión agencia (autocalculada, editable), Total (prima total).
- **Vendedor:** agregar vendedor con % retención, % comisión y comisión calculada.
- **Notificaciones asistente virtual por póliza** (toggles): alerta de próxima renovación, correos y WhatsApp de cobros por vencer / renovada / vencida / pago vencido / cancelación.
- **Información pagos:** Periodicidad del pago, Forma de pago (Contado, …), Medio de pago, Banco.

## Módulo Informes
- **Dashboards del sistema:** Producción (pólizas y anexos), Recaudos (recaudos y pagos), Tareas (seguimiento operativo), Siniestros (gestión operativa).
- **Mis Dashboards:** dashboards personalizados (+ Nuevo Dashboard).

## Gestor de Renovaciones (`/home/polizas/renovaciones`)
- **Campañas** (activas/cerradas): nombre, período, estado, pólizas, total prima. Se crean campañas de renovación agrupando pólizas por vencer.
- **Embudos** (pipelines configurables): el estándar tiene 6 etapas — Pendiente de Contacto → Contactado → En Negociación → Aprobado por Cliente → Renovado / No Renovado.
- *(Sin uso en la cuenta de Santi; él gestiona renovaciones directo desde el listado de pólizas "por renovar".)*

## Módulo Cobros

### Listado de pagos (`/home/pagos`)
- 4 vistas: **Por cobrar | Por Pagar a Aseguradoras | Comisiones Por Cobrar | Comisiones Recibidas**.
- Columnas: # Cuota, Póliza, Cliente, Anexo, Aseguradora, Ramo, Valor neto a pagar, Prima neta, Prima total, Valor a Pagar, Saldo pendiente, Valor Pagado en Oficina, Valor Pagado en Aseguradora, **Días vencidos**, Fecha pago, Compromiso Pago, Vendedor, Comisión vendedor, IVA Vendedor, Retenciones Vendedor, Comisión Agencia a Recibir, IVA Agencia, Retenciones agencia, Observaciones. "Ver totales".
- Modelo: cada póliza genera cuotas según periodicidad; el pago puede recaudarse en oficina o directo en aseguradora.

### Recibos y Cuadre de caja (`/home/recibos`)
- Botón **Recibir Anticipo**. Vistas: Anticipo | Recibos Activos | Recibos Pago Directo | Recibos Anulados | Certificados de cobro. **Exportar Excel**.
- Columnas: # Cuota, # Recibo, Póliza, Anexo, Cliente, Aseguradora, Ramo, Valor Recaudado Oficina, Fecha recaudo, Forma de pago, Usuario quien recaudó, Observación.

### Liquidar vendedores (`/home/liquidar-vendedores`)
- Vistas: Por pagar | Pagados | Anulados.
- Columnas: Póliza, Cliente, Anexo, Aseguradora, Ramo, Fecha comisión recibida, Prima neta del pago, Vendedor, Comisión recibida, Participación vendedor, Comisión vendedor, Retención, IVA comisión, Reteica, IVA vendedor, Total comisión vendedor, IVA Agencia, Comisión total agencia, Número de planilla, Código radicación, No Recibo, Forma de Pago.

## Módulo Tareas (`/home/tareas`)
- Crear Tarea, **Tipos de tarea** (configurables). Vistas por vencimiento: Vencidas | Hoy | Mañana | Próximamente | Sin fecha | Completadas. Exportar.
- Columnas: Nombre, Tarea sobre (cliente/póliza/etc.), Cliente, Asignado a, Asignado por, Tipo tarea, Estado, **Prioridad**, Creación, Vencimiento, Tiempo en proceso, Días transcurridos.

## Módulo Siniestros (`/home/siniestros`)
- Columnas: Número siniestro (interno), Número siniestro compañía, Tipo de siniestro, Cliente, Responsable, Número de póliza/Riesgo, Aseguradora, Ramo, **Valor indemnización**, Fecha del siniestro, % siniestralidad, Descripción, Días transcurridos, Finalizado, Fecha finalización, Estado siniestro (estados configurables en Configuración).

## Remisiones (`/home/remisiones`)
- Documento de cobro/entrega que se imprime o envía al cliente. Vistas: Activas | Anuladas. Exportar Excel.
- Columnas: Número de pago, Número remisión, Usuario genera, Fecha creación, Fecha impresión, Prima Neta, Otros, Valor IVA, Total Prima, Tipo, Número, Observaciones.

## Módulo Facturas (`/home/facturas`)
- Facturación de la agencia a aseguradoras (comisiones). Vistas: Por cobrar | Recibidas | Anuladas | Borradores | Notas Crédito | Notas Débito. Exportar Excel.
- Columnas: N° Factura, Fecha de Expedición, Aseguradora, Concepto, Gravada, No Gravada, IVA, Retención de IVA, Retención de ICA, Retención de Fuente, Otros, Gran Total, Estado, Sede.

## Módulo Diligencias (`/home/diligencias`)
- Encargos de mensajería/trámites: Pendientes | Terminadas. Campos: número, asunto, sede, fecha, completar.

## Módulo Archivos (`/home/archivos`)
- Repositorio central de PDFs (carátulas de pólizas, etc.). Subir archivo, vincular ("anclar") a póliza/cliente; muestra metadatos de la póliza vinculada.

## Módulo Plantillas (`/home/plantillas`)
- Plantillas de comunicación (ej. FELIZ CUMPLEAÑOS, tipo PLANTILLA_BIRTHDAY, marcable "por defecto"). Crear/editar plantillas para los envíos automáticos.

## Gestor de negocios / CRM (`/home/crm`)
- Vistas: **Prospectos | Gestión de negocios | Nuevas oportunidades SOAT**.
- Columnas: Número negocio, Nombre negocio, Cliente, Vendedor, Ramo/Riesgo, Monto, Correo, Celular, **Etapa**, Fecha creación, Días transcurridos, Fecha alerta, Observación.

## Panel de Inicio (`/home/inicio`)
- Tabs: Panel | Asistente virtual | Almacenamiento y Recursos | Metas | Módulos/Funciones.
- **Panel:** resumen de pólizas (Cotizaciones, En Expedición, Por renovar, Vencidas), % clientes activos, cobros por recaudar a 90 días, tareas por vencimiento, cumpleaños próximos 5 días, siniestros pendientes.
- **Asistente virtual:** cuotas de mensajería automática — Llamadas (50 disponibles), Correos (1.951 disponibles), WhatsApp, Opiniones.

## Configuración Agencia (catálogos)

- **Usuarios** (`/home/usuarios`): usuarios con perfil (ej. Gerente), correo, celular; **horarios de acceso** asignables. Cuenta actual: 1 usuario (SANTIAGO, Gerente, santiago@smseguros.com.co).
- **Información de agencia** (`/home/informacion-agencia`): tabs Información de agencia | Campos obligatorios | Parametrización de correos | Renovaciones | Historial de cambios | Configuración de dominio email.
  - Datos básicos: **SM SEGUROS., NIT 1036948123-9, cel 3148974193, Centro Comercial L… (Marinilla), info@smseguros.com.co, contacto SANTIAGO ZULUAGA**. Logo cargado. Régimen, decimales (0/2), tipos de moneda (COP +1). Descargar Certificado.
  - **Administración de datos:** Administrar BACKUP (respaldo a Dropbox vía token, programable por día o "Generar ahora mismo") y botones de borrado masivo (todo/clientes/pólizas/cobros).
- **Sedes:** sucursales (cuenta actual: "Principal").
- **Aseguradoras** (`/home/aseguradoras`): catálogo con NIT, email, dirección, teléfono, **link de pago, código intermediario**. Las 9 de Santi: ALLIANZ, ASEGURADORA SOLIDARIA, AXA COLPATRIA, HDI, SBS, SEGUROS COMERCIALES BOLÍVAR, SEGUROS DEL ESTADO, SURAMERICANA, SEGUROS MUNDIAL.
- **Ramos** (`/home/ramos`): ramo ↔ aseguradoras que lo ofrecen + regla de cálculo de IVA en gastos. Los 6 de Santi: SOAT, Todo riesgo, Transporte, Automóviles, Vida, Salud.
- **Vendedores** (`/home/vendedores`): cédula, % comisión, comisión sobre (agencia/prima), % retención, tipo de persona, es agencia, sede. Actual: solo SM SEGUROS (100%, agencia).
- **Estados Siniestros / Motivos estados póliza / Tipo afiliación / Mensajeros:** catálogos simples configurables.
- **Coberturas** (`/home/coberturas`): catálogo de 34 coberturas (Anegación, Asistencia domiciliaria/en viaje/jurídica, Conductor elegido, etc.) para amparar pólizas.
- **WhatsApp** (`/home/configuracion-whatsapp`): líneas conectadas (SM SEGUROS, 573009018745, tipo Evolution, estado Conectado), plantillas y notificaciones automatizadas.

## Importar Plantillas (importación masiva por Excel)
Plantillas de importación para todas las entidades — útil como referencia del modelo de datos y para la migración:
Aseguradoras, Ramos, Vendedores, **Clientes, Pólizas**, Pólizas de cumplimiento y judicial, Campos adicionales por ramo, Anexos, **Cobros**, Recaudar y comisionar pagos, Vinculados pólizas colectivas, Beneficiarios, Asistente Comercial/CRM, Contactos, Siniestros, Amparos Siniestros, Coberturas, Tareas, Comisión vendedor por ramo, Datos adicionales de clientes.

## Vías de exportación de datos (para la migración al sistema propio)
1. **Exportar Excel** disponible en: Recibos, Remisiones, Facturas, Tareas, Vendedores, Pólizas de cumplimiento (y probablemente en Acciones globales de Clientes y Pólizas).
2. **Backup completo a Dropbox** (Configuración → Administración de datos → Administrar BACKUP, requiere token de Dropbox).
3. Las plantillas de importación de SOFTseguros sirven de espejo del esquema de datos.

## Conclusiones para el sistema propio
- Módulos núcleo a replicar (los que Santi usa): **Clientes, Pólizas (con anexos, primas y comisiones), Renovaciones (lista "por renovar"), Cobros/cuotas, Comisiones, Tareas, Archivos adjuntos, Informes básicos**.
- Funciones transversales clave: filtros + columnas configurables + exportar en cada listado, acciones masivas, historial de cambios (auditoría), totalizadores ("Ver totales").
- Motor de notificaciones (correo/WhatsApp) con toggles por cliente Y por póliza: vencimiento de póliza, cobro, SOAT, tecnomecánica, cumpleaños, renovada, cancelación.
- Modelo de datos central: Cliente (natural/jurídica) → Pólizas → Anexos + Cuotas de pago → Recaudos → Comisiones (agencia/vendedor con IVA y retenciones). Catálogos: aseguradoras, ramos, coberturas, vendedores, sedes.
- Lo que Santi NO usa hoy (candidato a dejar fuera de la v1): campañas/embudos de renovación, CRM de negocios, facturas, diligencias, siniestros (vacíos), portal del asegurado, multi-moneda, multi-sede.
