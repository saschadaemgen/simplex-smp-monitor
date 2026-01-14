import { useParams } from 'react-router-dom';
const CaptureDetailPage = () => {
  const { id, captureId } = useParams<{ id: string; captureId: string }>();
  return (
    <div className="h-full bg-[#0a0a0f] p-6">
      <h1 className="text-2xl font-bold text-[#88CED0]">Capture Detail</h1>
      <p className="text-gray-500">Network: {id} | Capture: {captureId}</p>
    </div>
  );
};
export default CaptureDetailPage;
