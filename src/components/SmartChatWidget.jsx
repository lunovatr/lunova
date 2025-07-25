import React from 'react';

const messages = [
  {
    user: 'Michael Gough',
    avatar: 'https://flowbite.com/docs/images/people/profile-picture-2.jpg',
    time: '01/03/2023 4:15 PM',
    content: [
      'Hello @designteam Let\'s schedule a kick-off meeting and workshop this week. It would be great to gather everyone involved in the design project. Let me know about your availability in the thread.',
      'Looking forward to it! Thanks.'
    ],
    replies: 4
  },
  {
    user: 'Bonnie Green',
    avatar: 'https://flowbite.com/docs/images/people/profile-picture-3.jpg',
    time: '01/03/2023 4:15 PM',
    content: [
      'Hello everyone,',
      'Thank you for the workshop, it was very productive meeting. I can\'t wait to start working on this new project with you guys. But first things first, I\'am waiting for the offer and pitch deck from you. It would be great to get it by the end o the month.',
      'Cheers!'
    ],
    replies: 8
  }
];

const SmartChatWidget = () => (
  <div className="p-4 mb-4 bg-white border border-gray-200 rounded-lg shadow-sm sm:p-6 dark:border-gray-700 dark:bg-gray-800 xl:mb-0">
    <div className="flex items-center justify-between mb-4">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Smart chat</h3>
      <a href="#" className="inline-flex items-center p-2 text-sm font-medium rounded-lg text-primary-700 hover:bg-gray-100 dark:text-primary-500 dark:hover:bg-gray-700">View all</a>
    </div>
    <div className="overflow-y-auto max-h-96">
      {messages.map((msg, idx) => (
        <article className="mb-5" key={idx}>
          <footer className="flex items-center justify-between mb-2">
            <div className="flex items-center">
              <p className="inline-flex items-center mr-3 text-sm font-semibold text-gray-900 dark:text-white">
                <img className="w-6 h-6 mr-2 rounded-full" src={msg.avatar} alt={msg.user} />
                {msg.user}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                <time>{msg.time}</time>
              </p>
            </div>
            <button className="inline-flex items-center p-2 text-sm font-medium text-center text-gray-500 bg-white rounded-lg hover:bg-gray-100 focus:ring-4 focus:outline-none focus:ring-gray-50 dark:bg-gray-800 dark:hover:bg-gray-700 dark:hover:text-gray-300 dark:focus:ring-gray-600" type="button">
              <svg className="w-5 h-5" aria-hidden="true" fill="currentColor" viewBox="0 0 20 20"><path d="M6 10a2 2 0 11-4 0 2 2 0 014 0zM12 10a2 2 0 11-4 0 2 2 0 014 0zM16 12a2 2 0 100-4 2 2 0 000 4z"></path></svg>
              <span className="sr-only">Comment settings</span>
            </button>
          </footer>
          {msg.content.map((line, lidx) => (
            <p className="mb-2 text-gray-900 dark:text-white" key={lidx}>{line}</p>
          ))}
          <a href="#" className="inline-flex items-center text-xs font-medium text-primary-700 sm:text-sm dark:text-primary-500">
            {msg.replies} replies
            <svg className="w-5 h-5 ml-1" fill="currentColor" viewBox="0 0 20 20"><path clipRule="evenodd" fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"></path></svg>
          </a>
        </article>
      ))}
    </div>
  </div>
);

export default SmartChatWidget; 