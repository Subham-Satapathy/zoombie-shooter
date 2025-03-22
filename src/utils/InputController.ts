import * as THREE from 'three';

/**
 * Input controller for handling keyboard and touch inputs
 */
export class InputController {
  keys: { [key: string]: boolean };
  mousePosition: THREE.Vector2;
  isMobile: boolean;
  joystickPosition: THREE.Vector2;
  joystickActive: boolean;
  mouseButtons: { left: boolean };
  pointerLockJustInitialized: boolean = false;
  pointerLockEstablished: boolean = false;
  
  constructor() {
    this.keys = {};
    this.mousePosition = new THREE.Vector2();
    this.joystickPosition = new THREE.Vector2();
    this.joystickActive = false;
    this.isMobile = this.detectMobile();
    this.mouseButtons = { left: false };
    
    this.init();
  }
  
  /**
   * Initialize input event listeners
   */
  init(): void {
    // Keyboard events
    window.addEventListener('keydown', (e) => {
      this.keys[e.code] = true;
    });
    
    window.addEventListener('keyup', (e) => {
      this.keys[e.code] = false;
    });
    
    // Mouse events for desktop
    if (!this.isMobile) {
      window.addEventListener('mousemove', (e) => {
        this.mousePosition.x = (e.clientX / window.innerWidth) * 2 - 1;
        this.mousePosition.y = -(e.clientY / window.innerHeight) * 2 + 1;
      });
      
      // Add mouse button events
      window.addEventListener('mousedown', (e) => {
        if (e.button === 0) { // Left mouse button
          this.mouseButtons.left = true;
        }
      });
      
      window.addEventListener('mouseup', (e) => {
        if (e.button === 0) { // Left mouse button
          this.mouseButtons.left = false;
        }
      });
    } else {
      // Mobile joystick
      const joystickArea = document.getElementById('joystick-area') as HTMLElement;
      
      joystickArea.addEventListener('touchstart', (e) => {
        e.preventDefault();
        this.handleJoystickStart(e.touches[0].clientX, e.touches[0].clientY);
      });
      
      joystickArea.addEventListener('touchmove', (e) => {
        e.preventDefault();
        this.handleJoystickMove(e.touches[0].clientX, e.touches[0].clientY);
      });
      
      joystickArea.addEventListener('touchend', () => {
        this.joystickActive = false;
        this.joystickPosition.set(0, 0);
      });
      
      joystickArea.addEventListener('touchcancel', () => {
        this.joystickActive = false;
        this.joystickPosition.set(0, 0);
      });
    }
  }
  
  /**
   * Handle joystick touch start
   */
  handleJoystickStart(x: number, y: number): void {
    this.joystickActive = true;
    // Store the initial touch position as the joystick center
    this.initialX = x;
    this.initialY = y;
  }
  
  /**
   * Handle joystick touch move
   */
  handleJoystickMove(x: number, y: number): void {
    if (this.joystickActive) {
      // Calculate joystick offset from center (normalized between -1 and 1)
      const offsetX = (x - this.initialX) / 100;
      const offsetY = (y - this.initialY) / 100;
      
      // Limit the joystick radius to 1
      const magnitude = Math.sqrt(offsetX * offsetX + offsetY * offsetY);
      if (magnitude > 1) {
        this.joystickPosition.x = offsetX / magnitude;
        this.joystickPosition.y = offsetY / magnitude;
      } else {
        this.joystickPosition.x = offsetX;
        this.joystickPosition.y = offsetY;
      }
    }
  }
  
  /**
   * Check if a key is currently pressed
   */
  isKeyPressed(code: string): boolean {
    return this.keys[code] === true;
  }
  
  /**
   * Get the movement direction based on keyboard input (WASD)
   */
  getMovementDirection(): THREE.Vector3 {
    const direction = new THREE.Vector3(0, 0, 0);
    
    if (!this.isMobile) {
      // Desktop controls - only allow left/right movement
      if (this.isKeyPressed('KeyA') || this.isKeyPressed('ArrowLeft')) direction.x = -1;
      if (this.isKeyPressed('KeyD') || this.isKeyPressed('ArrowRight')) direction.x = 1;
      // Forward/backward movement disabled
      // if (this.isKeyPressed('KeyW') || this.isKeyPressed('ArrowUp')) direction.z = -1;
      // if (this.isKeyPressed('KeyS') || this.isKeyPressed('ArrowDown')) direction.z = 1;
    } else {
      // Mobile joystick controls - only allow horizontal movement
      if (this.joystickActive) {
        direction.x = this.joystickPosition.x;
        // Ignore vertical joystick movement
        // direction.z = this.joystickPosition.y;
      }
    }
    
    // Normalize the direction vector
    if (direction.lengthSq() > 0) {
      direction.normalize();
    }
    
    return direction;
  }
  
