/**
 * ReportGenerator - Export Reports and Analysis
 */
import React, { useState } from 'react';
import { 
  FileText, Download, Share2, Clock, 
  CheckCircle, Loader2, Settings, File
} from 'lucide-react';

interface ReportGeneratorProps {
  networkId: string;
  networkName: string;
  onGenerate?: (format: string, options: ReportOptions) => Promise<void>;
}

interface ReportOptions {
  includeOverview: boolean;
  includeNodes: boolean;
  includeCircuits: boolean;
  includeTraffic: boolean;
  includeForensics: boolean;
  timeRange: string;
}

const reportFormats = [
  { id: 'pdf', label: 'PDF Report', icon: FileText, description: 'Professional formatted report' },
  { id: 'json', label: 'JSON Export', icon: File, description: 'Machine-readable data export' },
  { id: 'csv', label: 'CSV Tables', icon: File, description: 'Spreadsheet-compatible data' },
  { id: 'html', label: 'HTML Report', icon: FileText, description: 'Interactive web report' },
];

export const ReportGenerator: React.FC<ReportGeneratorProps> = ({
  networkId,
  networkName,
  onGenerate,
}) => {
  const [selectedFormat, setSelectedFormat] = useState('pdf');
  const [isGenerating, setIsGenerating] = useState(false);
  const [options, setOptions] = useState<ReportOptions>({
    includeOverview: true,
    includeNodes: true,
    includeCircuits: true,
    includeTraffic: true,
    includeForensics: false,
    timeRange: 'all',
  });

  const handleGenerate = async () => {
    setIsGenerating(true);
    try {
      await onGenerate?.(selectedFormat, options);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-6">
        <div className="flex items-center gap-4 mb-4">
          <div className="p-3 bg-[#88CED0]/20 rounded-xl">
            <FileText size={32} className="text-[#88CED0]" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">Report Generator</h2>
            <p className="text-gray-400">Network: {networkName}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Format Selection */}
        <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-4">
          <h4 className="font-medium text-white mb-4 flex items-center gap-2">
            <Download size={18} className="text-[#88CED0]" />
            Export Format
          </h4>
          <div className="space-y-2">
            {reportFormats.map(format => {
              const Icon = format.icon;
              return (
                <button
                  key={format.id}
                  onClick={() => setSelectedFormat(format.id)}
                  className={`w-full flex items-center gap-3 p-3 rounded-lg border transition-colors ${
                    selectedFormat === format.id
                      ? 'border-[#88CED0] bg-[#88CED0]/10'
                      : 'border-gray-700 hover:border-gray-600'
                  }`}
                >
                  <Icon size={20} className={selectedFormat === format.id ? 'text-[#88CED0]' : 'text-gray-400'} />
                  <div className="text-left">
                    <div className="text-white font-medium">{format.label}</div>
                    <div className="text-xs text-gray-500">{format.description}</div>
                  </div>
                  {selectedFormat === format.id && (
                    <CheckCircle size={16} className="text-[#88CED0] ml-auto" />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Options */}
        <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-4">
          <h4 className="font-medium text-white mb-4 flex items-center gap-2">
            <Settings size={18} className="text-purple-400" />
            Report Options
          </h4>
          
          <div className="space-y-3">
            <OptionCheckbox
              label="Network Overview"
              description="Status, configuration, and summary statistics"
              checked={options.includeOverview}
              onChange={(v) => setOptions(o => ({ ...o, includeOverview: v }))}
            />
            <OptionCheckbox
              label="Node Details"
              description="All nodes with bandwidth and status"
              checked={options.includeNodes}
              onChange={(v) => setOptions(o => ({ ...o, includeNodes: v }))}
            />
            <OptionCheckbox
              label="Circuit Analysis"
              description="Circuit paths, purposes, and statistics"
              checked={options.includeCircuits}
              onChange={(v) => setOptions(o => ({ ...o, includeCircuits: v }))}
            />
            <OptionCheckbox
              label="Traffic Data"
              description="Bandwidth distribution and captures"
              checked={options.includeTraffic}
              onChange={(v) => setOptions(o => ({ ...o, includeTraffic: v }))}
            />
            <OptionCheckbox
              label="Forensic Analysis"
              description="Timing correlation and pattern analysis"
              checked={options.includeForensics}
              onChange={(v) => setOptions(o => ({ ...o, includeForensics: v }))}
            />
          </div>

          {/* Time Range */}
          <div className="mt-4 pt-4 border-t border-gray-700">
            <label className="text-sm text-gray-400 mb-2 block">Time Range</label>
            <select
              value={options.timeRange}
              onChange={(e) => setOptions(o => ({ ...o, timeRange: e.target.value }))}
              className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white"
            >
              <option value="1h">Last Hour</option>
              <option value="6h">Last 6 Hours</option>
              <option value="24h">Last 24 Hours</option>
              <option value="7d">Last 7 Days</option>
              <option value="all">All Time</option>
            </select>
          </div>
        </div>
      </div>

      {/* Generate Button */}
      <div className="flex justify-end gap-4">
        <button
          onClick={handleGenerate}
          disabled={isGenerating}
          className="flex items-center gap-2 px-6 py-3 bg-[#88CED0] text-gray-900 rounded-lg font-medium hover:bg-[#88CED0]/80 transition-colors disabled:opacity-50"
        >
          {isGenerating ? (
            <>
              <Loader2 size={18} className="animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <Download size={18} />
              Generate Report
            </>
          )}
        </button>
      </div>
    </div>
  );
};

interface OptionCheckboxProps {
  label: string;
  description: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}

const OptionCheckbox: React.FC<OptionCheckboxProps> = ({ label, description, checked, onChange }) => (
  <label className="flex items-start gap-3 cursor-pointer group">
    <input
      type="checkbox"
      checked={checked}
      onChange={(e) => onChange(e.target.checked)}
      className="mt-1 w-4 h-4 rounded border-gray-600 bg-gray-700 text-[#88CED0] focus:ring-[#88CED0]"
    />
    <div>
      <div className="text-white group-hover:text-[#88CED0] transition-colors">{label}</div>
      <div className="text-xs text-gray-500">{description}</div>
    </div>
  </label>
);

export default ReportGenerator;
