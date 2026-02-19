// ===================================
// 1. CONFIGURATION & STATE
// ===================================
const CONFIG = {
    DEBUG_MODE: false,
    ENABLE_CONSOLE_EASTER_EGG: true,
    ENABLE_3D_EFFECTS_DESKTOP: true,
    ENABLE_MAGNETIC_EFFECTS: true,
    MOBILE_BREAKPOINT: 768,
    TABLET_BREAKPOINT: 1024
};

// State Variables
let ticking = false;
let lastMouseX = 0;
let lastMouseY = 0;
let lastScrollY = window.pageYOffset;
let scrollEndTimer;
let resizeTimeout;

// Utility Logger
const log = (...args) => {
    if (CONFIG.DEBUG_MODE) console.log(...args);
};

// ===================================
// 2. THEME MANAGEMENT
// ===================================
const themeToggle = document.getElementById('theme-toggle');
const html = document.documentElement;

function initTheme() {
    const savedTheme = localStorage.getItem('theme') || 'light';
    html.classList.remove('light', 'dark');
    html.classList.add(savedTheme);
}

function toggleTheme() {
    const currentTheme = html.classList.contains('dark') ? 'dark' : 'light';
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    
    html.classList.remove(currentTheme);
    html.classList.add(newTheme);
    localStorage.setItem('theme', newTheme);

    // Rotate Animation
    if (themeToggle) {
        themeToggle.style.transition = 'transform 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275)';
        themeToggle.style.transform = 'rotate(360deg)';
        setTimeout(() => {
            themeToggle.style.transform = 'rotate(0deg)';
        }, 500);
    }
}

// ===================================
// 3. CORE: TRANSFORM ORCHESTRATOR
// ===================================
/**
 * Consolidates all blob effects (Scroll Parallax, Scroll Warp, 
 * Mouse Repulsion, Mouse Stretch) into a single CSS Transform string.
 */
function updateBlobTransform(blob) {
    const repulseX = parseFloat(blob.getAttribute('data-repulse-x') || 0);
    const repulseY = parseFloat(blob.getAttribute('data-repulse-y') || 0);
    const parallaxY = parseFloat(blob.getAttribute('data-parallax-y') || 0);
    const warp = parseFloat(blob.getAttribute('data-warp') || 0);
    const stretch = parseFloat(blob.getAttribute('data-stretch') || 0);

    const totalX = repulseX;
    const totalY = repulseY + parallaxY;

    // Warp makes it thin (X<1) and long (Y>1) based on scroll speed
    const scaleX = (1 - (warp * 0.5)) * (1 + stretch);
    const scaleY = (1 + warp) * (1 + stretch);

    blob.style.transform = `translate(${totalX.toFixed(1)}px, ${totalY.toFixed(1)}px) scale(${scaleX.toFixed(3)}, ${scaleY.toFixed(3)})`;
}

// ===================================
// 4. SCROLL HANDLING (Parallax & Warp)
// ===================================
function updateScrollProgress() {
    const winScroll = document.body.scrollTop || document.documentElement.scrollTop;
    const height = document.documentElement.scrollHeight - document.documentElement.clientHeight;
    const scrolled = (winScroll / height) * 100;
    const progressBar = document.getElementById('scroll-progress');
    if (progressBar) progressBar.style.width = `${Math.min(scrolled, 100)}%`;
}

function updateActiveNav() {
    const scrollY = window.pageYOffset;
    const sections = document.querySelectorAll('section[id]');
    
    sections.forEach(section => {
        const sectionHeight = section.offsetHeight;
        const sectionTop = section.offsetTop - 200;
        const sectionId = section.getAttribute('id');
        
        if (scrollY > sectionTop && scrollY <= sectionTop + sectionHeight) {
            document.querySelectorAll('.nav-link').forEach(link => {
                link.classList.toggle('active', link.getAttribute('href') === `#${sectionId}`);
            });
        }
    });
}

function handleScroll() {
    if (!ticking) {
        window.requestAnimationFrame(() => {
            const currentScrollY = window.pageYOffset;
            const scrollSpeed = Math.abs(currentScrollY - lastScrollY);
            
            updateScrollProgress();
            updateActiveNav();

            // --- Blob Logic ---
            const blobs = document.querySelectorAll('.blob');
            const warpAmount = Math.min(scrollSpeed * 0.05, 0.5); 

            blobs.forEach((blob, index) => {
                if (window.innerWidth > CONFIG.MOBILE_BREAKPOINT) {
                    const speed = 0.2 + (index * 0.15); 
                    const yPos = -(currentScrollY * speed);
                    
                    blob.setAttribute('data-parallax-y', yPos);
                    blob.setAttribute('data-warp', warpAmount);
                    
                    blob.style.transition = 'transform 0.1s ease-out';
                    updateBlobTransform(blob);
                }
            });

            // Reset Warp Effect
            clearTimeout(scrollEndTimer);
            scrollEndTimer = setTimeout(() => {
                blobs.forEach(blob => {
                    blob.setAttribute('data-warp', 0);
                    blob.style.transition = 'transform 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275)';
                    updateBlobTransform(blob);
                });
            }, 150);

            lastScrollY = currentScrollY;
            ticking = false;
        });
        ticking = true;
    }
}

