import { useAuth } from '../../context/AuthContext';
export default function TradieTopBar(){const {user,logout}=useAuth();return <div className='tradie-topbar'><div>{user?.company_name||'Your Company'}</div><button className='btn secondary' onClick={logout}>Logout</button></div>}
