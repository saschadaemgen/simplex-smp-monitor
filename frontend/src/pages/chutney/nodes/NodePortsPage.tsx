import { useParams } from 'react-router-dom';
import { NodePortsDisplay } from '../../../components/chutneX/nodes';

export default function NodePortsPage() {
  const { id: networkId } = useParams<{ id: string }>();
  return <NodePortsDisplay networkId={networkId!} />;
}
