import { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';

interface VRInteractionManagerProps {
  scene: THREE.Scene | null;
  camera: THREE.PerspectiveCamera | null;
  renderer: THREE.WebGLRenderer | null;
  interactiveObjects: THREE.Object3D[];
  isVRMode: boolean;
  onSelect?: (objectName: string) => void;
  gazeDuration?: number;
}

export interface VRInteractionHandle {
  hoveredObject: string | null;
  gazeProgress: number;
  triggerHaptic: (duration: number, strength: number) => void;
}

export function useVRInteraction({
  scene,
  camera,
  interactiveObjects,
  isVRMode,
  onSelect,
  gazeDuration = 1500,
}: Omit<VRInteractionManagerProps, 'renderer'>): VRInteractionHandle {
  const [hoveredObject, setHoveredObject] = useState<string | null>(null);
  const [gazeProgress, setGazeProgress] = useState(0);
  const raycasterRef = useRef(new THREE.Raycaster());
  const gazeStartRef = useRef<number | null>(null);
  const lastHoveredRef = useRef<string | null>(null);
  const frameRef = useRef<number>(0);

  const triggerHaptic = useCallback((duration: number, strength: number) => {
    if ('vibrate' in navigator) {
      try {
        navigator.vibrate(duration);
      } catch {
        // ignore
      }
    }
    void strength;
  }, []);

  useEffect(() => {
    if (!isVRMode || !camera || !scene) return;

    function checkGaze() {
      if (!camera) return;
      raycasterRef.current.setFromCamera(new THREE.Vector2(0, 0), camera);
      const intersects = raycasterRef.current.intersectObjects(interactiveObjects, true);

      let hitName: string | null = null;
      if (intersects.length > 0) {
        let obj: THREE.Object3D | null = intersects[0].object;
        while (obj && !obj.userData?.name) obj = obj.parent;
        if (obj?.userData?.name) hitName = obj.userData.name as string;
      }

      if (hitName !== lastHoveredRef.current) {
        lastHoveredRef.current = hitName;
        setHoveredObject(hitName);
        gazeStartRef.current = hitName ? performance.now() : null;
        setGazeProgress(0);
      }

      if (hitName && gazeStartRef.current !== null) {
        const elapsed = performance.now() - gazeStartRef.current;
        const progress = Math.min(elapsed / gazeDuration, 1);
        setGazeProgress(progress);
        if (progress >= 1) {
          onSelect?.(hitName);
          triggerHaptic(50, 1);
          gazeStartRef.current = null;
          setGazeProgress(0);
        }
      }

      frameRef.current = requestAnimationFrame(checkGaze);
    }

    frameRef.current = requestAnimationFrame(checkGaze);
    return () => cancelAnimationFrame(frameRef.current);
  }, [isVRMode, camera, scene, interactiveObjects, onSelect, gazeDuration, triggerHaptic]);

  return { hoveredObject, gazeProgress, triggerHaptic };
}

export default function VRCrosshair({ gazeProgress, hoveredObject }: { gazeProgress: number; hoveredObject: string | null }) {
  const radius = 14;
  const circumference = 2 * Math.PI * radius;
  return (
    <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
      <div className="relative">
        <div
          className="w-8 h-8 rounded-full border-2 flex items-center justify-center transition-colors"
          style={{
            borderColor: hoveredObject ? 'rgba(0,229,255,0.9)' : 'rgba(148,163,184,0.5)',
            boxShadow: hoveredObject ? '0 0 12px rgba(0,229,255,0.6)' : 'none',
          }}
        >
          <div
            className="w-1 h-1 rounded-full"
            style={{ background: hoveredObject ? '#00e5ff' : 'rgba(148,163,184,0.7)' }}
          />
        </div>
        {hoveredObject && (
          <svg className="absolute inset-0 -rotate-90" width="32" height="32" viewBox="0 0 32 32">
            <circle
              cx="16" cy="16" r={radius}
              fill="none"
              stroke="#00e5ff"
              strokeWidth="2.5"
              strokeDasharray={circumference}
              strokeDashoffset={circumference * (1 - gazeProgress)}
              style={{ transition: 'stroke-dashoffset 0.05s linear' }}
            />
          </svg>
        )}
      </div>
      {hoveredObject && (
        <div className="absolute bottom-24 left-1/2 -translate-x-1/2 bg-cyan-500/20 backdrop-blur-sm border border-cyan-500/40 rounded-lg px-4 py-2 whitespace-nowrap">
          <p className="text-cyan-300 text-sm font-medium">{hoveredObject}</p>
          <p className="text-slate-400 text-xs mt-0.5">Gaze to select</p>
        </div>
      )}
    </div>
  );
}
