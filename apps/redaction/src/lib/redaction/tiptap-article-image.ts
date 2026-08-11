import { mergeAttributes } from '@tiptap/core';
import Image from '@tiptap/extension-image';

/**
 * Image dans le corps d’article (style Jetpack) :
 * - légende = `title` / `data-caption` / <figcaption>
 * - pas de champ alt éditorial ici (alt réservé à l’image à la une)
 */
export const ArticleImage = Image.extend({
  name: 'image',

  addOptions() {
    return {
      ...this.parent?.(),
      inline: false,
    };
  },

  addAttributes() {
    return {
      ...this.parent?.(),
      alt: {
        default: null,
      },
      title: {
        default: null,
        parseHTML: (element) => {
          if (!(element instanceof HTMLElement)) return null;
          const figCaption =
            element.tagName === 'FIGURE'
              ? element.querySelector('figcaption')?.textContent?.trim()
              : element.closest('figure')?.querySelector('figcaption')?.textContent?.trim();
          return (
            element.getAttribute('data-caption') ||
            element.getAttribute('title') ||
            figCaption ||
            null
          );
        },
        renderHTML: (attributes) => {
          const caption =
            typeof attributes.title === 'string' ? attributes.title.trim() : '';
          if (!caption) return {};
          return {
            title: caption,
            'data-caption': caption,
          };
        },
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'figure',
        getAttrs: (node) => {
          if (!(node instanceof HTMLElement)) return false;
          const img = node.querySelector('img');
          if (!img?.getAttribute('src')) return false;
          const caption =
            node.querySelector('figcaption')?.textContent?.trim() ||
            img.getAttribute('data-caption') ||
            img.getAttribute('title') ||
            null;
          return {
            src: img.getAttribute('src'),
            alt: img.getAttribute('alt'),
            title: caption,
          };
        },
      },
      {
        tag: 'img[src]',
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    const caption =
      (typeof HTMLAttributes['data-caption'] === 'string'
        ? HTMLAttributes['data-caption'].trim()
        : '') ||
      (typeof HTMLAttributes.title === 'string' ? HTMLAttributes.title.trim() : '');

    const imgAttrs = mergeAttributes(this.options.HTMLAttributes, HTMLAttributes);
    if (!caption) {
      return ['img', imgAttrs];
    }

    return [
      'figure',
      { class: 'article-image-figure' },
      ['img', imgAttrs],
      ['figcaption', { class: 'article-image-caption' }, caption],
    ];
  },
});
