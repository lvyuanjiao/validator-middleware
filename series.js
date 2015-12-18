'use strict';

module.exports = function(arr, fn, callback) {
  var isArr = Array.isArray(arr);
  var keys = isArr ? null : Object.keys(arr);
  var len = isArr ? arr.length : keys.length;

  var results = isArr ? [] : {};
  var completed = 0;
  if (len === 0) {
    return callback(null, results);
  }

  var iterate = function() {
    var key = isArr ? completed : keys[completed];
    fn(arr[key], function(err, result) {
      if (err) {
        return callback(err, results);
      }
      if (isArr) {
        results.push(result);
      } else {
        results[key] = result;
      }
      if (++completed >= len) {
        callback(null, results);
      } else {
        process.nextTick(iterate);
      }
    }, key, completed);
  };

  iterate();
};
