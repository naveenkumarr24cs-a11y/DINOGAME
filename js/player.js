/**
 * Dino Dash 3D - Player Controller
 */

import * as THREE from 'three';
import { CONSTANTS } from './constants.js';
import { assetLoader } from './loader.js';
import { audioManager } from './audio.js';

export class Player {
  constructor(dinoId, scene) {
    this.dinoId = dinoId;
    this.scene = scene;
    
    // Retrieve dino configuration
    this.config = CONSTANTS.DINOS.find(d => d.id === dinoId);
    
    // Create base 3D assets & animations
    const { model, animations } = assetLoader.cloneModel(dinoId, 'dinos');
    this.model = model;
    this.animations = animations;

    // Center model and orient it running forward (to the right, along +X)
    this.model.position.set(CONSTANTS.PLAYER_X, CONSTANTS.LANE_Y, 0.0);
    if (this.dinoId === 'DINO_5') {
      this.model.rotation.y = -Math.PI / 2; // Dino 5 (Stealth) faces right under this rotation
    } else {
      this.model.rotation.y = Math.PI / 2; // Dino 1, 2, 3 face right under this rotation
    }
    
    // Enable shadows
    this.model.castShadow = true;
    this.model.receiveShadow = true;
    this.model.traverse(node => {
      if (node.isMesh) {
        node.castShadow = true;
        node.receiveShadow = true;
        // Keep initial scale/materials safe
        if (node.material) {
          node.material.roughness = 0.6;
        }
      }
    });

    this.scene.add(this.model);

    // Physics parameters
    this.y = CONSTANTS.LANE_Y;
    this.velocityY = 0.0;
    this.isGrounded = true;
    this.jumpCount = 0;
    this.isDucking = false;

    // State mechanics
    this.lives = 3;
    this.isInvincible = false;
    this.invincibilityTimer = 0;
    this.flickerTimer = 0;

    // Animation Mixer setup
    this.mixer = new THREE.AnimationMixer(this.model);
    this.activeAction = null;
    this.actions = {};

    this.initAnimations();
    
    // Collision helpers
    this.collider = new THREE.Box3();
    this.updateCollider();
  }

  initAnimations() {
    if (this.animations.length === 0) return;

    // Cache actions
    this.animations.forEach(clip => {
      this.actions[clip.name] = this.mixer.clipAction(clip);
    });

    // Determine clips
    this.runClip = assetLoader.getBestClip(this.animations, ['run', 'walk', 'run_loop']);
    this.jumpClip = assetLoader.getBestClip(this.animations, ['jump', 'leap', 'air']);
    this.duckClip = assetLoader.getBestClip(this.animations, ['duck', 'crouch', 'slide']);
    this.hitClip = assetLoader.getBestClip(this.animations, ['hit', 'death', 'damage']);

    // Direct override for Dino 5: use "Armature|niet basic" as the main running clip
    if (this.dinoId === 'DINO_5') {
      const nietClip = this.animations.find(c => c.name.toLowerCase().includes('niet')) || this.animations[1];
      if (nietClip) {
        this.runClip = nietClip;
        console.log("DINO_5 assigned running clip:", this.runClip.name);
      }
    }

    // Default running animation playing
    if (this.runClip) {
      this.playAction(this.runClip.name);
    } else if (this.animations.length > 0) {
      this.playAction(this.animations[0].name);
    }
  }

  playAction(clipName, duration = 0.15) {
    const nextAction = this.actions[clipName];
    if (!nextAction) return;

    if (this.activeAction && this.activeAction !== nextAction) {
      nextAction.reset();
      nextAction.play();
      this.activeAction.crossFadeTo(nextAction, duration, true);
    } else {
      nextAction.play();
    }
    this.activeAction = nextAction;
  }

  jump() {
    if (this.isDucking) return; // Prevent jumping while in duck posture

    if (this.isGrounded) {
      // Primary Leap
      this.velocityY = CONSTANTS.JUMP_FORCE;
      this.isGrounded = false;
      this.jumpCount = 1;

      // Audio and dust VFX
      audioManager.playJump();
      this.triggerDustVFX();

      if (this.jumpClip) {
        this.playAction(this.jumpClip.name, 0.1);
      }
    } 
    else if (this.jumpCount === 1) {
      // Double Jump
      this.velocityY = CONSTANTS.DOUBLE_JUMP_FORCE;
      this.jumpCount = 2;

      audioManager.playJump();
      this.triggerDustVFX(15); // larger secondary burst
    }
  }

  duck(shouldDuck) {
    if (this.isDucking === shouldDuck) return;

    this.isDucking = shouldDuck;

    if (shouldDuck) {
      // Scale player visual model Y down instantly 
      this.model.scale.y = CONSTANTS.DUCK_COLLIDER_SCALE;
      
      // If grounded, play ducking sound or play animation
      if (this.isGrounded && this.duckClip) {
        this.playAction(this.duckClip.name, 0.1);
      }
    } else {
      this.model.scale.y = 1.0;
      if (this.isGrounded && this.runClip) {
        this.playAction(this.runClip.name, 0.15);
      }
    }

    this.updateCollider();
  }

