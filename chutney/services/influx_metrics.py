"""
ChutneX Analytics - InfluxDB Metrics Service
============================================
Copyright (c) 2026 cannatoshi

Time-series metrics storage for long-term Tor network analysis.

Schema Design:
--------------
Measurements:
- tor_bandwidth: Bandwidth per node (1s resolution)
- tor_circuit: Circuit events and build times
- tor_node_status: Node health and flags
- tor_consensus: Consensus validity windows
- tor_latency: Inter-node latency measurements

Retention Tiers:
- Tier 1 (raw): 7 days, original resolution
- Tier 2 (hourly): 90 days, 1-hour aggregates
- Tier 3 (daily): 2 years, 1-day aggregates

Usage:
    from chutney.services.influx_metrics import TorMetricsWriter, TorMetricsReader
    
    # Writing
    writer = TorMetricsWriter()
    writer.write_bandwidth('node-1', 'guard', 1024, 512)
    writer.write_circuit('circ-123', 'BUILT', 450, 3)
    
    # Reading
    reader = TorMetricsReader()
    data = reader.get_bandwidth_history('node-1', hours=24)
"""

import logging
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional
from dataclasses import dataclass
from enum import Enum

from django.conf import settings
from django.utils import timezone

# InfluxDB client
try:
    from influxdb_client import InfluxDBClient, Point, WriteOptions
    from influxdb_client.client.write_api import SYNCHRONOUS
    INFLUX_AVAILABLE = True
except ImportError:
    INFLUX_AVAILABLE = False
    logging.warning("influxdb-client not installed - metrics disabled")


logger = logging.getLogger('chutney.influx_metrics')


# =============================================================================
# CONFIGURATION
# =============================================================================

@dataclass
class InfluxConfig:
    """InfluxDB configuration"""
    url: str = 'http://influxdb:8086'
    token: str = ''
    org: str = 'chutnex'
    bucket_raw: str = 'tor_metrics_raw'      # Tier 1: 7 days
    bucket_hourly: str = 'tor_metrics_hourly'  # Tier 2: 90 days
    bucket_daily: str = 'tor_metrics_daily'   # Tier 3: 2 years
    
    @classmethod
    def from_settings(cls) -> 'InfluxConfig':
        """Load config from Django settings"""
        return cls(
            url=getattr(settings, 'INFLUXDB_URL', 'http://influxdb:8086'),
            token=getattr(settings, 'INFLUXDB_TOKEN', ''),
            org=getattr(settings, 'INFLUXDB_ORG', 'chutnex'),
            bucket_raw=getattr(settings, 'INFLUXDB_BUCKET_RAW', 'tor_metrics_raw'),
            bucket_hourly=getattr(settings, 'INFLUXDB_BUCKET_HOURLY', 'tor_metrics_hourly'),
            bucket_daily=getattr(settings, 'INFLUXDB_BUCKET_DAILY', 'tor_metrics_daily'),
        )


class Measurement(str, Enum):
    """InfluxDB measurement names"""
    BANDWIDTH = 'tor_bandwidth'
    CIRCUIT = 'tor_circuit'
    NODE_STATUS = 'tor_node_status'
    CONSENSUS = 'tor_consensus'
    LATENCY = 'tor_latency'
    STREAM = 'tor_stream'
    ALERT = 'tor_alert'


# =============================================================================
# METRICS WRITER
# =============================================================================

