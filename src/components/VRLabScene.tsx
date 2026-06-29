import * as THREE from 'three';
import type { ExperimentStationData } from './VRLabScene';

export interface VRLabRoomRefs {
  group: THREE.Group;
  interactiveObjects: THREE.Object3D[];
  stationLabels: THREE.Sprite[];
}

// ─── Materials ───────────────────────────────────────────────────────────────

const GLASS_MAT = new THREE.MeshPhysicalMaterial({
  color: 0xe8f4ff,
  transparent: true,
  opacity: 0.18,
  roughness: 0.02,
  metalness: 0,
  transmission: 0.95,
  thickness: 0.3,
  clearcoat: 1.0,
  clearcoatRoughness: 0.1,
});

const WOOD_MAT = new THREE.MeshStandardMaterial({
  color: 0x5d4037,
  roughness: 0.85,
  metalness: 0.05,
});

const METAL_MAT = new THREE.MeshStandardMaterial({
  color: 0x455a64,
  roughness: 0.4,
  metalness: 0.7,
});

const FLOOR_MAT = new THREE.MeshStandardMaterial({
  color: 0x1a2535,
  roughness: 0.9,
  metalness: 0.1,
});

const WALL_MAT = new THREE.MeshStandardMaterial({
  color: 0x1e2a3a,
  roughness: 0.95,
  side: THREE.DoubleSide,
});

const CABINET_MAT = new THREE.MeshStandardMaterial({
  color: 0x263238,
  roughness: 0.8,
  metalness: 0.2,
});

const CERAMIC_MAT = new THREE.MeshStandardMaterial({
  color: 0xfafafa,
  roughness: 0.6,
  metalness: 0,
});

const WHITE_MAT = new THREE.MeshStandardMaterial({
  color: 0xffffff,
  roughness: 0.95,
});

const BLACK_MAT = new THREE.MeshStandardMaterial({
  color: 0x111111,
  roughness: 0.9,
});

// ─── Room Construction ───────────────────────────────────────────────────────

function createLabBench(width: number, depth: number, height: number): THREE.Group {
  const bench = new THREE.Group();

  // Main bench top
  const top = new THREE.Mesh(
    new THREE.BoxGeometry(width, 0.08, depth),
    WOOD_MAT
  );
  top.position.y = height;
  top.receiveShadow = true;
  top.castShadow = true;
  bench.add(top);

  // Black chemical-resistant surface (phenolic resin)
  const surface = new THREE.Mesh(
    new THREE.BoxGeometry(width - 0.02, 0.01, depth - 0.02),
    BLACK_MAT
  );
  surface.position.y = height + 0.045;
  surface.receiveShadow = true;
  bench.add(surface);

  // Under-bench cabinet
  const cabinetDepth = depth * 0.6;
  const cabinet = new THREE.Mesh(
    new THREE.BoxGeometry(width - 0.1, height - 0.1, cabinetDepth),
    CABINET_MAT
  );
  cabinet.position.set(0, (height - 0.1) / 2, -(depth - cabinetDepth) / 2);
  cabinet.receiveShadow = true;
  cabinet.castShadow = true;
  bench.add(cabinet);

  // Drawer fronts
  const drawerH = (height - 0.2) / 3;
  for (let i = 0; i < 3; i++) {
    const drawer = new THREE.Mesh(
      new THREE.BoxGeometry(width - 0.2, drawerH - 0.02, 0.02),
      new THREE.MeshStandardMaterial({ color: 0x37474f, metalness: 0.3 })
    );
    drawer.position.set(0, 0.05 + i * drawerH + drawerH / 2, -depth / 2 + 0.01);
    drawer.userData = { interactive: true, name: `Drawer ${i + 1}`, isDrawer: true };
    bench.add(drawer);

    // Handle
    const handle = new THREE.Mesh(
      new THREE.CylinderGeometry(0.01, 0.01, 0.08, 6),
      METAL_MAT
    );
    handle.rotation.z = Math.PI / 2;
    handle.position.set(0, 0.05 + i * drawerH + drawerH / 2, -depth / 2 + 0.03);
    bench.add(handle);
  }

  // Legs at corners
  const legGeo = new THREE.CylinderGeometry(0.04, 0.04, 0.15, 8);
  const legPositions = [
    [width / 2 - 0.08, depth / 2 - 0.08],
    [-width / 2 + 0.08, depth / 2 - 0.08],
    [width / 2 - 0.08, -depth / 2 + 0.08],
    [-width / 2 + 0.08, -depth / 2 + 0.08],
  ];

  legPositions.forEach(([x, z]) => {
    const leg = new THREE.Mesh(legGeo, METAL_MAT);
    leg.position.set(x, 0.075, z);
    leg.castShadow = true;
    bench.add(leg);
  });

  return bench;
}

