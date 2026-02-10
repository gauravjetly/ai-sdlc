# =====================================================
# CATALYST INFRASTRUCTURE DESIGNER - DEV ENVIRONMENT
# AWS Infrastructure as Code
# =====================================================

terraform {
  required_version = ">= 1.6.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }

  backend "s3" {
    # Backend configuration provided via CLI or tfvars
    # bucket         = "catalyst-terraform-state-<account-id>"
    # key            = "catalyst-dev/terraform.tfstate"
    # region         = "us-east-1"
    # encrypt        = true
    # dynamodb_table = "catalyst-terraform-locks"
  }
}

# =====================================================
# PROVIDER CONFIGURATION
# =====================================================

provider "aws" {
  region = var.aws_region

  default_tags {
    tags = {
      Project     = "Catalyst Infrastructure Designer"
      Environment = var.environment
      ManagedBy   = "Terraform"
      Owner       = "DevOps Team"
      CostCenter  = "Engineering"
    }
  }
}

# =====================================================
# DATA SOURCES
# =====================================================

data "aws_caller_identity" "current" {}

data "aws_availability_zones" "available" {
  state = "available"
  filter {
    name   = "zone-type"
    values = ["availability-zone"]
  }
}

# =====================================================
# MODULES
# =====================================================

module "networking" {
  source = "./modules/networking"

  project_name        = var.project_name
  environment         = var.environment
  vpc_cidr            = var.vpc_cidr
  availability_zones  = local.azs
  public_subnet_cidrs = var.public_subnet_cidrs
  private_subnet_cidrs = var.private_subnet_cidrs
}

module "database" {
  source = "./modules/database"

  project_name           = var.project_name
  environment            = var.environment
  vpc_id                 = module.networking.vpc_id
  private_subnet_ids     = module.networking.private_subnet_ids
  db_instance_class      = var.db_instance_class
  db_allocated_storage   = var.db_allocated_storage
  db_engine_version      = var.db_engine_version
  db_name                = var.db_name
  db_username            = var.db_username
  db_password            = var.db_password
  allowed_security_groups = [module.ecs.ecs_tasks_security_group_id]
}

module "redis" {
  source = "./modules/redis"

  project_name            = var.project_name
  environment             = var.environment
  vpc_id                  = module.networking.vpc_id
  private_subnet_ids      = module.networking.private_subnet_ids
  redis_node_type         = var.redis_node_type
  allowed_security_groups = [module.ecs.ecs_tasks_security_group_id]
}

module "ecr" {
  source = "./modules/ecr"

  project_name = var.project_name
  environment  = var.environment
  repositories = ["api", "ui"]
}

module "ecs" {
  source = "./modules/ecs"

  project_name              = var.project_name
  environment               = var.environment
  vpc_id                    = module.networking.vpc_id
  public_subnet_ids         = module.networking.public_subnet_ids
  private_subnet_ids        = module.networking.private_subnet_ids
  certificate_arn           = module.acm.certificate_arn

  # API Configuration
  api_image                 = "${module.ecr.repository_urls["api"]}:latest"
  api_cpu                   = var.api_cpu
  api_memory                = var.api_memory
  api_desired_count         = var.api_desired_count
  api_container_port        = var.api_container_port

  # UI Configuration
  ui_image                  = "${module.ecr.repository_urls["ui"]}:latest"
  ui_cpu                    = var.ui_cpu
  ui_memory                 = var.ui_memory
  ui_desired_count          = var.ui_desired_count
  ui_container_port         = var.ui_container_port

  # Environment Variables
  database_url              = "postgresql://${var.db_username}:${var.db_password}@${module.database.db_endpoint}/${var.db_name}"
  redis_url                 = "redis://${module.redis.redis_endpoint}:6379"
  jwt_secret                = var.jwt_secret
  api_url                   = "https://${module.route53.api_domain_name}"
}

module "s3" {
  source = "./modules/s3"

  project_name = var.project_name
  environment  = var.environment
  account_id   = data.aws_caller_identity.current.account_id
}

module "acm" {
  source = "./modules/acm"

  project_name = var.project_name
  environment  = var.environment
  domain_name  = var.domain_name
  zone_id      = var.route53_zone_id
}

module "route53" {
  source = "./modules/route53"

  project_name    = var.project_name
  environment     = var.environment
  zone_id         = var.route53_zone_id
  domain_name     = var.domain_name
  alb_dns_name    = module.ecs.alb_dns_name
  alb_zone_id     = module.ecs.alb_zone_id
}

module "iam" {
  source = "./modules/iam"

  project_name = var.project_name
  environment  = var.environment
  account_id   = data.aws_caller_identity.current.account_id
}

module "cloudwatch" {
  source = "./modules/cloudwatch"

  project_name        = var.project_name
  environment         = var.environment
  ecs_cluster_name    = module.ecs.cluster_name
  api_service_name    = module.ecs.api_service_name
  ui_service_name     = module.ecs.ui_service_name
  alb_arn_suffix      = module.ecs.alb_arn_suffix
  target_group_arn_suffix = module.ecs.api_target_group_arn_suffix
  sns_topic_arn       = module.monitoring.sns_topic_arn
}

module "monitoring" {
  source = "./modules/monitoring"

  project_name = var.project_name
  environment  = var.environment
  alert_email  = var.alert_email
}

# =====================================================
# LOCALS
# =====================================================

locals {
  azs = slice(data.aws_availability_zones.available.names, 0, 2)

  common_tags = {
    Project     = var.project_name
    Environment = var.environment
    ManagedBy   = "Terraform"
  }
}

# =====================================================
# OUTPUTS
# =====================================================

output "vpc_id" {
  description = "VPC ID"
  value       = module.networking.vpc_id
}

output "alb_dns_name" {
  description = "Application Load Balancer DNS name"
  value       = module.ecs.alb_dns_name
}

output "api_url" {
  description = "API endpoint URL"
  value       = "https://${module.route53.api_domain_name}"
}

output "ui_url" {
  description = "UI endpoint URL"
  value       = "https://${module.route53.ui_domain_name}"
}

output "database_endpoint" {
  description = "RDS database endpoint"
  value       = module.database.db_endpoint
  sensitive   = true
}

output "redis_endpoint" {
  description = "ElastiCache Redis endpoint"
  value       = module.redis.redis_endpoint
  sensitive   = true
}

output "ecr_repositories" {
  description = "ECR repository URLs"
  value       = module.ecr.repository_urls
}

output "s3_uploads_bucket" {
  description = "S3 bucket for uploads"
  value       = module.s3.uploads_bucket_name
}

output "ecs_cluster_name" {
  description = "ECS cluster name"
  value       = module.ecs.cluster_name
}

output "api_service_name" {
  description = "ECS API service name"
  value       = module.ecs.api_service_name
}

output "ui_service_name" {
  description = "ECS UI service name"
  value       = module.ecs.ui_service_name
}
