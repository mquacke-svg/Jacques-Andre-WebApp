const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const { DatabaseSync } = require('node:sqlite');
const fs = require('node:fs'), path = require('node:path'), os = require('node:os'), crypto = require('node:crypto');
const php = process.env.PHP_BINARY;
if (!php) throw Error('Set PHP_BINARY');
const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'bakery-admin-test-'));
const database = path.join(directory, 'test.sqlite');
fs.copyFileSync(path.join(__dirname, '../data/catalog.sqlite'), database);
const password = crypto.randomBytes(24).toString('hex');
function run(login, secret) { return spawnSync(php, [path.join(__dirname, '../scripts/create-admin.php')], {input:JSON.stringify({login,password:secret}),encoding:'utf8',windowsHide:true,env:{...process.env,DATABASE_PATH:database}}); }
try {
  assert.equal(run('secure.owner', password).status, 0);
  let db = new DatabaseSync(database,{readOnly:true});
  const account = db.prepare("SELECT u.role,a.password FROM user u JOIN account a ON a.user_id=u.id WHERE username='secure.owner'").get();
  assert.equal(account.role,'admin'); assert.match(account.password,/^[a-f0-9]{32}:[a-f0-9]{128}$/); assert.notEqual(account.password,password); db.close();
  assert.equal(run('secure.owner', password).status,1);
  assert.equal(run('other.owner','short').status,1);
  assert.equal(run('admin',password).status,1);
  db = new DatabaseSync(database,{readOnly:true});
  assert.equal(db.prepare('SELECT COUNT(*) n FROM user').get().n,1);
  assert.equal(db.prepare('SELECT password FROM account').get().password,account.password); db.close();
  console.log('PASS isolated admin CLI: secure creation, compatible hash, duplicate protection and validation');
} finally { fs.rmSync(directory,{recursive:true,force:true}); }
