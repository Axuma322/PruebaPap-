# PLANNE · constancia PDF por correo y descarga

La constancia reconoce la finalización de un recorrido educativo participativo. No es una acreditación oficial y no necesita aprobación institucional ni revisión humana. El responsable confirmó que la migración 001 y los secretos ya están configurados en el proyecto `cbzckqmihqvinrmpoheq`; **no volver a ejecutar la 001 en ese proyecto**. `send-certificate` se desplegó y figura `ACTIVE`, versión 1. Se comprobó preflight 204 para `https://planne.dev` y rechazo 401 del handler sin sesión. La publicación del frontend y la recepción real en Gmail se verifican por separado.

## Único SQL que se debe ejecutar

Solo para una instalación nueva, ejecutar manualmente una vez y en el proyecto correcto:

**[202611240001_certificate_requests.sql](migrations/202611240001_certificate_requests.sql)**

**Para una instalación nueva, solo la 001 actualizada. No ejecutar las antiguas 002 de revisión/catálogo.** Si ya se ejecutó una versión anterior de la 001, no repetirla: aplicar únicamente [202611250002_diagnostic_order.sql](migrations/202611250002_diagnostic_order.sql), que añade el orden de diagnósticos sin borrar datos. Esta nueva 002 no contiene aprobación humana. No usar `db reset` ni `db push` con un historial que no represente la base existente.

Prerequisitos: las tablas actuales `profiles`, `diagnostic_answers` y `quiz_attempts`, con las columnas que consume `app.js`. La migración añade solicitudes, protección de identidad demo y controles de orden: diagnóstico inicial antes de etapas, diagnóstico final después de A–D. No borra resultados ni cambia puntuaciones, umbrales o políticas existentes. Un trigger en `profiles` recuerda automáticamente las cuentas demo incluso si se renombran. Los controles de orden se aplican a nuevas escrituras de participantes; no alteran retroactivamente resultados históricos ni importaciones administrativas.

La solicitud guarda usuario, nombre, cédula, correo, fecha de finalización y código único generado en PostgreSQL. Tiene una restricción única por usuario. La fecha se obtiene de los diagnósticos y etapas completadas, no del formulario. La normalización de DNA conserva el tipo válido del payload por encima del predeterminado `initial`; no inventa un final por orden de filas.

RLS permite al participante insertar solo sus datos obligatorios y leer únicamente los campos necesarios de su solicitud. No puede modificar código/fecha/estado ni leer directamente `certificate_pdf_base64` o `email_payload`. La descarga pasa por la función autenticada y limitada al propietario. No hay bucket público ni enlace con datos personales.

## Flujo definitivo

1. El usuario completa **DNA inicial → A → B → C → D → DNA final**. El segundo diagnóstico se habilita al completar todas las etapas; al terminar D se ofrece un acceso directo. B es una autoevaluación: sus 20 respuestas bastan, sin nota mínima. A/C/D conservan su umbral actual.
2. Se abre automáticamente el modal de felicitaciones. Su mensaje se edita en `APP_DATA.certificate.closingMessage`, en `data.js`.
3. Registra nombre completo, cédula y correo. Supabase comprueba el progreso guardado y crea la solicitud con código único.
4. El frontend llama automáticamente a `send-certificate`. La función valida JWT, propietario, perfil real y finalización guardada.
5. `pdf-lib@1.17.1` genera un PDF real, horizontal A4, con datos personales, fecha, código, texto configurable y espacio de firma pendiente. No se inventan logos, firmas o avales.
6. La función conserva el PDF en una columna privada y envía un mensaje de felicitación mediante Resend, con el adjunto **`Certificado_PLANNE.pdf`**, Base64 y `content_type: application/pdf`.
7. **Descargar PDF** pide a la misma función el archivo guardado. Son exactamente los mismos bytes adjuntados al correo, incluso si después cambia el texto de configuración.

