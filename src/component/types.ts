/**
 * A generic interface for objects that can be
 * validated and serialized to JSON.
 */
export interface Serializable<T> {
  update(patch: Partial<T>): void;
  serialize(): string;
  isEqual(otherState: Serializable<T>): boolean;
}

type ValidateStrict<T> = {
  readonly [K in keyof T]: T[K] extends readonly any[]
    ? number extends T[K]["length"]
      ? never
      : T[K] extends any[]
        ? never
        : T[K]
    : T[K] extends object
      ? ValidateStrict<T[K]>
      : T[K];
};

/**
 * Ensures T only contains:
 * 1. Primitives (string, number, boolean, null, undefined)
 * 2. Immutable Tuples (readonly [any, ...])
 * 3. Other Component instances (ImmutableComponent)
 */

type NonNullable<T> = T extends null | undefined ? never : T;

// This version is even more robust for optional properties
type ValidateComponentProps<T> = {
  readonly [K in keyof T]: NonNullable<T[K]> extends string | number | boolean
    ? T[K]
    : NonNullable<T[K]> extends readonly any[]
      ? number extends NonNullable<T[K]>["length"]
        ? never
        : T[K]
      : NonNullable<T[K]> extends ImmutableComponent<any>
        ? T[K]
        : never;
};

export abstract class ImmutableComponent<T extends ValidateComponentProps<T>> {
  public readonly props: T;
  private _fingerprint: string | null = null;

  constructor(props: T) {
    this.props = this.deepFreeze(props);
  }

  /**
   * Returns a deterministic JSON string.
   * Overridden to provide safe, stable output for the component.
   */
  public toString(): string {
    return this.getFingerprint();
  }

  private getFingerprint(): string {
    if (this._fingerprint === null) {
      this._fingerprint = this.generateDeterministicJson(this.props);
    }
    return this._fingerprint;
  }

  public equals(other: unknown): boolean {
    if (this === other) return true;
    if (!(other instanceof ImmutableComponent)) return false;
    return this.getFingerprint() === other.getFingerprint();
  }

  public copy(changes: Partial<T>): this {
    return new (this.constructor as any)({
      ...this.props,
      ...changes,
    });
  }

  private generateDeterministicJson(obj: any): string {
    return JSON.stringify(obj, (key, value) => {
      // If the value is another Component, use its deterministic toString/fingerprint
      if (value instanceof ImmutableComponent) {
        return JSON.parse(value.getFingerprint());
      }

      // Sort keys of plain objects (internal props)
      if (
        value !== null &&
        typeof value === "object" &&
        !Array.isArray(value)
      ) {
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
