import React from 'react';
import { useAuth } from '../../context/AuthContext';
export default function TopBar(){const {user}=useAuth(); return <div className='newapp-top'><h1>Premium Workspace</h1><div>{user?.email}</div></div>}
