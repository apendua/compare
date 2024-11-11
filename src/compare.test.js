/* eslint-env jest */

import { compare, builder, Builder } from './compare.js';

describe('default compare', () => {
  test('compares undefined and null', () => {
    expect(compare(undefined, null)).toEqual(-1);
    expect(compare(null, undefined)).toEqual(1);
  });

  test('compares null and number', () => {
    expect(compare(null, 1)).toEqual(-1);
    expect(compare(1, null)).toEqual(1);
  });

  test('compares number and string', () => {
    expect(compare(1, 'a')).toEqual(-1);
    expect(compare('a', 1)).toEqual(1);
  });

  test('compares string and object', () => {
    expect(compare('a', {})).toEqual(-1);
    expect(compare({}, 'a')).toEqual(1);
  });

  test('compares object and array', () => {
    expect(compare({}, [])).toEqual(-1);
    expect(compare([], {})).toEqual(1);
  });

  test('compares array and boolean', () => {
    expect(compare([], true)).toEqual(-1);
    expect(compare(true, [])).toEqual(1);
  });

  test('compares boolean and Date', () => {
    expect(compare(true, new Date(0))).toEqual(-1);
    expect(compare(new Date(0), true)).toEqual(1);
  });

  test('compares Date and RegExp', () => {
    expect(compare(new Date(0), new RegExp(''))).toEqual(-1);
    expect(compare(new RegExp(''), new Date(0))).toEqual(1);
  });

  test('compares two numbers', () => {
    expect(compare(1, 2)).toEqual(-1);
    expect(compare(2, 1)).toEqual(1);
  });

  test('compares two strings', () => {
    expect(compare('a', 'b')).toEqual(-1);
    expect(compare('b', 'a')).toEqual(1);
  });

  test('compares two booleans', () => {
    expect(compare(false, true)).toEqual(-1);
    expect(compare(true, false)).toEqual(1);
  });

  test('compares two dates', () => {
    expect(compare(new Date('2019-01-01'), new Date('2019-01-02'))).toEqual(-1);
    expect(compare(new Date('2019-01-02'), new Date('2019-01-01'))).toEqual(1);
  });

  test('compares two regular expressions', () => {
    expect(compare(new RegExp('a'), new RegExp('b'))).toEqual(-1);
    expect(compare(new RegExp('b'), new RegExp('a'))).toEqual(1);
  });

  test('compares empty objects', () => {
    expect(compare({}, {})).toEqual(0);
  });

  test('compares empty arrays', () => {
    expect(compare([], [])).toEqual(0);
  });

  test('compares empty and non-empty array', () => {
    expect(compare([], [1])).toEqual(-1);
    expect(compare([1], [])).toEqual(1);
  });

  test('compares arrays lexicographically', () => {
    expect(compare([1, 2, 3], [1, 2, 4])).toEqual(-1);
    expect(compare([1, 2, 4], [1, 2, 3])).toEqual(1);
  });

  test('compares equal arrays', () => {
    expect(compare([1, 2, 3], [1, 2, 3])).toEqual(0);
  });

  test('compares equal nested arrays', () => {
    expect(compare([[1], [2], [3]], [[1], [2], [3]])).toEqual(0);
  });

  test('compares different objects', () => {
    expect(
      compare(
        {
          a: 1,
          b: 1,
        },
        {
          a: 1,
          c: 1,
        }
      )
    ).toEqual(-1);
    expect(
      compare(
        {
          a: 1,
          c: 1,
        },
        {
          a: 1,
          b: 1,
        }
      )
    ).toEqual(1);
  });

  test('compares equal objects', () => {
    expect(
      compare(
        {
          a: 1,
          b: 1,
        },
        {
          a: 1,
          b: 1,
        }
      )
    ).toEqual(0);
  });

  test('compares equal nested objects', () => {
    expect(
      compare(
        {
          a: {
            x: 1,
          },
          b: {
            y: 1,
          },
        },
        {
          a: {
            x: 1,
          },
          b: {
            y: 1,
          },
        }
      )
    ).toEqual(0);
  });
});

describe('extend default builder instance', () => {
  class Box {
    /**
     * @param {number} value
     */
    constructor(value) {
      this.value = value;
    }
  }

  const newCompare = builder
    .ifType(
      (x) => typeof x === 'object' && x !== null && x instanceof Box,
      (x, y) => x.value - y.value
    )
    .get();

  test('compares Box instances', () => {
    expect(newCompare(new Box(1), new Box(2))).toEqual(-1);
    expect(newCompare(new Box(2), new Box(1))).toEqual(1);
  });

  test('compares Box instances with equal values', () => {
    expect(newCompare(new Box(1), new Box(1))).toEqual(0);
  });

  test('compares Box instances with different types', () => {
    expect(newCompare(new Box(1), 1)).toEqual(1);
  });

  test('compares Box instances with different types reversed', () => {
    expect(newCompare(1, new Box(1))).toEqual(-1);
  });

  test('compares objects using Box instances as fields', () => {
    expect(
      newCompare(
        {
          a: new Box(1),
          b: new Box(1),
        },
        {
          a: new Box(1),
          b: new Box(2),
        }
      )
    ).toEqual(-1);
  });
});

describe('completely new builder instance', () => {
  class Box {
    /**
     * @param {number} value
     */
    constructor(value) {
      this.value = value;
    }
  }

  const newCompare = Builder.create()
    .ifType(
      (x) => typeof x === 'number',
      (x, y) => x - y
    )
    .ifType(
      (x) => typeof x === 'object' && x !== null && x instanceof Box,
      (x, y) => x.value - y.value
    )
    .get();

  test('compares Box instances', () => {
    expect(newCompare(new Box(1), new Box(2))).toEqual(-1);
    expect(newCompare(new Box(2), new Box(1))).toEqual(1);
  });

  test('compares Box instances with equal values', () => {
    expect(newCompare(new Box(1), new Box(1))).toEqual(0);
  });

  test('compares Box instances with different types', () => {
    expect(newCompare(new Box(1), 1)).toEqual(1);
  });

  test('compares Box instances with different types reversed', () => {
    expect(newCompare(1, new Box(1))).toEqual(-1);
  });

  test('compares objects using Box instances as fields', () => {
    expect(
      newCompare(
        {
          a: new Box(1),
          b: new Box(1),
        },
        {
          a: new Box(1),
          b: new Box(2),
        }
      )
    ).toEqual(-1);
  });
});
