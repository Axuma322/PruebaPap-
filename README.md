<div align="center">
  <img src="assets/cerebro.png" alt="Identidad visual de PLANNE: representación de un cerebro" width="180">

# PLANNE · Plataforma Digital de Neuroliderazgo Educativo

> Plataforma web autogestionada para fortalecer competencias de gestión directiva desde la neuroeducación, el neuroliderazgo y la mejora institucional basada en evidencia.

![HTML5](https://img.shields.io/badge/HTML5-E34F26?logo=html5&logoColor=white)
![CSS3](https://img.shields.io/badge/CSS3-1572B6?logo=css&logoColor=white)
![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?logo=javascript&logoColor=black)
![Supabase](https://img.shields.io/badge/Supabase-3FCF8E?logo=supabase&logoColor=white)
![GitHub Pages](https://img.shields.io/badge/GitHub_Pages-222222?logo=github&logoColor=white)

**Diagnóstico → Formación → Comunidad → Mejora institucional**

</div>

## Contenido

- [Descripción general](#descripción-general)
- [Objetivo del proyecto](#objetivo-del-proyecto)
- [Funcionalidades principales](#funcionalidades-principales)
- [Módulos de la plataforma](#módulos-de-la-plataforma)
- [Tecnologías utilizadas](#tecnologías-utilizadas)
- [Arquitectura general](#arquitectura-general)
- [Instalación local](#instalación-local)
- [Configuración de Supabase](#configuración-de-supabase)
- [Despliegue](#despliegue)
- [Habilidades y aprendizajes técnicos](#habilidades-y-aprendizajes-técnicos)
- [Valor académico](#valor-académico)
- [Estado del proyecto y próximos pasos](#estado-del-proyecto-y-próximos-pasos)

## Descripción general

PLANNE es una plataforma web educativa orientada a gestores educativos y equipos directivos. Integra diagnóstico, formación modular, autoevaluaciones, materiales de apoyo y una comunidad de práctica en un recorrido autogestionado.

Desarrollada como proyecto académico y tecnológico de apoyo a una propuesta doctoral, traduce contenidos de neuroeducación y neuroliderazgo en situaciones de gestión, evaluaciones y espacios de reflexión institucional. Su frontend utiliza HTML, CSS y JavaScript puro; Supabase proporciona autenticación y persistencia compartida.

## Objetivo del proyecto

Ofrecer una herramienta digital que permita:

- Reconocer fortalezas y necesidades mediante un diagnóstico inicial y una segunda medición identificada como final.
- Recorrer una ruta formativa de cuatro etapas con evaluaciones y seguimiento del progreso.
- Consultar materiales y relacionarlos con situaciones de gestión directiva.
- Compartir reflexiones y buenas prácticas en una comunidad de práctica.
- Apoyar procesos de mejora institucional mediante reflexión, formación y documentación de aprendizajes.

## Funcionalidades principales

| Funcionalidad | Implementación actual |
|---|---|
| Acceso con usuario y contraseña | Registro, inicio y cierre de sesión con Supabase Auth; validación de usuario, contraseña y confirmación. |
| Diagnóstico DNA | 30 ítems situacionales, dos intentos para usuarios reales y resultados generales y por variable. |
| Ruta RFAN | Etapas A–D, acceso progresivo y reintentos hasta aprobar con al menos 70 %. |
| Recursos formativos | PDFs en las etapas A, C y D; la etapa B aún no contiene PDFs. |
| Evaluaciones | Selección múltiple en A–C y autoevaluación Likert en D, con retroalimentación. |
| Persistencia del progreso | Diagnósticos, intentos y avance en Supabase, con caché local por usuario. |
| Foro COPEI | Aportes compartidos con autor y fecha, almacenados en Supabase. |
| Modo demostración | Recorrido libre para el perfil `demo`, sin guardar diagnósticos ni evaluaciones como datos reales. |
| Interfaz adaptable | Estilos para escritorio y pantallas pequeñas, formularios etiquetados y avisos de estado. |
| Guía de uso | Recorrido guiado accesible desde la pantalla de acceso y la sesión del usuario. |

## Módulos de la plataforma

### DNA · Diagnóstico y Autoevaluación Neuroeducativa

Instrumento de **30 ítems**, distribuido en tres variables de diez ítems cada una:

1. Competencias administrativas vinculadas a la neuroeducación.
2. Principios de neuroeducación evidenciados.
3. Implementación de procesos eficientes y eficaces en la cultura pedagógica institucional.

El usuario puede consultar su puntuación global, porcentajes por variable y retroalimentación. Para cuentas reales, el código contempla un intento `initial` y otro `final`. El segundo se ofrece después del primero; no exige completar toda la ruta RFAN para realizarlo.

### RFAN · Ruta de Formación Adaptativa en Neuroliderazgo

Organiza la formación en cuatro etapas. El diagnóstico inicial habilita el recorrido para usuarios reales y la aprobación de cada etapa permite avanzar a la siguiente. La adaptación implementada consiste en el desbloqueo según el progreso; los contenidos de las etapas son comunes.

| Etapa | Tema | Recursos y evaluación |
|---|---|---|
| **A** | Fundamentos de neuroeducación y gestión directiva | PDFs sobre aprendizaje, neurodiversidad, neurociencias y DUA; evaluación de selección múltiple. |
| **B** | Neuroliderazgo, motivación y autorregulación | Contenido introductorio y evaluación de selección múltiple; materiales PDF pendientes. |
| **C** | Modelo SCARF aplicado a la gestión educativa | PDFs de neuroliderazgo y mejora organizacional; actividad de análisis y evaluación de selección múltiple. |
| **D** | Comunidad, evidencia y mejora institucional | PDFs de comunidad, evidencia, liderazgo y mejora continua; autoevaluación Likert. |

La etapa D contiene **20 ítems en cuatro bloques**: Comunidad, Evidencia Institucional, Mejora Continua y Aplicación Integrada. Su escala va de **Nunca (1)** a **Siempre (4)**. Presenta resultados por bloque y una clasificación general: Prioritario, En desarrollo o Consolidado. Aunque es una autoevaluación sin respuestas correctas o incorrectas, el flujo utiliza un mínimo del **70 %** para completar la etapa.

Los materiales se registran explícitamente en `data.js`; añadir un PDF a una carpeta requiere actualizar también ese catálogo. Las carpetas incluyen archivos de evaluación `.txt` como referencia; las evaluaciones que ejecuta la aplicación están definidas en JavaScript.

### COPEI · Comunidad de Práctica y Evidencia Institucional

Foro compartido para publicar reflexiones, aprendizajes y buenas prácticas. Los aportes se guardan en `forum_posts` y se presentan con autor y fecha; la consulta carga hasta las 80 publicaciones más recientes.

### Modo demostración

Se activa al iniciar sesión con un perfil cuyo nombre de usuario sea `demo`. Requiere una cuenta en Supabase y no es un acceso anónimo.

- Permite recorrer todas las etapas sin los bloqueos del flujo normal.
- Conserva temporalmente los diagnósticos de demostración en `sessionStorage`.
- Evita guardar resultados de diagnóstico y evaluación en las tablas de datos reales.
- **El foro sí permite publicaciones compartidas**: solicita confirmación y etiqueta al autor con `[Demo]`.

El repositorio no incluye una contraseña de demostración.

## Tecnologías utilizadas

| Área | Tecnología |
|---|---|
| Frontend | HTML5, CSS3 y JavaScript puro |
| Base de datos | Supabase Database / PostgreSQL |
| Autenticación | Supabase Auth |
| Cliente de backend | Supabase JS v2, cargado desde CDN |
| Persistencia | Supabase como fuente principal; `localStorage` para caché y preferencias; `sessionStorage` para diagnósticos demo |
| Despliegue previsto | GitHub Pages y dominio personalizado mediante `CNAME` |
| Control de versiones | Git y GitHub |

No requiere framework de frontend, instalación de paquetes ni proceso de compilación.

## Arquitectura general

```text
PruebaPap-/
├── index.html                 # Estructura, acceso y contenedores de módulos
├── style.css                  # Identidad visual y diseño adaptable
├── app.js                     # Interfaz, autenticación, evaluaciones y sincronización
├── data.js                    # Contenidos, preguntas y catálogo de materiales
├── storage.js                 # Caché local separada por usuario
├── supabaseClient.js          # Cliente Supabase y conversión usuario → email técnico
├── CNAME                      # Dominio personalizado: planne.dev
├── README.md
├── cerebro.png
└── assets/
    ├── cerebro.png            # Imagen utilizada por la interfaz
    └── materiales/
        ├── etapa-a/           # PDFs y referencia de evaluación
        ├── etapa-b/           # Referencia de evaluación; sin PDFs
        ├── etapa-c/           # PDFs y referencia de evaluación
        └── etapa-d/           # PDFs y referencia de evaluación
```

**Flujo de datos:** navegador → cliente Supabase → Auth y tablas de datos. La interfaz se genera a partir de `APP_DATA`; `app.js` gestiona la sesión y las operaciones remotas. `storage.js` mantiene una caché por usuario y utiliza memoria si el almacenamiento local no está disponible.

| Tabla consumida por la aplicación | Propósito |
|---|---|
| `profiles` | Identidad y nombre del usuario |
| `progress` | Diagnóstico completado, etapa actual y etapas completadas |
| `diagnostic_answers` | Respuestas, puntuación y tipo de intento del diagnóstico |
| `quiz_attempts` | Respuestas, puntuación y aprobación por etapa |
| `forum_posts` | Autor, contenido y fecha de los aportes |

## Instalación local

**Requisitos:** Git, un navegador moderno y un servidor HTTP local. Para el ejemplo siguiente, Python 3 debe estar instalado. Se necesita conexión a internet para cargar Supabase JS y utilizar Auth y la base de datos.

```bash
git clone https://github.com/Axuma322/PruebaPap-.git
cd PruebaPap-
python -m http.server 8000
```

Abrir **http://localhost:8000**. También puede utilizarse la extensión Live Server de un editor compatible para servir la carpeta del proyecto.

La copia actual apunta al proyecto Supabase configurado en `supabaseClient.js`: ejecutar el frontend localmente mantiene esa conexión. Para disponer de un entorno independiente, configurar un proyecto Supabase propio antes de registrar usuarios o publicar aportes.

## Configuración de Supabase

1. Configurar `SUPABASE_URL` y `SUPABASE_PUBLISHABLE_KEY` en `supabaseClient.js` con los valores públicos del proyecto elegido.
2. Habilitar autenticación por email y contraseña. La interfaz convierte el usuario normalizado en un email técnico con el dominio `@usuarios.example.com`.
3. Adaptar la confirmación de email a ese flujo: el registro actual necesita una sesión inmediata para crear perfil y progreso. El código indica desactivar la confirmación para usuarios técnicos o modificar el flujo para usar correos reales.
4. Preparar las cinco tablas descritas en la arquitectura, con las columnas que consultan e insertan las funciones de `app.js`.
5. Configurar las políticas de acceso para que cada usuario gestione sus datos y los usuarios autenticados puedan consultar el foro y publicar con su identidad.
6. Configurar las URLs de la aplicación correspondientes al entorno local y al despliegue.

**Alcance de esta copia:** el repositorio contiene el cliente y las consultas, pero no incluye migraciones SQL ni definiciones de políticas RLS. Clonar los archivos no reproduce por sí solo el backend. Utilizar exclusivamente una clave pública en el navegador; las claves privadas de administración no pertenecen al frontend.

## Despliegue

El frontend puede servirse como sitio estático en GitHub Pages:

1. Subir los archivos al repositorio de GitHub.
2. Configurar GitHub Pages para publicar desde la rama `main` y la carpeta raíz del repositorio.
3. Elegir el dominio del sitio. El archivo `CNAME` contiene `planne.dev`; para una copia propia, actualizarlo o retirarlo según el dominio elegido y configurar el DNS correspondiente.
4. Revisar la configuración de Supabase para el entorno publicado.
5. Verificar acceso, apertura de PDFs, diagnóstico, evaluaciones, recuperación del progreso y publicaciones del foro.

`CNAME` documenta el dominio previsto; su presencia no confirma que el sitio o el DNS estén activos.

## Habilidades y aprendizajes técnicos

El proyecto demuestra trabajo práctico en:

- **Desarrollo de interfaces:** módulos con HTML semántico, CSS adaptable y manipulación del DOM.
- **Integración de servicios:** registro y sesiones con Supabase Auth y consultas de lectura, inserción y actualización.
- **Gestión del estado:** coordinación entre identidad, diagnóstico, resultados, etapas habilitadas y datos remotos.
- **Lógica de evaluación:** puntuación por variables, umbrales de aprobación, reintentos y retroalimentación Likert por bloques.
- **Persistencia:** separación de caché por usuario y distinción entre datos reales y resultados de demostración.
- **Experiencia de usuario:** guía de uso, validación de formularios y mensajes ante errores de conexión o sincronización.
- **Organización de contenidos:** separación de datos formativos, almacenamiento, cliente de backend y lógica de interfaz.

## Valor académico

PLANNE busca acercar la neuroeducación a las decisiones cotidianas de la gestión escolar. La propuesta se contextualiza en instituciones de secundaria del **circuito 04 de la Dirección Regional de Liberia, Costa Rica**, según los objetivos incluidos en `data.js`.

Su aporte consiste en articular reconocimiento de necesidades, formación autogestionada y reflexión colectiva en una misma herramienta. Los diagnósticos y las evaluaciones pueden apoyar el seguimiento formativo; la validación del instrumento y la evaluación del impacto corresponden al trabajo de investigación. El repositorio no presenta resultados que acrediten una mejora institucional ya demostrada.

## Estado del proyecto y próximos pasos

**Estado:** implementación académica con tres módulos desarrollados e integración de Supabase en el código. La operación completa depende de la configuración y disponibilidad del backend.

Mejoras propuestas, aún no presentadas como funcionalidades implementadas:

- Completar los materiales PDF de la etapa B y revisar duplicados del catálogo.
- Incorporar capturas reales de la interfaz para ampliar la presentación del portafolio.
- Versionar el esquema SQL y las políticas de acceso para facilitar instalaciones independientes.
- Fortalecer la configuración del perfil demo y la separación de sus publicaciones en el foro.
- Añadir pruebas de autenticación, puntuación y recuperación del progreso.
- Evaluar accesibilidad y experiencia de uso con gestores educativos.
- Documentar la validación del instrumento y los resultados de investigación cuando estén disponibles.
