/**
 * Contract for objects that receive per-frame updates.
 *
 * Objects implementing this interface are expected to be called
 * once per frame with the delta time since the last frame.
 *
 * @example
 * class Particle implements IUpdatable {
 *   position = { x: 0, y: 0 };
 *   velocity = { x: 1, y: 0 };
 *
 *   update(dt: number): void {
 *     this.position.x += this.velocity.x * dt;
 *     this.position.y += this.velocity.y * dt;
 *   }
 * }
 */
export interface IUpdatable {
  /**
   * Called once per frame to update internal state.
   *
   * @param dt Delta time in seconds since last frame.
   *           Typical values: 0.016 (60fps), 0.033 (30fps).
   *           Implementations should handle variable dt gracefully.
   */
  update(dt: number): void;
}
