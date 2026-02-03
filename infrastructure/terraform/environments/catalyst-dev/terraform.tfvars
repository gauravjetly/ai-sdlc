# Catalyst Dev Environment - Variable Values

aws_region  = "us-east-1"
environment = "dev"

# VPC
vpc_cidr             = "10.0.0.0/16"
availability_zones   = ["us-east-1a", "us-east-1b"]
public_subnet_cidrs  = ["10.0.1.0/24", "10.0.2.0/24"]
private_subnet_cidrs = ["10.0.10.0/24", "10.0.11.0/24"]

# Database (small for dev)
db_instance_class    = "db.t3.micro"
db_allocated_storage = 20
db_name              = "catalyst"
db_username          = "catalyst_admin"

# Redis (small for dev)
redis_node_type = "cache.t3.micro"

# ECS (minimal for dev)
api_desired_count = 1
ui_desired_count  = 1
api_cpu           = 256
api_memory        = 512
ui_cpu            = 256
ui_memory         = 512

# SSL (empty = HTTP only, set ARN for HTTPS)
certificate_arn = ""
