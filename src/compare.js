import isPlainObject from "lodash/isPlainObject.js";
import isDate from "lodash/isDate.js";
import isRegExp from "lodash/isRegExp.js";
import sortBy from "lodash/sortBy.js";
import toPairs from "lodash/toPairs.js";

/**
 * Because NaN < NaN => false, this function returns 0 for (NaN, NaN).
 * @template T
 * @param {T} x
 * @param {T} y
 * @returns
 */
function defaultCompare(x, y) {
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
 * @typedef {(x: unknown) => x is T} Predicate
 */

/**
 * @template T
 * @typedef {(x: T, y: T) => number} CompareFunction
 */

/**
 * @template T
 * @template {T} U
 * @param {(x: T) => x is U} isOfType
 * @param {CompareFunction<U>} compare
 * @returns {CompareFunction<T>}
 */
function conditional(isOfType, compare) {
  return (x, y) => {
    if (isOfType(x)) {
      if (isOfType(y)) {
        return compare(x, y);
      }
      return -1;
    }
    if (isOfType(y)) {
      return 1;
    }
    return 0;
  };
}

/**
 * @template T
 * @param {T} x
 * @returns {() => T}
 */
const constant = (x) => () => x;

/**
 * @template T
 * @param {CompareFunction<T>[]} comparators
 * @returns {CompareFunction<T>}
 */
const combine = (comparators) => {
  return comparators.reduce(
    (previousCompare, currentCompare) => (x, y) => {
      const result = previousCompare(x, y);
      if (result !== 0) {
        return result;
      }
      return currentCompare(x, y);
    },
    constant(0)
  );
};

/**
 * @param {unknown} x
 * @returns {x is EJSONObject}
 */
function isEJSONObject(x) {
  return isPlainObject(x);
}

// /**
//  * @param {unknown} x
//  * @returns {x is EJSONArray}
//  */
// function isEJSONArray(x) {
//   return Array.isArray(x);
// }

// /**
//  * @param {CompareFunction<EJSONValue>} compare
//  * @param {number} i
//  */
// function compareAtIndex(compare, i) {
//   return conditional(
//     isEJSONArray,
//     /**
//      * @param {EJSONArray} x
//      * @param {EJSONArray} y
//      * @returns {number}
//      */
//     (x, y) => {
//       return compare(x[i], y[i]);
//     }
//   );
// }

// /**
//  * @param {CompareFunction<EJSONValue>} compare
//  * @param {string} k
//  */
// function compareAtKey(compare, k) {
//   return conditional(
//     isEJSONObject,
//     /**
//      * @param {EJSONObject} x
//      * @param {EJSONObject} y
//      * @returns {number}
//      */
//     (x, y) => {
//       return compare(x[k], y[k]);
//     }
//   );
// }

/**
 * @param {unknown} x
 * @returns {x is unknown[]}
 */
const isArray = (x) => Array.isArray(x);

/**
 * @param {unknown} x
 * @returns {x is undefined}
 */
const isUndefined = (x) => typeof x === "undefined";

/**
 * @param {unknown} x
 * @returns {x is number}
 */
const isNumber = (x) => typeof x === "number";

/**
 * @param {unknown} x
 * @returns {x is string}
 */
const isString = (x) => typeof x === "string";

/**
 * @param {unknown} x
 * @returns {x is boolean}
 */
const isBoolean = (x) => typeof x === "boolean";

/**
 * @template T
 * @template {T} U
 * @param {(x: T) => x is U} isOfType
 * @param {CompareFunction<U>} compare
 * @returns {Plugin<T, never>}
 */
const pluginConditional = (isOfType, compare) => {
  return constant(conditional(isOfType, compare));
};

/**
 * @template T
 * @typedef {(T extends (infer R)[] ? R[] : never) | (T extends unknown[] ? never : T)} PureArray
 */

/**
 * @template T
 * @template U
 * @param {CompareFunction<U>} compare
 * @returns {CompareFunction<T>}
 */
function pluginArray(compare) {
  return conditional(
    /**
     * @param {unknown} x
     * @returns {x is U[]}
     */
    (x) => {
      return Array.isArray(x);
    },
    /**
     * @param {U[]} x
     * @param {U[]} y
     * @returns {number}
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
      return defaultCompare(n, m);
    }
  );
}

/**
 * @typedef {EJSONValue<Date | RegExp> | undefined} Comparable
 */

/**
 * @param {CompareFunction<Comparable>} compare
 */
const pluginObject = (compare) => {
  return conditional(
    isEJSONObject,
    /**
     * @param {EJSONObject} x
     * @param {EJSONObject} y
     * @returns {number}
     */
    (x, y) => compare(sortBy(toPairs(x), 0), sortBy(toPairs(y), 0))
  );
};

/**
 * @template T
 * @param {T} literal
 */
const createLiteral = (literal) => {
  /**
   * @param {unknown} x
   * @returns {x is T}
   */
  function isTheSame(x) {
    return x === literal;
  }
  return pluginConditional(
    isTheSame,
    /** @type {CompareFunction<T>} */ (defaultCompare)
  );
};

const pluginDate = pluginConditional(
  isDate,
  /** @type {CompareFunction<Date>} */ (defaultCompare)
);

const pluginRegExp = pluginConditional(
  isRegExp,
  /** @type {CompareFunction<RegExp>} */ (defaultCompare)
);

/**
 * @template T
 * @template U
 * @typedef {(compare: CompareFunction<U>) => CompareFunction<T>} Plugin
 */

/**
 * @template T
 * @param {Plugin<T, T>[]} plugins
 */
export function createCompare(plugins) {
  /** @type {CompareFunction<T>} */
  let compiled;
  /** @type {CompareFunction<T>} */
  const compare = (x, y) => compiled(x, y);
  compiled = combine(plugins.map((plugin) => plugin(compare)));
  return compare;
}

// See:
// https://docs.mongodb.com/manual/reference/bson-type-comparison-order/
const compare = /** @type {typeof createCompare<Comparable>} */ (createCompare)(
  [
    pluginConditional(isUndefined, constant(0)),
    createLiteral(null),
    pluginConditional(isNumber, defaultCompare),
    pluginConditional(isString, defaultCompare),
    pluginObject,
    pluginArray,
    pluginConditional(isBoolean, defaultCompare),
    pluginDate,
    pluginRegExp,
  ]
);

export default compare;
