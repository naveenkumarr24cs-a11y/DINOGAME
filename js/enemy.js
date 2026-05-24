/**
 * Dino Dash 3D - Enemies Object Pool & Spawner
 */

import * as THREE from 'three';
import { CONSTANTS } from './constants.js';
import { assetLoader } from './loader.js';

class EnemyInstance {
  constructor(enemyId, scene) {
    this.enemyId = enemyId;
    this.scene = scene;

    this.config = CONSTANTS.ENEMIES[enemyId];
    this.active = false;

    // Instantiate 3D Model
    const { model, animations } = assetLoader.cloneModel(enemyId, 'enemies');
    this.model = model;
    this.animations = animations;

    this.model.visible = false;
    this.model.rotation.y = Math.PI / 2; // Face towards the running player (face -X)
    
    // Shadow maps
    this.model.castShadow = true;
    this.model.receiveShadow = true;
    this.model.traverse(node => {
      if (node.isMesh) {
        node.castShadow = true;
        node.receiveShadow = true;
      }
    });

    this.scene.add(this.model);

    // Initial position parameters
    this.x = CONSTANTS.SPAWN_X;
    this.y = this.config.yPos;
    this.z = 0.0;

    // All enemy models are perfectly grounded at Y = 0.0 by the assetLoader's cloneModel method,
    // which simplifies our calculations because this.y represents the bottom plane index of the model.

    // Mixer
    this.mixer = new THREE.AnimationMixer(this.model);
    this.initAnimations();

    // Flight variables
    this.sineOffset = Math.random() * Math.PI * 2;
    this.diveProgress = 0.0;

    // Hitbox
    this.collider = new THREE.Box3();
  }

  initAnimations() {
    if (this.animations.length === 0) return;
    
    // Choose walking or running animal clip
    const runClip = assetLoader.getBestClip(this.animations, ['run', 'walk', 'fly', 'flight', 'flap', 'glide', 'dive', 'move', 'wing']);
    if (runClip) {
      const action = this.mixer.clipAction(runClip);
      action.play();
    } else {
      // Fallback
      this.mixer.clipAction(this.animations[0]).play();
    }
  }

  spawn(startX = CONSTANTS.SPAWN_X) {
    this.active = true;
    this.x = startX;
    this.diveProgress = 0.0;
    this.sineOffset = Math.random() * Math.PI * 2;

    // Specific scale adjustments
    let actualScale = this.config.scale * (0.9 + Math.random() * 0.2); // slight variance
    this.model.scale.setScalar(actualScale);

    this.y = this.config.yPos;
    this.model.position.set(this.x, this.y, this.z);
    this.model.visible = true;

    this.updateCollider();
  }

  despawn() {
    this.active = false;
    this.model.visible = false;
  }

  update(deltaTime, gameSpeed) {
    if (!this.active) return;

    // 1. Move left on X based on running speed
    const moveSpeed = gameSpeed * this.config.speedModifier;
    this.x -= moveSpeed * deltaTime;

    // 2. Adjust Y depending on movement category
    if (this.config.type === 'flying') {
      // Fly with altitude oscillation nicely centered around its configured yPos
      const baseHeight = this.config.yPos !== undefined ? this.config.yPos : 1.8;
      const amplitude = 0.45; // Smooth altitude oscillation amplitude
      this.y = baseHeight + Math.sin(this.x * 0.45 + this.sineOffset) * amplitude;
    } 
    else if (this.config.type === 'diving') {
      // Starts high at SPAWN_X with its configured yPos (4.0), swoops down and lands on PLANE/LANE_Y near the player, then runs along the lane
      const startX = CONSTANTS.SPAWN_X;
      const targetX = CONSTANTS.PLAYER_X;
      const startY = this.config.yPos !== undefined ? this.config.yPos : 4.0;
      
      if (this.x > targetX) {
        // High to Low curve
        const t = Math.max(0, Math.min(1, (startX - this.x) / (startX - targetX))); // clamp safely between 0 and 1
        // Smooth logarithmic or polynomial swoop down to ground lane Y position
        this.y = THREE.MathUtils.lerp(startY, CONSTANTS.LANE_Y, Math.pow(t, 2));
      } else {
        // Flat ground run after diving
        this.y = CONSTANTS.LANE_Y;
      }
    } 
    else {
      // Standard Ground runner (ground & boss)
      // Always perfectly aligned at the ground plane
      this.y = CONSTANTS.LANE_Y;
    }

    this.model.position.set(this.x, this.y, this.z);

    // 3. Drive skeletal clips
    if (this.mixer) {
      // Sync animation playback speed dynamically with actual game progress speed
      const baseSpeed = 10.0;
      this.mixer.timeScale = Math.max(0.5, Math.min(2.5, gameSpeed / baseSpeed));
      this.mixer.update(deltaTime);
    }

    // 4. Update collision boundaries
    this.updateCollider();

    // Despawn checks
    if (this.x < CONSTANTS.DESPAWN_X) {
      this.despawn();
    }
  }

