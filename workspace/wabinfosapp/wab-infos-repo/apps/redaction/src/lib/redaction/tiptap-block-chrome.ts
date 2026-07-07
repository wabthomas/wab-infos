import { Extension } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import { Decoration, DecorationSet } from '@tiptap/pm/view';

const blockChromeKey = new PluginKey('blockChrome');

export const BlockChrome = Extension.create({
  name: 'blockChrome',

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: blockChromeKey,
        props: {
          decorations(state) {
            const decorations: Decoration[] = [];
            const { doc } = state;

            doc.descendants((node, pos, parent) => {
              if (parent?.type.name !== 'doc') return;
              decorations.push(
                Decoration.node(pos, pos + node.nodeSize, {
                  class: 'editor-block-card',
                  'data-block-type': node.type.name,
                })
              );
            });

            return DecorationSet.create(doc, decorations);
          },
        },
      }),
    ];
  },
});
