# 🚀 Deployment Guide - Luma Cafe Dashboard

This guide covers multiple deployment options for your React cafe dashboard application.

## 📋 Prerequisites

- Node.js 18+ installed
- Git repository (for GitHub Pages)
- Account on your chosen platform (Vercel, Netlify, etc.)

## 🔧 Pre-deployment Setup

1. **Build the project locally to test:**
   ```bash
   npm run build
   npm run preview
   ```

2. **Run linting to ensure code quality:**
   ```bash
   npm run lint
   ```

## 🌐 Deployment Options

### Option 1: Vercel (Recommended)

**Why Vercel?** 
- Zero-config deployment for Vite/React apps
- Automatic HTTPS and CDN
- Excellent performance
- Free tier available

**Steps:**

1. **Install Vercel CLI:**
   ```bash
   npm install -g vercel
   ```

2. **Login to Vercel:**
   ```bash
   vercel login
   ```

3. **Deploy:**
   ```bash
   npm run build
   npm run deploy:vercel
   ```

4. **Alternative: GitHub Integration**
   - Push your code to GitHub
   - Go to [vercel.com](https://vercel.com)
   - Import your GitHub repository
   - Vercel will auto-detect Vite and deploy

**Configuration:** The `vercel.json` file is already configured with:
- Build settings
- SPA routing support
- Asset caching headers

---

### Option 2: Netlify

**Why Netlify?**
- Great for static sites
- Built-in form handling
- Branch previews
- Free tier with generous limits

**Steps:**

1. **Install Netlify CLI:**
   ```bash
   npm install -g netlify-cli
   ```

2. **Login to Netlify:**
   ```bash
   netlify login
   ```

3. **Build and Deploy:**
   ```bash
   npm run build
   npm run deploy:netlify
   ```

4. **Alternative: Drag & Drop**
   - Build: `npm run build`
   - Go to [netlify.com](https://netlify.com)
   - Drag the `dist` folder to the deploy area

5. **Alternative: GitHub Integration**
   - Connect your GitHub repository
   - Netlify will use the `netlify.toml` configuration

**Configuration:** The `netlify.toml` file includes:
- Build settings
- SPA routing redirects
- Asset caching headers

---

### Option 3: GitHub Pages

**Why GitHub Pages?**
- Free hosting for public repositories
- Integrated with GitHub workflow
- Good for open-source projects

**Steps:**

1. **Push to GitHub:**
   ```bash
   git add .
   git commit -m "Add deployment configuration"
   git push origin main
   ```

2. **Enable GitHub Pages:**
   - Go to your repository settings
   - Scroll to "Pages" section
   - Select "GitHub Actions" as source

3. **The workflow will automatically:**
   - Build your project
   - Deploy to GitHub Pages
   - Available at: `https://yourusername.github.io/cafe_project/`

4. **Manual deployment:**
   ```bash
   npm run build:gh-pages
   # Then manually upload dist folder
   ```

**Note:** Update the base path in `vite.config.js` if your repository name differs:
```js
export default defineConfig({
  base: '/your-repo-name/',
  // ... other config
})
```

---

### Option 4: Other Platforms

**Firebase Hosting:**
```bash
npm install -g firebase-tools
firebase login
firebase init hosting
npm run build
firebase deploy
```

**Surge.sh:**
```bash
npm install -g surge
npm run build
cd dist
surge
```

**Railway:**
- Connect GitHub repository
- Railway auto-detects and deploys

## 🔒 Environment Variables

If you need environment variables:

1. **Create `.env` file:**
   ```env
   VITE_SHEET_ID=your_sheet_id_here
   VITE_API_URL=your_api_url_here
   ```

2. **Update your code to use:**
   ```js
   const SHEET_ID = import.meta.env.VITE_SHEET_ID || 'fallback_id'
   ```

3. **Platform-specific setup:**
   - **Vercel:** Add in dashboard or use `vercel env`
   - **Netlify:** Add in dashboard or `netlify env:set`
   - **GitHub Pages:** Add as repository secrets

## 🐛 Troubleshooting

**Build Errors:**
- Run `npm run lint` to check for code issues
- Ensure all dependencies are installed: `npm install`
- Check Node.js version: `node --version` (should be 18+)

**Routing Issues (404 on refresh):**
- Ensure SPA redirects are configured (already done in config files)
- Check that `index.html` fallback is working

**Large Bundle Size Warning:**
- This is normal for the current setup
- Consider code splitting for production optimization

**Google Sheets Access:**
- Ensure your Google Sheet is publicly viewable
- Check CORS settings if using custom domains

## 📊 Performance Tips

1. **Enable compression** (most platforms do this automatically)
2. **Use CDN** (Vercel/Netlify provide this)
3. **Monitor bundle size:** `npm run build` shows size info
4. **Consider lazy loading** for charts if needed

## 🔄 Continuous Deployment

All platforms support automatic deployment:
- **Vercel/Netlify:** Push to main branch → auto-deploy
- **GitHub Pages:** Uses the included workflow
- **Manual:** Use the npm scripts provided

## 📞 Support

If you encounter issues:
1. Check the platform's documentation
2. Verify your build works locally first
3. Check deployment logs in the platform dashboard
4. Ensure all configuration files are committed to git

---

**Happy Deploying! 🎉**

Your cafe dashboard will be live and accessible to users worldwide!