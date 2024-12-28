import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card"
import { Button } from "../components/ui/button"
import { Alert, AlertDescription } from "../components/ui/alert"
import { Plus, Trash2, ChevronDown, ChevronUp, Calculator, Info } from 'lucide-react';
import Papa, { ParseResult } from 'papaparse';
import { 
  format, 
  isWeekend, 
  differenceInDays, 
  addDays, 
  isEqual, 
  parse 
} from 'date-fns';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "../components/ui/tooltip"

// Types for your state
interface HoldPeriod {
  id: string;
  type: string;
  start: string;
  end: string;
}

interface Extension {
  id: string;
  days: number;
}

interface WorkingDaysResult {
  workingDays: number;
  weekends: number;
  holidays: number;
}

interface CalculationResult {
  totalDays: number;
  holdDays: number;
  extensionDays: number;
  finalDays: number;
  maxDays: number;
  isOvertime: boolean;
  details: {
    weekends: number;
    holidays: number;
    holdPeriodDetails: Array<{
      type: string;
      days: number;
      start: string;
      end: string;
    }>;
  };
}

// For intervals
interface DateInterval {
  start: Date;
  end: Date;
}

// Define hold period types
const HOLD_PERIOD_TYPES = {
  's88E': 'Written Approvals s88E',
  's88H': 'Awaiting Deposit s88H',
  's91': 'Additional Consents s91',
  's91A': 'Suspension Notified Application s91A',
  's91D': 'Suspension Non-Notified Application s91D',
  's92': 'Request for Information s92',
  'other': 'Other'
} as const;

/**
 * 1) Standard (Non-Notified) — 20 days
 * 2) Fast-Track — 10 days
 * 3) Limited Notified — 100 days
 * 4) Publicly Notified — 130 days
 */
const CONSENT_TYPES = {
  standard: {
    label: 'Standard (Non-Notified) — 20 days',
    baseDays: 20,
  },
  fastTrack: {
    label: 'Fast-Track — 10 days',
    baseDays: 10,
  },
  limitedNotified: {
    label: 'Limited Notified — 100 days',
    baseDays: 100,
  },
  publiclyNotified: {
    label: 'Publicly Notified — 130 days',
    baseDays: 130,
  },
} as const;

