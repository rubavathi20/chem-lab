import { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import { buildVRLabRoom, type ExperimentStationData } from './VRLabScene';
import {
  CHEMICALS,
  computeReaction,
  type ReactionResult,
} from '../lib/chemistry';
import {
  createBeaker,
  createErlenmeyerFlask,
  createBurette,
  createPipette,
  createGraduatedCylinder,
  createThermometer,
  createTestTube,
  createReagentBottle,
  createGlassRod,
  createWashBottle,
  createBalance,
  createLiquidMaterial,
} from '../lib/equipment';

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
  onReaction?: (result: ReactionResult) => void;
}

interface EquipmentEntry {
  mesh: THREE.Object3D;
  liquid: THREE.Mesh | null;
  position: THREE.Vector3;
  baseEmissive: THREE.Color;
  baseMat: THREE.MeshPhysicalMaterial | null;
  contents: string[];
  liquidColor: THREE.Color;
  fillLevel: number;
  temperature: number;
}

interface InteractableState {
  held: string | null;
  hovered: string | null;
  gazeTarget: string | null;
  pourTarget: string | null;
  gazeProgress: number;
}

// ─── Constants ─────────────────────────────────────────────────────────────
const GAZE_DURATION_MS = 1400;
const POUR_DURATION_MS = 2000;

// ─── Device Orientation Quaternion ────────────────────────────────────────
function deviceOrientationToQuaternion(alpha: number, beta: number, gamma: number): THREE.Quaternion {
  const q1 = new THREE.Quaternion(-Math.sqrt(0.5), 0, 0, Math.sqrt(0.5));
  const euler = new THREE.Euler(
    THREE.MathUtils.degToRad(beta),
    THREE.MathUtils.degToRad(alpha),
    THREE.MathUtils.degToRad(-gamma),
    'YXZ'
  );
  const q = new THREE.Quaternion().setFromEuler(euler);
  q.multiply(q1);
  const orient = screen.orientation?.angle ?? (typeof window.orientation !== 'undefined' ? (window.orientation as number) : 0);
  if (orient !== 0) {
    const sq = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), THREE.MathUtils.degToRad(-orient));
    q.multiply(sq);
  }
  return q;
}

