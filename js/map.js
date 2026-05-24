/**
 * Dino Dash 3D - Procedural Map & Parallax Background Builder
 */

import * as THREE from 'three';
import { CONSTANTS } from './constants.js';

class MapBuilder {
  constructor() {
    this.scene = null;
    this.groundTexture = null;
    this.groundMaterial = null;
    this.groundMesh = null;
    
    // Ambient / Sun lights
    this.ambientLight = null;
    this.dirLight = null;
    this.pointLight = null;

    // Environmental lists to scroll
    this.scrollers = {
      layerFar: [],     // Mountains
      layerMid: [],     // Forest Silhouettes
      layerNear: [],    // Foreground Rocks & Bushes
      clouds: [],       // Floating clouds
      decorations: []   // Palm trees, ferns alongside the runway (Z = -4.0 and Z = +4.0)
    };

    // Level-specific assets
    this.lavaFissures = [];
    this.starField = null;
    this.moonMesh = null;
    this.sunMesh = null;
  }

  init(scene) {
    this.scene = scene;

    // Create a procedural seamless earthen ground texture
    this.groundTexture = this.generateProceduralGroundTexture();
    this.groundTexture.wrapS = THREE.RepeatWrapping;
    this.groundTexture.wrapT = THREE.RepeatWrapping;
    this.groundTexture.repeat.set(10, 1);

    // Ground plane construction
    const groundGeo = new THREE.PlaneGeometry(100, 15);
    this.groundMaterial = new THREE.MeshStandardMaterial({
      map: this.groundTexture,
      roughness: 0.8,
      metalness: 0.1,
    });
    this.groundMesh = new THREE.Mesh(groundGeo, this.groundMaterial);
    this.groundMesh.rotation.x = -Math.PI / 2;
    this.groundMesh.position.set(0, 0, 0);
    this.groundMesh.receiveShadow = true;
    this.scene.add(this.groundMesh);

    // Initialise Sky background
    this.buildSky();

    // Initialise Ambient & Directional Lighting
    this.buildLighting();

    // Spawn first round of static procedural decorations alongside the paths
    this.spawnInitialDecorations();

    // Build Parallax Far, Mid layers
    this.buildParallaxLayers();
  }

  /**
   * Generates a high-quality dirt texture using HTML Canvas with noise and cracks
   */
  generateProceduralGroundTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');

