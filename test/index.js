'use strict';

var should = require('should');
var validation = require('../index');

describe('FIELD', function() {
  it('should throw error when the field name is invalid', function() {
    should.throws(function() {
      new validation.Field('');
    }, function(err) {
      if ((err instanceof Error) && /Invalid field name/.test(err)) {
        return true;
      }
    });
  });
  it('should construct a Field object', function() {
    var field = new validation.Field('body.id');
    should.equal(field.name, 'id');
    should.equal(field.optional, false);
    field.chain.should.instanceof(Array).with.length(0);
  });
  it('should construct a optional Field object', function() {
    var field = new validation.Field('body.id', true);
    should.equal(field.name, 'id');
    should.equal(field.optional, true);
    field.chain.should.instanceof(Array).with.length(0);
  });
  it('should throw an error when validator not found', function() {
    should.throws(function() {
      new validation.Field('body.id').rule('undefined_function_name');
    }, function(err) {
      if ((err instanceof Error) && /Validator undefined_function_name not found/.test(err)) {
        return true;
      }
    });
  });
  it('should throw an error when sanitizer is not found', function() {
    should.throws(function() {
      new validation.Field('body.id').sani('undefined_function_name');
    }, function(err) {
      if ((err instanceof Error) && /Validator undefined_function_name not found/.test(err)) {
        return true;
      }
    });
  });
  it('should add a rule to field chain', function() {
    var field = new validation.Field('body.id');
    field.rule('isNull');
    field.chain.should.instanceof(Array).with.length(1);
    field.chain[0].should.have.properties({
      'type': 'validator',
      'name': 'isNull',
      'args': [],
      'value': true
    });
  });
  it('should add a reverse rule to field chain', function() {
    var field = new validation.Field('body.id');
    field.rule('!isNull');
    field.chain.should.instanceof(Array).with.length(1);
    field.chain[0].should.have.properties({
      'type': 'validator',
      'name': 'isNull',
      'args': [],
      'value': false
    });
  });
  it('should add a rule with single arg to field chain', function() {
    var field = new validation.Field('body.id');
    field.rule('isLength', 6);
    field.chain.should.instanceof(Array).with.length(1);
    field.chain[0].should.have.properties({
      'type': 'validator',
      'name': 'isLength',
      'args': [6],
      'value': true
    });
  });
  it('should add a rule with multi args to field chain', function() {
    var field = new validation.Field('body.id');
    field.rule('isLength', [6, 32]);
    field.chain.should.instanceof(Array).with.length(1);
    field.chain[0].should.have.properties({
      'type': 'validator',
      'name': 'isLength',
      'args': [6, 32],
      'value': true
    });
  });
  it('should add a rule with msg to field chain', function() {
    var field = new validation.Field('body.id');
    var msg = 'please enter at least {0} characters';
    field.rule('isLength', 6, msg);
    field.chain.should.instanceof(Array).with.length(1);
    field.chain[0].should.have.properties({
      'type': 'validator',
      'name': 'isLength',
      'args': [6],
      'value': true,
      'msg': msg
    });
  });
  it('should add multi rules to field chain', function() {
    var field = new validation.Field('body.id');
    field.rule('isNull').rule('isLength', [6, 32]);
    field.chain.should.instanceof(Array).with.length(2);
    field.chain[0].should.have.properties({
      'type': 'validator',
      'name': 'isNull',
      'args': [],
      'value': true
    });
    field.chain[1].should.have.properties({
      'type': 'validator',
      'name': 'isLength',
      'args': [6, 32],
      'value': true
    });
  });
  it('should add a sanitizer to field chain', function() {
    var field = new validation.Field('body.id');
    field.sani('toInt');
    field.chain.should.instanceof(Array).with.length(1);
    field.chain[0].should.have.properties({
      'type': 'sanitizer',
      'name': 'toInt',
      'args': []
    });
  });
  it('should add a sanitizer with args to field chain', function() {
    var field = new validation.Field('body.id');
    field.sani('trim', ['a', 'b']);
    field.chain.should.instanceof(Array).with.length(1);
    field.chain[0].should.have.properties({
      'type': 'sanitizer',
      'name': 'trim',
      'args': ['a', 'b']
    });
  });
});

