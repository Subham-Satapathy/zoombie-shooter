import * as THREE from 'three';
import { Player } from '../models/Player';

/**
 * Zombie types
 */
export enum ZombieType {
  WALKER,
  RUNNER,
  TANK
}

/**
 * Properties for different zombie types
 */
export interface ZombieProperties {
  health: number;
  damage: number;
  moveSpeed: number;
  attackRange: number;
  attackCooldown: number;
  detectionRange: number;
  color: number;
  scoreValue: number;
  scale?: number;
}

/**
 * Base Zombie class
 */
export class Zombie {
  type: ZombieType;
  properties: ZombieProperties;
  position: THREE.Vector3;
  rotation: THREE.Euler;
  model!: THREE.Object3D;
  scene: THREE.Scene;
  health: number;
  lastAttackTime: number;
  isAttacking: boolean;
  isDead: boolean;
  player: Player;
  
  // Part references for animation
  leftArm!: THREE.Mesh;
  rightArm!: THREE.Mesh;
  
  // Animation properties
  clock: THREE.Clock;
  animationMixer: THREE.AnimationMixer | null;
  walkAnimation: THREE.AnimationAction | null;
  attackAnimation: THREE.AnimationAction | null;
  deathAnimation: THREE.AnimationAction | null;
  isWalking: boolean;
  
  constructor(type: ZombieType, position: THREE.Vector3, scene: THREE.Scene, player: Player) {
    this.type = type;
    this.position = position;
    this.scene = scene;
    this.player = player;
    this.rotation = new THREE.Euler(0, 0, 0, 'YXZ');
    this.lastAttackTime = 0;
    this.isAttacking = false;
    this.isDead = false;
    
    // Initialize animation properties
    this.clock = new THREE.Clock();
    this.animationMixer = null;
    this.walkAnimation = null;
    this.attackAnimation = null;
    this.deathAnimation = null;
    this.isWalking = false;
    
    // Set properties based on zombie type
    this.properties = this.getZombieProperties(type);
    this.health = this.properties.health;
    
    this.createZombieModel();
  }
  
  /**
   * Get properties for a specific zombie type
   */
  getZombieProperties(type: ZombieType): ZombieProperties {
    switch (type) {
      case ZombieType.WALKER:
        return {
          health: 100,
          damage: 10,
          moveSpeed: 2,
          attackRange: 5.0,
          attackCooldown: 1.5,
          detectionRange: 15,
          color: 0x6a994e,
          scoreValue: 100,
          scale: 0.9
        };
        
      case ZombieType.RUNNER:
        return {
          health: 70,
          damage: 8,
          moveSpeed: 4,
          attackRange: 4.8,
          attackCooldown: 1.0,
          detectionRange: 20,
          color: 0xbc4749,
          scoreValue: 150,
          scale: 0.9
        };
        
      case ZombieType.TANK:
        return {
          health: 250,
          damage: 25,
          moveSpeed: 1.5,
          attackRange: 5.5,
          attackCooldown: 2.0,
          detectionRange: 12,
          color: 0x283618,
          scoreValue: 250,
          scale: 1.3
        };
    }
  }
  
  /**
   * Create the zombie model
   */
  createZombieModel(): void {
    // Create a temporary basic model while loading the detailed one
    this.createBasicZombieModel();
    
    // Load zombie textures
    const textureLoader = new THREE.TextureLoader();
    const zombieSkin = textureLoader.load('/assets/textures/zombie_skin.jpg', () => {
      // Once texture is loaded, create detailed model
      this.createDetailedZombieModel(zombieSkin);
    });
  }
  
  /**
   * Create a basic placeholder zombie model
   */
  createBasicZombieModel(): void {
    // Create a group for the zombie
    this.model = new THREE.Group();
    
    // Create zombie body
    const bodyGeometry = new THREE.CylinderGeometry(0.4, 0.3, 1.2, 8);
    const bodyMaterial = new THREE.MeshStandardMaterial({
      color: 0x2D572C, // Sickly green
      roughness: 0.8,
      metalness: 0.1
    });
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    body.position.y = 0.8;
    this.model.add(body);
    
    // Create zombie head
    const headGeometry = new THREE.SphereGeometry(0.25, 16, 16);
    const headMaterial = new THREE.MeshStandardMaterial({
      color: 0x3A6B39, // Slightly different green
      roughness: 0.7,
      metalness: 0.1
    });
    const head = new THREE.Mesh(headGeometry, headMaterial);
    head.position.y = 1.65;
    this.model.add(head);
    
    // Create zombie eyes
    const eyeGeometry = new THREE.SphereGeometry(0.05, 8, 8);
    const eyeMaterial = new THREE.MeshBasicMaterial({
      color: 0xFF0000 // Red eyes
    });
    
    // Left eye
    const leftEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
    leftEye.position.set(0.1, 1.7, 0.18);
    this.model.add(leftEye);
    
    // Right eye
    const rightEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
    rightEye.position.set(-0.1, 1.7, 0.18);
    this.model.add(rightEye);
    
    // Create zombie arms
    const armGeometry = new THREE.BoxGeometry(0.15, 0.7, 0.15);
    const armMaterial = new THREE.MeshStandardMaterial({
      color: 0x2D572C, // Same green as body
      roughness: 0.8,
      metalness: 0.1
    });
    
    // Left arm
    this.leftArm = new THREE.Mesh(armGeometry, armMaterial);
    this.leftArm.position.set(0.55, 1.1, 0);
    this.leftArm.rotation.z = -0.3; // Slightly angled outward
    this.model.add(this.leftArm);
    
    // Right arm
    this.rightArm = new THREE.Mesh(armGeometry, armMaterial);
    this.rightArm.position.set(-0.55, 1.1, 0);
    this.rightArm.rotation.z = 0.3; // Slightly angled outward
    this.model.add(this.rightArm);
    
    // Set initial position
    if (this.properties.scale) {
      this.model.scale.set(
        this.properties.scale, 
        this.properties.scale, 
        this.properties.scale
      );
    }
    
    this.model.position.copy(this.position);
    this.scene.add(this.model);
  }
  
