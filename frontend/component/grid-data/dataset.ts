import { ImmutableComponent } from "../types";
import { type DataSet } from "../../datatype/dataset";

export interface DatasetProps {
  readonly url: string;
}

export class Dataset extends ImmutableComponent<
  DatasetProps,
  DataSet
> {}
