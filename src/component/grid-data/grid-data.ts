import { ImmutableComponent } from "../types";
import { GeoGridScalar } from "../../datatype/grid";

export interface GridScalarProps {
  readonly url: string;
  readonly tIndex?: number;
  readonly lIndex?: number;
}

export class GridScalarData extends ImmutableComponent<
  GridScalarProps,
  GeoGridScalar
> {}
