import { Box, Flex, Typography } from '@strapi/design-system';
import { Check, BulletList } from '@strapi/icons';
import { Link } from 'react-router-dom';

const steps = [
  {
    done: true,
    title: 'Compte administrateur créé',
    detail: 'Vous êtes connecté à la rédaction.',
  },
  {
    done: true,
    title: 'Rubriques éditoriales',
    detail: '9 catégories préconfigurées (RDC, Politique, Sports…).',
  },
  {
    done: false,
    title: 'Permissions API publique',
    detail: 'Settings → Users & Permissions → Roles → Public → find/findOne.',
    href: '/settings/users-permissions/roles/2',
  },
  {
    done: false,
    title: 'Publier vos premiers articles',
    detail: 'Content Manager → Article → Create new entry.',
    href: '/content-manager/collection-types/api::article.article/create',
  },
] as const;

export default function EditorialGuideWidget() {
  return (
    <Box padding={4}>
      <Flex direction="column" gap={4}>
        <Typography variant="pi" textColor="neutral600">
          Checklist pour mettre Wab-infos en ligne avec le frontend Next.js.
        </Typography>
        <Flex direction="column" gap={3}>
          {steps.map((step) => (
            <Flex key={step.title} alignItems="flex-start" gap={3}>
              <Flex
                alignItems="center"
                justifyContent="center"
                width="24px"
                height="24px"
                hasRadius
                style={{
                  borderRadius: '999px',
                  backgroundColor: step.done ? '#c41e3a' : '#eaeaef',
                  flexShrink: 0,
                  marginTop: '2px',
                }}
              >
                {step.done ? (
                  <Check width="12px" height="12px" fill="#fff" />
                ) : (
                  <BulletList width="12px" height="12px" fill="#8e8ea9" />
                )}
              </Flex>
              <Box style={{ flex: 1 }}>
                <Typography fontWeight="bold" textColor={step.done ? 'neutral800' : 'neutral700'}>
                  {step.title}
                </Typography>
                <Typography variant="pi" textColor="neutral600">
                  {step.detail}
                </Typography>
                {'href' in step && step.href && (
                  <Box paddingTop={1}>
                    <Link to={step.href} style={{ color: '#c41e3a', fontSize: '12px', fontWeight: 600 }}>
                      Configurer →
                    </Link>
                  </Box>
                )}
              </Box>
            </Flex>
          ))}
        </Flex>
      </Flex>
    </Box>
  );
}
