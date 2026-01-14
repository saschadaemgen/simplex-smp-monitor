import { useParams } from 'react-router-dom';
import { LoadingSpinner } from '../../../components/chutneX/shared';

export default function UIComponentsPage() {
  const { id: networkId } = useParams<{ id: string }>();
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-white mb-6">UI Components</h1>
      <p className="text-slate-400 mb-8">Network: {networkId}</p>
      <LoadingSpinner />
    </div>
  );
}
