# Pembagian Tugas Agent

Gunakan pembagian model dan reasoning effort berikut untuk pekerjaan di proyek ini.

| Tugas | Model | Reasoning effort |
| --- | --- | --- |
| Planning saja | `gpt-6-astra` | `medium` |
| Implementasi codebase | `gpt-6.1-sol` | `high` |
| Pembuatan test case | `gpt-6.1-sol` | `medium` |
| Pembuatan dan perubahan script pendukung, termasuk pekerjaan repetitif | `gpt-6.1-sol` | `low` |
| Penggunaan atau eksekusi script pendukung | `gpt-6-luna` | `medium` |
| Command GitHub | `gpt-6-luna` | `low` |

## Pelaksanaan

- Delegasikan pekerjaan ke agent dengan model dan reasoning effort sesuai tabel.
- Agent planning hanya melakukan analisis dan menyusun rencana; serahkan perubahan codebase, test case, dan script kepada agent yang sesuai.
- Pisahkan pembuatan atau perubahan script dari eksekusinya sesuai pembagian di atas.
- Berikan konteks, lingkup tugas, dan hasil yang diharapkan saat melakukan delegasi. Koordinasikan perubahan agar agent tidak mengedit file yang sama secara bersamaan.
- Jika model atau reasoning effort yang diminta tidak tersedia, laporkan keterbatasannya; jangan mengganti model secara diam-diam.
- Pembagian tugas ini tidak memberikan izin tambahan untuk menjalankan operasi GitHub di luar permintaan pengguna.

## Aturan Branch

- Buat branch kerja baru dari branch `development`.
- Gunakan format nama branch sesuai jenis pekerjaan:
  - Feature: `codex/feature/<nama-feature>`
  - Perbaikan bug: `codex/fix/<nama-bug>`
  - Test case: `codex/test/<test-case>`
  - Release: `codex/release/<semantic-version>`
- Ganti placeholder dengan nama pekerjaan atau versi release yang sesuai.
- Jika branch `development` belum tersedia, laporkan kendalanya sebelum menggunakan branch dasar lain.
