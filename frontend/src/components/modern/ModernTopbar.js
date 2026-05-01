import { useAuth } from '../../context/AuthContext';
import ModernButton from './ModernButton';
export default function ModernTopbar() { const { user, logout } = useAuth(); return <header className="modern-topbar"><div><strong>{user?.company_name || 'Churvox Business'}</strong><p>{user?.name || user?.email || 'Tradie owner'}</p></div><ModernButton variant="secondary" onClick={logout}>Logout</ModernButton></header>; }
