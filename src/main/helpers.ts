import { mapValues } from '../shared/helpers';
import { BackendTransfer, Transfer } from '../shared/interfaces';

// eslint-disable-next-line import/prefer-default-export
export function adjustTransfer(backendTransfer: BackendTransfer): Transfer {
  const dateRegex = /\/Date\((\d+)\)\//;
  return mapValues(backendTransfer, (value) => {
    switch (typeof value) {
      case 'string':
        if (dateRegex.test(value)) {
          const timestampString = value.replace(dateRegex, '$1');
          const timestamp = parseInt(timestampString, 10);
          return new Date(timestamp);
        }
        return value;
      case 'object':
        if (value instanceof Array) {
          return value.join('\n');
        }
        return value;
      default:
        return value;
    }
  });
}
