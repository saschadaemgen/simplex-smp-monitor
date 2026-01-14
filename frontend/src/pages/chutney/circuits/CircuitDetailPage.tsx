import { useParams } from 'react-router-dom';
import { CircuitCard } from '../../../components/chutneX/circuits';

export default function CircuitDetailPage() {
  const { id: networkId, circuitId } = useParams<{ id: string; circuitId?: string }>();
  return <CircuitCard networkId={networkId!} circuitId={circuitId} />;
}
