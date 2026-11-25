# Alcance definitivo · constancia PDF participativa

Se utiliza **solo la migración 001 definitiva**. Se retiraron las migraciones 002 de revisión y validación de instrumentos, así como el generador de catálogo. No hay aprobaciones humanas ni cambios en las evaluaciones, sus reglas, resultados, permisos o políticas.

La comprobación de finalización usa los registros existentes: DNA inicial/final y un intento con `passed = true` en A, B, C y D. En B, ese campo significa autoevaluación completada, incluso con 25 %. Se mantiene la normalización que prioriza `answers.attemptType` sobre el predeterminado de columna `initial`, sin inventar finales por posición. `progress` no basta por sí solo para emitir.

**Limitación explícita:** esta versión no recalifica respuestas ni acredita que la finalización sea auténtica. Si las políticas actuales permiten al participante escribir resultados arbitrarios en sus propias filas, puede falsificar esa finalización. No se conocen ni se han inspeccionado los permisos desplegados. El archivo `audit/rls_read_only.sql` puede utilizarse opcionalmente para leer sus metadatos. No se afirma protección contra manipulación ni examen supervisado.

La seguridad de las constancias conserva JWT, propiedad de solicitud, código único de servidor, campos obligatorios y RLS de propietario. Solo el servidor puede guardar el PDF, cambiar el estado o registrar la entrega. El PDF y el payload del proveedor no son seleccionables directamente por participantes. La descarga autenticada devuelve únicamente el PDF de la solicitud del usuario actual. Se bloquean los perfiles demo y se recuerdan automáticamente sus UUID aunque se renombren.

El PDF se genera con pdf-lib en servidor, se conserva una vez y se reutiliza byte por byte para el adjunto y la descarga. Las escrituras concurrentes seleccionan un solo archivo. Resend recibe un mensaje con datos escapados y el adjunto PDF en Base64. No se publican URLs con cédula o correo ni se registran esos datos en logs de aplicación. El archivo contiene los datos personales requeridos y se procesa por Resend para la entrega solicitada.

Se mantienen restricción única de solicitud, bloqueo de formulario, reserva de entrega e idempotencia. No hay aprobación posterior; una incidencia de entrega incierta vencida es un problema técnico, no una revisión del participante. El PDF no tiene firma digital ni aval oficial; incluye espacio de responsable pendiente de definir.

Demo genera un PDF marcado localmente sin tabla de solicitudes, función de servidor ni correo. El mismo generador y versión de pdf-lib se utilizan para el diseño de muestra.

No se ejecutó SQL ni se desplegaron funciones en Supabase real. Se probaron la migración en PostgreSQL efímero, un PDF real con datos y acentos españoles, el adjunto y la descarga idénticos con Resend simulado y el modal en navegador. La recepción real en Gmail requiere la configuración descrita en [README.md](README.md).
