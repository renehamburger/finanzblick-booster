export default function mapValues<V1, V2 = V1>(
  obj: Record<string, V1>, fn: (value: V1, key: string) => V2
) {
  // TODO: Use lodash/fp instead
  return Object.keys(obj).reduce((result, key) => {
    // eslint-disable-next-line no-param-reassign
    result[key] = fn(obj[key], key);
    return result;
  }, {});
}
