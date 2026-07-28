/**
 * Stage 5 — the Taste Engine.
 *
 * Scores the ten design specs before any HTML is generated, so a weak direction
 * is caught while it is still a paragraph rather than after a two-minute site
 * build.
 *
 * The original spec called for "reject everything below 85 and regenerate until
 * high-quality concepts exist". That loop is unbounded, and on a free tier with
 * per-minute quotas it would spin until the quota died. Here it is capped: one
 * scoring call for all ten, one regeneration pass for the failures, then accept
 * what we have. A merely-average direction the user can reject by eye costs far
 * less than a round that never returns.
 */

import { Type } from "@google/genai";
import { callLLM } from "@/lib/llm";

export interface TasteScore {
  index: number;
  originality: number;
  typography: number;
  composition: number;
  memorability: number;
  brandFit: number;
  overall: number;
  weakness: string;
}

/** Below this, a direction is worth one regeneration attempt. */
export const TASTE_THRESHOLD = 70;

const SCORE_SCHEMA = {
  type: Type.ARRAY,
  items: {
    type: Type.OBJECT,
    properties: {
      index: { type: Type.INTEGER },
      originality: { type: Type.INTEGER },
      typography: { type: Type.INTEGER },
      composition: { type: Type.INTEGER },
      memorability: { type: Type.INTEGER },
      brandFit: { type: Type.INTEGER },
      overall: { type: Type.INTEGER },
      weakness: { type: Type.STRING },
    },
    required: ["index", "overall", "weakness"],
  },
};

interface ScorableSpec {
  styleName: string;
  rationale: string;
  designTokens: string;
}

/** Pulls the score array out of whatever shape the provider returned. */
function toRowArray(parsed: unknown): Record<string, unknown>[] {
  if (Array.isArray(parsed)) return parsed as Record<string, unknown>[];
  if (parsed && typeof parsed === "object") {
    for (const value of Object.values(parsed as Record<string, unknown>)) {
      if (Array.isArray(value)) return value as Record<string, unknown>[];
    }
  }
  return [];
}

function clamp(value: unknown, fallback = 75): number {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(100, Math.max(0, Math.round(n)));
}

/**
 * Scores every spec in a single call. Returns an empty array rather than
 * throwing: scoring is an optimisation, and losing it must not cost the round.
 */
export async function scoreSpecs(
  specs: ScorableSpec[],
  designRead: string
): Promise<TasteScore[]> {
  if (specs.length === 0) return [];

  const listed = specs
    .map(
      (spec, index) =>
        `${index}. ${spec.styleName}\n   Rationale: ${spec.rationale}\n   Tokens: ${spec.designTokens}`
    )
    .join("\n\n");

  try {
    const text = await callLLM({
      contents: `You are a design critic with high standards. Score each direction below out of 100. Be honest and harsh - most AI-generated design work scores 60-75, and saying so is more useful than inflating it.

${designRead}

DIRECTIONS
${listed}

For each, score: originality (would a designer have seen this before?), typography (are these typefaces a real choice or a safe default?), composition, memorability (would it be recalled ten seconds later?), and brandFit against the design read above. Then give an "overall" and a one-sentence "weakness" naming the single biggest problem.

Penalise heavily: default typeface pairings, palettes that could belong to any business in any category, and rationales that restate the brief without making a decision.

Return one object per direction, with "index" matching the number above.`,
      config: { responseMimeType: "application/json", responseSchema: SCORE_SCHEMA },
      length: "short",
      maxRounds: 1,
    });

    // Providers disagree on array shape: Gemini returns a bare array, while
    // OpenAI-compatible json_object mode must wrap it in an object. Accept both.
    const rows = toRowArray(JSON.parse(text || "[]"));

    return rows
      .map((row) => ({
        index: clamp(row.index, -1),
        originality: clamp(row.originality),
        typography: clamp(row.typography),
        composition: clamp(row.composition),
        memorability: clamp(row.memorability),
        brandFit: clamp(row.brandFit),
        overall: clamp(row.overall),
        weakness: typeof row.weakness === "string" ? row.weakness : "",
      }))
      .filter((score) => score.index >= 0 && score.index < specs.length);
  } catch {
    return [];
  }
}

/** Indices scoring below the threshold, worst first so a partial retry helps most. */
export function failingIndices(scores: TasteScore[]): number[] {
  return scores
    .filter((score) => score.overall < TASTE_THRESHOLD)
    .sort((a, b) => a.overall - b.overall)
    .map((score) => score.index);
}

/** Feedback appended to a regeneration prompt for the directions that failed. */
export function critiquePrompt(
  specs: ScorableSpec[],
  scores: TasteScore[],
  indices: number[]
): string {
  const lines = indices
    .map((index) => {
      const score = scores.find((s) => s.index === index);
      const spec = specs[index];
      if (!score || !spec) return null;
      return `- "${spec.styleName}" scored ${score.overall}/100. Biggest problem: ${score.weakness}`;
    })
    .filter(Boolean);

  if (lines.length === 0) return "";

  return `A design critic rejected these directions. Replace them with genuinely stronger ones - not adjustments to the same idea:

${lines.join("\n")}

Keep the same design language names. Change the typefaces, palette, and structural personality enough that the criticism no longer applies.`;
}
