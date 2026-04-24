import './Css/AboutUs.css';
import { useState, useEffect } from 'react';
import Loading from './Loading';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

function AboutUs() {
  const [loading, setLoading] = useState(true);
  const { isAuthenticated, roles } = useAuth();
  const navigate = useNavigate();

  const isUser = roles.includes('patient');

  useEffect(() => {
    // Giả lập thời gian load trang (có thể thay bằng logic load data thực tế)
    const timer = setTimeout(() => {
      setLoading(false);
    }, 1000); // 1.5 giây

    return () => clearTimeout(timer);
  }, []);

  // Handle Appointment click - Check authentication and role
  const handleAppointmentClick = (e) => {
    e.preventDefault();

    if (!isAuthenticated) {
      navigate('/login');
      return;
    }

    if (isUser) {
      navigate('/schedule');
    } else {
      navigate('/');
    }
  };

  if (loading) {
    return <Loading />;
  }
  return (
    <>
      <div className='aboutus-page'>
        {/* Hero Section */}
        <div className='aboutus-hero'>
          <div className='aboutus-hero-content'>
            <div className='aboutus-hero-title'>
              Welcome To Online Health<br />
              Consultation Portal
            </div>
            <div className='aboutus-hero-description'>
              Providing professional medical & health care services with modern technology
            </div>
          </div>
        </div>

        {/* Mission & Vision Section */}
        <div className='aboutus-mission-section'>
          <div className='container'>
            <div className='row'>
              <div className='col-md-6'>
                <div className='aboutus-section-badge'>
                  OUR MISSION
                </div>
                <div className='aboutus-section-title'>
                  <b>Making Healthcare</b> <b className='aboutus-highlight'>Accessible For Everyone</b>
                </div>
                <div className='aboutus-section-text'>
                  HealthLink aims to provide an efficient, secure, and accessible
                  way for patients to receive medical consultations, store health records, and use AI for
                  preliminary diagnosis. By reducing barriers to access and providing a more streamlined
                  healthcare experience, this platform has the potential to revolutionize the way people engage
                  with healthcare services.
                </div>
              </div>
              <div className='col-md-6'>
                <div className='aboutus-mission-image'>
                  <img src='/public/Hung/about_us_profes.jpg' alt='Our Mission' />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Our Values Section */}
        <div className='aboutus-values-section'>
          <div className='container'>
            <div className='aboutus-section-badge-center'>
              CORE VALUES
            </div>
            <div className='aboutus-section-title-center'>
              <b>What We Stand For</b>
            </div>
            <div className='row aboutus-values-row'>
              <div className='col-md-4'>
                <div className='aboutus-value-card'>
                  <div className='aboutus-value-icon'>
                    <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 16 16">
                      <path fill="#00b09a" d="M8 1a7 7 0 1 0 0 14A7 7 0 0 0 8 1zm0 13A6 6 0 1 1 8 2a6 6 0 0 1 0 12zm.93-9.412-1 4.705c-.07.34.029.533.304.533.194 0 .487-.07.686-.246l-.088.416c-.287.346-.92.598-1.465.598-.703 0-1.002-.422-.808-1.319l.738-3.468c.064-.293.006-.399-.287-.47l-.451-.081.082-.381 2.29-.287zM8 5.5a1 1 0 1 1 0-2 1 1 0 0 1 0 2z" />
                    </svg>
                  </div>
                  <div className='aboutus-value-title'>
                    <b>Professional Care</b>
                  </div>
                  <div className='aboutus-value-text'>
                    We provide professional medical services with highly qualified doctors and specialists who are committed to your health.
                  </div>
                </div>
              </div>
              <div className='col-md-4'>
                <div className='aboutus-value-card'>
                  <div className='aboutus-value-icon'>
                    <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 16 16">
                      <path fill="#00b09a" d="M3.612 15.443c-.386.198-.824-.149-.746-.592l.83-4.73L.173 6.765c-.329-.314-.158-.888.283-.95l4.898-.696L7.538.792c.197-.39.73-.39.927 0l2.184 4.327 4.898.696c.441.062.612.636.282.95l-3.522 3.356.83 4.73c.078.443-.36.79-.746.592L8 13.187l-4.389 2.256z" />
                    </svg>
                  </div>
                  <div className='aboutus-value-title'>
                    <b>Quality Service</b>
                  </div>
                  <div className='aboutus-value-text'>
                    We maintain the highest standards of quality in every aspect of our healthcare delivery and patient care.
                  </div>
                </div>
              </div>
              <div className='col-md-4'>
                <div className='aboutus-value-card'>
                  <div className='aboutus-value-icon'>
                    <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 16 16">
                      <path fill="#00b09a" d="m8 2.748-.717-.737C5.6.281 2.514.878 1.4 3.053c-.523 1.023-.641 2.5.314 4.385.92 1.815 2.834 3.989 6.286 6.357 3.452-2.368 5.365-4.542 6.286-6.357.955-1.886.838-3.362.314-4.385C13.486.878 10.4.28 8.717 2.01L8 2.748zM8 15C-7.333 4.868 3.279-3.04 7.824 1.143c.06.055.119.112.176.171a3.12 3.12 0 0 1 .176-.17C12.72-3.042 23.333 4.867 8 15z" />
                    </svg>
                  </div>
                  <div className='aboutus-value-title'>
                    <b>Patient First</b>
                  </div>
                  <div className='aboutus-value-text'>
                    Your health and well-being are our top priorities. We put patients at the center of everything we do.
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Statistics Section */}
        <div className='aboutus-stats-section'>
          <div className='container'>
            <div className='row'>
              <div className='col-md-3'>
                <div className='aboutus-stat-card'>
                  <div className='aboutus-stat-number'>87</div>
                  <div className='aboutus-stat-label'>Expert Doctors</div>
                </div>
              </div>
              <div className='col-md-3'>
                <div className='aboutus-stat-card'>
                  <div className='aboutus-stat-number'>101</div>
                  <div className='aboutus-stat-label'>Awards Won</div>
                </div>
              </div>
              <div className='col-md-3'>
                <div className='aboutus-stat-card'>
                  <div className='aboutus-stat-number'>109</div>
                  <div className='aboutus-stat-label'>Clinical Services</div>
                </div>
              </div>
              <div className='col-md-3'>
                <div className='aboutus-stat-card'>
                  <div className='aboutus-stat-number'>1000+</div>
                  <div className='aboutus-stat-label'>Happy Patients</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Our Services Section */}
        <div className='aboutus-services-section'>
          <div className='container'>
            <div className='aboutus-section-badge-center'>
              OUR SERVICES
            </div>
            <div className='aboutus-section-title-center'>
              <b>What We Offer</b>
            </div>
            <div className='row'>
              <div className='col-md-4'>
                <div className='aboutus-service-card'>
                  <div className='aboutus-service-icon'>
                    <svg width="64" height="64" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <circle cx="32" cy="32" r="30" stroke="#00b09a" strokeWidth="2" opacity="0.15" />
                      <g transform="translate(32,32)">
                        <path d="M0-18 L15.5-9 L15.5 9 L0 18 L-15.5 9 L-15.5-9 Z"
                          fill="none"
                          stroke="#00b09a"
                          strokeWidth="3" />
                        <circle cx="0" cy="0" r="8" fill="none" stroke="#00b09a" strokeWidth="2.5" />
                        <circle cx="0" cy="0" r="3" fill="#00b09a" />
                        <line x1="0" y1="-8" x2="0" y2="-15" stroke="#00b09a" strokeWidth="2" strokeLinecap="round" />
                        <line x1="0" y1="8" x2="0" y2="15" stroke="#00b09a" strokeWidth="2" strokeLinecap="round" />
                        <line x1="-7" y1="-4" x2="-13" y2="-7.5" stroke="#00b09a" strokeWidth="2" strokeLinecap="round" />
                        <line x1="7" y1="-4" x2="13" y2="-7.5" stroke="#00b09a" strokeWidth="2" strokeLinecap="round" />
                        <line x1="-7" y1="4" x2="-13" y2="7.5" stroke="#00b09a" strokeWidth="2" strokeLinecap="round" />
                        <line x1="7" y1="4" x2="13" y2="7.5" stroke="#00b09a" strokeWidth="2" strokeLinecap="round" />
                        <circle cx="0" cy="-15" r="2" fill="#00b09a" />
                        <circle cx="0" cy="15" r="2" fill="#00b09a" />
                        <circle cx="-13" cy="-7.5" r="1.5" fill="#00b09a" />
                        <circle cx="13" cy="-7.5" r="1.5" fill="#00b09a" />
                        <circle cx="-13" cy="7.5" r="1.5" fill="#00b09a" />
                        <circle cx="13" cy="7.5" r="1.5" fill="#00b09a" />
                      </g>
                      <text x="31" y="61" fontFamily="Arial, sans-serif" fontSize="12" fill="#00b09a" fontWeight="bold" textAnchor="middle">AI</text>
                    </svg>
                  </div>
                  <div className='aboutus-service-title'>
                    <b>AI-Powered Diagnosis</b>
                  </div>
                  <div className='aboutus-service-text'>
                    Advanced AI technology to help with preliminary diagnosis and health recommendations.
                  </div>
                </div>
              </div>
              <div className='col-md-4'>
                <div className='aboutus-service-card'>
                  <div className='aboutus-service-icon'>
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="64" height="64">
                      <path fill='#00b09a' d="M340.596 309.258H300.03v17.97h-17.969v40.565h17.969v17.97h40.566v-17.97h17.97v-40.566h-17.97zm4.97 30.97v14.565h-17.97v17.97H313.03v-17.97h-17.969v-14.566h17.969v-17.97h14.566v17.97z" /><path fill='#00b09a' d="m358.984 281.018-49.045-25.036a71.077 71.077 0 0 0 11.679-19.295h2.919a21.506 21.506 0 0 0 21.481-21.482v-15.062a21.512 21.512 0 0 0-19.205-21.362v-18.618a70.813 70.813 0 0 0-141.626 0v18.618a21.512 21.512 0 0 0-19.205 21.362v15.062a21.506 21.506 0 0 0 21.481 21.482h2.92a71.072 71.072 0 0 0 11.752 19.383l-49.118 24.948a72.247 72.247 0 0 0-39.588 64.637v76.995h285.142v-76.995a72.248 72.248 0 0 0-39.587-64.637zM198.187 160.163a57.813 57.813 0 0 1 115.626 0v18.403c-71.18-2.127-72.92-39.159-72.959-40.92a6.5 6.5 0 0 0-12.982-.422c-1.215 16.533-18.559 29.92-29.685 36.865zm-3.27 63.524h-7.453a8.491 8.491 0 0 1-8.482-8.482v-15.062a8.491 8.491 0 0 1 8.482-8.481h4.231a6.624 6.624 0 0 0 .68-.037c.045-.005.089-.015.133-.02.185-.024.368-.051.548-.09.053-.012.106-.028.16-.041.17-.041.338-.086.502-.14.06-.02.12-.045.18-.066.156-.057.309-.117.459-.184.026-.012.053-.02.08-.032 1.398-.653 27.258-12.938 39.797-33.396a51.604 51.604 0 0 0 6.047 8.138c15.544 17.165 42.47 25.868 80.033 25.868h4.223a8.491 8.491 0 0 1 8.482 8.481v15.062a8.491 8.491 0 0 1-8.482 8.482h-7.453a6.5 6.5 0 0 0-6.172 4.462 57.77 57.77 0 0 1-109.824 0 6.5 6.5 0 0 0-6.171-4.462zM385.571 409.65H126.429v-63.995a59.3 59.3 0 0 1 32.485-53.052l14.265-7.246v27.85a30.198 30.198 0 0 0-26.113 29.88v34.69h13v-34.69a17.178 17.178 0 0 1 17.158-17.158h4.91a17.178 17.178 0 0 1 17.159 17.158v34.69h13v-34.69a30.199 30.199 0 0 0-26.114-29.88v-34.453l25.834-13.12a70.734 70.734 0 0 0 88.076-.084l52.987 27.048a59.305 59.305 0 0 1 32.495 53.057z" />
                    </svg>
                  </div>
                  <div className='aboutus-service-title'>
                    <b>Expert Consultation</b>
                  </div>
                  <div className='aboutus-service-text'>
                    Connect with experienced doctors and specialists for professional medical consultations.
                  </div>
                </div>
              </div>
              <div className='col-md-4'>
                <div className='aboutus-service-card'>
                  <div className='aboutus-service-icon'>
                    <svg xmlns="http://www.w3.org/2000/svg"
                      width="32"
                      height="64"
                      viewBox="0 0 87.22 139.998"
                      preserveAspectRatio="xMidYMid meet"
                      fill="none" stroke="#00b09a" strokeLinecap="round" strokeLinejoin="round" strokeWidth="6">
                      <g>
                        <path d="M66.948 18.436h3.4a15.033 15.033 0 0 1 14.867 15.2V122.8A15.033 15.033 0 0 1 70.352 138h-53.49A15.03 15.03 0 0 1 2 122.8V33.633a15.032 15.032 0 0 1 14.861-15.2h3.664" />
                        <path d="M58.794 13.582v8.295H28.425v-8.295H33.8a2.23 2.23 0 0 0 2.221-2.239 2.3 2.3 0 0 0-.021-.309 7.784 7.784 0 0 1-.084-1.172A7.693 7.693 0 0 1 51.3 9.5a7.659 7.659 0 0 1-.073 1.521 2.236 2.236 0 0 0 1.89 2.536 2.118 2.118 0 0 0 .308.023zM23.411 48.328H67.26M18.152 65.189H67.26M18.152 82.05H67.26M18.152 98.911H67.26M18.152 115.772H67.26" />
                      </g>
                    </svg>
                  </div>
                  <div className='aboutus-service-title'>
                    <b>Health Records</b>
                  </div>
                  <div className='aboutus-service-text'>
                    Secure digital storage and easy access to your complete medical history and health records.
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* CTA Section */}
        <div className='aboutus-cta-section'>
          <div className='container'>
            <div className='aboutus-cta-content'>
              <div className='aboutus-cta-title'>
                Ready To Get Started?
              </div>
              <div className='aboutus-cta-text'>
                Join thousands of patients who trust us with their healthcare needs
              </div>
              <div className='aboutus-cta-buttons'>
                <button className='aboutus-cta-btn aboutus-cta-btn-primary' onClick={handleAppointmentClick}>
                  BOOK APPOINTMENT
                </button>
                <NavLink to="/contact_us">
                  <button className='aboutus-cta-btn aboutus-cta-btn-secondary'>
                    CONTACT US
                  </button>
                </NavLink>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

export default AboutUs;