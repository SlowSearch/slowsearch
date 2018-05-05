export function search(queryString) {

}

// import db, termCache, getMatchingDocuments, getDocCount

async function querySingleTerm(term, limit = 10) {
  const transaction = (await db()).transaction([dbStoreIndex, dbStoreDocs, dbStoreTerms], 'readonly');

  // Read the termId (and its count among all documents)
  const termObj = await termCache.get(transaction, term);
  if (!termObj) {
    // Unknown term; apparently no documents contain it.
    return {idf: Infinity, total: 0, documents: []};
  }
  const { termId, termCount } = termObj;

  // Read matching documents from the index
  const documents = await getMatchingDocuments(transaction, termId);

  // Read the total number of documents to compute the inverse document frequency.
  const docCount = await getDocCount(transaction);
  const idf = computeIdf(docCount, termCount);

  const result = {
    documents,
    idf,
    total: termCount,
  }
  return result;
}

function computeIdf(documentCount, documentsWithTerm) {
  // If documentsWithTerm = 0 then the result will be Infinity
  return Math.log(documentCount / documentsWithTerm);
}
