import * as THREE from 'three';
import { Zombie, ZombieType } from './Zombie';
import { Player } from '../models/Player';

/**
 * Wave configuration interface
 */
export interface WaveConfig {
  totalZombies: number;
  spawnRate: number; // Zombies per second
  walkerPercent: number;
  runnerPercent: number;
  tankPercent: number;
}

/**
 * Manager for handling zombies and waves
 */
export class ZombieManager extends THREE.Object3D {
  zombies: Zombie[];
  scene: THREE.Scene;
  player: Player;
  currentWave: number;
  waveActive: boolean;
  zombiesRemainingInWave: number;
  zombiesSpawnedInWave: number;
  spawnInterval: number | NodeJS.Timeout | null;
  spawnCooldown: number;
  
  constructor(scene: THREE.Scene, player: Player) {
    super(); // Call THREE.Object3D constructor
    
    this.scene = scene;
    this.player = player;
    this.zombies = [];
    this.currentWave = 0;
    this.waveActive = false;
    this.zombiesRemainingInWave = 0;
    this.zombiesSpawnedInWave = 0;
    this.spawnInterval = null;
    this.spawnCooldown = 0;
    
    // Add this manager to the scene for zombie collision detection
    this.name = 'zombieManager';
    this.scene.add(this);
  }
  
  /**
   * Start a new wave of zombies
   */
  startNewWave(): void {
    this.currentWave++;
    this.waveActive = true;
    this.zombiesSpawnedInWave = 0;
    
    // Get wave configuration
    const waveConfig = this.getWaveConfig(this.currentWave);
    this.zombiesRemainingInWave = waveConfig.totalZombies;
    
    // Update UI
    this.updateWaveUI();
    
    // Start spawning zombies with minimal delay
    this.spawnCooldown = 0.2; // Reduced initial delay
    
    // Clear existing spawn interval if it exists
    if (this.spawnInterval !== null) {
      clearInterval(this.spawnInterval);
    }
    
    // Create new spawn interval
    const spawnIntervalTime = 1000 / waveConfig.spawnRate;
    this.spawnInterval = setInterval(() => {
      if (this.zombiesSpawnedInWave < waveConfig.totalZombies) {
        this.spawnZombie(waveConfig);
        this.zombiesSpawnedInWave++;
      } else {
        // Stop spawning when all zombies for this wave have been spawned
        if (this.spawnInterval !== null) {
          clearInterval(this.spawnInterval);
          this.spawnInterval = null;
        }
      }
    }, spawnIntervalTime);
  }
  
  /**
   * Get wave configuration based on wave number
   */
  getWaveConfig(waveNumber: number): WaveConfig {
    // Base wave config with faster initial spawning
    const baseConfig: WaveConfig = {
      totalZombies: 5 + waveNumber * 2,
      spawnRate: 1.0 + waveNumber * 0.2, // Start faster (1.0 instead of 0.5)
      walkerPercent: 1,
      runnerPercent: 0,
      tankPercent: 0
    };
    
    // Adjust based on wave number
    if (waveNumber >= 3) {
      baseConfig.runnerPercent = 0.2;
      baseConfig.walkerPercent = 0.8;
    }
    
    if (waveNumber >= 5) {
      baseConfig.runnerPercent = 0.3;
      baseConfig.walkerPercent = 0.6;
      baseConfig.tankPercent = 0.1;
    }
    
    if (waveNumber >= 8) {
      baseConfig.runnerPercent = 0.4;
      baseConfig.walkerPercent = 0.4;
      baseConfig.tankPercent = 0.2;
    }
    
    if (waveNumber >= 12) {
      baseConfig.runnerPercent = 0.4;
      baseConfig.walkerPercent = 0.3;
      baseConfig.tankPercent = 0.3;
    }
    
    // Cap spawn rate to avoid too many zombies at once
    baseConfig.spawnRate = Math.min(baseConfig.spawnRate, 4); // Increased max spawn rate
    
    return baseConfig;
  }
  
