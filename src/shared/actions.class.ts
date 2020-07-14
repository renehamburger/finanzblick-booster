/* eslint-disable class-methods-use-this */
import $ from 'cash-dom';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import {
  XHRRequest, XHRResponse, ExportValue, Transfer
} from './interfaces';
import { adjustTransfer } from '../main/helpers';
import { PAGINATION_DELAY, FB_API_GET_BOOKINGS_URL } from './const';

type ExportDataObject = Array<Record<string, ExportValue>>;
type ExportDataArray = ExportValue[][];

let mostRecentGetBookingsRequest: XHRRequest | undefined;
let mostRecentGetBookingsResponse: XHRResponse | undefined;

async function sleep(ms: number) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

function stringToBuffer(text: string): ArrayBuffer {
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

function convertResponse(data: any): Transfer[] {
  const transfers: Transfer[] = [];
  for (const group of data.Groups) {
    for (const transfer of group.Transfers) {
      transfers.push(adjustTransfer(transfer));
    }
  }
  return transfers;
}

async function getBookings(body: object): Promise<Transfer[]> {
  if (mostRecentGetBookingsRequest) {
    const response = await fetch(FB_API_GET_BOOKINGS_URL, {
      method: 'POST',
      headers: mostRecentGetBookingsRequest.headers,
      body: JSON.stringify(body)
    });
    const data = await response.json();
    return convertResponse(data);
  }
  return [];
}

async function getBookingsForMultiplePages(
  startPage: number, endPage: number, body: object
): Promise<Transfer[]> {
  const pagesArray = [...Array(endPage).keys()].slice(startPage);
  const allBookings = await Promise.all(pagesArray.map(async (page: number) => {
    await sleep((page - 1) * PAGINATION_DELAY);
    return getBookings({
      ...body, CurrentPage: page
    });
  }));
  return [].concat(...allBookings);
}

function getExportName(account?: string, page?: number): string {
  const date = new Date().toISOString().slice(0, 10);
  const accountIdSegment = account ? ` - Konto ${account}` : '';
  const pageSegment = page ? ` - Seite ${page}` : '';
  return `Finanzblick-Export - ${date}${accountIdSegment}${pageSegment}`;
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

  async exportCurrentPage() {
    if (mostRecentGetBookingsRequest) {
      const requestBody = JSON.parse(mostRecentGetBookingsRequest.payload);
      const responseBody = JSON.parse(mostRecentGetBookingsResponse.body);
      const bookings = convertResponse(responseBody);
      const currentPage = parseFloat(requestBody.CurrentPage) + 1;
      const name = getExportName(requestBody.AccountOrGroupId, currentPage);
      exportAsXlsx(bookings, name);
    }
  }

  async exportCurrentView() {
    if (mostRecentGetBookingsRequest) {
      const requestBody = JSON.parse(mostRecentGetBookingsRequest.payload);
      const responseBody = JSON.parse(mostRecentGetBookingsResponse.body);
      const numberOfPages = parseFloat(responseBody.TotalBookingPages);
      const bookings = await getBookingsForMultiplePages(0, numberOfPages, requestBody);
      exportAsXlsx(bookings, 'Finanzblick-export');
    }
  }

  async exportAll() {
    if (mostRecentGetBookingsRequest) {
      const requestBody = JSON.parse(mostRecentGetBookingsRequest.payload);
      const body = {
        WindowId: requestBody.WindowId,
        RequestVerificationToken: requestBody.RequestVerificationToken,
        CurrentPage: 0
      };
      const firstPageResponse = await fetch(FB_API_GET_BOOKINGS_URL, {
        method: 'POST',
        headers: mostRecentGetBookingsRequest.headers,
        body: JSON.stringify(body)
      });
      const firstPageResponseBody = await firstPageResponse.json();
      const bookingsForFirstPage = convertResponse(firstPageResponseBody);
      const numberOfPages = parseFloat(firstPageResponseBody.TotalBookingPages);
      const bookingsForOtherPages = await getBookingsForMultiplePages(1, numberOfPages, body);
      const allBookings = bookingsForFirstPage.concat(...bookingsForOtherPages);
      const name = getExportName();
      exportAsXlsx(allBookings, name);
    }
  }

  handleXHR(request: XHRRequest, response: XHRResponse) {
    if (request.url === FB_API_GET_BOOKINGS_URL) {
      mostRecentGetBookingsRequest = request;
      mostRecentGetBookingsResponse = response;
    }
  }
}

export type Action = keyof Actions;
