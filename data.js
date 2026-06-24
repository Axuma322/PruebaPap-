(function () {
  "use strict";

  window.APP_DATA = {
    settings: {
      brainImage: "assets/cerebro.png",
      minimumScore: 70
    },
    hero: {
      kicker: "PLANNE",
      title: "Plataforma Digital de Neuroliderazgo Educativo",
      subtitle: "PLANNE es una plataforma web autogestionada y abierta orientada al fortalecimiento de competencias directivas vinculadas con la neuroeducación y el neuroliderazgo. Integra diagnóstico, formación adaptativa y comunidad de práctica para acompañar la transformación progresiva de la gestión educativa."
    },
    infoBoxes: [
      {
        id: "propuesta",
        title: "PLANNE",
        summary: "Nombre de la propuesta",
        content: "Plataforma Digital de Neuroliderazgo Educativo. Propuesta de innovación tecnológica para fortalecer la gestión directiva desde principios de neuroeducación y neuroliderazgo."
      },
      {
        id: "objetivo-general",
        title: "Objetivo general",
        summary: "Propósito central de la plataforma",
        content: "Diseñar una plataforma web autogestionada y abierta que fortalezca las competencias del administrador educativo vinculadas a la neuroeducación en instituciones de secundaria del circuito 04 de la Dirección Regional de Liberia, Costa Rica."
      },
      {
        id: "objetivos-especificos",
        title: "Objetivos específicos",
        summary: "Contenidos, implementación y evaluación",
        items: [
          "Elaborar contenidos formativos basados en principios de neuroeducación y gestión educativa que respondan a las necesidades detectadas en los administradores escolares.",
          "Implementar la plataforma web con recursos interactivos, módulos de capacitación autogestionada, autoevaluación y herramientas de gestión aplicadas.",
          "Evaluar el impacto de la plataforma en el fortalecimiento de las competencias del administrador educativo mediante indicadores cualitativos y cuantitativos."
        ]
      },
      {
        id: "fundamentacion",
        title: "Fundamentación",
        summary: "Base académica de PLANNE",
        content: "PLANNE responde a la brecha entre el conocimiento neuroeducativo disponible y su aplicación sistemática en la gestión directiva. La propuesta busca convertir ese conocimiento en herramientas operativas, accesibles, contextualizadas y evaluables para gestores educativos en ejercicio."
      }
    ],
    diagnosis: {
      title: "Módulo 1 - Diagnóstico y Autoevaluación Neuroeducativa (DNA)",
      description: "Instrumento digital de autoevaluación orientado a identificar fortalezas, necesidades formativas y áreas de mejora en competencias directivas vinculadas con la neuroeducación. El módulo DNA construye un perfil inicial del gestor educativo para orientar la reflexión individual y servir como punto de partida de la ruta formativa.",
      resultLabels: {
        low: "Perfil inicial por fortalecer",
        medium: "Competencias neuroeducativas en desarrollo",
        high: "Base sólida para avanzar en neuroliderazgo"
      },
      questions: [
        {
          id: "diagnosis-1",
          text: "Ítem preliminar 1: Reconozco la importancia de la neuroeducación en la toma de decisiones directivas.",
          options: [
            { label: "Muy en desacuerdo", value: 25 },
            { label: "En desacuerdo", value: 50 },
            { label: "De acuerdo", value: 75 },
            { label: "Muy de acuerdo", value: 100 }
          ]
        },
        {
          id: "diagnosis-2",
          text: "Ítem preliminar 2: Utilizo estrategias de autorregulación emocional en situaciones de gestión institucional.",
          options: [
            { label: "Muy en desacuerdo", value: 25 },
            { label: "En desacuerdo", value: 50 },
            { label: "De acuerdo", value: 75 },
            { label: "Muy de acuerdo", value: 100 }
          ]
        },
        {
          id: "diagnosis-3",
          text: "Ítem preliminar 3: Promuevo ambientes de trabajo basados en confianza, equidad y comunicación asertiva.",
          options: [
            { label: "Muy en desacuerdo", value: 25 },
            { label: "En desacuerdo", value: 50 },
            { label: "De acuerdo", value: 75 },
            { label: "Muy de acuerdo", value: 100 }
          ]
        }
      ]
    },
    learningPath: {
      title: "Módulo 2 - Rutas de Formación Adaptativa en Neuroliderazgo (RFAN)",
      description: "Itinerario formativo organizado en etapas progresivas para fortalecer competencias directivas desde la neuroeducación, el neuroliderazgo, la gestión emocional y la toma de decisiones estratégica. El módulo RFAN acompaña el desarrollo de competencias vinculadas con motivación, autorregulación, comunicación, colaboración y transformación institucional.",
      fullDescription: "El módulo RFAN ofrece una ruta autogestionada con microformaciones, actividades aplicadas y evaluaciones breves. Su finalidad es acompañar al gestor educativo en el desarrollo progresivo de competencias vinculadas con motivación, autorregulación, comunicación, colaboración y transformación institucional.",
      stages: [
        {
          id: "A",
          title: "Fundamentos de neuroeducación y gestión directiva",
          description: "Introduce la relación entre neuroeducación, gestión educativa y transformación de la práctica directiva.",
          fullDescription: "Esta etapa presenta la base conceptual de PLANNE y permite comprender por qué la neuroeducación puede aportar herramientas relevantes para la gestión directiva. Se enfoca en la relación entre aprendizaje, motivación, toma de decisiones y liderazgo institucional.",
          intro: "Introducción a los principios que conectan aprendizaje, cerebro, liderazgo y gestión escolar. Esta sección permite situar la experiencia formativa desde la realidad de los gestores educativos.",
          materials: [
            "Lectura introductoria sobre neuroeducación y gestión educativa",
            "Recurso de apoyo sobre neuroplasticidad y aprendizaje directivo",
            "Actividad reflexiva sobre prácticas directivas actuales"
          ],
          resourceTitle: "Lectura base",
          resourceDescription: "Espacio para integrar la lectura central de la etapa A, acompañada por recursos visuales o documentos de apoyo sobre neuroeducación aplicada a la gestión directiva.",
          activity: "Actividad de reflexión: identifique una decisión directiva reciente y analice cómo influyeron la motivación, la atención, el clima institucional y la comunicación con el equipo.",
          quiz: {
            questions: [
              {
                text: "Ítem preliminar A.1: ¿Cuál relación resume mejor el enfoque inicial de PLANNE?",
                options: [
                  { label: "La neuroeducación ofrece criterios para comprender aprendizaje, motivación y toma de decisiones en la gestión directiva.", correct: true },
                  { label: "La neuroeducación sustituye la experiencia profesional del gestor educativo.", correct: false },
                  { label: "La gestión directiva depende solo del cumplimiento administrativo.", correct: false }
                ]
              },
              {
                text: "Ítem preliminar A.2: En una gestión directiva con enfoque neuroeducativo, la neuroplasticidad invita a:",
                options: [
                  { label: "Reconocer que las prácticas institucionales pueden aprenderse, ajustarse y mejorar con acompañamiento.", correct: true },
                  { label: "Evitar cambios porque las conductas institucionales son fijas.", correct: false },
                  { label: "Centrar la mejora únicamente en resultados numéricos.", correct: false }
                ]
              }
            ]
          }
        },
        {
          id: "B",
          title: "Neuroliderazgo, motivación y autorregulación",
          description: "Aborda el papel del neuroliderazgo en la motivación intrínseca, la autorregulación y la toma de decisiones.",
          fullDescription: "Esta etapa analiza cómo los procesos cerebrales vinculados con la motivación, la regulación emocional y la toma de decisiones pueden fortalecer el liderazgo educativo. Se orienta a reconocer prácticas directivas que favorecen climas institucionales más positivos y estratégicos.",
          intro: "Introducción al neuroliderazgo como enfoque para comprender la conducta, la motivación y la respuesta emocional de los equipos institucionales.",
          materials: [
            "Recurso sobre neuroliderazgo educativo",
            "Caso de gestión directiva y autorregulación",
            "Guía breve para reflexión personal"
          ],
          resourceTitle: "Lectura base y caso aplicado",
          resourceDescription: "Espacio para integrar una lectura sobre neuroliderazgo y un caso breve de gestión directiva centrado en motivación, autorregulación y comunicación estratégica.",
          activity: "Caso aplicado: analice una situación de tensión institucional e identifique estrategias de autorregulación, escucha activa y toma de decisiones orientada al aprendizaje colectivo.",
          quiz: {
            questions: [
              {
                text: "Ítem preliminar B.1: ¿Qué práctica refleja mejor el neuroliderazgo en la gestión educativa?",
                options: [
                  { label: "Promover condiciones de confianza, motivación y autorregulación para tomar mejores decisiones.", correct: true },
                  { label: "Aumentar la presión sobre el equipo para acelerar resultados.", correct: false },
                  { label: "Delegar toda decisión emocional al personal docente.", correct: false }
                ]
              },
              {
                text: "Ítem preliminar B.2: La autorregulación directiva es importante porque:",
                options: [
                  { label: "Ayuda a responder con claridad ante conflictos, incertidumbre o sobrecarga institucional.", correct: true },
                  { label: "Elimina la necesidad de planificar acciones de seguimiento.", correct: false },
                  { label: "Permite evitar conversaciones difíciles con el equipo.", correct: false }
                ]
              }
            ]
          }
        },
        {
          id: "C",
          title: "Modelo SCARF aplicado a la gestión educativa",
          description: "Explora los dominios de estatus, certeza, autonomía, relación y equidad como claves para comprender la respuesta de los equipos institucionales.",
          fullDescription: "Esta etapa trabaja el modelo SCARF como herramienta para interpretar situaciones de gestión directiva. Permite analizar cómo ciertas decisiones pueden activar o amenazar la disposición de docentes y equipos institucionales hacia el aprendizaje, la colaboración y el cambio.",
          intro: "Introducción al modelo SCARF como una guía para leer necesidades sociales y emocionales presentes en procesos de cambio institucional.",
          materials: [
            "Ficha explicativa del modelo SCARF",
            "Situación simulada de gestión institucional",
            "Guía de análisis para toma de decisiones"
          ],
          resourceTitle: "Análisis del modelo SCARF",
          resourceDescription: "Espacio para desarrollar los dominios de estatus, certeza, autonomía, relación y equidad mediante una ficha de lectura y una situación directiva simulada.",
          activity: "Simulación de situación directiva: revise una decisión institucional y determine qué dominios SCARF pueden verse fortalecidos o amenazados.",
          quiz: {
            questions: [
              {
                text: "Ítem preliminar C.1: ¿Para qué sirve el modelo SCARF en la gestión educativa?",
                options: [
                  { label: "Para analizar cómo las decisiones directivas pueden influir en confianza, colaboración y apertura al cambio.", correct: true },
                  { label: "Para clasificar docentes según rendimiento individual.", correct: false },
                  { label: "Para reemplazar los procesos de evaluación institucional.", correct: false }
                ]
              },
              {
                text: "Ítem preliminar C.2: Si una decisión reduce la claridad del equipo sobre los próximos pasos, el dominio más afectado es:",
                options: [
                  { label: "Certeza", correct: true },
                  { label: "Estatus", correct: false },
                  { label: "Relación", correct: false }
                ]
              }
            ]
          }
        },
        {
          id: "D",
          title: "Comunidad, evidencia y mejora institucional",
          description: "Integra lo aprendido mediante una reflexión aplicada sobre buenas prácticas, evidencia institucional y mejora continua.",
          fullDescription: "Esta etapa conecta la formación individual con la transformación institucional. Se orienta a documentar aprendizajes, reconocer buenas prácticas neuroeducativas y proyectar acciones de mejora desde la experiencia del gestor educativo.",
          intro: "Introducción al cierre de la ruta RFAN mediante la sistematización de aprendizajes y la proyección de acciones para la mejora institucional.",
          materials: [
            "Guía para documentar buenas prácticas",
            "Plantilla de reflexión institucional",
            "Recurso sobre mejora continua e investigación-acción"
          ],
          resourceTitle: "Actividad aplicada y síntesis",
          resourceDescription: "Espacio para integrar una plantilla de reflexión institucional, evidencias de aprendizaje y recursos sobre mejora continua desde la investigación-acción.",
          activity: "Síntesis de aprendizajes: documente una buena práctica neuroeducativa aplicable a su institución y proponga una acción concreta de mejora directiva.",
          quiz: {
            questions: [
              {
                text: "Ítem preliminar D.1: ¿Qué caracteriza una buena práctica institucional dentro de PLANNE?",
                options: [
                  { label: "Una acción documentada, reflexiva y transferible que aporta a la mejora de la gestión educativa.", correct: true },
                  { label: "Una actividad aislada que no requiere evidencia ni seguimiento.", correct: false },
                  { label: "Una decisión que solo responde a una urgencia administrativa.", correct: false }
                ]
              },
              {
                text: "Ítem preliminar D.2: La comunidad de práctica aporta a la mejora institucional porque:",
                options: [
                  { label: "Permite compartir aprendizajes, contrastar experiencias y construir evidencia colectiva.", correct: true },
                  { label: "Sustituye la reflexión individual del gestor educativo.", correct: false },
                  { label: "Convierte todas las instituciones en contextos idénticos.", correct: false }
                ]
              }
            ]
          }
        }
      ]
    },
    forum: {
      title: "Comunidad de práctica COPEI",
      description: "Comparta una reflexión, aprendizaje o buena práctica relacionada con la aplicación de la neuroeducación y el neuroliderazgo en la gestión directiva.",
      notice: "Módulo 3 - Comunidad de Práctica y Evidencia Institucional (COPEI): espacio colaborativo para compartir reflexiones, aprendizajes y buenas prácticas vinculadas con la neuroeducación y la gestión directiva.",
      commentPrompt: "Escriba aquí su reflexión o buena práctica institucional...",
      buttonLabel: "Publicar aporte"
    },
    impact: "PLANNE busca aportar académica, institucional y socialmente mediante la generación de datos sobre competencias neuroeducativas directivas, el acompañamiento escalable de gestores educativos y el fortalecimiento de culturas pedagógicas más humanas, científicas y contextualizadas."
  };
})();
