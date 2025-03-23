import * as THREE from 'three';
import { Zombie } from '../zombies/Zombie';

/**
 * Weapon types
 */
export enum WeaponType {
  PISTOL,
  SHOTGUN,
  RIFLE,
  MELEE
}

/**
 * Properties for different weapon types
 */
export interface WeaponProperties {
  damage: number;
  fireRate: number; // Shots per second
  magazineSize: number;
  reloadTime: number; // In seconds
  range: number;
  accuracy: number; // 0-1 (1 being perfect accuracy)
  automatic: boolean;
  color: number;
}

/**
 * Base Weapon class for handling weapons
 */
export class Weapon {
  type: WeaponType;
  properties: WeaponProperties;
  model!: THREE.Object3D;
  scene: THREE.Scene;
  ammoInMagazine: number;
  totalAmmo: number;
  isReloading: boolean;
  isFiring: boolean;
  lastFireTime: number;
  
  constructor(type: WeaponType, scene: THREE.Scene) {
    this.type = type;
    this.scene = scene;
    this.isReloading = false;
    this.isFiring = false;
    this.lastFireTime = 0;
    
    // Set properties based on weapon type
    this.properties = this.getWeaponProperties(type);
    this.ammoInMagazine = this.properties.magazineSize;
    this.totalAmmo = this.properties.magazineSize * 3; // Start with 3 extra magazines
    
    this.createWeaponModel();
  }
  
  /**
   * Get properties for a specific weapon type
   */
  getWeaponProperties(type: WeaponType): WeaponProperties {
    switch (type) {
      case WeaponType.PISTOL:
        return {
          damage: 25,
          fireRate: 3,
          magazineSize: 12,
          reloadTime: 1.2,
          range: 30,
          accuracy: 0.9,
          automatic: false,
          color: 0x2b2d42
        };
        
      case WeaponType.SHOTGUN:
        return {
          damage: 15, // Per pellet (multiple pellets)
          fireRate: 1,
          magazineSize: 6,
          reloadTime: 2.5,
          range: 15,
          accuracy: 0.7,
          automatic: false,
          color: 0x8d99ae
        };
        
      case WeaponType.RIFLE:
        return {
          damage: 30,
          fireRate: 8,
          magazineSize: 30,
          reloadTime: 2.0,
          range: 50,
          accuracy: 0.85,
          automatic: true,
          color: 0x3a86ff
        };
        
      case WeaponType.MELEE:
        return {
          damage: 40,
          fireRate: 2,
          magazineSize: 0, // No ammo for melee
          reloadTime: 0,
          range: 2,
          accuracy: 1.0,
          automatic: false,
          color: 0xef233c
        };
    }
  }
  
  /**
   * Create weapon model based on type
   */
  createWeaponModel(): void {
    // Create an empty group instead of a visible weapon model
    this.model = new THREE.Group();
    
    // No need to add to scene since we're not showing visual models anymore
    // this.scene.add(this.model);
    
    // Always keep it invisible
    this.model.visible = false;
  }
  
  /**
   * Create pistol model
   * (Replaced with empty implementation)
   */
  createPistolModel(): void {
    // No implementation needed - using empty model
  }
  
  /**
   * Create shotgun model
   * (Replaced with empty implementation)
   */
  createShotgunModel(): void {
    // No implementation needed - using empty model
  }
  
  /**
   * Create rifle model
   * (Replaced with empty implementation)
   */
  createRifleModel(): void {
    // No implementation needed - using empty model
  }
  
  /**
   * Create melee weapon model
   * (Replaced with empty implementation)
   */
  createMeleeModel(): void {
    // No implementation needed - using empty model
  }
  
  /**
   * Update weapon position relative to camera
   */
  updatePosition(_camera: THREE.PerspectiveCamera): void {
    // No need to position invisible weapons
    return;
  }
  
  /**
   * Create a temporary muzzle flash effect
   */
  createMuzzleFlash(): void {
    // No visual effects since we're not showing weapons
    return;
  }
  
