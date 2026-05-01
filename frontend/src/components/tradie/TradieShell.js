import { Outlet } from 'react-router-dom';
import TradieSidebar from './TradieSidebar';
import TradieTopBar from './TradieTopBar';
// CHURVOX_TRADIE_V3_ACTIVE_SHELL
export default function TradieShell(){return <div className='tradie-shell'><TradieSidebar/><main className='tradie-main'><TradieTopBar/><Outlet/></main></div>}
