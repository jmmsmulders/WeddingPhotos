# WeddingPhotos

A free-hostable wedding photo drop for Joep & Partner. Guests scan a QR code, upload photos or videos without logging in, and originals are stored in Cloudflare R2.

## What is included

- Mobile-first upload page with drag and drop
- Optional guest name
- Upload progress
- Optional client-side image compression for large photos
- Original file storage in Cloudflare R2
- SHA-256 duplicate detection
- Live gallery at `/gallery.html`
- Admin listing at `/admin.html`
- QR-code helper script

## Cloudflare setup

1. Create a Cloudflare Pages project connected to this repo.
2. Create an R2 bucket named `wedding-photos`.
3. Add an R2 binding for Pages Functions:
   - Variable name: `WEDDING_BUCKET`
   - Bucket: `wedding-photos`
4. Add a Pages environment variable named `ADMIN_KEY` with a private password.
5. Deploy with `npm run deploy`, or use the Cloudflare dashboard.

## Local development

On this Windows machine, test without Cloudflare or npm installs:

```powershell
.\run-local.cmd
```

If you prefer PowerShell scripts and have script execution enabled:

```powershell
.\run-local.ps1
```

Open `http://localhost:8788`. The local admin key is `local-admin` unless you set `ADMIN_KEY`.

If you have Node/npm installed separately, this also works:

```bash
npm run local
```

To test the exact Cloudflare Pages runtime, install dependencies and run:

```bash
npm install
npm run dev
```

## Generate the QR code

After deployment:

```powershell
.\make-qr.cmd https://your-project.pages.dev
```

Or with npm:

```bash
npm run qr -- https://your-project.pages.dev
```

Open the printed QR URL and use it for signs, table cards, or invitations.

## Personalize it

Replace `Partner` in `public/index.html`, `public/gallery.html`, and `public/admin.html` with the correct name before printing the QR code.
