import { Book, Earth, ListPlus } from '@strapi/icons';

import AuthLogo from './extensions/logo-auth.svg';
import MenuLogo from './extensions/logo-menu.svg';
import Favicon from './extensions/favicon.svg';

const wabTheme = {
  light: {
    colors: {
      primary100: '#fce8ec',
      primary200: '#f5c2cb',
      primary500: '#d62d47',
      primary600: '#c41e3a',
      primary700: '#9b1830',
      alternative100: '#e8eef5',
      alternative200: '#c5d4e8',
      alternative500: '#2a5080',
      alternative600: '#1d3557',
      alternative700: '#152a45',
      buttonPrimary500: '#c41e3a',
      buttonPrimary600: '#a01830',
    },
  },
  dark: {
    colors: {
      primary100: '#3d1520',
      primary200: '#5c2030',
      primary500: '#e63946',
      primary600: '#f04a57',
      primary700: '#ff8a93',
      alternative600: '#457b9d',
      buttonPrimary500: '#e63946',
      buttonPrimary600: '#c41e3a',
    },
  },
};

const frTranslations = {
  'Auth.form.welcome.title': 'Bienvenue sur Wab-infos',
  'Auth.form.welcome.subtitle': 'Connectez-vous à votre espace rédaction',
  'Auth.form.button.login': 'Connexion',
  'Auth.form.button.register': 'Créer mon compte',
  'Auth.form.email.label': 'Adresse e-mail',
  'Auth.form.password.label': 'Mot de passe',
  'app.components.HomePage.welcome': 'Bienvenue dans la rédaction Wab-infos',
  'app.components.HomePage.welcome.again': 'Bon retour sur Wab-infos',
  'app.components.HomePage.button.blog': 'Voir le site',
  'global.home': 'Tableau de bord',
  'global.content-manager': 'Contenus',
  'global.settings': 'Paramètres',
  'content-manager.widget.last-edited.title': 'Dernières modifications',
  'content-manager.widget.last-published.title': 'Dernières publications',
  'widget.profile.title': 'Mon profil',
  'widget.key-statistics.title': 'Statistiques du projet',
};

export default {
  config: {
    auth: {
      logo: AuthLogo,
    },
    menu: {
      logo: MenuLogo,
    },
    head: {
      favicon: Favicon,
    },
    locales: ['fr', 'en'],
    theme: wabTheme,
    tutorials: false,
    notifications: {
      releases: false,
    },
    translations: {
      fr: frTranslations,
    },
  },

  register(app: { widgets: { register: (widgets: unknown) => void } }) {
    app.widgets.register([
      {
        id: 'quick-actions',
        icon: ListPlus,
        title: {
          id: 'wab.widget.quick-actions.title',
          defaultMessage: 'Actions rapides',
        },
        component: async () => {
          const mod = await import('./components/QuickActionsWidget');
          return mod.default;
        },
        link: {
          label: {
            id: 'wab.widget.quick-actions.link',
            defaultMessage: 'Tous les articles',
          },
          href: '/content-manager/collection-types/api::article.article',
        },
      },
      {
        id: 'site-links',
        icon: Earth,
        title: {
          id: 'wab.widget.site-links.title',
          defaultMessage: 'Site & diffusion',
        },
        component: async () => {
          const mod = await import('./components/SiteLinksWidget');
          return mod.default;
        },
      },
      {
        id: 'editorial-guide',
        icon: Book,
        title: {
          id: 'wab.widget.guide.title',
          defaultMessage: 'Guide éditorial',
        },
        component: async () => {
          const mod = await import('./components/EditorialGuideWidget');
          return mod.default;
        },
        link: {
          label: {
            id: 'wab.widget.guide.link',
            defaultMessage: 'Permissions publiques',
          },
          href: '/settings/users-permissions/roles',
        },
      },
    ]);
  },

  bootstrap() {
    if (typeof document === 'undefined') return;

    const style = document.createElement('style');
    style.textContent = `
      [data-strapi="auth"] {
        background: linear-gradient(135deg, #0c0c0f 0%, #1a1a22 50%, #1d3557 100%) !important;
      }
      [data-strapi="auth"] form {
        border-radius: 1rem;
        box-shadow: 0 24px 48px -12px rgb(0 0 0 / 0.35);
      }
    `;
    document.head.appendChild(style);
  },
};
