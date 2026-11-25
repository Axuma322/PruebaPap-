# Constancias de PLANNE · configuración definitiva

PLANNE emite una constancia participativa de finalización, no una acreditación oficial. La emisión es automática al completar los requisitos y registrar el formulario. **No hay aprobación institucional ni intervención humana por participante.** Estos archivos no se han ejecutado ni desplegado contra Supabase real.

## Flujo del participante

1. Completa DNA inicial y final, A, B, C y D. A/C/D mantienen 70 %; B se completa con sus 20 respuestas Likert, sin nota mínima.
2. Se abre la ventana de felicitaciones. El mensaje y los textos de impresión se editan en `APP_DATA.certificate`, en `data.js`.
3. Introduce nombre, cédula y correo, y registra la solicitud.
4. PostgreSQL valida las respuestas guardadas, calcula la fecha de finalización, genera el código único y guarda una solicitud por usuario.
5. El frontend invoca `send-certificate` automáticamente. La función verifica JWT, propietario y requisitos en el servidor y solicita el envío a Resend.
6. Se muestra la confirmación y se permite consultar/imprimir la constancia. El correo contiene **HTML, sin PDF adjunto**. El navegador permite guardar la vista imprimible como PDF.

Si falla el correo, la solicitud permanece guardada y puede reintentarse. Recargar no vuelve a enviar automáticamente. El botón **Actualizar estado** consulta el estado de entrega.

## Probar el modal antes de ejecutar SQL

Servir el proyecto por HTTP e iniciar sesión con el perfil `demo` existente. No requiere las tablas nuevas de certificados:

1. En el mapa de módulos, buscar **Certificado · demostración**.
2. Pulsar **Simular finalización y probar constancia**. Simula exclusivamente el cierre; no cambia el progreso ni requiere completar evaluaciones.
3. Probar campos vacíos, correo inválido y después datos ficticios válidos.
4. Registrar la simulación y pulsar **Ver certificado / guardar PDF**.
5. Usar **Probar otra vez con datos ficticios** para reiniciar la prueba.
6. Revisar la ventana y la impresión en móvil y escritorio.

No se consulta ni escribe `certificate_requests`, no se invoca la función de correo y no se guardan los datos ficticios en almacenamiento persistente. El perfil demo sí sigue necesitando su sesión de Supabase Auth existente. El botón de simulación y el de reinicio de prueba no aparecen para participantes reales.

## SQL definitivo: ejecutar manualmente en orden

Las migraciones anteriores todavía no se aplicaron. El orden de instalación nueva es:

1. [202611240001_certificate_requests.sql](migrations/202611240001_certificate_requests.sql)
2. [202611240002_certificate_automatic_completion.sql](migrations/202611240002_certificate_automatic_completion.sql)

El antiguo archivo `202611240002_certificate_security_review.sql` fue sustituido. No ejecutarlo ni mezclar versiones anteriores. No se crean tablas, RPC ni estados de aprobación humana. No utilizar `db reset`.

Antes de aplicar, ejecutar y revisar [audit/rls_read_only.sql](audit/rls_read_only.sql): solo lee metadatos. Las políticas reales no están versionadas en este repositorio y no se han inspeccionado en producción.

La 002 exige RLS ya activado en `quiz_attempts`, `diagnostic_answers` y `progress`. Si no lo está, revierte su transacción y muestra el prerrequisito pendiente. Revisar los permisos/políticas de propietario del proyecto antes de continuar; no desactivar ese control ni conceder acceso público para evitar un error. Las políticas existentes deben permitir el registro/lectura del propio usuario según los flujos actuales.

No se borran ni reescriben resultados existentes. La 002 añade catálogo de instrumentos, validadores automáticos para escrituras futuras y límites de propietario; no elimina políticas existentes. Revisar conflictos con triggers ya desplegados. Si una migración falla, investigar el error antes de continuar.

## Validación automática y alcance

