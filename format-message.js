'use strict';

module.exports = function formatMessage(msg, params) {
  params = [].concat(params);
  return msg.replace(/\{([\d\.]*)\}/g, function(match, p1) {
    return params[p1];
  });
};
