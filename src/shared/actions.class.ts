/* eslint-disable class-methods-use-this */
import $ from 'cash-dom';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import {
  XHRRequest, XHRResponse, ExportValue, Transfer
} from './interfaces';
import { adjustTransfer } from '../main/helpers';
import {
  DEFAULT_HEADERS,
  PAGINATION_DELAY,
  FB_API_GET_BOOKINGS_PATH,
  FB_API_GET_SESSON_INFO_PATH,
  FB_API_GET_CATEGORIES_PATH,
  FB_API_GET_ACCOUNTS_PATH
} from './const';
import { fbUrl } from './helpers';

type ExcelWorkbookData = {
  [sheetName: string]: ExcelSheetData;
};
type ExcelSheetData = Array<Record<string, ExportValue>>;
type ExportDataArray = ExportValue[][];

let WindowId: string | undefined;
let RequestVerificationToken: string | undefined;
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

async function exportAsXlsx(exportData: ExcelWorkbookData, filename: string) {
  const workbook = XLSX.utils.book_new();
  workbook.Props = {
    Title: filename,
    CreatedDate: new Date()
  };
  for (const [sheetName, sheetData] of Object.entries(exportData)) {
    const data: ExportDataArray = [Object.keys(sheetData[0])];
    data.push(...sheetData.map(Object.values));
    workbook.SheetNames.push(sheetName);
    workbook.Sheets[sheetName] = XLSX.utils.aoa_to_sheet(data);
  }
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
  const response = await fetch(fbUrl(FB_API_GET_BOOKINGS_PATH), {
    method: 'POST',
    headers: DEFAULT_HEADERS,
    body: JSON.stringify(body)
  });
  const data = await response.json();
  return convertResponse(data);
}

async function getBookingsForMultiplePages(
  startPage: number, endPage: number, body: object = {}
): Promise<Transfer[]> {
  const pagesArray = [...Array(endPage).keys()].slice(startPage);
  const allBookings = await Promise.all(pagesArray.map(async (page: number) => {
    await sleep((page - 1) * PAGINATION_DELAY);
    return getBookings({
      ...body, WindowId, RequestVerificationToken, CurrentPage: page
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

async function getAccounts(): Promise<any[]> {
  const accountsResponse = await fetch(fbUrl(FB_API_GET_ACCOUNTS_PATH), {
    method: 'POST',
    headers: DEFAULT_HEADERS,
    body: JSON.stringify({ WindowId, RequestVerificationToken })
  });
  const accounts = await accountsResponse.json();
  return accounts.Accounts;
}

async function getCategories(): Promise<any[]> {
  const executeGetCategories = async (isTaxCategoryTree: boolean): Promise<any> => {
    const response = await fetch(fbUrl(FB_API_GET_CATEGORIES_PATH), {
      method: 'POST',
      headers: DEFAULT_HEADERS,
      body: JSON.stringify({ WindowId, RequestVerificationToken, isTaxCategoryTree })
    });
    return response.json();
  };
  const categories: any[] = [];
  const extractCategories = (objects: Array<Record<string, any>>,
    extraProperties: Record<string, any>) => {
    objects.forEach((obj) => {
      extractCategories(obj.Children || [], extraProperties);
      const { Children, ...objectWithoutChildren } = obj;
      categories.push({ ...objectWithoutChildren, ...extraProperties });
    });
  };
  const [categoryTree, taxCategoryTree] = await Promise.all([
    executeGetCategories(false),
    executeGetCategories(true)
  ]);
  extractCategories(categoryTree.CreditCategoryTree, { Credit: true, Tax: false });
  extractCategories(categoryTree.DebitCategoryTree, { Credit: false, Tax: false });
  extractCategories(taxCategoryTree.CreditCategoryTree, { Credit: true, Tax: true });
  extractCategories(taxCategoryTree.DebitCategoryTree, { Credit: false, Tax: true });
  return categories;
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
      exportAsXlsx({ bookings }, name);
    }
  }

  async exportCurrentView() {
    if (mostRecentGetBookingsRequest) {
      const requestBody = JSON.parse(mostRecentGetBookingsRequest.payload);
      const responseBody = JSON.parse(mostRecentGetBookingsResponse.body);
      const numberOfPages = parseFloat(responseBody.TotalBookingPages);
      const bookings = await getBookingsForMultiplePages(0, numberOfPages, requestBody);
      const name = getExportName(requestBody.AccountOrGroupId);
      exportAsXlsx({ bookings }, name);
    }
  }

  async exportAll() {
    const [accounts, categories] = await Promise.all([
      getAccounts(),
      getCategories()
    ]);
    const firstPageResponse = await fetch(fbUrl(FB_API_GET_BOOKINGS_PATH), {
      method: 'POST',
      headers: DEFAULT_HEADERS,
      body: JSON.stringify({ WindowId, RequestVerificationToken, CurrentPage: 0 })
    });
    const firstPageResponseBody = await firstPageResponse.json();
    const bookingsForFirstPage = convertResponse(firstPageResponseBody);
    const numberOfPages = parseFloat(firstPageResponseBody.TotalBookingPages);
    const bookingsForOtherPages = await getBookingsForMultiplePages(1, numberOfPages);
    const bookings = bookingsForFirstPage.concat(...bookingsForOtherPages);
    const name = getExportName();
    exportAsXlsx({ bookings, accounts, categories }, name);
  }

  handleXHR(request: XHRRequest, response: XHRResponse) {
    if (request.url === fbUrl(FB_API_GET_SESSON_INFO_PATH)) {
      WindowId = JSON.parse(request.payload).WindowId;
      RequestVerificationToken = JSON.parse(response.body).RequestVerificationToken;
      mostRecentGetBookingsRequest = undefined;
      mostRecentGetBookingsResponse = undefined;
    } else {
      if (request.url === fbUrl(FB_API_GET_BOOKINGS_PATH)) {
        mostRecentGetBookingsRequest = request;
        mostRecentGetBookingsResponse = response;
      }
      WindowId = JSON.parse(request.payload || '{}').WindowId || WindowId;
      RequestVerificationToken = JSON.parse(response.body || '{}').RequestVerificationToken || RequestVerificationToken;
    }
  }
}

export type Action = keyof Actions;
