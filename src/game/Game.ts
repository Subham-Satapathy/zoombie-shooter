import * as THREE from 'three';
import { Player } from '../models/Player';
import { InputController } from '../utils/InputController';
import { ZombieManager } from '../zombies/ZombieManager';
import { Weapon, WeaponType } from '../weapons/Weapon';
import { DatabaseService, ScoreEntry } from '../utils/DatabaseService';

/**
 * Main Game class
 */
export class Game {
  // Three.js components
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  renderer: THREE.WebGLRenderer;
  
  // Game objects
  player!: Player;
  zombieManager!: ZombieManager;
  inputController: InputController;
  
  // Game state
  isRunning: boolean;
  score: number;
  autoShootInterval: number | NodeJS.Timeout | null;
  isPlayerShooting: boolean;
  
  // Database service
  dbService: DatabaseService;
  
  // Clock for timing
  clock: THREE.Clock;
  
  constructor() {
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(
      75, 
      window.innerWidth / window.innerHeight, 
      0.1, 
      1000
    );
    
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.shadowMap.enabled = true;
    
    this.inputController = new InputController();
    this.dbService = new DatabaseService();
    this.clock = new THREE.Clock();
    
    this.isRunning = false;
    this.score = 0;
    this.autoShootInterval = null;
    this.isPlayerShooting = false;
  }
  
  /**
   * Initialize the game
   */
  init(): void {
    // Append renderer to DOM
    document.getElementById('game-container')?.appendChild(this.renderer.domElement);
    
    // Set up scene
    this.setupScene();
    
    // Initialize camera with wider field of view
    this.camera.fov = 90; // Wider FOV
    this.camera.updateProjectionMatrix();
    
    // Initialize player
    this.player = new Player(this.scene, this.camera, this.inputController);
    
    // Position player at a fixed point facing forward
    this.player.position.set(0, 1.7, 0); // At origin, not far back
    this.player.rotation.y = 0; // Face forward (negative Z direction)
    this.player.updateCamera();
    
    // Initialize zombie manager
    this.zombieManager = new ZombieManager(this.scene, this.player);
    
    // Add starter weapon (using RIFLE as the starting weapon)
    this.givePlayerWeapon(WeaponType.RIFLE);
    
    // Setup event listeners
    this.setupEventListeners();
    
    // Enable pointer lock for desktop
    this.inputController.initPointerLock(this.renderer.domElement);
    
    // Setup touch controls for mobile
    if (this.inputController.isMobile) {
      this.setupMobileControls();
    }
    
    // Start animation loop (but don't start the game yet)
    this.animate();
  }
  
  /**
   * Set up the scene with lighting and ground
   */
  setupScene(): void {
    // Set background color
    this.scene.background = new THREE.Color(0x222222);
    
    // Add ambient light
    const ambientLight = new THREE.AmbientLight(0x404040, 0.5);
    this.scene.add(ambientLight);
    
    // Add directional light (sun)
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(10, 20, 10);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    directionalLight.shadow.camera.near = 0.5;
    directionalLight.shadow.camera.far = 50;
    directionalLight.shadow.camera.left = -30;
    directionalLight.shadow.camera.right = 30;
    directionalLight.shadow.camera.top = 30;
    directionalLight.shadow.camera.bottom = -30;
    this.scene.add(directionalLight);
    
    // Create ground plane
    const groundGeometry = new THREE.PlaneGeometry(100, 100);
    const groundMaterial = new THREE.MeshStandardMaterial({ 
      color: 0x1a1a1a, 
      roughness: 0.8,
      metalness: 0.2
    });
    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    this.scene.add(ground);
    
    // Add some fog for atmosphere
    this.scene.fog = new THREE.FogExp2(0x222222, 0.03);
  }
  