class TorMetricsWriter:
    """
    Writes Tor metrics to InfluxDB with batching.
    
    All writes use batching for performance (5000 points, 1s flush).
    Critical events (alerts) use synchronous writes.
    """
    
    def __init__(self, config: Optional[InfluxConfig] = None):
        self.config = config or InfluxConfig.from_settings()
        self._client: Optional[InfluxDBClient] = None
        self._write_api = None
        self._sync_write_api = None
        
        if INFLUX_AVAILABLE:
            self._init_client()
    
    def _init_client(self):
        """Initialize InfluxDB client"""
        try:
            self._client = InfluxDBClient(
                url=self.config.url,
                token=self.config.token,
                org=self.config.org
            )
            
            # Batched write API (for high-volume metrics)
            self._write_api = self._client.write_api(
                write_options=WriteOptions(
                    batch_size=5000,
                    flush_interval=1000,  # 1 second
                    jitter_interval=200,
                    retry_interval=5000,
                    max_retries=5,
                    max_retry_delay=30000,
                    exponential_base=2
                )
            )
            
            # Synchronous API (for critical writes)
            self._sync_write_api = self._client.write_api(write_options=SYNCHRONOUS)
            
            logger.info(f"InfluxDB client initialized: {self.config.url}")
            
        except Exception as e:
            logger.error(f"Failed to initialize InfluxDB client: {e}")
            self._client = None
    
    def close(self):
        """Close the client connection"""
        if self._write_api:
            self._write_api.close()
        if self._client:
            self._client.close()
    
    # =========================================================================
    # WRITE METHODS
    # =========================================================================
    
    def write_bandwidth(
        self,
        network_id: str,
        node_id: str,
        node_name: str,
        node_type: str,
        bytes_read: int,
        bytes_written: int,
        timestamp: Optional[datetime] = None
    ):
        """
        Write bandwidth measurement.
        
        Tags: network_id, node_id, node_type
        Fields: bytes_read, bytes_written, bytes_total
        """
        if not self._write_api:
            return
        
        point = (
            Point(Measurement.BANDWIDTH.value)
            .tag('network_id', network_id)
            .tag('node_id', node_id)
            .tag('node_name', node_name)
            .tag('node_type', node_type)
            .field('bytes_read', bytes_read)
            .field('bytes_written', bytes_written)
            .field('bytes_total', bytes_read + bytes_written)
            .time(timestamp or timezone.now())
        )
        
        self._write_api.write(bucket=self.config.bucket_raw, record=point)
    
    def write_circuit(
        self,
        network_id: str,
        node_id: str,
        circuit_id: str,
        status: str,
        purpose: Optional[str] = None,
        path_length: int = 0,
        build_time_ms: Optional[int] = None,
        reason: Optional[str] = None,
        timestamp: Optional[datetime] = None
    ):
        """
        Write circuit event.
        
        Tags: network_id, node_id, status, purpose
        Fields: circuit_id, path_length, build_time_ms
        """
        if not self._write_api:
            return
        
        point = (
            Point(Measurement.CIRCUIT.value)
            .tag('network_id', network_id)
            .tag('node_id', node_id)
            .tag('status', status)
            .tag('purpose', purpose or 'unknown')
            .field('circuit_id', circuit_id)
            .field('path_length', path_length)
            .time(timestamp or timezone.now())
        )
        
        if build_time_ms is not None:
            point.field('build_time_ms', build_time_ms)
        
        if reason:
            point.field('reason', reason)
        
        self._write_api.write(bucket=self.config.bucket_raw, record=point)
    
    def write_node_status(
        self,
        network_id: str,
        node_id: str,
        node_name: str,
        node_type: str,
        status: str,
        bootstrap_progress: int,
        circuits_active: int = 0,
        bytes_read: int = 0,
        bytes_written: int = 0,
        flags: Optional[List[str]] = None,
        timestamp: Optional[datetime] = None
    ):
        """
        Write node status snapshot.
        
        Tags: network_id, node_id, node_type, status
        Fields: bootstrap_progress, circuits_active, bytes_*
        """
        if not self._write_api:
            return
        
        point = (
            Point(Measurement.NODE_STATUS.value)
            .tag('network_id', network_id)
            .tag('node_id', node_id)
            .tag('node_name', node_name)
            .tag('node_type', node_type)
            .tag('status', status)
            .field('bootstrap_progress', bootstrap_progress)
            .field('circuits_active', circuits_active)
            .field('bytes_read', bytes_read)
            .field('bytes_written', bytes_written)
            .field('is_running', 1 if status == 'running' else 0)
            .time(timestamp or timezone.now())
        )
        
        if flags:
            point.field('flags', ','.join(flags))
        
        self._write_api.write(bucket=self.config.bucket_raw, record=point)
    
    def write_consensus(
        self,
        network_id: str,
        is_valid: bool,
        valid_after: Optional[datetime] = None,
        fresh_until: Optional[datetime] = None,
        valid_until: Optional[datetime] = None,
        relay_count: int = 0,
        timestamp: Optional[datetime] = None
    ):
        """
        Write consensus status.
        
        Tags: network_id
        Fields: is_valid, relay_count, validity windows
        """
        if not self._write_api:
            return
        
        point = (
            Point(Measurement.CONSENSUS.value)
            .tag('network_id', network_id)
            .field('is_valid', 1 if is_valid else 0)
            .field('relay_count', relay_count)
            .time(timestamp or timezone.now())
        )
        
        if valid_after:
            point.field('valid_after', valid_after.isoformat())
        if fresh_until:
            point.field('fresh_until', fresh_until.isoformat())
        if valid_until:
            point.field('valid_until', valid_until.isoformat())
        
        self._write_api.write(bucket=self.config.bucket_raw, record=point)
    
    def write_stream(
        self,
        network_id: str,
        node_id: str,
        stream_id: str,
        circuit_id: str,
        status: str,
        target: Optional[str] = None,
        purpose: Optional[str] = None,
        timestamp: Optional[datetime] = None
    ):
        """Write stream event."""
        if not self._write_api:
            return
        
        point = (
            Point(Measurement.STREAM.value)
            .tag('network_id', network_id)
            .tag('node_id', node_id)
            .tag('status', status)
            .tag('purpose', purpose or 'unknown')
            .field('stream_id', stream_id)
            .field('circuit_id', circuit_id)
            .time(timestamp or timezone.now())
        )
        
        if target:
            point.field('target', target)
        
        self._write_api.write(bucket=self.config.bucket_raw, record=point)
    
    def write_alert(
        self,
        network_id: str,
        alert_type: str,
        severity: str,  # 'info', 'warning', 'critical'
        message: str,
        node_id: Optional[str] = None,
        details: Optional[Dict[str, Any]] = None,
        timestamp: Optional[datetime] = None
    ):
        """
        Write alert (synchronous for reliability).
        """
        if not self._sync_write_api:
            return
        
        import json
        
        point = (
            Point(Measurement.ALERT.value)
            .tag('network_id', network_id)
            .tag('alert_type', alert_type)
            .tag('severity', severity)
            .field('message', message)
            .time(timestamp or timezone.now())
        )
        
        if node_id:
            point.tag('node_id', node_id)
        
        if details:
            point.field('details', json.dumps(details))
        
        # Synchronous write for alerts
        self._sync_write_api.write(bucket=self.config.bucket_raw, record=point)
    
    def flush(self):
        """Force flush pending writes"""
        if self._write_api:
            self._write_api.flush()


