import { useParams } from 'react-router-dom';
import { CircuitsList } from '../../../components/chutneX/circuits';

export default function CircuitsListPage() {
  const { id: networkId } = useParams<{ id: string }>();
  return <CircuitsList networkId={networkId!} />;
}
