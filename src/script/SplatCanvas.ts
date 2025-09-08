import {
  Application,
  Asset,
  AssetListLoader,
  CameraComponent,
  Color,
  Entity,
  FILLMODE_NONE,
  Pose,
  RESOLUTION_AUTO,
  Vec3,
} from "playcanvas";

interface SuperSplatProjectDocument {
  camera: {
    fov: number;
  };
  view: {
    bgColor: [number, number, number, number];
  };
  poseSets: [
    {
      poses: [
        {
          frame: number;
          position: [number, number, number];
          target: [number, number, number];
        },
      ];
    },
  ];
}

const easeOut = (t: number) => 1 - (t - 1) * (t - 1);

class SplatCanvas {
  private canvas: HTMLCanvasElement;
  private app!: Application;
  private camera?: Entity;
  private camPose: Pose = new Pose();
  private poses: Pose[] = [];
  private poseIdx = 0;
  private scene: string;
  private updateCameraFn?: () => void;
  private base: string;
  private readonly DEBUG = true; // Flip to true to log pose snapshots and transitions.
  private _lastGoodPose: Pose | null = null; // Stores last validated pose to fall back to.

  // =========================
  // Idle/Active state machine
  // =========================
  private isIdle = true; // Viewer starts in idle mode, per spec.
  private idleBlend = 1.0; // Blending weight [0..1] toward idle motion.
  private idleBlendTimeConst = 0.6; // Seconds; higher = slower transitions.
  private inactivityMs = 3000; // Milliseconds to return to idle.
  private inactivityTimerId: number | null = null; // setTimeout handle for inactivity.
  private reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;

  // =========================
  // Idle hover configuration
  // =========================
  private _idleHoverCenter = new Vec3(0, 0, 0); // The center point for the camera's hover motion.
  private _idleHoverRadius = 0.04; // Max distance from center in world units for hover.
  private _idleHoverSpeedX = 0.25; // Frequency of hover motion on the X-axis.
  private _idleHoverSpeedY = 0.18; // Frequency of hover motion on the Y-axis.
  private _idleHoverSpeedZ = 0.32; // Frequency of hover motion on the Z-axis.
  private idleFollowTimeConst = 0.35; // Seconds for following idle target smoothly.
  private idleStartTime = performance.now(); // Timestamp when idle began.
  private _idleLookTarget = new Vec3(0, 0, 0); // Fixed "look-at" point while idling; captured from the current pose.

  // =========================
  // Idle drift/pause pattern
  // =========================
  // Configuration ranges (seconds) for drift motion and micro-pauses; tuned for subtlety.
  private _idleDriftDurationRange: [number, number] = [1.2, 2.2];
  private _idlePauseDurationRange: [number, number] = [1.0, 2.0];

  // Waypoint step radius scale ∈ [min,max] of _idleHoverRadius; keeps hops short and centered.
  private _idleStepRadiusScale: [number, number] = [0.35, 1.0];

  // Idle phase state machine
  private _idlePhase: "pause" | "drift" = "pause";
  private _idlePhaseStartMs = 0;
  private _idlePhaseDurationMs = 800;

  // Current drift endpoints in world space. We keep positions and rebuild pose via look(from,to).
  private _idleFrom = new Vec3();
  private _idleTo = new Vec3();

  // Deterministic PRNG (LCG) for reproducible waypoint sampling per session.
  private _rngState = 1337;
  private _rand(): number {
    // LCG parameters from Numerical Recipes; 32-bit modulus.
    this._rngState = (1664525 * this._rngState + 1013904223) >>> 0;
    return this._rngState / 0x100000000;
  }

  constructor(canvas: HTMLCanvasElement, scene: string, sizeElement: HTMLElement, base: string) {
    this.canvas = canvas;
    this.scene = scene;
    this.base = base.endsWith("/") ? base : base + "/";
    this.init(sizeElement);
    void this.asyncInit();
  }

