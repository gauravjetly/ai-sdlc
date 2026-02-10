# =====================================================
# GENERAL VARIABLES
# =====================================================

variable "aws_region" {
  description = "AWS region for resources"
  type        = string
  default     = "us-east-1"
}

variable "aws_account_id" {
  description = "AWS account ID"
  type        = string
}

variable "project_name" {
  description = "Project name for resource naming"
  type        = string
  default     = "catalyst"
}

variable "environment" {
  description = "Environment name (dev, staging, prod)"
  type        = string
  default     = "dev"
}

# =====================================================
# NETWORKING VARIABLES
# =====================================================

variable "vpc_cidr" {
  description = "CIDR block for VPC"
  type        = string
  default     = "10.0.0.0/16"
}

variable "public_subnet_cidrs" {
  description = "CIDR blocks for public subnets"
  type        = list(string)
  default     = ["10.0.1.0/24", "10.0.2.0/24"]
}

variable "private_subnet_cidrs" {
  description = "CIDR blocks for private subnets"
  type        = list(string)
  default     = ["10.0.10.0/24", "10.0.11.0/24"]
}

# =====================================================
# DATABASE VARIABLES
# =====================================================

variable "db_instance_class" {
  description = "RDS instance class"
  type        = string
  default     = "db.t3.micro"
}

variable "db_allocated_storage" {
  description = "Allocated storage for RDS in GB"
  type        = number
  default     = 20
}

variable "db_engine_version" {
  description = "PostgreSQL engine version"
  type        = string
  default     = "15.4"
}

variable "db_name" {
  description = "Database name"
  type        = string
  default     = "catalyst_platform"
}

variable "db_username" {
  description = "Database master username"
  type        = string
  default     = "catalyst_admin"
}

variable "db_password" {
  description = "Database master password"
  type        = string
  sensitive   = true
}

variable "db_backup_retention_period" {
  description = "Number of days to retain backups"
  type        = number
  default     = 7
}

variable "db_multi_az" {
  description = "Enable Multi-AZ deployment"
  type        = bool
  default     = false
}

# =====================================================
# REDIS VARIABLES
# =====================================================

variable "redis_node_type" {
  description = "ElastiCache node type"
  type        = string
  default     = "cache.t3.micro"
}

variable "redis_num_cache_nodes" {
  description = "Number of cache nodes"
  type        = number
  default     = 1
}

variable "redis_engine_version" {
  description = "Redis engine version"
  type        = string
  default     = "7.0"
}

# =====================================================
# ECS VARIABLES
# =====================================================

variable "api_cpu" {
  description = "CPU units for API task (1024 = 1 vCPU)"
  type        = number
  default     = 512
}

variable "api_memory" {
  description = "Memory for API task in MB"
  type        = number
  default     = 1024
}

variable "api_desired_count" {
  description = "Desired number of API tasks"
  type        = number
  default     = 2
}

variable "api_container_port" {
  description = "Port exposed by API container"
  type        = number
  default     = 3000
}

variable "ui_cpu" {
  description = "CPU units for UI task (1024 = 1 vCPU)"
  type        = number
  default     = 256
}

variable "ui_memory" {
  description = "Memory for UI task in MB"
  type        = number
  default     = 512
}

variable "ui_desired_count" {
  description = "Desired number of UI tasks"
  type        = number
  default     = 2
}

variable "ui_container_port" {
  description = "Port exposed by UI container"
  type        = number
  default     = 80
}

# =====================================================
# APPLICATION VARIABLES
# =====================================================

variable "jwt_secret" {
  description = "JWT secret for authentication"
  type        = string
  sensitive   = true
}

variable "domain_name" {
  description = "Base domain name for the application"
  type        = string
  default     = ""
}

variable "route53_zone_id" {
  description = "Route53 hosted zone ID"
  type        = string
  default     = ""
}

variable "alert_email" {
  description = "Email address for CloudWatch alerts"
  type        = string
  default     = ""
}

# =====================================================
# AUTO SCALING VARIABLES
# =====================================================

variable "api_autoscaling_min" {
  description = "Minimum number of API tasks"
  type        = number
  default     = 1
}

variable "api_autoscaling_max" {
  description = "Maximum number of API tasks"
  type        = number
  default     = 10
}

variable "ui_autoscaling_min" {
  description = "Minimum number of UI tasks"
  type        = number
  default     = 1
}

variable "ui_autoscaling_max" {
  description = "Maximum number of UI tasks"
  type        = number
  default     = 10
}

variable "cpu_target_value" {
  description = "Target CPU utilization for auto scaling"
  type        = number
  default     = 70
}

variable "memory_target_value" {
  description = "Target memory utilization for auto scaling"
  type        = number
  default     = 80
}

# =====================================================
# TAGS
# =====================================================

variable "additional_tags" {
  description = "Additional tags for all resources"
  type        = map(string)
  default     = {}
}
