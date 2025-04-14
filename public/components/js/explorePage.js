const globalUsedTitles = new Set();
const globalUsedDescriptions = new Set();
const globalUsedImages = new Set();
let posts = [];
let currentPage = 1;
let loading = false;
const bookmarkedPosts = new Set();
let selectedCategories = new Set();

// Pre-generated content for each category
const techTitles = [
    "The Future of AI: Transforming Industries",
    "Top Programming Languages to Learn in 2024",
    "Quantum Computing: The Next Frontier",
    "Blockchain Revolution in Finance",
    "Edge Computing and IoT: A New Era",
    "The Rise of Cybersecurity in a Digital World",
    "How Cloud Computing is Changing Businesses",
    "The Impact of 5G on Connectivity",
    "The Role of Big Data in Modern Analytics",
    "The Evolution of Software Development",
];
const techDescriptions = [
    "Discover how AI is reshaping industries and creating new opportunities.",
    "Stay ahead of the curve by learning the most in-demand programming languages.",
    "Explore the potential of quantum computing and its impact on technology.",
    "Learn how blockchain is transforming the financial sector.",
    "Understand the role of edge computing in the Internet of Things.",
    "Discover the importance of cybersecurity in today's digital landscape.",
    "Learn how cloud computing is revolutionizing business operations.",
    "Explore the impact of 5G on global connectivity.",
    "Understand how big data is driving modern analytics.",
    "Discover the latest trends in software development.",
];

const lifestyleTitles = [
    "10 Habits of Highly Productive People",
    "The Art of Minimalism: Simplify Your Life",
    "Achieving Work-Life Balance",
    "Mindfulness and Meditation: A Path to Peace",
    "Travel Hacks: Smarter, Not Harder",
    "The Benefits of a Plant-Based Diet",
    "How to Build a Morning Routine That Works",
    "The Importance of Mental Health Awareness",
    "The Power of Gratitude in Daily Life",
    "How to Stay Motivated During Tough Times",
];
const lifestyleDescriptions = [
    "Adopt these habits to boost your productivity and achieve your goals.",
    "Simplify your life by embracing minimalism and decluttering your space.",
    "Find the perfect balance between your professional and personal life.",
    "Discover the benefits of mindfulness and meditation for mental well-being.",
    "Travel smarter with these practical tips and hacks.",
    "Learn about the health benefits of a plant-based diet.",
    "Build a morning routine that sets you up for success.",
    "Understand the importance of mental health awareness and self-care.",
    "Discover the power of gratitude in improving your daily life.",
    "Stay motivated and resilient during challenging times.",
];

const gamingTitles = [
    "The Evolution of Gaming: From Pixels to VR",
    "Top Upcoming Games in 2024",
    "Esports: The Rise of Competitive Gaming",
    "Gaming and Mental Health: A Deep Dive",
    "Building the Ultimate Gaming Setup",
    "The Impact of Gaming on Social Skills",
    "The Role of Storytelling in Modern Games",
    "The Future of Virtual Reality Gaming",
    "The Rise of Indie Game Development",
    "The Role of Gaming in Education",
];
const gamingDescriptions = [
    "From retro games to virtual reality, explore the evolution of gaming.",
    "Get ready for the most anticipated games releasing in 2024.",
    "Learn how esports is becoming a mainstream phenomenon.",
    "Understand the impact of gaming on mental health and well-being.",
    "Create the ultimate gaming setup without breaking the bank.",
    "Discover how gaming can improve social skills and communication.",
    "Explore the role of storytelling in modern video games.",
    "Learn about the future of virtual reality gaming.",
    "Discover the rise of indie game development and its impact.",
    "Understand how gaming can be used as an educational tool.",
];

