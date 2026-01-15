import { CheckCircle2, Circle } from 'lucide-react';
import { Link } from 'react-router-dom';

type Step = {
  id: string;
  label: string;
  description: string;
  path: string;
};

type Props = {
  steps: Step[];
  currentPath: string;
};

export const StepNavigation = ({ steps, currentPath }: Props) => {
  const currentIndex = Math.max(
    steps.findIndex((step) => step.path === currentPath),
    0,
  );

  return (
    <nav className="rounded-2xl bg-graphite p-4 shadow-card">
      <ol className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        {steps.map((step, index) => {
          const isCompleted = index < currentIndex;
          const isActive = index === currentIndex;

          const Icon = isCompleted ? CheckCircle2 : Circle;

          return (
            <li key={step.id} className="flex-1">
              <Link
                to={step.path}
                className={`flex flex-col gap-1 rounded-xl border p-3 transition md:flex-row md:items-center ${
                  isActive
                    ? 'border-brand-500 bg-brand-500/10 text-white'
                    : 'border-white/10 text-white/70 hover:border-brand-500/60'
                }`}
              >
                <Icon
                  className={`h-5 w-5 ${
                    isCompleted
                      ? 'text-emerald-400'
                      : isActive
                        ? 'text-brand-500'
                        : 'text-white/30'
                  }`}
                />
                <div>
                  <p className="font-semibold text-white">{step.label}</p>
                  <p className="text-sm text-white/60">{step.description}</p>
                </div>
              </Link>
            </li>
          );
        })}
      </ol>
    </nav>
  );
};
