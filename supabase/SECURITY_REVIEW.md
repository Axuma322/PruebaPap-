# Revisión local de seguridad y compatibilidad · 24 de noviembre de 2026

**Conclusión: no activar la emisión basándose únicamente en `passed` o en `progress`.** El frontend actual escribe respuestas, puntuaciones y `passed` directamente en Supabase. El repositorio no contiene el esquema, las políticas ni los permisos de las tablas de aprendizaje que están desplegadas. No se ha accedido ni se ha modificado Supabase real durante esta revisión.

## Hallazgos y correcciones

| Comprobación | Resultado |
|---|---|
| Diagnósticos antiguos | `coalesce(attempt_type, answers->>'attemptType', ...)` daba prioridad al predeterminado `initial` y ocultaba finales explícitos del payload. También ocurría en `app.js`. Se prioriza un tipo válido del payload y luego un tipo válido de columna. No se inventa un final por el número o el orden de filas. |
| Autoridad de finalización | Crítico: una política de propietario (`auth.uid() = user_id`) por sí sola no impide que el propietario escriba `passed = true` ni fabrique respuestas. No consta que existan triggers de validación en producción. Es un riesgo confirmado en la arquitectura del cliente y pendiente de comprobar en los permisos reales. |
| Regex de email | La versión anterior con un solo `\.` era correcta con `standard_conforming_strings = on`. Se usa `[.]` para representar el punto sin depender del escape de cadenas SQL. No es una validación RFC completa ni acredita propiedad del correo. |
| Inyección HTML | La plantilla compartida escapa `&`, `<`, `>`, comillas dobles y simples en todos los valores variables de texto. Se ampliaron las pruebas con cargas maliciosas en nombre, cédula, código y configuración. |
| Formato del envío | Se envía HTML dentro del correo. No hay PDF adjunto; el navegador ofrece impresión/guardado en PDF. |
| Datos personales | No se incorporan cédula ni correo en URLs ni logs de aplicación. El frontend pide columnas explícitas de la solicitud; no lee `email_payload`, snapshots o notas de revisión. La RPC pública devuelve solo un booleano del usuario actual. Las respuestas de la Edge Function no contienen datos personales. |
| Demo | El cliente no guarda solicitudes demo. El trigger rechaza el perfil demo y la emisión comprueba de nuevo el perfil actual y el registro de UUID demo. Los perfiles demo existentes se registran en la 002 y siguen bloqueados aunque se renombren. Las cuentas demo nuevas deben registrarse también por administración antes de usarlas. |

## Solución incremental que conserva las evaluaciones

La migración **`202611240002_certificate_security_review.sql`** añade una revisión institucional independiente, con acceso exclusivamente de servidor/administración. No modifica ni elimina filas, políticas o permisos de `quiz_attempts`, `diagnostic_answers`, `progress` o `profiles`, ni altera el cálculo de las evaluaciones.

1. El participante conserva el recorrido actual y puede registrar una **solicitud pendiente** si existen sus requisitos guardados.
2. Un responsable verifica la finalización por medios independientes de las banderas que puede enviar el navegador. Debe documentar la evidencia utilizada. **Leer `passed = true` o comprobar únicamente que hay 30/20 respuestas no constituye esa verificación.**
3. Solo el servidor/administración puede registrar la revisión. Se guarda una huella SHA-256 de la evidencia exacta, la identidad declarada del revisor y sus notas. No se inventa un rol administrativo en el navegador.
4. Hasta que exista una revisión vigente, la app oculta impresión/envío y la Edge Function rechaza emitir. También rechaza emitir si falta la nueva RPC, hay un error de comprobación o cambian los datos revisados.
5. Las revisiones son registros nuevos: una denegación posterior revoca la aprobación sin borrar el historial. Cambiar, añadir o eliminar diagnósticos/intentos o cambiar el usuario del perfil invalida la huella previa. Se necesita revisar nuevamente.

**Límite explícito:** este control protege la emisión, pero no corrige por sí mismo posibles escrituras falsificadas en las tablas de aprendizaje. Tampoco demuestra que un auto-reporte sea veraz. La confianza recae en la revisión independiente y sus operadores, no en los datos enviados por el participante. No hay emisión automática sin esa revisión en esta versión.

