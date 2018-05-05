import {memoizingStemmer as stemmer} from 'porter-stemmer';
import {english} from 'stopwords';

export async function stringToTerms(text) {
  // Tokenize, apply stemmer & remove stop words:
  const terms = tokenize(text)
    .map(stemmer)
    .filter(term => !stopwords.has(term));
}

function tokenize(text) {
  // Since our stop words have the ' (single quote) removed, remove it here too for now.
  const tokens = text.toLowerCase().replace(/'/g, '').split(/[^\w'-]+/);
  // Remove a possible empty token at the first and/or last position.
  if (tokens[tokens.length - 1].length === 0) {
    tokens.pop();
  }
  return tokens;
}
