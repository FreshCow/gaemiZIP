from typing import Optional

import torch
from transformers import (
    AutoModelForSequenceClassification,
    AutoTokenizer,
    TextClassificationPipeline,
)

from app.config import DEVICE, MODEL_NAME

CLEAN_LABEL = "clean"

_pipeline: Optional[TextClassificationPipeline] = None


def load_pipeline() -> TextClassificationPipeline:
    """모델을 최초 1회만 로딩해 전역으로 재사용한다."""
    global _pipeline
    if _pipeline is None:
        tokenizer = AutoTokenizer.from_pretrained(MODEL_NAME)
        model = AutoModelForSequenceClassification.from_pretrained(MODEL_NAME)
        device = 0 if DEVICE == "cuda" and torch.cuda.is_available() else -1
        _pipeline = TextClassificationPipeline(
            model=model,
            tokenizer=tokenizer,
            device=device,
            top_k=None,  # 다중 라벨이므로 모든 라벨 점수를 반환
            function_to_apply="sigmoid",  # 라벨별 독립 확률 (softmax 아님)
        )
    return _pipeline


def classify(text: str) -> list[dict]:
    """text에 대한 11개 라벨 점수를 [{label, score}, ...] 형태로 반환한다."""
    pipe = load_pipeline()
    result = pipe(text, truncation=True)
    # top_k=None + 단일 입력이면 [[{label, score}, ...]] 형태로 나옴
    return result[0] if result and isinstance(result[0], list) else result
