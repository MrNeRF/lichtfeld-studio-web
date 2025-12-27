/**
 * CameraPose.test.ts
 *
 * Tests for CameraPose type and utility functions.
 */

import { describe, it, expect } from "vitest";
import { Vec3 } from "playcanvas";
import {
  createPose,
  createPoseFromValues,
  clonePose,
  copyPose,
  isPoseValid,
  lerpPose,
  posesApproxEqual,
  identityPose,
  serializePose,
  deserializePose,
  type CameraPose,
} from "@/script/splat/core/types/CameraPose";

// =================================================================================================
// CREATE POSE TESTS
// =================================================================================================

describe("createPose", () => {
  it("should create a pose from position and angles", () => {
    const position = new Vec3(1, 2, 3);
    const angles = new Vec3(10, 20, 30);
    const pose = createPose(position, angles);

    expect(pose.position.x).toBe(1);
    expect(pose.position.y).toBe(2);
    expect(pose.position.z).toBe(3);
    expect(pose.angles.x).toBe(10);
    expect(pose.angles.y).toBe(20);
    expect(pose.angles.z).toBe(30);
  });

  it("should clone input vectors (independence)", () => {
    const position = new Vec3(1, 2, 3);
    const angles = new Vec3(10, 20, 30);
    const pose = createPose(position, angles);

    position.x = 100;
    angles.x = 100;

    expect(pose.position.x).toBe(1); // Should not change
    expect(pose.angles.x).toBe(10); // Should not change
  });

  it("should accept optional focus distance", () => {
    const pose = createPose(new Vec3(0, 0, 0), new Vec3(0, 0, 0), 10);

    expect(pose.focusDistance).toBe(10);
  });
});

// =================================================================================================
// CREATE POSE FROM VALUES TESTS
// =================================================================================================

describe("createPoseFromValues", () => {
  it("should create a pose from raw numbers", () => {
    const pose = createPoseFromValues(1, 2, 3, 10, 20, 30);

    expect(pose.position.x).toBe(1);
    expect(pose.position.y).toBe(2);
    expect(pose.position.z).toBe(3);
    expect(pose.angles.x).toBe(10);
    expect(pose.angles.y).toBe(20);
    expect(pose.angles.z).toBe(30);
  });

  it("should accept optional focus distance", () => {
    const pose = createPoseFromValues(0, 0, 0, 0, 0, 0, 5);

    expect(pose.focusDistance).toBe(5);
  });
});

// =================================================================================================
// CLONE POSE TESTS
// =================================================================================================

describe("clonePose", () => {
  it("should create an independent copy", () => {
    const original = createPoseFromValues(1, 2, 3, 10, 20, 30, 5);
    const clone = clonePose(original);

    expect(clone.position.x).toBe(1);
    expect(clone.angles.x).toBe(10);
    expect(clone.focusDistance).toBe(5);
    expect(clone).not.toBe(original);
    expect(clone.position).not.toBe(original.position);
    expect(clone.angles).not.toBe(original.angles);
  });

  it("should be independent from original", () => {
    const original = createPoseFromValues(1, 2, 3, 10, 20, 30);
    const clone = clonePose(original);

    original.position.x = 100;
    original.angles.x = 100;

    expect(clone.position.x).toBe(1);
    expect(clone.angles.x).toBe(10);
  });
});

// =================================================================================================
// COPY POSE TESTS
// =================================================================================================

describe("copyPose", () => {
  it("should copy values from source to destination", () => {
    const dest = createPoseFromValues(0, 0, 0, 0, 0, 0);
    const src = createPoseFromValues(1, 2, 3, 10, 20, 30, 5);

    const result = copyPose(dest, src);

    expect(dest.position.x).toBe(1);
    expect(dest.angles.x).toBe(10);
    expect(dest.focusDistance).toBe(5);
    expect(result).toBe(dest);
  });

  it("should not modify source", () => {
    const dest = createPoseFromValues(0, 0, 0, 0, 0, 0);
    const src = createPoseFromValues(1, 2, 3, 10, 20, 30);

    copyPose(dest, src);
    dest.position.x = 100;

    expect(src.position.x).toBe(1);
  });
});

// =================================================================================================
// IS POSE VALID TESTS
// =================================================================================================

describe("isPoseValid", () => {
  it("should return true for valid poses", () => {
    const pose = createPoseFromValues(1, 2, 3, 10, 20, 30);

    expect(isPoseValid(pose)).toBe(true);
  });

  it("should return false for NaN position", () => {
    const pose = createPoseFromValues(NaN, 0, 0, 0, 0, 0);

    expect(isPoseValid(pose)).toBe(false);
  });

  it("should return false for NaN angles", () => {
    const pose = createPoseFromValues(0, 0, 0, NaN, 0, 0);

    expect(isPoseValid(pose)).toBe(false);
  });

  it("should return false for Infinity position", () => {
    const pose = createPoseFromValues(Infinity, 0, 0, 0, 0, 0);

    expect(isPoseValid(pose)).toBe(false);
  });
});

// =================================================================================================
// LERP POSE TESTS
// =================================================================================================

