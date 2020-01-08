export default function mapValues<V>(obj: Record<string, V>, fn: (value: V, key: string) => V) {
  // TODO: Use lodash/fp instead
  return Object.keys(obj).reduce((result, key) => {
    // eslint-disable-next-line no-param-reassign
    result[key] = fn(obj[key], key);
    return result;
  }, {});
}
