import { useParams } from 'react-router-dom';
import { NodeGrid } from '../../../components/chutneX/nodes';

export default function NodeGridPage() {
  const { id: networkId } = useParams<{ id: string }>();
  return <NodeGrid networkId={networkId!} />;
}