Para recuperar una emisión completamente automática y verificable hace falta una siguiente fase: enviar respuestas a una RPC/Edge Function que valide el instrumento y su completitud, calcule puntuaciones con un catálogo de servidor, registre los intentos y el progreso en una transacción y solo entonces registre evidencia confiable. Después de adaptar el frontend, revocar INSERT/UPDATE directos de participantes en las tablas de resultados y auditar las demás RPC. Revocar esos permisos ahora rompería las evaluaciones existentes; por eso no se propone aplicar esa revocación aislada.

Los registros históricos no pueden convertirse automáticamente en evidencia confiable solo mediante SQL. Deben revisarse sin modificar los datos originales. Filas con dos `initial` y sin un final explícito siguen siendo ambiguas; no se promocionan silenciosamente a final.

## Políticas reales pendientes de auditar

El archivo [audit/rls_read_only.sql](audit/rls_read_only.sql) contiene exclusivamente lecturas de metadatos dentro de una transacción de solo lectura. No lee datos personales ni respuestas. Devuelve RLS, políticas, permisos efectivos de tabla/columna, defaults, triggers y RPC privilegiadas accesibles.

Antes de activar, revisar su resultado en el proyecto real, especialmente:

- Escritura de `passed`, `score`, `answers`, `attempt_type`, `created_at` y progreso por `authenticated`.
- Políticas permisivas adicionales, roles heredados y rutinas `SECURITY DEFINER` que permitan escribir resultados o revisiones.
- Privacidad de `diagnostic_answers.answers`: algunos payloads incluyen nombres e institución. Su lectura debe estar limitada al propietario y operadores autorizados.
- Capacidad de cambiar `profiles.username` y el perfil demo. La revisión institucional debe identificar cuentas demo por su UUID real y no aprobarlas; el nombre es el marcador de demo de la aplicación existente.
- Defaults o triggers de `attempt_type` e índices de unicidad que puedan afectar los registros antiguos. Esta revisión local no los conoce ni los cambia.

No se puede afirmar que los permisos actuales sean seguros hasta revisar ese inventario y las funciones relevantes. RLS propia y los permisos de los nuevos objetos sí se prueban en PostgreSQL local con roles simulados.

## Emisión y privacidad

Las solicitudes usan un código aleatorio, no una URL pública. Se permite leer solo las columnas necesarias de la solicitud propia. La función verifica JWT, propietario, perfil y revisión vigente antes de realizar la llamada a Resend. Se mantienen la reserva de envío y la idempotencia. No se imprimen tokens, email, cédula ni cuerpos de proveedores en logs.

La vista HTML/PDF del navegador es una representación para el participante, no un documento firmado digitalmente: quien controla su navegador puede editar el DOM. La garantía del servidor se aplica a la autorización y al envío; no existe verificación pública ni firma criptográfica del PDF. Un certificado ya descargado o un correo ya aceptado no puede retirarse por una revocación posterior.

Resend recibe el correo y el HTML que contiene nombre/cédula, por ser necesarios para el envío solicitado. No se añaden esos datos a enlaces de seguimiento desde la app. Revisar la configuración de tracking del proveedor, retención y acceso administrativo antes de producción.

## Cambios de despliegue necesarios

Pruebas disponibles: ocho pruebas automatizadas de frontend/política, plantilla HTML, PostgreSQL local y handler de correo con servicios simulados; además, recorrido de navegador con backend simulado y regresión de B/D. PGlite rechaza `standard_conforming_strings = off`; se verificaron casos válidos/inválidos con `on`, y la expresión `[.]` nueva no contiene escapes de cadena SQL. No se comprobó entrega real de correo ni se inspeccionaron las políticas desplegadas.

- Instalación nueva: revisar y aplicar **001 y 002** en ese orden antes de desplegar la función revisada y el frontend.
- Si se aplicó una revisión anterior de 001: **no volver a ejecutarla**. La 002 incluye `CREATE OR REPLACE` de la normalización y del trigger y actualiza la restricción de email. No reescribe datos. Si un dato previo no cumple el constraint, la migración falla y revierte su transacción: investigar sin borrar registros.
- No habilitar una función antigua que solo consulte `passed`. Desplegar la versión revisada y coordinar la publicación del frontend.
- Configurar revisión institucional y secretos de Resend según [README.md](README.md). No aprobar automáticamente a todos los usuarios históricos.
