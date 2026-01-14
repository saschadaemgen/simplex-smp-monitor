import React from 'react';
import { useParams } from 'react-router-dom';

const CircuitDetailPage: React.FC = () => {
  const { id, circuitId } = useParams<{ id: string; circuitId: string }>();
  return (
    <div className="h-full bg-[#0a0a0f] p-6">
      <h1 className="text-2xl font-bold text-[#88CED0]">Circuit Detail</h1>
      <p className="text-gray-500">Network: {id} | Circuit: {circuitId}</p>
    </div>
  );
};

export default CircuitDetailPage;
