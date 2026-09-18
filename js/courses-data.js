/* Smart21Brain — courses-data.js
   Built-in course catalog. The courses page and the course detail page read
   from here whenever the /api/courses endpoint isn't available (static
   hosting, offline, cold backend), so learners always see the catalog
   instead of an error message. When the API does answer, its data wins.

   Each course: slug, title, description, level, category_slug/category_name,
   is_free, price (TZS), age_range, language, thumbnail_url, instructor_name,
   objectives[], requirements[], lessons[{title, content_type, duration_seconds,
   is_preview}].
*/
(function () {
  const IMG = (id) => `https://images.unsplash.com/${id}?w=900&q=75&auto=format&fit=crop`;

  /* Lesson ids must be unique across the whole catalog, because lesson.html
     looks a lesson up by id alone. Composite id = "<course-slug>::<n>". */
  function lessons(slug, list) {
    return list.map((l, i) => ({
      id: `${slug}::${i + 1}`,
      course_slug: slug,
      title: l[0],
      content_type: l[1] || 'video',
      duration_seconds: l[2] || 0,
      body: l[3] || '',
      quiz: l[4] || null,
      is_preview: i === 0,
      completed: false,
    }));
  }

  const COURSES = [
    {
      slug: 'fractions-made-fun',
      title: 'Fractions Made Fun',
      description: 'Halves, quarters, equivalent fractions and simple addition — taught with pizza slices, number lines and plenty of practice.',
      level: 'beginner',
      category_slug: 'mathematics',
      category_name: 'Mathematics',
      is_free: true,
      price: 0,
      age_range: '7–10',
      language: 'English',
      instructor_name: 'Smart21Brain',
      certificate_enabled: true,
      thumbnail_url: IMG('photo-1635070041078-e363dbe005cb'),
      objectives: [
        'Read and write fractions confidently',
        'Compare halves, thirds and quarters',
        'Find equivalent fractions',
        'Add fractions with the same denominator',
      ],
      requirements: ['Can count to 100', 'Knows basic addition'],
      lessons: lessons('fractions-made-fun', [
        ['What is a fraction?', 'video', 420],
        ['Halves and quarters', 'video', 480],
        ['Fractions on a number line', 'video', 510],
        ['Equivalent fractions', 'video', 540],
        ['Comparing fractions', 'video', 465],
        ['Adding fractions', 'video', 600],
        ['Practice worksheet', 'pdf', 0],
        ['End-of-course quiz', 'quiz', 0, 'Answer every question, then mark the lesson complete.', {
          title: 'End-of-course quiz',
          questions: [
          { prompt: 'Which fraction is the same as one half?', options: ['2/4', '1/3', '3/5', '1/4'], answer: 0 },
          { prompt: 'Which is bigger: 3/4 or 1/2?', options: ['1/2', '3/4', 'They are equal', 'Cannot tell'], answer: 1 },
          { prompt: 'What is 1/5 + 2/5?', options: ['3/10', '2/5', '3/5', '1/5'], answer: 2 },
          { prompt: 'The bottom number of a fraction is called the…', options: ['Numerator', 'Denominator', 'Divisor', 'Remainder'], answer: 1 }
          ] }],
      ]),
    },
    {
      slug: 'multiplication-mastery',
      title: 'Multiplication Mastery',
      description: 'Times tables from 2 to 12 using patterns, songs and timed drills that build real speed and confidence.',
      level: 'beginner',
      category_slug: 'mathematics',
      category_name: 'Mathematics',
      is_free: true,
      price: 0,
      age_range: '7–11',
      language: 'English',
      instructor_name: 'Smart21Brain',
      certificate_enabled: true,
      thumbnail_url: IMG('photo-1596495578065-6e0763fa1178'),
      objectives: [
        'Recall tables 2–12 quickly',
        'Spot patterns in multiples',
        'Use multiplication in word problems',
      ],
      requirements: ['Comfortable with addition'],
      lessons: lessons('multiplication-mastery', [
        ['Groups and arrays', 'video', 400],
        ['Tables 2, 5 and 10', 'video', 450],
        ['Tables 3, 4 and 6', 'video', 470],
        ['Tables 7, 8 and 9', 'video', 520],
        ['Tables 11 and 12', 'video', 430],
        ['Word problems', 'video', 560],
        ['Speed drill quiz', 'quiz', 0, 'Answer every question, then mark the lesson complete.', {
          title: 'Speed drill quiz',
          questions: [
          { prompt: 'What is 7 x 8?', options: ['54', '56', '64', '48'], answer: 1 },
          { prompt: 'Every multiple of 5 ends in…', options: ['0 or 5', '1 or 6', '2 or 7', '3 or 8'], answer: 0 },
          { prompt: 'What is 12 x 11?', options: ['121', '132', '144', '122'], answer: 1 },
          { prompt: '4 rows of 6 chairs is how many chairs?', options: ['10', '18', '24', '30'], answer: 2 }
          ] }],
      ]),
    },
    {
      slug: 'english-reading-starter',
      title: 'English Reading Starter',
      description: 'Phonics, sight words and first sentences — a gentle path from letter sounds to reading a short story on your own.',
      level: 'beginner',
      category_slug: 'english',
      category_name: 'English',
      is_free: true,
      price: 0,
      age_range: '5–8',
      language: 'English',
      instructor_name: 'Smart21Brain',
      certificate_enabled: true,
      thumbnail_url: IMG('photo-1503676260728-1c00da094a0b'),
      objectives: [
        'Sound out letters and blends',
        'Recognise 100 common sight words',
        'Read simple sentences aloud',
      ],
      requirements: ['Knows the alphabet'],
      lessons: lessons('english-reading-starter', [
        ['Letter sounds A–M', 'video', 380],
        ['Letter sounds N–Z', 'video', 390],
        ['Blending sounds', 'video', 420],
        ['Sight words part 1', 'video', 400],
        ['Sight words part 2', 'video', 400],
        ['Reading your first story', 'video', 540],
        ['Reading check quiz', 'quiz', 0, 'Answer every question, then mark the lesson complete.', {
          title: 'Reading check quiz',
          questions: [
          { prompt: "Which word starts with the same sound as 'sun'?", options: ['cat', 'sock', 'milk', 'fan'], answer: 1 },
          { prompt: "How many sounds are in the word 'ship'?", options: ['2', '3', '4', '5'], answer: 1 },
          { prompt: 'Which of these is a sight word?', options: ['the', 'elephant', 'tomorrow', 'beautiful'], answer: 0 },
          { prompt: 'Which sentence is written correctly?', options: ['the dog ran', 'The dog ran.', 'the Dog ran', 'THE dog ran'], answer: 1 }
          ] }],
      ]),
    },
    {
      slug: 'creative-writing-for-kids',
      title: 'Creative Writing for Kids',
      description: 'Build characters, settings and story arcs, then write and edit a complete short story you can be proud of.',
      level: 'intermediate',
      category_slug: 'english',
      category_name: 'English',
      is_free: false,
      price: 15000,
      age_range: '9–14',
      language: 'English',
      instructor_name: 'Smart21Brain',
      certificate_enabled: true,
      thumbnail_url: IMG('photo-1455390582262-044cdead277a'),
      objectives: [
        'Invent believable characters',
        'Structure a story beginning, middle and end',
        'Use description and dialogue',
        'Edit your own writing',
      ],
      requirements: ['Can write full sentences'],
      lessons: lessons('creative-writing-for-kids', [
        ['Where ideas come from', 'video', 450],
        ['Building a character', 'video', 500],
        ['Setting the scene', 'video', 470],
        ['Story structure', 'video', 520],
        ['Writing dialogue', 'video', 480],
        ['Editing your draft', 'video', 510],
        ['Story planning worksheet', 'pdf', 0],
        ['Final story submission', 'text', 0],
      ]),
    },
    {
      slug: 'kiswahili-kwa-watoto',
      title: 'Kiswahili kwa Watoto',
      description: 'Salamu, hesabu, rangi na sentensi za kila siku — Kiswahili cha msingi kwa njia ya michezo na nyimbo.',
      level: 'beginner',
      category_slug: 'languages',
      category_name: 'Languages',
      is_free: true,
      price: 0,
      age_range: '5–10',
      language: 'Kiswahili',
      instructor_name: 'Smart21Brain',
      certificate_enabled: true,
      thumbnail_url: IMG('photo-1523050854058-8df90110c9f1'),
      objectives: [
        'Kusalimia na kujitambulisha',
        'Kuhesabu 1–100',
        'Kutaja rangi, siku na miezi',
        'Kutunga sentensi fupi',
      ],
      requirements: ['Hakuna — kwa wanaoanza kabisa'],
      lessons: lessons('kiswahili-kwa-watoto', [
        ['Salamu na majibu', 'video', 360],
        ['Kujitambulisha', 'video', 380],
        ['Kuhesabu 1–100', 'video', 420],
        ['Rangi na maumbo', 'video', 390],
        ['Siku na miezi', 'video', 400],
        ['Sentensi za kila siku', 'video', 450],
        ['Jaribio la mwisho', 'quiz', 0, 'Answer every question, then mark the lesson complete.', {
          title: 'Jaribio la mwisho',
          questions: [
          { prompt: "'Habari za asubuhi' inamaanisha nini?", options: ['Usiku mwema', 'Habari za asubuhi', 'Kwaheri', 'Karibu'], answer: 1 },
          { prompt: "Namba 'saba' ni ipi?", options: ['6', '7', '8', '9'], answer: 1 },
          { prompt: "Rangi ya 'nyekundu' kwa Kiingereza ni?", options: ['Blue', 'Green', 'Red', 'Black'], answer: 2 },
          { prompt: 'Siku inayofuata Jumatatu ni?', options: ['Jumapili', 'Jumanne', 'Alhamisi', 'Ijumaa'], answer: 1 }
          ] }],
      ]),
    },
    {
      slug: 'science-explorers-human-body',
      title: 'Science Explorers: The Human Body',
      description: 'Bones, muscles, heart, lungs and brain — how the body works, with experiments you can do at home.',
      level: 'beginner',
      category_slug: 'science',
      category_name: 'Science',
      is_free: true,
      price: 0,
      age_range: '8–12',
      language: 'English',
      instructor_name: 'Smart21Brain',
      certificate_enabled: true,
      thumbnail_url: IMG('photo-1559757148-5c350d0d3c56'),
      objectives: [
        'Name the major organs and their jobs',
        'Explain how blood travels round the body',
        'Describe digestion step by step',
        'Link healthy habits to body systems',
      ],
      requirements: ['Curiosity — nothing else'],
      lessons: lessons('science-explorers-human-body', [
        ['Your amazing body', 'video', 400],
        ['Bones and muscles', 'video', 460],
        ['Heart and blood', 'video', 480],
        ['Lungs and breathing', 'video', 450],
        ['Digestion', 'video', 500],
        ['The brain and senses', 'video', 520],
        ['Body systems quiz', 'quiz', 0, 'Answer every question, then mark the lesson complete.', {
          title: 'Body systems quiz',
          questions: [
          { prompt: 'Which organ pumps blood around the body?', options: ['Lungs', 'Heart', 'Liver', 'Stomach'], answer: 1 },
          { prompt: 'How many bones are in an adult human body?', options: ['106', '206', '306', '406'], answer: 1 },
          { prompt: 'Where does most digestion of food happen?', options: ['Mouth', 'Small intestine', 'Lungs', 'Kidneys'], answer: 1 },
          { prompt: 'What do the lungs take in from the air?', options: ['Nitrogen', 'Oxygen', 'Carbon dioxide', 'Water'], answer: 1 }
          ] }],
      ]),
    },
    {
      slug: 'plants-and-our-environment',
      title: 'Plants and Our Environment',
      description: 'Seeds, photosynthesis, food chains and caring for the planet — with a grow-your-own-bean project.',
      level: 'beginner',
      category_slug: 'science',
      category_name: 'Science',
      is_free: true,
      price: 0,
      age_range: '6–10',
      language: 'English',
      instructor_name: 'Smart21Brain',
      certificate_enabled: true,
      thumbnail_url: IMG('photo-1466692476868-aef1dfb1e735'),
      objectives: [
        'Describe the plant life cycle',
        'Explain photosynthesis simply',
        'Build a food chain',
        'List ways to protect the environment',
      ],
      requirements: ['None'],
      lessons: lessons('plants-and-our-environment', [
        ['Parts of a plant', 'video', 370],
        ['From seed to seedling', 'video', 410],
        ['How plants make food', 'video', 440],
        ['Food chains', 'video', 430],
        ['Caring for our environment', 'video', 460],
        ['Grow-a-bean project sheet', 'pdf', 0],
      ]),
    },
    {
      slug: 'coding-for-beginners-scratch',
      title: 'Coding for Beginners with Scratch',
      description: 'Drag-and-drop programming: sequences, loops, conditions and events, ending with your own playable game.',
      level: 'beginner',
      category_slug: 'coding',
      category_name: 'Coding',
      is_free: false,
      price: 20000,
      age_range: '8–14',
      language: 'English',
      instructor_name: 'Smart21Brain',
      certificate_enabled: true,
      thumbnail_url: IMG('photo-1517245386807-bb43f82c33c4'),
      objectives: [
        'Use sequences, loops and conditionals',
        'Control sprites with events',
        'Store values in variables',
        'Build and share a simple game',
      ],
      requirements: ['Can use a mouse or trackpad', 'A computer with internet access'],
      lessons: lessons('coding-for-beginners-scratch', [
        ['Meet the Scratch editor', 'video', 420],
        ['Moving your first sprite', 'video', 450],
        ['Loops and repetition', 'video', 470],
        ['If-then decisions', 'video', 490],
        ['Variables and scores', 'video', 510],
        ['Build a catch game', 'video', 620],
        ['Share your project', 'text', 0],
        ['Coding concepts quiz', 'quiz', 0, 'Answer every question, then mark the lesson complete.', {
          title: 'Coding concepts quiz',
          questions: [
          { prompt: 'A loop is used to…', options: ['Repeat instructions', 'Stop the program', 'Delete a sprite', 'Change colour'], answer: 0 },
          { prompt: "An 'if-then' block is an example of a…", options: ['Variable', 'Conditional', 'Loop', 'Sprite'], answer: 1 },
          { prompt: 'What does a variable do?', options: ['Draws a shape', 'Stores a value', 'Plays a sound', 'Ends the game'], answer: 1 },
          { prompt: 'Which block starts a script when the green flag is clicked?', options: ['A motion block', 'An event block', 'A sound block', 'A pen block'], answer: 1 }
          ] }],
      ]),
    },
    {
      slug: 'web-design-basics',
      title: 'Web Design Basics: HTML & CSS',
      description: 'Write real HTML and CSS and publish a personal web page — structure, styling, colour and layout from scratch.',
      level: 'intermediate',
      category_slug: 'coding',
      category_name: 'Coding',
      is_free: false,
      price: 35000,
      age_range: '12–18',
      language: 'English',
      instructor_name: 'Smart21Brain',
      certificate_enabled: true,
      thumbnail_url: IMG('photo-1507003211169-0a1dd7228f2d'),
      objectives: [
        'Structure a page with semantic HTML',
        'Style with CSS selectors and the box model',
        'Build responsive layouts with flexbox',
        'Publish a page online',
      ],
      requirements: ['Comfortable typing', 'Basic computer skills'],
      lessons: lessons('web-design-basics', [
        ['How the web works', 'video', 440],
        ['Your first HTML page', 'video', 520],
        ['Text, links and images', 'video', 500],
        ['CSS colours and fonts', 'video', 540],
        ['The box model', 'video', 560],
        ['Flexbox layouts', 'video', 600],
        ['Making it responsive', 'video', 580],
        ['Publishing your site', 'video', 480],
        ['Final project brief', 'pdf', 0],
      ]),
    },
    {
      slug: 'digital-safety-for-students',
      title: 'Digital Safety for Students',
      description: 'Strong passwords, privacy settings, spotting scams and handling cyberbullying — safe habits for life online.',
      level: 'all-levels',
      category_slug: 'digital-skills',
      category_name: 'Digital Skills',
      is_free: true,
      price: 0,
      age_range: '10–18',
      language: 'English',
      instructor_name: 'Smart21Brain',
      certificate_enabled: true,
      thumbnail_url: IMG('photo-1614064641938-3bbee52942c7'),
      objectives: [
        'Create and manage strong passwords',
        'Recognise phishing and scams',
        'Control privacy settings',
        'Respond safely to cyberbullying',
      ],
      requirements: ['None'],
      lessons: lessons('digital-safety-for-students', [
        ['Your digital footprint', 'video', 400],
        ['Passwords that actually work', 'video', 430],
        ['Spotting scams and phishing', 'video', 470],
        ['Privacy settings walkthrough', 'video', 450],
        ['Cyberbullying: what to do', 'video', 480],
        ['Safety pledge quiz', 'quiz', 0, 'Answer every question, then mark the lesson complete.', {
          title: 'Safety pledge quiz',
          questions: [
          { prompt: 'Which is the strongest password?', options: ['123456', 'password', 'Blue7!Kite$Moon', 'yourname2010'], answer: 2 },
          { prompt: 'An email asking for your password urgently is probably…', options: ['A phishing scam', 'A normal message', 'From your school', 'Harmless'], answer: 0 },
          { prompt: 'If someone bullies you online you should…', options: ['Reply angrily', 'Screenshot, block and tell a trusted adult', 'Ignore it forever', 'Share their posts'], answer: 1 },
          { prompt: 'Your digital footprint is…', options: ['A phone setting', 'The trail of data you leave online', 'A type of virus', 'A password'], answer: 1 }
          ] }],
      ]),
    },
    {
      slug: 'study-skills-and-exam-prep',
      title: 'Study Skills & Exam Preparation',
      description: 'Revision timetables, active recall, note-taking and exam-day tactics that turn effort into better marks.',
      level: 'intermediate',
      category_slug: 'study-skills',
      category_name: 'Study Skills',
      is_free: false,
      price: 12000,
      age_range: '12–18',
      language: 'English',
      instructor_name: 'Smart21Brain',
      certificate_enabled: true,
      thumbnail_url: IMG('photo-1434030216411-0b793f4b4173'),
      objectives: [
        'Build a realistic revision timetable',
        'Use active recall and spaced practice',
        'Take notes that are worth re-reading',
        'Manage nerves on exam day',
      ],
      requirements: ['Currently in school'],
      lessons: lessons('study-skills-and-exam-prep', [
        ['How memory really works', 'video', 460],
        ['Planning your revision', 'video', 500],
        ['Active recall techniques', 'video', 520],
        ['Better note-taking', 'video', 480],
        ['Past papers and timing', 'video', 510],
        ['Exam-day checklist', 'pdf', 0],
      ]),
    },
    {
      slug: 'introduction-to-ai',
      title: 'Introduction to Artificial Intelligence',
      description: 'What AI is, how machines learn from data, where it already touches daily life, and how to use it responsibly.',
      level: 'advanced',
      category_slug: 'digital-skills',
      category_name: 'Digital Skills',
      is_free: false,
      price: 40000,
      age_range: '14–18',
      language: 'English',
      instructor_name: 'Smart21Brain',
      certificate_enabled: true,
      thumbnail_url: IMG('photo-1677442136019-21780ecad995'),
      objectives: [
        'Explain what machine learning is',
        'Describe how training data shapes a model',
        'Identify AI in everyday products',
        'Discuss bias, privacy and responsible use',
      ],
      requirements: ['Basic computer skills', 'Curiosity about technology'],
      lessons: lessons('introduction-to-ai', [
        ['What is artificial intelligence?', 'video', 480],
        ['How machines learn', 'video', 540],
        ['Data, patterns and predictions', 'video', 560],
        ['AI in everyday life', 'video', 500],
        ['Bias and fairness', 'video', 520],
        ['Using AI responsibly', 'video', 490],
        ['Concepts quiz', 'quiz', 0, 'Answer every question, then mark the lesson complete.', {
          title: 'Concepts quiz',
          questions: [
          { prompt: 'Machine learning means a computer…', options: ['Follows fixed rules only', 'Learns patterns from data', 'Runs faster', 'Stores more files'], answer: 1 },
          { prompt: 'Biased training data usually leads to…', options: ['Faster models', 'Biased predictions', 'Smaller files', 'No effect'], answer: 1 },
          { prompt: 'Which is an everyday use of AI?', options: ['Video recommendations', 'A paper calendar', 'A hand-drawn map', 'A metal ruler'], answer: 0 },
          { prompt: 'Responsible AI use includes…', options: ['Hiding how it works', 'Checking outputs and protecting privacy', 'Ignoring errors', 'Never telling anyone'], answer: 1 }
          ] }],
      ]),
    },
  ];

  // Derived category list for the filter dropdown.
  const CATEGORIES = (() => {
    const seen = new Map();
    COURSES.forEach((c) => { if (!seen.has(c.category_slug)) seen.set(c.category_slug, c.category_name); });
    return Array.from(seen, ([slug, name]) => ({ slug, name }));
  })();

  function withCounts(list) {
    return list.map((c) => Object.assign({}, c, { lesson_count: c.lessons.length }));
  }

  /* Filter + sort the built-in catalog the same way the API would. */
  function query(opts) {
    const o = opts || {};
    let list = COURSES.slice();
    if (o.level && o.level !== 'all') list = list.filter((c) => c.level === o.level || c.level === 'all-levels');
    if (o.category) list = list.filter((c) => c.category_slug === o.category);
    if (o.free === 'true') list = list.filter((c) => c.is_free);
    if (o.free === 'false') list = list.filter((c) => !c.is_free);
    if (o.q) {
      const needle = String(o.q).toLowerCase();
      list = list.filter((c) =>
        c.title.toLowerCase().includes(needle) ||
        c.description.toLowerCase().includes(needle) ||
        c.category_name.toLowerCase().includes(needle)
      );
    }
    if (o.sort === 'title') list.sort((a, b) => a.title.localeCompare(b.title));
    return withCounts(list);
  }

  function findBySlug(slug) {
    return COURSES.find((c) => c.slug === slug || String(c.id || '') === String(slug)) || null;
  }

  window.S21Courses = { all: COURSES, categories: CATEGORIES, query, findBySlug };
})();