describe("lerpPose", () => {
  it("should return from when t = 0", () => {
    const from = createPoseFromValues(0, 0, 0, 0, 0, 0);
    const to = createPoseFromValues(10, 20, 30, 90, 180, 45);
    const result = lerpPose(from, to, 0);

    expect(result.position.x).toBe(0);
    expect(result.position.y).toBe(0);
    expect(result.position.z).toBe(0);
    expect(result.angles.x).toBe(0);
  });

  it("should return to when t = 1", () => {
    const from = createPoseFromValues(0, 0, 0, 0, 0, 0);
    const to = createPoseFromValues(10, 20, 30, 90, 180, 45);
    const result = lerpPose(from, to, 1);

    expect(result.position.x).toBe(10);
    expect(result.position.y).toBe(20);
    expect(result.position.z).toBe(30);
  });

  it("should return midpoint when t = 0.5", () => {
    const from = createPoseFromValues(0, 0, 0, 0, 0, 0);
    const to = createPoseFromValues(10, 20, 30, 90, 0, 0);
    const result = lerpPose(from, to, 0.5);

    expect(result.position.x).toBe(5);
    expect(result.position.y).toBe(10);
    expect(result.position.z).toBe(15);
    expect(result.angles.x).toBe(45);
  });

  it("should interpolate focus distance when both are defined", () => {
    const from = createPoseFromValues(0, 0, 0, 0, 0, 0, 10);
    const to = createPoseFromValues(0, 0, 0, 0, 0, 0, 20);
    const result = lerpPose(from, to, 0.5);

    expect(result.focusDistance).toBe(15);
  });

  it("should use to.focusDistance when from is undefined", () => {
    const from = createPoseFromValues(0, 0, 0, 0, 0, 0);
    const to = createPoseFromValues(0, 0, 0, 0, 0, 0, 10);
    const result = lerpPose(from, to, 0.5);

    expect(result.focusDistance).toBe(10);
  });
});

// =================================================================================================
// POSES APPROX EQUAL TESTS
// =================================================================================================

describe("posesApproxEqual", () => {
  it("should return true for equal poses", () => {
    const a = createPoseFromValues(1, 2, 3, 10, 20, 30);
    const b = createPoseFromValues(1, 2, 3, 10, 20, 30);

    expect(posesApproxEqual(a, b)).toBe(true);
  });

  it("should return true for poses within epsilon", () => {
    const a = createPoseFromValues(1, 2, 3, 10, 20, 30);
    const b = createPoseFromValues(1.0005, 2.0005, 3.0005, 10.05, 20.05, 30.05);

    expect(posesApproxEqual(a, b)).toBe(true);
  });

  it("should return false for poses outside epsilon", () => {
    const a = createPoseFromValues(1, 2, 3, 10, 20, 30);
    const b = createPoseFromValues(1.01, 2, 3, 10, 20, 30);

    expect(posesApproxEqual(a, b)).toBe(false);
  });

  it("should use custom epsilon", () => {
    const a = createPoseFromValues(1, 2, 3, 10, 20, 30);
    const b = createPoseFromValues(1.5, 2.5, 3.5, 15, 25, 35);

    expect(posesApproxEqual(a, b, 1, 10)).toBe(true);
    expect(posesApproxEqual(a, b, 0.1, 1)).toBe(false);
  });
});

// =================================================================================================
// IDENTITY POSE TESTS
// =================================================================================================

describe("identityPose", () => {
  it("should create a pose at origin with no rotation", () => {
    const pose = identityPose();

    expect(pose.position.x).toBe(0);
    expect(pose.position.y).toBe(0);
    expect(pose.position.z).toBe(0);
    expect(pose.angles.x).toBe(0);
    expect(pose.angles.y).toBe(0);
    expect(pose.angles.z).toBe(0);
  });

  it("should have no focus distance", () => {
    const pose = identityPose();

    expect(pose.focusDistance).toBeUndefined();
  });
});

// =================================================================================================
// SERIALIZE / DESERIALIZE POSE TESTS
// =================================================================================================

describe("serializePose", () => {
  it("should convert pose to plain object", () => {
    const pose = createPoseFromValues(1, 2, 3, 10, 20, 30, 5);
    const serialized = serializePose(pose);

    expect(serialized.position).toEqual([1, 2, 3]);
    expect(serialized.angles).toEqual([10, 20, 30]);
    expect(serialized.focusDistance).toBe(5);
  });

  it("should handle undefined focus distance", () => {
    const pose = createPoseFromValues(1, 2, 3, 10, 20, 30);
    const serialized = serializePose(pose);

    expect(serialized.focusDistance).toBeUndefined();
  });
});

describe("deserializePose", () => {
  it("should create pose from serialized data", () => {
    const data = {
      position: [1, 2, 3] as [number, number, number],
      angles: [10, 20, 30] as [number, number, number],
      focusDistance: 5,
    };
    const pose = deserializePose(data);

    expect(pose.position.x).toBe(1);
    expect(pose.position.y).toBe(2);
    expect(pose.position.z).toBe(3);
    expect(pose.angles.x).toBe(10);
    expect(pose.angles.y).toBe(20);
    expect(pose.angles.z).toBe(30);
    expect(pose.focusDistance).toBe(5);
  });

  it("should handle missing focus distance", () => {
    const data = {
      position: [1, 2, 3] as [number, number, number],
      angles: [10, 20, 30] as [number, number, number],
    };
    const pose = deserializePose(data);

    expect(pose.focusDistance).toBeUndefined();
  });
});

// =================================================================================================
// ROUND-TRIP TESTS
// =================================================================================================

describe("serialize/deserialize round-trip", () => {
  it("should preserve pose through serialization", () => {
    const original = createPoseFromValues(1.5, 2.5, 3.5, 15.5, 25.5, 35.5, 10);
    const serialized = serializePose(original);
    const deserialized = deserializePose(serialized);

    expect(posesApproxEqual(original, deserialized)).toBe(true);
    expect(deserialized.focusDistance).toBe(original.focusDistance);
  });
});
