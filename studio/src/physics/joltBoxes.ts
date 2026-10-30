/**
 * JoltBoxes — free-falling test boxes in a Jolt world ("falling boxes" stress mode).
 * Real independent dynamic bodies created/destroyed on demand, addressed by a handle.
 * Shared by PhysicsSim and BoxWorld.
 */
import { JOLT_LAYER_MOVING, type JoltModule } from './joltLoader';
import { joltPose } from './joltPose';

type V3 = [number, number, number];

export class JoltBoxes {
  /** handle -> Jolt Body */
  readonly bodies = new Map<number, any>();
  private next = 1;

  constructor(
    private Jolt: JoltModule, private bodyInterface: any,
    private surface: { restitution?: number; friction?: number } = {},
  ) {}

  spawn(pos: V3, half: V3, density: number): number {
    const Jolt = this.Jolt;
    const shape = new Jolt.BoxShapeSettings(new Jolt.Vec3(half[0], half[1], half[2]), 0.02).Create().Get();
    const bs = new Jolt.BodyCreationSettings(
      shape, new Jolt.RVec3(pos[0], pos[1], pos[2]), Jolt.Quat.prototype.sIdentity(), Jolt.EMotionType_Dynamic, JOLT_LAYER_MOVING,
    );
    bs.set_mOverrideMassProperties(Jolt.EOverrideMassProperties_CalculateInertia);
    const mp = new Jolt.MassProperties();
    mp.set_mMass(density * (2 * half[0]) * (2 * half[1]) * (2 * half[2]));
    bs.set_mMassPropertiesOverride(mp);
    if (this.surface.restitution != null) bs.set_mRestitution(this.surface.restitution);
    if (this.surface.friction != null) bs.set_mFriction(this.surface.friction);
    const rb = this.bodyInterface.CreateBody(bs);
    this.bodyInterface.AddBody(rb.GetID(), Jolt.EActivation_Activate);
    const handle = this.next++;
    this.bodies.set(handle, rb);
    return handle;
  }

  poses(): Map<number, { pos: V3; quat: [number, number, number, number] }> {
    const out = new Map<number, { pos: V3; quat: [number, number, number, number] }>();
    for (const [handle, rb] of this.bodies) {
      const { position: pos, quaternion: quat } = joltPose(rb);
      out.set(handle, { pos, quat });
    }
    return out;
  }

  remove(handle: number) {
    const rb = this.bodies.get(handle);
    if (!rb) return;
    this.bodyInterface.RemoveBody(rb.GetID());
    this.bodyInterface.DestroyBody(rb.GetID());
    this.bodies.delete(handle);
  }

  removeAll() {
    for (const handle of [...this.bodies.keys()]) this.remove(handle);
  }
}
