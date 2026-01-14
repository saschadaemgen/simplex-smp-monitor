import { useParams } from 'react-router-dom';
import { ConsensusInfo } from '../../../components/chutneX/overview';

export default function ConsensusInfoPage() {
  const { id: networkId } = useParams<{ id: string }>();
  return <ConsensusInfo networkId={networkId!} />;
}
