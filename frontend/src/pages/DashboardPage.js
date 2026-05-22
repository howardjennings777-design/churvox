import React from 'react';
import TechFlowDeskPage from './TechFlowDeskPage';
import SmartHubErrorBoundary from '../components/SmartHubErrorBoundary';

export default function DashboardPage(){
  return <SmartHubErrorBoundary><TechFlowDeskPage /></SmartHubErrorBoundary>;
}