// ─── Helpers ──────────────────────────────────────────────────────────────
function hexToRGB(hex: string) {
  const r = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return r ? { r: parseInt(r[1], 16) / 255, g: parseInt(r[2], 16) / 255, b: parseInt(r[3], 16) / 255 } : { r: 0.9, g: 0.95, b: 1 };
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function lerpColor(hexA: number, hexB: number, t: number): number {
  const rA = (hexA >> 16) & 255;
  const gA = (hexA >> 8) & 255;
  const bA = hexA & 255;
  const rB = (hexB >> 16) & 255;
  const gB = (hexB >> 8) & 255;
  const bB = hexB & 255;
  return (Math.round(rA + (rB - rA) * t) << 16) | (Math.round(gA + (gB - gA) * t) << 8) | Math.round(bA + (bB - bA) * t);
}

// ─── Main Component ────────────────────────────────────────────────────────
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
  onReaction,
}: Props) {
  const mountRef = useRef<HTMLDivElement>(null);
  const [heldItem, setHeldItem] = useState<string | null>(null);
  const [pourTarget, setPourTarget] = useState<string | null>(null);
  const [interactionMsg, setInteractionMsg] = useState<string | null>(null);
  const [gazeTarget, setGazeTarget] = useState<string | null>(null);
  const [gazeProgress, setGazeProgress] = useState(0);

  const sceneRef = useRef<{
    renderer: THREE.WebGLRenderer;
    scene: THREE.Scene;
    camera: THREE.PerspectiveCamera;
    leftCamera: THREE.PerspectiveCamera;
    rightCamera: THREE.PerspectiveCamera;
    mainLiquid: THREE.Mesh;
    particles: THREE.Points[];
    pourStreams: THREE.Points[];
    frameId: number;
  } | null>(null);

  const equipmentRef = useRef<Map<string, EquipmentEntry>>(new Map());
  const stateRef = useRef<InteractableState>({
    held: null, hovered: null, gazeTarget: null, pourTarget: null, gazeProgress: 0
  });

  const flash = useCallback((msg: string) => {
    setInteractionMsg(msg);
    setTimeout(() => setInteractionMsg(null), 2500);
  }, []);

  // ─── Initialize Scene ───────────────────────────────────────────────────
  useEffect(() => {
    if (!mountRef.current) return;

    const width = mountRef.current.clientWidth;
    const height = mountRef.current.clientHeight;
    const equipment = equipmentRef.current;

    // Scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0a0f1e);

    // Camera
    const camera = new THREE.PerspectiveCamera(isVRMode ? 75 : 52, width / height, 0.01, isVRMode ? 1000 : 100);
    const leftCamera = new THREE.PerspectiveCamera(75, width / 2 / height, 0.01, 1000);
    const rightCamera = new THREE.PerspectiveCamera(75, width / 2 / height, 0.01, 1000);
    const eyeSep = 0.064;

    const orbit = { theta: 0, phi: Math.PI / 7, radius: isVRMode ? 0 : 7 };

    function applyOrbit() {
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
      applyOrbit();
    }

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: !isPerfMode, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(isPerfMode ? 1 : Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = !isPerfMode;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    mountRef.current.appendChild(renderer.domElement);

    // Lighting
    scene.add(new THREE.AmbientLight(0x404060, isVRMode ? 1.4 : 1.0));

    const mainLight = new THREE.PointLight(0x00e5ff, isVRMode ? 2.0 : 1.6, 20);
    mainLight.position.set(-2, 4, 2);
    mainLight.castShadow = true;
    mainLight.shadow.mapSize.width = 1024;
    mainLight.shadow.mapSize.height = 1024;
    scene.add(mainLight);

    const rimLight = new THREE.PointLight(0x4080ff, 1.2, 25);
    rimLight.position.set(3, 3, -2);
    scene.add(rimLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 0.6);
    dirLight.position.set(2, 5, 3);
    scene.add(dirLight);

    scene.fog = new THREE.FogExp2(0x0a0f1e, isVRMode ? 0.018 : 0.035);

    // ─── Register equipment ═══════════════════════════════════════════════
    function register(name: string, mesh: THREE.Object3D, liquid: THREE.Mesh | null, basePos: THREE.Vector3, initColor?: string) {
      const mat = (mesh as THREE.Mesh).material as THREE.MeshPhysicalMaterial | null;
      equipment.set(name, {
        mesh,
        liquid,
        position: basePos.clone(),
        baseEmissive: mat?.emissive?.clone() ?? new THREE.Color(0, 0, 0),
        baseMat: mat ?? null,
        contents: [],
        liquidColor: new THREE.Color(initColor ?? '#e8f4ff'),
        fillLevel: liquid ? 0.5 : 0,
        temperature: 22,
      });
    }

    // ─── Build VR room or bench scene ══════════════════════════════════════
    const eqOffset = isVRMode ? { y: 0.91, z: -3 } : { y: 0, z: 0 };

    if (isVRMode) {
      const stations = experimentStations.length > 0 ? experimentStations : [{ id: 'def', title: 'Chemistry Lab', category: 'General', difficulty: 'beginner', chemicals: [], equipment: [] }];
      const roomRefs = buildVRLabRoom(stations);
      scene.add(roomRefs.group);
      roomRefs.interactiveObjects.forEach(obj => {
        if (obj.userData?.name) {
          register(obj.userData.name, obj, null, new THREE.Vector3());
        }
      });
    } else {
      const bench = new THREE.Mesh(
        new THREE.BoxGeometry(12, 0.12, 3.5),
        new THREE.MeshStandardMaterial({ color: 0x1a2535, roughness: 0.8 })
      );
      bench.position.y = -0.5;
      bench.receiveShadow = true;
      scene.add(bench);
      scene.add(Object.assign(new THREE.GridHelper(12, 24, 0x1e3a5f, 0x0d1f35), { position: new THREE.Vector3(0, -0.42, -0.2) }));
    }

    // ─── Create equipment instances ═══════════════════════════════════════

    // Erlenmeyer Flask
    const flaskGroup = createErlenmeyerFlask();
    flaskGroup.position.set(isVRMode ? 0 : -1.2, isVRMode ? eqOffset.y : 0.08, isVRMode ? eqOffset.z : 0);
    scene.add(flaskGroup);
    const flaskWP = new THREE.Vector3();
    flaskGroup.getWorldPosition(flaskWP);
    flaskWP.y += 0.4;
    register('Erlenmeyer Flask', flaskGroup.children[0], flaskGroup.children[2] as THREE.Mesh, flaskWP, reactionColor);

    // Beaker
    const beakerGroup = createBeaker();
    beakerGroup.position.set(isVRMode ? 1.2 : 1.8, isVRMode ? eqOffset.y : 0.08, isVRMode ? eqOffset.z : 0.3);
    scene.add(beakerGroup);
    const beakerWP = new THREE.Vector3();
    beakerGroup.getWorldPosition(beakerWP);
    beakerWP.y += 0.35;
    register('Beaker', beakerGroup.children[0], beakerGroup.children[5] as THREE.Mesh, beakerWP, '#80deea');

    // Burette on stand
    const buretteGroup = createBurette();
    buretteGroup.position.set(isVRMode ? -1.5 : 2.8, isVRMode ? eqOffset.y : 0.08, isVRMode ? eqOffset.z : -0.2);
    scene.add(buretteGroup);
    const burWP = new THREE.Vector3();
    buretteGroup.getWorldPosition(burWP);
    burWP.y += 1.1;
    register('Burette', buretteGroup.children[0], buretteGroup.children.find(c => c.userData?.isLiquid) as THREE.Mesh, burWP, '#90caf9');

    // Graduated cylinder
    const cylGroup = createGraduatedCylinder();
    cylGroup.position.set(isVRMode ? 2 : -2, isVRMode ? eqOffset.y : 0.08, isVRMode ? eqOffset.z : 0.5);
    scene.add(cylGroup);
    const cylWP = new THREE.Vector3();
    cylGroup.getWorldPosition(cylWP);
    cylWP.y += 0.5;
    register('Graduated Cylinder', cylGroup.children[0], cylGroup.children.find(c => c.userData?.isLiquid) as THREE.Mesh, cylWP, '#80deea');

    // Pipette
    const pipetteGroup = createPipette();
    pipetteGroup.position.set(isVRMode ? -0.8 : -3.5, isVRMode ? eqOffset.y : 0.15, isVRMode ? eqOffset.z : 0.4);
    scene.add(pipetteGroup);
    const pipWP = new THREE.Vector3();
    pipetteGroup.getWorldPosition(pipWP);
    pipWP.y += 0.45;
    register('Pipette', pipetteGroup.children[1], pipetteGroup.children.find(c => c.userData?.isLiquid) as THREE.Mesh, pipWP, '#90caf9');

    // Test tubes with chemicals
    const testTubeChemicals = Object.entries(CHEMICALS).slice(0, 6);
    testTubeChemicals.forEach(([id, chem], i) => {
      const tubeGroup = createTestTube();
      const xPos = isVRMode ? -2.5 + i * 0.18 : -0.8 + i * 0.14;
      tubeGroup.position.set(xPos, isVRMode ? eqOffset.y : -0.42, isVRMode ? eqOffset.z + 1 : -0.2);
      tubeGroup.userData = { name: chem.name, interactive: true };

      // Add liquid fill
      const fillH = 0.12 + (i % 3) * 0.04;
      const liqMat = createLiquidMaterial(chem.colorHex, chem.emissiveHex, 0.85);
      const liq = new THREE.Mesh(new THREE.CylinderGeometry(0.042, 0.04, fillH, 12), liqMat);
      liq.position.y = fillH / 2;
      tubeGroup.add(liq);

      scene.add(tubeGroup);
      const tubeWP = new THREE.Vector3();
      tubeGroup.getWorldPosition(tubeWP);
      tubeWP.y += 0.35;
      register(chem.name, tubeGroup, liq, tubeWP, chem.color);
      const entry = equipment.get(chem.name);
      if (entry) entry.contents = [id];
    });

    // Thermometer
    const thermoGroup = createThermometer();
    thermoGroup.position.set(isVRMode ? 2.8 : -4, isVRMode ? eqOffset.y : -0.35, isVRMode ? eqOffset.z : 0.6);
    scene.add(thermoGroup);
    const thermoWP = new THREE.Vector3();
    thermoGroup.getWorldPosition(thermoWP);
    thermoWP.y += 0.2;
    register('Thermometer', thermoGroup, null, thermoWP);

    // Balance
    const balanceGroup = createBalance();
    balanceGroup.position.set(isVRMode ? 3.5 : -5, isVRMode ? eqOffset.y : -0.42, isVRMode ? eqOffset.z : 0);
    scene.add(balanceGroup);

    // Reagent bottles
    const reagentBottles = ['HCl', 'NaOH', 'H2SO4', 'KMnO4'];
    reagentBottles.forEach((chemId, i) => {
      const chem = CHEMICALS[chemId];
      if (!chem) return;
      const bottleGroup = createReagentBottle();
      bottleGroup.position.set(isVRMode ? -3.5 + i * 0.8 : 4.5, isVRMode ? eqOffset.y : -0.42, isVRMode ? eqOffset.z : -0.8 + i * 0.3);
      bottleGroup.userData = { name: chem.name, interactive: true };

      const liqMesh = bottleGroup.children.find(c => c.userData?.isLiquid) as THREE.Mesh;
      if (liqMesh) {
        (liqMesh.material as THREE.MeshPhysicalMaterial).color.setHex(chem.colorHex);
        (liqMesh.material as THREE.MeshPhysicalMaterial).emissive.setHex(chem.emissiveHex);
      }

      scene.add(bottleGroup);
      const wp = new THREE.Vector3();
      bottleGroup.getWorldPosition(wp);
      wp.y += 0.3;
      register(chem.name, bottleGroup, liqMesh, wp, chem.color);
      const entry = equipment.get(chem.name);
      if (entry) entry.contents = [chemId];
    });

    // Glass rod
    const rodGroup = createGlassRod();
    rodGroup.position.set(isVRMode ? -2 : 0, isVRMode ? eqOffset.y + 0.15 : -0.35, isVRMode ? eqOffset.z : 0.8);
    scene.add(rodGroup);
    register('Glass Rod', rodGroup, null, new THREE.Vector3(0, -0.2, 0.8));

    // Wash bottle
    const washGroup = createWashBottle();
    washGroup.position.set(isVRMode ? 1.8 : 5.2, isVRMode ? eqOffset.y : -0.42, isVRMode ? eqOffset.z : 0.5);
    scene.add(washGroup);
    register('Wash Bottle', washGroup, null, new THREE.Vector3(5.2, -0.3, 0.5));

    // ─── Particles (gas, precipitate) ══════════════════════════════════════
    const particles: THREE.Points[] = [];
    const pourStreams: THREE.Points[] = [];

    function createGasParticles(pos: THREE.Vector3) {
      const geo = new THREE.BufferGeometry();
      const count = isVRMode ? 200 : 100;
      const pArr = new Float32Array(count * 3);
      for (let i = 0; i < count; i++) {
        pArr[i * 3] = pos.x + (Math.random() - 0.5) * 0.4;
        pArr[i * 3 + 1] = pos.y + Math.random() * 1.5;
        pArr[i * 3 + 2] = pos.z + (Math.random() - 0.5) * 0.4;
      }
      geo.setAttribute('position', new THREE.BufferAttribute(pArr, 3));
      const pts = new THREE.Points(geo, new THREE.PointsMaterial({
        color: 0x80ffff, size: 0.03, transparent: true, opacity: 0.65, blending: THREE.AdditiveBlending
      }));
      scene.add(pts);
      particles.push(pts);
    }

    function createPrecipitateParticles(pos: THREE.Vector3, color: number) {
      const geo = new THREE.BufferGeometry();
      const count = isVRMode ? 300 : 150;
      const pArr = new Float32Array(count * 3);
      for (let i = 0; i < count; i++) {
        const r = Math.random() * 0.35;
        const a = Math.random() * Math.PI * 2;
        pArr[i * 3] = pos.x + Math.cos(a) * r;
        pArr[i * 3 + 1] = pos.y + Math.random() * 0.25;
        pArr[i * 3 + 2] = pos.z + Math.sin(a) * r;
      }
      geo.setAttribute('position', new THREE.BufferAttribute(pArr, 3));
      const pts = new THREE.Points(geo, new THREE.PointsMaterial({
        color, size: 0.02, transparent: true, opacity: 0.8
      }));
      scene.add(pts);
      particles.push(pts);
    }

    function createPourStream(from: THREE.Vector3, to: THREE.Vector3, color: number) {
      const count = 80;
      const geo = new THREE.BufferGeometry();
      const pos = new Float32Array(count * 3);
      geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      const mat = new THREE.PointsMaterial({
        color, size: 0.045, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending
      });
      const stream = new THREE.Points(geo, mat);
      scene.add(stream);

      let t = 0;
      const dur = POUR_DURATION_MS / 1000;
      const anim = () => {
        t += 0.025;
        if (t > dur) {
          scene.remove(stream);
          const idx = pourStreams.indexOf(stream);
          if (idx >= 0) pourStreams.splice(idx, 1);
          geo.dispose();
          mat.dispose();
          return;
        }
        const arr = geo.attributes.position.array as Float32Array;
        for (let i = 0; i < count; i++) {
          const p = ((i / count) + t * 0.4) % 1;
          const sag = Math.sin(p * Math.PI) * 0.3;
          arr[i * 3] = lerp(from.x, to.x, p);
          arr[i * 3 + 1] = lerp(from.y, to.y, p) + sag;
          arr[i * 3 + 2] = lerp(from.z, to.z, p);
        }
        geo.attributes.position.needsUpdate = true;
        mat.opacity = t < dur - 0.25 ? 0.9 : 0.9 * ((dur - t) / 0.25);
        requestAnimationFrame(anim);
      };
      anim();
      pourStreams.push(stream);
    }

    if (hasGas) createGasParticles(new THREE.Vector3(0, isVRMode ? 1.2 : 0.3, 0));
    if (hasPrecipitate) createPrecipitateParticles(new THREE.Vector3(0, isVRMode ? 1 : 0.1, 0), 0xffffff);

    const mainLiquid = equipment.get('Erlenmeyer Flask')?.liquid ?? new THREE.Mesh();

    // ─── Interaction System ═══════════════════════════════════════════════
    const raycaster = new THREE.Raycaster();
    const allMeshes = Array.from(equipment.values()).map(e => e.mesh);

    function pickFromScreen(clientX: number, clientY: number): string | null {
      if (!mountRef.current) return null;
      const rect = mountRef.current.getBoundingClientRect();
      const x = ((clientX - rect.left) / rect.width) * 2 - 1;
      const y = -((clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(new THREE.Vector2(x, y), camera);
      const hits = raycaster.intersectObjects(allMeshes, true);
      if (!hits.length) return null;
      let obj: THREE.Object3D | null = hits[0].object;
      while (obj && !obj.userData?.name && !obj.userData?.interactive) obj = obj.parent;
      return obj?.userData?.name ?? null;
    }

    function highlight(name: string | null, on: boolean) {
      if (!name) return;
      const entry = equipment.get(name);
      if (!entry?.baseMat) return;
      entry.baseMat.emissive.setHex(on ? 0x00e5ff : entry.baseEmissive.getHex());
      entry.baseMat.emissiveIntensity = on ? 0.6 : 0.25;
      entry.baseMat.needsUpdate = true;
    }

    function updateLiquidColor(name: string, colorHex: number, duration: number = 0.8) {
      const entry = equipment.get(name);
      if (!entry?.liquid) return;
      const mat = entry.liquid.material as THREE.MeshPhysicalMaterial;
      const start = mat.color.getHex();
      const end = colorHex;
      let t = 0;
      const step = () => {
        t += 0.016;
        if (t >= duration) {
          mat.color.setHex(end);
        } else {
          mat.color.setHex(lerpColor(start, end, t / duration));
        }
        mat.needsUpdate = true;
        if (t < duration) requestAnimationFrame(step);
      };
      step();
      entry.liquidColor.setHex(end);
    }

    function handleInteraction(targetName: string) {
      const held = stateRef.current.held;

      if (!held) {
        stateRef.current.held = targetName;
        setHeldItem(targetName);
        highlight(targetName, true);
        flash(`Picked up ${targetName} — tap target to pour or tap again to release`);
        onObjectClick?.(targetName);
        if ('vibrate' in navigator) navigator.vibrate(40);
        return;
      }

      if (held === targetName) {
        highlight(held, false);
        stateRef.current.held = null;
        setHeldItem(null);
        flash(`Released ${held}`);
        return;
      }

      // Pour operation
      const fromEntry = equipment.get(held);
      const toEntry = equipment.get(targetName);
      if (!fromEntry || !toEntry) {
        highlight(held, false);
        stateRef.current.held = null;
        setHeldItem(null);
        return;
      }

      const fromColor = fromEntry.liquid?.material ? (fromEntry.liquid.material as THREE.MeshPhysicalMaterial).color.getHex() : 0x90caf9;
      createPourStream(fromEntry.position, toEntry.position, fromColor);

      const fromContents = fromEntry.contents || [];
      const toContents = toEntry.contents || [];
      const fromChem = fromContents[0] ?? held;
      const toChem = toContents[0] ?? targetName;

      const result = computeReaction(fromChem, toChem, { temperature: toEntry.temperature });

      if (result.success || result.newColorHex !== 0xe8f4f8) {
        updateLiquidColor(targetName, result.newColorHex);
        toEntry.contents = [...new Set([...toContents, ...fromContents])];
        toEntry.temperature = result.temperature;

        if (result.hasPrecipitate && result.precipitateColor) {
          createPrecipitateParticles(toEntry.position.clone(), parseInt(result.precipitateColor.replace('#', ''), 16));
        }
        if (result.hasGas) {
          createGasParticles(toEntry.position.clone());
        }
        flash(result.observations[0] ?? `Poured ${held} → ${targetName}`);
        onReaction?.(result);
      } else {
        flash(`Mixed ${held} → ${targetName}`);
      }

      onPour?.(held, targetName);
      highlight(held, false);
      stateRef.current.held = null;
      setHeldItem(null);
      onObjectClick?.(targetName);

      if ('vibrate' in navigator) navigator.vibrate([30, 20, 60]);
    }

    // ─── Pointer / Touch Handlers ════════════════════════════════════════
    let isDragging = false;
    let didMove = false;
    let prevPointer = { x: 0, y: 0 };
    let pinchDist = 0;
    let ptrDownTime = 0;

    function onPointerDown(e: MouseEvent | TouchEvent) {
      isDragging = true;
      didMove = false;
      ptrDownTime = Date.now();
      const pt = 'touches' in e ? e.touches[0] : e;
      prevPointer = { x: pt.clientX, y: pt.clientY };
      if ('touches' in e && e.touches.length === 2) {
        pinchDist = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
      }
    }

    function onPointerMove(e: MouseEvent | TouchEvent) {
      if (!isDragging) return;
      if ('touches' in e && e.touches.length === 2) {
        const d = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
        if (pinchDist > 0) orbit.radius = Math.max(2.5, Math.min(12, orbit.radius * (pinchDist / d)));
        pinchDist = d;
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
      if (!isVRMode) applyOrbit();

      if (stateRef.current.held && didMove) {
        const hovered = pickFromScreen(pt.clientX, pt.clientY);
        if (hovered && hovered !== stateRef.current.held) {
          if (stateRef.current.pourTarget !== hovered) {
            if (stateRef.current.pourTarget) highlight(stateRef.current.pourTarget, false);
            stateRef.current.pourTarget = hovered;
            setPourTarget(hovered);
            highlight(hovered, true);
          }
        } else if (stateRef.current.pourTarget && !hovered) {
          highlight(stateRef.current.pourTarget, false);
          stateRef.current.pourTarget = null;
          setPourTarget(null);
        }
      }
    }

    function onPointerUp(e: MouseEvent | TouchEvent) {
      if (!isDragging) return;
      isDragging = false;

      const pt = 'changedTouches' in e ? e.changedTouches[0] : (e as MouseEvent);

      if (stateRef.current.held && didMove && stateRef.current.pourTarget) {
        const target = stateRef.current.pourTarget;
        highlight(stateRef.current.pourTarget, false);
        stateRef.current.pourTarget = null;
        setPourTarget(null);
        handleInteraction(target);
        return;
      }

      const dt = Date.now() - ptrDownTime;
      if (!didMove && dt < 500 && !isVRMode) {
        const name = pickFromScreen(pt.clientX, pt.clientY);
        if (name) handleInteraction(name);
        else if (stateRef.current.held) {
          highlight(stateRef.current.held, false);
          stateRef.current.held = null;
          setHeldItem(null);
        }
      }

      if (stateRef.current.pourTarget) {
        highlight(stateRef.current.pourTarget, false);
        stateRef.current.pourTarget = null;
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

    // ─── Device Orientation (VR Cardboard) ═══════════════════════════════
    let devOri = { alpha: 0, beta: 0, gamma: 0 };
    const onDevOri = (e: DeviceOrientationEvent) => {
      devOri.alpha = e.alpha ?? 0;
      devOri.beta = e.beta ?? 0;
      devOri.gamma = e.gamma ?? 0;
    };
    window.addEventListener('deviceorientation', onDevOri, true);

    // ─── VR Gaze Interaction ══════════════════════════════════════════════
    let gazeStart: number | null = null;
    let autoRotate = 0;
    const circumference = 2 * Math.PI * 14;

    // ─── Animation Loop ═══════════════════════════════════════════════════
    let time = 0;

    function animate() {
      time += 0.016;

      if (isVRMode) {
        if (isDeviceOrientation) {
          const q = deviceOrientationToQuaternion(devOri.alpha, devOri.beta, devOri.gamma);
          camera.quaternion.copy(q);
          leftCamera.quaternion.copy(q);
          rightCamera.quaternion.copy(q);
          const eyeL = new THREE.Vector3(-eyeSep / 2, 0, 0).applyQuaternion(q);
          const eyeR = new THREE.Vector3(eyeSep / 2, 0, 0).applyQuaternion(q);
          leftCamera.position.copy(camera.position).add(eyeL);
          rightCamera.position.copy(camera.position).add(eyeR);
        } else {
          autoRotate += 0.004;
          const q = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), autoRotate);
          camera.quaternion.copy(q);
          leftCamera.quaternion.copy(q);
          rightCamera.quaternion.copy(q);
          leftCamera.position.set(-eyeSep / 2, 1.6, 0);
          rightCamera.position.set(eyeSep / 2, 1.6, 0);
        }

        raycaster.setFromCamera(new THREE.Vector2(0, 0), camera);
        const gazeHits = raycaster.intersectObjects(allMeshes, true);
        let newGaze: string | null = null;
        if (gazeHits.length > 0) {
          let obj: THREE.Object3D | null = gazeHits[0].object;
          while (obj && !obj.userData?.name && !obj.userData?.interactive) obj = obj.parent;
          newGaze = obj?.userData?.name ?? null;
        }
        if (newGaze !== stateRef.current.gazeTarget) {
          if (stateRef.current.gazeTarget && stateRef.current.gazeTarget !== newGaze) {
            highlight(stateRef.current.gazeTarget, false);
          }
          stateRef.current.gazeTarget = newGaze;
          setGazeTarget(newGaze);
          gazeStart = newGaze ? performance.now() : null;
          stateRef.current.gazeProgress = 0;
          setGazeProgress(0);
        }
        if (newGaze && gazeStart !== null) {
          const prog = Math.min((performance.now() - gazeStart) / GAZE_DURATION_MS, 1);
          stateRef.current.gazeProgress = prog;
          setGazeProgress(prog);
          if (newGaze !== stateRef.current.held) highlight(newGaze, true);
          if (prog >= 1) {
            handleInteraction(newGaze);
            gazeStart = null;
            setGazeProgress(0);
          }
        }
      } else {
        if (!isDragging) {
          const cx = orbit.radius * Math.sin(orbit.theta) * Math.cos(orbit.phi);
          const cz = orbit.radius * Math.cos(orbit.theta) * Math.cos(orbit.phi);
          camera.position.x = cx + Math.sin(time * 0.5) * 0.015;
          camera.position.z = cz;
          camera.lookAt(0, 0.5, 0);
        }
      }

      equipment.forEach(entry => {
        if (entry.liquid) {
          const liqY = 0.25 + Math.sin(time * 2) * 0.006;
          entry.liquid.position.y = lerp(entry.liquid.position.y, liqY, 0.1);
        }
      });

      particles.forEach(pts => {
        const arr = pts.geometry.attributes.position.array as Float32Array;
        for (let i = 1; i < arr.length; i += 3) {
          arr[i] += 0.008;
          if (arr[i] > 2.5) arr[i] = 1.5;
        }
        pts.geometry.attributes.position.needsUpdate = true;
        (pts.material as THREE.PointsMaterial).opacity = 0.35 + Math.sin(time * 3) * 0.15;
      });

      if (stateRef.current.held) {
        const entry = equipment.get(stateRef.current.held);
        if (entry?.baseMat) entry.baseMat.emissiveIntensity = 0.4 + Math.sin(time * 6) * 0.25;
      }

      mainLight.intensity = (isVRMode ? 2.0 : 1.6) + Math.sin(time * 0.6) * 0.15;

      if (isVRMode && isStereoMode) {
        renderer.setScissorTest(true);
        const hw = renderer.domElement.width / 2;
        const h = renderer.domElement.height;
        renderer.setViewport(0, 0, hw, h);
        renderer.setScissor(0, 0, hw, h);
        leftCamera.aspect = hw / h;
        leftCamera.updateProjectionMatrix();
        renderer.render(scene, leftCamera);
        renderer.setViewport(hw, 0, hw, h);
        renderer.setScissor(hw, 0, hw, h);
        rightCamera.aspect = hw / h;
        rightCamera.updateProjectionMatrix();
        renderer.render(scene, rightCamera);
        renderer.setScissorTest(false);
      } else {
        camera.aspect = width / height;
        camera.updateProjectionMatrix();
        renderer.render(scene, camera);
      }

      sceneRef.current = { renderer, scene, camera, leftCamera, rightCamera, mainLiquid, particles, pourStreams, frameId: requestAnimationFrame(animate) };
    }

    sceneRef.current = { renderer, scene, camera, leftCamera, rightCamera, mainLiquid, particles, pourStreams, frameId: requestAnimationFrame(animate) };

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
      window.removeEventListener('deviceorientation', onDevOri);
      domEl.removeEventListener('mousedown', onPointerDown as EventListener);
      window.removeEventListener('mousemove', onPointerMove as EventListener);
      window.removeEventListener('mouseup', onPointerUp as EventListener);
      domEl.removeEventListener('touchstart', onPointerDown as EventListener);
      domEl.removeEventListener('touchmove', onPointerMove as EventListener);
      domEl.removeEventListener('touchend', onPointerUp as EventListener);
      if (sceneRef.current) cancelAnimationFrame(sceneRef.current.frameId);
      if (mountRef.current && renderer.domElement.parentNode === mountRef.current) {
        mountRef.current.removeChild(renderer.domElement);
      }
      renderer.dispose();
      equipment.clear();
    };
  }, [isVRMode, isStereoMode, isPerfMode, reactionColor, hasGas, hasPrecipitate]);

  // ─── Reactive liquid color from props ══════════════════════════════════
  useEffect(() => {
    if (!sceneRef.current) return;
    const { r, g, b } = hexToRGB(reactionColor);
    const mat = sceneRef.current.mainLiquid.material as THREE.MeshPhysicalMaterial;
    mat.color.setRGB(r, g, b);
    mat.emissive.setRGB(r * 0.35, g * 0.35, b * 0.35);
    mat.needsUpdate = true;
  }, [reactionColor]);

  const circumference = 2 * Math.PI * 14;

  return (
    <div ref={mountRef} className="w-full h-full relative select-none" style={{ cursor: heldItem ? 'grabbing' : 'grab' }}>

      {heldItem && (
        <div className="absolute top-3 left-1/2 -translate-x-1/2 z-20 pointer-events-none">
          <div className="flex items-center gap-2 px-3 py-1.5 bg-cyan-500/20 backdrop-blur-md border border-cyan-400/50 rounded-full shadow-lg animate-pulse">
            <div className="w-2 h-2 rounded-full bg-cyan-400" />
            <span className="text-cyan-200 text-xs font-semibold">Holding: {heldItem}</span>
            {pourTarget && <span className="text-green-400 text-xs pl-1">→ {pourTarget}</span>}
          </div>
        </div>
      )}

      {interactionMsg && !heldItem && (
        <div className="absolute top-3 left-1/2 -translate-x-1/2 z-20 pointer-events-none">
          <div className="px-3 py-1.5 bg-slate-800/90 backdrop-blur-md border border-slate-600/50 rounded-full text-slate-300 text-xs shadow">
            {interactionMsg}
          </div>
        </div>
      )}

      {!isVRMode && !heldItem && (
        <div className="absolute bottom-3 right-3 z-10 pointer-events-none">
          <div className="glass rounded-lg px-3 py-2 text-xs text-slate-400">
            <div>Drag to rotate · Tap to pick up</div>
            <div className="text-slate-500">Drag over vessel to pour</div>
          </div>
        </div>
      )}

      {isVRMode && (
        <div className="absolute inset-0 pointer-events-none flex items-center justify-center z-20">
          <div className="relative flex items-center justify-center">
            <div className="w-8 h-8 rounded-full border-2 flex items-center justify-center"
              style={{ borderColor: gazeTarget ? '#00e5ff' : 'rgba(148,163,184,0.5)', boxShadow: gazeTarget ? '0 0 16px rgba(0,229,255,0.7)' : 'none' }}>
              <div className="w-1 h-1 rounded-full" style={{ background: gazeTarget ? '#00e5ff' : 'rgba(148,163,184,0.7)' }} />
            </div>
            {gazeTarget && (
              <svg className="absolute inset-0 -rotate-90" width="32" height="32" viewBox="0 0 32 32">
                <circle cx="16" cy="16" r={14} fill="none" stroke="#00e5ff" strokeWidth="2.5"
                  strokeDasharray={circumference} strokeDashoffset={circumference * (1 - gazeProgress)} />
              </svg>
            )}
          </div>

          {gazeTarget && (
            <div className="absolute bottom-28 left-1/2 -translate-x-1/2 text-center">
              <div className="bg-cyan-500/20 backdrop-blur-sm border border-cyan-500/40 rounded-xl px-5 py-2">
                <p className="text-cyan-200 text-sm font-semibold">{gazeTarget}</p>
                <p className="text-slate-400 text-xs">{heldItem ? `Pour ${heldItem} →` : 'Gaze to interact'}</p>
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
              {isDeviceOrientation ? 'Tilt to look 360° · Gaze 1.4s to interact' : 'Auto-rotate · Enable Gyro'}
            </p>
          </div>

          {isStereoMode && <div className="absolute top-0 bottom-0 left-1/2 w-px bg-black/60" />}
        </div>
      )}
    </div>
  );
}