  hit() {
    if (this.isInvincible) return;

    this.lives--;
    audioManager.playHit();
    
    // Red death flash / hit vignette effect
    const flashEl = document.getElementById('death-flash');
    if (flashEl) {
      flashEl.classList.remove('flash');
      void flashEl.offsetWidth; // trigger reflow
      flashEl.classList.add('flash');
      setTimeout(() => {
        flashEl.classList.remove('flash');
      }, 700);
    }
    
    // Highlight flash of screen or red burst
    this.isInvincible = true;
    this.invincibilityTimer = CONSTANTS.INVINCIBILITY_DURATION;
    this.flickerTimer = 0;

    // Camera shake trigger parameter can be captured by the main game loop
    this.scene.userData.shakeTimer = 0.3; // 300ms screen shake

    if (this.lives <= 0) {
      if (this.hitClip) {
        this.playAction(this.hitClip.name, 0.05);
      }
    }
  }

  update(deltaTime) {
    // 1. Process physics/gravity
    if (!this.isGrounded) {
      this.velocityY -= CONSTANTS.GRAVITY * deltaTime;
      this.y += this.velocityY * deltaTime;

      // Check ground collision
      if (this.y <= CONSTANTS.LANE_Y) {
        this.y = CONSTANTS.LANE_Y;
        this.velocityY = 0.0;
        this.isGrounded = true;
        this.jumpCount = 0;

        audioManager.playLand();
        this.triggerDustVFX(8); // Puff of dust on landing

        // Restore animation state
        if (this.isDucking) {
          if (this.duckClip) this.playAction(this.duckClip.name, 0.1);
        } else {
          if (this.runClip) this.playAction(this.runClip.name, 0.1);
        }
      }
    }

    // Apply Y position to the 3D model
    this.model.position.y = this.y;

    // 2. Drive skeleton mixer animations
    if (this.mixer) {
      this.mixer.update(deltaTime);
    }

    // 3. Keep invincibility / flash timer running
    if (this.isInvincible) {
      this.invincibilityTimer -= deltaTime * 1000;
      this.flickerTimer += deltaTime * 1000;

      // Flash player model visibility back and forth
      if (this.flickerTimer >= 80) {
        this.model.visible = !this.model.visible;
        this.flickerTimer = 0;
      }

      if (this.invincibilityTimer <= 0) {
        this.isInvincible = false;
        this.model.visible = true; // ensure player is fully visible
      }
    }

    // 4. Recalculate collision box bounding box
    this.updateCollider();
  }

  updateCollider() {
    // Programmatic, robust collision box centered at player position
    const px = CONSTANTS.PLAYER_X;
    const py = this.y;
    const pz = 0.0;

    // Define dimensions based on state
    const width = 0.8;                      // X thickness
    const height = this.isDucking ? 0.8 : 1.6; // Y height
    const depth = 2.0;                      // Z thickness (guarantees overlap)

    // Center the box appropriately (pivot at feet)
    this.collider.min.set(px - width / 2, py, pz - depth / 2);
    this.collider.max.set(px + width / 2, py + height, pz + depth/ 2);
  }

  triggerDustVFX(count = 10) {
    if (!this.scene) return;

    // Burst particles from feet position
    const dustGeo = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    const velocities = [];

    const startX = CONSTANTS.PLAYER_X + 0.5;
    const startY = this.y + 0.1;
    const startZ = 0.0;

    for (let i = 0; i < count; i++) {
      positions[i * 3] = startX;
      positions[i * 3 + 1] = startY;
      positions[i * 3 + 2] = startZ + (Math.random() - 0.5) * 0.8;

      // Shoot up & backward particles
      velocities.push({
        x: -3.0 - Math.random() * 3.0,
        y: 1.0 + Math.random() * 4.0,
        z: (Math.random() - 0.5) * 2.0
      });
    }

    dustGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    const dustMat = new THREE.PointsMaterial({
      color: 0xddccbb,
      size: 0.15,
      transparent: true,
      opacity: 0.8
    });

    const dustPoints = new THREE.Points(dustGeo, dustMat);
    this.scene.add(dustPoints);

    let life = 0.4; // 400ms life
    const animateDust = () => {
      if (life <= 0) {
        this.scene.remove(dustPoints);
        dustGeo.dispose();
        dustMat.dispose();
        return;
      }

      life -= 0.016; // 60 FPS approx
      const posAttr = dustPoints.geometry.attributes.position;
      const array = posAttr.array;

      for (let i = 0; i < count; i++) {
        array[i * 3] += velocities[i].x * 0.016;
        array[i * 3 + 1] += velocities[i].y * 0.016;
        array[i * 3 + 2] += velocities[i].z * 0.016;

        // decelerate gravity logic on dust
        velocities[i].y -= 9.8 * 0.016;
      }
      posAttr.needsUpdate = true;
      dustMat.opacity = Math.max(0, life / 0.4);

      requestAnimationFrame(animateDust);
    };

    animateDust();
  }

  destroy() {
    if (this.model) {
      this.scene.remove(this.model);
    }
  }
}
export default Player;
