import { es } from './strings/es';
import { en } from './strings/en';

export type { Dictionary } from './strings/es';

/** HércuIT phone number in E.164 form: the single source for the tel: and WhatsApp links. The grouped `display` form is checked against it in whatsapp.test.ts. */
const PHONE_E164 = "+523317133469";

/** Not translated: legal name, place names and brand assets. */
export const shared = {
  companyName: "HércuIT, S. de R.L. de C.V.",
  location: "Torreón, Coahuila, México",
  phone: {
    display: "+52 33 1713 3469",
    e164: PHONE_E164,
    href: `tel:${PHONE_E164}`
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
