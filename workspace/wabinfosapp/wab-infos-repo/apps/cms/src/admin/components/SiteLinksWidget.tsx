import { Box, Flex, Typography, LinkButton } from '@strapi/design-system';
import { Earth, Link as LinkIcon, List } from '@strapi/icons';

const siteUrl =
  (typeof process !== 'undefined' && process.env.NEXT_PUBLIC_SITE_URL) ||
  'http://localhost:3000';

const links = [
  {
    label: 'Voir le site',
    description: siteUrl,
    href: siteUrl,
    external: true,
    icon: Earth,
  },
  {
    label: 'Flux RSS',
    description: `${siteUrl}/feed.xml`,
    href: `${siteUrl}/feed.xml`,
    external: true,
    icon: List,
  },
  {
    label: 'Wab-infos TV',
    description: `${siteUrl}/tv`,
    href: `${siteUrl}/tv`,
    external: true,
    icon: LinkIcon,
  },
] as const;

export default function SiteLinksWidget() {
  return (
    <Box padding={4}>
      <Flex direction="column" gap={3}>
        <Typography variant="pi" textColor="neutral600">
          Accès rapide au frontend public et aux flux de diffusion.
        </Typography>
        {links.map(({ label, description, href, icon: Icon }) => (
          <Flex
            key={href}
            alignItems="center"
            justifyContent="space-between"
            gap={3}
            padding={3}
            hasRadius
            background="neutral100"
            style={{ borderRadius: '8px' }}
          >
            <Flex alignItems="center" gap={3} style={{ minWidth: 0 }}>
              <Icon width="18px" height="18px" />
              <Box style={{ minWidth: 0 }}>
                <Typography fontWeight="bold">{label}</Typography>
                <Typography variant="pi" textColor="neutral600" ellipsis>
                  {description}
                </Typography>
              </Box>
            </Flex>
            <LinkButton
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              size="S"
              variant="secondary"
            >
              Ouvrir
            </LinkButton>
          </Flex>
        ))}
      </Flex>
    </Box>
  );
}
