import { useParams } from 'react-router-dom';
import { CellAnalysis } from '../../../components/chutneX/forensics';

export default function CellAnalysisPage() {
  const { id: networkId } = useParams<{ id: string }>();
  return <CellAnalysis networkId={networkId!} />;
}
