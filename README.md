# Alpha Tutor Telegram Bot

Telegram bot for the 10-Day Grade 12 Social Science Reading Challenge. It registers students, shows a manual payment waiting page, and unlocks History, Geography, and Economics short notes after admin approval.

## Deploy on Railway

1. Push this folder to GitHub.
2. Create a Railway project from this GitHub repository.
3. Add these Railway variables:
   - `BOT_TOKEN`: your BotFather token.
   - `ADMIN_USERNAME`: `ALPHA_TUTOR_21`
   - `ADMIN_CHAT_ID`: your numeric Telegram chat ID. This is recommended.
   - `DATA_FILE`: optional, default is `./data/bot-data.json`.
4. Railway will run the worker using `npm start`.

Use this bot with Telegram long polling. Do not set a webhook for the same bot token.

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
