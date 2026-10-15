import type { ServiceGroupId, ServiceLabels } from '../contact-services';
import type { ProjectCopy, ProjectId } from '../projects';

type Item = { title: string; description: string };
type Stat = { value: string; label: string };
type NavLink = { label: string; id: string };

/** Spanish (default locale). Its shape defines `Dictionary`; every other locale must match it. */
export const es = {
  meta: {
    title: "HércuIT · Desarrollo de software, IA y calidad (QA)",
    description: "Desarrollo de aplicaciones, inteligencia artificial y automatización de WhatsApp con IA, QA y capacitación para equipos, desde Torreón, Coahuila."
  },
  tagline: "Casa de software con la calidad primero",
  brand: {
    markLabel: "Logotipo de HércuIT: cabeza de pitbull azul con un circuito en la frente",
    homeLinkLabel: "HércuIT, ir a la página de inicio"
  },
  nav: {
    services: { label: "Servicios", id: "servicios" } as NavLink,
    projects: { label: "Proyectos", id: "proyectos" } as NavLink,
    about: { label: "Nosotros", id: "nosotros" } as NavLink,
    contact: { label: "Contáctenos", id: "contacto" } as NavLink
  },
  languageSwitcher: {
    label: "Idioma"
  },
  hero: {
    title: "Excelencia en ingeniería con enfoque en la calidad",
    subtitle: "Desarrollamos aplicaciones, integramos inteligencia artificial y aseguramos la calidad de su software, para que no solo funcione: sobresalga.",
    cta: "Compártanos su idea",
    ctaSupport: "Queremos conocer su idea y ayudarle a hacerla realidad."
  },
  services: {
    title: "Nuestros servicios",
    intro: "De la idea a producción: inteligencia artificial, calidad de software, desarrollo de aplicaciones y capacitación para su equipo.",
    cta: "Platiquemos de esto",
    groupDescriptions: {
      ai: "Le ayudamos a identificar dónde la IA aporta valor, a diseñar la arquitectura correcta y a llevar a producción bots confiables, incluida la atención automatizada por WhatsApp Business.",
      qa: "Nuestra especialidad: pruebas y automatización para apps web, móviles y generadas con IA, para que lleguen a producción sin sorpresas.",
      development: "Construimos su aplicación desde cero, o adaptamos a su negocio una plataforma de reservas probada, como BinKleaner o Nopalito Limpio.",
      training: "Capacitación práctica en IA y QA, y dinámicas de team building pensadas para equipos remotos."
    } as Record<ServiceGroupId, string>
  },
  projects: {
    title: "Proyectos",
    intro: "Plataformas de reservas para servicios a domicilio que diseñamos, construimos y operamos. Podemos crear una para su negocio.",
    visit: "Visitar sitio",
    newTab: "(abre en una pestaña nueva)",
    cta: "Quiero una app así",
    items: {
      binkleaner: {
        description: "Lavado y desinfección de botes de basura a domicilio, con reservas en línea.",
        highlights: [
          "Reservas en línea sin crear cuenta",
          "Servicio completo en aproximadamente 1 hora",
          "Las reservas como invitado se vinculan a una cuenta"
        ],
        imageAlt: "Página de inicio de BinKleaner"
      },
      "nopalito-limpio": {
        description: "Lavandería con recolección y entrega a domicilio.",
        highlights: [
          "Los clientes agendan la recolección e indican cuántas bolsas",
          "Ropa de vuelta en casa en un máximo de 2 días",
          "Las reservas como invitado se vinculan a una cuenta"
        ],
        imageAlt: "Página de inicio de Nopalito Limpio"
      }
    } as Record<ProjectId, ProjectCopy>
  },
  qualityMandate: {
    title: "El Mandato de Calidad HércuIT",
    subtitle: "En el software, la calidad no es una ocurrencia tardía: es la base.",
    points: [
      {
        title: "Auditoría rigurosa",
        description: "Cada línea de código pasa por una estricta revisión entre pares y análisis automatizado."
      },
      {
        title: "Excelencia guiada por pruebas",
        description: "Aplicamos metodologías avanzadas de TDD y BDD para eliminar regresiones antes de que ocurran."
      },
      {
        title: "El rendimiento primero",
        description: "Tiempos de respuesta menores a un segundo y una gestión eficiente de recursos son nuestro estándar."
      }
    ] as [Item, Item, Item]
  },
  about: {
    eyebrow: "Nuestra historia",
    title: "Acerca de HércuIT",
    description: "Con sede en Torreón, Coahuila, HércuIT es una firma de tecnología dedicada a llevar más lejos la ingeniería de software mediante un enfoque riguroso en la calidad y la innovación.",
    stats: [
      { value: "100%", label: "Comprometidos con la calidad" },
      { value: "Torreón", label: "Base de operaciones" }
    ] as [Stat, Stat]
  },
  contact: {
    title: "Hablemos de su proyecto",
    description: "Ya sea una idea con IA, una app nueva, pruebas para su producto o capacitación para su equipo, cuéntenos qué necesita y le responderemos a la brevedad.",
    locationLabel: "Ubicación",
    phoneLabel: "Teléfono",
    callPrefix: "Llámenos al",
    formName: "Nombre completo",
    formEmail: "Correo electrónico",
    service: {
      label: "¿Qué servicio le interesa?",
      placeholder: "Seleccione un servicio",
      groups: {
        ai: "Inteligencia artificial",
        qa: "Calidad de software (QA)",
        development: "Desarrollo",
        training: "Capacitación y equipos"
      },
      options: {
        "ai-consultancy": "Consultoría en IA",
        "ai-architecture": "Arquitectura de soluciones con IA",
        "ai-bot": "Bot con IA",
        "ai-whatsapp-automation": "Automatización de WhatsApp Business con IA",
        "qa-web-app": "QA para aplicaciones web",
        "qa-mobile-app": "QA para aplicaciones móviles",
        "qa-ai-automation": "QA + automatización con IA",
        "qa-ai-generated-app": "QA para apps generadas con IA",
        "new-app": "Nueva aplicación desde cero",
        "app-like-binkleaner": "App de reservas para servicios a domicilio (como BinKleaner o Nopalito Limpio)",
        "ai-training": "Capacitación en IA",
        "qa-training": "Capacitación en QA",
        "other-training": "Otra capacitación",
        "remote-team-building": "Team building para equipos remotos"
      }
    } as { label: string; placeholder: string } & ServiceLabels,
    formMessage: "Su idea",
    placeholders: {
      name: "Juana Pérez",
      email: "juana@empresa.com",
      message: "¿Qué le gustaría construir o mejorar?"
    },
    submit: "Enviar mi idea"
  },
  hercules: {
    open: "Hablar con Hercules",
    heroLink: "o hable con Hercules, nuestro asistente virtual",
    title: "Hercules",
    subtitle: "Asistente virtual de HércuIT",
    greeting: "Hola, soy Hercules, el asistente virtual de HércuIT. ¿En qué le puedo ayudar?",
    quickReplies: ["Conocer los servicios", "Tengo una idea de app", "Necesito QA para mi producto"] as [string, string, string],
    inputLabel: "Escriba su mensaje",
    placeholder: "Escriba su mensaje…",
    send: "Enviar mensaje",
    close: "Cerrar asistente",
    typing: "Hercules está escribiendo…",
    disclaimer: "Asistente virtual con IA. Puede cometer errores.",
    privacyLink: "Aviso de privacidad",
    consentLabel: "Acepto el aviso de privacidad",
    newConversation: "Nueva conversación",
    limitReached: "Esta conversación llegó a su límite. Inicie una nueva para continuar.",
    sent: "¡Listo! Recibimos su solicitud y el equipo de HércuIT le contactará pronto.",
    errors: {
      rateLimited: "Demasiados mensajes en poco tiempo. Espere un momento e intente de nuevo.",
      unavailable: "Hercules no está disponible en este momento.",
      refused: "No puedo ayudar con esa solicitud.",
      invalid: "No pudimos verificar su solicitud. Recargue la página e intente de nuevo.",
      fallback: "Puede llamarnos al"
    }
  },
  privacy: {
    title: "Aviso de Privacidad",
    lawReference: "Conforme a la LFPDPPP y sus Lineamientos · México",
    updated: "Última actualización: 14 de octubre de 2026",
    introduction: "HércuIT, S. de R.L. de C.V. está comprometida con la protección de sus datos personales y el respeto a su derecho a la autodeterminación informativa. El presente Aviso de Privacidad Integral se emite en estricto cumplimiento de las disposiciones de la Ley Federal de Protección de Datos Personales en Posesión de los Particulares (LFPDPPP), su Reglamento y los Lineamientos del Aviso de Privacidad expedidos por el Instituto Nacional de Transparencia, Acceso a la Información y Protección de Datos Personales (INAI).",
    sections: [
      {
        heading: "1. Identidad y domicilio del responsable",
        paragraphs: [
          "HércuIT, S. de R.L. de C.V. (en lo sucesivo denominada «HércuIT»), con domicilio en Torreón, Coahuila, México, es la persona moral responsable del uso, tratamiento y salvaguarda de los datos personales que se recaban a través de su sitio web oficial, de sus formularios en línea y de su asistente virtual interactivo («bot Hercules»).",
          "Para cualquier consulta, aclaración o gestión relativa al tratamiento de sus datos personales o al presente aviso, nuestro Departamento de Privacidad pone a su disposición los siguientes canales de atención oficial:"
        ],
        items: [
          "Razón social: HércuIT, S. de R.L. de C.V.",
          "Nombre comercial: HércuIT",
          "Domicilio físico: Torreón, Coahuila, México",
          "Correo electrónico institucional de contacto: info@hercuit.com",
          "Teléfono de atención: +52 33 1713 3469"
        ]
      },
      {
        heading: "2. Datos personales sometidos a tratamiento",
        paragraphs: [
          "Para atender sus solicitudes y proveer información sobre nuestros servicios tecnológicos, HércuIT recaba las siguientes categorías de datos personales mediante el formulario de contacto o mediante la interacción interactiva con el asistente virtual («bot Hercules»):",
          "Declaración sobre datos sensibles: HércuIT NO solicita, no recaba ni realiza tratamiento alguno sobre datos personales sensibles (tales como origen racial o étnico, estado de salud presente o futuro, información genética, creencias religiosas, filosóficas o morales, afiliación sindical, opiniones políticas o preferencia sexual). Solicitamos atentamente al titular abstenerse de compartir información de esta naturaleza a través de cualquiera de nuestros medios de contacto."
        ],
        items: [
          "Datos de identificación: nombre completo de la persona solicitante o de contacto.",
          "Datos de contacto: dirección de correo electrónico y número de teléfono (fijo o móvil).",
          "Datos laborales y profesionales: nombre de la empresa u organización, sector de actividad económica y cargo o función profesional.",
          "Información del requerimiento y proyecto: descripción técnica del servicio de interés (desarrollo de software, consultoría y pruebas de calidad de software QA, automatización o auditorías técnicas), presupuesto estimado y la transcripción de la conversación sostenida con el asistente interactivo o enviada mediante formulario."
        ]
      },
      {
        heading: "3. Finalidades del tratamiento (necesarias y secundarias)",
        paragraphs: [
          "El tratamiento de los datos personales recabados se sujeta a finalidades legítimas y delimitadas, distinguiendo con claridad aquellas que resultan indispensables para atender la relación jurídica respecto de aquellas accesorias o voluntarias:",
          "Finalidades primarias o necesarias (aquellas que dan origen y son indispensables para la existencia, mantenimiento y cumplimiento de la relación y atención solicitada):",
          "Finalidades secundarias o voluntarias (aquellas que no son necesarias para la relación jurídica principal, pero que nos permiten brindarle una mejor atención comercial y técnica):",
          "Mecanismo para manifestar la negativa a finalidades secundarias: El titular que no desee que sus datos personales sean tratados para las finalidades secundarias antes señaladas puede manifestar su negativa en cualquier momento enviando un correo electrónico a info@hercuit.com indicando en el asunto «Negativa para finalidades secundarias». La negativa para el uso de sus datos personales para estas finalidades accesorias no será motivo para que le neguemos los servicios o la atención que solicite."
        ],
        items: [
          "Atender, procesar y dar puntual seguimiento a solicitudes de información, cotizaciones o propuestas de desarrollo de software y aseguramiento de calidad (QA).",
          "Gestionar la interacción en tiempo real mediante el asistente virtual interactivo (bot Hercules) y compilar el resumen del requerimiento para su atención técnica.",
          "Establecer comunicación directa por el medio de contacto indicado por el titular (correo electrónico, llamada telefónica o WhatsApp) para brindar seguimiento personalizado.",
          "Elaborar presupuestos, propuestas comerciales y formalizar acuerdos contractuales de prestación de servicios tecnológicos.",
          "Envío de comunicaciones sobre novedades tecnológicas, publicaciones técnicas de blog o actualizaciones sobre la oferta de servicios de HércuIT.",
          "Aplicación de encuestas de satisfacción, evaluación de calidad y retroalimentación respecto a la experiencia en nuestro sitio y servicios."
        ]
      },
      {
        heading: "4. Mecanismo de captura, almacenamiento y reporte por correo electrónico",
        paragraphs: [
          "En observancia de los principios de licitud, proporcionalidad y responsabilidad de la LFPDPPP, informamos de manera transparente los mecanismos técnicos mediante los cuales se procesan y almacenan sus datos personales:",
          "Una vez que el titular revisa el resumen de su solicitud, acepta el presente aviso de privacidad y confirma explícitamente el envío, los datos de contacto y el resumen de la consulta se transmiten directamente vía correo electrónico seguro a la cuenta de correo institucional de HércuIT (info@hercuit.com). La gestión y seguimiento de la solicitud se realiza exclusivamente dentro de dicha cuenta de correo electrónico institucional, implementando estrictas medidas administrativas, técnicas y físicas de seguridad para proteger su información contra pérdida, acceso no autorizado o divulgación indebida."
        ],
        items: [
          "Captura interactiva o por formulario: Los datos se recaban a través del formulario de contacto o durante el diálogo interactivo con el asistente virtual («bot Hercules»).",
          "Ausencia de almacenamiento en bases de datos del servidor web: HércuIT no almacena ni conserva los datos personales ni las conversaciones en bases de datos persistentes del servidor web ni en sistemas de almacenamiento en la nube accesibles al público.",
          "Almacenamiento temporal en sesión: La interacción con el asistente Hercules utiliza únicamente memoria temporal del navegador web del usuario (sessionStorage), la cual se descarta automáticamente al cerrar la pestaña o la ventana de navegación.",
          "Transmisión por correo institucional: La información recabada se consolida y envía únicamente mediante correo electrónico hacia info@hercuit.com tras la confirmación expresa del titular."
        ]
      },
      {
        heading: "5. Opciones y medios para limitar el uso o divulgación de los datos",
        paragraphs: [
          "Con el compromiso de permitir al titular controlar la exposición de sus datos personales y limitar su uso para finalidades no indispensables, HércuIT ofrece los siguientes mecanismos específicos:"
        ],
        items: [
          "Lista de exclusión interna de HércuIT: El titular puede solicitar de forma gratuita y en cualquier momento su inscripción en nuestra lista interna de exclusión enviando un correo a info@hercuit.com, con el fin de evitar que sus datos sean utilizados con fines promocionales, publicitarios o de prospección comercial.",
          "Registro Público para Evitar Publicidad (REPEP): Conforme a la Ley Federal de Protección al Consumidor, el titular puede inscribirse en el REPEP a cargo de la Procuraduría Federal del Consumidor (PROFECO), para evitar llamadas o mensajes comerciales."
        ]
      },
      {
        heading: "6. Medios y procedimiento para ejercer los derechos ARCO y revocación del consentimiento",
        paragraphs: [
          "De conformidad con la LFPDPPP, el titular de los datos personales (o su representante legal debidamente acreditado) tiene el derecho de Acceder a los datos que poseemos y a los detalles de su tratamiento (Acceso); solicitar la corrección de su información en caso de ser inexacta, incompleta o desactualizada (Rectificación); requerir que se cancele o elimine de nuestras cuentas de correo y archivos cuando considere que no se ajusta a los principios legales aplicables (Cancelación); así como Oponerse al tratamiento de los mismos para finalidades determinadas (Oposición). Estos derechos se denominan colectivamente Derechos ARCO.",
          "Asimismo, el titular puede revocar en cualquier momento el consentimiento que hubiere otorgado a HércuIT para el tratamiento de sus datos personales.",
          "Procedimiento, plazos y requisitos para el ejercicio de los Derechos ARCO y Revocación (conforme a los artículos 29, 31 y 32 de la LFPDPPP):"
        ],
        items: [
          "Canal de recepción de solicitudes: El titular debe enviar una solicitud por escrito dirigida al Departamento de Privacidad de HércuIT a la dirección de correo electrónico: info@hercuit.com.",
          "Acreditación de identidad: Adjuntar copia digitalizada de identificación oficial vigente (INE, pasaporte o cédula profesional) o, tratándose de apoderado o representante legal, documento público o carta poder firmada ante dos testigos acompañada de las identificaciones correspondientes.",
          "Información de localización y contacto: Proporcionar el nombre completo del titular, número telefónico y la cuenta de correo electrónico en la que autoriza recibir las comunicaciones relativas a su solicitud.",
          "Descripción precisa del derecho que busca ejercer: Indicar con claridad el derecho que solicita (Acceso, Rectificación, Cancelación, Oposición o Revocación) y los datos respecto de los cuales versa la petición.",
          "Documentación probatoria para rectificación: Si solicita la rectificación de datos personales, aportar la documentación que sustente la corrección deseada.",
          "Plazo de determinación y respuesta: HércuIT comunicará al titular la resolución adoptada en un plazo máximo de 20 (veinte) días hábiles, contados a partir de la fecha en que se recibió de manera formal y completa la solicitud.",
          "Plazo para hacer efectiva la determinación: En caso de resultar procedente, la determinación se hará efectiva dentro de los 15 (quince) días hábiles siguientes a la fecha en que se comunique la respuesta al titular. Dichos plazos podrán ampliarse por una sola ocasión por un periodo igual cuando medien circunstancias justificadas conforme a la ley.",
          "Gratuidad del trámite: El trámite y la expedición de respuestas a solicitudes de Derechos ARCO y revocación son completamente gratuitos, realizándose de forma electrónica a través de la cuenta de correo electrónico designada por el titular."
        ]
      },
      {
        heading: "7. Transferencias de datos personales y terceros encargados",
        paragraphs: [
          "HércuIT NO vende, no alquila, no comercializa ni transfiere sus datos personales a terceros ajenos a la relación con el titular.",
          "Con la finalidad exclusiva de operar la infraestructura digital del sitio web, brindar seguridad técnica y permitir la funcionalidad del asistente interactivo, se realizan remisiones tecnológicas a proveedores que actúan como encargados bajo instrucciones estrictas de confidencialidad y seguridad de HércuIT:",
          "Dichas remisiones y transferencias se encuentran exceptuadas de la exigencia de consentimiento en términos del artículo 37 de la LFPDPPP (fracciones IV y VII), toda vez que resultan indispensables para el mantenimiento y cumplimiento de la relación solicitada por el propio titular y para la prestación de los servicios tecnológicos de la firma."
        ],
        items: [
          "Infraestructura de nube y seguridad perimetral (Cloudflare, Inc.): Proveedor encargado de la mitigación de ataques informáticos, verificación de peticiones y enrutamiento seguro de correo electrónico hacia info@hercuit.com.",
          "Procesamiento de inteligencia artificial (Anthropic, PBC): Proveedor del modelo de lenguaje que procesa en tiempo real los mensajes del asistente interactivo Hercules para generar las respuestas de orientación en el sitio. De conformidad con sus políticas comerciales para servicios API, Anthropic no utiliza los datos ni el texto de las conversaciones para entrenar sus modelos de inteligencia artificial."
        ]
      },
      {
        heading: "8. Uso de cookies y mecanismos tecnológicos",
        paragraphs: [
          "HércuIT informa que en su sitio web se utilizan únicamente elementos técnicos y de almacenamiento temporal necesarios para la correcta navegación y la protección contra accesos maliciosos:"
        ],
        items: [
          "No se emplean cookies de rastreo publicitario de terceros ni herramientas de monitoreo conductual para la elaboración de perfiles comerciales.",
          "El asistente virtual Hercules utiliza almacenamiento de sesión (sessionStorage) exclusivamente durante la visita activa del usuario en el navegador.",
          "El usuario tiene la facultad de desactivar, limitar o eliminar las cookies y el almacenamiento web mediante las opciones de configuración de su navegador de internet, sin perjuicio de continuar consultando el contenido informativo de la plataforma."
        ]
      },
      {
        heading: "9. Procedimiento para cambios al aviso de privacidad",
        paragraphs: [
          "HércuIT se reserva el derecho de efectuar en cualquier momento modificaciones, adiciones o actualizaciones al presente aviso de privacidad, motivadas por cambios legislativos, jurisprudenciales, requerimientos regulatorios, políticas internas o modificaciones en la oferta de servicios tecnológicos.",
          "Cualquier modificación o actualización a este aviso de privacidad será publicada de forma íntegra y oportuna en nuestro portal de internet, manteniéndose disponible para consulta pública en las siguientes direcciones web permanentes:"
        ],
        items: [
          "Versión en idioma español: https://hercuit.com/aviso-de-privacidad",
          "Versión en idioma inglés: https://hercuit.com/en/privacy-notice"
        ]
      }
    ] as { heading: string; paragraphs: string[]; items: string[] }[],
    simplifiedNotice: {
      heading: "10. Avisos de privacidad simplificado y corto (formatos alternativos)",
      subheading: "Formatos aplicables en canales de espacio limitado conforme a los Lineamientos del INAI",
      paragraphs: [
        "En cumplimiento de los Lineamientos Vigésimo Séptimo a Trigésimo Primero expedidos por el INAI, cuando la captura de datos se efectúe en espacios reducidos, interfaces móviles o mediante el asistente interactivo («bot Hercules»), se pone a disposición del titular el formato de Aviso de Privacidad Simplificado:",
        "«HércuIT, S. de R.L. de C.V., con domicilio en Torreón, Coahuila, México, es responsable del tratamiento de los datos personales de identificación, contacto y requerimientos que usted proporciona mediante este medio. Sus datos se utilizarán para la atención de sus consultas, elaboración de propuestas de servicios de software y calidad, y orientación mediante nuestro asistente interactivo, consolidando su solicitud para su envío directo por correo electrónico institucional a info@hercuit.com, sin almacenamiento en bases de datos del servidor web. Usted puede manifestar su negativa para finalidades secundarias o ejercer sus derechos ARCO enviando un correo a info@hercuit.com. El aviso de privacidad integral se encuentra disponible en: https://hercuit.com/aviso-de-privacidad».",
        "Asimismo, en la casilla de verificación de consentimiento (checkbox) desplegada por el asistente virtual y en formularios breves, se emplea el formato de Aviso de Privacidad Corto:",
        "«Acepto el aviso de privacidad para el tratamiento y reporte de mis datos por correo electrónico conforme a los términos disponibles en hercuit.com/aviso-de-privacidad»."
      ]
    }
  },
  footer: {
    rights: "Todos los derechos reservados."
  }
};

export type Dictionary = typeof es;
