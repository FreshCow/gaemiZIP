FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .
# GPU용 CUDA 의존성(수 GB)을 피하기 위해 torch는 CPU 전용 wheel로 먼저 고정 설치
RUN pip install --no-cache-dir torch --index-url https://download.pytorch.org/whl/cpu
RUN pip install --no-cache-dir -r requirements.txt

COPY app ./app

# 빌드 시점에 모델을 미리 다운로드해 캐싱 (컨테이너 최초 기동 속도 확보)
RUN python -c "from app.model import load_pipeline; load_pipeline()"

EXPOSE 8001

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8001"]
