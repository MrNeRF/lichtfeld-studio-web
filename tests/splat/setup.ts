/**
 * Vitest setup for splat tests.
 *
 * This file sets up mocks for external dependencies like PlayCanvas.
 */

import { vi } from "vitest";
import { Vec3, Quat, Pose, Entity, Color } from "./__mocks__/playcanvas";

// Mock the playcanvas module
vi.mock("playcanvas", () => ({
  Vec3,
  Quat,
  Pose,
  Entity,
  Color,
}));
