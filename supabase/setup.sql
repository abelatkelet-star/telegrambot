do $$ begin
  create type "RegistrationStep" as enum ('FIRST_NAME', 'LAST_NAME', 'WAITING_PAYMENT', 'APPROVED');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type "AccessStatus" as enum ('NEW', 'PENDING_PAYMENT', 'APPROVED', 'REJECTED');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type "PackageStatus" as enum ('DRAFT', 'ACTIVE', 'ARCHIVED');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type "EnrollmentStatus" as enum ('PENDING', 'ACTIVE', 'REVOKED', 'EXPIRED');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type "PaymentStatus" as enum ('WAITING_PROOF', 'UNDER_REVIEW', 'APPROVED', 'REJECTED');
exception when duplicate_object then null;
end $$;

create table if not exists "Student" (
  "id" text primary key,
  "telegramId" text not null unique,
  "telegramUsername" text,
  "telegramFirstName" text,
  "telegramLastName" text,
  "firstName" text,
  "lastName" text,
  "registrationStep" "RegistrationStep" not null default 'FIRST_NAME',
  "accessStatus" "AccessStatus" not null default 'NEW',
  "createdAt" timestamp(3) not null default current_timestamp,
  "updatedAt" timestamp(3) not null default current_timestamp
);

create table if not exists "Package" (
  "id" text primary key,
  "slug" text not null unique,
  "title" text not null,
  "description" text,
  "gradeRange" text not null,
  "durationDays" integer,
  "currency" text not null default 'ETB',
  "priceAmount" decimal(10, 2),
  "status" "PackageStatus" not null default 'ACTIVE',
  "createdAt" timestamp(3) not null default current_timestamp,
  "updatedAt" timestamp(3) not null default current_timestamp
);

create table if not exists "Enrollment" (
  "id" text primary key,
  "studentId" text not null references "Student"("id") on delete cascade on update cascade,
  "packageId" text not null references "Package"("id") on delete cascade on update cascade,
  "status" "EnrollmentStatus" not null default 'PENDING',
  "approvedAt" timestamp(3),
  "expiresAt" timestamp(3),
  "createdAt" timestamp(3) not null default current_timestamp,
  "updatedAt" timestamp(3) not null default current_timestamp,
  unique ("studentId", "packageId")
);

create table if not exists "Payment" (
  "id" text primary key,
  "studentId" text not null references "Student"("id") on delete cascade on update cascade,
  "packageId" text not null references "Package"("id") on delete cascade on update cascade,
  "status" "PaymentStatus" not null default 'WAITING_PROOF',
  "amount" decimal(10, 2),
  "currency" text not null default 'ETB',
  "proofReceiver" text not null default 'ALPHA_TUTOR_21',
  "adminNote" text,
  "reviewedBy" text,
  "reviewedAt" timestamp(3),
  "createdAt" timestamp(3) not null default current_timestamp,
  "updatedAt" timestamp(3) not null default current_timestamp
);

create table if not exists "Approval" (
  "id" text primary key,
  "studentId" text not null references "Student"("id") on delete cascade on update cascade,
  "adminId" text not null,
  "action" text not null,
  "note" text,
  "createdAt" timestamp(3) not null default current_timestamp
);

create table if not exists "Subject" (
  "id" text primary key,
  "slug" text not null unique,
  "title" text not null,
  "titleAm" text,
  "description" text,
  "sortOrder" integer not null default 0,
  "isActive" boolean not null default true,
  "createdAt" timestamp(3) not null default current_timestamp,
  "updatedAt" timestamp(3) not null default current_timestamp
);

create table if not exists "PackageSubject" (
  "packageId" text not null references "Package"("id") on delete cascade on update cascade,
  "subjectId" text not null references "Subject"("id") on delete cascade on update cascade,
  "sortOrder" integer not null default 0,
  primary key ("packageId", "subjectId")
);

create table if not exists "SubjectAsset" (
  "id" text primary key,
  "subjectId" text not null references "Subject"("id") on delete cascade on update cascade,
  "title" text not null,
  "description" text,
  "bucket" text not null,
  "path" text not null,
  "publicUrl" text,
  "mimeType" text,
  "sortOrder" integer not null default 0,
  "isActive" boolean not null default true,
  "createdAt" timestamp(3) not null default current_timestamp,
  "updatedAt" timestamp(3) not null default current_timestamp,
  unique ("bucket", "path")
);

create index if not exists "Student_accessStatus_idx" on "Student"("accessStatus");
create index if not exists "Student_telegramUsername_idx" on "Student"("telegramUsername");
create index if not exists "Enrollment_status_idx" on "Enrollment"("status");
create index if not exists "Payment_status_idx" on "Payment"("status");
create index if not exists "Payment_studentId_idx" on "Payment"("studentId");
create index if not exists "Approval_studentId_idx" on "Approval"("studentId");
create index if not exists "Approval_adminId_idx" on "Approval"("adminId");
create index if not exists "SubjectAsset_subjectId_idx" on "SubjectAsset"("subjectId");
create index if not exists "SubjectAsset_isActive_idx" on "SubjectAsset"("isActive");

