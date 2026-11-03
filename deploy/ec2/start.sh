#!/bin/bash
# EC2 부팅/재배포 시 실행: 설정 동기화 → .env 생성 → 최신 이미지 pull → 기동
set -euo pipefail
export AWS_DEFAULT_REGION=ap-southeast-2
BUCKET=gaemizip-backup-493860406557-apse2
cd /opt/gaemizip
mkdir -p deploy

aws s3 cp "s3://$BUCKET/config/docker-compose.prod.yml" docker-compose.prod.yml
aws s3 cp "s3://$BUCKET/config/Caddyfile" deploy/Caddyfile

# SSM Parameter Store → .env (DuckDNS 토큰은 컨테이너에 넣지 않음)
aws ssm get-parameters-by-path --path /gaemizip/prod/ --with-decryption \
  --query 'Parameters[].[Name,Value]' --output text \
  | while IFS=$'\t' read -r name value; do
      key="${name##*/}"
      [ "$key" = "DUCKDNS_TOKEN" ] && continue
      echo "$key=$value"
    done > .env.tmp
if grep -q '=CHANGE_ME$' .env.tmp; then
  echo "Parameter Store에 CHANGE_ME 값이 남아 있음:" >&2
  grep '=CHANGE_ME$' .env.tmp | cut -d= -f1 >&2
  rm -f .env.tmp
  exit 1
fi
install -m 600 .env.tmp .env && rm -f .env.tmp

# 이미지가 private일 때만: SSM에 GHCR_TOKEN(read:packages PAT)이 있으면 로그인
if tok=$(aws ssm get-parameter --name /gaemizip/ghcr/TOKEN --with-decryption --query Parameter.Value --output text 2>/dev/null); then
  echo "$tok" | docker login ghcr.io -u freshcow --password-stdin
fi

# compose 크래시(concurrent map) 대비: 최대 3회 재시도
retry() {
  for i in 1 2 3; do
    "$@" && return 0
    echo "실패($i/3): $*" >&2
    sleep 5
  done
  return 1
}

retry docker compose -f docker-compose.prod.yml pull
retry docker compose -f docker-compose.prod.yml up -d --remove-orphans
docker image prune -f
