import { GridScalarData, type GridScalarProps } from "./grid-data";
import * as zarr from "zarrita";
import { logger } from "../../logger";
import { GridScalar } from "../../datatype/grid";


export async function fetchZarrGrid(
  props: GridScalarProps,
  signal: AbortSignal,
): Promise<GridScalarData> {
  const log = logger.child({ component: "fetchZarrGrid" });

  const rootUrl = new URL(props.url, window.location.origin).href;
  const store = new zarr.FetchStore(rootUrl);
  let arr:
    | zarr.Array<zarr.DataType, zarr.FetchStore>
    | zarr.Group<zarr.FetchStore>;
  try {
    arr = await zarr.open(store);
    log.debug(`Opened Zarr at ${props.url}`);
  } catch (e) {
    log.error(`Failed to open Zarr store at ${props.url}`);
    throw new Error(`Failed to open Zarr store at ${props.url}`);
  }

  if (arr instanceof zarr.Group) {
    log.error(`${props.url} is a Zarr group! Expected Zarr Array`);
    throw new Error(`${props.url} is a Zarr group! Expected Zarr Array`);
  }

  // 2. Fetch the metadata (Zarr attributes)
  // We assume attributes follow your header naming convention
  const attrs = arr.attrs as any;
  log.debug(`Fetched attributes: ${JSON.stringify(attrs)}`);

  for (const item of ["lat0", "dlat", "nlat", "lon0", "dlon", "nlon"]) {
    if (!(item in attrs)) {
      log.error(`Zarr store at ${props.url} is missing attribute ${item}`);
      throw new Error(
        `Zarr store at ${props.url} is missing attribute ${item}`,
      );
    }
  }

  let scale_factor: number;
  let add_offset: number;
  if (arr.attrs.scale_factor === undefined) {
    scale_factor = 1;
  } else {
    scale_factor = arr.attrs.scale_factor as number;
  }
  if (arr.attrs.add_offset === undefined) {
    add_offset = 0;
  } else {
    add_offset = arr.attrs.add_offset as number;
  }

  const ndim = arr.shape.length;

  const slice: (zarr.Slice | number)[] = [];
  if (props.tIndex !== undefined) {
    slice.push(props.tIndex);
  }
  if (props.lIndex !== undefined) {
    slice.push(props.lIndex);
  }
  slice.push(zarr.slice(null), zarr.slice(null));

  if (slice.length !== ndim) {
    log.error(
      `Dimension mismatch: source array has ${ndim} dimensions, but requested slice has ${slice.length} elements`,
    );
    throw new Error(
      `Dimension mismatch: source array has ${ndim} dimensions, but requested slice has ${slice.length} elements`,
    );
  }

  const sliceArray = await zarr.get(arr, slice, { signal: signal } as any);
  const data = new Float32Array(sliceArray.data as any);
  const scaledData = data.map((x) => x * scale_factor + add_offset);
  const scalar = new GridScalar(
    {
      x0: attrs.lon0,
      dx: attrs.dlon,
      nx: attrs.nlon,
      y0: attrs.lat0,
      dy: attrs.dlat,
      ny: attrs.nlat,
      isgeo: true,
      xwrap: true,
      ywrap: false,
    },
    scaledData,
  );
  return new GridScalarData(props, scalar);
}
