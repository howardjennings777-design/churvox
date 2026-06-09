import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import RecordWorkspacePopupBridgeV2 from './components/RecordWorkspacePopupBridgeV2';
import AIOperatorSlipBoard from './components/AIOperatorSlipBoard';
import './index.css';
import './styles/churvoxFullPageModals.css';
import './components/recordWorkspacePopup.css';
import './concept-c/LoggedInLightBackgroundOverride.css';
import './industrial-command-global.css';
import './public-industrial-theme.css';
import './background-only-force.css';
import './command-force-dark-boxes.css';
import './command-money-under-header.css';
import './runtime/churvoxClearOldCache';
import './runtime/churvoxSlipOnlyMode';
import './styles/jobs-board-clean-polish.css';
import './churvox-readable-final.css';

// CHURVOX_JOBS_BOARD_ROUTE_CLASS_20260609
if (typeof window !== 'undefined' && !window.__CHURVOX_JOBS_BOARD_ROUTE_CLASS__) {
  window.__CHURVOX_JOBS_BOARD_ROUTE_CLASS__ = true;

  const syncJobsBoardClass = () => {
    const path = window.location.pathname || '';
    const onJobsBoard = path === '/jobs' || path === '/jobs