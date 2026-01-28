import { Agent, Provider } from "../../datatype/types";
import { fetchZarrGrid } from "./fetch-zarr-grid";
import { type GridConfig, GridData } from "./grid-data";

const CACHE_SIZE = 50;
export class GridAgent extends Agent<GridConfig, GridData> {}
export class GridScalarProvider extends Provider<GridConfig, GridData> {}

const gridScalarProvider = new GridScalarProvider(fetchZarrGrid, CACHE_SIZE);

export const createGridAgent = () => {
  return new GridAgent(gridScalarProvider);
};
