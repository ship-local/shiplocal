-- Add project slug and tunnel target name for multi-target support

ALTER TABLE "Project" ADD COLUMN "slug" TEXT;

-- Backfill slugs from project names with global deduplication
WITH ranked AS (
  SELECT
    id,
    LOWER(
      REGEXP_REPLACE(
        REGEXP_REPLACE(TRIM("name"), '[^a-zA-Z0-9]+', '-', 'g'),
        '(^-+|-+$)',
        '',
        'g'
      )
    ) AS base_slug,
    ROW_NUMBER() OVER (
      PARTITION BY LOWER(
        REGEXP_REPLACE(
          REGEXP_REPLACE(TRIM("name"), '[^a-zA-Z0-9]+', '-', 'g'),
          '(^-+|-+$)',
          '',
          'g'
        )
      )
      ORDER BY "createdAt" ASC
    ) AS rn
  FROM "Project"
)
UPDATE "Project" p
SET "slug" = CASE
  WHEN r.base_slug = '' OR r.base_slug IS NULL THEN 'project-' || SUBSTRING(p.id FROM 1 FOR 8)
  WHEN r.rn = 1 THEN LEFT(r.base_slug, 48)
  ELSE LEFT(r.base_slug, 40) || '-' || r.rn::TEXT
END
FROM ranked r
WHERE p.id = r.id;

UPDATE "Project"
SET "slug" = 'project-' || SUBSTRING(id FROM 1 FOR 8)
WHERE "slug" IS NULL OR "slug" = '';

ALTER TABLE "Project" ALTER COLUMN "slug" SET NOT NULL;
CREATE UNIQUE INDEX "Project_slug_key" ON "Project"("slug");

ALTER TABLE "Tunnel" ADD COLUMN "name" TEXT NOT NULL DEFAULT 'web';

-- Backfill tunnel names: first tunnel per project is web, others target-2, target-3, ...
WITH ranked AS (
  SELECT
    id,
    ROW_NUMBER() OVER (PARTITION BY "projectId" ORDER BY "createdAt" ASC) AS rn
  FROM "Tunnel"
)
UPDATE "Tunnel" t
SET "name" = CASE
  WHEN r.rn = 1 THEN 'web'
  ELSE 'target-' || r.rn::TEXT
END
FROM ranked r
WHERE t.id = r.id;

CREATE UNIQUE INDEX "Tunnel_projectId_name_key" ON "Tunnel"("projectId", "name");
