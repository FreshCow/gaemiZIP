import os

MODEL_NAME = os.getenv("MODEL_NAME", "smilegate-ai/kor_unsmile")
TOXIC_THRESHOLD = float(os.getenv("TOXIC_THRESHOLD", "0.5"))
DEVICE = os.getenv("DEVICE", "cpu")  # "cpu" 또는 "cuda"
