# AI convertly

Free, multi-format file conversion tools that run entirely in the browser — no uploads, no accounts, no limits.

## Tools

- **Merge PDF** — combine multiple PDFs into one, in any order
- **Split PDF** — extract page ranges or split every page into its own file
- **Rotate PDF** — rotate all or specific pages by 90°, 180°, or 270°
- **PDF to JPG** — convert every page of a PDF into a downloadable JPG
- **JPG to PDF** — combine JPG/PNG images into a single PDF

Every tool processes files client-side using [`pdf-lib`](https://github.com/Hopding/pdf-lib) and [`pdf.js`](https://github.com/mozilla/pdf.js) — nothing is ever uploaded to a server.

## Getting started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the site.

## Tech stack

- [Next.js](https://nextjs.org) (App Router)
- [Tailwind CSS v4](https://tailwindcss.com)
- [pdf-lib](https://github.com/Hopding/pdf-lib) for creating/editing PDFs
- [pdf.js](https://github.com/mozilla/pdf.js) for rendering PDF pages to images

## Build

```bash
npm run build
npm run start
```
