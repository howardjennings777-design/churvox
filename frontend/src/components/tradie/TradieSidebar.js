import { NavLink } from 'react-router-dom';
const nav=[['/smart-hub','Smart Hub'],['/jobs','Jobs'],['/clients','Clients'],['/quotes','Quotes'],['/invoices','Invoices'],['/team','Team'],['/timesheets','Payroll'],['/automation','Automation'],['/reports','Reports'],['/settings','Settings'],['/plans','Plans'],['/sms','Comms'],['/integrations','Integrations']];
export default function TradieSidebar(){return <aside className='tradie-sidebar'><div className='brand'>Churvox</div>{nav.map(([to,label])=><NavLink key={to} to={to} className='nav-link'>{label}</NavLink>)}</aside>}
