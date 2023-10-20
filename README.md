# Compare: a total order on all JSON values

This package provides an implementation of `compare(a, b)` function that establishes a total order on the set of all valid JSON values. This can be useful in scenarios where you need to compare JSON objects or values to determine their relative order.

## Installation

Please use the package manager of your choice, e.g.
```
npm install @apendua/compare
```

## Usage

```javascript
import compare from '@apendua/compare';

const json1 = { name: 'Alice', age: 30 };
const json2 = { name: 'Bob', age: 25 };

const result = compare(json1, json2);

if (result === 0) {
  console.log('json1 and json2 are equal.');
}

if (result < 0) {
  console.log('json1 comes before json2.');
}

if (result > 0) {
  console.log('json1 comes after json2.');
}
```

## License

This package is released under the MIT License (LICENSE).
