import { siteConfig } from '@/config/site';

/** Subscribe with Google (Reader Revenue Manager / CMS Sync) — pages article uniquement */
export function GoogleSwgBasicScripts() {
  const productId = siteConfig.swgProductId;
  if (!productId) return null;

  return (
    <>
      <script
        async
        src="https://news.google.com/swg/js/v1/swg-basic.js"
        type="application/javascript"
      />
      <script
        dangerouslySetInnerHTML={{
          __html: `(self.SWG_BASIC = self.SWG_BASIC || []).push(function(basicSubscriptions) {
  basicSubscriptions.init({
    type: "NewsArticle",
    isPartOfType: ["Product"],
    isPartOfProductId: ${JSON.stringify(productId)},
    clientOptions: { theme: "light", lang: "fr" },
  });
});`,
        }}
      />
    </>
  );
}
