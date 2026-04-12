const User = require('./User');

let Document = null;
let Order = null;

try { Document = require('./Document'); } catch {}
try { Order = require('./Order'); } catch {}

module.exports = { User, Document, Order };
