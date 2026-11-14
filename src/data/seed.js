'use strict';

/**
 * Initial content. It mirrors the portfolio page exactly, so the site looks
 * the same on first run. The admin dashboard edits a copy of this in memory;
 * "Reset to defaults" (or a server restart) brings it back.
 */

const stack = (name, category, extra = {}) => ({ name, category, inStack: true, inMarquee: false, aboutTag: '', ...extra });
const marquee = (name, category, extra = {}) => ({ name, category, inStack: false, inMarquee: true, aboutTag: '', ...extra });
const about = (name, aboutTag, extra = {}) => ({ name, category: 'Highlights', inStack: false, inMarquee: false, aboutTag, ...extra });

module.exports = {
  profile: {
    heroTag: 'Third-Year Engineering Student · Bengaluru, India',
    heroDescription:
      "Honestly, I'm just here for the lore(and love) of AI and the drama it brings. But if you wanna know more from a website rather than a resume, scroll down to see the projects I've actually built and the skills I've actually learned.",
    aboutBody:
      "Third year engineering student specializing in AIML. I believe in getting your hands dirty and building projects instead of cramping through theoretical concepts. While that is important, but it’s the practical application that cements learning and speeds the learning curve.\n\nWhen I'm not ripping my hair apart because of an error I'm not able to solve on 22nd try, I'm reading a lovely novel by my bedside.",
    badgeHighlight: '4th Year Undergrad at UVCE',
    badgeText: '& Student Co-ordinator @ MARVEL RnD Lab',
    email: '21varsha.shri.m@gmail.com',
    linkedin: 'https://www.linkedin.com/in/varsha-shubhashri-m-089893286',
    github: 'https://github.com/vvvvvvss',
    substack: 'https://substack.com/@rubyjane21',
    footerText: 'Varsha Shubhashri M · Bengaluru, India',
  },

  projects: [
    {
      title: 'Vibrolux Virtual Controller',
      description: 'An innovative controller system built from scratch and showcased in a competition track. Bridges hardware interaction with software intelligence.',
      tech: ['Python', 'MediaPipe', 'OpenCV'],
      link: 'https://github.com/vvvvvvss/virtualController',
    },
    {
      title: 'Face Recognition System',
      description: 'End-to-end facial recognition pipeline using deep learning. Handles real-world variability in lighting, angles, and occlusion.',
      tech: ['Python', 'MTCNN', 'Deep Learning'],
      link: 'https://github.com/vvvvvvss/Live-Person-Identification',
    },
    {
      title: 'MARVEL - Gantt Chart',
      description: 'A visual project management tool for planning and tracking complex workflows of our RnD lab.',
      tech: ['Python', 'RL', 'Research'],
      link: 'https://github.com/vvvvvvss/Marvel-Gantt-Chart',
    },
    {
      title: 'Image Recognition Models',
      description: 'Deep learning-powered image classification trained on custom datasets. High accuracy through architecture tuning and data augmentation.',
      tech: ['TensorFlow', 'MNIST', 'KNN'],
      link: 'https://github.com/vvvvvvss/ImageRecognition-KMeansClustering',
    },
    {
      title: 'Hospital Management DBMS',
      description: 'A comprehensive database management system for hospital operations, designed to streamline patient records, appointments, and resource allocation.',
      tech: ['MySQL', 'PHP', 'React'],
      link: 'https://github.com/vvvvvvss/Hospital_Management_DBMS',
    },
    {
      title: 'Project Urdhyuth · IISc',
      description: "ML team internship at IISc's NMCAD lab. Real research-grade problems, applying machine learning to complex scientific challenges.",
      tech: ['Research', 'ML TEAM', 'IISc'],
      link: 'https://github.com/vvvvvvss/Fault_Detection_Systems_For_FCS_eVTOL',
    },
  ],

  // Order matters: the Tech Stack groups categories in first-seen order,
  // the marquee and the "About" tags follow the order of this list.
  skills: [
    stack('Python', 'Languages', { inMarquee: true }),
    stack('Java', 'Languages', { inMarquee: true }),
    stack('C', 'Languages', { inMarquee: true }),
    stack('C++', 'Languages', { inMarquee: true }),
    stack('SQL', 'Languages'),

    stack('VS Code', 'Tools'),
    stack('Matlab', 'Tools'),
    stack('Ollama', 'Tools'),
    stack('Canva', 'Tools'),

    stack('scikit-learn', 'AI / ML'),
    stack('TensorFlow', 'AI / ML'),
    stack('OpenCV', 'AI / ML'),
    stack('Pandas', 'AI / ML'),
    stack('NumPy', 'AI / ML'),
    stack('Matplotlib', 'AI / ML'),

    stack('Docker', 'DevOps / Cloud'),
    stack('Linux', 'DevOps / Cloud'),
    stack('Git', 'DevOps / Cloud'),
    stack('AWS', 'DevOps / Cloud'),
    stack('Jenkins', 'DevOps / Cloud'),

    stack('Reading novels', 'Other'),
    stack('Writing on Substack', 'Other'),
    stack('Researching', 'Other'),
    stack('Gardening', 'Other'),

    marquee('Computer Networks', 'Core Subjects'),
    marquee('Data Structures', 'Core Subjects'),
    marquee('Algorithms', 'Core Subjects'),
    marquee('Database Management', 'Core Subjects'),
    marquee('Artificial Intelligence', 'Core Subjects'),
    marquee('Machine Learning', 'Core Subjects'),

    about('AI', 'accent'),
    about('ML', 'accent'),
    about('Cloud Computing', 'accent'),
    about('Deep Learning', 'accent', { inMarquee: true }),
    about('Research', 'blue'),
    about('Organization', 'plain'),
    about('Leadership', 'plain'),
    about('Communication', 'plain'),
  ],

  achievements: [
    {
      title: 'Deutsche Bank Internship',
      description: 'Intern Analyst at Deutsche Bank. Worked on RAGS, Langchain, LangGraph and LangFuse amongst many other Tools and Technologies.',
    },
    {
      title: 'IISc NMCAD Internship',
      description: 'ML team on Project Urdhyuth. Real research. Real impact. Not a LinkedIn checkbox.',
    },
    {
      title: 'Won Mock Placements',
      description: 'Competed across disciplines, semesters and came out on top. Technical depth + communication.',
    },
    {
      title: 'MARVEL RnD Co-ordinator',
      description: 'Bridging academia and real-world engineering problems at the research lab while co-ordinating with the students.',
    },
  ],

  certifications: [
    {
      name: 'AI & Artificial Intelligence and Machine Learning',
      org: 'MARVEL RnD Lab',
      level: 'Level 1 & Level 2 Certified',
      link: 'https://drive.google.com/file/d/1ofCADNc4vN_-TdLQqadLHrQlRCWvDcdS/view?usp=drive_link',
    },
    {
      name: 'Cloud Computing and Cybersecurity',
      org: 'MARVEL RnD Lab',
      level: 'Level 1 & Level 2 Certified',
      link: 'https://drive.google.com/file/d/177Y31tqPpKEP3nMibBhHFqxc_BZmKmpL/view?usp=drive_link',
    },
    {
      name: 'AWS Cloud Technician Essentials',
      org: 'Coursera - AWS',
      level: '4 modules',
      link: 'https://drive.google.com/file/d/14xSstLMdT6I5322NZz6tJDwOfOjbcmkl/view?usp=sharing',
    },
    {
      name: 'GenAI Academy',
      org: 'Google Cloud',
      level: '5 modules completed',
      link: 'https://drive.google.com/file/d/1ENJ-8RKinRen-ND_CPsTuJIVBasME0Yu/view?usp=drive_link',
    },
  ],

  models: [
    { name: 'Decision Trees & Random Forest', category: 'Ensemble' },
    { name: 'XGBoost & CatBoost', category: 'Gradient Boosting' },
    { name: 'Logistic & Linear Regression', category: 'Regression' },
    { name: 'K-Nearest Neighbors (KNN)', category: 'Instance' },
    { name: 'K-Means Clustering', category: 'Unsupervised' },
    { name: 'Naive Bayes', category: 'Probabilistic' },
    { name: 'Deep Neural Networks', category: 'Deep Learning' },
  ],
};
