import * as THREE from 'three';
import { InputController } from '../utils/InputController';
import { MathUtils } from '../utils/MathUtils';
import { Weapon } from '../weapons/Weapon';

/**
 * Camera view types
 */
export enum CameraView {
  FIRST_PERSON,
  THIRD_PERSON
}

/**
 * Player class to handle player movement, camera, health and stamina
 */
export class Player {
  // Player properties
  position: THREE.Vector3;
  rotation: THREE.Euler;
  velocity: THREE.Vector3;
  model!: THREE.Object3D;
  scene: THREE.Scene;
  cameraView: CameraView;
  health: number;
  maxHealth: number;
  stamina: number;
  maxStamina: number;
  staminaRegenRate: number;
  isDead: boolean;
  
  // Camera properties
  camera: THREE.PerspectiveCamera;
  cameraOffset: THREE.Vector3;
  
  // Weapons
  weapons: Weapon[];
  currentWeaponIndex: number;
  
  // Input controller
  inputController: InputController;
  
  // Movement parameters
  moveSpeed: number;
  
  // Inertia for smoother camera movement
  private rotationVelocity: THREE.Vector2 = new THREE.Vector2(0, 0);
  private rotationDamping: number = 0.8; // Controls how quickly rotation slows down
  
  // Add new property for invincibility after taking damage
  private lastDamageTime: number = 0;
  private damageInvincibilityTime: number = 1000; // 1 second of invincibility after taking damage
  
  constructor(scene: THREE.Scene, camera: THREE.PerspectiveCamera, inputController: InputController) {
    this.scene = scene;
    this.camera = camera;
    this.inputController = inputController;
    
    // Initialize player properties
    this.position = new THREE.Vector3(0, 1.7, 0);
    this.rotation = new THREE.Euler(0, 0, 0, 'YXZ');
    this.velocity = new THREE.Vector3();
    this.moveSpeed = 5;
    
    // Force first-person perspective only
    this.cameraView = CameraView.FIRST_PERSON;
    this.cameraOffset = new THREE.Vector3(0, 2, 5);
    
    this.health = 100;
    this.maxHealth = 100;
    this.stamina = 100;
    this.maxStamina = 100;
    this.staminaRegenRate = 5; // per second
    this.isDead = false;
    
    this.weapons = [];
    this.currentWeaponIndex = 0;
    
    // Create invisible player model (for collision only)
    this.createPlayerModel();
    this.updateCamera();
    
    // Initialize UI
    this.updateHealthUI();
  }
  
  /**
   * Create a simple player model
   */
  createPlayerModel(): void {
    // Create player group with collision cylinder but no visible meshes
    this.model = new THREE.Group();
    
    // Create an invisible collision cylinder
    const collisionGeometry = new THREE.CylinderGeometry(1.0, 1.0, 1.7, 8);
    const collisionMaterial = new THREE.MeshBasicMaterial({ 
      color: 0xff0000,
      wireframe: true,
      visible: false // Make it invisible
    });
    const collisionBody = new THREE.Mesh(collisionGeometry, collisionMaterial);
    collisionBody.position.y = 0.85; // Half of the height
    
    // Add collision body to the model
    this.model.add(collisionBody);
    
    // Set initial position
    this.model.position.copy(this.position);
    
    // Add to scene (needed for collision)
    this.scene.add(this.model);
    
    console.log('Player model created with collision cylinder');
  }
  
