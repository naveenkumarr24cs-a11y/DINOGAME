/**
 * Dino Dash 3D - Constants & Configuration
 */

export const CONSTANTS = {
  // Game Physics & Loop
  GRAVITY: 28.0,          // Units per second squared
  JUMP_FORCE: 12.0,       // Upward velocity
  DOUBLE_JUMP_FORCE: 9.5, // Secondary jump velocity
  DUCK_COLLIDER_SCALE: 0.5,// Size multiplier when ducking
  INVINCIBILITY_DURATION: 1500, // Ms of flashing post-hit

  // Gameplay Settings
  LANE_Y: 0.0,            // Ground level Y position
  PLAYER_X: -5.0,         // Constant X position of the player
  DESPAWN_X: -20.0,       // Off-screen left limit for enemies
  SPAWN_X: 30.0,          // Off-screen right limit for enemies

  // Levels Configuration
  LEVELS: {
    1: {
      name: "PREHISTORIC PLAINS",
      theme: "savanna",
      startSpeed: 8.0,
      maxSpeed: 13.0,
      duration: 45,       // Seconds - shorter and easy progress
      targetScore: 800,
      skyColor: 0xffb366,  // Warm amber
      groundColor: 0xd27d2d, // Dusty orange/sandy brown
      ambientLight: 0xffe6cc,
      fogColor: 0xffd9b3,
      fogDensity: 0.012,
      spawnMinInterval: 3.5, // Farther apart spawns
      spawnMaxInterval: 5.0,
      enemyPool: ["ENEMY_1", "ENEMY_2", "ENEMY_3", "ENEMY_4"]
    },
    2: {
      name: "VOLCANIC BADLANDS",
      theme: "volcanic",
      startSpeed: 14.0,
      maxSpeed: 21.0,
      duration: 75,       // Seconds - moderate duration/progress
      targetScore: 2000,
      skyColor: 0x3d0c02,  // Crimson deep
      groundColor: 0x1f1f1f, // Dark charcoal
      ambientLight: 0xff5500, // Lava glow
      fogColor: 0x4a0e03,  // Red-tinted fog
      fogDensity: 0.035,
      spawnMinInterval: 2.2,
      spawnMaxInterval: 3.5,
      enemyPool: ["ENEMY_1", "ENEMY_2", "ENEMY_3", "ENEMY_4", "ENEMY_5", "ENEMY_6"]
    },
    3: {
      name: "ANCIENT RUINS AT NIGHT",
      theme: "ruins",
      startSpeed: 22.0,
      maxSpeed: 35.0,
      duration: 120,      // Seconds - long and very challenging
      targetScore: 4000,
      skyColor: 0x05051a,  // Midnight blue
      groundColor: 0x3a4f41, // Mossy dark slate
      ambientLight: 0x6688aa, // Moonlight blue
      fogColor: 0x0a0a20,  // Deep dark blue fog
      fogDensity: 0.05,
      spawnMinInterval: 1.2,
      spawnMaxInterval: 2.0,
      enemyPool: ["ENEMY_1", "ENEMY_2", "ENEMY_3", "ENEMY_4", "ENEMY_5", "ENEMY_6"]
    }
  },

  // Player Characters
  DINOS: [
    {
      id: "DINO_2",
      name: "DINO 1 — TANK",
      description: "Heavily armored, steadfast but heavy.",
      url: "https://cdn.jsdelivr.net/gh/naveenkumarr24cs-a11y/DINO-ASSETS@main/DINO%202.glb",
      stats: { speed: 5, jump: 4, armor: 8 },
      color: 0xcc3333 // Red
    },
    {
      id: "DINO_3",
      name: "DINO 2 — JUMPER",
      description: "Loves to soar high above obstacles.",
      url: "https://cdn.jsdelivr.net/gh/naveenkumarr24cs-a11y/DINO-ASSETS@main/DINO%203.glb",
      stats: { speed: 6, jump: 9, armor: 5 },
      color: 0x3333cc // Blue
    },
    {
      id: "DINO_5",
      name: "DINO 3 — STEALTH",
      description: "Shadow runner, almost invisible in high speeds.",
      url: "https://cdn.jsdelivr.net/gh/naveenkumarr24cs-a11y/DINO-ASSETS@main/dino5.glb",
      stats: { speed: 9, jump: 6, armor: 3 },
      color: 0xcc33cc // Purple
    }
  ],

  // Enemies Specifications
  ENEMIES: {
    ENEMY_1: {
      id: "ENEMY_1",
      name: "Swifter",
      url: "https://cdn.jsdelivr.net/gh/naveenkumarr24cs-a11y/DINO-ASSETS@main/enemy%20dino%201.glb",
      type: "ground",
      scale: 1.0,
      yPos: 0.0,
      speedModifier: 1.0
    },
    ENEMY_2: {
      id: "ENEMY_2",
      name: "Stalker",
      url: "https://cdn.jsdelivr.net/gh/naveenkumarr24cs-a11y/DINO-ASSETS@main/enemy%20dino%202.glb",
      type: "ground",
      scale: 1.1,
      yPos: 0.0,
      speedModifier: 0.9
    },
    ENEMY_3: {
      id: "ENEMY_3",
      name: "Lava Raptor",
      url: "https://cdn.jsdelivr.net/gh/naveenkumarr24cs-a11y/DINO-ASSETS@main/enemy3.glb",
      type: "ground",
      scale: 1.2,
      yPos: 0.0,
      speedModifier: 0.8 // slower but bulky
    },
    ENEMY_4: {
      id: "ENEMY_4",
      name: "Pterodactyl",
      url: "https://cdn.jsdelivr.net/gh/naveenkumarr24cs-a11y/DINO-ASSETS@main/enemy4.glb",
      type: "flying",
      scale: 0.9,
      yPos: 1.8, // flying Y
      speedModifier: 1.1
    },
    ENEMY_5: {
      id: "ENEMY_5",
      name: "Apex Goliath",
      url: "https://cdn.jsdelivr.net/gh/naveenkumarr24cs-a11y/DINO-ASSETS@main/ememy5.glb",
      type: "boss",
      scale: 1.8,
      yPos: 0.0,
      speedModifier: 1.2
    },
    ENEMY_6: {
      id: "ENEMY_6",
      name: "Night Terror",
      url: "https://cdn.jsdelivr.net/gh/naveenkumarr24cs-a11y/DINO-ASSETS@main/enemy6.glb",
      type: "diving",
      scale: 1.5,
      yPos: 4.0, // starts high
      speedModifier: 1.3
    }
  }
};
