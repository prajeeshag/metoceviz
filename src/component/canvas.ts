import { ImmutableComponent, type ValidComponentProps } from "./types";

export interface CanvasProps {
  width: number;
  height: number;
}

export type ValidCanvasProps<T> = CanvasProps & ValidComponentProps<T>;

export abstract class Canvas<
  T extends ValidCanvasProps<T>,
> extends ImmutableComponent<T> {
  constructor(
    props: T,
    readonly canvas: HTMLCanvasElement,
  ) {
    super(props);
  }
}

export function createCanvasFn<
  T extends ValidCanvasProps<T>,
  U extends Canvas<T>,
>(
  classs: new (props: T, canvas: HTMLCanvasElement) => U,
  createFn: (props: T, canvas: HTMLCanvasElement) => Promise<void>,
): (props: T) => Promise<U> {
  async function createCanvas(props: T) {
    const canvas = document.createElement("canvas");
    canvas.width = props.width;
    canvas.height = props.height;
    await createFn(props, canvas);
    return new classs(props, canvas);
  }
  return createCanvas;
}
