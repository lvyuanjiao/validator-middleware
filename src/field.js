import series from './series';
import formatMessage from './format-message';

const isFuncExist = (func, fieldname) => {
  if (!func) {
    throw new Error(`Validator for '${fieldname}' not implement`);
  }
};

const isPromise = obj => !!obj && (typeof obj === 'object' || typeof obj === 'function') && typeof obj.then === 'function';

// http://stackoverflow.com/questions/17078871/set-json-property-with-fully-qualified-string
const setProp = (obj, qualifiedName, value) => {
  const props = qualifiedName.split('.');
  return [obj, ...props].reduce((a, b, i) => {
    const val = (i === props.length) ? a[b] = value : a[b];
    return val;
  });
};

const getProp = (obj, qualifiedName) => {
  let root = obj;
  let value;
  qualifiedName.split('.').forEach((name) => {
    if (!root[name]) {
      value = undefined;
      return value;
    }
    root = root[name];
    value = root;
    return value;
  });
  return value;
};

export default class Field {
  constructor(field, optional) {
    this.name = field.split('.').pop();
    this.qualifiedName = field;
    this.optional = optional || false;
    this.chain = [];

    this.nextValueFlag = false;
  }

  static RULE = 'RULE';
  static SANI = 'SANI';

  rule(func, ...args) {
    isFuncExist(func, this.qualifiedName);

    const rule = {
      type: Field.RULE,
      func,
      args: [].concat(...args),
      value: true,
      message: 'invalid',
    };
    if (this.nextValueFlag) {
      rule.value = false;
      this.nextValueFlag = false;
    }
    this.chain.push(rule);
    return this;
  }

  not(func, ...args) {
    this.nextValueFlag = true;
    return this.rule(func, ...args);
  }

  message(msg) {
    this.chain[this.chain.length - 1].message = (msg || 'invalid');
    return this;
  }

  sani(func, ...args) {
    isFuncExist(func, this.qualifiedName);
    this.chain.push({
      type: Field.SANI,
      func,
      args: [].concat(...args),
    });
    return this;
  }

  validate(req, callback) {
    const getFieldValue = () => getProp(req, this.qualifiedName);
    const setFieldValue = value => setProp(req, this.qualifiedName, value);

    const val = getFieldValue();
    if (!val && !this.optional) {
      return callback(null, {
        field: this.name,
        message: 'missing',
      });
    }

    return series(this.chain, (rule, nextRule) => {
      let error = null;
      const args = rule.args.map((arg) => {
        if (typeof arg === 'function') {
          return arg(req);
        }
        return arg;
      });
      const result = rule.func(...[val, ...args]);
      if (isPromise(result)) {
        return result.then((promiseResult) => {
          if (promiseResult !== rule.value) {
            error = {
              field: this.name,
              message: formatMessage(rule.message, this.name, ...args),
            };
          }
          nextRule(null, error);
        }).catch(nextRule);
      } else if (rule.type === Field.RULE) {
        if (result !== rule.value) {
          error = {
            field: this.name,
            message: formatMessage(rule.message, this.name, ...args),
          };
        }
      } else if (rule.type === Field.SANI) {
        setFieldValue(result);
      }
      return nextRule(null, error);
    }, (err, [results]) => {
      callback(err, results);
    });
  }
}
