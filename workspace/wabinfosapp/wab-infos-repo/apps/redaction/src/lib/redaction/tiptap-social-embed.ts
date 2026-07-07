import { Node, mergeAttributes } from '@tiptap/core';

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    socialEmbed: {
      setSocialEmbed: (attrs: {
        platform: string;
        url: string;
        embedUrl: string;
      }) => ReturnType;
    };
  }
}

export const SocialEmbed = Node.create({
  name: 'socialEmbed',
  group: 'block',
  atom: true,
  draggable: true,
  selectable: true,

  addAttributes() {
    return {
      platform: { default: 'twitter' },
      url: { default: null },
      embedUrl: { default: null },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'div[data-social-embed]',
        getAttrs: (element) => {
          if (!(element instanceof HTMLElement)) return {};
          const platform = element.getAttribute('data-social-embed') ?? 'twitter';
          const iframe = element.querySelector('iframe');
          const embedUrl = iframe?.getAttribute('src') ?? null;
          return { platform, embedUrl, url: embedUrl };
        },
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    const platform = HTMLAttributes.platform ?? 'generic';
    return [
      'div',
      mergeAttributes(HTMLAttributes, {
        'data-social-embed': platform,
        class: `social-embed social-embed--${platform}`,
      }),
      [
        'iframe',
        {
          src: HTMLAttributes.embedUrl,
          frameborder: '0',
          allowfullscreen: 'true',
          loading: 'lazy',
          title: `Intégration ${platform}`,
        },
      ],
    ];
  },

  addCommands() {
    return {
      setSocialEmbed:
        (attrs) =>
        ({ commands }) =>
          commands.insertContent({ type: this.name, attrs }),
    };
  },
});
