import { useParams } from 'react-router-dom';
import { NodeDetailCard } from '../../../components/chutneX/nodes';

export default function NodeDetailPage() {
  const { id: networkId, nodeId } = useParams<{ id: string; nodeId?: string }>();
  return <NodeDetailCard networkId={networkId!} nodeId={nodeId} />;
}
