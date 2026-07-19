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
      intro: "El diagnóstico inicial permite reconocer percepciones, prácticas y necesidades formativas relacionadas con la neuroeducación, el neuroliderazgo y la gestión directiva. Sus respuestas servirán como punto de partida para orientar la ruta de formación.",
      resultLabels: {
        low: "Perfil inicial por fortalecer",
        medium: "Competencias neuroeducativas en desarrollo",
        high: "Base sólida para avanzar en neuroliderazgo"
      }
    },
    diagnosticItems: [
      {
        id: 1,
        section: "A",
        variable: 1,
        variableTitle: "Competencias administrativas vinculadas a la neuroeducación",
        indicator: "Liderazgo consciente y empático",
        prompt: "Un docente con buen desempeño histórico ha bajado su rendimiento y muestra irritabilidad en reuniones. ¿Cuál sería su primera acción?",
        options: [
          { id: "a", text: "Conversar en privado, indagando primero en su bienestar antes que en el desempeño.", score: 5 },
          { id: "b", text: "Solicitar un informe escrito explicando la baja en su rendimiento.", score: 3 },
          { id: "c", text: "Esperar a que la situación se resuelva sola, dado su buen historial.", score: 1 },
          { id: "d", text: "Abordar el tema en la siguiente reunión de personal para dar seguimiento grupal.", score: 0 }
        ]
      },
      {
        id: 2,
        section: "A",
        variable: 1,
        variableTitle: "Competencias administrativas vinculadas a la neuroeducación",
        indicator: "Liderazgo consciente y empático",
        prompt: "Está a punto de dar una noticia institucional impopular (recorte de horas extra, cambio de horario). Antes de comunicarla, ¿qué hace primero?",
        options: [
          { id: "a", text: "Redacta el comunicado y lo envía por el canal oficial más rápido disponible.", score: 1 },
          { id: "b", text: "Anticipa mentalmente cómo reaccionará cada grupo del personal y ajusta el tono y el momento de la comunicación.", score: 5 },
          { id: "c", text: "Consulta a un compañero directivo de otra institución cómo lo manejaría él.", score: 3 },
          { id: "d", text: "Delega la comunicación a un asistente de dirección para evitar el desgaste directo.", score: 0 }
        ]
      },
      {
        id: 3,
        section: "A",
        variable: 1,
        variableTitle: "Competencias administrativas vinculadas a la neuroeducación",
        indicator: "Regulación del clima institucional",
        prompt: "Percibe tensión creciente entre dos grupos informales de docentes, sin conflicto abierto aún. ¿Qué hace?",
        options: [
          { id: "a", text: "No interviene hasta que surja un conflicto formal que amerite una acción disciplinaria.", score: 0 },
          { id: "b", text: "Organiza una actividad institucional que mezcle a ambos grupos sin nombrar la tensión directamente.", score: 3 },
          { id: "c", text: "Identifica las causas específicas de la tensión conversando por separado con referentes de cada grupo, y diseña una acción concreta a partir de eso.", score: 5 },
          { id: "d", text: "Envía una circular general recordando los valores institucionales de respeto y colaboración.", score: 1 }
        ]
      },
      {
        id: 4,
        section: "A",
        variable: 1,
        variableTitle: "Competencias administrativas vinculadas a la neuroeducación",
        indicator: "Regulación del clima institucional",
        prompt: "El clima institucional ha mejorado en apariencia tras una acción suya reciente. ¿Cómo confirma que el cambio es real y no solo momentáneo?",
        options: [
          { id: "a", text: "Da por bueno el resultado porque las quejas informales han disminuido.", score: 1 },
          { id: "b", text: "Diseña un mecanismo de seguimiento (encuesta corta, observación estructurada) a mediano plazo para verificarlo.", score: 5 },
          { id: "c", text: "Pregunta directamente a dos o tres docentes de confianza si notan mejoría.", score: 3 },
          { id: "d", text: "Espera al informe semestral del MEP para confirmarlo con datos oficiales.", score: 0 }
        ]
      },
      {
        id: 5,
        section: "A",
        variable: 1,
        variableTitle: "Competencias administrativas vinculadas a la neuroeducación",
        indicator: "Mediación estratégica (adaptabilidad)",
        prompt: "Implementó una estrategia de acompañamiento docente hace dos meses y los indicadores muestran que no está funcionando. ¿Qué hace?",
        options: [
          { id: "a", text: "Mantiene la estrategia un semestre completo antes de evaluar cambios, para no dar señales de inconsistencia.", score: 1 },
          { id: "b", text: "La abandona de inmediato y prueba una estrategia completamente distinta.", score: 0 },
          { id: "c", text: "Analiza qué componente específico no está funcionando y ajusta solo esa parte, conservando lo que sí funciona.", score: 5 },
          { id: "d", text: "Solicita a un asesor externo que diseñe una nueva estrategia desde cero.", score: 3 }
        ]
      },
      {
        id: 6,
        section: "A",
        variable: 1,
        variableTitle: "Competencias administrativas vinculadas a la neuroeducación",
        indicator: "Mediación estratégica (adaptabilidad)",
        prompt: "Debe comunicar la misma decisión (cambio en el uso de un espacio común) a docentes veteranos resistentes al cambio y a docentes nuevos. ¿Cómo procede?",
        options: [
          { id: "a", text: "Usa exactamente el mismo mensaje y canal para todos, para garantizar equidad en la información.", score: 1 },
          { id: "b", text: "Ajusta el énfasis y los argumentos según el grupo, manteniendo el mismo contenido de fondo.", score: 5 },
          { id: "c", text: "Comunica primero a los docentes nuevos, asumiendo que aceptarán más fácilmente.", score: 3 },
          { id: "d", text: "Delega la comunicación a los coordinadores de cada grupo.", score: 0 }
        ]
      },
      {
        id: 7,
        section: "A",
        variable: 1,
        variableTitle: "Competencias administrativas vinculadas a la neuroeducación",
        indicator: "Toma de decisiones neuroinformadas",
        prompt: "Debe decidir sobre una reorganización de horarios que afecta directamente a un grupo de docentes, en medio de una semana de alta carga administrativa para usted. ¿Qué hace?",
        options: [
          { id: "a", text: "Toma la decisión de inmediato para liberar espacio mental para otras tareas urgentes.", score: 0 },
          { id: "b", text: "Pospone la decisión final al momento del día en que se sienta con mayor claridad, aunque implique un día adicional de espera.", score: 5 },
          { id: "c", text: "Consulta rápidamente con un colega y decide en base a esa opinión.", score: 3 },
          { id: "d", text: "Aplica la misma solución que usó en una reorganización anterior, sin revisar si el contexto es igual.", score: 1 }
        ]
      },
      {
        id: 8,
        section: "A",
        variable: 1,
        variableTitle: "Competencias administrativas vinculadas a la neuroeducación",
        indicator: "Toma de decisiones neuroinformadas",
        prompt: "Al evaluar dos opciones administrativas igual de válidas en lo normativo, ¿qué considera decisivo para elegir?",
        options: [
          { id: "a", text: "Cuál implica menos trámites administrativos para usted.", score: 1 },
          { id: "b", text: "Cuál tiene mejor respaldo legal documentado.", score: 3 },
          { id: "c", text: "Cuál genera menor carga emocional y cognitiva en el personal que debe ejecutarla, sin sacrificar el objetivo institucional.", score: 5 },
          { id: "d", text: "Cuál ha usado con más frecuencia en el pasado.", score: 0 }
        ]
      },
      {
        id: 9,
        section: "A",
        variable: 1,
        variableTitle: "Competencias administrativas vinculadas a la neuroeducación",
        indicator: "Comunicación neuroafectiva y asertiva",
        prompt: "Debe corregir a un docente por una falta reiterada (llegadas tarde). ¿Cómo estructura la conversación?",
        options: [
          { id: "a", text: "Comunica la falta de forma indirecta, esperando que el docente entienda la insinuación.", score: 0 },
          { id: "b", text: "Señala el hecho concreto de forma directa, explica el impacto institucional y acuerda un compromiso verificable de cambio.", score: 5 },
          { id: "c", text: "Envía un correo formal detallando la falta y las consecuencias normativas.", score: 3 },
          { id: "d", text: "Espera a una evaluación de desempeño formal para mencionarlo junto con otros temas.", score: 1 }
        ]
      },
      {
        id: 10,
        section: "A",
        variable: 1,
        variableTitle: "Competencias administrativas vinculadas a la neuroeducación",
        indicator: "Comunicación neuroafectiva y asertiva",
        prompt: "Después de dar una instrucción importante en una reunión de personal, ¿qué hace para asegurarse de que fue comprendida como usted la pensó?",
        options: [
          { id: "a", text: "Pregunta abiertamente “¿alguna duda?” al final de la reunión.", score: 1 },
          { id: "b", text: "Pide a una o dos personas que resuman en sus propias palabras lo que entendieron que deben hacer.", score: 5 },
          { id: "c", text: "Envía la instrucción por escrito después de la reunión, sin verificación adicional.", score: 3 },
          { id: "d", text: "Asume que fue comprendida si nadie preguntó nada en el momento.", score: 0 }
        ]
      },
      {
        id: 11,
        section: "B",
        variable: 2,
        variableTitle: "Principios de neuroeducación evidenciados",
        indicator: "Regulación emocional",
        prompt: "Un padre de familia lo increpa de forma agresiva e injusta frente a otros funcionarios. ¿Qué hace en el momento?",
        options: [
          { id: "a", text: "Responde con el mismo tono para establecer límites de inmediato.", score: 0 },
          { id: "b", text: "Aplica una pausa consciente antes de responder, y continúa la conversación en un espacio privado.", score: 5 },
          { id: "c", text: "Se retira de la conversación sin responder, y la retoma después por escrito.", score: 3 },
          { id: "d", text: "Escucha en silencio hasta que el padre termine, sin intervenir en ningún momento.", score: 1 }
        ]
      },
      {
        id: 12,
        section: "B",
        variable: 2,
        variableTitle: "Principios de neuroeducación evidenciados",
        indicator: "Regulación emocional",
        prompt: "Dos docentes llegan a su oficina en medio de una discusión acalorada por un tema pedagógico. ¿Qué hace primero?",
        options: [
          { id: "a", text: "Los deja resolverlo entre ellos, ya que es un tema pedagógico y no administrativo.", score: 1 },
          { id: "b", text: "Interviene de inmediato dando la razón a quien considera tiene el argumento más sólido.", score: 0 },
          { id: "c", text: "Separa la conversación, permite que cada uno baje su activación emocional por separado, y luego media.", score: 5 },
          { id: "d", text: "Programa una reunión formal para la próxima semana para tratar el tema con calma.", score: 3 }
        ]
      },
      {
        id: 13,
        section: "B",
        variable: 2,
        variableTitle: "Principios de neuroeducación evidenciados",
        indicator: "Atención y organización cognitiva",
        prompt: "Tiene tres asuntos urgentes simultáneos: un problema disciplinario, un reporte para la DRE y una visita de un padre de familia. ¿Cómo procede?",
        options: [
          { id: "a", text: "Atiende los tres en el orden en que llegaron a su oficina.", score: 1 },
          { id: "b", text: "Evalúa cuál requiere mayor claridad mental y lo agenda para su momento de mejor rendimiento cognitivo del día, comunicando tiempos de espera realistas a los demás.", score: 5 },
          { id: "c", text: "Delega los tres a sus asistentes de dirección para descongestionar su agenda.", score: 3 },
          { id: "d", text: "Atiende primero al padre de familia por estar presente físicamente.", score: 0 }
        ]
      },
      {
        id: 14,
        section: "B",
        variable: 2,
        variableTitle: "Principios de neuroeducación evidenciados",
        indicator: "Atención y organización cognitiva",
        prompt: "Nota que después de varias horas de reuniones consecutivas, sus decisiones se vuelven más impulsivas. ¿Qué hace?",
        options: [
          { id: "a", text: "Continúa con la agenda planificada, confiando en su experiencia para compensarlo.", score: 1 },
          { id: "b", text: "Reconoce la fatiga cognitiva y reprograma las decisiones importantes restantes para otro momento del día.", score: 5 },
          { id: "c", text: "Toma un descanso de cinco minutos y continúa con la agenda tal como estaba.", score: 3 },
          { id: "d", text: "Delega las decisiones restantes del día a un asistente de dirección.", score: 0 }
        ]
      },
      {
        id: 15,
        section: "B",
        variable: 2,
        variableTitle: "Principios de neuroeducación evidenciados",
        indicator: "Condiciones de bienestar y ambiente neurocompatible",
        prompt: "Detecta que la sala de profesores tiene ruido constante y mala iluminación, y varios docentes lo mencionan de forma informal. ¿Qué hace?",
        options: [
          { id: "a", text: "Lo anota como un tema a considerar en el próximo presupuesto institucional, sin plazo definido.", score: 1 },
          { id: "b", text: "Diseña e implementa una intervención concreta y de corto plazo con los recursos disponibles actualmente.", score: 5 },
          { id: "c", text: "Solicita una queja formal por escrito antes de considerar cualquier acción.", score: 0 },
          { id: "d", text: "Consulta con el personal qué prefieren cambiar primero, y actúa según la mayoría.", score: 3 }
        ]
      },
      {
        id: 16,
        section: "B",
        variable: 2,
        variableTitle: "Principios de neuroeducación evidenciados",
        indicator: "Condiciones de bienestar y ambiente neurocompatible",
        prompt: "Un docente de alto desempeño reporta agotamiento sostenido. ¿Cuál es su primera acción como gestor?",
        options: [
          { id: "a", text: "Lo felicita por su desempeño y lo anima a continuar con el mismo ritmo.", score: 0 },
          { id: "b", text: "Revisa su carga de trabajo real y ajusta responsabilidades específicas de forma temporal.", score: 5 },
          { id: "c", text: "Le sugiere técnicas personales de manejo de estrés.", score: 1 },
          { id: "d", text: "Programa una reunión para dentro de un mes para dar seguimiento al tema.", score: 3 }
        ]
      },
      {
        id: 17,
        section: "B",
        variable: 2,
        variableTitle: "Principios de neuroeducación evidenciados",
        indicator: "Motivación como factor de activación institucional",
        prompt: "Quiere sostener la motivación de un equipo docente más allá de los incentivos formales del MEP. ¿Qué acción prioriza?",
        options: [
          { id: "a", text: "Organiza un reconocimiento público genérico al final del año lectivo.", score: 1 },
          { id: "b", text: "Identifica qué motiva específicamente a cada docente clave y ajusta cómo delega y reconoce el trabajo de cada uno.", score: 5 },
          { id: "c", text: "Gestiona ante el MEP un incentivo económico adicional.", score: 3 },
          { id: "d", text: "Confía en que el compromiso vocacional del docente es suficiente motivación.", score: 0 }
        ]
      },
      {
        id: 18,
        section: "B",
        variable: 2,
        variableTitle: "Principios de neuroeducación evidenciados",
        indicator: "Motivación como factor de activación institucional",
        prompt: "Un docente competente muestra señales de desmotivación reciente. ¿Qué hace primero?",
        options: [
          { id: "a", text: "Espera a que la situación se resuelva por sí sola, ya que es un profesional con vocación.", score: 0 },
          { id: "b", text: "Indaga directamente qué factor específico está afectando su motivación antes de proponer una solución.", score: 5 },
          { id: "c", text: "Le asigna una tarea de mayor responsabilidad para reactivar su compromiso.", score: 1 },
          { id: "d", text: "Le ofrece una felicitación pública para reforzar su autoestima profesional.", score: 3 }
        ]
      },
      {
        id: 19,
        section: "B",
        variable: 2,
        variableTitle: "Principios de neuroeducación evidenciados",
        indicator: "Retroalimentación para el aprendizaje significativo",
        prompt: "Observa una clase y detecta una debilidad pedagógica recurrente en un docente. ¿Cómo entrega la retroalimentación?",
        options: [
          { id: "a", text: "La menciona brevemente al cruzarse con el docente en el pasillo.", score: 1 },
          { id: "b", text: "La documenta y espera a la evaluación formal de fin de año para mencionarla.", score: 0 },
          { id: "c", text: "Programa un espacio específico, explica el hallazgo con evidencia concreta de la clase, y acuerda una acción de mejora verificable.", score: 5 },
          { id: "d", text: "Envía un correo detallado señalando la debilidad observada.", score: 3 }
        ]
      },
      {
        id: 20,
        section: "B",
        variable: 2,
        variableTitle: "Principios de neuroeducación evidenciados",
        indicator: "Retroalimentación para el aprendizaje significativo",
        prompt: "Después de dar retroalimentación correctiva a un docente, ¿qué hace para asegurarse de que generó aprendizaje real y no solo incomodidad momentánea?",
        options: [
          { id: "a", text: "Da seguimiento explícito en una fecha posterior para verificar si el cambio ocurrió.", score: 5 },
          { id: "b", text: "Confía en que el docente aplicará el cambio, ya que es un profesional.", score: 0 },
          { id: "c", text: "Pregunta al docente, en el momento, si entendió la retroalimentación.", score: 3 },
          { id: "d", text: "Observa informalmente en las siguientes semanas sin comunicarlo.", score: 1 }
        ]
      },
      {
        id: 21,
        section: "C",
        variable: 3,
        variableTitle: "Implementación de procesos eficientes y eficaces en la cultura pedagógica institucional",
        indicator: "Gestión técnica y relacional",
        prompt: "Debe aplicar una normativa del MEP que el personal percibe como rígida e impopular. ¿Cómo procede?",
        options: [
          { id: "a", text: "La aplica estrictamente tal como está redactada, sin margen de conversación.", score: 1 },
          { id: "b", text: "Aplica la normativa explicando su sentido y creando espacio para que el personal exprese su malestar antes de la implementación.", score: 5 },
          { id: "c", text: "Posterga la aplicación mientras gestiona una excepción ante la DRE.", score: 3 },
          { id: "d", text: "Delega la comunicación de la normativa a un asistente de dirección.", score: 0 }
        ]
      },
      {
        id: 22,
        section: "C",
        variable: 3,
        variableTitle: "Implementación de procesos eficientes y eficaces en la cultura pedagógica institucional",
        indicator: "Gestión técnica y relacional",
        prompt: "Tiene dos formas válidas de resolver un mismo problema administrativo: una más rápida pero más fría, otra más lenta pero que cuida la relación con el equipo. ¿Cuál prioriza?",
        options: [
          { id: "a", text: "Siempre la más rápida, para no acumular pendientes.", score: 1 },
          { id: "b", text: "Evalúa el contexto específico (urgencia real vs. impacto relacional) antes de decidir cuál aplicar.", score: 5 },
          { id: "c", text: "Siempre la que cuida la relación, aunque implique acumular pendientes.", score: 3 },
          { id: "d", text: "Consulta con su superior jerárquico cuál prefiere que aplique.", score: 0 }
        ]
      },
      {
        id: 23,
        section: "C",
        variable: 3,
        variableTitle: "Implementación de procesos eficientes y eficaces en la cultura pedagógica institucional",
        indicator: "Alineación administrativa-pedagógica",
        prompt: "Debe decidir sobre la distribución de un recurso institucional limitado (por ejemplo, un aula con proyector). ¿Qué criterio aplica primero?",
        options: [
          { id: "a", text: "Orden de antigüedad del personal docente.", score: 0 },
          { id: "b", text: "El impacto que tiene ese recurso en el proceso de enseñanza-aprendizaje de los grupos involucrados.", score: 5 },
          { id: "c", text: "Quien lo solicitó primero.", score: 1 },
          { id: "d", text: "Distribución equitativa de horas entre todos los docentes, sin distinción.", score: 3 }
        ]
      },
      {
        id: 24,
        section: "C",
        variable: 3,
        variableTitle: "Implementación de procesos eficientes y eficaces en la cultura pedagógica institucional",
        indicator: "Alineación administrativa-pedagógica",
        prompt: "Va a implementar un cambio puramente administrativo (por ejemplo, un nuevo sistema de control de asistencia). ¿Qué hace antes de implementarlo?",
        options: [
          { id: "a", text: "Lo implementa directamente, ya que es un tema administrativo sin relación con lo pedagógico.", score: 0 },
          { id: "b", text: "Evalúa explícitamente si el cambio podría afectar tiempo o dinámicas de aula, y ajusta el diseño si es necesario.", score: 5 },
          { id: "c", text: "Consulta brevemente a un coordinador académico antes de implementarlo.", score: 3 },
          { id: "d", text: "Lo implementa y espera reportes de quejas para hacer ajustes posteriores.", score: 1 }
        ]
      },
      {
        id: 25,
        section: "C",
        variable: 3,
        variableTitle: "Implementación de procesos eficientes y eficaces en la cultura pedagógica institucional",
        indicator: "Optimización de recursos en escasez",
        prompt: "Recibe un presupuesto institucional menor al esperado para el año lectivo. ¿Cómo procede?",
        options: [
          { id: "a", text: "Recorta proporcionalmente todos los rubros por igual.", score: 1 },
          { id: "b", text: "Prioriza los recursos según su impacto pedagógico directo, usando un criterio explícito y documentado.", score: 5 },
          { id: "c", text: "Recorta primero los rubros administrativos para proteger lo pedagógico, sin un análisis más detallado.", score: 3 },
          { id: "d", text: "Solicita a la DRE una ampliación presupuestaria antes de tomar decisiones internas.", score: 0 }
        ]
      },
      {
        id: 26,
        section: "C",
        variable: 3,
        variableTitle: "Implementación de procesos eficientes y eficaces en la cultura pedagógica institucional",
        indicator: "Optimización de recursos en escasez",
        prompt: "Un proyecto pedagógico valioso no tiene presupuesto asignado este año. ¿Qué hace?",
        options: [
          { id: "a", text: "Lo descarta hasta el siguiente ciclo presupuestario.", score: 0 },
          { id: "b", text: "Busca reorganizar recursos existentes o alianzas externas para sostenerlo sin presupuesto adicional.", score: 5 },
          { id: "c", text: "Lo mantiene en una versión reducida usando lo mínimo disponible, sin buscar alternativas adicionales.", score: 3 },
          { id: "d", text: "Solicita a los docentes involucrados que autogestionen los recursos necesarios.", score: 1 }
        ]
      },
      {
        id: 27,
        section: "C",
        variable: 3,
        variableTitle: "Implementación de procesos eficientes y eficaces en la cultura pedagógica institucional",
        indicator: "Impacto en convivencia y bienestar institucional",
        prompt: "Implementó hace tres meses una estrategia para reducir conflictos disciplinarios. ¿Cómo verifica si tuvo impacto real?",
        options: [
          { id: "a", text: "Revisa si ha recibido menos quejas informales de docentes.", score: 1 },
          { id: "b", text: "Compara datos concretos (número de incidentes registrados, remisiones a dirección) antes y después de la intervención.", score: 5 },
          { id: "c", text: "Pregunta a los docentes si perciben mejoría.", score: 3 },
          { id: "d", text: "Asume que funcionó si no ha habido incidentes graves recientes.", score: 0 }
        ]
      },
      {
        id: 28,
        section: "C",
        variable: 3,
        variableTitle: "Implementación de procesos eficientes y eficaces en la cultura pedagógica institucional",
        indicator: "Impacto en convivencia y bienestar institucional",
        prompt: "Detecta una mejora en la convivencia estudiantil que coincide con una acción suya reciente. ¿Cómo procede?",
        options: [
          { id: "a", text: "Da por hecho que la mejora se debe a su intervención.", score: 0 },
          { id: "b", text: "Analiza si existen otros factores que podrían explicar la mejora antes de atribuirla completamente a su acción.", score: 5 },
          { id: "c", text: "Lo menciona como logro en su próximo informe institucional sin mayor análisis.", score: 1 },
          { id: "d", text: "Consulta informalmente con el personal si notan la misma mejora.", score: 3 }
        ]
      },
      {
        id: 29,
        section: "C",
        variable: 3,
        variableTitle: "Implementación de procesos eficientes y eficaces en la cultura pedagógica institucional",
        indicator: "Evidencias de transformación cultural",
        prompt: "Quiere verificar si su gestión ha generado un cambio real y sostenido en las prácticas docentes, no solo un efecto temporal. ¿Qué evidencia prioriza?",
        options: [
          { id: "a", text: "Comentarios positivos informales del personal docente.", score: 1 },
          { id: "b", text: "Observación de aula y datos de desempeño estudiantil comparados en un periodo de al menos dos ciclos.", score: 5 },
          { id: "c", text: "La cantidad de actividades institucionales realizadas en el año.", score: 0 },
          { id: "d", text: "La percepción personal de que el ambiente “se siente diferente”.", score: 3 }
        ]
      },
      {
        id: 30,
        section: "C",
        variable: 3,
        variableTitle: "Implementación de procesos eficientes y eficaces en la cultura pedagógica institucional",
        indicator: "Evidencias de transformación cultural",
        prompt: "Le piden evidencia concreta de un cambio cultural institucional sostenido bajo su gestión, para un informe ante la DRE. ¿Qué presenta?",
        options: [
          { id: "a", text: "Una descripción narrativa de los cambios que percibe.", score: 1 },
          { id: "b", text: "Datos verificables (indicadores de convivencia, participación docente, resultados de aprendizaje) con línea base y seguimiento en el tiempo.", score: 5 },
          { id: "c", text: "Testimonios escritos del personal docente.", score: 3 },
          { id: "d", text: "El número de proyectos institucionales ejecutados durante su gestión.", score: 0 }
        ]
      }
    ],
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
                text: "Ítem A.1: ¿Cuál relación resume mejor el enfoque inicial de PLANNE?",
                options: [
                  { label: "La neuroeducación ofrece criterios para comprender aprendizaje, motivación y toma de decisiones en la gestión directiva.", correct: true },
                  { label: "La neuroeducación sustituye la experiencia profesional del gestor educativo.", correct: false },
                  { label: "La gestión directiva depende solo del cumplimiento administrativo.", correct: false }
                ]
              },
              {
                text: "Ítem A.2: En una gestión directiva con enfoque neuroeducativo, la neuroplasticidad invita a:",
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
                text: "Ítem B.1: ¿Qué práctica refleja mejor el neuroliderazgo en la gestión educativa?",
                options: [
                  { label: "Promover condiciones de confianza, motivación y autorregulación para tomar mejores decisiones.", correct: true },
                  { label: "Aumentar la presión sobre el equipo para acelerar resultados.", correct: false },
                  { label: "Delegar toda decisión emocional al personal docente.", correct: false }
                ]
              },
              {
                text: "Ítem B.2: La autorregulación directiva es importante porque:",
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
                text: "Ítem C.1: ¿Para qué sirve el modelo SCARF en la gestión educativa?",
                options: [
                  { label: "Para analizar cómo las decisiones directivas pueden influir en confianza, colaboración y apertura al cambio.", correct: true },
                  { label: "Para clasificar docentes según rendimiento individual.", correct: false },
                  { label: "Para reemplazar los procesos de evaluación institucional.", correct: false }
                ]
              },
              {
                text: "Ítem C.2: Si una decisión reduce la claridad del equipo sobre los próximos pasos, el dominio más afectado es:",
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
                text: "Ítem D.1: ¿Qué caracteriza una buena práctica institucional dentro de PLANNE?",
                options: [
                  { label: "Una acción documentada, reflexiva y transferible que aporta a la mejora de la gestión educativa.", correct: true },
                  { label: "Una actividad aislada que no requiere evidencia ni seguimiento.", correct: false },
                  { label: "Una decisión que solo responde a una urgencia administrativa.", correct: false }
                ]
              },
              {
                text: "Ítem D.2: La comunidad de práctica aporta a la mejora institucional porque:",
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