const healthTitles = [
    "The Importance of Regular Health Checkups",
    "How to Maintain a Healthy Diet",
    "The Role of Exercise in Preventing Chronic Diseases",
    "Mental Health: Breaking the Stigma",
    "The Benefits of Yoga for Physical and Mental Health",
    "How to Manage Stress Effectively",
    "The Role of Sleep in Overall Well-being",
    "The Impact of Nutrition on Mental Health",
    "The Benefits of Intermittent Fasting",
    "How to Stay Hydrated Throughout the Day",
];
const healthDescriptions = [
    "Learn why regular health checkups are essential for a healthy life.",
    "Discover how to maintain a balanced and nutritious diet.",
    "Understand the role of exercise in preventing chronic diseases.",
    "Break the stigma around mental health and seek help when needed.",
    "Explore the physical and mental benefits of practicing yoga.",
    "Learn effective strategies to manage and reduce stress.",
    "Understand the importance of sleep for overall well-being.",
    "Discover how nutrition impacts mental health and mood.",
    "Explore the benefits of intermittent fasting for health.",
    "Learn how to stay hydrated and its impact on your body.",
];

const travelTitles = [
    "Top Travel Destinations for 2024",
    "How to Travel on a Budget",
    "The Benefits of Solo Travel",
    "The Role of Travel in Personal Growth",
    "How to Plan the Perfect Road Trip",
    "The Impact of Sustainable Tourism",
    "The Best Travel Apps to Use in 2024",
    "How to Stay Safe While Traveling",
    "The Role of Travel in Cultural Exchange",
    "The Benefits of Traveling Off-Season",
];
const travelDescriptions = [
    "Discover the top travel destinations to visit in 2024.",
    "Learn how to travel on a budget without compromising on experiences.",
    "Explore the benefits of solo travel and personal growth.",
    "Understand how travel can broaden your perspective and enrich your life.",
    "Plan the perfect road trip with these tips and tricks.",
    "Learn about the importance of sustainable tourism and its impact.",
    "Discover the best travel apps to make your trips easier and more enjoyable.",
    "Stay safe while traveling with these essential safety tips.",
    "Understand the role of travel in promoting cultural exchange.",
    "Explore the benefits of traveling during the off-season.",
];

const educationTitles = [
    "The Future of Online Learning",
    "How to Stay Motivated While Studying",
    "The Role of Technology in Education",
    "The Benefits of Lifelong Learning",
    "How to Improve Your Study Habits",
    "The Impact of Education on Career Success",
    "The Role of Critical Thinking in Education",
    "The Benefits of Project-Based Learning",
    "How to Choose the Right College or University",
    "The Impact of Social Media on Education",
];
const educationDescriptions = [
    "Explore the future of online learning and its impact on education.",
    "Stay motivated and focused while studying with these tips.",
    "Understand the role of technology in modern education.",
    "Discover the benefits of lifelong learning and personal growth.",
    "Improve your study habits and achieve academic success.",
    "Learn how education can impact your career and future opportunities.",
    "Understand the importance of critical thinking in education.",
    "Discover the benefits of project-based learning and hands-on experience.",
    "Choose the right college or university for your educational goals.",
    "Explore the impact of social media on education and learning.",
];

const entertainmentTitles = [
    "The Evolution of the Film Industry",
    "Top Movies to Watch in 2024",
    "The Role of Streaming Services in Entertainment",
    "The Impact of Social Media on Entertainment",
    "The Benefits of Live Performances",
    "How to Stay Updated on the Latest Entertainment Trends",
    "The Role of Technology in Modern Entertainment",
    "The Impact of Entertainment on Mental Health",
    "The Benefits of Reading for Entertainment",
    "How to Discover New Music and Artists",
];
const entertainmentDescriptions = [
    "Explore the evolution of the film industry and its impact on entertainment.",
    "Discover the top movies to watch in 2024.",
    "Understand the role of streaming services in modern entertainment.",
    "Learn how social media is shaping the entertainment industry.",
    "Discover the benefits of attending live performances and events.",
    "Stay updated on the latest entertainment trends and news.",
    "Explore how technology is transforming the entertainment industry.",
    "Understand the impact of entertainment on mental health and well-being.",
    "Discover the benefits of reading for entertainment and relaxation.",
    "Learn how to discover new music and artists.",
];