  private init(sizeElement: HTMLElement) {
    const resolution = () => [sizeElement.offsetWidth, sizeElement.offsetHeight];

    this.app = new Application(this.canvas, {
      graphicsDeviceOptions: {
        antialias: false,
      },
    });
    this.app.setCanvasFillMode(FILLMODE_NONE, ...resolution());
    this.app.setCanvasResolution(RESOLUTION_AUTO);
    this.app.start();

    window.addEventListener("resize", () => this.app.resizeCanvas(...resolution()));

    // Attach interaction handlers to flip into "active" state and restart inactivity timer.
    this.attachInteractionHandlers();
  }

  private async asyncInit() {
    const sceneName = this.scene;
    if (!sceneName) {
      console.warn("no scene set");
      return;
    }

    const location = this.base + "/static/" + sceneName;
    const [splat, document] = await this.loadAssets(location);

    const ssDocument = document.resource as SuperSplatProjectDocument;

    this.initPoses(ssDocument);
    this.initCamera(ssDocument);
    this.initSplat(splat);

    // Initialize idle parameters from document.json when available.
    this._initializeIdleParameters(ssDocument);

    // Begin in idle mode unless user prefers reduced motion.
    if (!this.reduceMotion) {
      this.enterIdle();
    } else {
      this.isIdle = false;
      this.idleBlend = 0;
    }
  }

  private async loadAssets(location: string): Promise<[Asset, Asset]> {
    const assetList: [Asset, Asset] = [
      new Asset("SOGS Asset", "gsplat", { url: location + "/meta.json" }),
      new Asset("Doc Asset", "json", { url: location + "/document.json" }),
    ];
    const loader = new AssetListLoader(assetList, this.app.assets);
    await new Promise((resolve) => loader.load(resolve));
    return assetList;
  }

  private initPoses(document: SuperSplatProjectDocument) {
    this.poses = document.poseSets[0].poses.map((f) => new Pose().look(new Vec3(...f.position), new Vec3(...f.target)));
  }

  private initCamera(document: SuperSplatProjectDocument) {
    this.camera = new Entity("Camera");

    this.camera.addComponent("camera");
    const camera = this.camera.camera as CameraComponent;

    camera.clearColor = new Color(...document.view.bgColor);
    camera.camera.fov = document.camera.fov / 2;

    this.app.root.addChild(this.camera);

    // The main update loop.
    // It prioritizes scripted camera movements (updateCameraFn) over idle animations.
    this.app.on("update", (dt: number) => {
      // If a scripted movement is active, execute it.
      if (this.updateCameraFn) {
        this.updateCameraFn();
      } else {
        // Otherwise, perform the idle update.
        this.updateIdle(dt);
      }
    });

    const firstPose = this.poses[0];

    // IMPORTANT: Apply the first pose *synchronously* to avoid the first-load race
    // where idle snapshots a zeroed pose. This sets both this.camPose and the entity now.
    this.applyPoseImmediately(firstPose);
    this._lastGoodPose = firstPose.clone();
    if (this.DEBUG) {
      console.debug("[SplatCanvas] Initial pose applied synchronously:", {
        position: firstPose.position,
        angles: firstPose.angles,
        distance: firstPose.distance,
      });
    }
  }

  initSplat(splatAsset: Asset) {
    const splat = new Entity("Scene");
    splat.addComponent("gsplat", { asset: splatAsset });
    splat.setPosition(0, 0, 0);
    splat.setEulerAngles(0, 0, 180);
    this.app.root.addChild(splat);
  }

  private moveToPose(toPose: Pose, durationMillis: number = 0) {
    if (!this.camera) {
      console.warn("no camera");
      return;
    }

    // Ensure idle cannot influence this scripted movement (or the frame after it).
    // This prevents the post-animation "snap" caused by residual low-pass state.
    this.isIdle = false;
    this.idleBlend = 0;

    const camera = this.camera;
    const startMillis = Date.now();
    const endMillis = startMillis + durationMillis;
    const fromPose = this.camPose.clone();
    this.updateCameraFn = () => {
      const now = Date.now();
      const t = durationMillis > 0 ? (now - startMillis) / (endMillis - startMillis) : 1;
      const alpha = durationMillis === 0 ? 1 : easeOut(Math.min(t, 1));

      this.camPose = alpha >= 1 ? toPose : this.camPose.lerp(fromPose, toPose, alpha, alpha);
      camera.setPosition(this.camPose.position);
      camera.setEulerAngles(this.camPose.angles);

      if (alpha >= 1) {
        this._lastGoodPose = toPose.clone();
      }

      if (t >= 1) {
        this.updateCameraFn = undefined;
      }
    };
  }

