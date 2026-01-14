/**
 * SuricataAlerts - Suricata Alert Viewer (Placeholder)
 */
import React from 'react';
import { SuricataAlert } from '../types';
import { Shield, AlertTriangle, AlertCircle, Info } from 'lucide-react';

interface SuricataAlertsProps {
  alerts: SuricataAlert[];
  onAlertClick?: (alert: SuricataAlert) => void;
}

const severityConfig: Record<number, { icon: React.ElementType; color: string; label: string }> = {
  1: { icon: AlertTriangle, color: 'text-red-400', label: 'Critical' },
  2: { icon: AlertCircle, color: 'text-orange-400', label: 'High' },
  3: { icon: Info, color: 'text-yellow-400', label: 'Medium' },
  4: { icon: Info, color: 'text-blue-400', label: 'Low' },
};

export const SuricataAlerts: React.FC<SuricataAlertsProps> = ({
  alerts = [],
  onAlertClick,
}) => {
  return (
    <div className="bg-gray-800/50 border border-gray-700 rounded-xl overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-gray-700 flex items-center justify-between">
        <h4 className="font-medium text-white flex items-center gap-2">
          <Shield size={18} className="text-orange-400" />
          Suricata Alerts
        </h4>
        <span className="text-sm text-gray-400">{alerts.length} alerts</span>
      </div>

      {/* Content */}
      {alerts.length > 0 ? (
        <div className="divide-y divide-gray-700/50 max-h-96 overflow-y-auto">
          {alerts.map((alert, i) => {
            const config = severityConfig[alert.severity] || severityConfig[4];
            const Icon = config.icon;
            
            return (
              <div
                key={alert.alert_id || i}
                onClick={() => onAlertClick?.(alert)}
                className="p-3 hover:bg-gray-700/20 cursor-pointer"
              >
                <div className="flex items-start gap-3">
                  <Icon size={18} className={config.color} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-xs px-1.5 py-0.5 rounded ${config.color} bg-gray-700`}>
                        {config.label}
                      </span>
                      <span className="text-xs text-gray-500">{alert.timestamp}</span>
                    </div>
                    <p className="text-white text-sm">{alert.signature}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      {alert.src_ip} → {alert.dst_ip}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="p-8 text-center">
          <Shield size={48} className="mx-auto mb-4 text-gray-600" />
          <p className="text-gray-500">No Suricata alerts</p>
          <p className="text-sm text-gray-600 mt-1">
            Suricata integration will be available in Phase 10
          </p>
        </div>
      )}
    </div>
  );
};

export default SuricataAlerts;
