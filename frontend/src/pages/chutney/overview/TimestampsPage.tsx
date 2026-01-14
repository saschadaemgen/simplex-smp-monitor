import { useParams } from 'react-router-dom';
import { NetworkTimestamps } from '../../../components/chutneX/overview';

export default function TimestampsPage() {
  const { id: networkId } = useParams<{ id: string }>();
  return <NetworkTimestamps networkId={networkId!} />;
}
