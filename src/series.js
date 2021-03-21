export default (arr, fn, callback) => {
  const isArr = Array.isArray(arr);
  const keys = isArr ? null : Object.keys(arr);
  const len = isArr ? arr.length : keys.length;

  const results = isArr ? [] : {};
  let completed = 0;
  if (len === 0) {
    return callback(null, results);
  }

  const iterate = () => {
    const key = isArr ? completed : keys[completed];
    fn(arr[key], (err, result) => {
      if (err) {
        return callback(err, results);
      }
      if (isArr) {
        results.push(result);
      } else {
        results[key] = result;
      }
      completed += 1;
      if (completed >= len) {
        return callback(null, results);
      }
      return iterate();
    }, key, completed);
  };

  return iterate();
};
