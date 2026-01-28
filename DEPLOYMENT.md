# Deployment Guide

This guide covers deploying Pillow AI to production.

## Prerequisites

- Supabase project with migrations applied
- Retell AI API key
- Vercel account
- Custom domain (optional, for white-label subdomains)

## Step 1: Set Up Supabase

1. Create a new project at [supabase.com](https://supabase.com)
2. Go to SQL Editor in your project
3. Run migrations in order:
   ```sql
   -- supabase/migrations/001_initial_schema.sql
   -- supabase/migrations/002_rls_policies.sql
   ```
4. Generate authentication keys:
   - Go to Project Settings > API
   - Copy `anon public` key (NEXT_PUBLIC_SUPABASE_ANON_KEY)
   - Copy `service_role` key (SUPABASE_SERVICE_ROLE_KEY)
   - Copy project URL (NEXT_PUBLIC_SUPABASE_URL)
5. Configure auth settings:
   - Go to Authentication > Providers > Email
   - Enable email provider
   - Configure email templates if needed

## Step 2: Get Retell AI API Key

1. Create an account at [retellai.com](https://retellai.com)
2. Navigate to API settings
3. Generate an API key
4. Save as `RETELL_API_KEY`

## Step 3: Prepare for Deployment

1. Update environment variables:
   ```bash
   cp .env.local.example .env.local
   # Add your actual values to .env.local (DO NOT commit this file)
   ```

2. Test locally:
   ```bash
   npm install
   npm run dev
   ```

3. Verify all features work:
   - Landing page loads
   - Authentication works
   - Admin dashboard accessible
   - Client dashboard accessible
   - API endpoints respond

## Step 4: Deploy to Vercel

### Option A: Vercel CLI

```bash
npm install -g vercel
vercel login
vercel
```

Follow the prompts to configure your project.

### Option B: Vercel Dashboard

1. Push code to GitHub
2. Go to [vercel.com](https://vercel.com)
3. Click "Add New Project"
4. Import your GitHub repository
5. Configure project:
   - Framework Preset: Next.js
   - Root Directory: `./`
   - Build Command: `npm run build`
   - Output Directory: `.next`

## Step 5: Configure Environment Variables in Vercel

Add these variables in Vercel > Project > Settings > Environment Variables:

**Required:**
```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
RETELL_API_KEY=your_retell_api_key
NEXT_PUBLIC_APP_URL=https://your-domain.com
NEXT_PUBLIC_APP_NAME=Pillow AI
```

## Step 6: Set Up Custom Domains (White-Label)

1. In Vercel, go to Domains
2. Add your main domain (e.g., pillow.ai)
3. Add wildcard domain for subdomains: `*.pillow.ai`
4. Configure DNS records:
   ```
   A    pillow.ai        -> Vercel IP
   CNAME *.pillow.ai   -> cname.vercel-dns.com
   ```
5. Configure Supabase for your domain:
   - Go to Authentication > URL Configuration
   - Add your site URL and redirect URLs

## Step 7: Set Up Webhooks

1. In Retell AI dashboard, configure webhooks:
   - URL: `https://pillow.ai/api/webhooks/retell`
   - Events: `call.completed`, `call.failed`
2. Implement webhook handler (if not already present):
   ```typescript
   // app/api/webhooks/retell/route.ts
   export async function POST(request: NextRequest) {
     const body = await request.json()
     // Process webhook event
     return NextResponse.json({ received: true })
   }
   ```

## Step 8: Create Initial Super Admin

1. Create super admin user via Supabase Auth:
   ```bash
   # Or use Supabase dashboard > Authentication > Users
   ```

2. Add user to users table with role 'super_admin':
   ```sql
   INSERT INTO users (email, role, auth_id)
   VALUES ('admin@pillow.ai', 'super_admin', 'auth_user_id');
   ```

## Step 9: Configure Production Settings

### Security
- Enable HTTPS (automatic on Vercel)
- Set up rate limiting (Vercel Edge Config)
- Configure CORS for API routes

### Monitoring
- Set up Vercel Analytics
- Configure error tracking (Sentry, LogRocket)
- Set up uptime monitoring

### Backups
- Enable Supabase daily backups
- Configure backup retention policy
- Test restore procedures

## Post-Deployment Checklist

- [ ] Landing page loads correctly
- [ ] Authentication flow works
- [ ] Admin dashboard accessible with super admin credentials
- [ ] Client dashboard accessible
- [ ] Agent creation works with Retell AI
- [ ] Phone number assignment works
- [ ] Call tracking receives webhook data
- [ ] Brand customization saves correctly
- [ ] White-label subdomains resolve
- [ ] Email notifications work
- [ ] Analytics and logging enabled

## Troubleshooting

### Build Failures
- Check Node.js version (use 18+)
- Verify all environment variables are set
- Review build logs in Vercel

### Runtime Errors
- Check Vercel Function logs
- Verify Supabase connection
- Validate Retell AI API key

### Database Issues
- Run migrations in Supabase SQL Editor
- Check RLS policies are enabled
- Verify service role key permissions

### Authentication Problems
- Verify JWT secret matches in Supabase
- Check auth URL configuration
- Review middleware settings

## Maintenance

### Regular Tasks
- Monitor database storage usage
- Review and optimize RLS policies
- Update dependencies monthly
- Check Retell AI API limits and costs

### Scaling Considerations
- Add read replicas for database
- Implement caching (Redis)
- Use CDN for static assets
- Optimize database queries

## Cost Optimization

1. **Vercel**: Monitor bandwidth and function execution time
2. **Supabase**: Track database connections and storage
3. **Retell AI**: Monitor call minutes and API usage
4. **Optimization Strategies**:
   - Implement caching for static data
   - Use serverless functions efficiently
   - Optimize database queries
   - Compress static assets

## Support

For deployment issues:
- Vercel Docs: https://vercel.com/docs
- Supabase Docs: https://supabase.com/docs
- Retell AI Docs: https://docs.retellai.com
