import { useParams } from 'react-router-dom';
import { NetworkTopology } from '../../../components/chutneX/visualization';

export default function NetworkTopologyPage() {
  const { id: networkId } = useParams<{ id: string }>();
  return <NetworkTopology networkId={networkId!} />;
}
