import './styles.css';
import './chat/chat-styles.css';
import { Live2DScene } from './live2d-scene';
import { Live2DMouseHandler } from './live2d-mouse-handler';
import { ContextMenu } from './context-menu';
import { ChatManager } from './chat/chat-manager';

window.addEventListener('DOMContentLoaded', async () => {
  const container = document.getElementById('app')!;
  const scene = new Live2DScene();
  const chatManager = new ChatManager(scene);
  const mouseHandler = new Live2DMouseHandler(scene, chatManager);
  const contextMenu = new ContextMenu(scene);

  try {
    await scene.init(container);
    scene.startIdleBehaviors();
    mouseHandler.init();
    contextMenu.init();
    await chatManager.init();
  } catch (error) {
    console.error('Failed to initialize Live2D scene:', error);
    container.innerHTML = `
      <div style="display: flex; align-items: center; justify-content: center; height: 100vh; color: #fff;">
        <div style="text-align: center;">
          <p>Failed to load Live2D model</p>
          <p style="font-size: 12px; opacity: 0.7;">Check console for details</p>
        </div>
      </div>
    `;
  }
});
