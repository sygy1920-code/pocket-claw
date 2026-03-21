import type { Live2DScene } from './live2d-scene';

interface MenuItem {
  label?: string;
  action?: () => void;
  separator?: true;
}

// Motion name to display name mapping
const MOTION_LABELS: Record<string, string> = {
  'Idle': '待机',
  'Tap': '点击',
  'DoubleTap': '双击',
  'Happy': '开心',
  'Excited': '兴奋',
  'Shake': '摇头',
  'Jump': '跳跃',
  'Walk': '走路',
  'Run': '跑步',
  'Sit': '坐下',
  'Sleep': '睡觉',
  'Angry': '生气',
  'Sad': '难过',
  'Surprised': '惊讶',
  'Blink': '眨眼',
  'Breath': '呼吸',
};

export class ContextMenu {
  private scene: Live2DScene;
  private el: HTMLElement | null = null;

  constructor(scene: Live2DScene) {
    this.scene = scene;
  }

  init(): void {
    window.addEventListener('show-context-menu', (e: Event) => {
      const { x, y } = (e as CustomEvent).detail;
      this.show(x, y);
    });
    document.addEventListener('click', () => this.hide());
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') this.hide();
    });
  }

  private show(x: number, y: number): void {
    this.hide();

    this.el = document.createElement('div');
    this.el.className = 'context-menu';

    const items = this.buildMenuItems();

    for (const item of items) {
      if (item.separator) {
        const sep = document.createElement('div');
        sep.className = 'context-menu-separator';
        this.el.appendChild(sep);
      } else {
        const btn = document.createElement('div');
        btn.className = 'context-menu-item';
        btn.textContent = item.label ?? '';
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          item.action?.();
          this.hide();
        });
        this.el.appendChild(btn);
      }
    }

    this.el.style.left = `${x}px`;
    this.el.style.top = `${y}px`;
    document.body.appendChild(this.el);

    // 防止超出边界
    requestAnimationFrame(() => {
      if (!this.el) return;
      const rect = this.el.getBoundingClientRect();
      if (rect.right > window.innerWidth) {
        this.el.style.left = `${x - rect.width}px`;
      }
      if (rect.bottom > window.innerHeight) {
        this.el.style.top = `${y - rect.height}px`;
      }
    });
  }

  private hide(): void {
    this.el?.remove();
    this.el = null;
  }

  /**
   * Build menu items dynamically based on available motions and expressions
   */
  private buildMenuItems(): MenuItem[] {
    const items: MenuItem[] = [];

    // Get motion groups from the scene
    const motionGroups = this.scene.getMotionGroups();
    const motionNames = Object.keys(motionGroups);

    // Only show motions if available
    if (motionNames.length > 0) {
      for (const motionName of motionNames) {
        const displayName = this.getMotionDisplayName(motionName);
        items.push({
          label: displayName,
          action: () => this.scene.playMotion(motionName)
        });
      }
      items.push({ separator: true });
    }

    items.push({ label: '关闭菜单', action: () => this.hide() });

    return items;
  }

  /**
   * Get display name for a motion
   */
  private getMotionDisplayName(motionName: string): string {
    // Try to find a mapping
    for (const [key, label] of Object.entries(MOTION_LABELS)) {
      if (motionName.toLowerCase().includes(key.toLowerCase()) ||
          key.toLowerCase().includes(motionName.toLowerCase())) {
        return label;
      }
    }

    // Fallback to original name with emoji
    return motionName;
  }

  destroy(): void {
    this.hide();
  }
}
