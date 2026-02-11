# Supabase Authentication Setup

This guide will help you set up Supabase authentication for the Buzz frontend.

## Prerequisites

1. A Supabase account (sign up at https://supabase.com)
2. Node.js and npm installed

## Setup Steps

### 1. Create a Supabase Project

1. Go to https://supabase.com and sign in
2. Click "New Project"
3. Choose your organization and enter project details
4. Wait for the project to be created

### 2. Get Your Project Credentials

1. In your Supabase dashboard, go to Settings > API
2. Copy the following values:
   - Project URL
   - Anon public key

### 3. Configure Environment Variables

1. In the `buzz-frontend` directory, create a `.env` file
2. Add your Supabase credentials:

```env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

Replace the values with your actual Supabase project URL and anon key.

### 4. Configure Authentication

1. In your Supabase dashboard, go to Authentication > Settings
2. Under "Site URL", add your local development URL: `http://localhost:5173`
3. Under "Redirect URLs", add: `http://localhost:5173/**`

### 5. Enable Email Authentication

1. In Authentication > Settings
2. Make sure "Enable email confirmations" is enabled
3. Configure your email templates if needed

### 6. Test the Setup

1. Start your development server: `npm run dev`
2. Navigate to `http://localhost:5173/login`
3. Try signing up with an email address
4. Check your email for the confirmation link
5. After confirming, try signing in

## Features Implemented

- ✅ Email/password authentication
- ✅ User registration with email confirmation
- ✅ Password reset functionality
- ✅ Automatic session management
- ✅ Protected routes
- ✅ Logout functionality
- ✅ Integration with existing UserContext

## Usage

### Sign Up
Users can create accounts using email and password. They'll receive a confirmation email.

### Sign In
Users can sign in with their email and password after confirming their account.

### Protected Routes
Routes like `/Profile`, `/create-event`, and `/edit-event` require authentication.

### Logout
Users can logout from the settings menu in their profile.

## Troubleshooting

### "Missing Supabase environment variables" error
1. Make sure your `.env` file is in the `buzz-frontend` directory (not the root)
2. Ensure the file contains both required variables:
   ```env
   VITE_SUPABASE_URL=your_supabase_project_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```
3. Restart your development server after creating/modifying the .env file
4. Check the browser console for environment variable debug logs

### Environment variables not loading
1. **Restart the dev server**: Environment variables are only loaded when Vite starts
2. **Check file location**: The `.env` file must be in `buzz-frontend/` directory
3. **Check variable names**: Must start with `VITE_` prefix
4. **No spaces**: Format should be `VITE_VAR_NAME=value` (no spaces around =)
5. **No quotes needed**: Don't wrap values in quotes unless they contain spaces

### Email confirmation not working
1. Check your Supabase email settings
2. Make sure your site URL is configured correctly
3. Check your spam folder

### Authentication not persisting
This is normal - Supabase handles session persistence automatically. Users will stay logged in across browser sessions.

### Development server issues
If you see connection errors:
1. Make sure your Supabase project is active (not paused)
2. Check your internet connection
3. Verify your Supabase URL and key are correct
4. Check the browser network tab for failed requests

## Next Steps

Consider implementing:
- Social authentication (Google, GitHub, etc.)
- User profiles stored in Supabase
- Role-based access control
- Email templates customization