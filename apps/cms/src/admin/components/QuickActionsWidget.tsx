import { Box, Flex, Typography } from '@strapi/design-system';
import { Plus, File, GridFour, Television } from '@strapi/icons';
import { Link } from 'react-router-dom';

const actions = [
  {
    label: 'Nouvel article',
    description: 'Rédiger une actualité',
    to: '/content-manager/collection-types/api::article.article/create',
    icon: Plus,
    color: '#c41e3a',
  },
  {
    label: 'Articles',
    description: 'Gérer le contenu publié',
    to: '/content-manager/collection-types/api::article.article',
    icon: File,
    color: '#1d3557',
  },
  {
    label: 'Rubriques',
    description: 'Catégories éditoriales',
    to: '/content-manager/collection-types/api::category.category',
    icon: GridFour,
    color: '#2a9d8f',
  },
  {
    label: 'Vidéos TV',
    description: 'Contenus Wab-infos TV',
    to: '/content-manager/collection-types/api::video.video',
    icon: Television,
    color: '#d62828',
  },
] as const;

export default function QuickActionsWidget() {
  return (
    <Box padding={4}>
      <Flex direction="column" gap={3}>
        {actions.map(({ label, description, to, icon: Icon, color }) => (
          <Link key={to} to={to} style={{ textDecoration: 'none' }}>
            <Flex
              alignItems="center"
              gap={3}
              padding={3}
              hasRadius
              background="neutral0"
              borderColor="neutral200"
              style={{
                border: '1px solid var(--neutral200, #eaeaef)',
                borderRadius: '8px',
                transition: 'border-color 0.15s ease, box-shadow 0.15s ease',
              }}
            >
              <Flex
                alignItems="center"
                justifyContent="center"
                width="40px"
                height="40px"
                hasRadius
                style={{
                  backgroundColor: `${color}14`,
                  borderRadius: '10px',
                  flexShrink: 0,
                }}
              >
                <Icon fill={color} width="18px" height="18px" />
              </Flex>
              <Box style={{ flex: 1, minWidth: 0 }}>
                <Typography fontWeight="bold" textColor="neutral800">
                  {label}
                </Typography>
                <Typography variant="pi" textColor="neutral600">
                  {description}
                </Typography>
              </Box>
            </Flex>
          </Link>
        ))}
      </Flex>
    </Box>
  );
}
