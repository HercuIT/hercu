import type { Dictionary } from './es';

/** The consent sentence for the chat checkbox and the short privacy notice (see es.ts). */
const CONSENT_LABEL =
  "I accept the privacy notice for the processing and reporting of my data via email pursuant to the terms available at hercuit.com/en/privacy-notice";

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
          "Customers schedule a pickup and say how many bags",
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
    whatsappLabel: "WhatsApp",
    whatsappCta: "Message us on WhatsApp",
    whatsappAria: { prefix: "Message us on WhatsApp at", suffix: "(opens in a new tab)" },
    whatsappMessage: "Hello, HércuIT. I'd like information about your services.",
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
  hercules: {
    open: "Chat with Hercules",
    heroLink: "or chat with Hercules, our virtual assistant",
    title: "Hercules",
    subtitle: "HércuIT's virtual assistant",
    greeting: "Hi, I'm Hercules, HércuIT's virtual assistant. How can I help you?",
    quickReplies: ["Explore the services", "I have an app idea", "I need QA for my product"],
    inputLabel: "Type your message",
    placeholder: "Type your message…",
    send: "Send message",
    close: "Close assistant",
    typing: "Hercules is typing…",
    disclaimer: "AI virtual assistant. It can make mistakes.",
    privacyLink: "Privacy notice",
    opensNewTab: "(opens in a new tab)",
    consentLabel: CONSENT_LABEL,
    newConversation: "New conversation",
    limitReached: "This conversation has reached its limit. Start a new one to continue.",
    sent: "Done! We received your request and the HércuIT team will contact you soon.",
    errors: {
      rateLimited: "Too many messages in a short time. Please wait a moment and try again.",
      unavailable: "Hercules is not available right now.",
      refused: "I can't help with that request.",
      invalid: "We couldn't verify your request. Please reload the page and try again.",
      fallback: "You can call us at"
    }
  },
  privacy: {
    title: "Privacy Notice",
    lawReference: "Pursuant to Mexico's LFPDPPP and Guidelines",
    updated: "Last updated: October 14, 2026",
    introduction: "HércuIT, S. de R.L. de C.V. is committed to protecting your personal data and respecting your right to informational self-determination. This Comprehensive Privacy Notice is issued in strict compliance with the provisions of Mexico's Federal Law on Protection of Personal Data Held by Private Parties (LFPDPPP), its Regulations, and the Privacy Notice Guidelines issued by the National Institute for Transparency, Access to Information and Personal Data Protection (INAI).",
    // Ordered content: a string is a paragraph, a string[] is a bulleted list right after its lead-in.
    sections: [
      {
        heading: "1. Identity and address of the data controller",
        blocks: [
          "HércuIT, S. de R.L. de C.V. (hereinafter commercially referred to as \"HércuIT\"), with physical address in Torreón, Coahuila, Mexico, is the legal entity responsible for the use, processing, and safeguarding of personal data collected through its official website, online forms, and interactive virtual assistant (\"Hercules bot\").",
          "For any inquiry, clarification, or request regarding the processing of your personal data or this notice, our Privacy Department provides the following official contact channels:",
          [
            "Corporate name: HércuIT, S. de R.L. de C.V.",
            "Commercial name: HércuIT",
            "Physical address: Torreón, Coahuila, Mexico",
            "Official privacy email: info@hercuit.com",
            "Contact telephone: +52 33 1713 3469"
          ]
        ]
      },
      {
        heading: "2. Personal data subject to processing",
        blocks: [
          "To address your inquiries and provide information regarding our technology services, HércuIT collects the following categories of personal data via the contact form or through interactive dialogue with our virtual assistant (\"Hercules bot\"):",
          [
            "Identification data: full name of the requester or contact person.",
            "Contact data: email address and telephone number (landline or mobile).",
            "Employment and corporate data: company or organization name, business sector, and job title or function.",
            "Project and inquiry information: technical description of the services of interest (custom software development, software quality assurance consultancy and testing, automation, or technical audits), estimated budget, and the transcript of messages exchanged with the virtual assistant or submitted via contact forms."
          ],
          "Express statement regarding sensitive data: HércuIT does NOT request, collect, or process any personal data classified as sensitive under the LFPDPPP (such as racial or ethnic origin, present or future health status, genetic information, religious, philosophical, or moral beliefs, union membership, political opinions, or sexual preference). We kindly request data subjects to refrain from sharing information of this nature through any of our contact channels."
        ]
      },
      {
        heading: "3. Purposes of personal data processing (necessary and secondary)",
        blocks: [
          "The processing of personal data collected is subject to legitimate, well-defined purposes, clearly distinguishing those essential to the legal relationship from voluntary or secondary purposes:",
          "Primary or necessary purposes (those that give rise to and are indispensable for the existence, maintenance, and fulfillment of the relationship and requested assistance):",
          [
            "Receive, process, and promptly follow up on requests for information, quotes, or proposals for software development and quality assurance (QA) services.",
            "Manage real-time interaction through the interactive virtual assistant (Hercules bot) and compile technical project summaries for engineering evaluation.",
            "Establish direct communication via the channel chosen by the data subject (email, phone call, or WhatsApp) to provide personalized follow-up.",
            "Prepare budgets, commercial proposals, and formalize service agreements or contracts for technology solutions."
          ],
          "Secondary or voluntary purposes (those not essential to the main legal relationship, but which allow us to provide improved commercial and technical service):",
          [
            "Send informational communications regarding technology updates, technical engineering blog posts, or updates regarding HércuIT's service offerings.",
            "Conduct voluntary surveys regarding customer satisfaction, quality evaluation, and user experience with our platform and services."
          ],
          "Mechanism to refuse secondary purposes: Any data subject who does not wish their personal data to be processed for the aforementioned secondary purposes may manifest their refusal at any time by sending an email to info@hercuit.com with the subject line \"Refusal of secondary purposes\". Refusal to allow the use of your personal data for secondary purposes will not be a ground to deny you the services or assistance requested."
        ]
      },
      {
        heading: "4. Capture mechanism, storage, and reporting by email",
        blocks: [
          "In adherence to the principles of legality, proportionality, and accountability under the LFPDPPP, we transparently disclose the technical mechanisms through which your personal data is processed and stored:",
          [
            "Interactive or form-based capture: Data is collected when entered into the contact form or during interactive conversation with our virtual assistant (\"Hercules bot\").",
            "No persistent web server database storage: HércuIT does not store or keep personal data or conversation transcripts in persistent web server databases or publicly accessible cloud repositories.",
            "Temporary session storage: Interaction with the Hercules assistant uses only temporary browser memory (sessionStorage), which is automatically discarded upon closing the browser tab or window.",
            "Transmission via email: Collected information is consolidated and dispatched solely via an email sent from the corporate address info@hercuit.com to HércuIT's inbox hosted on Gmail (Google LLC), upon express confirmation from the data subject."
          ],
          "Once the data subject reviews the summary of their request, accepts this privacy notice, and explicitly confirms submission, the contact information and consultation summary are transmitted directly via secure email, sent from HércuIT's corporate address (info@hercuit.com), to HércuIT's inbox hosted on Google LLC's Gmail service. Management and follow-up are handled exclusively within this inbox, protected by rigorous administrative, technical, and physical security measures to safeguard your information against loss, unauthorized access, or unlawful disclosure."
        ]
      },
      {
        heading: "5. Options and means to limit the use or disclosure of data",
        blocks: [
          "To enable data subjects to limit the exposure of their personal data and restrict its use for non-essential purposes, HércuIT provides the following specific mechanisms:",
          [
            "HércuIT internal exclusion list: Data subjects may request free registration on our internal exclusion list by emailing info@hercuit.com, ensuring their data is not used for advertising, promotional, or commercial prospecting purposes.",
            "Public Registry to Avoid Advertising (REPEP): In accordance with the Federal Consumer Protection Law, data subjects may register with PROFECO's REPEP to prevent unsolicited marketing calls and promotional communications."
          ]
        ]
      },
      {
        heading: "6. Means and procedure for exercising ARCO rights and revocation of consent",
        blocks: [
          "Pursuant to the LFPDPPP, data subjects (or their duly accredited legal representatives) have the right to Access the personal data we hold and the details of its processing (Access); request the correction of personal information if it is outdated, inaccurate, or incomplete (Rectification); request deletion from our email records and files when deemed not to comply with applicable legal principles (Cancellation); as well as Object to processing for specific purposes (Opposition). These rights are collectively referred to as ARCO Rights.",
          "Additionally, data subjects may revoke their consent for the processing of their personal data at any time.",
          "Procedure, timeframes, and requirements for exercising ARCO Rights and Revocation (pursuant to Articles 29, 31, and 32 of the LFPDPPP):",
          [
            "Request reception channel: Submit a written request via email addressed to HércuIT's Privacy Department at: info@hercuit.com.",
            "Identity verification: Attach a digital copy of valid official identification (INE voter ID, passport, or professional license) or, if acting through a legal representative, a notarized power of attorney or proxy letter signed before two witnesses with attached IDs.",
            "Contact and notification details: Provide the full name of the data subject, telephone number, and the email address designated to receive official communications regarding the request.",
            "Clear description of the right exercised: Clearly specify the right being exercised (Access, Rectification, Cancellation, Opposition, or Revocation) and the specific personal data concerned.",
            "Supporting documentation for rectification: When requesting rectification, specify the changes requested and provide supporting documentation justifying the update.",
            "Resolution and response timeframe: HércuIT will communicate the determination reached within a maximum timeframe of 20 (twenty) business days from the date the complete request was formally received.",
            "Implementation timeframe: If the request is determined to be substantiated, it will become effective within 15 (fifteen) business days following notification of the response. These timeframes may be extended once for an equal period where justified under the law.",
            "Gratuitous nature of the procedure: The processing and issuance of responses to ARCO and revocation requests are entirely free of charge, delivered electronically to the email address designated by the data subject."
          ]
        ]
      },
      {
        heading: "7. Personal data transfers and third-party processors",
        blocks: [
          "HércuIT does NOT sell, rent, commercialize, or transfer your personal data to third parties unrelated to the relationship with the data subject.",
          "Solely to operate the digital infrastructure of our website, provide technical security, and deliver interactive assistant capabilities, technological remittances are conducted with providers acting as processors under strict confidentiality and security instructions from HércuIT:",
          [
            "Cloud infrastructure and perimeter security (Cloudflare, Inc.): Provider responsible for mitigating cyberattacks, validating request integrity, sending requests from info@hercuit.com, and securely forwarding emails addressed to info@hercuit.com.",
            "Email hosting (Google LLC, Gmail service): Provider of the inbox where HércuIT receives, manages, and follows up on requests sent through the Hercules assistant and on emails addressed to info@hercuit.com.",
            "Artificial intelligence processing (Anthropic, PBC): Provider of the language model that processes interactive messages with the Hercules assistant in real time to generate conversational guidance. In accordance with its commercial API service terms, Anthropic does not use customer conversational data to train AI models."
          ],
          "These remittances and transfers are exempt from requiring express consent under Article 37 of the LFPDPPP (sections IV and VII), as they are legally indispensable for the maintenance and fulfillment of the relationship requested by the data subject and for delivering our firm's technology services."
        ]
      },
      {
        heading: "8. Use of cookies and technological mechanisms",
        blocks: [
          "HércuIT informs you that our website uses strictly necessary technical elements and temporary storage to ensure proper site browsing and protect against unauthorized access:",
          [
            "No third-party advertising cookies or behavioral tracking tools are used to construct commercial consumer profiles.",
            "The Hercules virtual assistant uses browser session storage (sessionStorage) solely during the user's active browsing session.",
            "Users have the option to disable, restrict, or clear cookies and local web storage through their browser settings, without hindering access to the informative content of our website."
          ]
        ]
      },
      {
        heading: "9. Procedure for changes to the privacy notice",
        blocks: [
          "HércuIT reserves the right to make modifications, additions, or updates to this privacy notice at any time to address legislative or case law reforms, regulatory requirements, internal policies, or changes in our technology service offerings.",
          "Any modification or update to this privacy notice will be promptly and fully published on our official website, remaining available for public consultation at the following permanent web addresses:",
          [
            "Spanish version: https://hercuit.com/aviso-de-privacidad",
            "English version: https://hercuit.com/en/privacy-notice"
          ]
        ]
      }
    ],
    simplifiedNotice: {
      heading: "10. Simplified and short privacy notices (alternative formats)",
      subheading: "Formats applicable to space-constrained channels pursuant to INAI Guidelines",
      paragraphs: [
        "Pursuant to Guidelines 27 through 31 issued by the INAI, when personal data collection occurs within space-constrained channels, mobile interfaces, or through our interactive assistant (\"Hercules bot\"), the Simplified Privacy Notice format is made available:",
        "\"HércuIT, S. de R.L. de C.V., based in Torreón, Coahuila, Mexico, is responsible for processing the identification, contact, and project requirements data you provide through this medium. Your data will be used to respond to your inquiries, prepare software and quality assurance proposals, and provide guidance via our interactive assistant, consolidating your request for direct transmission via email, from info@hercuit.com, to HércuIT's inbox hosted on Gmail (Google LLC), without persistent database storage on web servers. You may state your refusal for secondary purposes or exercise your ARCO rights by emailing info@hercuit.com. The comprehensive privacy notice is available at: https://hercuit.com/en/privacy-notice\".",
        "Furthermore, within the consent checkbox displayed by the virtual assistant and in brief forms, the Short Privacy Notice format is utilized:",
        `"${CONSENT_LABEL}".`
      ]
    }
  },
  footer: {
    rights: "All rights reserved."
  }
} satisfies Dictionary;
