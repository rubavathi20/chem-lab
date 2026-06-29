import * as THREE from 'three';

// ─── Equipment Types ───────────────────────────────────────────────────────────

export type EquipmentType =
  | 'beaker'
  | 'erlenmeyer_flask'
  | 'volumetric_flask'
  | 'round_bottom_flask'
  | 'conical_flask'
  | 'test_tube'
  | 'test_tube_rack'
  | 'burette'
  | 'pipette'
  | 'dropper'
  | 'graduated_cylinder'
  | 'measuring_cylinder'
  | 'funnel'
  | 'filter_funnel'
  | 'glass_rod'
  | 'thermometer'
  | 'watch_glass'
  | 'crucible'
  | 'evaporating_dish'
  | 'spatula'
  | 'reagent_bottle'
  | 'wash_bottle'
  | 'bunsen_burner'
  | 'tripod'
  | 'wire_gauze'
  | 'clamp_stand'
  | 'ring_stand'
  | 'balance'
  | 'mortar_pestle'
  | 'safety_goggles'
  | 'gloves'
  | 'lab_coat'
  | 'sink'
  | 'cabinet'
  | 'shelf'
  | 'drawer';

export interface EquipmentDefinition {
  type: EquipmentType;
  name: string;
  description: string;
  isInteractive: boolean;
  isContainer: boolean;
  canHeat: boolean;
  hasLid: boolean;
  capacityML: number;
  material: 'glass' | 'plastic' | 'metal' | 'ceramic' | 'rubber';
  category: 'glassware' | 'measurement' | 'heating' | 'holding' | 'protection' | 'furniture';
}

