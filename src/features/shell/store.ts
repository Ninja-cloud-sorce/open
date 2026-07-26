import { create } from "zustand";

interface ShellState {
  sidebarCollapsed: boolean;
  toggleSidebar: () => void;
  paletteOpen: boolean;
  setPaletteOpen: (open: boolean) => void;
}

export const useShellStore = create<ShellState>((set) => ({
  sidebarCollapsed: false,
  toggleSidebar: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
  paletteOpen: false,
  setPaletteOpen: (open) => set({ paletteOpen: open }),
}));
