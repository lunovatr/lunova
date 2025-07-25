import React from 'react';

const activities = [
  {
    date: 'April 2023',
    title: 'Application UI design in Figma',
    desc: 'Get access to over 20+ pages including a dashboard layout, charts, kanban board, calendar, and pre-order E-commerce & Marketing pages.',
    link: '#',
    linkText: 'Learn more',
  },
  {
    date: 'March 2023',
    title: 'Marketing UI code in Flowbite',
    desc: 'Get started with dozens of web components and interactive elements built on top of Tailwind CSS.',
    link: 'https://flowbite.com/blocks/',
    linkText: 'Go to Flowbite Blocks',
  },
  {
    date: 'February 2023',
    title: 'Marketing UI design in Figma',
    desc: 'Get started with dozens of web components and interactive elements built on top of Tailwind CSS.',
    link: null,
    linkText: null,
  },
];

const LatestActivityWidget = () => (
  <div className="p-4 mb-4 bg-white border border-gray-200 rounded-lg shadow-sm dark:border-gray-700 sm:p-6 dark:bg-gray-800 xl:mb-0">
    <div className="flex items-center justify-between mb-4">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Latest Activity</h3>
      <a href="#" className="inline-flex items-center p-2 text-sm font-medium rounded-lg text-primary-700 hover:bg-gray-100 dark:text-primary-500 dark:hover:bg-gray-700">View all</a>
    </div>
    <ol className="relative border-l border-gray-200 dark:border-gray-700">
      {activities.map((act, idx) => (
        <li className="mb-10 ml-4" key={idx}>
          <div className="absolute w-3 h-3 bg-gray-200 rounded-full mt-1.5 -left-1.5 border border-white dark:border-gray-800 dark:bg-gray-700"></div>
          <time className="mb-1 text-sm font-normal leading-none text-gray-400 dark:text-gray-500">{act.date}</time>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{act.title}</h3>
          <p className="mb-4 text-base font-normal text-gray-500 dark:text-gray-400">{act.desc}</p>
          {act.link && (
            <a href={act.link} className="inline-flex items-center px-4 py-2 text-sm font-medium text-gray-900 bg-white border border-gray-200 rounded-lg hover:bg-gray-100 hover:text-primary-700 focus:z-10 focus:ring-4 focus:outline-none focus:ring-gray-200 focus:text-primary-700 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-600 dark:hover:text-white dark:hover:bg-gray-700 dark:focus:ring-gray-700">
              {act.linkText} <svg className="w-3 h-3 ml-2" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M12.293 5.293a1 1 0 011.414 0l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-2.293-2.293a1 1 0 010-1.414z" clipRule="evenodd"></path></svg>
            </a>
          )}
        </li>
      ))}
    </ol>
  </div>
);

export default LatestActivityWidget; 