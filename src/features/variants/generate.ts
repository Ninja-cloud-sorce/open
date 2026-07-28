import { readFile } from "node:fs/promises";
import path from "node:path";
import { Type } from "@google/genai";
import { db } from "@/lib/db";
import { humanizeAiError } from "@/lib/ai-errors";
import { callLLM } from "@/lib/llm";
import { normalizeHtmlDocument } from "@/lib/html";
import { buildDiversityBrief, diversityPrompt } from "@/features/variants/diversity";
import { COLLECTIONS } from "@/features/variants/collections";
import { analyzeIntent, intentPrompt } from "@/features/variants/intent";
import { scoreSpecs, failingIndices } from "@/features/variants/taste";
import type { DesignLane } from "@/generated/prisma/enums";

/** A variant's 0-9 position in its round, so the Diversity Engine can spread its
 *  pools across all ten rather than drawing for each independently. */
function variantSlot(lane: DesignLane, order: number): number {
  return (lane === "IMPECCABLE" ? 0 : COLLECTIONS.length) + order;
}


/** Statically scoped so bundler file-tracing stays confined to this subfolder. */
const SKILLS_DIR = path.join(process.cwd(), ".agents", "skills");

const SKILL_FILES: Record<DesignLane, string[]> = {
  IMPECCABLE: ["impeccable/reference/craft-floor.md", "impeccable/reference/new-work.md"],
  TASTE_SKILL: ["design-taste-frontend/SKILL.md"],
};

const LANE_LABEL: Record<DesignLane, string> = {
  IMPECCABLE: "Impeccable",
  TASTE_SKILL: "Taste-Skill V2",
};

/**
 * Two budgets, because the two calls have very different ceilings.
 *
 * HTML generation runs long (OpenRouter, million-token context) and benefits
 * from the whole rulebook. Spec generation runs short and routes to Groq, whose
 * per-request limit a 40K-char rulebook exceeds outright — that produced a 413
 * that killed an entire lane while the other, with a smaller rulebook, passed.
 * The spec call only emits design tokens, so it needs the aesthetic guidance,
 * not the full catalogue of forbidden patterns.
 */
const SITE_RULES_BUDGET = 40000;
const SPEC_RULES_BUDGET = 9000;
/** Last-resort budget when even the spec budget trips a provider token limit. */
const MINIMAL_RULES_BUDGET = 2500;

/**
 * A craft layer shared by both lanes.
 *
 * The lane rulebooks argue about design *philosophy* — what a page should be.
 * These cover micro-craft: easing curves, press feedback, transform origins,
 * optical tracking. That is orthogonal to the Impeccable/Taste-Skill split, so
 * it applies to both rather than becoming a third lane, and it is the level at
 * which generated pages read as generic even when their layout is interesting.
 *
 * Budgets are weighted, not split evenly: the design-engineering file is almost
 * entirely CSS we can emit, while the Apple material is mostly gesture and
 * spring work that does not survive translation to a static document.
 */
const CRAFT_FILES: { path: string; budget: number }[] = [
  // The process rulebook: understand, then decide direction, then build. Small
  // enough to include whole, so it leads the craft layer.
  { path: "elite-design-intelligence/SKILL.md", budget: 7000 },
  { path: "emil-design-eng/SKILL.md", budget: 12000 },
  { path: "apple-design/SKILL.md", budget: 6000 },
];

/** These sections translate directly to single-file CSS; the rest of those
 *  skills is React, gesture, and spring material we cannot emit here. */
const CRAFT_PRIORITY = [
  /easing|how fast should it be|animation decision/i,
  /component building|buttons must feel|never animate from scale/i,
  /transform mastery|transform-origin/i,
  /typography/i,
  /performance rules|only animate transform/i,
  /accessibility|reduced-motion/i,
];

/**
 * The Taste-Skill rulebook is ~87K characters and its most load-bearing sections
 * — the forbidden-pattern list and the bias corrections — sit near the end. A
 * plain head-slice dropped them entirely, which is exactly why output still read
 * as AI-generated. Hoist those sections ahead of the narrative material.
 */
