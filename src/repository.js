const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();
const PACKAGE_SLUG = process.env.PACKAGE_SLUG || "grade-12-social-science-10-day";
const STORAGE_BUCKET = process.env.SUPABASE_STORAGE_BUCKET || "subjects";
const SUPABASE_URL = (process.env.SUPABASE_URL || "").replace(/\/$/, "");

function profileData(from) {
  return {
    telegramUsername: from.username || null,
    telegramFirstName: from.first_name || null,
    telegramLastName: from.last_name || null
  };
}

async function getOrCreateStudent(from) {
  return prisma.student.upsert({
    where: { telegramId: String(from.id) },
    update: profileData(from),
    create: {
      telegramId: String(from.id),
      ...profileData(from)
    }
  });
}

async function setFirstName(telegramId, firstName) {
  return prisma.student.update({
    where: { telegramId: String(telegramId) },
    data: {
      firstName,
      registrationStep: "LAST_NAME",
      accessStatus: "NEW"
    }
  });
}

async function setLastNameAndPending(telegramId, lastName) {
  return prisma.student.update({
    where: { telegramId: String(telegramId) },
    data: {
      lastName,
      registrationStep: "WAITING_PAYMENT",
      accessStatus: "PENDING_PAYMENT"
    }
  });
}

async function ensurePendingEnrollmentAndPayment(student) {
  const pkg = await prisma.package.findUniqueOrThrow({ where: { slug: PACKAGE_SLUG } });

  await prisma.enrollment.upsert({
    where: {
      studentId_packageId: {
        studentId: student.id,
        packageId: pkg.id,
      }
    },
    update: { status: "PENDING" },
    create: {
      studentId: student.id,
      packageId: pkg.id,
      status: "PENDING"
    }
  });

  const existingPayment = await prisma.payment.findFirst({
    where: {
      studentId: student.id,
      packageId: pkg.id,
      status: { in: ["WAITING_PROOF", "UNDER_REVIEW", "APPROVED"] }
    }
  });

  if (!existingPayment) {
    await prisma.payment.create({
      data: {
        studentId: student.id,
        packageId: pkg.id,
        status: "WAITING_PROOF",
        proofReceiver: process.env.ADMIN_USERNAME || "ALPHA_TUTOR_21"
      }
    });
  }
}

async function getPendingStudents() {
  return prisma.student.findMany({
    where: { accessStatus: "PENDING_PAYMENT" },
    orderBy: { createdAt: "asc" }
  });
}

async function getAllStudents() {
  return prisma.student.findMany({ orderBy: { createdAt: "desc" } });
}

async function findStudentsForAdminTarget(target, accessStatus) {
  const value = String(target || "").trim();
  if (!value) return [];

  if (/^\d+$/.test(value)) {
    const student = await prisma.student.findUnique({ where: { telegramId: value } });
    if (!student) return [];
    if (accessStatus && student.accessStatus !== accessStatus) return [];
    return [student];
  }

  const parts = value.split(/\s+/);
  const firstName = parts[0];
  const lastName = parts.slice(1).join(" ");
  const where = {
    firstName: { equals: firstName, mode: "insensitive" }
  };

  if (lastName) {
    where.lastName = { equals: lastName, mode: "insensitive" };
  }

  if (accessStatus) {
    where.accessStatus = accessStatus;
  }

  return prisma.student.findMany({
    where,
    orderBy: { createdAt: "asc" }
  });
}

async function approveStudent(telegramId, adminTelegramId) {
  const pkg = await prisma.package.findUniqueOrThrow({ where: { slug: PACKAGE_SLUG } });
  const student = await prisma.student.update({
    where: { telegramId: String(telegramId) },
    data: {
      accessStatus: "APPROVED",
      registrationStep: "APPROVED"
    }
  });

  await prisma.enrollment.upsert({
    where: {
      studentId_packageId: {
        studentId: student.id,
        packageId: pkg.id,
      }
    },
    update: {
      status: "ACTIVE",
      approvedAt: new Date()
    },
    create: {
      studentId: student.id,
      packageId: pkg.id,
      status: "ACTIVE",
      approvedAt: new Date()
    }
  });

  await prisma.payment.updateMany({
    where: {
      studentId: student.id,
      packageId: pkg.id,
      status: { not: "APPROVED" }
    },
    data: {
      status: "APPROVED",
      reviewedBy: String(adminTelegramId),
      reviewedAt: new Date()
    }
  });

  await prisma.approval.create({
    data: {
      studentId: student.id,
      adminId: String(adminTelegramId),
      action: "APPROVED"
    }
  });

  return student;
}

async function rejectStudent(telegramId, adminTelegramId) {
  const student = await prisma.student.update({
    where: { telegramId: String(telegramId) },
    data: {
      accessStatus: "REJECTED",
      registrationStep: "WAITING_PAYMENT"
    }
  });

  await prisma.payment.updateMany({
    where: {
      studentId: student.id,
      status: { not: "APPROVED" }
    },
    data: {
      status: "REJECTED",
      reviewedBy: String(adminTelegramId),
      reviewedAt: new Date()
    }
  });

  await prisma.approval.create({
    data: {
      studentId: student.id,
      adminId: String(adminTelegramId),
      action: "REJECTED"
    }
  });

  return student;
}

async function getSubjectAssets(subjectSlug) {
  const subject = await prisma.subject.findUnique({
    where: { slug: subjectSlug },
    include: {
      assets: {
        where: { isActive: true },
        orderBy: { sortOrder: "asc" }
      }
    }
  });

  if (!subject) return null;

  return {
    ...subject,
    assets: subject.assets.map((asset) => ({
      ...asset,
      publicUrl: asset.publicUrl || buildPublicUrl(asset.bucket, asset.path)
    }))
  };
}

function buildPublicUrl(bucket, objectPath) {
  if (!SUPABASE_URL) return "";
  return `${SUPABASE_URL}/storage/v1/object/public/${bucket || STORAGE_BUCKET}/${objectPath}`;
}

module.exports = {
  getOrCreateStudent,
  setFirstName,
  setLastNameAndPending,
  ensurePendingEnrollmentAndPayment,
  getPendingStudents,
  getAllStudents,
  findStudentsForAdminTarget,
  approveStudent,
  rejectStudent,
  getSubjectAssets
};