export const EQUIPMENT_DEFS: Record<EquipmentType, EquipmentDefinition> = {
  beaker: {
    type: 'beaker',
    name: 'Beaker',
    description: 'Cylindrical container with graduated markings for measuring and mixing',
    isInteractive: true,
    isContainer: true,
    canHeat: true,
    hasLid: false,
    capacityML: 250,
    material: 'glass',
    category: 'glassware',
  },
  erlenmeyer_flask: {
    type: 'erlenmeyer_flask',
    name: 'Erlenmeyer Flask',
    description: 'Conical flask for mixing, heating, and storing solutions',
    isInteractive: true,
    isContainer: true,
    canHeat: true,
    hasLid: true,
    capacityML: 250,
    material: 'glass',
    category: 'glassware',
  },
  volumetric_flask: {
    type: 'volumetric_flask',
    name: 'Volumetric Flask',
    description: 'Precision flask for preparing standard solutions',
    isInteractive: true,
    isContainer: true,
    canHeat: false,
    hasLid: true,
    capacityML: 100,
    material: 'glass',
    category: 'measurement',
  },
  round_bottom_flask: {
    type: 'round_bottom_flask',
    name: 'Round Bottom Flask',
    description: 'Spherical flask for distillation and heating',
    isInteractive: true,
    isContainer: true,
    canHeat: true,
    hasLid: true,
    capacityML: 500,
    material: 'glass',
    category: 'glassware',
  },
  conical_flask: {
    type: 'conical_flask',
    name: 'Conical Flask',
    description: 'General-purpose flask for titrations and reactions',
    isInteractive: true,
    isContainer: true,
    canHeat: true,
    hasLid: false,
    capacityML: 250,
    material: 'glass',
    category: 'glassware',
  },
  test_tube: {
    type: 'test_tube',
    name: 'Test Tube',
    description: 'Small tube for qualitative tests and reactions',
    isInteractive: true,
    isContainer: true,
    canHeat: true,
    hasLid: true,
    capacityML: 20,
    material: 'glass',
    category: 'glassware',
  },
  test_tube_rack: {
    type: 'test_tube_rack',
    name: 'Test Tube Rack',
    description: 'Wooden or plastic stand to hold test tubes',
    isInteractive: true,
    isContainer: false,
    canHeat: false,
    hasLid: false,
    capacityML: 0,
    material: 'plastic',
    category: 'holding',
  },
  burette: {
    type: 'burette',
    name: 'Burette',
    description: 'Graduated glass tube with stopcock for precise liquid dispensing',
    isInteractive: true,
    isContainer: true,
    canHeat: false,
    hasLid: false,
    capacityML: 50,
    material: 'glass',
    category: 'measurement',
  },
  pipette: {
    type: 'pipette',
    name: 'Pipette',
    description: 'Glass tube for transferring precise volumes of liquid',
    isInteractive: true,
    isContainer: true,
    canHeat: false,
    hasLid: false,
    capacityML: 25,
    material: 'glass',
    category: 'measurement',
  },
  dropper: {
    type: 'dropper',
    name: 'Dropper',
    description: 'Small tube with rubber bulb for dispensing drops',
    isInteractive: true,
    isContainer: true,
    canHeat: false,
    hasLid: false,
    capacityML: 5,
    material: 'glass',
    category: 'measurement',
  },
  graduated_cylinder: {
    type: 'graduated_cylinder',
    name: 'Graduated Cylinder',
    description: 'Tall cylinder with precise graduation marks for measuring volume',
    isInteractive: true,
    isContainer: true,
    canHeat: false,
    hasLid: false,
    capacityML: 100,
    material: 'glass',
    category: 'measurement',
  },
  measuring_cylinder: {
    type: 'measuring_cylinder',
    name: 'Measuring Cylinder',
    description: 'Standard cylinder for measuring liquid volumes',
    isInteractive: true,
    isContainer: true,
    canHeat: false,
    hasLid: false,
    capacityML: 100,
    material: 'glass',
    category: 'measurement',
  },
  funnel: {
    type: 'funnel',
    name: 'Funnel',
    description: 'Conical glass for pouring liquids into small openings',
    isInteractive: true,
    isContainer: false,
    canHeat: false,
    hasLid: false,
    capacityML: 0,
    material: 'glass',
    category: 'glassware',
  },
  filter_funnel: {
    type: 'filter_funnel',
    name: 'Filter Funnel',
    description: 'Funnel with filter paper support for filtration',
    isInteractive: true,
    isContainer: false,
    canHeat: false,
    hasLid: false,
    capacityML: 0,
    material: 'glass',
    category: 'glassware',
  },
  glass_rod: {
    type: 'glass_rod',
    name: 'Glass Rod',
    description: 'Solid glass rod for stirring and transferring',
    isInteractive: true,
    isContainer: false,
    canHeat: true,
    hasLid: false,
    capacityML: 0,
    material: 'glass',
    category: 'glassware',
  },
  thermometer: {
    type: 'thermometer',
    name: 'Thermometer',
    description: 'Mercury or alcohol thermometer for temperature measurement',
    isInteractive: true,
    isContainer: false,
    canHeat: false,
    hasLid: false,
    capacityML: 0,
    material: 'glass',
    category: 'measurement',
  },
  watch_glass: {
    type: 'watch_glass',
    name: 'Watch Glass',
    description: 'Concave glass circle for covering beakers or evaporating',
    isInteractive: true,
    isContainer: false,
    canHeat: true,
    hasLid: false,
    capacityML: 0,
    material: 'glass',
    category: 'glassware',
  },
  crucible: {
    type: 'crucible',
    name: 'Crucible',
    description: 'Small ceramic pot for high-temperature heating',
    isInteractive: true,
    isContainer: true,
    canHeat: true,
    hasLid: true,
    capacityML: 30,
    material: 'ceramic',
    category: 'heating',
  },
  evaporating_dish: {
    type: 'evaporating_dish',
    name: 'Evaporating Dish',
    description: 'Shallow dish for evaporating solutions',
    isInteractive: true,
    isContainer: true,
    canHeat: true,
    hasLid: false,
    capacityML: 100,
    material: 'ceramic',
    category: 'heating',
  },
  spatula: {
    type: 'spatula',
    name: 'Spatula',
    description: 'Metal or plastic scoop for transferring solids',
    isInteractive: true,
    isContainer: false,
    canHeat: false,
    hasLid: false,
    capacityML: 0,
    material: 'metal',
    category: 'holding',
  },
  reagent_bottle: {
    type: 'reagent_bottle',
    name: 'Reagent Bottle',
    description: 'Glass bottle with stopper for storing chemicals',
    isInteractive: true,
    isContainer: true,
    canHeat: false,
    hasLid: true,
    capacityML: 500,
    material: 'glass',
    category: 'holding',
  },
  wash_bottle: {
    type: 'wash_bottle',
    name: 'Wash Bottle',
    description: 'Squeeze bottle for dispensing distilled water',
    isInteractive: true,
    isContainer: true,
    canHeat: false,
    hasLid: false,
    capacityML: 500,
    material: 'plastic',
    category: 'holding',
  },
  bunsen_burner: {
    type: 'bunsen_burner',
    name: 'Bunsen Burner',
    description: 'Gas burner for heating and flame tests',
    isInteractive: true,
    isContainer: false,
    canHeat: true,
    hasLid: false,
    capacityML: 0,
    material: 'metal',
    category: 'heating',
  },
  tripod: {
    type: 'tripod',
    name: 'Tripod',
    description: 'Three-legged stand for supporting items over burner',
    isInteractive: false,
    isContainer: false,
    canHeat: true,
    hasLid: false,
    capacityML: 0,
    material: 'metal',
    category: 'holding',
  },
  wire_gauze: {
    type: 'wire_gauze',
    name: 'Wire Gauze',
    description: 'Mesh mat for placing flasks on tripod',
    isInteractive: false,
    isContainer: false,
    canHeat: true,
    hasLid: false,
    capacityML: 0,
    material: 'metal',
    category: 'holding',
  },
  clamp_stand: {
    type: 'clamp_stand',
    name: 'Clamp Stand',
    description: 'Retort stand with clamp for holding apparatus',
    isInteractive: false,
    isContainer: false,
    canHeat: false,
    hasLid: false,
    capacityML: 0,
    material: 'metal',
    category: 'holding',
  },
  ring_stand: {
    type: 'ring_stand',
    name: 'Ring Stand',
    description: 'Stand with ring support for funnels',
    isInteractive: false,
    isContainer: false,
    canHeat: false,
    hasLid: false,
    capacityML: 0,
    material: 'metal',
    category: 'holding',
  },
  balance: {
    type: 'balance',
    name: 'Analytical Balance',
    description: 'Precision scale for measuring mass',
    isInteractive: true,
    isContainer: false,
    canHeat: false,
    hasLid: false,
    capacityML: 0,
    material: 'metal',
    category: 'measurement',
  },
  mortar_pestle: {
    type: 'mortar_pestle',
    name: 'Mortar and Pestle',
    description: 'Ceramic bowl and grinder for crushing solids',
    isInteractive: true,
    isContainer: true,
    canHeat: false,
    hasLid: false,
    capacityML: 100,
    material: 'ceramic',
    category: 'holding',
  },
  safety_goggles: {
    type: 'safety_goggles',
    name: 'Safety Goggles',
    description: 'Protective eyewear for lab work',
    isInteractive: true,
    isContainer: false,
    canHeat: false,
    hasLid: false,
    capacityML: 0,
    material: 'plastic',
    category: 'protection',
  },
  gloves: {
    type: 'gloves',
    name: 'Lab Gloves',
    description: 'Protective gloves for handling chemicals',
    isInteractive: true,
    isContainer: false,
    canHeat: false,
    hasLid: false,
    capacityML: 0,
    material: 'rubber',
    category: 'protection',
  },
  lab_coat: {
    type: 'lab_coat',
    name: 'Lab Coat',
    description: 'Protective coat for lab work',
    isInteractive: false,
    isContainer: false,
    canHeat: false,
    hasLid: false,
    capacityML: 0,
    material: 'plastic',
    category: 'protection',
  },
  sink: {
    type: 'sink',
    name: 'Laboratory Sink',
    description: 'Water basin for washing equipment',
    isInteractive: true,
    isContainer: false,
    canHeat: false,
    hasLid: false,
    capacityML: 0,
    material: 'metal',
    category: 'furniture',
  },
  cabinet: {
    type: 'cabinet',
    name: 'Storage Cabinet',
    description: 'Cabinet for storing chemicals and equipment',
    isInteractive: true,
    isContainer: false,
    canHeat: false,
    hasLid: false,
    capacityML: 0,
    material: 'metal',
    category: 'furniture',
  },
  shelf: {
    type: 'shelf',
    name: 'Storage Shelf',
    description: 'Open shelf for reagent bottles',
    isInteractive: false,
    isContainer: false,
    canHeat: false,
    hasLid: false,
    capacityML: 0,
    material: 'metal',
    category: 'furniture',
  },
  drawer: {
    type: 'drawer',
    name: 'Equipment Drawer',
    description: 'Drawer for small equipment storage',
    isInteractive: true,
    isContainer: false,
    canHeat: false,
    hasLid: false,
    capacityML: 0,
    material: 'metal',
    category: 'furniture',
  },
};

