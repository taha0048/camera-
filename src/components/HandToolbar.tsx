import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  PenTool, 
  Eraser, 
  Palette,
  Type,
  Layers,
  Smile,
} from 'lucide-react';
import { BrushType, BrushSettings } from '../types';
import { cn } from '../lib/utils';

interface HandToolbarProps {
  settings: BrushSettings;
  updateSettings: (settings: BrushSettings) => void;
  side: 'left' | 'right';
  handPointer: { x: number, y: number, isPinching: boolean } | null;
  isMirrored: boolean;
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
  { id: BrushType.EMOJI, icon: Smile, label: 'Emoji' },
];

const EMOJIS = ['✨', '🔥', '❤️', '🎨', '🚀', '⭐', '🌈', '💎', '🌸', '🍕', '🐱', '🍦'];

const HandToolbar: React.FC<HandToolbarProps> = ({
  settings, updateSettings,
  side,
  handPointer,
  isMirrored
}) => {
  const [activePanel, setActivePanel] = React.useState<'none' | 'brush' | 'color'>('none');
  const colorButtonsRef = React.useRef<{ [key: string]: HTMLButtonElement | null }>({});
  const toolButtonsRef = React.useRef<{ [key: string]: HTMLButtonElement | null }>({});
  const [hoveredColor, setHoveredColor] = React.useState<string | null>(null);
  const [hoveredTool, setHoveredTool] = React.useState<string | null>(null);
  const hasActionedRef = React.useRef<boolean>(false);

  // Hand interaction for toolbar selection
  React.useEffect(() => {
    if (!handPointer) {
      setHoveredColor(null);
      setHoveredTool(null);
      hasActionedRef.current = false;
      return;
    }

    if (!handPointer.isPinching) {
      hasActionedRef.current = false;
    }

    // Adjust X coordinate based on mirroring
    const effectiveX = isMirrored ? (1 - handPointer.x) : handPointer.x;
    const x = effectiveX * window.innerWidth;
    const y = handPointer.y * window.innerHeight;

    let foundHoveredColor = null;
    let foundHoveredTool = null;

    // 1. Check color buttons if panel is open
    if (activePanel === 'color') {
      for (const c of COLORS) {
        const btn = colorButtonsRef.current[c];
        if (btn) {
          const rect = btn.getBoundingClientRect();
          if (x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom) {
            foundHoveredColor = c;
            if (handPointer.isPinching && !hasActionedRef.current) {
              updateSettings({ ...settings, color: c, isEraser: false });
              setActivePanel('none');
              hasActionedRef.current = true;
            }
            break;
          }
        }
      }
    }

    // 2. Check main tool buttons
    const toolButtons = [
      { id: 'color-btn', action: () => setActivePanel(activePanel === 'color' ? 'none' : 'color') },
      { id: 'brush-btn', action: () => setActivePanel(activePanel === 'brush' ? 'none' : 'brush') },
      { id: 'eraser-btn', action: () => { updateSettings({ ...settings, isEraser: !settings.isEraser }); setActivePanel('none'); } },
    ];

    for (const tool of toolButtons) {
      const btn = toolButtonsRef.current[tool.id];
      if (btn) {
        const rect = btn.getBoundingClientRect();
        if (x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom) {
          foundHoveredTool = tool.id;
          if (handPointer.isPinching && !hasActionedRef.current) {
            tool.action();
            hasActionedRef.current = true;
          }
        }
      }
    }

    setHoveredColor(foundHoveredColor);
    setHoveredTool(foundHoveredTool);
  }, [handPointer, activePanel, settings, updateSettings]);

  return (
    <div className={cn(
      "fixed top-1/2 -translate-y-1/2 z-50 flex items-center px-6 pointer-events-none",
      side === 'left' ? "left-0 flex-row" : "right-0 flex-row-reverse"
    )}>
      
      {/* Sidebar Toolbar */}
      <motion.div 
        initial={{ x: side === 'left' ? -50 : 50, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        className="pointer-events-auto flex flex-col items-center space-y-4 bg-black/40 backdrop-blur-3xl border border-white/5 p-3 rounded-full shadow-2xl relative"
      >
        <div className="absolute -top-10 left-1/2 -translate-x-1/2 text-[10px] font-bold text-white/30 tracking-[0.3em] uppercase">
          {side}
        </div>

        <ToolButton 
          ref={el => toolButtonsRef.current['palette-btn'] = el} // legacy ref name check? no, updating it
          icon={Palette} 
          active={activePanel === 'color'} 
          onClick={() => setActivePanel(activePanel === 'color' ? 'none' : 'color')} 
          colorIndicator={!settings.isEraser ? settings.color : undefined}
          isHovered={hoveredTool === 'palette-btn' || hoveredTool === 'color-btn'}
        />
        <ToolButton 
          ref={el => toolButtonsRef.current['brush-btn'] = el}
          icon={PenTool} 
          active={activePanel === 'brush'} 
          onClick={() => setActivePanel(activePanel === 'brush' ? 'none' : 'brush')} 
          isHovered={hoveredTool === 'brush-btn'}
        />
        <ToolButton 
          ref={el => toolButtonsRef.current['eraser-btn'] = el}
          icon={Eraser} 
          active={settings.isEraser} 
          onClick={() => { updateSettings({ ...settings, isEraser: !settings.isEraser }); setActivePanel('none'); }} 
          isHovered={hoveredTool === 'eraser-btn'}
        />
      </motion.div>

      {/* Floating Settings Panels */}
      <AnimatePresence>
        {activePanel !== 'none' && (
          <motion.div
            initial={{ opacity: 0, x: side === 'left' ? -20 : 20, scale: 0.95 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: side === 'left' ? -20 : 20, scale: 0.95 }}
            className={cn(
              "pointer-events-auto bg-black/60 backdrop-blur-2xl border border-white/10 rounded-3xl p-6 shadow-2xl w-64 mx-4",
            )}
          >
            {activePanel === 'brush' && (
              <div className="space-y-6">
                <div>
                  <label className="text-[10px] uppercase tracking-widest text-white/40 mb-3 block font-semibold">Brush Type</label>
                  <div className="grid grid-cols-2 gap-2">
                    {BRUSH_TYPES.map((t) => (
                      <button
                        key={t.id}
                        onClick={() => updateSettings({ ...settings, brushType: t.id, isEraser: false })}
                        className={cn(
                          "flex flex-col items-center justify-center p-3 rounded-2xl border transition-all duration-300",
                          settings.brushType === t.id && !settings.isEraser 
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

                {settings.brushType === BrushType.EMOJI && (
                   <div>
                     <label className="text-[10px] uppercase tracking-widest text-white/40 mb-3 block font-semibold">Emoji</label>
                     <div className="grid grid-cols-4 gap-2 bg-white/5 p-2 rounded-2xl">
                        {EMOJIS.map(e => (
                           <button 
                             key={e}
                             onClick={() => updateSettings({ ...settings, emoji: e })}
                             className={cn(
                               "text-lg p-1 rounded-lg transition-all hover:scale-125",
                               settings.emoji === e ? "bg-white/20 scale-110 shadow-lg" : "grayscale-[0.5] hover:grayscale-0"
                             )}
                           >
                             {e}
                           </button>
                        ))}
                     </div>
                   </div>
                )}
                
                <div>
                  <label className="text-[10px] uppercase tracking-widest text-white/40 mb-2 block font-mono">Size: {settings.size}px</label>
                  <input 
                    type="range" min="1" max="100" value={settings.size} 
                    onChange={(e) => updateSettings({ ...settings, size: Number(e.target.value) })}
                    className="w-full h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer accent-white"
                  />
                </div>
              </div>
            )}

            {activePanel === 'color' && (
              <div>
                <label className="text-[10px] uppercase tracking-widest text-white/40 mb-4 block font-semibold">Color</label>
                <div className="grid grid-cols-4 gap-2">
                  {COLORS.map((c) => (
                    <button
                      key={c}
                      ref={el => colorButtonsRef.current[c] = el}
                      onClick={() => updateSettings({ ...settings, color: c, isEraser: false })}
                      className={cn(
                        "w-full aspect-square rounded-full border-2 transition-all",
                        settings.color === c && !settings.isEraser ? "border-white scale-110" : "border-transparent scale-90 opacity-60",
                        hoveredColor === c ? "scale-110 opacity-100" : ""
                      )}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

interface ToolButtonProps {
  icon: any;
  active?: boolean;
  disabled?: boolean;
  onClick: () => void;
  colorIndicator?: string;
  isHovered?: boolean;
}

const ToolButton = React.forwardRef<HTMLButtonElement, ToolButtonProps>(({ icon: Icon, active, disabled, onClick, colorIndicator, isHovered }, ref) => (
  <button
    ref={ref}
    onClick={onClick}
    disabled={disabled}
    className={cn(
      "w-12 h-12 flex items-center justify-center rounded-full transition-all duration-500 relative group",
      active ? "bg-white text-black" : "text-white/60 hover:bg-white/10 hover:text-white",
      isHovered && !active && "bg-white/20 text-white",
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
));

export default HandToolbar;