  updateCollider() {
    // Programmatic, robust collision box centered at enemy position
    const ex = this.x;
    const ey = this.y;
    const ez = 0.0;

    // Define base dimensions depending on enemy type
    let width = 1.0;
    let height = 1.0;
    let depth = 2.0;

    if (this.config.type === 'boss') {
      width = 2.4;
      height = 2.2;
      depth = 3.0;
    } else if (this.config.type === 'flying') {
      width = 1.1;
      height = 0.8;
      depth = 2.0;
    } else if (this.config.type === 'diving') {
      width = 1.2;
      height = 1.0;
      depth = 2.0;
    }

    // Multiply by current visual model scale for correct sizing
    const scaleFactor = (this.model && this.model.scale) ? this.model.scale.x : this.config.scale;
    width *= scaleFactor;
    height *= scaleFactor;

    // All cloned models are perfectly auto-grounded by the asset loader (bottom of mesh is aligned at parent 0,0,0)
    // so every enemy occupies vertical space from world Y coordinate 'ey' upwards. All colliders use bottom-anchoring.
    this.collider.min.set(ex - width / 2, ey, ez - depth / 2);
    this.collider.max.set(ex + width / 2, ey + height, ez + depth / 2);
  }

  destroy() {
    this.scene.remove(this.model);
  }
}

class EnemyManager {
  constructor() {
    this.scene = null;
    this.pool = [];
    this.activeList = [];
    this.spawnTimer = 0.0;
    this.nextSpawnInterval = 3.0;
  }

  init(scene) {
    this.scene = scene;
    this.pool = [];
    this.activeList = [];
    this.spawnTimer = 0.0;
    this.nextSpawnInterval = 2.5;

    // Instantiate pooling slots beforehand to avoid runtime allocation lags (10 slots)
    // Distribute among the 6 enemies configurations
    const enemyKeys = Object.keys(CONSTANTS.ENEMIES);
    for (let i = 0; i < 15; i++) {
      const enemyId = enemyKeys[i % enemyKeys.length];
      const instance = new EnemyInstance(enemyId, this.scene);
      this.pool.push(instance);
    }
  }

  spawnSingle(enemyId) {
    // Traverse pool for an available matching slot
    let item = this.pool.find(e => !e.active && e.enemyId === enemyId);
    if (!item) {
      // Dynamic allocation of extra pool item if heavily constrained
      item = new EnemyInstance(enemyId, this.scene);
      this.pool.push(item);
    }

    item.spawn();
    this.activeList.push(item);
    return item;
  }

  update(deltaTime, gameSpeed, currentLevel) {
    const config = CONSTANTS.LEVELS[currentLevel];

    // 1. Update active runners
    for (let i = this.activeList.length - 1; i >= 0; i--) {
      const enemy = this.activeList[i];
      enemy.update(deltaTime, gameSpeed);

      if (!enemy.active) {
        this.activeList.splice(i, 1);
      }
    }

    // 2. Spawning Scheduler
    this.spawnTimer += deltaTime;
    if (this.spawnTimer >= this.nextSpawnInterval) {
      this.spawnTimer = 0.0;
      
      // Determine what random enemy to pull based on Level Pool
      const pool = config.enemyPool;
      const index = Math.floor(Math.random() * pool.length);
      const enemyId = pool[index];

      // Handle boss-tier pre-warning roar and lights dim
      const selectedDef = CONSTANTS.ENEMIES[enemyId];
      if (selectedDef.type === 'boss') {
        this.triggerBossAlert();
        // Delay actual boss placement slightly so you hear the warning first!
        setTimeout(() => {
          this.spawnSingle(enemyId);
        }, 1500);
      } else {
        this.spawnSingle(enemyId);
      }

      // Calculate next spawn interval
      this.nextSpawnInterval = config.spawnMinInterval + Math.random() * (config.spawnMaxInterval - config.spawnMinInterval);
    }
  }

  triggerBossAlert() {
    // Shake screen + Play Rumble SFX + Trigger CSS alert
    import('./audio.js').then(m => {
      m.audioManager.playBossWarning();
    });

    if (this.scene) {
      this.scene.userData.shakeTimer = 1.0; // long rumble shake
    }

    // Dispatch DOM event for HUD to display ALERT! HTML
    const event = new CustomEvent('boss_incoming');
    window.dispatchEvent(event);
  }

  clearAll() {
    this.activeList.forEach(e => e.despawn());
    this.activeList = [];
    this.spawnTimer = 0.0;
  }

  destroy() {
    this.pool.forEach(e => e.destroy());
    this.pool = [];
    this.activeList = [];
  }
}

export const enemyManager = new EnemyManager();
export default enemyManager;
