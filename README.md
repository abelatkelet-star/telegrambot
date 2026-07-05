# Alpha Tutor Telegram Bot

Telegram bot for the 10-Day Grade 12 Social Science Reading Challenge. It registers students, shows a manual payment waiting page, and unlocks History, Geography, and Economics short notes after admin approval.

## Deploy on Railway

1. Push this folder to GitHub.
2. Create a Railway project from this GitHub repository.
3. Add these Railway variables:
   - `BOT_TOKEN`: your BotFather token.
   - `ADMIN_USERNAME`: `ALPHA_TUTOR_21`
   - `ADMIN_CHAT_ID`: your numeric Telegram chat ID. This is recommended.
   - `DATABASE_URL`: Supabase Postgres connection string.
   - `SUPABASE_URL`: your Supabase project URL, like `https://PROJECT_REF.supabase.co`.
   - `SUPABASE_STORAGE_BUCKET`: usually `subjects`.
   - `PACKAGE_SLUG`: optional, default is `grade-12-social-science-10-day`.
4. Railway will run the worker using `npm start`.

Use this bot with Telegram long polling. Do not set a webhook for the same bot token.

## Supabase + Prisma Setup

Create a free Supabase project, then copy the Postgres connection string from:

```text
Project Settings -> Database -> Connection string -> Transaction pooler
```

Use that value as `DATABASE_URL`.

Then run locally or in Railway shell:

```bash
npm install
npm run db:push
npm run db:seed
```

The seed creates:

- one package: `10-Day Grade 12 Social Science Reading Challenge`
- three subjects: History, Geography, Economics
- storage file records pointing to:
  - `subjects/history/grade-9-12-short-notes.pdf`
  - `subjects/geography/grade-9-12-short-notes.pdf`
  - `subjects/economics/grade-9-12-short-notes.pdf`

Upload those files in your Supabase Storage bucket. See [DATABASE.md](DATABASE.md) for the full schema model.

The bot reads those `SubjectAsset` rows after approval and shows file links to approved students.

## Student Flow

1. Student sends `/start`.
2. Bot asks first name.
3. Bot asks last name.
4. Bot shows payment waiting page and tells the student to send payment proof to `@ALPHA_TUTOR_21`.
5. Admin approves the student.
6. Student gets the Alpha Tutor home page and can read the three subjects.

## Admin Commands

If `ADMIN_CHAT_ID` is set, only that Telegram account can run admin commands. If it is not set, the bot allows the Telegram username in `ADMIN_USERNAME`.

- `/pending` - show students waiting for approval.
- `/approve USER_ID` - approve a student.
- `/reject USER_ID` - return a student to payment waiting.
- `/users` - show all registered students.

Example:

```text
/approve 123456789
```
