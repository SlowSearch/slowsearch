import TermIdMapping from './db/termMapping';
import { search } from './searcher';
import { addDocument } from './indexer';

const termIdMapping = new TermIdMapping();

const slowsearch = {
  addDocument,
  search,
};

export default slowsearch;
