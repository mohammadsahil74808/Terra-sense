"""
TerraSense — Risk Engine
Combines static terrain susceptibility with dynamic rainfall triggers.
Enforces frozen production constants from metadata.json:
- RAINFALL_SCALE = 165.22
- EXTREME_RAINFALL_7D = 349.392
- EXTREME_RISK_FLOOR = 0.67
- LOW_LIMIT = 0.33
- HIGH_LIMIT = 0.66
"""

import logging
from typing import Dict, Any, Tuple
from .config import settings

logger = logging.getLogger(__name__)

class RiskEngine:
    """
    Evaluates final operational landslide risk:
    STATIC SUSCEPTIBILITY × DYNAMIC RAINFALL TRIGGER = FINAL RISK
    """

    @staticmethod
    def calculate_risk(
        susceptibility: float,
        rainfall_7d: float
    ) -> Dict[str, Any]:
        """
        Calculates operational risk score, risk level, and extreme rainfall flag.
        
        Formula:
        1. trigger = rainfall_7d / RAINFALL_SCALE
        2. raw_risk = susceptibility * trigger
        3. extreme_rainfall = rainfall_7d >= EXTREME_RAINFALL_7D
        4. If extreme_rainfall:
               risk_score = max(EXTREME_RISK_FLOOR, raw_risk)
           else:
               risk_score = raw_risk
        5. Clamped strictly to [0.0, 1.0]
        6. Risk level:
               LOW       < 0.33
               MODERATE  >= 0.33 and < 0.66
               HIGH      >= 0.66
        """
        # Ensure non-negative inputs
        s = max(0.0, min(1.0, float(susceptibility)))
        r7 = max(0.0, float(rainfall_7d))

        # Dynamic rainfall trigger
        trigger = r7 / settings.RAINFALL_SCALE
        raw_risk = s * trigger

        # Check extreme rainfall condition
        is_extreme = r7 >= settings.EXTREME_RAINFALL_7D

        if is_extreme:
            # When extreme rainfall p95 threshold is breached, apply frozen risk floor
            final_score = max(settings.EXTREME_RISK_FLOOR, raw_risk)
        else:
            final_score = raw_risk

        # Clamp strictly to [0.0, 1.0]
        final_score = round(max(0.0, min(1.0, final_score)), 4)

        # Classify risk level
        if final_score < settings.LOW_LIMIT:
            level = "LOW"
        elif final_score < settings.HIGH_LIMIT:
            level = "MODERATE"
        else:
            level = "HIGH"

        return {
            "risk_score": final_score,
            "risk_level": level,
            "extreme_rainfall": is_extreme,
            "rainfall_trigger": round(trigger, 4),
            "susceptibility": round(s, 4),
        }

risk_engine = RiskEngine()