// Utility function to shuffle an array
function shuffle(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

// Pre-shuffle content for each category
const preGeneratedContent = {
    technology: shuffle([...techTitles.map((title, index) => ({ title, description: techDescriptions[index] }))]),
    lifestyle: shuffle([...lifestyleTitles.map((title, index) => ({ title, description: lifestyleDescriptions[index] }))]),
    gaming: shuffle([...gamingTitles.map((title, index) => ({ title, description: gamingDescriptions[index] }))]),
    health: shuffle([...healthTitles.map((title, index) => ({ title, description: healthDescriptions[index] }))]),
    travel: shuffle([...travelTitles.map((title, index) => ({ title, description: travelDescriptions[index] }))]),
    education: shuffle([...educationTitles.map((title, index) => ({ title, description: educationDescriptions[index] }))]),
    entertainment: shuffle([...entertainmentTitles.map((title, index) => ({ title, description: entertainmentDescriptions[index] }))]),
};

const showLoader = () => {
    const loader = document.getElementById('loader');
    if (loader) {
        loader.querySelector('.loader').classList.add('visible');
    }
};

const hideLoader = () => {
    const loader = document.getElementById('loader');
    if (loader) {
        loader.querySelector('.loader').classList.remove('visible');
    }
};

const generateUniqueContent = (category) => {
    const content = preGeneratedContent[category.toLowerCase()];
    if (!content || content.length === 0) {
        console.warn(`No content available for category: ${category}`);
        return { title: 'Default Title', description: 'Default Description' };
    }
    return content.pop();
};

const generateMockPosts = (page, limit = 12) => {
    const categories = ['Technology', 'Lifestyle', 'Gaming', 'Health', 'Travel', 'Education', 'Entertainment'];
    return Array.from({ length: limit }, (_, i) => {
        const category = categories[Math.floor(Math.random() * categories.length)];
        const { title, description } = generateUniqueContent(category);

        let imageSeed;
        do {
            imageSeed = Math.floor(Math.random() * 1000);
        } while (globalUsedImages.has(imageSeed));
        globalUsedImages.add(imageSeed);

        return {
            id: page * limit + i,
            title,
            description,
            image: `https://picsum.photos/seed/${imageSeed}/800/600`,
            category,
            likes: Math.floor(Math.random() * 1000),
            shared: Math.floor(Math.random() * 100),
            liked: false
        };
    });
};

const fetchRandomUser = async () => {
    try {
        const response = await fetch('https://randomuser.me/api/');
        const data = await response.json();
        const user = data.results[0];
        return {
            username: user.login.username,
            profilePic: user.picture.medium
        };
    } catch (error) {
        console.error('Error fetching random user:', error);
        return {
            username: 'user',
            profilePic: 'https://via.placeholder.com/150'
        };
    }
};

const createPostCard = async (post) => {
    const card = document.createElement('article');
    card.className = 'post-card bg-white rounded-lg shadow p-4';

    const user = await fetchRandomUser();
    card.innerHTML = `
        <img data-src="${post.image}" alt="${post.title}" class="lazy-load w-full h-48 object-cover rounded-lg mb-4">
        <div class="flex items-center justify-between mb-3">
            <span class="px-3 py-1 bg-indigo-100 text-indigo-800 rounded-full text-sm font-medium">
                ${post.category}
            </span>
            <div class="flex space-x-2">
                <button class="bookmark-button p-2 rounded-full hover:bg-gray-100" data-post-id="${post.id}">
                    <svg class="w-5 h-5" fill="${bookmarkedPosts.has(post.id) ? 'currentColor' : 'none'}" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                    </svg>
                </button>
                <button class="like-button p-2 rounded-full hover:bg-gray-100" data-post-id="${post.id}">
                    <svg class="w-5 h-5" fill="${post.liked ? 'red' : 'none'}" viewBox="0 0 24 24" stroke="${post.liked ? 'red' : 'currentColor'}">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                    </svg>
                </button>
            </div>
        </div>
        <h2 class="text-lg font-semibold mb-2">${post.title}</h2>
        <p class="text-gray-600 mb-4">${post.description}</p>
        <div class="flex items-center justify-between">
            <div class="flex items-center">
                <img src="${user.profilePic}" alt="${user.username}" class="w-8 h-8 rounded-full">
                <span class="ml-2 text-sm text-gray-600">@${user.username}</span>
            </div>
            <button class="share-button p-2 rounded-full hover:bg-gray-100" data-post-id="${post.id}">
                <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-3.316l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                </svg>
            </button>
        </div>
    `;

    return card;
};

const showToast = (message, type = 'info') => {
    const toast = document.createElement('div');
    toast.className = `toast px-4 py-2 rounded-lg shadow-lg ${type === 'error' ? 'bg-red-500' : 'bg-indigo-500'} text-white`;
    toast.textContent = message;
    document.getElementById('toast-container').appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
};

const lazyLoadImages = () => {
    const images = document.querySelectorAll('.lazy-load');
    const imageObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const img = entry.target;
                img.src = img.dataset.src;
                imageObserver.unobserve(img);
            }
        });
    });

    images.forEach(img => imageObserver.observe(img));
};

