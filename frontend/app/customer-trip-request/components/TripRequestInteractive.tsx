'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Icon from '@/components/ui/AppIcon';
import DestinationSelector from './DestinationSelector';
import DateRangePicker from './DateRangePicker';
import BudgetRangeSlider from './BudgetRangeSlider';
import GroupComposition from './GroupComposition';
import TravelerPreferences from './TravelerPreferences';
import PlacePreferences from './PlacePreferences';
// import ProgressIndicator from './ProgressIndicator'; // No longer needed

// Upload Component
const DocumentUpload = () => {
  return (
    <div className="space-y-4">
      <div className="border-2 border-dashed border-gray-300 rounded-2xl p-6 text-center hover:border-primary/50 transition-colors cursor-pointer bg-white">
        <div className="mx-auto h-12 w-12 text-gray-400">
          <Icon name="DocumentTextIcon" size={48} />
        </div>
        <div className="mt-4">
          <p className="text-sm font-medium text-gray-900">Upload ID / Passport Copies</p>
          <p className="text-xs text-gray-500 mt-1">Drag and drop or click to upload</p>
        </div>
      </div>
      <div className="flex gap-3">
        <div className="flex-1 bg-white p-3 rounded-xl border border-gray-100 flex items-center gap-3">
          <div className="h-8 w-8 bg-blue-100 rounded-lg flex items-center justify-center text-blue-600">
            <span className="text-xs font-bold">PDF</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">Family_Passports.pdf</p>
            <p className="text-xs text-green-600">Uploaded</p>
          </div>
          <button className="text-gray-400 hover:text-red-500"><Icon name="XMarkIcon" size={16} /></button>
        </div>
      </div>
    </div>
  );
};