// ─── Material Creation ──────────────────────────────────────────────────────

export function createGlassMaterial(
  color: number = 0xe8f4ff,
  opacity: number = 0.2,
  roughness: number = 0.02
): THREE.MeshPhysicalMaterial {
  return new THREE.MeshPhysicalMaterial({
    color,
    transparent: true,
    opacity,
    roughness,
    metalness: 0,
    transmission: 0.95,
    thickness: 0.3,
    envMapIntensity: 1.2,
    clearcoat: 1.0,
    clearcoatRoughness: 0.1,
    ior: 1.5,
  });
}

export function createLiquidMaterial(
  color: number,
  emissive: number,
  opacity: number = 0.85
): THREE.MeshPhysicalMaterial {
  return new THREE.MeshPhysicalMaterial({
    color,
    emissive,
    emissiveIntensity: 0.3,
    transparent: true,
    opacity,
    roughness: 0.05,
    metalness: 0,
    transmission: 0.2,
    thickness: 0.5,
    side: THREE.DoubleSide,
  });
}

export function createMetalMaterial(
  color: number = 0x556677,
  roughness: number = 0.4
): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    color,
    metalness: 0.7,
    roughness,
  });
}

export function createRubberMaterial(color: number = 0x1a1a1a): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    color,
    metalness: 0,
    roughness: 0.9,
  });
}

export function createPlasticMaterial(color: number, roughness: number = 0.5): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    color,
    metalness: 0.1,
    roughness,
  });
}

export function createCeramicMaterial(color: number = 0xf5f5f5): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    color,
    metalness: 0,
    roughness: 0.6,
  });
}

// ─── Equipment Geometry Generators ───────────────────────────────────────────

export function createBeaker(radius: number = 0.35, height: number = 0.7): THREE.Group {
  const group = new THREE.Group();
  const glassMat = createGlassMaterial();
  const liqMat = createLiquidMaterial(0x90caf9, 0x1565c0);

  // Body
  const body = new THREE.Mesh(
    new THREE.CylinderGeometry(radius, radius * 0.95, height, 32, 1, true),
    glassMat
  );
  body.position.y = height / 2;
  body.userData = { interactive: true, name: 'Beaker' };
  group.add(body);

  // Bottom
  const bottom = new THREE.Mesh(
    new THREE.CircleGeometry(radius * 0.95, 32),
    glassMat
  );
  bottom.rotation.x = -Math.PI / 2;
  group.add(bottom);

  // Spout (beveled rim)
  const spoutGeo = new THREE.TorusGeometry(radius * 1.02, 0.02, 8, 32, Math.PI * 1.5);
  const spout = new THREE.Mesh(spoutGeo, glassMat);
  spout.position.y = height;
  spout.rotation.x = Math.PI / 2;
  group.add(spout);

  // Graduation marks
  for (let i = 1; i <= 5; i++) {
    const markY = (height * i) / 6;
    const mark = new THREE.Mesh(
      new THREE.BoxGeometry(radius * 2, 0.008, 0.003),
      new THREE.MeshBasicMaterial({ color: 0x334455 })
    );
    mark.position.set(0, markY, radius * 1.001);
    group.add(mark);
  }

  // Handle (small lip)
  const handle = new THREE.Mesh(
    new THREE.BoxGeometry(0.08, 0.06, 0.05),
    glassMat
  );
  handle.position.set(radius + 0.02, height, 0);
  group.add(handle);

  // Liquid placeholder
  const liquid = new THREE.Mesh(
    new THREE.CylinderGeometry(radius * 0.92, radius * 0.88, 0.35, 32),
    liqMat
  );
  liquid.position.y = 0.18;
  liquid.userData = { isLiquid: true };
  group.add(liquid);

  // Meniscus surface
  const surface = new THREE.Mesh(
    new THREE.CircleGeometry(radius * 0.92, 32),
    liqMat
  );
  surface.rotation.x = -Math.PI / 2;
  surface.position.y = 0.35;
  group.add(surface);

  return group;
}

