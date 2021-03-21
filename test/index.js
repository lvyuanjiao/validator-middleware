import should from 'should';
import validate, { field as fieldBuilder } from '../src/index';
import Field from '../src/field';
import validator from 'validator';

const dummy = () => false;
const dummyPass = () => true;
const toInt = str => parseInt(str, 10);

describe('FIELD', () => {
  it('should construct a Field object', () => {
    const field = fieldBuilder('body.id');
    should.equal(field.name, 'id');
    should.equal(field.optional, false);
    field.chain.should.instanceof(Array).with.length(0);
  });

  it('should construct a optional Field object', () => {
    const field = fieldBuilder('body.id', true);
    should.equal(field.name, 'id');
    should.equal(field.optional, true);
    field.chain.should.instanceof(Array).with.length(0);
  });

  it('should throw an error when validator not found', () => {
    should.throws(() => {
      fieldBuilder('body.id').rule(undefined);
    }, (err) => {
      if ((err instanceof Error) && /Validator for 'body.id' not implement/.test(err)) {
        return true;
      }
      return false;
    });
  });

  it('should throw an error when sanitizer is not found', () => {
    should.throws(() => {
      fieldBuilder('body.id').sani(undefined);
    }, (err) => {
      if ((err instanceof Error) && /Validator for 'body.id' not implement/.test(err)) {
        return true;
      }
      return false;
    });
  });

  it('should add a rule to field chain', () => {
    const field = fieldBuilder('body.id');
    field.rule(dummy);
    field.chain.should.instanceof(Array).with.length(1);
    field.chain[0].should.have.properties({
      type: Field.RULE,
      func: dummy,
      args: [],
      value: true,
    });
  });

  it('should add a reverse rule to field chain', () => {
    const field = fieldBuilder('body.id');
    field.not(dummy);
    field.chain.should.instanceof(Array).with.length(1);
    field.chain[0].should.have.properties({
      type: Field.RULE,
      func: dummy,
      args: [],
      value: false,
    });
  });

  it('should add a rule with single arg to field chain', () => {
    const field = fieldBuilder('body.id');
    field.rule(dummy, 6);
    field.chain.should.instanceof(Array).with.length(1);
    field.chain[0].should.have.properties({
      type: Field.RULE,
      func: dummy,
      args: [6],
      value: true,
    });
  });

  it('should add a rule with multi args to field chain', () => {
    const field = fieldBuilder('body.id');
    field.rule(dummy, 6, 32);
    field.chain.should.instanceof(Array).with.length(1);
    field.chain[0].should.have.properties({
      type: Field.RULE,
      func: dummy,
      args: [6, 32],
      value: true,
    });
  });

  it('should add a rule with msg to field chain', () => {
    const field = fieldBuilder('body.id');
    const message = 'please enter at least {0} characters';
    field.rule(dummy, 6).message(message);
    field.chain.should.instanceof(Array).with.length(1);
    field.chain[0].should.have.properties({
      type: Field.RULE,
      func: dummy,
      args: [6],
      value: true,
      message,
    });
  });

  it('should add multi rules to field chain', () => {
    const field = fieldBuilder('body.id');
    field.rule(dummy).rule(dummy, [6, 32]);
    field.chain.should.instanceof(Array).with.length(2);
    field.chain[0].should.have.properties({
      type: Field.RULE,
      func: dummy,
      args: [],
      value: true,
    });
    field.chain[1].should.have.properties({
      type: Field.RULE,
      func: dummy,
      args: [6, 32],
      value: true,
    });
  });

  it('should add a sanitizer to field chain', () => {
    const field = fieldBuilder('body.id');
    field.sani(dummy);
    field.chain.should.instanceof(Array).with.length(1);
    field.chain[0].should.have.properties({
      type: Field.SANI,
      func: dummy,
      args: [],
    });
  });

  it('should add a sanitizer with args to field chain', () => {
    const field = fieldBuilder('body.id');
    field.sani(dummy, ['a', 'b']);
    field.chain.should.instanceof(Array).with.length(1);
    field.chain[0].should.have.properties({
      type: Field.SANI,
      func: dummy,
      args: ['a', 'b'],
    });
  });
});

