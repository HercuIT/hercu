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
    draftNotice: "BORRADOR: este aviso está pendiente de revisión legal y no es definitivo.",
    updated: "Última actualización: 14 de octubre de 2026",
    sections: [
      {
        heading: "Responsable",
        body: "HércuIT, S. de R.L. de C.V., con domicilio en Torreón, Coahuila, México, es responsable del tratamiento de sus datos personales."
      },
      {
        heading: "Datos que recabamos",
        body: "Nombre, correo electrónico y, si usted lo proporciona, teléfono, empresa y el contenido de su conversación con nuestro asistente virtual Hercules o del formulario de contacto. No solicitamos datos sensibles."
      },
      {
        heading: "Finalidad",
        body: "Atender su solicitud de información o cotización y contactarle por el medio que usted elija."
      },
      {
        heading: "Encargados y transferencias",
        body: "Las respuestas de Hercules se generan con un proveedor de inteligencia artificial (Anthropic), que procesa el texto de la conversación por cuenta de HércuIT. No vendemos ni compartimos sus datos con fines comerciales."
      },
      {
        heading: "Conservación",
        body: "La conversación no se almacena en nuestros servidores: solo se envía por correo electrónico al equipo de HércuIT cuando usted confirma su solicitud."
      },
      {
        heading: "Derechos ARCO",
        body: "Puede ejercer sus derechos de acceso, rectificación, cancelación u oposición, o revocar su consentimiento, escribiendo a info@hercuit.com."
      }
    ] as { heading: string; body: string }[]
  },
  footer: {
    rights: "Todos los derechos reservados."
  }
};

export type Dictionary = typeof es;
