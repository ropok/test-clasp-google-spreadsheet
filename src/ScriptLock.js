/** Serializes all writes made by this Apps Script project. */
class ScriptLock {
  runExclusive(callback) {
    const lock = LockService.getScriptLock();
    if (!lock.tryLock(30000)) {
      throw new Error('Counter sedang sibuk. Muat ulang angka sebelum mencoba lagi.');
    }
    try {
      return callback();
    } finally {
      lock.releaseLock();
    }
  }
}
