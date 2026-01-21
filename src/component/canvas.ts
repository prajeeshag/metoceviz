import { type Painter } from "./painter";

export class Canvas {
  readonly canvas: HTMLCanvasElement;
  private painters: Painter<any>[];

  constructor(
    protected width: number,
    protected height: number,
    painters?: Painter<any>[],
    canvas?: HTMLCanvasElement,
  ) {
    this.canvas = canvas || document.createElement("canvas");
    this.painters = painters || [];
    this.canvas.width = this.width;
    this.canvas.height = this.height;
  }

  async render(signal?: AbortSignal): Promise<void> {
    this.canvas.getContext("2d")?.clearRect(0, 0, this.width, this.height);
    for (const renderer of this.painters) {
      if (signal?.aborted) {
        throw new Error("Canvas creation aborted");
      }
      renderer.draw(this.canvas, signal);
    }
  }

  addPainter(painter: Painter<any>) {
    this.painters.push(painter);
    return this;
  }

  removePainter(painter: Painter<any>) {
    this.painters = this.painters.filter((p) => p !== painter);
    return this;
  }

  clearPainters() {
    this.painters = [];
    return this;
  }
}
