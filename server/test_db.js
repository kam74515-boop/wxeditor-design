const Database = require('better-sqlite3');
const db = new Database('/Users/karl/apps/UEditor docs/wxeditor-server/server/data/wxeditor.db');
const row = db.prepare('SELECT * FROM ai_configs WHERE is_active = 1').get();
console.log('DB Config:', row);