function createWallCabinet(width: number, height: number, depth: number): THREE.Group {
  const cabinet = new THREE.Group();

  // Main body
  const body = new THREE.Mesh(
    new THREE.BoxGeometry(width, height, depth),
    WHITE_MAT
  );
  cabinet.add(body);

  // Glass doors
  const doorGeo = new THREE.BoxGeometry(width / 2 - 0.02, height - 0.04, 0.01);
  const glassDoorMat = new THREE.MeshPhysicalMaterial({
    color: 0xe8f4ff,
    transparent: true,
    opacity: 0.35,
    roughness: 0.02,
    transmission: 0.9,
  });

  const leftDoor = new THREE.Mesh(doorGeo, glassDoorMat);
  leftDoor.position.set(-width / 4, 0, depth / 2 + 0.005);
  leftDoor.userData = { interactive: true, name: 'Cabinet Door', isDoor: true };
  cabinet.add(leftDoor);

  const rightDoor = new THREE.Mesh(doorGeo, glassDoorMat);
  rightDoor.position.set(width / 4, 0, depth / 2 + 0.005);
  rightDoor.userData = { interactive: true, name: 'Cabinet Door', isDoor: true };
  cabinet.add(rightDoor);

  // Shelves inside
  for (let i = 0; i < 3; i++) {
    const shelf = new THREE.Mesh(
      new THREE.BoxGeometry(width - 0.04, 0.015, depth - 0.04),
    WHITE_MAT
    );
    shelf.position.y = -height / 3 + i * (height / 3);
    cabinet.add(shelf);
  }

  return cabinet;
}

function createFumeHood(): THREE.Group {
  const hood = new THREE.Group();

  // Main body
  const body = new THREE.Mesh(
    new THREE.BoxGeometry(1.5, 1.2, 0.8),
    WHITE_MAT
  );
  body.position.y = 0.6;
  hood.add(body);

  // Glass sash
  const sash = new THREE.Mesh(
    new THREE.BoxGeometry(1.4, 0.6, 0.02),
    new THREE.MeshPhysicalMaterial({
      color: 0xe8f4ff,
      transparent: true,
      opacity: 0.25,
      roughness: 0.02,
      transmission: 0.9,
    })
  );
  sash.position.set(0, 0.8, 0.41);
  sash.userData = { interactive: true, name: 'Fume Hood Sash', isSash: true };
  hood.add(sash);

  // Frame
  const frameMat = new THREE.MeshStandardMaterial({ color: 0x455a64, metalness: 0.6 });
  hood.add(new THREE.Mesh(new THREE.BoxGeometry(1.52, 0.03, 0.05), frameMat).translateY(1.21));

  // Work surface
  const workTop = new THREE.Mesh(
    new THREE.BoxGeometry(1.4, 0.02, 0.7),
    BLACK_MAT
  );
  workTop.position.y = 0.21;
  hood.add(workTop);

  // Exhaust duct
  const duct = new THREE.Mesh(
    new THREE.CylinderGeometry(0.12, 0.12, 0.4, 12),
    METAL_MAT
  );
  duct.position.set(0, 1.4, 0);
  hood.add(duct);

  // Control panel
  const panel = new THREE.Mesh(
    new THREE.BoxGeometry(0.2, 0.15, 0.02),
    new THREE.MeshStandardMaterial({ color: 0x1a1a1a })
  );
  panel.position.set(0.65, 0.5, 0.41);
  panel.userData = { interactive: true, name: 'Fume Hood Controls' };
  hood.add(panel);

  return hood;
}

