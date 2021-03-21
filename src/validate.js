import series from './series';

export default (...fields) => (req, res, next) => {
  series(fields, (field, nextField) => {
    field.validate(req, nextField);
  }, (err, results) => {
    res.errors = results.filter(error => error);
    next();
  });
};
