import * as THREE from 'three';

/**
 * Input controller for handling keyboard and touch inputs
 */
export class InputController {
  keys: { [key: string]: boolean };
  mousePosition: THREE.Vector2;
  joystickPosition: THREE.Vector2;
  joystickActive: boolean;
  mouseButtons: { left: boolean };
  pointerLockJustInitialized: boolean = false;
  pointerLockEstablished: boolean = false;
  mouseMovementX: number = 0;
  mouseMovementY: number = 0;
  isMobile: boolean;
  
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
    
    // Mouse events for all devices
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
    
    // For mobile, add touch events that simulate mouse behavior
    if (this.isMobile) {
      const gameContainer = document.getElementById('game-container');
      
      if (gameContainer) {
        // Touch start simulates mousedown
        gameContainer.addEventListener('touchstart', (e) => {
          e.preventDefault();
          this.mouseButtons.left = true;
          
          // Map touch position to mouse position
          if (e.touches.length > 0) {
            this.mousePosition.x = (e.touches[0].clientX / window.innerWidth) * 2 - 1;
            this.mousePosition.y = -(e.touches[0].clientY / window.innerHeight) * 2 + 1;
          }
        }, { passive: false });
        
        // Touch move simulates mousemove
        gameContainer.addEventListener('touchmove', (e) => {
          // Don't prevent default scrolling for the entire document
          // Only prevent default for the game area to allow scrolling elsewhere
          if (e.target === gameContainer || gameContainer.contains(e.target as Node)) {
            e.preventDefault();
          }
          
          // Map touch position to mouse position
          if (e.touches.length > 0) {
            const newX = (e.touches[0].clientX / window.innerWidth) * 2 - 1;
            const newY = -(e.touches[0].clientY / window.innerHeight) * 2 + 1;
            
            // Calculate movement deltas (similar to what pointer lock provides)
            // Increase the sensitivity for mobile devices
            const sensitivity = 1.5; 
            this.mouseMovementX = (newX - this.mousePosition.x) * window.innerWidth * sensitivity;
            this.mouseMovementY = (newY - this.mousePosition.y) * window.innerHeight * sensitivity;
            
            // Update current position
            this.mousePosition.x = newX;
            this.mousePosition.y = newY;
          }
        }, { passive: false });
        
        // Touch end simulates mouseup
        gameContainer.addEventListener('touchend', (e) => {
          e.preventDefault();
          this.mouseButtons.left = false;
          this.mouseMovementX = 0;
          this.mouseMovementY = 0;
        }, { passive: false });
        
        // Touch cancel
        gameContainer.addEventListener('touchcancel', (e) => {
          e.preventDefault();
          this.mouseButtons.left = false;
          this.mouseMovementX = 0;
          this.mouseMovementY = 0;
        }, { passive: false });
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
    
    // Desktop controls for all devices
    if (this.isKeyPressed('KeyA') || this.isKeyPressed('ArrowLeft')) direction.x = -1;
    if (this.isKeyPressed('KeyD') || this.isKeyPressed('ArrowRight')) direction.x = 1;
    
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
   * Note: Pointer lock might not work on all mobile browsers, 
   * but we'll try to use it for a unified experience
   */
  initPointerLock(element: HTMLElement): void {
    element.requestPointerLock = element.requestPointerLock || 
                                (element as any).mozRequestPointerLock || 
                                (element as any).webkitRequestPointerLock;
    
    // Pointer lock change event
    document.addEventListener('pointerlockchange', this.onPointerLockChange.bind(this), false);
    document.addEventListener('mozpointerlockchange', this.onPointerLockChange.bind(this), false);
    document.addEventListener('webkitpointerlockchange', this.onPointerLockChange.bind(this), false);
    
    // Pointer lock error event
    document.addEventListener('pointerlockerror', this.onPointerLockError.bind(this), false);
    document.addEventListener('mozpointerlockerror', this.onPointerLockError.bind(this), false);
    document.addEventListener('webkitpointerlockerror', this.onPointerLockError.bind(this), false);
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
    // Only store the exact movement amount without additional processing
    this.mouseMovementX = event.movementX || 0;
    this.mouseMovementY = event.movementY || 0;
  }
} 