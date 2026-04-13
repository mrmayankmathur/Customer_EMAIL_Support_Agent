# Technical Support — Knowledge Base

## Login & Authentication Issues

- **"Invalid credentials" error**: Verify the email address and reset password via **Forgot Password** on the login page.
- **Account locked**: After 5 failed login attempts, the account is locked for 30 minutes. The customer can unlock it immediately via the email link sent automatically.
- **Two-factor authentication (2FA) issues**: If the customer has lost their 2FA device, they can use one of the **backup recovery codes** generated during 2FA setup. If all codes are lost, identity verification through support is required (government ID + billing email).
- **SSO login failures**: Ensure the organisation's SSO provider (Okta, Azure AD, Google Workspace) has the correct callback URL: `https://app.example.com/auth/sso/callback`.

## API Errors

- **401 Unauthorised**: The API key is missing or invalid. Customers can regenerate keys at **Settings → API → Keys**.
- **403 Forbidden**: The API key does not have the required scope. Scopes can be updated in **Settings → API → Key Permissions**.
- **429 Too Many Requests**: Rate limit exceeded. Default limits: Starter = 100 req/min, Pro = 1000 req/min, Enterprise = 10,000 req/min.
- **500 Internal Server Error**: This indicates a server-side issue. Ask the customer to check our status page at `https://status.example.com` and retry after a few minutes. If persistent, escalate to the engineering team.

## Performance Issues

- **Slow dashboard loading**: Ask the customer to clear their browser cache and try an incognito window. Supported browsers: Chrome 90+, Firefox 88+, Safari 15+, Edge 90+.
- **File upload timeouts**: Maximum file size is **100 MB** for Pro and **500 MB** for Enterprise. Starter plan has a **25 MB** limit. Large files should be uploaded via the API using multipart upload.
- **Data sync delays**: Real-time sync may experience delays of up to 5 minutes during peak hours. If delays exceed 15 minutes, escalate to the engineering team.

## Integration Setup

- **Slack integration**: Install from **Settings → Integrations → Slack** and authorise the bot. Requires Slack workspace admin permissions.
- **Webhook configuration**: Webhooks can be configured at **Settings → Integrations → Webhooks**. Supported events: `ticket.created`, `ticket.updated`, `ticket.resolved`. Payloads are signed with HMAC-SHA256.
- **Zapier / Make (Integromat)**: Pre-built templates are available at `https://zapier.com/apps/example` and `https://make.com/en/integrations/example`.

## Known Issues

- **Safari clipboard bug**: Copy-paste may not work correctly in Safari 16.x. Workaround: use keyboard shortcuts (Cmd+C/Cmd+V) instead of right-click context menu.
- **Dark mode rendering**: Some chart colours may have low contrast in dark mode. Fix scheduled for v2.5 release.
