import { Monitor, Smartphone, Eye, Minimize2, Gauge, Compass } from 'lucide-react';
import { useVR } from '../context/VRContext';

export default function VRModeToggle() {
  const {
    isVRMode,
    isStereoMode,
    isDeviceOrientation,
    isPerfMode,
    toggleVRMode,
    toggleStereoMode,
    toggleDeviceOrientation,
    togglePerfMode,
  } = useVR();

  if (isVRMode) {
    return (
      <div className="flex items-center gap-1.5">
        <button
          onClick={toggleStereoMode}
          title={isStereoMode ? 'Exit split-screen VR box mode' : 'Enable VR box mode (split-screen)'}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
            isStereoMode
              ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
              : 'bg-slate-800 text-slate-400 border border-slate-700 hover:bg-slate-700 hover:text-slate-200'
          }`}
        >
          {isStereoMode ? (
            <>
              <Eye className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Stereo</span>
            </>
          ) : (
            <>
              <Smartphone className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">VR Box</span>
            </>
          )}
        </button>
        <button
          onClick={toggleDeviceOrientation}
          title={isDeviceOrientation ? 'Disable head tracking' : 'Enable gyroscope head tracking'}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
            isDeviceOrientation
              ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
              : 'bg-slate-800 text-slate-400 border border-slate-700 hover:bg-slate-700 hover:text-slate-200'
          }`}
        >
          <Compass className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Gyro</span>
        </button>
        <button
          onClick={togglePerfMode}
          title={isPerfMode ? 'Disable 60 FPS performance mode' : 'Enable 60 FPS performance mode'}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
            isPerfMode
              ? 'bg-green-500/20 text-green-300 border border-green-500/40'
              : 'bg-slate-800 text-slate-400 border border-slate-700 hover:bg-slate-700 hover:text-slate-200'
          }`}
        >
          <Gauge className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">60fps</span>
        </button>
        <button
          onClick={toggleVRMode}
          title="Exit VR mode"
          className="flex items-center gap-1.5 px-2.5 py-1.5 bg-red-500/20 text-red-300 border border-red-500/40 rounded-lg text-xs font-medium hover:bg-red-500/30 transition-all"
        >
          <Minimize2 className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Exit VR</span>
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={toggleVRMode}
      title="Enter VR mode - Use your phone in a VR headset for an immersive 360° lab experience"
      className="flex items-center gap-1.5 px-2.5 py-1.5 bg-gradient-to-r from-cyan-500/20 to-blue-500/20 text-cyan-200 border border-cyan-500/40 rounded-lg text-xs font-medium hover:from-cyan-500/30 hover:to-blue-500/30 transition-all"
    >
      <Monitor className="w-3.5 h-3.5" />
      <span className="hidden sm:inline">VR Mode</span>
      <Eye className="w-3 h-3 text-cyan-400" />
    </button>
  );
}
