import {
  Graphics,
  Text,
  ParticleContainer,
  Container,
  Application,
  Sprite,
} from 'pixi.js';

// Globals
const screenWidth = 1440;
const screenHeight = 900;
const motionSpeed = 5.0;
const player1Bullets: {
  x: number;
  y: number;
  orientation: number;
  sprite: Sprite;
}[] = [];
const slopeLength = 20; // in pixels
let cannonOrientation = 1; // can be 1 or -1 depending if there is a flip
let ShiftRightCanFire = true;
let elapsed = 0.0;

// Floating point versions of the player coordinates, to handle cos and sin
let player1x = 500;
let player1y = screenHeight / 2.0;
const worldMaxX = 10;
const worldMaxY = (1.0 * worldMaxX * screenHeight) / screenWidth;
const deltat = 0.1;

// The actual DE
function A(x: number, y: number) {
  return 2 * x * y - Math.sin(x);
}
function B(x: number, y: number) {
  return x ** 2 - Math.cos(y);
}
function V({ x, y }: { x: number; y: number }) {
  let norm = Math.sqrt(A(x, y) ** 2 + B(x, y) ** 2);
  return new Vec(-B(x, y) / norm, A(x, y) / norm);
}
function angleV(pixelX: number, pixelY: number, orientation: number) {
  let worldPos = pToW(pixelX, pixelY);
  let myV = V(worldPos);
  return Math.atan2(orientation * myV.y, orientation * myV.x); // watch out - y is first parameter, x is second
}

// Utility functions and classes
// Helping class for 2d vectors
class Vec {
  x: number;
  y: number;
  constructor(x: number, y: number) {
    this.x = x;
    this.y = y;
  }

  plus(other: Vec) {
    return new Vec(this.x + other.x, this.y + other.y);
  }

  times(factor: number) {
    return new Vec(this.x * factor, this.y * factor);
  }
}

interface keyPressedInterface {
  [keyName: string]: boolean;
}

// Track which keys are currently down
function trackKeys() {
  // down is an object looking like {"ArrowLeft": true, "ArrowRight": false} etc
  let down: keyPressedInterface = {};
  const keysToTrack = [
    'ArrowLeft',
    'ArrowRight',
    'ArrowUp',
    'ArrowDown',
    'Space',
    'ShiftRight',
    'ShiftRightHasJustBeenPressed',
  ];

  function track(event: KeyboardEvent) {
    if (keysToTrack.includes(event.code)) {
      down[event.code] = event.type == 'keydown';
      event.preventDefault();
    }
  }
  window.addEventListener('keydown', track);
  window.addEventListener('keyup', track);
  return down;
}

const keysDown = trackKeys();

const app = new Application({
  view: document.getElementById('pixi-canvas') as HTMLCanvasElement,
  resolution: window.devicePixelRatio || 1,
  autoDensity: true,
  backgroundColor: 0x000000,
  width: screenWidth,
  height: screenHeight,
});

// Add slope graphics
let axesGraphics = drawAxes();
app.stage.addChild(axesGraphics);
let slopeGraphics = drawSlopeField();
app.stage.addChild(slopeGraphics);

// Add player 1
let player1 = new Container();
let player1Tank = Sprite.from('tank body.png');
player1.addChild(player1Tank);
let player1Cannon = Sprite.from('tank shooter.png');
player1Cannon.position = { x: 40, y: 40 };
player1Cannon.pivot = { x: 19, y: 63 };
player1Tank.addChild(player1Cannon);
let player1FirePoint = new Sprite();
player1Cannon.addChild(player1FirePoint);
player1FirePoint.position.x = 19;
player1FirePoint.position.y = 0;

player1.position.x = Math.round(player1x);
player1.position.y = Math.round(player1y);
app.stage.addChild(player1);
//updatePlayer1CannonRotation();

// Bullets
let bulletCircle = new Graphics();
bulletCircle.lineStyle(3, 0xffffff);
bulletCircle.drawCircle(100, 250, 5);
let bulletTexture = app.renderer.generateTexture(bulletCircle);
let player1BulletsContainer = new ParticleContainer();
app.stage.addChild(player1BulletsContainer);

// Debugging
// Add text display for debugging
let textDisplay = new Text('', { fill: 0xffffff });
textDisplay.x = 20;
textDisplay.y = 20;
app.stage.addChild(textDisplay);
app.stage.interactive = true;
app.stage.hitArea = app.screen;
app.stage.addEventListener('pointermove', (e) => {
  textDisplay.text = '(x,y) = (' + e.global.x + ', ' + e.global.y + ')';
});

app.ticker.add(player1Update);
app.ticker.add(player1BulletsUpdate);
// app.ticker.add(textUpdate)
//
// function textUpdate(delta) {
//   let world = pToW(player1FirePoint.getGlobalPosition().x, player1FirePoint.getGlobalPosition().y)
//   textDisplay.text = "(FirePointX, FirePointY) = " + "(" + world.x + ", " + world.y + ")"
// }

