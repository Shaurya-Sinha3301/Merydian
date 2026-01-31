'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Icon from '@/components/ui/AppIcon';
import DestinationSelector from './DestinationSelector';
import DateRangePicker from './DateRangePicker';
import BudgetRangeSlider from './BudgetRangeSlider';
import GroupComposition from './GroupComposition';
import TravelerPreferences from './TravelerPreferences';
import PlacePreferences from './PlacePreferences';
import ProgressIndicator from './ProgressIndicator';

interface TravelerPreference {
  id: string;
  name: string;
  type: 'adult' | 'child' | 'senior';
  interests: string[];
  constraints: string[];
  mobilityLevel: string;
  timeLimit: string;
}

interface FormData {
  destination: string;
  startDate: string;
  endDate: string;
  minBudget: number;
  maxBudget: number;
  adults: number;
  children: number;
  seniors: number;
  travelerPreferences: TravelerPreference[];
  mustVisit: string[];
  placesToAvoid: string[];
}

interface FormErrors {
  destination?: string;
  startDate?: string;
  endDate?: string;
  budget?: string;
  group?: string;
}

const TripRequestInteractive = () => {
  const router = useRouter();
  const [isHydrated, setIsHydrated] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [showSaveConfirmation, setShowSaveConfirmation] = useState(false);
  const [showSubmitConfirmation, setShowSubmitConfirmation] = useState(false);

  const [formData, setFormData] = useState<FormData>({
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

  const [errors, setErrors] = useState<FormErrors>({});

  useEffect(() => {
    setIsHydrated(true);
  }, []);

  useEffect(() => {
    if (!isHydrated) return;
    
    const totalTravelers = formData.adults + formData.children + formData.seniors;
    const currentPreferencesCount = formData.travelerPreferences.length;

    if (totalTravelers !== currentPreferencesCount) {
      const newPreferences: TravelerPreference[] = [];
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

        const existingPref = formData.travelerPreferences.find((p) => p.id === `${type}-${i}`);

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

      setFormData((prev) => ({ ...prev, travelerPreferences: newPreferences }));
    }
  }, [formData.adults, formData.children, formData.seniors, isHydrated]);

  const validateStep = (step: number): boolean => {
    const newErrors: FormErrors = {};

    if (step === 1) {
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
    }

    if (step === 2) {
      if (formData.minBudget >= formData.maxBudget) {
        newErrors.budget = 'Maximum budget must be greater than minimum budget';
      }
      if (formData.adults + formData.children + formData.seniors === 0) {
        newErrors.group = 'Please add at least one traveler';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (!isHydrated) return;
    if (validateStep(currentStep)) {
      setCurrentStep((prev) => Math.min(prev + 1, 4));
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handlePrevious = () => {
    if (!isHydrated) return;
    setCurrentStep((prev) => Math.max(prev - 1, 1));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSaveDraft = () => {
    if (!isHydrated) return;
    setShowSaveConfirmation(true);
    setTimeout(() => setShowSaveConfirmation(false), 3000);
  };

  const handleSubmit = () => {
    if (!isHydrated) return;
    if (validateStep(currentStep)) {
      setShowSubmitConfirmation(true);
      setTimeout(() => {
        router.push('/customer-itinerary-view');
      }, 2000);
    }
  };

  if (!isHydrated) {
    return (
      <div className="min-h-screen bg-background">
        <ProgressIndicator currentStep={currentStep} totalSteps={4} />
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-8">
          <div className="bg-card rounded-lg shadow-elevation-2 p-6">
            <div className="animate-pulse space-y-4">
              <div className="h-8 bg-muted rounded w-1/3" />
              <div className="h-4 bg-muted rounded w-2/3" />
              <div className="h-12 bg-muted rounded" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24 md:pb-8">
      <ProgressIndicator currentStep={currentStep} totalSteps={4} />

      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-8">
        <div className="neu-flat rounded-3xl p-6 md:p-8">
          {/* Step 1: Basic Details */}
          {currentStep === 1 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-semibold text-foreground mb-2">Basic Trip Details</h2>
                <p className="text-sm text-muted-foreground">
                  Let's start with where and when you want to travel
                </p>
              </div>

              <DestinationSelector
                value={formData.destination}
                onChange={(value) => setFormData((prev) => ({ ...prev, destination: value }))}
                error={errors.destination}
              />

              <DateRangePicker
                startDate={formData.startDate}
                endDate={formData.endDate}
                onStartDateChange={(date) => setFormData((prev) => ({ ...prev, startDate: date }))}
                onEndDateChange={(date) => setFormData((prev) => ({ ...prev, endDate: date }))}
                startError={errors.startDate}
                endError={errors.endDate}
              />
            </div>
          )}

          {/* Step 2: Budget & Group */}
          {currentStep === 2 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-semibold text-foreground mb-2">Budget & Travelers</h2>
                <p className="text-sm text-muted-foreground">
                  Set your budget range and tell us who's traveling
                </p>
              </div>

              <BudgetRangeSlider
                minBudget={formData.minBudget}
                maxBudget={formData.maxBudget}
                onMinChange={(value) => setFormData((prev) => ({ ...prev, minBudget: value }))}
                onMaxChange={(value) => setFormData((prev) => ({ ...prev, maxBudget: value }))}
                error={errors.budget}
              />

              <GroupComposition
                adults={formData.adults}
                children={formData.children}
                seniors={formData.seniors}
                onAdultsChange={(value) => setFormData((prev) => ({ ...prev, adults: value }))}
                onChildrenChange={(value) => setFormData((prev) => ({ ...prev, children: value }))}
                onSeniorsChange={(value) => setFormData((prev) => ({ ...prev, seniors: value }))}
                error={errors.group}
              />
            </div>
          )}

          {/* Step 3: Individual Preferences */}
          {currentStep === 3 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-semibold text-foreground mb-2">Individual Preferences</h2>
                <p className="text-sm text-muted-foreground">
                  Customize preferences for each traveler in your group
                </p>
              </div>

              <TravelerPreferences
                adults={formData.adults}
                children={formData.children}
                seniors={formData.seniors}
                preferences={formData.travelerPreferences}
                onPreferencesChange={(prefs) =>
                  setFormData((prev) => ({ ...prev, travelerPreferences: prefs }))
                }
              />
            </div>
          )}

          {/* Step 4: Place Preferences */}
          {currentStep === 4 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-semibold text-foreground mb-2">Place Preferences</h2>
                <p className="text-sm text-muted-foreground">
                  Add must-visit places and locations you'd like to avoid
                </p>
              </div>

              <PlacePreferences
                mustVisit={formData.mustVisit}
                placesToAvoid={formData.placesToAvoid}
                onMustVisitChange={(places) => setFormData((prev) => ({ ...prev, mustVisit: places }))}
                onPlacesToAvoidChange={(places) =>
                  setFormData((prev) => ({ ...prev, placesToAvoid: places }))
                }
              />
            </div>
          )}

          {/* Navigation Buttons */}
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-between space-y-3 sm:space-y-0 sm:space-x-4">
            <button
              onClick={handlePrevious}
              disabled={currentStep === 1}
              className="w-full sm:w-auto px-6 py-3 rounded-2xl neu-button text-foreground font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-smooth flex items-center justify-center space-x-2"
            >
              <Icon name="ChevronLeftIcon" size={20} />
              <span>Previous</span>
            </button>

            <div className="flex items-center space-x-3 w-full sm:w-auto">
              <button
                onClick={handleSaveDraft}
                className="flex-1 sm:flex-none px-6 py-3 rounded-2xl neu-button text-muted-foreground hover:text-foreground font-medium transition-smooth flex items-center justify-center space-x-2"
              >
                <Icon name="BookmarkIcon" size={20} />
                <span>Save Draft</span>
              </button>

              {currentStep === 4 ? (
                <button
                  onClick={handleSubmit}
                  className="flex-1 sm:flex-none px-6 py-3 rounded-2xl bg-primary text-primary-foreground font-medium shadow-neu-md hover:shadow-neu-lg transition-smooth flex items-center justify-center space-x-2"
                >
                  <span>Submit Request</span>
                  <Icon name="PaperAirplaneIcon" size={20} />
                </button>
              ) : (
                <button
                  onClick={handleNext}
                  className="flex-1 sm:flex-none px-6 py-3 rounded-2xl bg-primary text-primary-foreground font-medium shadow-neu-md hover:shadow-neu-lg transition-smooth flex items-center justify-center space-x-2"
                >
                  <span>Next</span>
                  <Icon name="ChevronRightIcon" size={20} />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Save Confirmation */}
      {showSaveConfirmation && (
        <div className="fixed bottom-4 right-4 neu-raised rounded-2xl p-4 shadow-neu-lg animate-slide-in-from-bottom">
          <div className="flex items-center space-x-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-success/20">
              <Icon name="CheckCircleIcon" size={24} className="text-success" variant="solid" />
            </div>
            <div>
              <div className="text-sm font-medium text-foreground">Draft Saved</div>
              <div className="caption text-xs text-muted-foreground">You can continue later</div>
            </div>
          </div>
        </div>
      )}

      {/* Submit Confirmation */}
      {showSubmitConfirmation && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in">
          <div className="neu-raised rounded-3xl p-8 max-w-md mx-4 animate-slide-in-from-bottom">
            <div className="text-center space-y-4">
              <div className="flex justify-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-success/20">
                  <Icon name="CheckCircleIcon" size={40} className="text-success" variant="solid" />
                </div>
              </div>
              <div>
                <h3 className="text-xl font-semibold text-foreground mb-2">Request Submitted!</h3>
                <p className="text-sm text-muted-foreground">
                  Your trip request has been submitted successfully. Redirecting to your itinerary...
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TripRequestInteractive;