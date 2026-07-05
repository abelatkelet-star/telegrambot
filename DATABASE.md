# Database and Storage Model

This project uses Prisma with Supabase Postgres for structured data, and Supabase Storage for subject files.

## What We Capture During Registration

`Student`

- `telegramId`: Telegram numeric user ID stored as text.
- `telegramUsername`: Telegram username if available.
- `telegramFirstName`, `telegramLastName`: profile names from Telegram.
- `firstName`, `lastName`: names typed during registration.
- `registrationStep`: `FIRST_NAME`, `LAST_NAME`, `WAITING_PAYMENT`, or `APPROVED`.
- `accessStatus`: `NEW`, `PENDING_PAYMENT`, `APPROVED`, or `REJECTED`.

## Package and Payment Status

`Package` stores the course/challenge offer, for example:

- `grade-12-social-science-10-day`
- grade range `9-12`
- duration `10` days
- optional price and currency

`Enrollment` connects a student to a package:

- `PENDING` before approval
- `ACTIVE` after approval
- `REVOKED` or `EXPIRED` later if needed

`Payment` tracks manual payment review:

- `WAITING_PROOF`
- `UNDER_REVIEW`
- `APPROVED`
- `REJECTED`

The student still sends payment proof manually to `@ALPHA_TUTOR_21`; the database stores the review status.

## Subjects and Supabase Storage

`Subject` stores the subject names:

- History
- Geography
- Economics

`SubjectAsset` stores file metadata only:

- `bucket`: Supabase Storage bucket, for example `subjects`
- `path`: file path, for example `history/grade-9-short-notes.pdf`
- `publicUrl`: optional public URL if you use a public bucket
- `mimeType`: for example `application/pdf`

Upload PDFs or other files to Supabase Storage. The database should point to those files; it should not store the actual PDFs.

For grade tabs, upload one PDF per subject and grade:

```text
subjects/history/grade-9-short-notes.pdf
subjects/history/grade-10-short-notes.pdf
subjects/history/grade-11-short-notes.pdf
subjects/history/grade-12-short-notes.pdf
subjects/geography/grade-9-short-notes.pdf
subjects/geography/grade-10-short-notes.pdf
subjects/geography/grade-11-short-notes.pdf
subjects/geography/grade-12-short-notes.pdf
subjects/economics/grade-9-short-notes.pdf
subjects/economics/grade-10-short-notes.pdf
subjects/economics/grade-11-short-notes.pdf
subjects/economics/grade-12-short-notes.pdf
```

If `publicUrl` is empty, the bot builds a public URL from:

```text
SUPABASE_URL/storage/v1/object/public/bucket/path
```

For this to work, the bucket should be public. If you want private files later, use signed URLs with the Supabase service role key instead.

## Setup Commands

After setting `DATABASE_URL`:

```bash
npm install
npm run db:push
npm run db:seed
npm start
```

For Railway, set the same environment variables in the Railway dashboard.
