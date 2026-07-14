import { getSheetsClientWithWrite, getFirstSheetName } from "@/lib/google-sheets";

export async function syncTaskToSheet(
  sheetCode: string,
  updates: Record<string, string>
): Promise<void> {
  const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID;
  if (!spreadsheetId) return;

  const sheets = await getSheetsClientWithWrite();
  const sheetName = await getFirstSheetName();

  const response = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `'${sheetName}'!A:Z`,
  });

  const values = response.data.values;
  if (!values || values.length < 2) return;

  const headerRow = values[0];
  const codeIndex = headerRow.findIndex(
    (h: string) => h.trim().toLowerCase() === "code"
  );
  if (codeIndex < 0) return;

  for (let i = 1; i < values.length; i++) {
    if (values[i][codeIndex]?.trim() === sheetCode) {
      for (const [columnName, value] of Object.entries(updates)) {
        const colIndex = headerRow.findIndex(
          (h: string) => h.trim().toLowerCase() === columnName.toLowerCase()
        );
        if (colIndex < 0) continue;

        const colLetter = String.fromCharCode(65 + colIndex);
        await sheets.spreadsheets.values.update({
          spreadsheetId,
          range: `'${sheetName}'!${colLetter}${i + 1}`,
          valueInputOption: "RAW",
          requestBody: { values: [[value]] },
        });
      }
      break;
    }
  }
}
