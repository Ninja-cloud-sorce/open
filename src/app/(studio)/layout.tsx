import { Sidebar } from "@/features/shell/components/sidebar";
import { Topbar } from "@/features/shell/components/topbar";
import { CommandPalette } from "@/features/shell/components/command-palette";

export default function StudioLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen w-full overflow-hidden">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar />
        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>
      <CommandPalette />
    </div>
  );
}