const PRIORITY_HEADINGS = [
  /ai tells|forbidden pattern/i,
  /design engineering directive|bias correction/i,
  /layout discipline|content density/i,
  /brief inference|anti-default/i,
];

/** Splits on top-level `## ` headings and packs priority sections in first. */
function prioritizeSections(
  markdown: string,
  budget: number,
  priorities: RegExp[] = PRIORITY_HEADINGS
): string {
  const chunks = markdown.split(/\n(?=## )/);
  if (chunks.length < 2) return markdown.slice(0, budget);

  const rank = (chunk: string) => {
    const heading = chunk.slice(0, 120);
    const index = priorities.findIndex((pattern) => pattern.test(heading));
    return index === -1 ? priorities.length : index;
  };

  // Stable sort by rank keeps each tier in its authored order.
  const ordered = chunks
    .map((chunk, index) => ({ chunk, index, rank: rank(chunk) }))
    .sort((a, b) => a.rank - b.rank || a.index - b.index);

  const kept: string[] = [];
  let used = 0;
  for (const { chunk } of ordered) {
    if (used + chunk.length > budget) continue;
    kept.push(chunk);
    used += chunk.length;
  }
  return kept.join("\n");
}

const rulesCache = new Map<string, string>();

/** Loads the real skill rulebooks shipped in this repo, so each lane generates
 *  under genuinely different design guidance rather than invented pseudo-rules. */
async function loadLaneRules(lane: DesignLane, budget: number): Promise<string> {
  const cacheKey = `${lane}:${budget}`;
  const cached = rulesCache.get(cacheKey);
  if (cached) return cached;

  const files = SKILL_FILES[lane];
  const budgetPerFile = Math.floor(budget / files.length);

  const parts: string[] = [];
  for (const relative of files) {
    try {
      const contents = await readFile(path.join(SKILLS_DIR, relative), "utf8");
      parts.push(
        contents.length > budgetPerFile ? prioritizeSections(contents, budgetPerFile) : contents
      );
    } catch {
      // A missing skill file degrades guidance but must not break generation.
    }
  }

  const joined = parts.join("\n\n---\n\n");
  rulesCache.set(cacheKey, joined);
  return joined;
}

/** Loads the shared craft layer. Cached like the lane rules; a missing file
 *  degrades guidance without breaking generation. */
async function loadCraftRules(): Promise<string> {
  const cached = rulesCache.get("craft");
  if (cached !== undefined) return cached;

  const parts: string[] = [];
  for (const { path: relative, budget } of CRAFT_FILES) {
    try {
      const contents = await readFile(path.join(SKILLS_DIR, relative), "utf8");
      parts.push(prioritizeSections(contents, budget, CRAFT_PRIORITY));
    } catch {
      // Craft guidance is additive; without it the lane rulebooks still apply.
    }
  }

  const joined = parts.join("\n\n---\n\n");
  rulesCache.set("craft", joined);
  return joined;
}

export interface ProjectContext {
  name: string;
  serviceType: string | null;
  description: string | null;
  audience: string | null;
  designNotes: string | null;
  references: { title: string | null; analysisSummary: string | null }[];
}

function projectBrief(project: ProjectContext) {
  const lines = [
    `Project: ${project.name}`,
    project.serviceType && `Service type: ${project.serviceType}`,
    project.description && `What it does: ${project.description}`,
    project.audience && `Audience: ${project.audience}`,
    project.designNotes && `Design direction the user wants: ${project.designNotes}`,
  ].filter(Boolean);

  const refs = project.references
    .map((r) => [r.title, r.analysisSummary].filter(Boolean).join(" — "))
    .filter(Boolean);
  if (refs.length) lines.push(`Inspiration references:\n${refs.map((r) => `- ${r}`).join("\n")}`);

  return lines.join("\n");
}

const TOKENS_SHAPE = `"designTokens" is a JSON string with this exact shape:
{"fontDisplay":"<google font family>","fontBody":"<google font family>","fontMono":"<google font family or empty>","scaleRatio":"<e.g. 1.25>","colorBg":"#hex","colorSurface":"#hex","colorText":"#hex","colorMuted":"#hex","colorAccent":"#hex","colorAccentText":"#hex","radius":"<e.g. 0px | 8px | 999px>","spacingUnit":"<e.g. 8px>","borderStyle":"<e.g. 1px hairline | none | 2px solid>","motion":"<e.g. restrained fades | kinetic reveals | none>","texture":"<e.g. none | paper grain | dot grid>"}`;

const SPEC_SCHEMA = {
  type: Type.ARRAY,
  items: {
    type: Type.OBJECT,
    properties: {
      styleName: { type: Type.STRING },
      rationale: { type: Type.STRING },
      designTokens: { type: Type.STRING },
    },
    required: ["styleName", "rationale", "designTokens"],
  },
};

interface SpecItem {
  styleName: string;
  rationale: string;
  designTokens: string;
}

/** Runs tasks with bounded concurrency. Ten simultaneous generations exhaust a
 *  free-tier minute instantly; a small pool keeps the round inside quota. */
async function mapWithConcurrency<T>(items: T[], limit: number, task: (item: T) => Promise<void>) {
  let cursor = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (cursor < items.length) {
      const index = cursor++;
      await task(items[index]);
    }
  });
  await Promise.all(workers);
}

