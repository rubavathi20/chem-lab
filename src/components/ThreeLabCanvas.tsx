import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { buildVRLabRoom, ExperimentStationData } from './VRLabScene';

// ─── Types ──────────────────────────────────────────────────────────────────
interface Props {
  reactionColor: string;
  hasGas: boolean;
  hasPrecipitate: boolean;
  isVRMode?: boolean;
  isStereoMode?: boolean;
  isDeviceOrientation?: boolean;
  isPerfMode?: boolean;
  experimentStations?: ExperimentStationData[];
  onObjectClick?: (objectName: string) => void;
  onPour?: (from: string, to: string) => void;
}

interface EquipmentEntry {
  mesh: THREE.Object3D;
  liquid: THREE.Mesh | null;
  position: THREE.Vector3;
  baseEmissive: THREE.Color;
  baseMat: THREE.MeshPhysicalMaterial | null;
  // Chemistry contents
  contents: string[];       // chemical names inside
  liquidColor: THREE.Color; // current liquid color
}

// ─── Real Chemistry Reaction Engine ─────────────────────────────────────────
interface ReactionOutcome {
  color: THREE.Color;
  hexStr: string;
  label: string;
  hasGas: boolean;
  hasPrecip: boolean;
  tempDelta: number; // degrees C change
}

const CHEM_BASE_COLORS: Record<string, string> = {
  'CuSO₄ (aq)': '#1565c0',
  'K₂Cr₂O₇ (aq)': '#e65100',
  'NiSO₄ (aq)': '#2e7d32',
  'KMnO₄ (aq)': '#6a1b9a',
  'I₂ / KI (aq)': '#795548',
  'Co(NO₃)₂ (aq)': '#c62828',
  'Burette': '#90caf9',
  'Beaker': '#80deea',
  'Erlenmeyer Flask': '#e8f4f8',
  'Pipette': '#e8f4f8',
};

function hexToColor(hex: string): THREE.Color {
  return new THREE.Color(hex);
}

function computeReaction(from: string, to: string, fromContents: string[], toContents: string[]): ReactionOutcome {
  // Combine for lookup
  const allChems = [...new Set([...fromContents, ...toContents, from, to])];

  // CuSO4 + NaOH → bright blue precipitate
  if (allChems.includes('CuSO₄ (aq)') && (to === 'Beaker' || to === 'Erlenmeyer Flask') && from !== 'Burette') {
    return { color: hexToColor('#1565c0'), hexStr: '#1565c0', label: 'CuSO₄ solution — deep blue', hasGas: false, hasPrecip: false, tempDelta: 0 };
  }

  // Titration: Burette (NaOH) → Flask with acid
  if (from === 'Burette' && to === 'Erlenmeyer Flask') {
    return { color: hexToColor('#f48fb1'), hexStr: '#f48fb1', label: 'Neutralisation — pale pink endpoint!', hasGas: false, hasPrecip: false, tempDelta: 2 };
  }
  if (from === 'Burette' && to === 'Beaker') {
    return { color: hexToColor('#ff8a80'), hexStr: '#ff8a80', label: 'Acid-base reaction', hasGas: false, hasPrecip: false, tempDelta: 2 };
  }

  // KMnO4 + any reducing agent → decolorises
  if (from === 'KMnO₄ (aq)') {
    return { color: hexToColor('#6a1b9a'), hexStr: '#6a1b9a', label: 'KMnO₄ — potent oxidiser, purple', hasGas: false, hasPrecip: false, tempDelta: 0 };
  }
  if (to === 'KMnO₄ (aq)' || toContents.includes('KMnO₄ (aq)')) {
    // Reducing agent decolourises permanganate
    return { color: hexToColor('#e0e0e0'), hexStr: '#e0e0e0', label: 'Permanganate decolorised!', hasGas: true, hasPrecip: false, tempDelta: 3 };
  }

  // I2/KI → starch gives dark blue
  if (from === 'I₂ / KI (aq)') {
    return { color: hexToColor('#1a237e'), hexStr: '#1a237e', label: 'Iodine — amber brown', hasGas: false, hasPrecip: false, tempDelta: 0 };
  }

  // K2Cr2O7 → orange/yellow, strong oxidiser
  if (from === 'K₂Cr₂O₇ (aq)') {
    return { color: hexToColor('#e65100'), hexStr: '#e65100', label: 'Dichromate — orange', hasGas: false, hasPrecip: false, tempDelta: 0 };
  }

  // NiSO4 → green
  if (from === 'NiSO₄ (aq)') {
    return { color: hexToColor('#2e7d32'), hexStr: '#2e7d32', label: 'Nickel sulfate — green', hasGas: false, hasPrecip: false, tempDelta: 0 };
  }

  // Co(NO3)2 → red
  if (from === 'Co(NO₃)₂ (aq)') {
    return { color: hexToColor('#c62828'), hexStr: '#c62828', label: 'Cobalt nitrate — red', hasGas: false, hasPrecip: false, tempDelta: 0 };
  }

  // Mixing test tubes: blend colours
  const fromHex = CHEM_BASE_COLORS[from] ?? '#90caf9';
  const toHex = CHEM_BASE_COLORS[to] ?? '#e8f4f8';
  const blended = hexToColor(fromHex).lerp(hexToColor(toHex), 0.5);
  return { color: blended, hexStr: '#' + blended.getHexString(), label: `Mixed: ${from} + ${to}`, hasGas: false, hasPrecip: false, tempDelta: 0 };
}

// ─── Helpers ────────────────────────────────────────────────────────────────
function hexToRGB(hex: string) {
  const r = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return r ? { r: parseInt(r[1], 16) / 255, g: parseInt(r[2], 16) / 255, b: parseInt(r[3], 16) / 255 } : { r: 0.9, g: 0.95, b: 1 };
}

function lerp(a: number, b: number, t: number) { return a + (b - a) * t; }

