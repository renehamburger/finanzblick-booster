/* eslint-disable class-methods-use-this */
import $ from 'cash-dom';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import { XHRRequest, XHRResponse, ExportValue } from './interfaces';
import { adjustTransfer } from '../main/helpers';

type ExportDataObject = Array<Record<string, ExportValue>>;
type ExportDataArray = ExportValue[][];
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
        bookings.push(transfer);
      } else {
        throw new Error(`No data for booking ${id}`);
      }
    });
    exportAsXlsx(bookings, 'Finanzblick-export');
  }

  async exportLoaded() {
    exportAsXlsx(Object.values(transfers), 'Finanzblick-export');
  }

  handleXHR(_request: XHRRequest, response: XHRResponse) {
    const data = JSON.parse(response.body);
    for (const group of data.Groups) {
      for (const transfer of group.Transfers) {
        transfers[transfer.Id] = adjustTransfer(transfer);
      }
    }
  }
}

export type Action = keyof Actions;
