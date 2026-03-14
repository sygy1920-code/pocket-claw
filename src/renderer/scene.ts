import * as THREE from 'three';
import { Pet } from './pet';

export class PetScene {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private pet: Pet;
  private animId: number | null = null;

  constructor() {
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(60, 1, 0.1, 100);
    this.renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, premultipliedAlpha: false });
    this.pet = new Pet();
  }

  init(container: HTMLElement): void {
    const w = container.clientWidth;
    const h = container.clientHeight;

    this.renderer.setSize(w, h);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setClearColor(0x000000, 0);
    container.appendChild(this.renderer.domElement);

    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    // 狼模型缩放 0.6，高约 1.8 单位，相机靠近显示特写
    this.camera.position.set(0, 0.6, 1.3);
    this.camera.lookAt(0, 0.4, 0);

    // 光源
    this.scene.add(new THREE.AmbientLight(0xffffff, 0.7));
    const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
    dirLight.position.set(3, 5, 5);
    this.scene.add(dirLight);
    const fillLight = new THREE.DirectionalLight(0xfff0f0, 0.3);
    fillLight.position.set(-3, 0, 3);
    this.scene.add(fillLight);

    this.pet.init(this.scene);
    this.startLoop();

    window.addEventListener('resize', this.onResize);
  }

  private startLoop(): void {
    const loop = () => {
      this.animId = requestAnimationFrame(loop);
      this.pet.update();
      this.renderer.render(this.scene, this.camera);
    };
    loop();
  }

  private onResize = (): void => {
    const canvas = this.renderer.domElement;
    const w = canvas.parentElement?.clientWidth ?? window.innerWidth;
    const h = canvas.parentElement?.clientHeight ?? window.innerHeight;
    this.renderer.setSize(w, h);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  };

  getPet(): Pet { return this.pet; }
  getCamera(): THREE.PerspectiveCamera { return this.camera; }

  destroy(): void {
    if (this.animId !== null) cancelAnimationFrame(this.animId);
    window.removeEventListener('resize', this.onResize);
    this.pet.dispose();
    this.renderer.dispose();
  }
}
