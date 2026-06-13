# Portal AXA Colpatria — Sucursal en Línea

**URL:** https://sucursalenlinea.axacolpatria.co/
**Última actualización:** 2026-06-11 (primera sesión guiada, en progreso)

## Acceso

1. Abrir https://sucursalenlinea.axacolpatria.co/ → clic en **INICIAR SESIÓN**.
2. Redirige a `autenticacion.axacolpatria.co` (Auth0). **El login lo hace Santi siempre**: la extensión Claude bloquea por diseño las páginas de autenticación (probado el 2026-06-11 — no es configurable). Las credenciales están guardadas en el Chrome del Mac, así que a Santi le toma segundos: Chrome autocompleta y él da clic en entrar.
3. Tras el login vuelve a la Sucursal en Línea (`/group/site-sucursal-en-linea/home`).

## Ruta al cotizador de autos

Menú superior: **Herramientas → Gestor de Ventas → Autos**
URL directa (con sesión activa): https://sucursalenlinea.axacolpatria.co/group/site-sucursal-en-linea/herramientas/gestor-de-ventas/autos

> Nota: en Herramientas también hay "Cotizadores" pero solo trae Vida y PYME; el de autos está bajo Gestor de Ventas.

## Formulario inicial ("Cotizador de Autos")

**Sección 1 — Datos personales (del tomador/conductor):**
- Documento * (tipo: selector + número)
- Género (botones Masculino / Femenino)
- Fecha de nacimiento (formato AAAA/MM/DD; por defecto trae una fecha que hay que cambiar)

**Sección 2 — Información del vehículo:**
- ¿El vehículo es cero kilómetros o está en un concesionario autorizado por AXA Colpatria? (Sí/No)
- ¿Tienes el código Fasecolda? (Sí/No) — con "No", basta ingresar la **Placa**: el portal trae automáticamente marca, línea, modelo y precio (verificado con placa KTT097 → Chevrolet Onix 2023, $61.100.000)
- **Color del vehículo*** — obligatorio, pero NO afecta el resultado: si no se conoce, poner cualquiera
- **Servicio**: Particular o Público (lo que diferencia los pesados) — normalmente Particular
- **Departamento de circulación**: por defecto SIEMPRE **Antioquia**, salvo que Santi indique otro
- Botón **CONTINUAR** → pasos siguientes por documentar

**Reglas de Santi para este portal:**
- Datos obligatorios del tomador: documento, fecha de nacimiento, género.
- Color: cualquiera si no se conoce. Departamento: Antioquia por defecto.

## Pantalla 2 — "Productos disponibles" (tras CONTINUAR)

- Muestra resumen del vehículo (marca/línea/modelo, placa, No. motor, No. chasis — los trae el portal) y los planes con su prima anual. En la prueba (Onix 2023, $61.1M, Antioquia): Ninguna $6.497.311, Esencial $6.692.562, VIP $6.773.650, Plus $7.001.830.
- Aviso frecuente: "El vehículo requiere inspección para emitir la póliza" (aplica a emisión, no a cotización).
- Se selecciona un plan (checkbox) y abajo hay botones **CONTINUAR** y **GUARDAR COTIZACIÓN**.

## Flujo estándar de Santi para obtener el PDF

1. Seleccionar siempre el **plan PLUS** (el mejor de la compañía; es el que se presenta en el informe al cliente).
2. Clic en **GUARDAR COTIZACIÓN**.
3. Luego **Enviar por email** la cotización. El formulario pide:
   - Nombre y apellido del cliente: por defecto los reales, pero no son obligatorios/verificados.
   - Correo: **santiago@smseguros.com.co** (correo de la agencia — la cotización llega ahí).
   - Celular: **3148974193** (el de Santi, solo para la cotización).
4. El PDF de la cotización (con resumen de coberturas) llega al correo de la agencia. **El portal no permite descargar el PDF directamente** — solo vía email.

> Flujo verificado completo el 2026-06-11 (placa KTT097, cotización código 01601344, plan PLUS $7.001.830). Detalle: tras seleccionar plan y CONTINUAR aparece la pantalla de detalle con desglose (valor asegurado, prima, IVA, gastos de expedición) y los botones CANCELAR / **ENVIAR POR CORREO** / CONTINUAR. ENVIAR POR CORREO abre el modal con Nombre, Apellido, Teléfono Celular y Correo; al enviar confirma "La cotización se envió satisfactoriamente a su correo".

## Tiempos / sesión

- OJO: la sesión expira por inactividad relativamente rápido (apareció aviso durante el diligenciamiento). Los datos del formulario se conservaron, pero conviene diligenciar sin pausas largas.

## Notas técnicas

- El formulario parece renderizarse en un iframe/JS: `read_page` no expone los campos; trabajar con capturas de pantalla y clics por coordenadas.
- El dominio de login `autenticacion.axacolpatria.co` está bloqueado para la extensión (permiso denegado) — correcto, no se necesita.
