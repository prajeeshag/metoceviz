import { logger } from "../logger";

type NonNullable<T> = T extends null | undefined ? never : T;

export type ValidComponentProps<T> = {
  readonly [K in keyof T]: NonNullable<T[K]> extends string | number | boolean
    ? T[K]
    : NonNullable<T[K]> extends readonly (infer U)[]
      ? U extends string | number | boolean | ImmutableComponent<any, any>
        ? T[K]
        : never
      : NonNullable<T[K]> extends ImmutableComponent<any, any>
        ? T[K]
        : never;
};

function generateFingerPrint(obj: any): string {
  return JSON.stringify(obj, (key, value) => {
    // If the value is another Component, use its deterministic toString/fingerprint
    if (value instanceof ImmutableComponent) {
      return JSON.parse(value.getFingerprint());
    }

    // Sort keys of plain objects (internal props)
    if (value !== null && typeof value === "object" && !Array.isArray(value)) {
      return Object.keys(value)
        .sort()
        .reduce((sorted: any, k) => {
          sorted[k] = value[k];
          return sorted;
        }, {});
    }
    return value;
  });
}

export abstract class ImmutableComponent<T extends ValidComponentProps<T>, V> {
  public readonly props: ValidComponentProps<T>;
  public readonly value: V;

  constructor(props: ValidComponentProps<T>, value: V) {
    // this.props = this.deepFreeze(props);
    this.props = props;
    this.value = value;
  }

  /**
   * Returns a deterministic JSON string.
   * Overridden to provide safe, stable output for the component.
   */
  public toString(): string {
    return this.getFingerprint();
  }

  public getFingerprint(): string {
    return generateFingerPrint(this.props);
  }

  public equals(other: unknown): boolean {
    if (this === other) return true;
    if (!(other instanceof ImmutableComponent)) return false;
    return this.getFingerprint() === other.getFingerprint();
  }

  private deepFreeze(obj: any): any {
    // If the object is already frozen, we can trust it and stop here.
    if (Object.isFrozen(obj)) return obj;

    Object.freeze(obj);

    // If you want to be extra safe but efficient,
    // only recurse if the property isn't an ImmutableComponent
    Object.getOwnPropertyNames(obj).forEach((prop) => {
      const val = obj[prop];
      if (
        val !== null &&
        typeof val === "object" &&
        !(val instanceof ImmutableComponent) && // Skip if it's already one of your immutable classes
        !Object.isFrozen(val)
      ) {
        this.deepFreeze(val);
      }
    });
    return obj;
  }
}

export class Agent<K, V> {
  constructor(readonly provider: Provider<K, V>) {}

  get(props: K, args?: any): Promise<V> {
    return this.provider.get(props, this, args);
  }
}

type ComputeFn<K, V> = (
  props: K,
  signal: AbortSignal,
  args?: any,
) => Promise<V>;

export class Provider<K, V> {
  private cache = new Map<string, V>();
  // Track active computations to collapse duplicate requests
  private pending = new Map<string, Promise<V>>();
  private controllers = new WeakMap<Agent<K, V>, AbortController>();
  protected logger = logger.child({ component: this.constructor.name });

  constructor(
    private compute: ComputeFn<K, V>,
    private maxCacheSize: number = 1,
  ) {}

  async get(props: K, agent: Agent<K, V>, args?: any): Promise<V> {
    const stableKey = generateFingerPrint(props);

    // 1. Check LRU Cache
    if (this.cache.has(stableKey)) {
      const value = this.cache.get(stableKey)!;
      this.cache.delete(stableKey);
      this.cache.set(stableKey, value);
      this.logger.debug(`Returning cached value for ${stableKey}`);
      return value;
    }

    // 2. Check for In-Flight Request (Request Collapsing)
    if (this.pending.has(stableKey)) {
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

        if (this.maxCacheSize > 0) {
          this.cache.set(stableKey, value);
          if (this.cache.size > this.maxCacheSize) {
            const firstKey = this.cache.keys().next().value;
            this.cache.delete(firstKey!);
          }
        }
        return value;
      } finally {
        // Always clean up the pending map so future requests can re-compute if needed
        this.pending.delete(stableKey);
      }
    })();

    this.pending.set(stableKey, computePromise);
    return computePromise;
  }

  setCacheSize(size: number) {
    this.maxCacheSize = size;
  }
}
