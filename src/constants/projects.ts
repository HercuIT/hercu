// HércuIT-built products shown in the Projects section. Names and URLs are not translated;
// per-locale copy lives in the dictionaries (`projects.items`), keyed by project id.
export const projects = [
  { id: 'binkleaner', name: 'BinKleaner', url: 'https://www.binkleaner.mx/' },
  // TODO: switch to the custom domain once Nopalito Limpio has one (specs/services-alignment/03, decision 1).
  { id: 'nopalito-limpio', name: 'Nopalito Limpio', url: 'https://bruno-gray-pi.vercel.app/' },
] as const;

export type ProjectId = (typeof projects)[number]['id'];

export type ProjectCopy = {
  description: string;
  highlights: [string, string, string];
  imageAlt: string;
};

export type ProjectConfig = { id: ProjectId; name: string; url: string };

export type ProjectCard = ProjectConfig & ProjectCopy;

/**
 * True only for absolute `https:` URLs with a dotted hostname and no embedded credentials.
 * Rejects `http:`, `javascript:`, relative paths, blanks and values with surrounding whitespace.
 */
export function isSafeHttpsUrl(value: unknown): boolean {
  if (typeof value !== 'string' || value === '' || value !== value.trim()) return false;
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return false;
  }
  return url.protocol === 'https:' && url.hostname.includes('.') && url.username === '' && url.password === '';
}

function requireText(value: unknown, field: string, id: string): string {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new Error(`Missing ${field} for project "${id}"`);
  }
  return value;
}

/**
 * Joins the project config with a locale's copy, in config order.
 * Throws on a missing/blank field, a wrong highlight count or an unsafe URL, so a broken
 * entry fails the build instead of rendering a half-empty card or a dangerous link.
 */
export function buildProjectCards(
  copy: Record<ProjectId, ProjectCopy>,
  list: readonly ProjectConfig[] = projects,
): ProjectCard[] {
  return list.map((project) => {
    const entry = copy[project.id];
    if (!entry) throw new Error(`Missing copy for project "${project.id}"`);
    if (!isSafeHttpsUrl(project.url)) throw new Error(`Unsafe URL for project "${project.id}"`);
    if (!Array.isArray(entry.highlights) || entry.highlights.length !== 3) {
      throw new Error(`Project "${project.id}" needs exactly 3 highlights`);
    }
    return {
      id: project.id,
      name: requireText(project.name, 'name', project.id),
      url: project.url,
      description: requireText(entry.description, 'description', project.id),
      // Array.from (not .map) visits every index, so holes in a sparse array are validated too.
      highlights: Array.from(entry.highlights, (h, i) => requireText(h, `highlight ${i + 1}`, project.id)) as [
        string,
        string,
        string,
      ],
      imageAlt: requireText(entry.imageAlt, 'imageAlt', project.id),
    };
  });
}
