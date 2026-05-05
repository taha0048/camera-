import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  PenTool, 
  Eraser, 
  Undo2, 
  Redo2, 
  Trash2, 
  Download, 
  Camera, 
  CameraOff, 
  RefreshCw,
  Palette,
  Type,
  Layers,
  Settings2,
  Hand
} from 'lucide-react';
import { BrushType } from '../types';
import { cn } from '../lib/utils';

interface ToolbarProps {
  color: string;
  setColor: (color: string) => void;
  size: number;
  setSize: (size: number) => void;
  opacity: number;
  setOpacity: (opacity: number) => void;
  brushType: BrushType;
  setBrushType: (type: BrushType) => void;
  isEraser: boolean;
  setIsEraser: (isEraser: boolean) => void;
  undo: () => void;
  redo: () => void;
  clear: () => void;
  exportCanvas: () => void;
  isCameraVisible: boolean;
  setIsCameraVisible: (v: boolean) => void;
  toggleCamera: () => void;
  canUndo: boolean;
  canRedo: boolean;
  isHandTrackingEnabled: boolean;
  setIsHandTrackingEnabled: (v: boolean) => void;
}

const COLORS = [
  '#FFFFFF', '#FF3B30', '#FF9500', '#FFCC00', 
  '#4CD964', '#5AC8FA', '#007AFF', '#5856D6', 
  '#FF2D55', '#AF52DE', '#000000'
];

const BRUSH_TYPES = [
  { id: BrushType.PEN, icon: PenTool, label: 'Pen' },
  { id: BrushType.MARKER, icon: Type, label: 'Marker' },
  { id: BrushType.NEON, icon: Layers, label: 'Neon' },
];

