import React, { useEffect, useState } from 'react';
import DoctorWalletTab from '../profile/DoctorWalletTab';

export default function DoctorProfileView({ doctorData, activeTab = 'personal', onTabChange }) {
  const [localActiveTab, setLocalActiveTab] = useState(activeTab);

  useEffect(() => {
    setLocalActiveTab(activeTab);
  }, [activeTab]);

  const currentTab = activeTab || localActiveTab;

  const selectTab = (tab) => {
    setLocalActiveTab(tab);
    onTabChange?.(tab);
  };

  return (
    <>
      {/* Tabs */}
      <ul className="nav nav-tabs px-4 border-bottom-0">
        <li className="nav-item">
          <button
            className={`nav-link ${currentTab === 'personal' ? 'active' : ''}`}
            onClick={() => selectTab('personal')}
            type="button"
          >
            Personal Information
          </button>
        </li>
        <li className="nav-item">
          <button
            className={`nav-link ${currentTab === 'wallet' ? 'active' : ''}`}
            onClick={() => selectTab('wallet')}
            type="button"
          >
            Wallet
          </button>
        </li>
      </ul>

      {/* Content */}
      {currentTab === 'wallet' ? (
        <div className="p-4">
          <DoctorWalletTab profile={doctorData} />
        </div>
      ) : (
      <div>
        {/* Description List (Doctor Info) */}
        <div className="p-4 row g-0">
          
          {/* Full Name */}
          <div className="col-12 col-md-6 detail-item">
            <p className="detail-label mb-1">Full Name</p>
            <p className="detail-value mb-0">{doctorData?.fullName || 'N/A'}</p>
          </div>
          
          {/* Email */}
          <div className="col-12 col-md-6 detail-item">
            <p className="detail-label mb-1">Email</p>
            <p className="detail-value mb-0">{doctorData?.email || 'N/A'}</p>
          </div>
          
          {/* Phone Number */}
          <div className="col-12 col-md-6 detail-item">
            <p className="detail-label mb-1">Phone Number</p>
            <p className="detail-value mb-0">{doctorData?.phoneNumber || 'N/A'}</p>
          </div>
          
          {/* Specialty */}
          <div className="col-12 col-md-6 detail-item">
            <p className="detail-label mb-1">Specialty</p>
            <p className="detail-value mb-0">{doctorData?.specialty || 'N/A'}</p>
          </div>
          
          {/* Qualifications */}
          <div className="col-12 col-md-6 detail-item">
            <p className="detail-label mb-1">Qualifications</p>
            <p className="detail-value mb-0">{doctorData?.qualifications || 'N/A'}</p>
          </div>
          
          {/* Years of Experience */}
          <div className="col-12 col-md-6 detail-item">
            <p className="detail-label mb-1">Experience</p>
            <p className="detail-value mb-0">{doctorData?.yearsOfExperience ? `${doctorData.yearsOfExperience} years` : 'N/A'}</p>
          </div>
          
          {/* Language Spoken */}
          <div className="col-12 col-md-6 detail-item">
            <p className="detail-label mb-1">Language</p>
            <p className="detail-value mb-0">{doctorData?.languageSpoken || 'N/A'}</p>
          </div>
          
          {/* Location */}
          <div className="col-12 col-md-6 detail-item">
            <p className="detail-label mb-1">Location</p>
            <p className="detail-value mb-0">{doctorData?.location || 'N/A'}</p>
          </div>
          
          {/* Average Rating */}
          <div className="col-12 col-md-6 detail-item">
            <p className="detail-label mb-1">Average Rating</p>
            <p className="detail-value mb-0">
              {doctorData?.averageRating ? `${doctorData.averageRating.toFixed(1)} ⭐` : 'No reviews yet'}
            </p>
          </div>
          
          {/* Total Reviews */}
          <div className="col-12 col-md-6 detail-item border-bottom border-bottom-md-0">
            <p className="detail-label mb-1">Total Reviews</p>
            <p className="detail-value mb-0">{doctorData?.totalReviews || 0}</p>
          </div>
        </div>
      </div>
      )}
    </>
  );
}
