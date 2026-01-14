import { useParams } from 'react-router-dom';
import { CircuitEventLog } from '../../../components/chutneX/circuits';

export default function CircuitEventsPage() {
  const { id: networkId } = useParams<{ id: string }>();
  return <CircuitEventLog networkId={networkId!} />;
}
