import React from 'react';
import HubWebView from '../components/HubWebView';

/**
 * Twitch intégré dans Movix, avec le compte Twitch connecté dans l'application
 * (session partagée — voir HubWebView).
 */
export const TwitchHubPage: React.FC = () => (
  <HubWebView url="https://www.twitch.tv" serviceName="Twitch" accentClass="text-purple-500" />
);

export default TwitchHubPage;
