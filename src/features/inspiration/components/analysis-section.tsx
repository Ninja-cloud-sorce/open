"use client";

import { CircleNotch, WarningCircle } from "@phosphor-icons/react/dist/ssr";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScoreMeter } from "@/features/inspiration/components/score-meter";
import { useRunAnalysis } from "@/features/inspiration/queries";
import type { InspirationAnalysisDTO } from "@/features/inspiration/types";

const SCORE_LABELS: [keyof InspirationAnalysisDTO["scores"], string][] = [
  ["minimalism", "Minimalism"],
  ["premium", "Premium"],
  ["creativity", "Creativity"],
  ["technical", "Technical"],
  ["storytelling", "Storytelling"],
  ["visualDensity", "Visual density"],
  ["accessibility", "Accessibility"],
  ["consistency", "Consistency"],
];

export function AnalysisSection({ itemId, analysis }: { itemId: string; analysis: InspirationAnalysisDTO | null }) {
  const runAnalysis = useRunAnalysis();

  if (!analysis || analysis.status === "SKIPPED") {
    return (
      <p className="rounded-md border border-dashed border-border p-3 text-xs text-muted-foreground">
        Not analyzed. Set <code className="font-mono">GEMINI_API_KEY</code> and retry, or categorize manually above.
      </p>
    );
  }

  if (analysis.status === "PENDING" || analysis.status === "ANALYZING") {
    return (
      <div className="flex items-center gap-2 rounded-md border border-border p-3 text-xs text-muted-foreground">
        <CircleNotch size={14} className="animate-spin" />
        Analyzing…
      </div>
    );
  }

  if (analysis.status === "ERROR") {
    return (
      <div className="flex items-center justify-between gap-2 rounded-md border border-destructive/30 bg-destructive/5 p-3 text-xs">
        <span className="flex items-center gap-1.5 text-destructive">
          <WarningCircle size={14} />
          {analysis.error ?? "Analysis failed."}
        </span>
        <Button size="sm" variant="outline" className="h-7 px-2 text-xs" onClick={() => runAnalysis.mutate(itemId)}>
          Retry
        </Button>
      </div>
    );
  }

  const hasScores = SCORE_LABELS.some(([key]) => analysis.scores[key] !== null);

  return (
    <div className="space-y-4">
      {analysis.colorPalette.length > 0 && (
        <div className="flex gap-1.5">
          {analysis.colorPalette.map((swatch) => (
            <div key={swatch.hex} className="flex flex-col items-center gap-1" title={`${swatch.name} · ${swatch.percentage}%`}>
              <div
                className="size-7 rounded-full border border-border"
                style={{ backgroundColor: swatch.hex }}
              />
            </div>
          ))}
        </div>
      )}

      {(analysis.typographyHeadline || analysis.typographyBody) && (
        <p className="text-xs text-muted-foreground">
          <span className="font-medium text-foreground">Typography:</span> {analysis.typographyHeadline}
          {analysis.typographyBody ? ` / ${analysis.typographyBody}` : ""}
          {analysis.typographyWeight ? ` · ${analysis.typographyWeight}` : ""}
        </p>
      )}

      <div className="flex flex-wrap gap-1.5">
        {analysis.layoutStyle && <Badge variant="outline" className="text-[10px]">{analysis.layoutStyle}</Badge>}
        {analysis.industry && <Badge variant="outline" className="text-[10px]">{analysis.industry}</Badge>}
        {analysis.mood.map((mood) => (
          <Badge key={mood} variant="secondary" className="text-[10px]">
            {mood}
          </Badge>
        ))}
      </div>

      {analysis.components.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {analysis.components.map((component) => (
            <Badge key={component} variant="outline" className="text-[10px] text-muted-foreground">
              {component}
            </Badge>
          ))}
        </div>
      )}

      {hasScores && (
        <div className="grid grid-cols-2 gap-x-4 gap-y-2">
          {SCORE_LABELS.map(([key, label]) => (
            <ScoreMeter key={key} label={label} value={analysis.scores[key]} />
          ))}
        </div>
      )}

      {analysis.aiNotes && <p className="text-xs leading-relaxed text-muted-foreground">{analysis.aiNotes}</p>}
    </div>
  );
}
