/*
Week 5 — Example 5: Side-Scroller Platformer with JSON Levels + Modular Camera

Course: GBDA302 | Instructors: Dr. Karen Cochrane & David Han
Date: Feb. 12, 2026

Move: WASD/Arrows | Jump: Space

Learning goals:
- Build a side-scrolling platformer using modular game systems
- Load complete level definitions from external JSON (LevelLoader + levels.json)
- Separate responsibilities across classes (Player, Platform, Camera, World)
- Implement gravity, jumping, and collision with platforms
- Use a dedicated Camera2D class for smooth horizontal tracking
- Support multiple levels and easy tuning through data files
- Explore scalable project architecture for larger games
*/

const VIEW_W = 800;
const VIEW_H = 480;

let allLevelsData;
let levelIndex = 0;

let level;
let player;
let cam;
// --- auto-pan / pressure camera (Geometry Dash style) ---
let autoPanStarted = false;
let autoPanX = 0;

// speed values are in px/second (not px/frame)
let autoPanSpeed = 0;
let autoPanBaseSpeed = 70; // starting speed (px/sec)
let autoPanMaxSpeed = 320; // cap speed (px/sec)
let autoPanAccelPerSec = 22; // speed increase each second (px/sec^2)
let autoPanSpeedLerp = 0.08; // smoothness of speed changes (0..1)

let autoPanElapsedSec = 0; // how long auto-pan has been active
let borderLoseMargin = 6;

function preload() {
  allLevelsData = loadJSON("levels.json"); // levels.json beside index.html [web:122]
}

function setup() {
  createCanvas(VIEW_W, VIEW_H);
  textFont("sans-serif");
  textSize(14);

  cam = new Camera2D(width, height);
  loadLevel(levelIndex);
}

function loadLevel(i) {
  level = LevelLoader.fromLevelsJson(allLevelsData, i);

  player = new BlobPlayer();
  player.spawnFromLevel(level);

  cam.x = player.x - width / 2;
  cam.y = 0;
  cam.clampToWorld(level.w, level.h);
  // reset auto-pan state
  autoPanStarted = false;
  autoPanX = cam.x;

  autoPanSpeed = 0;
  autoPanElapsedSec = 0;
}

function playerIsTryingToMove() {
  return (
    keyIsDown(65) ||
    keyIsDown(LEFT_ARROW) ||
    keyIsDown(68) ||
    keyIsDown(RIGHT_ARROW)
  );
}

function updateAutoPan() {
  // Start when the player first presses left/right
  if (!autoPanStarted && playerIsTryingToMove()) {
    autoPanStarted = true;
    autoPanSpeed = autoPanBaseSpeed;
    autoPanElapsedSec = 0;
  }

  if (!autoPanStarted) return;

  // p5 deltaTime is milliseconds since last frame
  const dt = min(deltaTime / 1000, 0.05); // clamp to avoid huge jumps on lag spikes
  autoPanElapsedSec += dt;

  // Target speed increases with TIME (not player progress)
  const targetSpeed = min(
    autoPanMaxSpeed,
    autoPanBaseSpeed + autoPanAccelPerSec * autoPanElapsedSec,
  );

  // Smoothly ease current speed toward target speed
  autoPanSpeed = lerp(autoPanSpeed, targetSpeed, autoPanSpeedLerp);

  // Move auto-pan in world space (speed is px/sec, so multiply by dt)
  autoPanX += autoPanSpeed * dt;
}

function draw() {
  // --- game state ---
  player.update(level);

  // Fall death → respawn
  if (player.y - player.r > level.deathY) {
    loadLevel(levelIndex);
    return;
  }

  // --- view state (data-driven smoothing + auto-pan pressure) ---
  updateAutoPan();
  // normal follow camera target
  cam.followSideScrollerX(player.x, level.camLerp);
  // auto-pan pushes camera to the right; camera uses whichever is farther right
  cam.x = max(cam.x, autoPanX);
  cam.y = 0;
  cam.clampToWorld(level.w, level.h);

  // --- draw ---
  cam.begin();
  level.drawWorld();
  player.draw(level.theme.blob);
  cam.end();

  // Lose if the camera catches the player at the left edge
  const playerScreenX = player.x - cam.x;
  if (autoPanStarted && playerScreenX - player.r <= borderLoseMargin) {
    loadLevel(levelIndex);
    return;
  }
  // HUD
  fill(0);
  noStroke();
  text(level.name + " (Example 5)", 10, 18);
  text("A/D or ←/→ move • Space/W/↑ jump • Fall = respawn", 10, 36);
  text("camLerp(JSON): " + level.camLerp + "  world.w: " + level.w, 10, 54);
  text("cam: " + cam.x + ", " + cam.y, 10, 90);
  const p0 = level.platforms[0];
  text(`p0: x=${p0.x} y=${p0.y} w=${p0.w} h=${p0.h}`, 10, 108);

  text(
    "platforms: " +
      level.platforms.length +
      " start: " +
      level.start.x +
      "," +
      level.start.y,
    10,
    72,
  );
}

function keyPressed() {
  if (key === " " || key === "W" || key === "w" || keyCode === UP_ARROW) {
    player.tryJump();
  }
  if (key === "r" || key === "R") loadLevel(levelIndex);
}
