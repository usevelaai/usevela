-- Step 1: Add columns as nullable first
ALTER TABLE
  "agents"
ADD
  COLUMN "user_id" text;

--> statement-breakpoint
ALTER TABLE
  "agents"
ADD
  COLUMN "slug" text;

--> statement-breakpoint
ALTER TABLE
  "conversations"
ADD
  COLUMN "agent_id" uuid;

--> statement-breakpoint
ALTER TABLE
  "documents"
ADD
  COLUMN "agent_id" uuid;

--> statement-breakpoint
ALTER TABLE
  "interface_settings"
ADD
  COLUMN "agent_id" uuid;

--> statement-breakpoint
ALTER TABLE
  "qa_sources"
ADD
  COLUMN "agent_id" uuid;

--> statement-breakpoint
ALTER TABLE
  "text_sources"
ADD
  COLUMN "agent_id" uuid;

--> statement-breakpoint
-- Step 2: Update existing agents with first user and generate slug
UPDATE
  "agents"
SET
  "user_id" = (
    SELECT
      id
    FROM
      "users"
    LIMIT
      1
  ), "slug" = lower(regexp_replace(name, '[^a-zA-Z0-9]+', '-', 'g'))
WHERE
  "user_id" IS NULL;

--> statement-breakpoint
-- Step 3: Update existing records with the first agent's id
UPDATE
  "conversations"
SET
  "agent_id" = (
    SELECT
      id
    FROM
      "agents"
    LIMIT
      1
  )
WHERE
  "agent_id" IS NULL;

--> statement-breakpoint
UPDATE
  "documents"
SET
  "agent_id" = (
    SELECT
      id
    FROM
      "agents"
    LIMIT
      1
  )
WHERE
  "agent_id" IS NULL;

--> statement-breakpoint
UPDATE
  "interface_settings"
SET
  "agent_id" = (
    SELECT
      id
    FROM
      "agents"
    LIMIT
      1
  )
WHERE
  "agent_id" IS NULL;

--> statement-breakpoint
UPDATE
  "qa_sources"
SET
  "agent_id" = (
    SELECT
      id
    FROM
      "agents"
    LIMIT
      1
  )
WHERE
  "agent_id" IS NULL;

--> statement-breakpoint
UPDATE
  "text_sources"
SET
  "agent_id" = (
    SELECT
      id
    FROM
      "agents"
    LIMIT
      1
  )
WHERE
  "agent_id" IS NULL;

--> statement-breakpoint
-- Step 4: Set columns to NOT NULL
ALTER TABLE
  "agents"
ALTER COLUMN
  "user_id"
SET
  NOT NULL;

--> statement-breakpoint
ALTER TABLE
  "agents"
ALTER COLUMN
  "slug"
SET
  NOT NULL;

--> statement-breakpoint
ALTER TABLE
  "conversations"
ALTER COLUMN
  "agent_id"
SET
  NOT NULL;

--> statement-breakpoint
ALTER TABLE
  "documents"
ALTER COLUMN
  "agent_id"
SET
  NOT NULL;

--> statement-breakpoint
ALTER TABLE
  "interface_settings"
ALTER COLUMN
  "agent_id"
SET
  NOT NULL;

--> statement-breakpoint
ALTER TABLE
  "qa_sources"
ALTER COLUMN
  "agent_id"
SET
  NOT NULL;

--> statement-breakpoint
ALTER TABLE
  "text_sources"
ALTER COLUMN
  "agent_id"
SET
  NOT NULL;

--> statement-breakpoint
-- Step 5: Add foreign key constraints
ALTER TABLE
  "agents"
ADD
  CONSTRAINT "agents_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE no ACTION;

--> statement-breakpoint
ALTER TABLE
  "conversations"
ADD
  CONSTRAINT "conversations_agent_id_agents_id_fk" FOREIGN KEY ("agent_id") REFERENCES "public"."agents"("id") ON DELETE CASCADE ON UPDATE no ACTION;

--> statement-breakpoint
ALTER TABLE
  "documents"
ADD
  CONSTRAINT "documents_agent_id_agents_id_fk" FOREIGN KEY ("agent_id") REFERENCES "public"."agents"("id") ON DELETE CASCADE ON UPDATE no ACTION;

--> statement-breakpoint
ALTER TABLE
  "interface_settings"
ADD
  CONSTRAINT "interface_settings_agent_id_agents_id_fk" FOREIGN KEY ("agent_id") REFERENCES "public"."agents"("id") ON DELETE CASCADE ON UPDATE no ACTION;

--> statement-breakpoint
ALTER TABLE
  "qa_sources"
ADD
  CONSTRAINT "qa_sources_agent_id_agents_id_fk" FOREIGN KEY ("agent_id") REFERENCES "public"."agents"("id") ON DELETE CASCADE ON UPDATE no ACTION;

--> statement-breakpoint
ALTER TABLE
  "text_sources"
ADD
  CONSTRAINT "text_sources_agent_id_agents_id_fk" FOREIGN KEY ("agent_id") REFERENCES "public"."agents"("id") ON DELETE CASCADE ON UPDATE no ACTION;

--> statement-breakpoint
ALTER TABLE
  "interface_settings"
ADD
  CONSTRAINT "interface_settings_agent_id_unique" UNIQUE("agent_id");
