import initSqlJs from "sql.js";
import { get, set, del } from "idb-keyval";
import wasmUrl from "sql.js/dist/sql-wasm.wasm?url";

const SQL = await initSqlJs({
  locateFile: () => wasmUrl,
});

const IDB_KEY = "crossword_sqlite_db_v1";

let SQL = null;
let DB = null;

async function getSql() {
  if (SQL) return SQL;
  SQL = await initSqlJs({
    locateFile: (file) => `/node_modules/sql.js/dist/${file}`,
  });
  return SQL;
}

export async function loadDbFromIndexedDb() {
  const sql = await getSql();
  const bytes = await get(IDB_KEY);
  if (!bytes) return null;
  DB = new sql.Database(new Uint8Array(bytes));
  return DB;
}

export async function loadDbFromFile(file) {
  const sql = await getSql();
  const buf = await file.arrayBuffer();
  const bytes = new Uint8Array(buf);
  DB = new sql.Database(bytes);
  await set(IDB_KEY, bytes);
  return DB;
}

export async function persistDbToIndexedDb() {
  if (!DB) return;
  const bytes = DB.export();
  await set(IDB_KEY, bytes);
}

export async function clearIndexedDbDb() {
  await del(IDB_KEY);
  DB = null;
}

export async function exportDbToFile() {
  if (!DB) throw new Error("No DB loaded");
  const bytes = DB.export();
  const blob = new Blob([bytes], { type: "application/x-sqlite3" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "databasedico.db";
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export function query(sql, params = []) {
  if (!DB) throw new Error("No DB loaded");
  const stmt = DB.prepare(sql);
  stmt.bind(params);
  const rows = [];
  while (stmt.step()) rows.push(stmt.getAsObject());
  stmt.free();
  return rows;
}

export async function exec(sql, params = []) {
  if (!DB) throw new Error("No DB loaded");
  DB.run(sql, params);
  await persistDbToIndexedDb();
}