// ===================================
// 5. MOUSE INTERACTION (Repulsion)
// ===================================
function handleBlobMovement(e) {
    if (window.innerWidth <= CONFIG.TABLET_BREAKPOINT) return;

    const blobs = document.querySelectorAll('.blob');
    const mouseX = e.clientX;
    const mouseY = e.clientY;

    // Calculate Mouse Velocity
    const deltaX = mouseX - lastMouseX;
    const deltaY = mouseY - lastMouseY;
    const velocity = Math.sqrt(deltaX ** 2 + deltaY ** 2);
    const stretch = Math.min(velocity * 0.002, 0.15);

    // Hue Shift
    const xPct = mouseX / window.innerWidth;
    const yPct = mouseY / window.innerHeight;

    blobs.forEach((blob, index) => {
        const rect = blob.getBoundingClientRect();
        const blobCenterX = rect.left + rect.width / 2;
        const blobCenterY = rect.top + rect.height / 2;

        const distanceX = mouseX - blobCenterX;
        const distanceY = mouseY - blobCenterY;
        const distance = Math.sqrt(distanceX ** 2 + distanceY ** 2);
        
        // Repulsion
        const repulsionRadius = 350;
        let moveX = 0;
        let moveY = 0;

        if (distance < repulsionRadius) {
            const force = (repulsionRadius - distance) / repulsionRadius;
            moveX = -distanceX * force * 0.6; 
            moveY = -distanceY * force * 0.6;
        }

        blob.setAttribute('data-repulse-x', moveX);
        blob.setAttribute('data-repulse-y', moveY);
        blob.setAttribute('data-stretch', stretch);

        const hueShift = (xPct * 50) + (yPct * 50) + (index * 60);
        blob.style.filter = `blur(var(--blob-blur, 80px)) hue-rotate(${hueShift}deg)`;

        updateBlobTransform(blob);
    });

    lastMouseX = mouseX;
    lastMouseY = mouseY;
}

function initBlobClickEffect() {
    document.addEventListener('mousedown', () => {
        const blobs = document.querySelectorAll('.blob');
        blobs.forEach((blob, index) => {
            setTimeout(() => { blob.classList.add('blob-pulse'); }, index * 50);
        });
        setTimeout(() => {
            blobs.forEach(blob => blob.classList.remove('blob-pulse'));
        }, 700);
    });
}

// ===================================
// 6. UI COMPONENT EFFECTS
// ===================================

/**
 * NEW: Spotlight Card Effect
 * Tracks mouse position relative to each card for the glowing border effect.
 */
function initSpotlightCards() {
    const grid = document.querySelector('.spotlight-grid');
    if (!grid) return;

    const cards = Array.from(document.querySelectorAll('.tech-card'));

    // Update mouse coordinates for every card on mousemove
    grid.addEventListener('mousemove', (e) => {
        cards.forEach((card) => {
            const rect = card.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;

            // Set CSS variables for that specific card
            card.style.setProperty('--mouse-x', `${x}px`);
            card.style.setProperty('--mouse-y', `${y}px`);
        });
    });
}

