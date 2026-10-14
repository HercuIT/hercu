type Item = { title: string; description: string };
type Stat = { value: string; label: string };
type NavLink = { label: string; id: string };

/** Spanish (default locale). Its shape defines `Dictionary`; every other locale must match it. */
export const es = {
  meta: {
    title: "HércuIT · Desarrollo de software con enfoque en calidad",
    description: "Desarrollo de software a la medida y consultoría en calidad de software desde Torreón, Coahuila."
  },
  tagline: "Casa de software con la calidad primero",
  brand: {
    markLabel: "Logotipo de HércuIT: cabeza de pitbull azul con un circuito en la frente",
    homeLinkLabel: "HércuIT, ir a la página de inicio"
  },
  nav: {
    services: { label: "Servicios", id: "servicios" } as NavLink,
    about: { label: "Nosotros", id: "nosotros" } as NavLink,
    contact: { label: "Contáctenos", id: "contacto" } as NavLink
  },
  languageSwitcher: {
    label: "Idioma"
  },
  hero: {
    title: "Excelencia en ingeniería con enfoque en la calidad",
    subtitle: "Desarrollamos software a la medida, aplicaciones móviles y soluciones de comercio electrónico que no solo funcionan: sobresalen.",
    cta: "Compártanos su idea",
    ctaSupport: "Queremos conocer su idea y ayudarle a hacerla realidad."
  },
  services: {
    title: "Nuestros servicios especializados",
    softwareDevelopment: {
      title: "Desarrollo de software a la medida",
      description: "Soluciones hechas a la medida, diseñadas para escalar y rendir."
    } as Item,
    qualityConsultancy: {
      title: "Consultoría en calidad de software",
      description: "Nuestra especialidad principal. Realizamos auditorías de SQA, optimización de pipelines de CI/CD, estrategias de pruebas automatizadas e ingeniería de rendimiento para garantizar la confiabilidad de sistemas críticos."
    } as Item,
    mobileApps: {
      title: "Ingeniería de aplicaciones móviles",
      description: "Apps nativas y multiplataforma enfocadas en la experiencia de usuario y la confiabilidad."
    } as Item,
    ecommerce: {
      title: "Soluciones de comercio electrónico",
      description: "Tiendas en línea modernas, seguras y de alta conversión."
    } as Item
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
    title: "Comience su camino hacia la calidad",
    description: "¿Listo para elevar la calidad de su software o iniciar un nuevo proyecto de ingeniería? Conversemos sobre cómo HércuIT puede ayudarle.",
    locationLabel: "Ubicación",
    formName: "Nombre completo",
    formEmail: "Correo electrónico",
    formMessage: "Su idea",
    placeholders: {
      name: "Juana Pérez",
      email: "juana@empresa.com",
      message: "¿Qué le gustaría construir o mejorar?"
    },
    submit: "Enviar mi idea"
  },
  footer: {
    rights: "Todos los derechos reservados."
  }
};

export type Dictionary = typeof es;
