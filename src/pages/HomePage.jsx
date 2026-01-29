// src/pages/HomePage.jsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import './HomePage.css';

export default function HomePage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [scrolled, setScrolled] = useState(false);

  React.useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const tutorCategories = [
    {
      icon: '🐍',
      title: 'Python Programming',
      description: 'Master Python from basics to advanced. Learn data structures, OOP, Django, and more.',
      color: '#3776ab'
    },
    {
      icon: '💾',
      title: 'Database Management',
      description: 'SQL, NoSQL, PostgreSQL, MongoDB. Design and optimize databases for any application.',
      color: '#336791'
    },
    {
      icon: '🌐',
      title: 'Web Development',
      description: 'React, Vue, Node.js, full-stack development. Build responsive, modern web applications.',
      color: '#f7df1e'
    },
    {
      icon: '💻',
      title: 'IT & Coding',
      description: 'JavaScript, Java, C++, algorithms, data structures. Core programming fundamentals.',
      color: '#00b4ab'
    },
  ];

  const features = [
    {
      icon: '📅',
      title: 'Easy Booking',
      description: 'Schedule lessons at times that work for you. Book with experienced tutors instantly.'
    },
    {
      icon: '👨‍🏫',
      title: 'Expert Tutors',
      description: 'Learn from professional developers and IT specialists with real-world experience.'
    },
    {
      icon: '💷',
      title: 'Flexible Pricing',
      description: 'Tutors set their own rates. Find quality lessons at prices that suit your budget.'
    },
    {
      icon: '🚀',
      title: 'Fast Progress',
      description: 'One-on-one personalized learning. Achieve your goals faster with dedicated instruction.'
    },
  ];

  const testimonials = [
    {
      name: 'Alex Johnson',
      role: 'Student',
      text: 'The tutors here are amazing! I went from struggling with Python to building my own projects in just 2 months.',
      avatar: '👨‍💼'
    },
    {
      name: 'Sarah Williams',
      role: 'Student',
      text: 'Finally understand web development! The personalized approach made all the difference for me.',
      avatar: '👩‍💼'
    },
    {
      name: 'Mike Chen',
      role: 'Student',
      text: 'Best investment I\'ve made in my career. The database course was exactly what I needed.',
      avatar: '👨‍💻'
    },
  ];

  return (
    <div className="home-page">
      {/* Navigation Header */}
      <nav className={`navbar ${scrolled ? 'scrolled' : ''}`}>
        <div className="nav-container">
          <div className="nav-logo">
            <span className="logo-icon">💡</span>
            <span>TutorHub</span>
          </div>
          <div className="nav-links">
            <a href="#tutors" className="nav-link">Find Tutors</a>
            <a href="#features" className="nav-link">Why Us</a>
            <a href="#pricing" className="nav-link">Pricing</a>
            {user ? (
              <button className="btn btn-primary" onClick={() => navigate('/dashboard')}>
                Dashboard
              </button>
            ) : (
              <>
                <button className="btn btn-outline" onClick={() => navigate('/login')}>
                  Log In
                </button>
                <button className="btn btn-primary" onClick={() => navigate('/signup')}>
                  Sign Up
                </button>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="hero">
        <div className="hero-content">
          <h1 className="hero-title">
            Master Tech Skills with <span className="highlight">Expert Tutors</span>
          </h1>
          <p className="hero-subtitle">
            Learn Python, Web Development, Database Management & IT from experienced professionals. 
            Book lessons with flexible scheduling at competitive rates.
          </p>
          <div className="hero-cta">
            <button 
              className="btn btn-primary btn-lg"
              onClick={() => navigate(user ? '/tutors' : '/signup')}
            >
              Find a Tutor Now
            </button>
            <button 
              className="btn btn-outline btn-lg"
              onClick={() => navigate('/become-tutor')}
            >
              Become a Tutor
            </button>
          </div>
        </div>
        <div className="hero-visual">
          <div className="code-block">
            <div className="code-header">
              <span className="code-dot red"></span>
              <span className="code-dot yellow"></span>
              <span className="code-dot green"></span>
            </div>
            <div className="code-content">
              <p>{'def learn_tech():'}</p>
              <p className="indent">{'skills = ["Python", "Web Dev", "Database"]'}</p>
              <p className="indent">{'for skill in skills:'}</p>
              <p className="indent-2">{'master(skill)'}</p>
              <p className="indent">{'return Success()'}</p>
            </div>
          </div>
        </div>
      </section>

      {/* Categories Section */}
      <section className="categories" id="tutors">
        <div className="container">
          <h2 className="section-title">What You Can Learn</h2>
          <p className="section-subtitle">Expert instruction in the most in-demand tech skills</p>
          
          <div className="categories-grid">
            {tutorCategories.map((category, index) => (
              <div key={index} className="category-card" style={{ borderTopColor: category.color }}>
                <div className="category-icon" style={{ backgroundColor: category.color + '20', color: category.color }}>
                  {category.icon}
                </div>
                <h3>{category.title}</h3>
                <p>{category.description}</p>
                <button 
                  className="btn btn-link"
                  onClick={() => navigate(`/tutors?category=${category.title.toLowerCase()}`)}
                >
                  Find Tutors →
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="features" id="features">
        <div className="container">
          <h2 className="section-title">Why Choose TutorHub?</h2>
          
          <div className="features-grid">
            {features.map((feature, index) => (
              <div key={index} className="feature-card">
                <div className="feature-icon">{feature.icon}</div>
                <h3>{feature.title}</h3>
                <p>{feature.description}</p>
              </div>
            ))}
          </div>

          <div className="features-highlight">
            <div className="highlight-item">
              <div className="highlight-number">500+</div>
              <p>Qualified Tutors</p>
            </div>
            <div className="highlight-item">
              <div className="highlight-number">10K+</div>
              <p>Happy Students</p>
            </div>
            <div className="highlight-item">
              <div className="highlight-number">98%</div>
              <p>Satisfaction Rate</p>
            </div>
            <div className="highlight-item">
              <div className="highlight-number">£15-60</div>
              <p>Per Hour Rate</p>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="how-it-works">
        <div className="container">
          <h2 className="section-title">How It Works</h2>
          
          <div className="steps-container">
            <div className="step">
              <div className="step-number">1</div>
              <h3>Browse Tutors</h3>
              <p>View profiles of vetted tutors with their expertise, experience, and hourly rates.</p>
            </div>
            <div className="step-arrow">→</div>
            <div className="step">
              <div className="step-number">2</div>
              <h3>Select & Book</h3>
              <p>Choose your preferred tutor and book lessons at times that work for you.</p>
            </div>
            <div className="step-arrow">→</div>
            <div className="step">
              <div className="step-number">3</div>
              <h3>Pay Securely</h3>
              <p>Complete payment via PayPal. Safe, secure, and instant confirmation.</p>
            </div>
            <div className="step-arrow">→</div>
            <div className="step">
              <div className="step-number">4</div>
              <h3>Learn & Grow</h3>
              <p>Start your personalized lessons and track your progress with expert guidance.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="testimonials">
        <div className="container">
          <h2 className="section-title">What Students Say</h2>
          
          <div className="testimonials-grid">
            {testimonials.map((testimonial, index) => (
              <div key={index} className="testimonial-card">
                <div className="testimonial-avatar">{testimonial.avatar}</div>
                <p className="testimonial-text">"{testimonial.text}"</p>
                <p className="testimonial-author">{testimonial.name}</p>
                <p className="testimonial-role">{testimonial.role}</p>
                <div className="testimonial-stars">⭐⭐⭐⭐⭐</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="pricing" id="pricing">
        <div className="container">
          <h2 className="section-title">Flexible Pricing</h2>
          <p className="section-subtitle">Tutors set their own rates. Find quality lessons at affordable prices.</p>
          
          <div className="pricing-grid">
            <div className="pricing-card">
              <h3>Beginner</h3>
              <p className="price">£15-25<span>/hour</span></p>
              <ul className="pricing-features">
                <li>✓ New to tutoring</li>
                <li>✓ Building experience</li>
                <li>✓ Great for fundamentals</li>
              </ul>
            </div>
            <div className="pricing-card featured">
              <div className="badge">Most Popular</div>
              <h3>Intermediate</h3>
              <p className="price">£25-45<span>/hour</span></p>
              <ul className="pricing-features">
                <li>✓ 2-5 years experience</li>
                <li>✓ Advanced topics</li>
                <li>✓ Industry expertise</li>
              </ul>
            </div>
            <div className="pricing-card">
              <h3>Expert</h3>
              <p className="price">£45-60<span>/hour</span></p>
              <ul className="pricing-features">
                <li>✓ 5+ years experience</li>
                <li>✓ Specialized knowledge</li>
                <li>✓ Career mentoring</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="cta-final">
        <div className="container">
          <h2>Ready to Start Learning?</h2>
          <p>Join thousands of students learning from expert tutors today.</p>
          <button 
            className="btn btn-primary btn-lg"
            onClick={() => navigate(user ? '/tutors' : '/signup')}
          >
            Get Started Free
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="footer">
        <div className="container">
          <div className="footer-content">
            <div className="footer-section">
              <h4>TutorHub</h4>
              <p>Connect with expert tutors. Learn tech skills. Achieve your goals.</p>
            </div>
            <div className="footer-section">
              <h4>Quick Links</h4>
              <ul>
                <li><a href="#tutors">Find Tutors</a></li>
                <li><a href="#features">Why Us</a></li>
                <li><a href="#pricing">Pricing</a></li>
                <li><a href="/become-tutor">Become a Tutor</a></li>
              </ul>
            </div>
            <div className="footer-section">
              <h4>Support</h4>
              <ul>
                <li><a href="/help">Help Center</a></li>
                <li><a href="/contact">Contact Us</a></li>
                <li><a href="/privacy">Privacy Policy</a></li>
                <li><a href="/terms">Terms of Service</a></li>
              </ul>
            </div>
            <div className="footer-section">
              <h4>Connect</h4>
              <div className="social-links">
                <a href="#" className="social-icon">f</a>
                <a href="#" className="social-icon">𝕏</a>
                <a href="#" className="social-icon">in</a>
              </div>
            </div>
          </div>
          <div className="footer-bottom">
            <p>&copy; 2026 TutorHub. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
