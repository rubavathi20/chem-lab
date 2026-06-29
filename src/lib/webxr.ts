// ─── WebXR Support for VR Headsets ────────────────────────────────────────

export interface XRSessionState {
  isSupported: boolean;
  isSessionActive: boolean;
  hasPositionalTracking: boolean;
  hasHandTracking: boolean;
  controllers: XRControllerData[];
}

export interface XRControllerData {
  index: number;
  handedness: 'left' | 'right' | 'none';
  targetRaySpace: DOMPointReadOnly | null;
  gripSpace: DOMPointReadOnly | null;
  profiles: string[];
}

export interface WebXRButtonOptions {
  text: string;
  textSize?: number;
  textColor?: string;
  bgColor?: string;
  bgOpacity?: number;
  borderRadius?: number;
  padding?: number;
}

class WebXRManager {
  private session: XRSession | null = null;
  private referenceSpace: XRReferenceSpace | null = null;
  private animationFrameId: number | null = null;
  private frameCallback: ((frame: XRFrame) => void) | null = null;
  private sessionEndCallback: (() => void) | null = null;

  async isSupported(): Promise<boolean> {
    if (!navigator.xr) return false;
    return navigator.xr.isSessionSupported('immersive-vr');
  }

  async startSession(
    onFrame: (frame: XRFrame) => void,
    onSessionEnd: () => void
  ): Promise<boolean> {
    if (!navigator.xr) {
      console.warn('WebXR not available');
      return false;
    }

    const supported = await this.isSupported();
    if (!supported) {
      console.warn('Immersive VR session not supported');
      return false;
    }

    try {
      this.session = await navigator.xr.requestSession('immersive-vr', {
        optionalFeatures: ['local-floor', 'bounded-floor', 'hand-tracking', 'controller-profiles'],
        requiredFeatures: ['local-floor'],
      });

      this.session.addEventListener('end', () => {
        this.session = null;
        this.referenceSpace = null;
        this.animationFrameId = null;
        onSessionEnd();
      });

      this.referenceSpace = await this.session.requestReferenceSpace('local-floor');
      this.frameCallback = onFrame;
      this.sessionEndCallback = onSessionEnd;

      this.startRenderLoop();
      return true;
    } catch (err) {
      console.error('Failed to start XR session:', err);
      return false;
    }
  }

  private startRenderLoop() {
    if (!this.session || !this.frameCallback) return;

    const renderLoop = (time: number, frame: XRFrame) => {
      if (!this.session) return;
      this.animationFrameId = this.session.requestAnimationFrame(renderLoop);
      this.frameCallback(frame);
    };

    this.animationFrameId = this.session.requestAnimationFrame(renderLoop);
  }

  async endSession(): Promise<void> {
    if (this.session) {
      await this.session.end();
      this.session = null;
      this.referenceSpace = null;
    }
    this.animationFrameId = null;
    this.frameCallback = null;
    this.sessionEndCallback?.();
  }

  getControllers(frame: XRFrame): XRControllerData[] {
    const controllers: XRControllerData[] = [];
    if (!this.session) return controllers;

    const sources = Array.from(frame.session.inputSources);
    sources.forEach((source, index) => {
      controllers.push({
        index,
        handedness: source.handedness as 'left' | 'right' | 'none',
        targetRaySpace: source.targetRaySpace,
        gripSpace: source.gripSpace,
        profiles: source.profiles,
      });
    });

    return controllers;
  }

  getPose(frame: XRFrame, space: XRSpace): XRRigidTransform | null {
    if (!this.referenceSpace) return null;
    return frame.getPose(space, this.referenceSpace);
  }

  getViewerPose(frame: XRFrame): XRViewerPose | null {
    if (!this.referenceSpace) return null;
    return frame.getViewerPose(this.referenceSpace);
  }

  getReferenceSpace(): XRReferenceSpace | null {
    return this.referenceSpace;
  }

  getSession(): XRSession | null {
    return this.session;
  }
}

export const webXRManager = new WebXRManager();

// ─── VR Button Helper ──────────────────────────────────────────────────────

