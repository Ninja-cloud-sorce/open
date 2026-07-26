import type { Icon } from "@phosphor-icons/react";
import {
  BookmarkSimple,
  MagnifyingGlass,
  Sparkle,
  SquaresFour,
  Image as ImageIcon,
  Cube,
  ChatCircleText,
  WarningCircle,
  Sliders,
  BookOpen,
} from "@phosphor-icons/react/dist/ssr";

export type ModulePhase =
  | 2
  | 3
  | 4
  | 5
  | 6
  | 7
  | 8
  | 9
  | 10;

export interface StudioModule {
  id: string;
  label: string;
  href: string;
  description: string;
  icon: Icon;
  phase: ModulePhase;
}

export const STUDIO_MODULES: StudioModule[] = [
  {
    id: "inspiration",
    label: "Inspiration Library",
    href: "/inspiration",
    description: "Screenshots, URLs, notes, and collections you're drawing from.",
    icon: BookmarkSimple,
    phase: 2,
  },
  {
    id: "analyzer",
    label: "Screenshot Analyzer",
    href: "/analyzer",
    description: "Claude breaks down typography, layout, color, and motion from a screenshot.",
    icon: MagnifyingGlass,
    phase: 3,
  },
  {
    id: "prompts",
    label: "Prompt Builder",
    href: "/prompts",
    description: "Structure aesthetic, references, intent, and guard rails into a single brief.",
    icon: Sparkle,
    phase: 4,
  },
  {
    id: "variants",
    label: "Variant Generator",
    href: "/variants",
    description: "Five directions at once, then refine the one that's working.",
    icon: SquaresFour,
    phase: 5,
  },
  {
    id: "hero-images",
    label: "Hero Image Generator",
    href: "/hero-images",
    description: "Generate and compare hero imagery via Pollinations.",
    icon: ImageIcon,
    phase: 6,
  },
  {
    id: "components",
    label: "Component Explorer",
    href: "/components",
    description: "Reusable buttons, cards, heroes, and sections with code and notes.",
    icon: Cube,
    phase: 6,
  },
  {
    id: "critique",
    label: "Design Critique",
    href: "/critique",
    description: "A structured pass on hierarchy, spacing, motion, and accessibility.",
    icon: ChatCircleText,
    phase: 7,
  },
  {
    id: "slop-detector",
    label: "AI Slop Detector",
    href: "/slop-detector",
    description: "Scores originality, typography, and layout against common AI tells.",
    icon: WarningCircle,
    phase: 8,
  },
  {
    id: "tweaks",
    label: "Live Tweaks Panel",
    href: "/tweaks",
    description: "Floating controls for type, spacing, color, and motion — instant feedback.",
    icon: Sliders,
    phase: 9,
  },
  {
    id: "recipes",
    label: "Design Recipes",
    href: "/recipes",
    description: "Everything about an approved design, saved and reopenable.",
    icon: BookOpen,
    phase: 10,
  },
];