/**
 * Scores the lane's directions and gives the weak ones exactly one more attempt.
 *
 * Bounded on purpose. Regenerating "until every score passes" can never
 * terminate against a model that plateaus, and each attempt spends free-tier
 * quota that the site builds need. A replacement is kept only if it actually
 * scores better than what it replaced.
 */
async function applyTasteGate(
  specs: SpecItem[],
  designRead: string,
  regenerate: () => Promise<SpecItem[]>
): Promise<SpecItem[]> {
  const scores = await scoreSpecs(specs, designRead);
  if (scores.length === 0) return specs;

  const failing = failingIndices(scores);
  if (failing.length === 0) return specs;

  let replacements: SpecItem[];
  try {
    replacements = await regenerate();
  } catch {
    return specs; // A failed retry must never cost us the originals.
  }

  const rescored = await scoreSpecs(replacements, designRead);
  const improved = [...specs];
  for (const index of failing) {
    const before = scores.find((s) => s.index === index)?.overall ?? 0;
    const after = rescored.find((s) => s.index === index)?.overall ?? 0;
    const candidate = replacements[index];
    // No rescore available means we cannot prove an improvement, so keep the original.
    if (candidate?.designTokens && after > before) improved[index] = candidate;
  }
  return improved;
}

/**
 * Stage A — this lane's interpretation of each of the five fixed design
 * languages. Order is load-bearing: index i is COLLECTIONS[i], which is how the
 * two lanes pair up in the split view.
 */
async function generateLaneSpecs(
  lane: DesignLane,
  project: ProjectContext,
  designRead: string,
  parentTokens?: string | null,
  parentStyle?: string | null
): Promise<SpecItem[]> {
  try {
    return await requestLaneSpecs(lane, project, designRead, SPEC_RULES_BUDGET, parentTokens, parentStyle);
  } catch (error) {
    // A token-limit rejection is deterministic: retrying the same prompt fails
    // identically. Shed rulebook context and try once more rather than losing
    // the entire lane, which is what happened when Groq returned 413.
    if (!isTokenLimitError(error)) throw error;
    return requestLaneSpecs(lane, project, designRead, MINIMAL_RULES_BUDGET, parentTokens, parentStyle);
  }
}

function isTokenLimitError(error: unknown): boolean {
  const text = error instanceof Error ? error.message : String(error);
  return /\b413\b|request too large|tokens per minute|context length|too many tokens/i.test(text);
}

