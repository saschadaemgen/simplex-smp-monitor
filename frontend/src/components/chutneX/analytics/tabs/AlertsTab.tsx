/**
 * AlertsTab - Anomaly Detection & Alert Management
 * =================================================
 * Copyright (c) 2026 cannatoshi
 * 
 * Shows:
 * - Active alerts by severity
 * - Alert history
 * - Acknowledge/dismiss functionality
 * - Anomaly detection panels
 */
import React, { useState, useMemo } from 'react';
import {
  AlertTriangle,
  Info,
  CheckCircle2,
  XCircle,
  Filter,
  Bell,
  BellOff,
  Eye,
  EyeOff,
  Trash2,
} from 'lucide-react';

const NEON = '#88CED0';
const NEON_DIM = 'rgba(136, 206, 208, 0.15)';

// Severity configuration
const SEVERITY_CONFIG = {
  critical: { 
    color: '#ef4444', 
    bgColor: 'rgba(239, 68, 68, 0.1)',
    borderColor: 'rgba(239, 68, 68, 0.3)',
    icon: XCircle,
    label: 'Critical'
  },
  warning: { 
    color: '#f59e0b', 
    bgColor: 'rgba(245, 158, 11, 0.1)',
    borderColor: 'rgba(245, 158, 11, 0.3)',
    icon: AlertTriangle,
    label: 'Warning'
  },
  info: { 
    color: NEON, 
    bgColor: NEON_DIM,
    borderColor: 'rgba(136, 206, 208, 0.3)',
    icon: Info,
    label: 'Info'
  },
};

export interface Alert {
  id: string;
  severity: 'critical' | 'warning' | 'info';
  type: string;
  message: string;
  timestamp: string;
  node_id?: string;
  node_name?: string;
  acknowledged: boolean;
  details?: Record<string, any>;
}

interface AlertsTabProps {
  alerts: Alert[];
  onAcknowledge: (alertId: string) => void;
  onDismiss: (alertId: string) => void;
  onDismissAll: () => void;
  isLive: boolean;
}