  /**
   * Fire the weapon
   * @returns Whether the weapon successfully fired
   */
  fire(camera: THREE.Camera, zombies: Zombie[]): boolean {
    // Check if can fire
    if (this.isReloading || 
        this.ammoInMagazine <= 0 || 
        (performance.now() - this.lastFireTime < 1000 / this.properties.fireRate)) {
      return false;
    }
    
    console.log('Firing weapon:', this.type, 'Current ammo:', this.ammoInMagazine);
    
    // Update ammo count - only decrease by 1 per shot
    this.ammoInMagazine--;
    this.lastFireTime = performance.now();
    
    // Make sure ammo doesn't go negative
    if (this.ammoInMagazine < 0) {
      this.ammoInMagazine = 0;
    }
    
    // Auto-reload when magazine is empty and there's ammo available
    if (this.ammoInMagazine === 0 && this.totalAmmo > 0) {
      console.log('Magazine empty, auto-reloading...');
      // Small delay before auto-reload to make it feel natural
      setTimeout(() => {
        this.reload();
      }, 300);
    }
    
    // Update UI AFTER changing the ammo count
    this.updateAmmoUI();
    
    // Create muzzle flash
    this.createMuzzleFlash();
    
    // Handle firing based on weapon type
    switch (this.type) {
      case WeaponType.SHOTGUN:
        // Shotgun fires multiple pellets
        this.fireShotgunPellets(camera, zombies);
        break;
        
      case WeaponType.MELEE:
        // Melee attack in front of player
        this.performMeleeAttack(camera, zombies);
        break;
        
      default:
        // Standard single bullet
        this.fireBullet(camera, zombies);
        break;
    }
    
    // Play weapon animation
    this.playFireAnimation();
    
    console.log('After firing, ammo:', this.ammoInMagazine);
    
    return true;
  }
  
  /**
   * Fire a standard bullet
   */
  fireBullet(camera: THREE.Camera, zombies: Zombie[]): void {
    // Create raycaster from camera
    const raycaster = new THREE.Raycaster();
    
    // Apply accuracy deviation
    const accuracy = this.properties.accuracy;
    const spread = (1 - accuracy) * 0.1; // Max deviation
    
    // Add random spread based on accuracy
    const direction = new THREE.Vector3(0, 0, -1);
    direction.x += (Math.random() - 0.5) * spread;
    direction.y += (Math.random() - 0.5) * spread;
    direction.normalize();
    
    // Transform direction to world space
    direction.applyQuaternion(camera.quaternion);
    
    // Set raycaster with extended range
    raycaster.set(camera.position, direction);
    raycaster.far = this.properties.range;
    
    // Draw debug ray for visualization
    this.drawDebugRay(camera.position, direction, this.properties.range);
    
    // Check for zombie hits
    this.checkZombieHits(raycaster, zombies, this.properties.damage);
  }
  
  /**
   * Draw a debug ray to visualize the bullet path
   */
  drawDebugRay(origin: THREE.Vector3, direction: THREE.Vector3, length: number): void {
    const rayEnd = new THREE.Vector3().copy(direction).multiplyScalar(length).add(origin);
    
    const geometry = new THREE.BufferGeometry().setFromPoints([origin, rayEnd]);
    const material = new THREE.LineBasicMaterial({ color: 0xff0000 });
    const line = new THREE.Line(geometry, material);
    
    this.scene.add(line);
    
    // Remove after short delay
    setTimeout(() => {
      this.scene.remove(line);
      geometry.dispose();
      material.dispose();
    }, 100);
  }
  
  /**
   * Fire shotgun pellets (multiple raycasts)
   */
  fireShotgunPellets(camera: THREE.Camera, zombies: Zombie[]): void {
    const pelletCount = 8;
    const spreadFactor = 0.15;
    
    for (let i = 0; i < pelletCount; i++) {
      // Create raycaster with wider spread for each pellet
      const raycaster = new THREE.Raycaster();
      
      // Calculate spread for this pellet
      const direction = new THREE.Vector3(0, 0, -1);
      direction.x += (Math.random() - 0.5) * spreadFactor;
      direction.y += (Math.random() - 0.5) * spreadFactor;
      direction.normalize();
      
      // Transform direction to world space
      direction.applyQuaternion(camera.quaternion);
      
      // Set raycaster
      raycaster.set(camera.position, direction);
      
      // Check for zombie hits
      this.checkZombieHits(raycaster, zombies, this.properties.damage);
    }
  }
  
  /**
   * Perform melee attack
   */
  performMeleeAttack(camera: THREE.Camera, zombies: Zombie[]): void {
    // Melee is a close-range attack in front of the player
    const raycaster = new THREE.Raycaster();
    raycaster.set(camera.position, new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion));
    
    // Reduced range for melee
    raycaster.far = this.properties.range;
    
