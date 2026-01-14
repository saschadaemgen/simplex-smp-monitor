import { useParams } from 'react-router-dom';
import { CircuitFilters } from '../../../components/chutneX/circuits';

export default function CircuitFiltersPage() {
  const { id: networkId } = useParams<{ id: string }>();
  return <CircuitFilters networkId={networkId!} />;
}
