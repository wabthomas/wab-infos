/* Styles de secours si la redirection vers wab-admin-login.html est lente */
export const AUTH_FALLBACK_CSS = `
  body {
    background: #fafafa !important;
  }

  [data-strapi='auth'],
  [data-strapi='unauthenticated'] {
    background: linear-gradient(160deg, #0c0c0f 0%, #1a1a22 40%, #1d3557 100%) !important;
    min-height: 100vh;
  }

  [data-strapi='auth'] main,
  [data-strapi='unauthenticated'] main {
    max-width: 28rem !important;
  }

  [data-strapi='auth'] form,
  [data-strapi='unauthenticated'] form {
    border-radius: 1rem !important;
    border: 1px solid rgba(255, 255, 255, 0.08) !important;
    background: #ffffff !important;
    box-shadow: 0 24px 48px -12px rgb(0 0 0 / 0.35) !important;
    padding: 2rem !important;
  }

  [data-strapi='auth'] h1,
  [data-strapi='unauthenticated'] h1 {
    font-family: Georgia, 'Times New Roman', serif !important;
    font-weight: 700 !important;
    color: #111827 !important;
  }

  [data-strapi='auth'] button[type='submit'],
  [data-strapi='unauthenticated'] button[type='submit'] {
    background: #c41e3a !important;
    border-color: #c41e3a !important;
    border-radius: 0.5rem !important;
    font-weight: 600 !important;
    width: 100% !important;
  }

  [data-strapi='auth'] button[type='submit']:hover,
  [data-strapi='unauthenticated'] button[type='submit']:hover {
    background: #a01830 !important;
  }

  [data-strapi='auth'] a[href*='forgot'],
  [data-strapi='auth'] a[href*='register'] {
    color: #c41e3a !important;
  }
`;