- El catálogo SQL se deriva de los instrumentos actuales de `data.js`: DNA 30 ítems, A 20 preguntas, B 20 ítems Likert, C 10 preguntas y D 20 ítems Likert.
- El backend exige identificadores completos y únicos, opciones válidas y frecuencias entre 1 y 4; recalcula los resultados. Ignora las banderas `correct`, `score` y `passed` proporcionadas por el navegador para decidir la constancia.
- Los triggers de futuras escrituras del participante recalculan `score`/`passed` en `quiz_attempts` y la puntuación/tipo de `diagnostic_answers`. No cambian la estructura ni el formato de los formularios existentes.
- Para la nueva B, `passed` significa cuestionario completado, incluso con 25 %. La evaluación B anterior de diez preguntas se admite solo para registros previos a instalar el catálogo y con 70 % recalculado. Nuevas escrituras no pueden retroceder su fecha para seleccionar ese formato antiguo.
- La emisión no confía en `progress`; sigue siendo el estado de navegación del frontend. Falsificar solo su lista de etapas no habilita una constancia.
- Se mantiene la corrección de diagnósticos: el tipo válido del payload tiene prioridad sobre el predeterminado `initial`; no se inventa un final por orden de filas.
- Los registros históricos con respuestas ausentes o formatos no representados en el catálogo no se convierten automáticamente en evidencia válida ni se borran. Un problema de formato requiere una corrección técnica/versionado de instrumentos; no una autorización de certificados.
- Estas verificaciones no prueban que una persona haya leído los PDFs o que sus auto-reportes sean sinceros. Las preguntas y opciones son públicas: alguien puede automatizar respuestas válidas. Es una constancia participativa, sin promesa de examen supervisado o protección total contra manipulación.

Ver [SECURITY_REVIEW.md](SECURITY_REVIEW.md) para el alcance técnico y sus límites.

## Mantener sincronizado el catálogo

Antes de ejecutar las migraciones:

```sh
node scripts/certificate-catalog.cjs --check
```

Si cambia el instrumento antes del primer despliegue, regenerar con `node scripts/certificate-catalog.cjs`. Después de desplegar, conservar el historial y preparar una migración de catálogo versionada; no reejecutar ni editar una migración aplicada. Mantener versiones históricas compatibles cuando cambien IDs o preguntas.

## Objetos y privacidad

`certificate_requests` guarda `user_id`, username de servidor, nombre, cédula, correo, fecha de finalización, código aleatorio único, estado, snapshot de requisitos y fechas de creación/actualización. Los campos `certificate_sent_at`, `email_delivery_id`, `email_first_attempt_at` y `email_payload` controlan la entrega y los reintentos.

RLS limita la lectura al propietario y solo a columnas necesarias. El participante solo puede insertar `user_id`, `full_name`, `national_id` y `email`; no puede cambiar código, fecha, estado o recibos de correo ni leer payloads de Resend. No hay acceso anónimo. La función solo responde con estados/errores, no con datos personales.

`certificate_instruments` es de escritura administrativa y no acepta cambios del navegador. `certificate_demo_accounts` conserva los UUID de los perfiles demo conocidos aunque se renombren. Un trigger en `profiles` registra automáticamente las cuentas nuevas o renombradas a `demo`; el nombre actual también se comprueba. No hace falta registrar ni autorizar participantes manualmente.

No se añaden URLs públicas con nombre, cédula o correo. El PDF local no es firmado digitalmente y el código no constituye una acreditación externa. Resend recibe el destinatario y el HTML que incluye el nombre/cédula para el envío solicitado. Configurar privacidad, retención y tracking según las necesidades del proyecto.

## Configurar Resend y la Edge Function

Crear/verificar un dominio remitente en Resend y configurar en **Supabase → Edge Functions → Secrets**, nunca en Git ni en el navegador:

