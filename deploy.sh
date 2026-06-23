#!/bin/bash
set -e

AWS_ACCOUNT="955395538866"
REGION="eu-central-1"
ECR_REPO="shalibo-ea-custom"
IMAGE_TAG="latest"
ECR_URI="${AWS_ACCOUNT}.dkr.ecr.${REGION}.amazonaws.com/${ECR_REPO}"
CLUSTER_NAME="easyappt-cluster"
SERVICE_NAME="easyappt-service"

echo "=== Shalibo Wellness — Custom EA Deploy ==="

# 1. Login to ECR
echo "Logging in to ECR..."
aws ecr get-login-password --region ${REGION} | docker login --username AWS --password-stdin "${AWS_ACCOUNT}.dkr.ecr.${REGION}.amazonaws.com"

# 2. Build Docker image for linux/amd64
echo "Building Docker image for linux/amd64..."
docker build --platform linux/amd64 -t "${ECR_REPO}:${IMAGE_TAG}" .

# 3. Tag and push to ECR
echo "Pushing image to ECR..."
docker tag "${ECR_REPO}:${IMAGE_TAG}" "${ECR_URI}:${IMAGE_TAG}"
docker push "${ECR_URI}:${IMAGE_TAG}"

# 4. Register new task definition revision
echo "Registering new ECS task definition revision..."
# Retrieve current task definition
TASK_DEF_JSON=$(aws ecs describe-task-definition --task-definition easyappt --region ${REGION})

# Clean and update the image URI
CLEAN_TASK_DEF=$(echo "${TASK_DEF_JSON}" | jq '.taskDefinition | {
  family,
  taskRoleArn,
  executionRoleArn,
  networkMode,
  containerDefinitions,
  volumes,
  placementConstraints,
  requiresCompatibilities,
  cpu,
  memory
}')

# Update image in container definitions
UPDATED_TASK_DEF=$(echo "${CLEAN_TASK_DEF}" | jq --arg img "${ECR_URI}:${IMAGE_TAG}" '.containerDefinitions[0].image = $img')

# Fix container health check to use /index.php/login (root / returns 500 in EA)
UPDATED_TASK_DEF=$(echo "${UPDATED_TASK_DEF}" | jq '.containerDefinitions[0].healthCheck.command = ["CMD-SHELL", "curl -f http://localhost/index.php/login || exit 1"]')

# Register
NEW_TASK_DEF_ARN=$(aws ecs register-task-definition --cli-input-json "${UPDATED_TASK_DEF}" --region ${REGION} --query "taskDefinition.taskDefinitionArn" --output text)
echo "Registered new task definition: ${NEW_TASK_DEF_ARN}"

# 5. Update ECS service
echo "Updating ECS service to use task definition ${NEW_TASK_DEF_ARN}..."
aws ecs update-service --cluster "${CLUSTER_NAME}" --service "${SERVICE_NAME}" --task-definition "${NEW_TASK_DEF_ARN}" --region ${REGION}

echo "=== Deploy Triggered Successfully ==="
