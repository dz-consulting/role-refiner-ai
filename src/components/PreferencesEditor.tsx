import {
  COMPANY_SIZES,
  Preferences,
  ROLE_TYPES,
  TRAVEL_OPTIONS,
  WORK_ARRANGEMENTS,
} from "@/lib/preferences";

type Props = {
  value: Preferences;
  onChange: (next: Preferences) => void;
};

export function PreferencesEditor({ value, onChange }: Props) {
  const update = (patch: Partial<Preferences>) => onChange({ ...value, ...patch });

  return (
    <div className="space-y-12">
      <MultiToggle
        label="Company size"
        options={COMPANY_SIZES}
        selected={value.company_sizes}
        onChange={(v) => update({ company_sizes: v })}
      />

      <MultiToggle
        label="Work arrangement"
        options={WORK_ARRANGEMENTS}
        selected={value.work_arrangement}
        onChange={(v) => update({ work_arrangement: v })}
      />

      <SingleToggle
        label="Travel willingness"
        options={TRAVEL_OPTIONS}
        selected={value.travel_willingness}
        onChange={(v) => update({ travel_willingness: v })}
      />

      <MultiToggle
        label="Role type"
        options={ROLE_TYPES}
        selected={value.role_types}
        onChange={(v) => update({ role_types: v })}
      />

      <TagList
        label="Preferred locations"
        hint="Cities, regions, or 'Remote-EU'. Press Enter to add."
        items={value.locations}
        onChange={(items) => update({ locations: items })}
      />

      <TagList
        label="Industries you want"
        items={value.industries_preferred}
        onChange={(items) => update({ industries_preferred: items })}
      />

      <TagList
        label="Industries to avoid"
        items={value.industries_avoid}
        onChange={(items) => update({ industries_avoid: items })}
      />

      <TagList
        label="Deal-breakers"
        hint="On-call, equity-only comp, return-to-office mandates, etc."
        items={value.deal_breakers}
        onChange={(items) => update({ deal_breakers: items })}
      />

      <TagList
        label="What you want next"
        hint="Motivations: scope, ownership, learning, mission, comp ceiling…"
        items={value.motivations}
        onChange={(items) => update({ motivations: items })}
      />

      <div>
        <div className="label-eyebrow mb-2">Minimum compensation</div>
        <input
          value={value.compensation_min}
          onChange={(e) => update({ compensation_min: e.target.value })}
          placeholder="e.g. €90k base · $180k OTE · No constraint"
          className="w-full bg-transparent border-b border-border focus:border-foreground py-2 text-base focus:outline-none"
        />
      </div>

      <div>
        <div className="label-eyebrow mb-2">Anything else worth knowing</div>
        <textarea
          value={value.notes}
          onChange={(e) => update({ notes: e.target.value })}
          rows={3}
          placeholder="Visa needs, family constraints, working hours, side projects…"
          className="w-full bg-card border border-border focus:border-foreground p-3 text-sm focus:outline-none"
        />
      </div>
    </div>
  );
}

function MultiToggle({
  label, options, selected, onChange,
}: { label: string; options: string[]; selected: string[]; onChange: (v: string[]) => void }) {
  const toggle = (opt: string) =>
    onChange(selected.includes(opt) ? selected.filter((s) => s !== opt) : [...selected, opt]);
  return (
    <div>
      <div className="label-eyebrow mb-3">{label}</div>
      <div className="flex flex-wrap gap-2">
        {options.map((opt) => {
          const on = selected.includes(opt);
          return (
            <button
              key={opt}
              type="button"
              onClick={() => toggle(opt)}
              className={`label-tag transition ${
                on
                  ? "border-foreground !text-foreground bg-foreground/[0.06]"
                  : "border-border !text-muted-foreground hover:!text-foreground"
              }`}
            >
              {opt}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function SingleToggle({
  label, options, selected, onChange,
}: { label: string; options: string[]; selected: string; onChange: (v: string) => void }) {
  return (
    <div>
      <div className="label-eyebrow mb-3">{label}</div>
      <div className="flex flex-wrap gap-2">
        {options.map((opt) => {
          const on = selected === opt;
          return (
            <button
              key={opt}
              type="button"
              onClick={() => onChange(on ? "" : opt)}
              className={`label-tag transition ${
                on
                  ? "border-foreground !text-foreground bg-foreground/[0.06]"
                  : "border-border !text-muted-foreground hover:!text-foreground"
              }`}
            >
              {opt}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function TagList({
  label, hint, items, onChange,
}: { label: string; hint?: string; items: string[]; onChange: (items: string[]) => void }) {
  return (
    <div>
      <div className="flex items-baseline justify-between mb-3">
        <div className="label-eyebrow">{label}</div>
        <button
          type="button"
          onClick={() => onChange([...items, ""])}
          className="text-xs font-mono text-muted-foreground hover:text-foreground"
        >
          + Add
        </button>
      </div>
      {hint && <div className="text-caption mb-3">{hint}</div>}
      <div className="space-y-2">
        {items.map((it, i) => (
          <div key={i} className="flex items-center gap-3">
            <input
              value={it}
              onChange={(e) => {
                const n = [...items]; n[i] = e.target.value; onChange(n);
              }}
              className="flex-1 bg-transparent border-b border-border focus:border-foreground py-2 text-sm focus:outline-none"
            />
            <button
              type="button"
              onClick={() => onChange(items.filter((_, idx) => idx !== i))}
              className="text-muted-foreground hover:text-destructive text-sm"
            >
              ✕
            </button>
          </div>
        ))}
        {items.length === 0 && (
          <div className="text-sm font-serif-italic text-muted-foreground">None yet.</div>
        )}
      </div>
    </div>
  );
}
