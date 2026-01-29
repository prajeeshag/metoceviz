import { GridData } from "../grid-data";
import { Data } from "../../datatype/types";

export type PixelConfig = {
  readonly grid: GridData;
  readonly viewSize: [number, number];
};

export class PixelData<Config extends PixelConfig> extends Data<
  Config,
  Float32Array
> {
  isDefined(x: number, y: number): boolean {
    return !Number.isNaN(this.get(x, y));
  }

  get(x: number, y: number): number {
    if (
      x < 0 ||
      x >= this.props.viewSize[0] ||
      y < 0 ||
      y >= this.props.viewSize[1]
    ) {
      return NaN;
    }
    const val = this.value[x + y * this.props.viewSize[0]];
    return val === undefined ? NaN : val;
  }
}
