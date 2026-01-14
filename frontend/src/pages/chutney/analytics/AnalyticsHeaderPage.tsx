import { useParams } from 'react-router-dom';
import { AnalyticsHeader } from '../../../components/chutneX/analytics';

export default function AnalyticsHeaderPage() {
  const { id: networkId } = useParams<{ id: string }>();
  return <AnalyticsHeader networkId={networkId!} />;
}
