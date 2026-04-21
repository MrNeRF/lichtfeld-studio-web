import type { NormalizedSuperSplatScene } from "./normalizeSuperSplatScene";

type SuperSplatAnimation = NonNullable<NormalizedSuperSplatScene["animation"]>;

export interface SampledSuperSplatCameraAnimation {
  position: [number, number, number];
  target: [number, number, number];
  fov: number;
}

interface CompiledSuperSplatSpline {
  times: number[];
  knots: number[];
  dimension: number;
}

const compiledSplineCache = new WeakMap<SuperSplatAnimation, CompiledSuperSplatSpline>();

function mod(value: number, divisor: number): number {
  return ((value % divisor) + divisor) % divisor;
}

function resolveLoopedTime(animation: SuperSplatAnimation, timeSeconds: number): number {
  if (animation.duration <= 0) {
    return 0;
  }

  switch (animation.loopMode) {
    case "repeat":
      return mod(timeSeconds, animation.duration);
    case "pingpong": {
      const doubledDuration = animation.duration * 2;
      const cursor = mod(timeSeconds, doubledDuration);

      return cursor > animation.duration ? doubledDuration - cursor : cursor;
    }
    case "none":
    default:
      return Math.max(0, Math.min(animation.duration, timeSeconds));
  }
}

function createAnimationPoints(animation: SuperSplatAnimation): number[] {
  const points: number[] = [];
  const { times, values } = animation.keyframes;

  for (let index = 0; index < times.length; index += 1) {
    points.push(
      values.position[index * 3],
      values.position[index * 3 + 1],
      values.position[index * 3 + 2],
      values.target[index * 3],
      values.target[index * 3 + 1],
      values.target[index * 3 + 2],
      values.fov[index]
    );
  }

  return points;
}

function calculateSplineKnots(times: number[], points: number[], smoothness: number): CompiledSuperSplatSpline {
  const keyframeCount = times.length;
  const dimension = points.length / keyframeCount;
  const knots = new Array(keyframeCount * dimension * 3);

  for (let keyframeIndex = 0; keyframeIndex < keyframeCount; keyframeIndex += 1) {
    const frame = times[keyframeIndex];

    for (let dimensionIndex = 0; dimensionIndex < dimension; dimensionIndex += 1) {
      const pointIndex = keyframeIndex * dimension + dimensionIndex;
      const point = points[pointIndex];
      let tangent = 0;

      if (keyframeIndex === 0) {
        tangent = (points[pointIndex + dimension] - point) / (times[keyframeIndex + 1] - frame);
      } else if (keyframeIndex === keyframeCount - 1) {
        tangent = (point - points[pointIndex - dimension]) / (frame - times[keyframeIndex - 1]);
      } else {
        tangent =
          (points[pointIndex + dimension] - points[pointIndex - dimension]) /
          (times[keyframeIndex + 1] - times[keyframeIndex - 1]);
      }

      const inputScale = keyframeIndex > 0 ? times[keyframeIndex] - times[keyframeIndex - 1] : times[1] - times[0];
      const outputScale =
        keyframeIndex < keyframeCount - 1
          ? times[keyframeIndex + 1] - times[keyframeIndex]
          : times[keyframeIndex] - times[keyframeIndex - 1];

      knots[pointIndex * 3] = tangent * inputScale * smoothness;
      knots[pointIndex * 3 + 1] = point;
      knots[pointIndex * 3 + 2] = tangent * outputScale * smoothness;
    }
  }

  return {
    times,
    knots,
    dimension,
  };
}

function createLoopingSpline(animation: SuperSplatAnimation): CompiledSuperSplatSpline {
  const { times } = animation.keyframes;
  const points = createAnimationPoints(animation);

  if (times.length < 2) {
    return calculateSplineKnots(times, points, animation.smoothness);
  }

  const dimension = points.length / times.length;
  const extraFrame = animation.duration === times[times.length - 1] / animation.frameRate ? 1 : 0;
  const loopLength = (animation.duration + extraFrame) * animation.frameRate;
  const loopedTimes = times.slice();
  const loopedPoints = points.slice();

  loopedTimes.push(loopLength + times[0], loopLength + times[1]);
  loopedPoints.push(...points.slice(0, dimension * 2));

  loopedTimes.splice(0, 0, times[times.length - 2] - loopLength, times[times.length - 1] - loopLength);
  loopedPoints.splice(0, 0, ...points.slice(points.length - dimension * 2));

  return calculateSplineKnots(loopedTimes, loopedPoints, animation.smoothness);
}

