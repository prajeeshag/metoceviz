import { Agent, Provider } from "../types";
import { GridScalarData, type GridScalarProps } from "./grid-data";
import { fetchZarrGrid } from "./fetchers";

const CACHE_SIZE = 50;
export class GridAgent extends Agent<GridScalarProps, GridScalarData> { }
export class GridProvider extends Provider<GridScalarProps, GridScalarData> { }

export const gridAgent = new GridAgent(
  new GridProvider(fetchZarrGrid, CACHE_SIZE),
);
