import { useParams } from 'react-router-dom';
import { NodeIdentity } from '../../../components/chutneX/nodes';

export default function NodeIdentityPage() {
  const { id: networkId } = useParams<{ id: string }>();
  return <NodeIdentity networkId={networkId!} />;
}
