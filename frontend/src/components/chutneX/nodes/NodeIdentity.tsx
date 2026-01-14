/**
 * NodeIdentity - Node Identity Information Display
 */
import React, { useState } from 'react';
import { Fingerprint, Key, Copy, Check, Globe } from 'lucide-react';

interface NodeIdentityProps {
  fingerprint?: string;
  v3Identity?: string;
  nickname: string;
  onionAddress?: string;
}

export const NodeIdentity: React.FC<NodeIdentityProps> = ({
  fingerprint,
  v3Identity,
  nickname,
  onionAddress,
}) => {
  const [copied, setCopied] = useState<string | null>(null);

  const copyToClipboard = async (text: string, type: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(type);
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-4 space-y-3">
      <h4 className="font-medium text-white flex items-center gap-2 pb-2 border-b border-gray-700">
        <Key size={16} className="text-[#88CED0]" />
        Identity - {nickname}
      </h4>

      {/* Fingerprint */}
      {fingerprint && (
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-500 flex items-center gap-1">
              <Fingerprint size={10} /> Fingerprint
            </span>
            <button
              onClick={() => copyToClipboard(fingerprint, 'fingerprint')}
              className="text-gray-400 hover:text-[#88CED0] transition-colors"
            >
              {copied === 'fingerprint' ? <Check size={12} className="text-green-400" /> : <Copy size={12} />}
            </button>
          </div>
          <div className="font-mono text-xs text-gray-300 bg-gray-900/50 p-2 rounded break-all">
            {formatFingerprint(fingerprint)}
          </div>
        </div>
      )}

      {/* V3 Identity */}
      {v3Identity && (
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-500 flex items-center gap-1">
              <Key size={10} /> V3 Identity (Ed25519)
            </span>
            <button
              onClick={() => copyToClipboard(v3Identity, 'v3')}
              className="text-gray-400 hover:text-[#88CED0] transition-colors"
            >
              {copied === 'v3' ? <Check size={12} className="text-green-400" /> : <Copy size={12} />}
            </button>
          </div>
          <div className="font-mono text-xs text-gray-300 bg-gray-900/50 p-2 rounded break-all">
            {v3Identity}
          </div>
        </div>
      )}

      {/* Onion Address */}
      {onionAddress && (
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-500 flex items-center gap-1">
              <Globe size={10} /> Onion Address
            </span>
            <button
              onClick={() => copyToClipboard(onionAddress, 'onion')}
              className="text-gray-400 hover:text-[#88CED0] transition-colors"
            >
              {copied === 'onion' ? <Check size={12} className="text-green-400" /> : <Copy size={12} />}
            </button>
          </div>
          <div className="font-mono text-xs text-pink-400 bg-gray-900/50 p-2 rounded break-all">
            {onionAddress}
          </div>
        </div>
      )}

      {/* No identity info */}
      {!fingerprint && !v3Identity && !onionAddress && (
        <div className="text-gray-500 text-sm italic text-center py-2">
          No identity information available (Client node)
        </div>
      )}
    </div>
  );
};

// Format fingerprint with spaces for readability
const formatFingerprint = (fp: string): string => {
  return fp.replace(/(.{4})/g, '$1 ').trim();
};

export default NodeIdentity;
