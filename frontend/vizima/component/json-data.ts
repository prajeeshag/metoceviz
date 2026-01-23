import { ImmutableComponent, Agent, Provider } from "./types";

export interface JsonDataProp {
  readonly url: string;
}

const DEFAULT_CACHE_SIZE = 10;

export class JsonData extends ImmutableComponent<JsonDataProp, any> {}

class JsonDataProvider extends Provider<JsonDataProp, JsonData> {}

class JsonDataAgent extends Agent<JsonDataProp, JsonData> {}

async function jsonDataFetch(
  props: JsonDataProp,
  signal: AbortSignal,
): Promise<JsonData> {
  try {
    const response = await fetch(props.url, { signal });
    const data = await response.json();
    return new JsonData(props, data);
  } catch (error) {
    console.error("Error fetching JSON data:", error);
    throw error;
  }
}

export const jsonDataAgent = new JsonDataAgent(
  new JsonDataProvider(jsonDataFetch, DEFAULT_CACHE_SIZE),
);
