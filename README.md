# Pillow AI

AI Voice Agent SaaS Platform for Canadian Businesses

## Overview

Pillow AI is a white-label SaaS platform that enables businesses to offer AI voice agent solutions through branded dashboards. Built with Next.js 14, Supabase, and Retell AI, it provides a complete solution for managing AI-powered phone systems.

## Tech Stack

- **Frontend**: Next.js 14 (App Router) + TypeScript
- **Styling**: Tailwind CSS + shadcn/ui
- **Backend**: Supabase (PostgreSQL, Auth, RLS)
- **Voice AI**: Retell AI
- **Deployment**: Vercel

## Features

### Public Site
- Modern landing page with conversion-focused design
- Lead capture and contact forms
- Industry-specific use cases
- Pricing and testimonials
- FAQ section

### Admin Portal (`/admin`)
- Dashboard with platform statistics
- Tenant management (create, view, manage)
- User management with role-based access (super_admin, admin, client)
- Real-time activity monitoring

### Client Dashboard (`/dashboard`)
- Voice agent creation and management
- Call history with transcripts
- Script management with templates
- Brand customization (logo, colors, subdomain)
- Analytics and metrics

### White-Label Features
- Custom domain support (tenant.pillow.ai)
- Brand customization (logo, colors, company name)
- Branded login pages
- Multi-tenant data isolation

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- Supabase account
- Retell AI API key
- Vercel account (for deployment)

### Installation

1. Clone the repository
```bash
git clone <repository-url>
cd pillow_ai
```

2. Install dependencies
```bash
npm install
```

3. Set up environment variables
```bash
cp .env.local.example .env.local
```

4. Configure your environment variables in `.env.local`:
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
RETELL_API_KEY=your_retell_api_key
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_APP_NAME=Pillow AI
```

### Database Setup

1. Go to your Supabase project
2. Run the SQL migrations in order:
   - `supabase/migrations/001_initial_schema.sql`
   - `supabase/migrations/002_rls_policies.sql`

### Running Locally

```bash
npm run dev
```

Visit `http://localhost:3000`

## Project Structure

```
pillow_ai/
├── app/
│   ├── (public)/              # Public landing pages
│   ├── (admin)/              # Admin portal routes
│   ├── (client)/             # Client dashboard routes
│   ├── api/                  # API routes
│   ├── auth/                 # Authentication pages
│   └── layout.tsx            # Root layout
├── components/
│   ├── ui/                   # shadcn/ui components
│   ├── admin/                # Admin-specific components
│   ├── client/               # Client-specific components
│   ├── landing/              # Landing page components
│   └── shared/              # Shared components
├── lib/
│   ├── supabase/             # Supabase client utilities
│   ├── retell/               # Retell AI client
│   └── utils.ts             # Utility functions
├── types/
│   ├── index.ts              # TypeScript types
│   └── supabase.ts         # Supabase-generated types
└── supabase/
    └── migrations/           # SQL migrations
```

## User Roles

### Super Admin
- Full platform access
- Manage all tenants and users
- View all data across tenants
- Configure system settings

### Admin
- Manage their tenant's agents and users
- View their tenant's data
- Cannot access other tenants' data

### Client
- View their tenant's data
- Read-only access to most features
- Cannot create or delete agents

## API Endpoints

### Authentication
- `POST /api/auth/signin` - User sign in
- `POST /api/auth/signup` - User registration
- `POST /api/auth/signout` - User sign out

### Agents
- `GET /api/agents` - List agents
- `POST /api/agents` - Create agent
- `GET /api/agents/[id]` - Get agent details
- `PUT /api/agents/[id]` - Update agent
- `DELETE /api/agents/[id]` - Delete agent

### Calls
- `GET /api/calls` - List calls
- `POST /api/calls` - Create call record (webhook)

### Tenants
- `GET /api/tenants` - List tenants (admin only)
- `POST /api/tenants` - Create tenant (admin only)

### Users
- `GET /api/users` - List users (admin only)
- `POST /api/users` - Create user (admin only)

### Leads
- `POST /api/leads` - Create lead (public)

## Security

- Row Level Security (RLS) enabled on all tables
- Role-based access control enforced at API level
- Middleware protection for authenticated routes
- Environment variables for sensitive data
- Service role key for admin operations

## Deployment

### Vercel

1. Push code to GitHub
2. Import project in Vercel
3. Add environment variables
4. Deploy

### Environment Variables

Required for production:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `RETELL_API_KEY`
- `NEXT_PUBLIC_APP_URL` (e.g., https://pillow.ai)
- `NEXT_PUBLIC_APP_NAME`

## Development

### Adding New Features

1. Follow the existing file structure
2. Use TypeScript for type safety
3. Implement proper RLS policies for database changes
4. Add API routes for data operations
5. Update types in `types/index.ts`

### Testing

```bash
# Run linter
npm run lint

# Build for production
npm run build

# Start production server
npm start
```

## Troubleshooting

### Database Issues
- Check RLS policies in Supabase dashboard
- Verify service role key has proper permissions
- Review migration order and execution

### Authentication Issues
- Verify JWT settings in Supabase
- Check middleware configuration
- Ensure auth routes are public

### Retell AI Integration
- Verify API key is valid
- Check webhook URL configuration
- Review agent creation logs

## Support

For issues and questions:
- Email: support@pillow.ai
- Documentation: https://docs.pillow.ai

## License

Copyright © 2026 Pillow AI. All rights reserved.
