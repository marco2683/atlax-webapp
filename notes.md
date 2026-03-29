reminder to myself
add services like RFI (from quadlock) to send directly to the supplier to fill  to retrieve specialised information

some other tool to manage quality and reports...

--- AUTH / DATABASE TODO ---
- Custom email sender: Supabase sends confirmation emails from their domain right now.
  When we have a domain for the platform, go to Supabase > Project Settings > Auth > SMTP Settings
  and configure a custom SMTP provider (e.g. Resend.com, SendGrid, AWS SES) so emails come from
  something like noreply@paniani.com instead of noreply@mail.app.supabase.io

- Future: Add a `customers` table in Supabase linked to auth.users (user profile, company, project history, RFQ history)
- Future: Add "Forgot Password" flow to the auth modal
- Future: Add Google OAuth login button for 1-click sign-in