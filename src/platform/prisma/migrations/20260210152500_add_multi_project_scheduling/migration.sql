-- CreateEnum
CREATE TYPE "ProjectStatusEnum" AS ENUM ('draft', 'scheduled', 'in_progress', 'completed', 'cancelled', 'blocked');

-- CreateEnum
CREATE TYPE "ProjectPriorityEnum" AS ENUM ('LOW', 'NORMAL', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "PhaseStatusEnum" AS ENUM ('pending', 'in_progress', 'completed', 'failed', 'skipped', 'blocked');

-- CreateTable
CREATE TABLE "scheduled_projects" (
    "id" TEXT NOT NULL,
    "name" VARCHAR(200) NOT NULL,
    "description" TEXT,
    "delivery_date" TIMESTAMPTZ NOT NULL,
    "scheduled_start_date" TIMESTAMPTZ,
    "status" "ProjectStatusEnum" NOT NULL DEFAULT 'draft',
    "priority" "ProjectPriorityEnum" NOT NULL DEFAULT 'NORMAL',
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "estimated_effort_hours" DOUBLE PRECISION,
    "actual_effort_hours" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "created_by" VARCHAR(100) NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "completed_at" TIMESTAMPTZ,

    CONSTRAINT "scheduled_projects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "project_phases" (
    "id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "phase" VARCHAR(20) NOT NULL,
    "status" "PhaseStatusEnum" NOT NULL DEFAULT 'pending',
    "assigned_agent_id" VARCHAR(100),
    "started_at" TIMESTAMPTZ,
    "completed_at" TIMESTAMPTZ,
    "output_artifacts" JSONB NOT NULL DEFAULT '[]',
    "notes" TEXT,
    "duration_minutes" INTEGER,

    CONSTRAINT "project_phases_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "scheduled_projects_status_idx" ON "scheduled_projects"("status");

-- CreateIndex
CREATE INDEX "scheduled_projects_priority_idx" ON "scheduled_projects"("priority");

-- CreateIndex
CREATE INDEX "scheduled_projects_delivery_date_idx" ON "scheduled_projects"("delivery_date");

-- CreateIndex
CREATE INDEX "scheduled_projects_created_by_idx" ON "scheduled_projects"("created_by");

-- CreateIndex
CREATE INDEX "project_phases_status_idx" ON "project_phases"("status");

-- CreateIndex
CREATE INDEX "project_phases_assigned_agent_id_idx" ON "project_phases"("assigned_agent_id");

-- CreateIndex
CREATE INDEX "project_phases_project_id_idx" ON "project_phases"("project_id");

-- CreateIndex
CREATE UNIQUE INDEX "project_phases_project_id_phase_key" ON "project_phases"("project_id", "phase");

-- AddForeignKey
ALTER TABLE "project_phases" ADD CONSTRAINT "project_phases_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "scheduled_projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;