describe('VALIDATION', function() {
  it('should set function as validation callback', function(done) {
    var req = {};
    var res = {};
    var fn = function(req, res, next) {
      next();
    };
    var middle = validation(fn);
    middle(req, res, function() {
      should.equal(req.validationCallback, fn);
      done();
    });
  });
  it('should return object as Field', function() {
    var middle = validation('body.id');
    middle.should.instanceof(validation.Field);
  });
  it('should contains a missing error when the field value is\'t found', function(done) {
    var req = {};
    var middle = validation(validation('body.id'));
    middle(req, null, function() {
      req.validationErrors.should.instanceof(Array).with.length(1);
      req.validationErrors[0].should.have.properties({
        field: 'id',
        code: 'missing'
      });
      done();
    });
  });
  it('should not contains missing error when the field is optional and it\'s value is\'t found', function(done) {
    var req = {};
    var middle = validation(validation('body.id', true));
    middle(req, null, function() {
      req.validationErrors.should.instanceof(Array).with.length(0);
      done();
    });
  });
  it('should contains multi missing error when the field value is\'t found', function(done) {
    var req = {};
    var middle = validation([validation('body.id'), validation('body.name')]);
    middle(req, null, function() {
      req.validationErrors.should.instanceof(Array).with.length(2);
      done();
    });
  });
  it('should contains an error when the validation is failure', function(done) {
    var req = {
      body: {
        id: 'abcdefg'
      }
    };
    var middle = validation([
      validation('body.id').rule('isInt')
    ]);
    middle(req, null, function() {
      req.validationErrors.should.instanceof(Array).with.length(1);
      req.validationErrors[0].should.have.properties({
        field: 'id',
        code: 'invalid'
      });
      done();
    });
  });
  it('should contains an error when the validations is failure', function(done) {
    var req = {
      body: {
        id: 'abcdefg'
      }
    };
    var middle = validation([
      validation('body.id').rule('isInt').rule('isLength', 10)
    ]);
    middle(req, null, function() {
      req.validationErrors.should.instanceof(Array).with.length(1);
      req.validationErrors[0].should.have.properties({
        field: 'id',
        code: 'invalid'
      });
      done();
    });
  });
  it('should contains errors when the validations is failure', function(done) {
    var req = {
      body: {
        id: 'abcdefg',
        email: 'invalid email address'
      }
    };
    var middle = validation([
      validation('body.id').rule('isInt').rule('isLength', 10),
      validation('body.email').rule('isEmail').rule('isLength', 40)
    ]);
    middle(req, null, function() {
      req.validationErrors.should.instanceof(Array).with.length(2);
      req.validationErrors[0].should.have.properties({
        field: 'id',
        code: 'invalid'
      });
      req.validationErrors[1].should.have.properties({
        field: 'email',
        code: 'invalid'
      });
      done();
    });
  });
  it('should execute callback when the validation complete', function(done) {
    var req = {
      body: {
        id: 'abcdefg'
      }
    };
    var res = {
      locals: {}
    };
    var middle = validation([
      validation('body.id').rule('isInt').rule('isLength', 10)
    ], function (req, res, next) {
      res.locals.errors = req.validationErrors;
      next();
    });
    middle(req, res, function() {
      req.validationErrors.should.instanceof(Array).with.length(1);
      req.validationErrors[0].should.have.properties({
        field: 'id',
        code: 'invalid'
      });
      res.locals.errors.should.equal(req.validationErrors);
      done();
    });
  });
  it('should execute sanitizer', function(done) {
    var req = {
      body: {
        id: '123456'
      }
    };
    var middle = validation([
      validation('body.id').sani('toInt')
    ]);
    middle(req, null, function() {
      req.body.id.should.be.type('number').and.equal(123456);
      done();
    });
  });
});

describe('EXTEND', function() {
  it('should extend custom validator', function(done) {
    validation.extend('isWhitespace', function (str) {
      return /^\s+$/.test(str);
    });
    should.exist(validation.validator.isWhitespace);
    validation.validator.isWhitespace.should.be.type('function');
    var req = {
      body: {
        whitespace: '   ',
        notWihiteSpace: ' test '
      }
    };
    var middle = validation([
      validation('body.whitespace').rule('isWhitespace'),
      validation('body.notWihiteSpace').rule('isWhitespace')
    ]);
    middle(req, null, function() {
      req.validationErrors.should.instanceof(Array).with.length(1);
      req.validationErrors[0].should.have.properties({
        field: 'notWihiteSpace',
        code: 'invalid'
      });
      done();
    });
  });
});
