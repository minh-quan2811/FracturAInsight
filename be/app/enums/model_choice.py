from enum import Enum

class ModelChoice(str, Enum):
    YOLO = "yolo"
    RFDETR = "rfdetr"