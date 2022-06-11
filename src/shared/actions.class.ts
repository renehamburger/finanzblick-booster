/* eslint-disable class-methods-use-this */
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import {
  XHRRequest, XHRResponse, ExportValue
} from './interfaces';
import { fbUrl } from './helpers';
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
      const keys = Object.keys(sheetData[0]);
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

export class Actions {
  async exportAll() {
    const { accounts, categories, tags } = await getSyncData();
    const individualAccounts = accounts.filter((account) => account.type !== 'AccountGroup');
    const flattenedCategories = flattenTree(categories);
    const name = getExportName();
    exportAsXlsx({ accounts: individualAccounts, categories: flattenedCategories, tags }, name);
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  handleXHR(request: XHRRequest, _response: XHRResponse) {
    authorizationHeader = request.headers.Authorization;
    frontendVersionHeader = request.headers['Frontend-Version'];
  }
}

export type Action = keyof Actions;
