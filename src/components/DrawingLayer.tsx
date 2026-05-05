import React, { useRef, useEffect, useCallback, useState, useImperativeHandle, forwardRef } from 'react';
import { getStroke } from 'perfect-freehand';
import { Point, Stroke, BrushType } from '../types';

interface DrawingLayerProps {
  currentStrokes: (Stroke | null)[];
  history: Stroke[];
  onStrokeStart: (point: Point, handIndex?: number, customBrush?: Partial<Stroke>) => void;
  onStrokeMove: (point: Point, handIndex?: number) => void;
  onStrokeEnd: (handIndex?: number) => void;
  isCameraVisible: boolean;
}

export interface DrawingLayerHandle {
  getCanvasData: () => HTMLCanvasElement | null;
}

const DrawingLayer = forwardRef<DrawingLayerHandle, DrawingLayerProps>(({
  currentStrokes,
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
    if (stroke.brushType === BrushType.EMOJI && stroke.emoji) {
      ctx.save();
      ctx.font = `${stroke.size * 1.5}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.globalAlpha = stroke.opacity;
      
      let lastPoint = stroke.points[0];
      ctx.fillText(stroke.emoji, lastPoint.x, lastPoint.y);
      
      const minDistance = stroke.size * 1.5;
      for (let i = 1; i < stroke.points.length; i++) {
        const p = stroke.points[i];
        const dist = Math.sqrt(Math.pow(p.x - lastPoint.x, 2) + Math.pow(p.y - lastPoint.y, 2));
        if (dist > minDistance) {
          ctx.fillText(stroke.emoji, p.x, p.y);
          lastPoint = p;
        }
      }
      ctx.restore();
      return;
    }

    const rawPoints = stroke.points.map(p => [p.x, p.y, p.pressure]);
    const options: any = {
      size: stroke.size,
      thinning: 0.5,
      smoothing: 0.5,
      streamline: 0.5,
      simulatePressure: true,
      easing: (t: number) => t,
      last: true,
    };

    // Fine-tune based on brush type for a professional feel
    switch (stroke.brushType) {
      case BrushType.PEN:
        options.thinning = 0.7;
        options.streamline = 0.65;
        options.smoothing = 0.6;
        options.start = { taper: true, cap: true };
        options.end = { taper: true, cap: true };
        break;
      case BrushType.MARKER:
        options.thinning = 0.2;
        options.streamline = 0.5;
        options.smoothing = 0.5;
        break;
      case BrushType.NEON:
        options.thinning = 0.4;
        options.streamline = 0.7;
        options.smoothing = 0.6;
        break;
      case BrushType.CHALK:
        options.thinning = 0.3;
        options.streamline = 0.4;
        options.smoothing = 0.4;
        break;
    }

    const outlinePoints = getStroke(rawPoints, options);

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

    // Draw current strokes
    currentStrokes.forEach(stroke => {
      if (stroke) drawStroke(ctx, stroke);
    });
  }, [history, currentStrokes, drawStroke]);

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
    }, 0);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!currentStrokes[0]) return;
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    onStrokeMove({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
      pressure: e.pressure || 0.5,
    }, 0);
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    onStrokeEnd(0);
  };

  const isDrawing = currentStrokes.some(s => s !== null);

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
        style={{ cursor: isDrawing ? 'crosshair' : 'default' }}
      />
    </div>
  );
});

DrawingLayer.displayName = 'DrawingLayer';

export default DrawingLayer;
