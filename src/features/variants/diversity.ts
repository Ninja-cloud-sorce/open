/**
 * The Diversity Engine.
 *
 * Every generated site used to walk the same fixed list of eight sections in the
 * same order, with layout left implicit in the prompt. That guaranteed sameness
 * at the code level, no matter how the prompt was worded.
 *
 * This module makes the *architecture* of each variant an explicit, varied input:
 * hero archetype, navigation, grid, rhythm, density, and a section plan that
 * differs per variant. It is seeded off the variant id, so a regeneration of the
 * same variant is reproducible while its neighbours stay distinct — and it costs
 * zero LLM calls.
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

/** mulberry32 — deterministic PRNG so the same seed always yields the same brief. */
function makeRandom(seed: number) {
  let state = seed;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

type Random = () => number;

function pick<T>(random: Random, options: readonly T[]): T {
  return options[Math.floor(random() * options.length)];
}

function pickSome<T>(random: Random, options: readonly T[], count: number): T[] {
  const pool = [...options];
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, count);
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
] as const;

const NAV_STYLES = [
  "A minimal top bar: wordmark left, three links right, no CTA button.",
  "A centered wordmark with links split symmetrically either side.",
  "A left-aligned rail with the wordmark and links stacked vertically on desktop, collapsing to a bar on mobile.",
  "A wide bar with the wordmark left, links center, and a text-only CTA right with a hairline underline.",
  "A bar that carries a thin metadata line above it: location, hours, or availability.",
  "A minimal bar that hides on scroll down and returns on scroll up.",
] as const;

const GRID_SYSTEMS = [
  "A strict 12-column grid. Every element snaps to it, and columns are visibly used at different spans.",
  "An asymmetric 7+5 split grid that never divides evenly, so no two sections mirror each other.",
  "A Swiss modular grid: consistent columns and rows, content placed in deliberate modules with empty cells left empty.",
  "A wide single-column measure with generous side margins, broken occasionally by full-bleed elements.",
  "A two-track grid where a narrow sidebar column carries metadata alongside a wide content column.",
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
] as const;

const DENSITY = [
  "Low density: few elements, each given a lot of room.",
  "High density: rich information, small type, lots of detail packed with precision.",
  "Mixed density: sparse hero and closing, dense middle sections.",
] as const;

const MOTION_LANGUAGE = [
  "No motion at all beyond hover states. Stillness is the point.",
  "Slow reveals on scroll using IntersectionObserver, staggered by 60ms, opacity and small translate only.",
  "A sticky section where content changes as the user scrolls past a pinned element.",
  "One horizontal-scrolling band, everything else static.",
] as const;

const FOOTER_STYLES = [
  "A large footer that fills most of a screen: oversized wordmark, columns of links, contact details.",
  "A single-line footer: legal text left, three links right, nothing else.",
  "A footer built as a final content block with a newsletter or contact prompt above the legal line.",
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
];

export interface DiversityBrief {
  hero: string;
  nav: string;
  grid: string;
  rhythm: string;
  cards: string;
  density: string;
  motion: string;
  footer: string;
  sections: { id: SectionId; brief: string }[];
}

export function buildDiversityBrief(seed: string): DiversityBrief {
  const random = makeRandom(hashSeed(seed));

  const strategy = pick(random, ORDER_STRATEGIES);
  // 5-7 content sections, so page length varies too rather than always being eight.
  const count = 5 + Math.floor(random() * 3);
  const chosen = new Set(pickSome(random, strategy, count));
  // The closing CTA earns its place on every page.
  chosen.add("cta");

  return {
    hero: pick(random, HERO_ARCHETYPES),
    nav: pick(random, NAV_STYLES),
    grid: pick(random, GRID_SYSTEMS),
    rhythm: pick(random, RHYTHM),
    cards: pick(random, CARD_TREATMENTS),
    density: pick(random, DENSITY),
    motion: pick(random, MOTION_LANGUAGE),
    footer: pick(random, FOOTER_STYLES),
    sections: strategy
      .filter((id) => chosen.has(id))
      .map((id) => ({ id, brief: CONTENT_SECTIONS[id] })),
  };
}

/** Renders the brief as the architectural half of the generation prompt. */
export function diversityPrompt(brief: DiversityBrief): string {
  const sections = [
    "1. navigation - " + brief.nav,
    "2. hero - " + brief.hero,
    ...brief.sections.map((s, i) => `${i + 3}. ${s.id} - ${s.brief}`),
    `${brief.sections.length + 3}. footer - ${brief.footer}`,
  ].join("\n");

  return `ARCHITECTURE (this is the structure to build - it is specific to this direction and must not be swapped for a generic layout):

${sections}

Grid: ${brief.grid}
Vertical rhythm: ${brief.rhythm}
Content blocks: ${brief.cards}
Density: ${brief.density}
Motion: ${brief.motion}

Follow this architecture exactly. Do not add a section that is not listed, do not reorder them, and do not fall back to a centered-hero-then-three-cards layout.`;
}
