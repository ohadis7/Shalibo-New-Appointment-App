# Shalibo Wellness — Build & Push Custom EA Docker Image
# Run this from: C:\Users\osunm\Desktop\shalibo-ea-custom\

$AWS_ACCOUNT = "955395538866"
$REGION      = "eu-central-1"
$ECR_REPO    = "shalibo-ea-custom"
$IMAGE_TAG   = "latest"
$ECR_URI     = "$AWS_ACCOUNT.dkr.ecr.$REGION.amazonaws.com/$ECR_REPO"

Write-Host "=== Shalibo Wellness — Custom EA Build ===" -ForegroundColor Cyan

# Step 1: Login to ECR
Write-Host "`n[1/4] Logging in to ECR..." -ForegroundColor Yellow
& "C:\Program Files\Amazon\AWSCLIV2\aws.exe" ecr get-login-password --region $REGION |
  docker login --username AWS --password-stdin "$AWS_ACCOUNT.dkr.ecr.$REGION.amazonaws.com"

# Step 2: Create ECR repo if it doesn't exist
Write-Host "`n[2/4] Creating ECR repository (if needed)..." -ForegroundColor Yellow
& "C:\Program Files\Amazon\AWSCLIV2\aws.exe" ecr create-repository --repository-name $ECR_REPO --region $REGION 2>$null
Write-Host "Repository ready: $ECR_REPO"

# Step 3: Build Docker image
Write-Host "`n[3/4] Building Docker image..." -ForegroundColor Yellow
docker build -t "${ECR_REPO}:${IMAGE_TAG}" .
docker tag "${ECR_REPO}:${IMAGE_TAG}" "${ECR_URI}:${IMAGE_TAG}"

# Step 4: Push to ECR
Write-Host "`n[4/4] Pushing to ECR..." -ForegroundColor Yellow
docker push "${ECR_URI}:${IMAGE_TAG}"

Write-Host "`n=== Done! ===" -ForegroundColor Green
Write-Host "Image: ${ECR_URI}:${IMAGE_TAG}" -ForegroundColor Green
Write-Host "`nNext step: Update ECS service to use this image" -ForegroundColor Cyan
