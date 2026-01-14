import { useParams } from 'react-router-dom';
import { ForensicsOverview } from '../../../components/chutneX/forensics';

export default function ForensicsOverviewPage() {
  const { id: networkId } = useParams<{ id: string }>();
  return <ForensicsOverview networkId={networkId!} />;
}
