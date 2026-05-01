import { useAuth } from '../../context/AuthContext';
import TradieButton from './TradieButton';

export default function TradieTopBar() {
  const { user, logout } = useAuth();

  return (
    <div className="tradie-topbar">
      <div>
        <strong>{user?.company_name || 'Your Company'}</strong>
        <p>{user?.name || user?.email || 'Owner'}</p>
      </div>
      <TradieButton variant="secondary" onClick={logout}>
        Logout
      </TradieButton>
    </div>
  );
}
