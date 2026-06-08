"""
Prediction service for electoral forecasting
"""

import numpy as np
from typing import List, Dict, Optional, Tuple
from config import settings
import logging

logger = logging.getLogger(__name__)

class PredictionService:
    """Service for electoral predictions using statistical methods"""
    
    @staticmethod
    def calculate_sma(data: List[Dict], period: int = None) -> np.ndarray:
        """
        Calculate Simple Moving Average
        
        Args:
            data: List of dictionaries with 'voix' key
            period: Moving average period (default from config)
        
        Returns:
            numpy array with SMA values
        """
        if period is None:
            period = settings.PREDICTION_SMA_PERIOD
        
        if not data or len(data) < period:
            return np.array([np.nan] * len(data))
        
        values = np.array([d.get('voix', 0) for d in data], dtype=float)
        sma = np.convolve(values, np.ones(period)/period, mode='valid')
        
        # Pad with NaN for alignment
        return np.concatenate([np.full(period - 1, np.nan), sma])
    
    @staticmethod
    def linear_regression(data: List[Dict]) -> Dict:
        """
        Calculate linear regression for vote data
        
        Args:
            data: List of dictionaries with 'voix' key
        
        Returns:
            Dictionary with regression parameters
        """
        if len(data) < 2:
            return {
                'slope': 0,
                'intercept': 0,
                'r_squared': 0,
                'std_error': 0
            }
        
        x = np.arange(len(data), dtype=float)
        y = np.array([d.get('voix', 0) for d in data], dtype=float)
        
        # Calculate coefficients
        coeffs = np.polyfit(x, y, 1)
        poly = np.poly1d(coeffs)
        y_pred = poly(x)
        
        # Calculate R²
        ss_res = np.sum((y - y_pred) ** 2)
        ss_tot = np.sum((y - np.mean(y)) ** 2)
        r_squared = 1 - (ss_res / ss_tot) if ss_tot != 0 else 0
        
        # Calculate standard error
        std_error = np.sqrt(ss_res / (len(data) - 2)) if len(data) > 2 else 0
        
        return {
            'slope': float(coeffs[0]),
            'intercept': float(coeffs[1]),
            'r_squared': float(r_squared),
            'std_error': float(std_error)
        }
    
    @staticmethod
    def predict_final_score(
        historical_data: List[Dict],
        current_participation: float,
        max_participation: float = 100.0
    ) -> Optional[Dict]:
        """
        Predict final vote count using hybrid approach
        
        Args:
            historical_data: Historical vote data
            current_participation: Current participation percentage
            max_participation: Maximum possible participation
        
        Returns:
            Prediction dictionary or None
        """
        if not historical_data or len(historical_data) < 2:
            return None
        
        # Calculate SMA
        sma_values = PredictionService.calculate_sma(historical_data)
        sma_prediction = float(np.nanmean(sma_values)) if not np.isnan(np.nanmean(sma_values)) else 0
        
        # Calculate regression
        regression = PredictionService.linear_regression(historical_data)
        
        # Predict at 100% participation
        max_x = len(historical_data) + (100 - current_participation) / current_participation * len(historical_data)
        regression_prediction = regression['intercept'] + regression['slope'] * max_x
        
        # Hybrid prediction: 40% SMA + 60% regression
        sma_weight = settings.PREDICTION_SMA_WEIGHT
        regression_weight = settings.PREDICTION_REGRESSION_WEIGHT
        
        final_prediction = (sma_weight * sma_prediction + 
                          regression_weight * max(regression_prediction, sma_prediction))
        
        # Calculate confidence
        confidence = min(
            regression['r_squared'] * 0.7 + (current_participation / 100) * 0.3,
            1.0
        )
        
        # Calculate intervals
        margin = regression['std_error'] * 1.96  # 95% confidence
        interval_low = max(0, final_prediction - margin)
        interval_high = final_prediction + margin
        
        return {
            'prediction': final_prediction,
            'interval_low': interval_low,
            'interval_high': interval_high,
            'confidence': confidence,
            'method': f'SMA({settings.PREDICTION_SMA_PERIOD}) + LR',
            'sma_component': sma_prediction,
            'regression_component': regression_prediction,
            'r_squared': regression['r_squared'],
            'std_error': regression['std_error']
        }
    
    @staticmethod
    def calculate_z_score(value: float, mean: float, std_dev: float) -> float:
        """
        Calculate Z-score for anomaly detection
        
        Args:
            value: Data point value
            mean: Mean of distribution
            std_dev: Standard deviation
        
        Returns:
            Z-score value
        """
        if std_dev == 0:
            return 0 if value == mean else float('inf')
        return (value - mean) / std_dev
    
    @staticmethod
    def evaluate_prediction_quality(predictions: List[Dict]) -> float:
        """
        Evaluate overall quality of predictions
        
        Args:
            predictions: List of prediction dictionaries
        
        Returns:
            Quality score 0-100
        """
        if not predictions:
            return 0
        
        confidences = [p.get('confidence', 0) for p in predictions]
        r_squared_values = [p.get('r_squared', 0) for p in predictions]
        
        # Check stability (how tight the intervals are)
        intervals = [p.get('interval_high', 0) - p.get('interval_low', 0) for p in predictions]
        avg_interval_width = np.mean(intervals) if intervals else 0
        max_possible_width = max([p.get('prediction', 0) * 0.2 for p in predictions]) or 1
        stability = max(0, 100 - (avg_interval_width / max_possible_width * 100))
        
        # Calculate quality score
        confidence_score = np.mean(confidences) * 100 if confidences else 0
        r_squared_score = np.mean(r_squared_values) * 100 if r_squared_values else 0
        precision_score = stability  # Reuse stability as precision
        
        quality = (
            confidence_score * 0.4 +
            r_squared_score * 0.3 +
            precision_score * 0.3
        )
        
        return min(100, max(0, quality))

# Create service instance
prediction_service = PredictionService()
