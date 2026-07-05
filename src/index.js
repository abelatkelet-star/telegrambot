const fs = require("fs");
const path = require("path");
const notes = require("./notes");

const BOT_TOKEN = process.env.BOT_TOKEN;
const ADMIN_USERNAME = (process.env.ADMIN_USERNAME || "ALPHA_TUTOR_21").replace(/^@/, "");
const ADMIN_CHAT_ID = process.env.ADMIN_CHAT_ID ? String(process.env.ADMIN_CHAT_ID) : "";
const DATA_FILE = process.env.DATA_FILE || path.join(process.cwd(), "data", "bot-data.json");
const API = BOT_TOKEN ? `https://api.telegram.org/bot${BOT_TOKEN}` : "";

if (!BOT_TOKEN) {
  console.error("Missing BOT_TOKEN environment variable.");
  process.exit(1);
}

const subjectMenu = {
  inline_keyboard: [
    [{ text: "📜 History (ታሪክ)", callback_data: "subject:history" }],
    [{ text: "🌍 Geography (ጂኦግራፊ)", callback_data: "subject:geography" }],
    [{ text: "📉 Economics (ኢኮኖሚክስ)", callback_data: "subject:economics" }],
    [{ text: "✅ My Status", callback_data: "status" }]
  ]
};

const waitingMenu = {
  inline_keyboard: [
    [{ text: `Send Payment Proof to @${ADMIN_USERNAME}`, url: `https://t.me/${ADMIN_USERNAME}` }],
    [{ text: "Check Approval Status", callback_data: "status" }]
  ]
};

const backMenu = {
  inline_keyboard: [[{ text: "Back to Home", callback_data: "home" }]]
};

let offset = 0;
let data = loadData();

function loadData() {
  try {
    if (!fs.existsSync(DATA_FILE)) return { users: {} };
    return JSON.parse(fs.readFileSync(DATA_FILE, "utf8"));
  } catch (error) {
    console.error("Could not load data file:", error.message);
    return { users: {} };
  }
}

function saveData() {
  fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true });
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