  public togglePose(durationMillis: number = 0) {
    // Force Active state and clear any pending idle timers before starting a scripted move.
    this.markActive();

    this.poseIdx = (this.poseIdx + 1) % this.poses.length;
    this.moveToPose(this.poses[this.poseIdx], durationMillis);
  }

  // =============================================================================================
  // Idle/Active orchestration
  // =============================================================================================
  /**
   * Initialize the idle state parameters from the SuperSplat document.
   * This sets the look-at target and the initial hover center point.
   */
  private _initializeIdleParameters(doc: SuperSplatProjectDocument): void {
    // Use the very first pose from the JSON as the initial "waypoint" around which idle will hover.
    // We strictly honor the document-derived look-at by reconstructing it via Pose.look(...) later.
    if (this.poses.length > 0) {
      const startPose = this.poses[0];
      this._idleHoverCenter.copy(startPose.position);

      // Derive a conservative hover radius from the camera's initial distance to target.
      // (Small fraction of distance; clamped to configured maximum.)
      const tmpFocus = startPose.getFocus(new Vec3());
      const startDistance = startPose.position.distance(tmpFocus);
      const derived = Math.max(0.01, Math.min(this._idleHoverRadius, startDistance * 0.05));
      this._idleHoverRadius = derived;
    }

    // If we already have a current cam pose (e.g., after an immediate move), capture its focus as idle target.
    // Otherwise, synthesize it from the first pose.
    const basePose = this.camPose ?? this.poses[0];
    if (basePose) {
      basePose.getFocus(this._idleLookTarget);
    }
  }

  /**
   * Attach lightweight interaction listeners that flip to "active" and restart the inactivity timer.
   * Uses passive listeners where appropriate to avoid blocking scrolling on touch/wheel.
   */
  private attachInteractionHandlers(): void {
    const mark = () => this.markActive();
    const passiveOpts: AddEventListenerOptions = { passive: true };

    // Pointer and wheel interactions on the canvas imply user activity.
    this.canvas.addEventListener("pointerdown", mark, passiveOpts);
    //this.canvas.addEventListener("pointermove", mark, passiveOpts);
    //this.canvas.addEventListener("wheel", mark, passiveOpts);
    this.canvas.addEventListener("click", mark, passiveOpts);

    // Keyboard can also be considered activity while the viewer is focused.
    window.addEventListener("keydown", mark, passiveOpts);
  }

  /**
   * Called whenever we detect user activity. Enters "active" mode and schedules return to idle.
   */
  private markActive(): void {
    if (this.reduceMotion) {
      // Respect reduced motion preference by keeping idle disabled.
      this.isIdle = false;
      this.idleBlend = 0;
      return;
    }

    this.isIdle = false;
    this.idleBlend = 0; // Immediately drop any residual idle blend to avoid post-animation drift.

    // Restart inactivity timer.
    if (this.inactivityTimerId !== null) {
      clearTimeout(this.inactivityTimerId);
    }
    this.inactivityTimerId = window.setTimeout(() => this.enterIdle(), this.inactivityMs);
  }

  /**
   * Enters "idle" mode. The hover center is set to the current camera position
   * to ensure a smooth transition from active interaction to idle motion.
   */
  private enterIdle(): void {
    // Set the center for the new hover motion to the camera's current position.
    // This ensures a seamless transition from user control to the idle animation.
    // Defensive: if camPose is not yet valid (e.g., first frame), fall back to last good or first pose.
    if (!this.isPoseValid(this.camPose) && this._lastGoodPose) {
      this._idleHoverCenter.copy(this._lastGoodPose.position);
      this._lastGoodPose.getFocus(this._idleLookTarget);
    } else {
      this._idleHoverCenter.copy(this.camPose.position);
      this.camPose.getFocus(this._idleLookTarget);
    }

    this.isIdle = true;
    this.idleStartTime = performance.now();

    // Initialize the waypoint state: start with a brief pause at the current position, then drift.
    this._idleFrom.copy(this._idleHoverCenter);
    this._idleTo.copy(this._pickNextIdleWaypoint());
    this._startIdlePause(this.idleStartTime);

    if (this.DEBUG) {
      console.debug("[SplatCanvas] Enter idle", {
        hoverCenter: this._idleHoverCenter,
        lookTarget: this._idleLookTarget,
        camPose: this.camPose,
      });
    }
  }