// Main Component Content (wrapped in Suspense below)
const TripRequestContent = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isHydrated, setIsHydrated] = useState(false);
  // const [currentStep, setCurrentStep] = useState(1); // Deleted
  const [showSaveConfirmation, setShowSaveConfirmation] = useState(false);
  const [showSubmitConfirmation, setShowSubmitConfirmation] = useState(false);

  // Check for pre-selected itinerary
  const selectedItinerary = searchParams.get('itinerary');

  // Active section for sidebar highlighting
  const [activeSection, setActiveSection] = useState('basics');

  const [formData, setFormData] = useState<any>({
    destination: '',
    startDate: '',
    endDate: '',
    minBudget: 2000,
    maxBudget: 8000,
    adults: 2,
    children: 0,
    seniors: 0,
    travelerPreferences: [],
    mustVisit: [],
    placesToAvoid: [],
  });

  const [errors, setErrors] = useState<any>({});

  useEffect(() => {
    setIsHydrated(true);

    // Auto-fill if itinerary param exists
    if (selectedItinerary === 'delhi_grand_tour') {
      setFormData((prev: any) => ({
        ...prev,
        destination: 'Delhi, India',
        startDate: '2026-03-15',
        endDate: '2026-03-18'
      }));
    }

    // Simple scroll spy
    const handleScroll = () => {
      const sections = ['basics', 'documents', 'budget'];
      for (const section of sections) {
        const element = document.getElementById(section);
        if (element) {
          const rect = element.getBoundingClientRect();
          if (rect.top >= 0 && rect.top <= 300) {
            setActiveSection(section);
            break;
          }
        }
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [selectedItinerary]);

  useEffect(() => {
    if (!isHydrated) return;

    const totalTravelers = formData.adults + formData.children + formData.seniors;
    const currentPreferencesCount = formData.travelerPreferences.length;

    if (totalTravelers !== currentPreferencesCount) {
      const newPreferences: any[] = [];
      let adultCount = 0;
      let childCount = 0;
      let seniorCount = 0;

      for (let i = 0; i < totalTravelers; i++) {
        let type: 'adult' | 'child' | 'senior';
        let name: string;

        if (adultCount < formData.adults) {
          type = 'adult';
          adultCount++;
          name = `Adult ${adultCount}`;
        } else if (childCount < formData.children) {
          type = 'child';
          childCount++;
          name = `Child ${childCount}`;
        } else {
          type = 'senior';
          seniorCount++;
          name = `Senior ${seniorCount}`;
        }

        const existingPref = formData.travelerPreferences.find((p: any) => p.id === `${type}-${i}`);

        newPreferences.push(
          existingPref || {
            id: `${type}-${i}`,
            name,
            type,
            interests: [],
            constraints: [],
            mobilityLevel: 'high',
            timeLimit: 'flexible',
          }
        );
      }

      setFormData((prev: any) => ({ ...prev, travelerPreferences: newPreferences }));
    }
  }, [formData.adults, formData.children, formData.seniors, isHydrated]);

  const validateForm = (): boolean => {
    const newErrors: any = {};

    if (!formData.destination.trim()) {
      newErrors.destination = 'Please select a destination';
    }
    if (!formData.startDate) {
      newErrors.startDate = 'Please select a start date';
    }
    if (!formData.endDate) {
      newErrors.endDate = 'Please select an end date';
    }
    if (formData.startDate && formData.endDate && formData.startDate >= formData.endDate) {
      newErrors.endDate = 'End date must be after start date';
    }
    if (formData.minBudget >= formData.maxBudget) {
      newErrors.budget = 'Maximum budget must be greater than minimum budget';
    }
    if (formData.adults + formData.children + formData.seniors === 0) {
      newErrors.group = 'Please add at least one traveler';
    }

    setErrors(newErrors);

    // Scroll to error if any
    if (Object.keys(newErrors).length > 0) {
      const firstErrorKey = Object.keys(newErrors)[0];
      let sectionId = 'basics';
      if (firstErrorKey === 'budget' || firstErrorKey === 'group') sectionId = 'budget';
      const element = document.getElementById(sectionId);
      element?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    return Object.keys(newErrors).length === 0;
  };

  const handleSaveDraft = () => {
    if (!isHydrated) return;
    setShowSaveConfirmation(true);
    setTimeout(() => setShowSaveConfirmation(false), 3000);
  };

  const handleSubmit = async () => {
    // Simplified submit for demo flow
    try {
      const payload = {
        trip_name: selectedItinerary ? "Delhi Grand Tour" : `Trip to ${formData.destination}`,
        destination: formData.destination,
        start_date: formData.startDate,
        end_date: formData.endDate,
        baseline_itinerary: "delhi_3day_skeleton",
        families: [
          {
            family_id: "placeholder_will_be_replaced_by_backend",
            family_name: "My Family",
            members: formData.adults + formData.children + formData.seniors,
            children: formData.children,
            budget_sensitivity: 0.5,
            energy_level: 0.5,
            pace_preference: "moderate",
            interest_vector: {
              history: 0.8,
              food: 0.8,
              culture: 0.8,
              nature: 0.5,
              shopping: 0.5,
              adventure: 0.5,
              religious: 0.5,
              nightlife: 0.5,
              architecture: 0.5
            },
            must_visit_locations: formData.mustVisit,
            never_visit_locations: formData.placesToAvoid,
            dietary_restrictions: [],
            accessibility_needs: []
          }
        ]
      };

      // TEMPORARILY DISABLED: Backend connection bypassed for testing
      // const { apiClient } = await import('@/services/api');
      // await apiClient.initializeTrip(payload);
      console.log("TEMPORARY BYPASS: Backend call skipped", payload);

      setShowSubmitConfirmation(true);
      setTimeout(() => {
        router.push('/customer-dashboard');
      }, 2000);
    } catch (error) {
      console.error("Failed to initialize trip:", error);
      alert("Trip creation failed. Please try again.");
    }
  };

  const scrollToSection = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    setActiveSection(id); // Optimistic update
  };

  if (!isHydrated) {
    return null;
  }

  const NavItem = ({ id, label, icon }: any) => (
    <button
      onClick={() => scrollToSection(id)}
      className={`w-full text-left px-4 py-3 rounded-xl flex items-center gap-3 transition-smooth ${activeSection === id
        ? 'bg-primary text-white shadow-neu-sm'
        : 'text-gray-500 hover:bg-gray-100 hover:text-gray-900'
        }`}
    >
      <Icon name={icon} size={18} className={activeSection === id ? 'text-white' : 'text-gray-400'} />
      <span className="text-sm font-medium">{label}</span>
    </button>
  );

  return (
    <div className="min-h-screen bg-[#F0F2F5] pb-24 relative">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">

        <div className="flex flex-col lg:flex-row gap-8">
          {/* Sidebar Navigation - Sticky */}
          <div className="lg:w-64 flex-shrink-0 hidden lg:block">
            <div className="sticky top-24 space-y-2">
              <div className="px-4 mb-4">
                <h1 className="text-xl font-bold text-gray-900">
                  {selectedItinerary ? 'Finalize Details' : 'Plan Your Trip'}
                </h1>
                <p className="text-xs text-gray-500 mt-1">
                  {selectedItinerary ? 'Complete your booking' : 'Complete all sections'}
                </p>
              </div>
              <nav className="space-y-1">
                <NavItem id="basics" label="Trip Details" icon="MapPinIcon" />
                <NavItem id="documents" label="Documents" icon="DocumentTextIcon" />
                <NavItem id="budget" label="Travelers" icon="UserGroupIcon" />
              </nav>
            </div>
          </div>

          {/* Main Content - Scrollable */}
          <div className="flex-1 space-y-8">

            {/* Show selected itinerary banner */}
            {selectedItinerary && (
              <div className="bg-gradient-to-r from-gray-900 to-gray-800 rounded-3xl p-6 text-white shadow-lg flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold">Mock Itinerary Selected</h2>
                  <p className="text-sm text-gray-300">Delhi Grand Tour • 3 Days</p>
                </div>
                <div className="bg-white/10 px-3 py-1 rounded-full text-xs font-medium backdrop-blur-sm">
                  Change
                </div>
              </div>
            )}

            {/* Section 1: Basic Details */}
            <section id="basics" className="bg-[#F0F2F5] neu-raised rounded-3xl p-6 md:p-8 scroll-mt-24 border border-white/50">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Trip Details</h2>
              <div className="space-y-6">
                <DestinationSelector
                  value={formData.destination}
                  onChange={(val) => setFormData((p: any) => ({ ...p, destination: val }))}
                  error={errors.destination}
                />
                <DateRangePicker
                  startDate={formData.startDate}
                  endDate={formData.endDate}
                  onStartDateChange={(d) => setFormData((p: any) => ({ ...p, startDate: d }))}
                  onEndDateChange={(d) => setFormData((p: any) => ({ ...p, endDate: d }))}
                  startError={errors.startDate}
                  endError={errors.endDate}
                />
              </div>
            </section>

            {/* Section 2: Documents */}
            <section id="documents" className="bg-[#F0F2F5] neu-raised rounded-3xl p-6 md:p-8 scroll-mt-24 border border-white/50">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Required Documents</h2>
              <p className="text-sm text-gray-500 mb-6">Upload government ID for all travelers</p>
              <DocumentUpload />
            </section>

            {/* Section 3: Budget & Group */}
            <section id="budget" className="bg-[#F0F2F5] neu-raised rounded-3xl p-6 md:p-8 scroll-mt-24 border border-white/50 mb-20 md:mb-0">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Travelers & preferences</h2>
              <GroupComposition
                adults={formData.adults}
                children={formData.children}
                seniors={formData.seniors}
                onAdultsChange={(v) => setFormData((p: any) => ({ ...p, adults: v }))}
                onChildrenChange={(v) => setFormData((p: any) => ({ ...p, children: v }))}
                onSeniorsChange={(v) => setFormData((p: any) => ({ ...p, seniors: v }))}
                error={errors.group}
              />
            </section>

          </div>
        </div>
      </div>

      {/* Floating Action Buttons / Sticky Footer on Mobile */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-white/80 backdrop-blur-md border-t border-gray-200 lg:sticky lg:bottom-8 lg:bg-transparent lg:border-none lg:backdrop-filter-none flex justify-center lg:justify-end lg:px-8 gap-4 z-40">
        <button
          onClick={handleSubmit}
          className="flex-[2] lg:flex-none lg:w-64 px-8 py-4 rounded-2xl bg-gray-900 text-white font-bold shadow-lg hover:bg-black hover:scale-[1.02] active:scale-[0.98] transition-smooth flex items-center justify-center gap-2"
        >
          <span>Confim & Create Trip</span>
          <Icon name="SparklesIcon" size={20} className="text-yellow-400" variant="solid" />
        </button>
      </div>

      {/* Submit Confirmation */}
      {showSubmitConfirmation && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in">
          <div className="bg-white rounded-3xl p-8 max-w-md mx-4 animate-slide-in-from-bottom shadow-2xl">
            <div className="text-center space-y-4">
              <div className="flex justify-center">
                <div className="flex h-20 w-20 items-center justify-center rounded-full bg-green-100 animate-bounce">
                  <Icon name="CheckCircleIcon" size={48} className="text-green-600" variant="solid" />
                </div>
              </div>
              <div>
                <h3 className="text-2xl font-bold text-gray-900 mb-2">Trip Created!</h3>
                <p className="text-gray-500">Redirecting to dashboard...</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Main Export
const TripRequestInteractive = () => {
  return (
    <Suspense fallback={<div className="p-8 text-center text-gray-500">Loading trip details...</div>}>
      <TripRequestContent />
    </Suspense>
  );
};

export default TripRequestInteractive;