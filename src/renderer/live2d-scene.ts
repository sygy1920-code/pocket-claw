import * as PIXI from 'pixi.js';
import { Live2DModel } from 'pixi-live2d-display/cubism4';

// Expose PIXI to window for Live2D auto-update (required by pixi-live2d-display)
if (typeof window !== 'undefined') {
  (window as any).PIXI = PIXI;
}

const MODEL_URL = '/resource/void_cat_marinki/void_cat.model3.json';
const MODEL_SCALE = 0.06;

type PetState = 'idle' | 'happy' | 'excited';

export class Live2DScene {
  private app: PIXI.Application | null = null;
  private model: Live2DModel | null = null;
  private container: HTMLElement | null = null;
  private state: PetState = 'idle';
  private stateTimer = 0;
  private loaded = false;
  private motionGroups: Record<string, any[]> = {};
  private expressions: string[] = [];

  constructor() {}

  async init(container: HTMLElement): Promise<void> {
    this.container = container;

    // Wait for Cubism Core to load
    await this.waitForCubismCore();

    // Create canvas element
    const canvas = document.createElement('canvas');
    canvas.width = container.clientWidth;
    canvas.height = container.clientHeight;
    canvas.style.width = `${container.clientWidth}px`;
    canvas.style.height = `${container.clientHeight}px`;
    container.appendChild(canvas);

    // Create PIXI Application with transparent background
    this.app = new PIXI.Application({
      view: canvas,
      width: container.clientWidth,
      height: container.clientHeight,
      backgroundColor: 0x000000,
      backgroundAlpha: 0,
      resolution: window.devicePixelRatio || 1,
      autoDensity: true,
    });

    // Load the Live2D model
    await this.loadModel();

    // Handle window resize
    window.addEventListener('resize', this.onResize);
  }

  private async waitForCubismCore(): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      if ((window as any).Live2DCubismCore) {
        resolve();
        return;
      }

      const maxWait = 10000;
      const interval = 100;
      let elapsed = 0;

