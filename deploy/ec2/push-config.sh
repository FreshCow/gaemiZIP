#!/bin/bash
# 로컬에서 실행: 배포 설정을 S3로 올림 (EC2가 부팅/재배포 때 가져감)
# 사용: AWS_PROFILE=gaemizip deploy/ec2/push-config.sh
set -euo pipefail
BUCKET=gaemizip-backup-493860406557-apse2
cd "$(dirname "$0")/../.."
aws s3 cp docker-compose.prod.yml "s3://$BUCKET/config/docker-compose.prod.yml"
aws s3 cp deploy/Caddyfile "s3://$BUCKET/config/Caddyfile"
aws s3 cp deploy/ec2/start.sh "s3://$BUCKET/config/start.sh"
aws s3 cp deploy/ec2/gaemizip.service "s3://$BUCKET/config/gaemizip.service"
