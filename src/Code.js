function doGet() {
  return HtmlService.createHtmlOutputFromFile('Index')
    .setTitle('Counter — satu klik, satu angka')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

function getCounterState() {
  return createCounterService_().getState();
}

function incrementCounter() {
  return createCounterService_().increment();
}

// The underscore keeps this helper private to google.script.run.
// Resolve dependencies only inside a call; GAS file ordering is irrelevant.
function createCounterService_() {
  const spreadsheetId = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
  return new CounterService(
    new SpreadsheetCounterRepository(spreadsheetId, 'Counter'),
    new ScriptLock()
  );
}
