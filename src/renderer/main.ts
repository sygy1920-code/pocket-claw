import './styles.css';
import { PetScene } from './scene';
import { MouseHandler } from './mouse-handler';
import { ContextMenu } from './context-menu';

window.addEventListener('DOMContentLoaded', () => {
  const container = document.getElementById('app')!;
  const scene = new PetScene();
  const mouseHandler = new MouseHandler(scene);
  const contextMenu = new ContextMenu(scene);

  scene.init(container);
  mouseHandler.init();
  contextMenu.init();
});