function createSink(): THREE.Group {
  const sink = new THREE.Group();

  // Basin
  const basinOuter = new THREE.Mesh(
    new THREE.BoxGeometry(0.6, 0.25, 0.45),
    WHITE_MAT
  );
  basinOuter.position.y = 0.125;
  sink.add(basinOuter);

  // Basin interior (hollow)
  const basinInner = new THREE.Mesh(
    new THREE.BoxGeometry(0.55, 0.18, 0.40),
    BLACK_MAT
  );
  basinInner.position.y = 0.24;
  sink.add(basinInner);

  // Faucet
  const faucetBase = new THREE.Mesh(
    new THREE.CylinderGeometry(0.02, 0.025, 0.35, 8),
    METAL_MAT
  );
  faucetBase.position.set(0, 0.375, -0.2);
  faucetBase.castShadow = true;
  sink.add(faucetBase);

  // Faucet arm
  const faucetArm = new THREE.Mesh(
    new THREE.CylinderGeometry(0.015, 0.015, 0.3, 8),
    METAL_MAT
  );
  faucetArm.position.set(0, 0.52, -0.05);
  faucetArm.rotation.x = Math.PI / 2;
  sink.add(faucetArm);

  // Faucet spout
  const spout = new THREE.Mesh(
    new THREE.CylinderGeometry(0.008, 0.01, 0.08, 6),
    METAL_MAT
  );
  spout.position.set(0, 0.48, 0.1);
  sink.add(spout);

  // Handles
  const handleGeo = new THREE.CylinderGeometry(0.015, 0.02, 0.06, 6);
  const handleL = new THREE.Mesh(handleGeo, createCeramicMaterial(0x1565c0));
  handleL.position.set(-0.15, 0.38, -0.2);
  handleL.userData = { interactive: true, name: 'Cold Water Tap' };
  sink.add(handleL);

  const handleR = new THREE.Mesh(handleGeo, createCeramicMaterial(0xc62828));
  handleR.position.set(0.15, 0.38, -0.2);
  handleR.userData = { interactive: true, name: 'Hot Water Tap' };
  sink.add(handleR);

  // Drain
  const drain = new THREE.Mesh(
    new THREE.CylinderGeometry(0.03, 0.03, 0.02, 12),
    METAL_MAT
  );
  drain.position.y = 0.16;
  sink.add(drain);

  return sink;
}

function createSafetyShower(): THREE.Group {
  const shower = new THREE.Group();

  // Pole
  const pole = new THREE.Mesh(
    new THREE.CylinderGeometry(0.04, 0.04, 2.2, 8),
    new THREE.MeshStandardMaterial({ color: 0xff6f00, roughness: 0.3 })
  );
  pole.position.y = 1.1;
  shower.add(pole);

  // Shower head
  const head = new THREE.Mesh(
    new THREE.CylinderGeometry(0.12, 0.15, 0.08, 12),
    new THREE.MeshStandardMaterial({ color: 0xff6f00, metalness: 0.5 })
  );
  head.position.y = 2.2;
  shower.add(head);

  // Pull handle
  const pull = new THREE.Mesh(
    new THREE.BoxGeometry(0.03, 0.12, 0.03),
    new THREE.MeshStandardMaterial({ color: 0xd32f2f })
  );
  pull.position.set(0, 1.6, 0.05);
  pull.userData = { interactive: true, name: 'Emergency Shower Pull' };
  shower.add(pull);

  // Sign
  const signCanvas = document.createElement('canvas');
  signCanvas.width = 256;
  signCanvas.height = 128;
  const ctx = signCanvas.getContext('2d')!;
  ctx.fillStyle = '#0d47a1';
  ctx.fillRect(0, 0, 256, 128);
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 42px Arial';
  ctx.textAlign = 'center';
  ctx.fillText('SAFETY', 128, 50);
  ctx.fillText('SHOWER', 128, 95);
  const signTex = new THREE.CanvasTexture(signCanvas);
  const sign = new THREE.Mesh(
    new THREE.PlaneGeometry(0.5, 0.25),
    new THREE.MeshBasicMaterial({ map: signTex })
  );
  sign.position.set(0.3, 1.8, 0);
  sign.rotation.y = Math.PI / 2;
  shower.add(sign);

  return shower;
}

