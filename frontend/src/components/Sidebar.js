import { NavLink } from 'react-router-dom';
const nav=['/smart-hub','/jobs','/clients','/quotes','/invoices','/team','/timesheets','/automation','/reports','/settings','/plans','/sms','/integrations'];
export default function Sidebar(){return <aside className='sidebar'><h2>Churvox</h2>{nav.map(n=><NavLink key={n} to={n}>{n.replace('/','')||'home'}</NavLink>)}</aside>}
