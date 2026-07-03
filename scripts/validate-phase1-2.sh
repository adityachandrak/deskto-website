#!/bin/bash
# Phase 1 & 2 Validation Script
# Run this to verify all Phase 1 & 2 setup is complete

echo "=========================================="
echo "PHASE 1 & 2 - VALIDATION REPORT"
echo "=========================================="
echo ""

echo "1. DOCKER CONFIGURATION"
echo "   Docker Version: $(docker --version 2>/dev/null | cut -d' ' -f3 || echo 'Not found')"
echo "   Docker Daemon: $(docker info -q 2>/dev/null || echo 'Not running')"
echo ""

echo "2. DOCKER IMAGE"
echo "   Build Command: docker build -t deskto-website:test ."
echo "   Run Command: docker run -d -p 8080:80 deskto-website:test"
echo "   Clean Command: docker stop deskto-test && docker rm deskto-test && docker rmi deskto-website:test"
echo ""

echo "3. DOCKERIGNORE"
echo "   Contents:"
cat .dockerignore | sed 's/^/   /'
echo ""

echo "4. ECR REPOSITORY"
aws ecr describe-repositories --repository-names deskto-web 2>/dev/null | jq -r '.repositories[0] | "   URI: \(.repositoryUri)\n   Created: \(.createdAt)\n   Scan on Push: \(.imageScanningConfiguration.scanOnPush)\n   Tag Mutability: \(.imageTagMutability)"' || echo "   Repository not found"
echo ""

echo "5. ECR LIFECYCLE POLICY"
aws ecr get-lifecycle-policy --repository-name deskto-web 2>/dev/null | jq -r '.lifecyclePolicyText | fromjson | .rules[] | "   Rule: \(.description)\n   Selection: \(.selection.tagStatus) / \(.selection.countType) \(.selection.countNumber) \(.selection.countUnit)\n   Action: \(.action.type)"' || echo "   No lifecycle policy found"
echo ""

echo "6. ECR IMAGE TAGGING STRATEGY"
echo "   Build Script: ./scripts/build-and-push.sh [git-sha]"
echo "   Tags: sha-<gitsha> and :latest"
echo "   Current Image:"
aws ecr describe-images --repository-name deskto-web --image-ids imageTag=sha-$(git rev-parse --short HEAD) 2>/dev/null | jq -r '.imageDetails[0] | "   Digest: \(.imageDigest)\n   Pushed: \(.imagePushedAt)"' || echo "   Not found"
echo ""

echo "7. IMAGE IN ECR"
aws ecr describe-images --repository-name deskto-web --max-results 10 --sort-by=imagePushedAt --order-by=DESC 2>/dev/null | jq -r '.imageDetails[].imageTags[]? // "No tags"' | sort | uniq | head -10 | sed 's/^/   /' || echo "   No images found"
echo ""

echo "=========================================="
echo "VALIDATION COMPLETE"
echo "=========================================="
echo ""
echo "NEXT STEPS:"
echo "- Create GitHub Actions workflow for CI/CD"
echo "- Use :sha-<gitsha> tag for deployments"
echo "- Move :latest only after successful deploy (instant rollback)"
echo "  - After successful deploy: docker tag sha-new sha-last && docker push"
echo ""
echo "RUN BEFORE DEPLOY:"
echo "./scripts/ecr-login.sh"
echo "./scripts/build-and-push.sh $(git rev-parse --short HEAD)"