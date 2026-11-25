# Seguridad de las constancias participativas · 25 de noviembre de 2026

La emisión de PLANNE es automática. No existe aprobación institucional, tabla de revisores ni autorización humana posterior. Las migraciones anteriores no se han aplicado y la 002 de revisión fue sustituida por `202611240002_certificate_automatic_completion.sql`.

## Verificaciones automáticas

La solicitud se vincula al usuario autenticado. PostgreSQL comprueba dos diagnósticos completos y distintos por tipo y las etapas A–D. Utiliza un catálogo de servidor generado desde los instrumentos de `data.js`, no las banderas del navegador. Exige todos los IDs, sin repetidos ni opciones/frecuencias inválidas. Recalcula A/C/D con umbral 70 %; B Likert se completa con las 20 respuestas, sin umbral. Se conserva B de diez preguntas para registros anteriores a instalar el catálogo, con su umbral original.

Los triggers nuevos validan futuras inserciones/modificaciones de respuestas del participante y recalculan puntuación/finalización. No reescriben registros existentes. Las fechas de esas escrituras se fijan en servidor para que un cliente no fabrique nuevas evaluaciones del formato B histórico. Las escrituras administrativas siguen siendo responsabilidad del backend confiable.

La emisión vuelve a validar las respuestas históricas; un `passed = true` con respuestas vacías, puntuación inventada o instrumento incompleto no basta. El campo `progress` se mantiene para navegación y no es autoridad de emisión. Los límites de propietario añadidos son restrictivos y no sustituyen las políticas actuales. La migración exige RLS activado previamente; la auditoría de los permisos reales sigue pendiente.

## Límites que no deben ocultarse

- Las respuestas válidas pueden automatizarse. El catálogo de preguntas ya es público en el frontend. No se prueba que la persona haya leído materiales o respondido honestamente una autoevaluación.
- El sistema registra participación/finalización, no evaluación supervisada, identidad civil acreditada ni una titulación oficial.
- No se conocen los permisos, roles ni RPC desplegados: revisar `audit/rls_read_only.sql` antes de instalar. Especial atención a RPC privilegiadas o roles que permitan modificar el catálogo, suplantar usuarios o escribir con privilegios elevados.
- Un historial incompleto o de un instrumento no representado en el catálogo no se considera completo automáticamente. No se borra ni se modifica para hacerlo pasar. Hace falta una adaptación técnica compatible si aparece ese caso.
- Las escrituras de `progress` siguen el diseño de la app; manipular solo ese estado puede alterar una vista local, pero no la decisión de emisión del servidor.

## Privacidad y entrega

La plantilla escapa todos los textos dinámicos. La regex de correo usa `[.]` sin escapes de cadena SQL. Cédulas y correos no se incluyen en URLs ni en logs de aplicación. Las solicitudes solo son legibles por su propietario y con columnas limitadas; no se publica el payload del proveedor. La Edge Function valida JWT, propietario y requisitos automáticos antes de enviar.

Demo no inserta solicitudes ni envía correos. En servidor se rechaza el perfil demo actual y los UUID demo registrados, incluso si se renombra su perfil. Un trigger registra automáticamente las identidades demo nuevas en `profiles`.

Se envía HTML dentro del correo. El navegador permite guardar PDF, sin firma digital ni verificación pública. El código es único en servidor, pero no es una acreditación oficial. La reserva de envío y la idempotencia evitan duplicados; una entrega incierta que exceda el plazo del proveedor requiere resolución técnica para no reenviar a ciegas, nunca aprobación del participante.

No se modificó Supabase real ni se desplegaron funciones. Consultar [README.md](README.md) para instalación y pruebas.
