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

export type ModuleGroup = "Design flow" | "Inputs" | "Refine" | "Library";

export interface StudioModule {
  id: string;
  label: string;
  href: string;
  description: string;
  icon: Icon;
  group: ModuleGroup;
  /** Roadmap phase — modules past the current build show as upcoming. */
  phase: number;
  ready: boolean;
}

export const STUDIO_MODULES: StudioModule[] = [
  {
    id: "projects",
    label: "Projects",
    href: "/projects",
    description: "The guided path: brief, ten directions, narrow to one, then build it out.",
    icon: SquaresFour,
    group: "Design flow",
    phase: 5,
    ready: true,
  },
  {
    id: "hero-images",
    label: "Hero Images",
    href: "/hero-images",
    description: "Generate and compare hero imagery via Pollinations.",
    icon: ImageIcon,
    group: "Design flow",
    phase: 6,
    ready: true,
  },
  {
    id: "inspiration",
    label: "Inspiration Library",
    href: "/inspiration",
    description: "Screenshots, URLs, notes, and collections you're drawing from.",
    icon: BookmarkSimple,
    group: "Inputs",
    phase: 2,
    ready: true,
  },
  {
    id: "analyzer",
    label: "Screenshot Analyzer",
    href: "/analyzer",
    description: "Break down typography, layout, color, and motion from a screenshot.",
    icon: MagnifyingGlass,
    group: "Inputs",
    phase: 3,
    ready: false,
  },
  {
    id: "prompts",
    label: "Prompt Builder",
    href: "/prompts",
    description: "Structure aesthetic, references, intent, and guard rails into a single brief.",
    icon: Sparkle,
    group: "Inputs",
    phase: 4,
    ready: true,
  },
  {
    id: "critique",
    label: "Design Critique",
    href: "/critique",
    description: "A structured pass on hierarchy, spacing, motion, and accessibility.",
    icon: ChatCircleText,
    group: "Refine",
    phase: 8,
    ready: false,
  },
  {
    id: "slop-detector",
    label: "AI Slop Detector",
    href: "/slop-detector",
    description: "Scores originality, typography, and layout against common AI tells.",
    icon: WarningCircle,
    group: "Refine",
    phase: 9,
    ready: false,
  },
  {
    id: "tweaks",
    label: "Live Tweaks",
    href: "/tweaks",
    description: "Floating controls for type, spacing, color, and motion — instant feedback.",
    icon: Sliders,
    group: "Refine",
    phase: 10,
    ready: false,
  },
  {
    id: "components",
    label: "Component Explorer",
    href: "/components",
    description: "Reusable buttons, cards, heroes, and sections with code and notes.",
    icon: Cube,
    group: "Library",
    phase: 7,
    ready: true,
  },
  {
    id: "recipes",
    label: "Design Recipes",
    href: "/recipes",
    description: "Everything about an approved design, saved and reopenable.",
    icon: BookOpen,
    group: "Library",
    phase: 11,
    ready: false,
  },
];

export const MODULE_GROUPS: ModuleGroup[] = ["Design flow", "Inputs", "Refine", "Library"];