export function createErlenmeyerFlask(radius: number = 0.55, height: number = 0.9): THREE.Group {
  const group = new THREE.Group();
  const glassMat = createGlassMaterial();
  const liqMat = createLiquidMaterial(0x4fc3f7, 0x0288d1);

  // Conical body
  const bodyPoints = [
    new THREE.Vector2(0.58, 0),      // Bottom center
    new THREE.Vector2(0.60, 0.02),   // Bottom edge
    new THREE.Vector2(0.55, 0.5),    // Body slope
    new THREE.Vector2(0.32, 0.7),    // Neck transition
    new THREE.Vector2(0.14, 0.85),   // Neck
    new THREE.Vector2(0.13, 0.92),   // Rim outer
  ];
  const bodyGeo = new THREE.LatheGeometry(bodyPoints, 32);
  const body = new THREE.Mesh(bodyGeo, glassMat);
  body.userData = { interactive: true, name: 'Erlenmeyer Flask' };
  group.add(body);

  // Rim ring
  const rim = new THREE.Mesh(
    new THREE.TorusGeometry(0.13, 0.015, 8, 16),
    glassMat
  );
  rim.position.y = 0.91;
  rim.rotation.x = Math.PI / 2;
  group.add(rim);

  // Liquid
  const liquidPoints = [
    new THREE.Vector2(0.58, 0),
    new THREE.Vector2(0.57, 0.32),
    new THREE.Vector2(0.50, 0.35),
  ];
  const liqGeo = new THREE.LatheGeometry(liquidPoints, 32);
  const liquid = new THREE.Mesh(liqGeo, liqMat.clone());
  liquid.userData = { isLiquid: true };
  group.add(liquid);

  // Liquid surface
  const surf = new THREE.Mesh(
    new THREE.CircleGeometry(0.48, 32),
    liqMat.clone()
  );
  surf.rotation.x = -Math.PI / 2;
  surf.position.y = 0.35;
  group.add(surf);

  // Graduation marks on neck
  for (let i = 0; i < 3; i++) {
    const markY = 0.7 + i * 0.06;
    const markR = 0.32 - i * 0.06;
    const mark = new THREE.Mesh(
      new THREE.TorusGeometry(markR, 0.003, 4, 32),
      new THREE.MeshBasicMaterial({ color: 0x455a64 })
    );
    mark.position.y = markY;
    mark.rotation.x = Math.PI / 2;
    group.add(mark);
  }

  return group;
}

export function createVolumetricFlask(capacityML: number = 100): THREE.Group {
  const group = new THREE.Group();
  const glassMat = createGlassMaterial();
  const liqMat = createLiquidMaterial(0x80deea, 0x00838f);

  // Bulbous body
  const bodyPoints = [
    new THREE.Vector2(0.55, 0),       // Bottom
    new THREE.Vector2(0.57, 0.1),
    new THREE.Vector2(0.62, 0.25),
    new THREE.Vector2(0.60, 0.45),    // Bulb start
    new THREE.Vector2(0.045, 0.52),   // Neck narrow
    new THREE.Vector2(0.04, 0.72),    // Neck
    new THREE.Vector2(0.042, 0.80),   // Rim
  ];
  const bodyGeo = new THREE.LatheGeometry(bodyPoints, 32);
  const body = new THREE.Mesh(bodyGeo, glassMat);
  body.userData = { interactive: true, name: 'Volumetric Flask' };
  group.add(body);

  // Stopper (ground glass)
  const stopper = new THREE.Mesh(
    new THREE.ConeGeometry(0.045, 0.08, 16),
    createGlassMaterial(0xcfd8dc, 0.3)
  );
  stopper.position.y = 0.84;
  stopper.userData = { name: 'Flask Stopper', interactive: true, isLid: true };
  group.add(stopper);

  // Calibration mark on neck
  const calMark = new THREE.Mesh(
    new THREE.TorusGeometry(0.048, 0.004, 4, 32),
    new THREE.MeshBasicMaterial({ color: 0x1565c0 })
  );
  calMark.position.y = 0.68;
  calMark.rotation.x = Math.PI / 2;
  group.add(calMark);

  // Liquid (to calibration mark)
  const liqPoints = [
    new THREE.Vector2(0.55, 0),
    new THREE.Vector2(0.57, 0.1),
    new THREE.Vector2(0.62, 0.25),
    new THREE.Vector2(0.58, 0.48),
    new THREE.Vector2(0.04, 0.68),
  ];
  const liqGeo = new THREE.LatheGeometry(liqPoints, 32);
  const liquid = new THREE.Mesh(liqGeo, liqMat);
  liquid.userData = { isLiquid: true };
  group.add(liquid);

  return group;
}

