/**
 * Stage 1 — the Intent Analyzer.
 *
 * Generation used to read the brief as loose prose, so "a dental clinic for
 * anxious patients" and "a crypto exchange" arrived at the model as
 * interchangeable strings. This turns the brief into structured design
 * parameters that every later stage can actually condition on.
 *
 * One short call per project, cached in memory against a hash of the brief, so
 * a round costs one extra request rather than one per variant. The cache is
 * deliberately not persisted: a schema change is not worth it for a call this
 * cheap, and an in-memory miss simply regenerates.
 */

import { Type } from "@google/genai";
import { callLLM } from "@/lib/llm";
import type { ProjectContext } from "@/features/variants/generate";

export interface IntentBrief {
  industry: string;
  audience: string;
  brandPersonality: string;
  emotionalGoal: string;
  /** 1-10. Drives restraint, materials, and type choices. */
  luxuryLevel: number;
  /** 1-10. How far a direction may depart from convention. */
  creativityLevel: number;
  trustRequirement: string;
  visualTone: string;
  conversionGoal: string;
}

const INTENT_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    industry: { type: Type.STRING },
    audience: { type: Type.STRING },
    brandPersonality: { type: Type.STRING },
    emotionalGoal: { type: Type.STRING },
    luxuryLevel: { type: Type.INTEGER },
    creativityLevel: { type: Type.INTEGER },
    trustRequirement: { type: Type.STRING },
    visualTone: { type: Type.STRING },
    conversionGoal: { type: Type.STRING },
  },
  required: [
    "industry",
    "audience",
    "brandPersonality",
    "emotionalGoal",
    "luxuryLevel",
    "creativityLevel",
    "trustRequirement",
    "visualTone",
    "conversionGoal",
  ],
};

const cache = new Map<string, IntentBrief>();

/** Cheap, stable key: the brief's content, not the project id, so editing the
 *  brief invalidates the analysis without any bookkeeping. */
function briefKey(project: ProjectContext): string {
  return JSON.stringify([
    project.name,
    project.serviceType,
    project.description,
    project.audience,
    project.designNotes,
  ]);
}

function clampLevel(value: unknown, fallback: number): number {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(10, Math.max(1, Math.round(n)));
}

/** A usable brief when the model is unavailable, so generation never blocks on
 *  this stage. Neutral mid-range values rather than invented specifics. */
export function fallbackIntent(project: ProjectContext): IntentBrief {
  return {
    industry: project.serviceType || "unspecified",
    audience: project.audience || "general prospective customers",
    brandPersonality: "considered, credible, unfussy",
    emotionalGoal: "confidence",
    luxuryLevel: 5,
    creativityLevel: 6,
    trustRequirement: "moderate",
    visualTone: "editorial, restrained",
    conversionGoal: "get in touch",
  };
}

export async function analyzeIntent(
  project: ProjectContext,
  brief: string
): Promise<IntentBrief> {
  const key = briefKey(project);
  const cached = cache.get(key);
  if (cached) return cached;

  let parsed: Partial<IntentBrief> = {};
  try {
    const text = await callLLM({
      contents: `Read this brief as a design problem, not a list of keywords. Infer what the work actually has to accomplish.

${brief}

Return:
- industry: the real category, specific rather than generic
- audience: who this is for, in concrete terms
- brandPersonality: three adjectives that could not describe a competitor
- emotionalGoal: what a visitor should feel within five seconds
- luxuryLevel: 1-10, where 1 is utilitarian and 10 is genuinely luxury
- creativityLevel: 1-10, how far the design may depart from category convention before it stops serving this audience
- trustRequirement: how much proof this audience needs before acting, and what kind
- visualTone: a reference-led description, e.g. "Swiss print meets clinical precision"
- conversionGoal: the single action the page exists to produce`,
      config: { responseMimeType: "application/json", responseSchema: INTENT_SCHEMA },
      length: "short",
      maxRounds: 1,
    });
    parsed = JSON.parse(text || "{}") as Partial<IntentBrief>;
  } catch {
    // Fall through to defaults; a missing analysis must not fail the round.
  }

  const base = fallbackIntent(project);
  const result: IntentBrief = {
    industry: parsed.industry?.trim() || base.industry,
    audience: parsed.audience?.trim() || base.audience,
    brandPersonality: parsed.brandPersonality?.trim() || base.brandPersonality,
    emotionalGoal: parsed.emotionalGoal?.trim() || base.emotionalGoal,
    luxuryLevel: clampLevel(parsed.luxuryLevel, base.luxuryLevel),
    creativityLevel: clampLevel(parsed.creativityLevel, base.creativityLevel),
    trustRequirement: parsed.trustRequirement?.trim() || base.trustRequirement,
    visualTone: parsed.visualTone?.trim() || base.visualTone,
    conversionGoal: parsed.conversionGoal?.trim() || base.conversionGoal,
  };

  cache.set(key, result);
  return result;
}

/** Renders the analysis for downstream prompts. */
export function intentPrompt(intent: IntentBrief): string {
  return `DESIGN READ (inferred from the brief - every choice below should serve this):
- Industry: ${intent.industry}
- Audience: ${intent.audience}
- Brand personality: ${intent.brandPersonality}
- Emotional goal: ${intent.emotionalGoal}
- Luxury level: ${intent.luxuryLevel}/10
- Creativity licence: ${intent.creativityLevel}/10 (how far you may depart from category convention)
- Trust requirement: ${intent.trustRequirement}
- Visual tone: ${intent.visualTone}
- Conversion goal: ${intent.conversionGoal}`;
}
