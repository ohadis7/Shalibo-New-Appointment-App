#!/usr/bin/env bash
# ── Shalibo Wellness — Prod Deploy Helper ────────────────
# This builds the custom image and pushes to ECR for ECS.
# 
# Prerequisites:
#   - Docker Desktop running
#   - AWS CLI configured with 'shalibo-eb-manage' profile
#   - jq installed
#
# Usage:
#   ./deploy.sh
# ──────────────────────────────────────────────────────────
set -euo pipefail

AWS_ACCOUNT_ID="955395538866"
AWS_REGION="eu-central-1"
ECR_REPO="shalibo-ea-custom"
ECS_CLUSTER="easyappt-cluster"
ECS_SERVICE="easyappt-service"
IMAGE_TAG="latest"

# Full ECR URI
ECR_URI="$AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/$ECR_REPO"

echo "╔════════════════════════════════════════════════╗"
echo "║   Shalibo Wellness — EA Prod Deploy           ║"
echo "╚════════════════════════════════════════════════╝"
echo ""
echo "  Target cluster : $ECS_CLUSTER"
echo "  Target service : $ECS_SERVICE"
echo "  Image          : $ECR_URI:$IMAGE_TAG"
echo ""

# ── 1. Authenticate to ECR ──
echo "🔐 Authenticating to ECR..."
aws ecr get-login-password --region "$AWS_REGION" --profile shalibo-eb-manage | \
    docker login --username AWS --password-stdin "$ECR_URI"

# ── 2. Build custom image ──
echo "🏗️  Building Docker image (linux/amd64)..."
docker buildx build \
    --platform linux/amd64 \
    -t "$ECR_REPO:$IMAGE_TAG" \
    -f "$(dirname "$0")/Dockerfile" \
    "$(dirname "$0")"

# ── 3. Tag for ECR ──
echo "🏷️  Tagging image..."
docker tag "$ECR_REPO:$IMAGE_TAG" "$ECR_URI:$IMAGE_TAG"

# ── 4. Push to ECR ──
echo "📤 Pushing image to ECR..."
docker push "$ECR_URI:$IMAGE_TAG"

# ── 5. Update ECS task definition ──
echo "📝 Updating ECS task definition..."
TASK_DEF_ARN=$(aws ecs describe-task-definition \
    --task-definition easyappt \
    --region "$AWS_REGION" \
    --profile shalibo-eb-manage \
    --query "taskDefinition.taskDefinitionArn" \
    --output text) || { echo "❌ Failed to describe task definition"; exit 1; }

echo "  Current task def: $TASK_DEF_ARN"

aws ecs describe-task-definition \
    --task-definition easyappt \
    --region "$AWS_REGION" \
    --profile shalibo-eb-manage \
    --query "taskDefinition" > /tmp/easyappt-task-def.json

# Update container image
jq ".containerDefinitions[0].image = \"$ECR_URI:$IMAGE_TAG\"" /tmp/easyappt-task-def.json > /tmp/easyappt-task-def-new.json || { echo "❌ jq failed to update image"; exit 1; }
# Also set health check
jq '.containerDefinitions[0].healthCheck = {"command": ["CMD-SHELL", "curl -f http://localhost/index.php/login || exit 1"], "interval": 30, "timeout": 5, "retries": 3, "startPeriod": 60}' /tmp/easyappt-task-def-new.json > /tmp/easyappt-task-def-final.json

# Remove non-register fields
jq 'del(.taskDefinitionArn, .revision, .status, .requiresAttributes, .compatibilities, .registeredAt, .registeredBy)' /tmp/easyappt-task-def-final.json > /tmp/easyappt-task-def-register.json

NEW_TASK_DEF_ARN=$(aws ecs register-task-definition \
    --region "$AWS_REGION" \
    --profile shalibo-eb-manage \
    --cli-input-json file:///tmp/easyappt-task-def-register.json \
    --query "taskDefinition.taskDefinitionArn" \
    --output text) || { echo "❌ Failed to register task definition"; exit 1; }

echo "  New task def: $NEW_TASK_DEF_ARN"

# ── 6. Update ECS service ──
echo "🔄 Updating ECS service..."
aws ecs update-service \
    --cluster "$ECS_CLUSTER" \
    --service "$ECS_SERVICE" \
    --task-definition "$NEW_TASK_DEF_ARN" \
    --region "$AWS_REGION" \
    --profile shalibo-eb-manage \
    --query "service.serviceName" \
    --output text

echo ""
echo "✅ Deployment triggered!"
echo "  App URL: https://appointments.shalibowellness.com"
echo "  ECS cluster: $ECS_CLUSTER"
echo "  ECS service: $ECS_SERVICE"
echo ""
echo "⏳ Monitor rollout:"
echo "  aws ecs describe-services --cluster $ECS_CLUSTER --services $ECS_SERVICE --region $AWS_REGION --profile shalibo-eb-manage"