// Proper device orientation to quaternion (accounts for screen orientation)
function deviceOrientationToQuaternion(alpha: number, beta: number, gamma: number): THREE.Quaternion {
  // q1 corrects world alignment when device is portrait
  const q1 = new THREE.Quaternion(-Math.sqrt(0.5), 0, 0, Math.sqrt(0.5));
  const euler = new THREE.Euler(
    THREE.MathUtils.degToRad(beta),
    THREE.MathUtils.degToRad(alpha),
    THREE.MathUtils.degToRad(-gamma),
    'YXZ'
  );
  const q = new THREE.Quaternion().setFromEuler(euler);
  q.multiply(q1);
  // Compensate for landscape screen orientation
  const orient = (screen.orientation?.angle ?? (typeof window.orientation !== 'undefined' ? window.orientation as number : 0));
  if (orient !== 0) {
    const screenAngle = THREE.MathUtils.degToRad(-orient);
    const sq = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), screenAngle);
    q.multiply(sq);
  }
  return q;
}

// ─── Main Component ──────────────────────────────────────────────────────────
export default function ThreeLabCanvas({
  reactionColor,
  hasGas,
  hasPrecipitate,
  isVRMode = false,
  isStereoMode = false,
  isDeviceOrientation = false,
  isPerfMode = false,
  experimentStations = [],
  onObjectClick,
  onPour,
}: Props) {
  const mountRef = useRef<HTMLDivElement>(null);
  const [heldItem, setHeldItem] = useState<string | null>(null);
  const [gazeTarget, setGazeTarget] = useState<string | null>(null);
  const [gazeProgress, setGazeProgress] = useState(0);
  const [interactionMsg, setInteractionMsg] = useState<string | null>(null);
  const [pourTarget, setPourTarget] = useState<string | null>(null); // while dragging toward vessel

  const heldRef = useRef<string | null>(null);
  const interactionRef = useRef<Map<string, EquipmentEntry>>(new Map());
  const pourRef = useRef<THREE.Points[]>([]);
  const sceneRef = useRef<{
    renderer: THREE.WebGLRenderer;
    scene: THREE.Scene;
    camera: THREE.PerspectiveCamera;
    leftCamera: THREE.PerspectiveCamera;
    rightCamera: THREE.PerspectiveCamera;
    frameId: number;
    liquid: THREE.Mesh;
    buretteLiquid: THREE.Mesh;
    particles: THREE.Points[];
    time: number;
  } | null>(null);
  const pourTargetRef = useRef<string | null>(null);

  function flashMsg(msg: string) {
    setInteractionMsg(msg);
    setTimeout(() => setInteractionMsg(null), 2800);
  }

  useEffect(() => {
    if (!mountRef.current) return;

    const width = mountRef.current.clientWidth;
    const height = mountRef.current.clientHeight;

    // ── Scene ──
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0a0f1e);

    // ── Cameras ──
    const camera = new THREE.PerspectiveCamera(isVRMode ? 75 : 52, width / height, 0.01, isVRMode ? 1000 : 100);
    const eyeSep = 0.064;
    const leftCamera = new THREE.PerspectiveCamera(75, width / 2 / height, 0.01, 1000);
    const rightCamera = new THREE.PerspectiveCamera(75, width / 2 / height, 0.01, 1000);

    const orbit = { theta: 0, phi: Math.PI / 7, radius: isVRMode ? 0 : 7 };

    function applyOrbitCamera() {
      if (isVRMode) return;
      const x = orbit.radius * Math.sin(orbit.theta) * Math.cos(orbit.phi);
      const y = Math.max(0.5, orbit.radius * Math.sin(orbit.phi));
      const z = orbit.radius * Math.cos(orbit.theta) * Math.cos(orbit.phi);
      camera.position.set(x, y + 0.2, z);
      camera.lookAt(0, 0.5, 0);
    }

    if (isVRMode) {
      camera.position.set(0, 1.6, 0);
      leftCamera.position.set(-eyeSep / 2, 1.6, 0);
      rightCamera.position.set(eyeSep / 2, 1.6, 0);
    } else {
      applyOrbitCamera();
    }

    // ── Renderer ──
    const renderer = new THREE.WebGLRenderer({ antialias: !isPerfMode, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(isPerfMode ? 1 : Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = !isPerfMode;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    mountRef.current.appendChild(renderer.domElement);

    // ── Lighting ──
    scene.add(new THREE.AmbientLight(0x1a2a4a, isVRMode ? 1.3 : 1.0));
    const pointLight = new THREE.PointLight(0x00e5ff, isVRMode ? 2.2 : 1.8, 25);
    pointLight.position.set(-2, 4, 2);
    pointLight.castShadow = true;
    scene.add(pointLight);
    const rimLight = new THREE.PointLight(0x4488ff, isVRMode ? 1.3 : 1.0, 18);
    rimLight.position.set(3, 3, -2);
    scene.add(rimLight);
    const dirLight = new THREE.DirectionalLight(0xffffff, 0.6);
    dirLight.position.set(0, 8, 4);
    scene.add(dirLight);

    // ── Glass material ──
    const glassMat = new THREE.MeshPhysicalMaterial({
      color: 0xe8f4ff, transparent: true, opacity: 0.2,
      roughness: 0.02, metalness: 0, transmission: 0.96, thickness: 0.3,
    });

    function makeLiqMat(color: number, emissive: number, opacity = 0.82): THREE.MeshPhysicalMaterial {
      return new THREE.MeshPhysicalMaterial({
        color, emissive, emissiveIntensity: 0.25, transparent: true, opacity,
        roughness: 0.06, transmission: 0.15,
      });
    }

    // ── VR room or bench ──
    const eqOffset = isVRMode ? { y: 0.9, z: -3 } : { y: -0.42, z: 0 };

    if (isVRMode) {
      const stations = experimentStations.length > 0 ? experimentStations
        : [{ id: 'default', title: 'Chemistry Lab', category: 'General', difficulty: 'beginner', chemicals: [], equipment: [] }];
      const roomRefs = buildVRLabRoom(stations);
      scene.add(roomRefs.group);
      scene.fog = new THREE.FogExp2(0x0a0f1e, 0.018);
      roomRefs.interactiveObjects.forEach(obj => {
        if (obj.userData?.name) {
          interactionRef.current.set(obj.userData.name as string, {
            mesh: obj, liquid: null, position: new THREE.Vector3(),
            baseEmissive: new THREE.Color(0, 0, 0), baseMat: null,
            contents: [], liquidColor: new THREE.Color(0xe8f4ff),
          });
        }
      });
    } else {
      scene.fog = new THREE.FogExp2(0x0a0f1e, 0.04);
      const bench = new THREE.Mesh(new THREE.BoxGeometry(10, 0.15, 3.5), new THREE.MeshStandardMaterial({ color: 0x1a2535, roughness: 0.8 }));
      bench.position.y = -0.5;
      bench.receiveShadow = true;
      scene.add(bench);
      [[-4.5, -1.5, -1.5], [4.5, -1.5, -1.5], [-4.5, -1.5, 1.5], [4.5, -1.5, 1.5]].forEach(([x, y, z]) => {
        const leg = new THREE.Mesh(new THREE.BoxGeometry(0.1, 2, 0.1), new THREE.MeshStandardMaterial({ color: 0x111827, metalness: 0.6 }));
        leg.position.set(x, y, z); scene.add(leg);
      });
      scene.add(Object.assign(new THREE.GridHelper(10, 20, 0x1e3a5f, 0x0d1f35), { position: new THREE.Vector3(0, -0.42, -0.25) }));
    }

    function registerEquipment(name: string, mesh: THREE.Object3D, liquid: THREE.Mesh | null, worldPos: THREE.Vector3, initColor?: string) {
      const mat = (mesh as THREE.Mesh).material as THREE.MeshPhysicalMaterial | null;
      interactionRef.current.set(name, {
        mesh, liquid, position: worldPos.clone(),
        baseEmissive: mat ? (mat.emissive?.clone() ?? new THREE.Color(0, 0, 0)) : new THREE.Color(0, 0, 0),
        baseMat: mat ?? null,
        contents: [],
        liquidColor: new THREE.Color(initColor ?? '#e8f4ff'),
      });
    }

    // ── Erlenmeyer Flask ──
    const flaskGroup = new THREE.Group();
    flaskGroup.position.set(isVRMode ? 0 : -0.5, eqOffset.y, eqOffset.z);
    scene.add(flaskGroup);

    const flaskBody = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.65, 1.0, 32, 1, true), glassMat);
    flaskBody.position.y = 0.5;
    flaskBody.userData = { name: 'Erlenmeyer Flask', interactive: true };
    flaskGroup.add(flaskBody);
    const flaskNeck = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.35, 0.6, 16, 1, true), glassMat);
    flaskNeck.position.y = 1.3;
    flaskGroup.add(flaskNeck);
    flaskGroup.add(Object.assign(new THREE.Mesh(new THREE.TorusGeometry(0.15, 0.02, 8, 16), new THREE.MeshStandardMaterial({ color: 0x88aabb, metalness: 0.3 })), { position: new THREE.Vector3(0, 1.6, 0) }));
    const flaskBottom = new THREE.Mesh(new THREE.CircleGeometry(0.65, 32), glassMat);
    flaskBottom.rotation.x = -Math.PI / 2;
    flaskGroup.add(flaskBottom);

    const { r, g, b } = hexToRGB(reactionColor);
    const liquidMat = new THREE.MeshPhysicalMaterial({
      color: new THREE.Color(r, g, b), emissive: new THREE.Color(r * 0.4, g * 0.4, b * 0.4),
      emissiveIntensity: 0.3, transparent: true, opacity: 0.82, roughness: 0.06, transmission: 0.15,
    });
    const liquid = new THREE.Mesh(new THREE.CylinderGeometry(0.58, 0.63, 0.5, 32), liquidMat);
    liquid.position.y = 0.25;
    flaskGroup.add(liquid);
    const flaskSurface = new THREE.Mesh(new THREE.CircleGeometry(0.58, 32), liquidMat.clone());
    flaskSurface.rotation.x = -Math.PI / 2;
    flaskSurface.position.y = 0.5;
    flaskGroup.add(flaskSurface);

    const flaskWP = new THREE.Vector3(); flaskGroup.getWorldPosition(flaskWP); flaskWP.y += 0.8;
    registerEquipment('Erlenmeyer Flask', flaskBody, liquid, flaskWP, reactionColor);

    // ── Burette ──
    const buretteGroup = new THREE.Group();
    buretteGroup.position.set(isVRMode ? 1.5 : 1.5, eqOffset.y, eqOffset.z);
    scene.add(buretteGroup);

    const buretteTube = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 2.5, 12),
      new THREE.MeshPhysicalMaterial({ color: 0xe8f4ff, transparent: true, opacity: 0.25, roughness: 0.02 }));
    buretteTube.position.y = 1.25;
    buretteTube.userData = { name: 'Burette', interactive: true };
    buretteGroup.add(buretteTube);

    const buretteLiquidMat = new THREE.MeshPhysicalMaterial({ color: 0x90caf9, emissive: 0x1565c0, emissiveIntensity: 0.15, transparent: true, opacity: 0.65, roughness: 0.04, transmission: 0.3 });
    const buretteLiquid = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.055, 1.8, 12), buretteLiquidMat);
    buretteLiquid.position.y = 1.5;
    buretteGroup.add(buretteLiquid);

    const valve = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.12, 8), new THREE.MeshStandardMaterial({ color: 0x334455, metalness: 0.7 }));
    valve.rotation.z = Math.PI / 2;
    valve.position.set(0, 0.05, 0);
    valve.userData = { name: 'Burette Valve', interactive: true };
    buretteGroup.add(valve);
    const stand = new THREE.Mesh(new THREE.BoxGeometry(0.05, 3, 0.05), new THREE.MeshStandardMaterial({ color: 0x334455, metalness: 0.8 }));
    stand.position.set(-0.3, 1, 0);
    buretteGroup.add(stand);
    buretteGroup.add(Object.assign(new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.08, 0.1), new THREE.MeshStandardMaterial({ color: 0x556677, metalness: 0.6 })), { position: new THREE.Vector3(-0.15, 1.6, 0) }));
    buretteGroup.add(Object.assign(new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.05, 0.6), new THREE.MeshStandardMaterial({ color: 0x1a2535, metalness: 0.4 })), {}));

    const burWP = new THREE.Vector3(); buretteGroup.getWorldPosition(burWP); burWP.y += 1.5;
    registerEquipment('Burette', buretteTube, buretteLiquid, burWP, '#90caf9');

    // ── Test tube rack ──
    const testTubesGroup = new THREE.Group();
    testTubesGroup.position.set(isVRMode ? -2.5 : -2.2, eqOffset.y, eqOffset.z);
    scene.add(testTubesGroup);

    const chemTubes = [
      { color: 0x1565c0, emissive: 0x0d47a1, name: 'CuSO₄ (aq)', hexStr: '#1565c0' },
      { color: 0xf57f17, emissive: 0xe65100, name: 'K₂Cr₂O₇ (aq)', hexStr: '#f57f17' },
      { color: 0x2e7d32, emissive: 0x1b5e20, name: 'NiSO₄ (aq)', hexStr: '#2e7d32' },
      { color: 0x4a148c, emissive: 0x6a0080, name: 'KMnO₄ (aq)', hexStr: '#4a148c' },
    ];

    testTubesGroup.add(Object.assign(new THREE.Mesh(new THREE.BoxGeometry(1, 0.04, 0.14), new THREE.MeshStandardMaterial({ color: 0x263238, roughness: 0.7 })), { position: new THREE.Vector3(0, 0.02, 0) }));
    testTubesGroup.add(Object.assign(new THREE.Mesh(new THREE.BoxGeometry(1, 0.04, 0.14), new THREE.MeshStandardMaterial({ color: 0x263238, roughness: 0.7 })), { position: new THREE.Vector3(0, 0.92, 0) }));

    chemTubes.forEach((ct, i) => {
      const xPos = i * 0.22 - 0.33;
      const tube = new THREE.Mesh(
        new THREE.CylinderGeometry(0.062, 0.058, 0.72, 16, 1, true),
        new THREE.MeshPhysicalMaterial({ color: 0xe8f4ff, transparent: true, opacity: 0.22, roughness: 0.02, transmission: 0.95 })
      );
      tube.position.set(xPos, 0.55, 0);
      tube.userData = { name: ct.name, interactive: true };
      testTubesGroup.add(tube);
      const cap = new THREE.Mesh(new THREE.SphereGeometry(0.058, 12, 6, 0, Math.PI * 2, 0, Math.PI / 2), glassMat.clone());
      cap.rotation.x = Math.PI; cap.position.set(xPos, 0.19, 0);
      testTubesGroup.add(cap);
      const fillH = 0.18 + i * 0.06;
      const liqMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, fillH, 16), makeLiqMat(ct.color, ct.emissive, 0.88));
      liqMesh.position.set(xPos, 0.2 + fillH / 2, 0);
      testTubesGroup.add(liqMesh);
      const tubeWP = new THREE.Vector3(); testTubesGroup.getWorldPosition(tubeWP); tubeWP.x += xPos; tubeWP.y += 0.55;
      registerEquipment(ct.name, tube, liqMesh, tubeWP, ct.hexStr);
    });

    // ── Beaker with stirrer ──
    const beakerGroup = new THREE.Group();
    beakerGroup.position.set(isVRMode ? 2.5 : 2.5, eqOffset.y, eqOffset.z);
    scene.add(beakerGroup);

    const beaker = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.35, 0.8, 24, 1, true),
      new THREE.MeshPhysicalMaterial({ color: 0xe8f4ff, transparent: true, opacity: 0.2, roughness: 0.02 }));
    beaker.position.y = 0.4;
    beaker.userData = { name: 'Beaker', interactive: true };
    beakerGroup.add(beaker);
    beakerGroup.add(Object.assign(new THREE.Mesh(new THREE.CircleGeometry(0.35, 24), glassMat), { rotation: new THREE.Euler(-Math.PI / 2, 0, 0) }));

    const beakerLiqMat = new THREE.MeshPhysicalMaterial({ color: 0x4fc3f7, emissive: 0x01579b, emissiveIntensity: 0.2, transparent: true, opacity: 0.72, roughness: 0.05, transmission: 0.25 });
    const beakerLiquid = new THREE.Mesh(new THREE.CylinderGeometry(0.345, 0.305, 0.48, 24), beakerLiqMat);
    beakerLiquid.position.y = 0.24;
    beakerGroup.add(beakerLiquid);
    const bkSurface = new THREE.Mesh(new THREE.CircleGeometry(0.345, 24), beakerLiqMat.clone());
    bkSurface.rotation.x = -Math.PI / 2; bkSurface.position.y = 0.48;
    beakerGroup.add(bkSurface);
    const stirrer = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 1, 8), new THREE.MeshStandardMaterial({ color: 0xaaaaaa, metalness: 0.8 }));
    stirrer.position.set(0.1, 0.5, 0); stirrer.rotation.z = 0.3;
    beakerGroup.add(stirrer);

    const bkWP = new THREE.Vector3(); beakerGroup.getWorldPosition(bkWP); bkWP.y += 0.5;
    registerEquipment('Beaker', beaker, beakerLiquid, bkWP, '#4fc3f7');

    // ── Pipette ──
    const pipetteGroup = new THREE.Group();
    pipetteGroup.position.set(isVRMode ? -1 : -3.5, eqOffset.y, eqOffset.z);
    scene.add(pipetteGroup);

    const pipetteBody = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.03, 0.8, 12, 1, true),
      new THREE.MeshPhysicalMaterial({ color: 0xe8f4ff, transparent: true, opacity: 0.25, roughness: 0.02 }));
    pipetteBody.position.y = 0.5;
    pipetteBody.userData = { name: 'Pipette', interactive: true };
    pipetteGroup.add(pipetteBody);

    const pipetteBulb = new THREE.Mesh(new THREE.SphereGeometry(0.12, 16, 12),
      new THREE.MeshPhysicalMaterial({ color: 0xf8bbd9, transparent: true, opacity: 0.7, roughness: 0.15 }));
    pipetteBulb.position.y = 1.0;
    pipetteGroup.add(pipetteBulb);

    const pipetteTip = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.015, 0.25, 8, 1, true),
      new THREE.MeshPhysicalMaterial({ color: 0xe8f4ff, transparent: true, opacity: 0.3, roughness: 0.02 }));
    pipetteTip.position.y = 0.07;
    pipetteGroup.add(pipetteTip);

    // Pipette liquid fill
    const pipetteLiqMat = new THREE.MeshPhysicalMaterial({ color: 0x90caf9, transparent: true, opacity: 0.7, roughness: 0.05 });
    const pipetteLiq = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.02, 0.4, 8), pipetteLiqMat);
    pipetteLiq.position.y = 0.5;
    pipetteGroup.add(pipetteLiq);

    const pipetteWP = new THREE.Vector3(); pipetteGroup.getWorldPosition(pipetteWP); pipetteWP.y += 0.6;
    registerEquipment('Pipette', pipetteBody, pipetteLiq, pipetteWP, '#90caf9');

    // ── Drop animation ──
    let dropGroup: THREE.Group | null = null;
    let dropAnimT = 0;
    let isDripping = false;
    let dropFrom = new THREE.Vector3();
    let dropTo = new THREE.Vector3();
    let dropColor = 0x90caf9;

    function startDripAnimation(from: THREE.Vector3, to: THREE.Vector3, color: number) {
      if (dropGroup) { scene.remove(dropGroup); }
      dropGroup = new THREE.Group();
      dropAnimT = 0;
      isDripping = true;
      dropFrom = from.clone();
      dropTo = to.clone();
      dropColor = color;
      // Create 6 drop spheres
      for (let i = 0; i < 6; i++) {
        const drop = new THREE.Mesh(
          new THREE.SphereGeometry(0.04 - i * 0.004, 8, 6),
          new THREE.MeshPhysicalMaterial({ color, transparent: true, opacity: 0.9, roughness: 0.1 })
        );
        dropGroup.add(drop);
      }
      scene.add(dropGroup);
    }

    // ── Particles ──
    const particles: THREE.Points[] = [];

    function createGasParticles() {
      const geo = new THREE.BufferGeometry();
      const count = isVRMode ? 150 : 80;
      const pos = new Float32Array(count * 3);
      for (let i = 0; i < count; i++) {
        pos[i * 3] = (Math.random() - 0.5) * 0.8 + (isVRMode ? 0 : -0.5);
        pos[i * 3 + 1] = Math.random() * 1.5 + 1.5;
        pos[i * 3 + 2] = (Math.random() - 0.5) * 0.8 + eqOffset.z;
      }
      geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      const pts = new THREE.Points(geo, new THREE.PointsMaterial({ color: 0xaaffff, size: 0.04, transparent: true, opacity: 0.7 }));
      scene.add(pts);
      particles.push(pts);
    }

    function createPrecipitate() {
      const geo = new THREE.BufferGeometry();
      const count = isVRMode ? 200 : 120;
      const pos = new Float32Array(count * 3);
      for (let i = 0; i < count; i++) {
        const r2 = Math.random() * 0.55;
        const a = Math.random() * Math.PI * 2;
        pos[i * 3] = Math.cos(a) * r2 + (isVRMode ? 0 : -0.5);
        pos[i * 3 + 1] = Math.random() * 0.4 + (isVRMode ? 0.9 : -0.4);
        pos[i * 3 + 2] = Math.sin(a) * r2 + eqOffset.z;
      }
      geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      const pts = new THREE.Points(geo, new THREE.PointsMaterial({ color: 0xffffff, size: 0.02, transparent: true, opacity: 0.8 }));
      scene.add(pts);
      particles.push(pts);
    }

    // ── Pour animation (arc stream) ──
    function triggerPourAnimation(fromPos: THREE.Vector3, toPos: THREE.Vector3, color: number) {
      const count = 60;
      const geo = new THREE.BufferGeometry();
      const pos = new Float32Array(count * 3);
      geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      const mat = new THREE.PointsMaterial({ color, size: 0.05, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false });
      const pts = new THREE.Points(geo, mat);
      scene.add(pts);
      pourRef.current.push(pts);

      let t = 0;
      const totalTime = 2.2;
      const animInterval = setInterval(() => {
        t += 0.025;
        if (t > totalTime) {
          clearInterval(animInterval);
          scene.remove(pts);
          pourRef.current = pourRef.current.filter(p => p !== pts);
          geo.dispose(); mat.dispose();
          return;
        }
        const arr = geo.attributes.position.array as Float32Array;
        for (let i = 0; i < count; i++) {
          const p = ((i / count) + t * 0.5) % 1;
          const sag = Math.sin(p * Math.PI) * 0.4;
          arr[i * 3] = lerp(fromPos.x, toPos.x, p);
          arr[i * 3 + 1] = lerp(fromPos.y, toPos.y, p) + sag;
          arr[i * 3 + 2] = lerp(fromPos.z, toPos.z, p);
        }
        geo.attributes.position.needsUpdate = true;
        mat.opacity = t < totalTime - 0.3 ? 0.9 : 0.9 * ((totalTime - t) / 0.3);
      }, 16);
    }

    // ── Update a vessel's liquid color ──
    function applyChemistryColor(toName: string, outcome: ReactionOutcome) {
      const entry = interactionRef.current.get(toName);
      if (!entry?.liquid) return;
      const mat = entry.liquid.material as THREE.MeshPhysicalMaterial;
      mat.color.copy(outcome.color);
      mat.emissive.copy(outcome.color).multiplyScalar(0.35);
      mat.emissiveIntensity = 0.4;
      mat.needsUpdate = true;
      entry.liquidColor.copy(outcome.color);
    }

    // ── Highlight ──
    function highlightEquipment(name: string | null, on: boolean) {
      if (!name) return;
      const entry = interactionRef.current.get(name);
      if (!entry?.baseMat) return;
      if (on) { entry.baseMat.emissive.setHex(0x00e5ff); entry.baseMat.emissiveIntensity = 0.7; }
      else { entry.baseMat.emissive.copy(entry.baseEmissive); entry.baseMat.emissiveIntensity = 0.25; }
      entry.baseMat.needsUpdate = true;
    }

    // ── Pick / Pour logic ──
    function handlePickPour(hitName: string) {
      const current = heldRef.current;
      if (!current) {
        heldRef.current = hitName;
        setHeldItem(hitName);
        highlightEquipment(hitName, true);
        flashMsg(`Picked up ${hitName} — tap another vessel to pour`);
        onObjectClick?.(hitName);
        if ('vibrate' in navigator) navigator.vibrate(40);
      } else if (current === hitName) {
        heldRef.current = null;
        setHeldItem(null);
        highlightEquipment(hitName, false);
        flashMsg(`Released ${hitName}`);
      } else {
        // Pour from current into hitName
        const fromEntry = interactionRef.current.get(current);
        const toEntry = interactionRef.current.get(hitName);
        if (fromEntry && toEntry) {
          const fromColor = fromEntry.liquid
            ? (fromEntry.liquid.material as THREE.MeshPhysicalMaterial).color.getHex()
            : 0x00e5ff;
          triggerPourAnimation(fromEntry.position, toEntry.position, fromColor);

          // Compute chemistry and update target vessel colour
          const outcome = computeReaction(current, hitName, fromEntry.contents, toEntry.contents);
          applyChemistryColor(hitName, outcome);
          // Add source chemical to target contents
          toEntry.contents = [...new Set([...toEntry.contents, current])];
          flashMsg(`Poured ${current} → ${hitName}: ${outcome.label}`);

          if (outcome.hasGas && particles.length === 0) createGasParticles();
          if (outcome.hasPrecip && particles.length === 0) createPrecipitate();
          onPour?.(current, hitName);
          if ('vibrate' in navigator) navigator.vibrate([30, 20, 60]);

          // Pipette: also start drip animation
          if (current === 'Pipette') {
            const pipLiq = fromEntry.liquid?.material as THREE.MeshPhysicalMaterial;
            startDripAnimation(fromEntry.position, toEntry.position, pipLiq?.color?.getHex() ?? 0x90caf9);
          }
        }
        highlightEquipment(current, false);
        heldRef.current = null;
        setHeldItem(null);
        onObjectClick?.(hitName);
      }
    }

    // ── Raycasting ──
    const raycaster = new THREE.Raycaster();
    const allMeshes = Array.from(interactionRef.current.values()).map(e => e.mesh);

    function pickFromScreen(clientX: number, clientY: number): string | null {
      if (!mountRef.current) return null;
      const rect = mountRef.current.getBoundingClientRect();
      const x = ((clientX - rect.left) / rect.width) * 2 - 1;
      const y = -((clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(new THREE.Vector2(x, y), camera);
      const hits = raycaster.intersectObjects(allMeshes, true);
      if (hits.length === 0) return null;
      let obj: THREE.Object3D | null = hits[0].object;
      while (obj && !obj.userData?.name) obj = obj.parent;
      return obj?.userData?.name ?? null;
    }

    // ── Pointer/touch state ──
    let isDragging = false;
    let didMove = false;
    let prevPointer = { x: 0, y: 0 };
    let pinchStartDist = 0;
    let pointerDownTime = 0;
    let dragStartClientX = 0, dragStartClientY = 0;

    function onPointerDown(e: MouseEvent | TouchEvent) {
      isDragging = true;
      didMove = false;
      pointerDownTime = Date.now();
      const pt = 'touches' in e ? e.touches[0] : e;
      prevPointer = { x: pt.clientX, y: pt.clientY };
      dragStartClientX = pt.clientX;
      dragStartClientY = pt.clientY;
      if ('touches' in e && e.touches.length === 2) {
        pinchStartDist = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
      }
    }

    function onPointerMove(e: MouseEvent | TouchEvent) {
      if (!isDragging) return;
      if ('touches' in e && e.touches.length === 2) {
        const dist = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
        if (pinchStartDist > 0) orbit.radius = Math.max(2.5, Math.min(12, orbit.radius * (pinchStartDist / dist)));
        pinchStartDist = dist;
        didMove = true;
        return;
      }
      const pt = 'touches' in e ? e.touches[0] : e;
      const dx = pt.clientX - prevPointer.x;
      const dy = pt.clientY - prevPointer.y;
      if (Math.abs(dx) + Math.abs(dy) > 3) didMove = true;
      orbit.theta -= dx * 0.005;
      orbit.phi = Math.max(0.05, Math.min(Math.PI / 2.1, orbit.phi - dy * 0.005));
      prevPointer = { x: pt.clientX, y: pt.clientY };
      if (!isVRMode) applyOrbitCamera();

      // Drag-to-pour: if holding something, show pour target highlight
      if (heldRef.current && didMove) {
        const hovered = pickFromScreen(pt.clientX, pt.clientY);
        if (hovered && hovered !== heldRef.current) {
          if (pourTargetRef.current !== hovered) {
            if (pourTargetRef.current) highlightEquipment(pourTargetRef.current, false);
            pourTargetRef.current = hovered;
            setPourTarget(hovered);
            highlightEquipment(hovered, true);
          }
        } else if (pourTargetRef.current && !hovered) {
          highlightEquipment(pourTargetRef.current, false);
          pourTargetRef.current = null;
          setPourTarget(null);
        }
      }
    }

    function onPointerUp(e: MouseEvent | TouchEvent) {
      if (!isDragging) return;
      isDragging = false;

      const pt = 'changedTouches' in e ? e.changedTouches[0] : e as MouseEvent;

      // If dragging with held item → pour into drag target
      if (heldRef.current && didMove && pourTargetRef.current) {
        const target = pourTargetRef.current;
        highlightEquipment(pourTargetRef.current, false);
        pourTargetRef.current = null;
        setPourTarget(null);
        handlePickPour(target);
        return;
      }

      // Short tap → pick/pour
      const dt = Date.now() - pointerDownTime;
      if (!didMove && dt < 500) {
        if (isVRMode) return;
        const name = pickFromScreen(pt.clientX, pt.clientY);
        if (name) {
          handlePickPour(name);
        } else if (heldRef.current) {
          // Tapped empty space → drop item
          highlightEquipment(heldRef.current, false);
          heldRef.current = null;
          setHeldItem(null);
        }
      }

      // Clean up drag pour target
      if (pourTargetRef.current) {
        highlightEquipment(pourTargetRef.current, false);
        pourTargetRef.current = null;
        setPourTarget(null);
      }
    }

    const domEl = mountRef.current;
    domEl.addEventListener('mousedown', onPointerDown as EventListener);
    window.addEventListener('mousemove', onPointerMove as EventListener);
    window.addEventListener('mouseup', onPointerUp as EventListener);
    domEl.addEventListener('touchstart', onPointerDown as EventListener, { passive: true });
    domEl.addEventListener('touchmove', onPointerMove as EventListener, { passive: true });
    domEl.addEventListener('touchend', onPointerUp as EventListener);

    // ── Device orientation (VR) ──
    let deviceOri = { alpha: 0, beta: 0, gamma: 0 };
    const onDeviceOri = (e: DeviceOrientationEvent) => {
      deviceOri = { alpha: e.alpha ?? 0, beta: e.beta ?? 0, gamma: e.gamma ?? 0 };
    };
    window.addEventListener('deviceorientation', onDeviceOri, true);

    // ── VR Gaze ──
    let gazeObjName: string | null = null;
    let gazeStart: number | null = null;
    const GAZE_DURATION = 1500;
    let gazeAutoRotate = 0;

    // ── Animate loop ──
    let time = 0;
    function animate() {
      time += 0.016;

      if (isVRMode) {
        if (isDeviceOrientation) {
          // Proper quaternion device orientation for 360° VR cardboard
          const q = deviceOrientationToQuaternion(deviceOri.alpha, deviceOri.beta, deviceOri.gamma);
          camera.quaternion.copy(q);
          leftCamera.quaternion.copy(q);
          rightCamera.quaternion.copy(q);
          // Offset eye positions perpendicular to view direction
          const eyeLeft = new THREE.Vector3(-eyeSep / 2, 0, 0).applyQuaternion(q);
          const eyeRight = new THREE.Vector3(eyeSep / 2, 0, 0).applyQuaternion(q);
          leftCamera.position.copy(camera.position).add(eyeLeft);
          rightCamera.position.copy(camera.position).add(eyeRight);
        } else {
          gazeAutoRotate += 0.004;
          const autoQ = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), gazeAutoRotate);
          camera.quaternion.copy(autoQ);
          leftCamera.quaternion.copy(autoQ);
          rightCamera.quaternion.copy(autoQ);
          leftCamera.position.set(-eyeSep / 2, 1.6, 0);
          rightCamera.position.set(eyeSep / 2, 1.6, 0);
        }

        // Gaze detection
        raycaster.setFromCamera(new THREE.Vector2(0, 0), camera);
        const gazeHits = raycaster.intersectObjects(allMeshes, true);
        let newGazeTarget: string | null = null;
        if (gazeHits.length > 0) {
          let obj: THREE.Object3D | null = gazeHits[0].object;
          while (obj && !obj.userData?.name) obj = obj.parent;
          newGazeTarget = obj?.userData?.name ?? null;
        }
        if (newGazeTarget !== gazeObjName) {
          gazeObjName = newGazeTarget;
          gazeStart = newGazeTarget ? performance.now() : null;
          setGazeTarget(newGazeTarget);
          setGazeProgress(0);
        }
        if (gazeObjName && gazeStart !== null) {
          const prog = Math.min((performance.now() - gazeStart) / GAZE_DURATION, 1);
          setGazeProgress(prog);
          if (prog >= 1) {
            handlePickPour(gazeObjName);
            gazeStart = null; setGazeProgress(0); gazeObjName = null; setGazeTarget(null);
          }
        }
      } else {
        if (!isDragging) {
          const cx = orbit.radius * Math.sin(orbit.theta) * Math.cos(orbit.phi);
          const cz = orbit.radius * Math.cos(orbit.theta) * Math.cos(orbit.phi);
          camera.position.x = cx + Math.sin(time * 0.07) * 0.02;
          camera.position.z = cz;
          camera.lookAt(0, 0.5, 0);
        }
      }

      // Liquid wave
      if (liquid) liquid.position.y = 0.25 + Math.sin(time * 1.5) * 0.008;

      // Drop animation
      if (isDripping && dropGroup) {
        dropAnimT += 0.04;
        if (dropAnimT > 1.2) { isDripping = false; scene.remove(dropGroup); dropGroup = null; dropAnimT = 0; }
        else {
          dropGroup.children.forEach((drop, i) => {
            const t2 = Math.max(0, dropAnimT - i * 0.12);
            drop.position.set(
              lerp(dropFrom.x, dropTo.x, t2),
              lerp(dropFrom.y, dropTo.y, t2) + Math.sin(t2 * Math.PI) * 0.6,
              lerp(dropFrom.z, dropTo.z, t2)
            );
            (drop as THREE.Mesh).scale.setScalar(1 - t2 * 0.5);
            ((drop as THREE.Mesh).material as THREE.MeshPhysicalMaterial).opacity = Math.max(0, 0.9 - t2 * 0.8);
          });
        }
      }

      // Gas particles
      particles.forEach(pts => {
        const pa = pts.geometry.attributes.position.array as Float32Array;
        for (let i = 1; i < pa.length; i += 3) { pa[i] += 0.008; if (pa[i] > 2.5) pa[i] = 1.5; }
        pts.geometry.attributes.position.needsUpdate = true;
        (pts.material as THREE.PointsMaterial).opacity = 0.4 + Math.sin(time * 2) * 0.3;
      });

      (buretteLiquid.material as THREE.MeshPhysicalMaterial).emissiveIntensity = 0.1 + Math.sin(time * 3) * 0.08;

      if (heldRef.current) {
        const entry = interactionRef.current.get(heldRef.current);
        if (entry?.baseMat) entry.baseMat.emissiveIntensity = 0.5 + Math.sin(time * 4) * 0.2;
      }

      pointLight.intensity = (isVRMode ? 2.2 : 1.8) + Math.sin(time * 0.7) * 0.2;

      // Render
      if (isVRMode && isStereoMode) {
        renderer.setScissorTest(true);
        const hw = renderer.domElement.width / 2;
        const h = renderer.domElement.height;
        // Left eye
        renderer.setViewport(0, 0, hw, h);
        renderer.setScissor(0, 0, hw, h);
        leftCamera.aspect = hw / h;
        leftCamera.fov = 95;
        leftCamera.updateProjectionMatrix();
        renderer.render(scene, leftCamera);
        // Right eye
        renderer.setViewport(hw, 0, hw, h);
        renderer.setScissor(hw, 0, hw, h);
        rightCamera.aspect = hw / h;
        rightCamera.fov = 95;
        rightCamera.updateProjectionMatrix();
        renderer.render(scene, rightCamera);
        renderer.setScissorTest(false);
      } else {
        renderer.render(scene, camera);
      }

      sceneRef.current!.frameId = requestAnimationFrame(animate);
    }

    if (hasGas) createGasParticles();
    if (hasPrecipitate) createPrecipitate();

    sceneRef.current = { renderer, scene, camera, leftCamera, rightCamera, frameId: requestAnimationFrame(animate), liquid, buretteLiquid, particles, time };

    const handleResize = () => {
      if (!mountRef.current) return;
      const w = mountRef.current.clientWidth;
      const h = mountRef.current.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('deviceorientation', onDeviceOri);
      window.removeEventListener('mousemove', onPointerMove as EventListener);
      window.removeEventListener('mouseup', onPointerUp as EventListener);
      if (mountRef.current) {
        mountRef.current.removeEventListener('mousedown', onPointerDown as EventListener);
        mountRef.current.removeEventListener('touchstart', onPointerDown as EventListener);
        mountRef.current.removeEventListener('touchmove', onPointerMove as EventListener);
        mountRef.current.removeEventListener('touchend', onPointerUp as EventListener);
      }
      if (sceneRef.current) cancelAnimationFrame(sceneRef.current.frameId);
      if (mountRef.current && renderer.domElement.parentNode === mountRef.current) {
        mountRef.current.removeChild(renderer.domElement);
      }
      renderer.dispose();
      interactionRef.current.clear();
    };
  }, [isVRMode, isDeviceOrientation, isPerfMode, isStereoMode, experimentStations]);

  // ── Reactive liquid color (from LabPage step) ──
  useEffect(() => {
    if (!sceneRef.current) return;
    const { r, g, b } = hexToRGB(reactionColor);
    const mat = sceneRef.current.liquid.material as THREE.MeshPhysicalMaterial;
    mat.color.setRGB(r, g, b);
    mat.emissive.setRGB(r * 0.4, g * 0.4, b * 0.4);
    mat.needsUpdate = true;
    // Also update flask entry
    const flaskEntry = interactionRef.current.get('Erlenmeyer Flask');
    if (flaskEntry) flaskEntry.liquidColor.setRGB(r, g, b);
  }, [reactionColor]);

  const crosshairR = 14;
  const circumference = 2 * Math.PI * crosshairR;

  return (
    <div ref={mountRef} className="w-full h-full relative select-none" style={{ cursor: heldItem ? 'grabbing' : 'grab' }}>

      {/* Held item badge */}
      {heldItem && (
        <div className="absolute top-3 left-1/2 -translate-x-1/2 z-20 pointer-events-none">
          <div className="flex items-center gap-2 px-3 py-1.5 bg-cyan-500/20 backdrop-blur-md border border-cyan-400/50 rounded-full shadow-lg shadow-cyan-500/20 animate-pulse">
            <div className="w-2 h-2 rounded-full bg-cyan-400" />
            <span className="text-cyan-200 text-xs font-semibold">Holding: {heldItem}</span>
            {pourTarget
              ? <span className="text-green-400 text-xs">→ Release over {pourTarget} to pour</span>
              : <span className="text-slate-400 text-xs">· drag or tap target to pour</span>}
          </div>
        </div>
      )}

      {/* Interaction toast */}
      {interactionMsg && !heldItem && (
        <div className="absolute top-3 left-1/2 -translate-x-1/2 z-20 pointer-events-none">
          <div className="px-3 py-1.5 bg-slate-800/90 backdrop-blur-md border border-slate-600/50 rounded-full text-slate-300 text-xs shadow">
            {interactionMsg}
          </div>
        </div>
      )}

      {/* Desktop hint */}
      {!isVRMode && !heldItem && (
        <div className="absolute bottom-3 right-3 z-10 pointer-events-none">
          <div className="glass rounded-lg px-3 py-2 text-xs text-slate-400 space-y-0.5">
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
              Drag to orbit · Tap equipment to pick up
            </div>
            <div className="text-slate-500">Drag held item over vessel to pour</div>
          </div>
        </div>
      )}

      {/* VR crosshair + gaze UI */}
      {isVRMode && (
        <div className="absolute inset-0 pointer-events-none flex items-center justify-center z-20">
          <div className="relative flex items-center justify-center">
            <div className="w-8 h-8 rounded-full border-2 flex items-center justify-center transition-all duration-150"
              style={{ borderColor: gazeTarget ? 'rgba(0,229,255,0.95)' : 'rgba(148,163,184,0.5)', boxShadow: gazeTarget ? '0 0 16px rgba(0,229,255,0.7)' : 'none', transform: heldItem ? 'scale(1.3)' : 'scale(1)' }}>
              <div className="w-1 h-1 rounded-full" style={{ background: gazeTarget ? '#00e5ff' : 'rgba(148,163,184,0.7)' }} />
            </div>
            {gazeTarget && (
              <svg className="absolute inset-0 -rotate-90" width="32" height="32" viewBox="0 0 32 32">
                <circle cx="16" cy="16" r={crosshairR} fill="none" stroke="#00e5ff" strokeWidth="2.5"
                  strokeDasharray={circumference} strokeDashoffset={circumference * (1 - gazeProgress)}
                  style={{ transition: 'stroke-dashoffset 0.05s linear' }} />
              </svg>
            )}
          </div>

          {gazeTarget && (
            <div className="absolute bottom-28 left-1/2 -translate-x-1/2 text-center space-y-1">
              <div className="inline-block bg-cyan-500/20 backdrop-blur-sm border border-cyan-500/40 rounded-xl px-5 py-2">
                <p className="text-cyan-200 text-sm font-semibold">{gazeTarget}</p>
                <p className="text-slate-400 text-xs mt-0.5">{heldItem ? `Gaze to pour ${heldItem} →` : 'Gaze to pick up'}</p>
              </div>
            </div>
          )}

          {heldItem && (
            <div className="absolute top-8 left-1/2 -translate-x-1/2">
              <div className="flex items-center gap-2 px-3 py-1.5 bg-cyan-500/20 border border-cyan-400/50 rounded-full backdrop-blur-sm">
                <div className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
                <span className="text-cyan-200 text-xs font-semibold">Holding: {heldItem}</span>
              </div>
            </div>
          )}

          <div className="absolute top-4 left-1/2 -translate-x-1/2 text-center">
            <p className="text-slate-500 text-xs">
              {isDeviceOrientation ? 'Tilt phone to look 360° · Gaze 1.5s to interact' : 'Auto-rotate · Enable Gyro for head tracking'}
            </p>
          </div>

          {isStereoMode && <div className="absolute top-0 bottom-0 left-1/2 w-px bg-black/60 pointer-events-none" />}
        </div>
      )}
    </div>
  );
}
