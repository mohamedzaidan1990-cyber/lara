interface Props {
  current: 1 | 2 | 3 | 4;
}

const STEPS = [
  { n: 1, label: "Product" },
  { n: 2, label: "Details" },
  { n: 3, label: "Payment" },
  { n: 4, label: "Confirmation" }
];

export default function OrderStepper({ current }: Props) {
  return (
    <ol className="mx-auto flex w-full max-w-2xl items-center justify-between gap-2 px-2 sm:gap-4">
      {STEPS.map((step, idx) => {
        const isActive = step.n === current;
        const isDone = step.n < current;
        return (
          <li key={step.n} className="flex flex-1 items-center gap-2">
            <div className="flex flex-1 flex-col items-center">
              <div
                className={
                  "flex h-9 w-9 items-center justify-center rounded-full border text-sm transition-colors " +
                  (isActive
                    ? "border-gold bg-gold text-white"
                    : isDone
                      ? "border-ink bg-ink text-white"
                      : "border-ink/20 bg-white text-ink/40")
                }
              >
                {isDone ? "✓" : step.n}
              </div>
              <span
                className={
                  "mt-2 text-[10px] uppercase tracking-[0.18em] " +
                  (isActive ? "text-ink" : "text-ink/50")
                }
              >
                {step.label}
              </span>
            </div>
            {idx < STEPS.length - 1 ? (
              <div className={"hidden h-px flex-1 sm:block " + (isDone ? "bg-ink" : "bg-ink/15")} />
            ) : null}
          </li>
        );
      })}
    </ol>
  );
}
