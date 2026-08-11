from contextlib import asynccontextmanager

from fastapi import FastAPI
from pydantic import BaseModel

from app.config import TOXIC_THRESHOLD
from app.model import CLEAN_LABEL, classify, load_pipeline


@asynccontextmanager
async def lifespan(app: FastAPI):
    load_pipeline()  # 서버 기동 시 모델을 미리 로딩 (요청마다 로딩 방지)
    yield


app = FastAPI(title="gaemiZIP Moderation Service", lifespan=lifespan)


class ModerateRequest(BaseModel):
    text: str


class ModerateResponse(BaseModel):
    is_blocked: bool
    clean_score: float
    labels: dict[str, float]
    triggered_labels: list[str]


@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/moderate", response_model=ModerateResponse)
def moderate(req: ModerateRequest):
    scores = classify(req.text)
    label_scores = {item["label"]: item["score"] for item in scores}
    clean_score = label_scores.get(CLEAN_LABEL, 0.0)

    triggered_labels = [
        label
        for label, score in label_scores.items()
        if label != CLEAN_LABEL and score >= TOXIC_THRESHOLD
    ]

    return ModerateResponse(
        is_blocked=len(triggered_labels) > 0,
        clean_score=clean_score,
        labels=label_scores,
        triggered_labels=triggered_labels,
    )
