import { useParams } from 'react-router-dom';
import { CircuitStats } from '../../../components/chutneX/circuits';

export default function CircuitStatsPage() {
  const { id: networkId } = useParams<{ id: string }>();
  return <CircuitStats networkId={networkId!} />;
}
