import { useAuth } from '../context/AuthContext';
export default function TopBar(){const {user,logout}=useAuth();return <header className='topbar'><span>{user?.name||user?.email}</span><button onClick={logout}>Logout</button></header>}