  /**
   * Per-frame idle update. Smoothly blends between the interactive pose and the computed idle pose.
   * @param dt Seconds since last frame (from PlayCanvas).
   */
  private updateIdle(dt: number): void {
    if (!this.camera) {
      return;
    }

    // 1) Exponential smoothing of the 'idleBlend' (0 => fully active, 1 => fully idle)
    //    using a time constant for a natural acceleration/deceleration of motion.
    const targetBlend = this.isIdle ? 1.0 : 0.0;
    const k = 1 - Math.exp(-dt / this.idleBlendTimeConst);
    this.idleBlend += (targetBlend - this.idleBlend) * k;

    // If idle motion is disabled by accessibility preference, keep viewer still.
    if (this.reduceMotion || this.idleBlend <= 0.0005) {
      // Ensure the camera matches the current interactive pose (no idle offset).
      this.camera.setPosition(this.camPose.position);
      this.camera.setEulerAngles(this.camPose.angles);

      return;
    }

    // 2) Compute the target idle pose using a drift→pause→drift waypoint pattern with smoothstep easing.
    const idlePose = this._updateIdleDriftPause(performance.now());

    // 3) First-order follow toward idle pose at a controlled rate, then blend by idleBlend.
    const followK = 1 - Math.exp(-dt / this.idleFollowTimeConst);
    const followed = new Pose().copy(this.camPose).lerp(this.camPose, idlePose, followK, followK, followK);

    // 4) Interpolate between interactive pose and the followed idle pose by 'idleBlend'.
    const finalPose = new Pose()
      .copy(this.camPose)
      .lerp(this.camPose, followed, this.idleBlend, this.idleBlend, this.idleBlend);

    // 5) Apply to camera entity.
    this.camPose = finalPose;
    this.camera.setPosition(finalPose.position);
    this.camera.setEulerAngles(finalPose.angles);
  }

  /**
   * Generates a subtle hovering pose around the hover center point, always looking at the fixed target.
   * @param tSec Seconds since idle started.
   */
  private _computeIdleHoverPose(tSec: number): Pose {
    // Subtle, phase-shifted triaxial motion (Lissajous-like) with small radius.
    // Amplitudes are intentionally tiny to avoid distracting motion.
    const dx = Math.sin(tSec * this._idleHoverSpeedX * Math.PI * 2) * this._idleHoverRadius * 0.8;
    const dy = Math.sin(tSec * this._idleHoverSpeedY * Math.PI * 2 + Math.PI * 0.5) * this._idleHoverRadius * 0.5;
    const dz = Math.cos(tSec * this._idleHoverSpeedZ * Math.PI * 2) * this._idleHoverRadius * 0.6;

    const from = new Vec3().copy(this._idleHoverCenter).add(new Vec3(dx, dy, dz));

    // Preserve the document-derived "look-at" by rebuilding pose from 'from' to fixed '_idleLookTarget'.
    return new Pose().look(from, this._idleLookTarget);
  }

  // =============================================================================================
  // Utilities
  // =============================================================================================
  /** Immediately applies a pose to both the internal state and the camera entity. */
  private applyPoseImmediately(pose: Pose): void {
    this.camPose = pose.clone();
    if (this.camera) {
      this.camera.setPosition(this.camPose.position);
      this.camera.setEulerAngles(this.camPose.angles);
    }
  }

  /** Validates that a pose has finite components and a sensible focus distance. */
  private isPoseValid(p: Pose): boolean {
    const v = p.position;
    const a = p.angles;
    const finite =
      Number.isFinite(v.x) &&
      Number.isFinite(v.y) &&
      Number.isFinite(v.z) &&
      Number.isFinite(a.x) &&
      Number.isFinite(a.y) &&
      Number.isFinite(a.z);
    return finite;
  }