async function requestLaneSpecs(
  lane: DesignLane,
  project: ProjectContext,
  designRead: string,
  budget: number,
  parentTokens?: string | null,
  parentStyle?: string | null
): Promise<SpecItem[]> {
  const rules = await loadLaneRules(lane, budget);

  const refining = parentTokens
    ? `\n\nThis is a REFINEMENT round. The user picked "${parentStyle}" with these locked tokens:\n${parentTokens}\n\nKeep that visual identity - same font families, same palette, same voice - while still honouring each design language below. Vary composition, hierarchy, and density rather than hue and typeface.`
    : "";

  const collections = COLLECTIONS.map(
    (collection, index) => `${index + 1}. ${collection.name}\n${collection.brief}`
  ).join("\n\n");

  const text = await callLLM({
    contents: `You are a design director working under the following rulebook. Follow it closely - it is the house style you are accountable to.

=== RULEBOOK: ${LANE_LABEL[lane]} ===
${rules}
=== END RULEBOOK ===

Brief:
${projectBrief(project)}

${designRead}${refining}

Below are five fixed design languages. Produce YOUR rulebook's interpretation of each one, applied to this specific business.

=== DESIGN LANGUAGES ===
${collections}
=== END DESIGN LANGUAGES ===

Return exactly ${COLLECTIONS.length} items in that exact order. For each:
- "styleName": the design language's name, unchanged (${COLLECTIONS.map((c) => c.name).join(", ")}).
- "rationale": one sentence on how your rulebook reads this language for this business.
- "designTokens": tokens that genuinely express that language. Print-Tech and Vast Quiet must not end up with similar palettes or type.

Token constraints: never Inter, never pure #000000 or #FFFFFF for backgrounds, and no oversaturated accent.

${TOKENS_SHAPE}`,
    config: { responseMimeType: "application/json", responseSchema: SPEC_SCHEMA },
    length: "short",
  });

  const parsed = parseSpecList(text).slice(0, COLLECTIONS.length);

  // The collection name is ours, not the model's — the split view pairs on it,
  // so a hallucinated or reordered name would break the comparison.
  return COLLECTIONS.map((collection, index) => ({
    styleName: collection.name,
    rationale: parsed[index]?.rationale ?? collection.brief,
    designTokens: parsed[index]?.designTokens ?? "",
  })).filter((spec) => spec.designTokens);
}

/**
 * Providers disagree on JSON array shape: Gemini's responseSchema returns a bare
 * array, while OpenAI-compatible `json_object` mode is required to return an
 * object, so those providers wrap it (`{"directions": [...]}`). Accept either.
 */
function parseSpecList(text: string): SpecItem[] {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text || "[]");
  } catch {
    return [];
  }

  if (Array.isArray(parsed)) return parsed as SpecItem[];

  if (parsed && typeof parsed === "object") {
    const firstArray = Object.values(parsed as Record<string, unknown>).find(Array.isArray);
    if (firstArray) return firstArray as SpecItem[];
  }

  return [];
}

const SITE_RULES = `Output a COMPLETE self-contained HTML document starting with <!DOCTYPE html>.
- All CSS in one <style> tag in <head>. No external CSS frameworks.
- Load fonts via a single Google Fonts <link>.
- Bind every color, font, and radius to the supplied design tokens as CSS custom properties on :root, then use var() everywhere. This is what keeps the site visually consistent.
- Real, specific copy for this business. Never lorem ipsum, never "Your Company".
- Where a photograph belongs, use https://picsum.photos/seed/<descriptive-slug>/<width>/<height> with a slug describing the shot. Give every image an explicit width/height and object-fit: cover.
- Semantic HTML, responsive down to 375px, accessible contrast.

LAYOUT SAFETY - the page is judged at 1440px wide, and these break it outright:
- No text column narrower than 260px at any breakpoint. Multi-column grids must use minmax() with a floor of at least 260px, never fixed pixel widths or bare 1fr in a narrow container.
- Body copy stays between 45 and 80 characters per line. If a column cannot hold that, use fewer columns.
- Never set a fixed width or height on a text container. Let content determine height.
- Nothing may overflow the viewport horizontally. Long words, tables, and code blocks scroll inside their own container, not the page.
- Test every grid mentally at 1440px, 1024px, and 375px before emitting it.`;

/**
 * A compact ban list sitting directly beside the task. The lane rulebooks carry
 * the full reasoning, but rules buried in tens of thousands of characters of
 * context get followed less reliably than a short checklist at the point of use.
 */
