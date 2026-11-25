# Certificados de PLANNE · configuración del backend

El frontend está preparado para solicitar el certificado, consultar su estado y abrir una vista HTML imprimible. Esta carpeta añade la migración y una Edge Function implementada para enviar el certificado HTML por Resend. **Estos archivos no se han ejecutado ni desplegado contra el proyecto real.**

## 1. Revisar y ejecutar la migración

Revisar [202611240001_certificate_requests.sql](migrations/202611240001_certificate_requests.sql) y ejecutarla una sola vez en SQL Editor del proyecto Supabase existente, o incorporarla al historial de migraciones de ese proyecto. No ejecutar `db reset` ni aplicar a ciegas un historial de migraciones que no represente las tablas existentes.

Prerequisitos: las tablas actuales `profiles`, `diagnostic_answers` y `quiz_attempts`, con las columnas que consume `app.js`. El SQL crea exclusivamente `certificate_requests`, dos funciones trigger y sus políticas. No cambia datos ni políticas de las tablas actuales.

La tabla conserva:

| Campo | Fuente / uso |
|---|---|
| `user_id` | Usuario autenticado; restricción única para evitar solicitudes duplicadas |
| `username` | Perfil existente, calculado en servidor |
| `full_name`, `national_id`, `email` | Formulario del participante |
| `completion_date` | Fecha más reciente entre las primeras finalizaciones válidas de los requisitos |
| `certificate_code` | UUID aleatorio con prefijo `PLANNE-`, generado por PostgreSQL y único |
| `status` | `pending`, `sending`, `sent` o `failed` |
| `completion_snapshot` | Fechas de DNA inicial/final y de finalización de las cuatro etapas |
| `created_at`, `updated_at` | Fechas de creación y modificación gestionadas por el servidor |
| `certificate_sent_at`, `email_delivery_id` | Confirmación de aceptación por el proveedor |
| `email_first_attempt_at`, `email_payload` | Control de reintentos e idempotencia del envío |

RLS permite leer solo la solicitud propia y registrar únicamente `user_id`, `full_name`, `national_id` y `email`. El navegador no puede actualizar estado, código, fechas ni datos de entrega. No hay acceso anónimo ni política de borrado o actualización para participantes.

El trigger valida la identidad y rechaza el perfil `demo`. Exige evidencia guardada de DNA inicial y final y un intento `passed = true` para cada etapa A–D. En B, ese valor significa autoevaluación completada para el instrumento nuevo; se respeta la aprobación de la evaluación anterior. No acepta una lista de etapas enviada por el navegador como prueba de finalización.

La detección en pantalla reutiliza el progreso actual de PLANNE y los intentos DNA normalizados. Para filas antiguas sin tipo, el SQL aplica el mismo criterio cronológico que `normalizeDiagnosticAttempt`: primer registro inicial y siguientes finales. Si existieran datos antiguos incompletos o progreso sin sus intentos correspondientes, revisar esos registros antes de emitir un certificado. No se migran ni se reconstruyen resultados automáticamente.

## 2. Configurar Resend y secretos

Crear una cuenta en Resend, verificar el dominio remitente y generar una API key con permisos de envío. Configurar en **Supabase → Edge Functions → Secrets**, sin guardarlos en Git ni en archivos públicos:

| Secreto | Valor |
|---|---|
| `RESEND_API_KEY` | Clave privada de Resend |
| `CERTIFICATE_FROM` | Remitente verificado, por ejemplo `PLANNE <certificados@su-dominio>` |
| `ALLOWED_ORIGINS` | Orígenes exactos separados por comas, sin `/` final: dominio real de Pages y los entornos locales que se necesiten |
| `CERTIFICATE_INSTITUTION` | Opcional: nombre institucional del certificado enviado |
| `CERTIFICATE_TEXT` | Opcional: texto institucional del certificado enviado |
| `CERTIFICATE_SIGNATURE` | Opcional: cargo o coordinación responsable |

