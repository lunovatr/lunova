import React, { useState } from 'react';

const slides = [
  {
    title: 'You are going to grow by 44% next year',
    subtitle: 'Insights',
    content: [
      'Get started with a free and open-source admin dashboard layout built with Tailwind CSS and Flowbite featuring charts, widgets, CRUD layouts, authentication pages, and more',
      'Key Takeaways:',
      'What are the new challenges in the delivery industry due to new consumer expectations.',
      'How the online delivery business model is diversifying to meet new demands.',
      'Which new technology requirements must be met to ensure true retail experiences.',
      'How a headless commerce architecture solves challenges in the industry.'
    ],
    link: '#',
    linkText: 'Get me there',
  },
  {
    title: 'Tips to grow',
    subtitle: 'Tips to grow',
    content: [
      'Marketing, sales & business growth for small business. Improve your marketing & promotion results - and grow your sales!',
      "What you'll learn:",
      'Dynamic reports and dashboards',
      'Learn from competitors about what to do, and not to do',
      'Take their business to the next level'
    ],
    link: '#',
    linkText: 'Learn more',
  }
];

const CarouselWidget = () => {
  const [active, setActive] = useState(0);
  return (
    <div className="p-4 bg-white border border-gray-200 rounded-lg shadow-sm dark:border-gray-700 sm:p-6 dark:bg-gray-800">
      <div className="relative mx-auto overflow-hidden h-96 lg:h-72">
        {slides.map((slide, idx) => (
          <div key={idx} className={`${active === idx ? '' : 'hidden'} duration-700 ease-in-out bg-white dark:bg-gray-800`}>
            <div className="flex items-center mb-4 text-lg font-medium text-primary-600 dark:text-primary-400">
              <svg className="w-6 h-6 mr-2" fill="currentColor" viewBox="0 0 20 20"><path clipRule="evenodd" fillRule="evenodd" d="M9.664 1.319a.75.75 0 01.672 0 41.059 41.059 0 018.198 5.424.75.75 0 01-.254 1.285 31.372 31.372 0 00-7.86 3.83.75.75 0 01-.84 0 31.508 31.508 0 00-2.08-1.287V9.394c0-.244.116-.463.302-.592a35.504 35.504 0 013.305-2.033.75.75 0 00-.714-1.319 37 37 0 00-3.446 2.12A2.216 2.216 0 006 9.393v.38a31.293 31.293 0 00-4.28-1.746.75.75 0 01-.254-1.285 41.059 41.059 0 018.198-5.424z" /></svg>
              {slide.subtitle}
            </div>
            <h3 className="mb-4 text-2xl font-medium text-gray-900 dark:text-white">{slide.title}</h3>
            {slide.content.map((line, lidx) => (
              <p key={lidx} className="mb-2 text-gray-500 dark:text-gray-400">{line}</p>
            ))}
            <a href={slide.link} className="inline-flex items-center p-2 font-medium rounded-lg text-primary-700 hover:bg-gray-100 dark:text-primary-500 dark:hover:bg-gray-700">
              {slide.linkText}
              <svg className="w-5 h-5 ml-1" fill="currentColor" viewBox="0 0 20 20"><path clipRule="evenodd" fillRule="evenodd" d="M2 10a.75.75 0 01.75-.75h12.59l-2.1-1.95a.75.75 0 111.02-1.1l3.5 3.25a.75.75 0 010 1.1l-3.5 3.25a.75.75 0 11-1.02-1.1l2.1-1.95H2.75A.75.75 0 012 10z" /></svg>
            </a>
          </div>
        ))}
        <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex space-x-2">
          {slides.map((_, idx) => (
            <button key={idx} className={`w-3 h-3 rounded-full ${active === idx ? 'bg-primary-600' : 'bg-gray-300'}`} onClick={() => setActive(idx)} />
          ))}
        </div>
      </div>
    </div>
  );
};

export default CarouselWidget; 