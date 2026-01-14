import { useParams } from 'react-router-dom';
import { NetworkConfig } from '../../../components/chutneX/overview';

export default function NetworkConfigPage() {
  const { id: networkId } = useParams<{ id: string }>();
  return <NetworkConfig networkId={networkId!} />;
}
