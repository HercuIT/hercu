import type { Dictionary } from './es';

/** English. `satisfies Dictionary` turns any missing, extra or mis-sized entry into a type error. */
export const en = {
  meta: {
    title: "HércuIT · Software Development, AI & QA",
    description: "App development, AI and AI-powered WhatsApp automation, QA and team training, from Torreón, Coahuila."
  },
  tagline: "Quality-First Software House",
  brand: {
    markLabel: "HércuIT logo: a blue pitbull head with a circuit trace on its forehead",
    homeLinkLabel: "HércuIT, go to home page"
  },
  nav: {
    services: { label: "Services", id: "services" },
    projects: { label: "Projects", id: "projects" },
    about: { label: "About", id: "about" },
    contact: { label: "Contact Us", id: "contact" }
  },
  languageSwitcher: {
    label: "Language"
  },
  hero: {
    title: "Engineering Excellence with a Focus on Quality",
    subtitle: "We build apps, put AI to work and assure the quality of your software, so it doesn't just work: it excels.",
    cta: "Share your idea",
    ctaSupport: "We want to hear your idea and help make it happen."
  },
  services: {
    title: "Our Services",
    intro: "From idea to production: artificial intelligence, software quality, app development and training for your team.",
    cta: "Let's talk about this",
    groupDescriptions: {
      ai: "We help you find where AI adds value, design the right architecture and take reliable bots to production, including automated customer service on WhatsApp Business.",
      qa: "Our specialty: testing and automation for web, mobile and AI-generated apps, so they reach production without surprises.",
      development: "We build your app from scratch, or adapt a proven booking platform, like BinKleaner or Nopalito Limpio, to your business.",
      training: "Hands-on AI and QA training, plus team building designed for remote teams."
    }
  },
  projects: {
    title: "Projects",
    intro: "Booking platforms for home services that we designed, built and run. We can build one for your business.",
    visit: "Visit site",
    newTab: "(opens in a new tab)",
    cta: "I want an app like this",
    items: {
      binkleaner: {
        description: "Home trash-bin washing and disinfection, booked online.",
        highlights: [
          "Online booking, no account needed",
          "Service done in about 1 hour",
          "Guest bookings can be linked to an account"
        ],
        imageAlt: "BinKleaner home page"
      },
      "nopalito-limpio": {
        description: "Laundry with home pickup and delivery.",
        highlights: [
          "Schedule a pickup and say how many bags",
          "Clothes back home within 2 days",
          "Guest bookings can be linked to an account"
        ],
        imageAlt: "Nopalito Limpio home page"
      }
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
    title: "Let's talk about your project",
    description: "Whether it's an AI idea, a new app, testing for your product or training for your team, tell us what you need and we'll get back to you shortly.",
    locationLabel: "Location",
    phoneLabel: "Phone",
    callPrefix: "Call us at",
    formName: "Full name",
    formEmail: "Email",
    service: {
      label: "Which service are you interested in?",
      placeholder: "Select a service",
      groups: {
        ai: "Artificial intelligence",
        qa: "Software quality (QA)",
        development: "Development",
        training: "Training & teams"
      },
      options: {
        "ai-consultancy": "AI Consultancy",
        "ai-architecture": "AI Architecture",
        "ai-bot": "AI Bot",
        "ai-whatsapp-automation": "WhatsApp Business Automation with AI",
        "qa-web-app": "QA for Web Apps",
        "qa-mobile-app": "QA for Mobile Apps",
        "qa-ai-automation": "QA + AI Automation",
        "qa-ai-generated-app": "QA for AI-Generated Apps",
        "new-app": "New App from Scratch",
        "app-like-binkleaner": "Booking App for Home Services (like BinKleaner or Nopalito Limpio)",
        "ai-training": "AI Training",
        "qa-training": "QA Training",
        "other-training": "Other Training",
        "remote-team-building": "Team Building for Remote Teams"
      }
    },
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
