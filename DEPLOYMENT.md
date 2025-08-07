# EEF Tool 2.0 - Deployment Guide

## 🚀 Quick Deploy to Vercel (Recommended)

### Step 1: Install Vercel CLI
```bash
npm install -g vercel
```

### Step 2: Login to Vercel
```bash
vercel login
```

### Step 3: Deploy
```bash
npm run deploy
```

## 📋 Manual Deployment Steps

### 1. Build the Application
```bash
npm run build
```

### 2. Test Locally
```bash
npm start
```
Visit `http://localhost:3000` to verify everything works.

### 3. Deploy to Vercel
```bash
vercel --prod
```

## 🔄 Automated Daily Updates

### GitHub Actions Setup

1. **Push your code to GitHub**
2. **Set up GitHub Secrets** (in your repository settings):
   - `VERCEL_TOKEN`: Your Vercel deployment token
   - `VERCEL_ORG_ID`: Your Vercel organization ID
   - `VERCEL_PROJECT_ID`: Your Vercel project ID
   - `ESPN_LEAGUE_ID`: Your ESPN league ID (optional)
   - `ESPN_SEASON`: Current season (optional)

3. **The workflow will automatically**:
   - Run daily at 2 AM UTC (4 AM CEST)
   - Fetch fresh data from ESPN
   - Process and normalize the data
   - Build the application
   - Deploy to Vercel
   - Commit changes back to GitHub

### Manual Data Updates

Run the update script locally:
```bash
npm run update-data
```

This will:
- Fetch fresh data from ESPN
- Process and normalize the data
- Build the application
- Deploy to Vercel (if CLI is installed)

## 🌐 Alternative Hosting Options

### Netlify
1. Connect your GitHub repository
2. Set build command: `npm run build`
3. Set publish directory: `.next`
4. Deploy automatically on push

### GitHub Pages
1. Enable GitHub Pages in repository settings
2. Set source to GitHub Actions
3. Use the provided workflow for deployment

## 🔧 Environment Variables

Create a `.env.local` file for local development:
```bash
# ESPN API Configuration
ESPN_LEAGUE_ID=your_league_id
ESPN_SEASON=2024

# Vercel Configuration (for deployment)
VERCEL_TOKEN=your_vercel_token
VERCEL_ORG_ID=your_org_id
VERCEL_PROJECT_ID=your_project_id
```

## 📊 Monitoring and Maintenance

### Check Update Status
- View GitHub Actions tab for automated update logs
- Check `update-log.md` for manual update history
- Monitor Vercel deployment logs

### Troubleshooting
- If builds fail, check the GitHub Actions logs
- If data is stale, manually trigger the workflow
- If deployment fails, check Vercel logs

## 🎯 Production Checklist

Before going live:
- [ ] All pages load correctly
- [ ] Data is up to date
- [ ] Performance is acceptable
- [ ] Mobile responsiveness works
- [ ] Error handling is in place
- [ ] Analytics are set up (optional)

## 📈 Scaling Considerations

### Current Setup (Free Tier)
- Vercel: Free hosting with automatic deployments
- GitHub Actions: Free CI/CD with daily updates
- Data: Static JSON files served from CDN

### Future Upgrades
- Vercel Pro: Better performance, custom domains
- Database: For user accounts and saved teams
- Real-time updates: WebSocket connections
- Advanced analytics: User behavior tracking

## 🔒 Security Notes

- No sensitive data in client-side code
- API keys stored in environment variables
- Static deployment reduces attack surface
- Regular dependency updates recommended

## 📞 Support

If you encounter issues:
1. Check the GitHub Actions logs
2. Review the Vercel deployment logs
3. Test locally with `npm run dev`
4. Check the data files in `data/internal/`

---

**Note**: This deployment guide assumes you're using Vercel. Other hosting providers may require different steps. 