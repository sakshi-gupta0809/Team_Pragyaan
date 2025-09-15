import React, { useState, useEffect } from 'react';
import { User, Mail, Phone, Building, Briefcase, Globe, Calendar, Edit3, Save, X, Camera } from 'lucide-react';

const Profile = () => {
  const [profile, setProfile] = useState({
    id: 1,
    name: 'John Doe',
    email: 'john.doe@example.com',
    first_name: 'John',
    last_name: 'Doe',
    phone: '+1 (555) 123-4567',
    company: 'Tech Corp',
    job_title: 'Software Engineer',
    bio: 'Passionate about building scalable applications and solving complex problems.',
    avatar_url: null,
    timezone: 'UTC',
    language: 'en',
    created_at: '2024-01-15T10:30:00Z',
    updated_at: '2024-01-15T10:30:00Z'
  });

  const [stats, setStats] = useState({
    campaigns_count: 0,
    contacts_count: 0,
    events_count: 0,
    email_logs_count: 0,
    member_since: '2024-01-15T10:30:00Z'
  });

  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [validationErrors, setValidationErrors] = useState({});

  // Country codes for phone numbers
  const countryCodes = [
    { code: '+1', country: 'US/Canada', flag: '🇺🇸' },
    { code: '+44', country: 'UK', flag: '🇬🇧' },
    { code: '+91', country: 'India', flag: '🇮🇳' },
    { code: '+86', country: 'China', flag: '🇨🇳' },
    { code: '+81', country: 'Japan', flag: '🇯🇵' },
    { code: '+49', country: 'Germany', flag: '🇩🇪' },
    { code: '+33', country: 'France', flag: '🇫🇷' },
    { code: '+61', country: 'Australia', flag: '🇦🇺' },
    { code: '+55', country: 'Brazil', flag: '🇧🇷' },
    { code: '+7', country: 'Russia', flag: '🇷🇺' },
    { code: '+39', country: 'Italy', flag: '🇮🇹' },
    { code: '+34', country: 'Spain', flag: '🇪🇸' },
    { code: '+31', country: 'Netherlands', flag: '🇳🇱' },
    { code: '+46', country: 'Sweden', flag: '🇸🇪' },
    { code: '+47', country: 'Norway', flag: '🇳🇴' },
    { code: '+45', country: 'Denmark', flag: '🇩🇰' },
    { code: '+41', country: 'Switzerland', flag: '🇨🇭' },
    { code: '+43', country: 'Austria', flag: '🇦🇹' },
    { code: '+32', country: 'Belgium', flag: '🇧🇪' },
    { code: '+351', country: 'Portugal', flag: '🇵🇹' }
  ];

  // Timezone options
  const timezones = [
    { value: 'UTC', label: 'UTC (Coordinated Universal Time)' },
    { value: 'America/New_York', label: 'EST (Eastern Time)' },
    { value: 'America/Chicago', label: 'CST (Central Time)' },
    { value: 'America/Denver', label: 'MST (Mountain Time)' },
    { value: 'America/Los_Angeles', label: 'PST (Pacific Time)' },
    { value: 'Europe/London', label: 'GMT (London)' },
    { value: 'Europe/Paris', label: 'CET (Central European Time)' },
    { value: 'Europe/Berlin', label: 'CET (Berlin)' },
    { value: 'Europe/Rome', label: 'CET (Rome)' },
    { value: 'Europe/Madrid', label: 'CET (Madrid)' },
    { value: 'Europe/Amsterdam', label: 'CET (Amsterdam)' },
    { value: 'Europe/Stockholm', label: 'CET (Stockholm)' },
    { value: 'Europe/Oslo', label: 'CET (Oslo)' },
    { value: 'Europe/Copenhagen', label: 'CET (Copenhagen)' },
    { value: 'Europe/Zurich', label: 'CET (Zurich)' },
    { value: 'Europe/Vienna', label: 'CET (Vienna)' },
    { value: 'Europe/Brussels', label: 'CET (Brussels)' },
    { value: 'Europe/Lisbon', label: 'WET (Lisbon)' },
    { value: 'Asia/Tokyo', label: 'JST (Tokyo)' },
    { value: 'Asia/Shanghai', label: 'CST (Shanghai)' },
    { value: 'Asia/Kolkata', label: 'IST (India)' },
    { value: 'Asia/Dubai', label: 'GST (Dubai)' },
    { value: 'Asia/Singapore', label: 'SGT (Singapore)' },
    { value: 'Asia/Hong_Kong', label: 'HKT (Hong Kong)' },
    { value: 'Asia/Seoul', label: 'KST (Seoul)' },
    { value: 'Asia/Bangkok', label: 'ICT (Bangkok)' },
    { value: 'Asia/Jakarta', label: 'WIB (Jakarta)' },
    { value: 'Asia/Manila', label: 'PHT (Manila)' },
    { value: 'Australia/Sydney', label: 'AEST (Sydney)' },
    { value: 'Australia/Melbourne', label: 'AEST (Melbourne)' },
    { value: 'Australia/Perth', label: 'AWST (Perth)' },
    { value: 'Pacific/Auckland', label: 'NZST (Auckland)' },
    { value: 'America/Sao_Paulo', label: 'BRT (São Paulo)' },
    { value: 'America/Mexico_City', label: 'CST (Mexico City)' },
    { value: 'America/Argentina/Buenos_Aires', label: 'ART (Buenos Aires)' },
    { value: 'Africa/Cairo', label: 'EET (Cairo)' },
    { value: 'Africa/Johannesburg', label: 'SAST (Johannesburg)' },
    { value: 'Africa/Lagos', label: 'WAT (Lagos)' }
  ];

  // Language options
  const languages = [
    { value: 'en', label: 'English', flag: '🇺🇸' },
    { value: 'es', label: 'Español', flag: '🇪🇸' },
    { value: 'fr', label: 'Français', flag: '🇫🇷' },
    { value: 'de', label: 'Deutsch', flag: '🇩🇪' },
    { value: 'it', label: 'Italiano', flag: '🇮🇹' },
    { value: 'pt', label: 'Português', flag: '🇵🇹' },
    { value: 'ru', label: 'Русский', flag: '🇷🇺' },
    { value: 'ja', label: '日本語', flag: '🇯🇵' },
    { value: 'ko', label: '한국어', flag: '🇰🇷' },
    { value: 'zh', label: '中文', flag: '🇨🇳' },
    { value: 'hi', label: 'हिन्दी', flag: '🇮🇳' },
    { value: 'ar', label: 'العربية', flag: '🇸🇦' },
    { value: 'th', label: 'ไทย', flag: '🇹🇭' },
    { value: 'vi', label: 'Tiếng Việt', flag: '🇻🇳' },
    { value: 'id', label: 'Bahasa Indonesia', flag: '🇮🇩' },
    { value: 'ms', label: 'Bahasa Melayu', flag: '🇲🇾' },
    { value: 'tl', label: 'Filipino', flag: '🇵🇭' },
    { value: 'nl', label: 'Nederlands', flag: '🇳🇱' },
    { value: 'sv', label: 'Svenska', flag: '🇸🇪' },
    { value: 'no', label: 'Norsk', flag: '🇳🇴' },
    { value: 'da', label: 'Dansk', flag: '🇩🇰' },
    { value: 'fi', label: 'Suomi', flag: '🇫🇮' },
    { value: 'pl', label: 'Polski', flag: '🇵🇱' },
    { value: 'cs', label: 'Čeština', flag: '🇨🇿' },
    { value: 'hu', label: 'Magyar', flag: '🇭🇺' },
    { value: 'ro', label: 'Română', flag: '🇷🇴' },
    { value: 'bg', label: 'Български', flag: '🇧🇬' },
    { value: 'hr', label: 'Hrvatski', flag: '🇭🇷' },
    { value: 'sk', label: 'Slovenčina', flag: '🇸🇰' },
    { value: 'sl', label: 'Slovenščina', flag: '🇸🇮' },
    { value: 'et', label: 'Eesti', flag: '🇪🇪' },
    { value: 'lv', label: 'Latviešu', flag: '🇱🇻' },
    { value: 'lt', label: 'Lietuvių', flag: '🇱🇹' },
    { value: 'el', label: 'Ελληνικά', flag: '🇬🇷' },
    { value: 'tr', label: 'Türkçe', flag: '🇹🇷' },
    { value: 'he', label: 'עברית', flag: '🇮🇱' },
    { value: 'fa', label: 'فارسی', flag: '🇮🇷' },
    { value: 'ur', label: 'اردو', flag: '🇵🇰' },
    { value: 'bn', label: 'বাংলা', flag: '🇧🇩' },
    { value: 'ta', label: 'தமிழ்', flag: '🇮🇳' },
    { value: 'te', label: 'తెలుగు', flag: '🇮🇳' },
    { value: 'ml', label: 'മലയാളം', flag: '🇮🇳' },
    { value: 'kn', label: 'ಕನ್ನಡ', flag: '🇮🇳' },
    { value: 'gu', label: 'ગુજરાતી', flag: '🇮🇳' },
    { value: 'pa', label: 'ਪੰਜਾਬੀ', flag: '🇮🇳' },
    { value: 'mr', label: 'मराठी', flag: '🇮🇳' }
  ];

  // Form state for editing
  const [editForm, setEditForm] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    phone_country_code: '+1',
    company: '',
    job_title: '',
    bio: '',
    timezone: 'UTC',
    language: 'en'
  });

  useEffect(() => {
    // Test API connectivity first
    testAPI();
    fetchProfile();
    fetchStats();
  }, []);

  const testAPI = async () => {
    try {
      const response = await fetch('/api/profile/test');
      const data = await response.json();
      console.log('API test result:', data);
    } catch (error) {
      console.error('API test failed:', error);
    }
  };

  const fetchProfile = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/profile', {
        headers: {
          'Accept': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token') || 'demo-token'}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setProfile(data);
        setEditForm({
          first_name: data.first_name || '',
          last_name: data.last_name || '',
          email: data.email || '',
          phone: data.phone || '',
          company: data.company || '',
          job_title: data.job_title || '',
          bio: data.bio || '',
          timezone: data.timezone || 'UTC',
          language: data.language || 'en'
        });
      } else {
        // For demo purposes, use mock data
        console.log('Using mock profile data');
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
      // For demo purposes, use mock data
    } finally {
      setIsLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await fetch('/api/profile/stats', {
        headers: {
          'Accept': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token') || 'demo-token'}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setStats(data);
      } else {
        // For demo purposes, use mock data
        console.log('Using mock stats data');
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
      // For demo purposes, use mock data
    }
  };

  const handleEdit = () => {
    setIsEditing(true);
    setError(null);
    setSuccess(false);
  };

  const handleCancel = () => {
    setIsEditing(false);
    setEditForm({
      first_name: profile.first_name || '',
      last_name: profile.last_name || '',
      email: profile.email || '',
      phone: profile.phone || '',
      phone_country_code: profile.phone_country_code || '+1',
      company: profile.company || '',
      job_title: profile.job_title || '',
      bio: profile.bio || '',
      timezone: profile.timezone || 'UTC',
      language: profile.language || 'en'
    });
    setAvatarFile(null);
    setAvatarPreview(null);
    setError(null);
    setSuccess(false);
    setValidationErrors({});
  };

  const handleSave = async () => {
    try {
      setIsLoading(true);
      setError(null);
      setValidationErrors({});
      
      // Validate form before submitting
      if (!validateForm()) {
        setIsLoading(false);
        return;
      }
      
      let updateData = { ...editForm };
      
      // Handle avatar upload if a new file is selected
      if (avatarFile) {
        try {
          const avatarUrl = await uploadAvatar(avatarFile);
          updateData.avatar_url = avatarUrl;
        } catch (uploadError) {
          setError('Failed to upload avatar image');
          setIsLoading(false);
          return;
        }
      }
      
      console.log('Sending profile update:', updateData);
      
      const response = await fetch('/api/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token') || 'demo-token'}`
        },
        body: JSON.stringify(updateData)
      });

      console.log('Response status:', response.status);
      console.log('Response headers:', response.headers);

      if (response.ok) {
        const updatedProfile = await response.json();
        console.log('Updated profile:', updatedProfile);
        setProfile(updatedProfile);
        setAvatarFile(null);
        setAvatarPreview(null);
        setIsEditing(false);
        setSuccess(true);
        setTimeout(() => setSuccess(false), 3000);
      } else {
        const errorText = await response.text();
        console.error('Error response:', errorText);
        try {
          const errorData = JSON.parse(errorText);
          setError(errorData.detail || 'Failed to update profile');
        } catch (parseError) {
          setError(`Server error: ${response.status} - ${errorText}`);
        }
      }
    } catch (error) {
      console.error('Error updating profile:', error);
      setError(`Network error: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Validation functions
  const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validatePhone = (phone) => {
    // Remove all non-digit characters
    const digitsOnly = phone.replace(/\D/g, '');
    // Check if it's exactly 10 digits
    return digitsOnly.length === 10;
  };

  const validateName = (name) => {
    return name.trim().length >= 2 && name.trim().length <= 50;
  };

  const validateBio = (bio) => {
    return bio.length <= 500;
  };

  const validateForm = () => {
    const errors = {};

    // First name validation
    if (editForm.first_name && !validateName(editForm.first_name)) {
      errors.first_name = 'First name must be 2-50 characters long';
    }

    // Last name validation
    if (editForm.last_name && !validateName(editForm.last_name)) {
      errors.last_name = 'Last name must be 2-50 characters long';
    }

    // Email validation
    if (editForm.email && !validateEmail(editForm.email)) {
      errors.email = 'Please enter a valid email address';
    }

    // Phone validation
    if (editForm.phone && !validatePhone(editForm.phone)) {
      errors.phone = 'Phone number must be exactly 10 digits';
    }

    // Company validation
    if (editForm.company && editForm.company.trim().length > 100) {
      errors.company = 'Company name must be less than 100 characters';
    }

    // Job title validation
    if (editForm.job_title && editForm.job_title.trim().length > 100) {
      errors.job_title = 'Job title must be less than 100 characters';
    }

    // Bio validation
    if (editForm.bio && !validateBio(editForm.bio)) {
      errors.bio = 'Bio must be less than 500 characters';
    }

    // Required fields validation - only essential fields
    if (!editForm.first_name.trim()) {
      errors.first_name = 'First name is required';
    }

    if (!editForm.last_name.trim()) {
      errors.last_name = 'Last name is required';
    }

    if (!editForm.email.trim()) {
      errors.email = 'Email is required';
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Real-time validation for individual fields
  const validateField = (field, value) => {
    switch (field) {
      case 'first_name':
        if (!value.trim()) return 'First name is required';
        if (!validateName(value)) return 'First name must be 2-50 characters long';
        return '';
      case 'last_name':
        if (!value.trim()) return 'Last name is required';
        if (!validateName(value)) return 'Last name must be 2-50 characters long';
        return '';
      case 'email':
        if (!value.trim()) return 'Email is required';
        if (!validateEmail(value)) return 'Please enter a valid email address';
        return '';
      case 'phone':
        if (value && !validatePhone(value)) return 'Phone number must be exactly 10 digits';
        return '';
      case 'company':
        if (value && value.trim().length > 100) return 'Company name must be less than 100 characters';
        return '';
      case 'job_title':
        if (value && value.trim().length > 100) return 'Job title must be less than 100 characters';
        return '';
      case 'bio':
        if (value && !validateBio(value)) return 'Bio must be less than 500 characters';
        return '';
      default:
        return '';
    }
  };

  const handleInputChange = (field, value) => {
    setEditForm(prev => ({
      ...prev,
      [field]: value
    }));

    // Validate the field in real-time
    const fieldError = validateField(field, value);
    
    setValidationErrors(prev => {
      const newErrors = { ...prev };
      if (fieldError) {
        newErrors[field] = fieldError;
      } else {
        delete newErrors[field];
      }
      console.log(`Field ${field} validation:`, fieldError ? fieldError : 'Valid');
      console.log('Current validation errors:', newErrors);
      return newErrors;
    });
  };

  const handleAvatarChange = (event) => {
    const file = event.target.files[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        setError('Please select a valid image file');
        return;
      }
      
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        setError('Image size must be less than 5MB');
        return;
      }
      
      setAvatarFile(file);
      
      // Create preview URL
      const reader = new FileReader();
      reader.onload = (e) => {
        setAvatarPreview(e.target.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const uploadAvatar = async (file) => {
    // For now, we'll just simulate the upload and use a data URL
    // In a real app, you'd upload to a cloud service like AWS S3, Cloudinary, etc.
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        // Simulate upload delay
        setTimeout(() => {
          resolve(e.target.result);
        }, 1000);
      };
      reader.readAsDataURL(file);
    });
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  if (isLoading && !profile.id) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500"></div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-emerald-600">My Profile</h1>
        {!isEditing && (
          <button
            onClick={handleEdit}
            className="flex items-center space-x-2 px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors"
          >
            <Edit3 className="w-4 h-4" />
            <span>Edit Profile</span>
          </button>
        )}
      </div>

      {/* Success Message */}
      {success && (
        <div className="bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-lg">
          Profile updated successfully!
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Profile Information */}
        <div className="lg:col-span-2 space-y-6">
          {/* Basic Info Card */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-start space-x-4">
              {/* Avatar */}
              <div className="relative">
                <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center overflow-hidden">
                  {avatarPreview ? (
                    <img
                      src={avatarPreview}
                      alt="Profile Preview"
                      className="w-20 h-20 rounded-full object-cover"
                    />
                  ) : profile.avatar_url ? (
                    <img
                      src={profile.avatar_url}
                      alt="Profile"
                      className="w-20 h-20 rounded-full object-cover"
                    />
                  ) : (
                    <User className="w-10 h-10 text-emerald-600" />
                  )}
                </div>
                {isEditing && (
                  <div className="absolute -bottom-1 -right-1">
                    <input
                      type="file"
                      id="avatar-upload"
                      accept="image/*"
                      onChange={handleAvatarChange}
                      className="hidden"
                    />
                    <label
                      htmlFor="avatar-upload"
                      className="bg-emerald-500 text-white rounded-full p-1.5 hover:bg-emerald-600 transition-colors cursor-pointer inline-block"
                    >
                      <Camera className="w-3 h-3" />
                    </label>
                  </div>
                )}
              </div>

              {/* Basic Info */}
              <div className="flex-1">
                {isEditing ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          First Name *
                        </label>
                        <input
                          type="text"
                          value={editForm.first_name}
                          onChange={(e) => handleInputChange('first_name', e.target.value)}
                          className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 ${
                            validationErrors.first_name ? 'border-red-500' : 'border-gray-300'
                          }`}
                          placeholder="Enter your first name"
                        />
                        {validationErrors.first_name && (
                          <p className="text-red-500 text-sm mt-1">{validationErrors.first_name}</p>
                        )}
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Last Name *
                        </label>
                        <input
                          type="text"
                          value={editForm.last_name}
                          onChange={(e) => handleInputChange('last_name', e.target.value)}
                          className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 ${
                            validationErrors.last_name ? 'border-red-500' : 'border-gray-300'
                          }`}
                          placeholder="Enter your last name"
                        />
                        {validationErrors.last_name && (
                          <p className="text-red-500 text-sm mt-1">{validationErrors.last_name}</p>
                        )}
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Email *
                      </label>
                      <input
                        type="email"
                        value={editForm.email || profile.email}
                        onChange={(e) => handleInputChange('email', e.target.value)}
                        className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 ${
                          validationErrors.email ? 'border-red-500' : 'border-gray-300'
                        }`}
                        placeholder="Enter your email address"
                      />
                      {validationErrors.email && (
                        <p className="text-red-500 text-sm mt-1">{validationErrors.email}</p>
                      )}
                    </div>
                  </div>
                ) : (
                  <div>
                    <h2 className="text-2xl font-bold text-emerald-700">{profile.name}</h2>
                    <p className="text-emerald-600 flex items-center space-x-2 mt-1">
                      <Mail className="w-4 h-4" />
                      <span>{profile.email}</span>
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Contact Information */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-emerald-600 mb-4">Contact Information</h3>
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Phone Number
                </label>
                <div className="flex items-center space-x-3">
                  <Phone className="w-5 h-5 text-gray-400" />
                  {isEditing ? (
                    <div className="flex-1 flex space-x-2">
                      <select
                        value={editForm.phone_country_code}
                        onChange={(e) => handleInputChange('phone_country_code', e.target.value)}
                        className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 bg-white"
                      >
                        {countryCodes.map((country) => (
                          <option key={country.code} value={country.code}>
                            {country.flag} {country.code} {country.country}
                          </option>
                        ))}
                      </select>
                      <input
                        type="tel"
                        value={editForm.phone}
                        onChange={(e) => handleInputChange('phone', e.target.value)}
                        placeholder="1234567890"
                        maxLength="10"
                        className={`flex-1 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 ${
                          validationErrors.phone ? 'border-red-500' : 'border-gray-300'
                        }`}
                      />
                    </div>
                  ) : (
                    <span className="text-gray-700">
                      {profile.phone ? `${profile.phone_country_code || '+1'} ${profile.phone}` : 'Not provided'}
                    </span>
                  )}
                </div>
                {isEditing && validationErrors.phone && (
                  <p className="text-red-500 text-sm mt-1">{validationErrors.phone}</p>
                )}
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Company
                </label>
                <div className="flex items-center space-x-3">
                  <Building className="w-5 h-5 text-gray-400" />
                  {isEditing ? (
                    <div className="flex-1">
                      <input
                        type="text"
                        value={editForm.company}
                        onChange={(e) => handleInputChange('company', e.target.value)}
                        placeholder="Enter your company name"
                        className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 ${
                          validationErrors.company ? 'border-red-500' : 'border-gray-300'
                        }`}
                      />
                      {validationErrors.company && (
                        <p className="text-red-500 text-sm mt-1">{validationErrors.company}</p>
                      )}
                    </div>
                  ) : (
                    <span className="text-gray-700">{profile.company || 'Not provided'}</span>
                  )}
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Job Title
                </label>
                <div className="flex items-center space-x-3">
                  <Briefcase className="w-5 h-5 text-gray-400" />
                  {isEditing ? (
                    <div className="flex-1">
                      <input
                        type="text"
                        value={editForm.job_title}
                        onChange={(e) => handleInputChange('job_title', e.target.value)}
                        placeholder="Enter your job title"
                        className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 ${
                          validationErrors.job_title ? 'border-red-500' : 'border-gray-300'
                        }`}
                      />
                      {validationErrors.job_title && (
                        <p className="text-red-500 text-sm mt-1">{validationErrors.job_title}</p>
                      )}
                    </div>
                  ) : (
                    <span className="text-gray-700">{profile.job_title || 'Not provided'}</span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Bio */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-emerald-600 mb-4">About</h3>
            {isEditing ? (
              <div>
                <textarea
                  value={editForm.bio}
                  onChange={(e) => handleInputChange('bio', e.target.value)}
                  placeholder="Tell us about yourself..."
                  rows={4}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 ${
                    validationErrors.bio ? 'border-red-500' : 'border-gray-300'
                  }`}
                />
                <div className="flex justify-between items-center mt-2">
                  {validationErrors.bio && (
                    <p className="text-red-500 text-sm">{validationErrors.bio}</p>
                  )}
                  <p className="text-gray-500 text-sm ml-auto">
                    {editForm.bio.length}/500 characters
                  </p>
                </div>
              </div>
            ) : (
              <p className="text-gray-700">{profile.bio || 'No bio provided'}</p>
            )}
          </div>

          {/* Preferences */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-emerald-600 mb-4">Preferences</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Timezone
                </label>
                {isEditing ? (
                  <select
                    value={editForm.timezone}
                    onChange={(e) => handleInputChange('timezone', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  >
                    {timezones.map((tz) => (
                      <option key={tz.value} value={tz.value}>
                        {tz.label}
                      </option>
                    ))}
                  </select>
                ) : (
                  <div className="flex items-center space-x-2 px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg">
                    <Globe className="w-4 h-4 text-gray-400" />
                    <span className="text-gray-700">{profile.timezone}</span>
                  </div>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Language
                </label>
                {isEditing ? (
                  <select
                    value={editForm.language}
                    onChange={(e) => handleInputChange('language', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  >
                    {languages.map((lang) => (
                      <option key={lang.value} value={lang.value}>
                        {lang.flag} {lang.label}
                      </option>
                    ))}
                  </select>
                ) : (
                  <div className="flex items-center space-x-2 px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg">
                    <span className="text-gray-700">{profile.language.toUpperCase()}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Action Buttons for Editing */}
          {isEditing && (
            <div className="flex items-center space-x-3">
              <button
                onClick={handleSave}
                disabled={isLoading || Object.keys(validationErrors).length > 0}
                className={`flex items-center space-x-2 px-6 py-2 rounded-lg transition-colors ${
                  Object.keys(validationErrors).length === 0 && !isLoading
                    ? 'bg-emerald-500 text-white hover:bg-emerald-600'
                    : 'bg-gray-400 text-gray-200 cursor-not-allowed'
                }`}
              >
                <Save className="w-4 h-4" />
                <span>
                  {isLoading 
                    ? 'Saving...' 
                    : Object.keys(validationErrors).length > 0 
                      ? `Fix ${Object.keys(validationErrors).length} error${Object.keys(validationErrors).length > 1 ? 's' : ''} to save`
                      : 'Save Changes'
                  }
                </span>
              </button>
              <button
                onClick={handleCancel}
                disabled={isLoading}
                className="flex items-center space-x-2 px-6 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <X className="w-4 h-4" />
                <span>Cancel</span>
              </button>
            </div>
          )}
        </div>

        {/* Account Info Sidebar */}
        <div className="space-y-6">
          {/* Account Info */}
          <div className="bg-white rounded-xl shadow-sm border border-emerald-200 p-6">
            <h3 className="text-lg font-semibold text-emerald-600 mb-4">Account Information</h3>
            <div className="space-y-3">
              <div className="flex items-center space-x-3">
                <Calendar className="w-5 h-5 text-gray-400" />
                <div>
                  <p className="text-sm text-gray-600">Member since</p>
                  <p className="font-medium text-gray-900">
                    {formatDate(stats.member_since)}
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <User className="w-5 h-5 text-gray-400" />
                <div>
                  <p className="text-sm text-gray-600">User ID</p>
                  <p className="font-medium text-gray-900">#{profile.id}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;
