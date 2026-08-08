'use client';

import {
  DEFAULT_MOBILE_MONEY_OPERATORS,
  DEFAULT_SUPPORT_METHODS,
  type MobileMoneyOperator,
  type SiteSupportSettings,
  type SupportDisplayMode,
  type SupportPaymentMethod,
  type SupportPaymentType,
} from '@wab-infos/shared';

function ToggleRow({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-start justify-between gap-4 rounded-2xl border border-border bg-card px-4 py-3">
      <span>
        <span className="block text-sm font-semibold text-foreground">{label}</span>
        <span className="mt-1 block text-xs leading-relaxed text-muted-foreground">{description}</span>
      </span>
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-1 h-5 w-5 shrink-0 accent-primary"
      />
    </label>
  );
}

const TYPE_LABELS: Record<SupportPaymentType, string> = {
  mobile_money: 'Mobile Money',
  card: 'Carte bancaire',
  crypto: 'Crypto / USDT',
};

const DISPLAY_MODE_LABELS: { id: SupportDisplayMode; label: string }[] = [
  { id: 'number', label: 'Numéro seul' },
  { id: 'qr', label: 'QR seul' },
  { id: 'both', label: 'Numéro + QR' },
];

function OperatorEditor({
  operator,
  onChange,
  onRemove,
}: {
  operator: MobileMoneyOperator;
  onChange: (next: MobileMoneyOperator) => void;
  onRemove: () => void;
}) {
  const patch = (partial: Partial<MobileMoneyOperator>) => onChange({ ...operator, ...partial });

  return (
    <div className="space-y-2 rounded-xl border border-border bg-card p-3">
      <div className="flex items-center justify-between gap-2">
        <input
          value={operator.label}
          onChange={(e) => patch({ label: e.target.value })}
          placeholder="Airtel Money"
          className="h-9 min-w-0 flex-1 rounded-lg border border-border bg-background px-2.5 text-sm font-semibold"
        />
        <label className="inline-flex shrink-0 items-center gap-1.5 text-[11px] font-semibold">
          <input
            type="checkbox"
            checked={operator.enabled}
            onChange={(e) => patch({ enabled: e.target.checked })}
            className="h-4 w-4 accent-primary"
          />
          Actif
        </label>
      </div>
      <input
        value={operator.number}
        onChange={(e) => patch({ number: e.target.value })}
        placeholder="+243 …"
        className="h-9 w-full rounded-lg border border-border bg-background px-2.5 text-sm"
      />
      <div className="flex flex-wrap items-center gap-2">
        <select
          value={operator.displayMode}
          onChange={(e) => patch({ displayMode: e.target.value as SupportDisplayMode })}
          className="h-9 flex-1 rounded-lg border border-border bg-background px-2.5 text-xs"
        >
          {DISPLAY_MODE_LABELS.map((opt) => (
            <option key={opt.id} value={opt.id}>
              Afficher : {opt.label}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={onRemove}
          className="h-9 rounded-lg border border-border px-2.5 text-[11px] font-bold text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          Retirer
        </button>
      </div>
    </div>
  );
}

function MethodEditor({
  method,
  onChange,
}: {
  method: SupportPaymentMethod;
  onChange: (next: SupportPaymentMethod) => void;
}) {
  const patch = (partial: Partial<SupportPaymentMethod>) => onChange({ ...method, ...partial });

  const updateOperator = (id: string, next: MobileMoneyOperator) => {
    patch({
      operators: method.operators.map((o) => (o.id === id ? next : o)),
    });
  };

  const addOperator = () => {
    const id = `op-${Date.now()}`;
    patch({
      operators: [
        ...method.operators,
        {
          id,
          label: 'Nouvel opérateur',
          number: '',
          displayMode: 'both',
          enabled: true,
          sortOrder: method.operators.length,
        },
      ],
    });
  };

  const resetOperators = () => {
    patch({
      operators: DEFAULT_MOBILE_MONEY_OPERATORS.map((o) => ({ ...o })),
    });
  };

  return (
    <div className="space-y-3 rounded-2xl border border-border bg-muted/20 p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-bold text-foreground">{method.label || TYPE_LABELS[method.type]}</p>
          <p className="text-[11px] text-muted-foreground">{TYPE_LABELS[method.type]}</p>
        </div>
        <label className="inline-flex items-center gap-2 text-xs font-semibold">
          <input
            type="checkbox"
            checked={method.enabled}
            onChange={(e) => patch({ enabled: e.target.checked })}
            className="h-4 w-4 accent-primary"
          />
          Actif
        </label>
      </div>

      <label className="block space-y-1">
        <span className="text-xs font-medium text-muted-foreground">Libellé affiché</span>
        <input
          value={method.label}
          onChange={(e) => patch({ label: e.target.value })}
          className="h-10 w-full rounded-lg border border-border bg-card px-3 text-sm"
        />
      </label>

      {method.type === 'mobile_money' ? (
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
              Opérateurs
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={resetOperators}
                className="rounded-lg border border-border px-2 py-1 text-[11px] font-bold hover:bg-muted"
              >
                Défaut
              </button>
              <button
                type="button"
                onClick={addOperator}
                className="rounded-lg border border-border px-2 py-1 text-[11px] font-bold hover:bg-muted"
              >
                + Ajouter
              </button>
            </div>
          </div>
          <p className="text-[11px] text-muted-foreground">
            Pour chaque opérateur : numéro et affichage (numéro, QR, ou les deux).
          </p>
          {method.operators.map((op) => (
            <OperatorEditor
              key={op.id}
              operator={op}
              onChange={(next) => updateOperator(op.id, next)}
              onRemove={() =>
                patch({ operators: method.operators.filter((o) => o.id !== op.id) })
              }
            />
          ))}
        </div>
      ) : null}

      {method.type === 'crypto' ? (
        <label className="block space-y-1">
          <span className="text-xs font-medium text-muted-foreground">Adresse USDT (wallet)</span>
          <input
            value={method.account}
            onChange={(e) => patch({ account: e.target.value })}
            placeholder="T… ou 0x…"
            className="h-10 w-full rounded-lg border border-border bg-card px-3 text-sm"
          />
          <span className="block text-[11px] text-muted-foreground">
            Un QR avec logo Tether sera généré automatiquement sur /soutenir.
          </span>
        </label>
      ) : null}

      {method.type === 'card' || method.type === 'crypto' ? (
        <label className="block space-y-1">
          <span className="text-xs font-medium text-muted-foreground">
            {method.type === 'card'
              ? 'Lien de paiement (Stripe, Flutterwave…)'
              : 'Lien externe (optionnel)'}
          </span>
          <input
            value={method.paymentUrl}
            onChange={(e) => patch({ paymentUrl: e.target.value })}
            placeholder="https://…"
            className="h-10 w-full rounded-lg border border-border bg-card px-3 text-sm"
          />
        </label>
      ) : null}

      <label className="block space-y-1">
        <span className="text-xs font-medium text-muted-foreground">Consignes lecteur</span>
        <textarea
          value={method.instructions}
          onChange={(e) => patch({ instructions: e.target.value })}
          rows={2}
          className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm"
        />
      </label>
    </div>
  );
}

export function SupportSettingsEditor({
  support,
  onChange,
}: {
  support: SiteSupportSettings;
  onChange: (support: SiteSupportSettings) => void;
}) {
  const patch = (partial: Partial<SiteSupportSettings>) => {
    const next = { ...support, ...partial };
    // Garde le flag legacy aligné : actif si desktop ou mobile
    if (
      partial.headerButtonDesktopEnabled !== undefined ||
      partial.headerButtonMobileEnabled !== undefined
    ) {
      next.headerButtonEnabled =
        next.headerButtonDesktopEnabled || next.headerButtonMobileEnabled;
    }
    onChange(next);
  };

  const updateMethod = (id: string, next: SupportPaymentMethod) => {
    patch({
      methods: support.methods.map((m) => (m.id === id ? next : m)),
    });
  };

  const ensureMethods = () => {
    if (support.methods.length > 0) return;
    patch({
      methods: DEFAULT_SUPPORT_METHODS.map((m) => ({
        ...m,
        operators: m.operators.map((o) => ({ ...o })),
      })),
    });
  };

  return (
    <div className="space-y-4">
      <ToggleRow
        label="Bouton S’abonner — Desktop"
        description="Affiche le bouton dans l’en-tête desktop (md+)."
        checked={support.headerButtonDesktopEnabled}
        onChange={(headerButtonDesktopEnabled) => patch({ headerButtonDesktopEnabled })}
      />
      <ToggleRow
        label="Bouton S’abonner — Mobile"
        description="Affiche le bouton dans le menu mobile (et header mobile si présent)."
        checked={support.headerButtonMobileEnabled}
        onChange={(headerButtonMobileEnabled) => patch({ headerButtonMobileEnabled })}
      />

      <label className="block space-y-1 rounded-2xl border border-border bg-card px-4 py-3">
        <span className="text-sm font-semibold text-foreground">Titre du bouton</span>
        <span className="mt-1 block text-xs text-muted-foreground">
          Ex. S’abonner, Soutenir, Faire un don…
        </span>
        <input
          value={support.headerButtonLabel}
          onChange={(e) => patch({ headerButtonLabel: e.target.value })}
          className="mt-2 h-10 w-full rounded-lg border border-border bg-background px-3 text-sm"
        />
      </label>

      <label className="block space-y-1 rounded-2xl border border-border bg-card px-4 py-3">
        <span className="text-sm font-semibold text-foreground">Titre de la page</span>
        <input
          value={support.pageTitle}
          onChange={(e) => patch({ pageTitle: e.target.value })}
          className="mt-2 h-10 w-full rounded-lg border border-border bg-background px-3 text-sm"
        />
      </label>

      <label className="block space-y-1 rounded-2xl border border-border bg-card px-4 py-3">
        <span className="text-sm font-semibold text-foreground">Sous-titre</span>
        <textarea
          value={support.pageSubtitle}
          onChange={(e) => patch({ pageSubtitle: e.target.value })}
          rows={3}
          className="mt-2 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
        />
      </label>

      <label className="block space-y-1 rounded-2xl border border-border bg-card px-4 py-3">
        <span className="text-sm font-semibold text-foreground">Montant minimum (USD)</span>
        <span className="mt-1 block text-xs text-muted-foreground">Minimum autorisé : 1 $.</span>
        <input
          type="number"
          min={1}
          step="1"
          value={support.minAmountUsd}
          onChange={(e) => {
            const n = Number.parseFloat(e.target.value);
            patch({
              minAmountUsd: Number.isFinite(n) && n >= 1 ? Math.round(n * 100) / 100 : 1,
            });
          }}
          className="mt-2 h-10 w-32 rounded-lg border border-border bg-background px-3 text-sm"
        />
      </label>

      <div className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h5 className="text-sm font-bold text-foreground">Moyens de paiement</h5>
            <p className="text-xs text-muted-foreground">
              Mobile Money (opérateurs + QR/numéro), carte (lien), crypto (adresse + QR Tether).
            </p>
          </div>
          {support.methods.length === 0 ? (
            <button
              type="button"
              onClick={ensureMethods}
              className="rounded-lg border border-border px-3 py-1.5 text-xs font-bold hover:bg-muted"
            >
              Réinitialiser
            </button>
          ) : null}
        </div>
        {support.methods.map((method) => (
          <MethodEditor
            key={method.id}
            method={method}
            onChange={(next) => updateMethod(method.id, next)}
          />
        ))}
      </div>
    </div>
  );
}