    // Base dirt gradient
    const grad = ctx.createLinearGradient(0, 0, 0, 512);
    grad.addColorStop(0, '#5c4033'); // Dark earthen
    grad.addColorStop(1, '#8b5a2b'); // Lighter sandy brown
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 512, 512);

    // Add rocky/earthen noise
    for (let i = 0; i < 5000; i++) {
      const x = Math.random() * 512;
      const y = Math.random() * 512;
      const r = Math.random() * 1.5;
      ctx.fillStyle = Math.random() > 0.5 ? 'rgba(0,0,0,0.15)' : 'rgba(255,255,255,0.08)';
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }

    // Add jagged cracks/fissures
    ctx.strokeStyle = 'rgba(40, 20, 10, 0.5)';
    ctx.lineWidth = 2;
    for (let j = 0; j < 6; j++) {
      ctx.beginPath();
      let cx = Math.random() * 512;
      let cy = 0;
      ctx.moveTo(cx, cy);
      while (cy < 512) {
        cx += (Math.random() - 0.5) * 45;
        cy += Math.random() * 80;
        ctx.lineTo(cx, cy);
      }
      ctx.stroke();
    }

    const texture = new THREE.CanvasTexture(canvas);
    return texture;
  }

  buildSky() {
    // We represent the Sun as a golden glowing sphere
    const sunGeo = new THREE.SphereGeometry(1.5, 16, 16);
    const sunMat = new THREE.MeshBasicMaterial({ color: 0xffea88 });
    this.sunMesh = new THREE.Mesh(sunGeo, sunMat);
    this.sunMesh.position.set(20, 8, -12);
    this.scene.add(this.sunMesh);

    // Spawn 8 procedural clouds
    for (let i = 0; i < 8; i++) {
      this.spawnCloud(Math.random() * 60 - 20);
    }
  }

  buildLighting() {
    this.ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
    this.scene.add(this.ambientLight);

    this.dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
    this.dirLight.position.set(15, 25, 10);
    this.dirLight.castShadow = true;
    this.dirLight.shadow.mapSize.width = 1024;
    this.dirLight.shadow.mapSize.height = 1024;
    this.dirLight.shadow.camera.near = 0.5;
    this.dirLight.shadow.camera.far = 50;
    this.dirLight.shadow.camera.left = -20;
    this.dirLight.shadow.camera.right = 20;
    this.dirLight.shadow.camera.top = 20;
    this.dirLight.shadow.camera.bottom = -10;
    this.dirLight.shadow.bias = -0.0005;
    this.scene.add(this.dirLight);

    // Drama spotlight for player accents
    this.pointLight = new THREE.PointLight(0xffaa44, 2, 8);
    this.pointLight.position.set(-5, 2.5, 0);
    this.scene.add(this.pointLight);
  }

  spawnCloud(startX) {
    const cloudGroup = new THREE.Group();
    
    const mat = new THREE.MeshLambertMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.85,
    });

    // Merge multiple spheres to create a fluffy low-poly cloud
    const parts = [
      { r: 1.0, x: 0, y: 0, z: 0 },
      { r: 0.7, x: -0.9, y: -0.2, z: 0 },
      { r: 0.8, x: 0.9, y: -0.1, z: 0 },
      { r: 0.6, x: 0.3, y: 0.5, z: 0 }
    ];

    parts.forEach(p => {
      const geo = new THREE.SphereGeometry(p.r, 8, 8);
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(p.x, p.y, p.z);
      cloudGroup.add(mesh);
    });

    const cloudY = 10 + Math.random() * 4;
    const cloudZ = -15 - Math.random() * 5;
    cloudGroup.position.set(startX, cloudY, cloudZ);

    // Subtle shadow projection on the ground plane (Y = 0.01) that follows the cloud movement
    const shadowGeo = new THREE.PlaneGeometry(4.5, 2.0);
    const shadowMat = new THREE.MeshBasicMaterial({
      color: 0x000000,
      transparent: true,
      opacity: 0.12,
      depthWrite: false,
    });
    const shadowMesh = new THREE.Mesh(shadowGeo, shadowMat);
    shadowMesh.rotation.x = -Math.PI / 2;

    // Align shadow on the ground plane (e.g. in visible range Z = -4.5 to -6.0)
    const targetZ = -5.0 + (Math.random() - 0.5) * 1.5;
    shadowMesh.position.set(0, -cloudY + 0.015, targetZ - cloudZ);
    cloudGroup.add(shadowMesh);

    cloudGroup.userData = { 
      speed: 0.2 + Math.random() * 0.4,
      shadowMesh: shadowMesh,
      targetZ: targetZ
    };
    
    this.scene.add(cloudGroup);
    this.scrollers.clouds.push(cloudGroup);
  }

  buildParallaxLayers() {
    // Far Mountains
    for (let i = 0; i < 4; i++) {
      this.spawnMountain(i * 25 - 20);
    }

    // Mid Forest Silhouettes
    for (let i = 0; i < 12; i++) {
      this.spawnForestSilhouette(i * 8 - 20);
    }
  }

  spawnMountain(startX) {
    const geo = new THREE.ConeGeometry(8 + Math.random() * 6, 12 + Math.random() * 8, 4);
    const mat = new THREE.MeshPhongMaterial({
      color: 0xc87d55, // Matches Level 1
      flatShading: true
    });
    const mountain = new THREE.Mesh(geo, mat);
    // Position far back, offset Y so base is hidden
    mountain.position.set(startX, 2, -18);
    mountain.rotation.y = Math.random() * Math.PI;
    this.scene.add(mountain);
    this.scrollers.layerFar.push(mountain);
  }

  spawnForestSilhouette(startX) {
    // Low-poly pines back there
    const group = new THREE.Group();
    const trunkGeo = new THREE.CylinderGeometry(0.15, 0.2, 1.2, 5);
    const trunkMat = new THREE.MeshLambertMaterial({ color: 0x4a2e1b });
    const trunk = new THREE.Mesh(trunkGeo, trunkMat);
    trunk.position.y = 0.6;
    group.add(trunk);

    const leavesGeo = new THREE.ConeGeometry(0.9, 2.5, 5);
    const leavesMat = new THREE.MeshLambertMaterial({ color: 0x224422 });
    const leaves = new THREE.Mesh(leavesGeo, leavesMat);
    leaves.position.y = 2.0;
    group.add(leaves);

    group.position.set(startX, 0, -10 - Math.random() * 3);
    group.scale.set(0.8 + Math.random() * 0.5, 0.8 + Math.random() * 0.5, 0.8 + Math.random() * 0.5);
    
    this.scene.add(group);
    this.scrollers.layerMid.push(group);
  }

  spawnInitialDecorations() {
    // Fill the path side tracks with trees, ferns & boulders from X = -30 to +40
    for (let x = -30; x < 40; x += 3.5) {
      if (Math.random() > 0.4) {
        // Decide left or right of the runner lane
        const z = Math.random() > 0.5 ? -3.5 - Math.random() * 2 : 3.5 + Math.random() * 2;
        this.spawnDecoration(x, z);
      }
    }
  }

  spawnDecoration(x, z) {
    const type = Math.random();
    let meshGroup = new THREE.Group();

    if (type < 0.4) {
      // 1. Primitive low-poly Palm Tree
      const trunkColor = 0x5c4033;
      const trunkGeo = new THREE.CylinderGeometry(0.15, 0.25, 3.5, 6);
      const trunkMat = new THREE.MeshLambertMaterial({ color: trunkColor });
      const trunk = new THREE.Mesh(trunkGeo, trunkMat);
      trunk.position.y = 1.75;
      trunk.rotation.z = (Math.random() - 0.5) * 0.15; // slightly crooked trunk
      meshGroup.add(trunk);

      // Fronds
      const leavesMat = new THREE.MeshPhongMaterial({ color: 0x2e5c1e, flatShading: true });
      for (let i = 0; i < 5; i++) {
        const frondGeo = new THREE.ConeGeometry(0.7, 1.8, 4);
        const frond = new THREE.Mesh(frondGeo, leavesMat);
        frond.position.set(0, 3.4, 0);
        frond.rotation.z = 1.0;
        frond.rotation.y = (i * Math.PI * 2) / 5;
        meshGroup.add(frond);
      }
      meshGroup.userData = { type: 'palm' };
    } 
    else if (type < 0.8) {
      // 2. Prehistoric Rock Cluster
      const rockMat = new THREE.MeshPhongMaterial({ color: 0x808080, flatShading: true });
      const count = 1 + Math.floor(Math.random() * 3);
      for (let i = 0; i < count; i++) {
        const size = 0.5 + Math.random() * 0.9;
        const geo = new THREE.DodecahedronGeometry(size, 0);
        const rock = new THREE.Mesh(geo, rockMat);
        rock.position.set(
          (Math.random() - 0.5) * 0.8,
          size * 0.4,
          (Math.random() - 0.5) * 0.8
        );
        rock.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, 0);
        meshGroup.add(rock);
      }
      meshGroup.userData = { type: 'rock' };
    } 
    else {
      // 3. Prehistoric Fern
      const fernMat = new THREE.MeshPhongMaterial({ color: 0x1e4620, flatShading: true });
      for (let i = 0; i < 6; i++) {
        const bladeGeo = new THREE.ConeGeometry(0.2, 1.4, 3);
        const blade = new THREE.Mesh(bladeGeo, fernMat);
        blade.position.set(0, 0.6, 0);
        blade.rotation.x = 0.5;
        blade.rotation.y = (i * Math.PI * 2) / 6;
        meshGroup.add(blade);
      }
      meshGroup.userData = { type: 'fern' };
    }

    meshGroup.position.set(x, 0, z);
    const scale = 0.8 + Math.random() * 0.5;
    meshGroup.scale.set(scale, scale, scale);

    // Enable shadows on decorations
    meshGroup.castShadow = true;
    meshGroup.receiveShadow = true;
    meshGroup.traverse(child => {
      if (child.isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });

    this.scene.add(meshGroup);
    this.scrollers.decorations.push(meshGroup);
  }

  update(deltaTime, currentSpeed, currentLevel) {
    const config = CONSTANTS.LEVELS[currentLevel];

    // 1. Infinite Ground scrolling texture offset
    if (this.groundTexture) {
      const factor = currentLevel === 1 ? 50.0 : currentLevel === 2 ? 40.0 : 30.0;
      this.groundTexture.offset.x += (currentSpeed * deltaTime) / factor;
    }

    // 2. Parallax Layer Scrolling
    const farSpeed = currentSpeed * 0.05;
    const midSpeed = currentSpeed * 0.15;
    
    // Near, Mid, Far environmental elements scrolling left
    this.scrollList(this.scrollers.layerFar, farSpeed * deltaTime, -36, 64, (x) => {
      // Re-randomise height on reincarnation
      this.scrollers.layerFar.forEach(m => {
        if (m.position.x < -36) {
          m.position.x = 64;
          m.scale.y = 0.7 + Math.random() * 0.6;
        }
      });
    });

    this.scrollList(this.scrollers.layerMid, midSpeed * deltaTime, -30, 50);

    // Clouds drifting
    this.scrollers.clouds.forEach(cloud => {
      cloud.position.x -= cloud.userData.speed * deltaTime * 12.0;
      if (cloud.position.x < -30) {
        cloud.position.x = 40;
        const newY = 10 + Math.random() * 4;
        cloud.position.y = newY;
        
        // Readjust shadow position relative to cloud so it stays at world Y = 0.015
        if (cloud.userData && cloud.userData.shadowMesh) {
          cloud.userData.shadowMesh.position.y = -newY + 0.015;
        }
      }
    });

    // 3. Side decorations
    this.scrollList(this.scrollers.decorations, currentSpeed * deltaTime, -22, 38, (item) => {
      // Reincarnate off-screen right
      item.position.x = 38 + Math.random() * 4;
      item.position.z = Math.random() > 0.5 ? -3.5 - Math.random() * 2 : 3.5 + Math.random() * 2;
      item.scale.setScalar(0.7 + Math.random() * 0.6);
    });

    // 4. Double check Level-specific updates
    if (currentLevel === 2) {
      // Pulsing lava fissure lines or point light
      if (this.pointLight) {
        this.pointLight.intensity = 2.0 + Math.sin(this.scene.userData.time * 6.0) * 0.8;
      }
    }
  }

  scrollList(list, speed, threshold, recycleX, onRecycle = null) {
    for (let i = list.length - 1; i >= 0; i--) {
      const obj = list[i];
      obj.position.x -= speed;
      if (obj.position.x < threshold) {
        if (onRecycle) {
          onRecycle(obj);
        } else {
          obj.position.x = recycleX + (Math.random() * 3);
        }
      }
    }
  }

  /**
   * Refreshes environment parameters instantly to align with Level Theme
   */
  setTheme(levelNo) {
    const config = CONSTANTS.LEVELS[levelNo];
    console.log(`Setting up Map Theme for Level ${levelNo}: ${config.name}`);

    // Update Ground Material Color and Sky characteristics
    if (this.groundMaterial) {
      this.groundMaterial.color.setHex(config.groundColor);
      this.groundMaterial.needsUpdate = true;
    }

    // Set Scene Fog
    this.scene.fog = new THREE.FogExp2(config.fogColor, config.fogDensity);
    this.scene.background = new THREE.Color(config.skyColor);

    // Update cloud shadow material opacity dynamically based on level ambient/light
    let shadowOpacity = 0.12;
    if (levelNo === 2) {
      shadowOpacity = 0.07;
    } else if (levelNo === 3) {
      shadowOpacity = 0.03;
    }
    this.scrollers.clouds.forEach(cloud => {
      if (cloud.userData && cloud.userData.shadowMesh) {
        cloud.userData.shadowMesh.material.opacity = shadowOpacity;
        cloud.userData.shadowMesh.material.needsUpdate = true;
      }
    });

    // Set Ambient Light intensity
    if (this.ambientLight) {
      this.ambientLight.color.setHex(config.ambientLight);
      this.ambientLight.intensity = levelNo === 3 ? 0.25 : 0.45;
    }

    if (this.pointLight) {
      if (levelNo === 2) {
        this.pointLight.color.setHex(0xff3300); // Lava Orange
        this.pointLight.intensity = 2.5;
      } else if (levelNo === 3) {
        this.pointLight.color.setHex(0x3366ff); // Eerie Blue Moonlight
        this.pointLight.intensity = 1.8;
      } else {
        this.pointLight.color.setHex(0xffaa44); // Soft Sun Gold
        this.pointLight.intensity = 0.8;
      }
    }

    // Adapt Mountain Colors of parallax layer
    const mountainColors = { 1: 0xc87d55, 2: 0x22110c, 3: 0x111122 };
    this.scrollers.layerFar.forEach(m => {
      m.material.color.setHex(mountainColors[levelNo]);
      m.material.needsUpdate = true;
    });

    // Handle Star Field (Level 3 exclusive)
    if (levelNo === 3) {
      this.addStarField();
    } else {
      this.removeStarField();
    }

    // Sun vs Moon visuals
    if (levelNo === 3) {
      this.sunMesh.visible = false;
      this.addMoon();
    } else {
      this.sunMesh.visible = true;
      if (this.sunMesh) {
        this.sunMesh.material.color.setHex(levelNo === 2 ? 0xff3300 : 0xffea88);
      }
      this.removeMoon();
    }
  }

  addStarField() {
    if (this.starField) return;

    const starsGeo = new THREE.BufferGeometry();
    const count = 200;
    const positions = new Float32Array(count * 3);

    for (let i = 0; i < count * 3; i += 3) {
      positions[i] = Math.random() * 80 - 40;     // X (-40 to 40)
      positions[i + 1] = Math.random() * 15 + 8;  // Y (8 to 23 high)
      positions[i + 2] = -12 - Math.random() * 8; // Z far back
    }

    starsGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    
    // Delicate circular dots
    const starTexture = this.generateStarSprite();
    const starsMat = new THREE.PointsMaterial({
      color: 0xffffff,
      size: 0.25,
      map: starTexture,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });

    this.starField = new THREE.Points(starsGeo, starsMat);
    this.scene.add(this.starField);
  }

  generateStarSprite() {
    const canvas = document.createElement('canvas');
    canvas.width = 16;
    canvas.height = 16;
    const ctx = canvas.getContext('2d');
    const grad = ctx.createRadialGradient(8, 8, 0, 8, 8, 8);
    grad.addColorStop(0, 'rgba(255,255,255,1)');
    grad.addColorStop(0.5, 'rgba(255,255,255,0.4)');
    grad.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 16, 16);
    return new THREE.CanvasTexture(canvas);
  }

  removeStarField() {
    if (this.starField) {
      this.scene.remove(this.starField);
      this.starField.geometry.dispose();
      this.starField.material.dispose();
      this.starField = null;
    }
  }

  addMoon() {
    if (this.moonMesh) return;

    const moonGeo = new THREE.SphereGeometry(2.0, 32, 32);
    // Silver-white glow, emissive moonlight
    const moonMat = new THREE.MeshBasicMaterial({
      color: 0xddeeff,
    });
    this.moonMesh = new THREE.Mesh(moonGeo, moonMat);
    this.moonMesh.position.set(18, 11, -14);
    
    // Tiny moon ring halo
    const haloGeo = new THREE.RingGeometry(2.1, 2.5, 32);
    const haloMat = new THREE.MeshBasicMaterial({
      color: 0x88bbff,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.3
    });
    const halo = new THREE.Mesh(haloGeo, haloMat);
    halo.lookAt(new THREE.Vector3(0, 5, 8)); // Angle at camera
    this.moonMesh.add(halo);

    this.scene.add(this.moonMesh);
  }

  removeMoon() {
    if (this.moonMesh) {
      this.scene.remove(this.moonMesh);
      this.moonMesh = null;
    }
  }

  destroy() {
    // Clear lists
    this.scrollers.layerFar = [];
    this.scrollers.layerMid = [];
    this.scrollers.layerNear = [];
    this.scrollers.clouds = [];
    this.scrollers.decorations = [];
    this.removeStarField();
    this.removeMoon();
  }
}

export const mapBuilder = new MapBuilder();
export default mapBuilder;
