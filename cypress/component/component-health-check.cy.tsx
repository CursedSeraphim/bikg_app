import * as React from 'react';
import { mount } from 'cypress/react';
import { App } from '../../src/App';

describe('Health check for Cypress component test', () => {
  it('should mount App', () => {
    mount(<App />);
    cy.get('div').should('include.text', 'Content');
  });
});