  /**
   * Spawn a zombie based on wave config
   */
  spawnZombie(waveConfig: WaveConfig): void {
    // Determine zombie type based on percentages
    const typeRoll = Math.random();
    let zombieType: ZombieType;
    
    if (typeRoll < waveConfig.walkerPercent) {
      zombieType = ZombieType.WALKER;
    } else if (typeRoll < waveConfig.walkerPercent + waveConfig.runnerPercent) {
      zombieType = ZombieType.RUNNER;
    } else {
      zombieType = ZombieType.TANK;
    }
    
    // Get random spawn position away from the player
    const spawnPosition = this.getSpawnPosition();
    
    console.log(`Spawning zombie: Type=${zombieType}, Position=(${spawnPosition.x.toFixed(2)}, ${spawnPosition.z.toFixed(2)})`);
    console.log(`Player is at: (${this.player.position.x.toFixed(2)}, ${this.player.position.z.toFixed(2)})`);
    
    // Create and add zombie
    const zombie = new Zombie(zombieType, spawnPosition, this.scene, this.player);
    this.zombies.push(zombie);
    
    console.log(`Zombie created. Total zombies: ${this.zombies.length}`);
  }
  
  /**
   * Get a valid spawn position for a zombie
   */
  getSpawnPosition(): THREE.Vector3 {
    // Spawn zombies all around the player at a distance
    const minDistance = 15;
    const maxDistance = 30;
    
    // Random distance in the specified range
    const distance = minDistance + Math.random() * (maxDistance - minDistance);
    
    // Calculate random angle around the full 360 degrees
    const angle = Math.random() * Math.PI * 2; // Full circle
    
    // Calculate position based on distance and angle
    const spawnX = Math.sin(angle) * distance;
    const spawnZ = Math.cos(angle) * distance;
    
    return new THREE.Vector3(
      this.player.position.x + spawnX, // Relative to player's X
      0,                             // Ground level
      this.player.position.z + spawnZ  // Relative to player's Z
    );
  }
  
  /**
   * Update all zombies
   * @param deltaTime Time since last frame
   */
  update(deltaTime: number): void {
    // Update spawn cooldown
    if (this.spawnCooldown > 0) {
      this.spawnCooldown -= deltaTime;
    }
    
    // Update all zombies
    for (let i = this.zombies.length - 1; i >= 0; i--) {
      const zombie = this.zombies[i];
      
      if (zombie.isDead) {
        // Remove dead zombies from the array
        if (!zombie.model.parent) {
          this.zombies.splice(i, 1);
        }
      } else {
        // Update active zombies
        zombie.update(deltaTime);
      }
    }
    
    // Check if wave is complete
    if (this.waveActive && this.zombies.length === 0 && this.zombiesSpawnedInWave >= this.zombiesRemainingInWave) {
      this.waveComplete();
    }
  }
  
  /**
   * Handle wave completion
   */
  waveComplete(): void {
    this.waveActive = false;
    
    // Clear any remaining spawn interval
    if (this.spawnInterval !== null) {
      clearInterval(this.spawnInterval);
      this.spawnInterval = null;
    }
    
    // Trigger wave complete event
    document.dispatchEvent(new CustomEvent('wave-complete', {
      detail: {
        waveNumber: this.currentWave
      }
    }));
    
    // Add delay before next wave
    const breakTime = 5000; // 5 seconds
    setTimeout(() => {
      if (!this.player.isDead) {
        this.startNewWave();
      }
    }, breakTime);
  }
  
  /**
   * Update wave indicator in UI
   */
  updateWaveUI(): void {
    const waveIndicator = document.getElementById('wave-indicator');
    if (waveIndicator) {
      waveIndicator.textContent = `Wave: ${this.currentWave}`;
    }
  }
  
  /**
   * Reset zombie manager for a new game
   */
  reset(): void {
    console.log("Resetting zombie manager");
    
    // Clear spawn interval
    if (this.spawnInterval !== null) {
      clearInterval(this.spawnInterval);
      this.spawnInterval = null;
    }
    
    // Remove all zombies from scene and dispose of resources
    for (const zombie of this.zombies) {
      if (zombie.model && zombie.model.parent) {
        zombie.model.parent.remove(zombie.model);
      }
      zombie.dispose();
    }
    
    // Clear zombie array
    this.zombies = [];
    this.currentWave = 0;
    this.waveActive = false;
    this.zombiesRemainingInWave = 0;
    this.zombiesSpawnedInWave = 0;
    
    console.log("Zombie manager reset complete");
  }
} 