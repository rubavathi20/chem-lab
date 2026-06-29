import * as THREE from 'three';

export interface ExperimentStationData {
  id: string;
  title: string;
  category: string;
  difficulty: string;
  chemicals: string[];
  equipment: string[];
}

export interface VRLabRoomRefs {
  group: THREE.Group;
  interactiveObjects: THREE.Object3D[];
  stationLabels: THREE.Sprite[];
}

const GLASS_MAT = new THREE.MeshPhysicalMaterial({
  color: 0xe8f4ff, transparent: true, opacity: 0.22,
  roughness: 0.02, metalness: 0, transmission: 0.95, thickness: 0.3,
});

// Real chemistry liquid colors with emissive glow
const CHEM_LIQUIDS: { color: number; emissive: number; name: string }[] = [
  { color: 0x1565c0, emissive: 0x0d47a1, name: 'CuSO₄ (aq)' },       // Copper sulfate — deep blue
  { color: 0xb71c1c, emissive: 0x7f0000, name: 'Co(NO₃)₂ (aq)' },    // Cobalt nitrate — red
  { color: 0xf57f17, emissive: 0xe65100, name: 'K₂Cr₂O₇ (aq)' },     // Potassium dichromate — orange
  { color: 0x2e7d32, emissive: 0x1b5e20, name: 'NiSO₄ (aq)' },       // Nickel sulfate — green
  { color: 0x4a148c, emissive: 0x6a0080, name: 'KMnO₄ (aq)' },       // Potassium permanganate — purple
  { color: 0x795548, emissive: 0x4e342e, name: 'I₂ / KI (aq)' },     // Iodine in KI — amber-brown
];

function makeChemLiquidMat(idx: number) {
  const c = CHEM_LIQUIDS[idx % CHEM_LIQUIDS.length];
  return new THREE.MeshPhysicalMaterial({
    color: c.color,
    emissive: c.emissive,
    emissiveIntensity: 0.25,
    transparent: true,
    opacity: 0.82,
    roughness: 0.08,
    metalness: 0,
    transmission: 0.15,
  });
}

function makeLabel(text: string, color = '#00e5ff'): THREE.Sprite {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = 'rgba(2,6,23,0.85)';
  ctx.fillRect(0, 0, 512, 128);
  ctx.strokeStyle = color;
  ctx.lineWidth = 3;
  ctx.strokeRect(4, 4, 504, 120);
  ctx.fillStyle = color;
  ctx.font = 'bold 42px "Space Grotesk", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const lines = text.length > 28 ? [text.slice(0, 28), text.slice(28)] : [text];
  lines.forEach((line, i) => ctx.fillText(line, 256, 64 + (i - (lines.length - 1) / 2) * 44));
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false });
  const sprite = new THREE.Sprite(mat);
  sprite.scale.set(2, 0.5, 1);
  return sprite;
}

function createBeakerSet(position: THREE.Vector3, chemIdx: number): THREE.Group {
  const g = new THREE.Group();
  g.position.copy(position);
  const beaker = new THREE.Mesh(
    new THREE.CylinderGeometry(0.35, 0.3, 0.7, 24, 1, true),
    GLASS_MAT
  );
  beaker.position.y = 0.35;
  beaker.userData = { name: 'Beaker', interactive: true };
  g.add(beaker);
  // Bottom disk
  const bottom = new THREE.Mesh(new THREE.CircleGeometry(0.3, 24), GLASS_MAT);
  bottom.rotation.x = -Math.PI / 2;
  g.add(bottom);
  // Liquid with meniscus (slightly concave top)
  const liquid = new THREE.Mesh(
    new THREE.CylinderGeometry(0.29, 0.26, 0.38, 24),
    makeChemLiquidMat(chemIdx)
  );
  liquid.position.y = 0.19;
  g.add(liquid);
  // Meniscus disc
  const meniscus = new THREE.Mesh(
    new THREE.CircleGeometry(0.29, 24),
    makeChemLiquidMat(chemIdx)
  );
  meniscus.rotation.x = -Math.PI / 2;
  meniscus.position.y = 0.38;
  g.add(meniscus);
  return g;
}

