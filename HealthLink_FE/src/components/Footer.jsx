import React, { useState, useEffect } from 'react';
import './Css/Footer.css';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

function Footer() {
  const [isVisible, setIsVisible] = useState(false);
  const { isAuthenticated, roles } = useAuth();
  const navigate = useNavigate();

  const isAdmin = roles.includes('admin');
  const isDoctor = roles.includes('doctor');
  const isUser = roles.includes('patient');

  const toggleVisibility = () => {
    if (window.pageYOffset > 300) {
      setIsVisible(true);
    } else {
      setIsVisible(false);
    }
  };

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  };

  // Handle appointment button click with authentication and role check
  const handleAppointmentClick = (e) => {
    e.preventDefault();

    // Check if user is authenticated
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }

    // Check role - only Patient can access schedule
    if (isUser) {
      navigate('/schedule');
      scrollToTop();
    } else {
      // Doctor or Admin - redirect to home
      navigate('/');
      scrollToTop();
    }
  };

  useEffect(() => {
    window.addEventListener('scroll', toggleVisibility);
    return () => window.removeEventListener('scroll', toggleVisibility);
  }, []);

  return (
    <>
      <div className="footer-container">
        <div className="container">
          <div className="row">

            {/* Cột 1: Logo + mô tả + social */}
            <div className="col-md-3">
              <div className="footer-logo">
                <NavLink to="/" className="nav-link" end onClick={scrollToTop}>
                  <img src="/logo_footer.png" alt="Logo" />
                </NavLink>
              </div>

              <div className="footer-description">
                Online medical examination portal: remote consultation, record keeping,
                AI preliminary diagnosis, convenience and modernization of health care.
              </div>

              <div className="footer-social">
                <a href="#" className="footer-social__item footer-social__item--facebook" aria-label="Facebook">
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="white" viewBox="0 0 16 16">
                    <path d="M16 8.049c0-4.446-3.582-8.05-8-8.05C3.58 0-.002 3.603-.002 8.05c0 4.017 2.926 7.347 6.75 7.951v-5.625h-2.03V8.05H6.75V6.275c0-2.017 1.195-3.131 3.022-3.131.876 0 1.791.157 1.791.157v1.98h-1.009c-.993 0-1.303.621-1.303 1.258v1.51h2.218l-.354 2.326H9.25V16c3.824-.604 6.75-3.934 6.75-7.951" />
                  </svg>
                </a>

                <a href="#" className="footer-social__item footer-social__item--youtube" aria-label="YouTube">
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="white" viewBox="0 0 16 16">
                    <path d="M8.051 1.999h.089c.822.003 4.987.033 6.11.335a2.01 2.01 0 0 1 1.415 1.42c.101.38.172.883.22 1.402l.01.104.022.26.008.104c.065.914.073 1.77.074 1.957v.075c-.001.194-.01 1.108-.082 2.06l-.008.105-.009.104c-.05.572-.124 1.14-.235 1.558a2.01 2.01 0 0 1-1.415 1.42c-1.16.312-5.569.334-6.18.335h-.142c-.309 0-1.587-.006-2.927-.052l-.17-.006-.087-.004-.171-.007-.171-.007c-1.11-.049-2.167-.128-2.654-.26a2.01 2.01 0 0 1-1.415-1.419c-.111-.417-.185-.986-.235-1.558L.09 9.82l-.008-.104A31 31 0 0 1 0 7.68v-.123c.002-.215.01-.958.064-1.778l.007-.103.003-.052.008-.104.022-.26.01-.104c.048-.519.119-1.023.22-1.402a2.01 2.01 0 0 1 1.415-1.42c.487-.13 1.544-.21 2.654-.26l.17-.007.172-.006.086-.003.171-.007A100 100 0 0 1 7.858 2zM6.4 5.209v4.818l4.157-2.408z" />
                  </svg>
                </a>

                <a href="#" className="footer-social__item footer-social__item--twitter" aria-label="Twitter">
                  <svg xmlns="http://www.w3.org/2000/svg" width="26" height="26" viewBox="0 0 24 24" fill="white">
                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                  </svg>
                </a>

                <a href="#" className="footer-social__item footer-social__item--instagram" aria-label="Instagram">
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="white" viewBox="0 0 16 16">
                    <path d="M8 0C5.829 0 5.556.01 4.703.048 3.85.088 3.269.222 2.76.42a3.9 3.9 0 0 0-1.417.923A3.9 3.9 0 0 0 .42 2.76C.222 3.268.087 3.85.048 4.7.01 5.555 0 5.827 0 8.001c0 2.172.01 2.444.048 3.297.04.852.174 1.433.372 1.942.205.526.478.972.923 1.417.444.445.89.719 1.416.923.51.198 1.09.333 1.942.372C5.555 15.99 5.827 16 8 16s2.444-.01 3.298-.048c.851-.04 1.434-.174 1.943-.372a3.9 3.9 0 0 0 1.416-.923c.445-.445.718-.891.923-1.417.197-.509.332-1.09.372-1.942C15.99 10.445 16 10.173 16 8s-.01-2.445-.048-3.299c-.04-.851-.175-1.433-.372-1.941a3.9 3.9 0 0 0-.923-1.417A3.9 3.9 0 0 0 13.24.42c-.51-.198-1.092-.333-1.943-.372C10.443.01 10.172 0 7.998 0zm-.717 1.442h.718c2.136 0 2.389.007 3.232.046.78.035 1.204.166 1.486.275.373.145.64.319.92.599s.453.546.598.92c.11.281.24.705.275 1.485.039.843.047 1.096.047 3.231s-.008 2.389-.047 3.232c-.035.78-.166 1.203-.275 1.485a2.5 2.5 0 0 1-.599.919c-.28.28-.546.453-.92.598-.28.11-.704.24-1.485.276-.843.038-1.096.047-3.232.047s-2.39-.009-3.233-.047c-.78-.036-1.203-.166-1.485-.276a2.5 2.5 0 0 1-.92-.598 2.5 2.5 0 0 1-.6-.92c-.109-.281-.24-.705-.275-1.485-.038-.843-.046-1.096-.046-3.233s.008-2.388.046-3.231c.036-.78.166-1.204.276-1.486.145-.373.319-.64.599-.92s.546-.453.92-.598c.282-.11.705-.24 1.485-.276.738-.034 1.024-.044 2.515-.045zm4.988 1.328a.96.96 0 1 0 0 1.92.96.96 0 0 0 0-1.92m-4.27 1.122a4.109 4.109 0 1 0 0 8.217 4.109 4.109 0 0 0 0-8.217m0 1.441a2.667 2.667 0 1 1 0 5.334 2.667 2.667 0 0 1 0-5.334" />
                  </svg>
                </a>
              </div>
            </div>

            {/* Cột 2: Links */}
            <div className="col-md-3 footer-links">
              <h5>Links</h5>
              <hr className="footer-title-line" />
              <ul>
                <li>
                  <NavLink to="/" onClick={scrollToTop}>
                    <i className="fas fa-home me-2"></i>➺ Home
                  </NavLink>
                </li>
                <li>
                  <NavLink to="/about_us" onClick={scrollToTop}>
                    <i className="fas fa-info-circle me-2"></i>➺ About Us
                  </NavLink>
                </li>
                <li>
                  <NavLink to="/doctors" onClick={scrollToTop}>
                    <i className="fas fa-user-md me-2"></i>➺ Doctors
                  </NavLink>
                </li>
                <li>
                 <NavLink to="/schedule" onClick={scrollToTop}>
                    <i className="fas fa-calendar-alt me-2"></i>➺ Schedule
                  </NavLink>
                </li>
                <li>
                  <NavLink to="/contact_us" onClick={scrollToTop}>
                    <i className="fas fa-envelope me-2"></i>➺ Contact Us
                  </NavLink>
                </li>
              </ul>
            </div>

            {/* Cột 3: News Feeds */}
            <div className="col-md-3 footer-news">
              <h5>News Feeds</h5>
              <hr className="footer-title-line" />
              <ul>
                <li>
                  <div className='row'>
                    <div className='col-md-4'>
                      <img src="/Hung/discussion.jpg" alt="" style={{ width: "90px", height: "60px" }} />
                    </div>
                    <div className='col-md-8'>
                      <div>
                        <h6>Jan 20, 2025</h6>
                      </div>
                      <div>
                        <a href="#">Health Tips 2025</a>
                      </div>
                    </div>
                  </div>
                </li>
                <li>
                  <div className='row'>
                    <div className='col-md-4'>
                      <img src="/Hung/covid19.jpg" alt="" style={{ width: "90px", height: "60px" }} />
                    </div>
                    <div className='col-md-8'>
                      <div>
                        <h6>Jan 25, 2025</h6>
                      </div>
                      <div>
                        <a href="#">COVID-19 Updates</a>
                      </div>
                    </div>
                  </div>
                </li>
                <li>
                  <div className='row'>
                    <div className='col-md-4'>
                      <img src="/Hung/medical_AI.png" alt="" style={{ width: "90px", height: "60px" }} />
                    </div>
                    <div className='col-md-8'>
                      <div>
                        <h6>Jan 30, 2025</h6>
                      </div>
                      <div>
                        <a href="#">New AI Features</a>
                      </div>
                    </div>
                  </div>
                </li>
              </ul>
            </div>

            {/* Cột 4: Contact Info */}
            <div className="col-md-3 footer-contact">
              <h5>Contact Info</h5>
              <hr className="footer-title-line" />
              <div className="contact-item">
                <strong>Call Us Now</strong>
                <p>
                  <a
                    href="tel:+00201748812598"
                    className="text-white text-decoration-none hover-underline d-block"
                    style={{ fontSize: '1.1rem', fontWeight: '500' }}
                  >
                    <i className="fas fa-phone-alt me-2"></i>
                    +(002) 0174-8812-598
                  </a>
                </p>
              </div>

              <div className="contact-item">
                <strong>Send Us Message</strong>
                <p>
                  <a
                    href="mailto:HealthLink@gmail.com"
                    className="text-white text-decoration-none hover-underline d-block"
                    style={{ fontSize: '1.1rem', fontWeight: '500' }}
                  >
                    <i className="fas fa-envelope me-2"></i>
                    HealthLink@gmail.com
                  </a>
                </p>
              </div>
            </div>
          </div>

          {/* Đường kẻ lớn phân cách */}
          <hr className="footer-hr" />

          <div className="row footer-bottom">
            <div className="col-md-6">
              © 2025 HealthLink. All rights reserved.
            </div>
            <div className="col-md-6 text-end">
              <a href="#">Privacy Policy</a> · <a href="#">Terms of Service</a>
            </div>
          </div>
        </div>

        {/* Nút Back to Top */}
        <button
          onClick={scrollToTop}
          className={`footer-backtop ${isVisible ? 'footer-backtop--visible' : ''}`}
          aria-label="Lên đầu trang"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="white" viewBox="0 0 16 16">
            <path fillRule="evenodd" d="M8 15a.5.5 0 0 0 .5-.5V2.707l3.146 3.147a.5.5 0 0 0 .708-.708l-4-4a.5.5 0 0 0-.708 0l-4 4a.5.5 0 1 0 .708.708L7.5 2.707V14.5a.5.5 0 0 0 .5.5z" />
          </svg>
        </button>
      </div>
    </>
  );
}

export default Footer;