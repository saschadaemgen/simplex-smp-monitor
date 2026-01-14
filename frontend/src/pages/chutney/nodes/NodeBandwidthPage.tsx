import { useParams } from 'react-router-dom';
const NodeBandwidthPage = () => {
  const { id } = useParams<{ id: string }>();
  return (
    <div className="h-full bg-[#0a0a0f] p-6">
      <h1 className="text-2xl font-bold text-[#88CED0]">Node Bandwidth</h1>
      <p className="text-gray-500">Network: {id}</p>
    </div>
  );
};
export default NodeBandwidthPage;
