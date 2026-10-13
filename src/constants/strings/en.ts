import type { Dictionary } from './es';

/** English. `satisfies Dictionary` turns any missing, extra or mis-sized entry into a type error. */
export const en = {
  meta: {
    title: "HércuIT · Quality-First Software House",
    description: "Custom software development and software quality consultancy from Torreón, Coahuila."
  },
  tagline: "Quality-First Software House",
  brand: {
    markLabel: "HércuIT logo: a blue pitbull head with a circuit trace on its forehead",
    homeLinkLabel: "HércuIT, go to home page"
  },
  nav: {
    services: { label: "Services", id: "services" },
    about: { label: "About", id: "about" },
    contact: { label: "Contact Us", id: "contact" },
    menuLabel: "Open menu"
  },
  languageSwitcher: {
    label: "Language"
  },
  hero: {
    title: "Engineering Excellence with a Focus on Quality",
    subtitle: "We build custom software, mobile applications, and e-commerce solutions that don't just work—they excel.",
    cta: "Share your idea",
    ctaSupport: "We want to hear your idea and help make it happen."
  },
  services: {
    title: "Our Specialized Services",
    softwareDevelopment: {
      title: "Custom Software Development",
      description: "Tailor-made solutions designed to scale and perform."
    },
    qualityConsultancy: {
      title: "Software Quality Consultancy",
      description: "Our core specialty. We provide SQA audits, CI/CD pipeline optimization, automated testing strategies, and performance engineering to guarantee mission-critical reliability."
    },
    mobileApps: {
      title: "Mobile App Engineering",
      description: "Native and cross-platform apps with a focus on user experience and reliability."
    },
    ecommerce: {
      title: "E-commerce Solutions",
      description: "Modern, secure, and high-converting digital storefronts."
    }
  },
  qualityMandate: {
    title: "The HércuIT Quality Mandate",
    subtitle: "In software, quality isn't an afterthought—it's the foundation.",
    points: [
      {
        title: "Rigorous Auditing",
        description: "Every line of code undergoes strict peer review and automated analysis."
      },
      {
        title: "Test-Driven Excellence",
        description: "We employ advanced TDD and BDD methodologies to eliminate regressions before they happen."
      },
      {
        title: "Performance First",
        description: "Sub-second response times and efficient resource management are our standard."
      }
    ]
  },
  about: {
    eyebrow: "Our Story",
    title: "About HércuIT",
    description: "Based in Torreón, Coahuila, HércuIT is a technology firm dedicated to pushing the boundaries of software engineering through a rigorous focus on quality and innovation.",
    stats: [
      { value: "100%", label: "Quality Committed" },
      { value: "Torreón", label: "Base of Operations" }
    ]
  },
  contact: {
    title: "Start Your Quality Journey",
    description: "Ready to elevate your software quality or start a new engineering project? Let's discuss how HércuIT can help.",
    locationLabel: "Location",
    formName: "Full name",
    formEmail: "Email",
    formMessage: "Your idea",
    placeholders: {
      name: "Jane Doe",
      email: "jane@company.com",
      message: "What would you like to build or improve?"
    },
    submit: "Send my idea"
  },
  footer: {
    rights: "All rights reserved."
  }
} satisfies Dictionary;