function createEyewash(): THREE.Group {
  const eyewash = new THREE.Group();

  // Base pedestal
  const base = new THREE.Mesh(
    new THREE.CylinderGeometry(0.12, 0.15, 1.0, 12),
    new THREE.MeshStandardMaterial({ color: 0x00c853, metalness: 0.3 })
  );
  base.position.y = 0.5;
  eyewash.add(base);

  // Bowl
  const bowl = new THREE.Mesh(
    new THREE.CylinderGeometry(0.18, 0.2, 0.08, 16),
    CERAMIC_MAT
  );
  bowl.position.y = 1.05;
  eyewash.add(bowl);

  // Dual spouts
  const spoutGeo = new THREE.CylinderGeometry(0.015, 0.015, 0.15, 8);
  const spoutL = new THREE.Mesh(spoutGeo, METAL_MAT);
  spoutL.position.set(-0.06, 1.1, 0);
  spoutL.rotation.z = Math.PI / 8;
  eyewash.add(spoutL);

  const spoutR = new THREE.Mesh(spoutGeo, METAL_MAT);
  spoutR.position.set(0.06, 1.1, 0);
  spoutR.rotation.z = -Math.PI / 8;
  eyewash.add(spoutR);

  // Pedal
  const pedal = new THREE.Mesh(
    new THREE.BoxGeometry(0.15, 0.03, 0.08),
    METAL_MAT
  );
  pedal.position.set(0, 0.02, 0.12);
  pedal.userData = { interactive: true, name: 'Eyewash Pedal' };
  eyewash.add(pedal);

  return eyewash;
}

function createFireExtinguisher(): THREE.Group {
  const extinguisher = new THREE.Group();

  // Body
  const body = new THREE.Mesh(
    new THREE.CylinderGeometry(0.08, 0.09, 0.45, 16),
    new THREE.MeshStandardMaterial({ color: 0xd32f2f, roughness: 0.4 })
  );
  body.position.y = 0.25;
  body.userData = { interactive: true, name: 'Fire Extinguisher' };
  extinguisher.add(body);

  // Neck and handle
  const neck = new THREE.Mesh(
    new THREE.CylinderGeometry(0.025, 0.03, 0.08, 8),
    METAL_MAT
  );
  neck.position.y = 0.5;
  extinguisher.add(neck);

  // Handle assembly
  const handle = new THREE.Mesh(
    new THREE.BoxGeometry(0.04, 0.06, 0.08),
    METAL_MAT
  );
  handle.position.y = 0.56;
  extinguisher.add(handle);

  // Pressure gauge
  const gauge = new THREE.Mesh(
    new THREE.CylinderGeometry(0.02, 0.02, 0.01, 12),
    new THREE.MeshBasicMaterial({ color: 0x4caf50 })
  );
  gauge.rotation.x = Math.PI / 2;
  gauge.position.set(0.08, 0.4, 0);
  extinguisher.add(gauge);

  // Label
  const labelCanvas = document.createElement('canvas');
  labelCanvas.width = 128;
  labelCanvas.height = 256;
  const ctx = labelCanvas.getContext('2d')!;
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(20, 40, 88, 176);
  ctx.fillStyle = '#d32f2f';
  ctx.font = 'bold 28px Arial';
  ctx.textAlign = 'center';
  ctx.fillText('CO₂', 64, 130);
  const labelTex = new THREE.CanvasTexture(labelCanvas);
  const label = new THREE.Mesh(
    new THREE.CylinderGeometry(0.082, 0.092, 0.35, 16, 1, true),
    new THREE.MeshBasicMaterial({ map: labelTex, transparent: true })
  );
  label.position.y = 0.23;
  extinguisher.add(label);

  return extinguisher;
}