function init3DTilt() {
    if (!CONFIG.ENABLE_3D_EFFECTS_DESKTOP || window.innerWidth <= CONFIG.MOBILE_BREAKPOINT) return;

    document.querySelectorAll('.project-card').forEach(card => {
        card.addEventListener('mousemove', (e) => {
            const rect = card.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            const centerX = rect.width / 2;
            const centerY = rect.height / 2;
            const rotateX = ((y - centerY) / centerY) * 5; 
            const rotateY = ((x - centerX) / centerX) * -5;
            card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateY(-8px)`;
        });

        card.addEventListener('mouseleave', () => {
            card.style.transform = 'perspective(1000px) rotateX(0) rotateY(0) translateY(0)';
        });
    });
}

function initMagneticButtons() {
    if (!CONFIG.ENABLE_MAGNETIC_EFFECTS || window.innerWidth <= CONFIG.TABLET_BREAKPOINT) return;

    document.querySelectorAll('.skill-badge, .theme-toggle-btn').forEach(element => {
        element.addEventListener('mousemove', (e) => {
            const rect = element.getBoundingClientRect();
            const x = e.clientX - rect.left - rect.width / 2;
            const y = e.clientY - rect.top - rect.height / 2;
            element.style.transform = `translate(${x * 0.3}px, ${y * 0.3}px)`;
        });
        element.addEventListener('mouseleave', () => {
            element.style.transform = 'translate(0, 0)';
        });
    });
}

function initNewsletter() {
    const newsletterForm = document.getElementById('newsletter-form');
    if (newsletterForm) {
        newsletterForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const emailInput = newsletterForm.querySelector('input[type="email"]');
            const button = newsletterForm.querySelector('button');
            const originalText = button.textContent;
            
            button.textContent = '✓ Joined';
            button.style.color = 'var(--color-accent)';
            emailInput.disabled = true;

            log(`Newsletter Signup: ${emailInput.value}`);

            setTimeout(() => {
                button.textContent = originalText;
                button.style.color = '';
                newsletterForm.reset();
                emailInput.disabled = false;
            }, 3000);
        });
    }
}

// ===================================
// 7. INITIALIZATION & OBSERVERS
// ===================================
function initObservers() {
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
                if (entry.target.classList.contains('project-card')) {
                    const delay = entry.target.getAttribute('data-delay') || 0;
                    entry.target.style.animationDelay = `${delay}s`;
                }
            }
        });
    }, { threshold: 0.1, rootMargin: '0px 0px -50px 0px' });

    document.querySelectorAll('.project-card, .fade-in-up, .fade-in-left, .fade-in-right, .reveal-text').forEach(el => {
        observer.observe(el);
    });

    const skillTagObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const tags = entry.target.querySelectorAll('.skill-tag');
                tags.forEach((tag, index) => {
                    setTimeout(() => {
                        tag.style.opacity = '1';
                        tag.style.transform = 'translateY(0)';
                    }, index * 50);
                });
                skillTagObserver.unobserve(entry.target);
            }
        });
    }, { threshold: 0.3 });

    const techTags = document.querySelector('.tech-tags');
    if (techTags) skillTagObserver.observe(techTags);
}

function handleResponsiveNav() {
    const nav = document.querySelector('.floating-nav');
    if (!nav) return;
    
    if (window.innerWidth < 640) {
        nav.style.fontSize = '0.75rem';
        nav.style.padding = '0.5rem 1rem';
    } else {
        nav.style.fontSize = '';
        nav.style.padding = '';
    }
}

function optimizeForMobile() {
    if (window.innerWidth < CONFIG.MOBILE_BREAKPOINT) {
        document.querySelectorAll('.blob').forEach(blob => {
            blob.style.animation = 'none'; 
        });
        document.querySelectorAll('.particle').forEach(p => p.style.display = 'none');
    }
}

// ===================================
// MAIN INIT FUNCTION
// ===================================
function init() {
    initTheme();
    initObservers();
    initNewsletter();
    
    // UI Effects
    init3DTilt();
    initSpotlightCards(); // <--- Replaced Orbit with Spotlight
    initMagneticButtons();
    initBlobClickEffect();
    
    // Event Listeners
    window.addEventListener('scroll', handleScroll, { passive: true });
    
    if (themeToggle) {
        themeToggle.removeEventListener('click', toggleTheme); 
        themeToggle.addEventListener('click', toggleTheme);
    }
    
    if (window.innerWidth > CONFIG.TABLET_BREAKPOINT) {
        document.addEventListener('mousemove', handleBlobMovement);
    }

    // Smooth Scroll Anchors
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
            e.preventDefault();
            const targetId = this.getAttribute('href');
            if (targetId === '#') return;
            const target = document.querySelector(targetId);
            if (target) {
                window.scrollTo({
                    top: target.offsetTop,
                    behavior: 'smooth'
                });
                document.querySelectorAll('.nav-link').forEach(link => link.classList.remove('active'));
                this.classList.add('active');
            }
        });
    });

    handleResponsiveNav();
    optimizeForMobile();

    log('✨ Portfolio initialized successfully!');
}

// ===================================
// 8. GLOBAL EVENT BINDINGS
// ===================================
window.addEventListener('load', () => {
    document.body.classList.add('loaded');
    setTimeout(() => {
        const firstSection = document.querySelector('#home');
        if (firstSection) {
            firstSection.style.opacity = '1';
            firstSection.style.transform = 'translateY(0)';
        }
    }, 100);
    init();
});

window.addEventListener('resize', () => {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(() => {
        handleResponsiveNav();
        if (window.innerWidth > CONFIG.MOBILE_BREAKPOINT) init3DTilt();
        if (window.innerWidth > CONFIG.TABLET_BREAKPOINT) {
            // Re-init spotlight on resize to ensure coords are correct
            initSpotlightCards();
            initMagneticButtons();
            document.removeEventListener('mousemove', handleBlobMovement);
            document.addEventListener('mousemove', handleBlobMovement);
        }
    }, 250);
});

document.addEventListener('keydown', (e) => {
    if ((e.key === 't' || e.key === 'T') && 
        e.target.tagName !== 'INPUT' && 
        e.target.tagName !== 'TEXTAREA') {
        toggleTheme();
    }
    if (e.key === 'Escape') {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }
});

document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
        document.body.classList.add('paused');
    } else {
        document.body.classList.remove('paused');
    }
});
function initSpotlightCards() {
    const cards = document.querySelectorAll('.tech-card');

    if (!cards.length) return;

    // Attach event listener to the Grid container (better performance than individual listeners)
    const grid = document.querySelector('.spotlight-grid');
    
    grid.addEventListener('mousemove', (e) => {
        cards.forEach((card) => {
            const rect = card.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;

            // Update CSS variables for every card
            // We update all of them so the "fade out" looks correct if you move fast
            card.style.setProperty('--mouse-x', `${x}px`);
            card.style.setProperty('--mouse-y', `${y}px`);
        });
    });
}
