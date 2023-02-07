describe('Health check for Cypress e2e test', () => {
  it('Shows the start page', () => {
    cy.get('div').should('include.text', 'Content');
  });
});
