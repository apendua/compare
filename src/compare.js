/**
 * Because NaN < NaN => false, this function returns 0 for (NaN, NaN).
 * @template T
 * @param {T} x
 * @param {T} y
 */
function basicCompare(x, y) {
  if (x < y) {
    return -1;
  }
  if (x > y) {
    return 1;
  }
  return 0;
}

/**
 * @template [T=never]
 * @typedef {(
 *   | null
 *   | string
 *   | number
 *   | boolean
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
 * @template T
 * @typedef {(x: T, y: T) => number} CompareFunction
 */

/**
 * @template T
 * @template U
 * @typedef {(compare: CompareFunction<T>) => Builder<U>} Plugin
 */

/**
 * @template [T=never]
 * @typedef {EJSONValue<Date | RegExp | undefined | T>} Comparable
 */

/**
 * @template U
 * @template V
 * @param {(x: U | V) => x is V} isOfType
 * @param {CompareFunction<U>} fallbackCompare
 * @param {CompareFunction<V>} compare
 * @returns {CompareFunction<U | V>}
 */
function conditional(isOfType, fallbackCompare, compare) {
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
    return fallbackCompare(x, y);
  };
}

/**
 * @template T
 */
export class Builder {
  #compile;

  /**
   * @param {(fn: CompareFunction<T>) => CompareFunction<T>} compile
   */
  constructor(compile) {
    this.#compile = compile;
  }

  /**
   * @template U
   * @param {Plugin<T, T | U>} fn
   * @returns {Builder<T | U>}
   */
  bind(fn) {
    return new Builder((compare) => {
      return fn(this.#compile(compare)).#compile(compare);
    });
  }

  /**
   * Put elements of type U after other everything else.
   * @template U
   * @param {(x: T | U) => x is U} isOfType
   * @param {CompareFunction<U>} compare
   * @returns {Builder<T | U>}
   */
  if(isOfType, compare) {
    return this.bind((next) => {
      return Builder.from(conditional(isOfType, next, compare));
    });
  }

  /**
   * @returns {CompareFunction<T>}
   */
  get() {
    // NOTE: This looks like a circular dependency, but it is not.
    const compare = this.#compile((x, y) => compare(x, y));
    return compare;
  }

  /**
   * @template U
   * @param {CompareFunction<U>} compare
   * @returns {Builder<U>}
   */
  static from(compare) {
    return new Builder(() => compare);
  }
}

/**
 * @template T
 * @param {EJSONValue<T>} x
 * @returns {x is EJSONObject<T>}
 */
function isEJSONObject(x) {
  return (
    x instanceof Object &&
    Object.prototype.toString.call(x) === '[object Object]'
  );
}

/**
 * @template T
 * @param {EJSONValue<T>} x
 * @returns {x is EJSONArray<T>}
 */
function isEJSONArray(x) {
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
 * @returns {Plugin<EJSONValue<T>, EJSONValue<T>>}
 */
const pluginArray = () => (next) => {
  return new Builder((compare) => {
    return conditional(
      isEJSONArray,
      next,
      /**
       * @param {EJSONArray<T>} x
       * @param {EJSONArray<T>} y
       */
      (x, y) => {
        const n = x.length;
        const m = y.length;
        for (let i = 0; i < n && i < m; i += 1) {
          const result = compare(x[i], y[i]);
          if (result !== 0) {
            return result;
          }
        }
        return basicCompare(n, m);
      }
    );
  });
};

/**
 * @template T
 * @param {EJSONObject<T>} x
 * @returns {Array<[string, EJSONValue<T>]>}
 */
const toPairs = (x) => {
  return Object.entries(x).sort((a, b) => basicCompare(a[0], b[0]));
};

/**
 * @template T
 * @returns {Plugin<EJSONValue<T>, EJSONValue<T>>}
 */
const pluginDictionary = () => (next) => {
  return new Builder((compare) => {
    // const compareWithArray = Builder.from(compare).chain(pluginArray()).get();
    return conditional(
      isEJSONObject,
      next,
      /**
       * @param {EJSONObject<T>} x
       * @param {EJSONObject<T>} y
       * @returns
       */
      (x, y) => {
        return compare(toPairs(x), toPairs(y));
      }
    );
  });
};

/**
 * @template T
 * @param {T} x
 */
const is = (x) => {
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
export const builder = Builder.from(
  /**
   * @param {Comparable} _x
   * @param {Comparable} _y
   */
  (_x, _y) => 0
)
  .if(is(undefined), basicCompare)
  .if(is(null), basicCompare)
  .if(isNumber, basicCompare)
  .if(isString, basicCompare)
  .bind(pluginDictionary())
  .bind(pluginArray())
  .if(isBoolean, basicCompare)
  .if(isDate, basicCompare)
  .if(isRegExp, basicCompare);

export const compare = builder.get();