  /**
   * Create a more detailed zombie model with textures
   */
  createDetailedZombieModel(skinTexture: THREE.Texture): void {
    // If we already have a model in the scene, remove it
    if (this.model && this.model.parent) {
      this.scene.remove(this.model);
    }
    
    // Create a new group for the zombie
    this.model = new THREE.Group();
    
    // Apply repeating texture pattern
    skinTexture.wrapS = THREE.RepeatWrapping;
    skinTexture.wrapT = THREE.RepeatWrapping;
    skinTexture.repeat.set(1, 1);
    
    // Create bumpMap from the same texture for added detail
    const bumpMap = skinTexture.clone();
    
    // Set different characteristics based on zombie type
    let bodyColor, headColor, eyeColor, bodyScale, headScale;
    let additionalFeatures = [];
    
    switch(this.type) {
      case ZombieType.WALKER:
        // WALKER: Extremely green zombie
        bodyColor = new THREE.Color(0x00FF00); // Bright green
        headColor = new THREE.Color(0x00CC00); // Slightly darker green
        eyeColor = new THREE.Color(0xFF0000); // Bright red eyes
        bodyScale = { x: 1.0, y: 1.0, z: 1.0 };
        headScale = { x: 1.0, y: 1.0, z: 1.0 };
        
        // Add some distinctive features for Walker zombies
        const tongueGeometry = new THREE.BoxGeometry(0.05, 0.05, 0.2);
        const tongueMaterial = new THREE.MeshBasicMaterial({ color: 0xFF3333 });
        const tongue = new THREE.Mesh(tongueGeometry, tongueMaterial);
        tongue.position.set(0, 1.6, 0.3);
        additionalFeatures.push(tongue);
        break;
        
      case ZombieType.RUNNER:
        // RUNNER: Very thin, bright red zombie
        bodyColor = new THREE.Color(0xFF0000); // Bright red
        headColor = new THREE.Color(0xCC0000); // Darker red
        eyeColor = new THREE.Color(0xFFFF00); // Bright yellow eyes
        bodyScale = { x: 0.7, y: 1.3, z: 0.7 }; // Much thinner but taller
        headScale = { x: 0.8, y: 0.8, z: 0.8 }; // Smaller head
        
        // Add bigger, more visible spikes for runner zombies
        for (let i = 0; i < 6; i++) {
          const spikeGeometry = new THREE.ConeGeometry(0.08, 0.3, 8);
          const spikeMaterial = new THREE.MeshStandardMaterial({
            color: 0xFF3333, 
            roughness: 0.8,
            metalness: 0.2
          });
          
          const spike = new THREE.Mesh(spikeGeometry, spikeMaterial);
          // Position spikes along spine and shoulders
          if (i < 4) {
            spike.position.set(0, 1.0 + i * 0.2, -0.15);
            spike.rotation.x = -Math.PI / 3; // Angle backwards
          } else {
            // Add spikes on shoulders
            const xPos = i === 4 ? 0.4 : -0.4;
            spike.position.set(xPos, 1.4, 0);
            spike.rotation.z = i === 4 ? -Math.PI / 3 : Math.PI / 3;
          }
          additionalFeatures.push(spike);
        }
        
        // Add claws to hands
        const clawGeometry = new THREE.ConeGeometry(0.05, 0.15, 4);
        const clawMaterial = new THREE.MeshBasicMaterial({ color: 0x000000 });
        
        for (let i = 0; i < 2; i++) {
          const claw = new THREE.Mesh(clawGeometry, clawMaterial);
          claw.position.set(i === 0 ? 0.55 : -0.55, 0.8, 0.1);
          claw.rotation.x = -Math.PI / 4;
          additionalFeatures.push(claw);
        }
        break;
        
      case ZombieType.TANK:
        // TANK: Extremely large, armored zombie
        bodyColor = new THREE.Color(0x004400); // Very dark green
        headColor = new THREE.Color(0x003300); // Even darker green
        eyeColor = new THREE.Color(0x00FFFF); // Bright cyan eyes
        bodyScale = { x: 2.0, y: 1.4, z: 2.0 }; // Extremely wide
        headScale = { x: 1.3, y: 1.3, z: 1.3 }; // Bigger head
        
        // Add significant armor plating for tank zombies
        const armorMaterial = new THREE.MeshStandardMaterial({
          color: 0x888888, // Grey metallic
          roughness: 0.3,
          metalness: 0.9
        });
        
        // Chest plate
        const chestArmor = new THREE.Mesh(
          new THREE.BoxGeometry(1.2, 0.8, 0.4),
          armorMaterial
        );
        chestArmor.position.set(0, 1.1, 0.3);
        additionalFeatures.push(chestArmor);
        
        // Shoulder plates
        const leftShoulder = new THREE.Mesh(
          new THREE.BoxGeometry(0.5, 0.4, 0.4),
          armorMaterial
        );
        leftShoulder.position.set(0.6, 1.4, 0.1);
        additionalFeatures.push(leftShoulder);
        
        const rightShoulder = new THREE.Mesh(
          new THREE.BoxGeometry(0.5, 0.4, 0.4),
          armorMaterial
        );
        rightShoulder.position.set(-0.6, 1.4, 0.1);
        additionalFeatures.push(rightShoulder);
        
        // Back plate
        const backPlate = new THREE.Mesh(
          new THREE.BoxGeometry(1.0, 1.0, 0.2),
          armorMaterial
        );
        backPlate.position.set(0, 1.1, -0.3);
        additionalFeatures.push(backPlate);
        
        // Helmet
        const helmet = new THREE.Mesh(
          new THREE.SphereGeometry(0.35, 32, 32, 0, Math.PI * 2, 0, Math.PI / 1.5),
          armorMaterial
        );
        helmet.position.set(0, 1.7, 0);
        additionalFeatures.push(helmet);
        break;
    }
    
    // Create more detailed zombie body
    const bodyGeometry = new THREE.CylinderGeometry(0.4, 0.35, 1.2, 12);
    const bodyMaterial = new THREE.MeshStandardMaterial({
      map: skinTexture,
      bumpMap: bumpMap,
      bumpScale: 0.05,
      color: bodyColor,
      roughness: 0.9,
      metalness: 0.1
    });
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    body.position.y = 0.8;
    body.scale.set(bodyScale.x, bodyScale.y, bodyScale.z);
    this.model.add(body);
    
    // Create more detailed zombie head
    const headGeometry = new THREE.SphereGeometry(0.25, 32, 32);
    const headMaterial = new THREE.MeshStandardMaterial({
      map: skinTexture,
      bumpMap: bumpMap,
      bumpScale: 0.1,
      color: headColor,
      roughness: 0.8,
      metalness: 0.1
    });
    const head = new THREE.Mesh(headGeometry, headMaterial);
    head.position.y = 1.65;
    head.scale.set(headScale.x, headScale.y, headScale.z);
    this.model.add(head);
    
    // Create zombie mouth (gash in the face)
    const mouthGeometry = new THREE.BoxGeometry(0.15, 0.05, 0.05);
    const mouthMaterial = new THREE.MeshBasicMaterial({
      color: 0x330000 // Dark red/black
    });
    const mouth = new THREE.Mesh(mouthGeometry, mouthMaterial);
    mouth.position.set(0, 1.6, 0.23);
    mouth.scale.set(headScale.x, headScale.y, headScale.z);
    this.model.add(mouth);
    
    // Create zombie eyes
    const eyeGeometry = new THREE.SphereGeometry(0.05, 16, 16);
    const eyeMaterial = new THREE.MeshBasicMaterial({
      color: eyeColor
    });
    
    // Left eye
    const leftEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
    leftEye.position.set(0.1, 1.7, 0.18);
    leftEye.scale.set(headScale.x, headScale.y, headScale.z);
    this.model.add(leftEye);
    
    // Right eye
    const rightEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
    rightEye.position.set(-0.1, 1.7, 0.18);
    rightEye.scale.set(headScale.x, headScale.y, headScale.z);
    this.model.add(rightEye);
    
    // Create more detailed zombie arms
    const armGeometry = new THREE.CylinderGeometry(0.08, 0.07, 0.7, 8);
    const armMaterial = new THREE.MeshStandardMaterial({
      map: skinTexture,
      bumpMap: bumpMap,
      bumpScale: 0.05,
      color: bodyColor, // Same as body
      roughness: 0.9,
      metalness: 0.1
    });
    
    // Left arm
    this.leftArm = new THREE.Mesh(armGeometry, armMaterial);
    this.leftArm.position.set(0.55, 1.1, 0);
    this.leftArm.rotation.z = -0.3; // Slightly angled outward
    this.leftArm.scale.set(bodyScale.x, bodyScale.y, bodyScale.z);
    this.model.add(this.leftArm);
    
    // Right arm
    this.rightArm = new THREE.Mesh(armGeometry, armMaterial);
    this.rightArm.position.set(-0.55, 1.1, 0);
    this.rightArm.rotation.z = 0.3; // Slightly angled outward
    this.rightArm.scale.set(bodyScale.x, bodyScale.y, bodyScale.z);
    this.model.add(this.rightArm);
    
    // Create zombie legs
    const legGeometry = new THREE.CylinderGeometry(0.12, 0.1, 0.8, 8);
    const legMaterial = new THREE.MeshStandardMaterial({
      map: skinTexture,
      bumpMap: bumpMap,
      bumpScale: 0.05,
      color: bodyColor,
      roughness: 0.9,
      metalness: 0.1
    });
    
    // Left leg
    const leftLeg = new THREE.Mesh(legGeometry, legMaterial);
    leftLeg.position.set(0.2, 0.2, 0);
    leftLeg.scale.set(bodyScale.x, bodyScale.y, bodyScale.z);
    this.model.add(leftLeg);
    
    // Right leg
    const rightLeg = new THREE.Mesh(legGeometry, legMaterial);
    rightLeg.position.set(-0.2, 0.2, 0);
    rightLeg.scale.set(bodyScale.x, bodyScale.y, bodyScale.z);
    this.model.add(rightLeg);
    
    // Add additional features specific to zombie type
    additionalFeatures.forEach(feature => this.model.add(feature));
    
    // Add some "wounds" to make zombie look more damaged
    this.addWounds();
    
    // Set scale according to zombie type (base scale from properties * type-specific modifications)
    let finalScale = this.properties.scale || 1.0;
    
    // Add a label to identify zombie type and score value
    this.createZombieLabel();
    
    // Set position and add to scene
    this.model.position.copy(this.position);
    this.model.scale.set(finalScale, finalScale, finalScale);
    this.scene.add(this.model);
    
    // Set up animations
    this.setupAnimations();
  }
  
