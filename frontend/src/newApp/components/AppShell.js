import React from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import TopBar from './TopBar';
import '../styles/newApp.css';

export default function AppShell(){
  // CHURVOX_NEW_FRONTEND_ACTIVE_SHELL
  return <div className='newapp'><Sidebar /><main className='newapp-main'><TopBar /><Outlet /></main></div>;
}
