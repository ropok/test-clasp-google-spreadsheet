/** Stores one integer per row in a dedicated, headerless sheet. */
class SpreadsheetCounterRepository {
  constructor(spreadsheetId, sheetName) {
    if (!spreadsheetId || !spreadsheetId.trim()) {
      throw new Error('SPREADSHEET_ID belum diatur di Script Properties.');
    }
    this.spreadsheetId = spreadsheetId.trim();
    this.sheetName = sheetName || 'Counter';
    this.spreadsheet = null;
  }

  readLastValue() {
    const sheet = this.getSheet_(false);
    if (!sheet || sheet.getLastRow() === 0) return 0;

    const value = sheet.getRange(sheet.getLastRow(), 1).getValue();
    if (!Number.isSafeInteger(value) || value < 1) {
      throw new Error('Angka terakhir tidak valid. Sheet Counter harus berisi bilangan bulat positif di kolom A, tanpa header.');
    }
    return value;
  }

  append(value) {
    this.getSheet_(true).appendRow([value]);
    // Commit the write before the service releases its script-wide lock.
    SpreadsheetApp.flush();
  }

  getSheet_(createIfMissing) {
    if (!this.spreadsheet) {
      this.spreadsheet = SpreadsheetApp.openById(this.spreadsheetId);
    }
    let sheet = this.spreadsheet.getSheetByName(this.sheetName);
    if (!sheet && createIfMissing) {
      sheet = this.spreadsheet.insertSheet(this.sheetName);
    }
    return sheet;
  }
}