    // Check for zombie hits
    this.checkZombieHits(raycaster, zombies, this.properties.damage);
  }
  
  /**
   * Check for zombie hits with a raycaster
   */
  checkZombieHits(raycaster: THREE.Raycaster, zombies: Zombie[], damage: number): void {
    console.log('Firing weapon - zombies count:', zombies.length);
    
    // Find all zombie intersections
    const zombieObjects = zombies.map(zombie => zombie.model);
    const intersects = raycaster.intersectObjects(zombieObjects, true);
    
    if (intersects.length > 0) {
      // Find the closest zombie hit
      const closestIntersect = intersects[0];
      const closestZombie = zombies.find(zombie => 
        this.isChildOf(closestIntersect.object, zombie.model)
      );
      
      if (closestZombie) {
        console.log('Hit zombie! Damage:', damage);
        // Apply damage to zombie
        const killed = closestZombie.takeDamage(damage);
        if (killed) {
          console.log('Zombie killed!');
        }
      }
    }
  }
  
  /**
   * Check if an object is a child of a parent in the scene hierarchy
   */
  isChildOf(child: THREE.Object3D, parent: THREE.Object3D): boolean {
    let current = child;
    while (current) {
      if (current === parent) {
        return true;
      }
      current = current.parent as THREE.Object3D;
    }
    return false;
  }
  
  /**
   * Play firing animation
   */
  playFireAnimation(): void {
    // Store original position
    const originalPosition = this.model.position.clone();
    
    // Apply recoil
    this.model.position.z += 0.1;
    
    // Return to original position
    setTimeout(() => {
      this.model.position.copy(originalPosition);
    }, 100);
  }
  
  /**
   * Reload the weapon
   * @returns Whether the reload was initiated successfully
   */
  reload(): boolean {
    // Can't reload if already reloading or if magazine is full
    if (this.isReloading || this.ammoInMagazine === this.properties.magazineSize) {
      return false;
    }
    
    // Can't reload if no ammo in reserve
    if (this.totalAmmo <= 0) {
      return false;
    }
    
    console.log('Reloading weapon:', this.type);
    
    // Start reload animation
    this.isReloading = true;
    
    // Calculate ammo to add
    const ammoToAdd = Math.min(
      this.properties.magazineSize - this.ammoInMagazine,
      this.totalAmmo
    );
    
    // Show reload indicator on UI
    const ammoCounter = document.getElementById('ammo-counter');
    if (ammoCounter) {
      // Change to reloading text with pulsing effect
      ammoCounter.textContent = 'Reloading...';
      ammoCounter.style.color = '#ffffff';
      ammoCounter.style.animation = 'pulse 1s infinite';
      
      // Create a reloading animation effect using text updates
      let dotsCount = 0;
      const reloadingInterval = setInterval(() => {
        dotsCount = (dotsCount + 1) % 4;
        let dots = '';
        for (let i = 0; i < dotsCount; i++) {
          dots += '.';
        }
        ammoCounter.textContent = `Reloading${dots}`;
      }, 200);
      
      // Schedule reload completion
      setTimeout(() => {
        // Add ammo to magazine and remove from total
        this.ammoInMagazine += ammoToAdd;
        this.totalAmmo -= ammoToAdd;
        
        // Update UI
        this.updateAmmoUI();
        
        // Reset reloading flag
        this.isReloading = false;
        
        // Clear the reloading animation
        clearInterval(reloadingInterval);
        ammoCounter.style.animation = '';
      }, this.properties.reloadTime * 1000);
    } else {
      // If UI element doesn't exist, still handle the reload logic
      setTimeout(() => {
        // Add ammo to magazine and remove from total
        this.ammoInMagazine += ammoToAdd;
        this.totalAmmo -= ammoToAdd;
        
        // Update UI
        this.updateAmmoUI();
        
        // Reset reloading flag
        this.isReloading = false;
      }, this.properties.reloadTime * 1000);
    }
    
    return true;
  }
  
  /**
   * Update ammo display in UI
   */
  updateAmmoUI(): void {
    // Get the ammo counter element
    const ammoCounter = document.getElementById('ammo-counter');
    if (ammoCounter) {
      // Update with current ammo values
      ammoCounter.textContent = `Bullets: ${this.ammoInMagazine}/${this.totalAmmo}`;
      
      // Change color if low on ammo (less than 20% of magazine)
      if (this.ammoInMagazine < this.properties.magazineSize * 0.2) {
        ammoCounter.style.color = 'var(--danger-color)';
      } else {
        ammoCounter.style.color = 'var(--secondary-color)';
      }
      
      // Force a repaint to ensure visibility on mobile
      ammoCounter.style.display = 'none';
      ammoCounter.offsetHeight; // Trigger reflow
      ammoCounter.style.display = '';
    }
  }
  
  /**
   * Get a random weapon type for wave rewards
   */
  static getRandomWeaponType(): WeaponType {
    const types = [WeaponType.PISTOL, WeaponType.SHOTGUN, WeaponType.RIFLE];
    return types[Math.floor(Math.random() * types.length)];
  }
  
  /**
   * Add ammo to the weapon
   */
  addAmmo(amount: number): void {
    // Add ammo to total ammunition
    this.totalAmmo += amount;
    
    // Check if ammo in magazine is also empty and needs refilling
    if (this.ammoInMagazine === 0 && this.totalAmmo > 0) {
      const ammoToAdd = Math.min(this.properties.magazineSize, this.totalAmmo);
      this.ammoInMagazine = ammoToAdd;
      this.totalAmmo -= ammoToAdd;
    }
    
    // Update UI display
    this.updateAmmoUI();
  }
  
  /**
   * Cleanup resources
   */
  dispose(): void {
    if (this.model) {
      // Remove from parent (camera or scene)
      if (this.model.parent) {
        this.model.parent.remove(this.model);
      }
    }
  }
} 