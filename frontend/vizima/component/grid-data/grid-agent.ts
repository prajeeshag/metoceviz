import { Agent, Provider } from "../../datatype/types";
import { GridScalar, type GridScalarProps } from "./grid-scalar";
import { GridVector, type GridVectorProps } from "./grid-vector";
import { fetchZarrGridScalar } from "./fetchers";
import { fetchZarrGridVector } from "./fetchers";

const CACHE_SIZE = 50;
export class GridScalarAgent extends Agent<GridScalarProps, GridScalar> { }
export class GridScalarProvider extends Provider<GridScalarProps, GridScalar> { }

const gridScalarProvider = new GridScalarProvider(fetchZarrGridScalar, CACHE_SIZE);
export const createGridScalarAgent = () => {
  return new GridScalarAgent(
    gridScalarProvider,
  )
};

export class GridVectorAgent extends Agent<GridVectorProps, GridVector> { }
export class GridVectorProvider extends Provider<GridVectorProps, GridVector> { }

const gridVectorProvider = new GridVectorProvider(fetchZarrGridVector, CACHE_SIZE);
export const createGridVectorAgent = () => {
  return new GridVectorAgent(
    gridVectorProvider,
  )
};