La descarga usa `action: "download"`; el envío usa `action: "send"` o la acción predeterminada. Ambas operaciones son POST autenticadas con `request_id`. Descargar nunca envía otro correo. Puede generarse/descargarse el PDF aunque aún falten las credenciales de Resend, siempre que la función y el SQL ya estén instalados.

El código compartido está en `functions/_shared/certificate-pdf.js`. En servidor se importa pdf-lib desde npm; para demo se carga bajo demanda la copia local de la misma versión en `assets/vendor/`, con su licencia MIT. No se usa conversión HTML, navegador remoto ni servicio externo para generar el PDF.

## Configuración de Resend

Crear una API key con permiso de envío y configurar en **Supabase → Edge Functions → Secrets**:

| Secreto | Valor |
|---|---|
| `RESEND_API_KEY` | Clave privada de Resend |
| `CERTIFICATE_FROM` | Remitente permitido por Resend: `PLANNE <certificados@su-dominio>` |
| `ALLOWED_ORIGINS` | Orígenes exactos separados por comas, sin ruta ni `/` final; por ejemplo `https://planne.dev,http://localhost:8000`, ajustados al sitio real |
| `CERTIFICATE_INSTITUTION` | Opcional: encabezado del PDF |
| `CERTIFICATE_TEXT` | Opcional: texto institucional/formativo del PDF |
| `CERTIFICATE_SIGNATURE` | Opcional: etiqueta bajo el espacio de firma; predeterminado `Firma o responsable · pendiente de definir` |

`SUPABASE_URL` y `SUPABASE_SERVICE_ROLE_KEY` se leen exclusivamente del entorno servidor de Supabase. Nunca copiar la clave privada al frontend. No hace falta dar al navegador una clave de Resend.

Los secretos del texto se aplican al **primer PDF generado**. Un PDF ya guardado no se regenera al cambiar la configuración, para conservar el mismo archivo enviado/descargable. Los datos de la solicitud no se editan desde el frontend después de confirmarlos; revisarlos antes de enviar. El texto de `data.js` se utiliza para la muestra demo y el mensaje del modal; mantenerlo alineado con la configuración del servidor.

Las fuentes estándar utilizadas soportan los acentos españoles. Para nombres/textos de otros alfabetos no soportados por WinAnsi haría falta incorporar una fuente Unicode; actualmente se devuelve error y no se sustituyen silenciosamente caracteres. Los textos configurables deben caber en la página.

## Desplegar cuando se decida activar

Con ambas cuentas preparadas, desde la raíz del repositorio y con la CLI de Supabase instalada:

```sh
supabase login
supabase functions deploy send-certificate --project-ref SU_PROJECT_REF
```

Publicar también el frontend actualizado, incluidos el generador compartido y `assets/vendor/`. No hace falta instalar paquetes ni compilar el frontend.

Conservar `.nojekyll` en la raíz publicada de GitHub Pages. El generador compartido está bajo `_shared`; sin desactivar Jekyll, esa carpeta puede quedar excluida y la simulación demo devuelve un 404 al cargarla.

`config.toml` desactiva el verificador JWT heredado del gateway; el handler verifica explícitamente el Bearer token con `auth.getUser(token)`. No retirar esa validación. El acceso y el despliegue exclusivo de `send-certificate` ya se completaron en el proyecto indicado. No se ejecutó SQL ni se modificaron secretos o participantes durante ese despliegue.

## Primer PDF en Gmail

