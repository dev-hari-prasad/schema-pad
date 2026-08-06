export interface LilconfigResult {
  config: unknown;
  filepath: string;
  isEmpty?: boolean;
}

// Browser webviews do not have a filesystem-level prisma-ast config file.
export function lilconfigSync() {
  return {
    search: (): LilconfigResult | null => null,
    load: (): LilconfigResult | null => null,
    clearLoadCache: () => undefined,
    clearSearchCache: () => undefined,
    clearCaches: () => undefined,
  };
}
