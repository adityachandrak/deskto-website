#!/bin/bash
# ECR login script - run before pushing images to ECR

aws ecr get-login-password --region ap-south-1 | docker login --username AWS --password-stdin 898322960338.dkr.ecr.ap-south-1.amazonaws.com

echo "ECR login successful!"