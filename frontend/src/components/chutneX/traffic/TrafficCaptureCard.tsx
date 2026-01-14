/**
 * TrafficCaptureCard - Individual Traffic Capture Display
 */
import React from 'react';
import { TrafficCapture } from '../types';
import { 
  Video, Download, FileText, Clock, Database,
  Activity, Layers, AlertTriangle, CheckCircle,
  Play, Square, Search, Loader2
} from 'lucide-react';

interface TrafficCaptureCardProps {
  capture: TrafficCapture;
  onClick?: () => void;
  onDownload?: () => void;
}

const statusConfig: Record<string, { icon: React.ElementType; color: string; bg: string }> = {
  recording: { icon: Play, color: 'text-red-400', bg: 'bg-red-500/20' },
  completed: { icon: CheckCircle, color: 'text-green-400', bg: 'bg-green-500/20' },
  analyzing: { icon: Loader2, color: 'text-yellow-400', bg: 'bg-yellow-500/20' },
  analyzed: { icon: Search, color: 'text-blue-400', bg: 'bg-blue-500/20' },
  error: { icon: AlertTriangle, color: 'text-red-500', bg: 'bg-red-500/20' },
  deleted: { icon: Square, color: 'text-gray-500', bg: 'bg-gray-500/20' },
};

export const TrafficCaptureCard: React.FC<TrafficCaptureCardProps> = ({
  capture,
  onClick,
  onDownload,
}) => {
  const config = statusConfig[capture.status] || statusConfig.completed;
  const StatusIcon = config.icon;
  const isRecording = capture.status === 'recording';

  return (
    <div
      onClick={onClick}
      className={`bg-gray-800/50 border border-gray-700 rounded-xl overflow-hidden hover:border-[#88CED0]/50 transition-all ${onClick ? 'cursor-pointer' : ''}`}
    >
      {/* Header */}
      <div className={`p-3 border-b border-gray-700 ${isRecording ? 'bg-red-500/10' : 'bg-gray-800/30'}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Video size={18} className={isRecording ? 'text-red-400 animate-pulse' : 'text-[#88CED0]'} />
            <span className="font-medium text-white">{capture.node_name || 'Unknown Node'}</span>
          </div>
          <span className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs ${config.bg} ${config.color}`}>
            <StatusIcon size={10} className={capture.status === 'analyzing' ? 'animate-spin' : ''} />
            {capture.status}
          </span>
        </div>
      </div>

      {/* Body */}
      <div className="p-3 space-y-3">
        {/* File Info */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-gray-400 text-sm">
            <FileText size={14} />
            <span>Size</span>
          </div>
          <span className="font-mono text-white">{formatBytes(capture.file_size_bytes)}</span>
        </div>

        {/* Packets */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-gray-400 text-sm">
            <Database size={14} />
            <span>Packets</span>
          </div>
          <span className="font-mono text-[#88CED0]">{formatNumber(capture.packet_count)}</span>
        </div>

        {/* Duration */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-gray-400 text-sm">
            <Clock size={14} />
            <span>Duration</span>
          </div>
          <span className="font-mono text-gray-300">{formatDuration(capture.duration_seconds)}</span>
        </div>

        {/* Tor Cells (if analyzed) */}
        {capture.tor_cells_detected > 0 && (
          <div className="flex items-center justify-between pt-2 border-t border-gray-700">
            <div className="flex items-center gap-2 text-gray-400 text-sm">
              <Layers size={14} className="text-purple-400" />
              <span>Tor Cells</span>
            </div>
            <span className="font-mono text-purple-400">{formatNumber(capture.tor_cells_detected)}</span>
          </div>
        )}

        {/* Unique Flows */}
        {capture.unique_flows > 0 && (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-gray-400 text-sm">
              <Activity size={14} className="text-orange-400" />
              <span>Unique Flows</span>
            </div>
            <span className="font-mono text-orange-400">{capture.unique_flows}</span>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="p-3 bg-gray-900/30 border-t border-gray-700 flex items-center justify-between">
        <span className="text-xs text-gray-500">
          {capture.started_at ? new Date(capture.started_at).toLocaleString('de-DE') : '—'}
        </span>
        
        {onDownload && capture.status !== 'recording' && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDownload();
            }}
            className="flex items-center gap-1 px-2 py-1 bg-[#88CED0]/20 text-[#88CED0] rounded text-xs hover:bg-[#88CED0]/30 transition-colors"
          >
            <Download size={12} />
            PCAP
          </button>
        )}
      </div>
    </div>
  );
};

const formatBytes = (bytes: number): string => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
};

const formatNumber = (num: number): string => {
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
  return num.toString();
};

const formatDuration = (seconds: number): string => {
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ${seconds % 60}s`;
  const hours = Math.floor(minutes / 60);
  return `${hours}h ${minutes % 60}m`;
};

export default TrafficCaptureCard;