function player1Update(delta: number) {
  elapsed += delta;
  if (elapsed < 20) {
    // Just make sure the cannon is facing the right way initially
    updatePlayer1CannonRotation();
  }
  if (keysDown.ArrowLeft) {
    player1.position.x -= motionSpeed;
    updatePlayer1CannonRotation();
  }
  if (keysDown.ArrowRight) {
    player1.position.x += motionSpeed;
    updatePlayer1CannonRotation();
  }
  if (keysDown.ArrowUp) {
    player1.position.y -= motionSpeed;
    updatePlayer1CannonRotation();
  }
  if (keysDown.ArrowDown) {
    player1.position.y += motionSpeed;
    updatePlayer1CannonRotation();
  }
  if (keysDown.Space) {
    let firedx = player1FirePoint.getGlobalPosition().x;
    let firedy = player1FirePoint.getGlobalPosition().y;
    let bulletSprite = new Sprite(bulletTexture);
    bulletSprite.anchor.set(0.5, 0.5);
    bulletSprite.position.set(firedx, firedy);
    player1BulletsContainer.addChild(bulletSprite);
    player1Bullets.push({
      x: player1FirePoint.getGlobalPosition().x,
      y: player1FirePoint.getGlobalPosition().y,
      orientation: cannonOrientation,
      sprite: bulletSprite,
    });
  }
  if (!keysDown.ShiftRight) {
    ShiftRightCanFire = true;
  } else if (ShiftRightCanFire) {
    ShiftRightCanFire = false;
    if (cannonOrientation == -1) {
      cannonOrientation = 1;
      player1Cannon.rotation += Math.PI;
    } else {
      cannonOrientation = -1;
      player1Cannon.rotation += Math.PI;
    }
    updatePlayer1CannonRotation();
  }
}

function updatePlayer1CannonRotation() {
  let pixelPos = player1FirePoint.getGlobalPosition();
  player1Cannon.rotation =
    Math.PI / 2 - angleV(pixelPos.x, pixelPos.y, cannonOrientation);
}

function player1BulletsUpdate(_delta: number) {
  player1Bullets.forEach((bullet, i) => {
    if (
      bullet.x < 0 ||
      bullet.x > screenWidth ||
      bullet.y < 0 ||
      bullet.y > screenHeight
    ) {
      bullet.sprite.destroy();
      player1Bullets.splice(i, 1);
    } else {
      let myNewPoint = rkNextPoint(bullet.x, bullet.y, bullet.orientation);
      bullet.x = myNewPoint.x;
      bullet.y = myNewPoint.y;
      bullet.sprite.x = bullet.x;
      bullet.sprite.y = bullet.y;
    }
  });
}

function rkNextPoint(pixelX: number, pixelY: number, orientation: number) {
  const p1 = pToW(pixelX, pixelY);
  const V1 = V(p1).times(orientation);
  const dr1 = V1.times(deltat / 2.0);
  const p2 = p1.plus(dr1);
  const V2 = V(p2).times(orientation);
  const dr2 = V2.times(deltat / 2.0);
  const p3 = p1.plus(dr2);
  const V3 = V(p3).times(orientation);
  const dr3 = V3.times(deltat);
  const p4 = p1.plus(dr3);
  const V4 = V(p4).times(orientation);
  const step1 = V1.times(1 / 6);
  const step2 = V2.times(1 / 3);
  const step3 = V3.times(1 / 3);
  const step4 = V4.times(1 / 6);
  var step = step1.plus(step2.plus(step3.plus(step4)));
  step = step.times(deltat);
  const nextWorldP = p1.plus(step);
  return wToP(nextWorldP.x, nextWorldP.y);
}

function wToP(worldX: number, worldY: number) {
  return {
    x: screenWidth / 2 + (worldX * screenWidth) / (2 * worldMaxX),
    y: screenHeight / 2 - (worldY * screenHeight) / (2 * worldMaxY),
  };
}

function pToW(pixelX: number, pixelY: number) {
  return new Vec(
    (pixelX - screenWidth / 2.0) * ((2 * worldMaxX) / screenWidth),
    -(pixelY - screenHeight / 2.0) * ((2 * worldMaxY) / screenHeight)
  );
}

function drawAxes() {
  let axesGraphics = new Graphics();
  axesGraphics.lineStyle(3, 0xffffff);
  let leftP = wToP(-worldMaxX, 0);
  let rightP = wToP(worldMaxX, 0);
  let bottomP = wToP(0, -worldMaxY);
  let topP = wToP(0, worldMaxY);
  axesGraphics.moveTo(leftP.x, leftP.y);
  axesGraphics.lineTo(rightP.x, rightP.y);
  axesGraphics.moveTo(bottomP.x, bottomP.y);
  axesGraphics.lineTo(topP.x, topP.y);
  return axesGraphics;
}

function drawSlopeField() {
  var x = 0;
  var y = 0;

  let slopeGraphics = new Graphics();
  slopeGraphics.lineStyle(3, 0x11aaff);

  while (y <= screenHeight) {
    while (x <= screenWidth) {
      let myV = {
        x: (V(pToW(x, y)).x * slopeLength) / 2.0,
        y: (V(pToW(x, y)).y * slopeLength) / 2.0,
      };
      slopeGraphics.moveTo(x - myV.x, y + myV.y);
      slopeGraphics.lineTo(x + myV.x, y - myV.y);
      x += 2 * slopeLength;
    }
    x = 0;
    y += 2 * slopeLength;
  }
  return slopeGraphics;
}
