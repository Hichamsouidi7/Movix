import React from 'react';
import HubWebView from '../components/HubWebView';

/**
 * YouTube intégré de manière propre et fluide dans Movix via HubWebView.
 */
export const YouTubeHubPage: React.FC = () => (
  <HubWebView url="https://www.youtube.com" serviceName="YouTube" accentClass="text-red-500" />
);

export default YouTubeHubPage;
