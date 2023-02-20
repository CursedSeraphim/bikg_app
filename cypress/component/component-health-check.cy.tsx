import * as React from 'react';
import { mount } from 'cypress/react';
import { VisynApp, VisynAppProvider } from 'visyn_core';

describe('Health check for Cypress component test', () => {
  it('should mount App', () => {
    mount(
      <VisynAppProvider appName="bikg_app">
        <VisynApp loginMenu={null}>Hello bikg_app!</VisynApp>
      </VisynAppProvider>,
    );
    cy.get('div').should('include.text', 'Hello bikg_app!');
  });
});