export function createVRButton(
  container: HTMLElement,
  onSessionStart: () => void,
  onSessionEnd: () => void,
  options: WebXRButtonOptions = {
    text: 'Enter VR',
    bgColor: '#1976d2',
    textColor: '#ffffff',
  }
): HTMLButtonElement {
  const button = document.createElement('button');
  button.textContent = options.text;
  button.style.cssText = `
    font-size: ${options.textSize ?? 16}px;
    color: ${options.textColor ?? '#ffffff'};
    background-color: ${options.bgColor ?? '#1976d2'};
    border: none;
    border-radius: ${options.borderRadius ?? 8}px;
    padding: ${options.padding ?? 12}px 24px;
    cursor: pointer;
    font-family: 'Segoe UI', Arial, sans-serif;
    font-weight: 500;
    transition: all 0.2s ease;
    box-shadow: 0 2px 8px rgba(0,0,0,0.3);
  `;

  button.addEventListener('mouseenter', () => {
    button.style.filter = 'brightness(1.1)';
  });
  button.addEventListener('mouseleave', () => {
    button.style.filter = 'brightness(1)';
  });

  let isActive = false;

  button.addEventListener('click', async () => {
    if (!isActive) {
      button.disabled = true;
      button.textContent = 'Starting...';
      const success = await webXRManager.startSession(
        () => onSessionStart(),
        () => {
          isActive = false;
          button.textContent = options.text;
          onSessionEnd();
        }
      );
      if (success) {
        isActive = true;
        button.textContent = 'Exit VR';
        button.style.backgroundColor = '#c62828';
      } else {
        button.textContent = 'VR Not Available';
        button.style.backgroundColor = '#666';
      }
      button.disabled = false;
    } else {
      await webXRManager.endSession();
      isActive = false;
      button.textContent = options.text;
      button.style.backgroundColor = options.bgColor ?? '#1976d2';
    }
  });

  // Check support and update button state
  webXRManager.isSupported().then((supported) => {
    if (!supported) {
      button.disabled = true;
      button.textContent = 'VR Not Supported';
      button.style.backgroundColor = '#666';
      button.style.cursor = 'not-allowed';
    }
  });

  return button;
}

// ─── XR Controller Ray Helpers ─────────────────────────────────────────────

export function createControllerRay(): THREE.Line {
  const geometry = new THREE.BufferGeometry();
  const positions = new Float32Array([0, 0, 0, 0, 0, -10]);
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

  const material = new THREE.LineBasicMaterial({
    color: 0x00e5ff,
    transparent: true,
    opacity: 0.8,
  });

  return new THREE.Line(geometry, material);
}

export function createControllerPointer(): THREE.Group {
  const group = new THREE.Group();

  // Ray line
  const ray = createControllerRay();
  group.add(ray);

  // Pointer tip (small sphere)
  const tipGeometry = new THREE.SphereGeometry(0.015, 16, 12);
  const tipMaterial = new THREE.MeshBasicMaterial({
    color: 0x00e5ff,
    transparent: true,
    opacity: 0.9,
  });
  const tip = new THREE.Mesh(tipGeometry, tipMaterial);
  tip.position.set(0, 0, -10);
  group.add(tip);

  // Glow
  const glowGeometry = new THREE.SphereGeometry(0.025, 16, 12);
  const glowMaterial = new THREE.MeshBasicMaterial({
    color: 0x00e5ff,
    transparent: true,
    opacity: 0.4,
  });
  const glow = new THREE.Mesh(glowGeometry, glowMaterial);
  glow.position.set(0, 0, -10);
  group.add(glow);

  return group;
}

// ─── XR Controller Model Helpers ───────────────────────────────────────────

export function createControllerModel(color: number = 0x333333): THREE.Group {
  const group = new THREE.Group();

  // Handle/body
  const bodyGeometry = new THREE.CylinderGeometry(0.018, 0.022, 0.08, 12);
  const bodyMaterial = new THREE.MeshStandardMaterial({
    color,
    metalness: 0.6,
    roughness: 0.4,
  });
  const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
  body.rotation.x = Math.PI / 2;
  body.position.z = -0.04;
  group.add(body);

  // Trigger
  const triggerGeometry = new THREE.BoxGeometry(0.012, 0.025, 0.008);
  const trigger = new THREE.Mesh(triggerGeometry, bodyMaterial);
  trigger.position.set(0, -0.008, -0.02);
  trigger.rotation.x = 0.2;
  group.add(trigger);

  // Thumbstick
  const stickGeometry = new THREE.CylinderGeometry(0.008, 0.008, 0.015, 8);
  const stick = new THREE.Mesh(stickGeometry, bodyMaterial);
  stick.position.set(0, 0.02, -0.05);
  group.add(stick);

  const capGeometry = new THREE.SphereGeometry(0.01, 8, 6);
  const cap = new THREE.Mesh(capGeometry, new THREE.MeshStandardMaterial({ color: 0x666666, roughness: 0.8 }));
  cap.position.set(0, 0.03, -0.05);
  group.add(cap);

  return group;
}

// ─── XR Frame Processing Helpers ────────────────────────────────────────────

export function applyXRTransform(
  object: THREE.Object3D,
  viewerPose: XRViewerPose | null,
  referenceSpace: XRReferenceSpace | null
): void {
  if (!viewerPose || !referenceSpace) return;

  const transform = viewerPose.transform;
  object.position.set(
    transform.position.x,
    transform.position.y,
    transform.position.z
  );
  object.quaternion.set(
    transform.orientation.x,
    transform.orientation.y,
    transform.orientation.z,
    transform.orientation.w
  );
}