  /**
   * Detect if the device is mobile
   */
  detectMobile(): boolean {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || window.innerWidth <= 768;
  }
  
  /**
   * Initialize pointer lock for desktop aiming
   */
  initPointerLock(element: HTMLElement): void {
    if (!this.isMobile) {
      element.requestPointerLock = element.requestPointerLock || 
                                  (element as any).mozRequestPointerLock || 
                                  (element as any).webkitRequestPointerLock;
      
      // Create a UI element that shows instructions
      this.createPointerLockUI(element);
      
      // Request pointer lock only on click to the instructional UI
      // We'll add this event listener to a dedicated UI element instead
      
      // Pointer lock change event
      document.addEventListener('pointerlockchange', this.onPointerLockChange.bind(this), false);
      document.addEventListener('mozpointerlockchange', this.onPointerLockChange.bind(this), false);
      document.addEventListener('webkitpointerlockchange', this.onPointerLockChange.bind(this), false);
      
      // Pointer lock error event
      document.addEventListener('pointerlockerror', this.onPointerLockError.bind(this), false);
      document.addEventListener('mozpointerlockerror', this.onPointerLockError.bind(this), false);
      document.addEventListener('webkitpointerlockerror', this.onPointerLockError.bind(this), false);
    }
  }
  
  /**
   * Create a UI element for pointer lock instructions
   */
  createPointerLockUI(element: HTMLElement): void {
    const blocker = document.createElement('div');
    blocker.id = 'pointer-lock-blocker';
    blocker.style.position = 'absolute';
    blocker.style.width = '100%';
    blocker.style.height = '100%';
    blocker.style.top = '0';
    blocker.style.left = '0';
    blocker.style.display = 'flex';
    blocker.style.justifyContent = 'center';
    blocker.style.alignItems = 'center';
    blocker.style.background = 'rgba(0, 0, 0, 0.8)';
    blocker.style.zIndex = '1000';
    
    const instructions = document.createElement('div');
    instructions.style.color = '#ffffff';
    instructions.style.fontSize = '24px';
    instructions.style.textAlign = 'center';
    instructions.style.cursor = 'pointer';
    instructions.style.padding = '20px';
    instructions.style.background = 'rgba(40, 40, 40, 0.8)';
    instructions.style.borderRadius = '10px';
    instructions.innerHTML = 'CLICK HERE TO START';
    
    blocker.appendChild(instructions);
    document.getElementById('game-container')?.appendChild(blocker);
    
    // Request pointer lock when instructions are clicked
    instructions.addEventListener('click', () => {
      blocker.style.display = 'none';
      element.requestPointerLock();
    });
  }
  
  /**
   * Handle pointer lock change
   */
  onPointerLockChange(): void {
    if (document.pointerLockElement || 
        (document as any).mozPointerLockElement || 
        (document as any).webkitPointerLockElement) {
      // Pointer lock is active
      document.addEventListener('mousemove', this.onMouseMove.bind(this), false);
      
      // Set flag to indicate this is the first pointer lock
      this.pointerLockJustInitialized = true;
      
      // Reset left mouse button state to prevent auto-firing
      this.mouseButtons.left = false;
      
      // After a moment, consider pointer lock fully established
      setTimeout(() => {
        this.pointerLockJustInitialized = false;
        this.pointerLockEstablished = true;
        console.log("Pointer lock established, shooting enabled");
      }, 500);
      
    } else {
      // Pointer lock is inactive
      document.removeEventListener('mousemove', this.onMouseMove.bind(this), false);
      
      // Reset the established flag
      this.pointerLockEstablished = false;
      
      // Show the instruction screen again if we're not in a game over state
      const blocker = document.getElementById('pointer-lock-blocker');
      const gameOver = document.getElementById('game-over');
      
      // Only show the blocker if the game is still running (game-over is hidden)
      if (blocker && gameOver && gameOver.classList.contains('hidden')) {
        blocker.style.display = 'flex';
      } else {
        // Game is over, make sure the blocker is hidden
        if (blocker) {
          blocker.style.display = 'none';
        }
      }
    }
  }
  
  /**
   * Handle pointer lock error
   */
  onPointerLockError(): void {
    console.error('Pointer lock error');
  }
  
  /**
   * Handle mouse movement for aiming
   */
  onMouseMove(event: MouseEvent): void {
    // Store mouse movement for camera rotation
    this.mouseMovementX = event.movementX || 0;
    this.mouseMovementY = event.movementY || 0;
  }
  
  // Additional properties for the class
  private initialX: number = 0;
  private initialY: number = 0;
  mouseMovementX: number = 0;
  mouseMovementY: number = 0;
} 