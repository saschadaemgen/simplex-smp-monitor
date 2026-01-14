import { useParams } from 'react-router-dom';
import { CircuitFlowDiagram } from '../../../components/chutneX/visualization';

export default function CircuitFlowPage() {
  const { id: networkId } = useParams<{ id: string }>();
  return <CircuitFlowDiagram networkId={networkId!} />;
}
