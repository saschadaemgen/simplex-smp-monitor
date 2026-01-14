/**
 * TrafficCapturesList - List of Traffic Captures
 */
import React, { useState } from 'react';
import { TrafficCapture } from '../types';
import { TrafficCaptureCard } from './TrafficCaptureCard';
import { 
  Video, Play, Search,

} from 'lucide-react';

interface TrafficCapturesListProps {
  captures: TrafficCapture[];
  onCaptureClick?: (capture: TrafficCapture) => void;
  onDownload?: (capture: TrafficCapture) => void;
  onStartCapture?: () => void;
}

export const TrafficCapturesList: React.FC<TrafficCapturesListProps> = ({
  captures,
  onCaptureClick,
  onDownload,
  onStartCapture,
}) => {
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredCaptures = captures.filter(c => {
    if (filterStatus !== 'all' && c.status !== filterStatus) return false;
    if (searchQuery && !c.node_name?.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  const recordingCount = captures.filter(c => c.status === 'recording').length;
  const totalSize = captures.reduce((sum, c) => sum + c.file_size_bytes, 0);
  const totalPackets = captures.reduce((sum, c) => sum + c.packet_count, 0);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 bg-gray-800/50 rounded-lg border border-gray-700">
        <div className="flex items-center gap-3">
          <Video className="text-[#88CED0]" size={24} />
          <div>
            <h3 className="font-medium text-white">Traffic Captures</h3>
            <p className="text-sm text-gray-400">
              {captures.length} captures • {formatBytes(totalSize)} • {formatNumber(totalPackets)} packets
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          {recordingCount > 0 && (
            <span className="flex items-center gap-1 px-2 py-1 bg-red-500/20 text-red-400 rounded-full text-xs animate-pulse">
              <span className="w-2 h-2 bg-red-500 rounded-full" />
              {recordingCount} recording
            </span>
          )}
          {onStartCapture && (
            <button
              onClick={onStartCapture}
              className="flex items-center gap-2 px-3 py-2 bg-[#88CED0] text-gray-900 rounded-lg hover:bg-[#88CED0]/80 transition-colors text-sm font-medium"
            >
              <Play size={14} />
              Start Capture
            </button>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search by node..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-gray-700 border border-gray-600 rounded-lg pl-9 pr-3 py-2 text-sm text-white placeholder-gray-400 focus:border-[#88CED0] focus:outline-none"
          />
        </div>

        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white focus:border-[#88CED0] focus:outline-none"
        >
          <option value="all">All Status</option>
          <option value="recording">Recording</option>
          <option value="completed">Completed</option>
          <option value="analyzing">Analyzing</option>
          <option value="analyzed">Analyzed</option>
          <option value="error">Error</option>
        </select>
      </div>

      {/* Captures Grid */}
      {filteredCaptures.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredCaptures.map(capture => (
            <TrafficCaptureCard
              key={capture.id}
              capture={capture}
              onClick={() => onCaptureClick?.(capture)}
              onDownload={() => onDownload?.(capture)}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-12 bg-gray-800/30 rounded-xl border border-gray-700/50">
          <Video size={48} className="mx-auto mb-4 text-gray-600" />
          <p className="text-gray-500">No traffic captures found</p>
          <p className="text-sm text-gray-600 mt-1">
            {captures.length === 0 
              ? 'Start a capture to begin recording traffic'
              : 'Try adjusting your filters'}
          </p>
        </div>
      )}
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

export default TrafficCapturesList;