  /**
   * Update player position and rotation based on input
   * @param deltaTime Time since last frame
   */
  update(deltaTime: number): void {
    if (this.isDead) return;
    
    // Get movement direction from input controller (but we'll ignore it to prevent movement)
    this.inputController.getMovementDirection();
    
    // DISABLED: No horizontal movement allowed, player is stationary
    // this.position.x += moveDirection.x * speed;
    
    // Update model position
    this.model.position.copy(this.position);
    
    let rotationChanged = false;
    
    // Handle both mobile and non-mobile rotation
    if (this.inputController.mouseMovementX !== 0 || this.inputController.mouseMovementY !== 0) {
      // Desktop sensitivity is intentionally much lower than mobile (0.05)
      const DESKTOP_SENSITIVITY = 0.0008;
      
      // Horizontal rotation (around Y axis)
      if (this.inputController.mouseMovementX !== 0) {
        // Apply rotation to velocity for inertia, not directly to rotation
        this.rotationVelocity.x -= this.inputController.mouseMovementX * DESKTOP_SENSITIVITY;
        rotationChanged = true;
      }
      
      // Vertical rotation (around X axis)
      if (this.inputController.mouseMovementY !== 0) {
        // Apply rotation to velocity for inertia, not directly to rotation
        this.rotationVelocity.y -= this.inputController.mouseMovementY * DESKTOP_SENSITIVITY;
        rotationChanged = true;
      }
      
      // Reset movements immediately after applying to prevent continuous rotation
      this.inputController.mouseMovementX = 0;
      this.inputController.mouseMovementY = 0;
    }
    
    // Apply rotation velocity with inertia
    if (this.rotationVelocity.x !== 0 || this.rotationVelocity.y !== 0) {
      // Apply horizontal rotation with inertia
      this.rotation.y += this.rotationVelocity.x;
      
      // Apply vertical rotation with inertia
      this.rotation.x += this.rotationVelocity.y;
      
      // Clamp vertical rotation to allow looking down to 45 degrees (-PI/4)
      this.rotation.x = MathUtils.clamp(this.rotation.x, -Math.PI / 4, Math.PI / 2);
      
      // Apply damping to slow down rotation over time
      this.rotationVelocity.x *= this.rotationDamping;
      this.rotationVelocity.y *= this.rotationDamping;
      
      // Stop rotation completely if it's very small
      if (Math.abs(this.rotationVelocity.x) < 0.0001) this.rotationVelocity.x = 0;
      if (Math.abs(this.rotationVelocity.y) < 0.0001) this.rotationVelocity.y = 0;
      
      rotationChanged = true;
    }
    
    // Special handling for non-mobile input
    if (!this.inputController.isMobile) {
      // If no pointer movement but mouse button is pressed, force an initial rotation
      // This helps make the gun pointer responsive immediately
      if (!rotationChanged && this.inputController.mouseButtons.left) {
        // Apply a tiny rotation to "wake up" the controls
        this.rotation.y += 0.0001;
        this.rotation.x += 0.0001;
        rotationChanged = true;
      }
    }
    
    // Update weapon position based on rotation if rotation changed
    if (rotationChanged) {
      const currentWeapon = this.getCurrentWeapon();
      if (currentWeapon) {
        currentWeapon.updatePosition(this.camera);
      }
    }
    
    // Apply rotation to model
    this.model.rotation.copy(this.rotation);
    
    // Update stamina regeneration
    this.regenerateStamina(deltaTime);
    
    // Update camera position
    this.updateCamera();
  }
  
  /**
   * Update camera position based on player position and camera view
   */
  updateCamera(): void {
    // Always use first-person camera
    this.camera.position.x = this.position.x;
    this.camera.position.y = this.position.y + 1.6; // Eye level
    this.camera.position.z = this.position.z;
    
    // Set camera rotation to match player rotation
    this.camera.rotation.copy(this.rotation);
  }
  
  /**
   * Toggle between first-person and third-person views
   * (Method kept but disabled to prevent breaking existing code)
   */
  toggleCameraView(): void {
    // Disabled - only first-person allowed
    return;
  }
  
