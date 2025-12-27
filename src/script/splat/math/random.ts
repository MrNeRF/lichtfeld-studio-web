/**
 * Deterministic random number generation.
 *
 * This module provides a seeded pseudo-random number generator (PRNG)
 * using the Linear Congruential Generator algorithm. Seeded randomness
 * is essential for reproducible animations and testing.
 *
 * @module math/random
 */

/**
 * Deterministic pseudo-random number generator using Linear Congruential Generator.
 *
 * Produces reproducible sequences given the same seed. This is important for:
 * - Reproducible animations (same seed = same animation)
 * - Testing (predictable random values)
 * - Debugging (can replay exact sequences)
 *
 * LCG parameters from Numerical Recipes (32-bit):
 * - a = 1664525
 * - c = 1013904223
 * - m = 2^32
 *
 * @example
 * const rng = new SeededRandom(12345);
 *
 * // Generate random values
 * rng.next();           // 0.0 to 1.0
 * rng.range(10, 20);    // 10.0 to 20.0
 * rng.rangeInt(1, 6);   // 1 to 6 (inclusive)
 * rng.bool(0.7);        // true 70% of the time
 * rng.pick(['a', 'b']); // Random element from array
 *
 * // Reset for reproducibility
 * rng.setSeed(12345);   // Same sequence again
 */
export class SeededRandom {
  /** Current internal state */
  private _state: number;

  /**
   * Create a new seeded random generator.
   *
   * @param seed Initial seed value (default: 1337)
   */
  constructor(seed: number = 1337) {
    this._state = seed >>> 0; // Ensure unsigned 32-bit
  }

  /**
   * Get the current seed state.
   * Can be saved and restored later for reproducibility.
   */
  get seed(): number {
    return this._state;
  }

  /**
   * Reset the generator with a new seed.
   *
   * @param seed New seed value
   */
  setSeed(seed: number): void {
    this._state = seed >>> 0;
  }

  /**
   * Generate the next random number in [0, 1).
   *
   * @returns Random float in range [0, 1)
   */
  next(): number {
    // LCG formula: state = (a * state + c) mod m
    // a = 1664525, c = 1013904223, m = 2^32
    this._state = ((1664525 * this._state) + 1013904223) >>> 0;

    return this._state / 0x100000000;
  }

  /**
   * Generate a random number in a range.
   *
   * @param min Minimum value (inclusive)
   * @param max Maximum value (exclusive)
   * @returns Random number in [min, max)
   *
   * @example
   * rng.range(0, 10);    // 0.0 to 9.999...
   * rng.range(-1, 1);    // -1.0 to 0.999...
   */
  range(min: number, max: number): number {
    return min + this.next() * (max - min);
  }

  /**
   * Generate a random integer in a range.
   *
   * @param min Minimum value (inclusive)
   * @param max Maximum value (inclusive)
   * @returns Random integer in [min, max]
   *
   * @example
   * rng.rangeInt(1, 6);   // 1, 2, 3, 4, 5, or 6
   * rng.rangeInt(0, 100); // 0 to 100
   */
  rangeInt(min: number, max: number): number {
    return Math.floor(this.range(min, max + 1));
  }

  /**
   * Generate a random boolean with given probability of true.
   *
   * @param probability Probability of returning true [0..1] (default: 0.5)
   * @returns Random boolean
   *
   * @example
   * rng.bool();      // 50% chance of true
   * rng.bool(0.9);   // 90% chance of true
   * rng.bool(0.1);   // 10% chance of true
   */
  bool(probability: number = 0.5): boolean {
    return this.next() < probability;
  }

  /**
   * Pick a random element from an array.
   *
   * @param array Source array (not modified)
   * @returns Random element, or undefined if array is empty
   *
   * @example
   * rng.pick(['red', 'green', 'blue']); // Random color
   * rng.pick([]);                        // undefined
   */
  pick<T>(array: readonly T[]): T | undefined {
    if (array.length === 0) {
      return undefined;
    }

    return array[this.rangeInt(0, array.length - 1)];
  }

  /**
   * Shuffle an array in place using Fisher-Yates algorithm.
   *
   * @param array Array to shuffle (modified in place)
   * @returns The same array, shuffled
   *
   * @example
   * const cards = [1, 2, 3, 4, 5];
   * rng.shuffle(cards); // cards is now shuffled
   */
  shuffle<T>(array: T[]): T[] {
    for (let i = array.length - 1; i > 0; i--) {
      const j = this.rangeInt(0, i);
      [array[i], array[j]] = [array[j], array[i]];
    }

    return array;
  }

  /**
   * Generate a random value from a Gaussian (normal) distribution.
   *
   * Uses the Box-Muller transform.
   *
   * @param mean Mean of the distribution (default: 0)
   * @param stdDev Standard deviation (default: 1)
   * @returns Random value from normal distribution
   *
   * @example
   * rng.gaussian();        // Standard normal (mean=0, stdDev=1)
   * rng.gaussian(100, 15); // IQ-like distribution
   */
  gaussian(mean: number = 0, stdDev: number = 1): number {
    // Box-Muller transform
    const u1 = this.next();
    const u2 = this.next();

    const z0 = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);

    return z0 * stdDev + mean;
  }

  /**
   * Create a new SeededRandom with a derived seed.
   *
   * Useful for creating independent random streams that are still
   * reproducible from the parent seed.
   *
   * @param offset Offset to add to current seed (default: 1)
   * @returns New SeededRandom instance
   *
   * @example
   * const rng = new SeededRandom(12345);
   * const childRng = rng.fork();  // Independent stream
   */
  fork(offset: number = 1): SeededRandom {
    return new SeededRandom(this._state + offset);
  }
}

/**
 * Global seeded random instance for consistent results.
 *
 * Use setSeed() at startup for reproducible behavior across sessions.
 *
 * @example
 * import { seededRandom } from './random';
 *
 * // Set seed at app startup
 * seededRandom.setSeed(Date.now());
 *
 * // Use throughout the app
 * const x = seededRandom.range(-1, 1);
 */
export const seededRandom = new SeededRandom();

/**
 * Generate a random seed from the current time.
 *
 * @returns A seed value based on current timestamp
 */
export function generateSeed(): number {
  return (Date.now() ^ (Math.random() * 0x100000000)) >>> 0;
}