const SLOP_BANS = `These are the signatures that make a page read as AI-generated. Treat them as hard bans:
- No row of three equal feature cards. Use an asymmetric grid, a two-column zig-zag, or an editorial list.
- No section-number eyebrows ("01 / INDEX", "002 - Capabilities"). Name the topic in plain language.
- No version or status eyebrows in the hero ("V2.0", "BETA", "EARLY ACCESS", "INVITE ONLY").
- No em-dash anywhere in the copy. Use a regular hyphen.
- The middle dot is rationed to at most one per line. Never use it as a general separator.
- No decorative status dots before nav links, badges, or list rows.
- No hairline or crosshair grid lines added purely as decoration.
- No fake product UI built out of divs (fake dashboard, terminal, task list, chat). This is the single biggest tell.
- No gradient text on headings, no neon glows, no pure #000000, no oversaturated accents.
- Do not use Inter. Do not lean on a huge H1 for hierarchy; use weight, color, and spacing.
- No filler verbs: elevate, seamless, unleash, next-gen, revolutionize, empower, unlock, transform, streamline.
- No generic person names (John Doe, Sarah Chen) and no fake-perfect figures (99.9%, 50%, 10,000+). Use specific, slightly irregular numbers.
- No startup-slop naming (Acme, Nexus, SmartFlow, Cloudly).
- No poetic section labels ("Field notes", "From the bench", "On our desks"). Plain functional labels.
- Vary the rhythm between sections: alternate background weight, alignment, and density. Never stack eight centered blocks.`;

/**
 * The craft rules most likely to be skipped, restated at the point of use. The
 * full rulebook carries the reasoning; this is the part that must survive.
 */
const CRAFT_CHECKLIST = `CRAFT - the details that separate a designed page from a generated one. Every one of these is checkable in the CSS you emit:
- Define custom easing tokens and use them everywhere. The built-in keywords are too weak: --ease-out: cubic-bezier(0.23, 1, 0.32, 1); --ease-in-out: cubic-bezier(0.77, 0, 0.175, 1).
- Never use ease-in on an interaction. It delays the moment the user is watching most closely.
- Every pressable element gets transform: scale(0.97) on :active with a 160ms transition. Buttons must feel like they are listening.
- Every interactive element gets a visible :hover and a real :focus-visible ring. No element changes state without a transition.
- Transition specific properties, never "all". Animate only transform and opacity.
- Nothing enters from scale(0) or opacity alone. Start at scale(0.95) with opacity 0.
- UI transitions stay under 300ms. Hovers 150-200ms, presses 100-160ms.
- Letter-spacing is size-specific: negative on display headings (about -0.02em), near zero on body. Line-height tight on large text, looser on body.
- Wrap all motion in @media (prefers-reduced-motion: reduce) and disable it there.`;

/** Stage B (preview) — a complete site per variant, on an architecture unique to
 *  it. Previously this asked for only a hero plus one band against a fixed
 *  eight-section list, which is why every direction came out the same shape. */
async function generatePreview(
  lane: DesignLane,
  project: ProjectContext,
  spec: SpecItem,
  roundSeed: string,
  variantIndex: number,
  designRead: string
): Promise<string> {
  const [rules, craft] = await Promise.all([
    loadLaneRules(lane, SITE_RULES_BUDGET),
    loadCraftRules(),
  ]);
  const architecture = diversityPrompt(buildDiversityBrief(roundSeed, variantIndex));
  const collection = COLLECTIONS.find((c) => c.name === spec.styleName);

  const text = await callLLM({
    contents: `You are a design director working under this rulebook:

=== RULEBOOK: ${LANE_LABEL[lane]} ===
${rules}
=== END RULEBOOK ===

Brief:
${projectBrief(project)}

${designRead}

Design language: "${spec.styleName}"
${collection ? `${collection.brief}\n` : ""}Your reading of it: ${spec.rationale}
Design tokens (bind these exactly, every section shares them):
${spec.designTokens}

${architecture}

Build the COMPLETE site as one long page. Every section must read as part of one designed system: the same type scale, spacing rhythm, and color roles throughout. This page is judged against nine others, so its visual identity has to be unmistakable and specific to this direction.

${SITE_RULES}

=== CRAFT LAYER (applies regardless of design language) ===
${craft}
=== END CRAFT LAYER ===

${SLOP_BANS}

${CRAFT_CHECKLIST}`,
  });
  return normalizeHtmlDocument(text);
}

