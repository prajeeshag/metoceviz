import { GridScalar, type GridScalarProps } from "./grid-scalar";
import { GridVector, type GridVectorProps } from "./grid-vector";
import { alignLongitude } from "./utils";
import * as zarr from "zarrita";
import { logger } from "../../logger";


interface Props {
  url: string;
  tIndex?: number;
  lIndex?: number;
  ysGlobal: number;
  xsGlobal: number;
  ys: number;
  xs: number;
  ny: number;
  nx: number;
  dy: number;
  dx: number;
}


async function fetchZarrGrid(
  props: Props,
  signal: AbortSignal,
): Promise<Float32Array> {
  const log = logger.child({ component: "fetchZarrGrid" });

  let rootUrl = props.url;
  if (!props.url.startsWith("http")) {
    rootUrl = new URL(props.url, window.location.origin).href;
  }

  const store = new zarr.FetchStore(rootUrl);

  const arr = await zarr.open(store, { kind: "array" });
  log.debug(`Opened Zarr at ${props.url}`);

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

  slice.push(getSlice(props.ysGlobal, props.ys, props.ny, props.dy));

  const xs = alignLongitude(props.xsGlobal, props.xs);
  slice.push(getSlice(props.xsGlobal, xs, props.nx, props.dx));

  const sliceArray = await zarr.get(arr, slice, { signal: signal } as any);
  const data = new Float32Array(sliceArray.data as any);
  const scaledData = data.map((x) => x * scale_factor + add_offset);
  return scaledData
}

function getSlice(gS: number, s: number, n: number, d: number): zarr.Slice {
  const istart = (gS - s) / d;
  const iend = istart + n;
  return zarr.slice(istart, iend);
}


export async function fetchZarrGridScalar(
  props: GridScalarProps,
  signal: AbortSignal,
): Promise<GridScalar> {
  const data = await fetchZarrGrid(props, signal);
  return new GridScalar(props, data);
}

export async function fetchZarrGridVector(
  props: GridVectorProps,
  signal: AbortSignal,
): Promise<GridVector> {
  const uData = await fetchZarrGrid({ ...props, url: props.uUrl }, signal);
  const vData = await fetchZarrGrid({ ...props, url: props.vUrl }, signal);
  return new GridVector(props, [uData, vData]);
}