function createFirstAidKit(): THREE.Group {
  const kit = new THREE.Group();

  // Box
  const box = new THREE.Mesh(
    new THREE.BoxGeometry(0.3, 0.22, 0.12),
    new THREE.MeshStandardMaterial({ color: 0x1565c0, roughness: 0.6 })
  );
  box.position.y = 0.11;
  box.userData = { interactive: true, name: 'First Aid Kit' };
  kit.add(box);

  // White cross
  const crossV = new THREE.Mesh(
    new THREE.BoxGeometry(0.08, 0.18, 0.01),
    WHITE_MAT
  );
  crossV.position.set(0, 0.11, 0.061);
  kit.add(crossV);

  const crossH = new THREE.Mesh(
    new THREE.BoxGeometry(0.18, 0.06, 0.01),
    WHITE_MAT
  );
  crossH.position.set(0, 0.11, 0.061);
  kit.add(crossH);

  return kit;
}

function createReagentShelf(width: number, levels: number = 3): THREE.Group {
  const shelf = new THREE.Group();

  // Support frame
  const frameMat = METAL_MAT;
  const frameGeo = new THREE.CylinderGeometry(0.015, 0.015, 0.8, 8);

  const legFL = new THREE.Mesh(frameGeo, frameMat);
  legFL.position.set(-width / 2, 0.4, -0.12);
  shelf.add(legFL);

  const legFR = new THREE.Mesh(frameGeo, frameMat);
  legFR.position.set(width / 2, 0.4, -0.12);
  shelf.add(legFR);

  const legBL = new THREE.Mesh(frameGeo, frameMat);
  legBL.position.set(-width / 2, 0.4, 0.12);
  shelf.add(legBL);

  const legBR = new THREE.Mesh(frameGeo, frameMat);
  legBR.position.set(width / 2, 0.4, 0.12);
  shelf.add(legBR);

  // Shelf boards
  for (let i = 0; i < levels; i++) {
    const board = new THREE.Mesh(
      new THREE.BoxGeometry(width, 0.015, 0.24),
      WOOD_MAT
    );
    board.position.y = 0.1 + i * 0.35;
    shelf.add(board);
  }

  return shelf;
}

function createBottleLabel(name: string, color: string, hazard?: string): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;

  // Background
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, 256, 128);

  // Border
  ctx.strokeStyle = color;
  ctx.lineWidth = 4;
  ctx.strokeRect(4, 4, 248, 120);

  // Hazard diamond if applicable
  if (hazard) {
    ctx.save();
    ctx.translate(40, 64);
    ctx.rotate(Math.PI / 4);
    ctx.fillStyle = hazard;
    ctx.fillRect(-16, -16, 32, 32);
    ctx.restore();
  }

  // Chemical name
  ctx.fillStyle = '#1a1a1a';
  ctx.font = 'bold 24px Arial';
  ctx.textAlign = 'center';
  ctx.fillText(name, 160, 60);

  return new THREE.CanvasTexture(canvas);
}

// ─── Main Room Builder ─────────────────────────────────────────────────────