  /**
   * Create a floating text label above the zombie showing its type and score value
   */
  createZombieLabel(): void {
    // Create canvas for text rendering
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    canvas.width = 256;
    canvas.height = 128;
    
    if (!context) return;
    
    // Clear canvas
    context.clearRect(0, 0, canvas.width, canvas.height);
    
    // Style canvas based on zombie type
    let labelColor = '';
    let labelText = '';
    
    switch(this.type) {
      case ZombieType.WALKER:
        labelColor = 'rgba(0, 255, 0, 0.8)'; // Bright green
        labelText = 'WALKER';
        break;
      case ZombieType.RUNNER:
        labelColor = 'rgba(255, 0, 0, 0.8)'; // Bright red
        labelText = 'RUNNER';
        break;
      case ZombieType.TANK:
        labelColor = 'rgba(0, 100, 200, 0.8)'; // Blue
        labelText = 'TANK';
        break;
    }
    
    // Draw background
    context.fillStyle = labelColor;
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.strokeStyle = 'white';
    context.lineWidth = 4;
    context.strokeRect(2, 2, canvas.width - 4, canvas.height - 4);
    
    // Add text
    context.fillStyle = 'white';
    context.font = 'bold 50px Arial';
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.fillText(labelText, canvas.width / 2, canvas.height / 3);
    
    // Add score value
    context.fillStyle = 'yellow';
    context.font = 'bold 40px Arial';
    context.fillText(`${this.properties.scoreValue} pts`, canvas.width / 2, canvas.height * 2/3);
    
    // Create texture from canvas
    const texture = new THREE.CanvasTexture(canvas);
    const material = new THREE.SpriteMaterial({ 
      map: texture,
      transparent: true
    });
    
    // Create sprite
    const sprite = new THREE.Sprite(material);
    sprite.position.set(0, 2.5, 0); // Position higher above head
    sprite.scale.set(2.0, 1.0, 1); // Make label larger
    
    this.model.add(sprite);
  }
  
