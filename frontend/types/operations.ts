export enum TripStatus {
  ON_SCHEDULE = 'On Schedule',
  DELAYED = 'Delayed',
  AT_RISK = 'At Risk',
  ISSUE_REPORTED = 'Issue Reported',
  RE_OPTIMIZING = 'Re-optimizing',
  AWAITING_APPROVAL = 'Awaiting Approval'
}

export interface Family {
  id: string;
  name: string;
  size: number;
  tourId: string;
  tourName: string;
  currentCity: string;
  localTime: string;
  nextSegment: string;
  status: TripStatus;
  sentiment: 'Very Satisfied' | 'Neutral' | 'Unsatisfied';
  tags: string[];
}

export interface ItinerarySegment {
  id: string;
  time: string;
  activity: string;
  location: string;
  type: 'Flight' | 'Hotel' | 'Bus' | 'POI' | 'Meal';
  status: 'Completed' | 'Current' | 'Planned' | 'Delayed' | 'Cancelled';
}

export interface KPI {
  label: string;
  value: string | number;
  delta: string;
  isPositive: boolean;
}

export interface Issue {
  id: string;
  severity: 'Critical' | 'Moderate';
  description: string;
  familyId: string;
  familyName: string;
  timestamp: string;
}
