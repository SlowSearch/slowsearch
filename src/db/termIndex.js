
export function addIndexEntry(transaction, docId, score, termId) {
  const store = transaction.objectStore(dbStoreIndex); // does this cost any time?
  const key = encodeKey(termId, score, docId);
  const promise = store.put(null, key); // value=null as we don't use it.
  // return promise; // we won't await this one (is omitting this more efficient?)
}

export async function getMatchingDocuments(transaction, termId, limit) {
  const documents = await new Promise(resolve => {
    const request = transaction.objectStore(dbStoreIndex).getAllKeys(getBound(termId), limit);
    request.onsuccess = event => {
      const keys = event.target.result;
      const documents = keys.map(decodeKey);
      resolve(documents);
    }
    // const documents = [];
    // Since large tf's are stored as high numbers, we can only early stop when we walk in reverse (prev) order.
    // const request = transaction.objectStore(dbStoreIndex).openCursor(getBound(termId), 'prev');
    // request.onsuccess = event => {
    //   const cursor = event.target.result;
    //   if (cursor && documents.length < limit) {
    //     const docScore = decodeKey(cursor.key); // = {documentId, score}
    //     documents.push(docScore);
    //     cursor.continue();
    //   } else {
    //     resolve(documents);
    //   }
    // };
  });
  return documents;
}


//NOTE:
// We are using a Number (float64) for key storage, because this is the most efficient way in FireFox
// to store key data in indexedDB: https://github.com/mozilla/gecko/blob/central/dom/indexedDB/Key.cpp#L34-L109
// since other binary data is less efficient:
// - Strings: if a char > 7E, it will need more than 8 bits to be stored (and they need 2 to prefix the long byte alternative with '10' for correct sorting)
// - Blob: if a byte > 7E, it will costs 16 instead of 8 bits, data wise this means we can only use 7 bits per 8 storage bits
//
// This is our data diagram of the key:
//  0                   1                   2                   3
//  0 1 2 3 4 5 6 7 8 9 0 1 2 3 4 5 6 7 8 9 0 1 2 3 4 5 6 7 8 9 0 1
// +-----------------------------------------------+---------------+
// |                  Term ID (24)                 |   Score (8)   |
// +-----------------------------------------------+---------------+
// |                        Document ID (32)                       |
// +---------------------------------------------------------------+
//
//  Variable    | Byte Offset | Byte Size | Bit Range
// -------------+-------------+-----------+-----------
//  Term ID     |           0 |         3 |    00..23
//  Score       |           3 |         1 |    23..31
//  Document ID |           4 |         4 |    31..63
//
// To quote Mozilla:
// > When encoding floats, 64bit IEEE 754 are almost sortable, except that
// > positive sort lower than negative, and negative sort descending. So we use
// > the following encoding:
// > value < 0 ?
// >   (-to64bitInt(value)) :
// >   (to64bitInt(value) | 0x8000000000000000)
//
// Since the float64 sign bit is the first bit (http://2ality.com/2012/04/number-encoding.html),
// we will only encounter this when we use more than 1 << 23 terms,
// that is why we changed our limit testing to 1 << 23 (8M+), if we fix this sorting case (is inverting the score bits? when negative enough?)
// we can change this limit to 1 << 24 (16M+) again.

// Create a key (Number) from a termId, score and docId
function encodeKey(termId, score, docId) {
  const dv = new DataView(new ArrayBuffer(8));
  if (termId < 0 || score < 0 || docId < 0 || termId >= 1 << 23 || score >= 1 << 8 || docId >= (1 << 30) * 4) {
    throw Error('encodeKey out of bound');
  }
  // Invert the score, so sorting will put higher scores first.
  const invertedScore = 255 - score;
  dv.setUint32(0, termId << 8 | invertedScore);
  dv.setUint32(4, docId);
  return dv.getFloat64(0);
}

// Fetch a score and docId as object from a key (Number)
function decodeKey(key) {
  const dv = new DataView(new ArrayBuffer(8));
  dv.setFloat64(0, key);
  return {
    // termId: dv.getUint32(0) >> 8, // unused, hence omitted.
    score: 255 - dv.getUint8(3),
    docId: dv.getUint32(4),
  };
}

// Get the KeyRange for walking through all records with termId
function getBound(termId) {
  const dv = new DataView(new ArrayBuffer(8));
  if (termId < 0 || termId >= 1 << 23) {
    throw Error('getBound out of bound');
  }
  dv.setUint32(0, termId << 8);
  dv.setUint32(4, 0);
  const lower = dv.getFloat64(0);

  dv.setUint32(0, termId << 8 | 0xFF);
  dv.setUint32(4, 0xFFFFFFFF);

  const upper = dv.getFloat64(0);
  return IDBKeyRange.bound(lower, upper, false, false);
}
