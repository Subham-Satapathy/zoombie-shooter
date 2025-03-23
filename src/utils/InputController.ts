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
  mouseMovementX: number = 0;
  mouseMovementY: number = 0;
  private lastTouchX: number = 0;
  private lastTouchY: number = 0;
  
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
      // Mobile touch-based scroll controls
      const gameContainer = document.getElementById('game-container');
      
      if (gameContainer) {
        gameContainer.addEventListener('touchstart', (e) => {
          // Only capture touchstart on the left side of the screen
          if (e.touches[0].clientX < window.innerWidth / 2) {
            e.preventDefault();
            this.lastTouchX = e.touches[0].clientX;
            this.lastTouchY = e.touches[0].clientY;
          }
        }, { passive: false });
        
        gameContainer.addEventListener('touchmove', (e) => {
          // Only handle touchmove on the left side of the screen
          if (e.touches[0].clientX < window.innerWidth / 2) {
            e.preventDefault();
            const touchX = e.touches[0].clientX;
            const touchY = e.touches[0].clientY;
            
            // Only process movement if we have initial touch coordinates
            if (this.lastTouchX !== 0 && this.lastTouchY !== 0) {
              // Calculate delta movement
              const deltaX = touchX - this.lastTouchX;
              const deltaY = touchY - this.lastTouchY;
              
              // Make sensitivity dependent on environment (hosted vs local)
              const isLocalHost = window.location.hostname === 'localhost' || 
                                  window.location.hostname === '127.0.0.1';
              const environmentFactor = isLocalHost ? 1.0 : 0.6; // Reduce sensitivity on hosted domain
              
              // Only apply movement if there's a significant change to avoid drift
              if (Math.abs(deltaX) > 0.1 || Math.abs(deltaY) > 0.1) {
                // Update rotation values based on touch movement - with improved sensitivity
                this.mouseMovementX = deltaX * 3.0 * environmentFactor; // Increased from 1.5 to 3.0
                this.mouseMovementY = deltaY * 3.0 * environmentFactor; // Increased from 1.5 to 3.0
              } else {
                // Reset for small movements to prevent drift
                this.mouseMovementX = 0;
                this.mouseMovementY = 0;
              }
            }
            
            // Store current position for next move
            this.lastTouchX = touchX;
            this.lastTouchY = touchY;
          }
        }, { passive: false });
        
        gameContainer.addEventListener('touchend', () => {
          // Reset movement immediately to stop any continued rotation
          this.mouseMovementX = 0;
          this.mouseMovementY = 0;
          // Also reset the last touch positions to prevent jumps on next touch
          this.lastTouchX = 0;
          this.lastTouchY = 0;
        });
        
        gameContainer.addEventListener('touchcancel', () => {
          // Also handle touch cancel events
          this.mouseMovementX = 0;
          this.mouseMovementY = 0;
          this.lastTouchX = 0;
          this.lastTouchY = 0;
        });
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
    
    // On mobile, we just use simple automatic movement forward
    if (this.isMobile) {
      direction.x = 0;  // No left-right movement on mobile
      direction.z = -1; // Always move forward slowly
      return direction;
    }
    
    // Desktop controls - only allow left/right movement
    if (this.isKeyPressed('KeyA') || this.isKeyPressed('ArrowLeft')) direction.x = -1;
    if (this.isKeyPressed('KeyD') || this.isKeyPressed('ArrowRight')) direction.x = 1;
    // Forward/backward movement disabled for desktop
    // if (this.isKeyPressed('KeyW') || this.isKeyPressed('ArrowUp')) direction.z = -1;
    // if (this.isKeyPressed('KeyS') || this.isKeyPressed('ArrowDown')) direction.z = 1;
    
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