export function createBurette(height: number = 2.2, volumeML: number = 50): THREE.Group {
  const group = new THREE.Group();
  const glassMat = createGlassMaterial(0xe8f4ff, 0.18);
  const liqMat = createLiquidMaterial(0x90caf9, 0x1565c0, 0.7);
  const metalMat = createMetalMaterial(0x334455);
  const rubberMat = createRubberMaterial(0x1a1a1a);

  // Main tube
  const tube = new THREE.Mesh(
    new THREE.CylinderGeometry(0.06, 0.06, height, 12, 1, true),
    glassMat
  );
  tube.position.y = height / 2;
  tube.userData = { interactive: true, name: 'Burette' };
  group.add(tube);

  // Top funnel
  const funnel = new THREE.Mesh(
    new THREE.CylinderGeometry(0.12, 0.07, 0.15, 12),
    glassMat
  );
  funnel.position.y = height + 0.075;
  group.add(funnel);

  // Stopcock (valve)
  const valveBody = new THREE.Mesh(
    new THREE.CylinderGeometry(0.05, 0.05, 0.12, 8),
    metalMat
  );
  valveBody.position.y = 0.12;
  valveBody.rotation.z = Math.PI / 2;
  valveBody.userData = { interactive: true, name: 'Burette Valve', isValve: true };
  group.add(valveBody);

  // Valve handle
  const handle = new THREE.Mesh(
    new THREE.CylinderGeometry(0.015, 0.02, 0.1, 6),
    createPlasticMaterial(0xd32f2f, 0.6)
  );
  handle.position.set(0.06, 0.12, 0);
  handle.rotation.z = Math.PI / 2;
  group.add(handle);

  // Tip (capillary)
  const tip = new THREE.Mesh(
    new THREE.ConeGeometry(0.025, 0.08, 8),
    glassMat
  );
  tip.position.y = 0.04;
  tip.rotation.x = Math.PI;
  group.add(tip);

  // Stand attachment
  const clamp = new THREE.Mesh(
    new THREE.BoxGeometry(0.08, 0.06, 0.15),
    metalMat
  );
  clamp.position.set(-0.12, height * 0.6, 0);
  group.add(clamp);

  // Liquid
  const liquid = new THREE.Mesh(
    new THREE.CylinderGeometry(0.052, 0.052, height * 0.75, 12),
    liqMat
  );
  liquid.position.y = height * 0.55;
  liquid.userData = { isLiquid: true };
  group.add(liquid);

  // Graduation marks (0-50 mL)
  for (let i = 0; i <= 50; i += 5) {
    const y = height * 0.2 + (i / 50) * height * 0.75;
    const isMajor = i % 10 === 0;
    const mark = new THREE.Mesh(
      new THREE.BoxGeometry(isMajor ? 0.08 : 0.05, 0.004, 0.003),
      new THREE.MeshBasicMaterial({ color: isMajor ? 0x1a237e : 0x455a64 })
    );
    mark.position.set(0.065, y, 0);
    group.add(mark);
  }

  return group;
}

export function createPipette(capacityML: number = 25): THREE.Group {
  const group = new THREE.Group();
  const glassMat = createGlassMaterial();
  const liqMat = createLiquidMaterial(0x90caf9, 0x1565c0, 0.75);
  const rubberMat = createRubberMaterial(0xf8bbd9);

  // Bulb (suction)
  const bulb = new THREE.Mesh(
    new THREE.SphereGeometry(0.12, 16, 12),
    rubberMat
  );
  bulb.position.y = 0.95;
  bulb.userData = { interactive: true, name: 'Pipette Bulb', isSuction: true };
  group.add(bulb);

  // Body tube
  const body = new THREE.Mesh(
    new THREE.CylinderGeometry(0.045, 0.04, 0.65, 12),
    glassMat
  );
  body.position.y = 0.55;
  body.userData = { interactive: true, name: 'Pipette' };
  group.add(body);

  // Upper tube (to bulb)
  const upperTube = new THREE.Mesh(
    new THREE.CylinderGeometry(0.025, 0.04, 0.12, 8),
    glassMat
  );
  upperTube.position.y = 0.83;
  group.add(upperTube);

  // Tip (capillary)
  const tip = new THREE.Mesh(
    new THREE.CylinderGeometry(0.008, 0.02, 0.2, 8),
    glassMat
  );
  tip.position.y = 0.12;
  group.add(tip);

  // Calibration bulb (volumetric pipette)
  const calBulb = new THREE.Mesh(
    new THREE.SphereGeometry(0.065, 12, 8),
    glassMat
  );
  calBulb.position.y = 0.35;
  group.add(calBulb);

  // Liquid (when filled)
  const liquid = new THREE.Mesh(
    new THREE.CylinderGeometry(0.035, 0.03, 0.45, 8),
    liqMat
  );
  liquid.position.y = 0.42;
  liquid.userData = { isLiquid: true };
  group.add(liquid);

  // Calibration mark
  const mark = new THREE.Mesh(
    new THREE.TorusGeometry(0.048, 0.004, 4, 16),
    new THREE.MeshBasicMaterial({ color: 0x1565c0 })
  );
  mark.position.y = 0.72;
  mark.rotation.x = Math.PI / 2;
  group.add(mark);

  return group;
}

export function createDropper(): THREE.Group {
  const group = new THREE.Group();
  const glassMat = createGlassMaterial();
  const liqMat = createLiquidMaterial(0x80cbc4, 0x00695c, 0.8);
  const rubberMat = createRubberMaterial(0xef5350);

  // Bulb
  const bulb = new THREE.Mesh(
    new THREE.SphereGeometry(0.08, 12, 8),
    rubberMat
  );
  bulb.position.y = 0.3;
  bulb.userData = { interactive: true, name: 'Dropper', isSuction: true };
  group.add(bulb);

  // Tube
  const tube = new THREE.Mesh(
    new THREE.CylinderGeometry(0.025, 0.02, 0.25, 8),
    glassMat
  );
  tube.position.y = 0.12;
  group.add(tube);

  // Tapered tip
  const tip = new THREE.Mesh(
    new THREE.ConeGeometry(0.015, 0.06, 8),
    glassMat
  );
  tip.position.y = 0.03;
  tip.rotation.x = Math.PI;
  group.add(tip);

  // Liquid drop (when loaded)
  const drop = new THREE.Mesh(
    new THREE.SphereGeometry(0.02, 8, 6),
    liqMat
  );
  drop.position.y = 0.08;
  drop.userData = { isDroplet: true };
  group.add(drop);

  return group;
}

