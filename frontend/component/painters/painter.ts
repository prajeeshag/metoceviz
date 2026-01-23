import { ImmutableComponent, type ValidComponentProps } from "../types";

export interface PainterProps {}

export type ValidPainterProps<T> = PainterProps & ValidComponentProps<T>;

export abstract class Painter<
  T extends ValidPainterProps<T>,
> extends ImmutableComponent<T, null> {
  abstract draw(canvas: HTMLCanvasElement, signal?: AbortSignal): Promise<void>;
}
