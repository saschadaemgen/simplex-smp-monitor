/**
 * ZeekLogs - Zeek Log Viewer (Placeholder)
 */
import React from 'react';
import { ZeekLog } from '../types';
import { Search, FileText, Filter, Download } from 'lucide-react';

interface ZeekLogsProps {
  logs: ZeekLog[];
  onLogClick?: (log: ZeekLog) => void;
}

export const ZeekLogs: React.FC<ZeekLogsProps> = ({
  logs = [],
  onLogClick,
}) => {
  const logTypes = ['conn', 'dns', 'http', 'ssl', 'x509', 'files', 'notice'];

  return (
    <div className="bg-gray-800/50 border border-gray-700 rounded-xl overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-gray-700 flex items-center justify-between">
        <h4 className="font-medium text-white flex items-center gap-2">
          <Search size={18} className="text-blue-400" />
          Zeek Logs
        </h4>
        <div className="flex items-center gap-2">
          <button className="p-1.5 rounded hover:bg-gray-700 text-gray-400 hover:text-white">
            <Filter size={16} />
          </button>
          <button className="p-1.5 rounded hover:bg-gray-700 text-gray-400 hover:text-white">
            <Download size={16} />
          </button>
        </div>
      </div>

      {/* Log Type Tabs */}
      <div className="flex gap-1 p-2 bg-gray-900/50 border-b border-gray-700 overflow-x-auto">
        {logTypes.map(type => (
          <button
            key={type}
            className="px-3 py-1.5 rounded text-sm bg-gray-700 text-gray-300 hover:bg-gray-600 whitespace-nowrap"
          >
            {type}.log
          </button>
        ))}
      </div>

      {/* Content */}
      {logs.length > 0 ? (
        <div className="divide-y divide-gray-700/50 max-h-96 overflow-y-auto">
          {logs.map((log, i) => (
            <div
              key={i}
              onClick={() => onLogClick?.(log)}
              className="p-3 hover:bg-gray-700/20 cursor-pointer font-mono text-sm"
            >
              <div className="flex items-center gap-3">
                <span className="text-gray-500">{log.timestamp}</span>
                <span className="text-blue-400">{log.log_type}</span>
                <span className="text-gray-300 truncate">
                  {JSON.stringify(log.data).slice(0, 100)}...
                </span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="p-8 text-center">
          <FileText size={48} className="mx-auto mb-4 text-gray-600" />
          <p className="text-gray-500">No Zeek logs available</p>
          <p className="text-sm text-gray-600 mt-1">
            Zeek integration will be available in Phase 10
          </p>
        </div>
      )}
    </div>
  );
};

export default ZeekLogs;