async function telegram(method, payload) {
  const response = await fetch(`${API}/${method}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload)
  });
  const body = await response.json();
  if (!body.ok) throw new Error(`${method} failed: ${JSON.stringify(body)}`);
  return body.result;
}

async function sendMessage(chatId, text, replyMarkup) {
  return telegram("sendMessage", {
    chat_id: chatId,
    text,
    parse_mode: "HTML",
    disable_web_page_preview: true,
    reply_markup: replyMarkup
  });
}

async function editMessage(chatId, messageId, text, replyMarkup) {
  return telegram("editMessageText", {
    chat_id: chatId,
    message_id: messageId,
    text,
    parse_mode: "HTML",
    disable_web_page_preview: true,
    reply_markup: replyMarkup
  });
}

async function answerCallback(callbackQuery, text) {
  return telegram("answerCallbackQuery", {
    callback_query_id: callbackQuery.id,
    text,
    show_alert: false
  });
}

function getUser(id) {
  if (!data.users[id]) {
    data.users[id] = {
      id,
      firstName: "",
      lastName: "",
      username: "",
      status: "new",
      step: "first_name",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
  }
  return data.users[id];
}

function updateProfile(user, from) {
  user.telegramFirstName = from.first_name || "";
  user.telegramLastName = from.last_name || "";
  user.username = from.username || "";
  user.updatedAt = new Date().toISOString();
}

function isAdmin(from) {
  if (!from) return false;
  if (ADMIN_CHAT_ID && String(from.id) === ADMIN_CHAT_ID) return true;
  return !ADMIN_CHAT_ID && (from.username || "").toLowerCase() === ADMIN_USERNAME.toLowerCase();
}

function welcomeMessage() {
  return (
    "💬 <b>Welcome Message</b>\n\n" +
    "Welcome to <b>Alpha Tutor</b>, student! 🚀\n\n" +
    "I'm your personal tutor for the <b>10-Day Grade 12 Reading Challenge!</b>\n\n" +
    "የ12ኛ ክፍል የማህበራዊ ሳይንስ ማትሪክ ፈተና የሚሆን የ10 ቀናት የንባብ ቻሌንጅ የግል አስተማሪዎ፡-\n\n" +
    "📜 History (ታሪክ)\n" +
    "🌍 Geography (ጂኦግራፊ)\n" +
    "📉 Economics (ኢኮኖሚክስ)\n\n" +
    "🌟 <b>What we offer:</b>\n\n" +
    "📚 High-Yield Short Notes | ከ9ኛ - 12ኛ ክፍል የተመረጡ እጅግ አጫጭር የHistory, Geography እና Economics ማጠቃለያዎች\n\n" +
    "To register, please send your <b>first name</b>."
  );
}

function homeMessage(user) {
  return (
    `✅ <b>Approved: ${escapeHtml(user.firstName)} ${escapeHtml(user.lastName)}</b>\n\n` +
    "Welcome to <b>Alpha Tutor</b>, student! 🚀\n\n" +
    "I'm your personal tutor for the <b>10-Day Grade 12 Reading Challenge!</b>\n\n" +
    "የ12ኛ ክፍል የማህበራዊ ሳይንስ ማትሪክ ፈተና የሚሆን የ10 ቀናት የንባብ ቻሌንጅ የግል አስተማሪዎ፡-\n\n" +
    "📜 History (ታሪክ)\n" +
    "🌍 Geography (ጂኦግራፊ)\n" +
    "📉 Economics (ኢኮኖሚክስ)\n\n" +
    "🌟 <b>What we offer:</b>\n\n" +
    "📚 High-Yield Short Notes | ከ9ኛ - 12ኛ ክፍል የተመረጡ እጅግ አጫጭር የHistory, Geography እና Economics ማጠቃለያዎች\n\n" +
    "Choose a subject below."
  );
}

function paymentMessage(user) {
  return (
    `✅ Registration completed: <b>${escapeHtml(user.firstName)} ${escapeHtml(user.lastName)}</b>\n\n` +
    "⏳ <b>Payment Waiting Page</b>\n\n" +
    `Please pay manually and send payment proof to @${ADMIN_USERNAME}.\n\n` +
    "After admin confirms your payment, your notes will unlock automatically.\n\n" +
    `<b>Your User ID:</b> <code>${user.id}</code>\n` +
    "Send this User ID together with your payment proof."
  );
}

function statusMessage(user) {
  if (user.status === "approved") return "✅ Your account is approved. Choose any subject from the home page.";
  if (user.status === "pending") {
    return (
      "⏳ Your account is waiting for manual payment approval.\n\n" +
      `Send payment proof and User ID <code>${user.id}</code> to @${ADMIN_USERNAME}.`
    );
  }
  return "Please send /start to begin registration.";
}

function adminNotice(user) {
  return (
    "🧾 <b>New student waiting for approval</b>\n\n" +
    `<b>Name:</b> ${escapeHtml(user.firstName)} ${escapeHtml(user.lastName)}\n` +
    `<b>Telegram:</b> ${user.username ? `@${escapeHtml(user.username)}` : "No username"}\n` +
    `<b>User ID:</b> <code>${user.id}</code>\n\n` +
    `Approve: <code>/approve ${user.id}</code>\n` +
    `Reject: <code>/reject ${user.id}</code>`
  );
}

function subjectMessage(subjectKey) {
  const subject = notes[subjectKey];
  const lessons = subject.lessons
    .map((lesson, index) => `<b>${index + 1}. ${escapeHtml(lesson.title)}</b>\n${escapeHtml(lesson.body)}`)
    .join("\n\n");
  return `<b>${escapeHtml(subject.title)}</b>\n\n${lessons}`;
}

async function handleMessage(message) {
  if (!message.text) return;

  const chatId = message.chat.id;
  const id = String(message.from.id);
  const text = message.text.trim();
  const user = getUser(id);
  updateProfile(user, message.from);

  if (text === "/start") {
    if (user.status === "approved") {
      await sendMessage(chatId, homeMessage(user), subjectMenu);
      return;
    }

    if (user.firstName && user.lastName) {
      user.status = "pending";
      user.step = "waiting_payment";
      saveData();
      await sendMessage(chatId, paymentMessage(user), waitingMenu);
      return;
    }

    user.step = user.firstName ? "last_name" : "first_name";
    saveData();
    await sendMessage(chatId, welcomeMessage());
    return;
  }

  if (text.startsWith("/")) {
    await handleCommand(message);
    return;
  }

  if (user.status === "approved") {
    await sendMessage(chatId, homeMessage(user), subjectMenu);
    return;
  }

  if (user.step === "first_name") {
    user.firstName = cleanName(text);
    user.step = "last_name";
    saveData();
    await sendMessage(chatId, "Great. Now send your <b>last name</b>.");
    return;
  }

  if (user.step === "last_name") {
    user.lastName = cleanName(text);
    user.status = "pending";
    user.step = "waiting_payment";
    saveData();
    await sendMessage(chatId, paymentMessage(user), waitingMenu);
    await notifyAdmin(user);
    return;
  }

  if (user.status === "pending") {
    await sendMessage(chatId, statusMessage(user), waitingMenu);
    return;
  }

  await sendMessage(chatId, "Please send /start to begin registration.");
}

async function handleCommand(message) {
  const chatId = message.chat.id;
  const [command, arg] = message.text.trim().split(/\s+/);
  const adminCommands = ["/pending", "/approve", "/reject", "/users"];

  if (adminCommands.includes(command) && !isAdmin(message.from)) {
    await sendMessage(chatId, "This command is only for admin.");
    return;
  }

  if (command === "/pending") {
    const pending = Object.values(data.users).filter((user) => user.status === "pending");
    await sendMessage(chatId, pending.length ? formatUsers(pending) : "No pending students.");
    return;
  }

  if (command === "/users") {
    const users = Object.values(data.users);
    await sendMessage(chatId, users.length ? formatUsers(users) : "No students registered yet.");
    return;
  }

  if (command === "/approve") {
    await changeUserStatus(chatId, arg, "approved");
    return;
  }

  if (command === "/reject") {
    await changeUserStatus(chatId, arg, "pending");
    return;
  }

  await sendMessage(chatId, "Available command: /start");
}

async function changeUserStatus(adminChatId, targetId, status) {
  if (!targetId || !data.users[targetId]) {
    await sendMessage(adminChatId, "Student not found. Use /pending to see waiting students.");
    return;
  }

  const target = data.users[targetId];
  target.status = status;
  target.step = status === "approved" ? "approved" : "waiting_payment";
  target.updatedAt = new Date().toISOString();
  saveData();

  if (status === "approved") {
    await sendMessage(adminChatId, `Approved ${escapeHtml(target.firstName)} ${escapeHtml(target.lastName)}.`);
    await sendMessage(target.id, homeMessage(target), subjectMenu).catch((error) => {
      console.error("Could not notify approved student:", error.message);
    });
    return;
  }

  await sendMessage(adminChatId, `Returned ${escapeHtml(target.firstName)} ${escapeHtml(target.lastName)} to payment waiting.`);
  await sendMessage(target.id, "Your payment is not approved yet. Please contact admin again with correct proof.", waitingMenu).catch((error) => {
    console.error("Could not notify rejected student:", error.message);
  });
}

async function handleCallback(callbackQuery) {
  const message = callbackQuery.message;
  const chatId = message.chat.id;
  const messageId = message.message_id;
  const user = getUser(String(callbackQuery.from.id));
  updateProfile(user, callbackQuery.from);
  saveData();

  const action = callbackQuery.data;

  if (action === "status") {
    await answerCallback(callbackQuery, "Status checked");
    await editMessage(chatId, messageId, statusMessage(user), user.status === "approved" ? subjectMenu : waitingMenu);
    return;
  }

  if (action === "home") {
    await answerCallback(callbackQuery, "Home");
    await editMessage(chatId, messageId, homeMessage(user), subjectMenu);
    return;
  }

  if (action.startsWith("subject:")) {
    if (user.status !== "approved") {
      await answerCallback(callbackQuery, "Waiting for approval");
      await editMessage(chatId, messageId, statusMessage(user), waitingMenu);
      return;
    }

    const subjectKey = action.split(":")[1];
    if (!notes[subjectKey]) {
      await answerCallback(callbackQuery, "Subject not found");
      return;
    }

    await answerCallback(callbackQuery, notes[subjectKey].title);
    await editMessage(chatId, messageId, subjectMessage(subjectKey), backMenu);
  }
}

async function notifyAdmin(user) {
  if (!ADMIN_CHAT_ID) {
    console.log(`New pending student ${user.id}: ${user.firstName} ${user.lastName}. Set ADMIN_CHAT_ID to receive bot messages.`);
    return;
  }

  await sendMessage(ADMIN_CHAT_ID, adminNotice(user)).catch((error) => {
    console.error("Could not notify admin:", error.message);
  });
}

function formatUsers(users) {
  return users
    .map((user) => {
      const name = `${user.firstName || "-"} ${user.lastName || ""}`.trim();
      const username = user.username ? `@${user.username}` : "no username";
      return `${escapeHtml(name)} | ${escapeHtml(username)} | <code>${user.id}</code> | ${user.status}`;
    })
    .join("\n");
}

function cleanName(value) {
  return value.replace(/\s+/g, " ").slice(0, 60);
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

async function poll() {
  while (true) {
    try {
      const updates = await telegram("getUpdates", {
        offset,
        timeout: 30,
        allowed_updates: ["message", "callback_query"]
      });

      for (const update of updates) {
        offset = update.update_id + 1;
        if (update.message) await handleMessage(update.message);
        if (update.callback_query) await handleCallback(update.callback_query);
      }
    } catch (error) {
      console.error(error.message);
      await sleep(3000);
    }
  }
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

console.log("Alpha Tutor bot is running...");
poll();
