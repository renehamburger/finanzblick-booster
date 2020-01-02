/* eslint-disable class-methods-use-this */
import $ from 'cash-dom';

async function sleep(ms: number) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

export class Actions {
  async deselectBookings() {
    const selector = '#booking-grid-wrapper button[data-id="checkbox-item-selection"][checked]';
    while ($(selector).length) {
      $(selector).last()[0].click();
      // eslint-disable-next-line no-await-in-loop
      await sleep(10);
    }
  }
};

export type Action = keyof Actions;
