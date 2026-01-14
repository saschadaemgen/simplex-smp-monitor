import { useParams } from 'react-router-dom';
import { NetworkStatsCards } from '../../../components/chutneX/overview';

export default function StatsCardsPage() {
  const { id: networkId } = useParams<{ id: string }>();
  return <NetworkStatsCards networkId={networkId!} />;
}