export function createGraduatedCylinder(radius: number = 0.25, height: number = 1.0): THREE.Group {
  const group = new THREE.Group();
  const glassMat = createGlassMaterial(0xe8f4ff, 0.15);
  const liqMat = createLiquidMaterial(0x80deea, 0x00838f, 0.8);
  const plasticMat = createPlasticMaterial(0x37474f);

  // Main cylinder
  const cylinder = new THREE.Mesh(
    new THREE.CylinderGeometry(radius, radius, height, 32, 1, true),
    glassMat
  );
  cylinder.position.y = height / 2;
  cylinder.userData = { interactive: true, name: 'Graduated Cylinder' };
  group.add(cylinder);

  // Base (plastic)
  const base = new THREE.Mesh(
    new THREE.CylinderGeometry(radius * 1.15, radius * 1.2, 0.08, 32),
    plasticMat
  );
  base.position.y = 0.04;
  group.add(base);

  // Bottom glass
  const bottom = new THREE.Mesh(
    new THREE.CircleGeometry(radius, 32),
    glassMat
  );
  bottom.rotation.x = -Math.PI / 2;
  bottom.position.y = 0.08;
  group.add(bottom);

  // Spout
  const spout = new THREE.Mesh(
    new THREE.BoxGeometry(0.08, 0.04, 0.06),
    glassMat
  );
  spout.position.set(radius + 0.02, height, 0);
  group.add(spout);

  // Graduation marks (every 10 mL)
  for (let i = 0; i <= 10; i++) {
    const y = 0.1 + (i / 10) * (height - 0.15);
    const isMajor = i % 2 === 0;
    const mark = new THREE.Mesh(
      new THREE.BoxGeometry(isMajor ? 0.12 : 0.08, 0.006, 0.003),
      new THREE.MeshBasicMaterial({ color: isMajor ? 0x1a1a1a : 0x666666 })
    );
    mark.position.set(0, y, radius + 0.002);
    group.add(mark);

    // Numbers on major marks
    if (isMajor && i > 0) {
      const canvas = document.createElement('canvas');
      canvas.width = 32;
      canvas.height = 32;
      const ctx = canvas.getContext('2d')!;
      ctx.fillStyle = '#1a1a1a';
      ctx.font = 'bold 24px Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(`${i * 10}`, 16, 16);
      const tex = new THREE.CanvasTexture(canvas);
      const label = new THREE.Mesh(
        new THREE.PlaneGeometry(0.04, 0.04),
        new THREE.MeshBasicMaterial({ map: tex, transparent: true })
      );
      label.position.set(0.12, y, radius + 0.003);
      group.add(label);
    }
  }

  // Liquid
  const liquid = new THREE.Mesh(
    new THREE.CylinderGeometry(radius * 0.96, radius * 0.96, height * 0.4, 32),
    liqMat
  );
  liquid.position.y = height * 0.25;
  liquid.userData = { isLiquid: true };
  group.add(liquid);

  return group;
}

export function createTestTube(diameter: number = 0.065, height: number = 0.72): THREE.Group {
  const group = new THREE.Group();
  const glassMat = createGlassMaterial();

  // Tube body
  const tube = new THREE.Mesh(
    new THREE.CylinderGeometry(diameter / 2, diameter / 2 - 0.003, height, 16, 1, true),
    glassMat
  );
  tube.position.y = height / 2;
  tube.userData = { interactive: true, name: 'Test Tube' };
  group.add(tube);

  // Rounded bottom (hemisphere)
  const bottomCap = new THREE.Mesh(
    new THREE.SphereGeometry(diameter / 2 - 0.003, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2),
    glassMat
  );
  bottomCap.rotation.x = Math.PI;
  group.add(bottomCap);

  // Rim
  const rim = new THREE.Mesh(
    new THREE.TorusGeometry(diameter / 2, 0.005, 8, 16),
    glassMat
  );
  rim.position.y = height;
  rim.rotation.x = Math.PI / 2;
  group.add(rim);

  return group;
}

export function createThermometer(length: number = 0.3): THREE.Group {
  const group = new THREE.Group();
  const glassMat = createGlassMaterial(0xffffff, 0.25);
  const mercuryMat = new THREE.MeshStandardMaterial({ color: 0xd32f2f, emissive: 0xb71c1c, emissiveIntensity: 0.3 });

  // Main glass tube
  const tube = new THREE.Mesh(
    new THREE.CylinderGeometry(0.012, 0.012, length, 8),
    glassMat
  );
  tube.position.y = length / 2 + 0.03;
  tube.userData = { interactive: true, name: 'Thermometer' };
  group.add(tube);

  // Bulb at bottom
  const bulb = new THREE.Mesh(
    new THREE.SphereGeometry(0.02, 12, 8),
    glassMat
  );
  bulb.position.y = 0.02;
  group.add(bulb);

  // Mercury bulb
  const mercuryBulb = new THREE.Mesh(
    new THREE.SphereGeometry(0.014, 10, 6),
    mercuryMat
  );
  mercuryBulb.position.y = 0.02;
  group.add(mercuryBulb);

  // Mercury column (adjustable height)
  const mercuryCol = new THREE.Mesh(
    new THREE.CylinderGeometry(0.005, 0.005, length * 0.5, 8),
    mercuryMat
  );
  mercuryCol.position.y = length * 0.25 + 0.03;
  mercuryCol.userData = { isMercury: true };
  group.add(mercuryCol);

  // Scale marks
  for (let i = 0; i <= 10; i++) {
    const y = 0.05 + (i / 10) * length;
    const mark = new THREE.Mesh(
      new THREE.BoxGeometry(0.015, 0.002, 0.001),
      new THREE.MeshBasicMaterial({ color: 0x1a1a1a })
    );
    mark.position.set(0.015, y, 0);
    group.add(mark);
  }

  return group;
}

