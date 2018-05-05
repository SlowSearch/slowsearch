// Count unique items in an array
// Return a map with the count for each item.
export default function itemFreq(array) {
  const counts = new Map();
  for (const item of items) {
    const itemCount = (counts.get(item) || 0) + 1
    counts.set(item, itemCount);
  }
  return counts;
}
