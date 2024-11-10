/**
 * @template [T=unknown]
 * @typedef {(x: T, y: T) => number} CompareFn
 */

/**
 * @template T
 * @typedef {object} Plugin
 * @property {(x: unknown) => x is T} predicate
 * @property {CompareFn<T>} [compare]
 */

/**
 * @template T
 * @typedef {T extends CompareFn<infer U> ? U : never} Comparable
 */

/**
 * @typedef {Comparable<typeof compare>} DefaultComparable
 */

/**
 * @typedef {(
 *  | string
 *  | number
 *  | boolean
 *  | Date
 *  | RegExp
 * )} Primitive
 */

/**
 * Because NaN < NaN => false, this function returns 0 for (NaN, NaN).
 * @template {Primitive} T
 * @param {T} x
 * @param {T} y
 */
function comparePrimitives(x, y) {
  if (x < y) {
    return -1;
  }
  if (x > y) {
    return 1;
  }
  return 0;
}

/**
 * @template T
 * @param {{ [key: string]: T }} x
 * @param {{ [key: string]: T }} y
 * @param {CompareFn<T>} compareProperties
 * @returns {number}
 */
function compareObjects(x, y, compareProperties) {
  const keysOfX = Object.keys(x).sort();
  const keysOfY = Object.keys(y).sort();
  const n = keysOfX.length;
  const m = keysOfY.length;
  for (let i = 0; i < n && i < m; i += 1) {
    let result = comparePrimitives(keysOfX[i], keysOfY[i]);
    if (result !== 0) {
      return result;
    }
    result = compareProperties(x[keysOfX[i]], y[keysOfY[i]]);
    if (result !== 0) {
      return result;
    }
  }
  return comparePrimitives(n, m);
}

/**
 * @template T
 * @param {T[]} x
 * @param {T[]} y
 * @param {CompareFn<T>} compareItems
 */
function compareArrays(x, y, compareItems) {
  const n = x.length;
  const m = y.length;
  for (let i = 0; i < n && i < m; i += 1) {
    const result = compareItems(x[i], y[i]);
    if (result !== 0) {
      return result;
    }
  }
  return comparePrimitives(n, m);
}

/**
 * @template T
 * @typedef {EJSONObject<T> | EJSONArray<T> | T} EJSONValue
 */

/**
 * @template T
 * @typedef {{ [x: string]: EJSONValue<T> }} EJSONObject
 */

/**
 * @template T
 * @typedef {Array<EJSONValue<T>>} EJSONArray
 */

/**
 * @template T
 */
export class Builder {
  #plugins;

  /**
   * @private
   * @param {Array<Plugin<unknown>>} plugins
   */
  constructor(plugins) {
    this.#plugins = plugins;
  }

  /**
   * Elements of type U will come after any other type defined so far.
   * @template U
   * @param {(x: unknown) => x is U} predicate
   * @param {CompareFn<U>} compare
   * @returns {Builder<T | U>}
   */
  ifType(predicate, compare) {
    return new Builder([
      ...this.#plugins,
      /** @type {Plugin<unknown>} */ ({ predicate, compare }),
    ]);
  }

  /**
   * @returns {Builder<T>}
   */
  thenTypeObject() {
    return new Builder([
      ...this.#plugins,
      /** @type {Plugin<unknown>} */ ({ predicate: isObject }),
    ]);
  }

  /**
   * @returns {Builder<T>}
   */
  thenTypeArray() {
    return new Builder([
      ...this.#plugins,
      /** @type {Plugin<unknown>} */ ({ predicate: isArray }),
    ]);
  }

  /**
   * @returns {CompareFn<EJSONValue<T>>}
   */
  get() {
    /** @type {Map<number, CompareFn<unknown>>} */
    const compareFnCache = new Map();
    /**
     * @param {EJSONValue<T>} x
     * @param {EJSONValue<T>} y
     * @returns {number}
     */
    const compare = (x, y) => {
      let i = -1;
      let j = -1;
      for (let k = 0; k < this.#plugins.length; k += 1) {
        const { predicate } = this.#plugins[k];
        if (predicate(x)) {
          i = k;
        }
        if (predicate(y)) {
          j = k;
        }
      }
      if (i !== j) {
        return comparePrimitives(i, j);
      }
      if (i >= 0) {
        const { compare: cmp } = this.#plugins[i];
        if (cmp) {
          return cmp(x, y);
        }
      }
      const isObjectX = isObject(x);
      const isObjectY = isObject(y);
      if (isObjectX) {
        if (isObjectY) {
          return compareObjects(x, y, compare);
        }
        // x is an object, y is an array
        return -1;
      }
      const isArrayX = isArray(x);
      const isArrayY = isArray(y);
      if (isArrayX) {
        if (isArrayY) {
          return compareArrays(x, y, compare);
        }
        // x is an array, y is an object
        return 1;
      }
      return 0;
    };
    return compare;
  }

  /**
   * @returns {Builder<never>}
   */
  static create() {
    return new Builder([]);
  }
}

/**
 * @param {unknown} x
 * @returns {x is { [x: string]: unknown }}
 */
function isObject(x) {
  return (
    x instanceof Object &&
    Object.prototype.toString.call(x) === '[object Object]'
  );
}

/**
 * @param {unknown} x
 * @returns {x is unknown[]}
 */
function isArray(x) {
  return Array.isArray(x);
}

/**
 * @param {unknown} x
 * @returns {x is number}
 */
const isNumber = (x) => typeof x === 'number';

/**
 * @param {unknown} x
 * @returns {x is string}
 */
const isString = (x) => typeof x === 'string';

/**
 * @param {unknown} x
 * @returns {x is boolean}
 */
const isBoolean = (x) => typeof x === 'boolean';

/**
 * @param {unknown} x
 * @returns {x is Date}
 */
const isDate = (x) => x instanceof Date;

/**
 * @param {unknown} x
 * @returns {x is RegExp}
 */
const isRegExp = (x) => x instanceof RegExp;

/**
 * @template T
 * @param {T} x
 */
const isLiteral = (x) => {
  /**
   * @param {unknown} y
   * @returns {y is T}
   */
  return (y) => {
    return y === x;
  };
};

/**
 * We are trying to mimic the total order on all BSON values
 * implemented in MongoDB. See:
 * https://docs.mongodb.com/manual/reference/bson-type-comparison-order/
 */
export const builder = Builder.create()
  .ifType(isLiteral(undefined), () => 0)
  .ifType(isLiteral(null), () => 0)
  .ifType(isNumber, comparePrimitives)
  .ifType(isString, comparePrimitives)
  .thenTypeObject()
  .thenTypeArray()
  .ifType(isBoolean, comparePrimitives)
  .ifType(isDate, comparePrimitives)
  .ifType(isRegExp, comparePrimitives);

export const compare = builder.get();
