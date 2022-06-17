/* eslint-disable class-methods-use-this */
import { saveAs } from 'file-saver';
import * as XLSX from 'xlsx';
import { PAGE_SIZE } from './const';
import { fbUrl } from './helpers';
import { ExportValue, XHRRequest, XHRResponse } from './interfaces';
import { createUUID } from './uuid';

type ExcelWorkbookData = {
  [sheetName: string]: ExcelSheetData;
};
type ExcelSheetData = Array<Record<string, ExportValue>>;
type ExportDataArray = ExportValue[][];
type TreeItem = {
  [key: string]: ExportValue;
  id: string;
} & {
  children: TreeItem[];
};
interface FlatItem {
  [key: string]: ExportValue;
  id: string;
  parentId: string | null;
}

let authorizationHeader: string | undefined;
let frontendVersionHeader: string | undefined;

// async function sleep(ms: number) {
//   await new Promise((resolve) => setTimeout(resolve, ms));
// }

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

function getHeaders() {
  return {
    Accept: 'application/json, text/plain, */*',
    Authorization: authorizationHeader,
    'Frontend-Version': frontendVersionHeader,
    'x-requestid': createUUID()
  };
}

async function exportAsXlsx(exportData: ExcelWorkbookData, filename: string) {
  const workbook = XLSX.utils.book_new();
  workbook.Props = {
    Title: filename,
    CreatedDate: new Date()
  };
  for (const [sheetName, sheetData] of Object.entries(exportData)) {
    if (sheetData.length) {
      // eslint-disable-next-line no-nested-ternary, no-confusing-arrow
      const keys = Object.keys(sheetData[0]).sort((a, b) => a === 'id' ? -1 : b === 'id' ? 1 : a.localeCompare(b));
      const data: ExportDataArray = [keys];
      sheetData.forEach((entry) => {
        const row = keys.map((key) => entry[key]);
        data.push(row);
      });
      workbook.SheetNames.push(sheetName);
      workbook.Sheets[sheetName] = XLSX.utils.aoa_to_sheet(data);
    }
  }
  const wbout = XLSX.write(workbook, { bookType: 'xlsx', type: 'binary' });
  const blob = new Blob([stringToBuffer(wbout)], { type: 'application/octet-stream' });
  // Once size restriction of blobs is reached, streamSaver package needs to be used instead
  saveAs(blob, `${filename}.xlsx`);
}

function getExportName(account?: string, page?: number): string {
  const date = new Date().toISOString().slice(0, 10);
  const accountIdSegment = account ? ` - Konto ${account}` : '';
  const pageSegment = page ? ` - Seite ${page}` : '';
  return `Finanzblick-Export - ${date}${accountIdSegment}${pageSegment}`;
}

function flattenTree(tree: TreeItem[], parentId: string | null = null): FlatItem[] {
  const items: FlatItem[] = [];
  tree.forEach((item) => {
    const { children, ...itemWithoutChildren } = item;
    items.push({ ...itemWithoutChildren, parentId });
    items.push(...flattenTree(item.children, item.id));
  });
  return items;
}

async function getSyncData(): Promise<{
  accounts: any[],
  categories: any[],
  tags: any[],
}> {
  const response = await fetch(fbUrl('sync/0'), {
    method: 'GET',
    headers: getHeaders()
  });
  return response.json();
}

function getDateQueryParam(date: Date): string {
  const pureDate = new Date(date.toDateString());
  return encodeURIComponent(pureDate.toISOString());
}

function mapBooking(booking: any): any {
  const { categories, ...bookingWithoutCategories } = booking;
  return {
    ...bookingWithoutCategories,
    account: booking.account.productName,
    counterAccount: booking.account.productName,
    counterAccountId: booking.account.id,
    receiver: booking.receiver.name,
    receiverId: booking.receiver.id,
    tags: booking.tags.map((tag) => tag.name).join(';'),
    tagIds: booking.tags.map((tag) => tag.id).join(';'),
    categories: booking.categories.map((cat) => cat.name).join(';'),
    categoryIds: booking.categories.map((cat) => cat.id).join(';'),
    category: booking.categories.filter((cat) => !cat.isTaxRelevant).map((cat) => cat.name).join(';'),
    categoryId: booking.categories.filter((cat) => !cat.isTaxRelevant).map((cat) => cat.id).join(';'),
    taxCategory: booking.categories.filter((cat) => cat.isTaxRelevant).map((cat) => cat.name).join(';'),
    taxCategoryId: booking.categories.filter((cat) => cat.isTaxRelevant).map((cat) => cat.id).join(';')
  };
}

async function getBookingsForAccount(accountId: string, startDate: Date = new Date('0'), endDate: Date = new Date()): Promise<any[]> {
  const bookings = [];
  let page = 0;
  let morePages = true;
  do {
    let url = `accountbases/${accountId}/bookings`;
    const query = {
      Skip: page * PAGE_SIZE,
      Take: PAGE_SIZE,
      orderBy: 'Date',
      orde: 'ASC',
      StartDate: getDateQueryParam(startDate),
      EndDate: getDateQueryParam(endDate)
    };
    url += `?${Object.entries(query).map((entry) => entry.join('=')).join('&')}`;
    // eslint-disable-next-line no-await-in-loop
    const response = await fetch(fbUrl(url), {
      method: 'GET',
      headers: getHeaders()
    });
    const { bookingSections, taken } = await response.json();
    bookingSections.forEach((section) => {
      bookings.push(...section.bookings.map(mapBooking));
    });
    morePages = taken === PAGE_SIZE;
    page++;
  } while (morePages);
  return bookings;
}

export class Actions {
  async exportAll() {
    await this.executeExport();
  }

  async exportCurrentYear() {
    const currentYear = new Date().getFullYear();
    await this.executeExport(new Date(`01-01-${currentYear}`));
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  handleXHR(request: XHRRequest, _response: XHRResponse) {
    authorizationHeader = request.headers.Authorization;
    frontendVersionHeader = request.headers['Frontend-Version'];
  }

  private async executeExport(startDate?: Date, endDate?: Date) {
    const { accounts, categories, tags } = await getSyncData();
    const individualAccounts = accounts.filter((account) => account.type !== 'AccountGroup');
    const bookings = [];
    for (const account of individualAccounts) {
      bookings.push(...await getBookingsForAccount(account.id, startDate, endDate));
    }
    const flattenedCategories = flattenTree(categories);
    const name = getExportName();
    exportAsXlsx({
      bookings, accounts: individualAccounts, categories: flattenedCategories, tags
    }, name);
  }
}

export type Action = keyof Actions;
