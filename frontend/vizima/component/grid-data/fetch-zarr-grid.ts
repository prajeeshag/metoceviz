import * as zarr from "zarrita";
import { logger } from "../../logger";
import { type GridConfig, GridData } from "./grid-data";
import z from "zod";

const ZarrAttrsSchema = z.looseObject({
  scale_factor: z.coerce.number().default(1),
  add_offset: z.coerce.number().default(0),
});

export async function fetchZarrGrid(
  config: GridConfig,
  signal: AbortSignal,
): Promise<GridData> {
  const log = logger.child({ component: "fetchZarrGrid" });

  let rootUrl = config.url;
  if (!config.url.startsWith("http")) {
    rootUrl = new URL(config.url, window.location.origin).href;
  }

  const store = new zarr.FetchStore(rootUrl);

  const arr = await zarr.open(store, { kind: "array" });
  log.debug(`Opened Zarr at ${config.url}`);

  const attrs = ZarrAttrsSchema.parse(arr.attrs);

  const ndim = arr.shape.length;

  const slice: (zarr.Slice | number)[] = [];

  if (config.timeIndex !== undefined) {
    slice.push(config.timeIndex);
  }

  if (config.vertIndex !== undefined) {
    slice.push(config.vertIndex);
  }

  slice.push(zarr.slice(config.ys, config.ny + config.ys));
  slice.push(zarr.slice(config.xs, config.nx + config.xs));

  const sliceArray = await zarr.get(arr, slice, { signal: signal } as any);
  const values = new Float32Array(sliceArray.data as any).map(
    (x) => x * attrs.scale_factor + attrs.add_offset,
  );
  return new GridData(config, values);
}
