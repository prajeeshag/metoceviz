import { ImmutableComponent } from "../types";
import { GridScalar } from "../../datatype/grid";

export interface GridScalarProps {
  readonly url: string;
  readonly tIndex?: number;
  readonly lIndex?: number;
}

export class GridScalarData extends ImmutableComponent<
  GridScalarProps,
  GridScalar
> {}