describe('VALIDATION', () => {
  it('should contains a missing error when the field value is\'t found', (done) => {
    const req = {};
    const res = {};
    validate(fieldBuilder('body.id'))(req, res, () => {
      res.errors.should.instanceof(Array).with.length(1);
      res.errors[0].should.have.properties({
        field: 'id',
        message: 'missing',
      });
      done();
    });
  });

  it('should not contains missing error when the field is optional and it\'s value is\'t found', (done) => {
    const req = {};
    const res = {};
    validate(fieldBuilder('body.id', true))(req, res, () => {
      res.errors.should.instanceof(Array).with.length(0);
      done();
    });
  });

  it('should contains multi missing error when the field value is\'t found', (done) => {
    const req = {};
    const res = {};
    validate(
      fieldBuilder('body.id'),
      fieldBuilder('body.name')
    )(req, res, () => {
      res.errors.should.instanceof(Array).with.length(2);
      done();
    });
  });

  it('should contains an error when the validation is failure', (done) => {
    const req = {
      body: { id: 'abcdefg' },
    };
    const res = {};
    validate(fieldBuilder('body.id').rule(dummy))(req, res, () => {
      res.errors.should.instanceof(Array).with.length(1);
      res.errors[0].should.have.properties({
        field: 'id',
        message: 'invalid',
      });
      done();
    });
  });

  it('should contains an error with custom message when the validation is failure', (done) => {
    const req = {
      body: { id: 'abc' },
    };
    const res = {};
    const field = fieldBuilder('body.id').rule(dummy, 6, 20).message('field {0} length must between {1} to {2}');
    validate(field)(req, res, () => {
      res.errors.should.instanceof(Array).with.length(1);
      res.errors[0].should.have.properties({
        field: 'id',
        message: 'field id length must between 6 to 20',
      });
      done();
    });
  });

  it('should contains an error when the validations is failure', (done) => {
    const req = {
      body: { id: 'abcdefg' },
    };
    const res = {};
    const field = fieldBuilder('body.id').rule(dummy).rule(dummy);
    validate(field)(req, res, () => {
      res.errors.should.instanceof(Array).with.length(1);
      res.errors[0].should.have.properties({
        field: 'id',
        message: 'invalid',
      });
      done();
    });
  });

  it('should contains errors when the validations is failure', (done) => {
    const req = {
      body: { id: 'abcdefg', email: 'invalid email address' },
    };
    const res = {};
    const fields = [
      fieldBuilder('body.id').rule(dummy),
      fieldBuilder('body.email').rule(dummy),
    ];
    validate(...fields)(req, res, () => {
      res.errors.should.instanceof(Array).with.length(2);
      res.errors[0].should.have.properties({
        field: 'id',
        message: 'invalid',
      });
      res.errors[1].should.have.properties({
        field: 'email',
        message: 'invalid',
      });
      done();
    });
  });

  it('should not contains any errors when the validation pass', (done) => {
    const req = {
      body: { id: 'abcdefg' },
    };
    const res = {};
    const field = fieldBuilder('body.id').rule(dummyPass);
    validate(field)(req, res, () => {
      res.errors.should.instanceof(Array).with.length(0);
      done();
    });
  });

  it('should execute sanitizer', (done) => {
    const req = {
      body: { id: '123456' },
    };
    const res = {};
    const field = fieldBuilder('body.id').sani(toInt);
    validate(field)(req, res, () => {
      req.body.id.should.be.type('number').and.equal(123456);
      done();
    });
  });

  it('should resolve args as function', (done) => {
    const resolveArgs = req => req.body.retypePassword;
    const req = {
      body: { password: 'abcdefg', retypePassword: 'abcdefg' },
    };
    const res = {};
    const field = fieldBuilder('body.password').rule((password, retypePassword) => {
      should(password).equal(retypePassword);
      should(req.body.retypePassword).equal(retypePassword);
    }, resolveArgs);
    validate(field)(req, res, () => {
      done();
    });
  });

  it('should execute promise rule', (done) => {
    const req = {
      body: { email: 'abc@cde.com' },
    };
    const res = {};

    const promiseRule = (email) => {
      should(email).equal(req.body.email);
      return Promise.resolve(false);
    };

    const field = fieldBuilder('body.email').rule(promiseRule);
    validate(field)(req, res, () => {
      res.errors.should.instanceof(Array).with.length(1);
      res.errors[0].should.have.properties({
        field: 'email',
        message: 'invalid',
      });
      done();
    });
  });
});

describe('With validator.js', () => {
  it('should execute promise rule', (done) => {
    const req = {
      body: { id: '123456' },
    };
    const res = {};
    const field = fieldBuilder('body.id').rule(validator.isInt).sani(validator.toInt);
    validate(field)(req, res, () => {
      res.errors.should.instanceof(Array).with.length(0);
      req.body.id.should.be.type('number').and.equal(123456);
      done();
    });
  });
});