  /**
   * Set up event listeners for game events
   */
  setupEventListeners(): void {
    // Handle zombie killed event
    document.addEventListener('zombie-killed', (e: any) => {
      // Add score based on zombie type
      const scoreValue = e.detail.scoreValue;
      this.score += scoreValue;
      
      // Chance to drop ammo
      if (Math.random() < 0.3) {
        const currentWeapon = this.player.getCurrentWeapon();
        if (currentWeapon) {
          currentWeapon.addAmmo(Math.floor(Math.random() * 10) + 5);
        }
      }
    });
    
    // Handle wave complete event
    document.addEventListener('wave-complete', (e: any) => {
      // Give reward for completing wave
      this.handleWaveComplete(e.detail.waveNumber);
    });
    
    // Handle game over event
    document.addEventListener('game-over', () => {
      this.gameOver();
    });
  }
  
  /**
   * Start the game
   */
  start(): void {
    console.log("Starting game");
    
    // Ensure game is running
    this.isRunning = true;
    
    // Reset score only on initial start, not on restart
    if (this.zombieManager.currentWave === 0) {
      this.score = 0;
    }
    
    // Reset the health UI
    this.player.updateHealthUI();
    
    // Update weapon UI
    const currentWeapon = this.player.getCurrentWeapon();
    if (currentWeapon) {
      currentWeapon.updateAmmoUI();
    }
    
    // Start first wave
    this.zombieManager.startNewWave();
    
    console.log("Game started successfully");
  }
  
  /**
   * Handle wave completion
   */
  handleWaveComplete(waveNumber: number): void {
    // Reward: bonus score
    this.score += waveNumber * 100;
    
    // Every few waves, give a new weapon
    if (waveNumber % 3 === 0) {
      const weaponType = Weapon.getRandomWeaponType();
      this.givePlayerWeapon(weaponType);
    }
    
    // Refill ammo for current weapon
    const currentWeapon = this.player.getCurrentWeapon();
    if (currentWeapon) {
      // Add to total ammo reserves
      currentWeapon.addAmmo(currentWeapon.properties.magazineSize * 2);
      
      // Ensure the magazine is also refilled
      if (currentWeapon.ammoInMagazine < currentWeapon.properties.magazineSize) {
        const ammoToAdd = Math.min(
          currentWeapon.properties.magazineSize - currentWeapon.ammoInMagazine,
          currentWeapon.totalAmmo
        );
        
        currentWeapon.ammoInMagazine += ammoToAdd;
        currentWeapon.totalAmmo -= ammoToAdd;
        currentWeapon.updateAmmoUI();
      }
    }
  }
  
  /**
   * Give player a new weapon
   */
  givePlayerWeapon(weaponType: WeaponType): void {
    console.log('Giving player weapon:', WeaponType[weaponType]);
    const weapon = new Weapon(weaponType, this.scene);
    
    // Log initial ammo
    console.log('Initial ammo:', weapon.ammoInMagazine, '/', weapon.totalAmmo);
    
    // Add weapon to player
    this.player.addWeapon(weapon);
    
    // Position weapon relative to camera
    weapon.updatePosition(this.camera);
    
    // Ensure ammo UI is updated
    weapon.updateAmmoUI();
  }
  
  /**
   * Animation loop
   */
  animate(): void {
    const animate = () => {
      requestAnimationFrame(animate);
      
      if (this.isRunning) {
        const deltaTime = this.clock.getDelta();
        
        // Update player
        this.player.update(deltaTime);
        
        // Update zombie manager
        this.zombieManager.update(deltaTime);
        
        // Check if player is shooting with mouse - ONLY if pointer lock is established
        if (!this.inputController.isMobile && 
            this.inputController.pointerLockEstablished && 
            this.inputController.mouseButtons.left) {
          if (!this.isPlayerShooting) {
            this.startShooting();
            this.isPlayerShooting = true;
          }
        } else if (!this.inputController.isMobile && !this.inputController.mouseButtons.left) {
          if (this.isPlayerShooting) {
            this.stopShooting();
            this.isPlayerShooting = false;
          }
        }
        
        // On mobile, use touch movement for aiming
        if (this.inputController.isMobile && (this.inputController.mouseMovementX !== 0 || this.inputController.mouseMovementY !== 0)) {
          // Update player rotation based on touch movement
          this.player.updateRotation(
            this.inputController.mouseMovementX * 0.05, // Increased sensitivity from 0.02 to 0.05
            this.inputController.mouseMovementY * 0.05  // Increased sensitivity from 0.02 to 0.05
          );
          
          // Immediately reset the movement values after applying to prevent drift
          this.inputController.mouseMovementX = 0;
          this.inputController.mouseMovementY = 0;
        }
        
        // Check for melee combat (only if player is out of ammo)
        this.checkMeleeCombat();
      }
      
      // Render scene
      this.renderer.render(this.scene, this.camera);
    };
    
    animate();
  }
  
