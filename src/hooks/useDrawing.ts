import { useState, useCallback } from 'react';
import { Point, Stroke, BrushType, BrushSettings } from '../types';

const DEFAULT_SETTINGS: BrushSettings = {
  color: '#FFFFFF',
  size: 10,
  opacity: 1,
  brushType: BrushType.PEN,
  emoji: '✨',
  isEraser: false,
};

export function useDrawing() {
  const [history, setHistory] = useState<Stroke[]>([]);
  const [redoStack, setRedoStack] = useState<Stroke[]>([]);
  const [currentStrokes, setCurrentStrokes] = useState<(Stroke | null)[]>([null, null]);
  
  const [leftSettings, setLeftSettings] = useState<BrushSettings>(DEFAULT_SETTINGS);
  const [rightSettings, setRightSettings] = useState<BrushSettings>({ ...DEFAULT_SETTINGS, color: '#FF5555' });

  const startStroke = useCallback((point: Point, handIndex: number = 0, isRightHand: boolean = true) => {
    const settings = isRightHand ? rightSettings : leftSettings;
    
    setCurrentStrokes(prev => {
      const next = [...prev];
      next[handIndex] = {
        points: [point],
        color: settings.color,
        size: settings.size,
        opacity: settings.opacity,
        brushType: settings.brushType,
        isEraser: settings.isEraser,
        emoji: settings.brushType === BrushType.EMOJI ? settings.emoji : undefined,
      };
      return next;
    });
  }, [leftSettings, rightSettings]);

  const moveStroke = useCallback((point: Point, handIndex: number = 0) => {
    setCurrentStrokes(prev => {
      if (!prev[handIndex]) return prev;
      const next = [...prev];
      const stroke = next[handIndex]!;
      next[handIndex] = {
        ...stroke,
        points: [...stroke.points, point],
      };
      return next;
    });
  }, []);

  const endStroke = useCallback((handIndex: number = 0) => {
    setCurrentStrokes(prev => {
      const stroke = prev[handIndex];
      if (stroke) {
        setHistory(h => [...h, stroke]);
        setRedoStack([]);
      }
      const next = [...prev];
      next[handIndex] = null;
      return next;
    });
  }, []);

  const undo = useCallback(() => {
    if (history.length === 0) return;
    const last = history[history.length - 1];
    setHistory(prev => prev.slice(0, -1));
    setRedoStack(prev => [...prev, last]);
  }, [history]);

  const redo = useCallback(() => {
    if (redoStack.length === 0) return;
    const last = redoStack[redoStack.length - 1];
    setHistory(prev => [...prev, last]);
    setRedoStack(prev => prev.slice(0, -1));
  }, [redoStack]);

  const clear = useCallback(() => {
    setHistory([]);
    setRedoStack([]);
  }, []);

  return {
    history,
    currentStrokes,
    startStroke,
    moveStroke,
    endStroke,
    undo,
    redo,
    clear,
    canUndo: history.length > 0,
    canRedo: redoStack.length > 0,
    brushSettings: { left: leftSettings, right: rightSettings },
    setBrushSettings: {
      left: setLeftSettings,
      right: setRightSettings
    }
  };
}
