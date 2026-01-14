import { useParams } from 'react-router-dom';
import { IntegrationHub } from '../../../components/chutneX/integration';

export default function IntegrationHubPage() {
  const { id: networkId } = useParams<{ id: string }>();
  return <IntegrationHub networkId={networkId!} />;
}
