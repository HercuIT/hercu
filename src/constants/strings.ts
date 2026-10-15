import { es } from './strings/es';
import { en } from './strings/en';

export type { Dictionary } from './strings/es';

/** Not translated: legal name, place names and brand assets. */
export const shared = {
  companyName: "HércuIT, S. de R.L. de C.V.",
  location: "Torreón, Coahuila, México",
  phone: {
    display: "+52 33 1713 3469",
    /** E.164 form: the single source for the tel: and WhatsApp links. */
    e164: "+523317133469",
    href: "tel:+523317133469"
  },
  brand: {
    name: "HércuIT",
    tagline: ["SOFTWARE", "CALIDAD", "TI"],
    taglineLang: "es",
    qaPageTitle: "HércuIT brand QA"
  }
};

/** Per-locale UI copy. Read it through `useStrings(Astro.currentLocale)` from `src/i18n/utils`. */
export const strings = { es, en };
