const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

function loadGas(globals = {}) {
  const context = vm.createContext({ ...globals });
  for (const file of ['CounterService.js', 'SpreadsheetCounterRepository.js', 'ScriptLock.js', 'Code.js']) {
    const filename = path.resolve(__dirname, '../../src', file);
    vm.runInContext(fs.readFileSync(filename, 'utf8'), context, { filename });
  }
  return {
    CounterService: vm.runInContext('CounterService', context),
    SpreadsheetCounterRepository: vm.runInContext('SpreadsheetCounterRepository', context),
    ScriptLock: vm.runInContext('ScriptLock', context),
    getCounterState: context.getCounterState,
    incrementCounter: context.incrementCounter,
    doGet: context.doGet,
  };
}

function createGasFake({ rows = [], sheetExists = true, spreadsheetId = 'test-spreadsheet', acquire = true } = {}) {
  const events = [];
  const data = rows.map(row => Array.isArray(row) ? [...row] : [row]);
  let exists = sheetExists;
  const sheet = {
    getLastRow() { events.push('last-row'); return data.length; },
    getRange(row, column) {
      return { getValue() { events.push('read'); return data[row - 1]?.[column - 1] ?? ''; } };
    },
    appendRow(row) { events.push('append'); data.push([...row]); },
  };
  const spreadsheet = {
    getSheetByName(name) { events.push(`sheet:${name}`); return exists ? sheet : null; },
    insertSheet(name) { events.push(`create-sheet:${name}`); exists = true; return sheet; },
  };
  const lock = {
    tryLock(timeout) { events.push('acquire'); return acquire; },
    waitLock(timeout) { events.push('acquire'); if (!acquire) throw new Error('Lock timeout'); },
    releaseLock() { events.push('release'); },
  };
  return {
    data, events, sheet, spreadsheet, lock,
    globals: {
      PropertiesService: { getScriptProperties() { return { getProperty(name) {
        events.push(`property:${name}`); return spreadsheetId;
      } }; } },
      SpreadsheetApp: {
        openById(id) { events.push(`open:${id}`); return spreadsheet; },
        flush() { events.push('flush'); },
      },
      LockService: { getScriptLock() { return lock; } },
    },
  };
}

module.exports = { loadGas, createGasFake };
