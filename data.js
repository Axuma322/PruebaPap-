(function () {
  "use strict";

  window.APP_DATA = {
    settings: {
      brainImage: "assets/cerebro.png",
      minimumScore: 70
    },
    hero: {
      kicker: "Vitrina funcional",
      title: "Página educativa para tesis",
      subtitle: "Primera versión visual para organizar diagnóstico, ruta de aprendizaje y foro académico antes de conectar autenticación o base de datos real."
    },
    infoBoxes: [
      {
        id: "cajita-1",
        title: "Cajita 1",
        summary: "Texto editable de introducción.",
        content: "Contenido placeholder para presentar el contexto general de la tesis. Sustituir por el texto definitivo cuando esté aprobado."
      },
      {
        id: "cajita-2",
        title: "Cajita 2",
        summary: "Texto editable de objetivo.",
        content: "Contenido placeholder para explicar el objetivo educativo del prototipo y su relación con la población meta."
      },
      {
        id: "cajita-3",
        title: "Cajita 3",
        summary: "Texto editable de metodología.",
        content: "Contenido placeholder para describir la estrategia didáctica, los materiales y el tipo de evaluación esperada."
      },
      {
        id: "cajita-4",
        title: "Cajita 4",
        summary: "Texto editable de seguimiento.",
        content: "Contenido placeholder para anotar criterios de seguimiento, retroalimentación o próximos pasos del proyecto."
      }
    ],
    diagnosis: {
      title: "Diagnóstico",
      description: "Instrumento breve de ejemplo para explorar conocimientos previos. En esta versión solo se guarda un resultado temporal en localStorage.",
      resultLabels: {
        low: "Necesita refuerzo inicial",
        medium: "Base en desarrollo",
        high: "Base sólida para continuar"
      },
      questions: [
        {
          id: "diagnosis-1",
          text: "¿Qué tan familiarizado estás con estrategias de aprendizaje activo?",
          options: [
            { label: "Poco familiarizado", value: 35 },
            { label: "Medianamente familiarizado", value: 70 },
            { label: "Muy familiarizado", value: 100 }
          ]
        },
        {
          id: "diagnosis-2",
          text: "¿Con qué frecuencia aplicas pausas, ejemplos o preguntas durante una explicación?",
          options: [
            { label: "Casi nunca", value: 30 },
            { label: "A veces", value: 70 },
            { label: "Frecuentemente", value: 100 }
          ]
        },
        {
          id: "diagnosis-3",
          text: "¿Puedes identificar factores que influyen en la atención durante una clase?",
          options: [
            { label: "Todavía no", value: 35 },
            { label: "Identifico algunos", value: 70 },
            { label: "Identifico varios con claridad", value: 100 }
          ]
        }
      ]
    },
    learningPath: {
      title: "Ruta de aprendizaje",
      description: "Secuencia de cuatro subetapas. La subetapa A inicia disponible y las siguientes se desbloquean al aprobar la mini evaluación anterior.",
      stages: [
        {
          id: "A",
          title: "Título placeholder A",
          description: "Descripción placeholder para la primera subetapa de la ruta.",
          fullDescription: "Descripción completa placeholder para la subetapa A. Aquí se podrá ampliar el propósito, las instrucciones y los criterios de avance cuando el contenido final esté listo.",
          intro: "Introducción placeholder de la etapa A. Usar este espacio para preparar al estudiante antes de revisar los materiales.",
          materials: [
            "Material placeholder A.1",
            "Material placeholder A.2",
            "Material placeholder A.3"
          ],
          activity: "Actividad placeholder para la etapa A. Aquí se describirá una práctica, reflexión o ejercicio aplicado.",
          quiz: {
            questions: [
              {
                text: "Pregunta placeholder A.1",
                options: [
                  { label: "Respuesta correcta de ejemplo", correct: true },
                  { label: "Respuesta alternativa de ejemplo", correct: false },
                  { label: "Respuesta distractora de ejemplo", correct: false }
                ]
              },
              {
                text: "Pregunta placeholder A.2",
                options: [
                  { label: "Opción distractora", correct: false },
                  { label: "Opción correcta de ejemplo", correct: true },
                  { label: "Opción alternativa", correct: false }
                ]
              }
            ]
          }
        },
        {
          id: "B",
          title: "Título placeholder B",
          description: "Descripción placeholder para la segunda subetapa de la ruta.",
          fullDescription: "Descripción completa placeholder para la subetapa B. Este espacio servirá para explicar el contenido, orientar el trabajo y conectar la actividad con la etapa anterior.",
          intro: "Introducción placeholder de la etapa B. Usar este espacio para contextualizar el avance y recordar lo aprendido en la etapa anterior.",
          materials: [
            "Material placeholder B.1",
            "Material placeholder B.2",
            "Material placeholder B.3"
          ],
          activity: "Actividad placeholder para la etapa B. Aquí se ubicará una tarea breve o una aplicación guiada del contenido.",
          quiz: {
            questions: [
              {
                text: "Pregunta placeholder B.1",
                options: [
                  { label: "Respuesta correcta de ejemplo", correct: true },
                  { label: "Respuesta alternativa de ejemplo", correct: false },
                  { label: "Respuesta distractora de ejemplo", correct: false }
                ]
              },
              {
                text: "Pregunta placeholder B.2",
                options: [
                  { label: "Opción distractora", correct: false },
                  { label: "Opción correcta de ejemplo", correct: true },
                  { label: "Opción alternativa", correct: false }
                ]
              }
            ]
          }
        },
        {
          id: "C",
          title: "Título placeholder C",
          description: "Descripción placeholder para la tercera subetapa de la ruta.",
          fullDescription: "Descripción completa placeholder para la subetapa C. Aquí se podrán detallar los materiales, las actividades sugeridas y el resultado esperado de aprendizaje.",
          intro: "Introducción placeholder de la etapa C. Usar este espacio para explicar la conexión entre teoría, materiales y práctica.",
          materials: [
            "Material placeholder C.1",
            "Material placeholder C.2",
            "Material placeholder C.3"
          ],
          activity: "Actividad placeholder para la etapa C. Aquí se podrá colocar un caso, análisis o producción del estudiante.",
          quiz: {
            questions: [
              {
                text: "Pregunta placeholder C.1",
                options: [
                  { label: "Respuesta correcta de ejemplo", correct: true },
                  { label: "Respuesta alternativa de ejemplo", correct: false },
                  { label: "Respuesta distractora de ejemplo", correct: false }
                ]
              },
              {
                text: "Pregunta placeholder C.2",
                options: [
                  { label: "Opción distractora", correct: false },
                  { label: "Opción correcta de ejemplo", correct: true },
                  { label: "Opción alternativa", correct: false }
                ]
              }
            ]
          }
        },
        {
          id: "D",
          title: "Título placeholder D",
          description: "Descripción placeholder para la cuarta subetapa de la ruta.",
          fullDescription: "Descripción completa placeholder para la subetapa D. Este bloque podrá cerrar la ruta con síntesis, aplicación y evaluación final de los aprendizajes.",
          intro: "Introducción placeholder de la etapa D. Usar este espacio para orientar el cierre de la ruta y preparar la evaluación.",
          materials: [
            "Material placeholder D.1",
            "Material placeholder D.2",
            "Material placeholder D.3"
          ],
          activity: "Actividad placeholder para la etapa D. Aquí se planteará una integración final o evidencia de aprendizaje.",
          quiz: {
            questions: [
              {
                text: "Pregunta placeholder D.1",
                options: [
                  { label: "Respuesta correcta de ejemplo", correct: true },
                  { label: "Respuesta alternativa de ejemplo", correct: false },
                  { label: "Respuesta distractora de ejemplo", correct: false }
                ]
              },
              {
                text: "Pregunta placeholder D.2",
                options: [
                  { label: "Opción distractora", correct: false },
                  { label: "Opción correcta de ejemplo", correct: true },
                  { label: "Opción alternativa", correct: false }
                ]
              }
            ]
          }
        }
      ]
    },
    forum: {
      notice: "Aviso: este foro guarda comentarios solo en este navegador. Posteriormente se conectará a una base de datos real."
    }
  };
})();
