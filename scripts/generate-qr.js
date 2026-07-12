const target = process.argv[2];

if (!target) {
  console.error("Usage: npm run qr -- https://your-wedding-site.pages.dev");
  process.exit(1);
}

const encoded = encodeURIComponent(target);
console.log(`Open this QR code URL, then print or save it:\nhttps://api.qrserver.com/v1/create-qr-code/?size=900x900&margin=18&data=${encoded}`);
