import React from 'react';
import FlightDeckPage from './FlightDeckPage';
import SmartHubErrorBoundary from '../components/SmartHubErrorBoundary';

export default function DashboardPage(){
  return <SmartHubErrorBoundary><FlightDeckPage /></SmartHubErrorBoundary>;
}
