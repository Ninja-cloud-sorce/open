/**
 * The Diversity Engine.
 *
 * Two problems this solves, both of which produced sites that felt identical
 * however the prompt was worded:
 *
 * 1. Architecture was hardcoded. Every site walked the same eight sections in
 *    the same order, so no direction could differ structurally.
 * 2. Components were never specified at all. Nothing told the model how the
 *    navbar, buttons, links, headings, images, or transitions should differ, so
 *    it reached for the same defaults every time. That is what makes ten
 *    variants read as one design.
 *
 * Selection is *spread across the round*, not sampled independently. Ten
 * independent draws from a pool of six collide constantly; walking the pool by a
 * stride coprime to its length guarantees consecutive variants differ, and that
 * every option gets used before any repeats.
 */

/** FNV-1a. Small, dependency-free, and good enough to spread ids across pools. */
function hashSeed(seed: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < seed.length; i++) {
    hash ^= seed.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

function gcd(a: number, b: number): number {
  return b === 0 ? a : gcd(b, a % b);
}

/**
 * Walks `pool` by a stride coprime to its length, starting at a per-pool offset.
 * Coprimality means the walk visits every entry before repeating, so a round of
 * ten variants uses ten different options whenever the pool is large enough.
 */
function spread<T>(pool: readonly T[], variantIndex: number, salt: string, roundSeed: string): T {
  const h = hashSeed(roundSeed + salt);
  const offset = h % pool.length;
  let stride = 1 + ((h >>> 8) % Math.max(1, pool.length - 1));
  while (gcd(stride, pool.length) !== 1) stride++;
  return pool[(offset + variantIndex * stride) % pool.length];
}

const HERO_ARCHETYPES = [
  "Split hero: type block held to one side, full-bleed image on the other. Nothing centered.",
  "Editorial hero: an oversized headline set across the grid with the supporting line offset into a narrow column, like a magazine opener.",
  "Museum hero: a single focal image with generous negative space around it, caption-scale type anchored low and left.",
  "Architectural hero: the structural grid is visible, the headline aligns hard to a column edge, a metadata strip runs along the baseline.",
  "Gallery hero: a staggered cluster of images at varied sizes with the headline threaded between them.",
  "Typographic hero: no imagery at all. The wordmark and headline carry the entire screen at display scale.",
  "Horizontal hero: content laid along a band that continues past the right edge, implying more beyond the fold.",
  "Layered hero: overlapping planes at different depths, with type crossing the boundary between them.",
  "Stacked-statement hero: three short declarative lines at descending scale, each on its own baseline, image below the fold.",
  "Inset hero: a full-bleed image with the type block inset as a solid panel overlapping its lower-left corner.",
  "Ledger hero: the headline paired with a column of concrete facts (established, location, specialisms) set as a labelled list.",
] as const;

const NAV_STYLES = [
  "Minimal top bar: wordmark left, three links right, no button at all.",
  "Centered wordmark with links split symmetrically either side of it.",
  "Vertical left rail on desktop carrying wordmark and links stacked, collapsing to a bar under 900px. The content area must subtract the rail's width from its own grid so its columns stay comfortably readable.",
  "Wide bar: wordmark left, links centered, a text-only CTA right with a hairline underline.",
  "Bar with a thin metadata strip above it carrying location, hours, or availability.",
  "Bar that hides on scroll down and returns on scroll up.",
  "Oversized wordmark set at heading scale with links small and tucked to the baseline beneath it.",
  "Boxed nav: the bar sits inset from the page edges with a visible border, floating over content.",
  "Split nav: wordmark alone at top left, and a separate fixed link cluster pinned bottom right, neither overlapping page content.",
  "Nav with a persistent left-aligned index of section numbers that highlights the current section on scroll.",
  "Full-width bar with a bottom hairline, wordmark left, and a single link plus a bordered CTA right.",
] as const;

const BUTTON_STYLES = [
  "Solid rectangular buttons, zero radius, no shadow. Weight comes from the fill alone.",
  "Outlined buttons: 1px border, transparent fill, background inverts on hover.",
  "Text-only buttons with a thick underline that slides in from the left on hover.",
  "Pill buttons, fully rounded, generous horizontal padding, flat fill.",
  "Small-caps buttons with wide letterspacing and a hairline border, set at label scale.",
  "Buttons with a persistent trailing arrow that translates right on hover, no border.",
  "Two-tone buttons: solid fill with an offset hard-edged shadow block behind, shifting on press.",
  "Oversized buttons that span a grid column, with the label left-aligned and an arrow at the far right.",
  "Softly rounded buttons with a subtle inner border and no drop shadow.",
  "Bracketed buttons: label wrapped in typographic brackets, no fill, no border.",
] as const;

const LINK_STYLES = [
  "Inline links carry a permanent underline that thickens on hover.",
  "Links have no underline until hover, when one draws in from the left.",
  "Links shift color only, never underline.",
  "Links are set in small caps with wide tracking, distinct from body text.",
  "Links carry a trailing arrow glyph that nudges on hover.",
] as const;

const HEADING_TREATMENTS = [
  "Headings set tight, negative letterspacing, with hierarchy carried by weight rather than size.",
  "Headings at large size but light weight, with generous leading.",
  "Headings in small caps with wide tracking, sized close to body copy.",
  "Headings paired with a small label above them in mono at 10-11px.",
  "Headings that span the full measure and wrap deliberately across two or three lines.",
  "Headings with the key noun set in an italic or contrasting cut of the same family.",
  "Headings hung into the left margin, outdented past the body text they introduce.",
] as const;

const IMAGE_TREATMENTS = [
  "Images run full-bleed to the viewport edge with no radius and no border.",
  "Images sit inside the grid with generous margin, each carrying a small caption beneath.",
  "Images are duotoned toward the palette so they read as part of the design system.",
  "Images are cropped to tall portrait ratios and set in an uneven row.",
  "Images sit in a strict square grid with hairline gutters between them.",
  "A single large image per section, alternating which side of the grid it occupies.",
] as const;

const SECTION_TRANSITIONS = [
  "Sections separated by a full-width hairline rule and nothing else.",
  "Sections alternate between the base background and a tinted surface.",
  "Sections separated purely by whitespace, no rules or color shifts.",
  "Each section opens with a small mono label pinned to the left margin.",
  "Sections butt directly against each other with a hard color edge between them.",
] as const;

const GRID_SYSTEMS = [
  "A strict 12-column grid. Every element snaps to it, and columns are visibly used at different spans.",
  "An asymmetric 7+5 split grid that never divides evenly, so no two sections mirror each other.",
  "A Swiss modular grid: consistent columns and rows, content placed in deliberate modules with empty cells left empty.",
  "A wide single-column measure with generous side margins, broken occasionally by full-bleed elements.",
  "A two-track grid where a narrow sidebar column carries metadata alongside a wide content column.",
  "A broken grid where elements deliberately overhang their column edges.",
  "A dense 16-column grid supporting fine-grained alignment and small type.",
] as const;

const RHYTHM = [
  "Very generous vertical rhythm: large section padding, a lot of air between blocks.",
  "Tight, dense rhythm: sections sit close, with hairline rules doing the separating.",
  "Alternating rhythm: expansive sections next to compressed ones, so the page breathes unevenly.",
] as const;

const CARD_TREATMENTS = [
  "No cards at all. Content sits directly on the page, separated by rules and spacing.",
  "Flat blocks with a hairline border and no shadow, no radius.",
  "Blocks distinguished only by a background tint shift, no border.",
  "Cards of deliberately unequal size, forming an asymmetric composition.",
  "Content in a bordered table-like structure with visible column rules.",
  "Numbered blocks laid out as a vertical list, each with a rule above it.",
] as const;

const DENSITY = [
  "Low density: few elements, each given a lot of room.",
  "High density: rich information, small type, lots of detail packed with precision.",
  "Mixed density: sparse hero and closing, dense middle sections.",
] as const;

const MOTION_LANGUAGE = [
  "No motion at all beyond hover states. Stillness is the point.",
  "Slow reveals on scroll via IntersectionObserver, staggered 60ms, opacity and small translate only.",
  "A sticky section where pinned content changes as the user scrolls past it.",
  "One horizontal-scrolling band; everything else static.",
  "Hover-only motion: images scale slightly within their frame, buttons shift, nothing animates on scroll.",
  "A single marquee or ticker line that runs continuously, with the rest of the page still.",
  "Counters and figures that count up once when scrolled into view, nothing else animated.",
] as const;

const FOOTER_STYLES = [
  "A large footer filling most of a screen: oversized wordmark, columns of links, contact details.",
  "A single-line footer: legal text left, three links right, nothing else.",
  "A footer built as a final content block with a newsletter or contact prompt above the legal line.",
  "A footer laid out as a table of departments, addresses, and hours.",
] as const;

/** Each entry is what the section should contain, not what to call it. */
const CONTENT_SECTIONS = {
  problem: "a section naming the specific problem this audience has, in their language",
  solution: "a section explaining the approach, tied directly to the problem named above",
  services: "the services or capabilities on offer (3-6 items)",
  process: "how working together actually goes, step by step",
  proof: "proof appropriate to this business: testimonials, credentials, results, or named clients",
  casework: "one or two pieces of work shown in depth rather than a grid of thumbnails",
  stats: "concrete figures that matter to this audience, presented typographically",
  pricing: "pricing or engagement models, stated plainly",
  team: "the people behind this, with real specificity about who they are",
  manifesto: "a short statement of belief or standards, set as a typographic moment",
  faq: "questions this audience actually asks (4-6)",
  gallery: "a visual sequence of work, spaces, or product",
  cta: "the closing invitation to act",
} as const;

type SectionId = keyof typeof CONTENT_SECTIONS;

/**
 * Narrative arcs rather than a shuffle. A random ordering would happily put the
 * FAQ before the hero; these keep the page readable while still differing.
 */
const ORDER_STRATEGIES: readonly (readonly SectionId[])[] = [
  ["problem", "solution", "services", "process", "proof", "pricing", "faq", "cta"],
  ["manifesto", "casework", "services", "stats", "proof", "process", "faq", "cta"],
  ["services", "gallery", "casework", "team", "manifesto", "proof", "pricing", "cta"],
  ["stats", "proof", "problem", "solution", "services", "pricing", "faq", "cta"],
  ["casework", "process", "team", "services", "manifesto", "faq", "proof", "cta"],
  ["problem", "manifesto", "services", "gallery", "process", "proof", "cta", "faq"],
  ["manifesto", "services", "process", "casework", "stats", "faq", "team", "cta"],
  ["problem", "services", "casework", "proof", "team", "process", "pricing", "cta"],
  ["gallery", "manifesto", "services", "casework", "proof", "faq", "stats", "cta"],
  ["services", "problem", "solution", "stats", "casework", "proof", "faq", "cta"],
];

export interface DiversityBrief {
  hero: string;
  nav: string;
  buttons: string;
  links: string;
  headings: string;
  images: string;
  transitions: string;
  grid: string;
  rhythm: string;
  cards: string;
  density: string;
  motion: string;
  footer: string;
  sections: { id: SectionId; brief: string }[];
}

/**
 * @param roundSeed  shared across a round, so its variants coordinate rather than collide
 * @param variantIndex position in the round (0-9), which drives the spread
 */
export function buildDiversityBrief(roundSeed: string, variantIndex: number): DiversityBrief {
  const at = <T>(pool: readonly T[], salt: string) => spread(pool, variantIndex, salt, roundSeed);

  const strategy = at(ORDER_STRATEGIES, "order");
  // 5-7 content sections, so page length varies rather than always being eight.
  const count = 5 + (hashSeed(roundSeed + "count" + variantIndex) % 3);
  const kept = new Set(strategy.slice(0, count));
  kept.add("cta");

  return {
    hero: at(HERO_ARCHETYPES, "hero"),
    nav: at(NAV_STYLES, "nav"),
    buttons: at(BUTTON_STYLES, "buttons"),
    links: at(LINK_STYLES, "links"),
    headings: at(HEADING_TREATMENTS, "headings"),
    images: at(IMAGE_TREATMENTS, "images"),
    transitions: at(SECTION_TRANSITIONS, "transitions"),
    grid: at(GRID_SYSTEMS, "grid"),
    rhythm: at(RHYTHM, "rhythm"),
    cards: at(CARD_TREATMENTS, "cards"),
    density: at(DENSITY, "density"),
    motion: at(MOTION_LANGUAGE, "motion"),
    footer: at(FOOTER_STYLES, "footer"),
    sections: strategy.filter((id) => kept.has(id)).map((id) => ({ id, brief: CONTENT_SECTIONS[id] })),
  };
}

/** Renders the brief as the architectural half of the generation prompt. */
export function diversityPrompt(brief: DiversityBrief): string {
  const sections = [
    `1. navigation - ${brief.nav}`,
    `2. hero - ${brief.hero}`,
    ...brief.sections.map((s, i) => `${i + 3}. ${s.id} - ${s.brief}`),
    `${brief.sections.length + 3}. footer - ${brief.footer}`,
  ].join("\n");

  return `ARCHITECTURE - this structure is specific to this direction. Build it exactly. Do not add sections, do not reorder, and do not fall back to a centered hero followed by three equal cards.

${sections}

COMPONENT DESIGN - these are the details that distinguish this direction from the nine it is judged against. A generic navbar or a default button makes the whole page interchangeable, so treat each of these as a requirement:
- Buttons: ${brief.buttons}
- Links: ${brief.links}
- Headings: ${brief.headings}
- Images: ${brief.images}
- Section transitions: ${brief.transitions}
- Content blocks: ${brief.cards}

COMPOSITION
- Grid: ${brief.grid}
- Vertical rhythm: ${brief.rhythm}
- Density: ${brief.density}
- Motion: ${brief.motion}`;
}
