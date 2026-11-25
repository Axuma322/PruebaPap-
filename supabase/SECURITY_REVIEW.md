# Alcance definitivo · constancia PDF participativa

Una instalación nueva utiliza **solo la migración 001 actualizada**. Si una versión anterior de 001 ya se aplicó, la nueva `202611250002_diagnostic_order.sql` añade únicamente el orden de recorrido, sin aprobación humana. Se retiraron las antiguas migraciones 002 de revisión/catálogo. Se mantienen las puntuaciones, umbrales, datos y políticas existentes.

El recorrido para nuevas participaciones es inicial → A–D → final → constancia. Se bloquea en la interfaz y mediante triggers de orden para escrituras autenticadas: no se registra una etapa sin diagnóstico inicial ni un final sin inicial y las cuatro etapas completadas. No se modifican registros históricos ni se validan retroactivamente sus fechas; las importaciones administrativas se conservan. Estos controles no son una recalificación ni una protección contra respuestas falsificadas.

La comprobación de finalización usa los registros existentes: DNA inicial/final y un intento con `passed = true` en A, B, C y D. En B, ese campo significa autoevaluación completada, incluso con 25 %. Se mantiene la normalización que prioriza `answers.attemptType` sobre el predeterminado de columna `initial`, sin inventar finales por posición. `progress` no basta por sí solo para emitir.

**Limitación explícita:** esta versión no recalifica respuestas ni acredita que la finalización sea auténtica. Si las políticas actuales permiten al participante escribir resultados arbitrarios en sus propias filas, puede falsificar esa finalización. No se conocen ni se han inspeccionado los permisos desplegados. El archivo `audit/rls_read_only.sql` puede utilizarse opcionalmente para leer sus metadatos. No se afirma protección contra manipulación ni examen supervisado.

La seguridad de las constancias conserva JWT, propiedad de solicitud, código único de servidor, campos obligatorios y RLS de propietario. Solo el servidor puede guardar el PDF, cambiar el estado o registrar la entrega. El PDF y el payload del proveedor no son seleccionables directamente por participantes. La descarga autenticada devuelve únicamente el PDF de la solicitud del usuario actual. Se bloquean los perfiles demo y se recuerdan automáticamente sus UUID aunque se renombren.

El PDF se genera con pdf-lib en servidor, se conserva una vez y se reutiliza byte por byte para el adjunto y la descarga. Las escrituras concurrentes seleccionan un solo archivo. Resend recibe un mensaje con datos escapados y el adjunto PDF en Base64. No se publican URLs con cédula o correo ni se registran esos datos en logs de aplicación. El archivo contiene los datos personales requeridos y se procesa por Resend para la entrega solicitada.

Se mantienen restricción única de solicitud, bloqueo de formulario, reserva de entrega e idempotencia. No hay aprobación posterior; una incidencia de entrega incierta vencida es un problema técnico, no una revisión del participante. El PDF no tiene firma digital ni aval oficial; incluye espacio de responsable pendiente de definir.

Demo genera un PDF marcado localmente sin tabla de solicitudes, función de servidor ni correo. El mismo generador y versión de pdf-lib se utilizan para el diseño de muestra.

El responsable confirmó la instalación del SQL en Supabase real; el agente no volvió a ejecutarlo ni alteró participantes. Con autorización se desplegó únicamente `send-certificate`, activa en versión 1. Se comprobó CORS para `https://planne.dev` y rechazo 401 sin sesión. Las pruebas de PDF, adjunto/descarga idénticos y recorrido se realizaron localmente con servicios simulados. La recepción real en Gmail y la publicación de la secuencia actualizada en GitHub Pages siguen pendientes; ver [README.md](README.md).