  /**
   * Handle window resize
   */
  onWindowResize(): void {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }
  
  /**
   * Toggle between first-person and third-person camera views
   */
  toggleCameraView(): void {
    this.player.toggleCameraView();
  }
  
  /**
   * Start shooting
   */
  startShooting(): void {
    // Get current weapon
    const currentWeapon = this.player.getCurrentWeapon();
    if (!currentWeapon) {
      console.log('No weapon equipped');
      return;
    }
    
    console.log('Start shooting with', WeaponType[currentWeapon.type]);
    
    // Fire once immediately
    const fired = currentWeapon.fire(this.camera, this.zombieManager.zombies);
    console.log('Initial shot fired:', fired);
    
    // If automatic weapon, set up interval
    if (currentWeapon.properties.automatic) {
      // Clear existing interval if any
      if (this.autoShootInterval !== null) {
        clearInterval(this.autoShootInterval);
      }
      
      // Set up new interval
      const fireInterval = 1000 / currentWeapon.properties.fireRate;
      console.log('Setting up automatic fire with interval:', fireInterval);
      this.autoShootInterval = setInterval(() => {
        currentWeapon.fire(this.camera, this.zombieManager.zombies);
      }, fireInterval);
    }
  }
  
  /**
   * Stop shooting
   */
  stopShooting(): void {
    if (this.autoShootInterval !== null) {
      clearInterval(this.autoShootInterval);
      this.autoShootInterval = null;
    }
  }
  
  /**
   * Reload current weapon
   */
  reload(): void {
    const currentWeapon = this.player.getCurrentWeapon();
    if (currentWeapon) {
      currentWeapon.reload();
    }
  }
  
  /**
   * Switch to next weapon
   */
  switchWeapon(): void {
    this.player.switchWeapon();
  }
  
  /**
   * Check for melee combat with nearby zombies
   */
  checkMeleeCombat(): void {
    // Only use melee if player has no ammo
    const currentWeapon = this.player.getCurrentWeapon();
    if (!currentWeapon || currentWeapon.ammoInMagazine > 0 || currentWeapon.totalAmmo > 0) {
      return;
    }
    
    // Check for nearby zombies
    const nearbyZombies = this.zombieManager.zombies.filter(zombie => {
      if (zombie.isDead) return false;
      
      // Check distance to player
      const distance = zombie.position.distanceTo(this.player.position);
      return distance <= 2.0; // Melee range
    });
    
    // If there are nearby zombies and player has enough stamina, perform melee attack
    if (nearbyZombies.length > 0 && this.player.useStamina(20)) {
      // Simple melee attack
      nearbyZombies.forEach(zombie => {
        zombie.takeDamage(15); // Melee damage is weaker than gun
      });
    }
  }
  
  /**
   * Handle game over
   */
  gameOver(): void {
    this.isRunning = false;
    
    // Stop auto shooting if active
    this.stopShooting();
    
    // Release pointer lock to allow mouse interaction with Game Over UI
    if (document.pointerLockElement || 
        (document as any).mozPointerLockElement || 
        (document as any).webkitPointerLockElement) {
      document.exitPointerLock = document.exitPointerLock || 
                                (document as any).mozExitPointerLock || 
                                (document as any).webkitExitPointerLock;
      document.exitPointerLock();
    }
    
    // Show game over UI
    const gameOverUI = document.getElementById('game-over');
    if (gameOverUI) {
      gameOverUI.classList.remove('hidden');
      
      // Set final score
      const finalScoreElement = document.getElementById('final-score');
      if (finalScoreElement) {
        finalScoreElement.textContent = `Final Score: ${this.score} | Wave: ${this.zombieManager.currentWave}`;
      }
      
      // Focus the username input for immediate typing
      setTimeout(() => {
        const usernameInput = document.getElementById('username-input') as HTMLInputElement;
        if (usernameInput) {
          usernameInput.focus();
        }
      }, 100);
      
      // Fetch and display leaderboard
      this.fetchLeaderboard();
    }
  }
  
