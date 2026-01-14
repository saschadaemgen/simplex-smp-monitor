import { useParams } from 'react-router-dom';
import { TrafficPatterns } from '../../../components/chutneX/forensics';

export default function TrafficPatternsPage() {
  const { id: networkId } = useParams<{ id: string }>();
  return <TrafficPatterns networkId={networkId!} />;
}
