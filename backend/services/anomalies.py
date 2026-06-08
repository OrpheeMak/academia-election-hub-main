"""
Anomaly detection service
"""

import numpy as np
from typing import List, Dict, Optional
from config import settings
from models import AnomalyType, AnomalySeverity
import logging

logger = logging.getLogger(__name__)

class AnomalyDetectionService:
    """Service for detecting electoral anomalies"""
    
    @staticmethod
    def calculate_z_score(value: float, mean: float, std_dev: float) -> float:
        """Calculate Z-score"""
        if std_dev == 0:
            return 0 if value == mean else float('inf')
        return abs((value - mean) / std_dev)
    
    @staticmethod
    def calculate_quartiles(data: List[float]) -> Dict:
        """Calculate quartiles and IQR bounds"""
        if not data:
            return {'q1': 0, 'q2': 0, 'q3': 0, 'iqr': 0, 'lower_bound': 0, 'upper_bound': 0}
        
        sorted_data = sorted(data)
        q1 = np.percentile(sorted_data, 25)
        q2 = np.percentile(sorted_data, 50)
        q3 = np.percentile(sorted_data, 75)
        iqr = q3 - q1
        
        multiplier = settings.ANOMALY_IQR_MULTIPLIER
        lower_bound = q1 - multiplier * iqr
        upper_bound = q3 + multiplier * iqr
        
        return {
            'q1': float(q1),
            'q2': float(q2),
            'q3': float(q3),
            'iqr': float(iqr),
            'lower_bound': float(lower_bound),
            'upper_bound': float(upper_bound),
            'mean': float(np.mean(sorted_data)),
            'std_dev': float(np.std(sorted_data))
        }
    
    @staticmethod
    def detect_zscore_anomalies(
        samples: List[Dict],
        threshold: float = None
    ) -> List[Dict]:
        """
        Detect anomalies using Z-score method
        
        Args:
            samples: List of sample dictionaries with 'taux_participation' key
            threshold: Z-score threshold (default from config)
        
        Returns:
            List of detected anomalies
        """
        if threshold is None:
            threshold = settings.ANOMALY_ZSCORE_THRESHOLD
        
        if not samples or len(samples) < 2:
            return []
        
        values = [s.get('taux_participation', 0) for s in samples]
        mean = np.mean(values)
        std_dev = np.std(values)
        
        anomalies = []
        for i, sample in enumerate(samples):
            value = sample.get('taux_participation', 0)
            z_score = AnomalyDetectionService.calculate_z_score(value, mean, std_dev)
            
            if z_score >= threshold:
                # Determine severity
                if z_score >= 3.5:
                    severity = AnomalySeverity.CRITICAL
                elif z_score >= 3.0:
                    severity = AnomalySeverity.HIGH
                elif z_score >= 2.5:
                    severity = AnomalySeverity.MEDIUM
                else:
                    severity = AnomalySeverity.LOW
                
                anomalies.append({
                    'type': AnomalyType.ZSCORE,
                    'severity': severity,
                    'score': min(100, z_score * 20),
                    'description': f'Z-score anomaly: {z_score:.2f}σ from mean',
                    'details': {
                        'z_score': z_score,
                        'value': value,
                        'mean': mean,
                        'std_dev': std_dev,
                        'threshold': threshold
                    },
                    **sample
                })
        
        return anomalies
    
    @staticmethod
    def detect_iqr_anomalies(
        samples: List[Dict],
        multiplier: float = None
    ) -> List[Dict]:
        """
        Detect anomalies using IQR method
        
        Args:
            samples: List of sample dictionaries
            multiplier: IQR multiplier (default from config)
        
        Returns:
            List of detected anomalies
        """
        if multiplier is None:
            multiplier = settings.ANOMALY_IQR_MULTIPLIER
        
        if not samples or len(samples) < 4:
            return []
        
        values = [s.get('taux_participation', 0) for s in samples]
        quartiles = AnomalyDetectionService.calculate_quartiles(values)
        
        anomalies = []
        for sample in samples:
            value = sample.get('taux_participation', 0)
            
            if value < quartiles['lower_bound'] or value > quartiles['upper_bound']:
                # Determine severity
                if value < 5 or value > 100:
                    severity = AnomalySeverity.CRITICAL
                else:
                    severity = AnomalySeverity.HIGH
                
                anomalies.append({
                    'type': AnomalyType.IQR,
                    'severity': severity,
                    'score': min(100, abs(value - quartiles['q2']) / quartiles['iqr'] * 20) if quartiles['iqr'] > 0 else 0,
                    'description': f'IQR anomaly: value {value:.2f}% outside bounds [{quartiles["lower_bound"]:.2f}%, {quartiles["upper_bound"]:.2f}%]',
                    'details': {
                        'value': value,
                        'lower_bound': quartiles['lower_bound'],
                        'upper_bound': quartiles['upper_bound'],
                        'q1': quartiles['q1'],
                        'q3': quartiles['q3'],
                        'iqr': quartiles['iqr']
                    },
                    **sample
                })
        
        return anomalies
    
    @staticmethod
    def check_participation_rate(
        rate: float,
        config: Dict = None
    ) -> Optional[Dict]:
        """
        Check if participation rate is valid
        
        Args:
            rate: Participation rate percentage
            config: Configuration dictionary
        
        Returns:
            Anomaly dictionary or None
        """
        if config is None:
            config = {
                'min': settings.ANOMALY_MIN_PARTICIPATION_RATE,
                'max': settings.ANOMALY_MAX_PARTICIPATION_RATE
            }
        
        min_rate = config.get('min', settings.ANOMALY_MIN_PARTICIPATION_RATE)
        max_rate = config.get('max', settings.ANOMALY_MAX_PARTICIPATION_RATE)
        
        if rate < min_rate or rate > max_rate:
            severity = AnomalySeverity.CRITICAL if rate < 5 or rate > 105 else AnomalySeverity.HIGH
            
            return {
                'type': AnomalyType.PARTICIPATION_RATE,
                'severity': severity,
                'score': 80 if rate < min_rate else 85,
                'description': f'Participation rate {rate:.2f}% outside normal range [{min_rate}%, {max_rate}%]',
                'details': {
                    'rate': rate,
                    'min_threshold': min_rate,
                    'max_threshold': max_rate
                }
            }
        
        return None
    
    @staticmethod
    def check_total_votes(
        total_votes: int,
        registered_voters: int,
        config: Dict = None
    ) -> Optional[Dict]:
        """
        Check if total votes is valid
        
        Args:
            total_votes: Total votes received
            registered_voters: Total registered voters
            config: Configuration dictionary
        
        Returns:
            Anomaly dictionary or None
        """
        if registered_voters == 0:
            return None
        
        if config is None:
            config = {'max_ratio': settings.ANOMALY_VOTES_TO_REGISTERED_RATIO_MAX}
        
        max_ratio = config.get('max_ratio', settings.ANOMALY_VOTES_TO_REGISTERED_RATIO_MAX)
        ratio = total_votes / registered_voters
        
        if ratio > max_ratio:
            severity = AnomalySeverity.CRITICAL if ratio > 1.2 else AnomalySeverity.HIGH
            
            return {
                'type': AnomalyType.TOTAL_VOTES,
                'severity': severity,
                'score': 90 if ratio > 1.2 else 75,
                'description': f'Total votes {total_votes} exceeds registered voters {registered_voters} (ratio: {ratio:.2%})',
                'details': {
                    'total_votes': total_votes,
                    'registered_voters': registered_voters,
                    'ratio': ratio,
                    'max_allowed_ratio': max_ratio
                }
            }
        
        return None
    
    @staticmethod
    def detect_all_anomalies(
        samples: List[Dict],
        config: Dict = None
    ) -> List[Dict]:
        """
        Detect all types of anomalies
        
        Args:
            samples: List of sample dictionaries
            config: Configuration dictionary
        
        Returns:
            Deduplicated list of detected anomalies
        """
        anomalies = []
        
        # Z-score detection
        anomalies.extend(AnomalyDetectionService.detect_zscore_anomalies(samples))
        
        # IQR detection
        anomalies.extend(AnomalyDetectionService.detect_iqr_anomalies(samples))
        
        # Business rule checks
        for sample in samples:
            # Check participation rate
            anomaly = AnomalyDetectionService.check_participation_rate(
                sample.get('taux_participation', 0),
                config
            )
            if anomaly:
                anomaly.update(sample)
                anomalies.append(anomaly)
            
            # Check total votes
            anomaly = AnomalyDetectionService.check_total_votes(
                sample.get('voix', 0),
                sample.get('registered_voters', 0),
                config
            )
            if anomaly:
                anomaly.update(sample)
                anomalies.append(anomaly)
        
        # Deduplicate by (bureau_id, type)
        seen = set()
        unique_anomalies = []
        for anomaly in anomalies:
            key = (anomaly.get('bureau_id'), anomaly.get('type'))
            if key not in seen:
                seen.add(key)
                unique_anomalies.append(anomaly)
        
        return unique_anomalies
    
    @staticmethod
    def evaluate_overall_severity(anomalies: List[Dict]) -> str:
        """
        Evaluate overall severity from list of anomalies
        
        Args:
            anomalies: List of anomaly dictionaries
        
        Returns:
            Overall severity level
        """
        if not anomalies:
            return AnomalySeverity.NONE
        
        severities = [AnomalySeverity(a.get('severity', AnomalySeverity.LOW)) for a in anomalies]
        
        if AnomalySeverity.CRITICAL in severities:
            return AnomalySeverity.CRITICAL
        elif AnomalySeverity.HIGH in severities:
            return AnomalySeverity.HIGH
        elif AnomalySeverity.MEDIUM in severities:
            return AnomalySeverity.MEDIUM
        elif AnomalySeverity.LOW in severities:
            return AnomalySeverity.LOW
        
        return AnomalySeverity.NONE

# Create service instance
anomaly_service = AnomalyDetectionService()
