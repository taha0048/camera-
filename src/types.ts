export type Point = {
  x: number;
  y: number;
  pressure: number;
};

export enum BrushType {
  PEN = 'pen',
  MARKER = 'marker',
  NEON = 'neon',
  CHALK = 'chalk',
  EMOJI = 'emoji',
}

export type BrushSettings = {
  color: string;
  size: number;
  opacity: number;
  brushType: BrushType;
  emoji: string;
  isEraser: boolean;
};

export type Stroke = {
  points: Point[];
  color: string;
  size: number;
  opacity: number;
  brushType: BrushType;
  isEraser: boolean;
  emoji?: string;
};

export type CameraFacing = 'user' | 'environment';
