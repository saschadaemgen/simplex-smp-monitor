import { useParams } from 'react-router-dom';
import { FlowAnalysis } from '../../../components/chutneX/traffic';

export default function FlowAnalysisPage() {
  const { id: networkId } = useParams<{ id: string }>();
  return <FlowAnalysis networkId={networkId!} />;
}
