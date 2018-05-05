
async function addDocInfo(transaction, doc) {
  // doc.id may be undefined, in which case indexedDB will choose an id.
  const docId = await new Promise(resolve => {
    let request = transaction.objectStore(dbStoreDocs).add({}, doc.id);
    request.onsuccess = event => {
      resolve(event.target.result);
    };
  });
  return docId;
}

export async function getDocCount(transaction) {
  const count = await new Promise(resolve => {
    let request = transaction.objectStore(dbStoreDocs).count();
    request.onsuccess = event => {
      resolve(event.target.result);
    };
  });
  return count;
}
