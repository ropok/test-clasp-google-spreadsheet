/** Domain logic depends only on a repository and an exclusive lock. */
class CounterService {
  constructor(repository, lock) {
    this.repository = repository;
    this.lock = lock;
  }

  getState() {
    return { value: this.validatedValue_(this.repository.readLastValue()) };
  }

  increment() {
    return this.lock.runExclusive(() => {
      const current = this.validatedValue_(this.repository.readLastValue());
      if (current === Number.MAX_SAFE_INTEGER) {
        throw new Error('Batas angka aman sudah tercapai. Tidak ada baris yang ditambahkan.');
      }
      const next = current + 1;
      this.repository.append(next);
      return { value: next };
    });
  }

  validatedValue_(value) {
    if (!Number.isSafeInteger(value) || value < 0) {
      throw new Error('Angka terakhir tidak valid. Periksa kolom A pada sheet Counter.');
    }
    return value;
  }
}
