
export default class TermIdMapping {
  constructor() {
    this.cache = new Map();
    this.cacheEqualsObjectStore = false;
    this.inserts = new Set();
    this.queue = new Map();
  }

  async get(transaction, term) {
    const value = this.cache.get(term);
    if (value || this.cacheEqualsObjectStore) {
      return value;
    }
    const dbValue = await new Promise(resolve => {
      const request = transaction.objectStore(dbStoreTerms).get(term);
      request.onsuccess = event => {
        resolve(event.target.result);
      };
    });
    this.cache.set(term, dbValue);
    return dbValue;
  }

  async prefill(transaction) {
    if (this.cacheEqualsObjectStore) {
      return;
    }
    await new Promise(resolve => {
      const request = transaction.objectStore(dbStoreTerms).openCursor();
      request.onsuccess = event => {
        const cursor = event.target.result;
        if (!cursor) {
          this.cacheEqualsObjectStore = true;
          return resolve();
        }
        this.cache.set(cursor.key, cursor.value);
        cursor.continue();
      };
    });
  }

  async getIdAndIncreaseDf(transaction, term) {
    const termObj = this.queue.get(term) || await this.get(transaction, term) || {id: this.inserts.size + await this._getTermCount(transaction), count: 0};
    if (termObj.count === 0) {
      this.inserts.add(term);
    }
    termObj.count++;
    this.queue.set(term, termObj);
    return termObj.id;
  }

  discardUpdates() {
    this.inserts.clear();
    this.queue.clear();
  }

  storeUpdatesToDB(transaction) {
    const newCache = new Map(this.cache);
    const store = transaction.objectStore(dbStoreTerms);
    for(const [term, value] of this.queue) {
      this.inserts.has(term) ? store.add(value, term) : store.put(value, term);
      newCache.set(term, value);
    }

    // should only happen on transaction completion?
    this.cache = newCache;
    this.inserts.clear();
    this.queue.clear();
  }

  async function _getTermCount(transaction) {
    const count = await new Promise(resolve => {
      let request = transaction.objectStore(dbStoreTerms).count();
      request.onsuccess = event => {
        resolve(event.target.result);
      };
    });
    return count;
  }
}
