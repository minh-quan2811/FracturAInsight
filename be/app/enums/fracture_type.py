from enum import Enum

class FractureType(str, Enum):
    GREENSTICK = "greenstick"
    TRANSVERSE = "transverse"
    COMMINUTED = "comminuted"
    SPIRAL = "spiral"
    COMPOUND = "compound"
    OBLIQUE = "oblique"
    COMPRESSION = "compression"
    AVULSION = "avulsion"
    HAIRLINE = "hairline"
    LINEAR = "linear"
    SEGMENTAL = "segmental"