  /**
   * Add wounds and details to make zombie look more gruesome
   */
  addWounds(): void {
    if (!this.model) return;
    
    // Wound material
    const woundMaterial = new THREE.MeshBasicMaterial({
      color: 0x8B0000, // Dark red
      transparent: true,
      opacity: 0.85
    });
    
    // Add several random wounds on the zombie body
    for (let i = 0; i < 5; i++) {
      // Random wound geometry (small dents or cuts)
      const woundSize = 0.05 + Math.random() * 0.1;
      let woundGeo;
      
      if (Math.random() > 0.5) {
        // Circular wound
        woundGeo = new THREE.CircleGeometry(woundSize, 8);
      } else {
        // Cut-like wound
        woundGeo = new THREE.PlaneGeometry(woundSize * 2, woundSize / 2);
      }
      
      const wound = new THREE.Mesh(woundGeo, woundMaterial);
      
      // Random position on body or limbs
      const bodyPart = Math.floor(Math.random() * 3);
      let x, y, z;
      
      if (bodyPart === 0) {
        // On body
        x = (Math.random() - 0.5) * 0.8;
        y = 0.7 + Math.random() * 1.0;
        z = (Math.random() > 0.5 ? 0.4 : -0.4);
      } else if (bodyPart === 1) {
        // On arms
        x = (Math.random() > 0.5 ? 0.55 : -0.55);
        y = 0.9 + Math.random() * 0.4;
        z = (Math.random() - 0.5) * 0.2;
      } else {
        // On legs
        x = (Math.random() > 0.5 ? 0.2 : -0.2);
        y = 0.1 + Math.random() * 0.3;
        z = (Math.random() - 0.5) * 0.2;
      }
      
      wound.position.set(x, y, z);
      
      // Random rotation to give more variety
      wound.rotation.x = Math.random() * Math.PI * 2;
      wound.rotation.y = Math.random() * Math.PI * 2;
      wound.rotation.z = Math.random() * Math.PI * 2;
      
      this.model.add(wound);
    }
  }
  
  /**
   * Set up the zombie animations
   */
  setupAnimations(): void {
    // Initialize animation mixer
    this.animationMixer = new THREE.AnimationMixer(this.model);
    this.clock = new THREE.Clock();
    
    // Create the walking animation
    this.simulateWalkingAnimation();
    
    // Start walking by default
    if (this.walkAnimation) {
      this.walkAnimation.play();
      this.isWalking = true;
    }
  }
  
  /**
   * Create a simulated walking animation
   */
  simulateWalkingAnimation(): void {
    if (!this.model || !this.leftArm || !this.rightArm) return;
    
    // Create an animation mixer if not already created
    if (!this.animationMixer) {
      this.animationMixer = new THREE.AnimationMixer(this.model);
      this.clock = new THREE.Clock();
    }
    
    // Get the index of the arms in the model's children array
    let leftArmIndex = -1;
    let rightArmIndex = -1;
    
    for (let i = 0; i < this.model.children.length; i++) {
      if (this.model.children[i] === this.leftArm) {
        leftArmIndex = i;
      } else if (this.model.children[i] === this.rightArm) {
        rightArmIndex = i;
      }
    }
    
    if (leftArmIndex === -1 || rightArmIndex === -1) {
      console.error("Could not find arm indices in model children");
      return;
    }
    
    // Create different animations based on zombie type
    let tracks = [];
    let animationDuration = 1.0; // Default duration
    
    switch(this.type) {
      case ZombieType.WALKER:
        // Standard slow, shuffling zombie
        tracks = this.createWalkerAnimation(leftArmIndex, rightArmIndex);
        animationDuration = 1.2; // Slower animation
        break;
        
      case ZombieType.RUNNER:
        // Fast, frantic movement
        tracks = this.createRunnerAnimation(leftArmIndex, rightArmIndex);
        animationDuration = 0.6; // Faster animation
        break;
        
      case ZombieType.TANK:
        // Heavy, lumbering movement
        tracks = this.createTankAnimation(leftArmIndex, rightArmIndex);
        animationDuration = 1.5; // Very slow animation
        break;
    }
    
    // Create animation clip
    const walkClip = new THREE.AnimationClip(
      'walk',                  // Name
      animationDuration,       // Duration in seconds
      tracks
    );
    
    // Create animation action from the clip
    this.walkAnimation = this.animationMixer.clipAction(walkClip);
    // Get speed value from the zombie properties
    const animSpeed = this.properties.moveSpeed ? this.properties.moveSpeed * 1.2 : 2.0;
    this.walkAnimation.setEffectiveTimeScale(animSpeed);
    this.walkAnimation.setLoop(THREE.LoopRepeat, Infinity);
    
    // Create a simple attack animation
    this.createAttackAnimation();
  }
  
  /**
   * Create animation tracks for Walker zombies (standard shambling)
   */
  createWalkerAnimation(leftArmIndex: number, rightArmIndex: number): THREE.KeyframeTrack[] {
    // Create KeyframeTracks for arm rotation - slow swinging
    const leftArmRotationKF = new THREE.KeyframeTrack(
      `.children[${leftArmIndex}].rotation[z]`, // Target property
      [0, 0.5, 1],            // Times
      [-0.3, 0.1, -0.3]       // Values - smaller range of motion
    );
    
    const rightArmRotationKF = new THREE.KeyframeTrack(
      `.children[${rightArmIndex}].rotation[z]`, // Target property
      [0, 0.5, 1],             // Times
      [0.3, -0.1, 0.3]         // Values - smaller range of motion
    );
    
    // Slight side-to-side swaying
    const bodyRotationKF = new THREE.KeyframeTrack(
      '.rotation[z]',          // Target property
      [0, 0.25, 0.5, 0.75, 1], // Times
      [0, 0.08, 0, -0.08, 0]   // Values - more pronounced swaying
    );
    
    // Shuffling motion with slight up/down movement
    const bodyPositionKF = new THREE.KeyframeTrack(
      '.position[y]',          // Target property
      [0, 0.5, 1],             // Times
      [
        this.model.position.y,
        this.model.position.y + 0.02,
        this.model.position.y
      ]                         // Values - slight up and down
    );
    
    // Forward lean
    const bodyTiltKF = new THREE.KeyframeTrack(
      '.rotation[x]',          // Target property
      [0],                     // Times
      [0.15]                   // Values - more forward tilt
    );
    
    return [leftArmRotationKF, rightArmRotationKF, bodyRotationKF, bodyPositionKF, bodyTiltKF];
  }
  
