import { useParams } from 'react-router-dom';
import { TrafficOverview } from '../../../components/chutneX/traffic';

export default function TrafficOverviewPage() {
  const { id: networkId } = useParams<{ id: string }>();
  return <TrafficOverview networkId={networkId!} />;
}
