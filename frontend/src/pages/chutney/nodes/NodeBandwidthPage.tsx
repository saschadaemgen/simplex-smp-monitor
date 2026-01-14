import { useParams } from 'react-router-dom';
import { NodeBandwidth } from '../../../components/chutneX/nodes';

export default function NodeBandwidthPage() {
  const { id: networkId } = useParams<{ id: string }>();
  return <NodeBandwidth networkId={networkId!} />;
}
