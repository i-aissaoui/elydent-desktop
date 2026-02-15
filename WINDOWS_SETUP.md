# ELYDENT - Essential Source Files Only

**Repository:** git@github.com:i-aissaoui/elydent-desktop.git
**Size:** ~220KB (source code only)

## ✅ What's Included:
- `app/` - Complete Next.js application (patient management, dashboard, etc.)
- `electron/` - Desktop app configuration 
- `prisma/` - Database schema + 67 patient import script
- `seed-patient-data.csv` - All 67 patient records (3,574,000 DA)
- `package.json` - All dependencies and scripts
- Configuration files

## ❌ NOT Included (regenerated on Windows):
- `node_modules/` - Run `npm install`
- `dist-electron/` - Run `npm run electron:build` 
- `.next/` - Generated during `npm run dev`

## 🚀 Windows Setup (4 commands):

```bash
git clone https://github.com/i-aissaoui/elydent-desktop.git
cd elydent-desktop
npm install
npm run electron:dev
```

**That's it!** The app will:
1. Auto-create database with 67 patients
2. Launch as desktop application
3. Ready for dental clinic use

## 📋 Key Commands:
- `npm run electron:dev` - Desktop app (recommended)
- `npm run dev` - Web browser version
- `npm run electron:build` - Create Windows .exe

Total download: **220KB** vs 3.5GB ✨