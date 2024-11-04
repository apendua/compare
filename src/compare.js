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
 * @typedef {(x: T, y: T) => number} CompareFunction
 */

/**
 * @template T
 * @template U
 * @typedef {(compare: CompareFunction<U>) => CompareFunction<T>} Plugin
 */

/**
 * @template [T=never]
 * @typedef {EJSONValue<Date | RegExp | undefined | T>} Comparable
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
 * @returns {Plugin<EJSONValue<T>, EJSONValue<T>>}
 */
const pluginArray = () => (compare) => {
  return conditional(isEJSONArray, (x, y) => {
    const n = x.length;
    const m = y.length;
    for (let i = 0; i < n && i < m; i += 1) {
      const result = compare(x[i], y[i]);
      if (result !== 0) {
        return result;
      }
    }
    return defaultCompare(n, m);
  });
};

/**
 * @template T
 * @param {EJSONObject<T>} x
 * @returns {Array<[string, EJSONValue<T>]>}
 */
const toPairs = (x) => {
  return Object.entries(x).sort((a, b) => defaultCompare(a[0], b[0]));
};

/**
 * @template T
 * @returns {Plugin<EJSONValue<T>, EJSONValue<T>>}
 */
const pluginDictionary = () => (compare) => {
  return conditional(isEJSONObject, (x, y) => compare(toPairs(x), toPairs(y)));
};

/**
 * @template T
 * @param {T} literal
 * @returns {Plugin<unknown, never>}
 */
const pluginLiteral = (literal) => {
  /**
   * @param {unknown} x
   * @returns {x is T}
   */
  function isTheSame(x) {
    return x === literal;
  }
  return pluginConditional(isTheSame, defaultCompare);
};

/**
 * @returns {Plugin<unknown, never>}
 */
const pluginDate = () => pluginConditional(isDate, defaultCompare);

/**
 * @returns {Plugin<unknown, never>}
 */
const pluginRegExp = () => pluginConditional(isRegExp, defaultCompare);

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

/**
 * We are trying to mimic the total order on all BSON values
 * implemented in MongoDB. See:
 * https://docs.mongodb.com/manual/reference/bson-type-comparison-order/
 * @template [T=never]
 * @returns {Plugin<Comparable<T>, Comparable<T>>[]}
 */
export const getDefaultPlugins = () => {
  return [
    pluginLiteral(undefined),
    pluginLiteral(null),
    pluginConditional(isNumber, defaultCompare),
    pluginConditional(isString, defaultCompare),
    pluginDictionary(),
    pluginArray(),
    pluginConditional(isBoolean, defaultCompare),
    pluginDate(),
    pluginRegExp(),
  ];
};

/**
 * @typedef {object} CompareModule
 * @property {typeof createCompare} createCompare
 * @property {typeof getDefaultPlugins} getDefaultPlugins
 */

/** @type {CompareFunction<Comparable> & CompareModule} */
export const compare = Object.assign(createCompare(getDefaultPlugins()), {
  createCompare,
  getDefaultPlugins,
});
