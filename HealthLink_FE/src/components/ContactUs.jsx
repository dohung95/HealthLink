import './Css/ContactUs.css';
import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import Loading from './Loading';
import axios from 'axios';
function ContactUs() {
  const { isAuthenticated, user, roles } = useAuth();
  const [loading, setLoading] = useState(true);

  // Check if user is Admin or Doctor
  const isAdminOrDoctor = roles.some(role =>
    ['admin', 'doctor'].includes(role.toLowerCase())
  );
  const [submitting, setSubmitting] = useState(false);
  const [submitMessage, setSubmitMessage] = useState('');
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    subject: '',
    message: ''
  });
  const [userProfile, setUserProfile] = useState(null);

  // Fetch user profile data
  const fetchUserProfile = async () => {
    try {
      const response = await axios.get('https://localhost:7267/api/account/profile');
      setUserProfile(response.data);
    } catch (error) {
      console.error('Error fetching user profile:', error);
    }
  };

  useEffect(() => {
    // Giả lập thời gian load trang (có thể thay bằng logic load data thực tế)
    const timer = setTimeout(() => {
      setLoading(false);
    }, 1000); // 1.5 giây

    return () => clearTimeout(timer);
  }, []);

  // No longer blocking access - allow viewing the page without login

  // Fetch user profile only when authenticated
  useEffect(() => {
    if (isAuthenticated) {
      fetchUserProfile();
    } else {
      // Clear user profile when not authenticated
      setUserProfile(null);
    }
  }, [isAuthenticated]);

  // Populate form data when user profile is loaded (only for Patient role)
  useEffect(() => {
    if (userProfile && !isAdminOrDoctor) {
      setFormData(prev => ({
        ...prev,
        name: userProfile.fullName || '',
        email: userProfile.email || '',
        phone: userProfile.phoneNumber || ''
      }));
    }
  }, [userProfile, isAdminOrDoctor]);

  // Check authentication when user tries to interact with form
  const handleInputFocus = (e) => {
    if (!isAuthenticated) {
      e.target.blur(); // Remove focus from input
      setShowLoginModal(true);
    }
  };

  // Check authentication before submitting
  const checkAuthAndRedirect = () => {
    if (!isAuthenticated) {
      setShowLoginModal(true);
      return false;
    }
    return true;
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();

    // Check authentication before submitting
    if (!checkAuthAndRedirect()) {
      return;
    }

    // Block Admin and Doctor from submitting
    if (isAdminOrDoctor) {
      setSubmitMessage('Admin and Doctor accounts cannot submit contact forms. Please use internal communication channels.');
      return;
    }

    // Validate form data
    if (!formData.name || !formData.email || !formData.phone || !formData.subject || !formData.message) {
      setSubmitMessage('Please fill in all information!');
      return;
    }

    // Validate lengths
    if (formData.name.length < 2) {
      setSubmitMessage('Name must be at least 2 characters!');
      return;
    }
    if (formData.phone.length < 8) {
      setSubmitMessage('Phone number must be at least 8 characters!');
      return;
    }
    if (formData.subject.length < 3) {
      setSubmitMessage('Subject must be at least 3 characters!');
      return;
    }
    if (formData.message.length < 5) {
      setSubmitMessage('Message content must be at least 5 characters!');
      return;
    }

    setSubmitting(true);
    setSubmitMessage('');

    try {
      const response = await axios.post('https://localhost:7267/api/contact', formData, {
        headers: {
          'Content-Type': 'application/json'
        }
      });

      setSubmitMessage('Thank you for contacting us! We will respond as soon as possible.');
      // Reset form after successful submission
      setFormData({
        name: userProfile?.fullName || '',
        email: userProfile?.email || '',
        phone: userProfile?.phoneNumber || '',
        subject: '',
        message: ''
      });

    } catch (error) {
      console.error('Error submitting contact form:', error);
      if (error.response?.data?.message) {
        setSubmitMessage(error.response.data.message);
      } else {
        setSubmitMessage('An error occurred while sending the message. Please try again later.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <Loading />;
  }
  return (
    <>
      <div className='contactus-page'>
        <div className='Background_ContactUs'>
          <div className='contactus-header'>
            <div style={{ fontSize: "3vw", padding: "0 18vw", color: "#008f7d", textShadow: "0px 0px 8px #ffffff" }} >
              Do not hesitate to contact us!
            </div>
            <div style={{ fontSize: "1.5vw", padding: "2vw 18vw" }} >
              <b>HealthLink is an organization that provides professional health and medical care services.</b>
            </div>
          </div>
        </div>

        <div>
          <div className='contactus-form-container'>
            {/* Show notification for Admin/Doctor users */}
            {isAuthenticated && isAdminOrDoctor && (
              <div style={{
                marginBottom: '20px',
                padding: '15px 20px',
                borderRadius: '8px',
                backgroundColor: '#fff3cd',
                border: '1px solid #ffc107',
                color: '#856404',
                display: 'flex',
                alignItems: 'center',
                gap: '10px'
              }}>
                <i className='fas fa-info-circle' style={{ fontSize: '20px' }}></i>
                <div>
                  <strong>Contact Form Unavailable</strong>
                  <p style={{ margin: '5px 0 0 0', fontSize: '14px' }}>
                    Admin and Doctor accounts cannot submit contact forms. Please use internal communication channels.
                  </p>
                </div>
              </div>
            )}

            <form onSubmit={handleSubmit}>
              <div className='row contactus-form-row'>
                <div className='col-md-6'>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    placeholder="Name"
                    className='contactus-input'
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    onFocus={handleInputFocus}
                    readOnly={!!userProfile}
                  />
                </div>
                <div className='col-md-6'>
                  <input
                    type="text"
                    id="email"
                    name="email"
                    placeholder="Email"
                    className='contactus-input'
                    value={formData.email}
                    onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                    onFocus={handleInputFocus}
                    readOnly={!!userProfile}
                  />
                </div>
              </div>

              <div className='contactus-form-row'>
                <input
                  type="text"
                  id='phone'
                  name='phone'
                  placeholder='Phone Number'
                  className='contactus-input'
                  value={formData.phone}
                  onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                  onFocus={handleInputFocus}
                  readOnly={!!userProfile}
                />
              </div>

              <div className='contactus-form-row'>
                <input
                  type="text"
                  id='subject'
                  name='subject'
                  placeholder='Subject'
                  className='contactus-input'
                  value={formData.subject}
                  onChange={(e) => setFormData(prev => ({ ...prev, subject: e.target.value }))}
                  onFocus={handleInputFocus}
                />
              </div>

              <div>
                <textarea
                  id="message"
                  name="message"
                  placeholder="Leave Your Message Here....."
                  className='contactus-textarea'
                  value={formData.message}
                  onChange={(e) => setFormData(prev => ({ ...prev, message: e.target.value }))}
                  onFocus={handleInputFocus}
                ></textarea>
              </div>

              <div>
                <button
                  type='submit'
                  className='contactus-submit-btn'
                  disabled={submitting || isAdminOrDoctor}
                  style={{
                    opacity: isAdminOrDoctor ? 0.5 : 1,
                    cursor: isAdminOrDoctor ? 'not-allowed' : 'pointer'
                  }}
                >
                  <b>{isAdminOrDoctor ? 'Contact Form Not Available' : submitting ? 'Sending...' : 'Send Message'}</b>
                </button>
              </div>

              {submitMessage && (
                <div style={{
                  marginTop: '20px',
                  padding: '10px',
                  borderRadius: '5px',
                  backgroundColor: submitMessage.includes('Thank you') ? '#e6f4f9' : '#f8d7da',
                  border: `1px solid ${submitMessage.includes('Thank you') ? '#008f7d' : '#f5c6cb'}`,
                  color: submitMessage.includes('Thank you') ? '#008f7d' : '#721c24'
                }}>
                  {submitMessage}
                </div>
              )}
            </form>
          </div>
        </div>

        <div className='contactus-info'>
          <div className='contactus-info-container'>
            <div className='row'>
              <div className='col-md-6'>
                <div className='contactus-info-section'>
                  <h3>Contact Information</h3>
                  <div className='contactus-info-item'>
                    <i className='fas fa-map-marker-alt'></i>
                    <div>
                      <h4>Address</h4>
                      <p>21 bis Hau Giang, Tan Son Nhat Ward, Ho Chi Minh City.</p>
                    </div>
                  </div>
                  <div className='contactus-info-item'>
                    <i className='fas fa-envelope'></i>
                    <div>
                      <h4>Email</h4>
                      <p>HealthLink@gmail.com</p>
                      <p>support@healthlink.com</p>
                    </div>
                  </div>
                  <div className='contactus-info-item'>
                    <i className='fas fa-phone'></i>
                    <div>
                      <h4>Phone</h4>
                      <p>+84 (028) 1234 5678</p>
                      <p>+84 (028) 8765 4321</p>
                    </div>
                  </div>
                  <div className='contactus-social-links'>
                    <h4>Follow Us</h4>
                    <div className='contactus-social-icons'>
                      <a href='#' className='contactus-social-icon contactus-social-icon--facebook' aria-label="Facebook">
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="white" viewBox="0 0 16 16">
                          <path d="M16 8.049c0-4.446-3.582-8.05-8-8.05C3.58 0-.002 3.603-.002 8.05c0 4.017 2.926 7.347 6.75 7.951v-5.625h-2.03V8.05H6.75V6.275c0-2.017 1.195-3.131 3.022-3.131.876 0 1.791.157 1.791.157v1.98h-1.009c-.993 0-1.303.621-1.303 1.258v1.51h2.218l-.354 2.326H9.25V16c3.824-.604 6.75-3.934 6.75-7.951" />
                        </svg>
                      </a>
                      <a href='#' className='contactus-social-icon contactus-social-icon--youtube' aria-label="YouTube">
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="white" viewBox="0 0 16 16">
                          <path d="M8.051 1.999h.089c.822.003 4.987.033 6.11.335a2.01 2.01 0 0 1 1.415 1.42c.101.38.172.883.22 1.402l.01.104.022.26.008.104c.065.914.073 1.77.074 1.957v.075c-.001.194-.01 1.108-.082 2.06l-.008.105-.009.104c-.05.572-.124 1.14-.235 1.558a2.01 2.01 0 0 1-1.415 1.42c-1.16.312-5.569.334-6.18.335h-.142c-.309 0-1.587-.006-2.927-.052l-.17-.006-.087-.004-.171-.007-.171-.007c-1.11-.049-2.167-.128-2.654-.26a2.01 2.01 0 0 1-1.415-1.419c-.111-.417-.185-.986-.235-1.558L.09 9.82l-.008-.104A31 31 0 0 1 0 7.68v-.123c.002-.215.01-.958.064-1.778l.007-.103.003-.052.008-.104.022-.26.01-.104c.048-.519.119-1.023.22-1.402a2.01 2.01 0 0 1 1.415-1.42c.487-.13 1.544-.21 2.654-.26l.17-.007.172-.006.086-.003.171-.007A100 100 0 0 1 7.858 2zM6.4 5.209v4.818l4.157-2.408z" />
                        </svg>
                      </a>
                      <a href='#' className='contactus-social-icon contactus-social-icon--twitter' aria-label="Twitter">
                        <svg xmlns="http://www.w3.org/2000/svg" width="26" height="26" viewBox="0 0 24 24" fill="white">
                          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                        </svg>
                      </a>
                      <a href='#' className='contactus-social-icon contactus-social-icon--instagram' aria-label="Instagram">
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="white" viewBox="0 0 16 16">
                          <path d="M8 0C5.829 0 5.556.01 4.703.048 3.85.088 3.269.222 2.76.42a3.9 3.9 0 0 0-1.417.923A3.9 3.9 0 0 0 .42 2.76C.222 3.268.087 3.85.048 4.7.01 5.555 0 5.827 0 8.001c0 2.172.01 2.444.048 3.297.04.852.174 1.433.372 1.942.205.526.478.972.923 1.417.444.445.89.719 1.416.923.51.198 1.09.333 1.942.372C5.555 15.99 5.827 16 8 16s2.444-.01 3.298-.048c.851-.04 1.434-.174 1.943-.372a3.9 3.9 0 0 0 1.416-.923c.445-.445.718-.891.923-1.417.197-.509.332-1.09.372-1.942C15.99 10.445 16 10.173 16 8s-.01-2.445-.048-3.299c-.04-.851-.175-1.433-.372-1.941a3.9 3.9 0 0 0-.923-1.417A3.9 3.9 0 0 0 13.24.42c-.51-.198-1.092-.333-1.943-.372C10.443.01 10.172 0 7.998 0zm-.717 1.442h.718c2.136 0 2.389.007 3.232.046.78.035 1.204.166 1.486.275.373.145.64.319.92.599s.453.546.598.92c.11.281.24.705.275 1.485.039.843.047 1.096.047 3.231s-.008 2.389-.047 3.232c-.035.78-.166 1.203-.275 1.485a2.5 2.5 0 0 1-.599.919c-.28.28-.546.453-.92.598-.28.11-.704.24-1.485.276-.843.038-1.096.047-3.232.047s-2.39-.009-3.233-.047c-.78-.036-1.203-.166-1.485-.276a2.5 2.5 0 0 1-.92-.598 2.5 2.5 0 0 1-.6-.92c-.109-.281-.24-.705-.275-1.485-.038-.843-.046-1.096-.046-3.233s.008-2.388.046-3.231c.036-.78.166-1.204.276-1.486.145-.373.319-.64.599-.92s.546-.453.92-.598c.282-.11.705-.24 1.485-.276.738-.034 1.024-.044 2.515-.045zm4.988 1.328a.96.96 0 1 0 0 1.92.96.96 0 0 0 0-1.92m-4.27 1.122a4.109 4.109 0 1 0 0 8.217 4.109 4.109 0 0 0 0-8.217m0 1.441a2.667 2.667 0 1 1 0 5.334 2.667 2.667 0 0 1 0-5.334" />
                        </svg>
                      </a>
                    </div>
                  </div>
                </div>
              </div>
              <div className='col-md-6'>
                <div className='contactus-map'>
                  <iframe
                    src="https://www.google.com/maps/embed?pb=!1m16!1m12!1m3!1d244.94038658036447!2d106.6632873727279!3d10.80777471144267!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!2m1!1s21%20bis%20Hau%20Giang%2C%20Tan%20Son%20Nhat%20Ward%2C%20Ho%20Chi%20Minh%20City.!5e0!3m2!1sen!2s!4v1764217724233!5m2!1sen!2s"
                    width="100%"
                    height="450"
                    style={{ border: 0 }}
                    allowFullScreen=""
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                    title="Office Location"
                  />

                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Login Required Modal - Lightweight */}
      {showLoginModal && (
        <div
          onClick={() => setShowLoginModal(false)}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.3)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            animation: 'fadeIn 0.2s ease-in-out'
          }}>
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              backgroundColor: 'white',
              borderRadius: '12px',
              padding: '28px',
              maxWidth: '380px',
              width: '90%',
              boxShadow: '0 4px 20px rgba(0, 143, 125, 0.12)',
              animation: 'slideUp 0.25s ease-out'
            }}>
            {/* Icon - Smaller and lighter */}
            <div style={{
              textAlign: 'center',
              marginBottom: '16px'
            }}>
            <img src="/logo_footer.png" alt="Logo" style={{width:"15vw"}}/>
            </div>

            {/* Title - Softer */}
            <h4 style={{
              textAlign: 'center',
              color: '#008f7d',
              marginBottom: '10px',
              fontSize: '20px',
              fontWeight: '600'
            }}>
              Please Login First
            </h4>

            {/* Message - Lighter and shorter */}
            <p style={{
              textAlign: 'center',
              color: '#666',
              marginBottom: '24px',
              fontSize: '14px',
              lineHeight: '1.5'
            }}>
              You need to login to contact us
            </p>

            {/* Buttons - Simplified */}
            <div style={{
              display: 'flex',
              gap: '10px'
            }}>
              <button
                onClick={() => setShowLoginModal(false)}
                style={{
                  flex: 1,
                  padding: '10px 20px',
                  backgroundColor: '#f5f5f5',
                  color: '#666',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontWeight: '500',
                  cursor: 'pointer',
                  transition: 'background-color 0.2s'
                }}
                onMouseOver={(e) => e.target.style.backgroundColor = '#e5e5e5'}
                onMouseOut={(e) => e.target.style.backgroundColor = '#f5f5f5'}
              >
                Cancel
              </button>
              <button
                onClick={() => window.location.href = '/login'}
                style={{
                  flex: 1,
                  padding: '10px 20px',
                  backgroundColor: '#008f7d',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontWeight: '500',
                  cursor: 'pointer',
                  transition: 'background-color 0.2s'
                }}
                onMouseOver={(e) => e.target.style.backgroundColor = '#005075'}
                onMouseOut={(e) => e.target.style.backgroundColor = '#008f7d'}
              >
                Login
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(20px) scale(0.95);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
      `}</style>
    </>
  );
}

export default ContactUs;