/**
 * @template T
 * @typedef {(x: T, y: T) => number} CompareFn
 */

/**
 * @template T
 * @template U
 * @typedef {(compare: CompareFn<T>) => Builder<U>} Plugin
 */

/**
 * Because NaN < NaN => false, this function returns 0 for (NaN, NaN).
 * @template T
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
  const xKeys = Object.keys(x).sort();
  const yKeys = Object.keys(y).sort();
  const n = xKeys.length;
  const m = yKeys.length;
  for (let i = 0; i < n && i < m; i += 1) {
    let result = comparePrimitives(xKeys[i], yKeys[i]);
    if (result !== 0) {
      return result;
    }
    result = compareProperties(x[xKeys[i]], y[yKeys[i]]);
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
 * @template [T=never]
 * @typedef {(
 *   | EJSONObject<T>
 *   | EJSONArray<T>
 *   | T
 * )} EJSONValue
 */

/**
 * @template [T=never]
 * @typedef {{ [x: string]: EJSONValue<T> }} EJSONObject
 */

/**
 * @template [T=never]
 * @typedef {Array<EJSONValue<T>>} EJSONArray
 */

/**
 * @template [T=never]
 * @typedef {EJSONValue<
 *   | null
 *   | string
 *   | number
 *   | boolean
 *   | Date
 *   | RegExp
 *   | undefined
 *   | T
 * >} Comparable
 */

/**
 * @template U
 * @template V
 * @param {(x: U | V) => x is V} isOfType
 * @param {CompareFn<V>} compare
 * @param {CompareFn<U>} next
 * @returns {CompareFn<U | V>}
 */
function makeConditional(isOfType, compare, next) {
  return (x, y) => {
    if (isOfType(x)) {
      if (isOfType(y)) {
        return compare(x, y);
      }
      return 1;
    }
    if (isOfType(y)) {
      return -1;
    }
    return next(x, y);
  };
}

/**
 * @template T
 */
export class Builder {
  #compare;

  /**
   * @private
   * @param {CompareFn<T>} compare
   */
  constructor(compare) {
    this.#compare = compare;
  }

  /**
   * Elements of type U will come after any other type defined so far.
   * @template U
   * @param {(x: T | U) => x is U} isType
   * @param {CompareFn<U>} compare
   * @returns {Builder<T | U>}
   */
  ifType(isType, compare) {
    return new Builder(makeConditional(isType, compare, this.#compare));
  }

  /**
   * Elements of type U will come after any other type defined so far.
   * @template U
   * @param {(x: T | U) => x is U} isOfType
   * @returns {Builder<T>}
   */
  type(isOfType) {
    return this.ifType(isOfType, () => 0);
  }

  /**
   * @returns {CompareFn<EJSONValue<T>>}
   */
  get() {
    /**
     * @param {EJSONValue<T>} x
     * @param {EJSONValue<T>} y
     * @returns {number}
     */
    const compare = (x, y) => {
      if (isObject(x) && isObject(y)) {
        return compareObjects(x, y, compare);
      }
      if (isArray(x) && isArray(y)) {
        return compareArrays(x, y, compare);
      }
      return this.#compare(/** @type {T} */ (x), /** @type {T} */ (y));
    };
    return compare;
  }

  static create() {
    /**
     * @param {never} _x
     * @param {never} _y
     */
    const equals = (_x, _y) => 0;
    return new Builder(equals).type(isObject).type(isArray);
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
  .ifType(isLiteral(undefined), comparePrimitives)
  .ifType(isLiteral(null), comparePrimitives)
  .ifType(isNumber, comparePrimitives)
  .ifType(isString, comparePrimitives)
  .type(isObject)
  .type(isArray)
  .ifType(isBoolean, comparePrimitives)
  .ifType(isDate, comparePrimitives)
  .ifType(isRegExp, comparePrimitives);

export const compare = builder.get();
