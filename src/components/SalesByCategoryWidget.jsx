import React from 'react';

const SalesByCategoryWidget = () => (
  <div className="p-4 bg-white border border-gray-200 rounded-lg shadow-sm dark:border-gray-700 sm:p-6 dark:bg-gray-800">
    <div className="items-center justify-between pb-4 border-b border-gray-200 sm:flex dark:border-gray-700">
      <div className="w-full mb-4 sm:mb-0">
        <h3 className="text-base font-normal text-gray-500 dark:text-gray-400">Sales by category</h3>
        <span className="text-2xl font-bold leading-none text-gray-900 sm:text-3xl dark:text-white">Desktop PC</span>
        <p className="flex items-center text-base font-normal text-gray-500 dark:text-gray-400">
          <span className="flex items-center mr-1.5 text-sm text-green-500 dark:text-green-400">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path clipRule="evenodd" fillRule="evenodd" d="M10 17a.75.75 0 01-.75-.75V5.612L5.29 9.77a.75.75 0 01-1.08-1.04l5.25-5.5a.75.75 0 011.08 0l5.25 5.5a.75.75 0 11-1.08 1.04l-3.96-4.158V16.25A.75.75 0 0110 17z"></path></svg>
            2.5%
          </span>
          Since last month
        </p>
      </div>
      <div className="w-full max-w-lg">
        {/* Tarih aralığı ve chart alanı */}
      </div>
    </div>
    <div className="w-full" id="sales-by-category"></div>
    <div className="flex items-center justify-between pt-3 mt-4 border-t border-gray-200 sm:pt-6 dark:border-gray-700">
      <div>
        <button className="inline-flex items-center p-2 text-sm font-medium text-center text-gray-500 rounded-lg hover:text-gray-900 dark:text-gray-400 dark:hover:text-white" type="button">
          Last 7 days
          <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
        </button>
      </div>
      <div className="flex-shrink-0">
        <a href="#" className="inline-flex items-center p-2 text-xs font-medium uppercase rounded-lg text-primary-700 sm:text-sm hover:bg-gray-100 dark:text-primary-500 dark:hover:bg-gray-700">
          Sales Report
          <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path></svg>
        </a>
      </div>
    </div>
  </div>
);

export default SalesByCategoryWidget; 