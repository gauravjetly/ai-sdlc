# Catalyst Dev Environment - Main Configuration
# Deploys Infrastructure Designer to dedicated Catalyst AWS account

terraform {
  required_version = ">= 1.5.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.5"
    }
  }

  backend "s3" {
    bucket         = "catalyst-terraform-state"
    key            = "catalyst-dev/terraform.tfstate"
    region         = "us-east-1"
    encrypt        = true
    dynamodb_table = "catalyst-terraform-locks"
  }
}

provider "aws" {
  region = var.aws_region

  default_tags {
    tags = {
      Project     = "catalyst"
      Environment = var.environment
      ManagedBy   = "terraform"
      Team        = "catalyst-dev"
    }
  }
}

# Random suffix for unique resource names
resource "random_id" "suffix" {
  byte_length = 4
}

locals {
  name_prefix = "catalyst-${var.environment}"
  common_tags = {
    Project     = "catalyst"
    Environment = var.environment
  }
}

# VPC Module
module "vpc" {
  source = "../../modules/vpc"

  name_prefix         = local.name_prefix
  vpc_cidr            = var.vpc_cidr
  availability_zones  = var.availability_zones
  public_subnet_cidrs = var.public_subnet_cidrs
  private_subnet_cidrs = var.private_subnet_cidrs
  tags                = local.common_tags
}

# ECR Repositories
module "ecr" {
  source = "../../modules/ecr"

  name_prefix = local.name_prefix
  repositories = ["api", "ui"]
  tags        = local.common_tags
}

# RDS PostgreSQL
module "rds" {
  source = "../../modules/rds"

  name_prefix        = local.name_prefix
  vpc_id             = module.vpc.vpc_id
  subnet_ids         = module.vpc.private_subnet_ids
  instance_class     = var.db_instance_class
  allocated_storage  = var.db_allocated_storage
  database_name      = var.db_name
  master_username    = var.db_username
  allowed_security_groups = [module.ecs.ecs_security_group_id]
  tags               = local.common_tags
}

# ElastiCache Redis
module "elasticache" {
  source = "../../modules/elasticache"

  name_prefix    = local.name_prefix
  vpc_id         = module.vpc.vpc_id
  subnet_ids     = module.vpc.private_subnet_ids
  node_type      = var.redis_node_type
  allowed_security_groups = [module.ecs.ecs_security_group_id]
  tags           = local.common_tags
}

# Application Load Balancer
module "alb" {
  source = "../../modules/alb"

  name_prefix       = local.name_prefix
  vpc_id            = module.vpc.vpc_id
  public_subnet_ids = module.vpc.public_subnet_ids
  certificate_arn   = var.certificate_arn
  tags              = local.common_tags
}

# IAM Roles
module "iam" {
  source = "../../modules/iam"

  name_prefix     = local.name_prefix
  ecr_repository_arns = module.ecr.repository_arns
  s3_bucket_arns  = [module.s3.bucket_arn]
  tags            = local.common_tags
}

# S3 Bucket for uploads
module "s3" {
  source = "../../modules/s3"

  name_prefix = local.name_prefix
  bucket_name = "${local.name_prefix}-uploads-${random_id.suffix.hex}"
  tags        = local.common_tags
}

# ECS Cluster and Services
module "ecs" {
  source = "../../modules/ecs"

  name_prefix           = local.name_prefix
  vpc_id                = module.vpc.vpc_id
  private_subnet_ids    = module.vpc.private_subnet_ids
  alb_target_group_arn  = module.alb.target_group_arn
  alb_security_group_id = module.alb.security_group_id

  # Task configuration
  api_image             = "${module.ecr.repository_urls["api"]}:latest"
  ui_image              = "${module.ecr.repository_urls["ui"]}:latest"
  task_execution_role_arn = module.iam.task_execution_role_arn
  task_role_arn         = module.iam.task_role_arn

  # Environment variables
  database_url          = module.rds.connection_string
  redis_url             = module.elasticache.connection_string
  s3_bucket             = module.s3.bucket_name

  # Scaling
  api_desired_count     = var.api_desired_count
  ui_desired_count      = var.ui_desired_count
  api_cpu               = var.api_cpu
  api_memory            = var.api_memory
  ui_cpu                = var.ui_cpu
  ui_memory             = var.ui_memory

  tags                  = local.common_tags
}
