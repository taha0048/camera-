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
}

export type Stroke = {
  points: Point[];
  color: string;
  size: number;
  opacity: number;
  brushType: BrushType;
  isEraser: boolean;
};

export type CameraFacing = 'user' | 'environment';