export function createBunsenBurner(): THREE.Group {
  const group = new THREE.Group();
  const metalMat = createMetalMaterial(0x455a64, 0.3);
  const brassMat = createMetalMaterial(0xc9a227, 0.2);

  // Base
  const base = new THREE.Mesh(
    new THREE.CylinderGeometry(0.08, 0.09, 0.06, 16),
    metalMat
  );
  base.position.y = 0.03;
  group.add(base);

  // Main tube
  const tube = new THREE.Mesh(
    new THREE.CylinderGeometry(0.025, 0.03, 0.25, 12),
    metalMat
  );
  tube.position.y = 0.185;
  group.add(tube);

  // Air hole collar (rotating)
  const collar = new THREE.Mesh(
    new THREE.CylinderGeometry(0.035, 0.035, 0.06, 12),
    brassMat
  );
  collar.position.y = 0.22;
  collar.userData = { interactive: true, name: 'Air Control Collar', isRotatable: true };
  group.add(collar);

  // Gas inlet pipe
  const inlet = new THREE.Mesh(
    new THREE.CylinderGeometry(0.008, 0.008, 0.15, 6),
    metalMat
  );
  inlet.position.set(0, 0.075, 0.06);
  inlet.rotation.x = Math.PI / 2;
  group.add(inlet);

  // Needle valve
  const valve = new THREE.Mesh(
    new THREE.BoxGeometry(0.02, 0.04, 0.04),
    brassMat
  );
  valve.position.set(0.06, 0.05, 0);
  valve.userData = { interactive: true, name: 'Gas Valve', isValve: true };
  group.add(valve);

  // Flame (when lit)
  const flameInner = new THREE.Mesh(
    new THREE.ConeGeometry(0.015, 0.12, 8),
    new THREE.MeshBasicMaterial({ color: 0x1565c0, transparent: true, opacity: 0.85 })
  );
  flameInner.position.y = 0.38;
  flameInner.userData = { isFlame: true, flameType: 'inner' };
  group.add(flameInner);

  const flameOuter = new THREE.Mesh(
    new THREE.ConeGeometry(0.028, 0.18, 8),
    new THREE.MeshBasicMaterial({ color: 0xff6f00, transparent: true, opacity: 0.7 })
  );
  flameOuter.position.y = 0.41;
  flameOuter.userData = { isFlame: true, flameType: 'outer' };
  group.add(flameOuter);

  return group;
}

export function createReagentBottle(capacityML: number = 250): THREE.Group {
  const group = new THREE.Group();
  const glassMat = createGlassMaterial(0xf8f8f8, 0.12);
  const liqMat = createLiquidMaterial(0x90caf9, 0x1565c0);
  const stopperMat = createGlassMaterial(0xcfd8dc, 0.4);

  // Bottle body
  const bodyPoints = [
    new THREE.Vector2(0.28, 0),
    new THREE.Vector2(0.30, 0.02),
    new THREE.Vector2(0.32, 0.15),
    new THREE.Vector2(0.33, 0.35),
    new THREE.Vector2(0.18, 0.45),   // Shoulder
    new THREE.Vector2(0.12, 0.52),   // Neck
    new THREE.Vector2(0.11, 0.58),   // Rim
  ];
  const bodyGeo = new THREE.LatheGeometry(bodyPoints, 32);
  const body = new THREE.Mesh(bodyGeo, glassMat);
  body.userData = { interactive: true, name: 'Reagent Bottle' };
  group.add(body);

  // Ground glass stopper
  const stopper = new THREE.Group();
  const stopperHead = new THREE.Mesh(
    new THREE.CylinderGeometry(0.06, 0.04, 0.03, 12),
    stopperMat
  );
  stopperHead.position.y = 0.62;
  stopper.add(stopperHead);

  const stopperPlug = new THREE.Mesh(
    new THREE.CylinderGeometry(0.10, 0.095, 0.05, 12),
    stopperMat
  );
  stopperPlug.position.y = 0.58;
  stopper.add(stopperPlug);

  stopper.userData = { interactive: true, name: 'Bottle Stopper', isLid: true };
  group.add(stopper);

  // Label placeholder (white rectangle)
  const labelGeo = new THREE.PlaneGeometry(0.22, 0.12);
  const labelMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
  const label = new THREE.Mesh(labelGeo, labelMat);
  label.position.set(0, 0.22, 0.33);
  group.add(label);

  // Liquid (50% fill)
  const liqPoints = [
    new THREE.Vector2(0.28, 0),
    new THREE.Vector2(0.31, 0.05),
    new THREE.Vector2(0.32, 0.18),
  ];
  const liqGeo = new THREE.LatheGeometry(liqPoints, 32);
  const liquid = new THREE.Mesh(liqGeo, liqMat);
  liquid.userData = { isLiquid: true };
  group.add(liquid);

  return group;
}

export function createWashBottle(): THREE.Group {
  const group = new THREE.Group();
  const plasticMat = createPlasticMaterial(0x64b5f6, 0.4);

  // Flatten body (squeeze bottle)
  const body = new THREE.Mesh(
    new THREE.CylinderGeometry(0.1, 0.1, 0.22, 16),
    plasticMat
  );
  body.scale.set(1, 1, 0.6);
  body.position.y = 0.11;
  body.userData = { interactive: true, name: 'Wash Bottle' };
  group.add(body);

  // Neck
  const neck = new THREE.Mesh(
    new THREE.CylinderGeometry(0.02, 0.035, 0.08, 8),
    plasticMat
  );
  neck.position.y = 0.26;
  group.add(neck);

  // Spout tube
  const spout = new THREE.Mesh(
    new THREE.CylinderGeometry(0.006, 0.007, 0.18, 6),
    plasticMat
  );
  spout.position.set(0.08, 0.36, 0);
  spout.rotation.z = -Math.PI / 6;
  group.add(spout);

  // Cap
  const cap = new THREE.Mesh(
    new THREE.CylinderGeometry(0.025, 0.025, 0.02, 8),
    createPlasticMaterial(0x1976d2)
  );
  cap.position.set(0.08, 0.46, 0);
  group.add(cap);

  return group;
}

