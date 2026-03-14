import * as THREE from 'three';
import type { PetScene } from './scene';

/**
 * 鼠标处理：
 * - 使用 Raycaster 检测是否悬停在宠物上
 * - 悬停时禁用穿透，移开时恢复穿透
 * - 支持单击、双击、拖拽
 */
export class MouseHandler {
  private petScene: PetScene;
  private raycaster = new THREE.Raycaster();
  private pointer = new THREE.Vector2(-999, -999);

  private isHovering = false;
  private isDragging = false;
  private dragStart: { screenX: number; screenY: number } | null = null;
  private clickCount = 0;
  private lastClickAt = 0;
  private clickTimeoutId: ReturnType<typeof setTimeout> | null = null;

  constructor(petScene: PetScene) {
    this.petScene = petScene;
  }

  init(): void {
    window.addEventListener('mousemove', this.onMove);
    window.addEventListener('mousedown', this.onDown);
    window.addEventListener('mouseup', this.onUp);
    window.addEventListener('click', this.onClick);
    window.addEventListener('contextmenu', this.onContextMenu);
  }

  private onMove = (e: MouseEvent): void => {
    this.pointer.set(
      (e.clientX / window.innerWidth) * 2 - 1,
      -(e.clientY / window.innerHeight) * 2 + 1
    );

    if (this.isDragging && this.dragStart) {
      const dx = e.screenX - this.dragStart.screenX;
      const dy = e.screenY - this.dragStart.screenY;
      this.dragStart = { screenX: e.screenX, screenY: e.screenY };
      window.electronAPI?.moveWindow(dx, dy);
      return;
    }

    this.raycaster.setFromCamera(this.pointer, this.petScene.getCamera());
    const hits = this.raycaster.intersectObjects(
      this.petScene.getPet().getMeshes(),
      true
    );

    const nowHovering = hits.length > 0;
    if (nowHovering !== this.isHovering) {
      this.isHovering = nowHovering;
      window.electronAPI?.setIgnoreMouseEvents(!nowHovering);
      document.body.style.cursor = nowHovering ? 'pointer' : 'default';
    }
  };

  private onDown = (e: MouseEvent): void => {
    if (!this.isHovering || e.button !== 0) return;
    this.isDragging = true;
    this.dragStart = { screenX: e.screenX, screenY: e.screenY };
  };

  private onUp = (_e: MouseEvent): void => {
    this.isDragging = false;
    this.dragStart = null;
  };

  private onClick = (_e: MouseEvent): void => {
    if (!this.isHovering) return;

    const now = Date.now();
    if (now - this.lastClickAt < 300) {
      this.clickCount++;
    } else {
      this.clickCount = 1;
    }
    this.lastClickAt = now;

    if (this.clickTimeoutId) clearTimeout(this.clickTimeoutId);
    this.clickTimeoutId = setTimeout(() => {
      if (this.clickCount >= 2) {
        this.handleDoubleClick();
      } else {
        this.handleSingleClick();
      }
      this.clickCount = 0;
    }, 300);
  };

  private handleSingleClick(): void {
    window.electronAPI?.notifyPetClicked();
    this.petScene.getPet().setState('happy');
  }

  private handleDoubleClick(): void {
    this.petScene.getPet().setState('excited');
  }

  private onContextMenu = (e: MouseEvent): void => {
    if (!this.isHovering) return;
    e.preventDefault();

    window.electronAPI?.showContextMenu(e.clientX, e.clientY);

    // 触发自定义上下文菜单
    window.dispatchEvent(new CustomEvent('show-context-menu', {
      detail: { x: e.clientX, y: e.clientY }
    }));
  };

  destroy(): void {
    window.removeEventListener('mousemove', this.onMove);
    window.removeEventListener('mousedown', this.onDown);
    window.removeEventListener('mouseup', this.onUp);
    window.removeEventListener('click', this.onClick);
    window.removeEventListener('contextmenu', this.onContextMenu);
    if (this.clickTimeoutId) clearTimeout(this.clickTimeoutId);
  }
}