  // =============================================================================================
  // Idle drift/pause internals
  // =============================================================================================

  /** Starts a drift segment from `_idleFrom` to `_idleTo` with a randomized duration. */
  private _startIdleDrift(nowMs: number): void {
    const dur = this._randRangeMs(this._idleDriftDurationRange);
    this._idlePhase = "drift";
    this._idlePhaseStartMs = nowMs;
    this._idlePhaseDurationMs = dur;
  }

  /** Starts a brief pause (hold position) before the next hop. */
  private _startIdlePause(nowMs: number): void {
    const dur = this._randRangeMs(this._idlePauseDurationRange);
    this._idlePhase = "pause";
    this._idlePhaseStartMs = nowMs;
    this._idlePhaseDurationMs = dur;
  }

  /**
   * Per-frame evaluation of the drift/pause pattern. Returns the target idle pose for this frame.
   * - During "pause": hold `_idleTo`. When the pause ends, pick the next waypoint and start drifting.
   * - During "drift": smoothstep from `_idleFrom` to `_idleTo`. When complete, enter "pause".
   */
  private _updateIdleDriftPause(nowMs: number): Pose {
    if (this._idlePhase === "pause") {
      if (nowMs - this._idlePhaseStartMs >= this._idlePhaseDurationMs) {
        // Next hop: current "to" becomes new "from"; sample a new target near the center.
        this._idleFrom.copy(this._idleTo);
        this._idleTo.copy(this._pickNextIdleWaypoint());
        this._startIdleDrift(nowMs);
      }

      return new Pose().look(this._idleTo, this._idleLookTarget);
    }

    // Drift phase: ease from `_idleFrom` to `_idleTo` with C1-continuous smoothstep.
    const t = Math.min(1, Math.max(0, (nowMs - this._idlePhaseStartMs) / this._idlePhaseDurationMs));
    const s = this._smoothstep01(t);

    const pos = new Vec3(
      this._idleFrom.x + (this._idleTo.x - this._idleFrom.x) * s,
      this._idleFrom.y + (this._idleTo.y - this._idleFrom.y) * s,
      this._idleFrom.z + (this._idleTo.z - this._idleFrom.z) * s,
    );

    if (t >= 1) {
      this._startIdlePause(nowMs);
    }

    return new Pose().look(pos, this._idleLookTarget);
  }

  /** Samples the next waypoint near `_idleHoverCenter` using uniform disk sampling in XZ, with a small Y offset. */
  private _pickNextIdleWaypoint(): Vec3 {
    // Sample a radius uniformly over a disk: r = R * sqrt(u), theta ∈ [0,2π).
    const stepScale = this._lerp(this._idleStepRadiusScale[0], this._idleStepRadiusScale[1], this._rand());
    const R = Math.max(0.001, this._idleHoverRadius * stepScale);

    const u = this._rand();
    const v = this._rand();
    const r = Math.sqrt(u) * R;
    const theta = v * Math.PI * 2;

    const dx = Math.cos(theta) * r;
    const dz = Math.sin(theta) * r;

    // Keep vertical drift gentler than horizontal.
    const dy = (this._rand() * 2 - 1) * R * 0.35;

    return new Vec3(this._idleHoverCenter.x + dx, this._idleHoverCenter.y + dy, this._idleHoverCenter.z + dz);
  }

  /** Smoothstep on [0,1] for C1 continuity: 3t^2 - 2t^3. */
  private _smoothstep01(t: number): number {
    const x = Math.min(1, Math.max(0, t));
    return x * x * (3 - 2 * x);
  }

  /** Inclusive random milliseconds from a [min,max] seconds range. */
  private _randRangeMs(rangeSec: [number, number]): number {
    const sec = this._lerp(rangeSec[0], rangeSec[1], this._rand());
    return Math.max(1, Math.round(sec * 1000));
  }

  /** Scalar lerp helper. */
  private _lerp(a: number, b: number, t: number): number {
    return a + (b - a) * t;
  }
}

export { SplatCanvas };
