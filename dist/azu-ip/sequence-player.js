// One owner, one cursor. Every rendered change is exactly one source frame.
// A new intention changes only the target; it never spawns another animation.
export class FrameStepper {
  constructor({ initial, fps, min = 0, max }) {
    this.frame = initial;
    this.target = initial;
    this.fps = fps;
    this.min = min;
    this.max = max;
    this.speed = 0;
    this.credit = 0;
  }
  aim(frame) {
    if (!Number.isInteger(frame) || frame < this.min || frame > this.max) return;
    this.target = frame;
  }
  tick(seconds) {
    const direction = Math.sign(this.target - this.frame);
    if (!direction) { this.speed = 0; this.credit = 0; return false; }
    // Discard wall-clock debt after a stalled/hidden tab, instead of skipping poses.
    const dt = Math.max(0, Math.min(seconds, 1 / this.fps));
    const desired = direction * Math.min(this.fps, Math.sqrt(2 * this.fps * 5 * Math.abs(this.target - this.frame)));
    const delta = this.fps * 5 * dt;
    this.speed += Math.max(-delta, Math.min(delta, desired - this.speed));
    if (Math.sign(this.speed) !== direction) { this.credit = 0; return false; }
    this.credit += Math.abs(this.speed) * dt;
    if (this.credit < 1) return false;
    this.credit -= 1;
    this.frame += direction;
    if (this.frame === this.target) { this.speed = 0; this.credit = 0; }
    return true;
  }
}