export function buildVRLabRoom(stations: ExperimentStationData[]): VRLabRoomRefs {
  const group = new THREE.Group();
  const interactiveObjects: THREE.Object3D[] = [];
  const stationLabels: THREE.Sprite[] = [];

  // Room dimensions
  const roomWidth = 16;
  const roomDepth = 12;
  const roomHeight = 4;

  // Floor
  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(roomWidth, roomDepth),
    FLOOR_MAT
  );
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = 0;
  floor.receiveShadow = true;
  group.add(floor);

  // Checkerboard tile pattern on floor
  const tileGeo = new THREE.PlaneGeometry(0.8, 0.8);
  for (let x = -roomWidth / 2; x < roomWidth / 2; x += 0.8) {
    for (let z = -roomDepth / 2; z < roomDepth / 2; z += 0.8) {
      const isDark = (Math.floor(x / 0.8) + Math.floor(z / 0.8)) % 2 === 0;
      const tile = new THREE.Mesh(
        tileGeo,
        isDark ? new THREE.MeshStandardMaterial({ color: 0x1a2535 }) : new THREE.MeshStandardMaterial({ color: 0x1e3a5f })
      );
      tile.rotation.x = -Math.PI / 2;
      tile.position.set(x + 0.4, 0.01, z + 0.4);
      tile.receiveShadow = true;
      group.add(tile);
    }
  }

  // Ceiling
  const ceiling = new THREE.Mesh(
    new THREE.PlaneGeometry(roomWidth, roomDepth),
    new THREE.MeshStandardMaterial({ color: 0xf5f5f5, side: THREE.DoubleSide })
  );
  ceiling.rotation.x = Math.PI / 2;
  ceiling.position.y = roomHeight;
  group.add(ceiling);

  // Fluorescent lights
  for (let i = 0; i < 4; i++) {
    const lightFixture = new THREE.Mesh(
      new THREE.BoxGeometry(0.15, 0.08, 1.5),
      new THREE.MeshBasicMaterial({ color: 0xffffff })
    );
    lightFixture.position.set(-roomWidth / 4 + i * (roomWidth / 4), roomHeight - 0.05, 0);
    group.add(lightFixture);

    // Light tubes
    const tube = new THREE.Mesh(
      new THREE.CylinderGeometry(0.025, 0.025, 1.4, 8),
      new THREE.MeshBasicMaterial({ color: 0xffffff })
    );
    tube.rotation.z = Math.PI / 2;
    tube.position.set(-roomWidth / 4 + i * (roomWidth / 4), roomHeight - 0.08, 0);
    group.add(tube);
  }

  // Walls
  const wallGeo = new THREE.PlaneGeometry(roomWidth, roomHeight);
  const wallPositions = [
    { pos: [0, roomHeight / 2, -roomDepth / 2], rot: 0, name: 'Back Wall' },
    { pos: [0, roomHeight / 2, roomDepth / 2], rot: Math.PI, name: 'Front Wall' },
    { pos: [-roomWidth / 2, roomHeight / 2, 0], rot: Math.PI / 2, name: 'Left Wall' },
    { pos: [roomWidth / 2, roomHeight / 2, 0], rot: -Math.PI / 2, name: 'Right Wall' },
  ];

  wallPositions.forEach(({ pos, rot }) => {
    const wall = new THREE.Mesh(wallGeo, WALL_MAT);
    wall.position.set(pos[0], pos[1], pos[2]);
    wall.rotation.y = rot;
    wall.receiveShadow = true;
    group.add(wall);
  });

  // Main lab bench (center)
  const mainBench = createLabBench(4, 1.2, 0.85);
  mainBench.position.set(0, 0, -2);
  group.add(mainBench);

  // Collect interactive objects from bench
  mainBench.traverse(obj => {
    if (obj.userData?.interactive) interactiveObjects.push(obj);
  });

  // Wall cabinets (back wall)
  for (let i = 0; i < 3; i++) {
    const cabinet = createWallCabinet(1.5, 1.0, 0.35);
    cabinet.position.set(-2 + i * 2, 2.3, -roomDepth / 2 + 0.2);
    group.add(cabinet);
    cabinet.traverse(obj => {
      if (obj.userData?.interactive) interactiveObjects.push(obj);
    });
  }

  // Fume hood (left wall)
  const fumeHood = createFumeHood();
  fumeHood.position.set(-roomWidth / 2 + 0.9, 0, -2);
  group.add(fumeHood);
  fumeHood.traverse(obj => {
    if (obj.userData?.interactive) interactiveObjects.push(obj);
  });

  // Sink area (right wall)
  const sinkBench = createLabBench(1.5, 0.8, 0.85);
  sinkBench.position.set(roomWidth / 2 - 1.0, 0, 2);
  group.add(sinkBench);

  const sink = createSink();
  sink.position.set(roomWidth / 2 - 1.0, 0.85, 2);
  group.add(sink);
  sink.traverse(obj => {
    if (obj.userData?.interactive) interactiveObjects.push(obj);
  });

  // Safety equipment (corners)
  const shower = createSafetyShower();
  shower.position.set(-roomWidth / 2 + 0.5, 0, -roomDepth / 2 + 0.5);
  group.add(shower);
  shower.traverse(obj => {
    if (obj.userData?.interactive) interactiveObjects.push(obj);
  });

  const eyewash = createEyewash();
  eyewash.position.set(roomWidth / 2 - 0.5, 0, -roomDepth / 2 + 0.5);
  group.add(eyewash);
  eyewash.traverse(obj => {
    if (obj.userData?.interactive) interactiveObjects.push(obj);
  });

  const extinguisher = createFireExtinguisher();
  extinguisher.position.set(-roomWidth / 2 + 0.6, 0.85, 3);
  extinguisher.userData = { ...extinguisher.userData, isMounted: true };
  group.add(extinguisher);
  interactiveObjects.push(extinguisher);

  const firstAid = createFirstAidKit();
  firstAid.position.set(roomWidth / 2 - 0.3, 2.5, -roomDepth / 2 + 0.03);
  group.add(firstAid);
  interactiveObjects.push(firstAid);

  // Reagent shelf (back corner)
  const reagentShelf = createReagentShelf(1.5, 3);
  reagentShelf.position.set(-roomWidth / 2 + 1.2, 0, -roomDepth / 2 + 0.5);
  group.add(reagentShelf);

  // Experiment stations (side benches)
  const stationRadius = 2.5;
  stations.forEach((station, i) => {
    const angle = (i / Math.max(stations.length, 1)) * Math.PI * 2;
    const x = Math.cos(angle) * stationRadius;
    const z = Math.sin(angle) * stationRadius;

    // Mini bench for station
    const stationBench = new THREE.Mesh(
      new THREE.BoxGeometry(1.2, 0.08, 0.7),
      WOOD_MAT
    );
    stationBench.position.set(x, 0.85, z);
    stationBench.receiveShadow = true;
    group.add(stationBench);

    // Station label
    const labelCanvas = document.createElement('canvas');
    labelCanvas.width = 512;
    labelCanvas.height = 128;
    const ctx = labelCanvas.getContext('2d')!;
    ctx.fillStyle = 'rgba(13, 71, 161, 0.9)';
    ctx.fillRect(0, 0, 512, 128);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 36px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(station.title, 256, 75);
    const labelTex = new THREE.CanvasTexture(labelCanvas);
    const label = new THREE.Sprite(new THREE.SpriteMaterial({ map: labelTex, transparent: true }));
    label.scale.set(1.5, 0.3, 1);
    label.position.set(x, 1.5, z);
    group.add(label);
    stationLabels.push(label);
  });

  // Central pillar (utility column)
  const pillar = new THREE.Mesh(
    new THREE.CylinderGeometry(0.08, 0.1, roomHeight, 12),
    METAL_MAT
  );
  pillar.position.set(0, roomHeight / 2, 0);
  pillar.castShadow = true;
  group.add(pillar);

  return { group, interactiveObjects, stationLabels };
}

function createCeramicMaterial(color: number): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    color,
    metalness: 0,
    roughness: 0.6,
  });
}
