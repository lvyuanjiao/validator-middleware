export default (msg, ...params) => msg.replace(/\{([\d\.]*)\}/g, (match, p1) => params[p1]);
