// Lightweight image prefetcher with module-level cache.
// - De-dupes concurrent prefetches for the same URL
// - Survives component remounts (cache lives on the module)
// - Honors Save-Data / very slow connections by skipping prefetch
// - Never throws; prefetch failures are silently ignored

const cache = new Map<string, Promise<void>>();

const isLowBandwidth = (): boolean => {
  if (typeof navigator === "undefined") return false;
  const conn = (navigator as any).connection;
  if (!conn) return false;
  if (conn.saveData) return true;
  if (typeof conn.effectiveType === "string") {
    // 'slow-2g' | '2g' → skip aggressive prefetching
    return conn.effectiveType === "slow-2g" || conn.effectiveType === "2g";
  }
  return false;
};

/**
 * Prefetch a single image URL. Resolves once it's in the browser cache,
 * or immediately if it's already been prefetched / not worth prefetching.
 */
export function prefetchImage(url: string | null | undefined): Promise<void> {
  if (!url) return Promise.resolve();
  if (typeof window === "undefined") return Promise.resolve();
  if (cache.has(url)) return cache.get(url)!;
  if (isLowBandwidth()) return Promise.resolve();

  const p = new Promise<void>((resolve) => {
    try {
      const img = new Image();
      // Hint to the browser that this is a low-priority, async load
      img.decoding = "async";
      // `fetchpriority` is an emerging attribute; setting via property is safe
      (img as any).fetchPriority = "low";
      img.onload = () => resolve();
      img.onerror = () => {
        // Drop from cache so a later visible <img> can retry
        cache.delete(url);
        resolve();
      };
      img.src = url;
    } catch {
      resolve();
    }
  });

  cache.set(url, p);
  return p;
}

/** Prefetch a list of URLs in parallel. */
export function prefetchImages(urls: Array<string | null | undefined>): Promise<void> {
  return Promise.all(urls.map(prefetchImage)).then(() => undefined);
}
