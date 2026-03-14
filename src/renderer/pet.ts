import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const ANIM = {
  run:   '01_Run_Armature_0',
  walk:  '02_walk_Armature_0',
  creep: '03_creep_Armature_0',
  idle:  '04_Idle_Armature_0',
  sit:   '05_site_Armature_0',
} as const;

type PetState = 'idle' | 'happy' | 'excited';

export class Pet {
  readonly group: THREE.Group;
  private clock = new THREE.Clock();
  private mixer: THREE.AnimationMixer | null = null;
  private actions = new Map<string, THREE.AnimationAction>();
  private currentAction: THREE.AnimationAction | null = null;

  private state: PetState = 'idle';
  private stateTimer = 0;
  private loaded = false;
  private baseRotationY = 0;
  private targetRotationY = 0;
  private _rotSpeed = 0;

  constructor() {
    this.group = new THREE.Group();
  }

  init(scene: THREE.Scene): void {
    scene.add(this.group);
    this.loadModel();
  }

  private loadModel(): void {
    const loader = new GLTFLoader();
    loader.load(
      '/models/wolf/Wolf-Blender-2.82a.gltf',
      (gltf) => {
        const model = gltf.scene;

        // 缩放 & 朝向（模型面朝 +Z，相机在 +Z 方向，需旋转 180° 朝向相机）
        model.scale.setScalar(0.6);
        model.rotation.y = Math.PI / 2;

        // 隐藏地面圆圈
        const circle = model.getObjectByName('Circle');
        if (circle) circle.visible = false;

        this.group.add(model);
        this.mixer = new THREE.AnimationMixer(model);

        for (const clip of gltf.animations) {
          this.actions.set(clip.name, this.mixer.clipAction(clip));
        }

        this.loaded = true;
        this.group.rotation.y = 0;
        this.targetRotationY = 0;
        this.playAnim(ANIM.idle, 0);
      },
      undefined,
      (err) => console.error('Wolf model load error:', err)
    );
  }

  private playAnim(name: string, fadeIn = 0.3): void {
    const next = this.actions.get(name);
    if (!next || next === this.currentAction) return;

    if (this.currentAction) {
      this.currentAction.fadeOut(fadeIn);
    }
    next.reset().fadeIn(fadeIn).play();
    this.currentAction = next;
  }

  setState(state: PetState): void {
    this.state = state;
    this.stateTimer = 0;

    if (!this.loaded) return;

    switch (state) {
      case 'idle':
        this.playAnim(ANIM.idle);
        break;
      case 'happy':
        this.playAnim(ANIM.walk);
        this.targetRotationY += Math.PI / 2;
        this._rotSpeed = (Math.PI / 2) / 2;  // 2 秒转完 90°
        break;
      case 'excited':
        this.playAnim(ANIM.run);
        break;
    }
  }

  update(): void {
    const dt = this.clock.getDelta();
    this.mixer?.update(dt);

    if (!this.loaded) return;

    this.stateTimer += dt;

    // 匀速旋转，到达目标后停止
    if (Math.abs(this.targetRotationY - this.group.rotation.y) > 0.001) {
      const step = this._rotSpeed * dt;
      const remaining = this.targetRotationY - this.group.rotation.y;
      this.group.rotation.y += Math.sign(remaining) * Math.min(step, Math.abs(remaining));
    }

    if (this.state === 'happy' && this.stateTimer > 2) {
      this.setState('idle');
    } else if (this.state === 'excited' && this.stateTimer > 2.5) {
      this.setState('idle');
    }
  }

  getMeshes(): THREE.Object3D[] {
    return [this.group];
  }

  dispose(): void {
    this.mixer?.stopAllAction();
    this.group.traverse((obj) => {
      if (obj instanceof THREE.Mesh) {
        obj.geometry.dispose();
        if (Array.isArray(obj.material)) {
          obj.material.forEach(m => m.dispose());
        } else {
          obj.material.dispose();
        }
      }
    });
  }
}
