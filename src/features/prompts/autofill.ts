import type { InspirationItemDTO } from "@/features/inspiration/types";

const DEFAULT_NEGATIVE_PROMPT = [
  "No generic AI-purple gradients or glow buttons.",
  "No centered-hero-over-dark-mesh SaaS template look.",
  "No Inter as the default typeface — pick something with a point of view.",
  "No generic glassmorphism applied without reason.",
  "No three-equal-feature-cards filler sections.",
  "No rounded-blob illustrations.",
].join("\n");

function dedupe(values: (string | null | undefined)[]): string[] {
  return Array.from(new Set(values.filter((v): v is string => Boolean(v && v.trim()))));
}

export interface AutofillResult {
  aesthetic?: string;
  typographyStyle?: string;
  componentStyle?: string;
  motionStyle?: string;
  negativePrompt?: string;
}

/**
 * Derives brief sections from already-analyzed reference items — no AI call,
 * just reading the structured metadata Phase 3 extracted at upload time.
 * Only returns keys with real signal; callers should not overwrite fields
 * the user already filled in by hand.
 */
export function autofillFromReferences(items: InspirationItemDTO[]): AutofillResult {
  const analyses = items.map((item) => item.analysis).filter((a) => a && a.status === "DONE");
  const result: AutofillResult = {};

  const styles = dedupe(analyses.flatMap((a) => [a!.primaryStyle, ...a!.secondaryStyles]));
  if (styles.length) result.aesthetic = styles.join(", ");

  const typography = dedupe(
    analyses.flatMap((a) => [a!.typographyHeadline, a!.typographyBody, a!.typographyStyle])
  );
  if (typography.length) result.typographyStyle = typography.join(", ");

  const components = dedupe(analyses.flatMap((a) => a!.components));
  if (components.length) result.componentStyle = components.join(", ");

  const motion = dedupe(analyses.flatMap((a) => [a!.animationStyle]));
  if (motion.length) result.motionStyle = motion.join(", ");

  result.negativePrompt = DEFAULT_NEGATIVE_PROMPT;

  return result;
}
