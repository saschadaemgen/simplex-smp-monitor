import { useParams } from 'react-router-dom';
const NodeDetailPage = () => {
  const { id, nodeId } = useParams<{ id: string; nodeId: string }>();
  return (
    <div className="h-full bg-[#0a0a0f] p-6">
      <h1 className="text-2xl font-bold text-[#88CED0]">Node Detail</h1>
      <p className="text-gray-500">Network: {id} | Node: {nodeId}</p>
    </div>
  );
};
export default NodeDetailPage;
