import { Injectable } from '@angular/core';
import { OAuthService, AuthConfig } from 'angular-oauth2-oidc';

const authConfig: AuthConfig = {
  // Replace these placeholders with your Keycloak server values
  issuer: 'https://YOUR_KEYCLOAK_DOMAIN/auth/realms/YOUR_REALM',
  clientId: 'xfcs-frontend',
  redirectUri: window.location.origin,
  responseType: 'code',
  scope: 'openid profile email',
};

@Injectable({ providedIn: 'root' })
export class AuthService {
  constructor(private oauthService: OAuthService) {
    this.oauthService.configure(authConfig);
    // Do not auto-try login in this scaffold; the developer can enable it when Keycloak is available.
  }

  login() { this.oauthService.initLoginFlow(); }
  logout() { this.oauthService.logOut(); }
  isLoggedIn() { return this.oauthService.hasValidAccessToken(); }
}
