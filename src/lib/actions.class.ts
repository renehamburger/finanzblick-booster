/* eslint-disable class-methods-use-this */
import $ from 'cash-dom';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import { XHRRequest, XHRResponse } from '../shared/interfaces';

type ExportDatum = string | number | Date;
type ExportDataObject = Array<Record<string, ExportDatum>>;
type ExportDataArray = ExportDatum[][];
interface Transfers {
  [id: string]: any
}

const transfers: Transfers = {};

async function sleep(ms: number) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

function stringToBuffer(text: string) {
  const buffer = new ArrayBuffer(text.length);
  const view = new Uint8Array(buffer);
  // eslint-disable-next-line no-plusplus
  for (let i = 0; i < text.length; i++) {
    // eslint-disable-next-line no-bitwise
    view[i] = text.charCodeAt(i) & 0xFF; // convert to octet
  }
  return buffer;
}

async function exportAsXlsx(exportData: ExportDataObject, filename: string) {
  if (!exportData.length) {
    return;
  }
  const data: ExportDataArray = [Object.keys(exportData[0])];
  data.push(...exportData.map(Object.values));
  const sheetName = 'bookings';
  const workbook = XLSX.utils.book_new();
  workbook.Props = {
    Title: filename,
    CreatedDate: new Date()
  };
  workbook.SheetNames.push(sheetName);
  workbook.Sheets[sheetName] = XLSX.utils.aoa_to_sheet(data);
  const wbout = XLSX.write(workbook, { bookType: 'xlsx', type: 'binary' });
  const blob = new Blob([stringToBuffer(wbout)], { type: 'application/octet-stream' });
  // Once size restriction of blobs is reached, streamSaver package needs to be used instead
  saveAs(blob, `${filename}.xlsx`);
}

function mapValues<V>(obj: Record<string, V>, fn: (value: V, key: string) => V) {
  // TODO: Use lodash/fp instead
  return Object.keys(obj).reduce((result, key) => {
    // eslint-disable-next-line no-param-reassign
    result[key] = fn(obj[key], key);
    return result;
  }, {});
}

function convertTransfer(transfer: Record<string, any>): Record<string, ExportDatum> {
  return mapValues(transfer, (value) => {
    if (typeof value === 'object') {
      return JSON.stringify(value);
    }
    return value;
  });
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

  async exportCurrentList() {
    const bookings: ExportDataObject = [];
    $('#booking-grid-wrapper [data-booking-id]').each((_index, el) => {
      const $el = $(el);
      const id = $el.data('booking-id');
      const transfer = transfers[id];
      if (transfer) {
        bookings.push(convertTransfer(transfer));
      } else {
        console.error(`No data for booking ${id}`);
      }
    });
    exportAsXlsx(bookings, 'Finanzblick-export');
  }

  handleXHR(_request: XHRRequest, response: XHRResponse) {
    for (const group of response.body.Groups) {
      for (const transfer of group.Transfers) {
        transfers[transfer.Id] = transfer;
      }
    }
  }
}

export type Action = keyof Actions;
