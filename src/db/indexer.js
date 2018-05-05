export function indexTerm(transaction, docId, score, term) {
  const termId = await termIds.getIdAndIncreaseDf(transaction, term);
  addIndexEntry(transaction, docId, score, termId);
}