  /**
   * Fetch leaderboard data
   */
  async fetchLeaderboard(): Promise<void> {
    const topScores = await this.dbService.getTopScores();
    this.updateLeaderboardUI(topScores);
    
    // Subscribe to real-time updates for the game over leaderboard
    this.dbService.subscribeToLeaderboard(this.updateLeaderboardUI.bind(this));
  }
  
  /**
   * Update the leaderboard UI with the given scores
   */
  private updateLeaderboardUI(topScores: ScoreEntry[]): void {
    // Update leaderboard UI
    const leaderboardElement = document.getElementById('leaderboard');
    if (leaderboardElement) {
      // Clear previous entries
      leaderboardElement.innerHTML = '<h3>Top Scores</h3>';
      
      // Create table
      const table = document.createElement('table');
      table.style.width = '100%';
      
      // Add header
      const thead = document.createElement('thead');
      thead.innerHTML = `
        <tr>
          <th style="text-align: left;">Rank</th>
          <th style="text-align: left;">Username</th>
          <th style="text-align: right;">Score</th>
          <th style="text-align: right;">Wave</th>
        </tr>
      `;
      table.appendChild(thead);
      
      // Add rows
      const tbody = document.createElement('tbody');
      
      // Get username from input
      const usernameInput = document.getElementById('username-input') as HTMLInputElement;
      const currentUsername = usernameInput?.value || '';
      
      topScores.forEach((entry, index) => {
        const row = document.createElement('tr');
        
        // Highlight current user's score if username matches
        if (currentUsername && currentUsername.trim() === entry.username) {
          row.classList.add('current-user');
        }
        
        row.innerHTML = `
          <td style="text-align: left;">${index + 1}</td>
          <td style="text-align: left;">${entry.username}</td>
          <td style="text-align: right;">${entry.score}</td>
          <td style="text-align: right;">${entry.wave}</td>
        `;
        tbody.appendChild(row);
      });
      
      table.appendChild(tbody);
      leaderboardElement.appendChild(table);
    }
  }
  
  /**
   * Submit score to leaderboard
   */
  async submitScore(username: string): Promise<void> {
    if (username.trim().length === 0) {
      alert('Please enter a username');
      return;
    }
    
    // Disable submit button during submission
    const submitBtn = document.getElementById('submit-score');
    if (submitBtn) {
      submitBtn.setAttribute('disabled', 'disabled');
      submitBtn.textContent = 'Submitting...';
    }
    
    const scoreEntry: ScoreEntry = {
      username,
      score: this.score,
      wave: this.zombieManager.currentWave
    };
    
    console.log('Submitting score for:', username, 'Score:', this.score, 'Wave:', this.zombieManager.currentWave);
    
    try {
      // First, check if this user has a higher score already
      const existingScores = await this.dbService.getTopScores(50);
      const existingScore = existingScores.find(s => s.username === username);
      
      if (existingScore && existingScore.score > this.score) {
        // Show message but don't block submission - the server will handle this too
        alert(`You already have a higher score of ${existingScore.score} (Wave ${existingScore.wave}). Your current score is ${this.score} (Wave ${this.zombieManager.currentWave}).`);
      }
      
      // Submit score to database
      const success = await this.dbService.submitScore(scoreEntry);
      
      if (success) {
        // Disable submit button
        if (submitBtn) {
          submitBtn.setAttribute('disabled', 'disabled');
          submitBtn.textContent = 'Submitted';
        }
        
        // Refresh leaderboard
        this.fetchLeaderboard();
      } else {
        // Show detailed error message
        alert('Failed to submit score. Please check your internet connection and try again. If the problem persists, verify that the leaderboard service is properly configured.');
        
        // Reset submit button
        if (submitBtn) {
          submitBtn.removeAttribute('disabled');
          submitBtn.textContent = 'Try Again';
        }
      }
    } catch (error) {
      console.error('Exception when handling score submission:', error);
      alert('An unexpected error occurred. Please try again.');
      
      // Reset submit button
      if (submitBtn) {
        submitBtn.removeAttribute('disabled');
        submitBtn.textContent = 'Try Again';
      }
    }
  }
  