# =============================================================================
# METRICS READER
# =============================================================================

class TorMetricsReader:
    """
    Reads Tor metrics from InfluxDB.
    
    Automatically selects appropriate bucket based on time range:
    - < 7 days: raw bucket
    - 7-90 days: hourly bucket
    - > 90 days: daily bucket
    """
    
    def __init__(self, config: Optional[InfluxConfig] = None):
        self.config = config or InfluxConfig.from_settings()
        self._client: Optional[InfluxDBClient] = None
        self._query_api = None
        
        if INFLUX_AVAILABLE:
            self._init_client()
    
    def _init_client(self):
        """Initialize InfluxDB client"""
        try:
            self._client = InfluxDBClient(
                url=self.config.url,
                token=self.config.token,
                org=self.config.org
            )
            self._query_api = self._client.query_api()
            logger.info("InfluxDB query client initialized")
        except Exception as e:
            logger.error(f"Failed to initialize InfluxDB query client: {e}")
    
    def close(self):
        """Close the client"""
        if self._client:
            self._client.close()
    
    def _select_bucket(self, hours: int) -> str:
        """Select appropriate bucket based on time range"""
        if hours <= 168:  # 7 days
            return self.config.bucket_raw
        elif hours <= 2160:  # 90 days
            return self.config.bucket_hourly
        else:
            return self.config.bucket_daily
    
    # =========================================================================
    # QUERY METHODS
    # =========================================================================
    
    def get_bandwidth_history(
        self,
        network_id: str,
        node_id: Optional[str] = None,
        hours: int = 24,
        aggregation: str = '1m'  # 1m, 5m, 1h, 1d
    ) -> List[Dict[str, Any]]:
        """
        Get bandwidth history for a network or specific node.
        
        Returns list of {time, bytes_read, bytes_written, bytes_total}
        """
        if not self._query_api:
            return []
        
        bucket = self._select_bucket(hours)
        
        node_filter = f'|> filter(fn: (r) => r["node_id"] == "{node_id}")' if node_id else ''
        
        query = f'''
        from(bucket: "{bucket}")
            |> range(start: -{hours}h)
            |> filter(fn: (r) => r["_measurement"] == "{Measurement.BANDWIDTH.value}")
            |> filter(fn: (r) => r["network_id"] == "{network_id}")
            {node_filter}
            |> aggregateWindow(every: {aggregation}, fn: sum, createEmpty: false)
            |> pivot(rowKey: ["_time"], columnKey: ["_field"], valueColumn: "_value")
            |> sort(columns: ["_time"])
        '''
        
        try:
            tables = self._query_api.query(query)
            results = []
            
            for table in tables:
                for record in table.records:
                    results.append({
                        'time': record.get_time().isoformat(),
                        'node_id': record.values.get('node_id'),
                        'node_name': record.values.get('node_name'),
                        'bytes_read': record.values.get('bytes_read', 0),
                        'bytes_written': record.values.get('bytes_written', 0),
                        'bytes_total': record.values.get('bytes_total', 0),
                    })
            
            return results
            
        except Exception as e:
            logger.error(f"Bandwidth query failed: {e}")
            return []
    
    def get_circuit_stats(
        self,
        network_id: str,
        hours: int = 24,
        aggregation: str = '1h'
    ) -> Dict[str, Any]:
        """
        Get circuit statistics.
        
        Returns {by_status, by_purpose, avg_build_time, total}
        """
        if not self._query_api:
            return {}
        
        bucket = self._select_bucket(hours)
        
        # Count by status
        status_query = f'''
        from(bucket: "{bucket}")
            |> range(start: -{hours}h)
            |> filter(fn: (r) => r["_measurement"] == "{Measurement.CIRCUIT.value}")
            |> filter(fn: (r) => r["network_id"] == "{network_id}")
            |> group(columns: ["status"])
            |> count()
        '''
        
        # Average build time
        build_time_query = f'''
        from(bucket: "{bucket}")
            |> range(start: -{hours}h)
            |> filter(fn: (r) => r["_measurement"] == "{Measurement.CIRCUIT.value}")
            |> filter(fn: (r) => r["network_id"] == "{network_id}")
            |> filter(fn: (r) => r["_field"] == "build_time_ms")
            |> filter(fn: (r) => r["status"] == "BUILT")
            |> mean()
        '''
        
        try:
            results = {
                'by_status': {},
                'by_purpose': {},
                'avg_build_time_ms': None,
                'total': 0
            }
            
            # Status counts
            tables = self._query_api.query(status_query)
            for table in tables:
                for record in table.records:
                    status = record.values.get('status', 'unknown')
                    count = record.get_value()
                    results['by_status'][status] = count
                    results['total'] += count
            
            # Build time
            tables = self._query_api.query(build_time_query)
            for table in tables:
                for record in table.records:
                    results['avg_build_time_ms'] = record.get_value()
            
            return results
            
        except Exception as e:
            logger.error(f"Circuit stats query failed: {e}")
            return {}
    
    def get_node_status_history(
        self,
        network_id: str,
        node_id: str,
        hours: int = 24,
        aggregation: str = '5m'
    ) -> List[Dict[str, Any]]:
        """Get node status history"""
        if not self._query_api:
            return []
        
        bucket = self._select_bucket(hours)
        
        query = f'''
        from(bucket: "{bucket}")
            |> range(start: -{hours}h)
            |> filter(fn: (r) => r["_measurement"] == "{Measurement.NODE_STATUS.value}")
            |> filter(fn: (r) => r["network_id"] == "{network_id}")
            |> filter(fn: (r) => r["node_id"] == "{node_id}")
            |> aggregateWindow(every: {aggregation}, fn: last, createEmpty: false)
            |> pivot(rowKey: ["_time"], columnKey: ["_field"], valueColumn: "_value")
            |> sort(columns: ["_time"])
        '''
        
        try:
            tables = self._query_api.query(query)
            results = []
            
            for table in tables:
                for record in table.records:
                    results.append({
                        'time': record.get_time().isoformat(),
                        'status': record.values.get('status'),
                        'bootstrap_progress': record.values.get('bootstrap_progress'),
                        'circuits_active': record.values.get('circuits_active'),
                        'bytes_read': record.values.get('bytes_read'),
                        'bytes_written': record.values.get('bytes_written'),
                    })
            
            return results
            
        except Exception as e:
            logger.error(f"Node status query failed: {e}")
            return []
    
    def get_alerts(
        self,
        network_id: str,
        hours: int = 24,
        severity: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """Get alerts"""
        if not self._query_api:
            return []
        
        bucket = self._select_bucket(hours)
        
        severity_filter = f'|> filter(fn: (r) => r["severity"] == "{severity}")' if severity else ''
        
        query = f'''
        from(bucket: "{bucket}")
            |> range(start: -{hours}h)
            |> filter(fn: (r) => r["_measurement"] == "{Measurement.ALERT.value}")
            |> filter(fn: (r) => r["network_id"] == "{network_id}")
            {severity_filter}
            |> pivot(rowKey: ["_time"], columnKey: ["_field"], valueColumn: "_value")
            |> sort(columns: ["_time"], desc: true)
        '''
        
        try:
            tables = self._query_api.query(query)
            results = []
            
            for table in tables:
                for record in table.records:
                    results.append({
                        'time': record.get_time().isoformat(),
                        'alert_type': record.values.get('alert_type'),
                        'severity': record.values.get('severity'),
                        'message': record.values.get('message'),
                        'node_id': record.values.get('node_id'),
                        'details': record.values.get('details'),
                    })
            
            return results
            
        except Exception as e:
            logger.error(f"Alerts query failed: {e}")
            return []


# =============================================================================
# SETUP HELPER
# =============================================================================

def setup_influxdb_buckets():
    """
    Create InfluxDB buckets with retention policies.
    
    Run this once during setup:
        python manage.py shell -c "from chutney.services.influx_metrics import setup_influxdb_buckets; setup_influxdb_buckets()"
    """
    if not INFLUX_AVAILABLE:
        logger.error("influxdb-client not installed")
        return
    
    config = InfluxConfig.from_settings()
    
    try:
        client = InfluxDBClient(
            url=config.url,
            token=config.token,
            org=config.org
        )
        
        buckets_api = client.buckets_api()
        
        # Bucket configurations
        buckets = [
            {'name': config.bucket_raw, 'retention_days': 7, 'description': 'Raw metrics (1s resolution)'},
            {'name': config.bucket_hourly, 'retention_days': 90, 'description': 'Hourly aggregates'},
            {'name': config.bucket_daily, 'retention_days': 730, 'description': 'Daily aggregates'},
        ]
        
        # Get org ID
        orgs_api = client.organizations_api()
        orgs = orgs_api.find_organizations(org=config.org)
        if not orgs:
            logger.error(f"Organization '{config.org}' not found")
            return
        
        org_id = orgs[0].id
        
        # Create buckets
        for bucket_config in buckets:
            name = bucket_config['name']
            
            # Check if exists
            existing = buckets_api.find_bucket_by_name(name)
            if existing:
                logger.info(f"Bucket '{name}' already exists")
                continue
            
            # Create bucket
            from influxdb_client import BucketRetentionRules
            
            retention_seconds = bucket_config['retention_days'] * 24 * 3600
            
            bucket = buckets_api.create_bucket(
                bucket_name=name,
                org_id=org_id,
                retention_rules=[
                    BucketRetentionRules(type='expire', every_seconds=retention_seconds)
                ],
                description=bucket_config['description']
            )
            
            logger.info(f"Created bucket '{name}' with {bucket_config['retention_days']} day retention")
        
        client.close()
        logger.info("InfluxDB setup complete")
        
    except Exception as e:
        logger.error(f"InfluxDB setup failed: {e}")


# =============================================================================
# SINGLETON INSTANCES
# =============================================================================

# Global writer instance (use in stem_bridge)
_metrics_writer: Optional[TorMetricsWriter] = None

def get_metrics_writer() -> TorMetricsWriter:
    """Get the global metrics writer instance"""
    global _metrics_writer
    if _metrics_writer is None:
        _metrics_writer = TorMetricsWriter()
    return _metrics_writer


# Global reader instance (use in API views)
_metrics_reader: Optional[TorMetricsReader] = None

def get_metrics_reader() -> TorMetricsReader:
    """Get the global metrics reader instance"""
    global _metrics_reader
    if _metrics_reader is None:
        _metrics_reader = TorMetricsReader()
    return _metrics_reader