La función utiliza las variables del entorno Supabase `SUPABASE_URL` y `SUPABASE_SERVICE_ROLE_KEY`, exclusivamente en el servidor. No copiar esta última a `supabaseClient.js`. El repositorio y el frontend no contienen claves privadas.

El mensaje de felicitación y los textos de la impresión local se editan en `APP_DATA.certificate`, en `data.js`. La plantilla visual compartida está en `functions/_shared/certificate-template.js`. Mantener los textos institucionales del frontend y los secretos del backend alineados si se personalizan.

## 3. Desplegar la Edge Function

Desde una terminal con la CLI de Supabase instalada y autenticada, en la raíz del repositorio:

```sh
supabase functions deploy send-certificate --project-ref SU_PROJECT_REF
```

`supabase/config.toml` desactiva la comprobación JWT heredada del gateway para esta función. **El handler valida explícitamente el Bearer token con `auth.getUser(token)`** antes de consultar una solicitud y exige que pertenezca al usuario autenticado. No retirar esa validación. Referencias: [autenticación de Edge Functions](https://supabase.com/docs/guides/functions/auth-legacy-jwt) y [configuración de funciones](https://supabase.com/docs/guides/functions/function-configuration).

La llamada automática se realiza después de guardar el formulario. En caso de fallo, la solicitud se conserva y el participante puede reintentar el envío desde su estado de certificado. No hay un cron ni una cola de reintentos en segundo plano; no se promete un envío posterior automático si el primer intento falla.

## 4. Entrega, reintentos y alcance del certificado

- Se envía el **certificado en HTML dentro del correo**. No se genera un PDF adjunto en el backend. En la app se ofrece una vista imprimible que permite guardar PDF desde el navegador.
- `status = sent` significa que Resend aceptó el envío, no que el destinatario lo recibió o abrió. Para confirmar entregas y rebotes haría falta añadir un webhook del proveedor.
- Las llamadas concurrentes reservan la solicitud por `updated_at`; una reserva reciente tiene dos minutos para terminar. Cada solicitud utiliza siempre el mismo payload y clave de idempotencia del proveedor.
- Resend conserva esas claves durante 24 horas. La función permite reintentos durante 23 horas desde el primer intento y luego exige revisión administrativa, para evitar repetir un correo cuyo envío hubiera quedado incierto. Véase [idempotencia en Resend](https://resend.com/docs/dashboard/emails/idempotency-keys).
- Ante un estado incierto o vencido, consultar los registros de Resend y `email_delivery_id` antes de intervenir. Si se confirma la entrega, un administrador puede registrar `sent` y la fecha correspondiente. No reiniciar el control de idempotencia ni borrar la solicitud sin comprobar el envío.
- No se añade enlace público de consulta ni URL pública con cédulas. El código identifica la solicitud; no es una firma criptográfica ni una acreditación externa.
- Los datos personales solo se conservan en la tabla protegida y, al enviar, se procesan por Resend. Definir institucionalmente acceso administrativo, conservación y procedimiento para corregir datos antes de la puesta en producción.

## 5. Comprobación después de configurar

1. Probar con una cuenta de prueba real: inicial y final DNA y etapas A–D completas.
2. Confirmar apertura automática, validación del formulario y una sola solicitud al hacer doble clic o recargar.
3. Verificar código, fecha y snapshot calculados por servidor.
4. Confirmar que otra cuenta no puede leer ni modificar esa solicitud y que `demo` no puede insertarla.
5. Revisar certificado impreso, recepción del correo y coherencia de textos institucionales.
6. Simular un error del proveedor y comprobar que el reintento conserva la misma solicitud.
7. Comprobar que login, DNA, RFAN, COPEI y modo demo continúan funcionando.

Comprobaciones locales sin dependencias adicionales de la app:

```sh
node --test tests/certificate.test.cjs
node --check certificate.js
node --check app.js
node --check data.js
```