insert into "Package" ("id", "slug", "title", "description", "gradeRange", "durationDays", "status", "updatedAt")
values (
  'pkg_grade_12_social_science_10_day',
  'grade-12-social-science-10-day',
  '10-Day Grade 12 Social Science Reading Challenge',
  'High-yield short notes for matric entrance preparation.',
  '9-12',
  10,
  'ACTIVE',
  current_timestamp
)
on conflict ("slug") do update set
  "title" = excluded."title",
  "description" = excluded."description",
  "gradeRange" = excluded."gradeRange",
  "durationDays" = excluded."durationDays",
  "status" = excluded."status",
  "updatedAt" = current_timestamp;

insert into "Subject" ("id", "slug", "title", "titleAm", "sortOrder", "isActive", "updatedAt")
values
  ('sub_history', 'history', 'History', 'ታሪክ', 1, true, current_timestamp),
  ('sub_geography', 'geography', 'Geography', 'ጂኦግራፊ', 2, true, current_timestamp),
  ('sub_economics', 'economics', 'Economics', 'ኢኮኖሚክስ', 3, true, current_timestamp)
on conflict ("slug") do update set
  "title" = excluded."title",
  "titleAm" = excluded."titleAm",
  "sortOrder" = excluded."sortOrder",
  "isActive" = excluded."isActive",
  "updatedAt" = current_timestamp;

insert into "PackageSubject" ("packageId", "subjectId", "sortOrder")
values
  ('pkg_grade_12_social_science_10_day', 'sub_history', 1),
  ('pkg_grade_12_social_science_10_day', 'sub_geography', 2),
  ('pkg_grade_12_social_science_10_day', 'sub_economics', 3)
on conflict ("packageId", "subjectId") do update set
  "sortOrder" = excluded."sortOrder";

insert into "SubjectAsset" ("id", "subjectId", "title", "description", "bucket", "path", "mimeType", "sortOrder", "isActive", "updatedAt")
values
  ('asset_history_grade_9_pdf', 'sub_history', 'History Grade 9 Short Notes', 'Upload this PDF in the matching Supabase Storage path.', 'subjects', 'history/grade-9-short-notes.pdf', 'application/pdf', 9, true, current_timestamp),
  ('asset_history_grade_10_pdf', 'sub_history', 'History Grade 10 Short Notes', 'Upload this PDF in the matching Supabase Storage path.', 'subjects', 'history/grade-10-short-notes.pdf', 'application/pdf', 10, true, current_timestamp),
  ('asset_history_grade_11_pdf', 'sub_history', 'History Grade 11 Short Notes', 'Upload this PDF in the matching Supabase Storage path.', 'subjects', 'history/grade-11-short-notes.pdf', 'application/pdf', 11, true, current_timestamp),
  ('asset_history_grade_12_pdf', 'sub_history', 'History Grade 12 Short Notes', 'Upload this PDF in the matching Supabase Storage path.', 'subjects', 'history/grade-12-short-notes.pdf', 'application/pdf', 12, true, current_timestamp),
  ('asset_geography_grade_9_pdf', 'sub_geography', 'Geography Grade 9 Short Notes', 'Upload this PDF in the matching Supabase Storage path.', 'subjects', 'geography/grade-9-short-notes.pdf', 'application/pdf', 9, true, current_timestamp),
  ('asset_geography_grade_10_pdf', 'sub_geography', 'Geography Grade 10 Short Notes', 'Upload this PDF in the matching Supabase Storage path.', 'subjects', 'geography/grade-10-short-notes.pdf', 'application/pdf', 10, true, current_timestamp),
  ('asset_geography_grade_11_pdf', 'sub_geography', 'Geography Grade 11 Short Notes', 'Upload this PDF in the matching Supabase Storage path.', 'subjects', 'geography/grade-11-short-notes.pdf', 'application/pdf', 11, true, current_timestamp),
  ('asset_geography_grade_12_pdf', 'sub_geography', 'Geography Grade 12 Short Notes', 'Upload this PDF in the matching Supabase Storage path.', 'subjects', 'geography/grade-12-short-notes.pdf', 'application/pdf', 12, true, current_timestamp),
  ('asset_economics_grade_9_pdf', 'sub_economics', 'Economics Grade 9 Short Notes', 'Upload this PDF in the matching Supabase Storage path.', 'subjects', 'economics/grade-9-short-notes.pdf', 'application/pdf', 9, true, current_timestamp),
  ('asset_economics_grade_10_pdf', 'sub_economics', 'Economics Grade 10 Short Notes', 'Upload this PDF in the matching Supabase Storage path.', 'subjects', 'economics/grade-10-short-notes.pdf', 'application/pdf', 10, true, current_timestamp),
  ('asset_economics_grade_11_pdf', 'sub_economics', 'Economics Grade 11 Short Notes', 'Upload this PDF in the matching Supabase Storage path.', 'subjects', 'economics/grade-11-short-notes.pdf', 'application/pdf', 11, true, current_timestamp),
  ('asset_economics_grade_12_pdf', 'sub_economics', 'Economics Grade 12 Short Notes', 'Upload this PDF in the matching Supabase Storage path.', 'subjects', 'economics/grade-12-short-notes.pdf', 'application/pdf', 12, true, current_timestamp)
on conflict ("bucket", "path") do update set
  "title" = excluded."title",
  "description" = excluded."description",
  "subjectId" = excluded."subjectId",
  "mimeType" = excluded."mimeType",
  "sortOrder" = excluded."sortOrder",
  "isActive" = excluded."isActive",
  "updatedAt" = current_timestamp;
