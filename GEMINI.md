# Hércuit Project Standards

## Core Mandates
- **Quality-First:** Every component and script must prioritize performance, accessibility, and clean code.
- **Centralized String Management:** All UI text must be defined in `src/constants/strings.ts`. Direct hardcoding of strings in components is prohibited.

## Architecture
- **Framework:** Astro (Static Site Generator).
- **Styling:** Tailwind CSS.
- **Directory Structure:**
  - `src/components/`: Reusable UI components.
  - `src/layouts/`: Page layouts.
  - `src/pages/`: Route-based pages.
  - `src/constants/`: Centralized strings and configuration.
  - `src/styles/`: Global CSS and Tailwind directives.

## Naming Conventions
- **Components:** PascalCase (e.g., `HeroSection.astro`).
- **Constants:** camelCase or UPPER_SNAKE_CASE (e.g., `strings.heroTitle`).
- **Files:** kebab-case for everything except Astro components.

## Quality Consultancy Services Focus
- Ensure technical language reflects Hércuit's expertise in SQA, automated testing, and performance audits.
