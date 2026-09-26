# WeddingPhotos

A free-hostable wedding photo drop for Joep & Juliana. Guests scan a QR code, upload photos or videos without logging in, and originals are stored in Cloudflare R2.

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
2. Use these Pages build settings:
   - Framework preset: `None`
   - Build command: leave empty
   - Build output directory: `public`
   - Deploy command: leave empty
3. Create an R2 bucket named `wedding-photos`.
4. Add an R2 binding for Pages Functions:
   - Variable name: `WEDDING_BUCKET`
   - Bucket: `wedding-photos`
5. Add a Pages environment variable named `ADMIN_KEY` with a private password.
6. Optional but recommended: add `MONTHLY_UPLOAD_LIMIT_GB` with `9.5` to stop uploads before the 10 GB free monthly storage limit is exceeded.
7. Redeploy from the Cloudflare dashboard.

Do not use `npx wrangler deploy` for this project. That command deploys a Worker and will fail because this app is a Cloudflare Pages site with Pages Functions. If Cloudflare asks for a deploy command, use `npx wrangler pages deploy public --project-name=wedding-photos` or leave the deploy command empty.

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

## Download all originals

The `download-photos.cmd` script copies the full-resolution files from the remote R2 folder `r2:wedding-photos/originals` into `downloaded-photos` inside this project. It uses `rclone copy`, so existing local files are kept and nothing is deleted.

### One-time rclone setup

1. Install [rclone](https://rclone.org/install/) (version 1.59 or newer).
2. Create an R2 API token with Object Read permission, scoped to the `wedding-photos` bucket.
3. Run `rclone config` and create an S3 remote named `r2` using Cloudflare R2, your Access Key ID, Secret Access Key, and the endpoint `https://<ACCOUNT_ID>.r2.cloudflarestorage.com`.

If rclone reports a bucket-access error with a bucket-scoped token, add `no_check_bucket = true` to the `[r2]` section of its config file.

Run a safe preview first:

```powershell
.\download-photos.cmd -DryRun
```

Then download the files:

```powershell
.\download-photos.cmd -OpenDestination
```

To save directly to a shared OneDrive folder, provide its path:

```powershell
.\download-photos.cmd -Destination "C:\Users\your-name\OneDrive\Wedding Photos" -OpenDestination
```

The source can also be overridden if the R2 remote or bucket name changes:

```powershell
.\download-photos.cmd -Source "r2:another-bucket/originals"
```

## Personalize it

The public pages are currently personalized for Joep & Juliana.