const renderPosts = async (posts) => {
    const postsGrid = document.getElementById('posts-grid');
    const fragment = document.createDocumentFragment();

    for (const post of posts) {
        const card = await createPostCard(post);
        fragment.appendChild(card);
    }

    postsGrid.appendChild(fragment);
    lazyLoadImages();
};

const filterPosts = (postsToFilter) => {
    let filteredPosts = postsToFilter;

    if (selectedCategories.size > 0) {
        filteredPosts = filteredPosts.filter(post =>
            selectedCategories.has(post.category.toLowerCase())
        );
    }

    const searchQuery = document.getElementById('search-input')?.value.toLowerCase() || '';
    if (searchQuery) {
        filteredPosts = filteredPosts.filter(post =>
            post.title.toLowerCase().includes(searchQuery) ||
            post.description.toLowerCase().includes(searchQuery)
        );
    }

    return filteredPosts;
};
const refreshPostsGrid = () => {
    const postsGrid = document.getElementById('posts-grid');
    if (!postsGrid) return;

    const searchQuery = document.getElementById('search-input')?.value.toLowerCase() || '';

    // Filter posts based on the search query and selected categories
    const filteredPosts = posts.filter(post => {
        const matchesCategory = selectedCategories.size === 0 || selectedCategories.has(post.category.toLowerCase());
        const matchesSearch = searchQuery === '' ||
            post.title.toLowerCase().includes(searchQuery) ||
            post.description.toLowerCase().includes(searchQuery);
        return matchesCategory && matchesSearch;
    });

    // Hide or show posts based on the filtered results
    const postCards = postsGrid.querySelectorAll('.post-card');
    postCards.forEach(card => {
        const postId = parseInt(card.querySelector('.like-button').dataset.postId, 10);
        const post = posts.find(p => p.id === postId);

        if (filteredPosts.includes(post)) {
            card.style.display = 'block'; // Show the post
        } else {
            card.style.display = 'none'; // Hide the post
        }
    });

    // If no posts match the search query, show a "no posts found" message
    if (filteredPosts.length === 0) {
        const noPosts = document.createElement('div');
        noPosts.className = 'col-span-full text-center py-8 text-gray-500';
        noPosts.textContent = 'No posts found for the selected filters or search query.';
        postsGrid.appendChild(noPosts);
    } else {
        // Remove any existing "no posts found" message
        const noPostsMessage = postsGrid.querySelector('.col-span-full.text-center');
        if (noPostsMessage) {
            noPostsMessage.remove();
        }
    }
};

// Debounced search input handler
const handleSearchInput = debounce(() => {
    refreshPostsGrid();
}, 300);

// Attach the debounced search handler to the search input
const searchInput = document.getElementById('search-input');
if (searchInput) {
    searchInput.addEventListener('input', handleSearchInput);
}

