"""
1단계: 모델 로컬 검증용 스크립트
실행: moderation/ 디렉토리에서 `python -m scripts.test_model`
게시판에 나올 법한 문장을 넣어보고 라벨별 점수 분포를 확인해서
main.py의 TOXIC_THRESHOLD 값을 정하는 데 참고한다.
"""

from app.model import classify

SAMPLES = [
    "오늘 주가 진짜 좋다 ㅋㅋ",
    "이 xx놈 진짜 짜증나게 하네",
    "여자들은 원래 그래서 안 됨",
    "이 종목 왜 이렇게 떨어지냐 답답하네",
]

if __name__ == "__main__":
    for text in SAMPLES:
        scores = sorted(classify(text), key=lambda x: x["score"], reverse=True)
        print(f"\n[{text}]")
        for item in scores:
            print(f"  {item['label']}: {item['score']:.3f}")
