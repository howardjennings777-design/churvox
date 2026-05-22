import React from 'react';
import PulseConsolePage from './PulseConsolePage';
import SmartHubErrorBoundary from '../components/SmartHubErrorBoundary';

export default function DashboardPage(){
  return <SmartHubErrorBoundary><PulseConsolePage /></SmartHubErrorBoundary>;
}
