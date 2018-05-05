import { db } from '../db'
import { indexTerm } from '../db/indexer';
import { stringToTerms } from '../preprocess';
import itemFreq from '../util/itemFreq';

async function indexTerms(transaction, docId, terms) {
  const uniqueTerms = itemFreq(terms);

  // The total term count used for score calculation.
  // Note: removed (stop)words are not counted (would that be desirable?)
  const totalTermCount = terms.length;

  for (const [term, termCount] of uniqueTerms) {
    const score = calculateScore(termCount, totalTermCount);
    indexTerm(transaction, term, score, docId);
  }

  const uniqueTermCount = uniqueTerms.size;
  return uniqueTermCount;
}

// A simple Okapi BM15 TF-IDF-like score.
// TODO try BM25F for weighted fields
function calculateScore(termCount, docSize) {
  const tf = termCount / docSize;
  const k1 = 1.2;
  let bm15Score = (tf * (k1 + 1)) / (tf + k1); // range is between [0, 1]
  return Math.floor(255 * bm15Score);
}

async function indexDoc(transaction, doc) {
  const docId = await addDocInfo(transaction, doc);
  const terms = await stringToTerms(doc.text);
  await indexTerms(transaction, docId, terms);
  return docId;
}

export async function indexDocs(docs, prefill = true) {
  const transaction = (await db()).transaction([dbStoreIndex, dbStoreDocs, dbStoreTerms], 'readwrite');
  if (prefill) {
    await termCache.prefill(transaction);
  }

  await Promise.all(docs.map(doc => indexDoc(transaction, doc)));

  termCache.storeUpdatesToDB(transaction);
  await new Promise((resolve, reject) => {
    transaction.onerror = reject;
    transaction.onabort = reject;
    transaction.oncomplete = resolve;
  });
}
