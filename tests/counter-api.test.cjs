const test = require('node:test');
const assert = require('node:assert/strict');
const { loadGas, createGasFake } = require('./helpers/gas.cjs');

test('reading an empty counter returns zero without appending a row', () => {
  const fake = createGasFake();
  const api = loadGas(fake.globals);
  assert.equal(api.getCounterState().value, 0);
  assert.deepEqual(fake.data, []);
  assert.ok(!fake.events.includes('append'));
});

test('first and repeated increments append consecutive values with no header', () => {
  const fake = createGasFake();
  const api = loadGas(fake.globals);
  assert.equal(api.incrementCounter().value, 1);
  assert.equal(api.incrementCounter().value, 2);
  assert.equal(api.incrementCounter().value, 3);
  assert.deepEqual(fake.data, [[1], [2], [3]]);
  assert.equal(api.getCounterState().value, 3);
  assert.deepEqual(fake.data, [[1], [2], [3]]);
});

test('increments resume from the last persisted row, preserving history', () => {
  const fake = createGasFake({ rows: [1, 2, 7] });
  const api = loadGas(fake.globals);
  assert.equal(api.getCounterState().value, 7);
  assert.equal(api.incrementCounter().value, 8);
  assert.deepEqual(fake.data, [[1], [2], [7], [8]]);
});

test('a missing Counter sheet can be initialized by the first increment', () => {
  const fake = createGasFake({ sheetExists: false });
  const api = loadGas(fake.globals);
  assert.equal(api.incrementCounter().value, 1);
  assert.deepEqual(fake.data, [[1]]);
  assert.ok(fake.events.includes('create-sheet:Counter'));
});

test('reading a missing Counter sheet returns zero without creating it', () => {
  const fake = createGasFake({ sheetExists: false });
  const api = loadGas(fake.globals);
  assert.equal(api.getCounterState().value, 0);
  assert.ok(!fake.events.includes('create-sheet:Counter'));
  assert.deepEqual(fake.data, []);
});

for (const invalid of [0, -1, 1.5, Number.NaN, Number.POSITIVE_INFINITY, Number.MAX_SAFE_INTEGER + 1, '', 'corrupt']) {
  test(`invalid persisted value ${String(invalid)} cannot be read or incremented`, () => {
    const fake = createGasFake({ rows: [invalid] });
    const api = loadGas(fake.globals);
    assert.throws(() => api.getCounterState());
    assert.throws(() => api.incrementCounter());
    assert.equal(fake.data.length, 1);
    assert.ok(!fake.events.includes('append'));
  });
}

test('maximum safe integer remains readable but cannot overflow', () => {
  const fake = createGasFake({ rows: [Number.MAX_SAFE_INTEGER] });
  const api = loadGas(fake.globals);
  assert.equal(api.getCounterState().value, Number.MAX_SAFE_INTEGER);
  assert.throws(() => api.incrementCounter());
  assert.deepEqual(fake.data, [[Number.MAX_SAFE_INTEGER]]);
});

test('increment holds the script lock through read, append, and flush', () => {
  const fake = createGasFake({ rows: [4] });
  const api = loadGas(fake.globals);
  assert.equal(api.incrementCounter().value, 5);
  const order = name => fake.events.indexOf(name);
  assert.ok(order('acquire') >= 0);
  assert.ok(order('acquire') < order('read'));
  assert.ok(order('read') < order('append'));
  assert.ok(order('append') < order('flush'));
  assert.ok(order('flush') < order('release'));
  assert.equal(fake.events.filter(event => event === 'release').length, 1);
});

test('a spreadsheet failure releases the acquired lock', () => {
  const fake = createGasFake();
  fake.sheet.appendRow = () => { fake.events.push('append'); throw new Error('Write failed'); };
  const api = loadGas(fake.globals);
  assert.throws(() => api.incrementCounter(), /Write failed/);
  assert.equal(fake.events.at(-1), 'release');
  assert.equal(fake.events.filter(event => event === 'release').length, 1);
  assert.deepEqual(fake.data, []);
});

test('a flush failure still releases the acquired lock', () => {
  const fake = createGasFake();
  fake.globals.SpreadsheetApp.flush = () => { fake.events.push('flush'); throw new Error('Flush failed'); };
  const api = loadGas(fake.globals);
  assert.throws(() => api.incrementCounter(), /Flush failed/);
  assert.equal(fake.events.at(-1), 'release');
  assert.equal(fake.events.filter(event => event === 'release').length, 1);
});

test('lock timeout prevents spreadsheet access and mutation', () => {
  const fake = createGasFake({ acquire: false });
  const api = loadGas(fake.globals);
  assert.throws(() => api.incrementCounter());
  assert.ok(!fake.events.some(event => event.startsWith('open:')));
  assert.ok(!fake.events.includes('append'));
  assert.ok(!fake.events.includes('flush'));
  assert.ok(!fake.events.includes('release'));
  assert.deepEqual(fake.data, []);
});

test('spreadsheet configuration is lazy and missing ID fails explicitly', () => {
  const fake = createGasFake({ spreadsheetId: null });
  const api = loadGas(fake.globals);
  assert.deepEqual(fake.events, []);
  assert.throws(() => api.getCounterState(), /SPREADSHEET_ID/);
  assert.throws(() => api.incrementCounter(), /SPREADSHEET_ID/);
  assert.ok(!fake.events.some(event => event.startsWith('open:')));
  assert.deepEqual(fake.data, []);
});

test('web app HTML can be served before spreadsheet configuration is set', () => {
  const fake = createGasFake({ spreadsheetId: null });
  const output = { setTitle() { return this; }, addMetaTag() { return this; } };
  fake.globals.HtmlService = { createHtmlOutputFromFile(file) {
    assert.equal(file, 'Index');
    return output;
  } };
  const api = loadGas(fake.globals);
  assert.equal(api.doGet(), output);
  assert.deepEqual(fake.events, []);
});

test('domain service works with substituted persistence and lock dependencies', () => {
  const { CounterService } = loadGas();
  let value = 0;
  let held = false;
  const repository = {
    readLastValue() { return value; },
    append(next) { assert.equal(held, true); value = next; },
  };
  const lock = { runExclusive(callback) {
    held = true;
    try { return callback(); } finally { held = false; }
  } };
  const service = new CounterService(repository, lock);
  assert.equal(service.getState().value, 0);
  assert.equal(service.increment().value, 1);
  assert.equal(service.increment().value, 2);
  assert.equal(service.getState().value, 2);
  assert.equal(held, false);
});