      const timer = setInterval(() => {
        elapsed += interval;
        if ((window as any).Live2DCubismCore) {
          clearInterval(timer);
          resolve();
        } else if (elapsed >= maxWait) {
          clearInterval(timer);
          reject(new Error('Cubism Core not loaded'));
        }
      }, interval);
    });
  }

  private async loadModel(): Promise<void> {
    if (!this.app) return;

    try {
      console.log('Loading Live2D model from:', MODEL_URL);

      // Load the model - this model doesn't have predefined motions
      this.model = await Live2DModel.from(MODEL_URL, {
        autoInteract: false,
      });

      // Enable interaction for the model
      (this.model as any).interactive = true;
      (this.model as any).cursor = 'pointer';

      // Get motion groups from the model (this model has no motions)
      const internalModel = this.model.internalModel;
      this.motionGroups = (internalModel?.motionManager?.motionGroups as Record<string, any[]>) || {};

      // Get expressions from the model
      this.expressions = internalModel.motionManager.expressionManager?.definitions?.map((d: any) => d.Name) || [];
      console.log('Expression names:', this.expressions);

      console.log('Motion groups:', Object.keys(this.motionGroups));
      console.log('Model loaded:', this.model);

      // Set initial scale and position
      this.model.scale.set(MODEL_SCALE);
      this.model.anchor.set(0.5, 1); // Anchor at bottom center for vertical character
      this.model.x = this.app.screen.width / 2;
      this.model.y = this.app.screen.height - 10; // 10px from bottom

      // Add model to stage first to get correct bounds
      this.app.stage.addChild(this.model as any);

      // Enable stage interaction for mouse tracking
      this.app.stage.interactive = true;
      this.app.stage.hitArea = this.app.screen;

      // Motion event listeners
      this.model.on('motionStart', (group: string, index: number) => {
        console.log(`Motion started: ${group}[${index}]`);
      });

      this.model.on('motionFinish', () => {
        console.log('Motion finished');
      });

      this.loaded = true;
      console.log('Live2D model loaded successfully');

      console.log('Model details:', this.model);

      // Log model bounds for debugging
      const bounds = this.model.getBounds();
      console.log('Model bounds:', bounds);
      console.log('Model position:', { x: this.model.x, y: this.model.y, scale: this.model.scale.x });
    } catch (error) {
      console.error('Failed to load Live2D model:');
      console.error('Error:', error);
      if (error instanceof Error) {
        console.error('Error message:', error.message);
        console.error('Error stack:', error.stack);
      }
      throw error;
    }
  }

  setState(state: PetState): void {
    this.state = state;
    this.stateTimer = 0;

    if (!this.loaded || !this.model) return;

    switch (state) {
      case 'idle':
        // Let idle motion play automatically
        this.model.internalModel.motionManager.expressionManager?.resetExpression();
        break;
      case 'happy':
        this.model.expression('cat pupil');
        break;
      case 'excited':
        // Try to find an excited motion
        this.model.expression('knife');
        break;
    }
  }

  /**
   * Check if a point is within the model bounds
   * Used for mouse hit testing
   */
  hitTest(x: number, y: number): boolean {
    if (!this.model || !this.app) return false;

    // Get the model bounds
    const bounds = this.model.getBounds();
    return bounds && x >= bounds.x && x <= bounds.x + bounds.width &&
           y >= bounds.y && y <= bounds.y + bounds.height;
  }

  /**
   * Get model bounds on screen
   */
  getModelBounds(): { x: number; y: number; width: number; height: number } | null {
    if (!this.model) return null;
    const bounds = this.model.getBounds();
    if (!bounds) return null;
    return {
      x: bounds.x,
      y: bounds.y,
      width: bounds.width,
      height: bounds.height
    };
  }

  /**
   * Get the position for placing elements above the model's head
   * Returns the x, y coordinates for centering above the head
   */
  getHeadPosition(): { x: number; y: number } {
    if (!this.model) {
      return { x: window.innerWidth / 2, y: window.innerHeight / 2 };
    }

    const bounds = this.model.getBounds();
    if (!bounds) {
      return { x: this.model.x, y: this.model.y - 100 };
    }

    // Head is approximately at the top 1/4 of the model
    const headY = bounds.y;
    const centerX = bounds.x + bounds.width / 2;

    return { x: centerX, y: headY };
  }

  /**
   * Get available motion groups
   */
  getMotionGroups(): Record<string, any[]> {
    return this.motionGroups;
  }

  /**
   * Get motion group names
   */
  getMotionGroupNames(): string[] {
    return Object.keys(this.motionGroups);
  }

  /**
   * Get all available expressions
   */
  getExpressions(): string[] {
    return this.expressions;
  }

  /**
   * Set an expression by name
   */
  setExpression(expressionName: string): void {
    if (!this.model) return;

    this.model.expression(expressionName);
  }

  /**
   * Play a motion by group name and index
   */
  playMotion(groupName: string, index: number = 0): void {
    if (!this.model) return;

    const availableGroups = Object.keys(this.motionGroups);

    // Find exact match
    if (availableGroups.includes(groupName)) {
      this.model.motion(groupName);
      return;
    }

    // Try partial match
    const matching = availableGroups.find(g =>
      g.toLowerCase().includes(groupName.toLowerCase()) ||
      groupName.toLowerCase().includes(g.toLowerCase())
    );

    if (matching) {
      this.model.motion(matching);
    }
  }

  private onResize = (): void => {
    if (!this.app || !this.container) return;

    const w = this.container.clientWidth;
    const h = this.container.clientHeight;

    this.app.renderer.resize(w, h);

    if (this.model) {
      this.model.x = w / 2;
      this.model.y = h - 10; // Keep 10px from bottom
    }
  };

  destroy(): void {
    window.removeEventListener('resize', this.onResize);

    if (this.model) {
      this.model.destroy();
      this.model = null;
    }

    if (this.app) {
      this.app.destroy(true, { children: true, texture: true });
      this.app = null;
    }
  }
}
