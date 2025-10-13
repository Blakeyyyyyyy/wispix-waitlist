import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { RainbowButton } from '../components/ui/rainbow-button';

const LandingPage: React.FC = () => {
  const [heroInput, setHeroInput] = useState('');
  const [showWaitlistModal, setShowWaitlistModal] = useState(false);
  const [waitlistName, setWaitlistName] = useState('');
  const [waitlistEmail, setWaitlistEmail] = useState('');
  const [isSubmitted] = useState(false);
  const [showQuestionFlow, setShowQuestionFlow] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [questionAnswers, setQuestionAnswers] = useState({
    businessType: '',
    automationGoal: '',
    techComfort: 0,
    frustration: '',
    urgency: ''
  });
  const [showCelebration, setShowCelebration] = useState(false);
  const [trackingId, setTrackingId] = useState('');
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [customInput, setCustomInput] = useState('');
  const [emailError, setEmailError] = useState('');

  // Webhook validation
  const isValidWebhookUrl = (url: string): boolean => {
    if (!url || url.trim() === '') return false;
    try {
      const urlObj = new URL(url);
      return urlObj.protocol === 'https:' && (
        urlObj.hostname.includes('make.com') || 
        urlObj.hostname.includes('zapier.com') ||
        urlObj.hostname.includes('webhook.site') ||
        urlObj.hostname.includes('novusautomations.net') ||
        urlObj.hostname === 'localhost'
      );
    } catch {
      return false;
    }
  };

  // Send data to webhook
  const sendToWebhook = async (data: any) => {
    const webhookUrl = (import.meta as any).env?.VITE_WEBHOOK_URL || 'https://novusautomations.net/webhook/cba008b1-9ed3-4576-9eba-6d3854c5c344';
    
    if (!isValidWebhookUrl(webhookUrl)) {
      console.error('Invalid webhook URL configuration.');
      return { success: false, error: 'Invalid webhook URL' };
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);

      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'User-Agent': 'Wispix-App/1.0',
        },
        signal: controller.signal,
        body: JSON.stringify({
          ...data,
          timestamp: new Date().toISOString(),
          user_agent: navigator.userAgent,
          page_url: window.location.href,
          source: 'wispix-app'
        })
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        let responseText = '';
        try { responseText = await response.text(); } catch {}
        return { success: true, response: responseText };
      } else {
        let errorText = '';
        try { errorText = await response.text(); } catch {}
        throw new Error(`Webhook failed: ${response.status} - ${errorText}`);
      }
    } catch (error) {
      console.error('Webhook error:', error);
      // Store locally as backup
      try {
        const backupData = JSON.parse(localStorage.getItem('wispix_backup_submissions') || '[]');
        backupData.push({ ...data, backup_timestamp: new Date().toISOString() });
        localStorage.setItem('wispix_backup_submissions', JSON.stringify(backupData));
      } catch {}
      return { success: false, error };
    }
  };

  const suggestions = [
    { icon: "monitor", text: "Monitor customer feedback and generate reports" },
    { icon: "target", text: "Qualify inbound leads and schedule demos" },
    { icon: "analytics", text: "Process invoices and update accounting" },
    { icon: "email", text: "Send personalized follow-up emails" }
  ];

  // Limit suggestions to 2 on small screens for better fit
  const visibleSuggestions = typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(max-width: 640px)').matches
    ? suggestions.slice(0, 2)
    : suggestions;

  const placeholders = [
    "Ask WispixAI to create an agent that monitors customer feedback and generates reports",
    "Ask WispixAI to create an agent that qualifies inbound leads and schedules demos",
    "Ask WispixAI to create an agent that processes invoices and updates accounting",
    "Ask WispixAI to create an agent that tracks competitor pricing and updates our rates"
  ];

  const [currentPlaceholder, setCurrentPlaceholder] = useState(placeholders[0]);

  // Rotating placeholder text
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentPlaceholder(prev => {
        const currentIndex = placeholders.indexOf(prev);
        return placeholders[(currentIndex + 1) % placeholders.length];
      });
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  const handleHeroSubmit = () => {
    if (heroInput.trim()) {
      setShowWaitlistModal(true);
    }
  };

  const handleWaitlistSubmit = async () => {
    // Validate email
    if (!waitlistEmail.includes('@')) {
      setEmailError('Please enter a valid email address');
      return;
    }
    
    setEmailError(''); // Clear any previous errors
    
    if (waitlistName.trim() && waitlistEmail.trim()) {
      // Generate tracking ID
      const timestamp = Date.now();
      const random = Math.floor(Math.random() * 10000);
      const newTrackingId = `${timestamp}-${random}`;
      setTrackingId(newTrackingId);

      // Show question flow immediately (no delay)
      setShowWaitlistModal(false);
      setShowQuestionFlow(true);
      setCurrentStep(1);

      // Send waitlist signup to webhook in background (don't await)
      sendToWebhook({
        type: 'waitlist_signup',
        name: waitlistName,
        email: waitlistEmail,
        task: heroInput,
        source: 'waitlist_page',
        tracking_id: newTrackingId,
        timestamp: new Date().toISOString()
      }).catch(error => {
        console.error('Webhook error:', error);
        // Don't show error to user since they're already in the flow
      });
    }
  };

  const handleQuestionAnswer = async (answer: string | number) => {
    const updatedAnswers = { ...questionAnswers };
    
    switch (currentStep) {
      case 1:
        updatedAnswers.businessType = answer as string;
        break;
      case 2:
        updatedAnswers.automationGoal = answer as string;
        break;
      case 3:
        updatedAnswers.techComfort = answer as number;
        break;
      case 4:
        updatedAnswers.frustration = answer as string;
        break;
      case 5:
        updatedAnswers.urgency = answer as string;
        break;
    }
    
    setQuestionAnswers(updatedAnswers);
    
    if (currentStep < 5) {
      setCurrentStep(currentStep + 1);
    } else {
      // Send survey completion to webhook
      await sendToWebhook({
        type: 'survey_completion',
        email: waitlistEmail,
        name: waitlistName,
        tracking_id: trackingId,
        surveyData: {
          businessType: updatedAnswers.businessType,
          automationGoal: updatedAnswers.automationGoal,
          techComfort: updatedAnswers.techComfort,
          frustration: updatedAnswers.frustration,
          urgency: updatedAnswers.urgency
        },
        timestamp: new Date().toISOString()
      });

      setShowQuestionFlow(false);
      setShowCelebration(true);
      // Don't auto-close the celebration modal - user must click X
      setWaitlistName('');
      setWaitlistEmail('');
      setHeroInput('');
      setQuestionAnswers({
        businessType: '',
        automationGoal: '',
        techComfort: 0,
        frustration: '',
        urgency: ''
      });
      setCurrentStep(1);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleHeroSubmit();
    }
  };

  const handleSuggestionClick = (suggestion: { icon: string; text: string }) => {
    setHeroInput(suggestion.text);
  };

  const renderSuggestionIcon = (iconType: string) => {
    switch (iconType) {
      case 'monitor':
        return (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="2" y="3" width="20" height="14" rx="2" ry="2"/>
            <line x1="8" y1="21" x2="16" y2="21"/>
            <line x1="12" y1="17" x2="12" y2="21"/>
          </svg>
        );
      case 'target':
        return (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10"/>
            <circle cx="12" cy="12" r="6"/>
            <circle cx="12" cy="12" r="2"/>
          </svg>
        );
      case 'analytics':
        return (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M18 20V10"/>
            <path d="M12 20V4"/>
            <path d="M6 20v-6"/>
          </svg>
        );
      case 'email':
        return (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
            <polyline points="22,6 12,13 2,6"/>
          </svg>
        );
      default:
        return null;
    }
  };


  return (
    <div className="min-h-screen bg-white text-gray-900">
      {/* Navigation - Glass Morphism Header */}
      <header className="sticky top-4 z-50 px-4">
        <div 
          className="mx-auto max-w-6xl rounded-2xl md:rounded-full shadow-lg border border-white/20"
          style={{
            background: 'rgba(255, 255, 255, 0.7)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
          }}
        >
          <div className="h-14 md:h-18 px-4 md:px-8 flex items-center justify-between">
            {/* WISPIX Brand */}
            <span 
              className="text-xl md:text-2xl text-black"
              style={{ 
                fontFamily: 'Poppins, -apple-system, BlinkMacSystemFont, sans-serif',
                fontWeight: '600'
              }}
            >
              Wispix AI
            </span>

            {/* Right-side actions */}
            <nav className="flex items-center">
              <button 
                onClick={() => setShowWaitlistModal(true)}
                className="px-4 md:px-6 py-2 text-white rounded-full font-semibold text-sm transition-all hover:scale-105 shadow-lg"
                style={{ backgroundColor: '#58EB9A' }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#4ADE80'} 
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#58EB9A'}
              >
                Get Early Access
              </button>
            </nav>
          </div>
        </div>
      </header>


      {/* Background Grid - Extends to top */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-50/50 to-green-50/50"></div>
        <div 
          className="absolute inset-0 opacity-30"
          style={{
            backgroundImage: `
              linear-gradient(rgba(34, 197, 94, 0.104) 1px, transparent 1px),
              linear-gradient(90deg, rgba(34, 197, 94, 0.104) 1px, transparent 1px)
            `,
            backgroundSize: "40px 40px",
          }}
        ></div>
        <div className="absolute inset-0 bg-gradient-radial from-green-100/15 via-green-50/5 to-transparent"></div>
      </div>

      {/* Hero Section */}
      <section className="relative pt-16 md:pt-20 pb-24 text-center overflow-hidden">{/* Background removed - now uses fixed grid above */}

        <div className="max-w-7xl mx-auto px-6 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="inline-flex items-center gap-2 px-5 py-2 rounded-full text-sm font-medium mb-10 border backdrop-blur-lg shadow-lg"
            style={{ 
              backgroundColor: 'rgba(88, 235, 154, 0.15)',
              borderColor: 'rgba(88, 235, 154, 0.3)',
              color: '#1f2937'
            }}
          >
            <div className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: '#58EB9A' }}></div>
            <span>Join Hundreds or businesses already on our waiting list</span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-4xl sm:text-5xl md:text-7xl font-extrabold leading-[1.15] md:leading-tight mb-6 tracking-tight"
          >
            Your AI Workforce.<br />
            <span style={{ color: '#000000' }}>Built in chat, working in minutes.</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-base sm:text-lg md:text-xl text-gray-600 mb-8 md:mb-10 max-w-2xl mx-auto"
          >
            Deploy AI Agents that automate everything by chatting with AI
          </motion.p>

          {/* AI Platform Input Box */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="max-w-xl md:max-w-4xl mx-auto mb-8 md:mb-10 relative"
          >
            {/* Green glow effect behind chat box */}
            <div className="absolute inset-0 -z-10">
              <div 
                className="absolute inset-0 blur-3xl opacity-40 animate-pulse"
                style={{
                  background: 'radial-gradient(ellipse at center, rgba(88, 235, 154, 0.6) 0%, rgba(88, 235, 154, 0.3) 40%, transparent 70%)',
                  transform: 'scale(1.3)',
                }}
              ></div>
              <div 
                className="absolute inset-0 blur-2xl opacity-30"
                style={{
                  background: 'radial-gradient(ellipse at center, rgba(74, 222, 128, 0.5) 0%, rgba(34, 197, 94, 0.2) 50%, transparent 80%)',
                  transform: 'scale(1.5)',
                }}
              ></div>
            </div>
            
            <div className="relative bg-white/95 border border-black/10 rounded-3xl backdrop-blur-xl shadow-2xl overflow-hidden">
              <textarea
                value={heroInput}
                onChange={(e) => setHeroInput(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder={currentPlaceholder}
                className="w-full px-4 md:px-6 py-8 md:py-12 text-base md:text-lg text-gray-900 bg-transparent border-none outline-none placeholder:text-gray-500 resize-none overflow-hidden min-h-[100px] md:min-h-[120px]"
                rows={3}
              />
              <div className="flex flex-row justify-between items-center gap-3 px-3 md:px-4 py-2 border-t border-black/5 bg-white/50">
                <button className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-2xl text-gray-600 hover:bg-gray-50 text-sm font-medium transition-all" onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#58EB9A'; e.currentTarget.style.color = '#58EB9A'; }} onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#d1d5db'; e.currentTarget.style.color = '#6b7280'; }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                    <polyline points="7,10 12,15 17,10"/>
                    <line x1="12" y1="15" x2="12" y2="3"/>
                  </svg>
                  Upload
                </button>
                <button
                  onClick={handleHeroSubmit}
                  className="w-10 h-10 text-black rounded-xl flex items-center justify-center transition-all hover:scale-105 shadow-lg bg-transparent"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="black" strokeWidth="2">
                    <path d="m22 2-7 20-4-9-9-4Z"/>
                    <path d="M22 2 11 13"/>
                  </svg>
                </button>
              </div>
            </div>

            <div className="flex gap-2 md:gap-3 flex-wrap justify-center mt-6 md:mt-8">
              {visibleSuggestions.map((suggestion, index) => (
                <button
                  key={index}
                  onClick={() => handleSuggestionClick(suggestion)}
                  className="px-3 md:px-6 py-2.5 md:py-3 bg-white/90 border border-black/10 rounded-3xl text-gray-700 hover:bg-white hover:text-gray-900 transition-all hover:-translate-y-1 shadow-lg backdrop-blur-lg font-medium flex items-center gap-2 md:gap-3 text-sm md:text-base"
                  onMouseEnter={(e) => e.currentTarget.style.borderColor = '#58EB9A'}
                  onMouseLeave={(e) => e.currentTarget.style.borderColor = 'rgba(0, 0, 0, 0.1)'}
                >
                  <div className="text-gray-600">
                    {renderSuggestionIcon(suggestion.icon)}
                  </div>
                  <span>{suggestion.text}</span>
                </button>
              ))}
            </div>

            {/* Quick Join Waitlist CTA */}
            <div className="mt-12 md:mt-16 flex justify-center">
              <RainbowButton
                onClick={() => setShowWaitlistModal(true)}
                className="text-base md:text-lg px-10 md:px-12 py-4 md:py-5 scale-110 bg-black text-white"
              >
                Get Early Access To Wispix AI
              </RainbowButton>
            </div>
          </motion.div>

        </div>
      </section>

      {/* Value Proposition Section */}
      <section className="relative py-16 md:py-32 bg-white">
        <div className="max-w-6xl mx-auto px-6 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
            className="space-y-8"
          >
            <h2 className="text-3xl sm:text-4xl md:text-6xl lg:text-7xl font-normal leading-snug md:leading-tight text-gray-900">
              <span className="font-normal text-gray-900">Wispix is your AI operator that</span>{' '}
              <span className="font-semibold text-gray-900">builds, manages & fixes</span>{' '}
              <span className="font-normal text-gray-900">your AI agents and Automations.</span>
            </h2>
            
            <p className="text-xl sm:text-2xl md:text-5xl font-light text-gray-400 leading-relaxed">
              Say goodbye to "failed automation emails" & agency retainers
            </p>
          </motion.div>
        </div>
      </section>

      {/* 3-Card Section */}
      <section className="relative py-16 md:py-32 bg-gradient-to-b from-white to-gray-50">
        <div className="max-w-7xl mx-auto px-6 relative z-10">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
            
            {/* Card 1: Your Exact Image */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              viewport={{ once: true }}
              className="relative group"
            >
              <div 
                className="relative bg-white/90 backdrop-blur-xl border border-gray-200 rounded-2xl md:rounded-3xl p-5 md:p-8 shadow-lg hover:shadow-2xl transition-all duration-300 hover:-translate-y-2 h-full min-h-[320px] md:min-h-[400px]"
                style={{
                  background: 'rgba(255, 255, 255, 0.9)',
                  backdropFilter: 'blur(20px)',
                  WebkitBackdropFilter: 'blur(20px)',
                }}
              >
                <div className="absolute inset-0 bg-gradient-to-br from-purple-400/5 to-pink-400/5 rounded-3xl"></div>
                
                <div className="relative z-10">
                  <div className="text-center mb-4 md:mb-6">
                    <h3 className="text-xl md:text-2xl font-bold text-gray-900 mb-2">Ask Wispix to automate Anything</h3>
                  </div>
                  
                  {/* Your Exact Image */}
                  <div className="flex justify-center">
                    <img 
                      src="/images/card1-image.png" 
                      alt="Wispix automation interface" 
                      className="w-full h-auto rounded-xl md:rounded-2xl shadow-sm"
                    />
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Card 2: Exact Screenshot */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              viewport={{ once: true }}
              className="relative group"
            >
              <div 
                className="relative bg-white/90 backdrop-blur-xl border border-gray-200 rounded-2xl md:rounded-3xl p-5 md:p-8 shadow-lg hover:shadow-2xl transition-all duration-300 hover:-translate-y-2 h-full min-h-[320px] md:min-h-[400px]"
                style={{
                  background: 'rgba(255, 255, 255, 0.9)',
                  backdropFilter: 'blur(20px)',
                  WebkitBackdropFilter: 'blur(20px)',
                }}
              >
                <div className="absolute inset-0 bg-gradient-to-br from-blue-400/5 to-green-400/5 rounded-3xl"></div>
                
                <div className="relative z-10">
                  <div className="text-center mb-4 md:mb-6">
                    <h3 className="text-xl md:text-2xl font-bold text-gray-900 mb-3 md:mb-4">Connect your apps</h3>
                    <p className="text-base md:text-lg text-gray-600 mb-4 md:mb-6">Hundreds of integrations available</p>
                  </div>
                  
                  {/* Your Exact Screenshot */}
                  <div className="flex justify-center">
                    <img 
                      src="/images/middle-card.png" 
                      alt="Platform integrations" 
                      className="w-full h-auto rounded-xl md:rounded-2xl shadow-sm"
                    />
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Card 3: Workflow Flowchart with Real Logos */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              viewport={{ once: true }}
              className="relative group"
            >
              <div 
                className="relative bg-white/90 backdrop-blur-xl border border-gray-200 rounded-2xl md:rounded-3xl p-5 md:p-8 shadow-lg hover:shadow-2xl transition-all duration-300 hover:-translate-y-2 h-full min-h-[320px] md:min-h-[400px]"
                style={{
                  background: 'rgba(255, 255, 255, 0.9)',
                  backdropFilter: 'blur(20px)',
                  WebkitBackdropFilter: 'blur(20px)',
                }}
              >
                <div className="absolute inset-0 bg-gradient-to-br from-green-400/5 to-purple-400/5 rounded-3xl"></div>
                
                <div className="relative z-10">
                  <div className="text-center mb-4 md:mb-6">
                    <h3 className="text-xl md:text-2xl font-bold text-gray-900 mb-3 md:mb-4">Watch it work</h3>
                    <p className="text-base md:text-lg text-gray-600 mb-4 md:mb-6">Your automation comes to life</p>
                  </div>
                  
                  {/* Workflow Flowchart with Real Logos */}
                  <div className="space-y-2 md:space-y-3">
                    {/* Step 1: Trigger - Gmail */}
                    <div className="flex items-center gap-3 bg-white/80 rounded-lg md:rounded-xl p-3 border border-gray-200 shadow-sm">
                      <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center border border-gray-200">
                        <svg xmlns="http://www.w3.org/2000/svg" data-name="Layer 1" height="20" id="Layer_1" viewBox="0 0 32 32" width="20">
                          <path d="M16.58,19.1068l-12.69-8.0757A3,3,0,0,1,7.1109,5.97l9.31,5.9243L24.78,6.0428A3,3,0,0,1,28.22,10.9579Z" fill="#ea4435"/>
                          <path d="M25.5,5.5h4a0,0,0,0,1,0,0v18a3,3,0,0,1-3,3h0a3,3,0,0,1-3-3V7.5a2,2,0,0,1,2-2Z" fill="#00ac47" transform="translate(53.0001 32.0007) rotate(180)"/>
                          <path d="M29.4562,8.0656c-.0088-.06-.0081-.1213-.0206-.1812-.0192-.0918-.0549-.1766-.0823-.2652a2.9312,2.9312,0,0,0-.0958-.2993c-.02-.0475-.0508-.0892-.0735-.1354A2.9838,2.9838,0,0,0,28.9686,6.8c-.04-.0581-.09-.1076-.1342-.1626a3.0282,3.0282,0,0,0-.2455-.2849c-.0665-.0647-.1423-.1188-.2146-.1771a3.02,3.02,0,0,0-.24-.1857c-.0793-.0518-.1661-.0917-.25-.1359-.0884-.0461-.175-.0963-.267-.1331-.0889-.0358-.1837-.0586-.2766-.0859s-.1853-.06-.2807-.0777a3.0543,3.0543,0,0,0-.357-.036c-.0759-.0053-.1511-.0186-.2273-.018a2.9778,2.9778,0,0,0-.4219.0425c-.0563.0084-.113.0077-.1689.0193a33.211,33.211,0,0,0-.5645.178c-.0515.022-.0966.0547-.1465.0795A2.901,2.901,0,0,0,23.5,8.5v5.762l4.72-3.3043a2.8878,2.8878,0,0,0,1.2359-2.8923Z" fill="#ffba00"/>
                          <path d="M5.5,5.5h0a3,3,0,0,1,3,3v18a0,0,0,0,1,0,0h-4a2,2,0,0,1-2-2V8.5a3,3,0,0,1,3-3Z" fill="#4285f4"/>
                          <path d="M2.5439,8.0656c.0088-.06.0081-.1213.0206-.1812.0192-.0918.0549-.1766.0823-.2652A2.9312,2.9312,0,0,1,2.7426,7.32c.02-.0475.0508-.0892.0736-.1354A2.9719,2.9719,0,0,1,3.0316,6.8c.04-.0581.09-.1076.1342-.1626a3.0272,3.0272,0,0,1,.2454-.2849c.0665-.0647.1423-.1188.2147-.1771a3.0005,3.0005,0,0,1,.24-.1857c.0793-.0518.1661-.0917.25-.1359A2.9747,2.9747,0,0,1,4.3829,5.72c.089-.0358.1838-.0586.2766-.0859s.1853-.06.2807-.0777a3.0565,3.0565,0,0,1,.357-.036c.076-.0053.1511-.0186.2273-.018a2.9763,2.9763,0,0,1,.4219.0425c.0563.0084.113.0077.169.0193a2.9056,2.9056,0,0,1,.286.0888,2.9157,2.9157,0,0,1,.2785.0892c.0514.022.0965.0547.1465.0795a2.9745,2.9745,0,0,1,.3742.21A2.9943,2.9943,0,0,1,8.5,8.5v5.762L3.78,10.9579A2.8891,2.8891,0,0,1,2.5439,8.0656Z" fill="#c52528"/>
                        </svg>
                      </div>
                      <div className="flex-1">
                        <div className="text-xs font-medium text-gray-500 uppercase">Trigger</div>
                        <div className="text-xs md:text-sm font-semibold text-gray-900">New email arrives</div>
                        <div className="text-xs text-gray-500">Gmail</div>
                      </div>
                    </div>
                    
                    {/* Arrow */}
                    <div className="flex justify-center">
                      <div className="w-0.5 h-4 bg-gray-300"></div>
                    </div>
                    
                    {/* Step 2: Action - Airtable */}
                    <div className="flex items-center gap-3 bg-white/80 rounded-lg md:rounded-xl p-3 border border-gray-200 shadow-sm">
                      <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center border border-gray-200">
                        <svg viewBox="0 -20.5 256 256" fill="none" width="20" height="20">
                          <g>
                            <path d="M114.25873,2.70101695 L18.8604023,42.1756384 C13.5552723,44.3711638 13.6102328,51.9065311 18.9486282,54.0225085 L114.746142,92.0117514 C123.163769,95.3498757 132.537419,95.3498757 140.9536,92.0117514 L236.75256,54.0225085 C242.08951,51.9065311 242.145916,44.3711638 236.83934,42.1756384 L141.442459,2.70101695 C132.738459,-0.900338983 122.961284,-0.900338983 114.25873,2.70101695" fill="#FFBF00"/>
                            <path d="M136.349071,112.756863 L136.349071,207.659101 C136.349071,212.173089 140.900664,215.263892 145.096461,213.600615 L251.844122,172.166219 C254.281184,171.200072 255.879376,168.845451 255.879376,166.224705 L255.879376,71.3224678 C255.879376,66.8084791 251.327783,63.7176768 247.131986,65.3809537 L140.384325,106.815349 C137.94871,107.781496 136.349071,110.136118 136.349071,112.756863" fill="#26B5F8"/>
                            <path d="M111.422771,117.65355 L79.742409,132.949912 L76.5257763,134.504714 L9.65047684,166.548104 C5.4112904,168.593211 0.000578531073,165.503855 0.000578531073,160.794612 L0.000578531073,71.7210757 C0.000578531073,70.0173017 0.874160452,68.5463864 2.04568588,67.4384994 C2.53454463,66.9481944 3.08848814,66.5446689 3.66412655,66.2250305 C5.26231864,65.2661153 7.54173107,65.0101153 9.47981017,65.7766689 L110.890522,105.957098 C116.045234,108.002206 116.450206,115.225166 111.422771,117.65355" fill="#ED3049"/>
                          </g>
                        </svg>
                      </div>
                      <div className="flex-1">
                        <div className="text-xs font-medium text-gray-500 uppercase">Action</div>
                        <div className="text-xs md:text-sm font-semibold text-gray-900">Create Airtable record</div>
                        <div className="text-xs text-gray-500">Airtable</div>
                      </div>
                    </div>
                    
                    {/* Arrow */}
                    <div className="flex justify-center">
                      <div className="w-0.5 h-4 bg-gray-300"></div>
                    </div>
                    
                    {/* Step 3: Action - Slack */}
                    <div className="flex items-center gap-3 bg-white/80 rounded-lg md:rounded-xl p-3 border border-gray-200 shadow-sm">
                      <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center border border-gray-200">
                        <svg viewBox="0 0 64 64" fill="none" width="20" height="20">
                          <path d="m 17.777788,40.309957 c 0,-3.728276 2.81916,-6.729717 6.320986,-6.729717 3.501827,0 6.320986,3.001441 6.320986,6.729717 v 16.56525 c 0,3.728197 -2.819159,6.729717 -6.320986,6.729717 -3.501826,0 -6.320986,-3.00152 -6.320986,-6.729717 z" fill="#e01e5a"/>
                          <path d="m 40.309891,46.222212 c -3.728196,0 -6.729638,-2.81916 -6.729638,-6.320986 0,-3.501826 3.001442,-6.320986 6.729638,-6.320986 H 56.8753 c 3.728197,0 6.729638,2.81916 6.729638,6.320986 0,3.501826 -3.001441,6.320986 -6.729638,6.320986 z" fill="#ecb22d"/>
                          <path d="m 33.580253,7.1246997 c 0,-3.7281963 2.81916,-6.72963758 6.320987,-6.72963758 3.501826,0 6.320986,3.00144128 6.320986,6.72963758 V 23.69003 c 0,3.728275 -2.81916,6.729717 -6.320986,6.729717 -3.501827,0 -6.320987,-3.001442 -6.320987,-6.729717 z" fill="#2fb67c"/>
                          <path d="m 7.1247142,30.419747 c -3.7281967,0 -6.72963796,-2.81916 -6.72963796,-6.320987 0,-3.501826 3.00144126,-6.320986 6.72963796,-6.320986 H 23.690043 c 3.728276,0 6.729717,2.81916 6.729717,6.320986 0,3.501827 -3.001441,6.320987 -6.729717,6.320987 z" fill="#36c5f1"/>
                        </svg>
                      </div>
                      <div className="flex-1">
                        <div className="text-xs font-medium text-gray-500 uppercase">Action</div>
                        <div className="text-xs md:text-sm font-semibold text-gray-900">Send Slack notification</div>
                        <div className="text-xs text-gray-500">Slack</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>

          </div>
        </div>
      </section>






      {/* SECTION 7: Final CTA */}
      <section className="relative py-16 md:py-32 bg-white overflow-hidden">
        <div className="max-w-4xl mx-auto px-6 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
            className="text-center"
          >
            <h2 className="text-3xl sm:text-4xl md:text-6xl font-extrabold text-gray-900 mb-8 md:mb-12">
              Lock In Your Founding Spot
            </h2>

            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              viewport={{ once: true }}
              className="relative"
            >
              <div 
                className="bg-white/90 backdrop-blur-xl border-2 rounded-2xl md:rounded-3xl p-6 md:p-10 shadow-2xl"
                style={{
                  borderColor: 'rgba(88, 235, 154, 0.4)',
                  background: 'rgba(255, 255, 255, 0.95)',
                  backdropFilter: 'blur(20px)',
                  WebkitBackdropFilter: 'blur(20px)',
                }}
              >
                <button
                  onClick={() => setShowWaitlistModal(true)}
                  className="w-full text-white py-4 md:py-6 rounded-xl md:rounded-2xl font-black text-xl md:text-3xl transition-all hover:scale-105 shadow-2xl relative overflow-hidden group mb-6 md:mb-8"
                  style={{ backgroundColor: '#58EB9A' }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#4ADE80'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#58EB9A'}
                >
                  <span className="relative z-10">Join Hundreds Of Founders & Teams</span>
                  <div className="absolute inset-0 bg-gradient-to-r from-green-400 to-blue-400 opacity-0 group-hover:opacity-20 transition-opacity"></div>
                </button>

                <div className="space-y-3 md:space-y-4">
                  {[
                    { icon: "✓", text: "Lifetime founding pricing locked" },
                    { icon: "✓", text: "Direct founder access & setup call" },
                    { icon: "✓", text: "Shape the product roadmap" },
                    { icon: "✓", text: "Private channel with the Wispix team" },
                    { icon: "✓", text: "No credit card required" }
                  ].map((item, idx) => (
                    <div key={idx} className="flex items-center justify-center gap-2 md:gap-3 text-base md:text-xl font-semibold text-gray-700">
                      <span className="text-green-600 text-xl md:text-2xl">{item.icon}</span>
                      <span>{item.text}</span>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-10 md:py-12 bg-gradient-to-b from-white to-gray-50 border-t border-gray-200">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6 md:gap-8">
            <div className="flex items-center gap-3">
              <span 
                className="text-lg md:text-2xl text-black"
                style={{ 
                  fontFamily: 'Poppins, -apple-system, BlinkMacSystemFont, sans-serif',
                  fontWeight: '600'
                }}
              >
                Wispix AI
              </span>
            </div>
            

            <div className="flex gap-4 md:gap-6">
              {['twitter', 'linkedin', 'github'].map((_, idx) => (
                <a
                  key={idx}
                  href="#"
                  className="w-9 h-9 md:w-10 md:h-10 bg-white border border-gray-200 rounded-lg flex items-center justify-center hover:border-green-400 transition-all hover:shadow-lg"
                  style={{ backdropFilter: 'blur(10px)' }}
                >
                  <div className="w-4 h-4 md:w-5 md:h-5 bg-gray-400 rounded"></div>
                </a>
              ))}
            </div>
          </div>

          <div className="mt-6 md:mt-8 pt-6 md:pt-8 border-t border-gray-200 text-center text-gray-500 text-xs md:text-sm">
            © 2025 WispixAI. All rights reserved. Built with AI for AI.
          </div>
        </div>
      </footer>

      {/* Conversion Pop-Up Modal */}
      {showWaitlistModal && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 sm:p-6"
          onClick={() => !isSubmitted && setShowWaitlistModal(false)}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            transition={{ type: 'spring', duration: 0.5 }}
            className="bg-white/95 backdrop-blur-xl rounded-2xl md:rounded-3xl p-6 md:p-10 max-w-sm md:max-w-md w-full shadow-2xl relative overflow-hidden border-2"
            style={{ borderColor: '#58EB9A' }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Glowing border effect */}
            <div className="absolute inset-0 bg-gradient-to-br from-green-400/20 via-blue-400/20 to-purple-400/20 animate-pulse pointer-events-none"></div>
            
            {/* Confetti effect */}
            {isSubmitted && (
              <div className="absolute inset-0 pointer-events-none">
                {[...Array(20)].map((_, i) => (
                  <motion.div
                    key={i}
                    initial={{ y: -20, x: Math.random() * 100 - 50, opacity: 1 }}
                    animate={{ y: 400, opacity: 0 }}
                    transition={{ duration: 2, delay: i * 0.1 }}
                    className="absolute"
                    style={{
                      left: `${Math.random() * 100}%`,
                      fontSize: '24px'
                    }}
                  >
                    🎉
                  </motion.div>
                ))}
              </div>
            )}

            <div className="relative z-10">
              {!isSubmitted ? (
                <>
                  <div className="text-center mb-8">
                    <div className="text-4xl md:text-5xl mb-3 md:mb-4">✨</div>
                    <h3 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2 md:mb-3">
                      You're early!
                    </h3>
                    <p className="text-base md:text-lg text-gray-600">
                      Join the Wispix Waitlist to get your AI employee built for free.
                    </p>
                    {heroInput && (
                    <div className="mt-3 md:mt-4 p-3 md:p-4 bg-green-50 border border-green-200 rounded-xl">
                        <p className="text-xs md:text-sm text-green-700 font-medium mb-1">Your automation idea:</p>
                        <p className="text-green-800 italic text-sm md:text-base">"{heroInput}"</p>
                      </div>
                    )}
                  </div>

                  <div className="space-y-3 md:space-y-4 mb-4 md:mb-6">
                    <input
                      type="text"
                      placeholder="Your name"
                      value={waitlistName}
                      onChange={(e) => setWaitlistName(e.target.value)}
                      className="w-full px-4 md:px-5 py-3 md:py-4 bg-white border-2 border-gray-200 rounded-xl text-base outline-none transition-all focus:border-green-400 focus:shadow-lg"
                      onFocus={(e) => e.currentTarget.style.borderColor = '#58EB9A'}
                      onBlur={(e) => e.currentTarget.style.borderColor = '#e5e7eb'}
                    />
                    <input
                      type="email"
                      placeholder="Your email"
                      value={waitlistEmail}
                      onChange={(e) => {
                        setWaitlistEmail(e.target.value);
                        if (emailError) setEmailError(''); // Clear error when typing
                      }}
                      className={`w-full px-4 md:px-5 py-3 md:py-4 bg-white border-2 rounded-xl text-base outline-none transition-all focus:shadow-lg ${
                        emailError ? 'border-red-400' : 'border-gray-200 focus:border-green-400'
                      }`}
                      onFocus={(e) => e.currentTarget.style.borderColor = emailError ? '#f87171' : '#58EB9A'}
                      onBlur={(e) => e.currentTarget.style.borderColor = emailError ? '#f87171' : '#e5e7eb'}
                    />
                    {emailError && (
                    <p className="text-red-500 text-xs md:text-sm mt-1">{emailError}</p>
                    )}
                  </div>

                  <button
                    onClick={handleWaitlistSubmit}
                    className="w-full text-white py-3 md:py-4 rounded-xl font-bold text-base md:text-lg transition-all hover:scale-105 shadow-lg mb-3 md:mb-4"
                    style={{ backgroundColor: '#58EB9A' }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#4ADE80'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#58EB9A'}
                  >
                    Join the Waitlist → Get Early Access
                  </button>

                  <button
                    onClick={() => setShowWaitlistModal(false)}
                    className="w-full text-gray-500 hover:text-gray-700 text-xs md:text-sm font-medium"
                  >
                    Maybe later
                  </button>
                </>
              ) : (
                <div className="text-center py-8">
                  <div className="text-6xl mb-4">🎉</div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-2">
                    Welcome to the future!
                  </h3>
                  <p className="text-gray-600">
                    Check your email for next steps.
                  </p>
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}

      {/* Question Flow Modal */}
      {showQuestionFlow && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 sm:p-6"
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            transition={{ type: 'spring', duration: 0.5 }}
            className="bg-white/95 backdrop-blur-xl rounded-2xl md:rounded-3xl p-5 sm:p-8 max-w-sm sm:max-w-xl md:max-w-2xl w-full shadow-2xl relative overflow-hidden border-2 max-h-[85vh] overflow-y-auto"
            style={{ borderColor: '#58EB9A' }}
          >
            {/* Progress Bar */}
            <div className="mb-6 sm:mb-8">
              <div className="flex justify-between text-xs sm:text-sm text-gray-500 mb-2">
                <span>Step {currentStep} of 5</span>
                <span>{Math.round((currentStep / 5) * 100)}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="h-2 rounded-full transition-all duration-500"
                  style={{ 
                    width: `${(currentStep / 5) * 100}%`,
                    backgroundColor: '#58EB9A'
                  }}
                ></div>
              </div>
            </div>

            {/* Question Content */}
            <div className="text-center">
              {/* Step 1 - Business Type */}
              {currentStep === 1 && (
                <>
                  <h3 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2 sm:mb-4">
                    What type of business do you run?
                  </h3>
                  <p className="text-gray-600 text-sm sm:text-base mb-6 sm:mb-8">We will personalize your AI setup based on this.</p>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                    {[
                      { 
                        icon: (
                          <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                          </svg>
                        ), 
                        text: 'eCommerce / DTC' 
                      },
                      { 
                        icon: (
                          <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                          </svg>
                        ), 
                        text: 'Agency / Service business' 
                      },
                      { 
                        icon: (
                          <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                          </svg>
                        ), 
                        text: 'Coaching / Consulting' 
                      },
                      { 
                        icon: (
                          <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                          </svg>
                        ), 
                        text: 'SaaS / Software' 
                      },
                      { 
                        icon: (
                          <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                        ), 
                        text: 'Trades / Local business' 
                      },
                      { 
                        icon: (
                          <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                          </svg>
                        ), 
                        text: 'Other' 
                      }
                    ].map((option, index) => (
                      <button
                        key={index}
                        onClick={() => handleQuestionAnswer(option.text)}
                        className="group p-4 sm:p-6 border-2 border-gray-200 rounded-2xl hover:border-green-400 hover:bg-gradient-to-br hover:from-green-50 hover:to-blue-50 active:border-green-500 active:bg-green-50 active:scale-[0.98] transition-all duration-200 text-left hover:shadow-lg hover:-translate-y-1"
                      >
                        <div className="flex items-center gap-3 sm:gap-4">
                          <div className="p-2.5 sm:p-3 bg-gradient-to-br from-green-100 to-blue-100 group-hover:from-green-200 group-hover:to-blue-200 rounded-xl transition-all duration-300 text-green-600">
                            {option.icon}
                          </div>
                          <div className="font-semibold text-gray-900 group-hover:text-gray-800 text-sm sm:text-base">{option.text}</div>
                        </div>
                      </button>
                    ))}
                  </div>
                </>
              )}

              {/* Step 2 - Automation Goal */}
              {currentStep === 2 && (
                <>
                  <h3 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2 sm:mb-4">
                    What is the first task you would love your AI employee to take off your plate?
                  </h3>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                    {[
                      { 
                        icon: (
                          <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                          </svg>
                        ), 
                        text: 'Chase stale deals automatically' 
                      },
                      { 
                        icon: (
                          <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3a4 4 0 118 0v4m-4 12a4 4 0 01-4-4v-2a4 4 0 014-4h8a4 4 0 014 4v2a4 4 0 01-4 4H8z" />
                          </svg>
                        ), 
                        text: 'Handle scheduling like a pro' 
                      },
                      { 
                        icon: (
                          <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                          </svg>
                        ), 
                        text: 'Reply to customers instantly' 
                      },
                      { 
                        icon: (
                          <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                          </svg>
                        ), 
                        text: 'Track invoices without the hassle' 
                      },
                      { 
                        icon: (
                          <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                          </svg>
                        ), 
                        text: 'Collect reviews effortlessly' 
                      },
                      { 
                        icon: (
                          <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4" />
                          </svg>
                        ), 
                        text: 'Something else? Tell us',
                        isCustom: true
                      }
                    ].map((option, index) => (
                      <button
                        key={index}
                        onClick={() => option.isCustom ? setShowCustomInput(true) : handleQuestionAnswer(option.text)}
                        className="group p-4 sm:p-6 border-2 border-gray-200 rounded-2xl hover:border-green-400 hover:bg-gradient-to-br hover:from-green-50 hover:to-blue-50 active:border-green-500 active:bg-green-50 active:scale-[0.98] transition-all duration-200 text-left hover:shadow-lg hover:-translate-y-1"
                      >
                        <div className="flex items-center gap-3 sm:gap-4">
                          <div className="p-2.5 sm:p-3 bg-gradient-to-br from-green-100 to-blue-100 group-hover:from-green-200 group-hover:to-blue-200 rounded-xl transition-all duration-300 text-green-600">
                            {option.icon}
                          </div>
                          <div className="font-semibold text-gray-900 group-hover:text-gray-800 text-sm sm:text-base">{option.text}</div>
                        </div>
                      </button>
                    ))}
                  </div>
                </>
              )}

              {/* Step 3 - Tech Comfort */}
              {currentStep === 3 && (
                <>
                  <h3 className="text-2xl font-bold text-gray-900 mb-4">
                    How hands-on are you with tech?
                  </h3>
                  
                  <div className="space-y-4">
                    {[
                      { 
                        level: 1, 
                        text: 'Total beginner — I just want it to work',
                        icon: (
                          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        )
                      },
                      { 
                        level: 2, 
                        text: 'Some experience — I have used tools like Zapier or GHL',
                        icon: (
                          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                          </svg>
                        )
                      },
                      { 
                        level: 3, 
                        text: 'Comfortable — I can set things up myself',
                        icon: (
                          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                        )
                      },
                      { 
                        level: 4, 
                        text: 'Technical — I like tinkering and testing',
                        icon: (
                          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                          </svg>
                        )
                      },
                      { 
                        level: 5, 
                        text: 'Founder / Developer — I want full control',
                        icon: (
                          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        )
                      }
                    ].map((option, index) => (
                      <button
                        key={index}
                        onClick={() => handleQuestionAnswer(option.level)}
                        className="group w-full p-6 border-2 border-gray-200 rounded-2xl hover:border-green-400 hover:bg-gradient-to-br hover:from-green-50 hover:to-blue-50 active:border-green-500 active:bg-green-50 active:scale-[0.98] transition-all duration-200 text-left hover:shadow-lg hover:-translate-y-1"
                      >
                        <div className="flex items-center gap-4">
                          <div className="p-3 bg-gradient-to-br from-green-100 to-blue-100 group-hover:from-green-200 group-hover:to-blue-200 rounded-xl transition-all duration-300 text-green-600">
                            {option.icon}
                          </div>
                          <div className="font-semibold text-gray-900 group-hover:text-gray-800">{option.text}</div>
                        </div>
                      </button>
                    ))}
                  </div>
                </>
              )}

              {/* Step 4 - Frustration */}
              {currentStep === 4 && (
                <>
                  <h3 className="text-2xl font-bold text-gray-900 mb-4">
                    What has been your biggest frustration with automation or AI so far?
                  </h3>
                  
                  <div className="space-y-3">
                    {[
                      'Too complex to set up',
                      'Takes too much time',
                      'Does not actually work as promised',
                      'Hard to connect my tools',
                      'Too expensive',
                      'Not personal / sounds robotic',
                      'Other'
                    ].map((option, index) => (
                      <button
                        key={index}
                        onClick={() => handleQuestionAnswer(option)}
                        className="w-full p-4 border-2 border-gray-200 rounded-xl hover:border-green-400 hover:bg-green-50 active:border-green-500 active:bg-green-50 active:scale-[0.98] transition-all duration-200 text-left"
                      >
                        <div className="font-medium text-gray-900">{option}</div>
                      </button>
                    ))}
                  </div>
                </>
              )}

              {/* Step 5 - Urgency */}
              {currentStep === 5 && (
                <>
                  <h3 className="text-2xl font-bold text-gray-900 mb-4">
                    How soon do you want your AI employee live?
                  </h3>
                  
                  <div className="space-y-4">
                    {[
                      { 
                        icon: (
                          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        ), 
                        text: 'ASAP - I need this yesterday' 
                      },
                      { 
                        icon: (
                          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        ), 
                        text: 'Soon - I am exploring options' 
                      },
                      { 
                        icon: (
                          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                        ), 
                        text: 'Just curious for now' 
                      }
                    ].map((option, index) => (
                      <button
                        key={index}
                        onClick={() => handleQuestionAnswer(option.text)}
                        className="group w-full p-6 border-2 border-gray-200 rounded-2xl hover:border-green-400 hover:bg-gradient-to-br hover:from-green-50 hover:to-blue-50 active:border-green-500 active:bg-green-50 active:scale-[0.98] transition-all duration-200 text-left hover:shadow-lg hover:-translate-y-1"
                      >
                        <div className="flex items-center gap-4">
                          <div className="p-3 bg-gradient-to-br from-green-100 to-blue-100 group-hover:from-green-200 group-hover:to-blue-200 rounded-xl transition-all duration-300 text-green-600">
                            {option.icon}
                          </div>
                          <div className="font-semibold text-gray-900 group-hover:text-gray-800">{option.text}</div>
                        </div>
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}

      {/* Custom Input Modal */}
      {showCustomInput && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-6"
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            transition={{ type: 'spring', duration: 0.5 }}
            className="bg-white/95 backdrop-blur-xl rounded-3xl p-8 max-w-lg w-full shadow-2xl relative overflow-hidden border-2"
            style={{ borderColor: '#58EB9A' }}
          >
            {/* Close Button */}
            <button
              onClick={() => setShowCustomInput(false)}
              className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 text-gray-600 hover:text-gray-900 transition-all z-20"
            >
              ✕
            </button>

            <div className="text-center mb-6">
              <div className="text-4xl mb-4">💡</div>
              <h3 className="text-2xl font-bold text-gray-900 mb-2">
                Tell us what you need
              </h3>
              <p className="text-gray-600">
                Describe the automation you'd love to have built for your business
              </p>
            </div>

            <div className="space-y-4">
              <textarea
                value={customInput}
                onChange={(e) => setCustomInput(e.target.value)}
                placeholder="e.g., I want to automatically follow up with leads who haven't responded in 3 days, research them on LinkedIn, and send a personalized message..."
                className="w-full px-5 py-4 bg-white border-2 border-gray-200 rounded-xl text-base outline-none transition-all focus:border-green-400 focus:shadow-lg resize-none"
                rows={4}
                onFocus={(e) => e.currentTarget.style.borderColor = '#58EB9A'}
                onBlur={(e) => e.currentTarget.style.borderColor = '#e5e7eb'}
              />
              
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    if (customInput.trim()) {
                      handleQuestionAnswer(customInput.trim());
                      setShowCustomInput(false);
                      setCustomInput('');
                    }
                  }}
                  className="flex-1 text-white py-3 rounded-xl font-semibold transition-all hover:scale-105 shadow-lg"
                  style={{ backgroundColor: '#58EB9A' }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#4ADE80'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#58EB9A'}
                >
                  Continue
                </button>
                <button
                  onClick={() => setShowCustomInput(false)}
                  className="px-6 py-3 text-gray-500 hover:text-gray-700 font-medium transition-all"
                >
                  Cancel
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}

      {/* Celebration Modal */}
      {showCelebration && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-6"
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            transition={{ type: 'spring', duration: 0.5 }}
            className="bg-white/95 backdrop-blur-xl rounded-3xl p-10 max-w-md w-full shadow-2xl relative overflow-hidden border-2 text-center"
            style={{ borderColor: '#58EB9A' }}
          >
            {/* Close Button */}
            <button
              onClick={() => setShowCelebration(false)}
              className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 text-gray-600 hover:text-gray-900 transition-all z-20"
            >
              ✕
            </button>

            {/* Confetti - bursting upward from bottom */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden">
              {[...Array(40)].map((_, i) => {
                const angle = (Math.random() - 0.5) * 120; // Random angle between -60 and 60 degrees
                const distance = 200 + Math.random() * 300; // Random distance
                const rotation = Math.random() * 360;
                return (
                  <motion.div
                    key={i}
                    initial={{ 
                      x: '50%',
                      y: '100%',
                      opacity: 1,
                      rotate: 0,
                      scale: 1
                    }}
                    animate={{ 
                      x: `calc(50% + ${Math.sin(angle * Math.PI / 180) * distance}px)`,
                      y: `calc(100% - ${Math.cos(angle * Math.PI / 180) * distance}px)`,
                      opacity: 0,
                      rotate: rotation,
                      scale: 0.5
                    }}
                    transition={{ 
                      duration: 1.2,
                      delay: i * 0.02,
                      ease: [0.2, 0.8, 0.2, 1]
                    }}
                    className="absolute text-2xl"
                  >
                    {['🎉', '✨', '🎊', '⭐'][i % 4]}
                  </motion.div>
                );
              })}
            </div>

            <div className="relative z-10">
              <div className="text-6xl mb-4">🎉</div>
              <h3 className="text-3xl font-bold text-gray-900 mb-3">
                You're on the list!
              </h3>
              <p className="text-lg text-gray-600 mb-6">
                You have also been entered to win 1 of 10 free AI employee builds.
              </p>
              
              <div className="space-y-4">
                <p className="font-medium text-gray-700">Share your unique link to move up the waitlist ⬇️</p>
                <div className="flex gap-3">
                  <button className="flex-1 px-4 py-3 bg-gray-100 border border-gray-300 rounded-xl text-gray-700 hover:bg-gray-200 font-medium transition-all">
                    📋 Copy Link
                  </button>
                  <button className="flex-1 px-4 py-3 bg-black text-white rounded-xl hover:bg-gray-800 font-medium transition-all">
                    🐦 Share on X
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </div>
  );
};

export default LandingPage;

