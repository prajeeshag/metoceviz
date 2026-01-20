import { ImmutableComponent, type ValidComponentProps } from "./types";

export interface CanvasProps {
  width: number;
  height: number;
}

export type ValidCanvasProps<T> = CanvasProps & ValidComponentProps<T>;

export abstract class Canvas<
  T extends ValidCanvasProps<T>,
> extends ImmutableComponent<T, HTMLCanvasElement> {}

export function createCanvasFn<
  T extends ValidCanvasProps<T>,
  U extends Canvas<T>,
>(
  classs: new (props: T, canvas: HTMLCanvasElement) => U,
  drawFn: (
    props: T,
    canvas: HTMLCanvasElement,
    signal: AbortSignal,
  ) => Promise<void>,
): (props: T, signal: AbortSignal) => Promise<U> {
  async function createCanvas(props: T, signal: AbortSignal) {
    const canvas = document.createElement("canvas");
    canvas.width = props.width;
    canvas.height = props.height;
    await drawFn(props, canvas, signal);
    return new classs(props, canvas);
  }
  return createCanvas;
}
