# Tailwind CSS v4 Error Quick Reference

## 🚨 Critical Errors & Immediate Solutions

### 1. PostCSS Import Error
```
[postcss] postcss-import: Unknown word throw
```
**🔧 Fix:** Change `@import "@tailwindcss/postcss";` to `@import "tailwindcss";`

### 2. ES Module Syntax Error
```
SyntaxError: Unexpected token 'export'
```
**🔧 Fix:** Use `module.exports` instead of `export default` in postcss.config.js

### 3. Configuration Loading Error
```
Failed to load the ES module: postcss.config.js
```
**🔧 Fix:** Ensure PostCSS config matches package.json "type" field

### 4. Build Failure - Custom Variables
```
Styles not applying correctly
```
**🔧 Fix:** Replace `hsl(var(--variable))` with `hsl(210, 100%, 50%)`

### 5. @apply Directive Error
```
Build fails with @apply errors
```
**🔧 Fix:** Replace `@apply` with standard CSS properties

### 6. Unknown Utility Classes
```
Classes like bg-background not working
```
**🔧 Fix:** Replace with standard classes:
- `bg-background` → `bg-white dark:bg-gray-900`
- `text-foreground` → `text-gray-900 dark:text-white`

## ⚡ Quick Fix Commands

### Install Correct Packages
```bash
npm uninstall tailwindcss
npm install @tailwindcss/postcss
```

### Remove Old Config
```bash
rm tailwind.config.js
```

### Update PostCSS Config
```js
module.exports = {
  plugins: {
    '@tailwindcss/postcss': {},
    autoprefixer: {},
  },
}
```

### Update CSS Import
```css
@import "tailwindcss";
```

## 🔍 Verification Commands

### Check Package Versions
```bash
npm list tailwindcss
npm list @tailwindcss/postcss
```

### Test Build
```bash
npm run build
```

### Test Development Server
```bash
npm run dev
```

## 📋 Pre-Migration Checklist

- [ ] Backup current configuration
- [ ] Note all custom utility classes
- [ ] Document @apply directives
- [ ] List CSS variables in use
- [ ] Test current build works

## 📋 Post-Migration Checklist

- [ ] Build completes successfully
- [ ] Dev server starts without errors
- [ ] All components render correctly
- [ ] Dark mode works
- [ ] No console errors
- [ ] No empty spaces in layout

## 🆘 Emergency Rollback

If everything breaks:
```bash
npm uninstall @tailwindcss/postcss
npm install tailwindcss@^3.x.x
# Restore tailwind.config.js
# Change CSS back to @tailwind directives
```

---

**Remember:** Always test in a development environment first! 

---

## How to Fix

1. **Install Docker Desktop for Windows**  
   - Download from: [https://www.docker.com/products/docker-desktop/](https://www.docker.com/products/docker-desktop/)
   - Follow the installation instructions.
   - After installation, restart your computer if prompted.

2. **Verify Docker Installation**  
   - Open a new terminal (PowerShell or Command Prompt).
   - Run: `docker --version`
   - You should see the Docker version output.

3. **Re-run the Build Command**  
   - Once Docker is installed and recognized, run:
     ```
     docker build -t web-scraper:latest ./services/web-scraper
     ```

---

If you need step-by-step help installing Docker or troubleshooting PATH issues, let me know! 