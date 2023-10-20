/* eslint-env jest */

import * as fc from 'fast-check';
import compare from './compare.js';

const anyValue = fc.letrec((tie) => ({
  value: fc.oneof(
    fc.constant(undefined),
    fc.constant(null),
    fc.integer(),
    fc.string(),
    fc.boolean(),
    fc.date(),
    fc.array(tie('value'), { maxLength: 10 }),
    fc.dictionary(fc.string(), tie('value'), { maxKeys: 10 }),
    fc.constantFrom(new RegExp(''), new Date(0))
  ),
})).value;

test('compare is reflexive', () => {
  fc.assert(fc.property(anyValue, (x) => compare(x, x) === 0));
});

test('compare is transitive', () => {
  fc.assert(
    fc.property(anyValue, anyValue, anyValue, (x, y, z) => {
      const xy = compare(x, y);
      const yz = compare(y, z);
      if (xy < 0 && yz < 0) {
        return compare(x, z) < 0;
      }
      if (xy > 0 && yz > 0) {
        return compare(x, z) > 0;
      }
      return true;
    })
  );
});

test('compare is asymmetric', () => {
  fc.assert(
    fc.property(anyValue, anyValue, (x, y) => {
      const xy = compare(x, y);
      const yx = compare(y, x);
      return (xy === 0 && yx === 0) || xy === -yx;
    })
  );
});