function createFlaskSet(position: THREE.Vector3, chemIdx: number): THREE.Group {
  const g = new THREE.Group();
  g.position.copy(position);
  const body = new THREE.Mesh(
    new THREE.CylinderGeometry(0.55, 0.6, 0.9, 32, 1, true),
    GLASS_MAT
  );
  body.position.y = 0.45;
  body.userData = { name: 'Erlenmeyer Flask', interactive: true };
  g.add(body);
  const bottom = new THREE.Mesh(new THREE.CircleGeometry(0.6, 32), GLASS_MAT);
  bottom.rotation.x = -Math.PI / 2;
  g.add(bottom);
  const neck = new THREE.Mesh(
    new THREE.CylinderGeometry(0.14, 0.3, 0.5, 16, 1, true),
    GLASS_MAT
  );
  neck.position.y = 1.15;
  g.add(neck);
  const liquid = new THREE.Mesh(
    new THREE.CylinderGeometry(0.48, 0.57, 0.45, 32),
    makeChemLiquidMat(chemIdx)
  );
  liquid.position.y = 0.22;
  g.add(liquid);
  // Surface disc
  const surface = new THREE.Mesh(new THREE.CircleGeometry(0.48, 32), makeChemLiquidMat(chemIdx));
  surface.rotation.x = -Math.PI / 2;
  surface.position.y = 0.445;
  g.add(surface);
  return g;
}

function createTestTubeRack(position: THREE.Vector3): THREE.Group {
  const g = new THREE.Group();
  g.position.copy(position);
  // Rack base
  const rackBase = new THREE.Mesh(
    new THREE.BoxGeometry(0.8, 0.05, 0.18),
    new THREE.MeshStandardMaterial({ color: 0x263238, roughness: 0.7 })
  );
  rackBase.position.y = 0.025;
  g.add(rackBase);
  const rackTop = new THREE.Mesh(
    new THREE.BoxGeometry(0.8, 0.04, 0.18),
    new THREE.MeshStandardMaterial({ color: 0x263238, roughness: 0.7 })
  );
  rackTop.position.y = 0.6;
  g.add(rackTop);
  for (let i = 0; i < 4; i++) {
    const xPos = i * 0.18 - 0.27;
    const tube = new THREE.Mesh(
      new THREE.CylinderGeometry(0.055, 0.052, 0.65, 16, 1, true),
      GLASS_MAT.clone()
    );
    tube.position.set(xPos, 0.42, 0);
    tube.userData = { name: CHEM_LIQUIDS[i].name, interactive: true };
    g.add(tube);
    // Tube bottom cap
    const cap = new THREE.Mesh(new THREE.SphereGeometry(0.052, 12, 6, 0, Math.PI * 2, 0, Math.PI / 2), GLASS_MAT);
    cap.rotation.x = Math.PI;
    cap.position.set(xPos, 0.095, 0);
    g.add(cap);
    const fillHeight = 0.15 + i * 0.06;
    const liq = new THREE.Mesh(
      new THREE.CylinderGeometry(0.044, 0.044, fillHeight, 16),
      makeChemLiquidMat(i)
    );
    liq.position.set(xPos, 0.098 + fillHeight / 2, 0);
    g.add(liq);
  }
  return g;
}

function createBurette(position: THREE.Vector3): THREE.Group {
  const g = new THREE.Group();
  g.position.copy(position);
  const tube = new THREE.Mesh(
    new THREE.CylinderGeometry(0.06, 0.06, 2.2, 12),
    GLASS_MAT
  );
  tube.position.y = 1.1;
  tube.userData = { name: 'Burette', interactive: true };
  g.add(tube);
  const stand = new THREE.Mesh(
    new THREE.BoxGeometry(0.04, 2.6, 0.04),
    new THREE.MeshStandardMaterial({ color: 0x334455, metalness: 0.8 })
  );
  stand.position.set(-0.25, 0.9, 0);
  g.add(stand);
  return g;
}

// Chemical index cycles through CHEM_LIQUIDS per station


