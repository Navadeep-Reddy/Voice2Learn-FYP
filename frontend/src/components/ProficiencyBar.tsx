interface Props {
  label: string;
  value: number;
}

export default function ProficiencyBar({ label, value }: Props) {
  return (
    <div>
      <div className="flex items-center justify-between">
        <p className="text-sm font-bold text-ink">{label}</p>
        <p className="text-sm font-bold text-brand">{value}%</p>
      </div>
      <div
        role="progressbar"
        aria-valuenow={value}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`${label} proficiency ${value} percent`}
        className="mt-2 h-4 overflow-hidden rounded-full bg-subtle"
      >
        <div
          className="h-full rounded-full bg-brandbright"
          style={{ width: `${value}%` }}
        />
      </div>
    </div>
  );
}