export const AlertsTab: React.FC<AlertsTabProps> = ({
  alerts,
  onAcknowledge,
  onDismiss,
  onDismissAll,
  isLive,
}) => {
  const [severityFilter, setSeverityFilter] = useState<string | null>(null);
  const [showAcknowledged, setShowAcknowledged] = useState(false);
  const [selectedAlert, setSelectedAlert] = useState<Alert | null>(null);

  // Filter alerts
  const filteredAlerts = useMemo(() => {
    return alerts.filter(alert => {
      if (severityFilter && alert.severity !== severityFilter) return false;
      if (!showAcknowledged && alert.acknowledged) return false;
      return true;
    });
  }, [alerts, severityFilter, showAcknowledged]);

  // Group by severity
  const alertStats = useMemo(() => {
    const stats = {
      total: alerts.length,
      unacknowledged: alerts.filter(a => !a.acknowledged).length,
      critical: alerts.filter(a => a.severity === 'critical' && !a.acknowledged).length,
      warning: alerts.filter(a => a.severity === 'warning' && !a.acknowledged).length,
      info: alerts.filter(a => a.severity === 'info' && !a.acknowledged).length,
    };
    return stats;
  }, [alerts]);

  return (
    <div className="p-4 space-y-4 h-full overflow-y-auto">
      {/* Alert Summary */}
      {alertStats.critical > 0 && (
        <div 
          className="rounded-lg border p-4 flex items-center gap-3"
          style={{
            backgroundColor: SEVERITY_CONFIG.critical.bgColor,
            borderColor: SEVERITY_CONFIG.critical.borderColor,
          }}
        >
          <XCircle size={24} style={{ color: SEVERITY_CONFIG.critical.color }} />
          <div className="flex-1">
            <h2 className="text-lg font-semibold text-white">
              {alertStats.critical} Critical Alert{alertStats.critical > 1 ? 's' : ''}
            </h2>
            <p className="text-sm text-gray-400">
              Immediate attention required
            </p>
          </div>
          <button
            onClick={() => setSeverityFilter('critical')}
            className="px-3 py-1.5 text-sm rounded-lg border transition-colors"
            style={{
              borderColor: SEVERITY_CONFIG.critical.color,
              color: SEVERITY_CONFIG.critical.color,
            }}
          >
            View Critical
          </button>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard
          label="Total Alerts"
          value={alertStats.total}
          icon={Bell}
          color={NEON}
        />
        <StatCard
          label="Critical"
          value={alertStats.critical}
          icon={XCircle}
          color={SEVERITY_CONFIG.critical.color}
          onClick={() => setSeverityFilter(severityFilter === 'critical' ? null : 'critical')}
          active={severityFilter === 'critical'}
        />
        <StatCard
          label="Warnings"
          value={alertStats.warning}
          icon={AlertTriangle}
          color={SEVERITY_CONFIG.warning.color}
          onClick={() => setSeverityFilter(severityFilter === 'warning' ? null : 'warning')}
          active={severityFilter === 'warning'}
        />
        <StatCard
          label="Info"
          value={alertStats.info}
          icon={Info}
          color={SEVERITY_CONFIG.info.color}
          onClick={() => setSeverityFilter(severityFilter === 'info' ? null : 'info')}
          active={severityFilter === 'info'}
        />
      </div>

      {/* Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          {/* Severity Filter */}
          <div className="flex items-center gap-2">
            <Filter size={14} className="text-gray-400" />
            <div className="flex gap-1">
              {Object.entries(SEVERITY_CONFIG).map(([key, config]) => {
                const Icon = config.icon;
                return (
                  <button
                    key={key}
                    onClick={() => setSeverityFilter(severityFilter === key ? null : key)}
                    className={`px-2 py-1 text-xs rounded flex items-center gap-1 transition-colors ${
                      severityFilter === key
                        ? 'text-white'
                        : 'text-gray-400 hover:text-white'
                    }`}
                    style={severityFilter === key ? {
                      backgroundColor: config.bgColor,
                      color: config.color,
                    } : undefined}
                  >
                    <Icon size={10} />
                    {config.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Show Acknowledged Toggle */}
          <button
            onClick={() => setShowAcknowledged(!showAcknowledged)}
            className={`flex items-center gap-2 px-3 py-1.5 text-xs rounded-lg transition-colors ${
              showAcknowledged 
                ? 'bg-gray-700 text-white' 
                : 'text-gray-400 hover:text-white'
            }`}
          >
            {showAcknowledged ? <Eye size={12} /> : <EyeOff size={12} />}
            Show Acknowledged
          </button>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          {alertStats.unacknowledged > 0 && (
            <button
              onClick={onDismissAll}
              className="flex items-center gap-2 px-3 py-1.5 text-xs text-gray-400 
                        hover:text-white bg-gray-800/50 rounded-lg"
            >
              <Trash2 size={12} />
              Dismiss All
            </button>
          )}
          
          {isLive && (
            <span className="flex items-center gap-1 text-xs" style={{ color: NEON }}>
              <span 
                className="w-1.5 h-1.5 rounded-full animate-pulse" 
                style={{ backgroundColor: NEON }} 
              />
              Live
            </span>
          )}
        </div>
      </div>

      {/* Alert List */}
      <div className="space-y-2">
        {filteredAlerts.length === 0 ? (
          <div className="text-center py-12">
            <BellOff size={48} className="text-gray-600 mx-auto mb-4" />
            <p className="text-gray-500">
              {alerts.length === 0 
                ? 'No alerts - everything looks good!' 
                : 'No alerts match your filters'
              }
            </p>
          </div>
        ) : (
          filteredAlerts.map(alert => (
            <AlertRow
              key={alert.id}
              alert={alert}
              onAcknowledge={() => onAcknowledge(alert.id)}
              onDismiss={() => onDismiss(alert.id)}
              onSelect={() => setSelectedAlert(alert)}
              isSelected={selectedAlert?.id === alert.id}
            />
          ))
        )}
      </div>

      {/* Alert Detail Modal */}
      {selectedAlert && (
        <AlertDetailModal
          alert={selectedAlert}
          onClose={() => setSelectedAlert(null)}
          onAcknowledge={() => {
            onAcknowledge(selectedAlert.id);
            setSelectedAlert(null);
          }}
          onDismiss={() => {
            onDismiss(selectedAlert.id);
            setSelectedAlert(null);
          }}
        />
      )}
    </div>
  );
};

// =============================================================================
// SUB-COMPONENTS
// =============================================================================

interface StatCardProps {
  label: string;
  value: number;
  icon: React.ElementType;
  color: string;
  onClick?: () => void;
  active?: boolean;
}

const StatCard: React.FC<StatCardProps> = ({ 
  label, value, icon: Icon, color, onClick, active 
}) => (
  <button
    onClick={onClick}
    disabled={!onClick}
    className={`bg-gray-800/30 rounded-lg border p-3 text-left transition-colors ${
      onClick ? 'hover:bg-gray-800/50 cursor-pointer' : ''
    } ${active ? 'ring-1' : ''}`}
    style={{
      borderColor: active ? color : 'rgba(55, 65, 81, 0.5)',
      ['--tw-ring-color' as string]: color,
    } as React.CSSProperties}
  >
    <div className="flex items-center gap-2 mb-1">
      <Icon size={14} style={{ color }} />
      <span className="text-xs text-gray-400">{label}</span>
    </div>
    <p className="text-2xl font-bold text-white">{value}</p>
  </button>
);

interface AlertRowProps {
  alert: Alert;
  onAcknowledge: () => void;
  onDismiss: () => void;
  onSelect: () => void;
  isSelected: boolean;
}

const AlertRow: React.FC<AlertRowProps> = ({
  alert,
  onAcknowledge,
  onDismiss,
  onSelect,
  isSelected,
}) => {
  const config = SEVERITY_CONFIG[alert.severity];
  const Icon = config.icon;

  return (
    <div
      className={`rounded-lg border transition-colors ${
        alert.acknowledged ? 'opacity-60' : ''
      } ${isSelected ? 'ring-1' : ''}`}
      style={{
        backgroundColor: config.bgColor,
        borderColor: config.borderColor,
        ['--tw-ring-color' as string]: config.color,
      } as React.CSSProperties}
    >
      <div className="p-4 flex items-start gap-3">
        {/* Severity Icon */}
        <Icon size={20} style={{ color: config.color }} className="flex-shrink-0 mt-0.5" />

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-1">
            <h4 className="text-sm font-medium text-white">
              {alert.type}
            </h4>
            <span className="text-xs text-gray-500 flex-shrink-0">
              {new Date(alert.timestamp).toLocaleTimeString('de-DE')}
            </span>
          </div>
          
          <p className="text-sm text-gray-300 mb-2">{alert.message}</p>
          
          {alert.node_name && (
            <span className="text-xs text-gray-500">
              Node: {alert.node_name}
            </span>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 flex-shrink-0">
          <button
            onClick={(e) => { e.stopPropagation(); onSelect(); }}
            className="p-1.5 text-gray-400 hover:text-white rounded"
            title="View details"
          >
            <Eye size={14} />
          </button>
          
          {!alert.acknowledged && (
            <button
              onClick={(e) => { e.stopPropagation(); onAcknowledge(); }}
              className="p-1.5 text-gray-400 hover:text-emerald-400 rounded"
              title="Acknowledge"
            >
              <CheckCircle2 size={14} />
            </button>
          )}
          
          <button
            onClick={(e) => { e.stopPropagation(); onDismiss(); }}
            className="p-1.5 text-gray-400 hover:text-red-400 rounded"
            title="Dismiss"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      {/* Acknowledged badge */}
      {alert.acknowledged && (
        <div className="px-4 pb-3 flex items-center gap-1 text-xs text-emerald-400">
          <CheckCircle2 size={10} />
          Acknowledged
        </div>
      )}
    </div>
  );
};

interface AlertDetailModalProps {
  alert: Alert;
  onClose: () => void;
  onAcknowledge: () => void;
  onDismiss: () => void;
}

const AlertDetailModal: React.FC<AlertDetailModalProps> = ({
  alert,
  onClose,
  onAcknowledge,
  onDismiss,
}) => {
  const config = SEVERITY_CONFIG[alert.severity];
  const Icon = config.icon;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div 
        className="bg-gray-900 rounded-lg border max-w-lg w-full max-h-[80vh] overflow-hidden"
        style={{ borderColor: config.borderColor }}
      >
        {/* Header */}
        <div 
          className="p-4 border-b flex items-center gap-3"
          style={{ 
            backgroundColor: config.bgColor,
            borderColor: config.borderColor,
          }}
        >
          <Icon size={24} style={{ color: config.color }} />
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-white">{alert.type}</h3>
            <p className="text-sm text-gray-400">
              {new Date(alert.timestamp).toLocaleString('de-DE')}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white text-xl"
          >
            ×
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4 overflow-y-auto max-h-[50vh]">
          {/* Message */}
          <div>
            <h4 className="text-xs text-gray-500 mb-1">Message</h4>
            <p className="text-gray-300">{alert.message}</p>
          </div>

          {/* Node */}
          {alert.node_name && (
            <div>
              <h4 className="text-xs text-gray-500 mb-1">Affected Node</h4>
              <p className="text-gray-300">{alert.node_name}</p>
            </div>
          )}

          {/* Details */}
          {alert.details && Object.keys(alert.details).length > 0 && (
            <div>
              <h4 className="text-xs text-gray-500 mb-1">Details</h4>
              <pre className="bg-gray-800/50 rounded p-3 text-xs text-gray-300 font-mono overflow-x-auto">
                {JSON.stringify(alert.details, null, 2)}
              </pre>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="p-4 border-t border-gray-700/50 flex items-center justify-end gap-2">
          {!alert.acknowledged && (
            <button
              onClick={onAcknowledge}
              className="flex items-center gap-2 px-4 py-2 text-sm rounded-lg
                        bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30"
            >
              <CheckCircle2 size={14} />
              Acknowledge
            </button>
          )}
          <button
            onClick={onDismiss}
            className="flex items-center gap-2 px-4 py-2 text-sm rounded-lg
                      bg-red-500/20 text-red-400 hover:bg-red-500/30"
          >
            <Trash2 size={14} />
            Dismiss
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-400 hover:text-white"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default AlertsTab;