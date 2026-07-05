const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();
const bucket = process.env.SUPABASE_STORAGE_BUCKET || "subjects";
const grades = [9, 10, 11, 12];

async function main() {
  const entrancePackage = await prisma.package.upsert({
    where: { slug: "grade-12-social-science-10-day" },
    update: {
      title: "10-Day Grade 12 Social Science Reading Challenge",
      description: "High-yield short notes for matric entrance preparation.",
      gradeRange: "9-12",
      durationDays: 10,
      status: "ACTIVE"
    },
    create: {
      slug: "grade-12-social-science-10-day",
      title: "10-Day Grade 12 Social Science Reading Challenge",
      description: "High-yield short notes for matric entrance preparation.",
      gradeRange: "9-12",
      durationDays: 10,
      status: "ACTIVE"
    }
  });

  const subjects = [
    { slug: "history", title: "History", titleAm: "ታሪክ", sortOrder: 1 },
    { slug: "geography", title: "Geography", titleAm: "ጂኦግራፊ", sortOrder: 2 },
    { slug: "economics", title: "Economics", titleAm: "ኢኮኖሚክስ", sortOrder: 3 }
  ];

  for (const item of subjects) {
    const subject = await prisma.subject.upsert({
      where: { slug: item.slug },
      update: {
        title: item.title,
        titleAm: item.titleAm,
        sortOrder: item.sortOrder,
        isActive: true
      },
      create: {
        slug: item.slug,
        title: item.title,
        titleAm: item.titleAm,
        sortOrder: item.sortOrder,
        isActive: true
      }
    });

    await prisma.packageSubject.upsert({
      where: {
        packageId_subjectId: {
          packageId: entrancePackage.id,
          subjectId: subject.id
        }
      },
      update: { sortOrder: item.sortOrder },
      create: {
        packageId: entrancePackage.id,
        subjectId: subject.id,
        sortOrder: item.sortOrder
      }
    });

    for (const grade of grades) {
      const filePath = `${item.slug}/grade-${grade}-short-notes.pdf`;
      await prisma.subjectAsset.upsert({
        where: {
          bucket_path: {
            bucket,
            path: filePath
          }
        },
        update: {
          title: `${item.title} Grade ${grade} Short Notes`,
          subjectId: subject.id,
          isActive: true,
          sortOrder: grade
        },
        create: {
          subjectId: subject.id,
          title: `${item.title} Grade ${grade} Short Notes`,
          description: "Upload this PDF in the matching Supabase Storage path.",
          bucket,
          path: filePath,
          mimeType: "application/pdf",
          sortOrder: grade,
          isActive: true
        }
      });
    }
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
