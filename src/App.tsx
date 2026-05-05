/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import LandingScreen from './components/LandingScreen';
import CameraLayer from './components/CameraLayer';
import DrawingLayer, { DrawingLayerHandle } from './components/DrawingLayer';
import HandToolbar from './components/HandToolbar';
import GlobalBar from './components/GlobalBar';
import { BrushType } from './types';
import { useCamera } from './hooks/useCamera';
import { useDrawing } from './hooks/useDrawing';
import { useHandTracking } from './hooks/useHandTracking';

export default function App() {
  const [hasStarted, setHasStarted] = useState(false);
  const [isCameraVisible, setIsCameraVisible] = useState(true);
  const [isHandTrackingEnabled, setIsHandTrackingEnabled] = useState(true);
  
  const { 
    videoRef, 
    setVideoRef,
    isActive: isCameraActive, 
    error: cameraError, 
    startCamera, 
    toggleFacingMode,
    facingMode
  } = useCamera();

  const {
    history,
    currentStrokes,
    startStroke,
    moveStroke,
    endStroke,
    undo,
    redo,
    clear,
    canUndo,
    canRedo,
    brushSettings,
    setBrushSettings
  } = useDrawing();

  const drawingLayerRef = useRef<DrawingLayerHandle>(null);
  const currentStrokesRef = useRef<(Stroke | null)[]>([null, null]);

  useEffect(() => {
    currentStrokesRef.current = currentStrokes;
  }, [currentStrokes]);
  
  // Hand tracking integration
  const handTracking = useHandTracking(videoRef, isCameraActive && isHandTrackingEnabled);
  
  const isMirrored = facingMode === 'user';
  
  // Sync hand tracking to drawing and UI
  const [uiPointers, setUiPointers] = useState<{ x: number, y: number, isPinching: boolean, handIndex: number }[]>([]);

  const [isClearing, setIsClearing] = useState(false);
  
  useEffect(() => {
    const handleClearGesture = () => {
      if (isHandTrackingEnabled) {
        clear();
        setIsClearing(true);
        setTimeout(() => setIsClearing(false), 2000);
      }
    };
    window.addEventListener('hand-clear-gesture', handleClearGesture);
    return () => window.removeEventListener('hand-clear-gesture', handleClearGesture);
  }, [isHandTrackingEnabled, clear]);

  useEffect(() => {
    if (!isHandTrackingEnabled || !handTracking.pointers.length || !videoRef.current) {
      setUiPointers([]);
      currentStrokes.forEach((stroke, i) => {
        if (stroke) endStroke(i);
      });
      return;
    }

    const video = videoRef.current;
    const rect = video.getBoundingClientRect();
    const vWidth = video.videoWidth;
    const vHeight = video.videoHeight;
    const cWidth = rect.width;
    const cHeight = rect.height;

    if (vWidth === 0 || vHeight === 0) return;

    const vRatio = vWidth / vHeight;
    const cRatio = cWidth / cHeight;

    const newPointers = handTracking.pointers.map((p, i) => {
      let cx = p.x;
      let cy = p.y;

      if (vRatio > cRatio) {
        const scale = vRatio / cRatio;
        cx = cx * scale + (1 - scale) / 2;
      } else {
        const scale = cRatio / vRatio;
        cy = cy * scale + (1 - scale) / 2;
      }

      // Calculate screen X for sorting (handling mirror)
      const screenX = isMirrored ? (1 - cx) : cx;

      return { x: cx, y: cy, screenX, isPinching: p.isPinching, originalHandedness: p.handedness, handIndex: i };
    });

    // Sort detected hands by screen position to stabilize Left/Right assignment
    const sortedPointers = [...newPointers].sort((a, b) => a.screenX - b.screenX);
    
    // Assign stable side-based identity
    const finalPointers = sortedPointers.map((p, i) => ({
      ...p,
      stableSide: sortedPointers.length === 1 
        ? (p.screenX < 0.5 ? 'Left' : 'Right') // If one hand, guess side
        : (i === 0 ? 'Left' : 'Right')        // If two hands, leftmost is Left
    }));

    setUiPointers(finalPointers.map(p => ({ x: p.x, y: p.y, isPinching: p.isPinching, handIndex: p.handIndex, handedness: p.stableSide as 'Left' | 'Right' })));

    // Drawing logic for each hand
    finalPointers.forEach(ptr => {
      const strokeIdx = ptr.stableSide === 'Right' ? 1 : 0;
      const isRightHand = ptr.stableSide === 'Right';
      
      let x = ptr.x * rect.width;
      const y = ptr.y * rect.height;

      if (isMirrored) {
        x = rect.width - x;
      }

      if (ptr.isPinching) {
        if (!currentStrokesRef.current[strokeIdx]) {
          startStroke({ x, y, pressure: 0.8 }, strokeIdx, isRightHand);
        } else {
          moveStroke({ x, y, pressure: 0.8 }, strokeIdx);
        }
      } else if (currentStrokesRef.current[strokeIdx]) {
        endStroke(strokeIdx);
      }
    });

    // End strokes for hands that are no longer detected on their respective sides
    currentStrokesRef.current.forEach((stroke, i) => {
      if (!stroke) return;
      const side = i === 1 ? 'Right' : 'Left';
      if (!finalPointers.some(p => p.stableSide === side)) {
        endStroke(i);
      }
    });

  }, [handTracking.pointers, isHandTrackingEnabled, startStroke, moveStroke, endStroke, isMirrored]);

  const handleStart = useCallback(() => {
    setHasStarted(true);
    startCamera();
  }, [startCamera]);

  const handleExport = useCallback(() => {
    const drawingCanvas = drawingLayerRef.current?.getCanvasData();
    if (!drawingCanvas) return;

    // Create a composite canvas
    const compositeCanvas = document.createElement('canvas');
    compositeCanvas.width = drawingCanvas.width;
    compositeCanvas.height = drawingCanvas.height;
    const ctx = compositeCanvas.getContext('2d');
    if (!ctx) return;

    // If camera is visible, draw video frame first
    if (isCameraVisible && videoRef.current && isCameraActive) {
      // Handle video aspect ratio / object-cover replication
      const video = videoRef.current;
      const vWidth = video.videoWidth;
      const vHeight = video.videoHeight;
      const cWidth = compositeCanvas.width;
      const cHeight = compositeCanvas.height;
      
      const vRatio = vWidth / vHeight;
      const cRatio = cWidth / cHeight;
      
      let sx, sy, sWidth, sHeight;
      
      if (vRatio > cRatio) {
        sHeight = vHeight;
        sWidth = vHeight * cRatio;
        sx = (vWidth - sWidth) / 2;
        sy = 0;
      } else {
        sWidth = vWidth;
        sHeight = vWidth / cRatio;
        sx = 0;
        sy = (vHeight - sHeight) / 2;
      }

      ctx.drawImage(video, sx, sy, sWidth, sHeight, 0, 0, cWidth, cHeight);
    } else {
      // Draw dark background if camera is off
      ctx.fillStyle = '#0a0a0a';
      ctx.fillRect(0, 0, compositeCanvas.width, compositeCanvas.height);
    }

    // Draw lines over the top
    // Note: drawingCanvas is already scaled for DPR, we draw it as-is
    ctx.drawImage(drawingCanvas, 0, 0);

    // Download
    const link = document.createElement('a');
    link.download = `lumina-capture-${Date.now()}.png`;
    link.href = compositeCanvas.toDataURL('image/png', 1.0);
    link.click();
  }, [isCameraVisible, isCameraActive, videoRef]);

  return (
    <div className="relative w-full h-screen bg-black overflow-hidden font-sans select-none">
      <AnimatePresence>
        {!hasStarted && (
          <LandingScreen onStart={handleStart} />
        )}
      </AnimatePresence>

      {hasStarted && (
        <motion.main
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1.5 }}
          className="absolute inset-0"
        >
          {/* Base Layer: Camera */}
          <CameraLayer 
            videoRef={setVideoRef}
            isActive={isCameraActive}
            isVisible={isCameraVisible}
            error={cameraError}
            isMirrored={isMirrored}
          />

          {/* Interaction Layer: Drawing */}
          <DrawingLayer
            ref={drawingLayerRef}
            currentStrokes={currentStrokes}
            history={history}
            onStrokeStart={startStroke}
            onStrokeMove={moveStroke}
            onStrokeEnd={endStroke}
            isCameraVisible={isCameraVisible}
          />

          {/* Landmark Debug Overlay */}
          {isHandTrackingEnabled && handTracking.allLandmarks && (
             <div className="absolute inset-0 z-20 pointer-events-none overflow-hidden opacity-30">
                {handTracking.allLandmarks.flat().map((l: any, i: number) => {
                   let dx = l.x;
                   let dy = l.y;
                   
                   const video = videoRef.current;
                   if (video) {
                      const rect = video.getBoundingClientRect();
                      const vRatio = video.videoWidth / video.videoHeight;
                      const cRatio = rect.width / rect.height;
                      if (vRatio > cRatio) {
                        const scale = vRatio / cRatio;
                        dx = dx * scale + (1 - scale) / 2;
                      } else {
                        const scale = cRatio / vRatio;
                        dy = dy * scale + (1 - scale) / 2;
                      }
                   }

                   return (
                      <div 
                        key={i}
                        className="absolute w-1 h-1 bg-white rounded-full translate-x-[-50%] translate-y-[-50%]"
                        style={{
                           left: isMirrored ? `${(1 - dx) * 100}%` : `${dx * 100}%`,
                           top: `${dy * 100}%`
                        }}
                      />
                   );
                })}
             </div>
          )}

          {/* Hand Tracking Cursor */}
          {isHandTrackingEnabled && uiPointers.map(ptr => (
            <motion.div
              key={ptr.handIndex}
              className={`absolute w-6 h-6 rounded-full border-2 z-30 pointer-events-none transition-transform duration-75 flex items-center justify-center ${ptr.isPinching ? 'scale-75 bg-white border-white' : 'scale-100 border-white/50 bg-white/10'}`}
              style={{
                left: isMirrored 
                  ? `${(1 - ptr.x) * 100}%` 
                  : `${ptr.x * 100}%`,
                top: `${ptr.y * 100}%`,
                x: '-50%',
                y: '-50%',
              }}
            >
               {ptr.handedness === 'Left' && brushSettings.left.brushType === 'emoji' && (
                 <span className="text-sm absolute -top-6">{brushSettings.left.emoji}</span>
               )}
               {ptr.handedness === 'Right' && brushSettings.right.brushType === 'emoji' && (
                 <span className="text-sm absolute -top-6">{brushSettings.right.emoji}</span>
               )}
               <div className="absolute inset-0 animate-ping rounded-full bg-white opacity-20" />
            </motion.div>
          ))}

          {/* Hand Tracking Status */}
          <AnimatePresence>
            {isHandTrackingEnabled && handTracking.error && (
              <motion.div
                key="error"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                className="absolute top-24 left-1/2 -translate-x-1/2 z-50 bg-red-500/20 backdrop-blur-md px-4 py-2 rounded-full border border-red-500/30"
              >
                <div className="flex items-center space-x-3">
                  <div className="w-2 h-2 bg-red-500 rounded-full" />
                  <span className="text-white/90 text-[10px] font-medium uppercase tracking-[0.2em]">{handTracking.error}</span>
                </div>
              </motion.div>
            )}

            {isHandTrackingEnabled && handTracking.isLoading && !handTracking.error && (
              <motion.div
                key="loading"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                className="absolute top-24 left-1/2 -translate-x-1/2 z-50 bg-white/10 backdrop-blur-md px-4 py-2 rounded-full border border-white/10"
              >
                <div className="flex items-center space-x-3">
                  <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
                  <span className="text-white/80 text-[10px] font-medium uppercase tracking-[0.2em]">Initializing Neural Hand Engine...</span>
                </div>
              </motion.div>
            )}
            
            {isHandTrackingEnabled && !handTracking.isLoading && handTracking.pointers.length > 0 && (
              <motion.div
                key="status"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                className="absolute top-24 left-1/2 -translate-x-1/2 z-50 bg-white/10 backdrop-blur-md px-4 py-2 rounded-full border border-white/10"
              >
                <div className="flex items-center space-x-3">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.6)]" />
                  <span className="text-white/80 text-[10px] font-medium uppercase tracking-[0.2em]">
                    Tracking active {handTracking.allLandmarks && handTracking.allLandmarks.length > 1 ? `(${handTracking.allLandmarks.length} Hands)` : "(1 Hand)"}
                  </span>
                </div>
              </motion.div>
            )}
            
            {isHandTrackingEnabled && !handTracking.isLoading && handTracking.pointers.length === 0 && (
               <motion.div
                 key="hint"
                 initial={{ opacity: 0, y: 10 }}
                 animate={{ opacity: 1, y: 0 }}
                 exit={{ opacity: 0, y: 10 }}
                 className="absolute bottom-32 left-1/2 -translate-x-1/2 z-50 bg-white/10 backdrop-blur-md px-6 py-3 rounded-full border border-white/10"
               >
                 <div className="flex flex-col items-center">
                    <span className="text-white/40 text-[8px] uppercase tracking-widest mb-1">Scanning for interactions</span>
                    <span className="text-white/80 text-xs font-light">Place your hand in view to begin</span>
                 </div>
               </motion.div>
            )}

            {isClearing && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 1.1 }}
                className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 flex flex-col items-center justify-center p-8 bg-black/40 backdrop-blur-xl rounded-full border border-white/10 shadow-2xl pointer-events-none"
              >
                <div className="text-white/90 text-sm font-bold uppercase tracking-[0.5em] mb-2">Canvas Cleared</div>
                <div className="w-12 h-[1px] bg-white/30 mb-2" />
                <div className="text-white/40 text-[10px] uppercase tracking-widest">Gesture Detected</div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Individual Hand Toolbars */}
          <HandToolbar 
            side="left" 
            settings={brushSettings.left} 
            updateSettings={setBrushSettings.left}
            handPointer={uiPointers.find(p => p.handedness === 'Left') || null}
            isMirrored={isMirrored}
          />
          <HandToolbar 
            side="right" 
            settings={brushSettings.right} 
            updateSettings={setBrushSettings.right}
            handPointer={uiPointers.find(p => p.handedness === 'Right') || null}
            isMirrored={isMirrored}
          />

          <GlobalBar 
            undo={undo}
            redo={redo}
            clear={clear}
            exportCanvas={handleExport}
            canUndo={canUndo}
            canRedo={canRedo}
            isCameraVisible={isCameraVisible}
            setIsCameraVisible={setIsCameraVisible}
            toggleCamera={toggleFacingMode}
            isHandTrackingEnabled={isHandTrackingEnabled}
            setIsHandTrackingEnabled={setIsHandTrackingEnabled}
            isTracking={handTracking.pointers.length > 0}
          />

          {/* Branding Micro-Overlay */}
          <div className="absolute top-8 left-8 z-50 pointer-events-none opacity-40">
             <div className="flex flex-col">
                <span className="text-white text-[10px] font-bold uppercase tracking-[0.4em] mb-1">Lumina Canvas</span>
                <div className="h-[1px] w-12 bg-white/30" />
             </div>
          </div>

          <div className="absolute top-8 right-8 z-50 pointer-events-none opacity-40 text-right">
             <div className="flex flex-col items-end">
                <span className="text-white/60 text-[8px] font-mono tracking-widest uppercase">Precision Render Engine</span>
                <span className="text-white/40 text-[8px] font-mono tracking-widest uppercase">v1.2.0</span>
             </div>
          </div>
        </motion.main>
      )}
    </div>
  );
}

