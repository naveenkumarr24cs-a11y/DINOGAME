/**
 * Dino Dash 3D - Asset Loader
 */

import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import * as SkeletonUtils from 'three/addons/utils/SkeletonUtils.js';
import { CONSTANTS } from './constants.js';

class Loader {
  constructor() {
    this.gltfLoader = new GLTFLoader();
    this.assets = {
      dinos: {},
      enemies: {}
    };
    this.totalAssets = CONSTANTS.DINOS.length + Object.keys(CONSTANTS.ENEMIES).length;
    this.loadedCount = 0;
    this.onProgressCallback = null;
    this.onCompleteCallback = null;
  }

  onProgress(callback) {
    this.onProgressCallback = callback;
  }

  onComplete(callback) {
    this.onCompleteCallback = callback;
  }

  preload() {
    console.log("Starting preload of", this.totalAssets, "assets...");

    // 1. Preload Player Dinos
    CONSTANTS.DINOS.forEach(dino => {
      this.loadAsset(dino.id, dino.url, 'dinos');
    });

    // 2. Preload Enemies
    Object.values(CONSTANTS.ENEMIES).forEach(enemy => {
      this.loadAsset(enemy.id, enemy.url, 'enemies');
    });
  }

  loadAsset(id, url, category) {
    this.gltfLoader.load(
      url,
      (gltf) => {
        // Store the complete GLTF asset
        this.assets[category][id] = gltf;
        this.loadedCount++;
        
        const percent = Math.min(100, Math.round((this.loadedCount / this.totalAssets) * 100));
        console.log(`Loaded ${id}: ${percent}% (${this.loadedCount}/${this.totalAssets})`);

        if (this.onProgressCallback) {
          this.onProgressCallback(percent, id);
        }

        if (this.loadedCount === this.totalAssets) {
          console.log("All GLB assets preloaded successfully!");
          if (this.onCompleteCallback) {
            this.onCompleteCallback(this.assets);
          }
        }
      },
      undefined,
      (error) => {
        console.error(`Error loading asset [${id}] from [${url}]:`, error);
        // Fallback or skip to avoid blocking the loader
        this.loadedCount++;
        const percent = Math.min(100, Math.round((this.loadedCount / this.totalAssets) * 100));
        if (this.onProgressCallback) this.onProgressCallback(percent, id);
        if (this.loadedCount === this.totalAssets && this.onCompleteCallback) {
          this.onCompleteCallback(this.assets);
        }
      }
    );
  }

  /**
   * Helper to retrieve and clone a loaded model safely (skinned mesh friendly)
   */
  cloneModel(id, category) {
    const sourceGltf = this.assets[category][id];
    if (!sourceGltf) {
      console.warn(`Asset ${id} in ${category} not found. Creating fallback cube.`);
      // Return a basic mesh if asset failed to load
      const geometry = new THREE.BoxGeometry(1.2, 1.2, 1.2);
      const material = new THREE.MeshLambertMaterial({ color: 0xff00ff });
      const mesh = new THREE.Mesh(geometry, material);
      mesh.name = "fallback";
      return { model: mesh, animations: [] };
    }

    // Deep clone skinned meshes using SkeletonUtils to make animations independent
    const clonedScene = SkeletonUtils.clone(sourceGltf.scene);
    
    // Create an outer group to parent and ground the model
    const outerGroup = new THREE.Group();
    outerGroup.name = `${id}_grounded_parent`;
    
    // Propagate shadow settings and ensure textures are correctly assigned and configured
    clonedScene.traverse(node => {
      if (node.isMesh) {
        node.castShadow = true;
        node.receiveShadow = true;
        
        // Handle materials and embedded textures
        if (node.material) {
          const materials = Array.isArray(node.material) ? node.material : [node.material];
          materials.forEach(mat => {
            if (mat.map) {
              // Ensure color space is correct so colors aren't washed out or dark
              if (THREE.SRGBColorSpace) {
                mat.map.colorSpace = THREE.SRGBColorSpace;
              } else if (THREE.sRGBEncoding) {
                mat.map.encoding = THREE.sRGBEncoding;
              }
              
              // Ensure base color is white so the texture map is fully visible/un-tinted
              if (mat.color) {
                mat.color.setHex(0xffffff);
              }
              
              // Ensure the texture is fully visible, not too shiny or reflective/dark
              mat.roughness = 0.75;
              mat.metalness = 0.1;
              
              mat.map.needsUpdate = true;
              mat.needsUpdate = true;
              console.log(`[Loader] Model ${id} mesh "${node.name}" configured with texture map`);
            }
          });
        }
      }
    });
    
    outerGroup.add(clonedScene);

    // Compute bounding box strictly from actual visible Meshes (excluding joint bones, helpers, or cameras)
    clonedScene.updateMatrixWorld(true);
    const box = new THREE.Box3();
    let hasMesh = false;
    
    clonedScene.traverse(node => {
      if (node.isMesh) {
        // Compute bounding box of this specific mesh within the cloned scene hierarchy
        const tempBox = new THREE.Box3().setFromObject(node);
        if (!hasMesh) {
          box.copy(tempBox);
          hasMesh = true;
        } else {
          box.union(tempBox);
        }
      }
    });

    // All enemy and player dino models are already perfectly grounded at local Y = 0.0 inside their GLB files.
    // Subtraction of bounding box minimum shifts the relative skeleton, creating incorrect floating or sinking offsets.
    clonedScene.position.y = 0.0;

    // Center DINO_5 on the X/Z horizontal plane so its visual model meshes align perfectly with standard pivots, paths, and collision boxes
    if (id === 'DINO_5' && hasMesh) {
      const center = new THREE.Vector3();
      box.getCenter(center);
      clonedScene.position.x = -center.x;
      clonedScene.position.z = -center.z;
      console.log(`DINO_5 centered on X/Z axes: shifted position.x by ${clonedScene.position.x}, position.z by ${clonedScene.position.z}`);
    }

    // Return cloned model and original animations (read-only for clips)
    return {
      model: outerGroup,
      animations: sourceGltf.animations || []
    };
  }

  /**
   * Adaptive animation selector
   */
  getBestClip(animations, preferredKeywords = ['walk', 'run', 'idle']) {
    if (!animations || animations.length === 0) return null;
    
    // 1. Try finding in the direct preferred keywords list
    for (const keyword of preferredKeywords) {
      const clip = animations.find(c => c.name.toLowerCase().includes(keyword.toLowerCase()));
      if (clip) return clip;
    }
    
    // 2. Secondary look for active forward locomotions
    const movementKeywords = ['run', 'walk', 'jog', 'sprint', 'dash', 'trot', 'stride', 'move', 'march', 'cycle', 'loop', 'flight', 'fly', 'flap', 'glide', 'wing', 'dive', 'swim'];
    for (const keyword of movementKeywords) {
      const clip = animations.find(c => c.name.toLowerCase().includes(keyword));
      if (clip) return clip;
    }

    // 3. If there are animations but none of them match locomotion keywords, play any non-idle action first if available, otherwise fallback to item 0
    const nonIdle = animations.find(c => !c.name.toLowerCase().includes('idle') && !c.name.toLowerCase().includes('pose'));
    if (nonIdle) return nonIdle;

    return animations[0]; // Fallback to index 0
  }
}

export const assetLoader = new Loader();
export default assetLoader;
