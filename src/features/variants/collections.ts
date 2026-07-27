/**
 * The five fixed design languages every round is built against.
 *
 * Each lane generates its own interpretation of the same five, which is what
 * makes the split view a real comparison: pick "Print-Tech" and you are looking
 * at one brief answered by two rulebooks, not at two unrelated ideas that happen
 * to sit side by side.
 */
export interface DesignCollection {
  id: string;
  /** Shown on the bar. Kept short so five fit without wrapping. */
  name: string;
  /** The design language itself, handed to the model verbatim. */
  brief: string;
}

export const COLLECTIONS: DesignCollection[] = [
  {
    id: "print-tech",
    name: "Print-Tech",
    brief:
      "Swiss print sensibility applied to a technical subject. A visible modular grid, tight tracking, rules and hairlines doing structural work, and type set with the precision of a specification sheet. Ink-on-paper palette with one signal color used sparingly. Everything aligned, nothing decorative.",
  },
  {
    id: "dither-mono",
    name: "Dither Mono",
    brief:
      "Early-computing texture treated as a craft material. Monospace or near-monospace type, halftone and dither patterns as surface, a restricted near-duotone palette, and hard edges throughout. Feels like a well-printed technical manual rather than a retro pastiche.",
  },
  {
    id: "vast-quiet",
    name: "Vast Quiet",
    brief:
      "Enormous negative space with very few elements, each placed deliberately. Small type against large emptiness, one focal moment per screen, and slow pacing down the page. Restraint is the entire idea. No section fights another for attention.",
  },
  {
    id: "data-texture",
    name: "Data-Texture",
    brief:
      "Information density as the aesthetic. Tables, figures, labelled values, and small-scale type arranged so that richness reads as confidence rather than clutter. Rules and alignment carry the structure. The page rewards close reading.",
  },
  {
    id: "classical",
    name: "Classical",
    brief:
      "Book typography and classical proportion. A serif at display scale with genuine optical care, generous measure, traditional hierarchy, and a warm paper-toned palette. Timeless rather than trend-driven, with the authority of a well-set title page.",
  },
];

export const COLLECTION_COUNT = COLLECTIONS.length;

/** Variants pair across lanes by their order index, which is the collection index. */
export function collectionAt(index: number): DesignCollection | undefined {
  return COLLECTIONS[index];
}
