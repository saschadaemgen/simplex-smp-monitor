import { useParams } from 'react-router-dom';
import { CircuitPathViz } from '../../../components/chutneX/circuits';

export default function CircuitPathPage() {
  const { id: networkId } = useParams<{ id: string }>();
  return <CircuitPathViz networkId={networkId!} />;
}
