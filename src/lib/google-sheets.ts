import { google, sheets_v4 } from "googleapis";
import { readFileSync, existsSync } from "fs";
import { join } from "path";

let client: sheets_v4.Sheets | null = null;

function getCredentialsPath(): string {
  const envPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  if (envPath) {
    return join(process.cwd(), envPath);
  }
  return join(process.cwd(), "credentials", "google-service-account.json");
}

function getSpreadsheetId(): string {
  const id = process.env.GOOGLE_SHEETS_SPREADSHEET_ID;
  if (!id) {
    throw new Error("GOOGLE_SHEETS_SPREADSHEET_ID is not set in .env");
  }
  return id;
}

function loadCredentials(): { client_email: string; private_key: string } {
  const filePath = getCredentialsPath();
  if (existsSync(filePath)) {
    const content = readFileSync(filePath, "utf-8");
    const parsed = JSON.parse(content);
    return {
      client_email: parsed.client_email,
      private_key: parsed.private_key,
    };
  }
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const key = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY;
  if (!email || !key) {
    throw new Error(
      "No service account credentials found. Place the JSON file in credentials/ or set GOOGLE_SERVICE_ACCOUNT_EMAIL and GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY in .env"
    );
  }
  return { client_email: email, private_key: key.replace(/\\n/g, "\n") };
}

export async function getSheetsClient(): Promise<sheets_v4.Sheets> {
  if (client) return client;

  const { client_email, private_key } = loadCredentials();

  const auth = new google.auth.JWT({
    email: client_email,
    key: private_key,
    scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
  });

  client = google.sheets({ version: "v4", auth: auth as any });
  return client;
}

export async function getSheetsClientWithWrite(): Promise<sheets_v4.Sheets> {
  const { client_email, private_key } = loadCredentials();

  const auth = new google.auth.JWT({
    email: client_email,
    key: private_key,
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });

  return google.sheets({ version: "v4", auth: auth as any });
}

export async function testConnection(): Promise<{
  success: boolean;
  message: string;
}> {
  try {
    const sheets = await getSheetsClient();
    const spreadsheetId = getSpreadsheetId();
    const response = await sheets.spreadsheets.get({
      spreadsheetId,
      ranges: [],
      includeGridData: false,
    });
    const title = response.data.properties?.title ?? "Untitled";
    return {
      success: true,
      message: `Connected to "${title}" (${spreadsheetId})`,
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown error";
    return { success: false, message };
  }
}

export async function getFirstSheetName(): Promise<string> {
  const meta = await getSheetMetadata();
  return meta.sheets[0]?.title ?? "Sheet1";
}

export async function readSheet(
  range?: string
): Promise<{
  rows: Record<string, string>[];
  rowCount: number;
  headers: string[];
}> {
  const sheets = await getSheetsClient();
  const spreadsheetId = getSpreadsheetId();

  let resolvedRange: string;
  if (range && range.includes("!")) {
    resolvedRange = range;
  } else if (range) {
    const sheetName = await getFirstSheetName();
    resolvedRange = `'${sheetName}'!${range}`;
  } else {
    const sheetName = await getFirstSheetName();
    resolvedRange = `'${sheetName}'!A1:Z`;
  }

  const response = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: resolvedRange,
  });

  console.log("[google-sheets] raw response.data:", JSON.stringify(response.data, null, 2));
  const rawValues = response.data.values;
  console.log("[google-sheets] response.data.values:", JSON.stringify(rawValues));
  console.log("[google-sheets] first row:", JSON.stringify(rawValues?.[0]));
  console.log("[google-sheets] total rows returned:", rawValues?.length);

  if (!rawValues || rawValues.length === 0) {
    console.log("[google-sheets] no values found in sheet");
    return { rows: [], rowCount: 0, headers: [] };
  }

  const firstNonEmptyIndex = rawValues.findIndex(
    (row: string[]) => row && row.length > 0 && row.some((cell: string) => cell && cell.trim() !== "")
  );

  console.log("[google-sheets] first non-empty row index:", firstNonEmptyIndex);

  if (firstNonEmptyIndex === -1) {
    console.log("[google-sheets] no non-empty rows found");
    return { rows: [], rowCount: 0, headers: [] };
  }

  const headers = rawValues[firstNonEmptyIndex];
  console.log("[google-sheets] parsed headers:", JSON.stringify(headers));

  const dataRows = rawValues.slice(firstNonEmptyIndex + 1).filter(
    (row: string[]) => row && row.length > 0 && row.some((cell: string) => cell && cell.trim() !== "")
  );
  console.log("[google-sheets] non-empty data rows count:", dataRows.length);

  const parsedRows = dataRows.map((row: string[], ri: number) => {
    const obj: Record<string, string> = {};
    headers.forEach((header: string, ci: number) => {
      obj[header.trim()] = ci < row.length ? String(row[ci] ?? "") : "";
    });
    return obj;
  });

  console.log("[google-sheets] first parsed object:", JSON.stringify(parsedRows[0]));

  return { rows: parsedRows, rowCount: parsedRows.length, headers };
}

export async function getSheetMetadata(): Promise<{
  title: string;
  sheets: { title: string; rowCount: number; columnCount: number }[];
}> {
  const sheets = await getSheetsClient();
  const spreadsheetId = getSpreadsheetId();

  const response = await sheets.spreadsheets.get({
    spreadsheetId,
    ranges: [],
    includeGridData: false,
  });

  const title = response.data.properties?.title ?? "Untitled";
  const sheetsInfo =
    response.data.sheets?.map((s) => ({
      title: s.properties?.title ?? "Untitled",
      rowCount: s.properties?.gridProperties?.rowCount ?? 0,
      columnCount: s.properties?.gridProperties?.columnCount ?? 0,
    })) ?? [];

  return { title, sheets: sheetsInfo };
}
