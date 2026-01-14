import { useParams } from 'react-router-dom';
import { PacketAnalysis } from '../../../components/chutneX/traffic';

export default function PacketAnalysisPage() {
  const { id: networkId } = useParams<{ id: string }>();
  return <PacketAnalysis networkId={networkId!} />;
}