export function buildVRLabRoom(stations: ExperimentStationData[]): VRLabRoomRefs {
  const group = new THREE.Group();
  const interactiveObjects: THREE.Object3D[] = [];
  const stationLabels: THREE.Sprite[] = [];

  // Floor
  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(30, 30),
    new THREE.MeshStandardMaterial({ color: 0x1a2535, roughness: 0.85, metalness: 0.15 })
  );
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  group.add(floor);

  // Grid overlay
  const grid = new THREE.GridHelper(30, 30, 0x1e3a5f, 0x0d1f35);
  grid.position.y = 0.01;
  group.add(grid);

  // Ceiling
  const ceiling = new THREE.Mesh(
    new THREE.PlaneGeometry(30, 30),
    new THREE.MeshStandardMaterial({ color: 0x0a101a, side: THREE.DoubleSide })
  );
  ceiling.rotation.x = Math.PI / 2;
  ceiling.position.y = 6;
  group.add(ceiling);

  // Walls
  const wallMat = new THREE.MeshStandardMaterial({ color: 0x1e2a3a, side: THREE.DoubleSide });
  const wallGeo = new THREE.PlaneGeometry(30, 6);
  const walls = [
    { pos: [0, 3, -15], rot: 0 },
    { pos: [0, 3, 15], rot: Math.PI },
    { pos: [-15, 3, 0], rot: Math.PI / 2 },
    { pos: [15, 3, 0], rot: -Math.PI / 2 },
  ];
  walls.forEach(({ pos, rot }) => {
    const w = new THREE.Mesh(wallGeo, wallMat);
    w.position.set(pos[0], pos[1], pos[2]);
    w.rotation.y = rot;
    group.add(w);
  });

  // Safety equipment (corners)
  const showerPole = new THREE.Mesh(
    new THREE.CylinderGeometry(0.05, 0.05, 3, 8),
    new THREE.MeshStandardMaterial({ color: 0xff6600 })
  );
  showerPole.position.set(-12, 4.5, -12);
  group.add(showerPole);

  const extinguisher = new THREE.Mesh(
    new THREE.CylinderGeometry(0.1, 0.12, 0.5, 16),
    new THREE.MeshStandardMaterial({ color: 0xff0000 })
  );
  extinguisher.position.set(12, 1.2, -12);
  group.add(extinguisher);

  // Generate experiment stations in a circle
  const stationCount = Math.max(stations.length, 1);
  const radius = Math.max(5, stationCount * 1.2);

  stations.forEach((station, i) => {
    const angle = (i / stationCount) * Math.PI * 2;
    const x = Math.cos(angle) * radius;
    const z = Math.sin(angle) * radius;
    const chemIdx = i % CHEM_LIQUIDS.length;

    // Bench
    const benchGroup = new THREE.Group();
    benchGroup.position.set(x, 0, z);
    benchGroup.rotation.y = -angle + Math.PI / 2;

    const bench = new THREE.Mesh(
      new THREE.BoxGeometry(2.5, 0.12, 1.3),
      new THREE.MeshStandardMaterial({ color: 0x1a2535, roughness: 0.8 })
    );
    bench.position.y = 0.85;
    bench.receiveShadow = true;
    benchGroup.add(bench);

    // Bench legs
    [[-1.1, -0.5], [1.1, -0.5], [-1.1, 0.5], [1.1, 0.5]].forEach(([lx, lz]) => {
      const leg = new THREE.Mesh(
        new THREE.BoxGeometry(0.06, 0.85, 0.06),
        new THREE.MeshStandardMaterial({ color: 0x111827, metalness: 0.6 })
      );
      leg.position.set(lx, 0.42, lz);
      benchGroup.add(leg);
    });

    // Equipment on bench (varies by index for visual variety)
    if (i % 4 === 0) {
      const set = createFlaskSet(new THREE.Vector3(-0.5, 0.91, 0), chemIdx);
      benchGroup.add(set);
      const bur = createBurette(new THREE.Vector3(0.6, 0.91, 0));
      benchGroup.add(bur);
    } else if (i % 4 === 1) {
      const set = createBeakerSet(new THREE.Vector3(-0.3, 0.91, 0), chemIdx);
      benchGroup.add(set);
      const rack = createTestTubeRack(new THREE.Vector3(0.5, 0.91, 0));
      benchGroup.add(rack);
    } else if (i % 4 === 2) {
      const rack = createTestTubeRack(new THREE.Vector3(-0.3, 0.91, 0));
      benchGroup.add(rack);
      const bur = createBurette(new THREE.Vector3(0.6, 0.91, 0));
      benchGroup.add(bur);
    } else {
      const set = createFlaskSet(new THREE.Vector3(0, 0.91, 0), chemIdx);
      benchGroup.add(set);
      const rack = createTestTubeRack(new THREE.Vector3(0.7, 0.91, 0));
      benchGroup.add(rack);
    }

    // Collect interactive objects
    benchGroup.traverse(obj => {
      if (obj.userData?.interactive) interactiveObjects.push(obj);
    });

    // Station label floating above
    const label = makeLabel(station.title, '#00e5ff');
    label.position.set(0, 2.2, 0);
    benchGroup.add(label);
    stationLabels.push(label);

    group.add(benchGroup);
  });

  // Central info pillar
  const pillar = new THREE.Mesh(
    new THREE.CylinderGeometry(0.15, 0.2, 4, 8),
    new THREE.MeshStandardMaterial({ color: 0x0f172a, emissive: 0x00e5ff, emissiveIntensity: 0.15, metalness: 0.5 })
  );
  pillar.position.set(0, 2, 0);
  group.add(pillar);

  return { group, interactiveObjects, stationLabels };
}
