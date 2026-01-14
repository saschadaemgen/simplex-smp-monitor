import { useParams } from 'react-router-dom';
import { SuricataAlerts } from '../../../components/chutneX/integration';

export default function SuricataAlertsPage() {
  const { id: networkId } = useParams<{ id: string }>();
  return <SuricataAlerts networkId={networkId!} />;
}
