// Enhanced ESpice Showcase Website JavaScript
// Incorporating MRDI-style animations and process simulations

document.addEventListener('DOMContentLoaded', function() {
    // Initialize all components
    initNavigation();
    initTypewriterEffect();
    initProcessSimulation();
    initAnimatedStats();
    initScrollAnimations();
    initFormValidation();
    initMobileMenu();
    initAutoGeneratingBorders();
    initSmoothScrolling();
});

// Navigation functionality
function initNavigation() {
    const navbar = document.querySelector('.navbar');
    let lastScrollTop = 0;

    window.addEventListener('scroll', () => {
        const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
        
        // Add/remove background on scroll
        if (scrollTop > 50) {
            navbar.style.background = 'rgba(255, 255, 255, 0.98)';
            navbar.style.boxShadow = '0 2px 20px rgba(0, 0, 0, 0.1)';
        } else {
            navbar.style.background = 'rgba(255, 255, 255, 0.95)';
            navbar.style.boxShadow = 'none';
        }

        // Hide/show navbar on scroll
        if (scrollTop > lastScrollTop && scrollTop > 100) {
            navbar.style.transform = 'translateY(-100%)';
        } else {
            navbar.style.transform = 'translateY(0)';
        }
        
        lastScrollTop = scrollTop;
    });

    // Active navigation highlighting
    const sections = document.querySelectorAll('section[id]');
    const navLinks = document.querySelectorAll('.nav-links a[href^="#"]');

    window.addEventListener('scroll', () => {
        let current = '';
        sections.forEach(section => {
            const sectionTop = section.offsetTop;
            const sectionHeight = section.clientHeight;
            if (scrollTop >= sectionTop - 200) {
                current = section.getAttribute('id');
            }
        });

        navLinks.forEach(link => {
            link.classList.remove('active');
            if (link.getAttribute('href') === `#${current}`) {
                link.classList.add('active');
            }
        });
    });
}

// Typewriter effect for hero title
function initTypewriterEffect() {
    const typewriterElements = document.querySelectorAll('.typewriter-text');
    
    typewriterElements.forEach((element, index) => {
        const text = element.getAttribute('data-text');
        element.textContent = '';
        
        setTimeout(() => {
            typeWriter(element, text, 0, 50);
        }, index * 1500);
    });
}

function typeWriter(element, text, i, speed) {
    if (i < text.length) {
        element.textContent += text.charAt(i);
        setTimeout(() => typeWriter(element, text, i + 1, speed), speed);
    } else {
        // Add blinking cursor effect
        element.style.borderRight = '3px solid transparent';
        setInterval(() => {
            element.style.borderRight = element.style.borderRight === '3px solid transparent' 
                ? '3px solid var(--primary-color)' 
                : '3px solid transparent';
        }, 500);
    }
}

// Process simulation with step-by-step animation
function initProcessSimulation() {
    const processSteps = document.querySelectorAll('.process-step');
    const processPreview = document.querySelector('.process-preview');
    
    let currentStep = 0;
    const stepDuration = 4000; // 4 seconds per step

    function activateStep(stepIndex) {
        // Deactivate all steps
        processSteps.forEach(step => {
            step.classList.remove('active');
            const codeLines = step.querySelectorAll('.code-line');
            codeLines.forEach(line => line.classList.remove('typing'));
        });

        // Activate current step
        if (processSteps[stepIndex]) {
            processSteps[stepIndex].classList.add('active');
            
            // Animate code lines
            const codeLines = processSteps[stepIndex].querySelectorAll('.code-line');
            codeLines.forEach((line, index) => {
                setTimeout(() => {
                    line.classList.add('typing');
                }, index * 200);
            });
        }
    }

    // Start the process simulation
    activateStep(0);

    // Auto-advance through steps
    setInterval(() => {
        currentStep = (currentStep + 1) % processSteps.length;
        activateStep(currentStep);
    }, stepDuration);

    // Manual step control on click
    processSteps.forEach((step, index) => {
        step.addEventListener('click', () => {
            currentStep = index;
            activateStep(currentStep);
        });
    });
}