export function createGlassRod(length: number = 0.3): THREE.Group {
  const group = new THREE.Group();
  const glassMat = createGlassMaterial(0xfafafa, 0.35);

  // Rod
  const rod = new THREE.Mesh(
    new THREE.CylinderGeometry(0.012, 0.012, length, 12),
    glassMat
  );
  rod.position.y = length / 2;
  rod.userData = { interactive: true, name: 'Glass Rod' };
  group.add(rod);

  // Rounded ends (fire-polished)
  const endTop = new THREE.Mesh(
    new THREE.SphereGeometry(0.012, 8, 6),
    glassMat
  );
  endTop.position.y = length;
  group.add(endTop);

  const endBot = new THREE.Mesh(
    new THREE.SphereGeometry(0.012, 8, 6),
    glassMat
  );
  group.add(endBot);

  return group;
}

export function createFunnel(): THREE.Group {
  const group = new THREE.Group();
  const glassMat = createGlassMaterial();

  // Conical top
  const cone = new THREE.Mesh(
    new THREE.CylinderGeometry(0.18, 0.02, 0.12, 24, 1, true),
    glassMat
  );
  cone.position.y = 0.08;
  cone.userData = { interactive: true, name: 'Funnel' };
  group.add(cone);

  // Stem
  const stem = new THREE.Mesh(
    new THREE.CylinderGeometry(0.018, 0.018, 0.15, 8),
    glassMat
  );
  stem.position.y = -0.075;
  group.add(stem);

  // Rim
  const rim = new THREE.Mesh(
    new THREE.TorusGeometry(0.18, 0.006, 8, 24),
    glassMat
  );
  rim.position.y = 0.14;
  rim.rotation.x = Math.PI / 2;
  group.add(rim);

  return group;
}

export function createWatchGlass(radius: number = 0.12): THREE.Group {
  const group = new THREE.Group();
  const glassMat = createGlassMaterial(0xffffff, 0.15);

  // Concave disc
  const disc = new THREE.Mesh(
    new THREE.SphereGeometry(radius * 1.4, 24, 12, 0, Math.PI * 2, 0, Math.PI / 7),
    glassMat
  );
  disc.userData = { interactive: true, name: 'Watch Glass' };
  group.add(disc);

  return group;
}

export function createSpatula(): THREE.Group {
  const group = new THREE.Group();
  const metalMat = createMetalMaterial(0x78909c, 0.3);

  // Handle
  const handle = new THREE.Mesh(
    new THREE.CylinderGeometry(0.008, 0.01, 0.15, 8),
    metalMat
  );
  handle.position.y = 0.075;
  handle.userData = { interactive: true, name: 'Spatula' };
  group.add(handle);

  // Spade end
  const spade = new THREE.Mesh(
    new THREE.BoxGeometry(0.03, 0.06, 0.004),
    metalMat
  );
  spade.position.y = 0.18;
  group.add(spade);

  // Spoon end (rounded)
  const spoon = new THREE.Mesh(
    new THREE.SphereGeometry(0.02, 8, 6, 0, Math.PI * 2, 0, Math.PI / 2),
    metalMat
  );
  spoon.position.set(0, -0.02, 0);
  spoon.rotation.x = Math.PI;
  group.add(spoon);

  return group;
}

export function createCrucible(): THREE.Group {
  const group = new THREE.Group();
  const ceramicMat = createCeramicMaterial(0xfafafa);
  const lidMat = createCeramicMaterial(0xf5f5f5);

  // Bowl
  const bowlPoints = [
    new THREE.Vector2(0.22, 0),
    new THREE.Vector2(0.24, 0.02),
    new THREE.Vector2(0.25, 0.08),
    new THREE.Vector2(0.22, 0.10),
  ];
  const bowlGeo = new THREE.LatheGeometry(bowlPoints, 24);
  const bowl = new THREE.Mesh(bowlGeo, ceramicMat);
  bowl.userData = { interactive: true, name: 'Crucible' };
  group.add(bowl);

  // Lid
  const lid = new THREE.Mesh(
    new THREE.SphereGeometry(0.26, 16, 8, 0, Math.PI * 2, 0, Math.PI / 4),
    lidMat
  );
  lid.position.y = 0.12;
  lid.userData = { name: 'Crucible Lid', interactive: true, isLid: true };
  group.add(lid);

  // Lid handle
  const lidHandle = new THREE.Mesh(
    new THREE.CylinderGeometry(0.02, 0.025, 0.04, 8),
    ceramicMat
  );
  lidHandle.position.y = 0.32;
  group.add(lidHandle);

  return group;
}

export function createBalance(): THREE.Group {
  const group = new THREE.Group();
  const metalMat = createMetalMaterial(0x37474f, 0.25);
  const panMat = createMetalMaterial(0xcfd8dc, 0.15);

  // Base housing
  const base = new THREE.Mesh(
    new THREE.BoxGeometry(0.25, 0.08, 0.18),
    metalMat
  );
  base.position.y = 0.04;
  group.add(base);

  // Display
  const display = new THREE.Mesh(
    new THREE.BoxGeometry(0.08, 0.04, 0.01),
    new THREE.MeshBasicMaterial({ color: 0x1b5e20 })
  );
  display.position.set(0, 0.10, -0.08);
  display.userData = { name: 'Balance Display', interactive: true };
  group.add(display);

  // Weighing pan
  const pan = new THREE.Mesh(
    new THREE.CylinderGeometry(0.1, 0.095, 0.015, 24),
    panMat
  );
  pan.position.y = 0.1;
  pan.userData = { interactive: true, name: 'Weighing Pan', isDropTarget: true };
  group.add(pan);

  // Tare button
  const tareBtn = new THREE.Mesh(
    new THREE.CylinderGeometry(0.015, 0.015, 0.01, 12),
    createPlasticMaterial(0x4caf50)
  );
  tareBtn.position.set(0.08, 0.09, 0.06);
  tareBtn.userData = { interactive: true, name: 'Tare Button' };
  group.add(tareBtn);

  return group;
}