const ConsentCalculator: React.FC = () => {
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [holdPeriods, setHoldPeriods] = useState<HoldPeriod[]>([]);
  const [extensions, setExtensions] = useState<Extension[]>([]);
  const [nonWorkingDays, setNonWorkingDays] = useState<Date[]>([]);
  const [result, setResult] = useState<CalculationResult | null>(null);
  const [showAudit, setShowAudit] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [applicationType, setApplicationType] = useState<keyof typeof CONSENT_TYPES>('standard');

  useEffect(() => {
    const loadNonWorkingDays = async () => {
      try {
        const response: Response = await fetch('/non-working-days.csv');
        const text: string = await response.text();
        
        Papa.parse(text, {
          complete: (results: ParseResult<string[]>) => {
            const parsedDates = results.data
              .flat()
              .filter(Boolean)
              .map((dateStr: string) => {
                // Parse as dd/MM/yyyy
                const parsedDate = parse(dateStr, 'd/MM/yyyy', new Date());
                return parsedDate;
              })
              .filter((date: Date) => !isNaN(date.getTime()));

            setNonWorkingDays(parsedDates);
          },
          error: (error: Error) => {
            console.error('Error parsing CSV:', error);
          }
        });
      } catch (error: unknown) {
        console.error('Error loading non-working days:', error);
      }
    };
    loadNonWorkingDays();
  }, []);

  // Check if a date is a working day
  const isWorkingDay = (date: Date): boolean => {
    if (isWeekend(date)) return false;
    return !nonWorkingDays.some(holiday =>
      isEqual(
        new Date(holiday.setHours(0,0,0,0)), 
        new Date(date.setHours(0,0,0,0))
      )
    );
  };

  // Calculate working days in a given interval
  const calculateWorkingDays = (start: Date, end: Date): WorkingDaysResult => {
    let workingDays = 0;
    let weekends = 0;
    let holidays = 0;
    let current = new Date(start);

    while (current <= end) {
      if (isWeekend(current)) {
        weekends++;
      } else if (!isWorkingDay(current)) {
        holidays++;
      } else {
        workingDays++;
      }
      current = addDays(current, 1);
    }

    return { workingDays, weekends, holidays };
  };

  // Merge overlapping intervals
  const mergeIntervals = (intervals: DateInterval[]): DateInterval[] => {
    if (!intervals.length) return [];

    intervals.sort((a, b) => a.start.getTime() - b.start.getTime());

    const merged: DateInterval[] = [];
    let current = intervals[0];

    for (let i = 1; i < intervals.length; i++) {
      const next = intervals[i];
      if (next.start.getTime() <= current.end.getTime() + 1) {
        // Overlapping or touching
        current.end = new Date(Math.max(current.end.getTime(), next.end.getTime()));
      } else {
        merged.push(current);
        current = next;
      }
    }
    merged.push(current);

    return merged;
  };

  // Clamps a hold interval so it only counts within the main date range
  const clampIntervalToRange = (
    holdStart: Date, 
    holdEnd: Date, 
    mainStart: Date, 
    mainEnd: Date
  ): DateInterval | null => {
    if (holdEnd < mainStart || holdStart > mainEnd) {
      return null;
    }
    const clampedStart = new Date(Math.max(holdStart.getTime(), mainStart.getTime()));
    const clampedEnd = new Date(Math.min(holdEnd.getTime(), mainEnd.getTime()));

    if (clampedStart > clampedEnd) {
      return null;
    }
    return { start: clampedStart, end: clampedEnd };
  };

  // Add a new hold period
  const addHoldPeriod = () => {
    const newHoldPeriod: HoldPeriod = {
      id: crypto.randomUUID(),
      type: 's92',
      start: '',
      end: ''
    };
    setHoldPeriods([...holdPeriods, newHoldPeriod]);
  };

  // Remove a hold period
  const removeHoldPeriod = (id: string) => {
    setHoldPeriods(holdPeriods.filter(period => period.id !== id));
  };

  // Add a new extension
  const addExtension = () => {
    const newExtension: Extension = {
      id: crypto.randomUUID(),
      days: 0
    };
    setExtensions([...extensions, newExtension]);
  };

  // Remove an extension
  const removeExtension = (id: string) => {
    setExtensions(extensions.filter(ext => ext.id !== id));
  };

  // Calculate final result
  const calculateResult = () => {
    setValidationError(null);

    if (!startDate && !endDate) {
      setValidationError("Please enter both lodgement date and decision date");
      return;
    } else if (!startDate) {
      setValidationError("Please enter a lodgement date");
      return;
    } else if (!endDate) {
      setValidationError("Please enter a decision date");
      return;
    }

    const mainStart = new Date(startDate);
    const mainEnd = new Date(endDate);

    if (mainEnd < mainStart) {
      setValidationError("Decision date must be after lodgement date");
      return;
    }

    // (1) Calculate total working days
    const { workingDays: totalDays, weekends, holidays } = calculateWorkingDays(mainStart, mainEnd);

    // (2) Convert hold periods to intervals & clamp them
    const holdIntervals: Array<{
      type: string;
      interval: DateInterval;
    }> = holdPeriods
      .filter(p => p.start && p.end)
      .map(p => ({
        type: p.type,
        interval: {
          start: new Date(p.start),
          end: new Date(p.end),
        },
      }))
      .filter(({ interval }) => 
        !isNaN(interval.start.getTime()) && !isNaN(interval.end.getTime())
      )
      .map(obj => {
        const clamped = clampIntervalToRange(obj.interval.start, obj.interval.end, mainStart, mainEnd);
        return {
          type: obj.type,
          interval: clamped,
        };
      })
      .filter(obj => obj.interval !== null) as Array<{
        type: string;
        interval: DateInterval;
      }>;

    // (3) For display in the audit
    const holdPeriodDetails = holdIntervals.map(obj => {
      const { workingDays } = calculateWorkingDays(obj.interval.start, obj.interval.end);
      return {
        type: obj.type,
        days: workingDays,
        start: obj.interval.start.toISOString(),
        end: obj.interval.end.toISOString(),
      };
    });

    // (4) Merge intervals & avoid double-count
    const merged = mergeIntervals(holdIntervals.map(h => h.interval));
    // (5) Sum up holdDays
    let holdDays = 0;
    merged.forEach(({ start, end }) => {
      const { workingDays } = calculateWorkingDays(start, end);
      holdDays += workingDays;
    });

    // (6) Extension days
    const extensionDays = extensions.reduce((sum, ext) => sum + (ext.days || 0), 0);

    // (7) Base working days from applicationType
    const baseDays = CONSENT_TYPES[applicationType].baseDays;
    const maxDays = baseDays + extensionDays;

    // (8) Final working days
    const finalDays = totalDays - holdDays;

    setResult({
      totalDays,
      holdDays,
      extensionDays,
      finalDays,
      maxDays,
      isOvertime: finalDays > maxDays,
      details: {
        weekends,
        holidays,
        holdPeriodDetails
      }
    });
  };

  return (
    <Card className="w-full max-w-2xl mx-auto shadow-lg border-0">
      <CardHeader className="bg-gradient-to-r from-[#3c5c17] to-[#6ba32a] text-white rounded-t-lg pb-6">
        <CardTitle className="text-2xl font-bold">RMA Timeframes Calculator</CardTitle>
        <p className="text-sm opacity-80 mt-1">
          Calculate processing timeframes for resource consent applications
        </p>
      </CardHeader>

      <CardContent className="space-y-6 pt-6">

        {/* Application Type Box */}
        <div className="bg-gray-100 p-6 border border-gray-100 shadow-inner rounded-lg">
          <div className="space-y-1">
            <h3 className="text-base font-semibold text-gray-700">Application Type</h3>
            <p className="text-xs text-gray-500">
              Select the application type to set the timeframes that will apply
            </p>
          </div>

          <select
            className="w-full mt-3 p-2.5 border border-gray-200 rounded-md shadow-sm
                       focus:ring-2 focus:ring-[#3c5c17] focus:border-[#3c5c17]"
            value={applicationType}
            onChange={(e) => setApplicationType(e.target.value as keyof typeof CONSENT_TYPES)}
          >
            {Object.entries(CONSENT_TYPES).map(([key, info]) => (
              <option key={key} value={key}>
                {info.label}
              </option>
            ))}
          </select>
        </div>

        {/* Date inputs section */}
        <div className="bg-gray-100 rounded-lg p-6 border border-gray-100 shadow-inner">
          <div className="grid grid-cols-2 gap-8">
            {/* Lodgement Date Input */}
            <div className="space-y-3">
              <h3 className="text-base font-semibold text-gray-700">
                Lodgement Date
                <span className="ml-1 font-normal text-gray-500">(Day 0)</span>
                <span className="block text-xs font-normal text-gray-500 mt-1">
                  Start of processing timeframe
                </span>
              </h3>
              <input
                type="date"
                className="w-full p-3 border border-gray-200 rounded-md shadow-sm
                           focus:ring-2 focus:ring-[#3c5c17] focus:border-[#3c5c17]
                           transition-colors duration-200"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>

            {/* Decision Date Input */}
            <div className="space-y-3">
              <h3 className="text-base font-semibold text-gray-700">
                Decision Date
                <span className="block text-xs font-normal text-gray-500 mt-1">
                  End of processing timeframe
                </span>
              </h3>
              <input
                type="date"
                className="w-full p-3 border border-gray-200 rounded-md shadow-sm
                           focus:ring-2 focus:ring-[#3c5c17] focus:border-[#3c5c17]
                           transition-colors duration-200"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* Hold Periods */}
        <div className="mt-8">
          <div className="bg-gray-50 rounded-lg p-6 border border-gray-100 shadow-inner">
            {/* Header with Add Button */}
            <div className="flex items-center justify-between mb-6">
              <div className="space-y-1">
                <h3 className="text-base font-semibold text-gray-700">Excluded Time Periods</h3>
                <p className="text-xs text-gray-500">Add excluded timeframes, i.e. on hold periods</p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={addHoldPeriod}
                className="bg-white hover:bg-[#3c5c17] hover:text-white border-[#3c5c17] text-[#3c5c17]
                           transition-colors duration-200 flex items-center gap-2"
              >
                <Plus className="w-4 h-4" /> Add Time Period
              </Button>
            </div>

            {/* Hold Period Entries */}
            <div className="space-y-4">
              {holdPeriods.map((period) => (
                <div
                  key={period.id}
                  className="bg-white p-4 rounded-md border border-gray-200 shadow-sm relative"
                >
                  {/* Delete Button */}
                  <div className="absolute top-3 right-3">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeHoldPeriod(period.id)}
                      className="text-red-500 hover:text-red-700 hover:bg-red-50 h-8 w-8 p-0"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>

                  {/* Type Selection Row */}
                  <div className="mb-4 pr-12">
                    <label className="block text-sm font-medium text-gray-600 mb-2">
                      Hold Type
                    </label>
                    <select
                      className="w-full p-2.5 border border-gray-200 rounded-md shadow-sm
                                 focus:ring-2 focus:ring-[#3c5c17] focus:border-[#3c5c17]"
                      value={period.type}
                      onChange={(e) => {
                        const newPeriods = holdPeriods.map((p) =>
                          p.id === period.id ? { ...p, type: e.target.value } : p
                        );
                        setHoldPeriods(newPeriods);
                      }}
                    >
                      {Object.entries(HOLD_PERIOD_TYPES).map(([value, label]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Date Range Row */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-600 mb-2">
                        Start Date
                      </label>
                      <input
                        type="date"
                        className="p-2 border border-gray-200 rounded-md w-full
                                   focus:ring-2 focus:ring-[#3c5c17] focus:border-[#3c5c17]"
                        value={period.start}
                        onChange={(e) => {
                          const newPeriods = holdPeriods.map((p) =>
                            p.id === period.id ? { ...p, start: e.target.value } : p
                          );
                          setHoldPeriods(newPeriods);
                        }}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-600 mb-2">
                        End Date
                      </label>
                      <input
                        type="date"
                        className="p-2 border border-gray-200 rounded-md w-full
                                   focus:ring-2 focus:ring-[#3c5c17] focus:border-[#3c5c17]"
                        value={period.end}
                        onChange={(e) => {
                          const newPeriods = holdPeriods.map((p) =>
                            p.id === period.id ? { ...p, end: e.target.value } : p
                          );
                          setHoldPeriods(newPeriods);
                        }}
                      />
                    </div>
                  </div>
                </div>
              ))}

              {/* Empty State */}
              {holdPeriods.length === 0 && (
                <div className="text-center py-6 text-gray-500 bg-white rounded-md border border-dashed border-gray-300">
                  <p className="text-sm">No hold periods added yet</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Extensions Section */}
        <div className="mt-8">
          <div className="bg-gray-50 rounded-lg p-6 border border-gray-100 shadow-inner">
            {/* Header with Add Button */}
            <div className="flex items-center justify-between mb-6">
              <div className="space-y-1">
                <h3 className="text-base font-semibold text-gray-700">Extension of Time (s37)</h3>
                <p className="text-xs text-gray-500">Add additional time under s37</p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={addExtension}
                className="bg-white hover:bg-[#3c5c17] hover:text-white border-[#3c5c17] text-[#3c5c17]
                           transition-colors duration-200 flex items-center gap-2"
              >
                <Plus className="w-4 h-4" /> Add Extension
              </Button>
            </div>

            {/* Extension Entries */}
            <div className="space-y-4">
              {extensions.map((extension) => (
                <div
                  key={extension.id}
                  className="bg-white p-4 rounded-md border border-gray-200 shadow-sm relative"
                >
                  {/* Delete Button */}
                  <div className="absolute top-3 right-3">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeExtension(extension.id)}
                      className="text-red-500 hover:text-red-700 hover:bg-red-50 h-8 w-8 p-0"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>

                  {/* Extension Days Input */}
                  <div className="pr-12">
                    <label className="block text-sm font-medium text-gray-600 mb-2">
                      Additional Days
                    </label>
                    <input
                      type="number"
                      className="w-48 p-2.5 border border-gray-200 rounded-md shadow-sm
                                 focus:ring-2 focus:ring-[#3c5c17] focus:border-[#3c5c17]"
                      value={extension.days}
                      onChange={(e) => {
                        const newExtensions = extensions.map(ext =>
                          ext.id === extension.id ? { ...ext, days: Number(e.target.value) } : ext
                        );
                        setExtensions(newExtensions);
                      }}
                      placeholder="Number of days"
                      min="0"
                    />
                  </div>
                </div>
              ))}

              {/* Empty State */}
              {extensions.length === 0 && (
                <div className="text-center py-6 text-gray-500 bg-white rounded-md border border-dashed border-gray-300">
                  <p className="text-sm">No extensions added yet</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Validation Error Alert */}
        {validationError && (
          <Alert variant="destructive" className="bg-red-50 border-red-200 mb-4">
            <AlertDescription className="flex items-center gap-2">
              <Info className="h-4 w-4" />
              <span className="text-red-800">{validationError}</span>
            </AlertDescription>
          </Alert>
        )}

        {/* Calculate Button */}
        <Button
          className={`w-full flex items-center justify-center gap-2 ${
            validationError ? 'bg-opacity-90' : ''
          }`}
          onClick={calculateResult}
        >
          <Calculator className="w-4 h-4" /> Calculate
        </Button>

        {/* Results */}
        {result && (
          <div className="space-y-6">
            {/* Main Results Card */}
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
              {/* Results Header */}
              <div className="bg-gradient-to-r from-[#3c5c17] to-[#6ba32a] p-4">
                <h3 className="text-xl font-semibold text-white">Calculation Results</h3>
              </div>

              {/* Results Content */}
              <div className="p-6 space-y-6">
                {/* Working Days Display */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-gray-700 font-medium">Working Days</span>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger>
                          <Info className="h-4 w-4 text-gray-400" />
                        </TooltipTrigger>
                        <TooltipContent className="max-w-xs">
                          <p className="text-sm font-normal">
                            Working days as defined in s2 of the RMA – excludes weekends, public holidays, and the period between 20 December and 10 January
                          </p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                  <div className="text-3xl font-bold text-gray-900">
                    {result.finalDays} <span className="text-gray-400">/</span> {result.maxDays}
                  </div>
                </div>

                {/* Status Alert */}
                {result.isOvertime ? (
                  <Alert variant="destructive" className="bg-red-50 border-red-200">
                    <AlertDescription className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-red-800 font-medium">
                          Over time limit by {result.finalDays - result.maxDays} working days
                        </span>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger>
                              <Info className="h-4 w-4 text-gray-400" />
                            </TooltipTrigger>
                            <TooltipContent className="max-w-xs p-4">
                              <div className="space-y-2">
                                <p>A discount on administrative charges applies when a resource consent or s127 application is processed outside statutory timeframes.</p>
                                <p className="text-sm text-gray-400">
                                  Learn more about the{' '}
                                  <a 
                                    href="https://environment.govt.nz/acts-and-regulations/regulations/discount-on-administrative-charges/" 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="text-blue-500 hover:underline"
                                  >
                                    Discount Regulations
                                  </a>
                                </p>
                              </div>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                      <span className="text-sm text-red-600">Discount Required</span>
                    </AlertDescription>
                  </Alert>
                ) : (
                  <Alert className="bg-green-50 border-green-200">
                    <AlertDescription className="flex items-center justify-between">
                      <span className="text-green-800 font-medium">Application is within time</span>
                      <span className="text-sm text-green-600">✓ No Discount Required</span>
                    </AlertDescription>
                  </Alert>
                )}

                {/* Quick Stats */}
                <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-100">
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <div className="text-sm text-gray-600">Total Calendar Days</div>
                    <div className="text-2xl font-semibold text-gray-900">
                      {differenceInDays(new Date(endDate), new Date(startDate)) + 1}
                    </div>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <div className="text-sm text-gray-600">Days Excluded</div>
                    <div className="text-2xl font-semibold text-gray-900">
                      {result.details.weekends + result.details.holidays + result.holdDays}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Detailed Breakdown Section */}
            <div>
              <Button
                variant="ghost"
                className="w-full flex items-center justify-between bg-white hover:bg-gray-50"
                onClick={() => setShowAudit(!showAudit)}
              >
                <div className="flex items-center gap-2">
                  <span className="font-medium">Detailed Calculations</span>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger>
                        <Info className="h-4 w-4 text-gray-400" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="text-sm font-normal">View detailed breakdown of time periods</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                {showAudit ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </Button>

              {showAudit && (
                <div className="mt-2 bg-white rounded-lg border border-gray-200 divide-y divide-gray-100">

                  {/* Elapsed Time Calculations */}
                  <div className="p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <h4 className="font-medium text-gray-900">Elapsed Time</h4>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger>
                            <Info className="h-4 w-4 text-gray-400" />
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Total time elapsed since lodgement, before considering excluded periods</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                    <div className="space-y-2 text-sm">
                      <p className="flex justify-between">
                        <span className="text-gray-600">Calendar Days:</span>
                        <span className="font-medium">
                          {differenceInDays(new Date(endDate), new Date(startDate)) + 1}
                        </span>
                      </p>
                      <p className="flex justify-between">
                        <span className="text-gray-600">Weekend Days:</span>
                        <span className="font-medium">-{result.details.weekends}</span>
                      </p>
                      <p className="flex justify-between">
                        <span className="text-gray-600">Holidays:</span>
                        <span className="font-medium">-{result.details.holidays}</span>
                      </p>
                      <p className="flex justify-between text-gray-900 font-medium border-t border-gray-100 pt-2">
                        <span>Elapsed Working Days:</span>
                        <span>{result.totalDays}</span>
                      </p>
                    </div>
                  </div>

                  {/* Excluded Time Periods Section */}
{result.details.holdPeriodDetails.length > 0 && (
  <div className="p-4">
    <div className="space-y-4">
      {/* Header - Simplified with just the title */}
      <div className="flex items-center gap-2">
        <h4 className="font-medium text-gray-900">Excluded Time Periods</h4>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger>
              <Info className="h-4 w-4 text-gray-400" />
            </TooltipTrigger>
            <TooltipContent>
              <p className="text-sm">
                Excluded working days as prescribed under s88B of the RMA
              </p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      {/* Info Panel - Always visible explanation */}
      <div className="flex items-center gap-2 text-sm text-blue-800 bg-blue-50 p-3 rounded-md border border-blue-100">
        <Info className="w-4 h-4 text-blue-500 flex-shrink-0" />
        <span>
          Date ranges shown here include all calendar days, but working day counts excludes weekends, public holidays, and the period between 20 December and 10 January.
        </span>
      </div>

      {/* Hold Periods List */}
      <div className="space-y-3">
        {result.details.holdPeriodDetails.map((period, index) => (
          <div key={index} className="flex justify-between items-center text-sm">
            <span className="text-gray-600">
              {HOLD_PERIOD_TYPES[period.type as keyof typeof HOLD_PERIOD_TYPES]}
            </span>
            <span className="font-medium">
                {period.days} {period.days === 1 ? 'day' : 'days'} ({format(new Date(period.start), 'dd/MM/yyyy')} - {format(new Date(period.end), 'dd/MM/yyyy')})
            </span>
          </div>
        ))}
        {result.details.holdPeriodDetails.length > 1 && (
          <p className="text-xs text-gray-500 italic">
            Note: Overlapping periods are only counted once in the total
          </p>
        )}
        <p className="flex justify-between text-sm text-gray-900 font-medium pt-2">
          <span>Total Working Days Excluded:</span>
          <span>{result.holdDays}</span>
        </p>
      </div>
    </div>
  </div>
)}

                  {/* Extensions */}
                  {extensions.length > 0 && (
                    <div className="p-4">
                      <div className="flex items-center gap-2 mb-3">
                        <h4 className="font-medium text-gray-900">Extension of Time</h4>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger>
                              <Info className="h-4 w-4 text-gray-400" />
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Additional working days under s37 of the RMA</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                      <div className="space-y-2 text-sm">
                        {extensions.map((ext, index) => (
                        <p key={ext.id} className="flex justify-between">
                          <span className="text-gray-600">Extension {index + 1}:</span>
                          <span className="font-medium">{ext.days} {ext.days === 1 ? 'day' : 'days'}</span>
                        </p>
                        ))}
                        <p className="flex justify-between text-gray-900 font-medium pt-2">
                          <span>Total Extension Days:</span>
                          <span>+{result.extensionDays}</span>
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Statutory Timeframe Summary */}
                  <div className="p-4 bg-gray-50">
                    <div className="flex items-center gap-2 mb-3">
                      <h4 className="font-medium text-gray-900">Final Statutory Timeframes</h4>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger>
                            <Info className="h-4 w-4 text-gray-400" />
                          </TooltipTrigger>
                          <TooltipContent className="max-w-xs">
                            <p>Net processing time compared against statutory timeframes, factoring in extensions and excluded timeframes</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                    <div className="space-y-2 text-sm">
                      <p className="flex justify-between">
                        <span className="text-gray-600">Base Timeframe:</span>
                        <span className="font-medium">
                          {CONSENT_TYPES[applicationType].baseDays} working days
                        </span>
                      </p>
                      <p className="flex justify-between">
                        <span className="text-gray-600">Total Extension Days:</span>
                        <span className="font-medium">+{result.extensionDays}</span>
                      </p>
                      <p className="flex justify-between text-gray-700 font-medium border-t border-gray-200 pt-2">
                        <span>Net Statutory Timeframe:</span>
                        <span>{result.maxDays} working days</span>
                      </p>
                      <p className="flex justify-between text-gray-900 font-medium text-base pt-2 border-t border-gray-200">
                        <span>Net Processing Time:</span>
                        <span>{result.finalDays} working days</span>
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ConsentCalculator;