  /**
   * Create animation tracks for Runner zombies (fast and aggressive)
   */
  createRunnerAnimation(leftArmIndex: number, rightArmIndex: number): THREE.KeyframeTrack[] {
    // Create KeyframeTracks for arm rotation - rapid movement
    const leftArmRotationKF = new THREE.KeyframeTrack(
      `.children[${leftArmIndex}].rotation[z]`, // Target property
      [0, 0.25, 0.5, 0.75, 1],   // More keyframes for smoother animation
      [-0.4, 0, 0.4, 0, -0.4]    // Values - wider range of motion
    );
    
    const rightArmRotationKF = new THREE.KeyframeTrack(
      `.children[${rightArmIndex}].rotation[z]`, // Target property
      [0, 0.25, 0.5, 0.75, 1],   // More keyframes
      [0.4, 0, -0.4, 0, 0.4]     // Values - opposite of left arm
    );
    
    // Add forward/backward arm movement
    const leftArmForwardKF = new THREE.KeyframeTrack(
      `.children[${leftArmIndex}].rotation[x]`, // Target property
      [0, 0.25, 0.5, 0.75, 1],   // Times
      [0.3, 0, -0.3, 0, 0.3]     // Values - swinging arms forward/back
    );
    
    const rightArmForwardKF = new THREE.KeyframeTrack(
      `.children[${rightArmIndex}].rotation[x]`, // Target property
      [0, 0.25, 0.5, 0.75, 1],   // Times
      [-0.3, 0, 0.3, 0, -0.3]    // Values - opposite of left arm
    );
    
    // Frantic body bobbing
    const bodyRotationKF = new THREE.KeyframeTrack(
      '.rotation[z]',            // Target property
      [0, 0.125, 0.25, 0.375, 0.5, 0.625, 0.75, 0.875, 1], // More keyframes
      [0, 0.03, 0, -0.03, 0, 0.03, 0, -0.03, 0]  // Values - rapid small movements
    );
    
    // Bouncy up/down motion
    const bodyPositionKF = new THREE.KeyframeTrack(
      '.position[y]',            // Target property
      [0, 0.25, 0.5, 0.75, 1],   // Times
      [
        this.model.position.y,
        this.model.position.y + 0.06,
        this.model.position.y,
        this.model.position.y + 0.06,
        this.model.position.y
      ]                           // Values - more pronounced up and down
    );
    
    // Slight forward lean
    const bodyTiltKF = new THREE.KeyframeTrack(
      '.rotation[x]',            // Target property
      [0],                       // Times
      [0.2]                      // Values - leaning forward
    );
    
    return [
      leftArmRotationKF, 
      rightArmRotationKF, 
      leftArmForwardKF,
      rightArmForwardKF,
      bodyRotationKF, 
      bodyPositionKF, 
      bodyTiltKF
    ];
  }
  
  /**
   * Create animation tracks for Tank zombies (slow and powerful)
   */
  createTankAnimation(leftArmIndex: number, rightArmIndex: number): THREE.KeyframeTrack[] {
    // Create KeyframeTracks for arm rotation - heavy motion
    const leftArmRotationKF = new THREE.KeyframeTrack(
      `.children[${leftArmIndex}].rotation[z]`, // Target property
      [0, 0.5, 1],            // Times
      [-0.2, 0.1, -0.2]       // Values - limited range of motion due to bulk
    );
    
    const rightArmRotationKF = new THREE.KeyframeTrack(
      `.children[${rightArmIndex}].rotation[z]`, // Target property
      [0, 0.5, 1],             // Times
      [0.2, -0.1, 0.2]         // Values - limited range
    );
    
    // Heavy swaying motion
    const bodyRotationKF = new THREE.KeyframeTrack(
      '.rotation[z]',          // Target property
      [0, 0.25, 0.5, 0.75, 1], // Times
      [0, 0.12, 0, -0.12, 0]   // Values - heavy side-to-side motion
    );
    
    // Heavy stomping motion - pronounced up/down movement
    const bodyPositionKF = new THREE.KeyframeTrack(
      '.position[y]',          // Target property
      [0, 0.25, 0.5, 0.75, 1],  // Times
      [
        this.model.position.y,
        this.model.position.y - 0.04, // Down on left foot
        this.model.position.y,
        this.model.position.y - 0.04, // Down on right foot
        this.model.position.y
      ]                         // Values - stomping motion (down instead of up)
    );
    
    // Forward weight
    const bodyTiltKF = new THREE.KeyframeTrack(
      '.rotation[x]',          // Target property
      [0],                     // Times
      [0.1]                    // Values - slight forward tilt
    );
    
    return [leftArmRotationKF, rightArmRotationKF, bodyRotationKF, bodyPositionKF, bodyTiltKF];
  }
  
  /**
   * Create a simple attack animation
   */
  createAttackAnimation(): void {
    if (!this.model || !this.animationMixer || !this.leftArm || !this.rightArm) return;
    
    // Get the index of the arms in the model's children array
    let leftArmIndex = -1;
    let rightArmIndex = -1;
    
    for (let i = 0; i < this.model.children.length; i++) {
      if (this.model.children[i] === this.leftArm) {
        leftArmIndex = i;
      } else if (this.model.children[i] === this.rightArm) {
        rightArmIndex = i;
      }
    }
    
    if (leftArmIndex === -1 || rightArmIndex === -1) {
      console.error("Could not find arm indices in model children");
      return;
    }
    
    // Create KeyframeTracks for arms reaching forward during attack
    const leftArmAttackRotationKF = new THREE.KeyframeTrack(
      `.children[${leftArmIndex}].rotation[x]`,    // Target property - rotate forward
      [0, 0.2, 0.8, 1],          // Times
      [0, 1.2, 1.2, 0]           // Values - reach forward then back
    );
    
    const rightArmAttackRotationKF = new THREE.KeyframeTrack(
      `.children[${rightArmIndex}].rotation[x]`,   // Target property
      [0, 0.2, 0.8, 1],          // Times
      [0, 1.2, 1.2, 0]           // Values - reach forward then back
    );
    
    // Body lunges forward during attack
    const bodyLungeKF = new THREE.KeyframeTrack(
      '.rotation[x]',            // Target property
      [0, 0.3, 0.8, 1],          // Times
      [0.1, 0.3, 0.3, 0.1]       // Values - lean forward more, then back
    );
    
    // Combine all tracks into a clip
    const attackClip = new THREE.AnimationClip(
      'attack',                  // Name
      0.5,                       // Duration in seconds - faster than walk
      [leftArmAttackRotationKF, rightArmAttackRotationKF, bodyLungeKF]
    );
    
    // Create animation action from the clip
    this.attackAnimation = this.animationMixer.clipAction(attackClip);
    this.attackAnimation.setLoop(THREE.LoopOnce, 1);
    this.attackAnimation.clampWhenFinished = true;
  }
  
