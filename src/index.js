const notes = require("./notes");
const db = require("./repository");

const BOT_TOKEN = process.env.BOT_TOKEN;
const ADMIN_USERNAME = (process.env.ADMIN_USERNAME || "ALPHA_TUTOR_21").replace(/^@/, "");
const ADMIN_CHAT_ID = process.env.ADMIN_CHAT_ID ? String(process.env.ADMIN_CHAT_ID) : "";
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

function gradeMenu(subjectKey) {
  return {
    inline_keyboard: [
      [{ text: "Grade 9", callback_data: `grade:${subjectKey}:9` }],
      [{ text: "Grade 10", callback_data: `grade:${subjectKey}:10` }],
      [{ text: "Grade 11", callback_data: `grade:${subjectKey}:11` }],
      [{ text: "Grade 12", callback_data: `grade:${subjectKey}:12` }],
      [{ text: "Back to Home", callback_data: "home" }]
    ]
  };
}

function gradeBackMenu(subjectKey) {
  return {
    inline_keyboard: [
      [{ text: "Back to Grades", callback_data: `subject:${subjectKey}` }],
      [{ text: "Back to Home", callback_data: "home" }]
    ]
  };
}

let offset = 0;

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

async function sendDocument(chatId, documentUrl, caption, replyMarkup) {
  return telegram("sendDocument", {
    chat_id: chatId,
    document: documentUrl,
    caption,
    parse_mode: "HTML",
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

async function editOrSendMenu(message, text, replyMarkup) {
  if (message.text) {
    return editMessage(message.chat.id, message.message_id, text, replyMarkup);
  }

  return sendMessage(message.chat.id, text, replyMarkup);
}

async function answerCallback(callbackQuery, text) {
  return telegram("answerCallbackQuery", {
    callback_query_id: callbackQuery.id,
    text,
    show_alert: false
  });
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

function homeMessage(student) {
  return (
    `✅ <b>Approved: ${escapeHtml(student.firstName)} ${escapeHtml(student.lastName)}</b>\n\n` +
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

function paymentMessage(student) {
  return (
    `✅ Registration completed: <b>${escapeHtml(student.firstName)} ${escapeHtml(student.lastName)}</b>\n\n` +
    "⏳ <b>Payment Waiting Page</b>\n\n" +
    "<b>Payment Accounts</b>\n" +
    "CBE: <code>1000300461313</code>\n" +
    "Telebirr: <code>0993671417</code>\n" +
    "BoA: <code>88685358</code>\n" +
    "Awash: <code>013200741433501</code>\n\n" +
    `Please pay manually and send payment proof to @${ADMIN_USERNAME}.\n\n` +
    "After admin confirms your payment, your notes will unlock automatically.\n\n" +
    "Send your payment proof using the button below."
  );
}

function statusMessage(student) {
  if (student.accessStatus === "APPROVED") return "✅ Your account is approved. Choose any subject from the home page.";
  if (["PENDING_PAYMENT", "REJECTED"].includes(student.accessStatus)) {
    return (
      "⏳ Your account is waiting for manual payment approval.\n\n" +
      "<b>Payment Accounts</b>\n" +
      "CBE: <code>1000300461313</code>\n" +
      "Telebirr: <code>0993671417</code>\n" +
      "BoA: <code>88685358</code>\n" +
      "Awash: <code>013200741433501</code>\n\n" +
      `Send your payment proof to @${ADMIN_USERNAME}.`
    );
  }
  return "Please send /start to begin registration.";
}

function adminNotice(student) {
  const approveTarget = adminCommandTarget(student);
  return (
    "🧾 <b>New student waiting for approval</b>\n\n" +
    `<b>Name:</b> ${escapeHtml(student.firstName)} ${escapeHtml(student.lastName)}\n` +
    `<b>Telegram:</b> ${student.telegramUsername ? `@${escapeHtml(student.telegramUsername)}` : "No username"}\n` +
    "Tap the button below to approve, or use:\n" +
    `<code>/approve ${escapeHtml(approveTarget)}</code>`
  );
}

function fallbackSubjectMessage(subjectKey) {
  const subject = notes[subjectKey];
  const lessons = subject.lessons
    .map((lesson, index) => `<b>${index + 1}. ${escapeHtml(lesson.title)}</b>\n${escapeHtml(lesson.body)}`)
    .join("\n\n");
  return `<b>${escapeHtml(subject.title)}</b>\n\n${lessons}`;
}

function assetSubjectMessage(subject) {
  const title = `${subject.title}${subject.titleAm ? ` (${subject.titleAm})` : ""}`;
  if (!subject.assets.length) {
    return `<b>${escapeHtml(title)}</b>\n\nNo uploaded files found yet. Upload files to Supabase Storage and seed/update SubjectAsset rows.`;
  }

  const files = subject.assets
    .map((asset, index) => {
      const label = `${index + 1}. ${asset.title}`;
      if (asset.publicUrl) return `<a href="${escapeHtml(asset.publicUrl)}">${escapeHtml(label)}</a>`;
      return `${escapeHtml(label)}\nStorage: <code>${escapeHtml(asset.bucket)}/${escapeHtml(asset.path)}</code>`;
    })
    .join("\n\n");

  return `<b>${escapeHtml(title)}</b>\n\n${files}`;
}

function gradeListMessage(subjectKey) {
  const subject = notes[subjectKey];
  const title = subject ? subject.title : subjectKey;
  return `<b>${escapeHtml(title)}</b>\n\nChoose your grade.`;
}

function gradeAssetMessage(subject) {
  const title = `${subject.title}${subject.titleAm ? ` (${subject.titleAm})` : ""}`;
  if (!subject.assets.length) {
    return (
      `<b>${escapeHtml(title)} - Grade ${subject.grade}</b>\n\n` +
      "No short note file found for this grade yet.\n\n" +
      `Upload it to Supabase Storage as:\n<code>${escapeHtml(subject.slug)}/grade-${subject.grade}-short-notes.pdf</code>`
    );
  }

  const files = subject.assets
    .map((asset, index) => {
      const label = `${index + 1}. ${asset.title}`;
      if (asset.publicUrl) return `<a href="${escapeHtml(asset.publicUrl)}">${escapeHtml(label)}</a>`;
      return `${escapeHtml(label)}\nStorage: <code>${escapeHtml(asset.bucket)}/${escapeHtml(asset.path)}</code>`;
    })
    .join("\n\n");

  return `<b>${escapeHtml(title)} - Grade ${subject.grade}</b>\n\n${files}`;
}

function missingGradeAssetMessage(subjectKey, grade, asset) {
  const subject = notes[subjectKey];
  const title = subject ? subject.title : subjectKey;
  return (
    `<b>${escapeHtml(title)} - Grade ${escapeHtml(grade)}</b>\n\n` +
    "I could not send the PDF from Supabase Storage.\n\n" +
    "Make sure the bucket is public and upload the file here:\n" +
    `<code>${escapeHtml(asset.bucket)}/${escapeHtml(asset.path)}</code>`
  );
}

async function handleMessage(message) {
  if (!message.text) return;

  const chatId = message.chat.id;
  const text = message.text.trim();
  let student = await db.getOrCreateStudent(message.from);

  if (text === "/start") {
    if (student.accessStatus === "APPROVED") {
      await sendMessage(chatId, homeMessage(student), subjectMenu);
      return;
    }

    if (student.firstName && student.lastName) {
      await sendMessage(chatId, paymentMessage(student), waitingMenu);
      return;
    }

    await sendMessage(chatId, welcomeMessage());
    return;
  }

  if (text.startsWith("/")) {
    await handleCommand(message);
    return;
  }

  if (student.accessStatus === "APPROVED") {
    await sendMessage(chatId, homeMessage(student), subjectMenu);
    return;
  }

  if (student.registrationStep === "FIRST_NAME") {
    student = await db.setFirstName(student.telegramId, cleanName(text));
    await sendMessage(chatId, "Great. Now send your <b>last name</b>.");
    return;
  }

  if (student.registrationStep === "LAST_NAME") {
    student = await db.setLastNameAndPending(student.telegramId, cleanName(text));
    await sendMessage(chatId, paymentMessage(student), waitingMenu);
    db.ensurePendingEnrollmentAndPayment(student).catch((error) => {
      console.error("Could not create pending enrollment/payment:", error.message);
    });
    await notifyAdmin(student);
    return;
  }

  await sendMessage(chatId, statusMessage(student), waitingMenu);
}

async function handleCommand(message) {
  const chatId = message.chat.id;
  const [command, ...args] = message.text.trim().split(/\s+/);
  const target = args.join(" ");
  const adminCommands = ["/pending", "/approve", "/reject", "/users"];

  if (adminCommands.includes(command) && !isAdmin(message.from)) {
    await sendMessage(chatId, "This command is only for admin.");
    return;
  }

  if (command === "/pending") {
    const pending = await db.getPendingStudents();
    await sendMessage(
      chatId,
      pending.length ? "Pending students. Tap a student name to approve." : "No pending students.",
      pending.length ? pendingApprovalMenu(pending) : undefined
    );
    return;
  }

  if (command === "/users") {
    const students = await db.getAllStudents();
    await sendMessage(chatId, students.length ? formatStudents(students) : "No students registered yet.");
    return;
  }

  if (command === "/approve") {
    await changeStudentStatus(chatId, target, message.from.id, "approved");
    return;
  }

  if (command === "/reject") {
    await changeStudentStatus(chatId, target, message.from.id, "rejected");
    return;
  }

  await sendMessage(chatId, "Available command: /start");
}

async function changeStudentStatus(adminChatId, target, adminTelegramId, action) {
  if (!target) {
    await sendMessage(adminChatId, "Send the student's first and last name. Example: /approve Abel Atkelet");
    return;
  }

  try {
    const matches = await db.findStudentsForAdminTarget(target, action === "approved" ? "PENDING_PAYMENT" : undefined);
    if (!matches.length) {
      await sendMessage(adminChatId, "Student not found. Use /pending to see waiting students.");
      return;
    }

    if (matches.length > 1) {
      await sendMessage(adminChatId, "More than one student matched. Use /pending, then approve with the exact first and last name.");
      return;
    }

    const targetTelegramId = matches[0].telegramId;

    if (action === "approved") {
      await approveByTelegramId(adminChatId, targetTelegramId, adminTelegramId);
      return;
    }

    const student = await db.rejectStudent(targetTelegramId, adminTelegramId);
    await sendMessage(adminChatId, `Returned ${escapeHtml(student.firstName)} ${escapeHtml(student.lastName)} to payment waiting.`);
    await sendMessage(student.telegramId, "Your payment is not approved yet. Please contact admin again with correct proof.", waitingMenu).catch((error) => {
      console.error("Could not notify rejected student:", error.message);
    });
  } catch (error) {
    console.error(error);
    await sendMessage(adminChatId, "Student not found. Use /pending to see waiting students.");
  }
}

async function handleCallback(callbackQuery) {
  const message = callbackQuery.message;
  const chatId = message.chat.id;
  const messageId = message.message_id;
  const action = callbackQuery.data;

  if (action.startsWith("admin:")) {
    await handleAdminCallback(callbackQuery);
    return;
  }

  const student = await db.getOrCreateStudent(callbackQuery.from);

  if (action === "status") {
    await answerCallback(callbackQuery, "Status checked");
    await editOrSendMenu(message, statusMessage(student), student.accessStatus === "APPROVED" ? subjectMenu : waitingMenu);
    return;
  }

  if (action === "home") {
    await answerCallback(callbackQuery, "Home");
    await editOrSendMenu(message, homeMessage(student), subjectMenu);
    return;
  }

  if (action.startsWith("subject:")) {
    if (student.accessStatus !== "APPROVED") {
      await answerCallback(callbackQuery, "Waiting for approval");
      await editOrSendMenu(message, statusMessage(student), waitingMenu);
      return;
    }

    const subjectKey = action.split(":")[1];
    await answerCallback(callbackQuery, "Choose grade");
    await editOrSendMenu(message, gradeListMessage(subjectKey), gradeMenu(subjectKey));
    return;
  }

  if (action.startsWith("grade:")) {
    if (student.accessStatus !== "APPROVED") {
      await answerCallback(callbackQuery, "Waiting for approval");
      await editOrSendMenu(message, statusMessage(student), waitingMenu);
      return;
    }

    const [, subjectKey, grade] = action.split(":");
    const subject = await db.getSubjectGradeAssets(subjectKey, grade);
    const asset = subject?.assets?.[0] || db.buildGradeAsset(subjectKey, grade);
    await answerCallback(callbackQuery, `Sending Grade ${grade} PDF`);

    if (asset.publicUrl) {
      try {
        await sendDocument(
          chatId,
          asset.publicUrl,
          escapeHtml(asset.title),
          gradeBackMenu(subjectKey)
        );
        await editOrSendMenu(message, `Sent <b>${escapeHtml(asset.title)}</b>.`, gradeBackMenu(subjectKey)).catch(() => {});
      } catch (error) {
        console.error("Could not send grade PDF:", error.message);
        await editOrSendMenu(message, missingGradeAssetMessage(subjectKey, grade, asset), gradeBackMenu(subjectKey));
      }
      return;
    }

    await editOrSendMenu(message, missingGradeAssetMessage(subjectKey, grade, asset), gradeBackMenu(subjectKey));
  }
}

async function handleAdminCallback(callbackQuery) {
  const chatId = callbackQuery.message.chat.id;
  const messageId = callbackQuery.message.message_id;
  const [, action, targetTelegramId] = callbackQuery.data.split(":");

  if (!isAdmin(callbackQuery.from)) {
    await answerCallback(callbackQuery, "Admin only");
    return;
  }

  if (action === "approve") {
    await answerCallback(callbackQuery, "Approving student...");
    const student = await approveByTelegramId(chatId, targetTelegramId, callbackQuery.from.id, false);
    await editMessage(chatId, messageId, `✅ Approved <b>${escapeHtml(student.firstName)} ${escapeHtml(student.lastName)}</b>.`);
    return;
  }

  if (action === "reject") {
    await answerCallback(callbackQuery, "Rejecting student...");
    const student = await db.rejectStudent(targetTelegramId, callbackQuery.from.id);
    await editMessage(chatId, messageId, `Rejected <b>${escapeHtml(student.firstName)} ${escapeHtml(student.lastName)}</b>.`);
    await sendMessage(student.telegramId, "Your payment is not approved yet. Please contact admin again with correct proof.", waitingMenu).catch((error) => {
      console.error("Could not notify rejected student:", error.message);
    });
  }
}

async function approveByTelegramId(adminChatId, targetTelegramId, adminTelegramId, notifyAdmin = true) {
  const student = await db.approveStudent(targetTelegramId, adminTelegramId);
  if (notifyAdmin) {
    await sendMessage(adminChatId, `Approved ${escapeHtml(student.firstName)} ${escapeHtml(student.lastName)}.`);
  }
  await sendMessage(student.telegramId, homeMessage(student), subjectMenu).catch((error) => {
    console.error("Could not notify approved student:", error.message);
  });
  db.finalizeApprovalRecords(student, adminTelegramId).catch((error) => {
    console.error("Could not finalize approval records:", error.message);
  });
  return student;
}

async function notifyAdmin(student) {
  if (!ADMIN_CHAT_ID) {
    console.log(`New pending student ${student.telegramId}: ${student.firstName} ${student.lastName}. Set ADMIN_CHAT_ID to receive bot messages.`);
    return;
  }

  await sendMessage(ADMIN_CHAT_ID, adminNotice(student), adminDecisionMenu(student)).catch((error) => {
    console.error("Could not notify admin:", error.message);
  });
}

function formatStudents(students) {
  return students
    .map((student) => {
      const name = `${student.firstName || "-"} ${student.lastName || ""}`.trim();
      const username = student.telegramUsername ? `@${student.telegramUsername}` : "no username";
      return `${escapeHtml(name)} | ${escapeHtml(username)} | ${student.accessStatus}`;
    })
    .join("\n");
}

function pendingApprovalMenu(students) {
  return {
    inline_keyboard: students.map((student) => [
      {
        text: buttonName(student),
        callback_data: `admin:approve:${student.telegramId}`
      }
    ])
  };
}

function adminDecisionMenu(student) {
  return {
    inline_keyboard: [
      [{ text: `Approve ${buttonName(student)}`, callback_data: `admin:approve:${student.telegramId}` }],
      [{ text: `Reject ${buttonName(student)}`, callback_data: `admin:reject:${student.telegramId}` }]
    ]
  };
}

function adminCommandTarget(student) {
  const name = `${student.firstName || ""} ${student.lastName || ""}`.trim();
  return name || student.telegramId;
}

function buttonName(student) {
  return adminCommandTarget(student).slice(0, 40);
}

function cleanName(value) {
  return value.replace(/\s+/g, " ").slice(0, 60);
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
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
