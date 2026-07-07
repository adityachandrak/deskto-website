#!/bin/bash
# SSM Secrets Management Script
# Usage: ./scripts/ssm-secrets.sh [list|get|set|delete] [path] [value]

set -e

PROJECT="/deskto-website"
REGION="${AWS_REGION:-ap-south-1}"

command="${1:-list}"
path="${2:-${PROJECT}}"
value="${3:-}"

echo "=========================================="
echo "SSM Secrets Management"
echo "=========================================="
echo "Project: ${PROJECT}"
echo "Region: ${REGION}"
echo ""

case "$command" in
  list)
    echo "Listing parameters under: ${path}"
    aws ssm get-parameters-by-path \
      --path "${path}" \
      --recursive \
      --region "${REGION}" \
      --query "Parameters[*].{Name:Name,Type:Type,Version:Version}" \
      --output table
    ;;

  get)
    if [ -z "$path" ]; then
      echo "Error: path required for get command"
      echo "Usage: $0 get /deskto-website/staging/database-url"
      exit 1
    fi
    echo "Getting parameter: ${path}"
    aws ssm get-parameter \
      --name "${path}" \
      --region "${REGION}" \
      --query "Parameter.{Name:Name,Value:Value,Type:Type}" \
      --output json
    ;;

  set)
    if [ -z "$path" ] || [ -z "$value" ]; then
      echo "Error: path and value required for set command"
      echo "Usage: $0 set /deskto-website/staging/database-url 'postgresql://...'"
      exit 1
    fi
    echo "Setting parameter: ${path}"
    read -p "Is this a SecureString? (y/n): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
      type="SecureString"
    else
      type="String"
    fi
    aws ssm put-parameter \
      --name "${path}" \
      --value "${value}" \
      --type "${type}" \
      --overwrite \
      --region "${REGION}"
    echo "✅ Parameter set successfully"
    ;;

  delete)
    if [ -z "$path" ]; then
      echo "Error: path required for delete command"
      echo "Usage: $0 delete /deskto-website/staging/database-url"
      exit 1
    fi
    echo "Deleting parameter: ${path}"
    read -p "Are you sure? (y/n): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
      aws ssm delete-parameter \
        --name "${path}" \
        --region "${REGION}"
      echo "✅ Parameter deleted successfully"
    else
      echo "Cancelled"
    fi
    ;;

  *)
    echo "Usage: $0 {list|get|set|delete} [path] [value]"
    echo ""
    echo "Commands:"
    echo "  list              - List all parameters"
    echo "  get <path>        - Get a specific parameter"
    echo "  set <path> <val>  - Set a parameter (will prompt for type)"
    echo "  delete <path>     - Delete a parameter"
    echo ""
    echo "Examples:"
    echo "  $0 list"
    echo "  $0 get /deskto-website/deploy/username"
    echo "  $0 set /deskto-website/staging/api-key 'abc123'"
    echo "  $0 delete /deskto-website/staging/api-key"
    exit 1
    ;;
esac
