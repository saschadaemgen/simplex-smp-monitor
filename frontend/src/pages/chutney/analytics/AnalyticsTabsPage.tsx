import { useParams } from 'react-router-dom';
import { AnalyticsTabs } from '../../../components/chutneX/analytics';

export default function AnalyticsTabsPage() {
  const { id: networkId } = useParams<{ id: string }>();
  return <AnalyticsTabs networkId={networkId!} />;
}
