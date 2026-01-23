import { Agent, Provider } from "../types";
import { PixelField, type PixelFieldProps } from "./pixel-data";
import { getPixelField } from "./interpolators";

const CACHE_SIZE = 50;
export class PixelFieldAgent extends Agent<PixelFieldProps, PixelField> {}
export class PixelFieldProvider extends Provider<PixelFieldProps, PixelField> {}

export const pixelFieldAgent = new PixelFieldAgent(
  new PixelFieldProvider(getPixelField, CACHE_SIZE),
);

export const createPixelFieldAgent = () =>
  new PixelFieldAgent(new PixelFieldProvider(getPixelField, CACHE_SIZE));
