# Website Implementation Plan: Hércuit, S. de R.L. de C.V.

> **Status (October 2026):** this is the original planning document, kept for reference. It has
> been implemented, with these differences. For the current state, see [README.md](README.md) and
> [GEMINI.md](GEMINI.md).
> - The brand is spelled **HércuIT**.
> - E-commerce was removed from the services. The offer is now AI (including WhatsApp Business
>   automation and AI data extraction with automated Excel/CSV reports and dashboards), software
>   quality (QA), app development, and training.
> - The site is bilingual (Spanish at `/`, English at `/en/`) and hosted on Cloudflare Workers.
> - It includes **Hércules**, an AI assistant that sends leads by email.

## 1. Project Overview
Planning a professional, informative website for **Hércuit**, a technology solutions firm based in Torreón, Coahuila. The site will serve as a digital storefront highlighting their expertise in software development, engineering, and technological consultancy.

## 2. Business Identity (Extracted from Legal Charter)
- **Company Name:** Hércuit, S. de R.L. de C.V.
- **Location:** Torreón, Coahuila, México.
- **Leadership:** 
  - Gloria Jeniffer Ramirez Garcia (Gerente Presidente - Software Engineer)
  - Ariana Jose Soto Fernandez (Gerente Vicepresidente - Software Engineer)
- **Core Value Proposition:** High-tech, multi-disciplinary engineering and consultancy focusing on digital transformation, custom software, and infrastructure, with a **rigorous focus on software quality and reliability.**

## 3. Proposed Sitemap
- **Home:** High-impact hero section emphasizing Hércuit as a premier **Quality-First Software House**. Showcasing custom software development, mobile apps, and e-commerce solutions with built-in excellence.
- **Services (Quality & Development Focused):**
    - **Primary:** Custom Software Development, Mobile App Engineering, E-commerce & Web Solutions.
    - **Software Quality Services:** Specialized Consultancy in Software Quality Assurance (SQA), automated testing, and performance optimization.
    - **Secondary:** UI/UX Design & Digitalization.
    - **Supporting:** IT Infrastructure, Networks, and Technological Consultancy (as per the legal charter).
- **About Us:** Professional profiles highlighting software engineering expertise, the company's roots in Torreón, and its commitment to quality standards.
- **Contact:** Lead generation tailored for software project and quality consultancy inquiries.

## 4. Design & Aesthetic Direction
- **Voice:** Innovative, Agile, Engineering-centric, and **Trustworthy**.
- **Visuals:** Clean, modern "Software House" aesthetic. Emphasis on code quality, performance, precision, and user experience.

## 5. Technology Stack & Architectural Patterns
- **Framework:** **Astro** (Static Site Generator) for maximum performance, security, and top-tier SEO.
- **Styling:** Tailwind CSS.
- **Centralized String Management:** **Mandatory Pattern.** All UI strings, labels, and copy must be stored in a single source of truth (e.g., a `strings.ts` constant or a specialized class). Components must consume strings from this object to ensure consistency and facilitate future localization.
- **Components:** Minimal JavaScript (Astro Islands) for high Core Web Vitals.
- **Deployment:** Vercel, Netlify, or Cloudflare Pages.

## 6. Implementation Phases
- **Phase 0: Documentation & Standards:** Create a **GEMINI.md** file in the project root to document architecture, naming conventions, and string management workflows.
- **Phase 1: Architecture & Branding:** Setting up the Astro project structure and defining the Software House visual identity with a quality-first focus.
- **Phase 2: Content Development:** Crafting copy that highlights software expertise and quality consultancy while ensuring legal compliance with the corporate object.
- **Phase 3: Performance Optimization:** Leveraging Astro's static nature for sub-second load times.

## 7. Verification Steps
- [ ] Responsive design check (Mobile/Desktop).
- [ ] Forms validation (Project & Quality Consultancy leads).
- [ ] SEO audit (Meta tags, performance scores).
- [ ] Cross-browser testing.
