import { logger } from "../logger";
import stringify from "json-stable-stringify";

type Primitive = string | number | boolean | bigint | symbol | undefined | null;

export type ConfigType =
  | Primitive
  | readonly Primitive[]
  | { readonly [key: string]: ConfigType }
  | Data<any, any>;

export class Data<Config extends ConfigType, Value> {
  constructor(
    readonly props: Config,
    readonly value: Value,
  ) {}

  toJSON() {
    return this.props;
  }
}

export class Agent<Prop extends ConfigType, Value> {
  constructor(readonly provider: Provider<Prop, Value>) {}

  get(props: Prop, args?: any): Promise<Value> {
    return this.provider.get(props, this, args);
  }
}

type ComputeFn<Prop extends ConfigType, Value> = (
  props: Prop,
  signal: AbortSignal,
  args?: any,
) => Promise<Value>;

export class Provider<Prop extends ConfigType, Value> {
  private cache = new Map<string, Value>();
  private pending = new Map<string, Promise<Value>>();
  private controllers = new WeakMap<Agent<Prop, Value>, AbortController>();
  protected logger = logger.child({ component: this.constructor.name });

  constructor(
    private compute: ComputeFn<Prop, Value>,
    private maxCacheSize: number = 1,
  ) {}

  async get(
    props: Prop,
    agent: Agent<Prop, Value>,
    args?: any,
  ): Promise<Value> {
    const stableKey = stringify(props);

    if (stableKey && this.cache.has(stableKey)) {
      const value = this.cache.get(stableKey)!;
      this.cache.delete(stableKey);
      this.cache.set(stableKey, value);
      this.logger.debug(`Returning cached value for ${stableKey}`);
      return value;
    }

    if (stableKey && this.pending.has(stableKey)) {
      this.logger.debug(`Awaiting existing computation for ${stableKey}`);
      return this.pending.get(stableKey)!;
    }

    // 3. Setup Abort Logic
    this.controllers.get(agent)?.abort();
    const controller = new AbortController();
    this.controllers.set(agent, controller);

    // 4. Start Compute and store the Promise
    this.logger.debug(`Computing value for ${stableKey}`);
    const computePromise = (async () => {
      try {
        const value = await this.compute(props, controller.signal, args);

        if (this.maxCacheSize > 0 && stableKey) {
          this.cache.set(stableKey, value);
          if (this.cache.size > this.maxCacheSize) {
            const firstKey = this.cache.keys().next().value;
            this.cache.delete(firstKey!);
          }
        }
        return value;
      } finally {
        // Always clean up the pending map so future requests can re-compute if needed
        this.pending.delete(stableKey!);
      }
    })();

    this.pending.set(stableKey!, computePromise);
    return computePromise;
  }

  setCacheSize(size: number) {
    this.maxCacheSize = size;
  }
}
