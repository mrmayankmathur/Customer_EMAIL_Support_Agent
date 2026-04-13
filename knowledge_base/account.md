# Account Management — Knowledge Base

## Password Reset

- Customers can reset their password at any time via **Forgot Password** on the login page.
- A password reset link is sent to the registered email and expires after **1 hour**.
- Passwords must be at least **12 characters** and include uppercase, lowercase, a number, and a special character.
- After a password reset, all active sessions are terminated and the customer must log in again.

## Profile Updates

- Profile information (name, phone, timezone) can be updated at **Settings → Profile**.
- Email address changes require verification of the new address via a confirmation link.
- Changing the primary email does **not** affect the login email for SSO users — that is managed by the organisation's identity provider.

## Account Deletion

- Customers can request account deletion from **Settings → Account → Delete Account**.
- Account deletion requires password confirmation and an optional feedback survey.
- Upon deletion, all data is **permanently removed within 30 days**. This action is irreversible.
- Organisation admins must transfer ownership before deleting their account if they are the sole admin.
- A **data export** is recommended before deletion: **Settings → Data → Export All**.

## Two-Factor Authentication (2FA)

- 2FA can be enabled at **Settings → Security → Two-Factor Authentication**.
- Supported methods: **Authenticator app** (Google Authenticator, Authy) and **SMS** (Pro and Enterprise plans only).
- During setup, customers receive **10 one-time backup codes**. These should be stored securely.
- If a customer loses their 2FA device and backup codes, support can disable 2FA after identity verification (government-issued photo ID + verification of billing email).

## Team & Organisation Management

- Organisation admins can invite team members at **Settings → Team → Invite Members**.
- Roles available: **Admin**, **Editor**, **Viewer**.
- Admins can manage team member permissions, transfer ownership, and remove members.
- Removed members lose access immediately but their created content is retained.

## Data Export

- Full data exports are available in **JSON** or **CSV** format.
- Exports can be requested at **Settings → Data → Export** and typically complete within **1-24 hours** depending on data volume.
- Export download links expire after **7 days**.
