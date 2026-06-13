---
description: Cierra la sesión añadiendo un resumen al diario del proyecto (ESTADO-DEL-PROYECTO.md)
argument-hint: "[notas o foco opcional]"
---

Estás cerrando una sesión de trabajo. Tu tarea es registrar lo que se logró en el **diario del proyecto** para que la próxima sesión (posiblemente en otra máquina) sepa exactamente dónde quedó todo.

Pasos:

1. **Repasa esta sesión completa** y resume SOLO lo que realmente se hizo: cambios de código, decisiones tomadas, problemas resueltos y lo que quedó pendiente. Sé concreto y factual, sin relleno. Si algo no quedó claro si se completó, dilo explícitamente. No inventes logros que no ocurrieron.

2. Lee `ESTADO-DEL-PROYECTO.md` para respetar su formato y ubicar el punto de inserción: las sesiones van como secciones `## Sesión <fecha>: ...`, con la más reciente arriba, justo después de la línea `**Última actualización:**`.

3. Inserta una **nueva sección al inicio** del log de sesiones con este formato:
   - Encabezado: `## Sesión <FECHA DE HOY, formato YYYY-MM-DD> (<momento: mañana/tarde/noche, si aplica>): <título corto>`
   - Viñetas concisas: usa `✅` para lo terminado y marca claramente lo que queda **PENDIENTE**.
   - Convierte fechas relativas ("hoy", "mañana") a absolutas.
   - Cita archivos, rutas y números de PR/commit relevantes cuando aplique.

4. Actualiza la línea `**Última actualización:**` (cerca del inicio del archivo) con la fecha de hoy y un descriptor corto de la sesión.

5. Si el usuario pasó notas o un foco en el comando, intégralas en el resumen: $ARGUMENTS

6. Muéstrame la entrada que escribiste. Luego, siguiendo el flujo git del repo (**ramas + PR, sin push directo a `main`**), **ofréceme** crear el commit/PR con la actualización del diario. **Espera mi confirmación antes de hacer push.**

Mantén la entrada breve y en el mismo tono y estilo que las entradas existentes del archivo.