  /**
   * Update the zombie state, position, and animations
   */
  update(deltaTime: number): void {
    if (this.isDead) return;
    
    // Ensure deltaTime has a consistent value regardless of environment
    // This prevents zombies from moving at different speeds in local vs deployed
    // Using a fixed deltaTime gives consistent movement
    deltaTime = 0.016; // Fixed at 16ms (60fps)
    
    // Only log occasionally to reduce spam
    const shouldLog = Math.random() < 0.05; // 5% chance to log
    
    if (shouldLog) {
      console.log(`Updating zombie: Type=${this.type}, DeltaTime=${deltaTime}`);
    }
    
    // Update animation mixer if it exists
    if (this.animationMixer && this.clock) {
      this.animationMixer.update(this.clock.getDelta());
    }
    
    const distanceToPlayer = this.position.distanceTo(this.player.position);
    
    if (shouldLog) {
      console.log(`Distance to player: ${distanceToPlayer.toFixed(2)}, Detection range: ${this.properties.detectionRange}`);
    }
    
    // Force detection for testing
    const forceDetection = true;
    
    // If player is within detection range
    if (forceDetection || distanceToPlayer <= this.properties.detectionRange) {
      if (shouldLog) {
        console.log("Player detected, moving towards them");
      }
      
      // Move towards player if not dead
      this.moveTowardsPlayer(deltaTime);
      
      // Start walking animation if not already walking
      if (!this.isWalking && this.walkAnimation) {
        this.walkAnimation.play();
        this.isWalking = true;
        console.log("Started walking animation");
      }
      
      // Update rotation to face player
      this.facePlayer();
      
      // If within attack range
      if (distanceToPlayer <= this.properties.attackRange) {
        // Attack if cooldown is over
        if (Date.now() - this.lastAttackTime > this.properties.attackCooldown) {
          this.attackPlayer();
        }
      }
    }
    
    // Update the model position and rotation to match the zombie's logical position
    this.updateModelPosition();
  }
  
  /**
   * Update the 3D model position and rotation to match the zombie's logical position
   */
  updateModelPosition(): void {
    if (!this.model) return;
    
    // Ensure model follows the zombie's position
    this.model.position.copy(this.position);
    
    // Update rotation to match the zombie's direction
    this.model.rotation.y = this.rotation.y;
    
    // Debug position check (log on rare occasions)
    if (Math.random() < 0.01) {
      console.log(`Zombie model position: (${this.model.position.x.toFixed(2)}, ${this.model.position.z.toFixed(2)})`);
      console.log(`Zombie logical position: (${this.position.x.toFixed(2)}, ${this.position.z.toFixed(2)})`);
    }
  }
  
  /**
   * Make zombie face the player
   */
  facePlayer(): void {
    // Calculate direction to player
    const directionToPlayer = new THREE.Vector3()
      .subVectors(this.player.position, this.position)
      .normalize();
    
    // Calculate rotation angle
    this.rotation.y = Math.atan2(directionToPlayer.x, directionToPlayer.z);
    
    // Update model rotation if exists
    if (this.model) {
      this.model.rotation.y = this.rotation.y;
    }
  }
  
