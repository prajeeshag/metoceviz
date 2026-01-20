import { logger } from "../logger";

/**
 * Ensures T only contains:
 * 1. Primitives (string, number, boolean, null, undefined)
 * 2. Immutable Tuples (readonly [any, ...])
 * 3. Other Component instances (ImmutableComponent)
 */

type NonNullable<T> = T extends null | undefined ? never : T;

// This version is even more robust for optional properties
export type ValidComponentProps<T> = {
  readonly [K in keyof T]: NonNullable<T[K]> extends string | number | boolean
    ? T[K]
    : NonNullable<T[K]> extends readonly any[]
      ? number extends NonNullable<T[K]>["length"]
        ? never
        : T[K]
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
  public readonly props: T;
  private _fingerprint: string;
  readonly value: V;

  constructor(props: T, value: V) {
    this.props = this.deepFreeze(props);
    this._fingerprint = generateFingerPrint(this.props);
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
    return this._fingerprint;
  }

  public equals(other: unknown): boolean {
    if (this === other) return true;
    if (!(other instanceof ImmutableComponent)) return false;
    return this.getFingerprint() === other.getFingerprint();
  }

  public copy(changes: Partial<T>, value: V): this {
    return new (this.constructor as any)({
      ...this.props,
      ...changes,
      value: value,
    });
  }

  private deepFreeze(obj: any): any {
    Object.freeze(obj);
    Object.getOwnPropertyNames(obj).forEach((prop) => {
      const val = obj[prop];
      if (
        val !== null &&
        (typeof val === "object" || typeof val === "function") &&
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

  get(props: K): Promise<V> {
    return this.provider.get(props, this);
  }
}

type ComputeFn<K, V> = (props: K, signal: AbortSignal) => Promise<V>;

export class Provider<K, V> {
  private cache = new Map<string, V>();
  private processing = new WeakMap<Agent<K, V>, string>();
  private controllers = new WeakMap<Agent<K, V>, AbortController>();
  private logger = logger.child({ component: "Provider" });

  constructor(
    private compute: ComputeFn<K, V>,
    private maxCacheSize: number = 1,
  ) {}

  async get(props: K, agent: Agent<K, V>): Promise<V> {
    const stableKey = generateFingerPrint(props);

    if (this.cache.has(stableKey)) {
      const value = this.cache.get(stableKey)!;
      this.cache.delete(stableKey);
      this.cache.set(stableKey, value);
      logger.debug(`Returning cached value for ${stableKey}`);
      return value;
    }

    logger.debug(`Computing value for ${stableKey}`);
    this.controllers.get(agent)?.abort();
    const controller = new AbortController();
    this.controllers.set(agent, controller);

    const value = await this.compute(props, controller.signal);

    if (this.maxCacheSize > 0) {
      logger.debug(`Caching value for ${stableKey}`);
      this.cache.set(stableKey, value);
      if (this.cache.size > this.maxCacheSize) {
        const key = this.cache.keys().next().value;
        this.cache.delete(key!);
      }
    }
    return value;
  }

  setCacheSize(size: number) {
    this.maxCacheSize = size;
  }
}