/** Stage B (full) — the entire multi-section site against locked tokens. */
export async function expandToFullSite(variantId: string) {
  const variant = await db.variant.findUniqueOrThrow({
    where: { id: variantId },
    include: { round: { include: { project: { include: { references: { include: { analysis: true } } } } } } },
  });

  if (!process.env.GEMINI_API_KEY && !process.env.GROQ_API_KEY) {
    await db.variant.update({
      where: { id: variantId },
      data: { status: "ERROR", error: "No LLM key configured. Set GEMINI_API_KEY or GROQ_API_KEY in .env." },
    });
    return;
  }

  await db.variant.update({ where: { id: variantId }, data: { status: "GENERATING", error: null } });

  try {
    const project = toContext(variant.round.project);
    const [rules, craft, intent] = await Promise.all([
      loadLaneRules(variant.lane, SITE_RULES_BUDGET),
      loadCraftRules(),
      // Cached against the brief, so a rebuild reuses the round's analysis.
      analyzeIntent(project, projectBrief(project)),
    ]);

    const draftText = await callLLM({
      contents: `You are a design director working under this rulebook:

=== RULEBOOK: ${LANE_LABEL[variant.lane]} ===
${rules}
=== END RULEBOOK ===

Brief:
${projectBrief(project)}

${intentPrompt(intent)}

Design direction: "${variant.styleName}" — ${variant.rationale ?? ""}
Design tokens (bind these exactly — every section must share them):
${variant.designTokens}

${diversityPrompt(buildDiversityBrief(variant.roundId, variantSlot(variant.lane, variant.order)))}

Build the COMPLETE site as one long page. Every section must feel like part of the same designed system: consistent type scale, spacing rhythm, and color roles throughout.

${SITE_RULES}

=== CRAFT LAYER (applies regardless of design language) ===
${craft}
=== END CRAFT LAYER ===

${SLOP_BANS}

${CRAFT_CHECKLIST}`,
    });

    const html = normalizeHtmlDocument(draftText);

    // Self-critique pass — a real quality lever, but it re-emits the whole
    // document, so it can truncate where the draft did not. Never let a failed
    // revision cost us a good draft.
    let finalHtml = html;
    try {
      const revisedText = await callLLM({
        contents: `Review this generated site against the rulebook below and return an IMPROVED version.

=== RULEBOOK: ${LANE_LABEL[variant.lane]} ===
${rules}
=== END RULEBOOK ===

Audit it against this ban list and fix every violation you find:

${SLOP_BANS}

Then bring it up to this craft standard, adding what is missing:

${CRAFT_CHECKLIST}

Finally check: typographic hierarchy and scale, spacing rhythm, section layout variety, copy specificity, color usage against the locked tokens, responsive behavior, and contrast.

Keep every section that is already there. Return ONLY the corrected complete HTML document, no commentary.

${html}`,
      });
      finalHtml = normalizeHtmlDocument(revisedText);
    } catch {
      // Keep the draft; it already passed the renderable check.
    }

    await db.variant.update({
      where: { id: variantId },
      data: { status: "DONE", error: null, fullSiteHtml: finalHtml },
    });
  } catch (error) {
    await db.variant.update({
      where: { id: variantId },
      data: { status: "ERROR", error: humanizeAiError(error) },
    });
  }
}

