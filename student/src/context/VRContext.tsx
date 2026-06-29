import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';

interface VRContextValue {
  isVRMode: boolean;
  isStereoMode: boolean;
  isDeviceOrientation: boolean;
  isPerfMode: boolean;
  fullscreenEnabled: boolean;
  enterVRMode: () => void;
  exitVRMode: () => void;
  toggleVRMode: () => void;
  toggleStereoMode: () => void;
  toggleDeviceOrientation: () => void;
  togglePerfMode: () => void;
  requestFullscreen: () => void;
  exitFullscreen: () => void;
}

const VRContext = createContext<VRContextValue | null>(null);

export function VRProvider({ children }: { children: ReactNode }) {
  const [isVRMode, setIsVRMode] = useState(false);
  const [isStereoMode, setIsStereoMode] = useState(false);
  const [isDeviceOrientation, setIsDeviceOrientation] = useState(false);
  const [isPerfMode, setIsPerfMode] = useState(false);
  const [fullscreenEnabled, setFullscreenEnabled] = useState(false);

  const requestFullscreen = useCallback(() => {
    const elem = document.documentElement;
    if (elem.requestFullscreen) {
      elem.requestFullscreen().catch(() => {});
    } else if ((elem as any).webkitRequestFullscreen) {
      (elem as any).webkitRequestFullscreen();
    } else if ((elem as any).msRequestFullscreen) {
      (elem as any).msRequestFullscreen();
    }
    setFullscreenEnabled(true);
  }, []);

  const exitFullscreen = useCallback(() => {
    if (document.exitFullscreen) {
      document.exitFullscreen().catch(() => {});
    } else if ((document as any).webkitExitFullscreen) {
      (document as any).webkitExitFullscreen();
    } else if ((document as any).msExitFullscreen) {
      (document as any).msExitFullscreen();
    }
    setFullscreenEnabled(false);
  }, []);

  const enterVRMode = useCallback(() => {
    setIsVRMode(true);
    requestFullscreen();
    // Lock orientation to landscape for VR
    if (screen.orientation && screen.orientation.lock) {
      screen.orientation.lock('landscape').catch(() => {});
    }
    // Request device orientation permission on iOS
    if (typeof (DeviceOrientationEvent as any).requestPermission === 'function') {
      (DeviceOrientationEvent as any).requestPermission()
        .then((permission: string) => {
          setIsDeviceOrientation(permission === 'granted');
        })
        .catch(() => {});
    } else {
      setIsDeviceOrientation(true);
    }
  }, [requestFullscreen]);

  const exitVRMode = useCallback(() => {
    setIsVRMode(false);
    setIsStereoMode(false);
    exitFullscreen();
    // Unlock orientation
    if (screen.orientation && screen.orientation.unlock) {
      screen.orientation.unlock();
    }
  }, [exitFullscreen]);

  const toggleVRMode = useCallback(() => {
    if (isVRMode) {
      exitVRMode();
    } else {
      enterVRMode();
    }
  }, [isVRMode, enterVRMode, exitVRMode]);

  const toggleStereoMode = useCallback(() => {
    setIsStereoMode(prev => !prev);
  }, []);

  const togglePerfMode = useCallback(() => {
    setIsPerfMode(prev => !prev);
  }, []);

  const toggleDeviceOrientation = useCallback(() => {
    if (!isDeviceOrientation) {
      if (typeof (DeviceOrientationEvent as any).requestPermission === 'function') {
        (DeviceOrientationEvent as any).requestPermission()
          .then((permission: string) => {
            setIsDeviceOrientation(permission === 'granted');
          })
          .catch(() => {});
      } else {
        setIsDeviceOrientation(true);
      }
    } else {
      setIsDeviceOrientation(false);
    }
  }, [isDeviceOrientation]);

  // Handle escape key to exit VR
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isVRMode) {
        exitVRMode();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isVRMode, exitVRMode]);

  // Handle fullscreen change
  useEffect(() => {
    const handleFullscreenChange = () => {
      const isFS = !!(document.fullscreenElement || (document as any).webkitFullscreenElement);
      setFullscreenEnabled(isFS);
      if (!isFS && isVRMode) {
        // Exit VR mode when user exits fullscreen
        setIsVRMode(false);
        setIsStereoMode(false);
      }
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
    };
  }, [isVRMode]);

  return (
    <VRContext.Provider value={{
      isVRMode,
      isStereoMode,
      isDeviceOrientation,
      isPerfMode,
      fullscreenEnabled,
      enterVRMode,
      exitVRMode,
      toggleVRMode,
      toggleStereoMode,
      toggleDeviceOrientation,
      togglePerfMode,
      requestFullscreen,
      exitFullscreen,
    }}>
      {children}
    </VRContext.Provider>
  );
}

export function useVR() {
  const context = useContext(VRContext);
  if (!context) {
    throw new Error('useVR must be used within a VRProvider');
  }
  return context;
}
