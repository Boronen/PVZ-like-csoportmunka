// Loads and caches HTMLImageElement objects by URL.
// Returns a Promise that resolves once all images are loaded.
export class SpriteLoader {
  constructor() {
    this._cache = {};
  }

  /**
   * Load a single image and return a Promise<HTMLImageElement>.
   * Subsequent calls with the same src resolve instantly from cache.
   */
  load(src) {
    if (this._cache[src]) return Promise.resolve(this._cache[src]);

    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload  = () => { this._cache[src] = img; resolve(img); };
      img.onerror = () => reject(new Error(`SpriteLoader: failed to load "${src}"`));
      img.src = src;
    });
  }

  /**
   * Load multiple images in parallel.
   * @param {string[]} srcs
   * @returns {Promise<Object.<string, HTMLImageElement>>}
   */
  async loadAll(srcs) {
    const entries = await Promise.all(
      srcs.map(async src => [src, await this.load(src)])
    );
    return Object.fromEntries(entries);
  }

  get(src) {
    return this._cache[src] ?? null;
  }
}