export function applyControllerTransform(
  object: THREE.Object3D,
  frame: XRFrame,
  controllerData: XRControllerData
): boolean {
  if (!controllerData.targetRaySpace) return false;

  const pose = webXRManager.getPose(frame, controllerData.targetRaySpace);
  if (!pose) return false;

  const transform = pose.transform;
  object.position.set(
    transform.position.x,
    transform.position.y,
    transform.position.z
  );
  object.quaternion.set(
    transform.orientation.x,
    transform.orientation.y,
    transform.orientation.z,
    transform.orientation.w
  );

  return true;
}

// ─── XR Input Handler ──────────────────────────────────────────────────────

export interface XRInputState {
  selectPressed: boolean;
  squeezePressed: boolean;
  thumbstickX: number;
  thumbstickY: number;
  triggerValue: number;
}

export function getXRInputState(source: XRInputSource): XRInputState {
  const gamepad = source.gamepad;
  if (!gamepad) {
    return {
      selectPressed: false,
      squeezePressed: false,
      thumbstickX: 0,
      thumbstickY: 0,
      triggerValue: 0,
    };
  }

  const axes = gamepad.axes;
  const buttons = gamepad.buttons;

  return {
    selectPressed: buttons[0]?.pressed ?? false,
    squeezePressed: buttons[1]?.pressed ?? false,
    thumbstickX: axes[0] ?? 0,
    thumbstickY: axes[1] ?? 0,
    triggerValue: buttons[0]?.value ?? 0,
  };
}

// ─── Teleportation Helper ──────────────────────────────────────────────────

export function createTeleportTarget(): THREE.Group {
  const group = new THREE.Group();
  group.rotation.x = -Math.PI / 2;

  // Outer ring
  const ringGeometry = new THREE.RingGeometry(0.4, 0.45, 32);
  const ringMaterial = new THREE.MeshBasicMaterial({
    color: 0x00e5ff,
    transparent: true,
    opacity: 0.6,
    side: THREE.DoubleSide,
  });
  const ring = new THREE.Mesh(ringGeometry, ringMaterial);
  group.add(ring);

  // Inner circle
  const circleGeometry = new THREE.CircleGeometry(0.35, 32);
  const circleMaterial = new THREE.MeshBasicMaterial({
    color: 0x0a192f,
    transparent: true,
    opacity: 0.8,
  });
  const circle = new THREE.Mesh(circleGeometry, circleMaterial);
  circle.position.z = -0.001;
  group.add(circle);

  // Arrow
  const arrowGeometry = new THREE.ConeGeometry(0.08, 0.2, 4);
  const arrowMaterial = new THREE.MeshBasicMaterial({
    color: 0x00e5ff,
    transparent: true,
    opacity: 0.8,
  });
  const arrow = new THREE.Mesh(arrowGeometry, arrowMaterial);
  arrow.rotation.x = Math.PI / 2;
  arrow.position.setZ(0.15);
  group.add(arrow);

  return group;
}

export function showTeleportTarget(target: THREE.Group, visible: boolean): void {
  target.visible = visible;
  if (visible) {
    target.scale.setScalar(1);
  } else {
    target.scale.setScalar(0.5);
  }
}

// ─── Hand Tracking Helpers ─────────────────────────────────────────────────

export function createHandModel(): THREE.Group {
  const group = new THREE.Group();

  // Create 25 spheres for joints
  const jointPositions = [
    // Wrist
    [0, 0, 0],
    // Thumb
    [0.02, 0, 0.02], [0.04, 0, 0.03], [0.06, 0, 0.04], [0.08, 0, 0.05],
    // Index
    [0.03, 0, -0.02], [0.04, 0.02, -0.02], [0.05, 0.04, -0.02], [0.06, 0.06, -0.02],
    // Middle
    [0.0, 0, -0.02], [0.0, 0.025, -0.02], [0.0, 0.05, -0.02], [0.0, 0.075, -0.02],
    // Ring
    [-0.03, 0, -0.02], [-0.03, 0.02, -0.02], [-0.03, 0.04, -0.02], [-0.03, 0.06, -0.02],
    // Pinky
    [-0.06, 0, -0.02], [-0.06, 0.015, -0.02], [-0.06, 0.03, -0.02], [-0.06, 0.04, -0.02],
  ];

  const jointMaterial = new THREE.MeshStandardMaterial({
    color: 0xf5deb3,
    roughness: 0.8,
  });

  jointPositions.forEach(([x, y, z], i) => {
    const size = i === 0 ? 0.015 : 0.012;
    const joint = new THREE.Mesh(
      new THREE.SphereGeometry(size, 8, 6),
      jointMaterial
    );
    joint.position.set(x, y, z);
    joint.userData.jointIndex = i;
    group.add(joint);
  });

  return group;
}