// Animated statistics counter
function initAnimatedStats() {
    const stats = document.querySelectorAll('.stat-number');
    
    const observerOptions = {
        threshold: 0.5,
        rootMargin: '0px 0px -100px 0px'
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const target = entry.target;
                const finalValue = parseFloat(target.getAttribute('data-target'));
                animateCounter(target, finalValue);
                observer.unobserve(target);
            }
        });
    }, observerOptions);

    stats.forEach(stat => observer.observe(stat));
}

function animateCounter(element, target) {
    const duration = 2000;
    const start = 0;
    const increment = target / (duration / 16);
    let current = start;

    const timer = setInterval(() => {
        current += increment;
        if (current >= target) {
            current = target;
            clearInterval(timer);
        }
        
        if (target % 1 === 0) {
            element.textContent = Math.floor(current);
        } else {
            element.textContent = current.toFixed(1);
        }
    }, 16);
}

// Scroll animations with AOS-like functionality
function initScrollAnimations() {
    const animatedElements = document.querySelectorAll('[data-aos]');
    
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const element = entry.target;
                const animation = element.getAttribute('data-aos');
                const delay = element.getAttribute('data-aos-delay') || 0;
                
                setTimeout(() => {
                    element.classList.add('aos-animate');
                }, delay);
                
                observer.unobserve(element);
            }
        });
    }, observerOptions);

    animatedElements.forEach(element => observer.observe(element));
}

// Auto-generating borders effect
function initAutoGeneratingBorders() {
    const cards = document.querySelectorAll('.feature-card, .tech-item, .pricing-card');
    
    cards.forEach(card => {
        card.addEventListener('mouseenter', () => {
            generateBorder(card);
        });
        
        card.addEventListener('mouseleave', () => {
            removeBorder(card);
        });
    });
}

function generateBorder(element) {
    // Create animated border effect
    const border = document.createElement('div');
    border.className = 'animated-border';
    border.style.cssText = `
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        border: 2px solid transparent;
        border-radius: inherit;
        background: linear-gradient(45deg, var(--primary-color), var(--primary-light), var(--primary-color));
        background-size: 200% 200%;
        animation: borderGradient 2s ease infinite;
        pointer-events: none;
        z-index: -1;
    `;
    
    element.style.position = 'relative';
    element.appendChild(border);
}

function removeBorder(element) {
    const border = element.querySelector('.animated-border');
    if (border) {
        border.remove();
    }
}

// Add CSS for border animation
const style = document.createElement('style');
style.textContent = `
    @keyframes borderGradient {
        0% { background-position: 0% 50%; }
        50% { background-position: 100% 50%; }
        100% { background-position: 0% 50%; }
    }
`;
document.head.appendChild(style);

// Form validation
function initFormValidation() {
    const form = document.querySelector('.contact-form form');
    if (!form) return;

    form.addEventListener('submit', (e) => {
        e.preventDefault();
        
        const formData = new FormData(form);
        const data = Object.fromEntries(formData);
        
        // Basic validation
        let isValid = true;
        const errors = [];

        if (!data.name || data.name.trim().length < 2) {
            errors.push('Name must be at least 2 characters long');
            isValid = false;
        }

        if (!data.email || !isValidEmail(data.email)) {
            errors.push('Please enter a valid email address');
            isValid = false;
        }

        if (!data.message || data.message.trim().length < 10) {
            errors.push('Message must be at least 10 characters long');
            isValid = false;
        }

        if (isValid) {
            // Show success message
            showNotification('Message sent successfully!', 'success');
            form.reset();
        } else {
            // Show error messages
            errors.forEach(error => showNotification(error, 'error'));
        }
    });
}

function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

