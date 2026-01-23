import { Dataset, type DatasetProps } from "./dataset";
import { type DataSet as DatasetType, type ScalarVar, type VectorVar } from "../../datatype/dataset";
import * as zarr from "zarrita";
import { logger } from "../../logger";
import { GridScalar } from "../../datatype/grid";

export async function fetchZarrDataset(
  props: DatasetProps,
  signal: AbortSignal,
): Promise<Dataset> {
  const log = logger.child({ component: "fetchZarrDataset" });

  const rootUrl = new URL(props.url, window.location.origin).href;
  const store = new zarr.FetchStore(rootUrl);
  let group:
    | zarr.Array<zarr.DataType, zarr.FetchStore>
    | zarr.Group<zarr.FetchStore>;
  try {
    group = await zarr.open(store);
    log.debug(`Opened Zarr at ${props.url}`);
  } catch (e) {
    log.error(`Failed to open Zarr store at ${props.url}`);
    throw new Error(`Failed to open Zarr store at ${props.url}`);
  }

  if (!(group instanceof zarr.Group)) {
    log.error(`${props.url} is not a Zarr group! Expected Zarr Group`);
    throw new Error(`${props.url} is not a Zarr group! Expected Zarr Group`);
  }

  const attrs = group.attrs as any;
  log.debug(`Fetched attributes: ${JSON.stringify(attrs)}`);

  return new Dataset(props, attrs);
}
