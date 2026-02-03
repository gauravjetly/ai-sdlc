-- CreateEnum for Template Categories
CREATE TYPE "TemplateCategory" AS ENUM ('network_foundation', 'compute_platform', 'storage_database', 'security', 'monitoring', 'fullstack', 'custom');

-- CreateEnum for Template Visibility
CREATE TYPE "TemplateVisibility" AS ENUM ('private', 'organization', 'public');

-- CreateEnum for Layer Types
CREATE TYPE "LayerType" AS ENUM ('network', 'platform', 'devops', 'fullstack');

-- CreateEnum for Design Status
CREATE TYPE "DesignStatus" AS ENUM ('draft', 'validated', 'deploying', 'deployed', 'failed', 'archived');

-- CreateEnum for Layer Deployment Status
CREATE TYPE "LayerDeploymentStatus" AS ENUM ('pending', 'validating', 'deploying', 'deployed', 'failed', 'rolled_back');

-- CreateTable: DesignTemplate
CREATE TABLE "design_templates" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "category" "TemplateCategory" NOT NULL,
    "visibility" "TemplateVisibility" NOT NULL DEFAULT 'private',
    "templateData" JSONB NOT NULL,
    "layerType" "LayerType",
    "thumbnail" TEXT,
    "version" TEXT NOT NULL DEFAULT '1.0.0',
    "tags" TEXT[],
    "usageCount" INTEGER NOT NULL DEFAULT 0,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "design_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable: TemplateVersion
CREATE TABLE "template_versions" (
    "id" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "versionNumber" TEXT NOT NULL,
    "templateData" JSONB NOT NULL,
    "changeLog" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "template_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable: VisualDesign
CREATE TABLE "visual_designs" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "designData" JSONB NOT NULL,
    "status" "DesignStatus" NOT NULL DEFAULT 'draft',
    "environment" "Environment",
    "cloud" "CloudProvider",
    "region" TEXT,
    "estimatedMonthlyCost" DOUBLE PRECISION,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "lastDeployedAt" TIMESTAMP(3),

    CONSTRAINT "visual_designs_pkey" PRIMARY KEY ("id")
);