| Secreto | Valor |
|---|---|
| `RESEND_API_KEY` | Clave privada de envío de Resend |
| `CERTIFICATE_FROM` | Remitente verificado: `PLANNE <certificados@su-dominio>` |
| `ALLOWED_ORIGINS` | Orígenes exactos separados por comas, sin `/` final: dominio real de Pages y entornos locales necesarios |
| `CERTIFICATE_INSTITUTION` | Opcional: encabezado del correo/constancia |
| `CERTIFICATE_TEXT` | Opcional: texto formativo personalizado |
| `CERTIFICATE_SIGNATURE` | Opcional: identificación del programa |

`SUPABASE_URL` y `SUPABASE_SERVICE_ROLE_KEY` se utilizan exclusivamente en el entorno servidor de Supabase. No copiar la clave privada a `supabaseClient.js`. Los textos del correo se configuran con los secretos opcionales y la impresión con `data.js`; mantenerlos alineados. La plantilla visual compartida está en `functions/_shared/certificate-template.js`.

Desde la raíz del repositorio, con la CLI autenticada, **cuando se decida desplegar**:

```sh
supabase functions deploy send-certificate --project-ref SU_PROJECT_REF
```

`config.toml` desactiva el verificador heredado del gateway; el handler valida explícitamente el token del usuario mediante `auth.getUser(token)` y comprueba propietario y requisitos. No retirar esa autenticación. La instalación necesita aplicar ambas migraciones y publicar el frontend junto con la función compatible. Este trabajo no ejecuta esos comandos.

## Duplicados y reintentos

La restricción única por `user_id` y el bloqueo de formulario evitan solicitudes repetidas. La función reserva la entrega con una actualización condicional; llamadas concurrentes ven `sending`. Para Resend se reutilizan el mismo payload y la misma clave de idempotencia.

Resend conserva esas claves durante 24 horas. Se admiten reintentos durante 23 horas desde el primer intento. Después de un envío incierto vencido, se requiere resolver técnicamente el estado de entrega antes de repetirlo, para evitar duplicados; **no se requiere aprobación de la constancia**. Consultar los recibos del proveedor. No hay un cron de reintentos; el participante puede reintentar desde la app.

`sent` significa aceptación por Resend, no entrega o apertura confirmada. Para registrar rebotes/entrega real haría falta un webhook del proveedor. No se envía un adjunto PDF.

Referencias: [autenticación de Edge Functions](https://supabase.com/docs/guides/functions/auth-legacy-jwt), [RLS](https://supabase.com/docs/guides/database/postgres/row-level-security) e [idempotencia de Resend](https://resend.com/docs/dashboard/emails/idempotency-keys).

## Pruebas locales

```sh
node --test tests/certificate.test.cjs
node --check certificate.js
node --check app.js
node scripts/certificate-catalog.cjs --check
```

Las pruebas de integración usan dependencias solo de desarrollo en un directorio temporal, sin añadir paquetes al frontend:

```powershell
$planneTestDir = Join-Path $env:TEMP 'planne-security-tests'
npm install --prefix $planneTestDir @electric-sql/pglite typescript@5.8.3 --no-audit --no-fund
$env:NODE_PATH = Join-Path $planneTestDir 'node_modules'
node --test tests/certificate-security.integration.cjs
```

Se crean bases efímeras y servicios simulados. Después de configurar producción, comprobar con una cuenta de prueba el recorrido completo, el correo real, la recuperación tras recargar y los permisos entre usuarios. No se ha realizado esa prueba contra Supabase real.

La prueba de navegador `node tests/certificate-browser.cjs` necesita `playwright-core` en el mismo directorio temporal y un navegador instalado. Por defecto utiliza Edge en Windows; `PLANNE_BROWSER` puede indicar otra ruta de Chromium. Inicia un servidor de prueba en loopback, usa Supabase simulado y guarda capturas/PDF de ejemplo en la carpeta temporal `planne-certificate-browser`.
