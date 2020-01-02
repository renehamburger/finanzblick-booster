/* eslint-disable class-methods-use-this */
import $ from 'cash-dom';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';

type ExportDatum = string | number;
type ExportDataObject = Array<Record<string, ExportDatum>>;
type ExportDataArray = ExportDatum[][];

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
      const amount = $el.find('[data-automationid="balance-amount"]').text();
      bookings.push({
        ordertype: $el.find('[data-automationid="ordertype"]').text(),
        receivername: $el.find('[data-automationid="receivername"]').text(),
        purpose: $el.find('[data-automationid="purpose"]').text(),
        // selectcategory: $el.find('[data-automationid="btn-selectcategory"]').text(),
        // document: $el.find('[data-automationid="icon-document"]').text(),
        // keywords: $el.find('[data-automationid="icon-keywords"]').text(),
        // rebooking: $el.find('[data-automationid="icon-rebooking"]').text(),
        // taxrelevant: $el.find('[data-automationid="icon-taxrelevant"]').text(),
        amount: parseFloat(amount.replace(/\./g, '').replace(',', '.')),
        categoryname: $el.find('[data-automationid="categoryname"]').text()
      });
    });
    exportAsXlsx(bookings, 'Finanzblick-export');
  }
}

export type Action = keyof Actions;