  /**
   * Take damage from zombies
   * @param amount Amount of damage to take
   */
  takeDamage(amount: number): void {
    if (this.isDead) return;
    
    // Check if player is in invincibility period after previous damage
    const currentTime = Date.now();
    if (currentTime - this.lastDamageTime < this.damageInvincibilityTime) {
      console.log(`🛡️ Player is invincible, damage blocked!`);
      return;
    }
    
    // Cap damage to prevent instant deaths
    const cappedDamage = Math.min(amount, 30); // Increased from 20 to allow for higher swarm damage
    
    // Log damage details
    console.log(`⚡ Player taking damage: ${cappedDamage}, current health: ${this.health}`);
    
    // Set last damage time for invincibility period
    this.lastDamageTime = currentTime;
    
    this.health -= cappedDamage;
    console.log(`🩸 Player health reduced to: ${this.health}`);
    
    // Check if player is dead before updating UI and showing effects
    if (this.health <= 0) {
      this.health = 0;
      console.log(`☠️ Player died!`);
      
      // Update health UI
      this.updateHealthUI();
      
      // Die
      this.die();
      return;
    }
    
    // Update health UI
    this.updateHealthUI();
    console.log(`🔄 Health UI updated, percentage: ${(this.health / this.maxHealth * 100).toFixed(1)}%`);
    
    // Trigger damage indicator - more intense for higher damage
    this.flashDamageIndicator(cappedDamage);
    
    // Show blood spatter based on damage threshold
    if (cappedDamage > 15) {
      this.showBloodSpatter(cappedDamage > 25 ? 'heavy' : 'normal');
    }
  }
  
  /**
   * Update health bar in UI
   */
  updateHealthUI(): void {
    const healthFill = document.getElementById('health-fill');
    const healthBar = document.getElementById('health-bar');
    const healthText = document.getElementById('health-text');
    
    if (healthFill && healthBar) {
      const healthPercent = (this.health / this.maxHealth) * 100;
      healthFill.style.width = `${healthPercent}%`;
      
      // Update health text
      if (healthText) {
        healthText.textContent = `${Math.ceil(this.health)}/${this.maxHealth}`;
      }
      
      console.log(`Health bar width set to ${healthPercent}%`);
      
      // Change color based on health percentage
      if (healthPercent <= 20) {
        healthFill.style.backgroundColor = '#e5383b'; // Very red
        healthBar.classList.add('health-critical');
      } else if (healthPercent <= 50) {
        healthFill.style.backgroundColor = '#f48c06'; // Orange
        healthBar.classList.remove('health-critical');
      } else {
        healthFill.style.backgroundColor = '#57cc99'; // Green
        healthBar.classList.remove('health-critical');
      }
    } else {
      console.error('Health UI elements not found in DOM');
    }
  }
  
  /**
   * Flash damage indicator when taking damage
   */
  flashDamageIndicator(damageAmount: number = 10): void {
    const damageFlash = document.createElement('div');
    damageFlash.className = 'damage-flash';
    document.getElementById('game-container')?.appendChild(damageFlash);
    
    // Make flash intensity related to current health AND damage amount
    const healthFactor = Math.max(0.5, 1 - (this.health / this.maxHealth));
    const damageFactor = Math.min(1.0, damageAmount / 30); // Normalize damage up to max cap
    
    // Combined effect: higher damage or lower health = more intense effect
    const intensity = Math.max(healthFactor, damageFactor);
    damageFlash.style.setProperty('--flash-intensity', intensity.toString());
    
    // Add screen shake effect for immersion
    const gameContainer = document.getElementById('game-container');
    if (gameContainer) {
      // Stronger shake for higher damage
      const shakeIntensity = 0.3 + (damageAmount / 30) * 0.5; // Between 0.3 and 0.8
      
      // Add shake effect
      gameContainer.style.animation = 'none'; // Reset animation
      void gameContainer.offsetWidth; // Trigger reflow
      gameContainer.style.animation = `shake ${shakeIntensity}s cubic-bezier(.36,.07,.19,.97) both`;
    }
    
    // Remove flash after animation completes
    setTimeout(() => {
      if (damageFlash.parentNode) {
        damageFlash.parentNode.removeChild(damageFlash);
      }
    }, 500);
  }
  
  /**
   * Show blood spatter effect for heavy damage
   */
  showBloodSpatter(intensity: string = 'normal'): void {
    const bloodSpatter = document.getElementById('blood-spatter');
    if (bloodSpatter) {
      // Reset any existing animation
      bloodSpatter.style.animation = 'none';
      void bloodSpatter.offsetWidth; // Trigger reflow
      
      // Set intensity based on parameter
      if (intensity === 'heavy') {
        bloodSpatter.style.opacity = '0.8';
        bloodSpatter.style.animation = 'blood-fade 2.5s forwards';
      } else {
        bloodSpatter.style.opacity = '0.5';
        bloodSpatter.style.animation = 'blood-fade 1.5s forwards';
      }
    }
  }
  
