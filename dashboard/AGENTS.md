<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# STRICT RULE: NO EMOJIS (BAN TOTAL)

- Dilarang keras menggunakan emoji dalam bentuk apa pun.
- Jangan pernah menyertakan emoji di:
  1. Pesan dan teks respons kepada pengguna.
  2. Antarmuka pengguna (UI), tombol, badge, modal, tooltip, atau teks web.
  3. Kode program, commit message, dan dokumentasi (README / markdown).
- Pengganti emoji:
  - Gunakan teks bersih dan profesional (contoh: `[PERINGATAN]`, `[BAHAYA]`, `[INFO]`, `[NORMAL]`, `[AKTIF]`, `[MATI]`).
  - Gunakan ikon SVG monokrom resmi (seperti Lucide Icons) untuk antarmuka grafis tanpa menyisipkan karakter emoji unicode.
