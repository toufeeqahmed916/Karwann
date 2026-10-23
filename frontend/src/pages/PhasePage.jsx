export default function PhasePage({ title, phase, children }) {
  return (
    <div className="p-6">
      <div className="panel max-w-xl p-6">
        <h2 className="text-2xl font-bold">{title}</h2>
        <p className="mt-2 text-sm text-mute">Built in {phase}. {children}</p>
      </div>
    </div>
  );
}
