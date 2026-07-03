#!/bin/bash
# Build and Push script for Phase 1 & 2
# Usage: ./scripts/build-and-push.sh [git-sha]

set -e

REPO_NAME="deskto-web"
REGION="ap-south-1"
ACCOUNT_ID="898322960338"
ECR_URI="${ACCOUNT_ID}.dkr.ecr.${REGION}.amazonaws.com/${REPO_NAME}"

# Get git SHA or use provided argument
GIT_SHA="${1:-$(git rev-parse --short HEAD)}"

echo "========================================="
echo "Phase 1 & 2 - Build and Push"
echo "========================================="
echo "ECR Repository: ${ECR_URI}"
echo "Git SHA: ${GIT_SHA}"
echo ""

# Login to ECR
echo "Logging in to ECR..."
aws ecr get-login-password --region ${REGION} | docker login --username AWS --password-stdin ${ECR_URI}

# Build Docker image
echo "Building Docker image..."
docker build -t ${REPO_NAME}:build .

# Tag image with git SHA
echo "Tagging image with SHA: sha-${GIT_SHA}"
docker tag ${REPO_NAME}:build ${ECR_URI}:sha-${GIT_SHA}

# Tag as latest (only moved after successful deploy)
echo "Tagging image as :latest (candidate)"
docker tag ${REPO_NAME}:build ${ECR_URI}:latest

# Push both tags
echo "Pushing :sha-${GIT_SHA}..."
docker push ${ECR_URI}:sha-${GIT_SHA}

echo "Pushing :latest candidate..."
docker push ${ECR_URI}:latest

echo ""
echo "========================================="
echo "Build & Push Complete"
echo "========================================="
echo "Image pushed: ${ECR_URI}"
echo "Tags: :sha-${GIT_SHA}, :latest"
echo ""
echo "Next step: Update :latest after successful deploy"
