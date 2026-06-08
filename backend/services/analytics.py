"""
Analytics service for election statistics
"""

from typing import List, Dict, Optional
from collections import defaultdict
import logging

logger = logging.getLogger(__name__)

class AnalyticsService:
    """Service for calculating election statistics and analytics"""
    
    @staticmethod
    def calculate_province_stats(
        resultats: List[Dict],
        anomalies: List[Dict],
        predictions: List[Dict]
    ) -> Dict[str, Dict]:
        """
        Calculate statistics grouped by province
        
        Args:
            resultats: List of result dictionaries
            anomalies: List of anomaly dictionaries
            predictions: List of prediction dictionaries
        
        Returns:
            Dictionary with province statistics
        """
        stats = defaultdict(lambda: {
            'total_bureaux': 0,
            'total_voix': 0,
            'taux_participation_moyen': 0,
            'anomalies_count': 0,
            'anomalies_by_severity': defaultdict(int),
            'predictions_count': 0,
            'bureaux_ids': set()
        })
        
        # Process resultats
        for resultat in resultats:
            province_id = resultat.get('province_id')
            if province_id:
                stats[province_id]['total_voix'] += resultat.get('voix', 0)
                stats[province_id]['taux_participation_moyen'] += resultat.get('taux_participation', 0)
                stats[province_id]['bureaux_ids'].add(resultat.get('bureau_id'))
        
        # Count bureaux and average participation
        for province_id, stat in stats.items():
            stat['total_bureaux'] = len(stat['bureaux_ids'])
            if stat['total_bureaux'] > 0:
                stat['taux_participation_moyen'] /= stat['total_bureaux']
            del stat['bureaux_ids']
        
        # Process anomalies
        for anomaly in anomalies:
            province_id = anomaly.get('province_id')
            if province_id:
                stats[province_id]['anomalies_count'] += 1
                severity = anomaly.get('severity', 'none')
                stats[province_id]['anomalies_by_severity'][severity] += 1
        
        # Process predictions
        for prediction in predictions:
            province_id = prediction.get('province_id')
            if province_id:
                stats[province_id]['predictions_count'] += 1
        
        # Convert defaultdict to dict
        return {
            province_id: {
                'province_id': province_id,
                **dict(stat),
                'anomalies_by_severity': dict(stat['anomalies_by_severity'])
            }
            for province_id, stat in stats.items()
        }
    
    @staticmethod
    def calculate_election_stats(
        election_id: str,
        resultats: List[Dict],
        anomalies: List[Dict],
        predictions: List[Dict]
    ) -> Dict:
        """
        Calculate overall election statistics
        
        Args:
            election_id: Election ID
            resultats: List of result dictionaries
            anomalies: List of anomaly dictionaries
            predictions: List of prediction dictionaries
        
        Returns:
            Election statistics dictionary
        """
        from datetime import datetime
        
        # Initialize stats
        total_voix = 0
        total_participation = 0
        anomalies_by_severity = defaultdict(int)
        
        # Calculate from resultats
        for resultat in resultats:
            total_voix += resultat.get('voix', 0)
            total_participation += resultat.get('taux_participation', 0)
        
        if resultats:
            avg_participation = total_participation / len(resultats)
        else:
            avg_participation = 0
        
        # Count anomalies by severity
        for anomaly in anomalies:
            severity = anomaly.get('severity', 'none')
            anomalies_by_severity[severity] += 1
        
        # Calculate prediction quality
        if predictions:
            confidences = [p.get('confidence', 0) for p in predictions]
            avg_confidence = sum(confidences) / len(confidences)
        else:
            avg_confidence = 0
        
        return {
            'election_id': election_id,
            'total_resultats': len(resultats),
            'total_anomalies': len(anomalies),
            'anomalies_by_severity': dict(anomalies_by_severity),
            'total_predictions': len(predictions),
            'prediction_quality': avg_confidence * 100,
            'taux_participation_moyen': avg_participation,
            'total_voix': total_voix,
            'timestamp': datetime.utcnow().isoformat()
        }
    
    @staticmethod
    def calculate_candidate_stats(
        resultats: List[Dict]
    ) -> Dict[str, Dict]:
        """
        Calculate statistics grouped by candidate
        
        Args:
            resultats: List of result dictionaries
        
        Returns:
            Dictionary with candidate statistics
        """
        stats = defaultdict(lambda: {
            'total_voix': 0,
            'total_pourcentage': 0,
            'nombre_bureaux': 0,
            'pourcentage_moyen': 0
        })
        
        for resultat in resultats:
            candidat_id = resultat.get('candidat_id')
            if candidat_id:
                stats[candidat_id]['total_voix'] += resultat.get('voix', 0)
                stats[candidat_id]['total_pourcentage'] += resultat.get('pourcentage', 0)
                stats[candidat_id]['nombre_bureaux'] += 1
        
        # Calculate averages
        for candidat_id, stat in stats.items():
            if stat['nombre_bureaux'] > 0:
                stat['pourcentage_moyen'] = stat['total_pourcentage'] / stat['nombre_bureaux']
        
        return {
            candidat_id: dict(stat)
            for candidat_id, stat in stats.items()
        }
    
    @staticmethod
    def get_top_candidates(
        resultats: List[Dict],
        limit: int = 5
    ) -> List[Dict]:
        """
        Get top candidates by votes
        
        Args:
            resultats: List of result dictionaries
            limit: Number of top candidates to return
        
        Returns:
            List of top candidates
        """
        candidate_stats = AnalyticsService.calculate_candidate_stats(resultats)
        
        top_candidates = sorted(
            candidate_stats.items(),
            key=lambda x: x[1]['total_voix'],
            reverse=True
        )[:limit]
        
        return [
            {
                'candidat_id': candidat_id,
                **stats
            }
            for candidat_id, stats in top_candidates
        ]
    
    @staticmethod
    def calculate_anomaly_rate(anomalies: List[Dict], total_samples: int) -> float:
        """
        Calculate anomaly detection rate
        
        Args:
            anomalies: List of anomaly dictionaries
            total_samples: Total number of samples
        
        Returns:
            Anomaly rate as percentage
        """
        if total_samples == 0:
            return 0
        
        return (len(anomalies) / total_samples) * 100
    
    @staticmethod
    def get_real_time_stats(
        recent_resultats: List[Dict],
        recent_anomalies: List[Dict]
    ) -> Dict:
        """
        Get real-time statistics for dashboard
        
        Args:
            recent_resultats: Recent results
            recent_anomalies: Recent anomalies
        
        Returns:
            Real-time statistics
        """
        from datetime import datetime
        
        total_voix = sum(r.get('voix', 0) for r in recent_resultats)
        avg_participation = (
            sum(r.get('taux_participation', 0) for r in recent_resultats) / len(recent_resultats)
            if recent_resultats else 0
        )
        
        critical_anomalies = sum(
            1 for a in recent_anomalies
            if a.get('severity') == 'critical'
        )
        
        return {
            'timestamp': datetime.utcnow().isoformat(),
            'total_voix': total_voix,
            'taux_participation': avg_participation,
            'total_resultats': len(recent_resultats),
            'total_anomalies': len(recent_anomalies),
            'critical_anomalies': critical_anomalies,
            'anomaly_rate': AnalyticsService.calculate_anomaly_rate(
                recent_anomalies,
                len(recent_resultats)
            )
        }

# Create service instance
analytics_service = AnalyticsService()
