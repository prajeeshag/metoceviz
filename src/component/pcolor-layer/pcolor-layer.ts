import { Canvas, type CanvasProps } from "../canvas";
import type { PixelField } from "../pixel-field";

export interface PColorLayerProps extends CanvasProps {
  readonly field: PixelField;
}

export class PColorLayer extends Canvas<PColorLayerProps> {}
