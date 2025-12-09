CREATE TABLE "analytics_tool_daily" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"agent_id" uuid NOT NULL,
	"date" timestamp NOT NULL,
	"tool_name" text NOT NULL,
	"execution_count" integer DEFAULT 0 NOT NULL,
	"success_count" integer DEFAULT 0 NOT NULL,
	"failure_count" integer DEFAULT 0 NOT NULL,
	"total_execution_time_ms" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tool_executions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"agent_id" uuid NOT NULL,
	"tool_id" uuid,
	"tool_name" text NOT NULL,
	"success" boolean NOT NULL,
	"error_message" text,
	"execution_time_ms" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "analytics_tool_daily" ADD CONSTRAINT "analytics_tool_daily_agent_id_agents_id_fk" FOREIGN KEY ("agent_id") REFERENCES "public"."agents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tool_executions" ADD CONSTRAINT "tool_executions_agent_id_agents_id_fk" FOREIGN KEY ("agent_id") REFERENCES "public"."agents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tool_executions" ADD CONSTRAINT "tool_executions_tool_id_agent_tools_id_fk" FOREIGN KEY ("tool_id") REFERENCES "public"."agent_tools"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "analytics_tool_daily_idx" ON "analytics_tool_daily" USING btree ("agent_id","date","tool_name");--> statement-breakpoint
CREATE INDEX "tool_executions_agent_idx" ON "tool_executions" USING btree ("agent_id");--> statement-breakpoint
CREATE INDEX "tool_executions_created_idx" ON "tool_executions" USING btree ("created_at");