function getCompiledSpline(animation: SuperSplatAnimation): CompiledSuperSplatSpline {
  const cachedSpline = compiledSplineCache.get(animation);

  if (cachedSpline) {
    return cachedSpline;
  }

  const compiledSpline = createLoopingSpline(animation);

  compiledSplineCache.set(animation, compiledSpline);

  return compiledSpline;
}

function readSplineValue(spline: CompiledSuperSplatSpline, keyframeIndex: number, result: number[]): number[] {
  const { knots, dimension } = spline;
  const knotIndex = keyframeIndex * 3 * dimension;

  for (let dimensionIndex = 0; dimensionIndex < dimension; dimensionIndex += 1) {
    result[dimensionIndex] = knots[knotIndex + dimensionIndex * 3 + 1];
  }

  return result;
}

function evaluateSplineSegment(
  spline: CompiledSuperSplatSpline,
  segmentIndex: number,
  t: number,
  result: number[]
): number[] {
  const { knots, dimension } = spline;
  const tSquared = t * t;
  const doubledT = t + t;
  const oneMinusT = 1 - t;
  const oneMinusTSquared = oneMinusT * oneMinusT;
  let knotIndex = segmentIndex * dimension * 3;

  for (let dimensionIndex = 0; dimensionIndex < dimension; dimensionIndex += 1) {
    const point0 = knots[knotIndex + 1];
    const tangent0 = knots[knotIndex + 2];
    const tangent1 = knots[knotIndex + dimension * 3];
    const point1 = knots[knotIndex + dimension * 3 + 1];

    knotIndex += 3;
    result[dimensionIndex] =
      point0 * ((1 + doubledT) * oneMinusTSquared) +
      tangent0 * (t * oneMinusTSquared) +
      point1 * (tSquared * (3 - doubledT)) +
      tangent1 * (tSquared * (t - 1));
  }

  return result;
}

function evaluateSplineAtFrame(
  spline: CompiledSuperSplatSpline,
  playbackFrame: number,
  result: number[]
): number[] {
  const lastKeyframeIndex = spline.times.length - 1;

  if (playbackFrame <= spline.times[0]) {
    return readSplineValue(spline, 0, result);
  }

  if (playbackFrame >= spline.times[lastKeyframeIndex]) {
    return readSplineValue(spline, lastKeyframeIndex, result);
  }

  let segmentIndex = 0;

  while (playbackFrame >= spline.times[segmentIndex + 1]) {
    segmentIndex += 1;
  }

  const segmentStart = spline.times[segmentIndex];
  const segmentEnd = spline.times[segmentIndex + 1];

  return evaluateSplineSegment(spline, segmentIndex, (playbackFrame - segmentStart) / (segmentEnd - segmentStart), result);
}

/**
 * Sample a normalized camera animation track at a given time.
 *
 * @param animation Normalized camera animation track
 * @param timeSeconds Playback time in seconds
 * @returns Interpolated position, target, and fov
 */
export function sampleSuperSplatCameraAnimation(
  animation: SuperSplatAnimation,
  timeSeconds: number
): SampledSuperSplatCameraAnimation {
  const { times } = animation.keyframes;

  if (times.length === 0) {
    throw new Error("Cannot sample an animation track with no keyframes");
  }

  if (times.length === 1) {
    return {
      position: [
        animation.keyframes.values.position[0],
        animation.keyframes.values.position[1],
        animation.keyframes.values.position[2],
      ],
      target: [
        animation.keyframes.values.target[0],
        animation.keyframes.values.target[1],
        animation.keyframes.values.target[2],
      ],
      fov: animation.keyframes.values.fov[0],
    };
  }

  const playbackFrame = resolveLoopedTime(animation, timeSeconds) * animation.frameRate;
  const sample = evaluateSplineAtFrame(getCompiledSpline(animation), playbackFrame, new Array(7).fill(0));

  return {
    position: [sample[0], sample[1], sample[2]],
    target: [sample[3], sample[4], sample[5]],
    fov: sample[6],
  };
}
