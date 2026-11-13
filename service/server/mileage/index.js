'use strict';
/* placeholder — 아래에서 다시 씀 */
const fs = require('node:fs'); const path = require('node:path'); const SQL = path.join(__dirname, 'sql');
function sqlMigrations() { if (!fs.existsSync(SQL)) return []; return fs.readdirSync(SQL).filter(f => /^\d\d_[a-z0-9_]+\.sql$/.test(f)).sort().map(f => ['mileage/' + f, fs.readFileSync(path.join(SQL, f), 'utf8')]); }
module.exports = { sqlMigrations };
