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
import Toolbar from './components/Toolbar';
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
    currentStroke,
    startStroke,
    moveStroke,
    endStroke,
    undo,
    redo,
    clear,
    canUndo,
    canRedo,
    brushSettings
  } = useDrawing();

  const drawingLayerRef = useRef<DrawingLayerHandle>(null);
  
  // Hand tracking integration
  const handTracking = useHandTracking(videoRef, isCameraActive && isHandTrackingEnabled);
  
  const isMirrored = facingMode === 'user';
  
  // Connect hand tracking to drawing
  useEffect(() => {
    if (!isHandTrackingEnabled || !handTracking.pointer) {
      if (currentStroke) endStroke();
      return;
    }

    const rect = videoRef.current?.getBoundingClientRect();
    if (!rect) return;

    // Use refined coordinates
    // MediaPipe 0,0 is top-left.
    let x = handTracking.pointer.x * rect.width;
    const y = handTracking.pointer.y * rect.height;

    // Adjust for mirroring if necessary
    if (isMirrored) {
      x = rect.width - x;
    }

    if (handTracking.isPinching) {
      if (!currentStroke) {
        startStroke({ x, y, pressure: 0.8 });
      } else {
        moveStroke({ x, y, pressure: 0.8 });
      }
    } else {
      if (currentStroke) {
        endStroke();
      }
    }
  }, [handTracking, isHandTrackingEnabled, startStroke, moveStroke, endStroke, currentStroke, isMirrored]);

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
            currentStroke={currentStroke}
            history={history}
            onStrokeStart={startStroke}
            onStrokeMove={moveStroke}
            onStrokeEnd={endStroke}
            isCameraVisible={isCameraVisible}
          />

          {/* Hand Tracking Cursor */}
          {isHandTrackingEnabled && handTracking.pointer && (
            <motion.div
              className={`absolute w-6 h-6 rounded-full border-2 z-30 pointer-events-none transition-transform duration-75 ${handTracking.isPinching ? 'scale-75 bg-white border-white' : 'scale-100 border-white/50 bg-white/10'}`}
              style={{
                left: isMirrored 
                  ? `${(1 - handTracking.pointer.x) * 100}%` 
                  : `${handTracking.pointer.x * 100}%`,
                top: `${handTracking.pointer.y * 100}%`,
                x: '-50%',
                y: '-50%',
              }}
            >
               <div className="absolute inset-0 animate-ping rounded-full bg-white opacity-20" />
            </motion.div>
          )}

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
            
            {isHandTrackingEnabled && !handTracking.isLoading && !handTracking.pointer && (
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
          </AnimatePresence>

          {/* UI Layer: Controls */}
          <Toolbar 
            {...brushSettings}
            undo={undo}
            redo={redo}
            clear={clear}
            exportCanvas={handleExport}
            isCameraVisible={isCameraVisible}
            setIsCameraVisible={setIsCameraVisible}
            toggleCamera={toggleFacingMode}
            canUndo={canUndo}
            canRedo={canRedo}
            isHandTrackingEnabled={isHandTrackingEnabled}
            setIsHandTrackingEnabled={setIsHandTrackingEnabled}
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