  /**
   * Move zombie towards player
   */
  moveTowardsPlayer(deltaTime: number): void {
    // Calculate distance to player
    const distanceToPlayer = this.position.distanceTo(this.player.position);
    
    // Don't move if already in attack range
    if (distanceToPlayer <= this.properties.attackRange) {
      return;
    }
    
    // Calculate direction to player
    const direction = new THREE.Vector3();
    direction.subVectors(this.player.position, this.position).normalize();
    
    // Only log occasionally to reduce spam
    const shouldLog = Math.random() < 0.05; // 5% chance to log
    
    if (shouldLog) {
      console.log(`Zombie movement: Position=(${this.position.x.toFixed(2)}, ${this.position.z.toFixed(2)}), Direction=(${direction.x.toFixed(2)}, ${direction.z.toFixed(2)})`);
      console.log(`Player position: (${this.player.position.x.toFixed(2)}, ${this.player.position.z.toFixed(2)})`);
      console.log(`DeltaTime: ${deltaTime}, MoveSpeed: ${this.properties.moveSpeed}`);
    }
    
    // Calculate move distance based on speed and time
    const moveDistance = this.properties.moveSpeed * deltaTime;
    
    if (shouldLog) {
      console.log(`Move distance: ${moveDistance}`);
    }
    
    // Use a minimum move distance to ensure zombies always move
    const effectiveMoveDistance = Math.max(moveDistance, 0.01);
    
    // If very close to attack range, slow down to avoid overshooting
    const distanceToAttackRange = distanceToPlayer - this.properties.attackRange;
    const adjustedMoveDistance = distanceToAttackRange < effectiveMoveDistance 
      ? distanceToAttackRange * 0.9 // Move 90% of the remaining distance 
      : effectiveMoveDistance;
    
    // Calculate new potential position
    const newX = this.position.x + direction.x * adjustedMoveDistance;
    const newZ = this.position.z + direction.z * adjustedMoveDistance;
    
    // Create a temporary position to check for collisions
    const newPosition = new THREE.Vector3(newX, this.position.y, newZ);
    
    // Get all zombies from the zombie manager
    const zombieManager = this.scene.getObjectByName('zombieManager') as any;
    const allZombies = zombieManager?.zombies || [];
    
    // Check for collision with other zombies
    const minZombieDistance = 1.5; // Minimum distance between zombies
    
    // Calculate distance to player to adjust spacing based on proximity to player
    // Reuse the existing distanceToPlayer variable
    
    // Adjust minimum distance based on proximity to player (increase spacing further away)
    const adjustedMinDistance = minZombieDistance * (0.8 + Math.min(distanceToPlayer / 30, 1.5));
    
    // Count nearby zombies to detect congestion
    let nearbyZombies = 0;
    let closestZombie = null;
    let closestDistance = Infinity;
    
    // Find zombies that are too close
    for (const otherZombie of allZombies) {
      // Skip this zombie itself
      if (otherZombie === this) continue;
      
      // Calculate distance to the other zombie at the new position
      const distanceToOtherZombie = newPosition.distanceTo(otherZombie.position);
      
      // Count zombies within extended range to detect congestion
      if (distanceToOtherZombie < adjustedMinDistance * 1.5) {
        nearbyZombies++;
      }
      
      // Track the closest zombie
      if (distanceToOtherZombie < closestDistance) {
        closestDistance = distanceToOtherZombie;
        closestZombie = otherZombie;
      }
    }
    
    // High congestion detected - create formation instead of clumping
    if (nearbyZombies > 2 && distanceToPlayer < 10) {
      // Calculate angle to player
      const angleToPlayer = Math.atan2(
        this.player.position.x - this.position.x,
        this.player.position.z - this.position.z
      );
      
      // Add some variation based on zombie's unique properties to create a formation
      const uniqueAngleOffset = (this.health % 100) / 100 * Math.PI; // Unique for each zombie
      
      // Create a circular formation around player
      const formationRadius = Math.max(3.0, distanceToPlayer * 0.7); // Keep some distance
      const formationAngle = angleToPlayer + uniqueAngleOffset;
      
      // Calculate position in the formation
      const formationX = this.player.position.x + Math.sin(formationAngle) * formationRadius;
      const formationZ = this.player.position.z + Math.cos(formationAngle) * formationRadius;
      
      // Move towards formation position instead
      const formationDir = new THREE.Vector3(
        formationX - this.position.x,
        0,
        formationZ - this.position.z
      ).normalize();
      
      // Apply reduced speed when in formation mode
      const formationSpeed = adjustedMoveDistance * 0.6;
      newPosition.x = this.position.x + formationDir.x * formationSpeed;
      newPosition.z = this.position.z + formationDir.z * formationSpeed;
    }
    // Regular collision avoidance
    else if (closestZombie && closestDistance < adjustedMinDistance) {
      // Calculate repulsion direction (away from closest zombie)
      const repulsionDir = new THREE.Vector3()
        .subVectors(this.position, closestZombie.position)
        .normalize();
      
      // Apply sideways movement to go around
      // Stronger repulsion when very close
      const repulsionStrength = Math.max(0.5, 1.2 - (closestDistance / adjustedMinDistance));
      direction.x += repulsionDir.x * repulsionStrength;
      direction.z += repulsionDir.z * repulsionStrength;
      
      // Add slight randomization to break symmetry and prevent "stuck" zombies
      direction.x += (Math.random() - 0.5) * 0.3;
      direction.z += (Math.random() - 0.5) * 0.3;
      
      direction.normalize();
      
      // Recalculate position with adjusted direction and reduced speed
      const collisionAdjustedMoveDistance = adjustedMoveDistance * 0.7;
      newPosition.x = this.position.x + direction.x * collisionAdjustedMoveDistance;
      newPosition.z = this.position.z + direction.z * collisionAdjustedMoveDistance;
    }
    
    // Update position
    this.position.x = newPosition.x;
    this.position.z = newPosition.z;
    
    if (shouldLog) {
      console.log(`New position: (${this.position.x.toFixed(2)}, ${this.position.z.toFixed(2)})`);
    }
  }
  
  /**
   * Attack the player
   */
  attackPlayer(): void {
    if (this.isAttacking) return; // Prevent multiple attacks in progress
    
    // Get zombie manager to check for nearby zombies
    const zombieManager = this.scene.getObjectByName('zombieManager') as any;
    
    // Count how many zombies are near the player (within 5 units)
    let nearbyZombiesCount = 0;
    if (zombieManager && zombieManager.zombies) {
      nearbyZombiesCount = zombieManager.zombies.filter((z: Zombie) => {
        if (z.isDead) return false;
        const distToPlayer = z.position.distanceTo(this.player.position);
        return distToPlayer < 5; // 5 units is considered "nearby"
      }).length;
    }
    
    // Base damage from zombie properties
    let adjustedDamage = Math.min(this.properties.damage, 10); // Cap base damage to prevent one-hit kills
    
    // Increase damage based on how many zombies are nearby
    // Each nearby zombie increases damage by 10% up to a maximum of 3x damage
    const multiplier = Math.min(3.0, 1 + (nearbyZombiesCount * 0.1));
    adjustedDamage = Math.ceil(adjustedDamage * multiplier);
    
    console.log(`💥 Attacked player with ${nearbyZombiesCount} nearby zombies for ${adjustedDamage} damage (x${multiplier.toFixed(1)} multiplier)`);
    
    // Apply damage to player
    this.player.takeDamage(adjustedDamage);
    console.log(`Player health now: ${this.player.health}`);
    
    // Reset cooldown
    this.lastAttackTime = Date.now();
    this.isAttacking = true;
    
    // Reset attack flag after animation time
    setTimeout(() => {
      this.isAttacking = false;
    }, 1000); // Longer cooldown between attacks
  }
  
  /**
   * Take damage from player
   * @returns Whether the zombie was killed
   */
  takeDamage(amount: number): boolean {
    console.log(`Zombie taking damage: ${amount}, current health: ${this.health}`);
    
    if (this.isDead) return false;
    
    this.health -= amount;
    
    // Ensure health doesn't go below 0
    if (this.health <= 0) {
      this.health = 0;
      this.die();
      return true;
    }
    
    // Show damage hit effect
    this.showDamageEffect();
    
    return false;
  }
  
