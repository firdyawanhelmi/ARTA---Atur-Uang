// T1.2 PoC SQLite — stdlib node:sqlite saja, tanpa dependency.
// Membuktikan: migrasi, transaksi atomik entitas+queue, rollback,
// constraint, persistensi tutup-buka, kill saat transaksi berjalan.
'use strict';
const { DatabaseSync } = require('node:sqlite');
const fs = require('node:fs');
const { spawnSync, spawn } = require('node:child_process');

const DB = process.env.POC_DB || (require('node:os').tmpdir() + '/arta-poc.sqlite');
const out = (k, v) => console.log(k + '=' + v);
let pass = 0;
const check = (name, cond) => { out('CHECK ' + name, cond ? 'PASS' : 'FAIL'); if (!cond) process.exitCode = 1; else pass++; };

// ---- mode anak untuk simulasi kill: mulai txn, insert, lalu sleep tanpa commit
if (process.argv[2] === 'child-uncommitted' || process.argv[2] === 'child-committed') {
  const db = new DatabaseSync(DB);
  db.exec('BEGIN IMMEDIATE');
  db.prepare("INSERT INTO accounts(id,name,balance) VALUES('acc-kill','Kill',100)").run();
  if (process.argv[2] === 'child-committed') db.exec('COMMIT');
  setTimeout(() => {}, 15000); // ditahan agar parent dapat kill
  return;
}

try { fs.unlinkSync(DB); } catch {}
const db = new DatabaseSync(DB);

// 1. migrasi v1 + v2 (upgrade path)
db.exec(`CREATE TABLE schema_version(version INTEGER PRIMARY KEY);
INSERT INTO schema_version VALUES(1);
CREATE TABLE accounts(id TEXT PRIMARY KEY, name TEXT NOT NULL, balance INTEGER NOT NULL CHECK(balance>=0));
CREATE TABLE operation_queue(operation_id TEXT PRIMARY KEY, entity_id TEXT NOT NULL, kind TEXT NOT NULL,
  FOREIGN KEY(entity_id) REFERENCES accounts(id));
CREATE INDEX idx_queue_entity ON operation_queue(entity_id);`);
db.exec(`ALTER TABLE accounts ADD COLUMN currency TEXT NOT NULL DEFAULT 'IDR';
UPDATE schema_version SET version=2;`);
check('migrate-v1-v2', db.prepare('SELECT version v FROM schema_version').get().v === 2);

// 2. tulis atomik entitas + queue dalam satu txn
db.exec('BEGIN IMMEDIATE');
db.prepare("INSERT INTO accounts(id,name,balance) VALUES('acc-1','Tunai',50000)").run();
db.prepare("INSERT INTO operation_queue VALUES('op-1','acc-1','create')").run();
db.exec('COMMIT');
check('atomic-commit', db.prepare('SELECT count(*) v FROM accounts').get().v === 1
  && db.prepare('SELECT count(*) v FROM operation_queue').get().v === 1);

// 3. rollback: keduanya batal
try {
  db.exec('BEGIN IMMEDIATE');
  db.prepare("INSERT INTO accounts(id,name,balance) VALUES('acc-2','X',10)").run();
  db.prepare("INSERT INTO operation_queue VALUES('op-2','acc-2','create')").run();
  throw new Error('simulated-failure');
} catch { db.exec('ROLLBACK'); }
check('rollback-both', db.prepare("SELECT count(*) v FROM accounts WHERE id='acc-2'").get().v === 0
  && db.prepare("SELECT count(*) v FROM operation_queue WHERE operation_id='op-2'").get().v === 0);

// 4. constraint: CHECK + FK menolak tulis kotor
let rej = 0;
try { db.prepare("INSERT INTO accounts(id,name,balance) VALUES('acc-3','Neg',-5)").run(); } catch { rej++; }
try { db.prepare("INSERT INTO operation_queue VALUES('op-3','no-such','create')").run(); } catch { rej++; }
check('constraints', rej === 2);

// 5. persistensi tutup-buka
db.close();
const db2 = new DatabaseSync(DB);
check('persist-reopen', db2.prepare("SELECT balance v FROM accounts WHERE id='acc-1'").get().v === 50000);
db2.close();

// 6a. kill saat txn BELUM commit -> tidak ada sisa
{
  const c = spawn(process.execPath, [__filename, 'child-uncommitted'], { env: { ...process.env, POC_DB: DB }, stdio: 'ignore' });
  require('node:timers').setTimeout(() => {}, 0);
  const t0 = Date.now(); while (Date.now() - t0 < 1200) {} // beri waktu insert
  c.kill('SIGKILL');
  const db3 = new DatabaseSync(DB);
  check('kill-uncommitted-absent', db3.prepare("SELECT count(*) v FROM accounts WHERE id='acc-kill'").get().v === 0);
  db3.close();
}
// 6b. kill SETELAH commit -> data durable
{
  const c = spawn(process.execPath, [__filename, 'child-committed'], { env: { ...process.env, POC_DB: DB }, stdio: 'ignore' });
  const t0 = Date.now(); while (Date.now() - t0 < 1200) {}
  c.kill('SIGKILL');
  const db4 = new DatabaseSync(DB);
  check('kill-committed-durable', db4.prepare("SELECT balance v FROM accounts WHERE id='acc-kill'").get().v === 100);
  db4.exec("DELETE FROM accounts WHERE id='acc-kill'");
  db4.close();
}
out('TOTAL_PASS', pass + '/7');
