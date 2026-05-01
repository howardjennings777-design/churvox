import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import TopBar from './TopBar';
// CHURVOX_NEW_PREMIUM_TRADIE_SHELL_ACTIVE
export default function AppShell(){return <div className='app'><Sidebar/><div className='main'><TopBar/><div className='content'><Outlet/></div></div></div>}