/** Generates every variant in a round: both lanes' specs, then previews. */
export async function generateRound(roundId: string) {
  const round = await db.variantRound.findUniqueOrThrow({
    where: { id: roundId },
    include: {
      project: { include: { references: { include: { analysis: true } } } },
      parentVariant: true,
    },
  });

  if (!process.env.GEMINI_API_KEY && !process.env.GROQ_API_KEY) {
    await db.variant.updateMany({
      where: { roundId },
      data: { status: "ERROR", error: "No LLM key configured. Set GEMINI_API_KEY or GROQ_API_KEY in .env." },
    });
    return;
  }

  const project = toContext(round.project);
  const parent = round.parentVariant;

  // Both lanes on every round, refinement included, so each design language
  // always has an Impeccable version on the left and a Taste-Skill one right.
  const lanes: DesignLane[] = ["IMPECCABLE", "TASTE_SKILL"];

  await db.variant.updateMany({ where: { roundId }, data: { status: "GENERATING", error: null } });

  // Stage 1 runs once for the whole round: the design read is a property of the
  // brief, not of any one direction, so paying for it per variant would be ten
  // times the cost for identical output.
  const intent = await analyzeIntent(project, projectBrief(project));
  const designRead = intentPrompt(intent);

  // Lanes run sequentially, and previews within a lane run in a small pool —
  // both to stay inside the free tier's per-minute request quota.
  for (const lane of lanes) {
    await (async () => {
      const variants = await db.variant.findMany({
        where: { roundId, lane },
        orderBy: { order: "asc" },
      });

      let specs: SpecItem[] = [];
      try {
        specs = await generateLaneSpecs(
          lane,
          project,
          designRead,
          parent?.designTokens,
          parent?.styleName
        );
      } catch (error) {
        await db.variant.updateMany({
          where: { roundId, lane },
          data: { status: "ERROR", error: humanizeAiError(error) },
        });
        return;
      }

      // Stage 5: score the directions while they are still paragraphs. One
      // scoring call, one regeneration pass for whatever fails, then move on.
      specs = await applyTasteGate(specs, designRead, () =>
        generateLaneSpecs(lane, project, designRead, parent?.designTokens, parent?.styleName)
      );

      await mapWithConcurrency(
        variants.map((variant, index) => ({ variant, index })),
        2,
        async ({ variant, index }) => {
          const spec = specs[index];
          if (!spec) {
            await db.variant.update({
              where: { id: variant.id },
              data: { status: "ERROR", error: "Model returned no direction at this position." },
            });
            return;
          }

          await db.variant.update({
            where: { id: variant.id },
            data: { styleName: spec.styleName, rationale: spec.rationale, designTokens: spec.designTokens },
          });

          try {
            const previewHtml = await generatePreview(
              lane,
              project,
              spec,
              roundId,
              variantSlot(lane, variant.order),
              designRead
            );
            await db.variant.update({
              where: { id: variant.id },
              data: { status: "DONE", error: null, previewHtml },
            });
          } catch (error) {
            await db.variant.update({
              where: { id: variant.id },
              data: { status: "ERROR", error: humanizeAiError(error) },
            });
          }
        }
      );
    })();
  }
}

/** Suggests a starting subject line for hero image generation from project context. */
export async function suggestHeroSubject(project: ProjectContext): Promise<string> {
  if (!process.env.GEMINI_API_KEY && !process.env.GROQ_API_KEY) return "";
  try {
    const text = await callLLM({
      contents: `In one short sentence, describe the ideal hero photograph for this business. Subject and mood only, no camera jargon.\n\n${projectBrief(project)}`,
      length: "short",
      maxRounds: 1,
    });
    return text.trim();
  } catch {
    return "";
  }
}

function toContext(project: {
  name: string;
  serviceType: string | null;
  description: string | null;
  audience: string | null;
  designNotes: string | null;
  references: { title: string | null; analysis: { primaryStyle: string | null; aiNotes: string | null } | null }[];
}): ProjectContext {
  return {
    name: project.name,
    serviceType: project.serviceType,
    description: project.description,
    audience: project.audience,
    designNotes: project.designNotes,
    references: project.references.map((r) => ({
      title: r.title,
      analysisSummary: [r.analysis?.primaryStyle, r.analysis?.aiNotes].filter(Boolean).join(": ") || null,
    })),
  };
}
