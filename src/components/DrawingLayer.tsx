import React, { useRef, useEffect, useCallback, useState, useImperativeHandle, forwardRef } from 'react';
import { getStroke } from 'perfect-freehand';
import { Point, Stroke, BrushType } from '../types';

interface DrawingLayerProps {
  currentStroke: Stroke | null;
  history: Stroke[];
  onStrokeStart: (point: Point) => void;
  onStrokeMove: (point: Point) => void;
  onStrokeEnd: () => void;
  isCameraVisible: boolean;
}

export interface DrawingLayerHandle {
  getCanvasData: () => HTMLCanvasElement | null;
}

const DrawingLayer = forwardRef<DrawingLayerHandle, DrawingLayerProps>(({
  currentStroke,
  history,
  onStrokeStart,
  onStrokeMove,
  onStrokeEnd,
  isCameraVisible,
}, ref) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const getSvgPathFromStroke = (stroke: number[][]) => {
    if (!stroke.length) return '';
    const d = stroke.reduce(
      (acc, [x0, y0], i, arr) => {
        const [x1, y1] = arr[(i + 1) % arr.length];
        acc.push(x0, y0, (x0 + x1) / 2, (y0 + y1) / 2);
        return acc;
      },
      ['M', ...stroke[0], 'Q']
    );

    d.push('Z');
    return d.join(' ');
  };

  const drawStroke = useCallback((ctx: CanvasRenderingContext2D, stroke: Stroke) => {
    const rawPoints = stroke.points.map(p => [p.x, p.y, p.pressure]);
    const outlinePoints = getStroke(rawPoints, {
      size: stroke.size,
      thinning: stroke.brushType === BrushType.PEN ? 0.5 : 0,
      smoothing: 0.5,
      streamline: 0.5,
      easing: (t) => t,
      simulatePressure: true,
      last: true,
    });

    const pathData = getSvgPathFromStroke(outlinePoints);
    const path = new Path2D(pathData);

    ctx.save();
    
    if (stroke.isEraser) {
      // If camera is visible, we want to see the camera THROUGH the erase path
      // This means we use destination-out to clear the drawing canvas
      ctx.globalCompositeOperation = 'destination-out';
    } else {
      ctx.globalCompositeOperation = 'source-over';
      ctx.fillStyle = stroke.color;
      ctx.globalAlpha = stroke.opacity;

      if (stroke.brushType === BrushType.NEON) {
        ctx.shadowBlur = stroke.size * 2;
        ctx.shadowColor = stroke.color;
      }
    }

    ctx.fill(path);
    ctx.restore();
  }, []);

  const render = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw history
    history.forEach(stroke => drawStroke(ctx, stroke));

    // Draw current stroke
    if (currentStroke) {
      drawStroke(ctx, currentStroke);
    }
  }, [history, currentStroke, drawStroke]);

  // Handle resizing
  useEffect(() => {
    const handleResize = () => {
      if (!containerRef.current || !canvasRef.current) return;
      const { width, height } = containerRef.current.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      
      canvasRef.current.width = width * dpr;
      canvasRef.current.height = height * dpr;
      canvasRef.current.style.width = `${width}px`;
      canvasRef.current.style.height = `${height}px`;
      
      const ctx = canvasRef.current.getContext('2d');
      if (ctx) ctx.scale(dpr, dpr);
      render();
    };

    window.addEventListener('resize', handleResize);
    handleResize();
    return () => window.removeEventListener('resize', handleResize);
  }, [render]);

  useEffect(() => {
    render();
  }, [render]);

  useImperativeHandle(ref, () => ({
    getCanvasData: () => canvasRef.current,
  }));

  const handlePointerDown = (e: React.PointerEvent) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    
    onStrokeStart({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
      pressure: e.pressure || 0.5,
    });
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!currentStroke) return;
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    onStrokeMove({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
      pressure: e.pressure || 0.5,
    });
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    onStrokeEnd();
  };

  return (
    <div 
      ref={containerRef} 
      className="absolute inset-0 z-10 touch-none overflow-hidden"
    >
      <canvas
        ref={canvasRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        className="block"
        style={{ cursor: currentStroke ? 'crosshair' : 'default' }}
      />
    </div>
  );
});

DrawingLayer.displayName = 'DrawingLayer';

export default DrawingLayer;
