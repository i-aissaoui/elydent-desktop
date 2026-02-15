# ELYDENT - Essential Source Files Only

This is the minimal version with just source code for Windows migration.

## Essential Files Included:
- `app/` - Main Next.js application source
- `electron/` - Electron main process files
- `prisma/` - Database schema and seed data
- `package.json` - Dependencies and scripts
- `seed-patient-data.csv` - 67 patient records
- Configuration files (tsconfig, next.config, etc.)

## NOT INCLUDED (download on Windows):
- `node_modules/` - Run `npm install`
- `dist-electron/` - Run `npm run electron:build`
- `.next/` - Generated during `npm run dev`

## Windows Setup:
1. Clone this repo
2. Run `npm install`
3. Run `npm run electron:dev` for desktop app
4. Patient data loads automatically

Total size: ~50MB instead of 3.5GB