const Toolbar: React.FC<ToolbarProps> = ({
  color, setColor,
  size, setSize,
  opacity, setOpacity,
  brushType, setBrushType,
  isEraser, setIsEraser,
  undo, redo, clear,
  exportCanvas,
  isCameraVisible, setIsCameraVisible,
  toggleCamera,
  canUndo, canRedo,
  isHandTrackingEnabled, setIsHandTrackingEnabled
}) => {
  const [activePanel, setActivePanel] = React.useState<'none' | 'brush' | 'color' | 'settings'>('none');

  return (
    <div className="absolute inset-0 pointer-events-none z-50 flex flex-col justify-end items-center pb-8 md:pb-12 px-4">
      
      {/* Floating Settings Panels */}
      <AnimatePresence>
        {activePanel !== 'none' && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="mb-6 pointer-events-auto bg-black/60 backdrop-blur-2xl border border-white/10 rounded-3xl p-6 shadow-2xl max-w-sm w-full"
          >
            {activePanel === 'brush' && (
              <div className="space-y-6">
                <div>
                  <label className="text-[10px] uppercase tracking-widest text-white/40 mb-3 block font-semibold">Brush Type</label>
                  <div className="grid grid-cols-3 gap-2">
                    {BRUSH_TYPES.map((t) => (
                      <button
                        key={t.id}
                        onClick={() => { setBrushType(t.id); setIsEraser(false); }}
                        className={cn(
                          "flex flex-col items-center justify-center p-3 rounded-2xl border transition-all duration-300",
                          brushType === t.id && !isEraser 
                            ? "bg-white/10 border-white/20 text-white" 
                            : "border-transparent text-white/40 hover:bg-white/5"
                        )}
                      >
                        <t.icon className="w-5 h-5 mb-2" />
                        <span className="text-[10px] font-medium">{t.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
                
                <div>
                  <div className="flex justify-between items-center mb-3">
                    <label className="text-[10px] uppercase tracking-widest text-white/40 font-semibold font-mono">Size: {size}px</label>
                  </div>
                  <input 
                    type="range" min="1" max="100" value={size} 
                    onChange={(e) => setSize(Number(e.target.value))}
                    className="w-full h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer accent-white hover:accent-neutral-300 transition-all"
                  />
                </div>

                <div>
                  <div className="flex justify-between items-center mb-3">
                    <label className="text-[10px] uppercase tracking-widest text-white/40 font-semibold font-mono">Opacity: {Math.round(opacity * 100)}%</label>
                  </div>
                  <input 
                    type="range" min="0.1" max="1" step="0.01" value={opacity} 
                    onChange={(e) => setOpacity(Number(e.target.value))}
                    className="w-full h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer accent-white hover:accent-neutral-300 transition-all"
                  />
                </div>
              </div>
            )}

            {activePanel === 'color' && (
              <div>
                <label className="text-[10px] uppercase tracking-widest text-white/40 mb-4 block font-semibold">Select Color</label>
                <div className="grid grid-cols-6 gap-3">
                  {COLORS.map((c) => (
                    <button
                      key={c}
                      onClick={() => { setColor(c); setIsEraser(false); setActivePanel('none'); }}
                      className={cn(
                        "w-full aspect-square rounded-full border-2 transition-all duration-300 scale-90 hover:scale-110",
                        color === c && !isEraser ? "border-white" : "border-transparent"
                      )}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                  <div className="col-span-6 mt-4">
                     <input 
                        type="color" 
                        value={color} 
                        onChange={(e) => setColor(e.target.value)}
                        className="w-full h-10 bg-transparent border-none rounded-lg cursor-pointer"
                     />
                  </div>
                </div>
              </div>
            )}

            {activePanel === 'settings' && (
              <div className="space-y-4">
                <label className="text-[10px] uppercase tracking-widest text-white/40 mb-2 block font-semibold font-mono">Actions</label>
                <div className="grid grid-cols-2 gap-3">
                  <button 
                    onClick={() => { clear(); setActivePanel('none'); }}
                    className="flex items-center justify-center space-x-2 py-3 px-4 rounded-xl bg-red-500/20 text-red-400 border border-red-500/20 hover:bg-red-500/30 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span className="text-sm font-medium">Clear Canvas</span>
                  </button>
                  <button 
                    onClick={() => { exportCanvas(); setActivePanel('none'); }}
                    className="flex items-center justify-center space-x-2 py-3 px-4 rounded-xl bg-blue-500/20 text-blue-400 border border-blue-500/20 hover:bg-blue-500/30 transition-colors"
                  >
                    <Download className="w-4 h-4" />
                    <span className="text-sm font-medium">Export PNG</span>
                  </button>
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Control Bar */}
      <motion.div 
        initial={{ y: 50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.5, duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
        className="pointer-events-auto flex items-center space-x-2 bg-black/40 backdrop-blur-3xl border border-white/5 p-2 rounded-[2.5rem] shadow-2xl relative overflow-hidden"
      >
        {/* Subtle glass glow */}
        <div className="absolute inset-0 bg-gradient-to-tr from-white/[0.03] to-transparent pointer-events-none" />

        <div className="flex items-center border-r border-white/10 pr-2 space-x-1">
          <ToolButton 
            icon={Palette} 
            active={activePanel === 'color'} 
            onClick={() => setActivePanel(activePanel === 'color' ? 'none' : 'color')} 
            colorIndicator={!isEraser ? color : undefined}
          />
          <ToolButton 
            icon={PenTool} 
            active={activePanel === 'brush'} 
            onClick={() => setActivePanel(activePanel === 'brush' ? 'none' : 'brush')} 
          />
          <ToolButton 
            icon={Eraser} 
            active={isEraser} 
            onClick={() => { setIsEraser(!isEraser); setActivePanel('none'); }} 
          />
        </div>

        <div className="flex items-center border-r border-white/10 pr-2 space-x-1">
          <ToolButton icon={Undo2} disabled={!canUndo} onClick={undo} />
          <ToolButton icon={Redo2} disabled={!canRedo} onClick={redo} />
        </div>

        <div className="flex items-center pr-1 space-x-1">
          <ToolButton 
            icon={Hand} 
            onClick={() => setIsHandTrackingEnabled(!isHandTrackingEnabled)} 
            active={isHandTrackingEnabled}
          />
          <ToolButton 
            icon={isCameraVisible ? Camera : CameraOff} 
            onClick={() => setIsCameraVisible(!isCameraVisible)} 
            active={isCameraVisible}
          />
          <ToolButton icon={RefreshCw} onClick={toggleCamera} />
          <ToolButton icon={Settings2} onClick={() => setActivePanel(activePanel === 'settings' ? 'none' : 'settings')} active={activePanel === 'settings'} />
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
  colorIndicator?: string;
}

const ToolButton: React.FC<ToolButtonProps> = ({ icon: Icon, active, disabled, onClick, colorIndicator }) => (
  <button
    onClick={onClick}
    disabled={disabled}
    className={cn(
      "w-12 h-12 flex items-center justify-center rounded-full transition-all duration-500 relative group",
      active ? "bg-white text-black" : "text-white/60 hover:bg-white/10 hover:text-white",
      disabled && "opacity-20 cursor-not-allowed grayscale"
    )}
  >
    <Icon className="w-5 h-5 relative z-10" />
    {colorIndicator && !active && (
      <div 
        className="absolute bottom-2 right-2 w-2 h-2 rounded-full border border-white/20"
        style={{ backgroundColor: colorIndicator }}
      />
    )}
  </button>
);

export default Toolbar;
