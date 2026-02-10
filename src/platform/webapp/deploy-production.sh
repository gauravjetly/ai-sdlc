#!/bin/bash
set -e

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║     Deltek Harmony - Production Deployment Script         ║${NC}"
echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo ""

# Check prerequisites
echo -e "${YELLOW}Checking prerequisites...${NC}"

if ! command -v docker &> /dev/null; then
    echo -e "${RED}❌ Docker not found. Please install Docker first.${NC}"
    exit 1
fi

if ! command -v kubectl &> /dev/null; then
    echo -e "${RED}❌ kubectl not found. Please install kubectl first.${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Prerequisites checked${NC}"
echo ""

# Choose deployment target
echo -e "${YELLOW}Select deployment target:${NC}"
echo "1) Docker Compose (Local/Development)"
echo "2) Kubernetes (Production)"
echo "3) Build Docker Images Only"
read -p "Enter choice [1-3]: " choice

case $choice in
    1)
        echo -e "${BLUE}Deploying with Docker Compose...${NC}"
        
        # Check if .env exists
        if [ ! -f .env ]; then
            echo -e "${YELLOW}⚠️  .env file not found. Creating from .env.example...${NC}"
            cp .env.example .env
            echo -e "${YELLOW}Please edit .env with your actual credentials!${NC}"
            read -p "Press enter when ready to continue..."
        fi
        
        # Build and start services
        echo -e "${BLUE}Building Docker images...${NC}"
        docker-compose build
        
        echo -e "${BLUE}Starting services...${NC}"
        docker-compose up -d
        
        echo ""
        echo -e "${GREEN}✅ Deployment complete!${NC}"
        echo ""
        echo "Services are now running:"
        echo "  🌐 Web UI:    http://localhost"
        echo "  🔧 API:       http://localhost:3000"
        echo "  🗄️  Postgres: localhost:5432"
        echo "  💾 Redis:     localhost:6379"
        echo ""
        echo "To view logs:    docker-compose logs -f"
        echo "To stop:         docker-compose down"
        ;;
        
    2)
        echo -e "${BLUE}Deploying to Kubernetes...${NC}"
        
        # Check if kubectl is configured
        if ! kubectl cluster-info &> /dev/null; then
            echo -e "${RED}❌ kubectl not configured. Please configure kubectl first.${NC}"
            exit 1
        fi
        
        # Build images (should be pushed to registry in production)
        echo -e "${BLUE}Building Docker images...${NC}"
        docker build -t harmony-api:latest .
        docker build -t harmony-webapp:latest ./webapp
        
        # In production, you would push to a registry:
        echo -e "${YELLOW}⚠️  In production, push images to your registry:${NC}"
        echo "  docker tag harmony-api:latest your-registry/harmony-api:latest"
        echo "  docker push your-registry/harmony-api:latest"
        echo "  docker tag harmony-webapp:latest your-registry/harmony-webapp:latest"
        echo "  docker push your-registry/harmony-webapp:latest"
        echo ""
        read -p "Press enter when images are pushed to registry..."
        
        # Create namespace
        echo -e "${BLUE}Creating namespace...${NC}"
        kubectl apply -f k8s/base/namespace.yaml
        
        # Create secrets (should be done via sealed-secrets or external secrets in production)
        echo -e "${YELLOW}Creating secrets...${NC}"
        echo -e "${YELLOW}⚠️  In production, use proper secret management (Sealed Secrets, Vault, etc.)${NC}"
        
        # Apply Kubernetes manifests
        echo -e "${BLUE}Applying Kubernetes manifests...${NC}"
        kubectl apply -f k8s/base/
        
        # Wait for deployments
        echo -e "${BLUE}Waiting for deployments to be ready...${NC}"
        kubectl wait --for=condition=available --timeout=300s \
            deployment/harmony-api deployment/harmony-webapp -n deltek-harmony
        
        echo ""
        echo -e "${GREEN}✅ Kubernetes deployment complete!${NC}"
        echo ""
        echo "To check status:"
        echo "  kubectl get pods -n deltek-harmony"
        echo "  kubectl get svc -n deltek-harmony"
        echo "  kubectl get ingress -n deltek-harmony"
        echo ""
        echo "To view logs:"
        echo "  kubectl logs -f deployment/harmony-api -n deltek-harmony"
        echo "  kubectl logs -f deployment/harmony-webapp -n deltek-harmony"
        ;;
        
    3)
        echo -e "${BLUE}Building Docker images...${NC}"
        
        # Build API image
        echo -e "${YELLOW}Building API image...${NC}"
        docker build -t harmony-api:latest .
        
        # Build webapp image
        echo -e "${YELLOW}Building webapp image...${NC}"
        docker build -t harmony-webapp:latest ./webapp
        
        echo ""
        echo -e "${GREEN}✅ Docker images built successfully!${NC}"
        echo ""
        echo "Images created:"
        echo "  🔧 harmony-api:latest"
        echo "  🌐 harmony-webapp:latest"
        echo ""
        echo "To run locally:"
        echo "  docker-compose up -d"
        echo ""
        echo "To push to registry:"
        echo "  docker tag harmony-api:latest your-registry/harmony-api:latest"
        echo "  docker push your-registry/harmony-api:latest"
        ;;
        
    *)
        echo -e "${RED}Invalid choice${NC}"
        exit 1
        ;;
esac

echo ""
echo -e "${GREEN}🚀 Deltek Harmony deployment script complete!${NC}"
