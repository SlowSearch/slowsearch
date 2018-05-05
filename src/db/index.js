
let _db;
export async function db() {
  const db = await new Promise((resolve, reject) => {
    if (_db) {
      return resolve(_db);
    }
    let request = indexedDB.open(dbName, 1);
    request.onblocked = () => reject('update blocked by db open in other tab');
    request.onerror = () => reject('DB open error, maybe running in private/incognito mode?');
    request.onsuccess = event => { _db = event.target.result; resolve(_db); };
    request.onupgradeneeded = event => {
      let db = event.target.result;
      db.createObjectStore(dbStoreIndex);
      db.createObjectStore(dbStoreDocs, {autoIncrement: true});
      db.createObjectStore(dbStoreTerms);
    };
  });
  return db;
}
