import { useState, useCallback, useRef } from 'react';
import { Point, Stroke, BrushType } from '../types';

export function useDrawing() {
  const [history, setHistory] = useState<Stroke[]>([]);
  const [redoStack, setRedoStack] = useState<Stroke[]>([]);
  const [currentStroke, setCurrentStroke] = useState<Stroke | null>(null);
  
  const [color, setColor] = useState('#FFFFFF');
  const [size, setSize] = useState(10);
  const [opacity, setOpacity] = useState(1);
  const [brushType, setBrushType] = useState<BrushType>(BrushType.PEN);
  const [isEraser, setIsEraser] = useState(false);

  const startStroke = useCallback((point: Point) => {
    setCurrentStroke({
      points: [point],
      color,
      size,
      opacity,
      brushType,
      isEraser,
    });
  }, [color, size, opacity, brushType, isEraser]);

  const moveStroke = useCallback((point: Point) => {
    if (!currentStroke) return;
    setCurrentStroke(prev => {
      if (!prev) return null;
      return {
        ...prev,
        points: [...prev.points, point],
      };
    });
  }, [currentStroke]);

  const endStroke = useCallback(() => {
    if (!currentStroke) return;
    setHistory(prev => [...prev, currentStroke]);
    setRedoStack([]);
    setCurrentStroke(null);
  }, [currentStroke]);

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
    currentStroke,
    startStroke,
    moveStroke,
    endStroke,
    undo,
    redo,
    clear,
    canUndo: history.length > 0,
    canRedo: redoStack.length > 0,
    brushSettings: {
      color, setColor,
      size, setSize,
      opacity, setOpacity,
      brushType, setBrushType,
      isEraser, setIsEraser,
    }
  };
}
