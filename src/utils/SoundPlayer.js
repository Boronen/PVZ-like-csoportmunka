/**
 * SoundPlayer — per-entity audio helper used by Enemy (and any future entity).
 *
 * Wraps a tiny Audio cache so many Enemy instances that share the same sound
 * file reuse the same HTMLAudioElement instead of creating hundreds of
 * objects.  The cache is keyed by `src` path and is shared across all
 * SoundPlayer instances via the module-level `_cache` map.
 *
 * Usage
 * ─────
 * ```js
 * this._sfx = new SoundPlayer(config.sounds ?? {});
 *
 * // play immediately (rewinds & restarts each call):
 * this._sfx.play('spawn', 0.65);
 *
 * // play but stop after maxDurationMs so it doesn't bleed into the next
 * // attack cycle:
 * this._sfx.playLimited('melee', 0.7, 2000);
 * ```
 *
 * The `sounds` object passed to the constructor is a map of logical keys to
 * asset paths, e.g.:
 * ```js
 * { spawn: 'assets/musics/bones_spawn.mp3',
 *   move:  'assets/musics/bones.mp3',
 *   melee: 'assets/musics/jozsi_smash_v2.mp3' }
 * ```
 */

// Module-level cache — shared by all SoundPlayer instances so a path that
// is referenced by several enemies only ever creates one Audio object.
const _cache = new Map();

/**
 * Retrieve (or lazily create) the cached Audio element for a given path.
 *
 * @param {string} src  Asset path.
 * @param {number} volume  Initial volume (0–1).  Only applied on first creation.
 * @returns {HTMLAudioElement}
 */
function _getAudio(src, volume) {
  if (!_cache.has(src)) {
    const audio = new Audio(src);
    audio.volume = volume;
    _cache.set(src, audio);
  }
  return _cache.get(src);
}

export class SoundPlayer {
  /**
   * @param {Record<string, string>} sounds
   *   Map of logical key → asset path (e.g. `{ move: 'assets/musics/…' }`).
   *   Keys with falsy values are silently ignored.
   */
  constructor(sounds) {
    /** @type {Record<string, string>} */
    this._sounds = sounds ?? {};
  }

  /**
   * Play a sound by its logical key.
   *
   * Rewinds the audio to the start each call so overlapping attacks still
   * produce a sound even if the previous one hasn't finished.
   *
   * @param {string} key     Logical sound key (must exist in the sounds map).
   * @param {number} [volume=0.6]  Playback volume (0–1).
   * @returns {HTMLAudioElement | null}  The Audio element, or null if the key
   *   is not configured.
   */
  play(key, volume = 0.6) {
    const src = this._sounds[key];
    if (!src) return null;

    const audio = _getAudio(src, volume);
    audio.volume      = volume;   // update in case it changed
    audio.currentTime = 0;
    audio.play().catch(() => {}); // swallow autoplay-policy errors
    return audio;
  }

  /**
   * Play a sound and automatically stop it after `maxDurationMs` milliseconds.
   *
   * Useful for looping or long sound effects that should not bleed beyond a
   * single attack cycle (e.g. melee hit SFX).
   *
   * @param {string} key            Logical sound key.
   * @param {number} [volume=0.6]   Playback volume (0–1).
   * @param {number} [maxDurationMs=2000]  How long to let the clip run (ms).
   * @returns {HTMLAudioElement | null}
   */
  playLimited(key, volume = 0.6, maxDurationMs = 2000) {
    const audio = this.play(key, volume);
    if (audio) {
      setTimeout(() => {
        audio.pause();
        audio.currentTime = 0;
      }, maxDurationMs);
    }
    return audio;
  }

  /**
   * Return true if a logical key is configured with a non-empty path.
   *
   * @param {string} key
   * @returns {boolean}
   */
  has(key) {
    return Boolean(this._sounds[key]);
  }
}
