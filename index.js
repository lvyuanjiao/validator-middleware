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
      return req[field.context] && req[field.context][field.name];
    }

    function setFieldValue(field, val) {
      if (req[field.context]) {
        req[field.context][field.name] = val;
      }
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
  var i = field.indexOf('.');
  if (i === -1) {
    throw new Error('Invalid field name');
  }
  this.context = field.substring(0, i);
  this.name = field.substring(i + 1, field.length);
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

Validation.Field = Field;
Validation.validator = validator;

module.exports = Validation;