const loadPosts = async () => {
    if (loading) return;

    loading = true;
    const loadMoreButton = document.getElementById('load-more');

    if (loadMoreButton) {
        loadMoreButton.style.display = 'none';
    }

    showLoader();

    try {
        const newPosts = generateMockPosts(currentPage, 12);
        posts = [...posts, ...newPosts];
        await renderPosts(filterPosts(newPosts));
        currentPage++;
    } catch (error) {
        console.error('Error loading posts:', error);
        showToast('Error loading posts', 'error');
    } finally {
        loading = false;
        hideLoader();
        if (loadMoreButton) {
            loadMoreButton.style.display = 'block';
        }
    }
};

function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

document.addEventListener('DOMContentLoaded', () => {
    if (!posts) posts = [];
    if (!selectedCategories) selectedCategories = new Set();

    showLoader();

    loadPosts().catch(error => {
        console.error('Error during initial load:', error);
        showToast('Error loading initial posts', 'error');
    });

    const setupEventListeners = () => {
        const searchToggle = document.getElementById('search-toggle');
        const searchInput = document.getElementById('search-input');

        if (searchToggle && searchInput) {
            searchToggle.addEventListener('click', () => {
                searchInput.classList.toggle('hidden');
                if (!searchInput.classList.contains('hidden')) {
                    searchInput.focus();
                }
            });
        }

        const filterToggle = document.getElementById('filter-toggle');
        const filterSidebar = document.getElementById('filter-sidebar');
        const closeFilters = document.getElementById('close-filters');

        if (filterToggle && filterSidebar) {
            filterToggle.addEventListener('click', () => {
                filterSidebar.classList.toggle('open');
            });
        }

        if (closeFilters && filterSidebar) {
            closeFilters.addEventListener('click', () => {
                filterSidebar.classList.remove('open');
            });
        }

        const categoryCheckboxes = document.querySelectorAll('input[type="checkbox"][name="category"]');
        categoryCheckboxes.forEach(checkbox => {
            checkbox.addEventListener('change', () => {
                if (checkbox.checked) {
                    selectedCategories.add(checkbox.value.toLowerCase());
                } else {
                    selectedCategories.delete(checkbox.value.toLowerCase());
                }
                refreshPostsGrid();
            });
        });

        if (searchInput) {
            searchInput.addEventListener('input', debounce(() => {
                refreshPostsGrid();
            }, 300));
        }

        const loadMoreButton = document.getElementById('load-more');
        if (loadMoreButton) {
            loadMoreButton.addEventListener('click', loadPosts);
        }

        document.addEventListener('click', (event) => {
            const filterSidebar = document.getElementById('filter-sidebar');
            const filterToggle = document.getElementById('filter-toggle');

            if (filterSidebar && filterToggle) {
                const isClickInside = filterSidebar.contains(event.target) || filterToggle.contains(event.target);

                if (!isClickInside && filterSidebar.classList.contains('open')) {
                    filterSidebar.classList.remove('open');
                }
            }
        });

        const sortSelect = document.getElementById('sort-select');
        if (sortSelect) {
            sortSelect.addEventListener('change', () => {
                const sortValue = sortSelect.value;
                posts.sort((a, b) => {
                    switch (sortValue) {
                        case 'popular':
                            return b.likes - a.likes;
                        case 'trending':
                            return b.shared - a.shared;
                        case 'recent':
                        default:
                            return b.id - a.id;
                    }
                });
                refreshPostsGrid();
            });
        }
    };

    const setupInfiniteScroll = () => {
        const observer = new IntersectionObserver(
            (entries) => {
                const lastEntry = entries[entries.length - 1];
                if (lastEntry.isIntersecting && !loading) {
                    loadPosts();
                }
            },
            { threshold: 0.5 }
        );

        const loadMoreButton = document.getElementById('load-more');
        if (loadMoreButton) {
            observer.observe(loadMoreButton);
        }
    };

    setupEventListeners();
    setupInfiniteScroll();

    let resizeTimeout;
    window.addEventListener('resize', () => {
        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(() => {
            const filterSidebar = document.getElementById('filter-sidebar');
            if (window.innerWidth > 768 && filterSidebar) {
                filterSidebar.classList.remove('open');
            }
        }, 250);
    });

    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') {
            refreshPostsGrid();
        }
    });
});