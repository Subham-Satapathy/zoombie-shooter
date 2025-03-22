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
  model: THREE.Object3D;
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
  updatePosition(camera: THREE.PerspectiveCamera): void {
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
    
    // APPROACH 1: Test against all zombie objects directly
    // This is more reliable than collecting individual meshes
    const zombieObjects: THREE.Object3D[] = [];
    const aliveZombies: Zombie[] = [];
    
    zombies.forEach(zombie => {
      if (!zombie.isDead) {
        zombieObjects.push(zombie.model);
        aliveZombies.push(zombie);
      }
    });
    
    console.log('Active zombie objects:', zombieObjects.length);
    
    // Check for intersections with whole zombie models
    const intersects = raycaster.intersectObjects(zombieObjects, true);
    console.log('Intersections found:', intersects.length);
    
    if (intersects.length > 0) {
      // Find which zombie was hit
      const hitObject = intersects[0].object;
      
      // Find the zombie this mesh belongs to by checking the object hierarchy
      let hitZombie: Zombie | null = null;
      
      for (const zombie of aliveZombies) {
        if (this.isChildOf(hitObject, zombie.model)) {
          hitZombie = zombie;
          break;
        }
      }
      
      if (hitZombie) {
        console.log('Hit zombie! Damage:', damage);
        // Apply damage to zombie
        const killed = hitZombie.takeDamage(damage);
        if (killed) {
          console.log('Zombie killed!');
        }
      }
    }
    
    // APPROACH 2: If no hits using the object hierarchy, try distance-based detection
    // This is a fallback for when raycasting fails
    if (intersects.length === 0) {
      const rayOrigin = raycaster.ray.origin;
      const rayDirection = raycaster.ray.direction;
      
      // Find closest zombie in the ray direction
      let closestZombie: Zombie | null = null;
      let closestDistance = Number.MAX_VALUE;
      
      aliveZombies.forEach(zombie => {
        // Vector from ray origin to zombie
        const toZombie = new THREE.Vector3().subVectors(zombie.position, rayOrigin);
        
        // Project this vector onto ray direction
        const projectionLength = toZombie.dot(rayDirection);
        
        // Only consider zombies in front of the ray
        if (projectionLength > 0) {
          // Get the closest point on the ray to the zombie
          const projectedPoint = new THREE.Vector3()
            .copy(rayDirection)
            .multiplyScalar(projectionLength)
            .add(rayOrigin);
          
          // Calculate distance from projected point to zombie
          const distance = projectedPoint.distanceTo(zombie.position);
          
          // If within reasonable range and closer than previous zombies
          if (distance < 1.0 && projectionLength < this.properties.range && projectionLength < closestDistance) {
            closestZombie = zombie;
            closestDistance = projectionLength;
          }
        }
      });
      
      if (closestZombie) {
        console.log('Distance-based hit! Zombie:', closestZombie);
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
   * Start reloading
   */
  reload(): boolean {
    if (this.isReloading || this.ammoInMagazine === this.properties.magazineSize || this.totalAmmo <= 0) {
      return false;
    }
    
    this.isReloading = true;
    
    // Play reload animation
    this.playReloadAnimation();
    
    // Set timeout for reload time
    setTimeout(() => {
      // Calculate ammo to add
      const ammoToAdd = Math.min(
        this.properties.magazineSize - this.ammoInMagazine,
        this.totalAmmo
      );
      
      // Update ammo counts
      this.ammoInMagazine += ammoToAdd;
      this.totalAmmo -= ammoToAdd;
      
      // Update UI
      this.updateAmmoUI();
      
      // Reset reloading state
      this.isReloading = false;
    }, this.properties.reloadTime * 1000);
    
    return true;
  }
  
  /**
   * Play reload animation
   */
  playReloadAnimation(): void {
    // Store original position and rotation
    const originalPosition = this.model.position.clone();
    const originalRotation = this.model.rotation.clone();
    
    // Apply reload animation
    this.model.position.y -= 0.1;
    this.model.rotation.x += Math.PI / 6;
    
    // Return to original position after reload time
    setTimeout(() => {
      this.model.position.copy(originalPosition);
      this.model.rotation.copy(originalRotation);
    }, this.properties.reloadTime * 1000);
  }
  
  /**
   * Update ammo display in UI
   */
  updateAmmoUI(): void {
    // Ammo counter element has been removed from UI
    // Method kept for backward compatibility
    return;
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