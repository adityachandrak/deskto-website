import { IndustryPack } from "./industryPack";
import { computerRetailPack } from "../packs/computer-retail";

class IndustryPackRegistry {
  private activePackId: string | null = "computer-retail";
  private packs: Map<string, IndustryPack> = new Map();

  constructor() {
    this.registerPack(computerRetailPack);
  }

  registerPack(pack: IndustryPack) {
    this.packs.set(pack.id, pack);
  }

  setActivePack(packId: string | null) {
    this.activePackId = packId;
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("industry-pack-changed", { detail: packId }));
    }
  }

  getActivePackId(): string | null {
    return this.activePackId;
  }

  getActivePack(): IndustryPack | null {
    if (!this.activePackId) return null;
    return this.packs.get(this.activePackId) || null;
  }

  getPacks(): IndustryPack[] {
    return Array.from(this.packs.values());
  }
}

export const packRegistry = new IndustryPackRegistry();

if (typeof window !== "undefined") {
  (window as any).packRegistry = packRegistry;
}

export default packRegistry;
