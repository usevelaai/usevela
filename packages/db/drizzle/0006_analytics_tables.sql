-- Add country_code to conversations
ALTER TABLE "conversations" ADD COLUMN "country_code" text;

-- Message feedback table
CREATE TABLE IF NOT EXISTS "message_feedback" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"message_id" uuid NOT NULL,
	"feedback" text NOT NULL,
	"session_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);

ALTER TABLE "message_feedback" ADD CONSTRAINT "message_feedback_message_id_chat_messages_id_fk" FOREIGN KEY ("message_id") REFERENCES "public"."chat_messages"("id") ON DELETE cascade ON UPDATE no action;
CREATE INDEX IF NOT EXISTS "message_feedback_message_idx" ON "message_feedback" USING btree ("message_id");

-- Analytics daily rollups
CREATE TABLE IF NOT EXISTS "analytics_daily" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"agent_id" uuid NOT NULL,
	"date" timestamp NOT NULL,
	"conversation_count" integer DEFAULT 0 NOT NULL,
	"message_count" integer DEFAULT 0 NOT NULL,
	"thumbs_up_count" integer DEFAULT 0 NOT NULL,
	"thumbs_down_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);

ALTER TABLE "analytics_daily" ADD CONSTRAINT "analytics_daily_agent_id_agents_id_fk" FOREIGN KEY ("agent_id") REFERENCES "public"."agents"("id") ON DELETE cascade ON UPDATE no action;
CREATE INDEX IF NOT EXISTS "analytics_daily_agent_date_idx" ON "analytics_daily" USING btree ("agent_id","date");

-- Analytics country daily rollups
CREATE TABLE IF NOT EXISTS "analytics_country_daily" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"agent_id" uuid NOT NULL,
	"date" timestamp NOT NULL,
	"country_code" text NOT NULL,
	"conversation_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);

ALTER TABLE "analytics_country_daily" ADD CONSTRAINT "analytics_country_daily_agent_id_agents_id_fk" FOREIGN KEY ("agent_id") REFERENCES "public"."agents"("id") ON DELETE cascade ON UPDATE no action;
CREATE INDEX IF NOT EXISTS "analytics_country_idx" ON "analytics_country_daily" USING btree ("agent_id","date","country_code");