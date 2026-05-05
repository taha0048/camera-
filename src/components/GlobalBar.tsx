import React from 'react';
import { motion } from 'motion/react';
import { 
  Undo2, 
  Redo2, 
  Trash2, 
  Download, 
  Camera, 
  CameraOff, 
  RefreshCw,
  Hand,
} from 'lucide-react';
import { cn } from '../lib/utils';

interface GlobalBarProps {
  undo: () => void;
  redo: () => void;
  clear: () => void;
  exportCanvas: () => void;
  canUndo: boolean;
  canRedo: boolean;
  isCameraVisible: boolean;
  setIsCameraVisible: (v: boolean) => void;
  toggleCamera: () => void;
  isHandTrackingEnabled: boolean;
  setIsHandTrackingEnabled: (v: boolean) => void;
  isTracking: boolean;
}

const GlobalBar: React.FC<GlobalBarProps> = ({
  undo, redo, clear, exportCanvas,
  canUndo, canRedo,
  isCameraVisible, setIsCameraVisible, toggleCamera,
  isHandTrackingEnabled, setIsHandTrackingEnabled, isTracking
}) => {
  return (
    <div className="absolute bottom-8 md:bottom-12 left-1/2 -translate-x-1/2 z-50 pointer-events-none">
      <motion.div 
        initial={{ y: 50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="pointer-events-auto flex items-center space-x-2 bg-black/40 backdrop-blur-3xl border border-white/5 p-2 rounded-[2.5rem] shadow-2xl relative"
      >
        <div className="flex items-center border-r border-white/10 pr-2 space-x-1">
          <ToolButton icon={Undo2} disabled={!canUndo} onClick={undo} />
          <ToolButton icon={Redo2} disabled={!canRedo} onClick={redo} />
        </div>

        <div className="flex items-center border-r border-white/10 pr-2 space-x-1">
           <ToolButton icon={Trash2} onClick={clear} className="text-red-400 hover:bg-red-500/20" />
           <ToolButton icon={Download} onClick={exportCanvas} className="text-blue-400 hover:bg-blue-500/20" />
        </div>

        <div className="flex items-center pr-1 space-x-1">
          <div className="relative">
            <ToolButton 
              icon={Hand} 
              onClick={() => setIsHandTrackingEnabled(!isHandTrackingEnabled)} 
              active={isHandTrackingEnabled}
            />
            {isHandTrackingEnabled && isTracking && (
              <div className="absolute top-1 right-1 w-2 h-2 bg-green-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.8)]" />
            )}
          </div>
          <ToolButton 
            icon={isCameraVisible ? Camera : CameraOff} 
            onClick={() => setIsCameraVisible(!isCameraVisible)} 
            active={isCameraVisible}
          />
          <ToolButton icon={RefreshCw} onClick={toggleCamera} />
        </div>
      </motion.div>
    </div>
  );
};

interface ToolButtonProps {
  icon: any;
  active?: boolean;
  disabled?: boolean;
  onClick: () => void;
  className?: string;
}

const ToolButton: React.FC<ToolButtonProps> = ({ icon: Icon, active, disabled, onClick, className }) => (
  <button
    onClick={onClick}
    disabled={disabled}
    className={cn(
      "w-12 h-12 flex items-center justify-center rounded-full transition-all duration-300 relative group",
      active ? "bg-white text-black" : "text-white/60 hover:bg-white/10 hover:text-white",
      disabled && "opacity-20 cursor-not-allowed grayscale",
      className
    )}
  >
    <Icon className="w-5 h-5 relative z-10" />
  </button>
);

export default GlobalBar;