  /**
   * Restart the game
   */
  restart(): void {
    console.log("Game restart called");
    
    // Reset game components
    this.resetGame();
    
    // Hide game over UI
    const gameOverUI = document.getElementById('game-over');
    if (gameOverUI) {
      gameOverUI.classList.add('hidden');
    }
    
    // Ensure start screen stays hidden
    const startScreen = document.getElementById('start-screen');
    if (startScreen) {
      startScreen.classList.add('hidden');
    }
    
    // Reset username input
    const usernameInput = document.getElementById('username-input') as HTMLInputElement;
    if (usernameInput) {
      usernameInput.value = '';
    }
    
    // Reset submit button
    const submitBtn = document.getElementById('submit-score');
    if (submitBtn) {
      submitBtn.removeAttribute('disabled');
      submitBtn.textContent = 'Submit Score';
    }
    
    // Reset clock to avoid large deltaTime on first update
    this.clock = new THREE.Clock();
    
    // Re-enable pointer lock for desktop with a slight delay
    if (!this.inputController.isMobile) {
      console.log("Attempting to re-enable pointer lock");
      setTimeout(() => {
        // Request pointer lock on the renderer's canvas
        if (!document.pointerLockElement) {
          console.log("Requesting pointer lock");
          this.renderer.domElement.requestPointerLock();
        }
      }, 200);
    }
    
    console.log("Starting game again");
    // Start game again
    this.start();
  }
  
  /**
   * Reset game state
   */
  resetGame(): void {
    console.log("Resetting game state");
    
    // Reset game running state
    this.isRunning = true;
    
    // Clear any existing auto-shooting interval
    this.stopShooting();
    this.isPlayerShooting = false;
    
    // Reset zombie manager
    this.zombieManager.reset();
    
    // Reset player
    this.player.dispose();
    
    // Create a new player instance
    this.player = new Player(this.scene, this.camera, this.inputController);
    
    // Position player at a fixed point facing forward (same as init)
    this.player.position.set(0, 1.7, 0);
    this.player.rotation.y = 0;
    this.player.updateCamera();
    
    // Make sure zombie manager references the new player instance
    this.zombieManager.player = this.player;
    
    // Reset score
    this.score = 0;
    
    // Give starting weapon
    this.givePlayerWeapon(WeaponType.RIFLE);
    
    console.log("Game has been reset and is ready to start again");
  }
  
  /**
   * Setup mobile-specific touch controls
   */
  setupMobileControls(): void {
    // Get renderer element
    const renderer = this.renderer.domElement;
    
    // Add touch event listeners to the main game area for shooting
    // This enables touch-to-shoot anywhere on the right side of the screen
    renderer.addEventListener('touchstart', (e: TouchEvent) => {
      e.preventDefault();
      
      // Check if the touch is on the right side of the screen
      // This avoids interfering with the scrolling controls
      const touch = e.touches[0];
      if (touch.clientX > window.innerWidth / 2) {
        this.startShooting();
      }
    });
    
    renderer.addEventListener('touchend', (e: TouchEvent) => {
      e.preventDefault();
      this.stopShooting();
    });
    
    // Make mobile controls visible
    const mobileControls = document.getElementById('mobile-controls');
    if (mobileControls) {
      mobileControls.style.display = 'block';
      
      // Update mobile instructions text
      const mobileInstructions = document.getElementById('mobile-instructions');
      if (mobileInstructions) {
        mobileInstructions.innerHTML = `
          <p>Left: Scroll to aim</p>
          <p>Right: Tap to shoot</p>
        `;
      }
    }
  }
} 