  /**
   * Show damage effect on zombie
   */
  showDamageEffect(): void {
    // Flash zombie red when hit
    this.model.traverse(child => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;
        const originalMaterial = mesh.material as THREE.MeshStandardMaterial;
        const originalColor = originalMaterial.color.clone();
        
        // Flash red
        originalMaterial.color.set(0xff0000);
        
        // Add slight backward movement to simulate impact
        const pushDirection = new THREE.Vector3();
        pushDirection.subVectors(this.position, this.player.position).normalize();
        const pushDistance = 0.3; // How far to push back
        
        const originalPosition = this.model.position.clone();
        const targetPosition = new THREE.Vector3(
          this.model.position.x + pushDirection.x * pushDistance,
          this.model.position.y,
          this.model.position.z + pushDirection.z * pushDistance
        );
        
        // Animate the push back and return
        const duration = 150; // ms
        const startTime = Date.now();
        
        const animatePush = () => {
          const elapsed = Date.now() - startTime;
          const progress = Math.min(elapsed / duration, 1);
          
          if (progress < 0.5) {
            // First half: push back
            const pushProgress = progress * 2; // Scale to 0-1 range
            this.model.position.lerpVectors(originalPosition, targetPosition, pushProgress);
          } else {
            // Second half: return to original position
            const returnProgress = (progress - 0.5) * 2; // Scale to 0-1 range
            this.model.position.lerpVectors(targetPosition, originalPosition, returnProgress);
          }
          
          if (progress < 1) {
            requestAnimationFrame(animatePush);
          }
        };
        
        animatePush();
        
        // Restore original color
        setTimeout(() => {
          originalMaterial.color.copy(originalColor);
        }, 100);
      }
    });
    
    // Create blood particle effect
    this.createBloodEffect();
  }
  
  /**
   * Creates blood particle effect at impact point
   */
  createBloodEffect(): void {
    const particleCount = 15;
    const particles = new THREE.Group();
    
    // Calculate impact point (roughly where the zombie was hit)
    const impactPoint = new THREE.Vector3(
      this.position.x, 
      this.position.y + 1.2, // Roughly torso height
      this.position.z
    );
    
    // Direction vector from player to zombie (for particle direction)
    const direction = new THREE.Vector3();
    direction.subVectors(this.position, this.player.position).normalize();
    
    // Create individual particles
    for (let i = 0; i < particleCount; i++) {
      // Create a small red sphere
      const geometry = new THREE.SphereGeometry(0.03 + Math.random() * 0.03, 4, 4);
      const material = new THREE.MeshBasicMaterial({ 
        color: new THREE.Color(0x8a0303), 
        transparent: true,
        opacity: 0.9
      });
      
      const particle = new THREE.Mesh(geometry, material);
      
      // Set initial position at impact point
      particle.position.copy(impactPoint);
      
      // Add slight random offset
      particle.position.x += (Math.random() - 0.5) * 0.1;
      particle.position.y += (Math.random() - 0.5) * 0.1;
      particle.position.z += (Math.random() - 0.5) * 0.1;
      
      // Store velocity for this particle
      const velocity = new THREE.Vector3(
        direction.x + (Math.random() - 0.5) * 0.5,
        Math.random() * 0.5, // Up
        direction.z + (Math.random() - 0.5) * 0.5
      ).normalize().multiplyScalar(0.05 + Math.random() * 0.05);
      
      // Store velocity and lifetime in userData
      particle.userData = {
        velocity,
        lifetime: 500 + Math.random() * 500, // Between 500-1000ms lifetime
        createdAt: Date.now()
      };
      
      particles.add(particle);
    }
    
    // Add particles to scene
    this.scene.add(particles);
    
    // Animate particles
    const animateParticles = () => {
      let particlesRemaining = false;
      
      // Update each particle
      particles.children.forEach((particle) => {
        if (particle instanceof THREE.Mesh) {
          const userData = particle.userData;
          const age = Date.now() - userData.createdAt;
          
          if (age < userData.lifetime) {
            particlesRemaining = true;
            
            // Move particle according to velocity
            particle.position.add(userData.velocity);
            
            // Add gravity effect
            userData.velocity.y -= 0.002;
            
            // Fade out as it gets older
            const fadeProgress = age / userData.lifetime;
            (particle.material as THREE.MeshBasicMaterial).opacity = 0.9 * (1 - fadeProgress);
          } else {
            // Make invisible when lifetime is over
            (particle.material as THREE.MeshBasicMaterial).opacity = 0;
          }
        }
      });
      
      if (particlesRemaining) {
        requestAnimationFrame(animateParticles);
      } else {
        // Remove particles from scene when all are finished
        setTimeout(() => {
          this.scene.remove(particles);
          particles.children.forEach(particle => {
            (particle as THREE.Mesh).geometry.dispose();
            ((particle as THREE.Mesh).material as THREE.Material).dispose();
          });
        }, 100);
      }
    };
    
    animateParticles();
  }
  
  /**
   * Handle death with animation
   */
  die(): void {
    this.isDead = true;
    
    // Stop walking animation
    if (this.walkAnimation) {
      this.walkAnimation.stop();
    }
    
    // Simple death animation - fall over
    this.simulateDeathAnimation();
    
    // Trigger zombie killed event with score
    document.dispatchEvent(new CustomEvent('zombie-killed', {
      detail: {
        position: this.position.clone(),
        scoreValue: this.properties.scoreValue
      }
    }));
    
    // Remove zombie after animation completes
    setTimeout(() => {
      this.scene.remove(this.model);
    }, 2000);
  }
  
  /**
   * Simulate a death animation
   */
  simulateDeathAnimation(): void {
    if (!this.model) return;
    
    // Tilt the model to simulate falling
    const fallDuration = 500; // ms
    const startTime = Date.now();
    const originalRotationX = this.model.rotation.x;
    
    // Animate the fall
    const fallInterval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / fallDuration, 1);
      
      // Rotate to simulate falling
      this.model.rotation.x = originalRotationX + (Math.PI / 2) * progress;
      
      // Lower the position to simulate falling to the ground
      this.model.position.y = Math.max(0, this.model.position.y - 0.03);
      
      if (progress >= 1) {
        clearInterval(fallInterval);
      }
    }, 16);
  }
  
  /**
   * Cleanup resources
   */
  dispose(): void {
    if (this.model && this.scene) {
      this.scene.remove(this.model);
    }
  }
} 