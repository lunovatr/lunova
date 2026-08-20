import { Link } from "react-router";

interface BreadcrumbLink {
  label: string;
  to: string;
}

interface BreadcrumbProps {
  pageTitle: string;
  // Home ile mevcut sayfa arasındaki tıklanabilir ara basamaklar (opsiyonel).
  items?: BreadcrumbLink[];
}

function ChevronIcon() {
  return (
    <svg
      className="stroke-current"
      width="17"
      height="16"
      viewBox="0 0 17 16"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M6.0765 12.667L10.2432 8.50033L6.0765 4.33366"
        stroke=""
        strokeWidth="1.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

const PageBreadcrumb: React.FC<BreadcrumbProps> = ({ pageTitle, items = [] }) => {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
      <h2
        className="text-xl font-semibold text-gray-800 dark:text-white/90"
        x-text="pageName"
      >
        {pageTitle}
      </h2>
      <nav>
        <ol className="flex items-center gap-1.5">
          <li>
            <Link
              className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-brand-500 dark:text-gray-400 dark:hover:text-brand-400"
              to="/"
            >
              Home
              <ChevronIcon />
            </Link>
          </li>
          {items.map((item) => (
            <li key={item.to}>
              <Link
                className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-brand-500 dark:text-gray-400 dark:hover:text-brand-400"
                to={item.to}
              >
                {item.label}
                <ChevronIcon />
              </Link>
            </li>
          ))}
          <li className="text-sm text-gray-800 dark:text-white/90">
            {pageTitle}
          </li>
        </ol>
      </nav>
    </div>
  );
};

export default PageBreadcrumb;
