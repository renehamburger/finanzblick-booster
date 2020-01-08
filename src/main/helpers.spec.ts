import { TRANSFER } from './helpers.spec.fixtures';
import { adjustTransfer } from './helpers';

describe('main/helpers', () => {
  describe('convertDates', () => {
    it('works correctly', () => {
      const adjustedTransfer = adjustTransfer(TRANSFER);
      expect(adjustedTransfer.BookingDate instanceof Date).toBe(true);
      expect(adjustedTransfer.ChartDate instanceof Date).toBe(true);
      expect(typeof adjustedTransfer.Purpose).toBe('string');
    });
  });
});