  /**
   * Handle player death
   */
  die(): void {
    this.isDead = true;
    console.log('Player died');
    
    // Trigger game over event
    document.dispatchEvent(new CustomEvent('game-over'));
  }
  
  /**
   * Add a weapon to the player's inventory
   */
  addWeapon(weapon: Weapon): void {
    // Add weapon to inventory but hide model
    this.weapons.push(weapon);
    
    // Hide weapon model
    weapon.model.visible = false;
    
    // If this is the first weapon, set it as active
    if (this.weapons.length === 1) {
      this.equip(0);
    }
  }
  
  /**
   * Equip a weapon by index
   */
  equip(index: number): void {
    if (index < 0 || index >= this.weapons.length) return;
    
    // Set new weapon but keep it invisible
    this.currentWeaponIndex = index;
  }
  
  /**
   * Switch to the next weapon
   */
  switchWeapon(): void {
    if (this.weapons.length <= 1) return;
    
    const nextIndex = (this.currentWeaponIndex + 1) % this.weapons.length;
    this.equip(nextIndex);
  }
  
  /**
   * Get the current weapon
   */
  getCurrentWeapon(): Weapon | null {
    if (this.weapons.length === 0) return null;
    return this.weapons[this.currentWeaponIndex];
  }
  
  /**
   * Use stamina for melee attack
   */
  useStamina(amount: number): boolean {
    if (this.stamina >= amount) {
      this.stamina -= amount;
      
      // Stamina UI removed, but we keep the stamina mechanics
      return true;
    }
    
    return false;
  }
  
  /**
   * Regenerate stamina over time
   */
  regenerateStamina(deltaTime: number): void {
    if (this.stamina < this.maxStamina) {
      this.stamina = Math.min(this.maxStamina, this.stamina + this.staminaRegenRate * deltaTime);
      
      // Stamina UI removed, but we keep the stamina mechanics
    }
  }
  
  /**
   * Update stamina bar in UI - no longer updates UI as stamina bar was removed
   */
  updateStaminaUI(): void {
    // Stamina bar element removed, method kept for compatibility
    return;
  }
  
  /**
   * Cleanup resources
   */
  dispose(): void {
    // Remove player model from scene
    this.scene.remove(this.model);
    
    // Dispose of weapons
    this.weapons.forEach(weapon => weapon.dispose());
  }
  
  /**
   * Update the player's rotation directly
   * Used for mobile touch controls
   */
  updateRotation(deltaX: number, deltaY: number): void {
    if (this.isDead) return;
    
    // Only update if there's actual movement
    if (deltaX !== 0 || deltaY !== 0) {
      // Note: The sensitivity for this method is applied in Game.ts (MOBILE_SENSITIVITY)
      // This method is ONLY called for mobile devices
      
      // Apply to rotation velocity instead of directly to rotation
      // Horizontal rotation (around Y axis) - use deltaX
      this.rotationVelocity.x -= deltaX;
      
      // Vertical rotation (around X axis) - use deltaY
      this.rotationVelocity.y += -deltaY;
      
      // Apply rotation with inertia
      this.rotation.y += this.rotationVelocity.x;
      this.rotation.x += this.rotationVelocity.y;
      
      // Clamp vertical rotation to prevent looking too far up or down
      this.rotation.x = MathUtils.clamp(this.rotation.x, -Math.PI / 4, Math.PI / 2);
      
      // Apply damping for smooth deceleration
      this.rotationVelocity.x *= this.rotationDamping;
      this.rotationVelocity.y *= this.rotationDamping;
      
      // Update camera and weapon position
      this.updateCamera();
      
      // Update weapon position
      const currentWeapon = this.getCurrentWeapon();
      if (currentWeapon) {
        currentWeapon.updatePosition(this.camera);
      }
    }
  }
}