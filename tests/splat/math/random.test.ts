/**
 * random.test.ts
 *
 * Tests for the SeededRandom class and random utilities.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { SeededRandom, seededRandom, generateSeed } from "@/script/splat/math/random";

// =================================================================================================
// SEEDED RANDOM - BASIC FUNCTIONALITY
// =================================================================================================

describe("SeededRandom - basic functionality", () => {
  it("should create with default seed", () => {
    const rng = new SeededRandom();

    expect(rng.seed).toBe(1337);
  });

  it("should create with custom seed", () => {
    const rng = new SeededRandom(12345);

    expect(rng.seed).toBe(12345);
  });

  it("should update seed with setSeed", () => {
    const rng = new SeededRandom();
    rng.setSeed(99999);

    expect(rng.seed).toBe(99999);
  });

  it("should handle negative seeds by converting to unsigned", () => {
    const rng = new SeededRandom(-1);

    // -1 >>> 0 = 4294967295
    expect(rng.seed).toBe(4294967295);
  });
});

// =================================================================================================
// SEEDED RANDOM - DETERMINISM
// =================================================================================================

describe("SeededRandom - determinism", () => {
  it("should produce same sequence for same seed", () => {
    const rng1 = new SeededRandom(12345);
    const rng2 = new SeededRandom(12345);

    for (let i = 0; i < 100; i++) {
      expect(rng1.next()).toBe(rng2.next());
    }
  });

  it("should produce different sequences for different seeds", () => {
    const rng1 = new SeededRandom(12345);
    const rng2 = new SeededRandom(54321);

    // At least one of the first values should differ
    const sameCount = [0, 1, 2, 3, 4]
      .map(() => rng1.next() === rng2.next())
      .filter(Boolean).length;

    expect(sameCount).toBeLessThan(5);
  });

  it("should reset to same sequence after setSeed", () => {
    const rng = new SeededRandom(12345);
    const firstSequence = [rng.next(), rng.next(), rng.next()];

    rng.setSeed(12345);
    const secondSequence = [rng.next(), rng.next(), rng.next()];

    expect(firstSequence).toEqual(secondSequence);
  });
});

// =================================================================================================
// SEEDED RANDOM - NEXT
// =================================================================================================

describe("SeededRandom - next", () => {
  let rng: SeededRandom;

  beforeEach(() => {
    rng = new SeededRandom(12345);
  });

  it("should return values in range [0, 1)", () => {
    for (let i = 0; i < 1000; i++) {
      const value = rng.next();

      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(1);
    }
  });

  it("should produce uniformly distributed values", () => {
    const buckets = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0]; // 10 buckets

    for (let i = 0; i < 10000; i++) {
      const bucket = Math.floor(rng.next() * 10);
      buckets[bucket]++;
    }

    // Each bucket should have roughly 1000 values (10%)
    // Allow for some variance (±30%)
    for (const count of buckets) {
      expect(count).toBeGreaterThan(700);
      expect(count).toBeLessThan(1300);
    }
  });
});

// =================================================================================================
// SEEDED RANDOM - RANGE
// =================================================================================================

describe("SeededRandom - range", () => {
  let rng: SeededRandom;

  beforeEach(() => {
    rng = new SeededRandom(12345);
  });

  it("should return values within the specified range", () => {
    for (let i = 0; i < 100; i++) {
      const value = rng.range(10, 20);

      expect(value).toBeGreaterThanOrEqual(10);
      expect(value).toBeLessThan(20);
    }
  });

  it("should work with negative ranges", () => {
    for (let i = 0; i < 100; i++) {
      const value = rng.range(-10, -5);

      expect(value).toBeGreaterThanOrEqual(-10);
      expect(value).toBeLessThan(-5);
    }
  });

  it("should work with ranges crossing zero", () => {
    for (let i = 0; i < 100; i++) {
      const value = rng.range(-5, 5);

      expect(value).toBeGreaterThanOrEqual(-5);
      expect(value).toBeLessThan(5);
    }
  });
});

// =================================================================================================
// SEEDED RANDOM - RANGE INT
// =================================================================================================

describe("SeededRandom - rangeInt", () => {
  let rng: SeededRandom;

  beforeEach(() => {
    rng = new SeededRandom(12345);
  });

  it("should return integers within the specified range (inclusive)", () => {
    for (let i = 0; i < 100; i++) {
      const value = rng.rangeInt(1, 6);

      expect(Number.isInteger(value)).toBe(true);
      expect(value).toBeGreaterThanOrEqual(1);
      expect(value).toBeLessThanOrEqual(6);
    }
  });

  it("should produce all values in range", () => {
    const seen = new Set<number>();

    for (let i = 0; i < 1000; i++) {
      seen.add(rng.rangeInt(1, 6));
    }

    expect(seen.size).toBe(6);
    expect(seen.has(1)).toBe(true);
    expect(seen.has(6)).toBe(true);
  });

  it("should work with single value range", () => {
    for (let i = 0; i < 10; i++) {
      expect(rng.rangeInt(5, 5)).toBe(5);
    }
  });
});

// =================================================================================================
// SEEDED RANDOM - BOOL
// =================================================================================================

describe("SeededRandom - bool", () => {
  let rng: SeededRandom;

  beforeEach(() => {
    rng = new SeededRandom(12345);
  });

  it("should return roughly 50% true with default probability", () => {
    let trueCount = 0;

    for (let i = 0; i < 1000; i++) {
      if (rng.bool()) trueCount++;
    }

    expect(trueCount).toBeGreaterThan(400);
    expect(trueCount).toBeLessThan(600);
  });

  it("should return more true values with higher probability", () => {
    let trueCount = 0;

    for (let i = 0; i < 1000; i++) {
      if (rng.bool(0.9)) trueCount++;
    }

    expect(trueCount).toBeGreaterThan(800);
  });

  it("should return fewer true values with lower probability", () => {
    let trueCount = 0;

    for (let i = 0; i < 1000; i++) {
      if (rng.bool(0.1)) trueCount++;
    }

    expect(trueCount).toBeLessThan(200);
  });

  it("should always return false with probability 0", () => {
    for (let i = 0; i < 100; i++) {
      expect(rng.bool(0)).toBe(false);
    }
  });

  it("should always return true with probability 1", () => {
    for (let i = 0; i < 100; i++) {
      expect(rng.bool(1)).toBe(true);
    }
  });
});

// =================================================================================================
// SEEDED RANDOM - PICK
// =================================================================================================

describe("SeededRandom - pick", () => {
  let rng: SeededRandom;

  beforeEach(() => {
    rng = new SeededRandom(12345);
  });

  it("should return undefined for empty array", () => {
    expect(rng.pick([])).toBeUndefined();
  });

  it("should return the only element from single-element array", () => {
    expect(rng.pick(["only"])).toBe("only");
  });

  it("should return elements from the array", () => {
    const arr = ["a", "b", "c"];

    for (let i = 0; i < 100; i++) {
      const picked = rng.pick(arr);

      expect(arr).toContain(picked);
    }
  });

  it("should pick all elements eventually", () => {
    const arr = ["a", "b", "c", "d"];
    const picked = new Set<string>();

    for (let i = 0; i < 1000; i++) {
      const item = rng.pick(arr);
      if (item) picked.add(item);
    }

    expect(picked.size).toBe(4);
  });
});

// =================================================================================================
// SEEDED RANDOM - SHUFFLE
// =================================================================================================

describe("SeededRandom - shuffle", () => {
  let rng: SeededRandom;

  beforeEach(() => {
    rng = new SeededRandom(12345);
  });

  it("should return the same array reference", () => {
    const arr = [1, 2, 3, 4, 5];
    const result = rng.shuffle(arr);

    expect(result).toBe(arr);
  });

  it("should contain all original elements", () => {
    const arr = [1, 2, 3, 4, 5];
    rng.shuffle(arr);

    expect(arr.sort()).toEqual([1, 2, 3, 4, 5]);
  });

  it("should change the order", () => {
    const arr = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    const original = [...arr];
    rng.shuffle(arr);

    // Very unlikely to remain in the same order
    expect(arr).not.toEqual(original);
  });

  it("should produce same shuffle for same seed", () => {
    const rng1 = new SeededRandom(12345);
    const rng2 = new SeededRandom(12345);

    const arr1 = [1, 2, 3, 4, 5];
    const arr2 = [1, 2, 3, 4, 5];

    rng1.shuffle(arr1);
    rng2.shuffle(arr2);

    expect(arr1).toEqual(arr2);
  });
});

// =================================================================================================
// SEEDED RANDOM - GAUSSIAN
// =================================================================================================

describe("SeededRandom - gaussian", () => {
  let rng: SeededRandom;

  beforeEach(() => {
    rng = new SeededRandom(12345);
  });

  it("should produce values with mean close to specified mean", () => {
    const mean = 50;
    let sum = 0;
    const n = 10000;

    for (let i = 0; i < n; i++) {
      sum += rng.gaussian(mean, 10);
    }

    const calculatedMean = sum / n;

    expect(calculatedMean).toBeCloseTo(mean, 0);
  });

  it("should produce values with standard deviation close to specified", () => {
    const mean = 0;
    const stdDev = 10;
    const values: number[] = [];
    const n = 10000;

    for (let i = 0; i < n; i++) {
      values.push(rng.gaussian(mean, stdDev));
    }

    // Calculate sample standard deviation
    const sampleMean = values.reduce((a, b) => a + b, 0) / n;
    const variance = values.reduce((sum, v) => sum + Math.pow(v - sampleMean, 2), 0) / (n - 1);
    const sampleStdDev = Math.sqrt(variance);

    expect(sampleStdDev).toBeCloseTo(stdDev, 0);
  });

  it("should default to mean=0, stdDev=1", () => {
    const values: number[] = [];
    const n = 10000;

    for (let i = 0; i < n; i++) {
      values.push(rng.gaussian());
    }

    const mean = values.reduce((a, b) => a + b, 0) / n;
    const variance = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / (n - 1);
    const stdDev = Math.sqrt(variance);

    expect(mean).toBeCloseTo(0, 0);
    expect(stdDev).toBeCloseTo(1, 0);
  });
});

// =================================================================================================
// SEEDED RANDOM - FORK
// =================================================================================================

describe("SeededRandom - fork", () => {
  it("should create a new independent instance", () => {
    const rng = new SeededRandom(12345);
    const forked = rng.fork();

    expect(forked).not.toBe(rng);
    expect(forked).toBeInstanceOf(SeededRandom);
  });

  it("should have a different seed", () => {
    const rng = new SeededRandom(12345);
    const forked = rng.fork();

    expect(forked.seed).not.toBe(rng.seed);
  });

  it("should use custom offset", () => {
    const rng = new SeededRandom(12345);
    const forked = rng.fork(100);

    expect(forked.seed).toBe(12345 + 100);
  });

  it("should produce independent sequences", () => {
    const rng = new SeededRandom(12345);

    // Advance the original RNG
    rng.next();
    rng.next();

    const forked = rng.fork();

    // Parent and child should produce different sequences
    const parentSeq = [rng.next(), rng.next(), rng.next()];
    const childSeq = [forked.next(), forked.next(), forked.next()];

    expect(parentSeq).not.toEqual(childSeq);
  });
});

// =================================================================================================
// GLOBAL SEEDED RANDOM
// =================================================================================================

describe("seededRandom (global instance)", () => {
  it("should exist and be a SeededRandom instance", () => {
    expect(seededRandom).toBeDefined();
    expect(seededRandom).toBeInstanceOf(SeededRandom);
  });

  it("should be resettable", () => {
    seededRandom.setSeed(99999);

    expect(seededRandom.seed).toBe(99999);
  });
});

// =================================================================================================
// GENERATE SEED
// =================================================================================================

describe("generateSeed", () => {
  it("should return a number", () => {
    const seed = generateSeed();

    expect(typeof seed).toBe("number");
  });

  it("should return an unsigned 32-bit integer", () => {
    const seed = generateSeed();

    expect(seed).toBeGreaterThanOrEqual(0);
    expect(seed).toBeLessThanOrEqual(0xFFFFFFFF);
    expect(Number.isInteger(seed)).toBe(true);
  });

  it("should produce different values on consecutive calls", () => {
    const seeds = new Set<number>();

    for (let i = 0; i < 10; i++) {
      seeds.add(generateSeed());
    }

    // Should have at least some unique values
    expect(seeds.size).toBeGreaterThan(1);
  });
});
