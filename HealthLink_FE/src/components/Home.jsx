import { useState, useEffect } from 'react';
import './Css/Home.css';
import Loading from './Loading';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Slide from './Slide_Home';
function Home() {
  const [loading, setLoading] = useState(true);
  const { isAuthenticated, roles } = useAuth();
  const navigate = useNavigate();

  const isUser = roles.includes('patient');

  useEffect(() => {
    const timer = setTimeout(() => {
      setLoading(false);
    }, 1000);

    return () => clearTimeout(timer);
  }, []);

  // Handle Chat with AI click - Open chat with "Hello!"
  const handleChatClick = (e) => {
    e.preventDefault();

    // Dispatch custom event to open chat with pre-filled message
    window.dispatchEvent(new CustomEvent('openChatWithMessage', {
      detail: { message: 'Hello!' }
    }));
  };

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
      <div className="home-page">
        <div className="Background_Home">
          <div className="container">
            <div className="hero-subtitle">
              <b>
                WE ARE HERE FOR YOUR CARE
              </b>
            </div>
            <div className="hero-title">
              Better Care,<br />
              Better Doctors.
            </div>
            <div className="hero-description">
              HealthLink: secure teleconsultations, health record storage, AI-powered preliminary diagnosis — making healthcare faster, safer, and more accessible.
            </div>
            <div>
              <NavLink to="/about_us">
                <button className="btn-about-us"><b>MORE ABOUT US</b></button>
              </NavLink>
            </div>
          </div>
        </div>

        <div className='row services-row' style={{ "--bs-gutter-x": "0rem" }}>
          <div className='col-md-4 service-card service-card-blue'>
            <div className="service-icon">
              <svg width="64" height="64" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="32" cy="32" r="30" stroke="#ffffff" strokeWidth="2" opacity="0.15" />

                <g transform="translate(32,32)">
                  <path d="M0-18 L15.5-9 L15.5 9 L0 18 L-15.5 9 L-15.5-9 Z"
                    fill="none"
                    stroke="#ffffff"
                    strokeWidth="3" />

                  <circle cx="0" cy="0" r="8" fill="none" stroke="#ffffff" strokeWidth="2.5" />
                  <circle cx="0" cy="0" r="3" fill="#ffffff" />

                  <line x1="0" y1="-8" x2="0" y2="-15" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" />
                  <line x1="0" y1="8" x2="0" y2="15" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" />
                  <line x1="-7" y1="-4" x2="-13" y2="-7.5" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" />
                  <line x1="7" y1="-4" x2="13" y2="-7.5" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" />
                  <line x1="-7" y1="4" x2="-13" y2="7.5" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" />
                  <line x1="7" y1="4" x2="13" y2="7.5" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" />

                  <circle cx="0" cy="-15" r="2" fill="#ffffff" />
                  <circle cx="0" cy="15" r="2" fill="#ffffff" />
                  <circle cx="-13" cy="-7.5" r="1.5" fill="#ffffff" />
                  <circle cx="13" cy="-7.5" r="1.5" fill="#ffffff" />
                  <circle cx="-13" cy="7.5" r="1.5" fill="#ffffff" />
                  <circle cx="13" cy="7.5" r="1.5" fill="#ffffff" />
                </g>

                <text x="32" y="62" fontFamily="Arial, sans-serif" fontSize="12" fill="#ffffff" fontWeight="bold" textAnchor="middle">AI</text>
              </svg>
            </div>
            <div className="service-helper-text">
              <b>We are helpers</b>
            </div>
            <div className="service-title">
              <b>AI support</b>
            </div>
            <div className="service-description">
              With AI support to answer questions and find solutions to help patients.
            </div>
            <div>
              <button className="service-btn service-btn-chat" onClick={handleChatClick}>
                Chat with AI
              </button>
            </div>
          </div>
          <div className='col-md-4 service-card service-card-dark'>
            <div className="service-icon">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" className="svg-doctor">
                <path fill='white' d="M340.596 309.258H300.03v17.97h-17.969v40.565h17.969v17.97h40.566v-17.97h17.97v-40.566h-17.97zm4.97 30.97v14.565h-17.97v17.97H313.03v-17.97h-17.969v-14.566h17.969v-17.97h14.566v17.97z" /><path fill='white' d="m358.984 281.018-49.045-25.036a71.077 71.077 0 0 0 11.679-19.295h2.919a21.506 21.506 0 0 0 21.481-21.482v-15.062a21.512 21.512 0 0 0-19.205-21.362v-18.618a70.813 70.813 0 0 0-141.626 0v18.618a21.512 21.512 0 0 0-19.205 21.362v15.062a21.506 21.506 0 0 0 21.481 21.482h2.92a71.072 71.072 0 0 0 11.752 19.383l-49.118 24.948a72.247 72.247 0 0 0-39.588 64.637v76.995h285.142v-76.995a72.248 72.248 0 0 0-39.587-64.637zM198.187 160.163a57.813 57.813 0 0 1 115.626 0v18.403c-71.18-2.127-72.92-39.159-72.959-40.92a6.5 6.5 0 0 0-12.982-.422c-1.215 16.533-18.559 29.92-29.685 36.865zm-3.27 63.524h-7.453a8.491 8.491 0 0 1-8.482-8.482v-15.062a8.491 8.491 0 0 1 8.482-8.481h4.231a6.624 6.624 0 0 0 .68-.037c.045-.005.089-.015.133-.02.185-.024.368-.051.548-.09.053-.012.106-.028.16-.041.17-.041.338-.086.502-.14.06-.02.12-.045.18-.066.156-.057.309-.117.459-.184.026-.012.053-.02.08-.032 1.398-.653 27.258-12.938 39.797-33.396a51.604 51.604 0 0 0 6.047 8.138c15.544 17.165 42.47 25.868 80.033 25.868h4.223a8.491 8.491 0 0 1 8.482 8.481v15.062a8.491 8.491 0 0 1-8.482 8.482h-7.453a6.5 6.5 0 0 0-6.172 4.462 57.77 57.77 0 0 1-109.824 0 6.5 6.5 0 0 0-6.171-4.462zM385.571 409.65H126.429v-63.995a59.3 59.3 0 0 1 32.485-53.052l14.265-7.246v27.85a30.198 30.198 0 0 0-26.113 29.88v34.69h13v-34.69a17.178 17.178 0 0 1 17.158-17.158h4.91a17.178 17.178 0 0 1 17.159 17.158v34.69h13v-34.69a30.199 30.199 0 0 0-26.114-29.88v-34.453l25.834-13.12a70.734 70.734 0 0 0 88.076-.084l52.987 27.048a59.305 59.305 0 0 1 32.495 53.057z" />
              </svg>
            </div>
            <div className="service-helper-text">
              <b>We are helpers</b>
            </div>
            <div className="service-title">
              <b>Doctor's</b>
            </div>
            <div className="service-description">
              View information about our doctors and specialists
            </div>
            <div>
              <NavLink to="/doctors">
                <button className="service-btn service-btn-doctor">
                  View Doctor
                </button>
              </NavLink>
            </div>
          </div>
          <div className='col-md-4 service-card service-card-blue'>
            <div className="service-icon-large">
              <svg xmlns="http://www.w3.org/2000/svg"
                width="30"
                height="64"
                viewBox="0 0 87.22 139.998"
                preserveAspectRatio="xMidYMid meet"
                fill="none" stroke="#ffffffff" strokeLinecap="round" strokeLinejoin="round" strokeWidth="6">
                <g>
                  <path d="M66.948 18.436h3.4a15.033 15.033 0 0 1 14.867 15.2V122.8A15.033 15.033 0 0 1 70.352 138h-53.49A15.03 15.03 0 0 1 2 122.8V33.633a15.032 15.032 0 0 1 14.861-15.2h3.664" />
                  <path d="M58.794 13.582v8.295H28.425v-8.295H33.8a2.23 2.23 0 0 0 2.221-2.239 2.3 2.3 0 0 0-.021-.309 7.784 7.784 0 0 1-.084-1.172A7.693 7.693 0 0 1 51.3 9.5a7.659 7.659 0 0 1-.073 1.521 2.236 2.236 0 0 0 1.89 2.536 2.118 2.118 0 0 0 .308.023zM23.411 48.328H67.26M18.152 65.189H67.26M18.152 82.05H67.26M18.152 98.911H67.26M18.152 115.772H67.26" />
                </g>
              </svg>
            </div>
            <div className="service-helper-text">
              <b>We are helpers</b>
            </div>
            <div className="service-title">
              <b>Make An Appointment</b>
            </div>
            <div className="service-description">
              Create appointments that help patients work with highly qualified doctors and specialists
            </div>
            <div>
              <button className="service-btn service-btn-appointment" onClick={handleAppointmentClick}>
                Appointment
              </button>
            </div>
          </div>
        </div>

        <div className='row Background_Home2 welcome-section' style={{ "--bs-gutter-x": "0rem" }}>
          <div className='col-md-4'>
            <div className='welcome-title'>
              <b>Welcome To</b> <b className='welcome-highlight'>HealthLink</b>
            </div>
            <div className='welcome-description'>
              HealthLink aims to provide an efficient, secure, and accessible
              way for patients to receive medical consultations, store health records, and use AI for
              preliminary diagnosis.<br /> By reducing barriers to access and providing a more streamlined
              healthcare experience, this platform has the potential to revolutionize the way people engage
              with healthcare services.
            </div>
            <div className='signature'>
              Alexander
            </div>
          </div>

          <div className='col-md-4 welcome-image'>
          </div>

          <div className='col-md-4 open-hours-card'>
            <div className='open-hours-title'>
              <b>Open Hour</b>
            </div>
            <div className='open-hours-list'>
              <div className='row hours-row'>
                <div className='col-md-6'>
                  Monday
                </div>
                <div className='col-md-6'>
                  8:00 AM - 8:00 PM
                </div>
              </div>
              <div className='row hours-row'>
                <div className='col-md-6'>
                  Tuesday
                </div>
                <div className='col-md-6'>
                  8:00 AM - 8:00 PM
                </div>
              </div>
              <div className='row hours-row'>
                <div className='col-md-6'>
                  Wednesday
                </div>
                <div className='col-md-6'>
                  8:00 AM - 8:00 PM
                </div>
              </div>
              <div className='row hours-row'>
                <div className='col-md-6'>
                  Thursday
                </div>
                <div className='col-md-6'>
                  8:00 AM - 8:00 PM
                </div>
              </div>
              <div className='row hours-row'>
                <div className='col-md-6'>
                  Friday
                </div>
                <div className='col-md-6'>
                  8:00 AM - 8:00 PM
                </div>
              </div>
              <div className='row hours-row'>
                <div className='col-md-6'>
                  Saturday
                </div>
                <div className='col-md-6'>
                  8:00 AM - 8:00 PM
                </div>
              </div>
              <div className='row hours-row'>
                <div className='col-md-6'>
                  Sunday
                </div>
                <div className='col-md-6'>
                  8:00 AM - 8:00 PM
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className='row why-choose-section' style={{ "--bs-gutter-x": "0rem" }}>
          <div className='col-md-6'>
            <div className='section-subtitle'>
              WHY CHOOSE US
            </div>
            <div className='section-main-title'>
              <b>We Always Ready For serve</b> <b className='welcome-highlight'>Week Patients</b>
            </div>
            <div className='section-text'>
              HealthLink is a secure web-based platform that allows patients
              to book virtual consultations with doctors, maintain and access their health records, and
              receive basic AI-driven diagnostics. This solution aims to enhance access to healthcare,
              especially for those who are unable to visit a healthcare facility physically. By providing tools
              for managing health records digitally and utilizing AI for preliminary diagnoses, the platform
              will make healthcare more efficient, accessible, and patient-centric.
            </div>
            <div className='row stats-row'>
              <div className='col-md-4'>
                <b className='stat-number'>87</b> <br />
                <b>Total Doctor's</b>
              </div>
              <div className='col-md-4'>
                <b className='stat-number'>101</b> <br />
                <b>Total Awards</b>
              </div>
              <div className='col-md-4'>
                <b className='stat-number'>109</b> <br />
                <b>Clinical Services</b>
              </div>
            </div>
          </div>
          <div className='col-md-6 position-relative why-choose-image'>
            <div className='doctor-cta-card'>
              <div className='cta-title'>
                NEED A DOCTORS
              </div>
              <div className='cta-description'>
                Choose a professional that's right for you!
              </div>
              <div>
                <NavLink to="/doctors">
                  <button className='cta-button'>
                    VISIT DOCTORS
                  </button>
                </NavLink>
              </div>
            </div>
          </div>
        </div>

        <div className="Background_Home3">
          <div className='testimonials-section'>
            <div className='testimonials-subtitle'>
              OUR TESTIMONIALS OUR
            </div>
            <div className='testimonials-title'>
              What Our Patients Say About Our Medical Treatments
            </div>
            <div className='testimonials-divider'>
              _____<svg data-name="Layer 1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128"><path d="M110.242 30.143a1.747 1.747 0 0 0-1.232-1.487 403.97 403.97 0 0 1-44.289-16.1 1.744 1.744 0 0 0-1.442 0 403.97 403.97 0 0 1-44.289 16.1 1.747 1.747 0 0 0-1.232 1.487 113.457 113.457 0 0 0 2.912 35.942c6.257 25.127 21.05 42.22 42.779 49.43a1.75 1.75 0 0 0 1.1 0c21.729-7.21 36.522-24.3 42.779-49.43a113.457 113.457 0 0 0 2.914-35.942zm-6.309 35.1C97.949 89.271 84.515 105 64 112.007c-20.487-7-33.912-22.694-39.909-46.672a113.508 113.508 0 0 1-2.949-33.676A415.982 415.982 0 0 0 64 16.06a416.235 416.235 0 0 0 42.858 15.6 113.251 113.251 0 0 1-2.925 33.579z" /><path d="M101.339 34.655c-17.382-5.5-30.426-10.754-36.655-13.4a1.755 1.755 0 0 0-1.368 0c-6.229 2.643-19.273 7.9-36.655 13.4a1.751 1.751 0 0 0-1.222 1.632 107.982 107.982 0 0 0 3.1 28.293c5.43 21.36 17.149 35.63 34.832 42.414a1.753 1.753 0 0 0 1.254 0C82.31 100.21 94.029 85.94 99.459 64.58a107.99 107.99 0 0 0 3.1-28.293 1.751 1.751 0 0 0-1.22-1.632zm-5.273 29.063C91 83.656 80.211 97.031 64 103.481c-16.211-6.45-27-19.825-32.066-39.763A105.715 105.715 0 0 1 28.92 37.61C45.235 32.4 57.629 27.453 64 24.769c6.371 2.684 18.765 7.631 35.08 12.841a105.725 105.725 0 0 1-3.014 26.108z" /><path d="M84 53.25H71.75V41A1.751 1.751 0 0 0 70 39.25H58A1.751 1.751 0 0 0 56.25 41v12.25H44A1.751 1.751 0 0 0 42.25 55v12A1.751 1.751 0 0 0 44 68.75h12.25V81A1.751 1.751 0 0 0 58 82.75h12A1.751 1.751 0 0 0 71.75 81V68.75H84A1.751 1.751 0 0 0 85.75 67V55A1.751 1.751 0 0 0 84 53.25zm-1.75 12H70A1.751 1.751 0 0 0 68.25 67v12.25h-8.5V67A1.751 1.751 0 0 0 58 65.25H45.75v-8.5H58A1.751 1.751 0 0 0 59.75 55V42.75h8.5V55A1.751 1.751 0 0 0 70 56.75h12.25z" /></svg>_____
            </div>
            <div>
              Online medical examination portal: remote consultation, record keeping, AI preliminary diagnosis, convenience and modernization of health care.
            </div>
            <div>
              <Slide />
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

export default Home;