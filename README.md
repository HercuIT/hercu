# Hércuit Website - Quality-First Software House

This is the informative corporate website for **Hércuit, S. de R.L. de C.V.**, a technology solutions firm based in Torreón, Coahuila, specializing in custom software development and software quality consultancy.

## 🚀 Mission & Identity

Hércuit positions itself as a **Quality-First Software House**. Our engineering philosophy is built on:
- **Rigorous Auditing:** Strict peer reviews and automated analysis.
- **Test-Driven Excellence:** Advanced TDD and BDD methodologies.
- **Performance First:** Sub-second response times and efficient resource management.

## 🛠️ Technology Stack

- **Framework:** [Astro 5](https://astro.build/) - High-performance static site generation.
- **Styling:** [Tailwind CSS v4](https://tailwindcss.com/) - Modern, utility-first CSS.
- **TypeScript:** Strict mode enabled for type-safety and reliability.
- **Architecture:** 
    - **Centralized String Management:** All UI text is managed in `src/constants/strings.ts`, with one dictionary per locale.
    - **Bilingual:** Spanish (default) at `/`, English at `/en/`, via Astro i18n routing.
    - **Component-Driven Development:** Reusable UI components in `src/components/`.

## 📂 Project Structure

```text
/
├── public/             # Static assets (images, fonts, favicon)
├── src/
│   ├── components/     # UI Components (Hero, Services, Contact, etc.)
│   ├── constants/      # Project constants and centralized strings
│   ├── layouts/        # Page layouts (Layout.astro)
│   ├── pages/          # Routing (index.astro)
│   └── styles/         # Global styles and Tailwind directives
├── GEMINI.md           # Internal project standards and mandates
├── tsconfig.json       # TypeScript configuration
└── package.json        # Project dependencies and scripts
```

## 🏗️ Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (v18.17.1 or higher)
- [npm](https://www.npmjs.com/)

### Installation

1. Clone the repository.
2. Install dependencies:
   ```bash
   npm install
   ```

### Local Development

Start the development server:
```bash
npm run dev
```
The site will be available at `http://localhost:4321`.

### Build

Build the production site:
```bash
npm run build
```
The output will be in the `dist/` directory.

## ⚖️ Legal & Corporate

Hércuit, S. de R.L. de C.V. is a Mexican company incorporated in 2025. All rights reserved.
For more details, refer to the constitutive act referenced in the development strategy.
