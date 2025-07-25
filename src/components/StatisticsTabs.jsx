import React, { useState } from 'react';

const tabs = [
  { label: 'Top products', content: 'Top products içeriği buraya gelecek.' },
  { label: 'Top Customers', content: 'Top customers içeriği buraya gelecek.' },
  { label: 'FAQ', content: 'FAQ içeriği buraya gelecek.' },
];

const StatisticsTabs = () => {
  const [active, setActive] = useState(0);
  return (
    <div className="p-4 bg-white border border-gray-200 rounded-lg shadow-sm dark:border-gray-700 sm:p-6 dark:bg-gray-800">
      <h3 className="flex items-center mb-4 text-lg font-semibold text-gray-900 dark:text-white">
        Statistics this month
        <button type="button">
          <svg className="w-4 h-4 ml-2 text-gray-400 hover:text-gray-500" aria-hidden="true" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd"></path></svg>
          <span className="sr-only">Show information</span>
        </button>
      </h3>
      <ul className="hidden text-sm font-medium text-center text-gray-500 divide-x divide-gray-200 rounded-lg sm:flex dark:divide-gray-600 dark:text-gray-400" role="tablist">
        {tabs.map((tab, idx) => (
          <li className="w-full" key={tab.label}>
            <button
              type="button"
              className={`inline-block w-full p-4 ${active === idx ? 'bg-gray-100 dark:bg-gray-600' : 'bg-gray-50 dark:bg-gray-700'} focus:outline-none`}
              onClick={() => setActive(idx)}
              role="tab"
              aria-selected={active === idx}
            >
              {tab.label}
            </button>
          </li>
        ))}
      </ul>
      <div className="p-4 text-gray-700 dark:text-gray-200">
        {tabs[active].content}
      </div>
    </div>
  );
};

export default StatisticsTabs; 