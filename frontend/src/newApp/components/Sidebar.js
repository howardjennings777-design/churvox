import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
const items=[['/smart-hub','Smart Hub'],['/jobs','Jobs'],['/clients','Clients'],['/quotes','Quotes'],['/invoices','Invoices'],['/team','Team'],['/timesheets','Payroll'],['/automation','Automation'],['/reports','Reports'],['/settings','Settings'],['/plans','Plans'],['/sms','Communications'],['/integrations','Integrations']];
export default function Sidebar(){const {normalizedRole}=useAuth();return <aside className='newapp-sidebar'><div className='newapp-logo'>Churvox</div><nav className='newapp-nav'>{items.filter(i=>!(i[0]==='/timesheets'&&!['owner','manager','payroll'].includes(normalizedRole))).map(([to,label])=><NavLink key={to} to={to} className={({isActive})=>isActive?'active':''}>{label}</NavLink>)}</nav></aside>}
