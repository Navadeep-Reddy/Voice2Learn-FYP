export default function Header() {
  return (
    <header className="relative z-10 bg-canvas">
      <div className="mx-auto flex max-w-[1120px] items-center justify-between px-5 py-4 md:px-16">
        <p className="text-xl font-bold text-brand">Voice2Learn</p>
        <div
          aria-hidden="true"
          className="flex h-10 w-10 items-center justify-center rounded-full bg-subtle text-lg font-bold text-muted"
        >
          A
        </div>
      </div>
    </header>
  );
}
