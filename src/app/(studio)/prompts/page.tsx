"use client";

import { useState } from "react";
import { BriefList } from "@/features/prompts/components/brief-list";
import { BriefEditor } from "@/features/prompts/components/brief-editor";

export default function PromptBuilderPage() {
  const [selectedId, setSelectedId] = useState<string | null>(null);

  return (
    <div className="flex h-full">
      <BriefList selectedId={selectedId} onSelect={setSelectedId} />
      <BriefEditor briefId={selectedId} />
    </div>
  );
}