1. Crear la cuenta de Resend con el Gmail que se usará como destinatario de prueba.
2. Para la primera prueba, usar `CERTIFICATE_FROM = PLANNE <onboarding@resend.dev>` y poner **ese mismo Gmail** en el formulario. El dominio de prueba de Resend solo permite enviar a la dirección asociada a la cuenta; para otros participantes, verificar un dominio propio y cambiar el remitente. [Restricción oficial de Resend](https://resend.com/docs/knowledge-base/403-error-resend-dev-domain).
3. Ejecutar solo la migración 001 definitiva; configurar secretos, desplegar la función y publicar el frontend.
4. Usar una cuenta de PLANNE real de prueba, con DNA inicial/final y A–D completados. **Demo nunca envía correo**.
5. Registrar el formulario con el Gmail permitido. Revisar la bandeja de entrada y spam. Debe llegar un mensaje de felicitación con `Certificado_PLANNE.pdf` adjunto.
6. Descargar desde PLANNE y comprobar que corresponde al mismo archivo. Si falla el envío, consultar el estado/log de entrega de Resend y usar el botón de reintento; no crear otra solicitud.

Gmail es el destinatario; no se usa su contraseña ni se configura Gmail SMTP. Para producción, el remitente debe usar un dominio propio verificado en Resend.

## Demo antes de ejecutar SQL

Iniciar sesión con el perfil `demo` existente y, desde el mapa de módulos:

1. Pulsar **Simular finalización y probar constancia**.
2. Probar campos vacíos y correos inválidos, luego introducir datos ficticios válidos.
3. Confirmar y pulsar **Descargar PDF**. Se genera localmente con el mismo diseño y el aviso de demostración.
4. Usar **Probar otra vez con datos ficticios** para reiniciar y revisar móvil/escritorio.

No se consulta ni escribe la tabla de solicitudes, no se invoca la función y no se envía correo. Los datos ficticios permanecen solo en memoria. La sesión demo sigue utilizando la autenticación existente; no necesita la nueva migración.

## Duplicados, reintentos y alcance

Una solicitud por usuario, bloqueo del formulario y reserva condicional del envío evitan los duplicados normales por doble clic o recarga. Se congela un único PDF incluso con descargas/envíos concurrentes. El payload y la clave de idempotencia de Resend se reutilizan durante los reintentos.

Resend conserva sus claves de idempotencia durante 24 horas. Se permiten reintentos por 23 horas; si después sigue incierto si el proveedor aceptó el correo, debe resolverse técnicamente el estado antes de reenviar a ciegas. No es una aprobación de certificados. No hay una cola/cron de reintentos. Recargar solo recupera el estado y no envía otro correo.

`sent` indica aceptación por Resend, no confirmación de recepción/apertura. La constancia no es firmada digitalmente. El sistema confía en los resultados guardados por la aplicación: si los permisos actuales permiten manipular `passed` o diagnósticos directamente, este cambio no protege esas evaluaciones contra manipulación ni hace una recalificación independiente. No se alteraron sus reglas. Ver [SECURITY_REVIEW.md](SECURITY_REVIEW.md).

Referencias: [PDF-LIB y Deno](https://pdf-lib.js.org/), [adjuntos de Resend](https://resend.com/docs/api-reference/emails/send-email), [idempotencia](https://resend.com/docs/dashboard/emails/idempotency-keys).

## Pruebas locales

```sh
node --test tests/certificate.test.cjs
node --check certificate.js
node --check app.js
```

Las pruebas de integración usan únicamente dependencias de desarrollo instaladas fuera del frontend:

```powershell
$planneTestDir = Join-Path $env:TEMP 'planne-certificate-tests'
npm install --prefix $planneTestDir @electric-sql/pglite typescript@5.8.3 pdf-lib@1.17.1 playwright-core --no-audit --no-fund
$env:NODE_PATH = Join-Path $planneTestDir 'node_modules'
node --test tests/certificate-security.integration.cjs
node tests/certificate-browser.cjs
```

La prueba de navegador usa Edge en Windows por defecto; `PLANNE_BROWSER` admite otra ruta de Chromium. Las pruebas utilizan una base efímera y servicios simulados, validan el PDF y la igualdad de bytes adjunto/descarga, y guardan muestras en la carpeta temporal `planne-certificate-browser`. No se ha probado todavía la entrega real al Gmail del usuario.
