export default function SubPageHeader({
  title,
  description,
  onBack,
}: {
  title: string;
  description?: string;
  onBack?: () => void;
}) {
  return (
    <div className="flex flex-col gap-3">
      <div
        onClick={() => {
          onBack?.();
        }}
        className="cursor-pointer flex items-center gap-2 text-sm text-[#4a5565] hover:text-[#1e2939]"
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 16 16"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M12.6667 8H3.33333M3.33333 8L7.33333 12M3.33333 8L7.33333 4"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        Voltar
      </div>
      <h1 className="text-2xl font-medium text-[#1e2939]">{title}</h1>
      {description && (
        <p className="text-base text-left text-[#4a5565]">{description}</p>
      )}
    </div>
  );
}