-- CreateTable: DesignVersion
CREATE TABLE "design_versions" (
    "id" TEXT NOT NULL,
    "designId" TEXT NOT NULL,
    "versionNumber" INTEGER NOT NULL,
    "designData" JSONB NOT NULL,
    "changeLog" TEXT,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "design_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable: DesignWorkflow
CREATE TABLE "design_workflows" (
    "id" TEXT NOT NULL,
    "designId" TEXT NOT NULL,
    "currentLayer" "LayerType",
    "currentStep" INTEGER NOT NULL DEFAULT 1,
    "networkComplete" BOOLEAN NOT NULL DEFAULT false,
    "platformComplete" BOOLEAN NOT NULL DEFAULT false,
    "devopsComplete" BOOLEAN NOT NULL DEFAULT false,
    "networkData" JSONB,
    "platformData" JSONB,
    "devopsData" JSONB,
    "environments" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "design_workflows_pkey" PRIMARY KEY ("id")
);

-- CreateTable: DesignLayer
CREATE TABLE "design_layers" (
    "id" TEXT NOT NULL,
    "workflowId" TEXT NOT NULL,
    "designId" TEXT NOT NULL,
    "layerType" "LayerType" NOT NULL,
    "layerName" TEXT NOT NULL,
    "layerData" JSONB NOT NULL,
    "status" "LayerDeploymentStatus" NOT NULL DEFAULT 'pending',
    "deployedAt" TIMESTAMP(3),
    "dependsOn" TEXT[],
    "envOverrides" JSONB,
    "terraformOutput" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "design_layers_pkey" PRIMARY KEY ("id")
);

-- CreateTable: DeployedResource
CREATE TABLE "deployed_resources" (
    "id" TEXT NOT NULL,
    "designId" TEXT NOT NULL,
    "nodeId" TEXT NOT NULL,
    "resourceId" TEXT NOT NULL,
    "resourceType" TEXT NOT NULL,
    "resourceArn" TEXT,
    "cloud" "CloudProvider" NOT NULL,
    "region" TEXT NOT NULL,
    "environment" "Environment" NOT NULL,
    "status" "ResourceStatus" NOT NULL,
    "config" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "deployed_resources_pkey" PRIMARY KEY ("id")
);

-- CreateTable: DesignDeploymentLog
CREATE TABLE "design_deployment_logs" (
    "id" TEXT NOT NULL,
    "designId" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "level" "LogLevel" NOT NULL,
    "message" TEXT NOT NULL,
    "metadata" JSONB,

    CONSTRAINT "design_deployment_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable: TerraformState
CREATE TABLE "terraform_states" (
    "id" TEXT NOT NULL,
    "designId" TEXT NOT NULL,
    "stateVersion" INTEGER NOT NULL DEFAULT 1,
    "tfState" JSONB NOT NULL,
    "backend" TEXT NOT NULL DEFAULT 'local',
    "backendConfig" JSONB,
    "locked" BOOLEAN NOT NULL DEFAULT false,
    "lockedBy" TEXT,
    "lockedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "terraform_states_pkey" PRIMARY KEY ("id")
);

-- CreateTable: AWSCredential
CREATE TABLE "aws_credentials" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "accessKeyId" TEXT NOT NULL,
    "secretAccessKey" TEXT NOT NULL,
    "sessionToken" TEXT,
    "region" TEXT NOT NULL DEFAULT 'us-east-1',
    "accountId" TEXT,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "expiresAt" TIMESTAMP(3),

    CONSTRAINT "aws_credentials_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "design_templates_category_layerType_visibility_idx" ON "design_templates"("category", "layerType", "visibility");
CREATE INDEX "design_templates_createdBy_idx" ON "design_templates"("createdBy");
CREATE INDEX "design_templates_usageCount_idx" ON "design_templates"("usageCount");

CREATE UNIQUE INDEX "template_versions_templateId_versionNumber_key" ON "template_versions"("templateId", "versionNumber");
CREATE INDEX "template_versions_createdAt_idx" ON "template_versions"("createdAt");

CREATE INDEX "visual_designs_status_idx" ON "visual_designs"("status");
CREATE INDEX "visual_designs_environment_idx" ON "visual_designs"("environment");
CREATE INDEX "visual_designs_createdBy_idx" ON "visual_designs"("createdBy");
CREATE INDEX "visual_designs_createdAt_idx" ON "visual_designs"("createdAt");

CREATE UNIQUE INDEX "design_versions_designId_versionNumber_key" ON "design_versions"("designId", "versionNumber");
CREATE INDEX "design_versions_createdAt_idx" ON "design_versions"("createdAt");

CREATE UNIQUE INDEX "design_workflows_designId_key" ON "design_workflows"("designId");
CREATE INDEX "design_workflows_currentLayer_idx" ON "design_workflows"("currentLayer");

CREATE UNIQUE INDEX "design_layers_workflowId_layerType_key" ON "design_layers"("workflowId", "layerType");
CREATE INDEX "design_layers_status_idx" ON "design_layers"("status");
CREATE INDEX "design_layers_layerType_idx" ON "design_layers"("layerType");

CREATE UNIQUE INDEX "deployed_resources_designId_nodeId_key" ON "deployed_resources"("designId", "nodeId");
CREATE INDEX "deployed_resources_resourceId_idx" ON "deployed_resources"("resourceId");
CREATE INDEX "deployed_resources_resourceType_idx" ON "deployed_resources"("resourceType");
CREATE INDEX "deployed_resources_status_idx" ON "deployed_resources"("status");

CREATE INDEX "design_deployment_logs_designId_idx" ON "design_deployment_logs"("designId");
CREATE INDEX "design_deployment_logs_timestamp_idx" ON "design_deployment_logs"("timestamp");

CREATE UNIQUE INDEX "terraform_states_designId_key" ON "terraform_states"("designId");
CREATE INDEX "terraform_states_locked_idx" ON "terraform_states"("locked");

CREATE UNIQUE INDEX "aws_credentials_name_key" ON "aws_credentials"("name");
CREATE INDEX "aws_credentials_isDefault_idx" ON "aws_credentials"("isDefault");

-- AddForeignKey
ALTER TABLE "template_versions" ADD CONSTRAINT "template_versions_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "design_templates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "design_versions" ADD CONSTRAINT "design_versions_designId_fkey" FOREIGN KEY ("designId") REFERENCES "visual_designs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "design_workflows" ADD CONSTRAINT "design_workflows_designId_fkey" FOREIGN KEY ("designId") REFERENCES "visual_designs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "design_layers" ADD CONSTRAINT "design_layers_workflowId_fkey" FOREIGN KEY ("workflowId") REFERENCES "design_workflows"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "deployed_resources" ADD CONSTRAINT "deployed_resources_designId_fkey" FOREIGN KEY ("designId") REFERENCES "visual_designs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "design_deployment_logs" ADD CONSTRAINT "design_deployment_logs_designId_fkey" FOREIGN KEY ("designId") REFERENCES "visual_designs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "terraform_states" ADD CONSTRAINT "terraform_states_designId_fkey" FOREIGN KEY ("designId") REFERENCES "visual_designs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
