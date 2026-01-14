import { useParams } from 'react-router-dom';
import { NodeFlags } from '../../../components/chutneX/nodes';

export default function NodeFlagsPage() {
  const { id: networkId } = useParams<{ id: string }>();
  return <NodeFlags networkId={networkId!} />;
}