function showNotification(message, type) {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 1rem 1.5rem;
        border-radius: 8px;
        color: white;
        font-weight: 500;
        z-index: 10000;
        transform: translateX(100%);
        transition: transform 0.3s ease;
        background: ${type === 'success' ? 'var(--primary-color)' : '#ef4444'};
    `;
    
    document.body.appendChild(notification);
    
    // Animate in
    setTimeout(() => {
        notification.style.transform = 'translateX(0)';
    }, 100);
    
    // Remove after 5 seconds
    setTimeout(() => {
        notification.style.transform = 'translateX(100%)';
        setTimeout(() => notification.remove(), 300);
    }, 5000);
}

// Mobile menu functionality
function initMobileMenu() {
    const mobileToggle = document.querySelector('.mobile-menu-toggle');
    const navLinks = document.querySelector('.nav-links');
    
    if (!mobileToggle || !navLinks) return;

    mobileToggle.addEventListener('click', () => {
        navLinks.classList.toggle('active');
        mobileToggle.classList.toggle('active');
        
        // Animate hamburger menu
        const spans = mobileToggle.querySelectorAll('span');
        if (mobileToggle.classList.contains('active')) {
            spans[0].style.transform = 'rotate(45deg) translate(5px, 5px)';
            spans[1].style.opacity = '0';
            spans[2].style.transform = 'rotate(-45deg) translate(7px, -6px)';
        } else {
            spans[0].style.transform = 'none';
            spans[1].style.opacity = '1';
            spans[2].style.transform = 'none';
        }
    });

    // Close menu when clicking on a link
    navLinks.querySelectorAll('a').forEach(link => {
        link.addEventListener('click', () => {
            navLinks.classList.remove('active');
            mobileToggle.classList.remove('active');
        });
    });
}

// Smooth scrolling for anchor links
function initSmoothScrolling() {
    const links = document.querySelectorAll('a[href^="#"]');
    
    links.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            
            const targetId = link.getAttribute('href');
            const targetElement = document.querySelector(targetId);
            
            if (targetElement) {
                const offsetTop = targetElement.offsetTop - 80; // Account for fixed navbar
                
                window.scrollTo({
                    top: offsetTop,
                    behavior: 'smooth'
                });
            }
        });
    });
}

// Parallax effect for hero section
function initParallaxEffect() {
    const hero = document.querySelector('.hero');
    if (!hero) return;

    window.addEventListener('scroll', () => {
        const scrolled = window.pageYOffset;
        const rate = scrolled * -0.5;
        hero.style.transform = `translateY(${rate}px)`;
    });
}

// Initialize parallax effect
initParallaxEffect();

// Performance monitoring
function initPerformanceMonitor() {
    // Monitor page load performance
    window.addEventListener('load', () => {
        const loadTime = performance.timing.loadEventEnd - performance.timing.navigationStart;
        console.log(`Page loaded in ${loadTime}ms`);
        
        // Send to analytics if needed
        if (loadTime > 3000) {
            console.warn('Page load time is slow');
        }
    });
}

// Initialize performance monitoring
initPerformanceMonitor();

// Keyboard navigation support
function initKeyboardNavigation() {
    document.addEventListener('keydown', (e) => {
        // Escape key closes mobile menu
        if (e.key === 'Escape') {
            const navLinks = document.querySelector('.nav-links');
            const mobileToggle = document.querySelector('.mobile-menu-toggle');
            
            if (navLinks && navLinks.classList.contains('active')) {
                navLinks.classList.remove('active');
                mobileToggle.classList.remove('active');
            }
        }
        
        // Tab key navigation enhancement
        if (e.key === 'Tab') {
            document.body.classList.add('keyboard-navigation');
        }
    });
    
    // Remove keyboard navigation class on mouse use
    document.addEventListener('mousedown', () => {
        document.body.classList.remove('keyboard-navigation');
    });
}

// Initialize keyboard navigation
initKeyboardNavigation();

// Add CSS for keyboard navigation
const keyboardStyle = document.createElement('style');
keyboardStyle.textContent = `
    .keyboard-navigation *:focus {
        outline: 2px solid var(--primary-color) !important;
        outline-offset: 2px !important;
    }
`;
document.head.appendChild(keyboardStyle);

// Lazy loading for images
function initLazyLoading() {
    const images = document.querySelectorAll('img[data-src]');
    
    const imageObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const img = entry.target;
                img.src = img.dataset.src;
                img.classList.remove('lazy');
                imageObserver.unobserve(img);
            }
        });
    });
    
    images.forEach(img => imageObserver.observe(img));
}

// Initialize lazy loading
initLazyLoading();

// Service Worker registration for PWA capabilities
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js')
            .then(registration => {
                console.log('SW registered: ', registration);
            })
            .catch(registrationError => {
                console.log('SW registration failed: ', registrationError);
            });
    });
}

// Export functions for potential external use
window.ESpiceShowcase = {
    initTypewriterEffect,
    initProcessSimulation,
    initAnimatedStats,
    showNotification,
    initScrollAnimations
}; 