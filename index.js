'use strict';

var validator = require('validator');
var series = require('./series');
var formatMessage = require('./format-message');

function Validation(fields, callback) {

  // Fields as middleware to set validation callback function
  if (typeof fields === 'function') {
    return function(req, res, next) {
      req.validationCallback = fields;
      next();
    };
  }

  // Fields as field name to construct a Field object
  if (typeof fields === 'string') {
    return new Field(fields, callback);
  }

  // Main validate middleware
  fields = [].concat(fields);
  return function(req, res, next) {

    function getFieldValue(field) {
      return getProp(req, field.qualifiedName);
    }

    function setFieldValue(field, val) {
      setProp(req, field.qualifiedName, val);
    }

    series(fields, function(field, next) {
      var val = getFieldValue(field);
      if (!val) {
        var error = null;
        if (!field.optional) {
          error = {
            'field': field.name,
            'code': 'missing'
          };
        }
        return next(null, error);
      }
      series(field.chain, function(rule, callback) {
        var fn = validator[rule.name];
        var error = null;
        if (rule.type === 'validator') {
          if (fn.apply(validator, [].concat(val, rule.args)) !== rule.value) {
            error = {
              'field': field.name,
              'code': formatMessage(rule.msg || 'invalid', [].concat(field.name, rule.args))
            }
          }
        } else if (rule.type === 'sanitizer') {
          setFieldValue(field, fn.apply(validator, [].concat(val, rule.args)));
        }
        callback(error);
      }, function(err) {
        next(null, err);
      });
    }, function(err, errors) {
      req.validationErrors = [];
      errors = errors.filter(function(error) {
        return error;
      });
      if (errors.length > 0) {
        req.validationErrors = errors;
        var render = callback || req.validationCallback || function(req, res, next) {
          next();
        };
        render(req, res, next);
      } else {
        next();
      }
    });
  };
};

Validation.extend = function(name, handler) {
  validator.extend(name, handler);
}

function Field(field, optional) {
  if (!isQualifiedName(field)) {
    throw new Error('Invalid field name');
  }
  this.name = field.split('.').pop();
  this.qualifiedName = field;
  this.optional = optional || false;
  this.chain = [];
};

Field.prototype.rule = function(name, args, msg) {
  var rule = {
    'type': 'validator',
    'name': name,
    'args': [],
    'value': true
  };
  if (args) rule.args = [].concat(args);
  if (msg) rule.msg = msg;
  if (rule.name[0] === '!') {
    rule.name = rule.name.substring(1);
    rule.value = false;
  }
  isValidatorExist(rule.name);
  this.chain.push(rule);
  return this;
};

Field.prototype.sani = function(name, args) {
  isValidatorExist(name);
  this.chain.push({
    'type': 'sanitizer',
    'name': name,
    'args': args || []
  });
  return this;
};

function isValidatorExist(name) {
  var fn = validator[name];
  if (!fn) {
    throw new Error('Validator ' + name + ' not found');
  }
}

function isQualifiedName(name) {
  return /^[a-zA-Z_$]([a-zA-Z_$][a-zA-Z\d_$]*\.)*[a-zA-Z_$][a-zA-Z\d_$]*[a-zA-Z\d_$]$/.test(name);
}

// http://stackoverflow.com/questions/17078871/set-json-property-with-fully-qualified-string
function setProp(obj, qualifiedName, value) {
  var props = qualifiedName.split('.');
  return [obj].concat(props).reduce(function(a, b, i) {
    return i == props.length ? a[b] = value : a[b];
  });
}

function getProp(obj, qualifiedName) {
  var root = obj;
  var value;
  qualifiedName.split('.').forEach(function(name) {
    if (!root[name]) {
      return value = undefined;
    }
    value = root = root[name];
  });
  return value;
}

Validation.Field = Field;
Validation.validator = validator;

module.exports = Validation;
